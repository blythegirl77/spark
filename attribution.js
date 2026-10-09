// Remembers where a visitor came from (UTM tags or referrer) for the length of their visit,
// fills any matching hidden fields in the sign-up form, and exposes the values so the
// /welcome/ page can send them to Tag Manager with the sign_up event.
// Stored in sessionStorage only (cleared when the tab closes); no cookies.
(function () {
  var KEY = 'spark-source';
  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  function read() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function write(v) {
    try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  function capture() {
    var existing = read();
    var q = new URLSearchParams(location.search);
    var found = {};
    PARAMS.forEach(function (p) { var v = q.get(p); if (v) found[p] = v.slice(0, 100); });

    if (Object.keys(found).length) {            // tagged link: always record it
      found.landing_page = location.pathname;
      write(found);
      return found;
    }
    if (existing) return existing;              // keep the first source of this visit

    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    var src = { utm_source: ref && ref.indexOf(location.hostname) === -1 ? ref : '(direct)',
                utm_medium: ref && ref.indexOf(location.hostname) === -1 ? 'referral' : '(none)',
                landing_page: location.pathname };
    write(src);
    return src;
  }

  var data = capture();

  // Fill hidden/extra fields in the sign-up form, if they exist (names must match Brevo attributes).
  function fill() {
    var map = { UTM_SOURCE: 'utm_source', UTM_MEDIUM: 'utm_medium', UTM_CAMPAIGN: 'utm_campaign',
                UTM_CONTENT: 'utm_content', UTM_TERM: 'utm_term', LANDING_PAGE: 'landing_page' };
    Object.keys(map).forEach(function (field) {
      var el = document.querySelector('#sib-form [name="' + field + '"]');
      if (el && data[map[field]]) el.value = data[map[field]];
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill); else fill();

  window.sparkAttribution = { get: function () { return read() || data; } };
})();
