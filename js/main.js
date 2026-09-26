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

  var onReady = function (fn) {
    if (document.readyState !== 'loading') { fn(); }
    else { document.addEventListener('DOMContentLoaded', fn); }
  };

  onReady(function () {
    initForm();
    initStickyRsvp();
    initReveal();
  });

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

      if (!validate(form)) { return; }

      // No fetch (very old browser, or blocked): use the plain HTML form POST.
      if (typeof window.fetch !== 'function' || typeof window.URLSearchParams !== 'function') {
        form.submit();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.setAttribute('aria-disabled', 'true');
      submitBtn.textContent = 'Sending…';
      status.textContent = '';

      var payload = new URLSearchParams(new FormData(form)).toString();

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload
      }).then(function (response) {
        // Fall through to the native POST (success.html) if Netlify did not accept it.
        if (!response.ok) { form.submit(); return; }
        showThanks(form, thanks, thanksMessage, status);
      })['catch'](function () {
        // Offline, blocked, or the request failed: let the browser post the form.
        form.submit();
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
    if (!items.length) { return; }

    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealAll(items);
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });

    Array.prototype.forEach.call(items, function (item) { observer.observe(item); });
  }

  function revealAll(items) {
    Array.prototype.forEach.call(items, function (item) {
      item.classList.add('is-revealed');
    });
  }
}());
