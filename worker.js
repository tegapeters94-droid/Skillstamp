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

async function runNotifyJob(env) {
  if (!env.SA_JSON || !env.BREVO_API_KEY) return;
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
    const email = String(fv(uf.email) || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    if (fv(uf.emailNotifs) === false || fv(uf.isBanned) === true) continue;
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

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runNotifyJob(env).catch((e) => console.error('notify job failed', e && e.message)));
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    if (url.pathname === '/health') return json({ ok: true }, 200, req, env);
    if (url.pathname === '/admin/delete-user' && req.method === 'POST') {
      const origin = req.headers.get('Origin') || '';
      const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!origin || !allowed.includes(origin)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleDeleteUser(req, env); }
      catch (e) { console.error('delete-user error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
    }
    if (url.pathname === '/reset' && req.method === 'POST') {
      const origin = req.headers.get('Origin') || '';
      const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (!origin || !allowed.includes(origin)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      try { return await handleReset(req, env); }
      catch (e) { console.error('reset error', e && e.message); return json({ ok: false, error: 'failed' }, 502, req, env); }
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
