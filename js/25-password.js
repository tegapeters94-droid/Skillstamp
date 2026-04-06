// SkillStamp — Password Change

// ═══════════════════════════════════════════════════════
//  PASSWORD CHANGE (via Firebase password reset email)
// ═══════════════════════════════════════════════════════
window.openChangePassword=function(){
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<div style="text-align:center;padding:8px 0 14px;">'
    +'<div style="font-size:40px;margin-bottom:10px;">🔑</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:16px;margin-bottom:4px;">Change Password</div>'
    +'<div style="font-size:11px;color:var(--td);margin-bottom:18px;">A secure password reset link will be sent to your registered email address.</div>'
    +'</div>'
    +'<div style="background:var(--s2);border:1px solid var(--br);border-radius:8px;padding:12px;margin-bottom:16px;">'
    +'<div style="font-size:10px;font-weight:700;color:var(--td);margin-bottom:3px;">RESET LINK WILL BE SENT TO</div>'
    +'<div style="font-size:13px;color:var(--gld);font-weight:600;">'+(ME?ME.email:'—')+'</div>'
    +'</div>'
    +'<button class="btn" id="cpw-send-btn" style="width:100%;margin-bottom:10px;">Send Password Reset Link →</button>'
    +'<div style="font-size:10px;color:var(--td);text-align:center;line-height:1.6;">Check your inbox (and spam folder) for the reset link. The link expires after 1 hour.</div>'
    +'<div id="cpw-msg" style="margin-top:12px;font-size:12px;text-align:center;"></div>');
  setTimeout(function(){
    var btn=document.getElementById('cpw-send-btn');
    if(btn) btn.onclick=async function(){
      btn.disabled=true;btn.textContent='Sending…';
      try {
        await window.FB_FNS.sendPasswordResetEmail(window.FB_AUTH,ME.email);
        var msgEl=document.getElementById('cpw-msg');
        if(msgEl) msgEl.innerHTML='<span style="color:var(--grn);">✓ Reset link sent! Check your email inbox.</span>';
        btn.textContent='Link Sent ✓';
      } catch(e){
        var msgEl=document.getElementById('cpw-msg');
        if(msgEl) msgEl.innerHTML='<span style="color:var(--acc);">Error: '+e.message+'</span>';
        btn.disabled=false;btn.textContent='Try Again';
      }
    };
  },60);
};

