/* SkillStamp - "Getting started" checklist for new members (freelancers AND clients)
   Shows a short list of next steps on the Home screen, ticks them off automatically from the
   member's real activity, and can be hidden. Also adds a helpful button to the empty "My gigs" list.
   Display only: it reads existing data and never changes accounts, wallets or gigs.
   Remove this file to go back to the old Home screen. */
(function () {
  'use strict';
  if (window.__ssGettingStarted) return;
  window.__ssGettingStarted = true;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isClient(u) { return u && (u.role === 'employer' || u.role === 'client'); }
  function key(u) { return 'ss_gs_hide_' + u.uid; }
  function hidden(u) { try { return localStorage.getItem(key(u)) === '1'; } catch (e) { return false; } }
  function gigsAll() { try { return window.getGigs ? window.getGigs() : (CACHE.gigs || []); } catch (e) { return []; } }
  function pct(u) { try { return window.calculateProfileCompletion ? window.calculateProfileCompletion(u).pct : 0; } catch (e) { return 0; } }

  function steps(u) {
    var gigs = gigsAll(), me = u.uid, out;
    if (isClient(u)) {
      var mine = gigs.filter(function (g) { return g.posterUid === me; });
      out = [
        { t: 'Complete your profile', d: 'A photo and a short bio help freelancers trust you.', done: pct(u) >= 70, go: 'openEditProfile()', cta: 'Edit profile' },
        { t: 'Post your first gig', d: 'Describe the job, set a budget and freelancers will apply.', done: mine.length > 0, go: 'openPostGig()', cta: 'Post a gig' },
        { t: 'Hire a freelancer', d: 'Review applicants and pick the right person. Payment is held safely in escrow.', done: mine.some(function (g) { return g.hiredUid; }), go: "showPage('talent')", cta: 'Browse talent' },
        { t: 'Approve the work and release payment', d: 'You only release payment when you are happy with the delivery.', done: mine.some(function (g) { return g.status === 'completed'; }), go: "showPage('gigs')", cta: 'My gigs' },
        { t: 'Leave a review', d: 'Rate your freelancer. It helps the next client decide.', done: mine.some(function (g) { return g.clientRating; }), go: "showPage('gigs')", cta: 'My gigs' }
      ];
    } else {
      var applied = (u.applications && u.applications.length) || gigs.some(function (g) { return (g.applicants || []).indexOf(me) >= 0; });
      out = [
        { t: 'Complete your profile', d: 'Photo, headline, bio and skills. Clients decide in seconds.', done: pct(u) >= 70, go: 'openEditProfile()', cta: 'Edit profile' },
        { t: 'Add a portfolio project', d: 'Show real work. Profiles with a portfolio get far more hires.', done: (u.portfolio || []).length >= 1, go: 'openAddPortfolio()', cta: 'Add project' },
        { t: 'Get your skill verified', d: 'The verified badge puts you first in search results.', done: ['verified', 'expert', 'elite', 'review'].indexOf(u.badgeStatus) >= 0, go: 'openSubmitSkill()', cta: 'Get verified' },
        { t: 'Apply to your first gig', d: 'Write a short, specific proposal. Tailored ones win.', done: !!applied, go: "showPage('gigs')", cta: 'Browse gigs' },
        { t: 'Complete your first gig', d: 'Deliver great work and earn your first review.', done: (u.gigsCount || 0) >= 1, go: "showPage('gigs')", cta: 'My work' }
      ];
    }
    return out;
  }

  function card(u) {
    var list = steps(u), done = list.filter(function (s) { return s.done; }).length, total = list.length;
    var next = -1; for (var i = 0; i < list.length; i++) if (!list[i].done) { next = i; break; }
    var p = Math.round(done / total * 100);
    var h = '<div id="gs-card" style="background:var(--s);border:1px solid var(--br);border-radius:20px;padding:18px 16px 14px;margin-bottom:14px;">'
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:4px;">'
      + '<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;letter-spacing:-.01em;">' + (done === total ? 'You’re all set' : 'Get started with SkillStamp') + '</div>'
      + '<div style="font-size:11px;color:var(--td);margin-top:2px;">' + (done === total ? 'Great job. You have completed every step.' : done + ' of ' + total + ' done · ' + (isClient(u) ? 'a few steps to your first hire' : 'a few steps to your first gig')) + '</div></div>'
      + '<button onclick="ssGsHide()" aria-label="Hide checklist" style="background:none;border:none;color:var(--td);font-size:11px;cursor:pointer;padding:2px 0;white-space:nowrap;">' + (done === total ? 'Close' : 'Hide') + '</button></div>'
      + '<div style="height:4px;background:var(--br);border-radius:4px;overflow:hidden;margin:10px 0 8px;"><div style="width:' + p + '%;height:100%;background:var(--g,#1a6b3c);border-radius:4px;transition:width .4s;"></div></div>';
    list.forEach(function (s, i) {
      var isNext = i === next;
      h += '<div ' + (s.done ? '' : 'onclick="' + esc(s.go) + '"') + ' style="display:flex;align-items:' + (isNext ? 'flex-start' : 'center') + ';gap:12px;padding:' + (isNext ? '12px 10px' : '9px 10px') + ';border-radius:12px;' + (isNext ? 'background:var(--s2);' : '') + (s.done ? '' : 'cursor:pointer;') + '">'
        + '<span style="flex:none;width:20px;height:20px;border-radius:50%;margin-top:' + (isNext ? '1' : '0') + 'px;display:flex;align-items:center;justify-content:center;' + (s.done ? 'background:var(--g,#1a6b3c);color:#fff;' : 'border:1.5px solid var(--br);color:transparent;') + '">'
        + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>'
        + '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:' + (isNext ? '700' : '600') + ';' + (s.done ? 'color:var(--td);text-decoration:line-through;' : '') + '">' + esc(s.t) + '</div>'
        + (isNext ? '<div style="font-size:11px;color:var(--td);line-height:1.5;margin:2px 0 8px;">' + esc(s.d) + '</div><span style="display:inline-block;background:var(--g,#1a6b3c);color:#fff;font-size:11px;font-weight:700;padding:6px 14px;border-radius:9px;">' + esc(s.cta) + '</span>' : '')
        + '</div></div>';
    });
    return h + '</div>';
  }

  window.ssGsHide = function () {
    try { localStorage.setItem(key(window.ME), '1'); } catch (e) {}
    var c = document.getElementById('gs-card'); if (c) c.remove();
  };

  function inject() {
    try {
      var u = window.ME; if (!u || !u.uid || u.isAdmin || u.role === 'admin' || hidden(u)) return;
      var pg = document.getElementById('page-home'); if (!pg || document.getElementById('gs-card')) return;
      var wrap = pg.firstElementChild; if (!wrap || !wrap.children.length) return;
      var list = steps(u);
      if (list.every(function (s) { return s.done; })) {
        var seen = 'ss_gs_done_' + u.uid, first = false;
        try { first = localStorage.getItem(seen) !== '1'; localStorage.setItem(seen, '1'); } catch (e) {}
        if (!first) return;   // show the "all set" card once, then retire it
      }
      var d = document.createElement('div'); d.innerHTML = card(u);
      var hero = wrap.children[0];
      hero.parentNode.insertBefore(d.firstChild, hero.nextSibling);
    } catch (e) {}
  }

  var prev = window.renderRoleHome;
  if (typeof prev === 'function') {
    window.renderRoleHome = function () { var r = prev.apply(this, arguments); inject(); return r; };
  }

  /* empty "My gigs" list: say what to do next */
  var prevG = window.renderGigs || (typeof renderGigs === 'function' ? renderGigs : null);
  if (prevG) {
    window.renderGigs = function () {
      var r = prevG.apply(this, arguments);
      try {
        var l = document.getElementById('gig-list'), e = l && l.querySelector('.empty');
        if (e && !e.querySelector('.gs-cta') && window.ME) {
          var t = (e.textContent || '');
          var b = document.createElement('button'); b.className = 'btn gs-cta'; b.style.cssText = 'margin-top:12px;';
          if (/No gigs posted yet/i.test(t) && isClient(window.ME)) { b.textContent = '+ Post your first gig'; b.onclick = function () { window.openPostGig(); }; e.appendChild(b); }
          else if (/No gigs available/i.test(t) && !isClient(window.ME)) { b.textContent = 'Strengthen your profile'; b.onclick = function () { window.openEditProfile(); }; e.appendChild(b); }
        }
      } catch (x) {}
      return r;
    };
  }
})();
