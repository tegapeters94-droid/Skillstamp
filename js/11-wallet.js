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
  // Show Pro upgrade card if user is not yet Pro
  _renderProUpgradeCard();
}

function _renderProUpgradeCard(){
  var existing=document.getElementById('pro-upgrade-card');
  if(existing) existing.remove();
  if(!ME||userIsPro(ME)) return; // already Pro — don't show
  var walletSection=document.querySelector('#page-wallet .section');
  if(!walletSection) return;
  var tier=getTierLabel(ME);
  var nextTier=userIsVerified(ME)?'🐋 Whale':'🔥 Hustler';
  var bidsNow=getBidLimit(ME);
  var bidsNext=userIsVerified(ME)?40:35;
  var card=document.createElement('div');
  card.id='pro-upgrade-card';
  card.style.cssText='margin:0 0 16px;background:linear-gradient(135deg,rgba(232,197,71,.08),rgba(232,197,71,.03));border:1px solid rgba(232,197,71,.25);border-radius:14px;padding:16px;';
  card.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
    +'<div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;color:var(--gld);">⚡ Upgrade to Pro</div>'
    +'<div style="font-size:10px;color:var(--td);margin-top:2px;">Currently '+tier+' → unlock '+nextTier+'</div>'
    +'</div>'
    +'<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:18px;color:var(--gld);">$15<span style="font-size:10px;font-weight:400;color:var(--td);">/mo</span></div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;">'
    +['0% commission on all earnings',''+bidsNext+' bids/month (was '+bidsNow+')','Priority ranking in search','Early access to new gigs'].map(function(b){
      return '<div style="font-size:10px;color:var(--td);display:flex;align-items:center;gap:5px;"><span style="color:var(--grn);">✓</span>'+b+'</div>';
    }).join('')
    +'</div>'
    +'<button onclick="openProSubscribe()" style="width:100%;padding:11px;background:var(--gld);color:#fff;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:13px;border:none;border-radius:10px;cursor:pointer;">Upgrade to Pro $15/mo →</button>';
  walletSection.insertBefore(card, walletSection.firstChild.nextSibling);
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
  var holdDays=getPayoutHoldDays(ME);
  var holdNote=holdDays===0?'<div style="background:rgba(74,222,128,.06);border:1px solid rgba(74,222,128,.2);border-radius:8px;padding:10px;font-size:11px;color:#4ade80;margin-bottom:10px;">⚡ Whale tier — Instant payouts!</div>':'';
  setModal('<button class="mclose" onclick="closeModal()">✕</button>'
    +'<h3>🏦 Withdraw Funds</h3>'
    +'<p>Withdraw to your bank account or mobile money.</p>'
    +holdNote
    +'<div class="fg"><label class="fl">Withdrawal Method</label>'
    +'<select class="fi" id="wd-method"><option>Bank Transfer (NGN)</option><option>Mobile Money (M-Pesa)</option><option>Bank Transfer (GHS)</option><option>PayPal</option><option>Wise</option></select></div>'
    +'<div class="fg"><label class="fl">Amount ($)</label>'
    +'<input class="fi" id="wd-amt" type="number" placeholder="100" min="10"></div>'
    +'<div class="fg"><label class="fl">Account Number / Phone</label>'
    +'<input class="fi" id="wd-acct" placeholder="0800 000 0000"></div>'
    +'<div style="padding:11px;background:rgba(232,197,71,.05);border:1px solid rgba(232,197,71,.18);border-radius:6px;font-size:10px;color:var(--td);margin-bottom:14px;">'
    +'\u23f1 Processing: '+(holdDays===0?'Instant':holdDays+'-day hold then 1-3 business days')+' \u00b7 Min withdrawal: $10 \u00b7 Flat fee: <strong>$2</strong>'
    +'</div>'
    +'<button class="btn" onclick="processWithdraw()">Request Withdrawal →</button>');
};

window.processWithdraw=function(){
  var FLAT_FEE=2; // $2 flat withdrawal fee per the business model
  var MIN_AMT=10;
  var amt=parseFloat(document.getElementById('wd-amt').value||0);
  if(!amt||amt<MIN_AMT){toast('Minimum withdrawal is $'+MIN_AMT+'.','bad');return;}
  var totalDeducted=amt+FLAT_FEE;
  if((ME.wallet&&ME.wallet.balance||0)<totalDeducted){toast('Insufficient balance (amount + $2 fee = $'+totalDeducted+').','bad');return;}
  if(!ME.wallet)ME.wallet={balance:0,pending:0,earned:0,transactions:[]};
  ME.wallet.balance-=totalDeducted;
  ME.wallet.transactions.unshift({id:'t'+Date.now(),type:'out',amount:totalDeducted,from:'Bank Withdrawal',desc:'Withdrawal $'+amt+' + $2 flat fee',ts:Date.now()});
  saveUser(ME);closeModal();
  var holdDays=getPayoutHoldDays(ME);
  var msg=holdDays===0
    ?'Withdrawal of $'+amt+' submitted instantly! \ud83c\udfc6'
    :'Withdrawal of $'+amt+' submitted! Funds process in '+holdDays+' days + 1-3 business days. \ud83c\udfe6';
  toast(msg);renderWallet();
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



// ══════════════════════════════════════════════
//  PRO SUBSCRIPTION — $15/month
// ══════════════════════════════════════════════
window.openProSubscribe = function() {
  var isVerif = userIsVerified(ME);
  var tierLabel = isVerif ? '🐋 Whale' : '🔥 Hustler';
  var bids = isVerif ? 40 : 35;

  setModal(
    '<button class="mclose" onclick="closeModal()">✕</button>'
    + '<div style="text-align:center;padding:8px 0 16px;">'
    + '<div style="font-size:44px;margin-bottom:8px;">' + (isVerif ? '🐋' : '🔥') + '</div>'
    + '<div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:20px;color:var(--gld);margin-bottom:4px;">Go Pro</div>'
    + '<div style="font-size:12px;color:var(--td);">Unlock ' + tierLabel + ' tier · $15/month</div>'
    + '</div>'
    + '<div style="background:var(--s2);border:1px solid var(--br);border-radius:14px;padding:14px;margin-bottom:16px;">'
    + '<div style="font-size:11px;font-weight:700;color:var(--tx);margin-bottom:10px;">Everything in your current plan, plus:</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px;">'
    + [
        { icon: '💰', label: '0% Commission', desc: 'Keep 100% of every payment you receive.' },
        { icon: '📋', label: bids + ' Bids/Month', desc: 'Submit ' + bids + ' proposals every month.' },
        { icon: '⚡', label: isVerif ? 'Instant Payouts' : 'Priority Ranking', desc: isVerif ? 'Receive payment the moment a client approves.' : 'Your profile appears higher in search results.' },
        { icon: '🎁', label: '3 Free Boosts/Month', desc: 'Highlight your profile for free each month.' },
        { icon: '⏩', label: 'Early Job Access', desc: 'See new gigs before unverified users.' },
      ].map(function(f) {
        return '<div style="display:flex;align-items:flex-start;gap:10px;">'
          + '<div style="width:28px;height:28px;border-radius:8px;background:rgba(232,197,71,.1);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">' + f.icon + '</div>'
          + '<div><div style="font-family:Plus Jakarta Sans,sans-serif;font-weight:700;font-size:12px;">' + f.label + '</div>'
          + '<div style="font-size:10px;color:var(--td);">' + f.desc + '</div></div>'
          + '</div>';
      }).join('')
    + '</div></div>'
    + '<div style="background:rgba(5,150,105,.06);border:1px solid rgba(5,150,105,.2);border-radius:10px;padding:12px;margin-bottom:16px;font-size:11px;color:var(--td);">'
    + '💡 Pro pays for itself after just <strong style="color:var(--grn);">2 completed gigs</strong> — you save the 10% commission on everything after that.'
    + '</div>'
    + '<button id="pro-subscribe-btn" style="width:100%;padding:14px;background:var(--gld);color:#fff;font-family:Plus Jakarta Sans,sans-serif;font-weight:800;font-size:14px;border:none;border-radius:12px;cursor:pointer;margin-bottom:10px;">Subscribe for $15/month →</button>'
    + '<div style="font-size:10px;color:var(--td);text-align:center;">Cancel anytime. Deducted monthly from your wallet.</div>'
  );

  setTimeout(function() {
    var btn = document.getElementById('pro-subscribe-btn');
    if (!btn) return;
    btn.onclick = async function() {
      var MONTHLY_FEE = 15;
      if (!ME.wallet || (ME.wallet.balance || 0) < MONTHLY_FEE) {
        toast('Insufficient balance. Top up $15 to subscribe.', 'bad');
        closeModal();
        openTopUp();
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Activating…';
      try {
        ME.wallet.balance = Math.max(0, (ME.wallet.balance || 0) - MONTHLY_FEE);
        ME.wallet.transactions.unshift({
          id: 'pro_' + Date.now(), type: 'out', amount: MONTHLY_FEE,
          from: 'SkillStamp', desc: 'Pro Subscription — 1 month', ts: Date.now()
        });
        ME.isPro = true;
        ME.proSince = Date.now();
        ME.proExpiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
        await saveUser(ME);
        closeModal();
        toast('🎉 Pro activated! Welcome to ' + tierLabel + ' tier.');
        if (typeof renderWallet === 'function') renderWallet();
      } catch(e) {
        btn.disabled = false;
        btn.textContent = 'Subscribe for $15/month →';
        toast('Subscription failed. Please try again.', 'bad');
      }
    };
  }, 50);
};
