/* דניאל אבי צדק — header behaviour: shrink on scroll, mega menu, mobile drawer. */
(function () {
  'use strict';

  var header = document.querySelector('[data-dat-header]');
  if (!header) return;

  /* ---- Smooth scroll (Lenis) ---------------------------------------------- */
  var lenis = null;
  if (window.Lenis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    lenis = new window.Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    window.__datLenis = lenis;   // the gift popup pauses the page scroll through this
    var lraf = function (t) { lenis.raf(t); requestAnimationFrame(lraf); };
    requestAnimationFrame(lraf);
  }

  /* ---- Shrink on scroll (hysteresis so the height change cannot flicker) -- */
  var stuck = false;
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (!stuck && y > 48) { stuck = true; header.classList.add('is-stuck'); }
    else if (stuck && y < 16) { stuck = false; header.classList.remove('is-stuck'); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mega menu ---------------------------------------------------------- */
  var megaItem = header.querySelector('[data-dat-mega]');
  var megaBtn = megaItem ? megaItem.querySelector('[aria-controls]') : null;

  function setMega(open, viaClick) {
    if (!megaItem) return;
    megaBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (viaClick || !open) megaItem.classList.toggle('is-open', open);
  }
  if (megaItem) {
    megaItem.addEventListener('mouseenter', function () { megaBtn.setAttribute('aria-expanded', 'true'); });
    megaItem.addEventListener('mouseleave', function () { setMega(false); });
    megaBtn.addEventListener('click', function () {
      setMega(!megaItem.classList.contains('is-open'), true);
    });
    megaItem.addEventListener('focusout', function (e) {
      if (!megaItem.contains(e.relatedTarget)) setMega(false);
    });
  }

  /* ---- Mobile drawer ------------------------------------------------------ */
  var drawer = document.getElementById('dat-drawer');
  var burger = header.querySelector('[data-dat-drawer-open]');
  var closeBtn = drawer ? drawer.querySelector('[data-dat-drawer-close]') : null;

  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    if (open) { drawer.removeAttribute('inert'); drawer.removeAttribute('aria-hidden'); }
    else { drawer.setAttribute('inert', ''); drawer.setAttribute('aria-hidden', 'true'); }
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) closeBtn.focus(); else burger.focus();
  }
  if (drawer) {
    burger.addEventListener('click', function () { setDrawer(true); });
    closeBtn.addEventListener('click', function () { setDrawer(false); });
    /* accordion */
    var acc = drawer.querySelector('[data-dat-acc]');
    var sub = acc ? document.getElementById(acc.getAttribute('aria-controls')) : null;
    if (acc && sub) {
      acc.addEventListener('click', function () {
        var open = acc.getAttribute('aria-expanded') !== 'true';
        acc.setAttribute('aria-expanded', open ? 'true' : 'false');
        sub.hidden = !open;
      });
    }
    /* keep Tab inside the open drawer */
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = drawer.querySelectorAll('a[href], button:not([disabled])');
      var list = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && drawer.classList.contains('is-open')) setDrawer(false);
    else if (megaItem && megaBtn.getAttribute('aria-expanded') === 'true') { setMega(false); megaBtn.focus(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024 && drawer && drawer.classList.contains('is-open')) setDrawer(false);
  });

  /* ---- Hero video: keep it playing (poster only for reduced motion / data saver) ---- */
  var hero = document.querySelector('.dat-hero__video');
  if (hero) {
    var conn = navigator.connection || {};
    var still = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || conn.saveData;
    var go = function () { var p = hero.play(); if (p && p.catch) p.catch(function () {}); };
    if (still) { hero.removeAttribute('autoplay'); hero.pause(); }
    else {
      hero.addEventListener('pause', function () { if (!document.hidden) go(); });
      hero.addEventListener('ended', go);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) go(); });
      go();
    }
  }

  /* ---- Shelf: tabs + endless carousel with a very slow ambient drift ---- */
  var shelf = document.querySelector('[data-dat-shelf]');
  if (shelf) {
    var tabs = document.querySelectorAll('.dat-tab');
    var next = shelf.querySelector('.dat-shelf__arrow--next');
    var prev = shelf.querySelector('.dat-shelf__arrow--prev');
    var SGN = -1; /* RTL: scrollLeft runs negative */
    var resumeAt = 0, hovering = false, seen = true, drift = null, last = 0;
    var SPEED = 15; /* drift, px per second */
    var track = function () { return shelf.querySelector('.dat-shelf__track:not([hidden])'); };
    var period = function (t) {
      var s = t.querySelector('.dat-slide');
      var gap = parseFloat(getComputedStyle(t).columnGap) || 0;
      return (s.getBoundingClientRect().width + gap) * t.__n;
    };
    var setup = function (t) {
      if (!t || t.__n || !t.clientWidth) return;
      var slides = t.querySelectorAll('.dat-slide');
      if (!slides.length) return;
      t.__n = slides.length;
      for (var k = 0; k < 2; k++) {
        Array.prototype.forEach.call(slides, function (s) {
          var c = s.cloneNode(true); c.setAttribute('aria-hidden', 'true'); if (c.tagName === 'A') c.tabIndex = -1; t.appendChild(c);
        });
      }
      t.scrollLeft = SGN * period(t);
    };
    var norm = function (t) {
      if (!t || !t.__n) return;
      var w = period(t), d = SGN * t.scrollLeft;
      if (d < 0.5 * w) d += w; else if (d > 2 * w) d -= w; else return;
      t.scrollLeft = SGN * d;
    };
    var sync = function () {
      var t = track(); if (!t) return;
      setup(t);
      var m = t.querySelector('.dat-card__media');
      if (m) shelf.style.setProperty('--arrow-y', (m.offsetHeight / 2 - 22) + 'px');
    };
    var go = function (dir) { resumeAt = performance.now() + 4000; var t = track(); setup(t); t.scrollBy({ left: dir * t.clientWidth * 0.8, behavior: 'smooth' }); };
    next.addEventListener('click', function () { go(-1); });
    prev.addEventListener('click', function () { go(1); });
    var timer;
    shelf.addEventListener('scroll', function (e) {
      var t = e.target;
      if (!t.classList || !t.classList.contains('dat-shelf__track')) return;
      clearTimeout(timer); timer = setTimeout(function () { norm(t); }, 120);
    }, true);
    window.addEventListener('resize', sync);
    window.addEventListener('load', function () {
      sync();
      /* preload every photo (including the hover ones) so the swap is instant */
      Array.prototype.forEach.call(shelf.querySelectorAll('img[loading="lazy"]'), function (i) { i.loading = 'eager'; });
    });
    var pick = function (tab) {
      tabs.forEach(function (b) {
        var on = b === tab;
        b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
        document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
      });
      resumeAt = performance.now() + 1500;
      var t = track(); setup(t);
      if (t) t.scrollLeft = t.__n ? SGN * period(t) : 0;
      sync();
    };
    tabs.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(b); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowLeft' ? 1 : e.key === 'ArrowRight' ? -1 : 0; if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); pick(n);
      });
    });
    /* Drift: keeps moving on hover; pauses only on wheel, touch, click and arrows; off for reduced motion / data saver */
    var calm = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || (navigator.connection && navigator.connection.saveData);
    if (!calm) {
      var bump = function () { resumeAt = performance.now() + 3000; };
      ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (n) { shelf.addEventListener(n, bump, { passive: true }); });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { seen = e[0].isIntersecting; }, { threshold: 0.1 }).observe(shelf);
      var tick = function (ts) {
        requestAnimationFrame(tick);
        var dt = Math.min(ts - last, 64); last = ts;
        var t = track();
        if (!t || !t.__n || !seen || hovering || ts < resumeAt) { drift = null; return; }
        if (drift === null) drift = SGN * t.scrollLeft;
        drift += SPEED * dt / 1000;
        var w = period(t);
        if (drift > 2 * w) drift -= w;
        t.scrollLeft = SGN * drift;
      };
      requestAnimationFrame(function (ts) { last = ts; requestAnimationFrame(tick); });
    }
    sync();
  }

  /* ---- Scroll swap: progress 0..1 while the section scrolls past, sticky just under the header ---- */
  var swap = document.querySelector('.dat-swap');
  if (swap) {
    var sraf = 0;
    var supdate = function () {
      sraf = 0;
      if (header.classList.contains('is-stuck')) swap.style.setProperty('--swap-top', Math.round(header.getBoundingClientRect().bottom) + 'px');
      var stage = swap.firstElementChild;
      var r = swap.getBoundingClientRect();
      var top = parseFloat(getComputedStyle(stage).top) || 0;
      var run = r.height - stage.offsetHeight;
      var p = run > 0 ? Math.min(1, Math.max(0, (top - r.top) / run)) : 0;
      swap.style.setProperty('--p', (p * p * (3 - 2 * p)).toFixed(4));
    };
    var squeue = function () { if (!sraf) sraf = requestAnimationFrame(supdate); };
    window.addEventListener('scroll', squeue, { passive: true });
    window.addEventListener('resize', squeue);
    if ('ResizeObserver' in window) new ResizeObserver(squeue).observe(header);
    supdate();
  }

  /* ---- Best Sellers ring: cards on a concave 3D ring (button, dot, drag, arrow keys rotate it) ---- */
  document.querySelectorAll('.dat-ring').forEach(function (rr) {
    var stage = rr.querySelector('.dat-ring__stage');
    var originals = Array.prototype.slice.call(stage.querySelectorAll('.dat-ring__card'));
    var n = originals.length, prevB = rr.querySelector('.dat-ring__prev'), nextB = rr.querySelector('.dat-ring__next'), navBox = rr.querySelector('.dat-ring__nav');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var cards = originals.slice(), L = n, pos = 0, target = 0, raf = 0, S = {}, sig = '', W = 1, pitch = 1, R = 1, P = 1, step = .35, drag = null, lastActive = -1;
    var wrap = function (x, m) { return ((x % m) + m) % m; };
    var attr = function (k, a, b, d) { var v = parseFloat(rr.getAttribute('data-ring-' + k)); if (!isFinite(v)) v = d; return Math.min(b, Math.max(a, v)); };

    function settings() {
      W = originals[0].offsetWidth || 1;
      var gap = parseFloat(getComputedStyle(stage).columnGap); if (!isFinite(gap)) gap = W * .09;
      S = { angle: attr('angle', 4, 40, 20), depth: attr('depth', 1.5, 30, 6.5), duration: attr('duration', 0, 5, 1), drag: attr('drag', .2, 4, 1), gap: Math.min(W * .8, Math.max(0, gap)), dir: getComputedStyle(rr).direction === 'ltr' ? 1 : -1 };
      var s = JSON.stringify(S) + W + 'x' + stage.clientWidth;
      if (s !== sig) { sig = s; layout(); render(); fit(); }
    }
    /* mobile: size the stage to the tallest card (2-line names make some cards taller), then reserve exactly the little the
       side cards still swing past it, plus a 12px gap. Desktop keeps the CSS height. */
    function fit() {
      if (!window.matchMedia('(max-width: 767px)').matches) {
        stage.style.removeProperty('height'); rr.style.removeProperty('--ring-over-top'); rr.style.removeProperty('--ring-over-bot'); return;
      }
      var hmax = 0;
      cards.forEach(function (c) { hmax = Math.max(hmax, c.offsetHeight); });
      if (hmax) stage.style.height = hmax + 'px';
      var sr = stage.getBoundingClientRect(), up = 0, down = 0;
      cards.forEach(function (c) {
        if (c.style.visibility === 'hidden') return;
        var r = c.getBoundingClientRect();
        if (r.right <= 0 || r.left >= window.innerWidth) return;   // cards swung fully off screen cannot touch the text
        up = Math.max(up, sr.top - r.top); down = Math.max(down, r.bottom - sr.bottom);
      });
      rr.style.setProperty('--ring-over-top', Math.ceil(up) + 'px'); rr.style.setProperty('--ring-over-bot', Math.ceil(down) + 'px');
    }
    function layout() {
      pitch = W + S.gap; step = S.angle * Math.PI / 180; R = pitch / Math.sin(step); P = S.depth * W;
      stage.style.perspective = P + 'px';
      var reach = Math.min(Math.ceil(stage.clientWidth / 2 / pitch) + 2, Math.floor(84 / S.angle));
      var k = Math.max(1, Math.ceil((2 * reach + 1) / n));
      if (n * k !== L) {
        cards.forEach(function (c) { if (c.classList.contains('is-clone')) c.remove(); });
        cards = originals.slice();
        for (var r = 1; r < k; r++) originals.forEach(function (o) {
          var c = o.cloneNode(true); c.classList.add('is-clone'); c.setAttribute('aria-hidden', 'true');
          c.tabIndex = -1; stage.appendChild(c); cards.push(c);
        });
        var old = L; L = n * k; var shift = Math.round(pos) - wrap(Math.round(pos), n); pos -= shift; target -= shift;
        if (old !== L && L < old) { pos = wrap(pos, n); target = pos; }
      }
    }
    function render() {
      var edge = Math.PI * .4;
      cards.forEach(function (el, v) {
        var d = wrap(v - pos + L / 2, L) - L / 2, a = d * step * S.dir, x = R * Math.sin(a), z = R * (1 - Math.cos(a));
        var fade = Math.min(1, (edge - Math.abs(d * step)) / .175), hidden = fade <= 0 || z > P * .8;
        el.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(2) + 'px,0,' + z.toFixed(2) + 'px) rotateY(' + (-a).toFixed(4) + 'rad)';
        el.style.visibility = hidden ? 'hidden' : '';
        el.style.opacity = hidden || fade >= 1 ? '' : fade.toFixed(3);
        el.style.zIndex = String(1000 - Math.round(Math.abs(d) * 10));
      });
      var active = wrap(Math.round(pos), n);
      if (active !== lastActive) { lastActive = active; dots.forEach(function (b, i) { b.classList.toggle('is-active', i === active); b.setAttribute('aria-current', i === active ? 'true' : 'false'); }); }
    }

    var dotsBox = document.createElement('div'); dotsBox.className = 'dat-ring__dots'; dotsBox.setAttribute('role', 'group');
    var dots = originals.map(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'dat-ring__dot';
      b.setAttribute('aria-label', c.querySelector('.dat-card__name').textContent + ' (' + (i + 1) + '/' + n + ')');
      b.addEventListener('click', function () { var dd = i - wrap(Math.round(target), n); if (dd > n / 2) dd -= n; if (dd < -n / 2) dd += n; go(dd); });
      dotsBox.appendChild(b); return b;
    });
    navBox.appendChild(dotsBox);

    function animate() {
      cancelAnimationFrame(raf);
      var dur = reduce.matches ? 0 : S.duration;
      if (dur <= 0) { pos = target; render(); return; }
      var from = pos, t0 = performance.now();
      var tick = function (t) { var k = Math.min(1, (t - t0) / (dur * 1000)); pos = from + (target - from) * (1 - Math.pow(1 - k, 4)); render(); if (k < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    }
    function go(delta) { target = Math.round(target) + delta; animate(); }
    if (prevB) prevB.addEventListener('click', function () { go(-1); });
    if (nextB) nextB.addEventListener('click', function () { go(1); });
    rr.tabIndex = 0;
    rr.addEventListener('keydown', function (e) { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); go((e.key === 'ArrowLeft' ? 1 : -1) * (S.dir === -1 ? 1 : -1)); });

    stage.addEventListener('pointerdown', function (e) { if (e.button !== 0) return; cancelAnimationFrame(raf); drag = { id: e.pointerId, x: e.clientX, p0: pos, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false }; });
    stage.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return; var dx = e.clientX - drag.x;
      if (!drag.moved) { if (Math.abs(dx) < 5) return; drag.moved = true; rr.classList.add('is-dragging'); try { stage.setPointerCapture(e.pointerId); } catch (_) {} }
      var dt = Math.max(1, e.timeStamp - drag.lt); drag.v = drag.v * .6 + ((e.clientX - drag.lx) / dt) * .4; drag.lx = e.clientX; drag.lt = e.timeStamp;
      pos = drag.p0 - S.dir * dx / pitch * S.drag; target = pos; render();
    });
    var release = function (e) {
      if (!drag || e.pointerId !== drag.id) return; var d = drag; drag = null; rr.classList.remove('is-dragging');
      if (!d.moved) { if (Math.round(target) !== target) { target = Math.round(target); animate(); } return; }
      var fling = Math.max(-2, Math.min(2, -S.dir * d.v * 140 / pitch * S.drag));
      target = Math.round(pos + fling); animate();
      stage.addEventListener('click', function (ev) { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
    };
    stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
    stage.addEventListener('dragstart', function (e) { e.preventDefault(); });

    settings(); render(); fit();
    window.addEventListener('load', fit); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    if ('ResizeObserver' in window) new ResizeObserver(settings).observe(stage); else window.addEventListener('resize', settings);
  });

  /* ---- Feature + linear marquee: constant drift, arrows nudge it one card ---- */
  document.querySelectorAll('.dat-line').forEach(function (line) {
    var track = line.querySelector('.dat-line__track');
    var items = track.querySelectorAll('.dat-line__item'), n = items.length / 2;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var SPEED = 40, step = 1, period = 1, pos = 0, tween = null, last = 0;
    var measure = function () {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 20;
      step = items[0].offsetWidth + gap; period = step * n;
    };
    var apply = function () { track.style.transform = 'translateX(' + (((pos % period) + period) % period).toFixed(2) + 'px)'; };
    var ease = function (t) { return 1 - Math.pow(1 - t, 4); };
    var tick = function (t) {
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      if (!reduce) pos += SPEED * dt;
      if (tween) {
        var k = Math.min(1, (t - tween.t0) / 900), e = ease(k);
        pos += tween.d * (e - tween.e); tween.e = e;
        if (k >= 1) tween = null;
      }
      apply(); requestAnimationFrame(tick);
    };
    var nudge = function (dir) { if (tween) { pos += tween.d * (1 - tween.e); } tween = { t0: performance.now(), d: dir * step, e: 0 }; };
    line.querySelector('.dat-line__arrow--next').addEventListener('click', function () { nudge(1); });
    line.querySelector('.dat-line__arrow--prev').addEventListener('click', function () { nudge(-1); });
    measure(); window.addEventListener('resize', measure);
    requestAnimationFrame(tick);
  });

  /* ---- About scroll sequence: scroll scrubs the ring frames; each step holds on a pose and lights its hotspot ---- */
  (function () {
    var seq = document.getElementById('dat-seq'); if (!seq) return;
    var canvas = seq.querySelector('.dat-seq__canvas'), ctx = canvas.getContext('2d');
    var stage = seq.querySelector('.dat-seq__stage');
    var steps = seq.querySelectorAll('.dat-seq__step');
    var N = parseInt(seq.getAttribute('data-frames'), 10) || 1, K = steps.length;
    var stops = (seq.getAttribute('data-stops') || '').split(',').map(parseFloat);
    var frames = [], started = false, drawn = -1, wanted = 0, active = -1, sraf = 0;
    var chars = Array.prototype.map.call(steps, function (el) {
      var words = el.textContent.split(' '), out = [];
      el.setAttribute('aria-label', el.textContent); el.textContent = '';
      words.forEach(function (w, wi) {
        var ws = document.createElement('span'); ws.className = 'dat-seq__word'; ws.setAttribute('aria-hidden', 'true');
        Array.prototype.forEach.call(w, function (c) { var s = document.createElement('span'); s.className = 'dat-seq__ch'; s.textContent = c; ws.appendChild(s); out.push(s); });
        el.appendChild(ws);
        if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
        if (parseInt(el.getAttribute('data-br'), 10) === wi + 1) el.appendChild(document.createElement('br'));
      });
      return out;
    });
    var shown = [];
    var reveal = function (i, r) {          // light the letters of line i up to fraction r
      var list = chars[i], n = Math.round(r * list.length);
      if (shown[i] === n) return; shown[i] = n;
      for (var c = 0; c < list.length; c++) list[c].style.opacity = c < n ? '1' : '';
    };
    var MOVE = 0.6;   // share of each step spent turning; the rest holds the pose with the hotspot on
    var src = function (i) { var n = String(i + 1); while (n.length < 3) n = '0' + n; return 'assets/seq/' + n + '.webp'; };
    var draw = function () {
      var i = wanted, img = frames[i];
      if (!img || !img.complete || !img.naturalWidth) {        // nearest frame that has loaded
        for (var d = 1; d < N; d++) {
          var a = frames[i - d], b = frames[i + d];
          if (a && a.complete && a.naturalWidth) { img = a; i -= d; break; }
          if (b && b.complete && b.naturalWidth) { img = b; i += d; break; }
        }
      }
      if (!img || !img.complete || !img.naturalWidth || i === drawn) return;
      drawn = i; ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    var load = function () {
      if (started) return; started = true;
      for (var i = 0; i < N; i++) (function (i) {
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { if (Math.abs(i - wanted) < 3 || drawn < 0) { drawn = -1; draw(); } };
        im.src = src(i); frames[i] = im;
      })(i);
    };
    var update = function () {
      sraf = 0;
      if (header.classList.contains('is-stuck')) seq.style.setProperty('--seq-top', Math.round(header.getBoundingClientRect().bottom) + 'px');
      var r = seq.getBoundingClientRect(), top = parseFloat(getComputedStyle(stage).top) || 0;
      var run = r.height - stage.offsetHeight;
      var p = run > 0 ? Math.min(1, Math.max(0, (top - r.top) / run)) : 0;
      seq.style.setProperty('--seq-p', p.toFixed(4));
      var seg = Math.min(K - 1, Math.floor(p * K)), t = p * K - seg;
      var from = seg === 0 ? stops[0] : stops[seg - 1], to = stops[seg];
      var k = seg === 0 ? 1 : Math.min(1, t / MOVE);
      k = k * k * (3 - 2 * k);
      wanted = Math.round((from + (to - from) * k) * (N - 1));
      var rv = seg === 0 ? t / 0.6 : (t - MOVE * 0.3) / (MOVE * 0.7 + 0.12);
      for (var s = 0; s < K; s++) reveal(s, s < seg ? 1 : s > seg ? 0 : Math.min(1, Math.max(0, rv)));
      var on = (seg === 0 || t >= MOVE * 0.85) ? seg : -1;
      if (on !== active) {
        active = on;
        for (var i = 0; i < K; i++) { steps[i].classList.toggle('is-on', i === (on < 0 ? seg : on)); }
      }
      if (r.top < window.innerHeight * 2.5 && r.bottom > -window.innerHeight) load();
      draw();
    };
    var queue = function () { if (!sraf) sraf = requestAnimationFrame(update); };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  })();

  /* ---- Footer form: opens WhatsApp with the details filled in (catalog site, no server) ---- */
  (function () {
    var form = document.querySelector('[data-dat-wa-form]'); if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name, phone = form.elements.phone, msg = form.elements.message;
      if (!name.value.trim()) { name.focus(); return; }
      if (!phone.value.trim()) { phone.focus(); return; }
      var text = 'היי, שמי ' + name.value.trim() + '. טלפון: ' + phone.value.trim() + (msg.value.trim() ? '. ' + msg.value.trim() : '');
      window.open('https://wa.me/972545053903?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  })();

  /* ---- Background music: starts on the first tap/click (browsers block autoplay), button turns it off and on ---- */
  (function () {
    var btn = document.getElementById('dat-sound'); if (!btn) return;
    var KEY = 'dat-music', TARGET = 0.28, FADE = 3, audio = null, playing = false, wanted = true, raf = 0;
    var read = function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
    var save = function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} };
    var paint = function () {
      btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      btn.setAttribute('aria-label', playing ? 'כיבוי מוזיקת רקע' : 'הפעלת מוזיקת רקע');
    };
    var level = function () {
      raf = 0; if (!audio || !playing) return;
      var d = audio.duration || 0, t = audio.currentTime || 0, k = 1;
      if (d) k = Math.max(0, Math.min(1, t / FADE, (d - t) / FADE));   // soft edges so the loop never clicks
      audio.volume = Math.min(1, TARGET * k * (audio._master === undefined ? 1 : audio._master));
      raf = requestAnimationFrame(level);
    };
    var ramp = function (to, ms, done) {   // quick fade for on/off
      var from = audio._master === undefined ? 1 : audio._master, t0 = performance.now();
      var step = function (t) { var k = Math.min(1, (t - t0) / ms); audio._master = from + (to - from) * k; if (!raf) audio.volume = Math.min(1, TARGET * audio._master); if (k < 1) requestAnimationFrame(step); else if (done) done(); };
      requestAnimationFrame(step);
    };
    var play = function () {
      if (!audio) { audio = new Audio('assets/audio/ambience.mp3'); audio.loop = true; audio.preload = 'auto'; audio._master = 0; }
      var p = audio.play();
      if (p && p.then) p.then(function () { playing = true; paint(); ramp(1, 1400); if (!raf) raf = requestAnimationFrame(level); }, function () { playing = false; paint(); });
    };
    var stop = function () { if (!audio) return; playing = false; paint(); ramp(0, 600, function () { audio.pause(); }); };
    btn.addEventListener('click', function (e) {
      e.stopPropagation(); started = true;
      if (playing) { wanted = false; save('off'); stop(); } else { wanted = true; save('on'); play(); }
    });
    var started = false;
    var first = function (e) {
      if (started) return; if (e.target && btn.contains(e.target)) return; started = true;
      if (read() !== 'off') play();
      off();
    };
    var evs = ['pointerdown', 'keydown', 'touchstart'];
    var off = function () { evs.forEach(function (n) { document.removeEventListener(n, first, true); }); };
    evs.forEach(function (n) { document.addEventListener(n, first, true); });
    document.addEventListener('visibilitychange', function () {
      if (!audio) return;
      if (document.hidden) { if (playing) audio.pause(); } else if (playing && audio.paused) audio.play().catch(function () {});
    });
    paint();
  })();

  /* ---- Mobile only: category tabs can be dragged sideways (touch scrolls natively; this adds mouse/pen drag) ---- */
  (function () {
    var bar = document.querySelector('.dat-tabs'); if (!bar) return;
    var mq = window.matchMedia('(max-width: 767px)'), d = null;
    bar.addEventListener('pointerdown', function (e) {
      if (!mq.matches || e.pointerType === 'touch' || e.button !== 0) return;
      d = { x: e.clientX, s: bar.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!d) return; var dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) < 5) return; d.moved = true; bar.classList.add('is-dragging');
      bar.scrollLeft = d.s + (getComputedStyle(bar).direction === 'rtl' ? dx : -dx);   // RTL scrollLeft runs negative
    });
    var end = function () { if (!d) return; var m = d.moved; d = null; if (m) setTimeout(function () { bar.classList.remove('is-dragging'); }, 0); };
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    // keep the chosen tab in view
    bar.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('.dat-tab') : null;
      if (t && mq.matches) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
  })();

  /* ---- Mobile only: tap a model panel to open or close its details (one open at a time) ---- */
  (function () {
    var panels = document.querySelectorAll('.dat-panel'); if (!panels.length) return;
    var mq = window.matchMedia('(max-width: 767px)');
    var toggle = function (p) {
      var open = !p.classList.contains('is-open');
      Array.prototype.forEach.call(panels, function (o) { o.classList.remove('is-open'); });
      p.classList.toggle('is-open', open);
    };
    Array.prototype.forEach.call(panels, function (p) {
      p.addEventListener('click', function (e) { if (!mq.matches || (e.target.closest && e.target.closest('a'))) return; toggle(p); });
      p.addEventListener('keydown', function (e) { if (!mq.matches || (e.key !== 'Enter' && e.key !== ' ') || e.target !== p) return; e.preventDefault(); toggle(p); });
    });
    var clear = function () { if (!mq.matches) Array.prototype.forEach.call(panels, function (o) { o.classList.remove('is-open'); }); };
    if (mq.addEventListener) mq.addEventListener('change', clear);
  })();

  /* ---- Gift popup questionnaire: 3 steps, multiple choice, ends in a WhatsApp message with the answers ---- */
  (function () {
    var modal = document.getElementById('dat-quiz'); if (!modal) return;
    var opener = document.querySelector('[data-dat-quiz-open]'), card = modal.querySelector('.dat-quiz__card');
    var panes = modal.querySelectorAll('.dat-quiz__pane'), bars = modal.querySelectorAll('.dat-quiz__bar i'), num = modal.querySelector('[data-quiz-num]');
    var send = modal.querySelector('[data-quiz-send]'), step = 0, answers = [];
    var show = function (i) {
      step = i;
      Array.prototype.forEach.call(panes, function (p, k) { p.classList.toggle('is-on', k === i); });
      Array.prototype.forEach.call(bars, function (b, k) { b.classList.toggle('is-on', k <= i); });
      num.textContent = String(i + 1);
      var first = panes[i].querySelector('[aria-checked="true"]') || panes[i].querySelector('.dat-quiz__opts button');
      if (first) first.focus({ preventScroll: true });
    };
    var reset = function () {
      answers = [];
      Array.prototype.forEach.call(modal.querySelectorAll('.dat-quiz__opts button'), function (b) { b.setAttribute('aria-checked', 'false'); });
      send.disabled = true; show(0);
    };
    var open = function () {
      modal.hidden = false; modal.removeAttribute('inert'); void modal.offsetWidth;
      modal.classList.add('is-open'); document.documentElement.style.overflow = 'hidden';
      if (window.__datLenis) window.__datLenis.stop();
      reset();
    };
    var close = function () {
      modal.classList.remove('is-open'); modal.setAttribute('inert', ''); document.documentElement.style.overflow = '';
      if (window.__datLenis) window.__datLenis.start();
      setTimeout(function () { if (!modal.classList.contains('is-open')) modal.hidden = true; }, 380);
      if (opener) opener.focus({ preventScroll: true });
    };
    if (opener) opener.addEventListener('click', open);
    Array.prototype.forEach.call(modal.querySelectorAll('[data-dat-quiz-close]'), function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = card.querySelectorAll('button:not([disabled])'), vis = Array.prototype.filter.call(f, function (n) { return n.offsetParent !== null; });
      if (!vis.length) return; var a = vis[0], z = vis[vis.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    Array.prototype.forEach.call(panes, function (p, i) {
      Array.prototype.forEach.call(p.querySelectorAll('.dat-quiz__opts button'), function (b) {
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(p.querySelectorAll('.dat-quiz__opts button'), function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
          answers[i] = b.getAttribute('data-v');
          if (i < 2) setTimeout(function () { show(i + 1); }, 260); else send.disabled = false;
        });
      });
    });
    Array.prototype.forEach.call(modal.querySelectorAll('[data-quiz-back]'), function (b) { b.addEventListener('click', function () { show(Math.max(0, step - 1)); }); });
    send.addEventListener('click', function () {
      if (answers.length < 3 || !answers[0] || !answers[1] || !answers[2]) return;
      var t = 'היי, ענו על השאלון באתר.\nמחפש/ת: ' + answers[0] + '\nאירוע: ' + answers[1] + '\nתקציב: ' + answers[2] + '\nאשמח להצעה מותאמת אישית.';
      window.open('https://wa.me/972545053903?text=' + encodeURIComponent(t), '_blank', 'noopener');
      close();
    });
  })();
})();
