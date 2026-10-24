// Buzzword Swipe: the step-by-step tool in the sign-up section of /challenge-a and /challenge-b.
// Both pages load this same file, buzzword.css and buzzwords.json, so the tool is identical on both.
// Step 7 is the page's own Brevo form (already in the HTML); this script only shows it at the end
// and fills its hidden INDUSTRY and BUZZWORDS fields. Written in plain ES5 for in-app browsers.
(function () {
  var root = document.getElementById('buzzword-swipe');
  if (!root) return;

  // Words shown by the tool (the same on both pages).
  var COPY = {
    stepOf: 'Step {n} of 7',
    back: 'Back',
    next: 'Next',
    skip: 'Skip to sign-up',
    industryTitle: 'What kind of business do you have?',
    wordsTitle: 'Which of these buzz words have you used?',
    wordsSub: "We've all done it.",
    fillerTitle: 'Put together, they sound like this:',
    exampleTitle: 'Now the same kind of business, without the buzzwords:',
    exampleLabel: 'Example',
    swipeTitle: 'Which would you swipe right on?',
    fillerLabel: 'The buzzword version',
    heartLabel: 'Swipe right on this one',
    shareIndustry: '{p}% of people in {industry} picked the same.',
    shareAll: '{p}% of people picked the same.',
    questionsTitle: 'How to get from one to the other: ask three questions.',
    toForm: 'Find your version'
  };
  var MIN_VOTES = 20; // below this many swipes, the percentage stays hidden

  var endpoint = root.getAttribute('data-endpoint') || '';
  var stage = root.querySelector('.bz-stage');
  var formStep = root.querySelector('.bz-form-step');
  var form = document.getElementById('sib-form');
  var run = Math.random().toString(36).slice(2, 10); // per page view, kept in memory only (no cookie)
  var q = new URLSearchParams(location.search);

  var data, group, picked = [], choice = null, step = 1, reachedForm = false;
  var lastCounts = null, swipeSeq = 0;

  function t(s, vars) {
    return s.replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(cls, text, onClick) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  // ---- Cookieless pings to the Apps Script web app (same endpoint as the visit ping) ----
  function pingUrl(event, detail) {
    var p = new URLSearchParams({
      action: 'tool',
      event: event,
      detail: detail || '',
      industry: group ? group.id : '',
      page: location.pathname,
      run: run,
      utm_campaign: q.get('utm_campaign') || '',
      utm_content: q.get('utm_content') || ''
    });
    return endpoint + '?' + p.toString();
  }
  function ping(event, detail) {
    if (endpoint.indexOf('https://') !== 0) return;
    var url = pingUrl(event, detail);
    try {
      if (window.fetch) {
        fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(function () {});
      } else {
        new Image().src = url;
      }
    } catch (e) {}
  }
  // The swipe ping also asks for the running totals. Expected reply (JSON):
  // { "industry": { "example": 12, "filler": 3 }, "all": { "example": 80, "filler": 25 } }
  function pingSwipe(detail, done) {
    if (endpoint.indexOf('https://') !== 0) return done(null);
    var finished = false;
    function finish(v) { if (!finished) { finished = true; done(v); } }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', pingUrl('swiped', detail), true);
      xhr.timeout = 6000;
      xhr.onload = function () {
        try { finish(xhr.status === 200 ? JSON.parse(xhr.responseText) : null); } catch (e) { finish(null); }
      };
      xhr.onerror = xhr.ontimeout = function () { finish(null); };
      xhr.send();
    } catch (e) { finish(null); }
  }

  // ---- Screens ----
  function screen(n, title, sub) {
    stage.innerHTML = '';
    var top = el('div', 'bz-top');
    if (n > 1) top.appendChild(button('bz-back', '‹ ' + COPY.back, function () { go(n === 7 ? 6 : n - 1); }));
    top.appendChild(el('span', 'bz-count', t(COPY.stepOf, { n: n })));
    stage.appendChild(top);
    if (title) stage.appendChild(el('h2', 'bz-title', title));
    if (sub) stage.appendChild(el('p', 'bz-sub', sub));
    return stage;
  }
  function nextButton(label, onClick, disabled) {
    var b = button('bz-next', label || COPY.next, onClick);
    if (disabled) b.disabled = true;
    stage.appendChild(b);
    return b;
  }
  function skipLink() {
    stage.appendChild(button('bz-skip', COPY.skip, function () { go(7); }));
  }
  function fillerText() {
    return group.buzzwords.filter(function (b) { return picked.indexOf(b.word) !== -1; })
      .map(function (b) { return b.sentence; }).join(' ');
  }
  function card(label, text, extraCls) {
    var c = el('div', 'bz-card' + (extraCls ? ' ' + extraCls : ''));
    if (label) c.appendChild(el('p', 'bz-label', label));
    c.appendChild(el('p', 'bz-text', text));
    return c;
  }

  function showIndustry() {
    screen(1, COPY.industryTitle);
    var list = el('div', 'bz-options');
    data.groups.forEach(function (g) {
      var b = button('bz-option' + (group && group.id === g.id ? ' is-on' : ''), '', function () {
        if (!group || group.id !== g.id) { picked = []; choice = null; lastCounts = null; }
        group = g;
        ping('industry_picked', g.id);
        go(2);
      });
      b.appendChild(el('span', 'bz-option-label', g.label));
      b.appendChild(el('span', 'bz-option-who', g.who));
      list.appendChild(b);
    });
    stage.appendChild(list);
    skipLink();
  }

  function showWords() {
    screen(2, COPY.wordsTitle, COPY.wordsSub);
    var chips = el('div', 'bz-chips');
    var next;
    group.buzzwords.forEach(function (b) {
      var c = button('bz-chip' + (picked.indexOf(b.word) !== -1 ? ' is-on' : ''), b.word, function () {
        var i = picked.indexOf(b.word);
        if (i === -1) picked.push(b.word); else picked.splice(i, 1);
        c.className = 'bz-chip' + (i === -1 ? ' is-on' : '');
        c.setAttribute('aria-pressed', i === -1 ? 'true' : 'false');
        next.disabled = picked.length === 0;
      });
      c.setAttribute('aria-pressed', picked.indexOf(b.word) !== -1 ? 'true' : 'false');
      chips.appendChild(c);
    });
    stage.appendChild(chips);
    next = nextButton(COPY.next, function () {
      // Keep the words in the order they're listed, whatever order they were tapped in
      picked = group.buzzwords.map(function (b) { return b.word; })
        .filter(function (w) { return picked.indexOf(w) !== -1; });
      ping('buzzwords_picked', picked.join(', '));
      go(3);
    }, picked.length === 0);
    skipLink();
  }

  function showFiller() {
    screen(3, COPY.fillerTitle);
    stage.appendChild(card('', fillerText(), 'bz-card-filler'));
    nextButton(COPY.next, function () { go(4); });
    skipLink();
  }

  function showExample() {
    screen(4, COPY.exampleTitle);
    stage.appendChild(card(COPY.exampleLabel, group.example));
    nextButton(COPY.next, function () { go(5); });
    skipLink();
  }

  function showSwipe() {
    screen(5, COPY.swipeTitle);
    var result = el('p', 'bz-result');
    result.setAttribute('aria-live', 'polite');
    var next;
    var options = [
      { id: 'filler', label: COPY.fillerLabel, text: fillerText() },
      { id: 'example', label: COPY.exampleLabel, text: group.example }
    ];
    function paint() {
      cards.forEach(function (x, i) {
        x.className = 'bz-card bz-swipe' + (!choice ? '' : options[i].id === choice ? ' is-on' : ' is-off');
        x.querySelector('.bz-heart').setAttribute('aria-pressed', options[i].id === choice ? 'true' : 'false');
      });
      next.disabled = !choice;
    }
    var cards = options.map(function (o) {
      var c = card(o.label, o.text, 'bz-swipe');
      var heart = button('bz-heart', '', function () {
        // Tap the chosen heart again to unselect it, or tap the other one to switch
        choice = choice === o.id ? null : o.id;
        lastCounts = null;
        result.textContent = '';
        paint();
        var mine = ++swipeSeq;
        if (!choice) { ping('swiped', 'none'); return; }
        pingSwipe(choice, function (counts) {
          if (mine !== swipeSeq) return; // a newer tap is on its way
          lastCounts = counts;
          showShare(result, counts);
        });
      });
      heart.setAttribute('aria-label', COPY.heartLabel + ': ' + o.label);
      heart.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 4.3 2.4h2c.7-1.3 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z"/></svg>';
      c.appendChild(heart);
      stage.appendChild(c);
      return c;
    });
    stage.appendChild(result);
    next = nextButton(COPY.next, function () { go(6); }, !choice);
    paint();
    if (choice && lastCounts) showShare(result, lastCounts);
    skipLink();
  }

  function showShare(target, counts) {
    function share(c) {
      if (!c) return null;
      var a = Number(c.example) || 0, b = Number(c.filler) || 0, total = a + b;
      if (total < MIN_VOTES) return null;
      return Math.round(((choice === 'example' ? a : b) / total) * 100);
    }
    if (!counts) return;
    var p = share(counts.industry);
    if (p != null) { target.textContent = t(COPY.shareIndustry, { p: p, industry: group.label.toLowerCase() }); return; }
    p = share(counts.all);
    if (p != null) target.textContent = t(COPY.shareAll, { p: p });
  }

  function showQuestions() {
    screen(6, COPY.questionsTitle);
    var focus = group.steps[0] && group.steps[0].focus;
    var list = el('ol', 'bz-questions');
    data.questionTemplates.forEach(function (tpl, i) {
      var s = group.steps[i];
      if (!s) return;
      var li = el('li', 'bz-q');
      li.appendChild(el('p', 'bz-q-ask', t(tpl, { word: focus })));
      li.appendChild(el('p', 'bz-q-answer', s.answer));
      list.appendChild(li);
    });
    stage.appendChild(list);
    stage.appendChild(card(COPY.exampleLabel, group.example));
    nextButton(COPY.toForm, function () { go(7); });
  }

  function showForm() {
    screen(7);
    formStep.hidden = false;
    if (!reachedForm) { reachedForm = true; ping('reached_form', group ? group.id : 'skipped'); }
  }

  // Fill the hidden Brevo fields from the visitor's picks.
  function fillFields() {
    if (!form) return;
    var ind = form.querySelector('input[name="INDUSTRY"]');
    var words = form.querySelector('input[name="BUZZWORDS"]');
    if (ind) ind.value = group ? group.id : '';
    if (words) words.value = picked.join(', ');
  }

  var screens = { 1: showIndustry, 2: showWords, 3: showFiller, 4: showExample, 5: showSwipe, 6: showQuestions, 7: showForm };

  function go(n, noScroll) {
    if (n > 1 && n < 7 && !group) n = 1;
    if (n > 2 && n < 7 && !picked.length) n = 2;
    step = n;
    formStep.hidden = n !== 7;
    root.setAttribute('data-step', n);
    fillFields();
    screens[n]();
    if (noScroll) return;
    // Bring the top of the tool into view (one screen at a time on phones) and move focus for screen readers
    var r = root.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.4) {
      try { root.scrollIntoView({ block: 'start' }); } catch (e) { root.scrollIntoView(true); }
    }
    var h = stage.querySelector('.bz-title') || (n === 7 && formStep.querySelector('.lp-cta'));
    if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} }
  }

  // Load the data; if it can't load, the form simply stays visible as before.
  var xhr = new XMLHttpRequest();
  xhr.open('GET', root.getAttribute('data-src') || '/buzzwords.json', true);
  xhr.onload = function () {
    if (xhr.status !== 200) return;
    try { data = JSON.parse(xhr.responseText); } catch (e) { return; }
    if (!data || !data.groups || !data.groups.length) return;
    root.className += ' bz-on';
    go(1, true);
  };
  xhr.send();
})();
