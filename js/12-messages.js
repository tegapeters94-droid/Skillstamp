// SkillStamp — Messages
// Chat is accessed only via Gig Workspace. Opens as a full-screen modal.

// ═══════════════════════════════════════════════════════
//  SUPER COMMUNICATION GUARD
// ═══════════════════════════════════════════════════════

var CONTACT_PATTERNS = [
  // ── Platform keywords (word-boundary aware) ──────────────
  { re: /\btelegram\b/i,                                    label: 'Telegram' },
  { re: /\bt\.me\/[a-zA-Z0-9_]{2,}/i,                      label: 'Telegram link' },
  { re: /\bwhatsapp\b/i,                                    label: 'WhatsApp' },
  { re: /\bwa\.me\/[0-9]{6,}/i,                             label: 'WhatsApp link' },
  { re: /\bsnapchat\b|\bsnap\b/i,                           label: 'Snapchat' },
  { re: /\binstagram\b|\binsta\b|\big\b(?=\s*[:\/@])/i,     label: 'Instagram' },
  { re: /\btwitter\b|\bx\.com\b/i,                          label: 'Twitter / X' },
  { re: /\bfacebook\b|\bfb\b(?=\s*[:\/@])/i,                label: 'Facebook' },
  { re: /\btiktok\b/i,                                      label: 'TikTok' },
  { re: /\bwechat\b/i,                                      label: 'WeChat' },

  // ── "Hit me on / find me on / DM me on" + platform ──────
  { re: /(?:hit|find|reach|dm|message|text|hmu|contact)\s+(?:me\s+)?(?:on|at|via|through)\s+\w+/i, label: 'off-platform contact request' },
  { re: /(?:call\s*me|let['\u2019]?s\s*(?:call|talk|chat|speak)\s*(?:on|via|through)?)/i,           label: 'off-platform call request' },

  // ── Platform username patterns without @ ─────────────────
  // "telegram: username" / "snap: username" / "ig - username"
  { re: /(?:telegram|whatsapp|snap(?:chat)?|insta(?:gram)?|ig|twitter|fb|tiktok)\s*[:\-\/]\s*[a-zA-Z0-9._]{2,30}/i, label: 'social username' },

  // ── @handle detection ─────────────────────────────────────
  { re: /(?:^|\s)@[a-zA-Z0-9._]{2,30}(?:\s|$)/,            label: 'social handle' },

  // ── Email addresses ───────────────────────────────────────
  { re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/, label: 'email address' },

  // ── Phone: 8+ consecutive digits (with optional spaces/dashes) ──
  { re: /(?:\+?[\d][\s\-.]?){7,}\d/,                        label: 'phone number' },

  // ── Shortlink/external link patterns ─────────────────────
  { re: /(?:bit\.ly|tinyurl\.com|m\.me|fb\.me|wa\.me|t\.me|linktr\.ee)\/[a-zA-Z0-9._\-]{2,}/i, label: 'external link' },
];

// Returns { flagged: bool, label: string, masked: string }
function detectContactInfo(text) {
  for (var i = 0; i < CONTACT_PATTERNS.length; i++) {
    var p = CONTACT_PATTERNS[i];
    if (p.re.test(text)) {
      var masked = text.replace(p.re, function(m) {
        if (m.length <= 4) return '***';
        return m.slice(0, 3) + m.slice(3).replace(/[\w+@.\-]/g, '*');
      });
      return { flagged: true, label: p.label, masked: masked };
    }
  }
  return { flagged: false };
}

// ── Sender warning modal ───────────────────────────────────────
function showContactWarning(label, originalText, maskedText, onSendAnyway, onCancel) {
  var existing = document.getElementById('chat-warn-banner');
  if (existing) existing.remove();

  var banner = document.createElement('div');
  banner.id = 'chat-warn-banner';
  banner.style.cssText = 'position:absolute;bottom:66px;left:0;right:0;z-index:10;padding:14px;background:#fff7ed;border-top:2px solid #ea580c;animation:slideUp .2s ease;';
  banner.innerHTML =
    '<div style="display:flex;align-items:flex-start;gap:10px;">'
    + '<div style="font-size:20px;flex-shrink:0;">⚠️</div>'
    + '<div style="flex:1;">'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:#9a3412;margin-bottom:4px;">Off-Platform Contact Detected</div>'
    + '<div style="font-size:11px;color:#7c2d12;line-height:1.55;margin-bottom:10px;">'
    + 'Sharing a <strong>' + label + '</strong> or moving work off SkillStamp violates our '
    + '<span onclick="showTos()" style="color:#ea580c;cursor:pointer;text-decoration:underline;">Terms of Service</span> '
    + 'and <strong>voids your Escrow protection</strong>.'
    + '</div>'
    + '<div style="font-size:10px;color:#c2410c;margin-bottom:10px;font-style:italic;">Preview: "' + maskedText.slice(0, 80) + (maskedText.length > 80 ? '…' : '') + '"</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button id="warn-cancel" style="flex:1;background:#fff;border:1px solid #fed7aa;color:#374151;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;padding:8px;border-radius:8px;cursor:pointer;">Edit Message</button>'
    + '<button id="warn-send" style="flex:1;background:#fff7ed;border:1px solid #ea580c;color:#ea580c;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;padding:8px;border-radius:8px;cursor:pointer;">Send Anyway</button>'
    + '</div>'
    + '</div>'
    + '<button id="warn-close" style="background:none;border:none;color:#9ca3af;font-size:18px;cursor:pointer;flex-shrink:0;line-height:1;padding:0;">✕</button>'
    + '</div>';

  var chatContainer = document.querySelector('#mcontent > div');
  if (chatContainer) chatContainer.appendChild(banner);

  document.getElementById('warn-cancel').onclick = function() { banner.remove(); onCancel && onCancel(); };
  document.getElementById('warn-close').onclick  = function() { banner.remove(); onCancel && onCancel(); };
  document.getElementById('warn-send').onclick   = function() { banner.remove(); onSendAnyway && onSendAnyway(originalText); };
}

// ── Receiver safety alert (injected into their feed) ──────────
function _buildFlaggedBubble(msg) {
  var isMe = msg.from === (ME && ME.uid);
  return '<div style="display:flex;justify-content:' + (isMe ? 'flex-end' : 'flex-start') + ';margin-bottom:10px;">'
    + '<div style="max-width:82%;">'
    + '<div style="background:' + (isMe ? 'var(--acc)' : 'var(--s2)') + ';color:' + (isMe ? '#fff' : 'var(--fg)') + ';border-radius:' + (isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px') + ';padding:9px 13px;font-size:12px;line-height:1.5;">'
    + msg.text
    + '<div style="font-size:9px;opacity:.55;margin-top:3px;text-align:' + (isMe ? 'right' : 'left') + ';">' + timeAgo(msg.ts) + '</div>'
    + '</div>'
    + (!isMe && msg._flagged
      ? '<div style="display:flex;align-items:flex-start;gap:6px;background:#fff1f2;border:1px solid #fecdd3;border-radius:0 0 8px 8px;padding:7px 10px;margin-top:-2px;">'
        + '<span style="font-size:13px;flex-shrink:0;">🚩</span>'
        + '<div style="font-size:10px;color:#9f1239;line-height:1.4;"><strong>Safety Alert:</strong> This user is attempting to move communication off-platform. Your payments are only protected if work is kept on SkillStamp.</div>'
        + '</div>'
      : '')
    + '</div>'
    + '</div>';
}
}

// ── Helpers ────────────────────────────────────────────────
function convId(a, b) { return [a, b].sort().join('_'); }

// Auto-message sent by system (hire, payment etc) — stored in Firebase
async function sendAutoMsg(toUid, text) {
  if (!toUid || !ME || !ME.uid) return;
  var cid = convId(ME.uid, toUid);
  try {
    var conv = (await fbGet('conversations', cid)) || { participants: [ME.uid, toUid], messages: [], lastMsg: '', lastTs: 0 };
    conv.messages.push({ from: ME.uid, text: text, ts: Date.now(), read: false });
    conv.lastMsg = text;
    conv.lastTs = Date.now();
    await fbSet('conversations', cid, conv);
  } catch(e) { console.warn('sendAutoMsg failed', e); }
}

// Badge counter on bell / bottom nav
function updateUnreadBadge() {
  // Uses Firebase cache — count unread messages across all convs
  try {
    var bell = document.getElementById('ubadge');
    if (bell) bell.style.display = 'none';
  } catch(e) {}
}
window.updateUnreadBadge = updateUnreadBadge;

// ── Main chat opener — called from workspace ───────────────
window.openMsg = async function(uid) {
  if (!uid || !ME || !ME.uid) { toast('Cannot open chat.', 'bad'); return; }

  var cid = convId(ME.uid, uid);

  // Show loading modal immediately so user sees something right away
  setModal(
    '<div style="display:flex;flex-direction:column;height:100%;position:absolute;inset:0;">' +
    '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--br);flex-shrink:0;">' +
    '<button onclick="closeModal()" style="background:none;border:none;color:var(--fg);font-size:22px;cursor:pointer;line-height:1;">←</button>' +
    '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;">Loading chat…</div>' +
    '</div>' +
    '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--td);font-size:12px;">Please wait…</div>' +
    '</div>'
  );

  // Remove default modal padding so chat fills the space cleanly
  var mc = document.getElementById('mcontent');
  if (mc) {
    mc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;margin:0;padding:0;border-radius:0;border:none;overflow:hidden;z-index:1001;';
  }
  var ov = document.getElementById('moverlay');
  if (ov) ov.style.padding = '0';

  try {
    // Ensure the other user is in cache
    if (!getUser(uid)) {
      var freshUser = await fbGet('users', uid);
      if (freshUser) CACHE.users.push(freshUser);
    }
    var other = getUser(uid) || { name: 'User', gradient: '#888', title: '' };

    // Create or fetch conversation from Firebase
    var conv = await fbGet('conversations', cid);
    if (!conv) {
      conv = { participants: [ME.uid, uid], messages: [], lastMsg: '', lastTs: Date.now() };
      await fbSet('conversations', cid, conv);
    } else if (!conv.participants || !conv.participants.includes(uid)) {
      conv.participants = [ME.uid, uid];
      await fbSet('conversations', cid, conv);
    }

    // Mark incoming messages as read
    var changed = false;
    (conv.messages || []).forEach(function(m) {
      if (m.from !== ME.uid && !m.read) { m.read = true; changed = true; }
    });
    if (changed) fbSet('conversations', cid, conv);

    // Build avatar HTML
    var avHTML = other.avatar
      ? '<img src="' + other.avatar + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
      : '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,' + other.gradient + ',' + other.gradient + '88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:#000;flex-shrink:0;">' + initials(other.name) + '</div>';

    // Build messages HTML — uses flagged bubble for safety-alert messages
    function buildFeedHTML(messages) {
      if (!messages || !messages.length) {
        return '<div style="text-align:center;color:var(--td);font-size:11px;padding:30px 16px;">No messages yet.<br>Send a message to get started.</div>';
      }
      return messages.map(function(m) {
        return _buildFlaggedBubble(m);
      }).join('');
    }

    // Render the full chat UI into the modal
    var mc2 = document.getElementById('mcontent');
    if (!mc2) return;
    mc2.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;max-width:100%;max-height:100%;margin:0;padding:0;border-radius:0;border:none;overflow:hidden;z-index:1001;';
    var ov2 = document.getElementById('moverlay');
    if (ov2) ov2.style.padding = '0';
    mc2.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%;position:absolute;inset:0;">'
      // Header
      + '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--br);flex-shrink:0;background:var(--s);">'
      + '<button id="chat-back-btn" style="background:none;border:none;color:var(--fg);font-size:22px;cursor:pointer;line-height:1;padding:0 4px 0 0;">←</button>'
      + avHTML
      + '<div style="flex:1;min-width:0;">'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + other.name + '</div>'
      + '<div style="font-size:10px;color:var(--td);">' + (other.title || other.role || 'SkillStamp Member') + '</div>'
      + '</div>'
      + '</div>'
      // Feed
      + '<div id="chat-feed" style="flex:1;overflow-y:auto;padding:14px 14px;display:flex;flex-direction:column;">'
      + buildFeedHTML(conv.messages)
      + '</div>'
      // Input bar
      + '<div style="display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--br);flex-shrink:0;background:var(--s);">'
      + '<input id="chat-input" class="fi no-icon" placeholder="Type a message…" style="flex:1;margin:0;font-size:13px;padding:10px 12px;height:42px;min-height:unset;" autocomplete="off">'
      + '<button id="chat-send" class="btn" style="padding:10px 14px;flex-shrink:0;height:42px;width:auto;">Send</button>'
      + '</div>'
      + '</div>';

    // Scroll feed to bottom
    var feed = document.getElementById('chat-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;

    // Wire back button
    var backBtn = document.getElementById('chat-back-btn');
    if (backBtn) backBtn.onclick = function() { closeModal(); };

    // Wire send button
    function doSend() {
      var inp = document.getElementById('chat-input');
      if (!inp) return;
      var text = inp.value.trim();
      if (!text) return;

      var detection = detectContactInfo(text);
      if (detection.flagged) {
        inp.value = text;
        showContactWarning(
          detection.label,
          text,
          detection.masked,
          function sendAnyway(originalText) {
            inp.value = '';
            actualSend(originalText, true); // flagged=true → receiver sees alert
          },
          function cancel() { inp.focus(); }
        );
        return;
      }

      inp.value = '';
      inp.focus();
      actualSend(text, false);
    }

    function actualSend(text, isFlagged) {
      var msg = { from: ME.uid, text: text, ts: Date.now(), read: false };
      if (isFlagged) msg._flagged = true;
      // Optimistic UI — add to feed immediately
      var feed2 = document.getElementById('chat-feed');
      if (feed2) {
        var div = document.createElement('div');
        div.innerHTML = _buildFlaggedBubble(msg);
        feed2.appendChild(div.firstChild);
        feed2.scrollTop = feed2.scrollHeight;
      }
      // Save to Firebase + track response time
      fbGet('conversations', cid).then(function(latest) {
        var c = latest || { participants: [ME.uid, uid], messages: [] };

        // ── RESPONSE TIME TRACKING ──────────────────────────
        // If the most recent message before this one was FROM the other person,
        // this message is a reply — compute the gap and update ME.avgResponseMs
        var prevMsgs = c.messages || [];
        if (prevMsgs.length > 0) {
          var lastMsg = prevMsgs[prevMsgs.length - 1];
          if (lastMsg.from === uid && !lastMsg._auto) {
            // This is a genuine reply — measure response time
            var responseMs = Date.now() - lastMsg.ts;
            // Only count reasonable responses (under 7 days, over 10 seconds)
            if (responseMs > 10000 && responseMs < 604800000) {
              var currentAvg = ME.avgResponseMs || 0;
              var currentCount = ME.responseCount || 0;
              // Rolling average: new_avg = (old_avg * count + new_val) / (count + 1)
              ME.avgResponseMs = Math.round((currentAvg * currentCount + responseMs) / (currentCount + 1));
              ME.responseCount = currentCount + 1;
              // Save to Firestore in background (fire-and-forget)
              fbSet('users', ME.uid, { avgResponseMs: ME.avgResponseMs, responseCount: ME.responseCount }).catch(function(){});
              // Update CACHE
              var cachedMe = (CACHE.users||[]).find(function(u){return u.uid===ME.uid;});
              if (cachedMe) { cachedMe.avgResponseMs = ME.avgResponseMs; cachedMe.responseCount = ME.responseCount; }
            }
          }
        }
        // ───────────────────────────────────────────────────

        c.messages.push(msg);
        c.lastMsg = text;
        c.lastTs = Date.now();
        return fbSet('conversations', cid, c);
      }).then(function() {
        pushNotif(uid, 'message', '💬 New Message', ME.name + ': ' + text.slice(0, 80), { type: 'message', cid: cid, fromUid: ME.uid });
      }).catch(function(e) { console.warn('Send failed', e); toast('Failed to send. Try again.', 'bad'); });
    } // end actualSend

    var sendBtn = document.getElementById('chat-send');
    if (sendBtn) sendBtn.onclick = doSend;

    var chatInp = document.getElementById('chat-input');
    if (chatInp) chatInp.onkeydown = function(e) { if (e.key === 'Enter') doSend(); };

    // Real-time listener — updates feed as new messages arrive
    if (window._chatUnsub) { try { window._chatUnsub(); } catch(e) {} window._chatUnsub = null; }
    try {
      window._chatUnsub = window.FB_FNS.onSnapshot(
        window.FB_FNS.doc(window.FB_DB, 'conversations', cid),
        function(snap) {
          if (!snap.exists()) return;
          var data = snap.data();
          var f = document.getElementById('chat-feed');
          if (!f) { if (window._chatUnsub) { window._chatUnsub(); window._chatUnsub = null; } return; }
          var atBottom = f.scrollHeight - f.scrollTop <= f.clientHeight + 80;
          f.innerHTML = buildFeedHTML(data.messages || []);
          if (atBottom) f.scrollTop = f.scrollHeight;
        }
      );
    } catch(e) { console.warn('Chat listener error', e); }

  } catch(err) {
    console.error('openMsg failed', err);
    var mc3 = document.getElementById('mcontent');
    if (mc3) mc3.innerHTML = '<div style="padding:20px;text-align:center;"><div style="font-size:32px;margin-bottom:10px;">⚠️</div><div style="font-size:12px;color:var(--td);">Could not load chat. Check your connection and try again.</div><button class="btn" onclick="closeModal()" style="margin-top:14px;width:100%;">Close</button></div>';
  }
};

// Clean up listener when modal closes
var _origCloseModal = window.closeModal;
window.closeModal = function() {
  if (window._chatUnsub) { try { window._chatUnsub(); } catch(e) {} window._chatUnsub = null; }
  // Restore modal defaults
  var mc = document.getElementById('mcontent');
  if (mc) mc.style.cssText = '';
  var ov = document.getElementById('moverlay');
  if (ov) ov.style.padding = '';
  if (_origCloseModal) _origCloseModal();
};

// openConv — called from notification tap. Re-routes to openMsg modal.
window.openConv = function(cid) {
  if (!cid || !ME) return;
  var parts = cid.split('_');
  var otherId = parts.find(function(p) { return p !== ME.uid; });
  if (otherId) openMsg(otherId);
};

// backToInbox — called from popstate in 06-app-shell. Just close modal safely.
window.backToInbox = function() {
  if (window._chatUnsub) { try { window._chatUnsub(); } catch(e) {} window._chatUnsub = null; }
  closeModal();
};

