// Remembers where a visitor came from (UTM tags or referrer) for the length of their visit and
// exposes the values (window.sparkAttribution.get()) so the /welcome/ page can send them to
// Tag Manager with the sign_up event.
// It does NOT touch the sign-up form: the hidden inputs are filled by the Tag Manager tag
// "Funnel attribution - fill Brevo fields".
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

  window.sparkAttribution = {
    get: function () {
      return Object.assign({}, read() || data);
    }
  };
})();
