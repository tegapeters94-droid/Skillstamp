// SkillStamp — Shareable Badge

// ═══════════════════════════════════════════════════════
// SHAREABLE BADGE
// ═══════════════════════════════════════════════════════
function openShareBadgeV6(){
  var endorse=CACHE.endorsements||[];
  var myEndr=0;for(var i=0;i<endorse.length;i++) if(endorse[i].toUid===ME.uid) myEndr++;
  var url='https://tegapeters94-droid.github.io/Skill-stamp/?id='+ME.skillId;
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<h3>🏅 Your SkillStamp Badge</h3>'
    +'<p style="font-size:11px;color:var(--td);">Share on LinkedIn, Twitter, or attach to your CV.</p>'
    +'<div class="badge-card">'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;margin-bottom:4px;">Skill<span style="color:var(--gld);">Stamp</span></div>'
    +'<div style="font-size:9px;color:rgba(255,255,255,.6);letter-spacing:.15em;text-transform:uppercase;margin-bottom:14px;">Verified African Talent</div>'
    +'<div style="width:68px;height:68px;border-radius:14px;background:linear-gradient(135deg,'+ME.gradient+','+ME.gradient+'88);display:flex;align-items:center;justify-content:center;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:24px;color:#000;margin:0 auto 10px;border:2px solid '+ME.gradient+';">'+initials(ME.name)+'</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:16px;color:#fff;margin-bottom:3px;">'+ME.name+'</div>'
    +'<div style="font-size:10px;color:rgba(255,255,255,.7);margin-bottom:8px;">'+(ME.title||'Digital Professional')+' · '+flag(ME.country)+' '+ME.country+'</div>'
    +badgeHTML(ME.badgeStatus)
    +'<div style="font-family:Inter,sans-serif;font-size:11px;color:var(--gld);letter-spacing:.12em;margin:10px 0;">'+ME.skillId+'</div>'
    +'<div style="display:flex;justify-content:center;gap:22px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07);">'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:#a78bfa;">'+(ME.repPoints||0)+'</div><div style="font-size:8px;color:rgba(255,255,255,.55);">REP PTS</div></div>'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:#fff;">'+myEndr+'</div><div style="font-size:8px;color:rgba(255,255,255,.55);">ENDORSED</div></div>'
    +'<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;color:#4ade80;">'+(ME.gigsCount||0)+'</div><div style="font-size:8px;color:rgba(255,255,255,.55);">GIGS</div></div>'
    +'</div></div>'
    +'<div style="font-size:9px;color:var(--td);margin-bottom:6px;">Your public profile link:</div>'
    +'<div style="background:var(--s2);border:1px solid rgba(232,197,71,.2);border-radius:6px;padding:10px;font-family:Inter,sans-serif;font-size:10px;color:var(--gld);word-break:break-all;margin-bottom:10px;">'+url+'</div>'
    +'<button class="btn" onclick="copyLinkV6()">📋 Copy Profile Link</button>'
    +'<button class="btn2" style="margin-top:8px;" onclick="closeModal();toast(\'Opening LinkedIn… paste and share! 💼\')">💼 Share to LinkedIn</button>');
}
window.openShareBadgeV6=openShareBadgeV6;

function copyLinkV6(){
  var url='https://tegapeters94-droid.github.io/Skill-stamp/?id='+ME.skillId;
  if(navigator.clipboard) navigator.clipboard.writeText(url);
  closeModal();toast('Profile link copied! 🔗');
}
window.copyLinkV6=copyLinkV6;

