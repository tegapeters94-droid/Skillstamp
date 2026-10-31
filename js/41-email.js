/* Welcome email hook. Calls the SkillStamp email service once for a brand-new account.
   Does not touch auth or data logic; fails silently. */
(function () {
  var API = 'https://skillstamp-email.YOUR-SUBDOMAIN.workers.dev';
  if (!API || API.indexOf('YOUR-SUBDOMAIN') > -1) return;
  var tries = 0;
  function key(uid) { return 'ss_welcome_' + uid; }
  function check() {
    tries++;
    if (tries > 600) return clearInterval(t);
    try {
      var me = window.ME, u = window.FB_AUTH && window.FB_AUTH.currentUser;
      if (!me || !me.uid || !u || u.uid !== me.uid) return;
      var created = Number(me.created) || 0;
      if (!created || Date.now() - created > 15 * 60 * 1000) return clearInterval(t);
      if (localStorage.getItem(key(me.uid))) return clearInterval(t);
      clearInterval(t);
      localStorage.setItem(key(me.uid), '1');
      u.getIdToken().then(function (tok) {
        return fetch(API + '/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
          body: JSON.stringify({ name: me.name || '', role: me.role || '' })
        });
      }).catch(function () { try { localStorage.removeItem(key(me.uid)); } catch (e) {} });
    } catch (e) {}
  }
  var t = setInterval(check, 3000);
})();
