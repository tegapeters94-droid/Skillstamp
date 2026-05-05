// Fixed wallet rendering
function renderWallet(){
  if (!ME) {
    console.warn("ME not loaded yet");
    return;
  }
  const balance = (ME && ME.balance) || 0;
  document.getElementById("wallet-balance").innerText = balance.toFixed(2);
}
