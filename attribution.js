// Remembers where a visitor came from (UTM tags or referrer) for the length of their visit,
// fills any matching hidden fields in the sign-up form, and exposes the values so the
// /welcome/ page can send them to Tag Manager with the sign_up event.
// The visit source is kept in sessionStorage (cleared when the tab closes); the sign-up ID in localStorage. No cookies.
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

  // One unique ID per sign-up attempt, like lead_1728508123456_k3x9p2qa. It goes into the hidden
  // LEAD_EVENT_ID field (so it is stored on the Brevo contact), is kept in localStorage so it
  // survives the jump to /welcome/, and is sent as event_id with the sign_up event. A Tag Manager
  // variable can read the same value from localStorage key "spark_lead_event_id".
  var ID_KEY = 'spark_lead_event_id';
  function newId() {
    var rand = '';
    try {
      var bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      rand = Array.prototype.map.call(bytes, function (b) { return b.toString(36); }).join('').slice(0, 8);
    } catch (e) {}
    while (rand.length < 8) rand += Math.random().toString(36).slice(2, 3);
    return 'lead_' + Date.now() + '_' + rand;
  }
  function stored() {
    try { return localStorage.getItem(ID_KEY); } catch (e) { return null; }
  }
  function leadId(forceNew) {
    var id = stored();
    if (!id || forceNew) {
      id = newId();
      try { localStorage.setItem(ID_KEY, id); } catch (e) {}
    }
    return id;
  }

  // Google Analytics client ID, read from the _ga cookie. It only exists if the visitor accepted
  // cookies and GA4 has loaded, so it is looked up again at the moment of sign-up.
  function gaClientId() {
    var m = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
    return m ? m[1] : '';
  }

  // Fill hidden fields in the sign-up form, if they exist (names must match the Brevo attributes).
  function fill(e) {
    var d = read() || data;
    var isSubmit = !!(e && e.type === 'submit');
    var map = { UTM_SOURCE: 'utm_source', UTM_MEDIUM: 'utm_medium', UTM_CAMPAIGN: 'utm_campaign',
                UTM_CONTENT: 'utm_content', UTM_TERM: 'utm_term', FBCLID: 'fbclid', LANDING_PAGE: 'landing_page' };
    Object.keys(map).forEach(function (field) {
      var el = document.querySelector('#sib-form [name="' + field + '"]');
      if (el && d[map[field]]) el.value = d[map[field]];
    });
    var g = document.querySelector('#sib-form [name="GA_CLIENT_ID"]');
    if (g) g.value = gaClientId();
    var lid = document.querySelector('#sib-form [name="LEAD_EVENT_ID"]');
    if (lid) lid.value = leadId(isSubmit);
    var sp = document.querySelector('#sib-form [name="SIGNUP_PAGE"]');
    if (sp) sp.value = location.pathname;
  }
  function init() {
    fill(null);
    var form = document.getElementById('sib-form');
    // Capture phase: runs before Brevo's own submit handler reads the form.
    if (form) form.addEventListener('submit', fill, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.sparkAttribution = {
    get: function () {
      var out = Object.assign({}, read() || data);
      var id = stored();
      if (id) out.event_id = id;
      return out;
    }
  };
})();
