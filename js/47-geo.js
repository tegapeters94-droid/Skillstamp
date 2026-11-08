/* SkillStamp - automatic location (country + city)
   Reads the visitor's approximate location from the email Worker (/geo, taken from the network
   connection by Cloudflare: no browser permission pop-up, nothing stored on the server).
   - Sign-up: country and city are pre-filled; the member can change them.
   - Google sign-up: country and city are filled in on the new account if they were left empty.
   - Edit Profile: a "Detect my location" button.
   Wraps existing screens only; does not change login or sign-up logic. */
(function () {
  'use strict';
  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  var KEY = 'ss_geo_cache', PEND = 'ss_geo_pending';
  var TZ = { 'Africa/Lagos': 'Nigeria', 'Africa/Accra': 'Ghana', 'Africa/Nairobi': 'Kenya', 'Africa/Johannesburg': 'South Africa', 'Africa/Dakar': 'Senegal', 'Africa/Kigali': 'Rwanda', 'Africa/Addis_Ababa': 'Ethiopia', 'Africa/Kampala': 'Uganda', 'Africa/Dar_es_Salaam': 'Tanzania', 'Africa/Douala': 'Cameroon' };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function say(m, bad) { try { if (window.toast) window.toast(m, bad ? 'bad' : 'ok'); } catch (e) {} }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {} return null; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function known() { return (typeof COUNTRIES !== 'undefined' && COUNTRIES.length) ? COUNTRIES : ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Senegal', 'Rwanda', 'Ethiopia', 'Uganda', 'Tanzania', 'Cameroon']; }

  var inflight = null;
  function detect() {
    var c = ss(KEY);
    if (c) { try { return Promise.resolve(JSON.parse(c)); } catch (e) {} }
    if (inflight) return inflight;
    inflight = new Promise(function (resolve) {
      var done = false;
      function fallback() {
        var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
        return { country: TZ[tz] || '', city: '', source: 'timezone' };
      }
      function finish(v) { if (done) return; done = true; if (v && v.country) ss(KEY, JSON.stringify(v)); inflight = null; resolve(v); }
      var timer = setTimeout(function () { finish(fallback()); }, 4500);
      fetch(API + '/geo', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
        clearTimeout(timer);
        if (j && j.ok && j.country) finish({ country: j.country, city: j.city || '', source: 'network' }); else finish(fallback());
      }).catch(function () { clearTimeout(timer); finish(fallback()); });
    });
    return inflight;
  }
  window.ssDetectLocation = detect;

  function inList(c) { return known().indexOf(c) >= 0; }

  /* ── sign-up screen ── */
  function hintFor(g, el) {
    var h = $('ss-geo-hint');
    if (!h) { h = document.createElement('div'); h.id = 'ss-geo-hint'; h.style.cssText = 'font-size:11px;color:var(--td,#6b7a70);margin:-4px 2px 10px;line-height:1.5;'; el.parentNode.insertBefore(h, el.nextSibling); }
    h.innerHTML = '📍 We detected <b>' + esc((g.city ? g.city + ', ' : '') + g.country) + '</b>. Not right? Just change it.';
  }
  function savePending() {
    var co = $('ri-co'), ci = $('ri-city');
    if (!co) return;
    ls(PEND, JSON.stringify({ country: co.value || '', city: ci ? ci.value.trim() : '', t: Date.now() }));
  }
  var bound = false, filled = false;
  setInterval(function () {
    try {
      var co = $('ri-co'), ci = $('ri-city');
      if (!co) { bound = false; return; }
      if (!bound) {
        bound = true; filled = false;
        co.addEventListener('change', savePending);
        if (ci) ci.addEventListener('input', savePending);
      }
      if (filled || co.value) { if (co.value) filled = true; return; }
      filled = true;
      detect().then(function (g) {
        if (!g || !g.country || !inList(g.country)) return;
        var co2 = $('ri-co'), ci2 = $('ri-city');
        if (!co2 || co2.value) return;            // member already chose
        co2.value = g.country;
        co2.dispatchEvent(new Event('change', { bubbles: true }));
        if (ci2 && !ci2.value && g.city) ci2.value = g.city;
        hintFor(g, co2.parentNode.parentNode);
        savePending();
      });
    } catch (e) {}
  }, 1000);

  /* ── brand-new account: save the location on their profile ── */
  var applying = false;
  setInterval(function () {
    try {
      var m = window.ME, u = window.FB_AUTH && window.FB_AUTH.currentUser;
      if (!m || !m.uid || !u || u.uid !== m.uid || applying) return;
      var created = Number(m.created) || 0;
      if (!created || Date.now() - created > 15 * 60 * 1000) return;
      if (ls('ss_geo_done_' + m.uid)) return;
      if (m.country && m.city) { ls('ss_geo_done_' + m.uid, '1'); return; }
      applying = true;
      var pend = {}; try { pend = JSON.parse(ls(PEND) || '{}') || {}; } catch (e) {}
      detect().then(function (g) {
        var upd = {};
        var country = m.country || pend.country || (g && inList(g.country) ? g.country : '');
        if (country && !m.country) upd.country = country;
        var city = m.city || pend.city || '';
        if (!city && g && g.city && g.country === country) city = g.city;   // detected city only if it matches their country
        if (city && !m.city) upd.city = String(city).slice(0, 60);
        ls('ss_geo_done_' + m.uid, '1'); ls(PEND, null);
        if (!Object.keys(upd).length) return;
        var F = window.FB_FNS;
        return F.updateDoc(F.doc(window.FB_DB, 'users', m.uid), upd).then(function () {
          Object.assign(m, upd);
          try { var cu = CACHE.users.find(function (x) { return x.uid === m.uid; }); if (cu) Object.assign(cu, upd); } catch (e) {}
        });
      }).catch(function () {}).then(function () { applying = false; });
    } catch (e) { applying = false; }
  }, 2000);

  /* ── Edit Profile: "Detect my location" ── */
  function injectEdit() {
    try {
      var co = $('ep-country'), ci = $('ep-city');
      if (!co || !ci || $('ss-geo-btn')) return;
      var wrap = ci.parentNode.parentNode;      // the two-column grid
      var b = document.createElement('button');
      b.id = 'ss-geo-btn'; b.type = 'button';
      b.style.cssText = 'grid-column:1/-1;justify-self:start;background:none;border:none;color:var(--acc,#1a6b3c);font-weight:700;font-size:12px;cursor:pointer;padding:2px 0;font-family:inherit;';
      b.textContent = '📍 Detect my location';
      b.onclick = function () {
        b.disabled = true; b.textContent = 'Detecting…';
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        detect().then(function (g) {
          if (!g || !g.country) { say("Couldn't detect your location. Please choose it manually.", true); return; }
          if (inList(g.country)) co.value = g.country; else { say('We detected ' + g.country + ', which is not on the list yet. Please choose manually.', true); return; }
          if (g.city) ci.value = g.city;
          say('Location filled in: ' + (g.city ? g.city + ', ' : '') + g.country + '. Check it, then save.');
        }).then(function () { b.disabled = false; b.textContent = '📍 Detect my location'; });
      };
      wrap.appendChild(b);
    } catch (e) {}
  }
  var prev = window.openEditProfile;
  if (typeof prev === 'function' && !prev.__geo) {
    var w = function () { var r = prev.apply(this, arguments); setTimeout(injectEdit, 0); setTimeout(injectEdit, 400); return r; };
    w.__geo = true; window.openEditProfile = w;
  }
  /* the section is rebuilt when the member switches tabs inside Edit Profile */
  setInterval(injectEdit, 1500);
})();
