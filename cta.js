// Hero button: scrolls to the sign-up form and puts the cursor in the first field
// (on the ad pages: scrolls to the Buzzword Swipe card).
// (The "cta" class is added on click by a small script in <head>, before Tag Manager loads.)
(function () {
  var btn = document.getElementById('hero-cta');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var target = document.getElementById('signup');
    if (!target) return;
    var first = document.getElementById('FIRSTNAME');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // On the ad pages the header button goes to the Buzzword Swipe card instead
    var tool = document.getElementById('buzzword-swipe');
    if (tool && tool.querySelector('.bz-stage *')) {
      tool.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduce ? 0 : 500);
  });
})();

// "Start Day 1" buttons: jump to the sign-up form at the bottom and put the cursor in its first field.
(function () {
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('[data-jump-form]');
    if (!link) return;
    var target = document.getElementById('signup');
    if (!target) return;
    e.preventDefault();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var first = target.querySelector('input[type="text"]:not(.input--hidden)');
    if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (err) {} }, reduce ? 0 : 500);
  });
})();
