(function () {
  'use strict';
  var LINE = 'Hi, I am Maeygia. Can you be my ninang/ninong?';
  var SAFETY_MS = 15000;
  var OPEN_MS = 650;
  var envelope = document.getElementById('envelope');
  var yes = document.getElementById('card-yes');
  var no = document.getElementById('card-no');
  var typed = document.getElementById('card-typed');
  var nudge = document.getElementById('card-nudge');
  var heading = document.querySelector('.hero__name');
  var openButton = document.getElementById('envelope-open');
  if (!envelope || !yes || !no || !typed || !nudge || !heading || !openButton) { return; }
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var voice = new Audio('/voice.mp3');
  voice.preload = 'auto';
  var background = [];
  var declined = false;
  var opening = false;
  var finished = false;
  var typeTimer;
  var safetyTimer;
  var openTimer;
  var audioTimer;
  var spoken = false;
  var revealing = false;
  var readyTimer;
  var ready = false;
  var card = envelope.querySelector('.envelope__card');

  function stopSpeech() {
    window.clearTimeout(audioTimer);
    voice.pause();
    try { voice.currentTime = 0; } catch (error) {  }
  }
  function finishTyping() {
    window.clearInterval(typeTimer);
    typed.textContent = LINE;
  }
  function speak() {
    if (spoken || opening || finished) { return; }
    spoken = true;
    try {
      var playback = voice.play();
      if (playback && playback.catch) {
        playback.catch(function () {
          spoken = false;
          finishTyping();
        });
      }
    } catch (error) { spoken = false; finishTyping(); }
  }
  function finish() {
    if (finished) { return; }
    finished = true;
    window.clearTimeout(safetyTimer);
    window.clearTimeout(openTimer);
    window.clearTimeout(readyTimer);
    finishTyping();
    stopSpeech();

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
      if (ready) {
        var controls = [yes, no];
        var current = controls.indexOf(document.activeElement);
        controls[(current + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus();
      }
      else { (revealing ? envelope : openButton).focus(); }
    }
  }
  function onFocus(event) {
    if (!finished && !envelope.contains(event.target)) {
      (ready ? yes : revealing ? envelope : openButton).focus();
    }
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
  envelope.setAttribute('tabindex', '-1');
  card.inert = true;
  if (!motion.matches) { typed.textContent = ''; }
  openButton.focus({ preventScroll: true });
  function revealCard() {
    if (finished || opening || revealing) { return; }
    revealing = true;
    audioTimer = window.setTimeout(speak, 250);
    safetyTimer = window.setTimeout(finish, SAFETY_MS);
    envelope.focus({ preventScroll: true });
    openButton.hidden = true;
    envelope.classList.add('is-revealed');
    readyTimer = window.setTimeout(startCard, motion.matches ? 0 : 1700);
  }
  function startCard() {
    if (finished || opening) { return; }
    ready = true;
    window.clearTimeout(safetyTimer);
    envelope.setAttribute('aria-labelledby', 'card-message');
    card.inert = false;
    var portraits = card.querySelectorAll('.card__photo');
    function animatePortrait() {
      if (finished || opening) { return; }
      if (Array.prototype.every.call(portraits, function (photo) {
        return photo.complete && photo.naturalWidth > 0;
      })) {
        envelope.classList.add('is-portrait-ready');
      }
    }
    Array.prototype.forEach.call(portraits, function (photo) {
      photo.addEventListener('load', animatePortrait, { once: true });
    });
    animatePortrait();
    yes.focus({ preventScroll: true });
    if (!motion.matches) {
      var count = 0;
      typeTimer = window.setInterval(function () {
        count += 1;
        typed.textContent = LINE.slice(0, count);
        if (count >= LINE.length) { finishTyping(); }
      }, 55);
    }

  }
  openButton.addEventListener('click', revealCard);
  window.addEventListener('pagehide', finish);
}());
