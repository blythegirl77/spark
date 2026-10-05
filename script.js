// Brevo signup form.
// 1. In Brevo: Contacts > Forms > create a form, then copy the form's "serve" URL
//    (https://XXXX.sibforms.com/serve/...) and paste it into the <form action="..."> in index.html.
// 2. Make sure your Brevo contact attribute names match the field names (FIRSTNAME, EMAIL).
(function () {
  var form = document.getElementById('signup-form');
  var msg = document.getElementById('form-msg');
  var btn = form.querySelector('button');

  function show(text, isError) {
    msg.hidden = false;
    msg.textContent = text;
    msg.className = 'msg' + (isError ? ' error' : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (form.action.indexOf('YOUR_BREVO_FORM_ACTION') !== -1) {
      show('Form not connected yet: add your Brevo form URL to the form action.', true);
      return;
    }
    btn.disabled = true;
    // Brevo's endpoint doesn't send CORS headers, so use no-cors (response is opaque).
    fetch(form.action, { method: 'POST', mode: 'no-cors', body: new FormData(form) })
      .then(function () {
        form.reset();
        show("You're in! Check your inbox for Day 1.", false);
      })
      .catch(function () {
        show('Something went wrong. Please try again.', true);
      })
      .finally(function () { btn.disabled = false; });
  });
})();
