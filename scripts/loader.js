/* ===========================================================================
   drumssand.me — shared loader (zero-build)
   Runs on every page: randomises the profile photo + the background sketch,
   credits the sketch as named work, and installs the UI shield that keeps
   links and scrolling clickable under interactive p5 sketches.
   Loaded with `defer`, after the deferred p5.js script.
   =========================================================================== */
(function () {
  'use strict';

  // --- profile photo (landing only; the node is absent elsewhere) -----------
  var profileImages = ['/assets/profile.jpeg', '/assets/profile2.jpg'];
  var imgEl = document.getElementById('profile-pic');
  if (imgEl) {
    var pick = profileImages[Math.floor(Math.random() * profileImages.length)];
    imgEl.onerror = function () { this.style.display = 'none'; };
    imgEl.src = pick;
  }

  // --- the live installation: one random sketch per load ---------------------
  var sketches = [
    '/sketches/draw_flow.js',
    '/sketches/adhd_wave.js',
    '/sketches/hard_noise.js',
    '/sketches/paint.js',
    '/sketches/the_wall.js',
    '/sketches/garden.js',
    '/sketches/cloth.js'
  ];
  var randomSketch = sketches[Math.floor(Math.random() * sketches.length)];

  // Name the work: write the chosen sketch's filename into the credit slot.
  var creditEl = document.querySelector('[data-sketch-credit]');
  if (creditEl) {
    creditEl.textContent = randomSketch.split('/').pop();
  }

  // --- UI shield --------------------------------------------------------------
  // p5 binds mousedown/touchstart/etc. to `window` with { passive: false }.
  // Interactive sketches return false from those handlers, so p5 calls
  // preventDefault() on EVERY pointer-down — cancelling the synthesized click
  // on our links and blocking native scroll on interior pages.
  // Fix: stop those events from bubbling out of the interactive UI to window,
  // so p5 never sees them there. We don't preventDefault, so links and scroll
  // keep working; the rest of the canvas stays fully interactive.
  function installShield() {
    var types = ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup'];
    var nodes = document.querySelectorAll('[data-ui]');
    Array.prototype.forEach.call(nodes, function (node) {
      types.forEach(function (type) {
        node.addEventListener(type, function (e) { e.stopPropagation(); });
      });
    });
  }

  // Toggle the frosted bar on the interior-page header only once it pins to
  // the top — transparent and roomy at rest, thin frost when stuck (iOS feel).
  function initStickyHeader() {
    var header = document.querySelector('.running-mark');
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle('is-stuck', window.scrollY >= header.offsetTop - 1);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function init() {
    installShield();
    initStickyHeader();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // --- performance / accessibility helpers -----------------------------------
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // Pause the render loop while the tab is backgrounded — saves battery/CPU on
  // mobile. Don't resume for reduced-motion users (they get a still canvas).
  document.addEventListener('visibilitychange', function () {
    var p = window._p5Instance;
    if (!p) return;
    if (document.hidden) {
      if (p.noLoop) p.noLoop();
    } else if (p.loop && !prefersReducedMotion()) {
      p.loop();
    }
  });

  // For reduced-motion users: let the sketch settle into an image, then hold
  // still instead of animating forever.
  function holdStillIfReduced() {
    if (!prefersReducedMotion()) return;
    var p = window._p5Instance;
    if (!p || !p.noLoop) return;
    var ticks = 0;
    (function settle() {
      if (ticks++ < 60) {
        requestAnimationFrame(settle);
      } else {
        try { p.noLoop(); } catch (e) { /* sketch has no draw loop */ }
      }
    })();
  }

  // --- start p5 once the sketch script has loaded ----------------------------
  // p5's auto-init already ran on 'load' without finding setup(), so we
  // instantiate it manually after injecting the chosen sketch.
  window.addEventListener('load', function () {
    var script = document.createElement('script');
    script.src = randomSketch;
    script.onload = function () {
      if (typeof setup === 'function' && !window._p5Instance) {
        window._p5Instance = new p5();
        holdStillIfReduced();
      }
    };
    document.body.appendChild(script);
  });
})();
