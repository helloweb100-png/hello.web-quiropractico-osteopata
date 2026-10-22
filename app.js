/* ==========================================================================
   Jorge Rodríguez Sánchez | Quiropráctico y osteópata
   Módulos: preloader, scroll suave, header y menú, reveals, columna 3D (canvas),
   efectos de scroll (GSAP ScrollTrigger), zonas, acordeones y formulario a WhatsApp.

   Principios
   - Mejora progresiva: si GSAP, Lenis o el CDN fallan, la página sigue funcionando.
   - Sin listeners de "scroll" sobre window: IntersectionObserver y ScrollTrigger.
   - prefers-reduced-motion: sin preloader, sin animaciones, canvas en un solo cuadro.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const canObserve = 'IntersectionObserver' in window;
  const fx = !reduceMotion && canObserve;

  const WA_NUMBER = '524621129986';
  const waLink = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  let lenis = null;
  let hasGSAP = false;
  const heroFX = { progress: 0 }; // 0 = hero completo, 1 = hero fuera de pantalla

  if (fx) doc.classList.add('fx');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Red de seguridad: pase lo que pase, la página se muestra.
  const failsafe = setTimeout(() => {
    doc.classList.add('is-ready');
    document.body.classList.remove('is-loading');
  }, 7500);

  /* ------------------------------------------------------------------
     Preloader: vértebras que se encienden en secuencia + contador
     ------------------------------------------------------------------ */
  function runPreloader() {
    return new Promise((resolve) => {
      const pre = $('#preloader');
      if (!pre) return resolve();

      if (!fx) {
        pre.remove();
        document.body.classList.remove('is-loading');
        return resolve();
      }

      const count = $('#preloader-count');
      const bar = $('#preloader-bar');
      const MIN = 2300; // se ve la animación completa
      const MAX = 5200; // nunca bloquea más que esto
      const t0 = performance.now();
      let loaded = document.readyState === 'complete';
      let shown = 0;
      window.addEventListener('load', () => { loaded = true; }, { once: true });

      const finish = () => {
        count.textContent = '100';
        bar.style.transform = 'scaleX(1)';
        pre.classList.add('is-done');
        document.body.classList.remove('is-loading');
        pre.setAttribute('aria-hidden', 'true');
        setTimeout(resolve, 650);          // el hero arranca mientras se abren los paneles
        setTimeout(() => pre.remove(), 1500);
      };

      const tick = (now) => {
        const e = now - t0;
        const p = clamp(e / MIN, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        let target = eased * (loaded ? 100 : 92);
        if (e >= MAX) target = 100;
        shown = Math.max(shown, Math.min(target, 100));
        count.textContent = String(Math.round(shown));
        bar.style.transform = `scaleX(${(shown / 100).toFixed(3)})`;
        if (shown >= 99.6) return finish();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------
     Scroll suave (Lenis) integrado con ScrollTrigger
     ------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (reduceMotion || !window.Lenis) return;
    lenis = new window.Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });
    if (hasGSAP) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    lenis.stop(); // se libera cuando termina el preloader
  }

  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.7 });
      else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      try { history.replaceState(null, '', id); } catch (err) { /* sin historial disponible */ }
    });
  }

  /* ------------------------------------------------------------------
     Header (estado al hacer scroll, enlace activo) y menú móvil
     ------------------------------------------------------------------ */
  const menu = $('#menu');
  const burger = $('#burger');

  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    menu.inert = false;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    document.body.classList.add('menu-open');
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    menu.inert = true;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    document.body.classList.remove('menu-open');
    if (lenis && !document.body.classList.contains('is-loading')) lenis.start();
  }

  function initHeader() {
    const header = $('#site-header');
    if (header && canObserve) {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:56px;pointer-events:none';
      document.body.prepend(sentinel);
      new IntersectionObserver(([en]) => doc.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);
    }

    if (menu && burger) {
      menu.inert = true;
      burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
      window.matchMedia('(min-width: 1000px)').addEventListener('change', (m) => { if (m.matches) closeMenu(); });
    }

    // Enlace activo según la sección visible
    const links = $$('.nav a');
    if (links.length && canObserve) {
      const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
          const a = map.get(en.target.id);
          if (a) { a.classList.add('is-active'); a.setAttribute('aria-current', 'true'); }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
    }
  }

  /* ------------------------------------------------------------------
     Texto: partir en palabras (títulos con máscara y párrafo de scroll)
     ------------------------------------------------------------------ */
  function splitWords(el, cls) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.className = cls;
            if (cls === 'w') {
              const inner = document.createElement('span');
              inner.className = 'wi';
              inner.style.setProperty('--i', i);
              inner.textContent = tok;
              word.appendChild(inner);
            } else {
              word.textContent = tok;
            }
            i += 1;
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return i;
  }

  function initReveal() {
    if (!fx) return;
    $$('[data-split]').forEach((el) => { splitWords(el, 'w'); el.classList.add('is-split'); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    $$('[data-reveal], [data-split]').forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     Micro-interacciones: botones, foco de luz, imán, luz del hero
     ------------------------------------------------------------------ */
  function initPointerFX() {
    if (!finePointer) return;

    // Relleno del botón nace donde entra el cursor
    $$('.btn').forEach((b) => {
      const set = (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--bx', `${e.clientX - r.left}px`);
        b.style.setProperty('--by', `${e.clientY - r.top}px`);
      };
      b.addEventListener('pointerenter', set);
      b.addEventListener('pointerleave', set);
    });

    // Foco de luz en tarjetas del bento
    $$('.cell').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });
    });

    if (reduceMotion) return;

    // Botones magnéticos
    $$('[data-magnetic]').forEach((el) => {
      const strength = el.classList.contains('fab') ? 0.35 : 0.26;
      let rect = null;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const x = (e.clientX - (rect.left + rect.width / 2)) * strength;
        const y = (e.clientY - (rect.top + rect.height / 2)) * strength;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; rect = null; });
    });
  }

  /* ------------------------------------------------------------------
     Hero: columna vertebral 3D en canvas (partículas, órbitas y pulso nervioso)
     ------------------------------------------------------------------ */
  function initSpine() {
    const canvas = $('#spine-canvas');
    if (!canvas || !canvas.getContext) return;
    const hero = canvas.closest('.hero');
    const stage = $('.hero__stage', hero);
    const huds = $$('.hud', hero);
    const ctx = canvas.getContext('2d');

    const CAM = 3.4;   // distancia de cámara en unidades del modelo
    const TOTAL = 27;  // 7 cervicales, 12 dorsales, 5 lumbares y 3 sacras
    const rand = (a, b) => a + Math.random() * (b - a);

    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 100, U = 1, small = false, ringScale = 1;
    let verts = [], pts = [], links = [], parts = [];
    let running = false, inView = true, rafId = 0, last = 0, time = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const vb = new Float32Array(TOTAL);       // brillo del pulso por vértebra

    // Sprites de brillo prerenderizados (más barato que gradientes por punto)
    const makeSprite = (r, g, b) => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const g2 = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g2.addColorStop(0, `rgba(${r},${g},${b},1)`);
      g2.addColorStop(0.2, `rgba(${r},${g},${b},.7)`);
      g2.addColorStop(0.55, `rgba(${r},${g},${b},.16)`);
      g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
      x.fillStyle = g2;
      x.fillRect(0, 0, 64, 64);
      return c;
    };
    const SPR = { sky: makeSprite(77, 180, 246), white: makeSprite(228, 243, 255), indigo: makeSprite(98, 108, 245) };

    // Curva sagital: lordosis cervical, cifosis dorsal, lordosis lumbar, cifosis sacra
    const gauss = (t, m, s) => Math.exp(-Math.pow((t - m) / s, 2));
    const curveZ = (t) => 0.15 * gauss(t, 0.1, 0.11) - 0.22 * gauss(t, 0.4, 0.18) + 0.22 * gauss(t, 0.76, 0.13) - 0.1 * gauss(t, 0.98, 0.07);
    const RADII = [[0, 0.05], [0.1, 0.06], [0.27, 0.08], [0.5, 0.105], [0.7, 0.13], [0.78, 0.16], [0.88, 0.175], [0.93, 0.14], [1, 0.05]];
    const RADIUS_SCALE = 1.4; // volumen visual de las vértebras
    const radiusAt = (t) => {
      for (let i = 0; i < RADII.length - 1; i++) {
        if (t <= RADII[i + 1][0]) {
          const f = (t - RADII[i][0]) / (RADII[i + 1][0] - RADII[i][0]);
          return (RADII[i][1] + (RADII[i + 1][1] - RADII[i][1]) * f) * RADIUS_SCALE;
        }
      }
      return RADII[RADII.length - 1][1] * RADIUS_SCALE;
    };

    const RINGS = [
      { R: 1.05, tilt: 1.15, speed: 0.34, dir: 1, sat: 2.4 },
      { R: 1.3, tilt: -0.55, speed: 0.25, dir: -1, sat: 0.8 },
      { R: 1.58, tilt: 0.28, speed: 0.17, dir: 1, sat: 4.1 },
    ];

    function buildGeometry() {
      const M = small ? 12 : 18;
      verts = []; pts = []; links = [];
      for (let i = 0; i < TOTAL; i++) {
        const t = i / (TOTAL - 1);
        verts.push({ t, y: 1 - t * 2, z: curveZ(t), r: radiusAt(t), start: 0 });
      }
      verts.forEach((v, i) => {
        v.start = pts.length;
        v.M = M;
        const P = (x, y, z, s) => pts.push({ x, y, z, i, r: v.r, s, sx: 0, sy: 0, k: 1, z2: 0 });
        for (let k = 0; k < M; k++) {            // cuerpo vertebral
          const a = (k / M) * Math.PI * 2;
          P(Math.cos(a) * v.r * 1.2, v.y, v.z + Math.sin(a) * v.r * 0.9, 1);
        }
        for (let k = 1; k <= 4; k++) {           // apófisis espinosa
          P(0, v.y - k * 0.006, v.z - v.r * (0.95 + k * 0.3), 0.8);
        }
        for (let k = 1; k <= 3; k++) {           // apófisis transversas
          const off = v.r * (1.25 + k * 0.4);
          P(off, v.y, v.z - v.r * 0.55, 0.75);
          P(-off, v.y, v.z - v.r * 0.55, 0.75);
        }
      });
      for (let i = 0; i < TOTAL - 1; i++) {      // ligamentos entre vértebras
        for (let k = 0; k < M; k += 3) links.push([verts[i].start + k, verts[i + 1].start + k, i]);
      }
    }

    function buildParticles() {
      const n = small ? 36 : 70;
      parts = Array.from({ length: n }, () => ({
        x: rand(-2.3, 2.3), y: rand(-1.5, 1.5), z: rand(-1.6, 1.6),
        vy: rand(0.012, 0.05), ph: rand(0, 6.28), s: rand(0.6, 1.5), sx: 0, sy: 0, k: 1,
      }));
    }

    function placeHud() {
      const centers = [0.13, 0.48, 0.81]; // centro de cada región (cervical, dorsal, lumbar)
      huds.forEach((el, idx) => {
        const y = cy - (1 - 2 * centers[idx]) * S;
        const x = cx + S * 0.42 + 36;
        el.style.setProperty('--x', `${Math.round(x)}px`);
        el.style.setProperty('--y', `${Math.round(y - 24)}px`);
        el.style.setProperty('--leader', `${Math.round(x - cx - 8)}px`);
      });
    }

    function resize() {
      const r = hero.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const wasSmall = small;
      W = r.width; H = r.height;
      small = W < 768;
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.6 : 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      cx = sr.left - r.left + sr.width / 2;
      cy = sr.top - r.top + sr.height / 2;
      S = clamp(Math.min(sr.height * 0.45, sr.width * 0.95), 110, 360);
      U = S / 330;
      ringScale = Math.min(1, (sr.width * 0.5 + (small ? 40 : 90)) / (1.58 * S));
      if (!pts.length || wasSmall !== small) { buildGeometry(); buildParticles(); }
      placeHud();
      if (!running) render(time || 2.6, 0);
    }

    function render(t, dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const k = clamp(dt * 4 + 0.02, 0, 1);
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;

      const boost = heroFX.progress;
      const ry = t * 0.3 + 0.55 + pointer.x * 1.1 + boost * 2.4;
      const rx = -0.14 + pointer.y * 0.3;
      const cosY = Math.cos(ry), sinY = Math.sin(ry), cosX = Math.cos(rx), sinX = Math.sin(rx);

      // Pulso nervioso: recorre la columna de arriba hacia abajo
      const cycle = 5.4;
      const pulse = -0.15 + ((t % cycle) / cycle) * 1.3;
      for (let i = 0; i < TOTAL; i++) {
        const d = (verts[i].t - pulse) / 0.065;
        vb[i] = Math.exp(-d * d);
      }

      /* --- partículas flotantes (red neuronal) --- */
      const pc = Math.cos(ry * 0.35), ps = Math.sin(ry * 0.35);
      for (let n = 0; n < parts.length; n++) {
        const p = parts[n];
        p.y += p.vy * dt;
        if (p.y > 1.6) p.y = -1.6;
        const x1 = p.x * pc + p.z * ps;
        const z1 = -p.x * ps + p.z * pc;
        const kk = CAM / (CAM - z1);
        p.sx = cx + x1 * S * kk * 1.05;
        p.sy = cy - p.y * S * kk;
        p.k = kk;
      }
      const LD = (small ? 86 : 120);
      ctx.lineWidth = 1;
      for (let a = 0; a < parts.length; a++) {
        const pa = parts[a];
        for (let b = a + 1; b < parts.length; b++) {
          const pb = parts[b];
          const dx = pa.sx - pb.sx, dy = pa.sy - pb.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < LD * LD) {
            const al = (1 - Math.sqrt(d2) / LD) * 0.22;
            ctx.strokeStyle = `rgba(118,199,250,${al.toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke();
          }
        }
      }
      for (let n = 0; n < parts.length; n++) {
        const p = parts[n];
        const tw = 0.55 + 0.45 * Math.sin(t * 1.4 + p.ph);
        const size = 14 * p.s * p.k * U;
        ctx.globalAlpha = clamp(0.35 * tw * p.k, 0, 0.8);
        ctx.drawImage(n % 3 === 0 ? SPR.white : SPR.sky, p.sx - size / 2, p.sy - size / 2, size, size);
      }

      /* --- órbitas tipo giroscopio con satélites --- */
      RINGS.forEach((rg, idx) => {
        const R = rg.R * ringScale;
        const cT = Math.cos(rg.tilt), sT = Math.sin(rg.tilt);
        const ang = t * rg.speed * rg.dir;
        const cA = Math.cos(ang), sA = Math.sin(ang);
        const at = (u) => {
          const x0 = R * Math.cos(u), z0 = R * Math.sin(u);
          const x1 = x0 * cT, y1 = x0 * sT;
          const x2 = x1 * cA + z0 * sA, z2 = -x1 * sA + z0 * cA;
          const y3 = y1 * cosX - z2 * sinX, z3 = y1 * sinX + z2 * cosX;
          const kk = CAM / (CAM - z3);
          return [cx + x2 * S * kk, cy - y3 * S * kk, z3, kk];
        };
        const SEG = 72;
        ctx.lineWidth = 1;
        let prev = at(0);
        for (let s = 1; s <= SEG; s++) {
          const cur = at((s / SEG) * Math.PI * 2);
          const depth = clamp(0.5 + (cur[2] / R) * 0.5, 0.1, 1);
          ctx.strokeStyle = `rgba(118,199,250,${(0.09 + depth * 0.22).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
          prev = cur;
        }
        // satélite con estela
        const u0 = t * (0.9 - idx * 0.18) * rg.dir + rg.sat;
        for (let tr = 0; tr < 12; tr++) {
          const q = at(u0 - tr * 0.07 * rg.dir);
          const size = (16 - tr * 1.1) * q[3] * U;
          ctx.globalAlpha = clamp((1 - tr / 12) * 0.9, 0, 1);
          ctx.drawImage(tr === 0 ? SPR.white : SPR.sky, q[0] - size / 2, q[1] - size / 2, size, size);
        }
      });

      /* --- columna: proyección de todos los puntos --- */
      for (let n = 0; n < pts.length; n++) {
        const p = pts[n];
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const kk = CAM / (CAM - z2);
        p.sx = cx + x1 * S * kk;
        p.sy = cy - y1 * S * kk;
        p.k = kk;
        p.z2 = z2;
      }

      // contorno de cada vértebra: da forma de disco apilado
      ctx.lineWidth = 1;
      for (let i = 0; i < TOTAL; i++) {
        const v = verts[i];
        const zc = (pts[v.start].z2 + pts[v.start + (v.M >> 1)].z2) / 2;
        const al = (0.17 + 0.5 * vb[i]) * clamp(0.7 + zc * 0.9, 0.35, 1);
        ctx.strokeStyle = `rgba(118,199,250,${al.toFixed(3)})`;
        ctx.beginPath();
        for (let k = 0; k <= v.M; k++) {
          const p = pts[v.start + (k % v.M)];
          if (k) ctx.lineTo(p.sx, p.sy); else ctx.moveTo(p.sx, p.sy);
        }
        ctx.stroke();
      }

      // anillo de escaneo que acompaña al pulso
      if (pulse > 0 && pulse < 1) {
        const pt = clamp(pulse, 0, 1);
        const yy = 1 - 2 * pt;
        const zc = curveZ(pt);
        const rr = radiusAt(pt) * 2.2 + 0.08;
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = `rgba(190,230,255,${(0.6 * Math.sin(Math.PI * pt)).toFixed(3)})`;
        ctx.beginPath();
        for (let s = 0; s <= 48; s++) {
          const u = (s / 48) * Math.PI * 2;
          const x0 = rr * Math.cos(u), z0 = zc + rr * 0.8 * Math.sin(u);
          const x1 = x0 * cosY + z0 * sinY;
          const z1 = -x0 * sinY + z0 * cosY;
          const y1 = yy * cosX - z1 * sinX;
          const z2 = yy * sinX + z1 * cosX;
          const kk = CAM / (CAM - z2);
          if (s) ctx.lineTo(cx + x1 * S * kk, cy - y1 * S * kk); else ctx.moveTo(cx + x1 * S * kk, cy - y1 * S * kk);
        }
        ctx.stroke();
      }

      // ligamentos
      ctx.lineWidth = 1;
      for (let n = 0; n < links.length; n++) {
        const l = links[n];
        const a = pts[l[0]], b = pts[l[1]];
        const al = (0.07 + 0.3 * vb[l[2]]) * clamp(0.55 + (a.z2 + b.z2) * 0.6, 0.2, 1);
        ctx.strokeStyle = `rgba(118,199,250,${al.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
      }

      // médula: línea central con brillo
      ctx.globalAlpha = 1;
      const cord = verts.map((v) => {
        const x1 = 0 * cosY + v.z * sinY;
        const z1 = -0 * sinY + v.z * cosY;
        const y1 = v.y * cosX - z1 * sinX;
        const z2 = v.y * sinX + z1 * cosX;
        const kk = CAM / (CAM - z2);
        return [cx + x1 * S * kk, cy - y1 * S * kk];
      });
      [[8, 0.07], [2.2, 0.5]].forEach(([w, a]) => {
        ctx.lineWidth = w * U;
        ctx.strokeStyle = `rgba(118,199,250,${a})`;
        ctx.beginPath();
        cord.forEach((c, i) => (i ? ctx.lineTo(c[0], c[1]) : ctx.moveTo(c[0], c[1])));
        ctx.stroke();
      });

      // puntos (vértebras)
      for (let n = 0; n < pts.length; n++) {
        const p = pts[n];
        const b = vb[p.i];
        const depth = clamp(0.58 + p.z2 * 0.85, 0.2, 1);
        // el tamaño sigue al radio de la vértebra: evita saturar las pequeñas (cervicales y sacro)
        const size = (4.5 + p.r * 62) * p.s * (1 + 0.7 * b) * U * p.k;
        const hot = b > 0.45;
        const spr = hot ? SPR.white : (p.z2 < -0.08 ? SPR.indigo : SPR.sky);
        ctx.globalAlpha = clamp(depth * (hot ? 0.7 : 0.6 + 0.4 * b), 0, 1);
        ctx.drawImage(spr, p.sx - size / 2, p.sy - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      render(time, dt);
      rafId = requestAnimationFrame(frame);
    }
    const start = () => {
      if (running || reduceMotion) return;
      running = true; last = performance.now(); rafId = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; cancelAnimationFrame(rafId); };

    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
    else window.addEventListener('resize', resize);

    if (reduceMotion) { render(2.6, 0); return; }

    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        pointer.tx = (e.clientX - r.left) / r.width - 0.5;
        pointer.ty = (e.clientY - r.top) / r.height - 0.5;
        hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
        hero.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });
    }

    new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      if (inView && !document.hidden) start(); else stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden || !inView) stop(); else start();
    });
    start();
  }

  /* ------------------------------------------------------------------
     Efectos de scroll con GSAP ScrollTrigger
     ------------------------------------------------------------------ */
  function initScrollFX() {
    if (!hasGSAP || reduceMotion) return;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Barra de progreso de lectura
    gsap.to('#progress-bar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    // Hero: al salir, el texto se aleja y la columna acelera su giro (profundidad)
    gsap.to('.hero__copy', {
      yPercent: -12, opacity: 0.1, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (self) => { heroFX.progress = self.progress; },
    });

    // Filosofía: las palabras se encienden al avanzar el scroll
    const mt = $('.manifesto__text');
    if (mt) {
      splitWords(mt, 'mw');
      mt.classList.add('is-words');
      gsap.fromTo($$('.mw', mt), { opacity: 0.16 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: mt, start: 'top 82%', end: 'bottom 48%', scrub: true },
      });
    }

    // Cifras con contador
    $$('[data-count]').forEach((el) => {
      const target = Number(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const o = { v: 0 };
      el.textContent = `${prefix}0`;
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, {
          v: target, duration: 1.8, ease: 'power3.out',
          onUpdate: () => { el.textContent = `${prefix}${Math.round(o.v)}`; },
        }),
      });
    });

    // Imagen que se abre a pantalla completa mientras la sección queda fija
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 768px)', narrow: '(max-width: 767px)' }, (mctx) => {
      const { wide } = mctx.conditions;
      const frameEl = $('.expand__frame');
      const img = $('.expand__img');
      const copy = $('.expand__copy');
      if (!frameEl || !img || !copy) return;
      // fromTo explícito: Chrome abrevia inset() al leerlo y GSAP desalinearía los valores
      const from = wide ? 'inset(36% 29% 12% 29% round 28px)' : 'inset(32% 12% 20% 12% round 24px)';
      const to = 'inset(0% 0% 0% 0% round 0px)';
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: '.expand', start: 'top top', end: '+=170%', scrub: 0.8, pin: true, anticipatePin: 1 },
      });
      tl.fromTo(frameEl, { clipPath: from }, { clipPath: to, duration: 1 }, 0)
        .fromTo(img, { scale: 1.4 }, { scale: 1, duration: 1 }, 0)
        .fromTo(copy, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.68);
    });

    // Método: cada tarjeta se hunde y se oscurece al llegar la siguiente (pila pegajosa).
    // Se oscurece con un velo opaco, no con opacity, para que no se transparente la tarjeta de abajo.
    const steps = $$('.step');
    steps.forEach((step, i) => {
      const next = steps[i + 1];
      if (!next) return;
      const inner = $('.step__in', step);
      const veil = document.createElement('span');
      veil.className = 'step__veil';
      veil.setAttribute('aria-hidden', 'true');
      inner.appendChild(veil);
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: next, start: 'top 85%', end: 'top 22%', scrub: true },
      })
        .to(inner, { scale: 0.92 }, 0)
        .to(veil, { opacity: 0.6 }, 0);
    });

    // Zonas: ola de luz una sola vez al entrar
    const zonesRoot = $('[data-zones]');
    if (zonesRoot) {
      $$('.zone__dots i', zonesRoot).forEach((d, i) => d.style.setProperty('--k', i));
      ScrollTrigger.create({ trigger: zonesRoot, start: 'top 75%', once: true, onEnter: () => zonesRoot.classList.add('is-wave') });
    }

    // Footer: la palabra gigante sube suavemente
    gsap.fromTo('.footer__word', { yPercent: 35 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
    });
  }

  /* ------------------------------------------------------------------
     Selector de zonas (tabs accesibles)
     ------------------------------------------------------------------ */
  function initZones() {
    const root = $('[data-zones]');
    if (!root) return;
    const tabs = $$('.zone', root);
    const panels = $$('.zone-panel', root);

    const activate = (name, focus) => {
      tabs.forEach((t) => {
        const on = t.dataset.zone === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panels.forEach((p) => {
        const on = p.dataset.zoneName === name;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activate(t.dataset.zone));
      t.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        let next = null;
        if (keys[e.key]) next = tabs[(i + keys[e.key] + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); activate(next.dataset.zone, true); }
      });
    });

    // Las anotaciones del hero abren la zona correspondiente
    $$('[data-zone-link]').forEach((a) => a.addEventListener('click', () => activate(a.dataset.zoneLink)));
  }

  /* ------------------------------------------------------------------
     Acordeones: preguntas frecuentes y especialidades
     ------------------------------------------------------------------ */
  function initAccordions() {
    const items = $$('[data-accordion] .acc');
    items.forEach((item) => {
      const btn = $('.acc__btn', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((o) => {
          o.classList.remove('is-open');
          $('.acc__btn', o).setAttribute('aria-expanded', 'false');
        });
        if (open) { item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });

    const disc = $$('[data-disc] .disc__item');
    const openDisc = (target) => {
      disc.forEach((d) => {
        const on = d === target;
        d.classList.toggle('is-open', on);
        $('.disc__btn', d).setAttribute('aria-expanded', String(on));
      });
    };
    const wide = window.matchMedia('(min-width: 900px)');
    disc.forEach((d) => {
      $('.disc__btn', d).addEventListener('click', () => openDisc(d));
      if (finePointer) d.addEventListener('pointerenter', () => { if (wide.matches) openDisc(d); });
    });
  }

  /* ------------------------------------------------------------------
     Formulario: valida y abre WhatsApp con el mensaje armado
     ------------------------------------------------------------------ */
  function initForm() {
    const form = $('#wa-form');
    if (!form) return;
    const name = $('#f-nombre');
    const zona = $('#f-zona');
    const tiempo = $('#f-tiempo');
    const msg = $('#f-mensaje');
    const btn = $('#form-submit');
    const ok = $('#form-success');
    const fallback = $('#form-fallback');

    const setError = (input, text) => {
      const out = $(`#e-${input.id.replace('f-', '')}`);
      if (out) out.textContent = text;
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
      input.closest('.field').classList.toggle('has-error', Boolean(text));
    };
    name.addEventListener('input', () => setError(name, ''));
    zona.addEventListener('change', () => setError(zona, ''));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = name.value.trim();
      const badName = n.length < 2;
      const badZone = !zona.value;
      setError(name, badName ? 'Escribe tu nombre para saber cómo llamarte.' : '');
      setError(zona, badZone ? 'Elige la zona que te molesta.' : '');
      if (badName || badZone) { (badName ? name : zona).focus(); return; }

      const parts = [`Hola Jorge, soy ${n}.`, `Motivo de consulta: ${zona.value}.`];
      if (tiempo.value) parts.push(`${tiempo.value}.`);
      if (msg.value.trim()) parts.push(msg.value.trim().replace(/[.!?]*$/, "."));
      parts.push('Me gustaría agendar una valoración. ¿Qué horarios tienes disponibles?');
      const url = waLink(parts.join(' '));

      btn.classList.add('is-loading');
      btn.disabled = true;
      pushEvent('form_submit');
      window.open(url, '_blank', 'noopener');
      fallback.href = url;
      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.disabled = false;
        ok.hidden = false;
      }, 900);
    });
  }

  /* ------------------------------------------------------------------
     CTAs de WhatsApp (mensaje por contexto) y botón flotante
     ------------------------------------------------------------------ */
  function pushEvent(name, extra) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...extra });
  }

  function initCTAs() {
    $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });
    $$('[data-cta]').forEach((a) => {
      a.addEventListener('click', () => pushEvent('cta_click', { cta: a.dataset.cta }));
    });

    const fab = $('#fab');
    if (fab && !reduceMotion) {
      setTimeout(() => fab.classList.add('show-tip'), 9000);
      setTimeout(() => fab.classList.remove('show-tip'), 15000);
    }
  }

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  async function boot() {
    hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    initSmoothScroll();
    initHeader();
    initAnchors();
    initReveal();
    initPointerFX();
    initZones();
    initAccordions();
    initForm();
    initCTAs();
    initSpine();
    initScrollFX();

    await runPreloader();
    clearTimeout(failsafe);
    doc.classList.add('is-ready');
    if (lenis) lenis.start();
    if (hasGSAP) window.ScrollTrigger.refresh();
  }

  window.addEventListener('load', () => { if (hasGSAP) window.ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (hasGSAP) window.ScrollTrigger.refresh(); });

  boot();
})();
