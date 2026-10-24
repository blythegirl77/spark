// Hero button: scrolls to the sign-up form and puts the cursor in the first field.
// (The "cta" class is added on click by a small script in <head>, before Tag Manager loads.)
(function () {
  var btn = document.getElementById('hero-cta');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var target = document.getElementById('signup');
    if (!target) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // On the ad pages the Buzzword Swipe tool comes before the form: go to the tool's current step instead
    var tool = document.getElementById('buzzword-swipe');
    var first = document.getElementById('FIRSTNAME');
    if (tool && first && !first.offsetParent) {
      tool.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, reduce ? 0 : 500);
  });
})();
