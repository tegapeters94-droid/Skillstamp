/* SkillStamp - landing page behaviour (menu, tabs, smooth scroll, routing of landing buttons).
   Routing only calls the existing showLsScreen / obSelectRole. No auth logic lives here.
   Remove this file together with landing.css to go back. */
(function () {
  'use strict';
  if (window.__ssLanding) return;
  window.__ssLanding = true;
  var root = document.getElementById('lp');
  if (!root) return;

  function go(screen, role) {
    try { if (typeof window.showLsScreen === 'function') window.showLsScreen(screen); } catch (e) {}
    if (screen === 'signup' && role) { try { if (typeof window.obSelectRole === 'function') window.obSelectRole(role); } catch (e) {} }
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  window.lpGo = go;

  var burger = document.getElementById('lp-burger'), menu = document.getElementById('lp-menu'), nav = document.getElementById('lp-nav');
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
  }
  if (burger) burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });

  function setTab(name) {
    var btns = root.querySelectorAll('[data-tabbtn]'), panes = root.querySelectorAll('[data-tabpane]');
    Array.prototype.forEach.call(btns, function (b) { var on = b.getAttribute('data-tabbtn') === name; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    Array.prototype.forEach.call(panes, function (p) { if (p.getAttribute('data-tabpane') === name) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); });
  }
  var reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function scrollTo(sel) {
    var el = sel === '#lp' ? root : document.querySelector(sel);
    if (!el) return;
    var top = sel === '#lp' ? 0 : el.getBoundingClientRect().top + window.pageYOffset - 76;
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-go],[data-scroll],[data-tabbtn]') : null;
    if (!t || !root.contains(t)) return;
    if (t.hasAttribute('data-tabbtn')) { setTab(t.getAttribute('data-tabbtn')); return; }
    if (t.hasAttribute('data-go')) { e.preventDefault(); setMenu(false); go(t.getAttribute('data-go'), t.getAttribute('data-role')); return; }
    if (t.hasAttribute('data-scroll')) {
      e.preventDefault(); setMenu(false);
      if (t.hasAttribute('data-tab')) setTab(t.getAttribute('data-tab'));
      scrollTo(t.getAttribute('data-scroll'));
    }
  });

  /* nav shadow on scroll */
  function onScroll() { if (nav) nav.classList.toggle('scrolled', (window.pageYOffset || 0) > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* footer year */
  var y = document.getElementById('lp-year'); if (y) y.textContent = new Date().getFullYear();

  /* reveal on scroll (content is visible by default if IntersectionObserver is missing) */
  try {
    if ('IntersectionObserver' in window && !reduce) {
      var targets = root.querySelectorAll('.lp-sec-head,.lp-pcard,.lp-step,.lp-also>div,.lp-principles li,.lp-row,.lp-record,.lp-final-in,.lp-bul li');
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      Array.prototype.forEach.call(targets, function (el) { el.classList.add('rv'); io.observe(el); });
    }
  } catch (e) {}
})();
