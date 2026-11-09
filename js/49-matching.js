/* SkillStamp - matching v2
   Improves js/32-algorithm.js without editing it. Every replacement falls back to the original
   function if anything goes wrong, so removing this file (or an error in it) restores v1.

   What changed
   - Skills are matched as whole words with a small synonym list (no more "java" = "javascript"),
     and a gig is scored by how many of ITS required skills the freelancer covers.
   - Ratings are weighted by how many reviews back them; completion rate counts.
   - Activity uses the real "last seen" time (recorded once per session below).
   - Gigs with fewer applicants rank a little higher (better odds for freelancers, faster proposals).
   - Location: on-site / hybrid gigs favour people in the same city / country; remote barely matters.
   - Experience level fit, and a daily-rotating exposure slice for strong newcomers.
   - "Best match" + reasons in the client's hire window.
   - New gig fields (work type, level, city) added to the post-a-gig form. */
(function () {
  'use strict';
  if (window.__ssMatch2) return;
  var O = { talent: window.getTalentScore, gig: window.getGigMatchScore, fit: window.getFreelancerGigFit, rank: window.rankTalent };
  if (typeof O.talent !== 'function' || typeof O.gig !== 'function') return;     // v1 not loaded: do nothing
  window.__ssMatch2 = true;

  var DAY = 86400000;
  function num(v, d) { v = Number(v); return isFinite(v) ? v : (d || 0); }
  function lc(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

  /* ── skills: canonical form + whole-word match ── */
  var SYN = {
    'js': 'javascript', 'ecmascript': 'javascript', 'node.js': 'node', 'nodejs': 'node', 'node js': 'node',
    'react.js': 'react', 'reactjs': 'react', 'react js': 'react', 'next.js': 'nextjs', 'next js': 'nextjs',
    'ts': 'typescript', 'vue.js': 'vue', 'vuejs': 'vue', 'angularjs': 'angular',
    'user experience': 'ux', 'user interface': 'ui', 'ui/ux': 'ui ux', 'ux/ui': 'ui ux', 'ui ux design': 'ui ux',
    'ms excel': 'excel', 'microsoft excel': 'excel', 'powerbi': 'power bi', 'power-bi': 'power bi',
    'ps': 'photoshop', 'adobe photoshop': 'photoshop', 'adobe illustrator': 'illustrator', 'ai illustrator': 'illustrator',
    'wordpress dev': 'wordpress', 'wp': 'wordpress', 'seo writing': 'seo', 'copywriting': 'copywrite', 'copy writing': 'copywrite',
    'graphic design': 'graphics design', 'graphics designer': 'graphics design', 'graphic designer': 'graphics design',
    'fb ads': 'facebook ads', 'google adwords': 'google ads', 'sm': 'social media', 'smm': 'social media',
    'py': 'python', 'ml': 'machine learning', 'postgres': 'postgresql', 'mongo': 'mongodb'
  };
  function canon(s) {
    s = lc(s).replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
    return SYN[s] || s;
  }
  function hit(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    return (' ' + a + ' ').indexOf(' ' + b + ' ') >= 0 || (' ' + b + ' ').indexOf(' ' + a + ' ') >= 0;
  }
  function coverage(needed, have) {
    needed = (needed || []).map(canon).filter(Boolean);
    have = (have || []).map(canon).filter(Boolean);
    if (!needed.length) return null;
    var n = 0;
    needed.forEach(function (s) { if (have.some(function (h) { return hit(s, h); })) n++; });
    return { got: n, of: needed.length, frac: n / needed.length };
  }

  /* ── completion rate (from gigs already loaded; cached 30 s) ── */
  var cm = { t: 0, m: null };
  function completion(uid) {
    try {
      if (!cm.m || Date.now() - cm.t > 30000) {
        cm.m = {}; cm.t = Date.now();
        ((typeof CACHE !== 'undefined' && CACHE.gigs) || []).forEach(function (g) {
          if (!g || !g.hiredUid) return;
          var o = cm.m[g.hiredUid] || (cm.m[g.hiredUid] = { done: 0, bad: 0 });
          if (g.status === 'completed') o.done++;
          else if (['cancelled', 'refunded', 'disputed'].indexOf(g.status) >= 0) o.bad++;
        });
      }
      var r = cm.m[uid] || { done: 0, bad: 0 };
      return { done: r.done, total: r.done + r.bad, rate: (r.done + r.bad) ? r.done / (r.done + r.bad) : null };
    } catch (e) { return { done: 0, total: 0, rate: null }; }
  }

  /* ── sub-scores ── */
  function performance(u) {
    var R = num(u.score), v = u.reviewCount;
    v = (v === undefined || v === null) ? (R > 0 ? Math.max(1, num(u.gigsCount, 1)) : 0) : num(v);
    var m = 5, C = 3.5;                                   // prior: a few reviews of average quality
    var bayes = (v * R + m * C) / (v + m);
    var s = bayes * 10;                                   // up to 50
    s += Math.min(num(u.gigsCount) * 3, 20);              // up to 20
    var c = completion(u.uid);
    s += c.total >= 2 ? c.rate * 20 : 10;                 // up to 20 (neutral until there is history)
    s += Math.min(num(u.repPoints) / 10, 10);             // up to 10
    return Math.min(100, s);
  }
  function activity(u) {
    var seen = u.lastSeen || u.lastActive;
    var s;
    if (!seen) s = 50;                                    // not recorded yet: neutral, not punished
    else {
      var d = (Date.now() - seen) / DAY;
      s = d < 1 ? 100 : d < 3 ? 90 : d < 7 ? 75 : d < 14 ? 55 : d < 30 ? 35 : d < 60 ? 15 : 5;
    }
    var pf = u.portfolio || [];
    if (pf.length) {
      var latest = pf.reduce(function (mx, p) { return (p.ts || 0) > mx ? (p.ts || 0) : mx; }, 0);
      if (Date.now() - latest < 7 * DAY) s = Math.min(s + 10, 100);
    }
    return s;
  }
  function availability(u) {
    var st = u.availabilityStatus || (u.available !== false ? 'available' : 'busy');
    var map = { available: 100, open: 70, busy: 30, unavailable: 0 };
    return map[st] !== undefined ? map[st] : 50;
  }
  function freshness(u) {
    var age = (Date.now() - (u.created || Date.now())) / DAY;
    if (age > 30) return 0;
    var ps = typeof window.getProfileStrengthScore === 'function' ? window.getProfileStrengthScore(u) : 0;
    if (ps < 40) return 0;
    return Math.round((1 - age / 30) * 20);
  }
  function penalty(u) {
    var p = 0;
    if (!lc(u.bio)) p += 20;
    if (!u.avatar) p += 10;
    if (!lc(u.title)) p += 15;
    if (!(u.skills || []).length) p += 15;
    if (!(u.portfolio || []).length) p += 10;
    if (u.isBanned) p += 200;
    return p;
  }

  var tMemo = {};
  function talent(u) {
    if (!u) return 0;
    try {
      var k = u.uid, m = tMemo[k];
      if (m && Date.now() - m.t < 3000) return m.v;
      var raw = window.getProfileStrengthScore(u) * 0.20 + performance(u) * 0.25 + window.getTrustScore(u) * 0.20 +
        activity(u) * 0.15 + availability(u) * 0.10 + window.getPortfolioScore(u) * 0.10;
      raw += freshness(u); raw -= penalty(u);
      var v = Math.max(0, Math.min(100, Math.round(raw)));
      tMemo[k] = { t: Date.now(), v: v };
      return v;
    } catch (e) { return O.talent(u); }
  }

  /* ── location / level / competition ── */
  function posterLoc(gig) {
    var p = null; try { p = typeof getUser === 'function' ? getUser(gig.posterUid) : null; } catch (e) {}
    return { country: lc(gig.gigCountry || (p && p.country)), city: lc(gig.gigCity || (p && p.city)) };
  }
  function locFit(user, gig) {
    var mode = gig.workMode || 'remote', g = posterLoc(gig);
    var uc = lc(user.country), uci = lc(user.city);
    if (!g.country || !uc) return 0;
    var sameCountry = uc === g.country, sameCity = sameCountry && uci && g.city && uci === g.city;
    if (mode === 'onsite') return sameCity ? 10 : sameCountry ? 3 : -25;
    if (mode === 'hybrid') return sameCity ? 8 : sameCountry ? 3 : -12;
    return sameCountry ? 2 : 0;
  }
  var LV = { entry: 0, mid: 1, expert: 2 };
  function userLevel(u) {
    var b = u.badgeStatus, g = num(u.gigsCount);
    if (b === 'elite' || b === 'expert' || g >= 15) return 'expert';
    if (b === 'verified' || g >= 3) return 'mid';
    return 'entry';
  }
  function levelFit(user, gig) {
    if (!gig.expLevel || LV[gig.expLevel] === undefined) return 0;
    var d = LV[userLevel(user)] - LV[gig.expLevel];
    return d === 0 ? 6 : d === 1 ? 0 : d === -1 ? -2 : d >= 2 ? -2 : -8;
  }
  function competition(gig) {
    var n = (gig.applicants || []).length;
    return n === 0 ? 6 : n <= 3 ? 4 : n <= 9 ? 0 : n <= 19 ? -3 : -6;
  }

  var RELATED = {
    'Graphics Design': ['UI/UX Design', 'Digital Marketing'], 'UI/UX Design': ['Graphics Design', 'Web & Mobile Dev'],
    'Content Writing': ['Digital Marketing', 'Graphics Design'], 'Data Analysis': ['Web & Mobile Dev', 'Digital Marketing'],
    'Digital Marketing': ['Content Writing', 'Graphics Design'], 'Web & Mobile Dev': ['Data Analysis', 'UI/UX Design']
  };
  var KW = {
    'Graphics Design': ['logo', 'brand', 'illustrat', 'banner', 'poster', 'flyer', 'graphic', 'packaging', 'motion', 'artwork'],
    'UI/UX Design': ['ui', 'ux', 'figma', 'wireframe', 'prototype', 'mockup', 'dashboard', 'app design', 'user interface'],
    'Content Writing': ['blog', 'article', 'copywrite', 'seo', 'content', 'ghost', 'proofread', 'technical writing', 'email copy'],
    'Data Analysis': ['data', 'python', 'sql', 'analytics', 'power bi', 'tableau', 'machine learning', 'statistics', 'ml', 'ai'],
    'Digital Marketing': ['marketing', 'ads', 'google ads', 'facebook', 'instagram', 'campaign', 'influencer', 'social media'],
    'Web & Mobile Dev': ['website', 'web dev', 'react', 'node', 'flutter', 'api', 'backend', 'frontend', 'firebase', 'nextjs']
  };
  function kwScore(text, cat) {
    var k = KW[cat] || []; if (!text || !k.length) return 0;
    var t = lc(text), n = k.filter(function (w) { return t.indexOf(w) >= 0; }).length;
    return n / k.length;
  }
  function serviceHit(user, gig) {
    var title = ' ' + canon(gig.title || '') + ' ';
    return (user.services || []).some(function (s) { s = canon(s); return s && title.indexOf(' ' + s + ' ') >= 0; });
  }

  function gigMatch(user, gig) {
    if (!user || !gig) return 0;
    try {
      var s = 0, uc = user.category || '', gc = gig.category || '';
      if (uc && gc === uc) s += 40; else if (uc && (RELATED[uc] || []).indexOf(gc) >= 0) s += 18;
      var cov = coverage(gig.skills, user.skills);
      if (cov) s += cov.frac * 30;
      if (serviceHit(user, gig)) s += 10;
      s += kwScore((gig.title || '') + ' ' + (gig.description || ''), uc) * 15;
      var applied = (user.applications || []).map(function (a) { return a.gigId; });
      if (applied.indexOf(gig.id) >= 0) s -= 30;
      var age = (Date.now() - (gig.created || 0)) / DAY;
      s += age < 1 ? 8 : age < 3 ? 5 : age < 7 ? 2 : 0;
      s += competition(gig) + locFit(user, gig) + levelFit(user, gig);
      return Math.max(0, Math.round(s));
    } catch (e) { return O.gig(user, gig); }
  }

  function fit(user, gig) {
    if (!user || !gig) return 0;
    try {
      var s = talent(user) * 0.4;
      if (user.category === (gig.category || '')) s += 25;
      var cov = coverage(gig.skills, user.skills);
      if (cov) s += cov.frac * 20;
      if (serviceHit(user, gig)) s += 10;
      s += availability(user) * 0.05 + locFit(user, gig) * 0.8 + levelFit(user, gig);
      return Math.round(s);
    } catch (e) { return O.fit ? O.fit(user, gig) : 0; }
  }

  /* ── talent ranking: quality + category + small location nudge + daily exposure rotation ── */
  function seeded(uid) {
    var s = String(uid) + ':' + Math.floor(Date.now() / DAY), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000;
  }
  function rank(users, viewerCat) {
    if (!users || !users.length) return [];
    try {
      var cat = viewerCat || (window.ME && window.ME.category) || '', me = window.ME || {};
      var mc = lc(me.country), mci = lc(me.city);
      var sc = {};
      users.forEach(function (u) {
        var s = talent(u);
        if (cat && u.category === cat) s += 8;
        if (typeof window.getBehaviorScore === 'function') s += window.getBehaviorScore(u.category);
        if (mc && lc(u.country) === mc) { s += 3; if (mci && lc(u.city) === mci) s += 3; }
        var ps = typeof window.getProfileStrengthScore === 'function' ? window.getProfileStrengthScore(u) : 0;
        if (ps >= 60 && num(u.gigsCount) < 3) s += seeded(u.uid) * 6;        // exposure for strong newcomers
        sc[u.uid] = s;
      });
      return users.slice().sort(function (a, b) { return sc[b.uid] - sc[a.uid]; });
    } catch (e) { return O.rank ? O.rank(users, viewerCat) : users; }
  }

  /* ── reasons shown to clients ── */
  window.getMatchReasons = function (user, gig) {
    var out = [];
    try {
      var cov = coverage(gig.skills, user.skills);
      if (cov && cov.got) out.push(cov.got + ' of ' + cov.of + ' skills match');
      var g = posterLoc(gig), uc = lc(user.country), uci = lc(user.city);
      if (uc && g.country && uc === g.country) out.push(uci && g.city && uci === g.city ? 'Same city (' + user.city + ')' : 'Same country');
      var c = completion(user.uid);
      if (c.total >= 2 && c.rate >= 0.8) out.push('Completed ' + c.done + ' of ' + c.total + ' gigs');
      if (num(user.reviewCount) >= 3 && num(user.score) >= 4.5) out.push('★ ' + num(user.score).toFixed(1) + ' (' + user.reviewCount + ' reviews)');
      if (availability(user) === 100) out.push('Available now');
      if (user.badgeStatus && user.badgeStatus !== 'beginner' && user.badgeStatus !== 'review') out.push('Verified skills');
    } catch (e) {}
    return out.slice(0, 3);
  };
  window.ssMatchDebug = { canon: canon, coverage: coverage, completion: completion, performance: performance, locFit: locFit, levelFit: levelFit, competition: competition };

  /* install */
  window.getTalentScore = talent;
  window.getGigMatchScore = gigMatch;
  window.getFreelancerGigFit = fit;
  window.rankTalent = rank;

  /* ── Round 2a: real "last seen" (one write per session, at most every 3 hours) ── */
  (function lastSeen() {
    var done = false;
    setInterval(function () {
      try {
        var m = window.ME, a = window.FB_AUTH && window.FB_AUTH.currentUser;
        if (done || !m || !m.uid || !a || a.uid !== m.uid || m.deleted === true) return;
        done = true;
        var now = Date.now();
        if (m.lastSeen && now - m.lastSeen < 3 * 3600 * 1000) return;
        m.lastSeen = now;
        var F = window.FB_FNS;
        F.updateDoc(F.doc(window.FB_DB, 'users', m.uid), { lastSeen: now }).catch(function () {});
      } catch (e) {}
    }, 4000);
  })();

  /* ── Round 2b: new fields on the post-a-gig form (work type, level, city) ── */
  var EX = { mode: 'remote', level: '', city: '' };
  window.__gwExtra = EX;
  (function wizard() {
    var wasOpen = false;
    function inject() {
      var dur = document.getElementById('gw-duration');
      var open = !!document.getElementById('gw-sheet');
      if (open && !wasOpen) { EX.mode = 'remote'; EX.level = ''; EX.city = ''; }
      wasOpen = open;
      if (!dur || document.getElementById('ss-gw-extra')) return;
      var field = dur.closest ? dur.closest('.gw-field') : dur.parentNode;
      if (!field || !field.parentNode) return;
      var box = document.createElement('div');
      box.id = 'ss-gw-extra';
      box.innerHTML =
        '<div class="gw-field"><label class="gw-label">Work type</label>'
        + '<select id="ss-gw-mode" class="gw-input gw-select"><option value="remote">Remote (work from anywhere)</option><option value="hybrid">Hybrid (some meetings in person)</option><option value="onsite">On-site (in person)</option></select></div>'
        + '<div class="gw-field" id="ss-gw-cityf" style="display:none;"><label class="gw-label">City for in-person work</label>'
        + '<input id="ss-gw-city" class="gw-input" maxlength="60" placeholder="e.g. Lagos"/></div>'
        + '<div class="gw-field"><label class="gw-label">Experience level wanted</label>'
        + '<select id="ss-gw-level" class="gw-input gw-select"><option value="">Any level</option><option value="entry">Entry level</option><option value="mid">Intermediate</option><option value="expert">Expert</option></select></div>';
      field.parentNode.insertBefore(box, field.nextSibling);
      var mo = document.getElementById('ss-gw-mode'), lv = document.getElementById('ss-gw-level'), ci = document.getElementById('ss-gw-city'), cf = document.getElementById('ss-gw-cityf');
      mo.value = EX.mode; lv.value = EX.level; ci.value = EX.city || ''; cf.style.display = EX.mode === 'remote' ? 'none' : '';
      mo.onchange = function () { EX.mode = mo.value; cf.style.display = mo.value === 'remote' ? 'none' : ''; if (mo.value !== 'remote' && !ci.value && window.ME && window.ME.city) { ci.value = window.ME.city; EX.city = ci.value; } };
      lv.onchange = function () { EX.level = lv.value; };
      ci.oninput = function () { EX.city = ci.value.trim().slice(0, 60); };
    }
    new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: true });
  })();

  /* add the chosen fields to the NEW gig only, at the moment it is saved (no change to posting/escrow code) */
  (function saveHook() {
    var prev = window.fbSet;
    if (typeof prev !== 'function' || prev.__m2) return;
    var w = function (col, id, data) {
      try {
        if (col === 'gigs' && data && data.id === id && data.status === 'open' && data.posterUid === (window.ME && window.ME.uid) &&
            data.created && Date.now() - data.created < 60000 && !data.workMode && document.getElementById('gw-sheet')) {
          data.workMode = EX.mode || 'remote';
          if (EX.level) data.expLevel = EX.level;
          var city = EX.mode !== 'remote' ? (EX.city || (window.ME && window.ME.city) || '') : '';
          if (city) data.gigCity = city;
          if (window.ME && window.ME.country) data.gigCountry = window.ME.country;
        }
      } catch (e) {}
      return prev.apply(this, arguments);
    };
    w.__m2 = true; window.fbSet = w;
  })();

  /* ── Round 1: "Best match" + reasons in the hire window ── */
  (function hire() {
    var prev = window.openHireModal;
    if (typeof prev !== 'function' || prev.__m2) return;
    var w = async function (gid) {
      var r = await prev.apply(this, arguments);
      try {
        var gig = getGigs().find(function (g) { return g.id === gid; });
        var list = document.getElementById('hire-list');
        if (!gig || !list) return r;
        var rows = Array.prototype.slice.call(list.children).map(function (row) {
          var inp = row.querySelector('input[name="hire-pick"]'); var uid = inp && inp.value;
          var u = uid && getUser(uid);
          return { row: row, uid: uid, u: u, s: u ? fit(u, gig) : -1 };
        }).filter(function (x) { return x.u; });
        if (!rows.length) return r;
        rows.sort(function (a, b) { return b.s - a.s; });
        rows.forEach(function (x, i) {
          list.appendChild(x.row);
          var head = x.row.firstElementChild, info = head && head.children[1];
          if (!info) return;
          var reasons = window.getMatchReasons(x.u, gig);
          var h = '';
          if (i === 0 && rows.length >= 2) h += '<span style="display:inline-block;background:rgba(26,107,60,.12);color:#1a6b3c;font-weight:800;font-size:10px;border-radius:6px;padding:2px 7px;margin-right:6px;">⭐ Best match</span>';
          if (reasons.length) h += '<span style="font-size:10px;color:var(--td);">' + reasons.map(function (t) { return String(t).replace(/[<>&]/g, ''); }).join(' · ') + '</span>';
          if (h) { var d = document.createElement('div'); d.style.cssText = 'margin-top:3px;line-height:1.7;'; d.innerHTML = h; info.appendChild(d); }
        });
      } catch (e) { console.warn('[matching] hire annotate', e); }
      return r;
    };
    w.__m2 = true; window.openHireModal = w;
  })();
})();
