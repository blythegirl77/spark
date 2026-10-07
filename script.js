// Brevo signup form (double opt-in).
// The form posts to the Brevo form URL in <form action="..."> in index.html.
// Field names must match your Brevo contact attributes (FIRSTNAME, EMAIL).
//
// With double opt-in, Brevo emails the person a confirmation link first; they only join the list
// (and get the welcome email with the profile link) after clicking it. So the success message
// asks them to confirm.
(function () {
  var form = document.getElementById('signup-form');
  var msg = document.getElementById('form-msg');
  var btn = form.querySelector('button');

  var CONFIRM_TEXT = "Almost there! Check your inbox for an email from us and click the confirmation link to start.";

  function show(text, isError) {
    msg.hidden = false;
    msg.textContent = text;
    msg.className = 'msg' + (isError ? ' error' : '');
  }

  // Brevo answers with JSON such as {"success":true} or {"success":false,"errors":{"EMAIL":"..."}}.
  function errorText(data) {
    if (data && data.errors && typeof data.errors === 'object') {
      var parts = Object.keys(data.errors).map(function (k) { return data.errors[k]; });
      if (parts.length) return parts.join(' ');
    }
    if (data && typeof data.message === 'string' && data.message) return data.message;
    return 'Sorry, we could not sign you up. Please check your details and try again.';
  }

  function done() {
    form.reset();
    show(CONFIRM_TEXT, false);
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
    var body = new FormData(form);
    var url = form.action + (form.action.indexOf('?') === -1 ? '?' : '&') + 'isAjax=1';

    // First try a normal request so we can read Brevo's real answer (including errors).
    fetch(url, { method: 'POST', body: body, headers: { Accept: 'application/json' } })
      .then(function (res) {
        return res.text().then(function (text) {
          var data = null;
          try { data = JSON.parse(text); } catch (err) { /* not JSON */ }
          console.log('Brevo response', res.status, data || text.slice(0, 300));
          if (data && data.success === false) { show(errorText(data), true); return; }
          if (!res.ok && !(data && data.success)) { show(errorText(data), true); return; }
          done();
        });
      })
      .catch(function (err) {
        // The browser blocked reading the response (cross-site rules). Send it the older way;
        // we can't see Brevo's answer in that case, so the message just asks them to check email.
        console.warn('Falling back to no-cors submit', err);
        return fetch(form.action, { method: 'POST', mode: 'no-cors', body: new FormData(form) })
          .then(done)
          .catch(function () { show('Something went wrong. Please try again.', true); });
      })
      .finally(function () { btn.disabled = false; });
  });
})();
