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

  // Page-load visit ping, with the same visit_id as the steps.
  // This replaces the separate visit snippet: remove that one from both pages.
  try {
    var ref = '';
    try { ref = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    var vp = new URLSearchParams({
      action: 'visit',
      vid: vid,
      page: location.pathname,
      utm_source: q.get('utm_source') || '',
      utm_medium: q.get('utm_medium') || '',
      utm_campaign: q.get('utm_campaign') || '',
      utm_content: q.get('utm_content') || '',
      utm_term: q.get('utm_term') || '',
      ref: ref,
      dev: dev,
      app: app
    });
    var vurl = WEBAPP_URL + '?' + vp.toString();
    if (window.fetch) {
      fetch(vurl, { method: 'GET', mode: 'no-cors', keepalive: true, credentials: 'omit' })
        .catch(function () {});
    } else {
      new Image().src = vurl;
    }
  } catch (e) {}

  // Attention signals: tool seen, scroll depth, time on page.
  try {
    var start = Date.now();
    var maxPct = 0;

    var scrollPct = function () {
      var doc = document.documentElement;
      var full = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
      if (!full) return 0;
      return Math.min(100, Math.round(100 * (window.scrollY + window.innerHeight) / full));
    };

    var onScroll = function () {
      var pct = scrollPct();
      if (pct > maxPct) maxPct = pct;
      if (pct >= 50) window.smmTrack('scrolled_50');
      if (pct >= 90) window.smmTrack('scrolled_90');
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // The tool card must carry the attribute data-smm-tool.
    var watchTool = function () {
      var tool = document.querySelector('[data-smm-tool]');
      if (!tool || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { window.smmTrack('tool_seen'); io.disconnect(); }
        });
      }, { threshold: 0.4 });
      io.observe(tool);
    };

    var leave = function () {
      onScroll();
      var secs = Math.min(99999, Math.round((Date.now() - start) / 1000));
      window.smmTrack('left', secs + ';' + maxPct);
    };
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') leave();
    });
    window.addEventListener('pagehide', leave);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { onScroll(); watchTool(); });
    } else {
      onScroll(); watchTool();
    }
  } catch (e) {}

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
