/* ==========================================================================
   Baby Christening Invitation — intro presentation
   A short spoken welcome plays over a staged hero reveal, once per browser.
   The markup ships with .intro-stage hidden; this controller reveals it, and
   the inline safety net in index.html reveals it if this file never runs.
   ========================================================================== */
(function () {
  'use strict';

  /* EDIT: the line spoken during the intro. */
  var LINE = 'Hi Ninong, Ninang, I am Maeygia. Welcome to my christening day!';

  var SEEN_KEY = 'christeningIntroSeen';
  var TYPE_MS = 70;          /* milliseconds per typed character */
  var LIFT_MS = 350;         /* beat of darkness before the hero appears */
  var START_CHECK_MS = 500;  /* how long to wait for speech to actually start */
  var SAFETY_MS = 12000;     /* hard stop, so the page can never stay stuck */
  var LIFT_FADE_MS = 700;    /* overlay fade duration, must match the CSS */

  var root = document.documentElement;
  var body = document.body;
  var stage = document.getElementById('intro-stage');
  var overlay = document.getElementById('intro-overlay');
  var controls = document.getElementById('intro-controls');
  var beginBtn = document.getElementById('intro-begin');
  var skipBtn = document.getElementById('intro-skip');
  var nameEl = document.querySelector('.hero__name');

  var timers = [];
  var typeTimer = null;
  var typeOriginal = '';
  var isDone = false;

  var onReady = function (fn) {
    if (document.readyState !== 'loading') { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  };

  var later = function (fn, ms) {
    var id = window.setTimeout(function () {
      timers = timers.filter(function (other) { return other !== id; });
      fn();
    }, ms);
    timers.push(id);
    return id;
  };

  var clearTimers = function () {
    timers.forEach(window.clearTimeout);
    timers = [];
  };

  /* ------------------------------------------------------------- helpers --- */

  function prefersReducedMotion() {
    return !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function hasSeenIntro() {
    try { return window.localStorage.getItem(SEEN_KEY) === '1'; } catch (error) { return false; }
  }

  function markSeen() {
    try { window.localStorage.setItem(SEEN_KEY, '1'); } catch (error) { /* private mode */ }
  }

  function synth() {
    return window.speechSynthesis || null;
  }

  /* ------------------------------------------------------------ the flow --- */

  onReady(function () {
    window.__christeningIntro = true; // tells the inline safety net we are live

    if (!stage || !overlay || !skipBtn || !beginBtn || !controls) { return; }

    // No speech support, an earlier visit, or a request for less motion: no intro.
    if (!synth() || hasSeenIntro() || prefersReducedMotion()) { revealNow(); return; }

    play();
  });

  function play() {
    markSeen();
    root.classList.add('intro-locked');
    body.classList.add('is-intro');
    overlay.classList.add('is-armed');
    controls.hidden = false;
    skipBtn.hidden = false;

    startTypewriter();
    later(lift, LIFT_MS);
    later(function () { speak(false); }, LIFT_MS);
    later(complete, SAFETY_MS);
  }

  function lift() {
    overlay.classList.add('is-lifted');
  }

  /* The intro either finishes on its own or is skipped; both fade the page up. */
  function complete() {
    if (isDone) { return; }
    isDone = true;

    clearTimers();
    finishTypewriter();
    stopSpeech();

    body.classList.remove('is-intro');
    controls.hidden = true;
    beginBtn.hidden = true;
    skipBtn.hidden = true;
    root.classList.remove('intro-locked');

    stage.classList.add('is-revealed');
    overlay.classList.add('is-lifted');
    later(function () { overlay.classList.add('is-gone'); }, LIFT_FADE_MS);

    document.dispatchEvent(new CustomEvent('christening:intro-complete'));
  }

  /* Used when the intro is not part of this visit: show the page at once. */
  function revealNow() {
    stage.classList.add('is-revealed', 'is-instant');
    overlay.classList.add('is-gone');
    root.classList.remove('intro-locked');
  }

  /* ------------------------------------------------------------- speech --- */

  function speak(fromGesture) {
    var voice = synth();
    if (!voice) { complete(); return; }

    var line = new SpeechSynthesisUtterance(LINE);
    line.lang = 'en-US';
    line.rate = 0.9;
    line.pitch = 1.05;

    var chosen = pickVoice();
    if (chosen) { line.voice = chosen; }

    line.onend = complete;
    line.onerror = complete;

    try {
      voice.speak(line);
    } catch (error) {
      complete();
      return;
    }

    // Most browsers refuse to speak without a user gesture. If nothing started,
    // offer a button that will, and keep the skip button as the way out.
    later(function () {
      if (isDone || voice.speaking || voice.pending) { return; }
      voice.cancel();
      if (fromGesture) { complete(); return; }
      showBeginButton();
    }, START_CHECK_MS);
  }

  function stopSpeech() {
    var voice = synth();
    if (voice) { voice.cancel(); }
  }

  function showBeginButton() {
    if (isDone) { return; }
    beginBtn.hidden = false;
    beginBtn.focus();
  }

  function pickVoice() {
    var all = synth().getVoices() || [];
    if (!all.length) { return null; }

    var english = all.filter(function (voice) {
      return /^en(-|_|$)/i.test(voice.lang || '');
    });
    if (!english.length) { return null; }

    var preferred = ['Google US English', 'Samantha', 'Aria', 'Jenny', 'Karen', 'Daniel'];
    for (var i = 0; i < preferred.length; i++) {
      var match = english.filter(function (voice) {
        return voice.name === preferred[i];
      })[0];
      if (match) { return match; }
    }

    return english.filter(function (voice) { return voice.localService; })[0] || english[0];
  }

  /* ---------------------------------------------------------- typewriter --- */

  function startTypewriter() {
    if (!nameEl || prefersReducedMotion()) { return; }

    typeOriginal = nameEl.innerHTML;
    var text = nameEl.textContent;
    if (!text) { return; }

    var caret = document.createElement('span');
    caret.className = 'hero__caret';
    caret.setAttribute('aria-hidden', 'true');
    nameEl.textContent = '';
    nameEl.appendChild(caret);

    var typed = 0;
    typeTimer = window.setInterval(function () {
      nameEl.insertBefore(document.createTextNode(text.charAt(typed)), caret);
      typed += 1;
      if (typed >= text.length) { finishTypewriter(); }
    }, TYPE_MS);
  }

  function finishTypewriter() {
    if (!typeTimer) { return; }
    window.clearInterval(typeTimer);
    typeTimer = null;
    if (typeOriginal) { nameEl.innerHTML = typeOriginal; }
  }

  /* ------------------------------------------------------------- wiring --- */

  function wireControls() {
    if (!skipBtn || !beginBtn) { return; }

    skipBtn.addEventListener('click', complete);

    beginBtn.addEventListener('click', function () {
      if (isDone) { return; }
      beginBtn.hidden = true;
      clearTimers();                       // re-arm the safety stop from this tap
      later(complete, SAFETY_MS);
      speak(true);
    });
  }

  onReady(wireControls);

  // Leaving the page mid-intro should not leave audio running in the background.
  window.addEventListener('pagehide', stopSpeech);
}());
