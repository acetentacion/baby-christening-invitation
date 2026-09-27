/* ==========================================================================
   Baby Christening Invitation — behaviour
   Three independent pieces: RSVP deadline gate, AJAX submit with a
   no-JavaScript fallback, and light scroll affordances.
   ========================================================================== */
(function () {
  'use strict';

  /* EDIT: the RSVP deadline. Times are Asia/Manila (UTC+8).
     The form closes automatically once this moment has passed. */
  var RSVP_DEADLINE = new Date('2026-10-24T00:00:00+08:00');

  var revealObserver = null;
  var revealItems = null;

  var onReady = function (fn) {
    if (document.readyState !== 'loading') { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  };

  onReady(function () {
    initForm();
    initStickyRsvp();
    initReveal();
    initPhoto();
    initMusic();
  });

  function initMusic() {
    var music = new Audio('/music.wav');
    music.loop = true;
    music.preload = 'none';
    // The recording itself is quiet, including on devices that ignore volume.
    music.volume = 0.4;
    var pending = false;
    function play() {
      if (pending || !music.paused || document.hidden ||
          document.documentElement.classList.contains('intro-locked')) { return; }
      pending = true;
      try {
        var result = music.play();
        if (result && result.then) {
          result.then(function () { pending = false; }, function () { pending = false; });
        } else { pending = false; }
      } catch (error) { pending = false; }
    }
    document.addEventListener('christening:intro-complete', play);
    // Retry on a gesture if the browser blocks automatic playback.
    document.addEventListener('pointerdown', play);
    document.addEventListener('keydown', play);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { music.pause(); } else { play(); }
    });
    window.addEventListener('pagehide', function () { music.pause(); });
    play();
  }

  /* -------------------------------------------------------------- photo --- */

  function initPhoto() {
    var wrap = document.querySelector('[data-photo]');
    if (!wrap) { return; }
    var img = wrap.querySelector('img');
    if (!img) { wrap.remove(); return; }
    // No photo supplied yet: drop the frame instead of showing a broken image.
    img.addEventListener('error', function () { wrap.hidden = true; });
    var photos = wrap.querySelectorAll('img');
    function startPhotos() {
      if (document.documentElement.classList.contains('intro-locked')) { return; }
      if (Array.prototype.every.call(photos, function (photo) {
        return photo.complete && photo.naturalWidth > 0;
      })) { wrap.classList.add('is-portrait-ready'); }
    }
    Array.prototype.forEach.call(photos, function (photo) {
      photo.addEventListener('load', startPhotos, { once: true });
    });
    document.addEventListener('christening:intro-complete', startPhotos);
    startPhotos();
  }

  /* ------------------------------------------------------- form + gate --- */

  function initForm() {
    var form = document.getElementById('rsvp-form');
    var submitBtn = document.getElementById('rsvp-submit');
    var status = document.getElementById('form-status');
    var thanks = document.getElementById('rsvp-thanks');
    var closed = document.getElementById('rsvp-closed');
    var thanksMessage = document.getElementById('thanks-message');

    if (!form) { return; }

    var isClosed = new Date().getTime() >= RSVP_DEADLINE.getTime();

    if (isClosed) {
      form.hidden = true;
      if (closed) { closed.hidden = false; }
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (submitBtn.disabled) { return; }
      if (new Date().getTime() >= RSVP_DEADLINE.getTime()) {
        form.hidden = true;
        if (closed) { closed.hidden = false; }
        return;
      }

      if (!validate(form)) { return; }
      if (window.location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) {
        status.textContent = 'Please open the live invitation website to send your RSVP.';
        return;
      }

      // No fetch (very old browser, or blocked): use the plain HTML form POST.
      if (typeof window.fetch !== 'function' || typeof window.URLSearchParams !== 'function') {
        form.submit();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-disabled', 'true');
      submitBtn.textContent = 'Sending…';
      status.textContent = '';
      form.setAttribute('aria-busy', 'true');

      var payload = new URLSearchParams(new FormData(form)).toString();
      var controller = typeof window.AbortController === 'function' ? new window.AbortController() : null;
      var timer;
      var request = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload
      };
      if (controller) { request.signal = controller.signal; }

      var timeout = new Promise(function (resolve, reject) {
        timer = window.setTimeout(function () {
          reject(new Error('timeout'));
          if (controller) { controller.abort(); }
        }, 20000);
      });
      Promise.race([fetch('/', request), timeout]).then(function (response) {
        if (!response.ok) { throw new Error('HTTP ' + response.status); }
        window.clearTimeout(timer);
        form.removeAttribute('aria-busy');
        showThanks(form, thanks, thanksMessage, status);
      })['catch'](function () {
        window.clearTimeout(timer);
        form.removeAttribute('aria-busy');
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-disabled');
        submitBtn.textContent = 'Send my RSVP';
        status.textContent = 'We could not confirm your RSVP. Your answers are still here. Please check your connection and try again, or contact the family if this continues.';
      });
    });

    clearErrorOnInput(form);
  }

  function showThanks(form, thanks, thanksMessage, status) {
    var answer = form.querySelector('input[name="attending"]:checked');
    var name = (form.elements['guest-name'].value || '').trim();

    if (thanksMessage) {
      if (answer && answer.value === 'yes') {
        thanksMessage.textContent =
          'Wonderful, ' + (name || 'friend') +
          '. We have you down and cannot wait to celebrate with you on 24 October.';
      } else {
        thanksMessage.textContent =
          'Thank you for letting us know, ' + (name || 'friend') +
          '. You will be missed — you will be in our thoughts on the day.';
      }
    }

    form.hidden = true;
    if (thanks) { thanks.hidden = false; }
    if (status) { status.textContent = ''; }

    if (thanks) {
      thanks.setAttribute('tabindex', '-1');
      thanks.focus();
    }
  }

  function validate(form) {
    var ok = true;
    var firstInvalid = null;

    var nameInput = form.elements['guest-name'];
    if (!nameInput.value.trim() || nameInput.value.length > 80) {
      setError(nameInput, 'rsvp-name', 'Please tell us your name.');
      firstInvalid = nameInput;
      ok = false;
    }

    var group = form.querySelectorAll('input[name="attending"]');
    var answered = Array.prototype.some.call(group, function (input) { return input.checked; });
    if (!answered) {
      setError(group[0], 'attending', 'Please choose one.');
      if (!firstInvalid) { firstInvalid = group[0]; }
      ok = false;
    }

    if (firstInvalid) { firstInvalid.focus(); }

    return ok;
  }

  function setError(input, errorFor, message) {
    var error = document.querySelector('[data-error-for="' + errorFor + '"]');
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    if (input) { input.setAttribute('aria-invalid', 'true'); }
  }

  function clearErrorOnInput(form) {
    form.addEventListener('input', function (event) {
      var target = event.target;
      if (target.name === 'guest-name' && target.getAttribute('aria-invalid') === 'true') {
        target.removeAttribute('aria-invalid');
        hideError('rsvp-name');
      }
    });
    form.addEventListener('change', function (event) {
      if (event.target.name !== 'attending') { return; }
      hideError('attending');
      Array.prototype.forEach.call(
        form.querySelectorAll('input[name="attending"]'),
        function (input) { input.removeAttribute('aria-invalid'); }
      );
    });
  }

  function hideError(errorFor) {
    var error = document.querySelector('[data-error-for="' + errorFor + '"]');
    if (error) { error.hidden = true; }
  }

  /* --------------------------------------------------------- sticky RSVP --- */

  function initStickyRsvp() {
    var sticky = document.querySelector('[data-sticky-rsvp]');
    var form = document.getElementById('rsvp-form');
    var closed = document.getElementById('rsvp-closed');
    if (!sticky || !form) { return; }

    if (new Date().getTime() >= RSVP_DEADLINE.getTime()) { return; }
    if (!('IntersectionObserver' in window)) { sticky.hidden = false; return; }

    var inView = false;
    var scrolled = false;

    var update = function () {
      var show = scrolled && !inView;
      sticky.hidden = !show;
    };

    var onScroll = function () {
      scrolled = window.scrollY > 200;
      update();
    };

    var observer = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      update();
    }, { rootMargin: '-25% 0px -25% 0px' });

    observer.observe(form);
    if (closed && !closed.hidden) { observer.observe(closed); }

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  /* ------------------------------------------------------------- reveal --- */

  function initReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    revealItems = items;
    if (!items.length) { return; }

    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealAll(items);
      return;
    }

    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

    observeReveals();

    // js/intro.js keeps the cards out of sight until the spoken line has ended;
    // re-arm the observer once they are actually on screen.
    document.addEventListener('christening:intro-complete', observeReveals);
  }

  function observeReveals() {
    if (!revealObserver) { return; }
    Array.prototype.forEach.call(revealItems, function (item) {
      if (item.classList.contains('is-revealed')) { return; }
      revealObserver.unobserve(item);
      revealObserver.observe(item);
    });
  }

  function revealAll(items) {
    Array.prototype.forEach.call(items, function (item) {
      item.classList.add('is-revealed');
    });
  }
}());
