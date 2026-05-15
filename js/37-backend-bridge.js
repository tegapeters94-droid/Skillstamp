// SkillStamp — Backend Security Bridge (v1)
// ─────────────────────────────────────────────────────────────────────────
// This file patches sensitive frontend operations to call Cloud Functions
// instead of writing directly to Firestore.
//
// Load order: must be the LAST script loaded (after all other modules).
// It overrides specific functions in-place — zero architecture changes.
//
// Operations moved server-side:
//   1. Message sending       → validateAndSendMessage()
//   2. Analytics writes      → trackAnalyticsEvent()
//   3. Admin ban/unban       → adminToggleBan()
//   4. Admin badge set       → adminSetBadge()
//   5. Verification decision → adminVerificationDecision()
//   6. Payment release       → releasePayment()
//
// All patches degrade gracefully: if the Cloud Function call fails,
// the app either retries the legacy path or shows a clear error.
// ─────────────────────────────────────────────────────────────────────────

(function (global) {
'use strict';

// ── Wait for Firebase Functions SDK to be ready ───────────────────────────
var _callFn = null;  // httpsCallable factory — set in _initBridge()

function _initBridge() {
  if (!global.FB_CALL) {
    console.warn('[Bridge] FB_CALL not ready yet — retrying in 500ms');
    setTimeout(_initBridge, 500);
    return;
  }
  _callFn = global.FB_CALL;

  // Apply all patches once Functions SDK is confirmed ready
  _patchMessages();
  _patchAnalytics();
  _patchAdminActions();
  _patchPaymentRelease();

  console.info('[Bridge] Backend security bridge active ✅');
}

// ─────────────────────────────────────────────────────────────────────────
//  PATCH 1 — MESSAGE GUARD
//  Overrides actualSend() inside openMsg to route through the Cloud Function.
//  Strategy: monkey-patch window.actualSend which is set in 12-messages.js
//  (exposed to global scope via the openMsg closure patching mechanism below).
//
//  Since actualSend is a closure-local function, we patch at the openMsg level:
//  we override the send button wire-up by intercepting doSend.
// ─────────────────────────────────────────────────────────────────────────

function _patchMessages() {
  // We expose a global _ssActualSend that 12-messages.js's doSend calls
  // if it finds this bridge active. We set a flag for 12-messages to detect.
  global._BRIDGE_MESSAGE_GUARD = true;

  // The bridge's version of actualSend — called by the patched doSend in
  // 12-messages.js when _BRIDGE_MESSAGE_GUARD is true.
  global._bridgeSendMessage = async function(toUid, cid, text, isFlagged) {
    var callFn = _callFn('validateAndSendMessage');
    try {
      var result = await callFn({
        toUid:       toUid,
        text:        text,
        overrideFlag: !!isFlagged,
      });

      if (!result || !result.data) {
        throw new Error('Empty response from validateAndSendMessage');
      }

      var data = result.data;

      if (data.flagged && !isFlagged) {
        // Backend flagged it — surface the contact warning modal
        // (same UI flow as the frontend guard)
        return { blocked: true, label: data.label || 'off-platform contact' };
      }

      if (!data.ok) {
        throw new Error('Message rejected by server.');
      }

      return { ok: true };

    } catch (err) {
      console.error('[Bridge] validateAndSendMessage failed:', err);
      // On failure, fall back to direct Firestore write so the app never
      // silently drops a message
      return { fallback: true, error: err.message };
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  PATCH 2 — ANALYTICS
//  Replaces the single write point: global.trackEvent in 35-analytics.js
//  The existing dedup/rate-limit logic in 35-analytics.js is kept for the
//  local buffer; only the Firestore write is redirected.
// ─────────────────────────────────────────────────────────────────────────

function _patchAnalytics() {
  var _originalTrackEvent = global.trackEvent;
  if (typeof _originalTrackEvent !== 'function') {
    console.warn('[Bridge] trackEvent not found — analytics patch skipped');
    return;
  }

  global.trackEvent = function(type, payload) {
    if (!type) return;
    // Gate: skip if no user (pre-login analytics are noise)
    if (!global.ME || !global.ME.uid) return;

    // Keep the local behavioral signal mirroring from the original (algorithm.js)
    try {
      if (type === 'gig_view'     && payload && typeof recordSignal === 'function') recordSignal('gig_view',     payload);
      if (type === 'profile_view' && payload && typeof recordSignal === 'function') recordSignal('profile_view', payload);
      if (type === 'search'       && payload && typeof recordSignal === 'function') recordSignal('search',       payload);
      if (type === 'cat_interact' && payload && typeof recordSignal === 'function') recordSignal('cat_interact', payload);
    } catch (e) {}

    // Route the Firestore write through the Cloud Function (fire-and-forget)
    var callFn = _callFn('trackAnalyticsEvent');
    callFn({
      type:      type,
      payload:   payload || {},
      userRole:  (global.ME && global.ME.role) || '',
      clientTs:  Date.now(),
    }).catch(function(err) {
      // Silently swallow analytics failures — never crash the app
      console.warn('[Bridge] trackAnalyticsEvent failed (non-critical):', err.message || err);
    });
  };

  console.info('[Bridge] Analytics writes → Cloud Function ✅');
}

// ─────────────────────────────────────────────────────────────────────────
//  PATCH 3 — ADMIN ACTIONS
//  Replaces adminToggleBanV6, adminSetBadge, adminSetBadgeInline,
//  and the verification decision handlers with Cloud Function calls.
// ─────────────────────────────────────────────────────────────────────────

function _patchAdminActions() {

  // ── 3a. adminToggleBanV6 ──────────────────────────────────────────────
  global.adminToggleBanV6 = async function(uid) {
    var u = typeof getUser === 'function' ? getUser(uid) : null;
    if (!u) { toast('User not found.', 'bad'); return; }

    var wasBanned = u.badgeStatus === 'suspended';
    var action    = wasBanned ? 'unban' : 'ban';

    // Optimistic UI update
    u.badgeStatus = wasBanned ? 'beginner' : 'suspended';
    u.isBanned    = !wasBanned;
    if (typeof saveUser === 'function') saveUser(u);
    toast(u.name + ' ' + (wasBanned ? 'unbanned ✅' : 'banned ⛔'));
    var p = document.getElementById('page-admin');
    if (p && typeof renderAdminV6 === 'function') p.innerHTML = renderAdminV6();

    // Cloud Function call (authoritative write + audit log)
    try {
      var callFn = _callFn('adminToggleBan');
      var result = await callFn({ targetUid: uid, action: action });
      if (!result || !result.data || !result.data.ok) {
        throw new Error('Server rejected ban action.');
      }
      // Sync CACHE with confirmed server status
      var newStatus = result.data.newStatus;
      u.badgeStatus = newStatus;
      u.isBanned    = newStatus === 'suspended';
      if (typeof saveUser === 'function') saveUser(u);
      // Re-render with confirmed state
      if (p && typeof renderAdminV6 === 'function') p.innerHTML = renderAdminV6();
    } catch (err) {
      console.error('[Bridge] adminToggleBan failed:', err);
      // Rollback optimistic update
      u.badgeStatus = wasBanned ? 'suspended' : 'beginner';
      u.isBanned    = wasBanned;
      if (typeof saveUser === 'function') saveUser(u);
      if (p && typeof renderAdminV6 === 'function') p.innerHTML = renderAdminV6();
      toast('Action failed: ' + (err.message || 'Server error'), 'bad');
    }
  };

  // ── 3b. adminSetBadge ─────────────────────────────────────────────────
  var _setBadgeViaFn = async function(uid, badge) {
    var u = typeof getUser === 'function' ? getUser(uid) : null;
    if (!u) { toast('User not found.', 'bad'); return; }

    var prevBadge = u.badgeStatus;
    // Optimistic update
    u.badgeStatus = badge;
    u.isBanned    = badge === 'suspended';
    if (typeof saveUser === 'function') saveUser(u);
    if (u.uid === (global.ME && global.ME.uid)) global.ME = u;
    toast('Badge → "' + badge + '" for ' + u.name);

    try {
      var callFn = _callFn('adminSetBadge');
      var result = await callFn({ targetUid: uid, badge: badge });
      if (!result || !result.data || !result.data.ok) {
        throw new Error('Server rejected badge change.');
      }
    } catch (err) {
      console.error('[Bridge] adminSetBadge failed:', err);
      // Rollback
      u.badgeStatus = prevBadge;
      u.isBanned    = prevBadge === 'suspended';
      if (typeof saveUser === 'function') saveUser(u);
      if (u.uid === (global.ME && global.ME.uid)) global.ME = u;
      toast('Badge change failed: ' + (err.message || 'Server error'), 'bad');
    }
  };

  global.adminSetBadge       = _setBadgeViaFn;
  global.adminSetBadgeInline = _setBadgeViaFn;

  // ── 3c. adminVerificationDecision ────────────────────────────────────
  // Patch the approve/reject buttons wired in 21-admin.js
  global._bridgeVerifApprove = async function(svId, targetUid) {
    try {
      toast('Processing…');
      var callFn = _callFn('adminVerificationDecision');
      var result = await callFn({ svId: svId, targetUid: targetUid, approved: true });
      if (!result || !result.data || !result.data.ok) throw new Error('Server error');
      // Refresh CACHE user and re-render admin
      var freshSnap = await window.FB_FNS.getDoc(window.FB_FNS.doc(window.FB_DB, 'users', targetUid));
      if (freshSnap.exists()) {
        var updated = freshSnap.data();
        var idx = (CACHE.users || []).findIndex(function(u){ return u.uid === targetUid; });
        if (idx >= 0) CACHE.users[idx] = updated;
        else if (CACHE.users) CACHE.users.push(updated);
      }
      toast('✅ Verification approved!');
      var p = document.getElementById('page-admin');
      if (p && typeof renderAdminV6 === 'function') p.innerHTML = renderAdminV6();
    } catch (err) {
      console.error('[Bridge] adminVerificationDecision (approve) failed:', err);
      toast('Approval failed: ' + (err.message || 'Server error'), 'bad');
    }
  };

  global._bridgeVerifReject = async function(svId, targetUid, reason) {
    try {
      if (!reason || !reason.trim()) {
        toast('Please enter a rejection reason.', 'bad'); return;
      }
      toast('Processing…');
      var callFn = _callFn('adminVerificationDecision');
      var result = await callFn({ svId: svId, targetUid: targetUid, approved: false, reason: reason });
      if (!result || !result.data || !result.data.ok) throw new Error('Server error');
      toast('❌ Verification rejected.');
      var p = document.getElementById('page-admin');
      if (p && typeof renderAdminV6 === 'function') p.innerHTML = renderAdminV6();
    } catch (err) {
      console.error('[Bridge] adminVerificationDecision (reject) failed:', err);
      toast('Rejection failed: ' + (err.message || 'Server error'), 'bad');
    }
  };

  console.info('[Bridge] Admin actions → Cloud Functions ✅');
}

// ─────────────────────────────────────────────────────────────────────────
//  PATCH 4 — PAYMENT RELEASE
//  Replaces window.confirmComplete with a Cloud Function call.
//  The success modal is still rendered on the frontend for good UX.
// ─────────────────────────────────────────────────────────────────────────

function _patchPaymentRelease() {
  global.confirmComplete = async function(gid) {
    var gig = typeof getGigs === 'function'
      ? getGigs().find(function(g){ return g.id === gid; })
      : null;
    if (!gig) { toast('Gig not found.', 'bad'); return; }

    var freelancer = typeof getUser === 'function' ? getUser(gig.hiredUid) : null;
    if (!freelancer) { toast('Freelancer not found.', 'bad'); return; }

    // Disable button immediately
    var btn = document.getElementById('comp-confirm-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }

    try {
      var callFn = _callFn('releasePayment');
      var result = await callFn({ gigId: gid });

      if (!result || !result.data || !result.data.ok) {
        throw new Error('Payment release rejected by server.');
      }

      var data     = result.data;
      var payout   = data.payout   || 0;
      var fee      = data.fee      || 0;

      // ── Sync local CACHE with completed state ───────────────────────
      gig.status      = 'completed';
      gig.completedAt = Date.now();
      var cidx = (CACHE.gigs || []).findIndex(function(g){ return g.id === gig.id; });
      if (cidx >= 0) CACHE.gigs[cidx] = gig;

      // Update ME wallet (optimistic — server is authoritative)
      if (global.ME && global.ME.wallet) {
        global.ME.wallet.pending = Math.max(0, (global.ME.wallet.pending || 0) - (data.escrowAmount || 0));
        global.ME.wallet.transactions = global.ME.wallet.transactions || [];
        global.ME.wallet.transactions.unshift({
          id: 'rel_' + Date.now(), type: 'out', amount: payout,
          from: freelancer.name, desc: 'Released: ' + gig.title, ts: Date.now(),
        });
      }

      if (typeof renderWallet === 'function') renderWallet();

      // ── Success modal ────────────────────────────────────────────────
      if (typeof setModal === 'function') {
        setModal(
          '<div style="text-align:center;padding:10px 0 6px;">'
          + '<div style="font-size:52px;margin-bottom:12px;">✅</div>'
          + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;margin-bottom:6px;">Payment Released!</div>'
          + '<div style="font-size:12px;color:var(--td);margin-bottom:16px;line-height:1.7;">'
          + '<strong style="color:var(--grn);">$' + payout.toLocaleString() + '</strong>'
          + ' has been sent to ' + freelancer.name + '\'s wallet.<br>'
          + 'The gig is now marked complete.</div>'
          + '<div style="background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:12px;margin-bottom:16px;font-size:11px;">'
          + '<div style="display:flex;justify-content:space-between;padding:4px 0;">'
          + '<span style="color:var(--td);">Payout to freelancer</span>'
          + '<span style="color:var(--grn);font-weight:700;">$' + payout.toLocaleString() + '</span></div>'
          + '<div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid var(--br);">'
          + '<span style="color:var(--td);">Platform fee (10%)</span>'
          + '<span style="color:var(--td);">$' + fee.toLocaleString() + '</span></div>'
          + '</div>'
          + '<button class="btn" onclick="closeModal()" style="width:100%;">Done ✓</button>'
          + '</div>'
        );
      }

    } catch (err) {
      console.error('[Bridge] releasePayment failed:', err);
      if (btn) { btn.disabled = false; btn.textContent = 'Release Payment →'; }

      var errMsg = err.message || 'Payment failed';
      if (errMsg.includes('already')) {
        toast('Payment was already released.', 'bad');
        if (typeof closeModal === 'function') closeModal();
      } else if (errMsg.includes('delivery')) {
        toast('Freelancer has not submitted delivery yet.', 'bad');
      } else {
        toast('Payment failed: ' + errMsg, 'bad');
      }
    }
  };

  console.info('[Bridge] Payment release → Cloud Function ✅');
}

// ─────────────────────────────────────────────────────────────────────────
//  SAFE WRITE WRAPPERS
//  Exported globally for optional use in other modules.
//  These wrap fbSet/fbGet with merge:true enforcement and error guards.
// ─────────────────────────────────────────────────────────────────────────

/**
 * safeUpdate — merge partial data into a document, never overwrite.
 * Use this anywhere you want to update a subset of fields.
 */
global.safeUpdate = async function(collection, docId, data) {
  if (!collection || !docId || !data) return;
  try {
    if (!window.FB_FNS || !window.FB_DB) throw new Error('Firebase not ready');
    await window.FB_FNS.setDoc(
      window.FB_FNS.doc(window.FB_DB, collection, docId),
      data,
      { merge: true }
    );
  } catch (err) {
    console.error('[safeUpdate] Failed on ' + collection + '/' + docId, err);
    throw err;
  }
};

/**
 * safeCreate — create a document only if it does not already exist.
 * Throws if the document exists.
 */
global.safeCreate = async function(collection, docId, data) {
  if (!collection || !docId || !data) return;
  try {
    if (!window.FB_FNS || !window.FB_DB) throw new Error('Firebase not ready');
    var ref  = window.FB_FNS.doc(window.FB_DB, collection, docId);
    var snap = await window.FB_FNS.getDoc(ref);
    if (snap.exists()) throw new Error('Document already exists: ' + collection + '/' + docId);
    await window.FB_FNS.setDoc(ref, data);
  } catch (err) {
    console.error('[safeCreate] Failed on ' + collection + '/' + docId, err);
    throw err;
  }
};

/**
 * safeMerge — always-merge alias for fbSet. Drop-in replacement
 * for any fbSet call where accidental overwrite is a risk.
 */
global.safeMerge = async function(collection, docId, data) {
  return global.safeUpdate(collection, docId, data);
};

// ─────────────────────────────────────────────────────────────────────────
//  BOOT
// ─────────────────────────────────────────────────────────────────────────

// Start init after DOM is ready (firebase.js and all modules already loaded)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initBridge);
} else {
  // Already loaded — small delay to let firebase.js finish async init
  setTimeout(_initBridge, 200);
}

})(window);
