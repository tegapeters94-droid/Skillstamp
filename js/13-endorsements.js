// SkillStamp — Endorsements

// ══════════════════════════════════════════════
//  ENDORSEMENTS
// ══════════════════════════════════════════════
window.openEndorse = function(uid) {
  var u = getUser(uid);
  if (!u) return;
  if (uid === ME.uid) { toast('You cannot endorse yourself.', 'bad'); return; }

  var firstName = u.name.split(' ')[0];
  var allEndorsements = getEndorsements();
  var myPrev = allEndorsements.filter(function(e) { return e.fromUid === ME.uid && e.toUid === uid; });

  // Already endorsed this person for every skill they have?
  var availableSkills = (u.skills && u.skills.length ? u.skills : ['General Skills'])
    .filter(function(s) {
      return !myPrev.find(function(e) { return e.skill === s; });
    });

  if (availableSkills.length === 0) {
    var mh = '<button class="mclose" id="endorse-close">✕</button>';
    mh += '<div style="text-align:center;padding:20px 0;">';
    mh += '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--grn)" stroke-width="1.5" style="margin-bottom:12px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    mh += '<h3 style="margin-bottom:8px;">All skills endorsed!</h3>';
    mh += '<p style="font-size:12px;color:var(--td);">You\'ve already endorsed ' + firstName + ' for all their skills.</p>';
    mh += '<button class="btn" style="margin-top:16px;width:100%;" onclick="closeModal()">Done</button>';
    mh += '</div>';
    setModal(mh);
    document.getElementById('endorse-close').onclick = closeModal;
    return;
  }

  // Count existing endorsements for each skill (from anyone)
  var skillEndorseCounts = {};
  availableSkills.forEach(function(s) {
    skillEndorseCounts[s] = allEndorsements.filter(function(e) { return e.toUid === uid && e.skill === s; }).length;
  });

  // Build skill options with existing endorse count badges
  var skillOpts = availableSkills.map(function(s) {
    var cnt = skillEndorseCounts[s];
    return '<option value="' + s + '">' + s + (cnt ? ' (' + cnt + ' endorsement' + (cnt > 1 ? 's' : '') + ')' : '') + '</option>';
  }).join('');

  // Previous endorsements summary
  var prevHtml = myPrev.length
    ? '<div style="background:rgba(232,197,71,.05);border:1px solid rgba(232,197,71,.18);border-radius:8px;padding:10px 12px;font-size:10px;color:var(--gld);margin-bottom:14px;display:flex;align-items:center;gap:8px;">'
      + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
      + 'Already endorsed for: ' + myPrev.map(function(e) { return '<strong>' + e.skill + '</strong>'; }).join(', ')
      + '</div>'
    : '';

  // Avatar
  var avHtml = u.avatar
    ? '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
    : initials(u.name);
  var grad = u.gradient || '#1a6b3c';

  var mh = '<button class="mclose" id="endorse-close">✕</button>';

  // Header with person info
  mh += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">';
  mh += '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,' + grad + ',' + grad + '88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:#000;overflow:hidden;flex-shrink:0;">' + avHtml + '</div>';
  mh += '<div>';
  mh += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--tx);margin-bottom:2px;">Endorse ' + firstName + '</div>';
  mh += '<div style="font-size:11px;color:var(--td);">' + (u.title || u.category || 'SkillStamp Freelancer') + '</div>';
  mh += '</div></div>';

  // Mutual benefit card
  mh += '<div style="background:rgba(5,150,105,.05);border:1px solid rgba(5,150,105,.15);border-radius:10px;padding:12px 14px;margin-bottom:18px;display:flex;justify-content:space-around;">';
  mh += '<div style="text-align:center;">';
  mh += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--grn);">+15</div>';
  mh += '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">' + firstName + '\'s rep</div>';
  mh += '</div>';
  mh += '<div style="width:1px;background:var(--br);"></div>';
  mh += '<div style="text-align:center;">';
  mh += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--gld);">+5</div>';
  mh += '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">Your rep</div>';
  mh += '</div>';
  mh += '<div style="width:1px;background:var(--br);"></div>';
  mh += '<div style="text-align:center;">';
  mh += '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:var(--tx);">' + allEndorsements.filter(function(e){return e.toUid===uid;}).length + '</div>';
  mh += '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">Total endorsements</div>';
  mh += '</div>';
  mh += '</div>';

  mh += prevHtml;

  // Skill selector
  mh += '<div class="fg"><label class="fl">Skill to Endorse</label><select class="fi" id="en-skill">' + skillOpts + '</select></div>';

  // Relationship context
  mh += '<div class="fg"><label class="fl">How do you know their work? <span style="font-size:9px;color:var(--td);">(optional)</span></label>';
  mh += '<select class="fi" id="en-context">';
  mh += '<option value="">— Select context —</option>';
  mh += '<option value="Worked together on a gig">Worked together on a gig</option>';
  mh += '<option value="Reviewed their portfolio">Reviewed their portfolio</option>';
  mh += '<option value="Collaborated on a project">Collaborated on a project</option>';
  mh += '<option value="Industry peer">Industry peer</option>';
  mh += '<option value="Client relationship">Client relationship</option>';
  mh += '</select></div>';

  // Feedback textarea with char counter
  mh += '<div class="fg">';
  mh += '<label class="fl">Your Feedback <span style="font-size:9px;color:var(--acc);">*required · min 20 chars</span></label>';
  mh += '<textarea class="fi" id="en-comment" rows="4" placeholder="Describe ' + firstName + '\'s skill, reliability, and the quality of their work..." style="resize:vertical;"></textarea>';
  mh += '<div id="en-char-count" style="font-size:9px;color:var(--td);margin-top:3px;">0 / 20 minimum</div>';
  mh += '</div>';

  // Star rating — interactive visual stars
  mh += '<div class="fg">';
  mh += '<label class="fl">Rating</label>';
  mh += '<div style="display:flex;gap:6px;align-items:center;margin-top:4px;" id="en-stars-row">';
  for (var i = 5; i >= 1; i--) {
    mh += '<span data-val="' + i + '" class="en-star" style="font-size:26px;cursor:pointer;color:' + (i === 5 ? '#f59e0b' : 'var(--br)') + ';transition:color .15s;line-height:1;" onclick="setEndorseRating(' + i + ')">★</span>';
  }
  mh += '<span id="en-rating-label" style="font-size:11px;color:var(--td);margin-left:6px;">Excellent</span>';
  mh += '</div>';
  mh += '<input type="hidden" id="en-stars-val" value="5">';
  mh += '</div>';

  mh += '<button class="btn" id="endorse-submit-btn" style="width:100%;margin-top:4px;">Submit Endorsement →</button>';
  setModal(mh);

  document.getElementById('endorse-close').onclick = closeModal;

  // Live char counter
  var commentEl = document.getElementById('en-comment');
  var counterEl = document.getElementById('en-char-count');
  if (commentEl && counterEl) {
    commentEl.addEventListener('input', function() {
      var len = commentEl.value.length;
      counterEl.textContent = len + ' / 20 minimum';
      counterEl.style.color = len >= 20 ? 'var(--grn)' : 'var(--td)';
    });
  }

  document.getElementById('endorse-submit-btn').onclick = function() { submitEndorse(uid); };
};

// Called from star click
window.setEndorseRating = function(val) {
  var labels = { 5:'Excellent', 4:'Very Good', 3:'Good', 2:'Fair', 1:'Poor' };
  document.getElementById('en-stars-val').value = val;
  var label = document.getElementById('en-rating-label');
  if (label) label.textContent = labels[val] || '';
  // Update star colors — left is highest (5), right is lowest (1)
  document.querySelectorAll('.en-star').forEach(function(s) {
    var sv = parseInt(s.getAttribute('data-val'));
    s.style.color = sv <= val ? '#f59e0b' : 'var(--br)';
  });
};

window.submitEndorse = async function(uid) {
  var skill = document.getElementById('en-skill').value;
  var context = document.getElementById('en-context') ? document.getElementById('en-context').value : '';
  var comment = document.getElementById('en-comment').value.trim();
  var stars = parseInt(document.getElementById('en-stars-val').value || '5');
  var u = getUser(uid);
  var firstName = u ? u.name.split(' ')[0] : 'them';

  if (comment.length < 20) { toast('Please write at least 20 characters of feedback.', 'bad'); return; }

  var btn = document.getElementById('endorse-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  var e = {
    id: 'e' + Date.now(),
    fromUid: ME.uid,
    fromName: ME.name,
    fromGrad: ME.gradient,
    fromAvatar: ME.avatar || null,
    toUid: uid,
    skill: skill,
    context: context,
    comment: comment,
    stars: stars,
    ts: Date.now()
  };

  try {
    await fbSet('endorsements', e.id, e);
    CACHE.endorsements.push(e);

    // Update target rep + score
    var target = CACHE.users.find(function(u) { return u.uid === uid; });
    if (target) {
      target.repPoints = (target.repPoints || 0) + 15;
      target.score = parseFloat(Math.min(5, (3.5 + target.repPoints / 200)).toFixed(1));
      saveUser(target);
    }
    // Update own rep
    ME.repPoints = (ME.repPoints || 0) + 5;
    saveUser(ME);

    pushNotif(uid, 'endorsed', '🤝 New Endorsement', ME.name + ' endorsed you for ' + skill + ' — ' + stars + ' stars', { type: 'endorsed', fromUid: ME.uid, skill: skill });

    // Success screen
    var mhtml = '<button class="mclose" id="endorse-done-close">✕</button>';
    mhtml += '<div style="text-align:center;padding:16px 0 8px;">';
    mhtml += '<div class="sick" style="margin:0 auto 14px;">✓</div>';
    mhtml += '<h3 style="margin-bottom:6px;">Endorsement Sent!</h3>';
    mhtml += '<p style="font-size:12px;color:var(--td);margin-bottom:20px;">You endorsed <strong>' + firstName + '</strong> for <strong>' + skill + '</strong></p>';
    mhtml += '<div style="display:flex;justify-content:space-around;background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:14px;margin-bottom:20px;">';
    mhtml += '<div style="text-align:center;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:var(--grn);">+15</div><div style="font-size:9px;color:var(--td);">Rep to ' + firstName + '</div></div>';
    mhtml += '<div style="width:1px;background:var(--br);"></div>';
    mhtml += '<div style="text-align:center;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:var(--gld);">+5</div><div style="font-size:9px;color:var(--td);">Rep to you</div></div>';
    mhtml += '</div>';
    mhtml += '<button class="btn" style="width:100%;" id="endorse-done-btn">Done</button>';
    mhtml += '</div>';
    setModal(mhtml);
    document.getElementById('endorse-done-close').onclick = closeModal;
    document.getElementById('endorse-done-btn').onclick = function() {
      closeModal();
      if (document.getElementById('page-talent').classList.contains('active')) renderTalent();
    };

  } catch(err) {
    console.error('Endorse failed', err);
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Endorsement →'; }
    toast('Failed to submit. Please try again.', 'bad');
  }
};

// Also wire endorseUser button (called from profile page)
window.endorseUser = function(btnEl) {
  var uid = btnEl.getAttribute('data-uid');
  if (uid) openEndorse(uid);
};
