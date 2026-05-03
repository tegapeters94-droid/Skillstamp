// SkillStamp — Settings Page

window.openSettings = function() {
  var isVerif = ME && (ME.badgeStatus === 'verified' || ME.badgeStatus === 'expert' || ME.badgeStatus === 'elite');
  var isClient = ME && (ME.role === 'employer' || ME.role === 'client');

  var html = '<div id="settings-panel" style="position:fixed;inset:0;z-index:2000;background:var(--bg);overflow-y:auto;animation:slideInRight .25s ease;">';

  // ── Header ────────────────────────────────────────────────
  html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--br);background:var(--s);position:sticky;top:0;z-index:1;">';
  html += '<button onclick="document.getElementById(\'settings-panel\').remove()" style="background:none;border:none;color:var(--fg);font-size:22px;cursor:pointer;line-height:1;padding:0 6px 0 0;">←</button>';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--tx);">Settings</div>';
  html += '</div>';

  // ── Profile summary card ──────────────────────────────────
  if (ME) {
    var av = ME.avatar
      ? '<img src="'+ME.avatar+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">'
      : '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,'+ME.gradient+','+ME.gradient+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:#000;">'+initials(ME.name)+'</div>';
    html += '<div style="margin:16px;background:var(--s);border:1px solid var(--br);border-radius:14px;padding:16px;display:flex;align-items:center;gap:13px;">';
    html += av;
    html += '<div style="flex:1;min-width:0;">';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:15px;color:var(--tx);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">'+ME.name+'</div>';
    html += '<div style="font-size:11px;color:var(--td);margin-top:2px;">'+(ME.email||'')+'</div>';
    if (isVerif) html += '<div style="margin-top:5px;display:inline-flex;align-items:center;gap:3px;background:rgba(74,222,128,.1);border:1px solid rgba(74,222,128,.25);color:#4ade80;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;">✓ Verified</div>';
    var tier = getTierLabel(ME);
    var isPro = userIsPro(ME);
    html += '<div style="margin-top:4px;display:flex;align-items:center;gap:5px;">';
    html += '<div style="display:inline-flex;align-items:center;background:rgba(232,197,71,.08);border:1px solid rgba(232,197,71,.2);color:var(--gld);font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;">' + tier + '</div>';
    if (!isPro) html += '<div onclick="document.getElementById(\'settings-panel\').remove();openProSubscribe();" style="display:inline-flex;align-items:center;background:rgba(232,197,71,.15);border:1px solid rgba(232,197,71,.4);color:var(--gld);font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;cursor:pointer;">⚡ Go Pro</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  }

  // ── Section builder helper ────────────────────────────────
  function section(title, items) {
    var s = '<div style="margin:0 16px 8px;">';
    s += '<div style="font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.08em;padding:0 4px;margin-bottom:6px;">'+title+'</div>';
    s += '<div style="background:var(--s);border:1px solid var(--br);border-radius:14px;overflow:hidden;">';
    items.forEach(function(item, i) {
      var border = i < items.length - 1 ? 'border-bottom:1px solid var(--br);' : '';
      s += '<div onclick="'+item.onclick+'" style="display:flex;align-items:center;gap:13px;padding:14px 16px;cursor:pointer;'+border+'transition:background .15s;" onmouseover="this.style.background=\'var(--s2)\'" onmouseout="this.style.background=\'\'">';
      s += '<div style="width:34px;height:34px;border-radius:10px;background:'+item.iconBg+';display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">'+item.icon+'</div>';
      s += '<div style="flex:1;min-width:0;">';
      s += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:13px;color:'+(item.danger?'#ef4444':'var(--tx)')+';">'+item.label+'</div>';
      if (item.sub) s += '<div style="font-size:10px;color:var(--td);margin-top:1px;">'+item.sub+'</div>';
      s += '</div>';
      s += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+(item.danger?'#ef4444':'var(--td)')+'" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
      s += '</div>';
    });
    s += '</div></div>';
    return s;
  }

  // ── Account section ───────────────────────────────────────
  var isPro = userIsPro(ME);
  var isBusiness = userIsBusiness(ME);
  var proItem = !isPro ? [{
    icon: '⚡', iconBg: 'rgba(232,197,71,.1)', label: 'Upgrade to Pro — $15/mo',
    sub: '0% commission · More bids · Priority ranking',
    onclick: "document.getElementById('settings-panel').remove();openProSubscribe();"
  }] : [{
    icon: '⚡', iconBg: 'rgba(232,197,71,.1)', label: 'Pro Active ✓',
    sub: getTierLabel(ME) + ' tier · Renews monthly',
    onclick: ''
  }];
  var businessItem = isClient ? [{
    icon: '🏢', iconBg: 'rgba(96,165,250,.08)', label: isBusiness ? 'Business Mode Active ✓' : 'Activate Business Mode',
    sub: isBusiness ? 'Vault Jobs · Multi-user dashboard' : 'Post Vault Jobs, verify company details',
    onclick: isBusiness ? '' : "settingsNav('businessmode')"
  }] : [];
  html += section('Account', [
    {
      icon: '✏️', iconBg: 'rgba(232,197,71,.1)', label: 'Edit Profile',
      sub: 'Update your name, bio, skills and photo',
      onclick: "settingsNav('editprofile')"
    },
    {
      icon: '🔑', iconBg: 'rgba(96,165,250,.1)', label: 'Change Password',
      sub: 'Update your account password',
      onclick: "settingsNav('changepassword')"
    },
    ...(ME && ME.avatar ? [{
      icon: '📸', iconBg: 'rgba(74,222,128,.1)', label: 'Change Profile Photo',
      sub: 'Update your profile picture',
      onclick: "settingsNav('changephoto')"
    }] : []),
    ...(!isVerif && !isClient ? [{
      icon: '🏅', iconBg: 'rgba(232,197,71,.08)', label: 'Get Skill Verified',
      sub: 'Submit your portfolio for SkillID verification',
      onclick: "settingsNav('getverified')"
    }] : []),
    ...proItem,
    ...businessItem,
  ]);

  // ── Preferences section ───────────────────────────────────
  html += '<div style="margin:12px 16px 8px;">';
  html += '<div style="font-size:10px;font-weight:700;color:var(--td);text-transform:uppercase;letter-spacing:.08em;padding:0 4px;margin-bottom:6px;">Preferences</div>';
  html += '<div style="background:var(--s);border:1px solid var(--br);border-radius:14px;overflow:hidden;">';

  // Theme toggle (interactive)
  html += '<div style="display:flex;align-items:center;gap:13px;padding:14px 16px;border-bottom:1px solid var(--br);">';
  html += '<div style="width:34px;height:34px;border-radius:10px;background:rgba(96,165,250,.1);display:flex;align-items:center;justify-content:center;font-size:17px;">🌙</div>';
  html += '<div style="flex:1;">';
  html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:13px;color:var(--tx);">Dark Mode</div>';
  html += '<div style="font-size:10px;color:var(--td);">Toggle light / dark theme</div>';
  html += '</div>';
  html += '<button onclick="toggleTheme()" style="background:var(--gld);color:#fff;border:none;border-radius:20px;padding:6px 14px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;cursor:pointer;" id="theme-toggle-btn">Switch</button>';
  html += '</div>';

  // Availability toggle (freelancers only)
  if (!isClient && ME) {
    var avail = ME.available !== false;
    html += '<div style="display:flex;align-items:center;gap:13px;padding:14px 16px;">';
    html += '<div style="width:34px;height:34px;border-radius:10px;background:'+(avail?'rgba(74,222,128,.1)':'rgba(239,68,68,.08)')+';display:flex;align-items:center;justify-content:center;font-size:17px;">'+(avail?'🟢':'🔴')+'</div>';
    html += '<div style="flex:1;">';
    html += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:13px;color:var(--tx);">Availability Status</div>';
    html += '<div style="font-size:10px;color:'+(avail?'#4ade80':'#ef4444')+';">'+(avail?'Currently available for work':'Currently busy')+'</div>';
    html += '</div>';
    html += '<button onclick="toggleAvailability();document.getElementById(\'settings-panel\').remove();" style="background:'+(avail?'rgba(239,68,68,.1)':'rgba(74,222,128,.1)')+';color:'+(avail?'#ef4444':'#4ade80')+';border:1px solid '+(avail?'rgba(239,68,68,.3)':'rgba(74,222,128,.3)')+';border-radius:20px;padding:6px 14px;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:11px;cursor:pointer;">'+(avail?'Set Busy':'Set Available')+'</button>';
    html += '</div>';
  }
  html += '</div></div>';

  // ── Support section ───────────────────────────────────────
  html += section('Support', [
    {
      icon: '🐛', iconBg: 'rgba(255,107,53,.08)', label: 'Report a Bug',
      sub: 'Tell us about an issue you found',
      onclick: "settingsNav('bugreport')"
    },
    {
      icon: '💬', iconBg: 'rgba(96,165,250,.1)', label: 'Send Feedback',
      sub: 'Share ideas or suggestions with us',
      onclick: "settingsNav('feedback')"
    },
    {
      icon: '📄', iconBg: 'rgba(232,197,71,.08)', label: 'Terms of Service',
      sub: 'Read our Terms of Service',
      onclick: "settingsNav('tos')"
    },
    {
      icon: '🔐', iconBg: 'rgba(74,222,128,.08)', label: 'Privacy Policy',
      sub: 'NDPA 2023 compliant',
      onclick: "settingsNav('privacy')"
    },
  ]);

  // ── Danger zone ───────────────────────────────────────────
  html += '<div style="margin:12px 16px 8px;">';
  html += '<div style="font-size:10px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.08em;padding:0 4px;margin-bottom:6px;">Danger Zone</div>';
  html += '<div style="background:var(--s);border:1px solid rgba(239,68,68,.2);border-radius:14px;overflow:hidden;">';

  // Sign out
  html += '<div onclick="document.getElementById(\'settings-panel\').remove();doLogout();" style="display:flex;align-items:center;gap:13px;padding:14px 16px;border-bottom:1px solid var(--br);cursor:pointer;transition:background .15s;" onmouseover="this.style.background=\'rgba(239,68,68,.04)\'" onmouseout="this.style.background=\'\'">';
  html += '<div style="width:34px;height:34px;border-radius:10px;background:rgba(239,68,68,.08);display:flex;align-items:center;justify-content:center;font-size:17px;">🚪</div>';
  html += '<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:13px;color:#ef4444;">Sign Out</div><div style="font-size:10px;color:var(--td);">Log out of your account</div></div>';
  html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
  html += '</div>';

  // Delete account
  html += '<div onclick="openDeleteAccount()" style="display:flex;align-items:center;gap:13px;padding:14px 16px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background=\'rgba(239,68,68,.04)\'" onmouseout="this.style.background=\'\'">';
  html += '<div style="width:34px;height:34px;border-radius:10px;background:rgba(239,68,68,.08);display:flex;align-items:center;justify-content:center;font-size:17px;">🗑️</div>';
  html += '<div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:13px;color:#ef4444;">Delete Account</div><div style="font-size:10px;color:var(--td);">Permanently remove your account and all data</div></div>';
  html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
  html += '</div>';
  html += '</div></div>';

  // Footer
  html += '<div style="padding:20px 16px 40px;text-align:center;">';
  html += '<div style="font-size:11px;color:var(--td);">SkillStamp · Tega Technologies</div>';
  html += '<div style="font-size:9px;color:var(--td);margin-top:3px;">NDPA 2023 Compliant · v1.0</div>';
  html += '</div>';

  html += '</div>'; // close settings-panel

  document.body.insertAdjacentHTML('beforeend', html);
};

// ── Bug report modal ──────────────────────────────────────
window.openBugReport = function() {
  setModal(
    '<button class="mclose" onclick="closeModal()">✕</button>'
    + '<h3>🐛 Report a Bug</h3>'
    + '<p>Describe what happened and what you expected. We\'ll investigate and fix it.</p>'
    + '<div class="fg"><label class="fl">Bug description <span style="color:var(--acc);">*</span></label>'
    + '<textarea class="fi" id="bug-desc" rows="4" placeholder="e.g. When I tap the Workspace button, nothing happens..." style="resize:vertical;"></textarea></div>'
    + '<div class="fg"><label class="fl">Steps to reproduce</label>'
    + '<textarea class="fi" id="bug-steps" rows="3" placeholder="1. Go to Gigs page&#10;2. Tap a gig card&#10;3. Tap Workspace..." style="resize:vertical;"></textarea></div>'
    + '<button class="btn" id="bug-submit-btn" style="width:100%;">Submit Bug Report →</button>'
  );
  document.getElementById('bug-submit-btn').onclick = async function() {
    var desc = (document.getElementById('bug-desc').value || '').trim();
    if (!desc || desc.length < 10) { toast('Please describe the bug.', 'bad'); return; }
    var btn = document.getElementById('bug-submit-btn');
    btn.disabled = true; btn.textContent = 'Sending…';
    var steps = (document.getElementById('bug-steps').value || '').trim();
    // Save bug report to Firebase
    try {
      await fbSet('bug_reports', 'bug_' + Date.now(), {
        uid: ME.uid, name: ME.name, email: ME.email || '',
        desc: desc, steps: steps, ts: Date.now(),
        platform: navigator.userAgent
      });
      closeModal();
      toast('Bug report submitted. Thank you! 🙏');
    } catch(e) {
      btn.disabled = false; btn.textContent = 'Submit Bug Report →';
      toast('Could not submit. Try again.', 'bad');
    }
  };
};

// ── Feedback modal ────────────────────────────────────────
window.openFeedbackForm = function() {
  setModal(
    '<button class="mclose" onclick="closeModal()">✕</button>'
    + '<h3>💬 Send Feedback</h3>'
    + '<p>We\'d love to hear your ideas, suggestions, or feature requests.</p>'
    + '<div class="fg"><label class="fl">Type</label>'
    + '<select class="fi" id="fb-type"><option value="suggestion">Feature Suggestion</option><option value="ux">UX Improvement</option><option value="general">General Feedback</option><option value="compliment">Compliment 🎉</option></select></div>'
    + '<div class="fg"><label class="fl">Your feedback <span style="color:var(--acc);">*</span></label>'
    + '<textarea class="fi" id="fb-text" rows="4" placeholder="Share your thoughts…" style="resize:vertical;"></textarea></div>'
    + '<button class="btn" id="fb-submit-btn" style="width:100%;">Send Feedback →</button>'
  );
  document.getElementById('fb-submit-btn').onclick = async function() {
    var text = (document.getElementById('fb-text').value || '').trim();
    if (!text || text.length < 5) { toast('Please write your feedback.', 'bad'); return; }
    var btn = document.getElementById('fb-submit-btn');
    btn.disabled = true; btn.textContent = 'Sending…';
    var type = document.getElementById('fb-type').value;
    try {
      await fbSet('feedback', 'fb_' + Date.now(), {
        uid: ME.uid, name: ME.name, type: type, text: text, ts: Date.now()
      });
      closeModal();
      toast('Feedback sent! Thanks for helping us improve. 🙏');
    } catch(e) {
      btn.disabled = false; btn.textContent = 'Send Feedback →';
      toast('Could not send. Try again.', 'bad');
    }
  };
};

// ── Delete account modal ──────────────────────────────────
window.openDeleteAccount = function() {
  setModal(
    '<button class="mclose" onclick="closeModal()">✕</button>'
    + '<div style="text-align:center;padding:8px 0 16px;">'
    + '<div style="font-size:44px;margin-bottom:10px;">🗑️</div>'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:17px;color:#ef4444;margin-bottom:6px;">Delete Account</div>'
    + '<div style="font-size:12px;color:var(--td);line-height:1.65;margin-bottom:16px;">This will <strong style="color:var(--tx);">permanently delete</strong> your SkillStamp account, profile, gig history, and all data. This action <strong style="color:#ef4444;">cannot be undone</strong>.</div>'
    + '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;margin-bottom:16px;font-size:11px;color:var(--td);text-align:left;">'
    + '⚠️ Any funds in escrow will be held and reviewed by our team before release.'
    + '</div>'
    + '</div>'
    + '<div class="fg"><label class="fl">Type <strong>DELETE</strong> to confirm</label>'
    + '<input class="fi" id="del-confirm" placeholder="DELETE" autocomplete="off" style="text-transform:uppercase;"></div>'
    + '<button class="btn" id="del-btn" style="width:100%;background:#ef4444;color:#fff;">Delete My Account →</button>'
  );
  document.getElementById('del-btn').onclick = async function() {
    var val = (document.getElementById('del-confirm').value || '').trim().toUpperCase();
    if (val !== 'DELETE') { toast('Type DELETE to confirm.', 'bad'); return; }
    var btn = document.getElementById('del-btn');
    btn.disabled = true; btn.textContent = 'Deleting…';
    try {
      // Mark account as deleted in Firestore (full deletion handled by admin/cloud)
      await fbSet('users', ME.uid, Object.assign({}, ME, { deleted: true, deletedAt: Date.now() }));
      await fbSet('deleted_accounts', ME.uid, { uid: ME.uid, name: ME.name, email: ME.email || '', deletedAt: Date.now() });
      closeModal();
      await doLogout();
      toast('Account deletion requested. Our team will process it within 30 days.');
    } catch(e) {
      btn.disabled = false; btn.textContent = 'Delete My Account →';
      toast('Could not process. Please contact support@skillstamp.africa', 'bad');
    }
  };
};


// ── Settings navigation router ────────────────────────────
// Raises modal overlay above the settings panel so it appears on top.
// When modal closes, settings panel is still there for the user.
window.settingsNav = function(action) {
  var actions = {
    'editprofile':    function() { openEditProfile(); },
    'changepassword': function() { openChangePassword(); },
    'changephoto':    function() { openChangePhoto(); },
    'getverified':    function() { openSubmitSkill(); },
    'businessmode':   function() { openBusinessModeSetup(); },
    'bugreport':      function() { openBugReport(); },
    'feedback':       function() { openFeedbackForm(); },
    'tos':            function() { showTos(); },
    'privacy':        function() { showPrivacy(); },
  };
  var fn = actions[action];
  if (!fn) return;

  // Run the action first so the modal DOM is created
  fn();

  // Then boost the overlay z-index so it sits above the settings panel (z-index:2000)
  // We use requestAnimationFrame to wait one paint cycle after the modal opens
  requestAnimationFrame(function() {
    var ov = document.getElementById('moverlay');
    if (ov) {
      ov.style.zIndex = '3000';
      // Patch closeModal so it resets the z-index when the modal is dismissed
      var _origClose = window.closeModal;
      window.closeModal = function() {
        if (ov) ov.style.zIndex = '';
        window.closeModal = _origClose; // restore original for next time
        if (_origClose) _origClose();
      };
    }
  });
};


// ══════════════════════════════════════════════
//  BUSINESS MODE SETUP
// ══════════════════════════════════════════════
window.openBusinessModeSetup = function() {
  setModal(
    '<button class="mclose" onclick="closeModal()">✕</button>'
    + '<div style="text-align:center;padding:8px 0 16px;">'
    + '<div style="font-size:44px;margin-bottom:8px;">🏢</div>'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;margin-bottom:4px;">Activate Business Mode</div>'
    + '<div style="font-size:12px;color:var(--td);">For companies, startups, and agencies</div>'
    + '</div>'
    + '<div style="background:var(--s2);border:1px solid var(--br);border-radius:14px;padding:14px;margin-bottom:16px;">'
    + '<div style="font-size:11px;font-weight:700;color:var(--tx);margin-bottom:10px;">Business Mode unlocks:</div>'
    + ['🔒 Vetted Vault — post gigs only verified talent can see','📋 Company posting dashboard','💼 Priority matching with Elite & Whale freelancers','👥 Multi-member team hiring'].map(function(f){
        return '<div style="font-size:11px;color:var(--td);padding:4px 0;display:flex;align-items:center;gap:6px;"><span style="color:var(--grn);">✓</span>'+f+'</div>';
      }).join('')
    + '</div>'
    + '<div class="fg"><label class="fl">Company / Business Name <span style="color:var(--acc);">*</span></label>'
    + '<input class="fi" id="biz-name" placeholder="Acme Corp Ltd." autocomplete="off"></div>'
    + '<div class="fg"><label class="fl">CAC Registration Number / Business ID</label>'
    + '<input class="fi" id="biz-cac" placeholder="RC-1234567" autocomplete="off"></div>'
    + '<div class="fg"><label class="fl">Corporate Website</label>'
    + '<input class="fi" id="biz-website" placeholder="https://yourcompany.com" type="url"></div>'
    + '<div class="fg"><label class="fl">Corporate Email</label>'
    + '<input class="fi" id="biz-email" placeholder="hiring@yourcompany.com" type="email"></div>'
    + '<button class="btn" id="biz-submit-btn" style="width:100%;">Submit for Verification →</button>'
    + '<div style="font-size:10px;color:var(--td);text-align:center;margin-top:8px;">Our team will verify your details within 24 hours.</div>'
  );
  setTimeout(function() {
    var btn = document.getElementById('biz-submit-btn');
    if (!btn) return;
    btn.onclick = async function() {
      var bizName = (document.getElementById('biz-name').value || '').trim();
      var cac = (document.getElementById('biz-cac').value || '').trim();
      var website = (document.getElementById('biz-website').value || '').trim();
      var email = (document.getElementById('biz-email').value || '').trim();
      if (!bizName) { toast('Please enter your company name.', 'bad'); return; }
      btn.disabled = true; btn.textContent = 'Submitting…';
      try {
        await fbSet('business_verifications', ME.uid, {
          uid: ME.uid, name: ME.name, email: ME.email || '',
          bizName: bizName, cac: cac, website: website, bizEmail: email,
          status: 'pending', submittedAt: Date.now()
        });
        // Provisionally activate business mode (admin can revoke if docs invalid)
        ME.isBusiness = true;
        ME.bizName = bizName;
        await saveUser(ME);
        closeModal();
        toast('✓ Business Mode activated! Vault Jobs are now available.');
      } catch(e) {
        btn.disabled = false; btn.textContent = 'Submit for Verification →';
        toast('Could not submit. Try again.', 'bad');
      }
    };
  }, 50);
};
