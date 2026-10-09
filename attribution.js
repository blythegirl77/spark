// Remembers where a visitor came from (UTM tags or referrer) for the length of their visit,
// fills any matching hidden fields in the sign-up form, and exposes the values so the
// /welcome/ page can send them to Tag Manager with the sign_up event.
// Stored in sessionStorage only (cleared when the tab closes); no cookies.
(function () {
  var KEY = 'spark-source';
  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

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

  // Google Analytics client ID, read from the _ga cookie. It only exists if the visitor accepted
  // cookies and GA4 has loaded, so it is looked up again at the moment of sign-up.
  function gaClientId() {
    var m = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
    return m ? m[1] : '';
  }

  // Fill hidden fields in the sign-up form, if they exist (names must match the Brevo attributes).
  function fill() {
    var d = read() || data;
    var map = { UTM_SOURCE: 'utm_source', UTM_MEDIUM: 'utm_medium', UTM_CAMPAIGN: 'utm_campaign',
                UTM_CONTENT: 'utm_content', UTM_TERM: 'utm_term', FBCLID: 'fbclid', LANDING_PAGE: 'landing_page' };
    Object.keys(map).forEach(function (field) {
      var el = document.querySelector('#sib-form [name="' + field + '"]');
      if (el && d[map[field]]) el.value = d[map[field]];
    });
    var g = document.querySelector('#sib-form [name="GA_CLIENT_ID"]');
    if (g) g.value = gaClientId();
    var sp = document.querySelector('#sib-form [name="SIGNUP_PAGE"]');
    if (sp) sp.value = location.pathname;
  }
  function init() {
    fill();
    var form = document.getElementById('sib-form');
    // Capture phase: runs before Brevo's own submit handler reads the form.
    if (form) form.addEventListener('submit', fill, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.sparkAttribution = {
    get: function () {
      return Object.assign({}, read() || data);
    }
  };
})();
