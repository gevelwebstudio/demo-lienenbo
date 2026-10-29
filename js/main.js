/* Lien & Bo: interacties en effecten. Alles werkt ook zonder deze effecten (reduced motion, smal scherm). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* header + menu */
  const hdr = $('#hdr'), burger = $('.burger');
  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('#nav a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', false); }));

  /* logo blaft */
  const logo = $('[data-woof]'), woof = $('.woof');
  logo.addEventListener('mouseenter', () => { woof.classList.add('show'); setTimeout(() => woof.classList.remove('show'), 900); });

  /* nu open */
  const now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
  const open = (d >= 1 && d <= 5 && m >= 450 && m < 1110) || (d === 6 && m >= 540 && m < 720);
  $$('[data-open]').forEach(el => {
    el.classList.toggle('is-open', open);
    el.textContent = open ? 'Nu open' : (el.textContent.trim() || 'Nu gesloten');
    if (!open && el.closest('#contact')) el.textContent = 'Nu gesloten';
  });
  const today = $(`[data-hours] tr[data-d="${d}"]`); if (today) today.classList.add('today');

  /* koppen woord voor woord */
  $$('.split-h').forEach(h => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });

  /* onthullen bij scrollen */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  $$('.reveal, .split-h').forEach(el => io.observe(el));

  /* voor/na-schuif */
  $$('[data-ba]').forEach(ba => {
    const r = $('input', ba);
    const set = v => ba.style.setProperty('--x', v + '%');
    r.addEventListener('input', () => set(r.value));
    /* hint: schuift één keer heen en weer zodra hij in beeld komt */
    if (!reduce) new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return; o.disconnect();
      let t0 = null;
      const anim = t => { t0 ??= t; const k = (t - t0) / 1600; if (k > 1) { set(50); r.value = 50; return; }
        const v = 50 + Math.sin(k * Math.PI * 2) * 22; set(v); r.value = v; requestAnimationFrame(anim); };
      setTimeout(() => requestAnimationFrame(anim), 500);
    }, { threshold: .6 }).observe(ba);
  });

  /* bulldog-kaarten omdraaien met tik of Enter */
  $$('.dog-card').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('flip'));
    c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.classList.toggle('flip'); } });
  });

  /* 3D-kanteling van de bulldogfoto */
  if (fine && !reduce) $$('[data-tilt]').forEach(el => {
    const img = $('img', el);
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
      img.style.transform = `scale(1.12) translate(${x * -14}px,${y * -14}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; img.style.transform = ''; });
  });

  /* magnetische knoppen */
  if (fine && !reduce) $$('.mag').forEach(b => {
    b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px,${(e.clientY - r.top - r.height / 2) * .3}px)`; });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; });
  });

  /* een dag bij ons: horizontaal scrollen, met klok */
  const day = $('[data-day]'), track = $('[data-track]'), clock = $('[data-clock]'), bar = $('.day-bar');
  const slots = $$('.slot', track);
  const toMin = s => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
  const fmt = v => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(Math.floor(v % 60 / 5) * 5).padStart(2, '0')}`;
  const dayStatic = innerWidth < 800 || reduce;
  if (dayStatic) {
    day.classList.add('is-static');
    /* telefoon: zelf swipen, klok en balk lopen mee */
    track.addEventListener('scroll', () => {
      const p = clamp(track.scrollLeft / (track.scrollWidth - track.clientWidth), 0, 1);
      bar.style.setProperty('--dp', p); clock.textContent = fmt(450 + p * (1110 - 450));
    }, { passive: true });
  }
  function dayUpdate() {
    if (dayStatic) return;
    const r = day.getBoundingClientRect();
    const p = clamp(-r.top / (day.offsetHeight - innerHeight), 0, 1);
    const max = track.scrollWidth - innerWidth + 32;
    track.style.transform = `translate3d(${-p * max}px,0,0)`;
    bar.style.setProperty('--dp', p);
    const t = 450 + p * (1110 - 450);
    clock.textContent = fmt(t);
  }
  /* siësta-film speelt alleen als hij in beeld is */
  const siesta = $('video[data-src]');
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!siesta.src) siesta.src = siesta.dataset.src; if (!reduce) siesta.play().catch(() => {}); }
    else siesta.pause();
  }, { threshold: .3 }).observe(siesta);

  /* duinen-parallax */
  const dunes = $('[data-parallax]'), dunesBg = $('.dunes-bg');
  function parallax() {
    if (reduce) return;
    const r = dunes.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    dunesBg.style.setProperty('--py', `${clamp((innerHeight / 2 - r.top - r.height / 2) * 0.18, 0, r.height * 0.07)}px`);
  }

  /* tellers */
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; countIO.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = reduce ? 0 : 1600;
    const step = t => { const k = dur ? clamp((t - t0) / dur, 0, 1) : 1; el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))).toLocaleString('nl-NL'); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* tarieven: losse dag of strippenkaart */
  const tg = $('.toggle'), pill = $('.pill', tg), tbtn = $$('button', tg);
  const placePill = b => { pill.style.left = b.offsetLeft + 'px'; pill.style.width = b.offsetWidth + 'px'; };
  placePill(tbtn[0]);
  addEventListener('resize', () => placePill(tbtn.find(b => b.getAttribute('aria-pressed') === 'true')));
  tbtn.forEach(b => b.addEventListener('click', () => {
    tbtn.forEach(x => x.setAttribute('aria-pressed', x === b)); placePill(b);
    $$('[data-price]').forEach(el => {
      const from = +el.textContent, to = +el.dataset[b.dataset.mode], t0 = performance.now();
      const step = t => { const k = clamp((t - t0) / 500, 0, 1); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }));

  /* recensies: lijst verdubbelen voor de eindeloze band */
  const mq = $('[data-marquee]'); mq.innerHTML += mq.innerHTML.replace(/<article /g, '<article aria-hidden="true" ');

  /* kennismaakformulier in 3 stappen */
  const form = $('[data-form]'), steps = $$('.step', form), bars = $$('.steps-bar i', form);
  let cur = 0;
  const dogName = () => ($('#f-naam').value.trim() || 'je hond');
  const bubble = $('[data-bubble]');
  $('#f-naam').addEventListener('input', () => {
    const n = $('#f-naam').value.trim();
    bubble.innerHTML = n ? `Hoi <b>${n.replace(/[<>&"]/g, '')}</b>! Ik ben Indi. Kom je snel spelen?` : 'Hoi! Ik ben <b>Indi</b>. Hoe heet jouw hond?';
  });
  function go(i) {
    steps[cur].classList.remove('on'); cur = i; steps[cur].classList.add('on');
    bars.forEach((b, k) => b.classList.toggle('on', k <= Math.min(i, 2)));
    $$('[data-dogname]').forEach(s => s.textContent = dogName());
    const f = $('input:not([type=radio]):not([type=checkbox])', steps[cur]); if (f && i < 3) f.focus({ preventScroll: true });
  }
  $$('[data-next]', form).forEach(b => b.addEventListener('click', () => {
    if (cur === 0 && !$('#f-naam').value.trim()) { $('[data-err]', steps[0]).textContent = 'Vul de naam van je hond in.'; $('#f-naam').focus(); return; }
    $$('[data-err]', form).forEach(e => e.textContent = '');
    go(cur + 1);
  }));
  $$('[data-prev]', form).forEach(b => b.addEventListener('click', () => go(cur - 1)));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const n = $('#f-jij'), m = $('#f-mail'), err = $('[data-err]', steps[2]);
    if (!n.value.trim()) { err.textContent = 'Vul je naam in.'; n.focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(m.value)) { err.textContent = 'Vul een geldig e-mailadres in.'; m.focus(); return; }
    go(3); confetti();
  });
  $$('[data-pick]').forEach(a => a.addEventListener('click', () => {
    const r = $(`input[name=dienst][value="${a.dataset.pick}"]`); if (r) r.checked = true;
  }));
  function confetti() {
    if (reduce) return;
    const r = form.getBoundingClientRect(), cols = ['#e3a92b', '#1f3b2d', '#c8643b', '#a9c2a0'];
    for (let i = 0; i < 36; i++) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('class', 'confetti'); s.innerHTML = '<use href="#paw"/>';
      s.style.fill = cols[i % 4]; s.style.left = r.left + r.width / 2 + 'px'; s.style.top = r.top + 120 + 'px';
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 260;
      s.animate([{ transform: 'translate(0,0) rotate(0) scale(.4)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 120}px) rotate(${Math.random() * 540}deg) scale(1)`, opacity: 1, offset: .6 },
        { transform: `translate(${Math.cos(a) * v * 1.2}px,${Math.sin(a) * v + 200}px) rotate(${Math.random() * 720}deg) scale(.8)`, opacity: 0 }],
        { duration: 1800 + Math.random() * 800, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }

  /* road: het pad tekent zich mee */
  const road = $('[data-road]'), fill = $('.road-fill'), len = fill.getTotalLength();
  fill.style.strokeDasharray = len; fill.style.strokeDashoffset = len;
  function roadUpdate() {
    const r = road.getBoundingClientRect();
    const p = clamp((innerHeight * .6 - r.top) / r.height, 0, 1);
    fill.style.strokeDashoffset = len * (1 - p);
  }

  /* sticky actiebalk (mobiel) na de hero; hond die even komt kijken (desktop) */
  const ab = $('[data-actionbar]'), heroEl = $('[data-hero]'), peek = $('[data-peek]');
  let lastY = scrollY, peekT;
  function chrome() {
    hdr.classList.toggle('scrolled', scrollY > 10);
    ab.classList.toggle('show', scrollY > heroEl.offsetHeight * .5);
    const v = Math.abs(scrollY - lastY); lastY = scrollY;
    if (v > 60 && !reduce && scrollY > heroEl.offsetHeight) {
      peek.classList.add('up'); clearTimeout(peekT); peekT = setTimeout(() => peek.classList.remove('up'), 1400);
    }
  }
  if (fine) addEventListener('mousemove', e => {
    $$('.eye', peek).forEach(g => {
      const r = g.getBoundingClientRect(), a = Math.atan2(e.clientY - r.top, e.clientX - r.left);
      g.style.transform = `translate(${Math.cos(a) * 3}px,${Math.sin(a) * 3}px)`;
    });
    const meet = $('.meet-dog .eyes');
    if (meet) { const r = meet.getBoundingClientRect(), a = Math.atan2(e.clientY - r.top, e.clientX - r.left - r.width / 2); meet.style.transform = `translate(${Math.cos(a) * 3}px,${Math.sin(a) * 2.5}px)`; }
  }, { passive: true });

  /* pootjesspoor achter de muis */
  if (fine && !reduce) {
    let lx = 0, ly = 0, flip = false;
    addEventListener('mousemove', e => {
      const dx = e.clientX - lx, dy = e.clientY - ly;
      if (dx * dx + dy * dy < 4200) return;
      lx = e.clientX; ly = e.clientY; flip = !flip;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 64 64'); s.setAttribute('class', 'trail'); s.innerHTML = '<use href="#paw"/>';
      const off = flip ? 9 : -9, rad = (ang) * Math.PI / 180;
      s.style.left = e.clientX - 9 + Math.cos(rad) * off + 'px'; s.style.top = e.clientY - 9 + Math.sin(rad) * off + 'px';
      s.style.transform = `rotate(${ang}deg)`; s.style.setProperty('--t', `rotate(${ang}deg)`);
      document.body.appendChild(s); setTimeout(() => s.remove(), 1400);
    }, { passive: true });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ticking = false; chrome(); dayUpdate(); parallax(); roadUpdate(); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();
