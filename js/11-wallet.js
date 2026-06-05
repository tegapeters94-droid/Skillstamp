// SkillStamp — Wallet

// ══════════════════════════════════════════════
//  WALLET
// ══════════════════════════════════════════════
function renderWallet(){
  // Reload ME from Firebase to ensure wallet data is fresh
  fbGet('users', ME.uid).then(function(fresh){
    if(fresh){
      ME=fresh;
      if(!ME.wallet) ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
      // Seed test wallet if not seeded
      // wallet exists
      _doRenderWallet();
    } else {
      _doRenderWallet();
    }
  }).catch(function(){ _doRenderWallet(); });
}
function _doRenderWallet(){
  if(!ME.wallet)ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
  const w=ME.wallet;
  // Show demo notice if only welcome credit
  var demoOnly=(w.transactions||[]).every(function(t){return t.id==='t_welcome'||t.id==='t_seed';});
  var demoBanner=document.getElementById('wallet-demo-notice');
  if(!demoBanner){
    demoBanner=document.createElement('div');
    demoBanner.id='wallet-demo-notice';
    demoBanner.style.cssText='background:rgba(255,107,53,.08);border:1px solid rgba(255,107,53,.2);border-radius:8px;padding:10px 14px;font-size:11px;color:var(--acc);margin-bottom:14px;display:flex;align-items:center;gap:8px;';
    demoBanner.innerHTML='<span style="font-size:16px;">⚠️</span><span>Your current balance includes a <strong>$1,000 demo credit</strong> for testing. Only real earnings are withdrawable.</span>';
    var walletSection=document.querySelector('#page-wallet .section');
    if(walletSection) walletSection.insertBefore(demoBanner,walletSection.firstChild);
  }
  demoBanner.style.display=demoOnly?'':'none';
  document.getElementById('w-balance').textContent='$'+w.balance.toLocaleString();
  document.getElementById('w-earned').textContent='$'+w.earned.toLocaleString();
  document.getElementById('w-pending').textContent='$'+(w.pending||0).toLocaleString();
  document.getElementById('w-address').textContent=ME.skillId;
  const txList=document.getElementById('tx-list');
  if(!w.transactions||!w.transactions.length){txList.innerHTML='<div class="empty" style="padding:20px;">No transactions yet. Apply to gigs to start earning!</div>';return;}
  txList.innerHTML=w.transactions.map(tx=>`<div class="tx-row">
    <div class="tx-icon" style="background:${tx.type==='in'?'rgba(74,222,128,.12)':'rgba(255,107,53,.12)'};">${tx.type==='in'?'📥':'📤'}</div>
    <div style="flex:1;"><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:600;font-size:12px;">${tx.desc}</div><div style="font-size:10px;color:var(--td);">${tx.from||'SkillStamp'} · ${timeAgo(tx.ts)}</div></div>
    <div class="tx-amount ${tx.type==='in'?'tx-in':'tx-out'}">${tx.type==='in'?'+':'-'}$${tx.amount.toLocaleString()}</div>
  </div>`).join('');
  document.getElementById('escrow-list').innerHTML='<div style="font-size:11px;color:var(--td);padding:12px;">No active escrow contracts. Apply to gigs to create one.</div>';
}

window.openReceive=function(){
  setModal(`<button class="mclose" onclick="closeModal()">✕</button>
    <h3>📥 Receive Payment</h3>
    <p>Share your SkillID or QR code with clients to receive payments directly.</p>
    <div style="background:var(--s2);border:1px solid var(--br);border-radius:var(--r);padding:16px;text-align:center;margin-bottom:16px;">
      <div style="font-size:11px;color:var(--td);margin-bottom:6px;">Your Wallet Address</div>
      <div style="font-family:Inter,sans-serif;font-size:16px;color:var(--gld);letter-spacing:.1em;">${ME.skillId}</div>
    </div>
    <div id="receive-qr" style="display:flex;justify-content:center;margin-bottom:16px;"><div style="background:white;padding:12px;border-radius:8px;" id="rqr"></div></div>
    <button class="btn" onclick="navigator.clipboard&&navigator.clipboard.writeText('${ME.skillId}').then(()=>toast('Wallet address copied! 📋'))">Copy Wallet Address</button>`);
  setTimeout(()=>{try{new QRCode(document.getElementById('rqr'),{text:`SkillStamp:${ME.skillId}`,width:150,height:150,colorDark:'#000',colorLight:'#fff'});}catch(e){}},200);
};

window.openSend=function(){
  var users=getAllUsers().filter(function(u){return u.uid!==ME.uid;}).slice(0,20);
  var opts='';
  users.forEach(function(u){ opts+='<option value="'+u.uid+'">'+u.name+' — '+u.skillId+'</option>'; });
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<h3>📤 Send Payment</h3><p>Send funds to another SkillStamp member.</p>'
    +'<div class="fg"><label class="fl">Recipient</label>'
    +'<select class="fi" id="send-to">'+opts+'</select></div>'
    +'<div class="fg"><label class="fl">Amount ($)</label><input class="fi" id="send-amt" type="number" placeholder="500" min="1"></div>'
    +'<div class="fg"><label class="fl">Note</label><input class="fi" id="send-note" placeholder="Payment for project…"></div>'
    +'<button class="btn" onclick="processSend()">Send Payment →</button>');
};

window.processSend=function(){
  const toUid=document.getElementById('send-to').value;
  const amt=parseFloat(document.getElementById('send-amt').value||0);
  const note=document.getElementById('send-note').value||'Payment';
  if(!amt||amt<=0){toast('Enter a valid amount.','bad');return;}
  if((ME.wallet?.balance||0)<amt){toast('Insufficient balance.','bad');return;}
  const toUser=getUser(toUid);if(!toUser)return;
  if(!ME.wallet)ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
  ME.wallet.balance-=amt;
  ME.wallet.transactions.unshift({id:'t'+Date.now(),type:'out',amount:amt,from:toUser.name,desc:note,ts:Date.now()});
  saveUser(ME);
  if(!toUser.wallet)toUser.wallet={balance:0,pending:0,earned:0,transactions:[]};
  toUser.wallet.balance+=amt;
  toUser.wallet.earned=(toUser.wallet.earned||0)+amt;
  toUser.wallet.transactions.unshift({id:'t'+Date.now(),type:'in',amount:amt,from:ME.name,desc:note,ts:Date.now()});
  // Save recipient directly to Firebase so they see it immediately without refresh
  fbSet('users', toUser.uid, toUser);
  saveUser(toUser);
  closeModal();toast('Sent $'+amt+' to '+toUser.name+'! ✅');renderWallet();
};

window.openWithdraw=function(){
  setModal(`<button class="mclose" onclick="closeModal()">✕</button>
    <h3>🏦 Withdraw Funds</h3><p>Withdraw to your bank account or mobile money.</p>
    <div class="fg"><label class="fl">Withdrawal Method</label>
      <select class="fi" id="wd-method"><option>Bank Transfer (NGN)</option><option>Mobile Money (M-Pesa)</option><option>Bank Transfer (GHS)</option><option>PayPal</option><option>Wise</option></select>
    </div>
    <div class="fg"><label class="fl">Amount ($)</label><input class="fi" id="wd-amt" type="number" placeholder="${Math.floor((ME.wallet?.balance||0)*0.9)}" min="50"></div>
    <div class="fg"><label class="fl">Account Number / Phone</label><input class="fi" id="wd-acct" placeholder="0800 000 0000"></div>
    <div style="padding:11px;background:rgba(232,197,71,.05);border:1px solid rgba(232,197,71,.18);border-radius:6px;font-size:10px;color:var(--td);margin-bottom:14px;">
      ⏱ Processing time: 1-3 business days · Min withdrawal: $50 · Fee: 2.5%
    </div>
    <button class="btn" onclick="processWithdraw()">Request Withdrawal →</button>`);
};

window.processWithdraw=function(){
  const amt=parseFloat(document.getElementById('wd-amt').value||0);
  if(!amt||amt<50){toast('Minimum withdrawal is $50.','bad');return;}
  if((ME.wallet?.balance||0)<amt){toast('Insufficient balance.','bad');return;}
  if(!ME.wallet)ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
  ME.wallet.balance-=amt;
  ME.wallet.transactions.unshift({id:'t'+Date.now(),type:'out',amount:amt,from:'Bank Withdrawal',desc:'Withdrawal request',ts:Date.now()});
  saveUser(ME);closeModal();
  toast(`Withdrawal of $${amt} submitted! You'll receive funds in 1-3 days. 🏦`);renderWallet();
};

window.openTopUp=function(){
  var html='<button class="mclose" onclick="closeModal()">✕</button>';
  html+='<h3>➕ Top Up Wallet</h3>';
  html+='<p>Add funds to your SkillStamp wallet for escrow payments.</p>';
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">';
  [10,20,30,40,50].forEach(function(a){
    html+='<div style="padding:14px;background:var(--s2);border:1px solid var(--br);border-radius:var(--r);text-align:center;cursor:pointer;font-family:Plus Jakarta Sans,sans-serif;font-weight:700;" onclick="setTopUpAmt('+a+')">$'+a+'</div>';
  });
  html+='</div>';
  html+='<div class="fg"><label class="fl">Or enter custom amount</label><input class="fi" id="topup-amt" type="number" placeholder="500"></div>';
  html+='<button class="btn" onclick="processTopUp()">Add Funds →</button>';
  setModal(html);
};
window.setTopUpAmt=function(a){ var el=document.getElementById('topup-amt'); if(el) el.value=a; };

window.processTopUp=function(){
  const amt=parseFloat(document.getElementById('topup-amt').value||0);
  if(!amt||amt<=0){toast('Enter a valid amount.','bad');return;}
  if(amt>50){toast('Maximum top up is $50 per transaction.','bad');return;}
  if(!ME.wallet)ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
  ME.wallet.balance+=amt;
  ME.wallet.transactions.unshift({id:'t'+Date.now(),type:'in',amount:amt,from:'Top Up',desc:'Wallet top up',ts:Date.now()});
  saveUser(ME);closeModal();
  toast(`$${amt} added to your wallet! 💳`);renderWallet();
};

