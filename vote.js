// "Name the killer" vote page (/vote): ties the custom suspect buttons to the Brevo form.
// - Picking a suspect puts its exact name in the hidden KILLER_GUESS field (one at a time).
// - Submitting with no suspect picked is blocked with "Pick a suspect first."
// - UTM_SOURCE is always wedo-game-2026 (the QR codes carry no UTM parameters).
// - Once Brevo confirms the vote, the visitor goes to the Case closed page.
(function () {
  var form = document.getElementById('sib-form');
  if (!form) return;
  var CASE_CLOSED = '/case-closed';
  var SOURCE = 'wedo-game-2026';
  var guess = form.querySelector('input[name="KILLER_GUESS"]');
  var source = form.querySelector('input[name="UTM_SOURCE"]');
  var error = document.getElementById('pick-error');
  var picks = document.querySelectorAll('input[name="suspect-pick"]');

  function picked() {
    for (var i = 0; i < picks.length; i++) if (picks[i].checked) return picks[i].value;
    return '';
  }
  for (var i = 0; i < picks.length; i++) {
    picks[i].addEventListener('change', function () {
      guess.value = picked();
      error.hidden = true;
    });
  }

  // Runs before Brevo's own handlers (capture on the document), so a vote with no suspect never goes out.
  function check(e) {
    var isSubmit = e.type === 'submit' ? e.target === form
      : e.target.closest && e.target.closest('#sib-form button[type="submit"]');
    if (!isSubmit) return;
    guess.value = picked();
    source.value = SOURCE; // also undoes anything another script wrote here
    if (guess.value) { if (e.type === 'submit') watch(); return; }
    e.preventDefault();
    e.stopImmediatePropagation();
    error.hidden = false;
    if (picks[0]) picks[0].focus();
  }
  document.addEventListener('click', check, true);
  document.addEventListener('submit', check, true);

  // Brevo shows its success message (or sends the visitor on itself); either way, end up on Case closed.
  var timer = null;
  function watch() {
    clearInterval(timer);
    var tries = 0;
    var ok = document.getElementById('success-message');
    timer = setInterval(function () {
      tries++;
      if (ok && window.getComputedStyle(ok).display !== 'none') { clearInterval(timer); location.href = CASE_CLOSED; }
      else if (tries > 100) clearInterval(timer);
    }, 200);
  }
})();
