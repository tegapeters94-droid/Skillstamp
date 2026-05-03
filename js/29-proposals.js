// SkillStamp — Proposal Hub
// Freelancer: "Proposals Received" tab  |  Client: "Proposals Sent" tab
// Direct-hire proposals are stored in Firestore collection: "proposals"

// ═══════════════════════════════════════════════════════
//  RENDER — routes by role
// ═══════════════════════════════════════════════════════
window.renderProposalHub = async function() {
  var page = document.getElementById('page-gigs');
  if (!page || !ME) return;

  var content = document.getElementById('gig-content-area');
  if (!content) {
    content = document.createElement('div');
    content.id = 'gig-content-area';
    page.appendChild(content);
  }

  content.innerHTML = '<div style="padding:24px 16px;text-align:center;color:var(--td);font-size:12px;">Loading proposals…</div>';

  try {
    var all = await fbGetAll('proposals');
    var isClient = ME.role === 'employer' || ME.role === 'client';
    if (isClient) {
      // Update client badge
      var sentPending = all.filter(function(p){ return p.fromUid===ME.uid && p.status==='pending'; }).length;
      var cpc = document.getElementById('client-proposals-count');
      if (cpc) { cpc.textContent = sentPending; cpc.style.display = sentPending ? '' : 'none'; }
      _renderSentProposals(content, all.filter(function(p) { return p.fromUid === ME.uid; }));
    } else {
      // Update freelancer badge
      var recvPending = all.filter(function(p){ return p.toUid===ME.uid && p.status==='pending'; }).length;
      var pc = document.getElementById('proposals-count');
      if (pc) { pc.textContent = recvPending; pc.style.display = recvPending ? '' : 'none'; }
      _renderReceivedProposals(content, all.filter(function(p) { return p.toUid === ME.uid; }));
    }
  } catch(e) {
    content.innerHTML = '<div style="padding:24px;text-align:center;color:var(--td);font-size:12px;">Could not load proposals. Check your connection.</div>';
  }
};

// ═══════════════════════════════════════════════════════
//  FREELANCER VIEW — Proposals Received
// ═══════════════════════════════════════════════════════
function _renderReceivedProposals(el, proposals) {
  if (!proposals.length) {
    el.innerHTML =
      '<div style="padding:48px 20px;text-align:center;">'
      + '<div style="font-size:40px;margin-bottom:12px;opacity:.3;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><polyline points="22 6 12 13 2 6"/><path d="M19 16v6M16 19h6"/></svg></div>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:14px;margin-bottom:6px;color:var(--tx);">No proposals yet</div>'
      + '<div style="font-size:12px;color:var(--td);">When clients send you direct hire proposals, they\'ll appear here.</div>'
      + '</div>';
    return;
  }

  var sorted = proposals.slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
  var statusCfg = {
    pending:  { label:'Pending',   bg:'rgba(232,197,71,.1)', border:'rgba(232,197,71,.3)', color:'var(--gld)', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>' },
    accepted: { label:'Accepted',  bg:'rgba(74,222,128,.1)', border:'rgba(74,222,128,.3)', color:'var(--grn)', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' },
    rejected: { label:'Declined',  bg:'rgba(239,68,68,.06)', border:'rgba(239,68,68,.2)',  color:'#ef4444',    icon:'✗'  },
    contract: { label:'Contract',  bg:'rgba(77,159,255,.1)', border:'rgba(77,159,255,.3)', color:'#4d9fff',    icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>' }
  };

  el.innerHTML = '<div style="padding:16px 12px 4px;">'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;margin-bottom:14px;color:var(--tx);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><polyline points="22 6 12 13 2 6"/><path d="M19 16v6M16 19h6"/></svg> Proposals Received</div>'
    + sorted.map(function(p) {
        var client = getUser(p.fromUid) || { name: 'Client', gradient: '#888' };
        var cfg = statusCfg[p.status] || statusCfg.pending;
        return '<div style="background:var(--s);border:1px solid var(--br);border-radius:14px;margin-bottom:12px;overflow:hidden;" id="prop-card-' + p.id + '">'
          // Header
          + '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--br);">'
          + avHTML(client, 36)
          + '<div style="flex:1;min-width:0;">'
          + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + p.title + '</div>'
          + '<div style="font-size:10px;color:var(--td);">' + client.name + ' · ' + timeAgo(p.ts) + '</div>'
          + '</div>'
          + '<span style="background:' + cfg.bg + ';border:1px solid ' + cfg.border + ';color:' + cfg.color + ';font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;">'
          + cfg.icon + ' ' + cfg.label + '</span>'
          + '</div>'
          // Body
          + '<div style="padding:12px 14px;">'
          + '<div style="display:flex;gap:8px;margin-bottom:10px;">'
          + '<div style="background:var(--s2);border-radius:8px;padding:8px 12px;flex:1;text-align:center;">'
          + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:var(--grn);">$' + (p.budget||0).toLocaleString() + '</div>'
          + '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">Budget</div>'
          + '</div>'
          + '<div style="background:var(--s2);border-radius:8px;padding:8px 12px;flex:1;text-align:center;">'
          + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;">'+p.timeline+'</div>'
          + '<div style="font-size:9px;color:var(--td);text-transform:uppercase;letter-spacing:.05em;">Timeline</div>'
          + '</div>'
          + '</div>'
          + '<div style="font-size:12px;color:var(--td);line-height:1.65;margin-bottom:12px;">' + (p.description||'').slice(0,200) + (p.description&&p.description.length>200?'…':'') + '</div>'
          // Actions — only for pending
          + (p.status === 'pending'
            ? '<div style="display:flex;gap:8px;">'
              + '<button onclick="acceptProposal(\'' + p.id + '\')" style="flex:1;padding:11px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;border:none;border-radius:10px;cursor:pointer;">✓ Accept Proposal</button>'
              + '<button onclick="rejectProposal(\'' + p.id + '\')" style="padding:11px 16px;background:var(--s2);border:1px solid var(--br);color:var(--td);font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:12px;border-radius:10px;cursor:pointer;">Decline</button>'
              + '</div>'
            : p.status === 'accepted'
            ? '<div style="font-size:11px;color:var(--grn);font-weight:600;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Contract created — check your Active Gigs.</div>'
            : '')
          + '</div>'
          + '</div>';
      }).join('')
    + '</div>';
}

// ═══════════════════════════════════════════════════════
//  CLIENT VIEW — Proposals Sent
// ═══════════════════════════════════════════════════════
function _renderSentProposals(el, proposals) {
  // Count this month
  var now = Date.now();
  var monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  var thisMonth = proposals.filter(function(p){ return p.ts >= monthStart.getTime(); }).length;
  var remaining = Math.max(0, 2 - thisMonth);

  if (!proposals.length) {
    el.innerHTML =
      '<div style="padding:48px 20px;text-align:center;">'
      + '<div style="font-size:40px;margin-bottom:12px;opacity:.3;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>'
      + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:14px;margin-bottom:6px;color:var(--tx);">No proposals sent</div>'
      + '<div style="font-size:12px;color:var(--td);margin-bottom:16px;">Browse talent and hire directly from their profiles.</div>'
      + '<div style="background:var(--s2);border:1px solid var(--br);border-radius:10px;padding:12px;font-size:11px;color:var(--td);">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Monthly limit: <strong style="color:var(--tx);">' + thisMonth + '/2</strong> proposals sent · <strong style="color:var(--grn);">' + remaining + ' remaining</strong>'
      + '</div>'
      + '</div>';
    return;
  }

  var sorted = proposals.slice().sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
  var statusCfg = {
    pending:  { label:'Awaiting Response', color:'var(--gld)', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/></svg>', bar:'rgba(232,197,71,.15)' },
    accepted: { label:'Accepted ✓',        color:'var(--grn)', icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>', bar:'rgba(74,222,128,.15)' },
    rejected: { label:'Declined',          color:'#ef4444',    icon:'✗',  bar:'rgba(239,68,68,.1)'  },
    contract: { label:'Contract Active',   color:'#4d9fff',    icon:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>', bar:'rgba(77,159,255,.1)' }
  };

  el.innerHTML = '<div style="padding:16px 12px 4px;">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;color:var(--tx);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Proposals Sent</div>'
    + '<div style="background:var(--s2);border:1px solid var(--br);border-radius:20px;padding:4px 10px;font-size:10px;color:var(--td);">'
    + thisMonth + '/2 this month'
    + (remaining===0 ? ' <span style="color:#ef4444;">· Limit reached</span>' : ' <span style="color:var(--grn);">· '+remaining+' left</span>')
    + '</div>'
    + '</div>'
    + sorted.map(function(p) {
        var freelancer = getUser(p.toUid) || { name: 'Freelancer', gradient: '#888' };
        var cfg = statusCfg[p.status] || statusCfg.pending;
        return '<div style="background:var(--s);border:1px solid var(--br);border-radius:14px;margin-bottom:12px;overflow:hidden;">'
          + '<div style="background:' + cfg.bar + ';padding:4px 14px;font-size:10px;font-weight:700;color:' + cfg.color + ';">'
          + cfg.icon + ' ' + cfg.label
          + '</div>'
          + '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;">'
          + avHTML(freelancer, 36)
          + '<div style="flex:1;min-width:0;">'
          + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:13px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">' + p.title + '</div>'
          + '<div style="font-size:10px;color:var(--td);">To: ' + freelancer.name + ' · ' + timeAgo(p.ts) + '</div>'
          + '</div>'
          + '<div style="text-align:right;flex-shrink:0;">'
          + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:var(--grn);">$' + (p.budget||0).toLocaleString() + '</div>'
          + '<div style="font-size:9px;color:var(--td);">' + p.timeline + '</div>'
          + '</div>'
          + '</div>'
          + '</div>';
      }).join('')
    + '</div>';
}

// ═══════════════════════════════════════════════════════
//  SEND PROPOSAL — called from openDirectProposal submit
//  Includes 2/month client-side rate check + Firestore write
// ═══════════════════════════════════════════════════════
window.sendDirectProposalToHub = async function(toUid, title, description, budget, timeline, referenceImages) {
  if (!ME || !toUid) return { ok: false, error: 'Not logged in.' };

  var isClient = ME.role === 'employer' || ME.role === 'client';

  // ── 2/month limit for clients ─────────────────────────
  if (isClient) {
    var monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    try {
      var existing = await fbGetAll('proposals');
      var sentThisMonth = existing.filter(function(p) {
        return p.fromUid === ME.uid && p.ts >= monthStart.getTime();
      }).length;
      if (sentThisMonth >= 2) {
        return { ok: false, error: 'You have reached your 2 direct proposals per month limit. This resets on the 1st.' };
      }
    } catch(e) { /* allow through if check fails */ }
  }

  var proposal = {
    id:          'prop_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    fromUid:     ME.uid,
    fromName:    ME.name,
    toUid:       toUid,
    title:       title,
    description: description,
    budget:      budget,
    timeline:    timeline,
    images:      referenceImages || [],
    status:      'pending',
    ts:          Date.now()
  };

  try {
    await fbSet('proposals', proposal.id, proposal);
  } catch(e) {
    return { ok: false, error: 'Could not save proposal. Check your connection.' };
  }

  // Notify freelancer
  await pushNotif(
    toUid, 'proposal',
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg> New Direct Proposal',
    ME.name + ' sent you a proposal: ' + title + ' — $' + budget,
    { type: 'proposal', proposalId: proposal.id, fromUid: ME.uid }
  );
  await sendAutoMsg(
    toUid,
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg> Direct Proposal from ' + ME.name + '\n\nProject: ' + title + '\nBudget: $' + budget + '\nTimeline: ' + timeline + '\n\nGo to Gigs → Proposals tab to review and accept.'
  );

  return { ok: true, proposal: proposal };
};

// ═══════════════════════════════════════════════════════
//  ACCEPT PROPOSAL — creates a gig contract
// ═══════════════════════════════════════════════════════
window.acceptProposal = async function(proposalId) {
  var btn = document.querySelector('#prop-card-' + proposalId + ' button');
  if (btn) { btn.textContent = 'Accepting…'; btn.disabled = true; }

  try {
    var p = await fbGet('proposals', proposalId);
    if (!p) { toast('Proposal not found.', 'bad'); return; }
    if (p.status !== 'pending') { toast('Proposal already ' + p.status + '.', 'bad'); return; }

    // Create gig contract
    var gig = {
      id:            'g' + Date.now(),
      title:         p.title,
      description:   p.description,
      pay:           p.budget,
      escrowAmount:  p.budget,
      category:      ME.category || 'Web & Mobile Dev',
      posterUid:     p.fromUid,
      posterName:    p.fromName,
      applicants:    [ME.uid],
      hiredUid:      ME.uid,
      status:        'hired',
      created:       Date.now(),
      deadline:      p.timeline,
      directHire:    true,
      proposalId:    proposalId,
      referenceImages: p.images || []
    };
    await fbSet('gigs', gig.id, gig);
    CACHE.gigs.unshift(gig);

    // Update proposal status
    p.status = 'accepted';
    p.gigId  = gig.id;
    await fbSet('proposals', proposalId, p);

    // Update ME applications
    if (!ME.applications) ME.applications = [];
    ME.applications.push({ gigId: gig.id, gigTitle: p.title, status: 'accepted', ts: Date.now() });
    await saveUser(ME);

    // Notify client
    await pushNotif(
      p.fromUid, 'proposal_accepted',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Proposal Accepted!',
      ME.name + ' accepted your proposal: ' + p.title,
      { type: 'proposal_accepted', gigId: gig.id, proposalId: proposalId }
    );
    await sendAutoMsg(p.fromUid, '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> ' + ME.name + ' accepted your proposal for "' + p.title + '"! The contract is now active. Open the Gig Workspace to begin.');

    toast('Proposal accepted! Contract created. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>');
    renderProposalHub();

  } catch(err) {
    console.error('acceptProposal failed', err);
    toast('Something went wrong. Try again.', 'bad');
  }
};

// ═══════════════════════════════════════════════════════
//  REJECT PROPOSAL
// ═══════════════════════════════════════════════════════
window.rejectProposal = async function(proposalId) {
  try {
    var p = await fbGet('proposals', proposalId);
    if (!p || p.status !== 'pending') return;
    p.status = 'rejected';
    await fbSet('proposals', proposalId, p);

    await pushNotif(
      p.fromUid, 'proposal_rejected',
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg> Proposal Declined',
      ME.name + ' declined your proposal: ' + p.title,
      { type: 'proposal_rejected', proposalId: proposalId }
    );
    toast('Proposal declined.');
    renderProposalHub();
  } catch(e) {
    toast('Could not update proposal.', 'bad');
  }
};
