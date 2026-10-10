// Cookie consent banner. Works with Google Tag Manager through Google Consent Mode:
// the defaults (everything denied) are set in <head> before Tag Manager loads; this file
// shows the banner and sends the visitor's choice on.
(function () {
  var KEY = 'spark-consent';

  var SHARED_KEY = 'tracking_consent'; // shared with the rest of the analytics setup: granted / denied

  function read() {
    try { return localStorage.getItem(SHARED_KEY) || localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(v) {
    try { localStorage.setItem(SHARED_KEY, v); localStorage.setItem(KEY, v); } catch (e) {}
  }
  function update(state) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('consent', 'update', {
      ad_storage: state, ad_user_data: state, ad_personalization: state, analytics_storage: state
    });
    window.dataLayer.push({ event: 'consent_' + state });
    window.dataLayer.push({ event: 'tracking_consent_update', tracking_consent: state });
  }

  var banner;
  function hide() { if (banner) { banner.remove(); banner = null; } }

  function show() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<p>We’d like to use cookies to understand how people use this site. ' +
      'You can say no and the site works the same. <a href="privacy.html">Privacy policy</a></p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-btn consent-decline">No thanks</button>' +
      '<button type="button" class="consent-btn consent-accept">Accept</button>' +
      '</div>';
    banner.querySelector('.consent-accept').addEventListener('click', function () {
      save('granted'); update('granted'); hide();
    });
    banner.querySelector('.consent-decline').addEventListener('click', function () {
      save('denied'); update('denied'); hide();
    });
    document.body.appendChild(banner);
  }

  if (!read()) show();

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-cookie-settings]')) show();
  });
})();
