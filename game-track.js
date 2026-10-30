// "Who Killed Marketing?" suspect pages: one cookieless visit ping per scan, for the live
// "conversations sparked" count (/case-count). No cookies; nothing identifies the visitor.
// A reload in the same browser tab isn't counted again (a sessionStorage flag, no ID).
(function () {
  var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyeWHm1OKpKIgedWI3Hc1NwlnSYwPKy1vIF-GIys6JGUEjYF1lH0sQYTh99Vf-9E7A/exec';
  try {
    var page = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    var key = 'smm-counted:' + page;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (e) {}
    var ua = navigator.userAgent || '';
    var params = new URLSearchParams({
      action: 'visit',
      vid: Math.random().toString(36).slice(2, 12),
      page: page,
      utm_source: 'wedo-game-2026',
      dev: /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop',
      app: /Instagram/i.test(ua) ? 'instagram' : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'facebook' : 'browser'
    });
    var url = WEBAPP_URL + '?' + params.toString();
    if (window.fetch) {
      fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(function () {});
    } else {
      new Image().src = url;
    }
  } catch (e) {}
})();
