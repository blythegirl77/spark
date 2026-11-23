// /challenge-b sign-up form: keep Brevo submissions within field limits, and remember Brevo's
// answer so a failure can be reported with its reason (form_error, sent by buzzword.js).
// Loaded before Brevo's own script, so it sees the request Brevo's script makes.
(function () {
  var MAX = 200;           // Brevo text attributes hold up to 200 characters
  var BODY_MAX = 300;      // how much of Brevo's reply goes into the form_error detail

  function isBrevo(url) { return /sibforms\.com\//.test(String(url || '')); }

  // Cut every value in the outgoing form data to MAX characters (USER_AGENT can be 300+ in in-app browsers).
  function trimBody(body) {
    try {
      if (window.FormData && body instanceof FormData) {
        var out = new FormData();
        body.forEach(function (v, k) { out.append(k, typeof v === 'string' ? v.slice(0, MAX) : v); });
        return out;
      }
      if (window.URLSearchParams && body instanceof URLSearchParams) {
        var p = new URLSearchParams();
        body.forEach(function (v, k) { p.append(k, String(v).slice(0, MAX)); });
        return p;
      }
      if (typeof body === 'string' && body.indexOf('=') !== -1 && body.charAt(0) !== '{') {
        var q = new URLSearchParams(body), r = new URLSearchParams();
        q.forEach(function (v, k) { r.append(k, v.slice(0, MAX)); });
        return r.toString();
      }
    } catch (e) {}
    return body;
  }

  // Brevo's reply, for the error report. Email addresses are blanked out before it is stored.
  function remember(status, text) {
    var body = String(text || '').replace(/\s+/g, ' ').replace(/[^\s"'<>:,;]+@[^\s"'<>:,;]+/g, '[email]').slice(0, BODY_MAX);
    window.smmBrevoLast = { status: status, body: body };
  }

  if (window.XMLHttpRequest) {
    var open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__smmBrevo = isBrevo(url);
      return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      if (this.__smmBrevo) {
        var xhr = this;
        window.smmBrevoLast = null;
        xhr.addEventListener('loadend', function () {
          var text = '';
          try { text = xhr.responseType === '' || xhr.responseType === 'text' ? xhr.responseText : JSON.stringify(xhr.response); } catch (e) {}
          remember(xhr.status, text);
        });
        return send.call(this, trimBody(body));
      }
      return send.apply(this, arguments);
    };
  }

  if (window.fetch) {
    var realFetch = window.fetch;
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url);
      if (!isBrevo(url)) return realFetch.apply(this, arguments);
      window.smmBrevoLast = null;
      if (init && init.body) init = Object.assign({}, init, { body: trimBody(init.body) });
      return realFetch.call(this, input, init).then(function (res) {
        res.clone().text().then(function (t) { remember(res.status, t); }, function () { remember(res.status, ''); });
        return res;
      }, function (err) {
        remember(0, 'network error: ' + (err && err.message));
        throw err;
      });
    };
  }

  // Also trim the hidden fields themselves just before the form is sent.
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.id !== 'sib-form') return;
    var hidden = f.querySelectorAll('input[type="hidden"]');
    for (var i = 0; i < hidden.length; i++) if (hidden[i].value.length > MAX) hidden[i].value = hidden[i].value.slice(0, MAX);
  }, true);
})();
