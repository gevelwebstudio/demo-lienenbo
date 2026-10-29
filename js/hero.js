/* Lien & Bo: scroll-film in de hero. De bulldogs rennen op je af terwijl je scrolt (sfeerbeeld met AI op basis van de Funda-foto).
   10k-websites-standaard: Blob-fetch, afgevlakte tijd in een rAF-lus, seeks die nooit overlappen,
   statische hero bij reduced motion, data saver of als de film mislukt. */
(() => {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  const stage = hero.querySelector('.hero-stage');
  const video = hero.querySelector('.hero-video');
  const ring = hero.querySelector('.hero-ring');
  const pawsBox = hero.querySelector('.hero-paws');
  const small = innerWidth < 800;
  const VIDEO_URL = small ? 'video/hero-mobile.mp4' : 'video/hero-scrub.mp4';
  const bands = [...hero.querySelectorAll('[data-band]')].map(el => {
    const [a, b] = el.dataset.band.split(',').map(Number);
    return { el, a, b, op: -1, k: -1 };
  });
  const conn = navigator.connection || {};
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || conn.saveData || /2g/.test(conn.effectiveType || '');
  if (calm || !('IntersectionObserver' in window)) { hero.classList.add('is-static'); return; }
  /* telefoon: zelfde scroll-film, staand bijgesneden */
  if (small) hero.classList.add('is-small');

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const heroProgress = () => {
    const r = hero.getBoundingClientRect();
    return clamp(-r.top / (hero.offsetHeight - innerHeight), 0, 1);
  };

  /* pootjesspoor dat over het beeld loopt, gekoppeld aan de scroll */
  const N = 14, paws = [];
  for (let i = 0; i < N; i++) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 64 64');
    s.innerHTML = '<use href="#paw"/>';
    const t = i / (N - 1);
    const x = small ? 10 + t * 75 : 58 + t * 38, y = small ? 70 - t * 55 : 92 - t * 70 + Math.sin(t * 9) * 4;
    s.style.left = `${x + (i % 2 ? 1.4 : -1.4)}%`;
    s.style.top = `${y}%`;
    s.style.setProperty('--r', `${-30 + (i % 2 ? 8 : -8)}deg`);
    pawsBox.appendChild(s); paws.push(s);
  }

  function updateCaptions(p) {
    bands.forEach((B, i) => {
      const f = 0.05, last = i === bands.length - 1;
      let op = (i === 0 ? 1 : smooth(p, B.a, B.a + f)) * (last ? 1 : 1 - smooth(p, B.b - f, B.b));
      op = Math.round(op * 1000) / 1000;
      if (op !== B.op) { B.op = op; B.el.style.opacity = op; B.el.style.visibility = op < 0.01 ? 'hidden' : 'visible'; }
      const k = Math.round(clamp((p - B.a) / 0.08, 0, 1) * 100) / 100;
      if (k !== B.k) { B.k = k; B.el.style.setProperty('--k', k); }
    });
    const pp = Math.round(p * 300) / 300;
    if (pp !== hero._p) { hero._p = pp; stage.style.setProperty('--p', pp); }
    /* een venster van 5 pootjes schuift mee met de scroll */
    const head = p * (N + 4);
    paws.forEach((s, i) => s.classList.toggle('on', i < head && i > head - 5));
  }

  let seekBusy = false, pendingTime = null;
  function requestSeek(t) {
    if (!video.duration) return;
    t = clamp(t, 0, video.duration - 0.04);
    if (seekBusy) { pendingTime = t; return; }
    seekBusy = true; video.currentTime = t;
  }
  video.addEventListener('seeked', () => {
    seekBusy = false;
    if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
  });

  let target = 0, shown = 0, rafId = null, lastTick = 0, onScreen = true;
  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now)); lastTick = now;
    shown += (target - shown) * (1 - Math.pow(1 - 0.14, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) { shown = target; rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
    requestSeek(shown * video.duration);
    updateCaptions(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (!hero.classList.contains('video-ready')) { updateCaptions(target); return; }
    if (rafId === null && onScreen) rafId = requestAnimationFrame(tick);
  }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) onScroll(); }).observe(hero);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  updateCaptions(heroProgress());

  let started = false;
  function start() { if (started) return; started = true; load().catch(fail); }
  const pi = new Image(); pi.onload = pi.onerror = start; pi.src = small ? 'img/hero-poster-s.webp' : 'img/hero-poster.webp';
  setTimeout(start, 4000);
  async function load() {
    const ctrl = new AbortController();
    let wd = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error('video');
    const total = Number(res.headers.get('Content-Length')) || 6e6;
    const reader = res.body.getReader(), chunks = [];
    let got = 0, last = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(wd); wd = setTimeout(() => ctrl.abort(), 20000);
      chunks.push(value); got += value.length;
      const now = performance.now();
      if (now - last > 100) { last = now; ring.style.setProperty('--ld', Math.round(126 * (1 - Math.min(1, got / total)))); }
    }
    clearTimeout(wd);
    ring.style.setProperty('--ld', 0);
    video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    video.load();
    video.addEventListener('loadeddata', () => {
      hero.classList.add('video-ready');
      shown = target = heroProgress(); requestSeek(shown * video.duration); updateCaptions(shown);
    }, { once: true });
    video.addEventListener('error', fail, { once: true });
  }
  function fail() { hero.classList.add('video-failed'); }
})();
