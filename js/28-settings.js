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
    html += '</div>';
    html += '<button onclick="document.getElementById(\'settings-panel\').remove();showPage(\'myprofile\')" style="background:none;border:1px solid var(--br);border-radius:8px;padding:6px 12px;font-size:11px;font-weight:600;color:var(--gld);cursor:pointer;font-family:Plus Jakarta Sans,sans-serif;white-space:nowrap;">Edit Profile</button>';
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
  html += section('Account', [
    {
      icon: '✏️', iconBg: 'rgba(232,197,71,.1)', label: 'Edit Profile',
      sub: 'Update your name, bio, skills and photo',
      onclick: "document.getElementById('settings-panel').remove();showPage('myprofile');setTimeout(function(){var b=document.getElementById('edit-profile-btn');if(b)b.click();},400);"
    },
    {
      icon: '🔑', iconBg: 'rgba(96,165,250,.1)', label: 'Change Password',
      sub: 'Update your account password',
      onclick: "document.getElementById('settings-panel').remove();openChangePassword();"
    },
    ...(ME && ME.avatar ? [{
      icon: '📸', iconBg: 'rgba(74,222,128,.1)', label: 'Change Profile Photo',
      sub: 'Update your profile picture',
      onclick: "document.getElementById('settings-panel').remove();openChangePhoto();"
    }] : []),
    ...(!isVerif && !isClient ? [{
      icon: '⚡', iconBg: 'rgba(232,197,71,.08)', label: 'Get Skill Verified',
      sub: 'Submit your portfolio for SkillID verification',
      onclick: "document.getElementById('settings-panel').remove();openSubmitSkill();"
    }] : []),
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
      onclick: "document.getElementById('settings-panel').remove();openBugReport();"
    },
    {
      icon: '💬', iconBg: 'rgba(96,165,250,.1)', label: 'Send Feedback',
      sub: 'Share ideas or suggestions with us',
      onclick: "document.getElementById('settings-panel').remove();openFeedbackForm();"
    },
    {
      icon: '📄', iconBg: 'rgba(232,197,71,.08)', label: 'Terms of Service',
      sub: 'Read our Terms of Service',
      onclick: "document.getElementById('settings-panel').remove();showTos();"
    },
    {
      icon: '🔐', iconBg: 'rgba(74,222,128,.08)', label: 'Privacy Policy',
      sub: 'NDPA 2023 compliant',
      onclick: "document.getElementById('settings-panel').remove();showPrivacy();"
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

