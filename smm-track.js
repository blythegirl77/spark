/*
 * Spark My Marketing — Buzzword Swipe step tracking.
 * Load on BOTH /challenge-a and /challenge-b, before the Buzzword Swipe script.
 * Cookieless: the visit ID is random, lives only in this page's memory,
 * and is never stored.
 *
 * Usage from the tool:
 *   smmTrack('industry_picked', 'trades');
 *   smmTrack('buzzwords_picked', ['reliable', 'no job too small']);
 *   smmTrack('example_viewed');
 *   smmTrack('swiped', 'moment');        // or 'buzzword'
 *   smmTrack('reached_form');
 *   smmTrack('form_submitted');
 *   smmSwipeTally().then(function (t) { if (t && t.momentPct != null) { ... } });
 */
(function () {
  var WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyeWHm1OKpKIgedWI3Hc1NwlnSYwPKy1vIF-GIys6JGUEjYF1lH0sQYTh99Vf-9E7A/exec'; // Apps Script web app URL, ends in /exec

  var q = new URLSearchParams(location.search);
  var ua = navigator.userAgent || '';
  var app = /Instagram/i.test(ua) ? 'instagram'
          : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'facebook'
          : 'browser';
  var dev = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobile' : 'desktop';
  var vid = Math.random().toString(36).slice(2, 12);
  while (vid.length < 8) vid += Math.floor(Math.random() * 10);
  var sent = {};

  window.smmTrack = function (event, detail) {
    try {
      // Each step counts once per page load, even if the visitor goes Back.
      if (event !== 'swiped' && sent[event]) return;
      if (event === 'swiped' && sent.swiped) return;
      sent[event] = true;

      if (Array.isArray(detail)) detail = detail.join(',');
      var params = new URLSearchParams({
        action: 'step',
        vid: vid,
        page: location.pathname,
        event: event,
        detail: detail || '',
        utm_content: q.get('utm_content') || '',
        utm_term: q.get('utm_term') || '',
        dev: dev,
        app: app
      });
      var url = WEBAPP_URL + '?' + params.toString();
      if (window.fetch) {
        fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true, credentials: 'omit' })
          .catch(function () {});
      } else {
        new Image().src = url;
      }
    } catch (e) {}
  };

  // Returns a Promise of { n, moment, buzzword, momentPct } or { n } (too few
  // swipes yet), or null on any error. Never show a number when momentPct is missing.
  window.smmSwipeTally = function () {
    try {
      return fetch(WEBAPP_URL + '?action=tally', { method: 'GET', credentials: 'omit' })
        .then(function (r) { return r.json(); })
        .catch(function () { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  };
})();
