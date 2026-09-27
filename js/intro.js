/* Envelope invitation, shown on every visit. RSVP is handled by main.js. */
(function () {
  'use strict';
  var LINE = 'Hi, I am Maeygia. Can you be my ninang/ninong?';
  var SAFETY_MS = 15000;
  var OPEN_MS = 1100;
  var envelope = document.getElementById('envelope');
  var yes = document.getElementById('card-yes');
  var no = document.getElementById('card-no');
  var typed = document.getElementById('card-typed');
  var nudge = document.getElementById('card-nudge');
  var heading = document.querySelector('.hero__name');
  if (!envelope || !yes || !no || !typed || !nudge || !heading) { return; }
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var voice = window.speechSynthesis;
  var background = [];
  var declined = false;
  var opening = false;
  var finished = false;
  var typeTimer;
  var safetyTimer;
  var openTimer;
  var speechTimer;
  var utterance;
  var spoken = false;

  function stopSpeech() {
    window.clearTimeout(speechTimer);
    try { if (voice) { voice.cancel(); } } catch (error) { /* Speech is optional. */ }
  }
  function finishTyping() {
    window.clearInterval(typeTimer);
    typed.textContent = LINE;
  }
  function pickVoice() {
    var voices = voice.getVoices().filter(function (item) {
      return /^en(-|_|$)/i.test(item.lang || '');
    });
    var preferred = ['Google US English', 'Samantha', 'Aria', 'Jenny', 'Karen', 'Daniel'];
    for (var i = 0; i < preferred.length; i++) {
      for (var j = 0; j < voices.length; j++) {
        if (voices[j].name.indexOf(preferred[i]) !== -1) { return voices[j]; }
      }
    }
    return voices.filter(function (item) { return item.localService; })[0] || voices[0];
  }
  function speak() {
    if (spoken || opening || finished || !voice || !window.SpeechSynthesisUtterance) { return; }
    spoken = true;
    window.clearTimeout(speechTimer);
    try {
      utterance = new window.SpeechSynthesisUtterance(LINE);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      var chosen = pickVoice();
      if (chosen) { utterance.voice = chosen; }
      // Speech completion or rejection must never decide the guest's answer.
      utterance.onerror = function () { finishTyping(); };
      voice.speak(utterance);
    } catch (error) { finishTyping(); }
  }
  function finish() {
    if (finished) { return; }
    finished = true;
    window.clearTimeout(safetyTimer);
    window.clearTimeout(openTimer);
    finishTyping();
    stopSpeech();
    if (voice && voice.removeEventListener) { voice.removeEventListener('voiceschanged', speak); }
    envelope.hidden = true;
    document.documentElement.classList.remove('intro-locked');
    background.forEach(function (element) {
      element.inert = false;
      element.removeAttribute('data-intro-background');
    });
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('focusin', onFocus);
    heading.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent('christening:intro-complete'));
  }
  function open() {
    if (opening || finished) { return; }
    opening = true;
    finishTyping();
    stopSpeech();
    envelope.classList.add('is-open');
    if (motion.matches) { finish(); }
    else { openTimer = window.setTimeout(finish, OPEN_MS); }
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); open(); }
    if (event.key === 'Tab') {
      event.preventDefault();
      (document.activeElement === yes ? no : yes).focus();
    }
  }
  function onFocus(event) {
    if (!finished && !envelope.contains(event.target)) { yes.focus(); }
  }
  yes.addEventListener('click', open);
  no.addEventListener('click', function () {
    if (opening || finished) { return; }
    if (declined) { open(); return; }
    declined = true;
    finishTyping();
    nudge.textContent = 'Are you sure? Please say yes!';
    no.textContent = 'Still no';
    stopSpeech();
    spoken = false;
    speak();
    yes.focus();
  });
  // Register recovery before changing visibility or locking the background.
  safetyTimer = window.setTimeout(finish, SAFETY_MS);
  heading.setAttribute('tabindex', '-1');
  Array.prototype.forEach.call(document.body.children, function (element) {
    if (element === envelope || /^(SCRIPT|STYLE)$/.test(element.tagName) || element.inert) { return; }
    background.push(element);
    element.setAttribute('data-intro-background', '');
    element.inert = true;
  });
  envelope.hidden = false;
  document.documentElement.classList.add('intro-locked');
  document.addEventListener('keydown', onKey);
  document.addEventListener('focusin', onFocus);
  yes.focus();
  if (!motion.matches) {
    var count = 0;
    typed.textContent = '';
    typeTimer = window.setInterval(function () {
      count += 1;
      typed.textContent = LINE.slice(0, count);
      if (count >= LINE.length) { finishTyping(); }
    }, 55);
  }
  if (voice) {
    if (voice.addEventListener) { voice.addEventListener('voiceschanged', speak); }
    speechTimer = window.setTimeout(speak, 350);
  }
  window.addEventListener('pagehide', finish);
}());
