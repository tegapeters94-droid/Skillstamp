/* SkillStamp - reviews v2
   Fixes and upgrades the old rating flow:
   - Old flow: a client's rating tried to edit the freelancer's profile directly and a freelancer's rating
     tried to edit the gig, both of which the database rules refuse, so ratings were silently lost.
   - New: every rating is its own record in `reviews` (one per person per completed gig, cannot be faked
     for a gig you were not part of, cannot be edited). Both sides can review. The reviewed person can
     reply once. Profiles show the average, a breakdown and the latest reviews. Admins can remove abusive ones.
   - Rating averages are kept on each member's profile by their own browser (reviewCount, reviewAvg, score).
   Remove this file to return to the old behaviour. */
(function () {
  'use strict';
  if (window.__ssReviews) return;
  window.__ssReviews = true;

  var Q = {
    client: ['Quality of work', 'Communication', 'Met the deadline'],      // a client reviewing a freelancer
    freelancer: ['Clear brief', 'Communication', 'Fair and respectful']    // a freelancer reviewing a client
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function F() { return window.FB_FNS; }
  function stars(n, size) { n = Math.round(n || 0); return '<span style="color:#f59e0b;letter-spacing:1px;font-size:' + (size || 13) + 'px;">' + '★'.repeat(n) + '<span style="opacity:.25;">' + '★'.repeat(5 - n) + '</span></span>'; }
  function ago(ts) { var d = Math.round((Date.now() - ts) / 864e5); return d < 1 ? 'today' : d < 30 ? d + ' d ago' : d < 365 ? Math.round(d / 30) + ' mo ago' : Math.round(d / 365) + ' y ago'; }
  function toastS(m, bad) { try { window.toast(m, bad ? 'bad' : undefined); } catch (e) {} }

  /* ───────────── write a review ───────────── */
  window.openRatingPrompt = function (gid, isClient) {
    var gig = window.getGigs().find(function (g) { return g.id === gid; });
    if (!gig || !window.ME) return;
    var toUid = isClient ? gig.hiredUid : gig.posterUid;
    var other = window.getUser(toUid);
    if (!other) return;
    var side = isClient ? 'client' : 'freelancer';
    var rid = gid + '_' + window.ME.uid;
    var f = F();
    f.getDoc(f.doc(window.FB_DB, 'reviews', rid)).then(function (s) {
      if (s && s.exists && s.exists()) { toastS('You have already reviewed this gig. Thank you!'); return; }
      show();
    }).catch(function () { show(); });

    function show() {
      var h = '<button class="mclose" id="rv-close">✕</button>'
        + '<div style="text-align:center;padding:6px 0 12px;"><div style="font-size:32px;">⭐</div>'
        + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin:4px 0;">Review ' + esc(other.name) + '</div>'
        + '<div style="font-size:11px;color:var(--td);">For: ' + esc(gig.title || 'this gig') + '</div></div>'
        + '<div style="text-align:center;margin-bottom:6px;font-size:11px;color:var(--td);">Overall</div>'
        + '<div id="rv-stars" style="display:flex;justify-content:center;gap:10px;margin-bottom:14px;">';
      for (var i = 1; i <= 5; i++) h += '<span data-v="' + i + '" style="font-size:34px;cursor:pointer;opacity:.28;transition:opacity .15s;">★</span>';
      h += '</div><div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:10px 12px;margin-bottom:12px;">';
      Q[side].forEach(function (lbl, k) {
        h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;"><span style="font-size:12px;">' + lbl + '</span><span class="rv-q" data-k="' + k + '" style="white-space:nowrap;">';
        for (var j = 1; j <= 5; j++) h += '<span data-v="' + j + '" style="font-size:18px;cursor:pointer;opacity:.28;">★</span>';
        h += '</span></div>';
      });
      h += '<div style="font-size:10px;color:var(--td);margin-top:2px;">Optional</div></div>'
        + '<div class="fg"><textarea class="fi" id="rv-comment" rows="3" maxlength="600" placeholder="Share what it was like to work together (public)..." style="resize:none;"></textarea></div>'
        + '<div style="font-size:10px;color:var(--td);line-height:1.5;margin:6px 0 10px;">Reviews are public and cannot be edited once sent. Please be honest and respectful, and do not share phone numbers or contact details.</div>'
        + '<button class="btn" id="rv-submit" style="width:100%;">Submit review</button>';
      window.setModal(h);
      var overall = 0, parts = [0, 0, 0];
      setTimeout(function () {
        document.getElementById('rv-close').onclick = window.closeModal;
        function paint(root, v) { root.querySelectorAll('span[data-v]').forEach(function (x) { x.style.opacity = parseInt(x.getAttribute('data-v')) <= v ? '1' : '.28'; }); }
        var big = document.getElementById('rv-stars');
        big.querySelectorAll('span').forEach(function (s) { s.onclick = function () { overall = parseInt(s.getAttribute('data-v')); paint(big, overall); }; });
        document.querySelectorAll('.rv-q').forEach(function (row) {
          row.querySelectorAll('span').forEach(function (s) { s.onclick = function () { var k = parseInt(row.getAttribute('data-k')); parts[k] = parseInt(s.getAttribute('data-v')); paint(row, parts[k]); }; });
        });
        document.getElementById('rv-submit').onclick = function () {
          if (!overall) { toastS('Please choose an overall star rating.', true); return; }
          var comment = document.getElementById('rv-comment').value.trim();
          try { var det = window.detectContactInfo && window.detectContactInfo(comment); if (det && det.flagged && det.severity === 'high') { toastS('Please remove phone numbers, emails or handles from your review.', true); return; } } catch (e) {}
          var btn = this; btn.disabled = true; btn.textContent = 'Sending…';
          var data = { gigId: gid, fromUid: window.ME.uid, toUid: toUid, side: side, stars: overall, comment: comment, gigTitle: String(gig.title || '').slice(0, 80), ts: Date.now() };
          parts.forEach(function (v, k) { if (v) data['q' + (k + 1)] = v; });
          f.setDoc(f.doc(window.FB_DB, 'reviews', rid), data).then(function () {
            try { window.pushNotif(toUid, 'endorsed', '⭐ New review', window.ME.name + ' left you a ' + overall + '-star review.', { type: 'endorsed', fromUid: window.ME.uid, skill: 'Review' }); } catch (e) {}
            if (isClient) { try { var gi = CACHE.gigs.findIndex(function (g) { return g.id === gid; }); if (gi >= 0) { CACHE.gigs[gi].clientRating = { stars: overall, comment: comment, by: window.ME.uid }; window.fbSet('gigs', gid, { clientRating: CACHE.gigs[gi].clientRating }); } } catch (e) {} }
            toastS('⭐ Review sent. Thank you!'); window.closeModal();
          }).catch(function () { btn.disabled = false; btn.textContent = 'Submit review'; toastS('Could not save the review. It can only be left once, after the gig is completed.', true); });
        };
      }, 50);
    }
  };

  /* ───────────── read reviews for a profile ───────────── */
  var memo = {};
  function fetchReviews(uid) {
    var f = F();
    if (memo[uid] && Date.now() - memo[uid].t < 60000) return Promise.resolve(memo[uid].rows);
    return f.getDocs(f.query(f.collection(window.FB_DB, 'reviews'), f.where('toUid', '==', uid))).then(function (s) {
      var rows = s.docs.map(function (d) { var x = d.data(); x._id = d.id; return x; });
      var seen = {}; rows.forEach(function (r) { seen[r.gigId + '_' + r.fromUid] = 1; });
      // older ratings that were saved on the gig itself
      try {
        window.getGigs().forEach(function (g) {
          if (g.hiredUid === uid && g.clientRating && g.clientRating.stars && !seen[g.id + '_' + g.posterUid]) {
            rows.push({ _id: 'legacy_' + g.id, legacy: true, gigId: g.id, fromUid: g.posterUid, toUid: uid, side: 'client', stars: g.clientRating.stars, comment: g.clientRating.comment || '', gigTitle: g.title || '', ts: g.completedAt || g.hiredAt || g.created || 0 });
          }
        });
      } catch (e) {}
      rows.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
      memo[uid] = { t: Date.now(), rows: rows };
      return rows;
    });
  }
  function summary(rows) {
    var n = rows.length, sum = 0, dist = [0, 0, 0, 0, 0, 0], qs = [[0, 0], [0, 0], [0, 0]];
    rows.forEach(function (r) {
      sum += r.stars; dist[r.stars]++;
      [r.q1, r.q2, r.q3].forEach(function (v, k) { if (v) { qs[k][0] += v; qs[k][1]++; } });
    });
    return { n: n, avg: n ? sum / n : 0, sum: sum, dist: dist, qs: qs };
  }

  function card(uid, rows, isOwn, role) {
    var s = summary(rows), side = role === 'client' ? 'freelancer' : 'client'; // labels of sub-ratings come from the reviewer's side
    var h = '<div id="rv-card" style="background:var(--s);border:1px solid var(--br);border-radius:14px;padding:16px;margin-top:14px;">'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;margin-bottom:10px;">Reviews' + (s.n ? ' <span style="color:var(--td);font-weight:600;">(' + s.n + ')</span>' : '') + '</div>';
    if (!s.n) {
      h += '<div style="font-size:12px;color:var(--td);line-height:1.6;">No reviews yet. Reviews appear here after a gig is completed.</div></div>';
      return h;
    }
    h += '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">'
      + '<div style="text-align:center;min-width:70px;"><div style="font-size:30px;font-weight:800;line-height:1;">' + s.avg.toFixed(1) + '</div>' + stars(s.avg, 14) + '<div style="font-size:10px;color:var(--td);margin-top:2px;">' + s.n + ' review' + (s.n === 1 ? '' : 's') + '</div></div>'
      + '<div style="flex:1;min-width:140px;">';
    for (var k = 5; k >= 1; k--) {
      var pct = Math.round(s.dist[k] / s.n * 100);
      h += '<div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--td);margin:2px 0;"><span style="width:8px;">' + k + '</span><div style="flex:1;height:6px;background:var(--br);border-radius:4px;overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:#f59e0b;"></div></div><span style="width:24px;text-align:right;">' + s.dist[k] + '</span></div>';
    }
    h += '</div></div>';
    var qsh = '';
    var lbls = Q[role === 'client' ? 'freelancer' : 'client'];
    s.qs.forEach(function (q, i) { if (q[1] >= 1) qsh += '<span style="font-size:10px;background:var(--s2);border:1px solid var(--br);border-radius:20px;padding:3px 9px;margin:0 4px 4px 0;display:inline-block;">' + lbls[i] + ' <b>' + (q[0] / q[1]).toFixed(1) + '</b></span>'; });
    if (qsh) h += '<div style="margin-bottom:10px;">' + qsh + '</div>';
    rows.slice(0, 6).forEach(function (r) {
      var from = window.getUser(r.fromUid);
      h += '<div style="border-top:1px solid var(--br);padding:11px 0;">'
        + '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><div style="font-size:12px;font-weight:700;">' + esc(from ? from.name : 'SkillStamp member') + ' <span style="font-weight:500;color:var(--td);font-size:10px;">· ' + (r.side === 'client' ? 'Client' : 'Freelancer') + '</span></div>' + stars(r.stars, 12) + '</div>'
        + '<div style="font-size:10px;color:var(--td);margin:1px 0 4px;">' + esc(r.gigTitle || 'Completed gig') + ' · ' + ago(r.ts) + '</div>'
        + (r.comment ? '<div style="font-size:12px;line-height:1.6;word-break:break-word;">' + esc(r.comment) + '</div>' : '')
        + (r.reply ? '<div style="margin:7px 0 0 10px;padding:7px 10px;border-left:3px solid var(--g,#1a6b3c);background:var(--s2);border-radius:0 8px 8px 0;font-size:11px;line-height:1.55;"><b>Reply:</b> ' + esc(r.reply) + '</div>'
          : (isOwn && !r.legacy ? '<div style="margin-top:6px;"><button class="btn2" style="font-size:10px;padding:5px 10px;" onclick="ssReviewReply(\'' + esc(r._id) + '\')">Reply</button></div>' : ''))
        + '</div>';
    });
    if (rows.length > 6) h += '<div style="font-size:11px;color:var(--td);border-top:1px solid var(--br);padding-top:8px;">Showing the 6 most recent of ' + rows.length + '.</div>';
    return h + '</div>';
  }

  window.ssReviewReply = function (id) {
    var rows = (memo[window.ME.uid] || {}).rows || [], r = rows.filter(function (x) { return x._id === id; })[0]; if (!r) return;
    var h = '<button class="mclose" onclick="closeModal()">✕</button><h3>Reply to review</h3>'
      + '<div style="font-size:11px;color:var(--td);margin:6px 0 10px;font-style:italic;">' + esc(r.comment || (r.stars + ' stars')) + '</div>'
      + '<div class="fg"><textarea class="fi" id="rv-reply" rows="3" maxlength="400" placeholder="Write a calm, professional reply. You can only reply once." style="resize:none;"></textarea></div>'
      + '<button class="btn" id="rv-reply-go" style="width:100%;">Post reply</button>';
    window.setModal(h);
    setTimeout(function () {
      document.getElementById('rv-reply-go').onclick = function () {
        var t = document.getElementById('rv-reply').value.trim(); if (!t) return;
        try { var det = window.detectContactInfo && window.detectContactInfo(t); if (det && det.flagged && det.severity === 'high') { toastS('Please remove contact details from your reply.', true); return; } } catch (e) {}
        var f = F();
        f.updateDoc(f.doc(window.FB_DB, 'reviews', id), { reply: t, replyTs: Date.now() }).then(function () {
          delete memo[window.ME.uid]; window.closeModal(); toastS('Reply posted.'); inject(window.ME.uid, 'myprofile-content', true);
        }).catch(function () { toastS('Could not post the reply.', true); });
      };
    }, 50);
  };

  function inject(uid, hostId, isOwn) {
    try {
      var host = document.getElementById(hostId); if (!host) return;
      var main = host.querySelector('.prf-main') || host;
      var u = window.getUser(uid), role = u && u.role === 'client' ? 'client' : 'freelancer';
      fetchReviews(uid).then(function (rows) {
        var old = document.getElementById('rv-card'); if (old) old.remove();
        var d = document.createElement('div'); d.innerHTML = card(uid, rows, isOwn, role);
        var foot = main.querySelector('.prf-footer');
        main.appendChild(d.firstChild);
      }).catch(function () {});
    } catch (e) {}
  }
  var origView = window.viewProfile;
  if (typeof origView === 'function') {
    window.viewProfile = function (uid) { var r = origView.apply(this, arguments); try { if (uid && window.ME && uid !== window.ME.uid) setTimeout(function () { inject(uid, 'viewprofile-content', false); }, 30); } catch (e) {} return r; };
  }
  var origMine = window.renderMyProfile || (typeof renderMyProfile === 'function' ? renderMyProfile : null);
  if (origMine) {
    window.renderMyProfile = function () { var r = origMine.apply(this, arguments); try { setTimeout(function () { inject(window.ME.uid, 'myprofile-content', true); }, 30); } catch (e) {} return r; };
  }

  /* ───────────── keep my own totals up to date (my browser writes my own profile) ───────────── */
  var synced = false;
  function syncMine() {
    if (synced) return;
    var m = window.ME, u = window.FB_AUTH && window.FB_AUTH.currentUser;
    if (!m || !m.uid || !u || u.uid !== m.uid || !F() || !window.FB_DB || !CACHE || !CACHE.gigs || !CACHE.gigs.length) return;
    synced = true;
    fetchReviews(m.uid).then(function (rows) {
      var s = summary(rows); if (!s.n) return;
      var avg = Math.round(s.avg * 10) / 10;
      var patch = {};
      if ((m.reviewCount || 0) !== s.n) patch.reviewCount = s.n;
      if (m.reviewAvg !== avg) patch.reviewAvg = avg;
      if (m.role === 'client') { if (m.clientRating !== avg) patch.clientRating = avg; }
      else {
        var blend = Math.round(((s.sum + 3.5 * 2) / (s.n + 2)) * 10) / 10;   // fair average: starts neutral, real reviews take over
        if (m.score !== blend) patch.score = blend;
      }
      if (!Object.keys(patch).length) return;
      Object.assign(m, patch);
      try { var cu = CACHE.users.find(function (x) { return x.uid === m.uid; }); if (cu) Object.assign(cu, patch); } catch (e) {}
      window.fbSet('users', m.uid, patch);
    }).catch(function () { synced = false; });
  }
  setInterval(syncMine, 4000);
  window.ssReviewsResync = function () { synced = false; memo = {}; syncMine(); };

  /* ───────────── admin: remove abusive reviews ───────────── */
  window.ssRevAdminOpen = function () {
    var host = document.getElementById('rva-host'); if (!host) return;
    var f = F();
    host.innerHTML = '<div class="ap-cardbox"><div class="ap-h2">Reviews</div><div class="ap-note">Loading…</div></div>';
    f.getDocs(f.query(f.collection(window.FB_DB, 'reviews'), f.orderBy('ts', 'desc'), f.limit(30))).then(function (s) {
      var h = '<div class="ap-cardbox"><div class="ap-h2">Latest reviews (' + s.size + ')</div>';
      s.docs.forEach(function (d) {
        var r = d.data();
        h += '<div style="border-top:1px solid var(--br);padding:8px 0;"><div style="font-size:11px;color:var(--td);">' + esc((window.getUser(r.fromUid) || {}).name || r.fromUid) + ' → ' + esc((window.getUser(r.toUid) || {}).name || r.toUid) + ' · ' + r.stars + '★ · ' + ago(r.ts) + '</div>'
          + (r.comment ? '<div style="font-size:12px;margin:2px 0;word-break:break-word;">' + esc(r.comment) + '</div>' : '')
          + '<button class="ap-btn ap-danger" onclick="ssRevAdminDel(\'' + esc(d.id) + '\')">Remove</button></div>';
      });
      host.innerHTML = h + '</div>';
    }).catch(function () { host.innerHTML = '<div class="ap-cardbox"><div class="ap-note ap-dangerbox">Could not load. Publish the latest firestore.rules first.</div></div>'; });
  };
  window.ssRevAdminDel = function (id) {
    if (!window.confirm('Remove this review permanently?')) return;
    var f = F();
    f.deleteDoc(f.doc(window.FB_DB, 'reviews', id)).then(function () { memo = {}; toastS('Review removed.'); window.ssRevAdminOpen(); }).catch(function () { toastS('Could not remove.', true); });
  };
  (function () {
    var prev = window.adminTab;
    if (typeof prev !== 'function' || prev.__rv) return;
    var w = function (name) {
      var r = prev.apply(this, arguments);
      try {
        if (name === 'overview') setTimeout(function () {
          var tab = document.getElementById('admtab-overview'); if (!tab || document.getElementById('rva-host')) return;
          var d = document.createElement('div'); d.id = 'rva-host'; d.style.marginBottom = '14px';
          d.innerHTML = '<div class="ap-cardbox"><div class="ap-h2">Reviews</div><div class="ap-note" style="margin-bottom:8px;">See the latest member reviews and remove any that are abusive or fake.</div><button class="ap-btn ap-ghost" onclick="ssRevAdminOpen()">Open reviews</button></div>';
          tab.appendChild(d);
        }, 180);
      } catch (e) {}
      return r;
    };
    w.__rv = true; window.adminTab = w;
  })();
})();
