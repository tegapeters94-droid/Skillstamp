/**
 * SkillStamp email Worker (Cloudflare Workers, free plan — no Firebase Blaze needed)
 *
 * Routes
 *   GET  /health            -> { ok: true }
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
function welcomeEmail(name, role) {
  const first = esc(cleanName(name).split(' ')[0] || 'there');
  const isClient = role === 'employer';
  const steps = isClient
    ? [
        ['Browse verified talent', 'Every freelancer on SkillStamp has a Skill ID. Look for the green checkmark.'],
        ['Post your first gig', 'Describe the work and your budget. Freelancers apply with proposals and portfolios.'],
        ['Hire with confidence', 'Payment is held in escrow and only released when you approve the delivery.'],
      ]
    : [
        ['Complete your profile', 'Add a photo, a headline and your skills so clients can find you.'],
        ['Get skill-verified', 'Submit your work to earn the verified checkmark and stand out in search.'],
        ['Apply to gigs', 'Send proposals with your portfolio and start building your reputation.'],
      ];
  const url = 'https://skillstamp.cv/';
  const rows = steps.map((s, i) =>
    `<tr><td style="padding:10px 0;vertical-align:top;width:34px;"><div style="width:26px;height:26px;border-radius:13px;background:#e8f3ec;color:#1a6b3c;font-weight:700;font-size:13px;line-height:26px;text-align:center;">${i + 1}</div></td>` +
    `<td style="padding:10px 0;"><div style="font-weight:700;font-size:15px;color:#101712;">${esc(s[0])}</div><div style="font-size:14px;color:#55635a;line-height:1.5;margin-top:2px;">${esc(s[1])}</div></td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#f3f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f1;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e3e8e1;">
<tr><td style="background:#0d3320;padding:26px 28px;"><div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-.01em;">Skill<span style="color:#7ee2a8;">Stamp</span></div></td></tr>
<tr><td style="padding:30px 28px 8px;">
<div style="font-size:24px;font-weight:800;color:#101712;letter-spacing:-.02em;">Welcome to SkillStamp, ${first}.</div>
<div style="font-size:15px;color:#55635a;line-height:1.6;margin-top:10px;">${isClient ? 'Your client account is ready. Here is how to find and hire the right talent.' : 'Your freelancer account is ready. Here is how to get noticed and win your first gig.'}</div>
</td></tr>
<tr><td style="padding:8px 28px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
<tr><td style="padding:18px 28px 30px;"><a href="${url}" style="display:inline-block;background:#1a6b3c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:12px;">Open SkillStamp</a></td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e3e8e1;font-size:12px;color:#7a877e;line-height:1.6;">You are receiving this because you created an account at skillstamp.cv. If this was not you, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `Welcome to SkillStamp, ${cleanName(name).split(' ')[0] || 'there'}.\n\n` +
    steps.map((s, i) => `${i + 1}. ${s[0]} - ${s[1]}`).join('\n') +
    `\n\nOpen SkillStamp: ${url}\n\nYou are receiving this because you created an account at skillstamp.cv.`;
  return { subject: `Welcome to SkillStamp, ${cleanName(name).split(' ')[0] || 'there'}`, html, text };
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
    await sendBrevo(env, email, name, welcomeEmail(name, role));
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
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    if (url.pathname === '/health') return json({ ok: true }, 200, req, env);
    if (url.pathname === '/welcome' && req.method === 'POST') {
      const origin = req.headers.get('Origin') || '';
      const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
      if (origin && !allowed.includes(origin)) return json({ ok: false, error: 'origin not allowed' }, 403, req, env);
      return handleWelcome(req, env);
    }
    return json({ ok: false, error: 'not found' }, 404, req, env);
  },
};
