/* SkillStamp - installable app + push notifications (client side).
   - Registers the service worker (sw.js).
   - Adds an "App & notifications" card to Settings: install button, and a switch for phone/desktop alerts.
   - Alerts are sent by the SkillStamp email service (its 5-minute job); this file only subscribes the device.
   Touches no sign-in, database or money code. Remove this file to switch it all off. */
(function () {
  'use strict';
  if (window.__ssPwa) return;
  window.__ssPwa = true;

  var API = window.SS_API || 'https://skillstamp-email.tegapeters94.workers.dev';
  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  var reg = null, deferred = null;
  var standalone = false;
  try { standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) {}
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var canPush = secure && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  /* ---- service worker ---- */
  if (secure && 'serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (r) { reg = r; }).catch(function () {});
    });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; refresh(); });
  window.addEventListener('appinstalled', function () { deferred = null; standalone = true; refresh(); if (window.toast) window.toast('SkillStamp is installed.'); });

  function toast(m) { try { if (window.toast) window.toast(m); } catch (e) {} }
  function token() {
    var u = window.FB_AUTH && window.FB_AUTH.currentUser;
    return u ? u.getIdToken() : Promise.reject(new Error('signed out'));
  }
  function b64uToArr(s) {
    var p = '='.repeat((4 - s.length % 4) % 4), b = (s + p).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(b), a = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  }
  function getReg() {
    if (reg) return Promise.resolve(reg);
    return navigator.serviceWorker.ready.then(function (r) { reg = r; return r; });
  }
  function currentSub() { return getReg().then(function (r) { return r.pushManager.getSubscription(); }); }

  function enablePush() {
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'denied' : 'dismissed');
      return fetch(API + '/push/key').then(function (r) { if (!r.ok) throw new Error('key'); return r.json(); });
    }).then(function (k) {
      return getReg().then(function (r) {
        return r.pushManager.getSubscription().then(function (s) {
          return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToArr(k.key) });
        });
      });
    }).then(function (sub) {
      return token().then(function (t) {
        return fetch(API + '/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      }).then(function (r) { if (!r.ok) throw new Error('save'); });
    });
  }
  function disablePush() {
    return currentSub().then(function (s) {
      if (!s) return;
      var ep = s.endpoint;
      return token().then(function (t) {
        return fetch(API + '/push/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ endpoint: ep }) });
      }).catch(function () {}).then(function () { return s.unsubscribe(); });
    });
  }

  /* ---- settings card ---- */
  function sw(on) {
    return '<button id="ss-push-sw" type="button" role="switch" aria-checked="' + on + '" style="flex-shrink:0;width:46px;height:28px;border-radius:14px;border:none;cursor:pointer;position:relative;transition:background .2s;background:' + (on ? '#1a6b3c' : '#9aa59d') + ';">' +
      '<span style="position:absolute;top:3px;left:' + (on ? '21px' : '3px') + ';width:22px;height:22px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.3);"></span></button>';
  }
  function setSw(on) {
    var b = document.getElementById('ss-push-sw'); if (!b) return;
    b.setAttribute('aria-checked', String(on)); b.style.background = on ? '#1a6b3c' : '#9aa59d'; b.firstChild.style.left = on ? '21px' : '3px';
  }
  var ROW = 'background:var(--s);border:1px solid var(--br);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;';
  var T1 = 'font-weight:700;font-size:14px;color:var(--tx);', T2 = 'font-size:12px;color:var(--td);margin-top:2px;line-height:1.45;';
  var BTN = 'flex-shrink:0;background:#1a6b3c;color:#fff;border:0;border-radius:10px;padding:9px 14px;font-size:12.5px;font-weight:700;cursor:pointer;';

  function render(card, pushOn, perm) {
    var h = '<div style="font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.08em;padding:0 4px;margin-bottom:6px;">App &amp; notifications</div>';
    /* install row */
    if (standalone) {
      h += '<div style="' + ROW + 'margin-bottom:8px;"><div style="flex:1;min-width:0;"><div style="' + T1 + '">App installed</div><div style="' + T2 + '">You are using SkillStamp as an app.</div></div></div>';
    } else if (deferred) {
      h += '<div style="' + ROW + 'margin-bottom:8px;"><div style="flex:1;min-width:0;"><div style="' + T1 + '">Install SkillStamp</div><div style="' + T2 + '">Add it to your home screen for one-tap access and a full-screen app.</div></div><button id="ss-install-btn" type="button" style="' + BTN + '">Install</button></div>';
    } else if (isIOS) {
      h += '<div style="' + ROW + 'margin-bottom:8px;"><div style="flex:1;min-width:0;"><div style="' + T1 + '">Install SkillStamp</div><div style="' + T2 + '">In Safari, tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</div></div></div>';
    } else if (secure) {
      h += '<div style="' + ROW + 'margin-bottom:8px;"><div style="flex:1;min-width:0;"><div style="' + T1 + '">Install SkillStamp</div><div style="' + T2 + '">Open your browser menu and choose &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.</div></div></div>';
    }
    /* push row */
    if (canPush && (!isIOS || standalone)) {
      var sub = perm === 'denied'
        ? 'Notifications are blocked for this site. Allow them in your browser settings to turn this on.'
        : 'Get an alert on this device for new proposals, hires, deliveries and messages, even when SkillStamp is closed.';
      h += '<div style="' + ROW + '"><div style="flex:1;min-width:0;"><div style="' + T1 + '">Phone &amp; desktop alerts</div><div style="' + T2 + '">' + sub + '</div></div>' + sw(pushOn) + '</div>';
    } else if (canPush && isIOS) {
      h += '<div style="' + ROW + '"><div style="flex:1;min-width:0;"><div style="' + T1 + '">Phone alerts</div><div style="' + T2 + '">On iPhone, add SkillStamp to your home screen first, then open it from there to turn on alerts.</div></div></div>';
    }
    card.innerHTML = h;
    var ib = card.querySelector('#ss-install-btn');
    if (ib) ib.onclick = function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.then(function () { deferred = null; refresh(); }).catch(function () {}); };
    var pb = card.querySelector('#ss-push-sw');
    if (pb) {
      if (perm === 'denied') { pb.disabled = true; pb.style.opacity = '.5'; pb.style.cursor = 'not-allowed'; }
      pb.onclick = function () {
        var want = pb.getAttribute('aria-checked') !== 'true';
        setSw(want); pb.disabled = true;
        (want ? enablePush() : disablePush()).then(function () {
          if (want) toast('Alerts are on for this device.');
        }).catch(function (e) {
          setSw(!want);
          var m = e && e.message;
          toast(m === 'denied' ? 'Notifications are blocked in your browser settings.' : m === 'dismissed' ? 'Alerts were not turned on.' : "Couldn't turn alerts on right now. Please try again later.");
          refresh();
        }).then(function () { pb.disabled = false; });
      };
    }
  }

  function refresh() {
    var card = document.getElementById('ss-pwa-card');
    if (!card) return;
    var perm = canPush ? Notification.permission : 'default';
    if (!canPush || perm !== 'granted') return render(card, false, perm);
    currentSub().then(function (s) { render(card, !!s, perm); }).catch(function () { render(card, false, perm); });
  }

  function inject() {
    try {
      var panel = document.getElementById('settings-panel');
      if (!panel || panel.querySelector('#ss-pwa-card') || !window.ME) return;
      var body = panel.querySelector('.ss-body'); if (!body) return;
      if (!secure && !standalone) return;
      var card = document.createElement('div');
      card.id = 'ss-pwa-card'; card.style.cssText = 'margin:0 16px 12px;';
      var after = body.querySelector('#ss-email-pref');
      if (after && after.nextSibling) body.insertBefore(card, after.nextSibling);
      else if (after) body.appendChild(card);
      else { var first = body.children[1] || body.children[0]; if (first && first.nextSibling) body.insertBefore(card, first.nextSibling); else body.appendChild(card); }
      render(card, false, canPush ? Notification.permission : 'default');
      refresh();
    } catch (e) {}
  }
  var prev = window.openSettings;
  if (typeof prev === 'function') {
    window.openSettings = function () { var r = prev.apply(this, arguments); inject(); return r; };
  }
})();
