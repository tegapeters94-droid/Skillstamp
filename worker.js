/**
 * SkillStamp email Worker (Cloudflare Workers, free plan — no Firebase Blaze needed)
 *
 * Routes
 *   GET  /health            -> { ok: true }
 *   POST /admin/delete-user -> admin only: permanently deletes a sign-in account ({ uid })
 *   POST /reset             -> emails a branded password-reset link ({ email }); public, rate limited
 *   POST /welcome           -> sends the welcome email to the signed-in user
 *                              (Authorization: Bearer <Firebase ID token>)
 *
 * The recipient is ALWAYS the email address inside the verified Firebase token,
 * never an address supplied by the browser, so nobody can use this to email
 * other people. Each account gets one welcome email (remembered in KV).
 *
 * Bindings / variables (Cloudflare dashboard -> Worker -> Settings)
 *   SS_KV                KV namespace binding
 *   BREVO_API_KEY        Secret
 *   FIREBASE_PROJECT_ID  e.g. skillstamp-12714
 *   SENDER_EMAIL         e.g. noreply@skillstamp.cv   (must be a verified Brevo sender)
 *   SENDER_NAME          e.g. SkillStamp
 *   ALLOWED_ORIGINS      e.g. https://skillstamp.cv,https://www.skillstamp.cv
 *   REPLY_TO             (optional) e.g. hello@skillstamp.cv
 *   DAILY_CAP            (optional) max emails per day, default 250
 *   SA_AUTH_JSON         Secret: second service account key (role "Firebase Authentication Admin") - used only to create password-reset links
 *   SA_JSON              Secret: Google service account key (JSON) with "Cloud Datastore Viewer" - used by the 5-minute job
 *
 *   GET  /push/key          -> public Web Push key (the Worker creates its own key pair on first use and keeps it in KV)
 *   POST /push/subscribe    -> save this device for push alerts (Bearer Firebase ID token)
 *   POST /push/unsubscribe  -> remove this device ({ endpoint })
 *
 * Scheduled job (Triggers -> Cron: every 5 minutes)
 *   Reads new documents from the Firestore `notifications` collection and emails
 *   the recipient for important events (new proposal, hired, delivery, revision,
 *   payment, dispute, verification). Respects users.emailNotifs === false,
 *   limits each person to 5 emails per hour and never sends the same one twice.
 */

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache = { keys: null, exp: 0 };

/* ---------- helpers ---------- */
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64uToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function cleanName(n) {
  return String(n || '').replace(/[<>"'`\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}
function today() { return new Date().toISOString().slice(0, 10); }

function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const h = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}
function json(body, status, req, env) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req, env) },
  });
}

/* ---------- Firebase ID token verification ---------- */
async function getJwks() {
  if (jwksCache.keys && Date.now() < jwksCache.exp) return jwksCache.keys;
  const r = await fetch(JWKS_URL);
  if (!r.ok) throw new Error('could not load signing keys');
  const j = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  jwksCache = { keys: j.keys, exp: Date.now() + (m ? parseInt(m[1], 10) : 3600) * 1000 };
  return j.keys;
}

async function verifyIdToken(token, projectId) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('malformed token');
  const header = JSON.parse(dec.decode(b64uToBytes(parts[0])));
  const payload = JSON.parse(dec.decode(b64uToBytes(parts[1])));
  if (header.alg !== 'RS256' || !header.kid) throw new Error('bad header');
  const keys = await getJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uToBytes(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad signature');
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error('wrong audience');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('wrong issuer');
  if (!payload.exp || payload.exp <= now) throw new Error('token expired');
  if (payload.iat && payload.iat > now + 300) throw new Error('token from the future');
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('no subject');
  return payload;
}

/* ---------- email template ---------- */
const BRAND = {
  site: 'https://skillstamp.cv/',
  logo: 'https://skillstamp.cv/email-logo.png',
  dark: '#0d3320',
  green: '#1a6b3c',
  mint: '#7ee2a8',
  tint: '#eaf4ee',
  ink: '#0d1109',
  body: '#4b5a50',
  muted: '#7a877e',
  line: '#dde2d6',
  page: '#f4f6f1',
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function welcomeEmail(name, role, canReply) {
  const first = cleanName(name).split(' ')[0] || 'there';
  const isClient = role === 'employer';
  const B = BRAND;
  const intro = isClient
    ? 'Your client account is ready. SkillStamp lists freelancers whose skills have been checked, so you can hire with confidence and pay only when the work is delivered.'
    : 'Your freelancer account is ready. SkillStamp helps you prove your skills, get noticed by clients and get paid securely for the work you deliver.';
  const label = isClient ? 'Getting started as a client' : 'Getting started as a freelancer';
  const cta = isClient ? 'Find talent' : 'Complete my profile';
  const steps = isClient
    ? [
        ['Browse verified talent', 'Every freelancer has a Skill ID. Look for the green verified seal.'],
        ['Post your first gig', 'Describe the work and your budget, then review proposals and portfolios.'],
        ['Pay with confidence', 'Payment is held in escrow and only released when you approve the delivery.'],
      ]
    : [
        ['Complete your profile', 'Add a photo, a headline and your skills so clients can find you.'],
        ['Get skill-verified', 'Submit your work to earn the verified seal and stand out in search.'],
        ['Apply to gigs', 'Send proposals with your portfolio and start building your reputation.'],
      ];

  const rows = steps.map((s, i) => `
<tr>
  <td width="44" valign="top" style="padding:14px 0 14px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;background:${B.green};border-radius:16px;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:700;line-height:32px;">${i + 1}</td></tr></table>
  </td>
  <td valign="top" style="padding:14px 0;${i < steps.length - 1 ? 'border-bottom:1px solid ' + B.line + ';' : ''}">
    <div style="font-family:${FONT};font-size:16px;font-weight:700;color:${B.ink};line-height:1.3;">${esc(s[0])}</div>
    <div style="font-family:${FONT};font-size:14px;color:${B.body};line-height:1.55;margin-top:3px;">${esc(s[1])}</div>
  </td>
</tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Welcome to SkillStamp</title></head>
<body style="margin:0;padding:0;background:${B.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your SkillStamp account is ready. Here is how to get started.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.page};"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${B.line};border-radius:20px;overflow:hidden;">

<tr><td align="center" bgcolor="${B.dark}" style="background:${B.dark};background-image:linear-gradient(135deg,#0f5430 0%,${B.dark} 70%);padding:38px 28px 34px;">
  <img src="${B.logo}" width="72" height="72" alt="SkillStamp" style="display:block;margin:0 auto;width:72px;height:72px;border:0;outline:none;">
  <div style="font-family:${FONT};font-size:26px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;margin-top:14px;">Skill<span style="color:${B.mint};">Stamp</span></div>
  <div style="font-family:${FONT};font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a9d9bd;margin-top:6px;">Verified skills. Trusted work.</div>
</td></tr>

<tr><td style="padding:36px 36px 6px;">
  <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${B.green};">${esc(label)}</div>
  <div style="font-family:${FONT};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;color:${B.ink};margin-top:10px;">Welcome, ${esc(first)}.</div>
  <div style="font-family:${FONT};font-size:16px;line-height:1.65;color:${B.body};margin-top:14px;">${esc(intro)}</div>
</td></tr>

<tr><td style="padding:14px 36px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
</td></tr>

<tr><td align="center" style="padding:22px 36px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${B.green}" style="background:${B.green};border-radius:12px;">
    <a href="${B.site}" style="display:inline-block;padding:15px 36px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(cta)}</a>
  </td></tr></table>
</td></tr>

<tr><td style="padding:22px 36px 34px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.tint};border-radius:14px;"><tr><td style="padding:16px 20px;font-family:${FONT};font-size:14px;line-height:1.6;color:${B.body};">
    <strong style="color:${B.ink};">Need a hand?</strong> ${canReply ? 'Reply to this email and a real person will get back to you.' : 'Visit <a href="' + B.site + '" style="color:' + B.green + ';text-decoration:none;font-weight:600;">skillstamp.cv</a> and use the help options in the app.'}
  </td></tr></table>
</td></tr>

<tr><td style="padding:22px 36px 28px;border-top:1px solid ${B.line};background:#fafbf8;">
  <div style="font-family:${FONT};font-size:12px;line-height:1.7;color:${B.muted};">You are receiving this because you created an account at <a href="${B.site}" style="color:${B.green};text-decoration:none;">skillstamp.cv</a>. If this was not you, you can safely ignore this email.</div>
  <div style="font-family:${FONT};font-size:12px;color:${B.muted};margin-top:10px;">&copy; ${new Date().getUTCFullYear()} SkillStamp</div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;

  const text = `Welcome to SkillStamp, ${first}.\n\n${intro}\n\n${label}\n` +
    steps.map((s, i) => `${i + 1}. ${s[0]} - ${s[1]}`).join('\n') +
    `\n\n${cta}: ${B.site}\n\n${canReply ? 'Need a hand? Reply to this email.' : 'Need a hand? Visit skillstamp.cv.'}\n\nYou are receiving this because you created an account at skillstamp.cv. If this was not you, you can safely ignore this email.`;
  return { subject: `Welcome to SkillStamp, ${first}`, html, text };
}

async function sendBrevo(env, to, toName, mail) {
  const body = {
    sender: { name: env.SENDER_NAME || 'SkillStamp', email: env.SENDER_EMAIL },
    to: [{ email: to, name: toName || undefined }],
    subject: mail.subject,
    htmlContent: mail.html,
    textContent: mail.text,
  };
  if (env.REPLY_TO) body.replyTo = { email: env.REPLY_TO };
  if (mail.headers) body.headers = mail.headers;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('brevo ' + r.status + ' ' + t.slice(0, 200));
  }
}


/* ---------- gig / activity notification emails ---------- */
const NOTIFY_TYPES = {
  gig_application:       { subject: 'New proposal on your gig',        eyebrow: 'New proposal',      cta: 'Review proposal' },
  proposal:              { subject: 'You received a direct proposal',   eyebrow: 'Direct proposal',   cta: 'Review proposal' },
  dispute_resolved:      { subject: 'Your dispute has been resolved',   eyebrow: 'Dispute resolved',  cta: 'See the decision' },
  support:               { subject: 'A message from SkillStamp Support',eyebrow: 'Support',           cta: 'Open SkillStamp' },
  hired:                 { subject: 'You have been hired',              eyebrow: 'You got the job',   cta: 'Open your gig' },
  delivery:              { subject: 'Work delivered - review it now',   eyebrow: 'Delivery submitted',cta: 'Review delivery' },
  revision:              { subject: 'A revision was requested',         eyebrow: 'Revision requested',cta: 'See the feedback' },
  payment:               { subject: 'Payment update on SkillStamp',     eyebrow: 'Payment',           cta: 'View my wallet' },
  dispute_raised:        { subject: 'A dispute needs your attention',   eyebrow: 'Dispute',           cta: 'Open SkillStamp' },
  verification_approved: { subject: 'Your skill is verified',           eyebrow: 'Verified',          cta: 'View my profile' },
  verification_rejected: { subject: 'Update on your skill verification',eyebrow: 'Verification',      cta: 'Open SkillStamp' },
};

function stripDecor(t) {
  return String(t || '')
    .replace(/&#x?[0-9a-fA-F]+;?/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ').trim().slice(0, 300);
}

function notifyEmail(type, n, name) {
  const B = BRAND, def = NOTIFY_TYPES[type];
  const first = cleanName(name).split(' ')[0] || 'there';
  let headline = stripDecor(n.title);
  if (!headline || headline.toLowerCase() === def.eyebrow.toLowerCase()) headline = def.subject;
  const msg = stripDecor(n.body);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(def.subject)}</title></head>
<body style="margin:0;padding:0;background:${B.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(msg || headline)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.page};"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${B.line};border-radius:20px;overflow:hidden;">
<tr><td align="center" bgcolor="${B.dark}" style="background:${B.dark};background-image:linear-gradient(135deg,#0f5430 0%,${B.dark} 70%);padding:26px 28px;">
  <img src="${B.logo}" width="44" height="44" alt="SkillStamp" style="display:inline-block;vertical-align:middle;width:44px;height:44px;border:0;">
  <span style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;vertical-align:middle;margin-left:8px;">Skill<span style="color:${B.mint};">Stamp</span></span>
</td></tr>
<tr><td style="padding:34px 36px 8px;">
  <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${B.green};">${esc(def.eyebrow)}</div>
  <div style="font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${B.ink};margin-top:10px;">${esc(headline)}</div>
  <div style="font-family:${FONT};font-size:16px;line-height:1.65;color:${B.body};margin-top:14px;">Hi ${esc(first)},</div>
  ${msg ? `<div style="font-family:${FONT};font-size:16px;line-height:1.65;color:${B.body};margin-top:8px;">${esc(msg)}</div>` : ''}
</td></tr>
<tr><td align="left" style="padding:22px 36px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${B.green}" style="background:${B.green};border-radius:12px;">
    <a href="${B.site}" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(def.cta)}</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:22px 36px 28px;border-top:1px solid ${B.line};background:#fafbf8;">
  <div style="font-family:${FONT};font-size:12px;line-height:1.7;color:${B.muted};">You are receiving this because of activity on your <a href="${B.site}" style="color:${B.green};text-decoration:none;">SkillStamp</a> account. You can turn these emails off any time in Settings &rarr; Email notifications.</div>
  <div style="font-family:${FONT};font-size:12px;color:${B.muted};margin-top:10px;">&copy; ${new Date().getUTCFullYear()} SkillStamp</div>
</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${headline}\n\nHi ${first},\n${msg ? '\n' + msg + '\n' : ''}\n${def.cta}: ${B.site}\n\nYou can turn these emails off in Settings > Email notifications.`;
  return { subject: def.subject, html, text };
}

/* ---- Google service account -> access token (Firestore REST) ---- */
const saTokens = {};
function b64u(buf) {
  let b = ''; const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i++) b += String.fromCharCode(a[i]);
  return btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function getSaToken(env, which, scope) {
  which = which || 'SA_JSON'; scope = scope || 'https://www.googleapis.com/auth/datastore';
  const c = saTokens[which];
  if (c && Date.now() < c.exp) return c.v;
  const sa = JSON.parse(env[which]);
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = b64u(enc.encode(JSON.stringify({
    iss: sa.client_email, scope: scope,
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })));
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = b64uToBytes(pem.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + claim));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + b64u(sig),
  });
  if (!r.ok) throw new Error('token ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const j = await r.json();
  saTokens[which] = { v: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1000 };
  return saTokens[which].v;
}
const fv = (f) => { if (!f) return undefined; const k = Object.keys(f)[0]; const v = f[k]; return k === 'integerValue' ? Number(v) : k === 'nullValue' ? null : v; };


/* ---------- Web Push (VAPID + aes128gcm, RFC 8291/8292) ---------- */
let vapidCache = null;
async function getVapid(env) {
  if (vapidCache) return vapidCache;
  let jwk = null;
  try { const raw = await env.SS_KV.get('vapid:jwk'); if (raw) jwk = JSON.parse(raw); } catch (e) {}
  if (!jwk) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    await env.SS_KV.put('vapid:jwk', JSON.stringify({ kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, d: jwk.d }));
  }
  const priv = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const pub = new Uint8Array(65); pub[0] = 4; pub.set(b64uToBytes(jwk.x), 1); pub.set(b64uToBytes(jwk.y), 33);
  vapidCache = { priv, pubB64: b64u(pub) };
  return vapidCache;
}
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
function concatBytes() {
  let n = 0; for (const a of arguments) n += a.length;
  const o = new Uint8Array(n); let p = 0; for (const a of arguments) { o.set(a, p); p += a.length; }
  return o;
}
async function encryptPush(sub, plaintext) {
  const uaPub = b64uToBytes(sub.p256dh), auth = b64uToBytes(sub.auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, secret, concatBytes(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const data = concatBytes(plaintext, new Uint8Array([2]));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, data));
  const hdr = new Uint8Array(21); hdr.set(salt, 0); new DataView(hdr.buffer).setUint32(16, 4096); hdr[20] = 65;
  return concatBytes(hdr, asPub, ct);
}
/* returns 'ok' | 'gone' | 'fail' */
async function sendWebPush(env, sub, payload) {
  const v = await getVapid(env);
  const aud = new URL(sub.endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claim = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:' + (env.SENDER_EMAIL || 'support@skillstamp.cv') })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, v.priv, enc.encode(head + '.' + claim));
  const body = await encryptPush(sub, enc.encode(JSON.stringify(payload)));
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: 'vapid t=' + head + '.' + claim + '.' + b64u(sig) + ', k=' + v.pubB64, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal' },
    body,
  });
  if (r.status === 404 || r.status === 410) return 'gone';
  return r.ok ? 'ok' : 'fail';
}
async function getSubs(env, uid) {
  try { const raw = await env.SS_KV.get('push:' + uid); const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
async function handlePush(req, env, url) {
  if (url.pathname === '/push/key') {
    const v = await getVapid(env);
    return json({ ok: true, key: v.pubB64 }, 200, req, env);
  }
  let claims;
  try { claims = await verifyIdToken((req.headers.get('Authorization') || '').replace(/^Bearer /, ''), env.FIREBASE_PROJECT_ID); }
  catch (e) { return json({ ok: false, error: 'unauthorized' }, 401, req, env); }
  const uid = claims.sub;
  let body = {}; try { body = await req.json(); } catch (e) {}
  if (url.pathname === '/push/subscribe') {
    const s = body && body.subscription, k = s && s.keys;
    if (!s || !k || typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 1000 || typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || k.p256dh.length > 200 || k.auth.length > 60)
      return json({ ok: false, error: 'bad subscription' }, 400, req, env);
    const list = (await getSubs(env, uid)).filter((x) => x.endpoint !== s.endpoint);
    list.unshift({ endpoint: s.endpoint, p256dh: k.p256dh, auth: k.auth, ts: Date.now() });
    await env.SS_KV.put('push:' + uid, JSON.stringify(list.slice(0, 5)));
    return json({ ok: true }, 200, req, env);
  }
  if (url.pathname === '/push/unsubscribe') {
    const ep = String(body.endpoint || '');
    const list = (await getSubs(env, uid)).filter((x) => x.endpoint !== ep);
    if (list.length) await env.SS_KV.put('push:' + uid, JSON.stringify(list)); else await env.SS_KV.delete('push:' + uid);
    return json({ ok: true }, 200, req, env);
  }
  return json({ ok: false, error: 'not found' }, 404, req, env);
}
async function pushForNotification(env, base, token, id, uid, f, ts) {
  if (!uid || await env.SS_KV.get('pushed:' + id)) return;
  const subs = await getSubs(env, uid);
  if (!subs.length) return;
  const hour = new Date().toISOString().slice(0, 13), rlKey = 'prl:' + uid + ':' + hour;
  const rl = parseInt((await env.SS_KV.get(rlKey)) || '0', 10);
  if (rl >= 10) return;
  try {
    const ur = await fetch(base + '/users/' + encodeURIComponent(uid), { headers: { Authorization: 'Bearer ' + token } });
    if (!ur.ok) return;
    const uf = (await ur.json()).fields || {};
    if (fv(uf.isBanned) === true || fv(uf.deleted) === true) return;
  } catch (e) { return; }
  const payload = { title: stripDecor(fv(f.title)).slice(0, 80) || 'SkillStamp', body: stripDecor(fv(f.body)).slice(0, 140), url: '/', tag: String(fv(f.type) || 'ss') };
  const keep = []; let sent = 0;
  for (const s of subs) {
    let res = 'fail';
    try { res = await sendWebPush(env, s, payload); } catch (e) { console.error('push send failed', e && e.message); }
    if (res === 'ok') sent++;
    if (res !== 'gone') keep.push(s);
  }
  if (keep.length !== subs.length) { if (keep.length) await env.SS_KV.put('push:' + uid, JSON.stringify(keep)); else await env.SS_KV.delete('push:' + uid); }
  await env.SS_KV.put('pushed:' + id, '1', { expirationTtl: 2 * 86400 });
  if (sent) await env.SS_KV.put(rlKey, String(rl + 1), { expirationTtl: 7200 });
}

async function runNotifyJob(env) {
  if (!env.SA_JSON) return;
  const canEmail = !!env.BREVO_API_KEY;
  const pid = env.FIREBASE_PROJECT_ID;
  const base = 'https://firestore.googleapis.com/v1/projects/' + pid + '/databases/(default)/documents';
  const nowMs = Date.now();
  let cursor = parseInt((await env.SS_KV.get('notif_cursor')) || '0', 10);
  if (!cursor) { await env.SS_KV.put('notif_cursor', String(nowMs)); return; } // first run: start from now, no backfill
  const token = await getSaToken(env);
  const q = { structuredQuery: {
    from: [{ collectionId: 'notifications' }],
    where: { fieldFilter: { field: { fieldPath: 'ts' }, op: 'GREATER_THAN', value: { integerValue: String(cursor - 120000) } } },
    orderBy: [{ field: { fieldPath: 'ts' }, direction: 'ASCENDING' }],
    limit: 100,
  } };
  const r = await fetch(base + ':runQuery', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
  if (!r.ok) throw new Error('query ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const rows = (await r.json()).filter((x) => x.document);
  let maxTs = cursor;
  const day = today(), hour = new Date().toISOString().slice(0, 13);
  const cap = parseInt(env.DAILY_CAP || '250', 10);
  for (const row of rows) {
    const f = row.document.fields || {};
    const id = row.document.name.split('/').pop();
    const ts = fv(f.ts) || 0;
    if (ts > maxTs) maxTs = ts;
    const type = fv(f.type), uid = fv(f.uid);
    if (uid && fv(f.read) !== true && nowMs - ts <= 6 * 3600 * 1000) {
      try { await pushForNotification(env, base, token, id, uid, f, ts); } catch (e) { console.error('push failed', id, e && e.message); }
    }
    if (!canEmail) continue;
    if (!NOTIFY_TYPES[type] || !uid) continue;
    if (fv(f.read) === true) continue;
    if (nowMs - ts > 6 * 3600 * 1000) continue;
    if (await env.SS_KV.get('sent:' + id)) continue;
    const capCount = parseInt((await env.SS_KV.get('cap:' + day)) || '0', 10);
    if (capCount >= cap) { console.log('daily cap reached'); break; }
    const rlKey = 'rl:' + uid + ':' + hour;
    const rl = parseInt((await env.SS_KV.get(rlKey)) || '0', 10);
    if (rl >= 5) continue;
    const ur = await fetch(base + '/users/' + encodeURIComponent(uid), { headers: { Authorization: 'Bearer ' + token } });
    if (!ur.ok) continue;
    const uf = (await ur.json()).fields || {};
    let email = '';
    try {
      const pr = await fetch(base + '/users_private/' + encodeURIComponent(uid), { headers: { Authorization: 'Bearer ' + token } });
      if (pr.ok) email = String(fv(((await pr.json()).fields || {}).email) || '').toLowerCase();
    } catch (e) {}
    if (!email) email = String(fv(uf.email) || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (fv(uf.emailNotifs) === false || fv(uf.isBanned) === true || fv(uf.deleted) === true) continue;
    const mail = notifyEmail(type, { title: fv(f.title), body: fv(f.body) }, fv(uf.name));
    try {
      await sendBrevo(env, email, cleanName(fv(uf.name)), mail);
      await env.SS_KV.put('sent:' + id, '1', { expirationTtl: 7 * 86400 });
      await env.SS_KV.put(rlKey, String(rl + 1), { expirationTtl: 7200 });
      await env.SS_KV.put('cap:' + day, String(capCount + 1), { expirationTtl: 172800 });
    } catch (e) { console.error('notify send failed', id, e && e.message); }
  }
  if (maxTs > cursor) await env.SS_KV.put('notif_cursor', String(maxTs));
}


/* ---------- password reset ---------- */
function resetEmail(link) {
  const B = BRAND;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Reset your SkillStamp password</title></head>
<body style="margin:0;padding:0;background:${B.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Use this link to choose a new password. It expires in one hour.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.page};"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${B.line};border-radius:20px;overflow:hidden;">
<tr><td align="center" bgcolor="${B.dark}" style="background:${B.dark};background-image:linear-gradient(135deg,#0f5430 0%,${B.dark} 70%);padding:26px 28px;">
  <img src="${B.logo}" width="44" height="44" alt="SkillStamp" style="display:inline-block;vertical-align:middle;width:44px;height:44px;border:0;">
  <span style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;vertical-align:middle;margin-left:8px;">Skill<span style="color:${B.mint};">Stamp</span></span>
</td></tr>
<tr><td style="padding:34px 36px 6px;">
  <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${B.green};">Password reset</div>
  <div style="font-family:${FONT};font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${B.ink};margin-top:10px;">Reset your password</div>
  <div style="font-family:${FONT};font-size:16px;line-height:1.65;color:${B.body};margin-top:14px;">We received a request to reset the password for your SkillStamp account. Click the button below to choose a new one. This link expires in one hour.</div>
</td></tr>
<tr><td align="left" style="padding:22px 36px 12px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${B.green}" style="background:${B.green};border-radius:12px;">
    <a href="${esc(link)}" style="display:inline-block;padding:15px 34px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Reset password</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:10px 36px 30px;">
  <div style="font-family:${FONT};font-size:13px;line-height:1.6;color:${B.muted};">Button not working? Copy and paste this link into your browser:</div>
  <div style="font-family:${FONT};font-size:12px;line-height:1.5;color:${B.green};word-break:break-all;margin-top:6px;">${esc(link)}</div>
</td></tr>
<tr><td style="padding:0 36px 30px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.tint};border-radius:14px;"><tr><td style="padding:16px 20px;font-family:${FONT};font-size:14px;line-height:1.6;color:${B.body};">
    <strong style="color:${B.ink};">Did not ask for this?</strong> You can safely ignore this email. Your password will not change unless you click the button above.
  </td></tr></table>
</td></tr>
<tr><td style="padding:22px 36px 28px;border-top:1px solid ${B.line};background:#fafbf8;">
  <div style="font-family:${FONT};font-size:12px;line-height:1.7;color:${B.muted};">This email was sent by <a href="${B.site}" style="color:${B.green};text-decoration:none;">SkillStamp</a> because a password reset was requested for your account.</div>
  <div style="font-family:${FONT};font-size:12px;color:${B.muted};margin-top:10px;">&copy; ${new Date().getUTCFullYear()} SkillStamp</div>
</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Reset your SkillStamp password\n\nWe received a request to reset the password for your SkillStamp account. Open the link below to choose a new one. It expires in one hour.\n\n${link}\n\nIf you did not ask for this, you can safely ignore this email. Your password will not change.`;
  return { subject: 'Reset your SkillStamp password', html, text };
}

async function handleReset(req, env) {
  if (!env.SA_AUTH_JSON) return json({ ok: false, error: 'not configured' }, 503, req, env);
  let body = {};
  try { body = await req.json(); } catch (e) {}
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ ok: false, error: 'invalid-email' }, 400, req, env);

  const hour = new Date().toISOString().slice(0, 13);
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const eKey = 'rst:e:' + email + ':' + hour;
  const iKey = 'rst:i:' + ip + ':' + hour;
  const eN = parseInt((await env.SS_KV.get(eKey)) || '0', 10);
  const iN = parseInt((await env.SS_KV.get(iKey)) || '0', 10);
  if (eN >= 3 || iN >= 10) return json({ ok: false, error: 'rate-limited' }, 429, req, env);
  await env.SS_KV.put(eKey, String(eN + 1), { expirationTtl: 7200 });
  await env.SS_KV.put(iKey, String(iN + 1), { expirationTtl: 7200 });

  const capKey = 'cap:' + today();
  const cap = parseInt(env.DAILY_CAP || '250', 10);
  if (parseInt((await env.SS_KV.get(capKey)) || '0', 10) >= cap) return json({ ok: false, error: 'daily limit reached' }, 429, req, env);

  const token = await getSaToken(env, 'SA_AUTH_JSON', 'https://www.googleapis.com/auth/identitytoolkit');
  const url = 'https://identitytoolkit.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/accounts:sendOobCode';
  const call = (extra) => fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ requestType: 'PASSWORD_RESET', email: email, returnOobLink: true }, extra)),
  });
  let r = await call({ continueUrl: 'https://skillstamp.cv/' });
  if (r.status === 400) {
    const t = await r.clone().text();
    if (/INVALID_CONTINUE_URI|UNAUTHORIZED_DOMAIN|MISSING_CONTINUE_URI/.test(t)) r = await call({});
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    if (/EMAIL_NOT_FOUND|USER_NOT_FOUND/.test(t)) return json({ ok: false, error: 'not-found' }, 404, req, env);
    console.error('oob failed', r.status, t.slice(0, 200));
    return json({ ok: false, error: 'failed' }, 502, req, env);
  }
  const j = await r.json();
  if (!j.oobLink) return json({ ok: false, error: 'failed' }, 502, req, env);
  try {
    await sendBrevo(env, email, '', resetEmail(j.oobLink));
  } catch (e) {
    console.error('reset send failed', e && e.message);
    return json({ ok: false, error: 'send failed' }, 502, req, env);
  }
  await env.SS_KV.put(capKey, String(parseInt((await env.SS_KV.get(capKey)) || '0', 10) + 1), { expirationTtl: 172800 });
  return json({ ok: true }, 200, req, env);
}


/* ---------- email verification by 6-digit code ---------- */
function verifyEmail(code, first) {
  const B = BRAND;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Your SkillStamp verification code</title></head>
<body style="margin:0;padding:0;background:${B.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your code is ${code}. It expires in 15 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.page};"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${B.line};border-radius:20px;overflow:hidden;">
<tr><td align="center" bgcolor="${B.dark}" style="background:${B.dark};background-image:linear-gradient(135deg,#0f5430 0%,${B.dark} 70%);padding:26px 28px;">
  <img src="${B.logo}" width="44" height="44" alt="SkillStamp" style="display:inline-block;vertical-align:middle;width:44px;height:44px;border:0;">
  <span style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;vertical-align:middle;margin-left:8px;">Skill<span style="color:${B.mint};">Stamp</span></span>
</td></tr>
<tr><td style="padding:34px 36px 6px;">
  <div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${B.green};">Verify your email</div>
  <div style="font-family:${FONT};font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${B.ink};margin-top:10px;">Your verification code</div>
  <div style="font-family:${FONT};font-size:16px;line-height:1.65;color:${B.body};margin-top:14px;">Hi ${esc(first || 'there')}, enter this code in SkillStamp to confirm your email address. It expires in 15 minutes.</div>
</td></tr>
<tr><td align="left" style="padding:20px 36px 12px;">
  <div style="display:inline-block;background:${B.tint};border:1px solid ${B.line};border-radius:14px;padding:16px 26px;font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:.35em;color:${B.green};">${code}</div>
</td></tr>
<tr><td style="padding:10px 36px 30px;">
  <div style="font-family:${FONT};font-size:14px;line-height:1.6;color:${B.body};"><strong style="color:${B.ink};">Did not create an account?</strong> You can safely ignore this email. Never share this code with anyone.</div>
</td></tr>
<tr><td style="padding:22px 36px 28px;border-top:1px solid ${B.line};background:#fafbf8;">
  <div style="font-family:${FONT};font-size:12px;line-height:1.7;color:${B.muted};">Sent by <a href="${B.site}" style="color:${B.green};text-decoration:none;">SkillStamp</a> because this address was used to sign up.</div>
</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Your SkillStamp verification code is ${code}.\n\nIt expires in 15 minutes. If you did not create an account, ignore this email. Never share this code.\n\nSkillStamp - ${B.site}`;
  return { subject: `${code} is your SkillStamp verification code`, html, text };
}

async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyAuth(req, env) {
  const auth = req.headers.get('Authorization') || '';
  try { return await verifyIdToken(auth.startsWith('Bearer ') ? auth.slice(7) : '', env.FIREBASE_PROJECT_ID); }
  catch (e) { return null; }
}

async function handleVerifySend(req, env) {
  if (!env.SA_AUTH_JSON || !env.BREVO_API_KEY) return json({ ok: false, error: 'not configured' }, 503, req, env);
  const claims = await verifyAuth(req, env);
  if (!claims) return json({ ok: false, error: 'unauthorized' }, 401, req, env);
  const uid = claims.sub;
  const email = String(claims.email || '').toLowerCase();
  if (!email) return json({ ok: false, error: 'no-email' }, 400, req, env);
  if (claims.email_verified) return json({ ok: true, already: true }, 200, req, env);

  const key = 'vcode:' + uid;
  const prev = JSON.parse((await env.SS_KV.get(key)) || 'null');
  const now = Date.now();
  if (prev && now - prev.sent < 60000) return json({ ok: false, error: 'wait', retry: Math.ceil((60000 - (now - prev.sent)) / 1000) }, 429, req, env);
  const day = today();
  const dKey = 'vsend:' + uid + ':' + day;
  const dN = parseInt((await env.SS_KV.get(dKey)) || '0', 10);
  if (dN >= 5) return json({ ok: false, error: 'rate-limited' }, 429, req, env);
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const iKey = 'vsend:ip:' + ip + ':' + day;
  const iN = parseInt((await env.SS_KV.get(iKey)) || '0', 10);
  if (iN >= 20) return json({ ok: false, error: 'rate-limited' }, 429, req, env);
  const capKey = 'cap:' + day;
  const cap = parseInt(env.DAILY_CAP || '250', 10);
  if (parseInt((await env.SS_KV.get(capKey)) || '0', 10) >= cap) return json({ ok: false, error: 'daily limit reached' }, 429, req, env);

  const buf = new Uint32Array(1); crypto.getRandomValues(buf);
  const code = String(100000 + (buf[0] % 900000));
  const hash = await sha256Hex(code + ':' + uid + ':' + email);
  await env.SS_KV.put(key, JSON.stringify({ h: hash, exp: now + 15 * 60000, sent: now, tries: 0, email: email }), { expirationTtl: 1800 });
  await env.SS_KV.put(dKey, String(dN + 1), { expirationTtl: 172800 });
  await env.SS_KV.put(iKey, String(iN + 1), { expirationTtl: 172800 });
  try {
    await sendBrevo(env, email, '', verifyEmail(code, String(claims.name || '').split(' ')[0]));
  } catch (e) {
    console.error('verify send failed', e && e.message);
    return json({ ok: false, error: 'send failed' }, 502, req, env);
  }
  await env.SS_KV.put(capKey, String(parseInt((await env.SS_KV.get(capKey)) || '0', 10) + 1), { expirationTtl: 172800 });
  return json({ ok: true }, 200, req, env);
}

async function handleVerifyCheck(req, env) {
  if (!env.SA_AUTH_JSON) return json({ ok: false, error: 'not configured' }, 503, req, env);
  const claims = await verifyAuth(req, env);
  if (!claims) return json({ ok: false, error: 'unauthorized' }, 401, req, env);
  let body = {};
  try { body = await req.json(); } catch (e) {}
  const code = String(body.code || '').replace(/\D/g, '');
  if (code.length !== 6) return json({ ok: false, error: 'bad-code' }, 400, req, env);
  const uid = claims.sub;
  const email = String(claims.email || '').toLowerCase();
  const key = 'vcode:' + uid;
  const rec = JSON.parse((await env.SS_KV.get(key)) || 'null');
  if (!rec || Date.now() > rec.exp || rec.email !== email) return json({ ok: false, error: 'expired' }, 400, req, env);
  if (rec.tries >= 5) { await env.SS_KV.delete(key); return json({ ok: false, error: 'too-many' }, 429, req, env); }
  const hash = await sha256Hex(code + ':' + uid + ':' + email);
  if (hash !== rec.h) {
    rec.tries += 1;
    await env.SS_KV.put(key, JSON.stringify(rec), { expirationTtl: 1800 });
    return json({ ok: false, error: 'wrong', left: Math.max(0, 5 - rec.tries) }, 400, req, env);
  }
  const token = await getSaToken(env, 'SA_AUTH_JSON', 'https://www.googleapis.com/auth/identitytoolkit');
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/accounts:update', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: uid, emailVerified: true }),
  });
  if (!r.ok) {
    console.error('verify update failed', r.status, (await r.text().catch(() => '')).slice(0, 200));
    return json({ ok: false, error: 'failed' }, 502, req, env);
  }
  await env.SS_KV.delete(key);
  return json({ ok: true }, 200, req, env);
}


/* ---------- escrow payouts and refunds (live wallets) ---------- */
function toFS(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFS) } };
  const f = {}; Object.keys(v).forEach((k) => { if (v[k] !== undefined) f[k] = toFS(v[k]); });
  return { mapValue: { fields: f } };
}
function fromFS(x) {
  if (!x) return null;
  if ('nullValue' in x) return null;
  if ('booleanValue' in x) return x.booleanValue;
  if ('integerValue' in x) return Number(x.integerValue);
  if ('doubleValue' in x) return x.doubleValue;
  if ('stringValue' in x) return x.stringValue;
  if ('timestampValue' in x) return x.timestampValue;
  if ('arrayValue' in x) return (x.arrayValue.values || []).map(fromFS);
  if ('mapValue' in x) { const o = {}; const f = x.mapValue.fields || {}; Object.keys(f).forEach((k) => { o[k] = fromFS(f[k]); }); return o; }
  return null;
}
async function fsRead(env, tok, path) {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + path, { headers: { Authorization: 'Bearer ' + tok } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error('read ' + path + ' ' + r.status);
  const j = await r.json(); const d = {}; Object.keys(j.fields || {}).forEach((k) => { d[k] = fromFS(j.fields[k]); });
  return { updateTime: j.updateTime, data: d };
}
let LAST_COMMIT = { status: 0, text: '' };
async function fsCommit(env, tok, writes) {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents:commit', {
    method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: writes }),
  });
  LAST_COMMIT = { status: r.status, text: '' };
  if (!r.ok) { try { LAST_COMMIT.text = (await r.text()).slice(0, 300); } catch (e) {} console.error('firestore commit failed', r.status, LAST_COMMIT.text); }
  return r.ok;
}
/* map a failed commit to a useful answer: a real write conflict is "busy", anything else is reported */
function commitErr(req, env) {
  const t = LAST_COMMIT.text || '';
  if (LAST_COMMIT.status === 403 || /PERMISSION_DENIED/.test(t)) return json({ ok: false, error: 'permission', detail: t.slice(0, 160) }, 500, req, env);
  if (LAST_COMMIT.status === 409 || /ABORTED|FAILED_PRECONDITION|ALREADY_EXISTS/.test(t)) return json({ ok: false, error: 'busy', detail: t.slice(0, 160) }, 409, req, env);
  return json({ ok: false, error: 'commit-' + LAST_COMMIT.status, detail: t.slice(0, 160) }, 500, req, env);
}
function docName(env, path) { return 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + path; }
function walletOf(u) {
  const w = Object.assign({ balance: 0, pending: 0, earned: 0, transactions: [] }, (u && u.wallet) || {});
  w.transactions = Array.isArray(w.transactions) ? w.transactions.slice() : [];
  return w;
}


async function lockedSum(env, tok, uid) {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents:runQuery', {
    method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'escrow_locks' }], where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
      { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'locked' } } } ] } } } }),
  });
  if (!r.ok) throw new Error('lock query ' + r.status);
  const rows = await r.json(); let sum = 0;
  (Array.isArray(rows) ? rows : []).forEach((x) => { if (x.document && x.document.fields && x.document.fields.amount) sum += Number(fromFS(x.document.fields.amount)) || 0; });
  return sum;
}
async function findLock(env, tok, gigId, proposalId) {
  let key = gigId, l = await fsRead(env, tok, 'escrow_locks/' + gigId);
  if (!l && proposalId && /^[A-Za-z0-9_-]{3,80}$/.test(String(proposalId))) { key = String(proposalId); l = await fsRead(env, tok, 'escrow_locks/' + key); }
  return l ? { key: key, updateTime: l.updateTime, data: l.data } : null;
}
async function escrowCtx(req, env) {
  if (!env.SA_JSON) return { err: json({ ok: false, error: 'not configured' }, 503, req, env) };
  const claims = await verifyAuth(req, env);
  if (!claims) return { err: json({ ok: false, error: 'unauthorized' }, 401, req, env) };
  let body = {}; try { body = await req.json(); } catch (e) {}
  const rl = 'esc:' + claims.sub + ':' + today();
  const n = parseInt((await env.SS_KV.get(rl)) || '0', 10);
  if (n >= 300) return { err: json({ ok: false, error: 'rate-limited' }, 429, req, env) };
  await env.SS_KV.put(rl, String(n + 1), { expirationTtl: 172800 });
  const tok = await getSaToken(env, 'SA_JSON', 'https://www.googleapis.com/auth/datastore');
  return { claims, body, tok, uid: claims.sub };
}

/* lock: move the client's money into escrow on the server and record it */
async function handleEscrowLock(req, env) {
  const c = await escrowCtx(req, env); if (c.err) return c.err;
  const kind = c.body.kind === 'proposal' ? 'proposal' : 'gig', id = String(c.body.id || '');
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(id)) return json({ ok: false, error: 'bad-id' }, 400, req, env);
  const src = await fsRead(env, c.tok, (kind === 'gig' ? 'gigs/' : 'proposals/') + id);
  if (!src) return json({ ok: false, error: 'not-found' }, 404, req, env);
  const owner = kind === 'gig' ? src.data.posterUid : src.data.fromUid;
  const amount = Number(kind === 'gig' ? src.data.escrowAmount : src.data.budget) || 0;
  if (owner !== c.uid) return json({ ok: false, error: 'not-eligible' }, 403, req, env);
  if (!(amount >= 1) || amount > 100000000) return json({ ok: false, error: 'bad-amount' }, 400, req, env);
  if (kind === 'proposal' && src.data.status !== 'pending') return json({ ok: false, error: 'not-pending' }, 400, req, env);
  const me = await fsRead(env, c.tok, 'users/' + c.uid);
  if (!me) return json({ ok: false, error: 'no-user' }, 404, req, env);
  const w = walletOf(me.data);
  const ex = await fsRead(env, c.tok, 'escrow_locks/' + id);
  if (ex) return json({ ok: true, already: true, wallet: w }, 200, req, env);
  if (me.data.walletMode === 'test') return json({ ok: false, error: 'test-mode' }, 400, req, env);
  if ((w.balance || 0) < amount) return json({ ok: false, error: 'insufficient' }, 402, req, env);
  const now = Date.now();
  w.balance -= amount; w.pending = (w.pending || 0) + amount;
  w.transactions.unshift({ id: 'escrow_' + id, type: 'out', amount: amount, from: 'Escrow', desc: 'Escrow: ' + (src.data.title || 'Gig'), ts: now });
  const wr = [
    { update: { name: docName(env, 'users/' + c.uid), fields: { wallet: toFS(w) } }, updateMask: { fieldPaths: ['wallet'] }, currentDocument: { updateTime: me.updateTime } },
    { update: { name: docName(env, 'escrow_locks/' + id), fields: { key: toFS(id), kind: toFS(kind), uid: toFS(c.uid), amount: toFS(amount), status: toFS('locked'), at: toFS(now) } }, currentDocument: { exists: false } },
  ];
  /* mark the gig as really funded; members cannot set this flag themselves (rules) */
  if (kind === 'gig') wr.push({ update: { name: docName(env, 'gigs/' + id), fields: { escrowOk: toFS(true) } }, updateMask: { fieldPaths: ['escrowOk'] }, currentDocument: { exists: true } });
  const ok = await fsCommit(env, c.tok, wr);
  if (!ok) return commitErr(req, env);
  return json({ ok: true, wallet: w }, 200, req, env);
}

/* email the admin when a member claims a deposit or requests a withdrawal.
   The Worker finds the member's own waiting requests itself, so the browser cannot fake one. */
async function handleAdminAlert(req, env) {
  const c = await escrowCtx(req, env); if (c.err) return c.err;
  if (!env.ALERT_EMAIL || !env.BREVO_API_KEY) return json({ ok: true, skipped: 'not-configured' }, 200, req, env);
  const kind = c.body.kind === 'withdrawal' ? 'withdrawal' : 'deposit';
  const coll = kind === 'withdrawal' ? 'withdrawals' : 'deposits', want = kind === 'withdrawal' ? 'pending' : 'claimed';
  const r = await fetch('https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents:runQuery', {
    method: 'POST', headers: { Authorization: 'Bearer ' + c.tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: c.uid } } },
      { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: want } } } ] } }, limit: 10 } }),
  });
  if (!r.ok) return json({ ok: false, error: 'query-' + r.status }, 502, req, env);
  const rows = await r.json(); let sent = 0, found = 0, dup = 0, mailErr = '';
  for (const x of (Array.isArray(rows) ? rows : [])) {
    if (!x.document || !x.document.fields) continue;
    found++;
    const id = x.document.name.split('/').pop();
    const key = 'adm:' + kind + ':' + id;
    if (await env.SS_KV.get(key)) { dup++; continue; }
    const capK = 'admcap:' + today();
    const used = parseInt((await env.SS_KV.get(capK)) || '0', 10);
    if (used >= 100) break;
    const d = {}; for (const k in x.document.fields) d[k] = fromFS(x.document.fields[k]);
    const amt = '₦' + (Number(d.amount) || 0).toLocaleString('en-US');
    const nm = String(d.name || 'A member').slice(0, 80);
    const title = kind === 'withdrawal' ? 'Withdrawal request: ' + amt : 'Deposit to confirm: ' + amt;
    const tab = kind === 'withdrawal' ? 'Withdrawals' : 'Deposits';
    const lines = [nm + ' ' + (kind === 'withdrawal' ? 'requested a withdrawal of ' : 'says they paid ') + amt + '.', 'Reference: ' + String(d.ref || '-'), kind === 'withdrawal' ? 'Bank: ' + String(d.bankName || '-') : '', 'Open skillstamp.cv, then Admin, then the ' + tab + ' tab to ' + (kind === 'withdrawal' ? 'pay and mark it paid.' : 'check your bank and confirm.')].filter(Boolean);
    const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#111;">' + lines.map((l) => '<p style="margin:0 0 10px;">' + esc(l) + '</p>').join('') + '</div>';
    try {
      await sendBrevo(env, env.ALERT_EMAIL, 'Admin', { subject: 'SkillStamp: ' + title, html, text: lines.join('\n') });
      await env.SS_KV.put(key, '1', { expirationTtl: 2592000 });
      await env.SS_KV.put(capK, String(used + 1), { expirationTtl: 172800 });
      sent++;
    } catch (e) { mailErr = String(e && e.message || e).slice(0, 200); console.error('admin alert mail failed', mailErr); }
  }
  return json({ ok: true, sent: sent, found: found, already: dup, mailError: mailErr || undefined, to: String(env.ALERT_EMAIL).replace(/^(.).*(@.*)$/, '$1***$2') }, 200, req, env);
}

/* ---------- daily data backup (no billing plan needed) ----------
   Copies the important collections into Worker storage once a day and keeps 8 days.
   The admin can run it now or download a day from Admin > Backup. */
const BACKUP_COLLS = ['users', 'deposits', 'withdrawals', 'escrow_locks', 'escrow_paid', 'escrow_done', 'wallet_archive', 'gigs', 'proposals', 'reviews', 'payment_settings'];
async function backupCollection(env, tok, coll) {
  const out = []; let pageToken = '';
  for (let i = 0; i < 200; i++) {
    const u = 'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + coll + '?pageSize=300' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
    const r = await fetch(u, { headers: { Authorization: 'Bearer ' + tok } });
    if (r.status === 404) return out;
    if (!r.ok) throw new Error(coll + ' ' + r.status);
    const j = await r.json();
    (j.documents || []).forEach((d) => { const o = { _id: d.name.split('/').pop() }; for (const k in (d.fields || {})) o[k] = fromFS(d.fields[k]); out.push(o); });
    if (!j.nextPageToken) break; pageToken = j.nextPageToken;
  }
  return out;
}
async function runBackup(env) {
  if (!env.SA_JSON) return { ok: false, error: 'not configured' };
  const tok = await getSaToken(env, 'SA_JSON', 'https://www.googleapis.com/auth/datastore');
  const day = today(), meta = { ts: Date.now(), counts: {}, errors: {} };
  for (const c of BACKUP_COLLS) {
    try {
      const rows = await backupCollection(env, tok, c);
      const txt = JSON.stringify(rows);
      if (txt.length > 24 * 1024 * 1024) { meta.errors[c] = 'too large'; continue; }
      await env.SS_KV.put('bk:' + day + ':' + c, txt, { expirationTtl: 8 * 86400 });
      meta.counts[c] = rows.length;
    } catch (e) { meta.errors[c] = String(e && e.message || e).slice(0, 120); }
  }
  await env.SS_KV.put('bk:meta:' + day, JSON.stringify(meta), { expirationTtl: 8 * 86400 });
  if (!Object.keys(meta.errors).length) await env.SS_KV.put('bk:last', day);
  return { ok: true, day: day, meta: meta };
}
async function runBackupDaily(env) {
  if (!env.SA_JSON || new Date().getUTCHours() < 3) return;
  if ((await env.SS_KV.get('bk:last')) === today()) return;
  const n = parseInt((await env.SS_KV.get('bk:try:' + today())) || '0', 10);
  if (n >= 3) return; /* at most 3 tries a day */
  await env.SS_KV.put('bk:try:' + today(), String(n + 1), { expirationTtl: 172800 });
  await runBackup(env);
}
async function handleBackup(req, env) {
  const a = await requireAdmin(req, env, 'owner'); if (a.err) return a.err;
  let body = {}; try { body = await req.json(); } catch (e) {}
  if (body.action === 'run') {
    const r = await runBackup(env); return json(r, r.ok ? 200 : 503, req, env);
  }
  if (body.action === 'get') {
    const day = String(body.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ ok: false, error: 'bad-date' }, 400, req, env);
    const data = {};
    for (const c of BACKUP_COLLS) { const t = await env.SS_KV.get('bk:' + day + ':' + c); if (t) { try { data[c] = JSON.parse(t); } catch (e) {} } }
    return json({ ok: true, date: day, data: data }, 200, req, env);
  }
  const days = [];
  for (let i = 0; i < 8; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const m = await env.SS_KV.get('bk:meta:' + d);
    if (m) { try { days.push({ date: d, meta: JSON.parse(m) }); } catch (e) {} }
  }
  return json({ ok: true, days: days }, 200, req, env);
}

/* ---------- withdrawal requests with safeguards ----------
   The Worker is the only way to request a withdrawal (rules block members from doing it directly), so the
   minimum, the daily limit and the hold on fresh top-ups cannot be skipped. Limits live in payment_settings/limits. */
async function wdLimits(env, tok) {
  const d = await fsRead(env, tok, 'payment_settings/limits');
  const x = d ? d.data : {};
  const n = (v, def, lo, hi) => { v = Number(v); return v >= lo && v <= hi ? v : def; };
  return { min: n(x.min, 1000, 100, 5000000), daily: n(x.daily, 500000, 1000, 50000000), holdHours: n(x.holdHours, 24, 0, 720) };
}
/* ---------- risk review (flags for the admin; nothing is blocked automatically) ---------- */
async function listBy(env, tok, coll, field, val) {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents:runQuery', {
    method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: String(val) } } }, limit: 300 } }),
  });
  if (!r.ok) throw new Error(coll + ' query ' + r.status);
  const rows = await r.json(); const out = [];
  (Array.isArray(rows) ? rows : []).forEach((x) => { if (x.document && x.document.fields) { const o = { _id: x.document.name.split('/').pop() }; for (const k in x.document.fields) o[k] = fromFS(x.document.fields[k]); out.push(o); } });
  return out;
}
const NGN = (n) => '₦' + (Number(n) || 0).toLocaleString('en-US');
const RISK_DAY = 86400000;
function ageDays(u, now) { return Math.max(0, Math.floor((now - (Number(u.created) || now)) / RISK_DAY)); }
async function riskPayout(env, tok, gigId, g, po, fl, amount, now) {
  const reasons = []; let score = 0; const add = (n, t) => { score += n; reasons.push(t); };
  const fa = ageDays(fl.data, now), pa = ageDays(po.data, now);
  if (fa < 7) add(30, 'Freelancer account is only ' + fa + ' day(s) old'); else if (fa < 30) add(10, 'Freelancer account is ' + fa + ' days old');
  if (pa < 7) add(30, 'Client account is only ' + pa + ' day(s) old'); else if (pa < 30) add(10, 'Client account is ' + pa + ' days old');
  if (amount >= 100000) add(25, 'Large payout: ' + NGN(amount)); else if (amount >= 50000) add(15, 'Sizeable payout: ' + NGN(amount));
  if (g.hiredAt && g.completedAt && g.completedAt - g.hiredAt < 2 * 3600000) add(20, 'Approved ' + Math.max(1, Math.round((g.completedAt - g.hiredAt) / 60000)) + ' minute(s) after hiring');
  try {
    const paid = await listBy(env, tok, 'escrow_paid', 'posterUid', g.posterUid);
    const pair = paid.filter((x) => x.freelancerUid === g.hiredUid && (x.at || 0) > now - 14 * RISK_DAY && x._id !== gigId).length;
    if (pair >= 2) add(20, 'This client has paid this freelancer ' + (pair + 1) + ' times in 14 days');
  } catch (e) {}
  try {
    const deps = await listBy(env, tok, 'deposits', 'uid', g.posterUid);
    const fresh = deps.filter((d) => d.status === 'confirmed' && (d.confirmedAt || 0) > now - RISK_DAY).reduce((t, d) => t + (Number(d.creditedAmount) || Number(d.amount) || 0), 0);
    if (fresh >= amount) add(15, 'Client topped up ' + NGN(fresh) + ' less than 24 hours ago');
  } catch (e) {}
  if (!(Number(fl.data.gigsCount) > 0)) add(10, 'Freelancer has no completed gigs before this one');
  return { score: score, reasons: reasons };
}
async function raiseFlag(env, tok, id, fields, score, subject, lines) {
  const ok = await fsCommit(env, tok, [{ update: { name: docName(env, 'risk_flags/' + id), fields: Object.fromEntries(Object.entries(Object.assign({ status: 'open', created: Date.now(), score: score }, fields)).map(([k, v]) => [k, toFS(v)])) }, currentDocument: { exists: false } }]);
  if (ok && score >= 70 && env.ALERT_EMAIL && env.BREVO_API_KEY) {
    try { await sendBrevo(env, env.ALERT_EMAIL, 'Admin', { subject: 'SkillStamp: ' + subject, html: '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;">' + lines.map((l) => '<p style="margin:0 0 8px;">' + esc(l) + '</p>').join('') + '<p style="margin:10px 0 0;">Open Admin, then the Risk tab to review it.</p></div>', text: lines.join('\n') }); } catch (e) {}
  }
  return ok;
}

async function listByUid(env, tok, coll, uid) {
  const r = await fetch('https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents:runQuery', {
    method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } }, limit: 300 } }),
  });
  if (!r.ok) throw new Error(coll + ' query ' + r.status);
  const rows = await r.json(); const out = [];
  (Array.isArray(rows) ? rows : []).forEach((x) => { if (x.document && x.document.fields) { const o = {}; for (const k in x.document.fields) o[k] = fromFS(x.document.fields[k]); out.push(o); } });
  return out;
}
function randCode(n) { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const b = crypto.getRandomValues(new Uint8Array(n)); let r = ''; for (let i = 0; i < n; i++) r += a[b[i] % a.length]; return r; }
async function handleWithdrawRequest(req, env) {
  const c = await escrowCtx(req, env); if (c.err) return c.err;
  const amount = Math.floor(Number(c.body.amount)), bank = String(c.body.bankName || '').trim().slice(0, 60);
  const num = String(c.body.accountNumber || '').replace(/\s/g, ''), acc = String(c.body.accountName || '').trim().slice(0, 80);
  if (!(amount >= 1) || amount > 5000000) return json({ ok: false, error: 'bad-amount' }, 400, req, env);
  if (!/^[0-9]{10}$/.test(num) || bank.length < 2 || acc.length < 2) return json({ ok: false, error: 'bad-account' }, 400, req, env);
  const me = await fsRead(env, c.tok, 'users/' + c.uid);
  if (!me) return json({ ok: false, error: 'no-user' }, 404, req, env);
  if (me.data.walletMode === 'test') return json({ ok: false, error: 'test-mode' }, 400, req, env);
  if (me.data.isBanned === true || me.data.badgeStatus === 'suspended') return json({ ok: false, error: 'not-allowed' }, 403, req, env);
  const lim = await wdLimits(env, c.tok);
  if (amount < lim.min) return json({ ok: false, error: 'min', min: lim.min }, 400, req, env);
  const w = walletOf(me.data);
  if ((w.balance || 0) < amount) return json({ ok: false, error: 'insufficient' }, 402, req, env);
  const now = Date.now();
  const wds = await listByUid(env, c.tok, 'withdrawals', c.uid);
  if (wds.some((d) => d.status === 'pending')) return json({ ok: false, error: 'in-progress' }, 409, req, env);
  const usedToday = wds.filter((d) => (d.created || 0) > now - 86400000 && (d.status === 'paid')).reduce((t, d) => t + (Number(d.amount) || 0), 0);
  if (usedToday + amount > lim.daily) return json({ ok: false, error: 'daily', remaining: Math.max(0, lim.daily - usedToday), daily: lim.daily }, 400, req, env);
  const holdMs = lim.holdHours * 3600000;
  if (holdMs > 0) {
    const deps = await listByUid(env, c.tok, 'deposits', c.uid);
    const fresh = deps.filter((d) => d.status === 'confirmed' && (d.confirmedAt || 0) > now - holdMs);
    const freshSum = fresh.reduce((t, d) => t + (Number(d.creditedAmount) || Number(d.amount) || 0), 0);
    const withdrawable = Math.max(0, (w.balance || 0) - freshSum);
    if (amount > withdrawable) {
      const until = fresh.reduce((m, d) => Math.min(m, (d.confirmedAt || now) + holdMs), now + holdMs);
      return json({ ok: false, error: 'fresh', withdrawable: withdrawable, until: until, holdHours: lim.holdHours }, 400, req, env);
    }
  }
  const id = 'w' + now.toString(36) + randCode(4).toLowerCase(), ref = 'WD-' + randCode(6);
  /* risk review: only adds a warning for the admin who pays by hand */
  const rReasons = []; let rScore = 0; const rAdd = (n, t) => { rScore += n; rReasons.push(t); };
  try {
    const ag = ageDays(me.data, now);
    if (ag < 7) rAdd(25, 'Account is only ' + ag + ' day(s) old'); else if (ag < 30) rAdd(10, 'Account is ' + ag + ' days old');
    if (amount >= 100000) rAdd(20, 'Large withdrawal: ' + NGN(amount));
    if (!wds.length) rAdd(10, 'First withdrawal from this account');
    const recentIn = (w.transactions || []).filter((t) => t && t.type === 'in' && String(t.id || '').indexOf('pay_') === 0 && (t.ts || 0) > now - RISK_DAY).reduce((t, x) => t + (Number(x.amount) || 0), 0);
    if (recentIn > 0 && amount >= 0.8 * recentIn) rAdd(15, 'Withdrawing money received from a gig less than 24 hours ago');
    const fl = (await listBy(env, c.tok, 'risk_flags', 'payeeUid', c.uid)).filter((x) => x.status === 'open' || x.status === 'confirmed');
    if (fl.length) rAdd(40, fl.length + ' recent payout(s) to this member were flagged' + (fl.some((x) => x.status === 'confirmed') ? ' (one confirmed suspicious)' : ' and not yet reviewed'));
  } catch (e) { console.error('withdraw risk failed', e && e.message); }
  w.balance = (w.balance || 0) - amount; w.held = (w.held || 0) + amount;
  w.transactions.unshift({ id: 'wd_' + id, type: 'out', amount: amount, to: bank, desc: 'Withdrawal requested (' + ref + ')', ts: now });
  const ok = await fsCommit(env, c.tok, [
    { update: { name: docName(env, 'users/' + c.uid), fields: { wallet: toFS(w) } }, updateMask: { fieldPaths: ['wallet'] }, currentDocument: { updateTime: me.updateTime } },
    { update: { name: docName(env, 'withdrawals/' + id), fields: { uid: toFS(c.uid), name: toFS(String(me.data.name || '')), amount: toFS(amount), ref: toFS(ref), status: toFS('pending'), created: toFS(now), bankName: toFS(bank), accountNumber: toFS(num), accountName: toFS(acc), riskScore: toFS(rScore), riskReasons: toFS(rReasons) } }, currentDocument: { exists: false } },
  ]);
  if (!ok) return commitErr(req, env);
  if (rScore >= 35) { try { await raiseFlag(env, c.tok, 'wd_' + id, { kind: 'withdrawal', withdrawalId: id, ref: ref, payeeUid: c.uid, payeeName: String(me.data.name || ''), amount: amount, reasons: rReasons }, rScore, 'withdrawal needs a look (' + rScore + ')', ['Withdrawal of ' + NGN(amount) + ' requested by ' + (me.data.name || 'a member') + ' (' + ref + ').'].concat(rReasons)); } catch (e) {} }
  return json({ ok: true, id: id, ref: ref, wallet: w }, 200, req, env);
}

/* ---------- admin password gate ----------
   An admin can protect the admin tools with a password. After entering it, a 30 minute session is stored
   in admin_sessions (the rules and the Worker both check it before money moves or access is changed). */
async function gateHash(pw, saltB64) {
  const salt = Uint8Array.from(atob(saltB64), (ch) => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(bits)));
}
function sameStr(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function handleGate(req, env) {
  const a = await requireAdmin(req, env, null, { noGate: true }); if (a.err) return a.err;
  let body = {}; try { body = await req.json(); } catch (e) {}
  const uid = a.claims.sub, action = String(body.action || 'status'), tok = a.dsToken;
  const sessMs = Math.max(5, parseInt(env.ADMIN_SESSION_MIN || '30', 10)) * 60000;
  const gate = await fsRead(env, tok, 'admin_gate/' + uid);
  const sess = await fsRead(env, tok, 'admin_sessions/' + uid);
  const exp = sess ? Number(sess.data.exp) || 0 : 0;
  const open = async () => {
    const e2 = Date.now() + sessMs;
    await fsCommit(env, tok, [{ update: { name: docName(env, 'admin_sessions/' + uid), fields: { exp: toFS(e2), at: toFS(Date.now()) } } }]);
    return e2;
  };
  if (action === 'status') return json({ ok: true, hasPassword: !!gate, unlocked: !gate || exp > Date.now(), exp: exp, full: a.full, scope: a.scope }, 200, req, env);
  if (action === 'lock') {
    if (sess) await fsCommit(env, tok, [{ delete: docName(env, 'admin_sessions/' + uid) }]);
    return json({ ok: true }, 200, req, env);
  }
  if (action === 'verify') {
    if (!gate) return json({ ok: true, unlocked: true }, 200, req, env);
    const fk = 'agf:' + uid, fails = parseInt((await env.SS_KV.get(fk)) || '0', 10);
    if (fails >= 5) return json({ ok: false, error: 'too-many-tries' }, 429, req, env);
    const h = await gateHash(String(body.password || ''), String(gate.data.salt || ''));
    if (!sameStr(h, gate.data.hash)) { await env.SS_KV.put(fk, String(fails + 1), { expirationTtl: 900 }); return json({ ok: false, error: 'wrong-password', left: Math.max(0, 4 - fails) }, 401, req, env); }
    await env.SS_KV.delete(fk);
    return json({ ok: true, unlocked: true, exp: await open() }, 200, req, env);
  }
  if (action === 'set') {
    const pw = String(body.password || '');
    if (pw.length < 8 || pw.length > 100) return json({ ok: false, error: 'weak-password' }, 400, req, env);
    if (gate) {
      const fk = 'agf:' + uid, fails = parseInt((await env.SS_KV.get(fk)) || '0', 10);
      if (fails >= 5) return json({ ok: false, error: 'too-many-tries' }, 429, req, env);
      const h0 = await gateHash(String(body.current || ''), String(gate.data.salt || ''));
      if (!sameStr(h0, gate.data.hash)) { await env.SS_KV.put(fk, String(fails + 1), { expirationTtl: 900 }); return json({ ok: false, error: 'wrong-password' }, 401, req, env); }
    }
    const salt = btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(16))));
    const hash = await gateHash(pw, salt);
    const ok = await fsCommit(env, tok, [{ update: { name: docName(env, 'admin_gate/' + uid), fields: { salt: toFS(salt), hash: toFS(hash), updated: toFS(Date.now()) } } }]);
    if (!ok) return commitErr(req, env);
    return json({ ok: true, exp: await open() }, 200, req, env);
  }
  if (action === 'reset-user') { /* the owner clears a team member's password so they must choose a new one */
    if (!a.full) return json({ ok: false, error: 'no-access' }, 403, req, env);
    if (gate && !(exp > Date.now())) return json({ ok: false, error: 'locked' }, 403, req, env);
    const target = String(body.uid || '');
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(target) || target === uid) return json({ ok: false, error: 'bad-uid' }, 400, req, env);
    const t = await fsRead(env, tok, 'users/' + target);
    if (!t || t.data.isAdmin !== true || !Array.isArray(t.data.adminScope)) return json({ ok: false, error: 'not-a-team-member' }, 400, req, env);
    await fsCommit(env, tok, [{ delete: docName(env, 'admin_gate/' + target) }, { delete: docName(env, 'admin_sessions/' + target) }]);
    return json({ ok: true }, 200, req, env);
  }
  return json({ ok: false, error: 'bad-action' }, 400, req, env);
}

/* cancel (or collect the refund for) a direct proposal the freelancer has not accepted */
async function handleProposalCancel(req, env) {
  const c = await escrowCtx(req, env); if (c.err) return c.err;
  const id = String(c.body.proposalId || '');
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(id)) return json({ ok: false, error: 'bad-id' }, 400, req, env);
  const pr = await fsRead(env, c.tok, 'proposals/' + id);
  if (!pr) return json({ ok: false, error: 'not-found' }, 404, req, env);
  if (pr.data.fromUid !== c.uid) return json({ ok: false, error: 'not-eligible' }, 403, req, env);
  if (pr.data.status !== 'pending' && pr.data.status !== 'rejected') return json({ ok: false, error: 'not-cancellable' }, 400, req, env);
  const lock = await fsRead(env, c.tok, 'escrow_locks/' + id);
  const now = Date.now(), writes = []; let wallet = null, back = 0;
  if (pr.data.status === 'pending') writes.push({ update: { name: docName(env, 'proposals/' + id), fields: { status: toFS('cancelled') } }, updateMask: { fieldPaths: ['status'] }, currentDocument: { updateTime: pr.updateTime } });
  if (lock && lock.data.status === 'locked' && lock.data.uid === c.uid) {
    const me = await fsRead(env, c.tok, 'users/' + c.uid);
    if (!me) return json({ ok: false, error: 'no-user' }, 404, req, env);
    wallet = walletOf(me.data);
    back = Math.min(Number(lock.data.amount) || 0, wallet.pending || 0);
    wallet.pending -= back; wallet.balance = (wallet.balance || 0) + back;
    if (back > 0) wallet.transactions.unshift({ id: 'refund_' + id, type: 'in', amount: back, from: 'Escrow', desc: 'Escrow returned: ' + (pr.data.title || 'Proposal'), ts: now });
    writes.push({ update: { name: docName(env, 'users/' + c.uid), fields: { wallet: toFS(wallet) } }, updateMask: { fieldPaths: ['wallet'] }, currentDocument: { updateTime: me.updateTime } });
    writes.push({ update: { name: docName(env, 'escrow_locks/' + id), fields: { status: toFS('refunded'), refundedAt: toFS(now) } }, updateMask: { fieldPaths: ['status', 'refundedAt'] }, currentDocument: { updateTime: lock.updateTime } });
  }
  if (!writes.length) return json({ ok: true, nothing: true }, 200, req, env);
  if (!(await fsCommit(env, c.tok, writes))) return commitErr(req, env);
  return json({ ok: true, refunded: back, wallet: wallet }, 200, req, env);
}

/* admin: a dispute decision already moved the money, so retire the escrow lock */
async function handleEscrowSettle(req, env) {
  const a = await requireAdmin(req, env, 'disputes'); if (a.err) return a.err;
  let body = {}; try { body = await req.json(); } catch (e) {}
  const gigId = String(body.gigId || '');
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(gigId)) return json({ ok: false, error: 'bad-gig' }, 400, req, env);
  const gig = await fsRead(env, a.dsToken, 'gigs/' + gigId);
  const lock = await findLock(env, a.dsToken, gigId, gig && gig.data.proposalId);
  if (!lock || lock.data.status !== 'locked') return json({ ok: true, nothing: true }, 200, req, env);
  if (!(await fsCommit(env, a.dsToken, [{ update: { name: docName(env, 'escrow_locks/' + lock.key), fields: { status: toFS('settled'), settledAt: toFS(Date.now()), by: toFS(a.claims.sub) } }, updateMask: { fieldPaths: ['status', 'settledAt', 'by'] }, currentDocument: { updateTime: lock.updateTime } }]))) return commitErr(req, env);
  return json({ ok: true }, 200, req, env);
}

async function handleEscrow(req, env, kind) {
  if (!env.SA_JSON) return json({ ok: false, error: 'not configured' }, 503, req, env);
  const claims = await verifyAuth(req, env);
  if (!claims) return json({ ok: false, error: 'unauthorized' }, 401, req, env);
  let body = {}; try { body = await req.json(); } catch (e) {}
  const gigId = String(body.gigId || '');
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(gigId)) return json({ ok: false, error: 'bad-gig' }, 400, req, env);
  const uid = claims.sub;
  const rl = 'esc:' + uid + ':' + today();
  const n = parseInt((await env.SS_KV.get(rl)) || '0', 10);
  if (n >= 300) return json({ ok: false, error: 'rate-limited' }, 429, req, env);
  await env.SS_KV.put(rl, String(n + 1), { expirationTtl: 172800 });

  const tok = await getSaToken(env, 'SA_JSON', 'https://www.googleapis.com/auth/datastore');
  const gig = await fsRead(env, tok, 'gigs/' + gigId);
  if (!gig) return json({ ok: false, error: 'no-gig' }, 404, req, env);
  const g = gig.data, amount = Number(g.escrowAmount) || 0;
  if (!(amount > 0) || amount > 100000000) return json({ ok: false, error: 'no-escrow' }, 400, req, env);
  const now = Date.now();

  if (kind === 'claim') {
    /* the freelancer collects it, or the client triggers it the moment they approve the work */
    const payee = String(g.hiredUid || '');
    if (!payee || g.status !== 'completed' || (uid !== payee && uid !== g.posterUid)) return json({ ok: false, error: 'not-eligible' }, 403, req, env);
    const byPoster = uid !== payee;
    const done = await fsRead(env, tok, 'escrow_paid/' + gigId);
    const fl = await fsRead(env, tok, 'users/' + payee);
    if (!fl) return json({ ok: false, error: 'no-user' }, 404, req, env);
    const fw = walletOf(fl.data);
    if (done || fw.transactions.some((t) => t && t.id === 'pay_' + gigId)) {
      if (byPoster) { const pq = await fsRead(env, tok, 'users/' + uid); return json({ ok: true, already: true, wallet: pq ? walletOf(pq.data) : undefined }, 200, req, env); }
      return json({ ok: true, already: true, wallet: fw }, 200, req, env);
    }
    if (fl.data.walletMode === 'test') return json({ ok: false, error: 'test-mode' }, 400, req, env);
    const posterUid = String(g.posterUid || '');
    const po = await fsRead(env, tok, 'users/' + posterUid);
    if (!po) return json({ ok: false, error: 'no-client' }, 404, req, env);
    if (po.data.walletMode === 'test') return json({ ok: false, error: 'test-money' }, 400, req, env);
    const trusted = !!(g.resolution && typeof g.resolution === 'object' && g.resolution.by); // admin already settled the client's side
    const pw = walletOf(po.data);
    if (!trusted && (pw.pending || 0) < amount) return json({ ok: false, error: 'client-underfunded' }, 402, req, env);
    const lock = await findLock(env, tok, gigId, g.proposalId);
    if (lock && lock.data.status === 'refunded') return json({ ok: false, error: 'refunded' }, 409, req, env);
    const lockedHere = !!(lock && lock.data.status === 'locked' && lock.data.uid === posterUid);
    if (lockedHere && !trusted && amount > (Number(lock.data.amount) || 0)) return json({ ok: false, error: 'exceeds-lock' }, 400, req, env);
    if (!lockedHere && !trusted) { // unregistered escrow may only use money not reserved for other gigs
      const reserved = await lockedSum(env, tok, posterUid);
      if ((pw.pending || 0) - reserved < amount) return json({ ok: false, error: 'client-underfunded' }, 402, req, env);
    }
    const fee = Math.round(amount * 0.10), payout = amount - fee;
    fw.balance = (fw.balance || 0) + payout; fw.earned = (fw.earned || 0) + payout;
    fw.transactions.unshift({ id: 'pay_' + gigId, type: 'in', amount: payout, from: po.data.name || 'Client', desc: 'Payment: ' + (g.title || 'Gig'), ts: now });
    const writes = [
      { update: { name: docName(env, 'users/' + payee), fields: byPoster ? { wallet: toFS(fw), repDue: toFS((Array.isArray(fl.data.repDue) ? fl.data.repDue : []).filter((x) => x !== gigId).concat(gigId).slice(-50)) } : { wallet: toFS(fw) } }, updateMask: { fieldPaths: byPoster ? ['wallet', 'repDue'] : ['wallet'] }, currentDocument: { updateTime: fl.updateTime } },
      { update: { name: docName(env, 'escrow_paid/' + gigId), fields: { gigId: toFS(gigId), amount: toFS(amount), payout: toFS(payout), fee: toFS(fee), posterUid: toFS(posterUid), freelancerUid: toFS(payee), trusted: toFS(trusted), by: toFS(byPoster ? 'client' : 'freelancer'), at: toFS(now) } }, currentDocument: { exists: false } },
    ];
    if (lockedHere) writes.push({ update: { name: docName(env, 'escrow_locks/' + lock.key), fields: { status: toFS('released'), releasedAt: toFS(now) } }, updateMask: { fieldPaths: ['status', 'releasedAt'] }, currentDocument: { updateTime: lock.updateTime } });
    if (!trusted) { pw.pending = (pw.pending || 0) - amount; writes.unshift({ update: { name: docName(env, 'users/' + posterUid), fields: { wallet: toFS(pw) } }, updateMask: { fieldPaths: ['wallet'] }, currentDocument: { updateTime: po.updateTime } }); }
    if (!(await fsCommit(env, tok, writes))) return commitErr(req, env);
    try { /* never blocks the payout */
      const rk = await riskPayout(env, tok, gigId, g, po, fl, amount, now);
      if (rk.score >= 40) await raiseFlag(env, tok, 'po_' + gigId, { kind: 'payout', gigId: gigId, gigTitle: String(g.title || '').slice(0, 120), posterUid: posterUid, posterName: String(po.data.name || ''), payeeUid: payee, payeeName: String(fl.data.name || ''), amount: amount, payout: payout, reasons: rk.reasons }, rk.score, 'suspicious payout flagged (' + rk.score + ')', ['Payout of ' + NGN(payout) + ' to ' + (fl.data.name || 'a freelancer') + ' for "' + (g.title || 'a gig') + '".'].concat(rk.reasons));
    } catch (e) { console.error('risk check failed', e && e.message); }
    if (byPoster) return json({ ok: true, paid: true, payout: payout, wallet: pw }, 200, req, env);
    return json({ ok: true, wallet: fw, payout: payout }, 200, req, env);
  }

  /* refund: the client withdraws an open gig that nobody was hired for (needs a server-side lock) */
  if (g.posterUid !== uid) return json({ ok: false, error: 'not-eligible' }, 403, req, env);
  if (g.hiredUid || g.status !== 'open') return json({ ok: false, error: 'already-hired' }, 400, req, env);
  const lk = await fsRead(env, tok, 'escrow_locks/' + gigId);
  if (!lk || lk.data.uid !== uid) return json({ ok: false, error: 'no-lock' }, 409, req, env);
  if (lk.data.status !== 'locked') return json({ ok: false, error: 'already-refunded' }, 409, req, env);
  const me = await fsRead(env, tok, 'users/' + uid);
  if (!me) return json({ ok: false, error: 'no-user' }, 404, req, env);
  const w = walletOf(me.data);
  const back = Math.min(Number(lk.data.amount) || 0, w.pending || 0);
  w.pending = (w.pending || 0) - back; w.balance = (w.balance || 0) + back;
  if (back > 0) w.transactions.unshift({ id: 'refund_' + gigId, type: 'in', amount: back, from: 'Escrow', desc: 'Escrow returned: ' + (g.title || 'Gig'), ts: now });
  const ok = await fsCommit(env, tok, [
    { update: { name: docName(env, 'users/' + uid), fields: { wallet: toFS(w) } }, updateMask: { fieldPaths: ['wallet'] }, currentDocument: { updateTime: me.updateTime } },
    { update: { name: docName(env, 'escrow_locks/' + gigId), fields: { status: toFS('refunded'), refundedAt: toFS(now) } }, updateMask: { fieldPaths: ['status', 'refundedAt'] }, currentDocument: { updateTime: lk.updateTime } },
    { delete: docName(env, 'gigs/' + gigId), currentDocument: { updateTime: gig.updateTime } },
  ]);
  if (!ok) return commitErr(req, env);
  return json({ ok: true, wallet: w, refunded: back }, 200, req, env);
}


/* ---------- admin: permanently delete a sign-in account ---------- */
async function handleDeleteUser(req, env) {
  if (!env.SA_AUTH_JSON || !env.SA_JSON) return json({ ok: false, error: 'not configured' }, 503, req, env);
  const auth = req.headers.get('Authorization') || '';
  let claims;
  try { claims = await verifyIdToken(auth.startsWith('Bearer ') ? auth.slice(7) : '', env.FIREBASE_PROJECT_ID); }
  catch (e) { return json({ ok: false, error: 'unauthorized' }, 401, req, env); }
  let body = {};
  try { body = await req.json(); } catch (e) {}
  const target = String(body.uid || '');
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(target)) return json({ ok: false, error: 'bad uid' }, 400, req, env);
  if (target === claims.sub) return json({ ok: false, error: 'cannot delete yourself' }, 400, req, env);

  // the caller must be an admin according to their own Firestore profile
  const dsToken = await getSaToken(env, 'SA_JSON', 'https://www.googleapis.com/auth/datastore');
  const base = 'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/users/';
  const me = await fetch(base + encodeURIComponent(claims.sub), { headers: { Authorization: 'Bearer ' + dsToken } });
  if (!me.ok) return json({ ok: false, error: 'forbidden' }, 403, req, env);
  const mf = (await me.json()).fields || {};
  if (!(mf.isAdmin && mf.isAdmin.booleanValue === true)) return json({ ok: false, error: 'forbidden' }, 403, req, env);
  if (mf.adminScope && !(((mf.adminScope.arrayValue && mf.adminScope.arrayValue.values) || []).some((v) => v.stringValue === 'users'))) return json({ ok: false, error: 'no-access' }, 403, req, env);
  // never delete another admin
  const tr = await fetch(base + encodeURIComponent(target), { headers: { Authorization: 'Bearer ' + dsToken } });
  if (tr.ok) {
    const tf = (await tr.json()).fields || {};
    if (tf.isAdmin && tf.isAdmin.booleanValue === true) return json({ ok: false, error: 'target is an admin' }, 403, req, env);
  }
  const token = await getSaToken(env, 'SA_AUTH_JSON', 'https://www.googleapis.com/auth/identitytoolkit');
  const r = await fetch('https://identitytoolkit.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/accounts:delete', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: target }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    if (!/USER_NOT_FOUND|EMAIL_NOT_FOUND/.test(t)) { console.error('delete user failed', r.status, t.slice(0, 200)); return json({ ok: false, error: 'failed' }, 502, req, env); }
  }
  console.log('admin ' + claims.sub + ' deleted account ' + target);
  return json({ ok: true }, 200, req, env);
}

/* ---------- handlers ---------- */
async function handleWelcome(req, env) {
  const auth = req.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let claims;
  try { claims = await verifyIdToken(token, env.FIREBASE_PROJECT_ID); }
  catch (e) { return json({ ok: false, error: 'unauthorized' }, 401, req, env); }

  const email = String(claims.email || '').toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'no email on account' }, 400, req, env);

  let body = {};
  try { body = await req.json(); } catch (e) {}
  const name = cleanName(body.name || claims.name || '');
  const role = body.role === 'employer' ? 'employer' : 'freelancer';

  // one welcome per account
  const sentKey = 'welcome:' + claims.sub;
  if (await env.SS_KV.get(sentKey)) return json({ ok: true, already: true }, 200, req, env);

  // abuse / quota guards
  const day = today();
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const ipKey = 'ip:' + ip + ':' + day;
  const capKey = 'cap:' + day;
  const ipCount = parseInt((await env.SS_KV.get(ipKey)) || '0', 10);
  const capCount = parseInt((await env.SS_KV.get(capKey)) || '0', 10);
  const cap = parseInt(env.DAILY_CAP || '250', 10);
  if (ipCount >= 10) return json({ ok: false, error: 'rate limited' }, 429, req, env);
  if (capCount >= cap) return json({ ok: false, error: 'daily limit reached' }, 429, req, env);

  try {
    await sendBrevo(env, email, name, welcomeEmail(name, role, !!env.REPLY_TO));
  } catch (e) {
    console.error('welcome send failed', e && e.message);
    return json({ ok: false, error: 'send failed' }, 502, req, env);
  }
  await env.SS_KV.put(sentKey, '1');
  await env.SS_KV.put(ipKey, String(ipCount + 1), { expirationTtl: 172800 });
  await env.SS_KV.put(capKey, String(capCount + 1), { expirationTtl: 172800 });
  return json({ ok: true }, 200, req, env);
}

/* ============================================================
   PROMO / CAMPAIGN EMAILS
   - members opt in (users.promoOptIn === true); unsubscribe links work without logging in
   - admin starts a campaign from the admin panel; the cron sends it in small batches
   - never uses the last part of the daily email allowance (kept for welcome/notification emails)
   ============================================================ */
const WORKER_URL_DEFAULT = 'https://skillstamp-email.tegapeters94.workers.dev';

async function hmacSig(env, msg) {
  const secret = env.UNSUB_SECRET || env.BREVO_API_KEY || '';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg))).slice(0, 32);
}
async function unsubUrl(env, uid) {
  const base = env.PUBLIC_URL || WORKER_URL_DEFAULT;
  return base + '/unsub?u=' + encodeURIComponent(uid) + '&t=' + (await hmacSig(env, 'unsub:' + uid));
}

function safeHttps(u) {
  try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.toString() : ''; } catch (e) { return ''; }
}

function promoEmail(c, name, unsub) {
  const B = BRAND;
  const first = cleanName(name).split(' ')[0] || 'there';
  const paras = String(c.body || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).slice(0, 12);
  const ctaUrl = safeHttps(c.ctaUrl);
  const ctaText = String(c.ctaText || '').slice(0, 40);
  const bodyHtml = paras.map((p) => `<div style="font-family:${FONT};font-size:16px;line-height:1.65;color:${B.body};margin-top:12px;">${esc(p).replace(/\n/g, '<br>')}</div>`).join('');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${B.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(c.preheader || (paras[0] || '').slice(0, 120))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.page};"><tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${B.line};border-radius:20px;overflow:hidden;">
<tr><td align="center" bgcolor="${B.dark}" style="background:${B.dark};background-image:linear-gradient(135deg,#0f5430 0%,${B.dark} 70%);padding:26px 28px;">
  <img src="${B.logo}" width="44" height="44" alt="SkillStamp" style="display:inline-block;vertical-align:middle;width:44px;height:44px;border:0;">
  <span style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;vertical-align:middle;margin-left:8px;">Skill<span style="color:${B.mint};">Stamp</span></span>
</td></tr>
<tr><td style="padding:34px 36px 8px;">
  ${c.eyebrow ? `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${B.green};">${esc(c.eyebrow)}</div>` : ''}
  <div style="font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${B.ink};margin-top:10px;">${esc(c.heading || c.subject)}</div>
  <div style="font-family:${FONT};font-size:16px;line-height:1.65;color:${B.body};margin-top:14px;">Hi ${esc(first)},</div>
  ${bodyHtml}
</td></tr>
${ctaUrl && ctaText ? `<tr><td align="left" style="padding:22px 36px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${B.green}" style="background:${B.green};border-radius:12px;">
    <a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(ctaText)}</a>
  </td></tr></table>
</td></tr>` : '<tr><td style="padding:0 0 22px;"></td></tr>'}
<tr><td style="padding:22px 36px 28px;border-top:1px solid ${B.line};background:#fafbf8;">
  <div style="font-family:${FONT};font-size:12px;line-height:1.7;color:${B.muted};">You are receiving this because you chose to hear about SkillStamp news and offers. <a href="${esc(unsub)}" style="color:${B.green};text-decoration:underline;">Unsubscribe</a> at any time, or change it in Settings on <a href="${B.site}" style="color:${B.green};text-decoration:none;">skillstamp.cv</a>.</div>
  <div style="font-family:${FONT};font-size:12px;color:${B.muted};margin-top:10px;">&copy; ${new Date().getUTCFullYear()} SkillStamp</div>
</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${c.heading || c.subject}\n\nHi ${first},\n\n${paras.join('\n\n')}\n` +
    (ctaUrl && ctaText ? `\n${ctaText}: ${ctaUrl}\n` : '') +
    `\nYou are receiving this because you chose to hear about SkillStamp news and offers.\nUnsubscribe: ${unsub}`;
  return {
    subject: c.subject, html, text,
    headers: { 'List-Unsubscribe': '<' + unsub + '>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  };
}

async function requireAdmin(req, env, need, opts) {
  if (!env.SA_JSON) return { err: json({ ok: false, error: 'not configured' }, 503, req, env) };
  const auth = req.headers.get('Authorization') || '';
  let claims;
  try { claims = await verifyIdToken(auth.startsWith('Bearer ') ? auth.slice(7) : '', env.FIREBASE_PROJECT_ID); }
  catch (e) { return { err: json({ ok: false, error: 'unauthorized' }, 401, req, env) }; }
  const dsToken = await getSaToken(env, 'SA_JSON', 'https://www.googleapis.com/auth/datastore');
  const base = 'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents';
  const me = await fetch(base + '/users/' + encodeURIComponent(claims.sub), { headers: { Authorization: 'Bearer ' + dsToken } });
  if (!me.ok) return { err: json({ ok: false, error: 'forbidden' }, 403, req, env) };
  const mf = (await me.json()).fields || {};
  if (!(mf.isAdmin && mf.isAdmin.booleanValue === true)) return { err: json({ ok: false, error: 'forbidden' }, 403, req, env) };
  /* an admin with no adminScope is the full admin (the owner); anyone else only gets the tools listed in adminScope */
  const full = !mf.adminScope;
  const scope = full ? null : ((mf.adminScope.arrayValue && mf.adminScope.arrayValue.values) || []).map((v) => v.stringValue).filter(Boolean);
  if (need === 'owner' && !full) return { err: json({ ok: false, error: 'no-access' }, 403, req, env) };
  if (need && need !== 'owner' && !full && scope.indexOf(need) < 0) return { err: json({ ok: false, error: 'no-access' }, 403, req, env) };
  /* if this admin set a password, the panel must be unlocked */
  if (!(opts && opts.noGate)) {
    const g = await fsRead(env, dsToken, 'admin_gate/' + claims.sub);
    if (g) {
      const ss = await fsRead(env, dsToken, 'admin_sessions/' + claims.sub);
      if (!ss || !(Number(ss.data.exp) > Date.now())) return { err: json({ ok: false, error: 'locked' }, 403, req, env) };
    }
  }
  return { claims, dsToken, base, name: fv(mf.name), full, scope };
}

function campSummary(c) {
  return { id: c.id, subject: c.subject, status: c.status, total: c.u.length, sent: c.sent, failed: c.failed, skipped: c.skipped, createdAt: c.createdAt, audience: c.audience };
}

async function handleCampaign(req, env) {
  const a = await requireAdmin(req, env, 'campaigns');
  if (a.err) return a.err;
  let body = {};
  try { body = await req.json(); } catch (e) {}
  const action = String(body.action || '');

  if (action === 'status') {
    const id = await env.SS_KV.get('camp_active');
    const last = await env.SS_KV.get('camp_last');
    const out = { ok: true, active: null, last: null };
    if (id) { const c = await env.SS_KV.get('camp:' + id, 'json'); if (c) out.active = campSummary(c); }
    if (last) { try { out.last = JSON.parse(last); } catch (e) {} }
    const day = today();
    out.sentToday = parseInt((await env.SS_KV.get('cap:' + day)) || '0', 10);
    out.dailyCap = parseInt(env.DAILY_CAP || '250', 10);
    out.reserve = parseInt(env.CAMPAIGN_RESERVE || '60', 10);
    return json(out, 200, req, env);
  }

  if (action === 'cancel') {
    const id = await env.SS_KV.get('camp_active');
    if (id) {
      const c = await env.SS_KV.get('camp:' + id, 'json');
      if (c) { c.status = 'cancelled'; await env.SS_KV.put('camp:' + id, JSON.stringify(c), { expirationTtl: 30 * 86400 }); await env.SS_KV.put('camp_last', JSON.stringify(campSummary(c)), { expirationTtl: 30 * 86400 }); }
      await env.SS_KV.delete('camp_active');
    }
    return json({ ok: true }, 200, req, env);
  }

  // validate content for test / start
  const c = {
    subject: String(body.subject || '').trim().slice(0, 120),
    eyebrow: String(body.eyebrow || '').trim().slice(0, 40),
    heading: String(body.heading || '').trim().slice(0, 120),
    body: String(body.body || '').trim().slice(0, 3000),
    ctaText: String(body.ctaText || '').trim().slice(0, 40),
    ctaUrl: String(body.ctaUrl || '').trim().slice(0, 500),
    audience: ['freelancer', 'employer'].includes(body.audience) ? body.audience : 'all',
  };
  if (c.subject.length < 3) return json({ ok: false, error: 'Add a subject line (at least 3 characters).' }, 400, req, env);
  if (c.body.length < 10) return json({ ok: false, error: 'The message is too short.' }, 400, req, env);
  if (c.ctaUrl && !safeHttps(c.ctaUrl)) return json({ ok: false, error: 'The button link must start with https://' }, 400, req, env);
  if ((c.ctaUrl && !c.ctaText) || (c.ctaText && !c.ctaUrl)) return json({ ok: false, error: 'A button needs both text and a link.' }, 400, req, env);

  if (action === 'test') {
    const to = String(a.claims.email || '').toLowerCase();
    if (!to) return json({ ok: false, error: 'No email on your account.' }, 400, req, env);
    const cap = parseInt(env.DAILY_CAP || '250', 10);
    const day = today();
    const capCount = parseInt((await env.SS_KV.get('cap:' + day)) || '0', 10);
    if (capCount >= cap) return json({ ok: false, error: 'Daily email limit reached.' }, 429, req, env);
    const mail = promoEmail(c, a.name, await unsubUrl(env, a.claims.sub));
    mail.subject = '[Test] ' + mail.subject;
    try { await sendBrevo(env, to, a.name, mail); } catch (e) { console.error('campaign test failed', e && e.message); return json({ ok: false, error: 'Could not send the test.' }, 502, req, env); }
    await env.SS_KV.put('cap:' + day, String(capCount + 1), { expirationTtl: 172800 });
    return json({ ok: true, to }, 200, req, env);
  }

  if (action === 'start') {
    if (await env.SS_KV.get('camp_active')) return json({ ok: false, error: 'A campaign is already sending. Wait for it to finish or cancel it first.' }, 409, req, env);
    const q = { structuredQuery: {
      from: [{ collectionId: 'users' }],
      where: { fieldFilter: { field: { fieldPath: 'promoOptIn' }, op: 'EQUAL', value: { booleanValue: true } } },
      select: { fields: [{ fieldPath: 'name' }, { fieldPath: 'role' }, { fieldPath: 'isBanned' }, { fieldPath: 'badgeStatus' }, { fieldPath: 'deleted' }] },
      limit: 2000,
    } };
    const r = await fetch(a.base + ':runQuery', { method: 'POST', headers: { Authorization: 'Bearer ' + a.dsToken, 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
    if (!r.ok) { console.error('campaign query', r.status, (await r.text()).slice(0, 200)); return json({ ok: false, error: 'Could not read the audience.' }, 502, req, env); }
    const rows = (await r.json()).filter((x) => x.document);
    const u = [];
    for (const row of rows) {
      const f = row.document.fields || {};
      const uid = row.document.name.split('/').pop();
      if (fv(f.isBanned) === true || fv(f.badgeStatus) === 'suspended' || fv(f.deleted) === true) continue;
      const role = fv(f.role);
      if (c.audience !== 'all' && role !== c.audience) continue;
      u.push([uid, cleanName(fv(f.name))]);
    }
    if (!u.length) return json({ ok: false, error: 'Nobody has opted in for that audience yet.' }, 400, req, env);
    const id = 'c' + Date.now().toString(36);
    const camp = Object.assign({ id, status: 'sending', u, idx: 0, sent: 0, failed: 0, skipped: 0, createdAt: Date.now(), by: a.claims.sub }, c);
    await env.SS_KV.put('camp:' + id, JSON.stringify(camp), { expirationTtl: 30 * 86400 });
    await env.SS_KV.put('camp_active', id, { expirationTtl: 30 * 86400 });
    return json({ ok: true, id, total: u.length }, 200, req, env);
  }
  return json({ ok: false, error: 'unknown action' }, 400, req, env);
}

async function runCampaignJob(env) {
  const id = await env.SS_KV.get('camp_active');
  if (!id) return;
  const camp = await env.SS_KV.get('camp:' + id, 'json');
  if (!camp || camp.status !== 'sending') { await env.SS_KV.delete('camp_active'); return; }
  const cap = parseInt(env.DAILY_CAP || '250', 10), reserve = parseInt(env.CAMPAIGN_RESERVE || '60', 10);
  const day = today();
  let capCount = parseInt((await env.SS_KV.get('cap:' + day)) || '0', 10);
  const room = cap - reserve - capCount;
  if (room <= 0) { console.log('campaign paused: daily allowance used'); return; }
  const size = Math.min(parseInt(env.CAMPAIGN_BATCH || '8', 10), room, camp.u.length - camp.idx);
  const batch = camp.u.slice(camp.idx, camp.idx + size);
  camp.idx += size;                       // advance first: a crash can lose a few sends but never double-send
  const finish = camp.idx >= camp.u.length;
  if (finish) camp.status = 'done';
  await env.SS_KV.put('camp:' + id, JSON.stringify(camp), { expirationTtl: 30 * 86400 });

  const token = await getSaToken(env);
  const root = 'projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents/';
  const bg = async (col, mask) => {
    const r = await fetch('https://firestore.googleapis.com/v1/' + root.replace(/\/$/, '') + ':batchGet', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents: batch.map((b) => root + col + '/' + b[0]), mask: { fieldPaths: mask } }),
    });
    const out = {};
    if (!r.ok) { console.error('batchGet ' + col, r.status); return out; }
    for (const x of await r.json()) if (x.found) out[x.found.name.split('/').pop()] = x.found.fields || {};
    return out;
  };
  const priv = await bg('users_private', ['email']);
  const pub = await bg('users', ['email', 'promoOptIn', 'isBanned', 'badgeStatus', 'name', 'deleted']);
  let sent = 0;
  for (const [uid, nm] of batch) {
    const p = pub[uid] || {};
    const email = String(fv((priv[uid] || {}).email) || fv(p.email) || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || fv(p.promoOptIn) !== true || fv(p.isBanned) === true || fv(p.deleted) === true || fv(p.badgeStatus) === 'suspended' || await env.SS_KV.get('unsub:' + uid)) { camp.skipped++; continue; }
    try {
      await sendBrevo(env, email, nm || cleanName(fv(p.name)), promoEmail(camp, nm || fv(p.name), await unsubUrl(env, uid)));
      camp.sent++; sent++;
    } catch (e) { camp.failed++; console.error('campaign send failed', uid, e && e.message); }
  }
  await env.SS_KV.put('camp:' + id, JSON.stringify(camp), { expirationTtl: 30 * 86400 });
  if (sent) await env.SS_KV.put('cap:' + day, String(capCount + sent), { expirationTtl: 172800 });
  if (finish) {
    await env.SS_KV.put('camp_last', JSON.stringify(campSummary(camp)), { expirationTtl: 30 * 86400 });
    await env.SS_KV.delete('camp_active');
  }
}

/* ---------- unsubscribe (no login needed) + opt-in sync ---------- */
function pageHtml(title, msg, extra) {
  const B = BRAND;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:${B.page};font-family:${FONT};"><div style="max-width:460px;margin:12vh auto;padding:0 16px;"><div style="background:#fff;border:1px solid ${B.line};border-radius:20px;overflow:hidden;">
<div style="background:${B.dark};padding:22px;text-align:center;"><img src="${B.logo}" width="40" height="40" alt="" style="vertical-align:middle;border:0;"><span style="font-size:20px;font-weight:800;color:#fff;margin-left:8px;vertical-align:middle;">Skill<span style="color:${B.mint};">Stamp</span></span></div>
<div style="padding:28px 28px 30px;"><div style="font-size:21px;font-weight:800;color:${B.ink};margin-bottom:10px;">${esc(title)}</div><div style="font-size:15px;line-height:1.6;color:${B.body};">${esc(msg)}</div>${extra || ''}
<div style="margin-top:22px;"><a href="${B.site}" style="color:${B.green};font-weight:700;text-decoration:none;">Back to SkillStamp &rarr;</a></div></div></div></div></body></html>`;
}
const HTML_H = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

async function handleUnsub(req, env, url) {
  const uid = String(url.searchParams.get('u') || ''), t = String(url.searchParams.get('t') || '');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !t || t !== (await hmacSig(env, 'unsub:' + uid))) {
    return new Response(pageHtml('Link not valid', 'This unsubscribe link is not valid. You can turn promotional emails off any time in Settings inside SkillStamp.'), { status: 400, headers: HTML_H });
  }
  if (req.method === 'POST') {
    await env.SS_KV.put('unsub:' + uid, '1');
    return new Response(pageHtml('You are unsubscribed', 'You will not receive promotional emails from SkillStamp any more. You will still get emails about your own activity, such as proposals and payments.'), { headers: HTML_H });
  }
  const form = `<form method="POST" action="${esc(url.pathname + url.search)}" style="margin-top:20px;"><button type="submit" style="background:${BRAND.green};color:#fff;border:0;border-radius:12px;padding:13px 26px;font-size:15px;font-weight:700;cursor:pointer;">Yes, unsubscribe me</button></form>`;
  return new Response(pageHtml('Unsubscribe from promotional emails?', 'You will stop getting news and offers from SkillStamp. Emails about your own activity are not affected.', form), { headers: HTML_H });
}

async function handlePromo(req, env, url) {
  const auth = req.headers.get('Authorization') || '';
  let claims;
  try { claims = await verifyIdToken(auth.startsWith('Bearer ') ? auth.slice(7) : '', env.FIREBASE_PROJECT_ID); }
  catch (e) { return json({ ok: false, error: 'unauthorized' }, 401, req, env); }
  if (url.pathname === '/promo/state') {
    return json({ ok: true, unsub: !!(await env.SS_KV.get('unsub:' + claims.sub)) }, 200, req, env);
  }
  if (url.pathname === '/promo/optin') { await env.SS_KV.delete('unsub:' + claims.sub); return json({ ok: true }, 200, req, env); }
  if (url.pathname === '/promo/optout') { await env.SS_KV.put('unsub:' + claims.sub, '1'); return json({ ok: true }, 200, req, env); }
  return json({ ok: false, error: 'not found' }, 404, req, env);
}

function originOk(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return !!origin && allowed.includes(origin);
}

/* ── error alerts: email the owner when a NEW kind of app error appears ── */
async function runErrorAlerts(env) {
  if (!env.SA_JSON || !env.BREVO_API_KEY || !env.ALERT_EMAIL) return;
  const day = today();
  const capKey = 'erralerts:' + day;
  let sentToday = parseInt((await env.SS_KV.get(capKey)) || '0', 10);
  if (sentToday >= 5) return;
  const nowMs = Date.now();
  let cursor = parseInt((await env.SS_KV.get('err:last')) || '0', 10);
  if (!cursor) { await env.SS_KV.put('err:last', String(nowMs)); return; }
  const token = await getSaToken(env);
  const base = 'https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT_ID + '/databases/(default)/documents';
  const q = { structuredQuery: {
    from: [{ collectionId: 'client_errors' }],
    where: { fieldFilter: { field: { fieldPath: 'ts' }, op: 'GREATER_THAN', value: { integerValue: String(cursor) } } },
    orderBy: [{ field: { fieldPath: 'ts' }, direction: 'ASCENDING' }],
    limit: 30,
  } };
  const r = await fetch(base + ':runQuery', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(q) });
  if (!r.ok) throw new Error('err query ' + r.status);
  const rows = (await r.json()).filter((x) => x.document);
  if (!rows.length) return;
  let maxTs = cursor; const fresh = [];
  for (const row of rows) {
    const f = row.document.fields || {};
    const ts = fv(f.ts) || 0; if (ts > maxTs) maxTs = ts;
    const sig = fv(f.sig); if (!sig) continue;
    if (fresh.find((x) => x.sig === sig)) continue;
    if (await env.SS_KV.get('errseen:' + sig)) continue;
    await env.SS_KV.put('errseen:' + sig, '1', { expirationTtl: 7 * 86400 });
    fresh.push({ sig, type: fv(f.type), msg: fv(f.msg), path: fv(f.path), code: fv(f.code), col: fv(f.col) });
  }
  await env.SS_KV.put('err:last', String(maxTs));
  if (!fresh.length) return;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const list = fresh.slice(0, 8);
  const html = '<p>SkillStamp members hit ' + fresh.length + ' new kind(s) of error:</p><ul>' + list.map((e) => '<li><b>' + esc(e.type) + '</b> on ' + esc(e.path) + '<br>' + esc(e.msg) + '</li>').join('') + '</ul><p>Open Admin &rarr; Overview &rarr; App errors for details.</p>';
  const text = 'New SkillStamp errors:\n' + list.map((e) => '- [' + e.type + '] ' + e.path + ': ' + e.msg).join('\n') + '\nSee Admin > Overview > App errors.';
  await sendBrevo(env, env.ALERT_EMAIL, 'Admin', { subject: 'SkillStamp: ' + fresh.length + ' new app error' + (fresh.length > 1 ? 's' : ''), html, text });
  await env.SS_KV.put(capKey, String(sentToday + 1), { expirationTtl: 172800 });
}

/* ---------- referrals ----------
   Every member has a code (referral_codes/{CODE} -> uid). A new member claims a code once, within a few days of signing up
   (referrals/{newMemberUid}). The bonus is paid by the Worker only, after it re-checks the rules itself:
   freelancer = skill verification approved; client = profile complete + a live-funded gig of at least the minimum, with a freelancer hired. */
const REF_VERIFIED = ['verified', 'expert', 'elite'];
async function refSettings(env, tok) {
  const d = await fsRead(env, tok, 'payment_settings/referral'); const x = d ? d.data : {};
  const n = (v, def, lo, hi) => { v = Number(v); return v >= lo && v <= hi ? v : def; };
  return { enabled: x.enabled !== false, freelancerBonus: n(x.freelancerBonus, 500, 0, 100000), clientBonus: n(x.clientBonus, 1000, 0, 100000), minGig: n(x.minGig, 10000, 0, 10000000), windowDays: n(x.windowDays, 7, 0, 365) };
}
function clientProfileDone(u) {
  return !!u.avatar && !!String(u.name || '').trim() && String(u.bio || '').length >= 30 && !!String(u.country || '').trim() && !!String(u.city || '').trim() && !!String(u.industry || '').trim() && Array.isArray(u.projectTypes) && u.projectTypes.length >= 1;
}
async function refEvaluate(env, tok, rid) {
  const rf = await fsRead(env, tok, 'referrals/' + rid);
  if (!rf) return { status: 'none' };
  if (rf.data.status !== 'pending') return { status: rf.data.status, progress: rf.data.progress || {} };
  const s = await refSettings(env, tok);
  const ru = await fsRead(env, tok, 'users/' + rid), rr = await fsRead(env, tok, 'users/' + rf.data.referrerUid);
  if (!ru || !rr) return { status: 'pending', progress: rf.data.progress || {} };
  let prog, met, bonus;
  if (rf.data.role === 'freelancer') {
    prog = { verified: ru.data.role === 'freelancer' && REF_VERIFIED.indexOf(ru.data.badgeStatus) >= 0 }; met = prog.verified; bonus = s.freelancerBonus;
  } else {
    const gigs = await listBy(env, tok, 'gigs', 'posterUid', rid);
    const live = gigs.filter((g) => g.escrowOk === true && Number(g.escrowAmount) >= s.minGig);
    prog = { profile: ru.data.role === 'employer' && clientProfileDone(ru.data), posted: live.length > 0, hired: live.some((g) => g.hiredUid && g.hiredUid !== rid && g.hiredUid !== rf.data.referrerUid) };
    met = prog.profile && prog.posted && prog.hired; bonus = s.clientBonus;
  }
  const changed = JSON.stringify(prog) !== JSON.stringify(rf.data.progress || null);
  const keep = async (extra) => {
    if (changed || extra) await fsCommit(env, tok, [{ update: { name: docName(env, 'referrals/' + rid), fields: { progress: toFS(prog), checkedAt: toFS(Date.now()) } }, updateMask: { fieldPaths: ['progress', 'checkedAt'] }, currentDocument: { updateTime: rf.updateTime } }]);
  };
  if (!met || !s.enabled || !(bonus > 0) || rr.data.isBanned === true || ru.data.isBanned === true) { await keep(false); return { status: 'pending', progress: prog }; }
  if (rr.data.walletMode === 'test') { await keep(false); return { status: 'pending', progress: prog, blocked: 'test-wallet' }; }
  const now = Date.now(), w = walletOf(rr.data), tid = 'ref_' + rid;
  if (w.transactions.some((t) => t && t.id === tid)) { await fsCommit(env, tok, [{ update: { name: docName(env, 'referrals/' + rid), fields: { status: toFS('paid'), progress: toFS(prog), bonus: toFS(bonus), paidAt: toFS(now) } }, updateMask: { fieldPaths: ['status', 'progress', 'bonus', 'paidAt'] }, currentDocument: { updateTime: rf.updateTime } }]); return { status: 'paid', progress: prog }; }
  w.balance = (w.balance || 0) + bonus;
  w.transactions.unshift({ id: tid, type: 'in', amount: bonus, from: 'SkillStamp', desc: 'Referral bonus: ' + String(rf.data.referredName || 'new member'), ts: now });
  const nid = 'notif_ref_' + rid;
  const ok = await fsCommit(env, tok, [
    { update: { name: docName(env, 'users/' + rf.data.referrerUid), fields: { wallet: toFS(w) } }, updateMask: { fieldPaths: ['wallet'] }, currentDocument: { updateTime: rr.updateTime } },
    { update: { name: docName(env, 'referrals/' + rid), fields: { status: toFS('paid'), progress: toFS(prog), bonus: toFS(bonus), paidAt: toFS(now), checkedAt: toFS(now) } }, updateMask: { fieldPaths: ['status', 'progress', 'bonus', 'paidAt', 'checkedAt'] }, currentDocument: { updateTime: rf.updateTime } },
    { update: { name: docName(env, 'notifications/' + nid), fields: { id: toFS(nid), uid: toFS(rf.data.referrerUid), type: toFS('payment'), title: toFS('🎁 Referral bonus earned'), body: toFS(String(rf.data.referredName || 'Your referral') + ' met the requirements. ' + NGN(bonus) + ' was added to your wallet.'), meta: toFS({ type: 'referral' }), read: toFS(false), ts: toFS(now), fromUid: toFS(null) } }, currentDocument: { exists: false } },
  ]);
  if (!ok) return { status: 'pending', progress: prog, error: 'busy' };
  return { status: 'paid', progress: prog, bonus: bonus };
}
async function handleReferral(req, env, kind) {
  const c = await escrowCtx(req, env); if (c.err) return c.err;
  const uid = c.uid, now = Date.now();
  if (kind === 'claim') {
    const code = String(c.body.code || '').trim().toUpperCase();
    if (!/^SS[A-Z0-9]{6}$/.test(code)) return json({ ok: false, error: 'bad-code' }, 400, req, env);
    const cd = await fsRead(env, c.tok, 'referral_codes/' + code);
    if (!cd) return json({ ok: false, error: 'unknown-code' }, 404, req, env);
    const referrerUid = String(cd.data.uid || '');
    if (referrerUid === uid) return json({ ok: false, error: 'own-code' }, 400, req, env);
    if (await fsRead(env, c.tok, 'referrals/' + uid)) return json({ ok: true, already: true }, 200, req, env);
    const me = await fsRead(env, c.tok, 'users/' + uid), rr = await fsRead(env, c.tok, 'users/' + referrerUid);
    if (!me || !rr) return json({ ok: false, error: 'no-user' }, 404, req, env);
    if (me.data.role !== 'freelancer' && me.data.role !== 'employer') return json({ ok: false, error: 'not-eligible' }, 400, req, env);
    if (me.data.isAdmin === true || rr.data.isBanned === true) return json({ ok: false, error: 'not-eligible' }, 400, req, env);
    const s = await refSettings(env, c.tok);
    if (now - (Number(me.data.created) || 0) > s.windowDays * 86400000) return json({ ok: false, error: 'too-late', days: s.windowDays }, 400, req, env);
    if (await fsRead(env, c.tok, 'referrals/' + referrerUid) && (await fsRead(env, c.tok, 'referrals/' + referrerUid)).data.referrerUid === uid) return json({ ok: false, error: 'not-eligible' }, 400, req, env);
    const ok = await fsCommit(env, c.tok, [{ update: { name: docName(env, 'referrals/' + uid), fields: { referredUid: toFS(uid), referredName: toFS(String(me.data.name || '').slice(0, 80)), role: toFS(me.data.role), referrerUid: toFS(referrerUid), referrerName: toFS(String(rr.data.name || '').slice(0, 80)), code: toFS(code), status: toFS('pending'), created: toFS(now), progress: toFS({}) } }, currentDocument: { exists: false } }]);
    if (!ok) return commitErr(req, env);
    const ev = await refEvaluate(env, c.tok, uid).catch(() => ({ status: 'pending' }));
    return json({ ok: true, claimed: true, status: ev.status }, 200, req, env);
  }
  if (kind === 'check') {
    const ev = await refEvaluate(env, c.tok, uid).catch(() => ({ status: 'none' }));
    return json({ ok: true, status: ev.status }, 200, req, env);
  }
  /* kind === 'me': my code, the people I referred (re-checked now so a due bonus is paid), and whether someone referred me */
  const codes = (await listBy(env, c.tok, 'referral_codes', 'uid', uid)).sort((a, b) => (a.created || 0) - (b.created || 0));
  let code = codes[0] && codes[0]._id;
  for (let i = 0; !code && i < 5; i++) {
    const cand = 'SS' + randCode(6);
    if (await fsCommit(env, c.tok, [{ update: { name: docName(env, 'referral_codes/' + cand), fields: { uid: toFS(uid), created: toFS(now) } }, currentDocument: { exists: false } }])) code = cand;
  }
  if (!code) return commitErr(req, env);
  let list = await listBy(env, c.tok, 'referrals', 'referrerUid', uid);
  let paidNow = false;
  for (const r of list.filter((x) => x.status === 'pending').slice(0, 15)) { try { const ev = await refEvaluate(env, c.tok, r._id); if (ev.status === 'paid') paidNow = true; } catch (e) {} }
  if (list.some((x) => x.status === 'pending')) list = await listBy(env, c.tok, 'referrals', 'referrerUid', uid);
  const mine = await fsRead(env, c.tok, 'referrals/' + uid);
  const s = await refSettings(env, c.tok);
  const out = list.sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 100).map((r) => ({ name: String(r.referredName || 'Member'), role: r.role, status: r.status, bonus: r.bonus || 0, created: r.created || 0, paidAt: r.paidAt || 0, progress: r.progress || {} }));
  const pu = paidNow ? await fsRead(env, c.tok, 'users/' + uid) : null;
  return json({ ok: true, code: code, referrals: out, earned: list.filter((x) => x.status === 'paid').reduce((t, x) => t + (Number(x.bonus) || 0), 0), referredBy: !!mine, referredStatus: mine ? mine.data.status : null, settings: { enabled: s.enabled, freelancerBonus: s.freelancerBonus, clientBonus: s.clientBonus, minGig: s.minGig, windowDays: s.windowDays }, wallet: pu ? walletOf(pu.data) : undefined }, 200, req, env);
}
async function refSweep(env, tok) {
  const pend = await listBy(env, tok, 'referrals', 'status', 'pending'); let paid = 0;
  for (const r of pend.slice(0, 100)) { try { const ev = await refEvaluate(env, tok, r._id); if (ev.status === 'paid') paid++; } catch (e) {} }
  return { checked: Math.min(pend.length, 100), paid: paid };
}
async function handleReferralAdmin(req, env) {
  const a = await requireAdmin(req, env, 'payments'); if (a.err) return a.err;
  let body = {}; try { body = await req.json(); } catch (e) {}
  if (body.action === 'sweep') return json(Object.assign({ ok: true }, await refSweep(env, a.dsToken)), 200, req, env);
  const id = String(body.id || '');
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(id) || (body.action !== 'void' && body.action !== 'reopen')) return json({ ok: false, error: 'bad-request' }, 400, req, env);
  const rf = await fsRead(env, a.dsToken, 'referrals/' + id);
  if (!rf) return json({ ok: false, error: 'not-found' }, 404, req, env);
  const from = body.action === 'void' ? 'pending' : 'void', to = body.action === 'void' ? 'void' : 'pending';
  if (rf.data.status !== from) return json({ ok: false, error: 'wrong-status', status: rf.data.status }, 409, req, env);
  const ok = await fsCommit(env, a.dsToken, [{ update: { name: docName(env, 'referrals/' + id), fields: { status: toFS(to), note: toFS(String(body.note || '').slice(0, 200)), reviewedBy: toFS(a.claims.sub), reviewedAt: toFS(Date.now()) } }, updateMask: { fieldPaths: ['status', 'note', 'reviewedBy', 'reviewedAt'] }, currentDocument: { updateTime: rf.updateTime } }]);
  if (!ok) return commitErr(req, env);
  return json({ ok: true, status: to }, 200, req, env);
}
async function runReferralSweep(env) {
  if (!env.SA_JSON) return;
  const tok = await getSaToken(env, 'SA_JSON', 'https://www.googleapis.com/auth/datastore');
  await refSweep(env, tok);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      try { await env.SS_KV.put('cron:last', String(Date.now())); } catch (e) {}
      try { await runErrorAlerts(env); } catch (e) { console.error('error alerts failed', e && e.message); }
      try { await runNotifyJob(env); } catch (e) { console.error('notify job failed', e && e.message); }
      try { await runCampaignJob(env); } catch (e) { console.error('campaign job failed', e && e.message); }
      try { await runBackupDaily(env); } catch (e) { console.error('backup job failed', e && e.message); }
      try { await runReferralSweep(env); } catch (e) { console.error('referral sweep failed', e && e.message); }
    })());
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    if (url.pathname === '/health') {
      let age = null;
      try { const t = parseInt((await env.SS_KV.get('cron:last')) || '0', 10); if (t) age = Math.round((Date.now() - t) / 60000); } catch (e) {}
      const stale = age != null && age > 15;
      if (url.searchParams.get('strict') === '1' && stale) return json({ ok: false, cronAgeMin: age, error: 'scheduler stalled' }, 503, req, env);
      return json({ ok: true, cronAgeMin: age }, 200, req, env);
    }
    if (url.pathname === '/admin/delete-user' && req.method === 'POST') {
      const origin = req.headers.get('Origin') || '';
      const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!origin || !allowed.includes(origin)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleDeleteUser(req, env); }
      catch (e) { console.error('delete-user error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname.startsWith('/push/') && (req.method === 'GET' || req.method === 'POST')) {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handlePush(req, env, url); } catch (e) { console.error('push error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/geo' && req.method === 'GET') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      const cf = req.cf || {};
      let country = '';
      try { if (cf.country && /^[A-Z]{2}$/.test(cf.country)) country = new Intl.DisplayNames(['en'], { type: 'region' }).of(cf.country) || ''; } catch (e) {}
      const clean = (v) => String(v || '').replace(/[<>"'&]/g, '').trim().slice(0, 60);
      const r = json({ ok: true, code: clean(cf.country), country: clean(country), city: clean(cf.city), region: clean(cf.region) }, 200, req, env);
      r.headers.set('Cache-Control', 'no-store');
      return r;
    }
    if (url.pathname === '/unsub' && (req.method === 'GET' || req.method === 'POST')) {
      try { return await handleUnsub(req, env, url); } catch (e) { console.error('unsub error', e && e.message); return new Response(pageHtml('Something went wrong', 'Please try again in a moment.'), { status: 502, headers: HTML_H }); }
    }
    if (url.pathname === '/campaign' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleCampaign(req, env); } catch (e) { console.error('campaign error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname.startsWith('/promo/') && (req.method === 'GET' || req.method === 'POST')) {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handlePromo(req, env, url); } catch (e) { console.error('promo error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/reset' && req.method === 'POST') {
      const origin = req.headers.get('Origin') || '';
      const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!origin || !allowed.includes(origin)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleReset(req, env); }
      catch (e) { console.error('reset error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if ((url.pathname === '/verify/send' || url.pathname === '/verify/check') && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return url.pathname === '/verify/send' ? await handleVerifySend(req, env) : await handleVerifyCheck(req, env); }
      catch (e) { console.error('verify error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if ((url.pathname === '/escrow/claim' || url.pathname === '/escrow/refund') && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleEscrow(req, env, url.pathname === '/escrow/claim' ? 'claim' : 'refund'); }
      catch (e) { console.error('escrow error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/escrow/lock' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleEscrowLock(req, env); } catch (e) { console.error('lock error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/escrow/cancel-proposal' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleProposalCancel(req, env); } catch (e) { console.error('cancel error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/withdraw/request' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleWithdrawRequest(req, env); } catch (e) { console.error('withdraw error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/admin/gate' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleGate(req, env); } catch (e) { console.error('gate error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/admin/backup' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleBackup(req, env); } catch (e) { console.error('backup error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/admin/alert' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleAdminAlert(req, env); } catch (e) { console.error('alert error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/escrow/settle' && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleEscrowSettle(req, env); } catch (e) { console.error('settle error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname.indexOf('/referral/') === 0 && req.method === 'POST') {
      if (!originOk(req, env)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try {
        const k = url.pathname.slice(10);
        if (k === 'admin') return await handleReferralAdmin(req, env);
        if (k === 'me' || k === 'claim' || k === 'check') return await handleReferral(req, env, k);
        return json({ ok: false, error: 'not-found' }, 404, req, env);
      } catch (e) { console.error('referral error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/welcome' && req.method === 'POST') {
      const origin = req.headers.get('Origin') || '';
      const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (origin && !allowed.includes(origin)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      return handleWelcome(req, env);
    }
    return json({ ok: false, error: 'not found' }, 404, req, env);
  },
};
