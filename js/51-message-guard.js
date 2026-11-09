/* SkillStamp - message guard v2 (builds on the guard in 12-messages.js; remove this file to go back to v1)
   - Sees through disguises: spelled-out numbers ("zero eight one..."), leet ("0803 l23"), spaced letters
     ("w h a t s a p p"), "name at gmail dot com", look-alike letters, emoji digits, Arabic digits.
   - Two levels: SOFT (a request / platform name) = warning, member may still send, receiver gets a safety alert.
     HIGH (real phone number, email, handle or link) = blocked, member must edit the message.
   - Every attempt is logged for admins (masked preview only). Admins see repeat offenders.
   - Receivers can report a message; admins can "teach" the guard new phrases / number-words, which every
     browser then loads (one small read per visit). */
(function () {
  'use strict';
  if (window.__ssGuard2) return;
  window.__ssGuard2 = true;

  /* ───────────── text folding ───────────── */
  var LOOK = { 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y', 'і': 'i', 'ѕ': 's' };
  function base(t) {
    t = String(t == null ? '' : t);
    try { t = t.normalize('NFKD'); } catch (e) {}
    t = t.replace(/[̀-ͯ​-‏⁠﻿­️⃣]/g, '');
    t = t.replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x660); })
         .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x6f0); });
    t = t.toLowerCase().replace(/[Ѐ-ӿ]/g, function (c) { return LOOK[c] || c; });
    return t;
  }
  function leet(t) {
    return t.replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't');
  }
  function lev1(a, b) { // true if edit distance <= 1
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0, j = 0, d = 0;
    while (i < la && j < lb) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return false;
      if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
    }
    return d + (la - i) + (lb - j) <= 1;
  }

  /* ───────────── learned config (admin-taught) ───────────── */
  var CFG = { phrases: [], digits: {}, loaded: 0, loading: false };
  function loadCfg() {
    if (CFG.loading || Date.now() - CFG.loaded < 600000) return;
    var F = window.FB_FNS, u = window.FB_AUTH && window.FB_AUTH.currentUser;
    if (!F || !window.FB_DB || !u) return;
    CFG.loading = true;
    F.getDoc(F.doc(window.FB_DB, 'guard_terms', 'config')).then(function (s) {
      var d = s && s.exists && s.exists() ? s.data() : null;
      if (d) { CFG.phrases = Array.isArray(d.phrases) ? d.phrases.slice(0, 300) : []; CFG.digits = d.digits && typeof d.digits === 'object' ? d.digits : {}; }
      CFG.loaded = Date.now(); CFG.loading = false;
    }).catch(function () { CFG.loaded = Date.now(); CFG.loading = false; });
  }

  /* ───────────── number words ───────────── */
  var DW = { zero: 0, nought: 0, nil: 0, one: 1, wan: 1, won: 1, two: 2, three: 3, four: 4, five: 5, fyve: 5, six: 6, seven: 7, eight: 8, nine: 9, nain: 9, naine: 9 };
  var SEPW = { dash: 1, dot: 1, hyphen: 1, space: 1, plus: 1 };
  var ZEROISH = { o: 1, oh: 1, l: 1 }; // only count when they sit inside a number
  function digitOf(tk) {
    if (Object.prototype.hasOwnProperty.call(CFG.digits, tk)) return String(CFG.digits[tk]).replace(/\D/g, '').length || 0;
    if (Object.prototype.hasOwnProperty.call(DW, tk)) return 1;
    return 0;
  }
  var MONEY_BEFORE = /[₦$€£]/;
  var MONEY_AFTER = /^(naira|ngn|usd|dollars?|kes|ghs|euros?|pounds?|k|m|million|thousand|hrs?|hours?|days?|weeks?|months?|years?)$/;

  function digitStream(raw) {
    var t = base(raw);
    var toks = t.match(/[a-z]+|\d+|[^a-z\d]/g) || [];
    var run = 0, words = 0, start = -1, mult = 1, hit = false;
    function nextSig(i) {
      for (var k = i + 1; k < toks.length; k++) {
        if (/^[\s\-._*\/()+|~•]$/.test(toks[k])) continue;
        return toks[k];
      }
      return '';
    }
    function endRun(i) {
      if (run >= 7 && words > 0) {
        var before = ''; for (var k = start - 1; k >= 0; k--) { if (/\s/.test(toks[k])) continue; before = toks[k]; break; }
        var after = ''; for (var m = i; m < toks.length; m++) { if (/\s/.test(toks[m])) continue; after = toks[m]; break; }
        if (!(MONEY_BEFORE.test(before) || MONEY_AFTER.test(after))) hit = true;
      }
      run = 0; words = 0; start = -1; mult = 1;
    }
    for (var i = 0; i < toks.length && !hit; i++) {
      var tk = toks[i];
      if (/^\d+$/.test(tk)) { if (start < 0) start = i; run += tk.length * (tk.length === 1 ? mult : 1); mult = 1; }
      else if (/^[a-z]+$/.test(tk)) {
        var n = digitOf(tk);
        if (n) { if (start < 0) start = i; run += n * mult; mult = 1; words++; }
        else if (tk === 'double' || tk === 'triple') { mult = tk === 'double' ? 2 : 3; }
        else if (SEPW[tk]) { /* spoken separator */ }
        else if (ZEROISH[tk] && (run > 0 || /^\d+$/.test(nextSig(i)) || digitOf(nextSig(i)))) { if (start < 0) start = i; run += 1; words++; mult = 1; }
        else endRun(i);
      } else if (!/^[\s\-._*\/()+|~•]$/.test(tk)) endRun(i);
    }
    if (!hit) endRun(toks.length);
    return hit;
  }

  /* ───────────── other detectors ───────────── */
  var PLAT = { whatsapp: 'WhatsApp', whatsap: 'WhatsApp', watsapp: 'WhatsApp', watsap: 'WhatsApp', wattsapp: 'WhatsApp', telegram: 'Telegram', instagram: 'Instagram', snapchat: 'Snapchat', facebook: 'Facebook', messenger: 'Messenger', discord: 'Discord', wechat: 'WeChat', viber: 'Viber', skype: 'Skype', tiktok: 'TikTok' };
  var EXACT_ONLY = { discord: 1, skype: 1, viber: 1, wechat: 1, tiktok: 1 };
  function platformHit(raw) {
    var t = leet(base(raw)).replace(/[^a-z]+/g, ' ').trim();
    if (!t) return '';
    var w = t.split(' ').map(function (x) { return x.replace(/(.)\1{2,}/g, '$1$1'); });
    var cands = w.slice(), i;
    for (i = 0; i < w.length - 1; i++) cands.push(w[i] + w[i + 1]);
    var run = [];
    for (i = 0; i <= w.length; i++) {
      if (i < w.length && w[i].length === 1) run.push(w[i]);
      else { if (run.length >= 4) cands.push(run.join('')); run = []; }
    }
    for (i = 0; i < cands.length; i++) {
      var c = cands[i].replace(/(.)\1+/g, function (m, ch) { return m.length > 2 ? ch + ch : m; });
      if (PLAT[c]) return PLAT[c];
      if (c.length >= 7) for (var k in PLAT) if (k.length >= 7 && !EXACT_ONLY[k] && lev1(c, k)) return PLAT[k];
    }
    return '';
  }
  var PROV = '(?:gmail|g-?mail|googlemail|yahoo|ymail|hotmail|outlook|icloud|proton(?:mail)?|aol|zoho|yandex)';
  function emailHit(raw) {
    var t = base(raw)
      .replace(/\s*[(\[{<]\s*(?:at|@)\s*[)\]}>]\s*/g, '@')
      .replace(/\s*[(\[{<]\s*(?:dot|d0t|\.)\s*[)\]}>]\s*/g, '.')
      .replace(/\bat the rate( of)?\b/g, '@');
    if (new RegExp('[a-z0-9._%+\\-]{2,}\\s*(?:@|\\bat\\b)\\s*' + PROV + '\\b').test(t)) return true;
    if (/[a-z0-9._%+\-]{2,}\s*(?:@|\bat\b)\s*[a-z0-9\-]{2,}\s*(?:\.|\bdot\b)\s*(?:com|net|org|ng|co|io|me|africa|uk|edu)\b/.test(t)) return true;
    if (new RegExp('\\b' + PROV + '\\s*(?:\\.|\\bdot\\b)\\s*com\\b').test(t) && /[a-z0-9._]{3,}\s*(?:@|\bat\b)/.test(t)) return true;
    return false;
  }
  function handleHit(raw) { // returns 'high' | 'soft' | ''
    var t = base(raw);
    var P = '(?:ig|insta|instagram|snap|snapchat|sc|tg|telegram|tiktok|twitter|discord|skype|handle|username|user name|whatsapp|wa|number|no)';
    if (new RegExp('\\b' + P + '\\s*(?:is|id)\\s*[:\\-]?\\s*@?[a-z0-9._]{3,}').test(t)) {
      if (/\bmy\s+(?:\w+\s+)?/.test(t) && new RegExp('\\bmy\\s+' + P + '\\b').test(t)) return 'high';
      return 'soft';
    }
    return '';
  }
  var PAY = [
    /\b(?:pay|paid|send|transfer|wire)\w*\s+(?:me\s+|it\s+)?(?:directly|outside|offline|privately|on the side|in cash|by cash|cash)\b/,
    /\b(?:bank|account)\s*(?:details|number|no\b|transfer)/,
    /\b(?:paypal|cash\s*app|cashapp|venmo|zelle|payoneer|opay|palmpay|moniepoint|kuda|usdt|bitcoin|crypto wallet|western union|moneygram|remitly)\b/,
    /\b(?:skip|avoid|bypass|without|no need for|dont need|don't need)\s+(?:the\s+)?(?:escrow|fees?|commission|charges|platform|skillstamp)\b/,
    /\b(?:save|dodge|beat)\s+(?:the\s+)?(?:fees?|commission|charges)\b/,
    /\bdeal\s+(?:outside|offline|directly)\b/
  ];
  var MOVE = [
    /\b(?:dm|inbox|pm)\s+me\b/, /\bdirect\s+message\s+me\b/,
    /\b(?:move|take|continue|carry on)\s+(?:this|it|our|the)\s+(?:chat|conversation|talk|discussion|deal|work|thing)?\s*(?:to|on|over|outside|offline|off|privately)\b/,
    /\blet'?s\s+(?:continue|move|talk|chat|switch)\s+(?:on|to|over|outside|offline|privately)\b/,
    /\b(?:off|outside)\s*(?:the\s+)?(?:platform|app|site)\b/, /\bprivate\s+chat\b/, /\bchat\s+(?:me\s+)?(?:privately|offline)\b/
  ];
  function listHit(res, t) { for (var i = 0; i < res.length; i++) if (res[i].test(t)) return true; return false; }
  function learnedHit(raw) {
    if (!CFG.phrases.length) return null;
    var f = ' ' + leet(base(raw)).replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
    for (var i = 0; i < CFG.phrases.length; i++) {
      var p = String(CFG.phrases[i] || ''), hi = p.charAt(0) === '!';
      if (hi) p = p.slice(1);
      p = leet(base(p)).replace(/[^a-z0-9]+/g, ' ').trim();
      if (p.length >= 3 && f.indexOf(' ' + p + ' ') >= 0) return { sev: hi ? 'high' : 'soft' };
    }
    return null;
  }

  /* ───────────── combined detection (wraps v1) ───────────── */
  var HIGH_LABELS = { 'email address': 1, 'phone number': 1, 'WhatsApp link': 1, 'Telegram link': 1, 'external link': 1, 'social username': 1 };
  var MONEYISH = /[₦$€£]|\b(?:naira|ngn|usd|dollars?)\b/i;
  var orig = typeof window.detectContactInfo === 'function' ? window.detectContactInfo : null;
  var last = { sev: '', label: '' };

  function detect(text) {
    loadCfg();
    var hits = [];
    var r = orig ? (function () { try { return orig(text); } catch (e) { return { flagged: false }; } })() : { flagged: false };
    if (r && r.flagged) {
      var sev = HIGH_LABELS[r.label] ? 'high' : (r.label === 'social handle' && /@[a-z0-9._]{3,}/i.test(text) ? 'high' : 'soft');
      if (r.label === 'phone number' && MONEYISH.test(text)) sev = 'soft';
      hits.push({ label: r.label, sev: sev, masked: r.masked });
    }
    try {
      var t = String(text || '');
      if (!(r && r.flagged) && orig) { var bt = base(t); if (bt !== t.toLowerCase()) { var r2 = orig(bt); if (r2 && r2.flagged && HIGH_LABELS[r2.label] && !MONEYISH.test(t)) hits.push({ label: r2.label + ' (disguised)', sev: 'high' }); } }
      if (digitStream(t)) hits.push({ label: 'phone number (disguised)', sev: 'high' });
      if (emailHit(t)) hits.push({ label: 'email address (disguised)', sev: 'high' });
      var hh = handleHit(t); if (hh) hits.push({ label: 'social handle', sev: hh });
      var pl = platformHit(t); if (pl) hits.push({ label: pl + ' (disguised)', sev: 'soft' });
      var b = base(t);
      if (listHit(PAY, b)) hits.push({ label: 'payment outside SkillStamp', sev: 'soft' });
      if (listHit(MOVE, b)) hits.push({ label: 'off-platform request', sev: 'soft' });
      var lh = learnedHit(t); if (lh) hits.push({ label: 'flagged phrase', sev: lh.sev });
    } catch (e) {}
    if (!hits.length) { last = { sev: '', label: '' }; return { flagged: false }; }
    var pick = hits.filter(function (h) { return h.sev === 'high'; })[0] || hits[0];
    last = { sev: pick.sev, label: pick.label };
    var masked = pick.sev === 'high' ? String(text).replace(/\d/g, '*') : (pick.masked || String(text));
    return { flagged: true, label: pick.label, masked: masked, severity: pick.sev };
  }
  window.detectContactInfo = detect;
  window.ssGuardTest = function (t) { var r = detect(t); return r.flagged ? r.severity + ':' + r.label : 'clean'; };

  /* ───────────── logging ───────────── */
  function logEvent(act, label, sev, text) {
    try {
      var F = window.FB_FNS, m = window.ME;
      if (!F || !window.FB_DB || !m || !m.uid) return;
      var prev = String(text || '').replace(/\d/g, '*').slice(0, 120);
      var ev = { uid: m.uid, to: String(window.__ssChatUid || '').slice(0, 128), label: String(label).slice(0, 60), sev: sev, act: act, prev: prev, ts: Date.now() };
      F.setDoc(F.doc(window.FB_DB, 'guard_events', ev.ts + '_' + m.uid.slice(0, 20)), ev).catch(function () {});
    } catch (e) {}
  }

  var origOpen = window.openMsg;
  if (typeof origOpen === 'function') {
    window.openMsg = function (uid) { window.__ssChatUid = uid; return origOpen.apply(this, arguments); };
  }

  var origWarn = typeof window.showContactWarning === 'function' ? window.showContactWarning : null;
  if (origWarn) {
    window.showContactWarning = function (label, text, masked, onSend, onCancel) {
      var sev = last.sev || 'soft', lbl = last.label || label;
      logEvent(sev === 'high' ? 'blocked' : 'warned', lbl, sev, text);
      var r = origWarn.call(this, label, text, masked, function (t) { logEvent('sent_anyway', lbl, sev, t); return onSend && onSend(t); }, onCancel);
      try {
        if (sev === 'high') {
          var b = document.getElementById('chat-warn-banner');
          if (b) {
            var snd = b.querySelector('#warn-send'); if (snd) snd.remove();
            var w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT), n;
            while ((n = w.nextNode())) {
              if (n.nodeValue === 'Off-Platform Contact Detected') n.nodeValue = 'Contact details can’t be shared here';
            }
            var note = document.createElement('div');
            note.style.cssText = 'font-size:11px;color:#7c2d12;line-height:1.55;margin:-4px 0 10px;font-weight:600;';
            note.textContent = 'Keep the conversation on SkillStamp. It is what protects your payment and your reviews. If this is not contact information (for example a price), please reword it.';
            var pv = b.querySelector('#warn-cancel'); if (pv && pv.parentNode && pv.parentNode.parentNode) pv.parentNode.parentNode.insertBefore(note, pv.parentNode);
          }
        }
      } catch (e) {}
      return r;
    };
  }

  /* ───────────── receiver: report a message ───────────── */
  var origBub = typeof window._buildFlaggedBubble === 'function' ? window._buildFlaggedBubble : null;
  if (origBub) {
    window._buildFlaggedBubble = function (msg) {
      var html = origBub.apply(this, arguments);
      try {
        var isMe = msg.from === (window.ME && window.ME.uid);
        if (!isMe && msg.text && !msg._reported) {
          var btn = '<button class="ss-rep" data-ts="' + (msg.ts | 0) + '" onclick="ssGuardReport(this)" title="Report: tries to move us off SkillStamp" style="align-self:flex-start;background:none;border:none;color:var(--td);font-size:10px;cursor:pointer;padding:2px 4px;opacity:.7;">\u{1F6A9} Report</button>';
          html = html.replace(/<\/div><\/div>$/, btn + '</div></div>');
        }
      } catch (e) {}
      return html;
    };
  }
  window.ssGuardReport = function (btn) {
    try {
      var row = btn.closest('.cw-row'), txt = row && row.querySelector('.cw-txt');
      var F = window.FB_FNS, m = window.ME; if (!txt || !F || !m) return;
      if (!window.confirm('Report this message as trying to move the conversation off SkillStamp (or to share contact details)?')) return;
      var ts = btn.getAttribute('data-ts');
      var rep = { uid: m.uid, against: String(window.__ssChatUid || '').slice(0, 128), text: txt.textContent.slice(0, 500), ts: Date.now() };
      F.setDoc(F.doc(window.FB_DB, 'guard_reports', m.uid.slice(0, 40) + '_' + ts), rep).then(function () {
        btn.textContent = '✓ Reported'; btn.disabled = true;
        try { window.toast('Thanks. Our team will review it.'); } catch (e) {}
      }).catch(function () { try { window.toast('Could not send the report. Try again.', 'bad'); } catch (e) {} });
    } catch (e) {}
  };

  /* ───────────── admin dashboard ───────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ago(ts) { var m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; }
  function nameOf(uid) { try { var u = window.getUser(uid); return u ? u.name : 'Unknown'; } catch (e) { return 'Unknown'; } }
  var REPORTS = [];

  function shell(inner) {
    return '<div class="ap-cardbox" id="mg-card" style="margin-bottom:14px;"><div class="ap-h2">Message guard</div>' + inner + '</div>';
  }
  function placeholder(host) {
    host.innerHTML = shell('<div class="ap-note" style="margin-bottom:8px;">Watches chats for phone numbers, emails, handles and attempts to move work or payment off SkillStamp, including disguised ones. Open it to see repeat offenders, member reports, and to teach it new words.</div><button class="ap-btn ap-ghost" onclick="ssGuardOpen()">Open guard dashboard</button>');
  }
  window.ssGuardOpen = function () {
    var host = document.getElementById('mg-host'); if (!host) return;
    var F = window.FB_FNS, db = window.FB_DB, since = Date.now() - 7 * 864e5;
    host.innerHTML = shell('<div class="ap-note">Loading…</div>');
    Promise.all([
      F.getDocs(F.query(F.collection(db, 'guard_events'), F.orderBy('ts', 'desc'), F.limit(150))),
      F.getDocs(F.query(F.collection(db, 'guard_reports'), F.orderBy('ts', 'desc'), F.limit(30))),
      F.getDoc(F.doc(db, 'guard_terms', 'config'))
    ]).then(function (r) {
      var ev = r[0].docs.map(function (d) { return d.data(); }).filter(function (e) { return e.ts > since; });
      REPORTS = r[1].docs.map(function (d) { var x = d.data(); x._id = d.id; return x; });
      var cfg = r[2] && r[2].exists && r[2].exists() ? r[2].data() : { phrases: [], digits: {} };
      var by = {};
      ev.forEach(function (e) {
        var o = by[e.uid] || (by[e.uid] = { uid: e.uid, n: 0, high: 0, any: 0, last: 0, labels: {} });
        o.n++; if (e.sev === 'high') o.high++; if (e.act === 'sent_anyway') o.any++; if (e.ts > o.last) o.last = e.ts; o.labels[e.label] = 1;
      });
      var offenders = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return (b.high * 3 + b.any * 2 + b.n) - (a.high * 3 + a.any * 2 + a.n); });
      var h = '<div class="ap-note" style="margin-bottom:8px;"><b>' + ev.length + '</b> guard events in the last 7 days from <b>' + offenders.length + '</b> member(s). Previews are masked.</div>';
      offenders.slice(0, 8).forEach(function (o) {
        var rep = o.high >= 3 || o.any >= 3;
        h += '<div style="border-top:1px solid var(--br);padding:8px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">'
          + '<div style="flex:1;min-width:150px;"><b style="font-size:12px;">' + esc(nameOf(o.uid)) + '</b>' + (rep ? ' <span style="font-size:10px;font-weight:800;background:rgba(239,68,68,.12);color:#dc2626;border-radius:6px;padding:2px 6px;">repeat</span>' : '')
          + '<div style="font-size:10px;color:var(--td);">' + o.n + ' attempts · ' + o.high + ' blocked · ' + o.any + ' sent anyway · last ' + ago(o.last) + '<br>' + esc(Object.keys(o.labels).slice(0, 3).join(', ')) + '</div></div>'
          + '<button class="ap-btn ap-ghost" onclick="ssAdminUser(\'' + esc(o.uid) + '\')">View member</button></div>';
      });
      if (!offenders.length) h += '<div class="ap-note">No attempts caught this week.</div>';
      h += '<div class="ap-h2" style="margin-top:12px;">Member reports (' + REPORTS.length + ')</div>';
      REPORTS.slice(0, 10).forEach(function (x, i) {
        h += '<div style="border-top:1px solid var(--br);padding:8px 0;"><div style="font-size:11px;color:var(--td);">' + esc(nameOf(x.uid)) + ' reported ' + esc(nameOf(x.against)) + ' · ' + ago(x.ts) + '</div>'
          + '<div style="font-size:12px;font-weight:600;margin:3px 0;word-break:break-word;">' + esc(x.text) + '</div>'
          + '<div class="ap-row" style="margin:4px 0 0;"><button class="ap-btn ap-ghost" onclick="ssGuardTeach(' + i + ')">Teach the guard</button><button class="ap-btn ap-ghost" onclick="ssGuardDismiss(' + i + ')">Dismiss</button></div></div>';
      });
      h += '<div class="ap-h2" style="margin-top:12px;">What the guard has learned</div>'
        + '<div class="ap-note" style="margin-bottom:6px;">One per line. A phrase blocks messages containing it (any spelling tricks like 0 for o are handled). Start a line with <b>!</b> to block the message outright. Write <b>wan=1</b> to teach a number word (digit aliases).</div>'
        + '<textarea id="mg-terms" rows="6" style="width:100%;box-sizing:border-box;font-size:12px;padding:8px;border:1px solid var(--br);border-radius:8px;background:var(--bg);color:var(--tx);">' + esc((cfg.phrases || []).concat(Object.keys(cfg.digits || {}).map(function (k) { return k + '=' + cfg.digits[k]; })).join('\n')) + '</textarea>'
        + '<div class="ap-row" style="margin:8px 0 0;"><button class="ap-btn" onclick="ssGuardSave()">Save</button><button class="ap-btn ap-ghost" onclick="ssGuardOpen()">Refresh</button></div>';
      host.innerHTML = shell(h);
    }).catch(function () { host.innerHTML = shell('<div class="ap-note ap-dangerbox">Could not load. Publish the latest firestore.rules first.</div>'); });
  };
  window.ssGuardSave = function () {
    var F = window.FB_FNS, db = window.FB_DB, ta = document.getElementById('mg-terms'); if (!ta) return;
    var phrases = [], digits = {};
    ta.value.split('\n').forEach(function (l) {
      l = l.trim(); if (!l) return;
      var m = /^([a-zA-Z]{2,12})\s*=\s*(\d{1,3})$/.exec(l);
      if (m) digits[m[1].toLowerCase()] = m[2]; else if (l.length <= 80) phrases.push(l);
    });
    phrases = phrases.slice(0, 200);
    F.setDoc(F.doc(db, 'guard_terms', 'config'), { phrases: phrases, digits: digits, updatedAt: Date.now(), by: window.ME.uid })
      .then(function () { CFG.phrases = phrases; CFG.digits = digits; CFG.loaded = Date.now(); window.toast('Guard updated. Members pick it up within minutes.'); })
      .catch(function () { window.toast('Could not save.', 'bad'); });
  };
  window.ssGuardTeach = function (i) {
    var x = REPORTS[i]; if (!x) return;
    var p = window.prompt('Which exact wording should the guard watch for? (Start with ! to block outright.)', x.text.slice(0, 60)); if (!p) return;
    var ta = document.getElementById('mg-terms'); if (ta) ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + p.trim();
    ssGuardSave();
    setTimeout(function () { ssGuardDismiss(i, true); }, 600);
  };
  window.ssGuardDismiss = function (i, quiet) {
    var x = REPORTS[i]; if (!x) return;
    var F = window.FB_FNS;
    F.deleteDoc(F.doc(window.FB_DB, 'guard_reports', x._id)).then(function () { ssGuardOpen(); }).catch(function () { if (!quiet) window.toast('Could not remove.', 'bad'); });
  };

  function hook() {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__mg) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try {
        if (name === 'overview') setTimeout(function () {
          var tab = document.getElementById('admtab-overview'); if (!tab) return;
          var host = document.getElementById('mg-host');
          if (!host) { host = document.createElement('div'); host.id = 'mg-host'; tab.appendChild(host); }
          placeholder(host);
        }, 140);
      } catch (e) {}
      return r;
    };
    w.__mg = true; window.adminTab = w;
  }
  hook();
})();
