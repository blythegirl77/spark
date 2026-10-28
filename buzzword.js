// Buzzword Swipe: the six-step tool under the hero of /challenge-a and /challenge-b.
// Both pages load this same file, buzzword.css and buzzwords.json, so the tool is identical on both.
// Step 6 is the sign-up: the page's own Brevo form is moved into the card, and this script fills
// its hidden INDUSTRY and BUZZWORDS fields. Written in plain ES5 for in-app browsers.
(function () {
  var root = document.getElementById('buzzword-swipe');
  if (!root) return;

  // Words shown by the tool (the same on both pages).
  var COPY = {
    introTitle: 'Find out in 30 seconds.',
    introSub: '',
    stepOf: 'Step {n} of 6',
    back: 'Back',
    next: 'Next',
    industryTitle: 'What do you do?',
    wordsTitle: 'Which of these buzz words have you used?',
    wordsSub: "We've all done it.",
    fillerTitle: 'Sound familiar? This could be any of a hundred websites.',
    fillerTitleNone: "Even if you haven't, you've read this a hundred times.",
    exampleTitle: 'Now the same kind of business, without the buzzwords:',
    exampleLabel: 'Example',
    swipeTitle: 'Which would you swipe right on?',
    fillerLabel: 'The buzzword version',
    heartLabel: 'Swipe right on this one',
    shareAll: '{p}% of people picked the same.',
    signupTitle: 'That was the difference between a buzzword and a moment.',
    signupBody: 'Now try it on your own business.',
    signupSmall: 'Free \u00b7 7 days \u00b7 15 min a day \u00b7 AI feedback on your writing',
    signupButton: 'Send me Day 1',
    signupNamePlaceholder: 'First name',
    signupConsent: 'I agree to get the course emails and accept the privacy statement.'
  };
  // A page can change any of these words for its own version of the tool, with a JSON object in
  // the tool's data-copy attribute (e.g. /challenge-b). Anything not given keeps the wording above.
  try {
    var pageCopy = JSON.parse(root.getAttribute('data-copy') || 'null');
    if (pageCopy) for (var key in pageCopy) if (pageCopy.hasOwnProperty(key)) COPY[key] = pageCopy[key];
  } catch (e) {}
  // Short industry labels for the step 1 buttons (by group id; anything not listed uses its label)
  var SHORT_LABELS = {
    wellness: 'Health & wellness',
    coaching: 'Coaching',
    creative: 'Creative',
    professional: 'Professional services',
    beauty: 'Beauty & care',
    food: 'Food & hospitality',
    makers: 'Makers & retail',
    trades: 'Home & trades',
    other: 'Something else'
  };
  var stage = root.querySelector('.bz-stage');
  var form = document.getElementById('sib-form');

  var data, group, picked = [], choice = null, step = 1;
  var tally = null, wordsDone = false;

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

  // ---- Step tracking: smmTrack() and smmSwipeTally() come from smm-track.js (loaded first) ----
  function track(event, detail) {
    if (window.smmTrack) window.smmTrack(event, detail);
  }

  // ---- Screens ----
  function screen(n, title, sub) {
    formToBottom(); // put the form back before clearing the card, so it's never wiped
    stage.innerHTML = '';
    var top = el('div', 'bz-top' + (n === 1 ? ' bz-top-first' : ''));
    if (n > 1) top.appendChild(button('bz-back', '‹ ' + COPY.back, function () { go(n - 1); }));
    top.appendChild(el('span', 'bz-count', t(COPY.stepOf, { n: n })));
    stage.appendChild(top);
    if (n === 1) {
      // Card intro (the hook), under "Step 1 of 6"
      stage.appendChild(el('h2', 'bz-intro-title', COPY.introTitle));
      if (COPY.introSub) stage.appendChild(el('p', 'bz-intro-sub', COPY.introSub));
    }
    if (title) stage.appendChild(el(n === 1 ? 'h3' : 'h2', 'bz-title', title));
    if (sub) stage.appendChild(el('p', 'bz-sub', sub));
    return stage;
  }
  function nextButton(label, onClick, disabled) {
    var b = button('bz-next', label || COPY.next, onClick);
    if (disabled) b.disabled = true;
    stage.appendChild(b);
    return b;
  }
  // The group's blurb, with the [[markers]] removed. With highlight on, the buzzwords the visitor
  // picked are marked; markers match buzzwords[].word, ignoring capital letters.
  function blurb(highlight) {
    var p = el('p', 'bz-text');
    var src = group.blurb || '';
    var re = /\[\[(.+?)\]\]/g, last = 0, m;
    var mine = picked.map(function (w) { return w.toLowerCase(); });
    while ((m = re.exec(src))) {
      if (m.index > last) p.appendChild(document.createTextNode(src.slice(last, m.index)));
      if (highlight && mine.indexOf(m[1].toLowerCase()) !== -1) p.appendChild(el('mark', 'bz-hl', m[1]));
      else p.appendChild(document.createTextNode(m[1]));
      last = re.lastIndex;
    }
    if (last < src.length) p.appendChild(document.createTextNode(src.slice(last)));
    return p;
  }
  function card(label, content, extraCls) {
    var c = el('div', 'bz-card' + (extraCls ? ' ' + extraCls : ''));
    if (label) c.appendChild(el('p', 'bz-label', label));
    c.appendChild(typeof content === 'string' ? el('p', 'bz-text', content) : content);
    return c;
  }

  function showIndustry() {
    screen(1, COPY.industryTitle);
    var list = el('div', 'bz-options');
    data.groups.forEach(function (g) {
      var b = button('bz-option' + (group && group.id === g.id ? ' is-on' : ''), '', function () {
        if (!group || group.id !== g.id) { picked = []; choice = null; wordsDone = false; }
        group = g;
        track('industry_picked', g.id);
        go(2);
      });
      b.appendChild(el('span', 'bz-option-label', SHORT_LABELS[g.id] || g.label));
      list.appendChild(b);
    });
    stage.appendChild(list);
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
      });
      c.setAttribute('aria-pressed', picked.indexOf(b.word) !== -1 ? 'true' : 'false');
      chips.appendChild(c);
    });
    stage.appendChild(chips);
    next = nextButton(COPY.next, function () {
      // Keep the words in the order they're listed, whatever order they were tapped in
      picked = group.buzzwords.map(function (b) { return b.word; })
        .filter(function (w) { return picked.indexOf(w) !== -1; });
      wordsDone = true;
      track('buzzwords_picked', picked.length ? picked : 'none');
      go(3);
    });
  }

  function showFiller() {
    screen(3, picked.length ? COPY.fillerTitle : COPY.fillerTitleNone);
    stage.appendChild(card('', blurb(true), 'bz-card-filler'));
    nextButton(COPY.next, function () { go(4); });
  }

  function showExample() {
    screen(4, COPY.exampleTitle);
    stage.appendChild(card(COPY.exampleLabel, group.example));
    track('example_viewed');
    nextButton(COPY.next, function () { go(5); });
  }

  function showSwipe() {
    screen(5, COPY.swipeTitle);
    var result = el('p', 'bz-result');
    result.setAttribute('aria-live', 'polite');
    var next;
    var options = [
      { id: 'filler', label: COPY.fillerLabel, text: blurb(false) },
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
        result.textContent = '';
        paint();
        if (!choice) return;
        // Only the first swipe of the visit is recorded (smmTrack ignores later ones)
        track('swiped', choice === 'example' ? 'moment' : 'buzzword');
        getTally(function () { showShare(result); });
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
    if (choice) showShare(result);
  }

  // The share of all visitors who swiped right on the same card, from smmSwipeTally().
  // Fetched once per visit; no number is shown until the web app sends momentPct.
  var tallyAsked = false, tallyWaiting = [];
  function getTally(done) {
    if (tally || !window.smmSwipeTally) return done();
    tallyWaiting.push(done);
    if (tallyAsked) return;
    tallyAsked = true;
    window.smmSwipeTally().then(function (res) {
      tally = res;
      var waiting = tallyWaiting; tallyWaiting = [];
      waiting.forEach(function (fn) { fn(); });
    });
  }
  function showShare(target) {
    if (!choice || !tally || tally.momentPct == null || !target.isConnected) { if (target) target.textContent = ''; return; }
    var moment = Math.round(Number(tally.momentPct));
    var p = choice === 'example' ? moment : 100 - moment;
    target.textContent = t(COPY.shareAll, { p: p });
  }

  // Step 6: sign up. The page has one real Brevo form (in the section at the bottom). While this
  // step shows, that form is moved into the card (button "Send me Day 1"), and the bottom section
  // gets an identical-looking copy that hands its answers to the real form and submits it. Brevo's
  // script, Tag Manager and the hidden fields only ever deal with the real form.
  function showSignup() {
    screen(6, COPY.signupTitle);
    stage.appendChild(el('p', 'bz-signup-body', COPY.signupBody));
    stage.appendChild(el('p', 'bz-signup-small', COPY.signupSmall));
    formIntoCard();
    track('reached_form');
  }

  var formBox = form && form.closest ? form.closest('.sib-form') : null;
  var submitBtn = form && form.querySelector('button[type="submit"]');
  var bottomLabel = submitBtn ? submitBtn.textContent.trim() : '';
  // Optional card-only wording for the Name placeholder and the consent line (set per page via data-copy)
  var nameField = document.getElementById('FIRSTNAME');
  var consentText = form && form.querySelector('.sib-consent p');
  var bottomPlaceholder = nameField ? nameField.placeholder : '';
  var bottomConsent = consentText ? consentText.textContent : '';
  var bottomSpot, template, copy;
  if (formBox) {
    bottomSpot = document.createComment('sign-up form home'); // where the real form lives
    formBox.parentNode.insertBefore(bottomSpot, formBox);
    template = formBox.cloneNode(true); // untouched markup, taken before Brevo's script runs
  }

  // The copy shown at the bottom while the real form is in the card. It has no hidden fields and
  // no names, and its ids are renamed (except sib-container, which the styles use; the real form
  // comes first on the page, so scripts looking it up by id still find the real one).
  function realField(id) { return document.getElementById(id); }
  function makeCopy() {
    var c = template.cloneNode(true);
    var drop = c.querySelectorAll('input[type="hidden"], .input--hidden');
    for (var i = 0; i < drop.length; i++) drop[i].parentNode.removeChild(drop[i]);
    var withId = c.querySelectorAll('[id]');
    for (i = 0; i < withId.length; i++) {
      if (withId[i].id !== 'sib-container') withId[i].id = 'bzc-' + withId[i].id;
    }
    var named = c.querySelectorAll('[name]');
    for (i = 0; i < named.length; i++) named[i].removeAttribute('name');
    var f = c.querySelector('form');
    f.removeAttribute('action'); f.removeAttribute('method'); f.removeAttribute('data-type');
    var btn = c.querySelector('button[type="submit"]');
    btn.setAttribute('form', f.id);
    // Start from whatever was already typed
    c.querySelector('#bzc-FIRSTNAME').value = realField('FIRSTNAME').value;
    c.querySelector('#bzc-EMAIL').value = realField('EMAIL').value;
    c.querySelector('#bzc-OPT_IN').checked = realField('OPT_IN').checked;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.checkValidity && !f.checkValidity()) { if (f.reportValidity) f.reportValidity(); return; }
      copyToReal(c);
      fillFields();
      submitFrom = 'bottom';
      btn.disabled = true;
      submitBtn.click(); // the real form submits through Brevo as usual
      watchResult(c, btn);
    });
    return c;
  }
  function copyToReal(c) {
    realField('FIRSTNAME').value = c.querySelector('#bzc-FIRSTNAME').value;
    realField('EMAIL').value = c.querySelector('#bzc-EMAIL').value;
    realField('OPT_IN').checked = c.querySelector('#bzc-OPT_IN').checked;
  }
  // Mirror Brevo's success or error message from the real form onto the copy.
  function watchResult(c, btn) {
    var tries = 0;
    function shown(el) { return el && window.getComputedStyle(el).display !== 'none'; }
    var timer = setInterval(function () {
      tries++;
      var bad = shown(realField('error-message')), good = shown(realField('success-message'));
      if (bad || good || tries > 50) {
        clearInterval(timer);
        btn.disabled = false;
        var panel = c.querySelector(good ? '#bzc-success-message' : '#bzc-error-message');
        if ((bad || good) && panel) panel.style.display = 'block';
      }
    }, 300);
  }
  function setButtonText(text) {
    if (!submitBtn) return;
    for (var i = submitBtn.childNodes.length - 1; i >= 0; i--) {
      var nd = submitBtn.childNodes[i];
      if (nd.nodeType === 3 && nd.nodeValue.trim()) { nd.nodeValue = ' ' + text + ' '; return; }
    }
  }
  function formIntoCard() {
    if (!formBox || formBox.parentNode === stage) return;
    formBox.className += ' bz-in-card';
    setButtonText(COPY.signupButton);
    if (COPY.signupNamePlaceholder && nameField) nameField.placeholder = COPY.signupNamePlaceholder;
    if (COPY.signupConsent && consentText) consentText.textContent = COPY.signupConsent;
    copy = makeCopy();
    bottomSpot.parentNode.insertBefore(copy, bottomSpot);
    stage.appendChild(formBox);
  }
  function formToBottom() {
    if (!formBox || formBox.parentNode !== stage) return;
    formBox.className = formBox.className.replace(/\s*bz-in-card/g, '');
    setButtonText(bottomLabel);
    if (nameField) nameField.placeholder = bottomPlaceholder;
    if (consentText) consentText.textContent = bottomConsent;
    if (copy) {
      // Keep anything typed into the copy, then swap the real form back in
      if (copy.querySelector('#bzc-EMAIL').value || copy.querySelector('#bzc-FIRSTNAME').value) copyToReal(copy);
      copy.parentNode.removeChild(copy);
      copy = null;
    }
    bottomSpot.parentNode.insertBefore(formBox, bottomSpot);
  }

  // Fill the hidden Brevo fields from the visitor's picks.
  function fillFields() {
    if (!form) return;
    var ind = form.querySelector('input[name="INDUSTRY"]');
    var words = form.querySelector('input[name="BUZZWORDS"]');
    if (ind) ind.value = group ? group.id : '';
    if (words) words.value = picked.join(', ');
  }

  var screens = { 1: showIndustry, 2: showWords, 3: showFiller, 4: showExample, 5: showSwipe, 6: showSignup };

  function go(n, noScroll) {
    if (n > 1 && !group) n = 1;
    if (n > 2 && !wordsDone) n = 2;
    step = n;
    root.setAttribute('data-step', n);
    fillFields();
    screens[n]();
    if (noScroll) return;
    // Bring the top of the tool into view (one screen at a time on phones) and move focus for screen readers
    var r = root.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.4) {
      try { root.scrollIntoView({ block: 'start' }); } catch (e) { root.scrollIntoView(true); }
    }
    var h = stage.querySelector('.bz-title');
    if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} }
  }

  // After the real form is sent (with a name, an email and the consent box ticked), wait for Brevo's
  // answer: form_submitted when it confirms the signup, form_error when it shows its error message
  // (detail: "card" for the step 6 form, "bottom" for the form at the end of the page).
  // Brevo confirms either by showing its success message or, when the form has a thank-you page
  // set, by sending the visitor there; leaving the page while waiting, with no error shown, counts
  // as that redirect.
  var submitFrom = null, waitingFor = null, waitTimer = null;
  function shownPanel(id) {
    var p = realField(id);
    return !!p && window.getComputedStyle(p).display !== 'none';
  }
  function settle(event) {
    if (!waitingFor) return;
    var from = waitingFor;
    waitingFor = null;
    clearInterval(waitTimer);
    track(event, from);
  }
  window.addEventListener('pagehide', function () {
    if (waitingFor && !shownPanel('error-message')) settle('form_submitted');
  });
  if (form) form.addEventListener('submit', function () {
    fillFields();
    var from = submitFrom || (formBox && formBox.parentNode === stage ? 'card' : 'bottom');
    submitFrom = null;
    var name = realField('FIRSTNAME'), email = realField('EMAIL'), optin = realField('OPT_IN');
    if (!(name && name.value.trim() && email && email.value.trim() && optin && optin.checked)) return;
    // Hide any message from an earlier try, so only this answer counts
    ['success-message', 'error-message'].forEach(function (id) { var p = realField(id); if (p) p.style.display = ''; });
    waitingFor = from;
    clearInterval(waitTimer);
    var tries = 0;
    waitTimer = setInterval(function () {
      tries++;
      if (shownPanel('success-message')) settle('form_submitted');
      else if (shownPanel('error-message')) settle('form_error');
      else if (tries > 100) { waitingFor = null; clearInterval(waitTimer); } // no answer after 30 s
    }, 300);
  }, true);

  // Load the data; if it can't load, the tool stays empty and the page works as before.
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
