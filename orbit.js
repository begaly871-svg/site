(() => {
  'use strict';

  const canvas = document.getElementById('universe-canvas');
  const stage = document.getElementById('universe-stage');
  if (!canvas || !stage || canvas.dataset.orbitReady === 'true') return;

  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) {
    const label = document.getElementById('universe-coordinate');
    if (label) label.textContent = 'CANVAS НЕ ПОДДЕРЖИВАЕТСЯ · ОБНОВИТЕ БРАУЗЕР';
    return;
  }

  canvas.dataset.orbitReady = 'true';
  document.documentElement.setAttribute('data-simulator', 'ready');

  const consolePanel = document.querySelector('.universe-console');
  const timer = document.getElementById('universe-time');
  const coordinates = document.getElementById('universe-coordinate');
  const cursor = document.getElementById('universe-cursor');
  const status = document.getElementById('universe-status-text');
  const planetCounter = document.getElementById('planet-count');
  const toast = document.getElementById('universe-toast');
  const speedInput = document.getElementById('universe-speed');
  const speedOutput = document.getElementById('universe-speed-output');
  const pauseButton = document.querySelector('[data-universe-action="toggle"]');
  const pauseLabel = document.querySelector('.sim-toggle-label');
  const pauseIcon = document.querySelector('.sim-play-icon');
  const fullscreenButton = document.querySelector('[data-universe-action="fullscreen"]');
  const fullscreenLabel = document.querySelector('.universe-fullscreen-label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const colors = ['#c6ff3e', '#b39aff', '#ff996d', '#68ddff', '#ffc968', '#ff80b7', '#83f1c7'];
  const mu = .045;
  const bodies = [];
  const rand = (() => {
    let seed = 731942;
    return () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  })();
  const orbits = [
    { name: 'MERCURY', radius: .17, size: 3.2, color: '#c1ae90', angle: .55, mass: .000012 },
    { name: 'VENUS', radius: .255, size: 4.8, color: '#edbd7c', angle: 3.55, mass: .000045 },
    { name: 'EARTH', radius: .35, size: 5.4, color: '#69dcff', angle: 2.2, mass: .00006 },
    { name: 'MARS', radius: .455, size: 4.2, color: '#ff886c', angle: 5.0, mass: .000035 },
    { name: 'JUPITER', radius: .57, size: 7.4, color: '#d8b78c', angle: 1.45, mass: .00055 }
  ];

  let width = 0;
  let height = 0;
  let stars = [];
  let elapsed = 0;
  let speed = Number(speedInput?.value || 42) / 42;
  let running = true;
  let previous = 0;
  let pointer = null;
  let toastTimer = 0;
  let frame = 0;

  const announce = message => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  };

  const updateCount = () => {
    if (planetCounter) planetCounter.textContent = String(bodies.length + 1).padStart(2, '0');
  };

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let seed = 47113;
    const seeded = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    stars = Array.from({ length: Math.max(60, Math.min(170, Math.round(width * height / 2800))) }, () => ({
      x: seeded() * width,
      y: seeded() * height,
      radius: .35 + seeded() * .8,
      phase: seeded() * Math.PI * 2,
      alpha: .2 + seeded() * .5
    }));
  };

  const reset = (notify = false) => {
    bodies.length = 0;
    for (const orbit of orbits) {
      const x = Math.cos(orbit.angle) * orbit.radius;
      const y = Math.sin(orbit.angle) * orbit.radius;
      const velocity = Math.sqrt(mu / orbit.radius);
      bodies.push({
        name: orbit.name,
        radius: orbit.radius,
        size: orbit.size,
        color: orbit.color,
        mass: orbit.mass,
        x,
        y,
        vx: -Math.sin(orbit.angle) * velocity,
        vy: Math.cos(orbit.angle) * velocity,
        trail: []
      });
    }
    elapsed = 0;
    updateCount();
    if (timer) timer.textContent = '00:00:00';
    if (status) status.textContent = 'ГРАВИТАЦИОННОЕ ПОЛЕ АКТИВНО';
    if (notify) announce('СОЛНЕЧНАЯ СИСТЕМА ВОССТАНОВЛЕНА');
  };

  const acceleration = body => {
    const distanceSquared = Math.max(body.x * body.x + body.y * body.y, .01);
    const distanceCubed = distanceSquared * Math.sqrt(distanceSquared);
    let ax = -mu * body.x / distanceCubed;
    let ay = -mu * body.y / distanceCubed;

    for (const other of bodies) {
      if (other === body) continue;
      const dx = other.x - body.x;
      const dy = other.y - body.y;
      const squared = dx * dx + dy * dy;
      if (squared < .0025) continue;
      const distance = Math.sqrt(squared);
      const force = other.mass / (squared + .003);
      ax += force * dx / distance;
      ay += force * dy / distance;
    }

    if (pointer && !reduceMotion.matches) {
      const dx = (pointer.x / Math.max(width, 1) - .5) * 1.48 - body.x;
      const dy = (pointer.y / Math.max(height, 1) - .52) * .7 - body.y;
      const squared = dx * dx + dy * dy;
      if (squared < .72) {
        const distance = Math.sqrt(Math.max(squared, .001));
        const force = .0015 * (1 - distance / .85) / (squared + .055);
        ax += force * dx / distance;
        ay += force * dy / distance;
      }
    }

    return { ax, ay };
  };

  const advance = dt => {
    const step = dt * speed * (reduceMotion.matches ? .2 : 1);
    if (step <= 0) return;
    for (const body of bodies) {
      const first = acceleration(body);
      body.vx += first.ax * step * .5;
      body.vy += first.ay * step * .5;
    }
    for (const body of bodies) {
      body.x += body.vx * step;
      body.y += body.vy * step;
    }
    for (const body of bodies) {
      const second = acceleration(body);
      body.vx += second.ax * step * .5;
      body.vy += second.ay * step * .5;
      const distance = Math.hypot(body.x, body.y);
      if (!Number.isFinite(distance) || distance < .09 || distance > 1.38 || !Number.isFinite(body.vx + body.vy)) {
        const angle = rand() * Math.PI * 2;
        body.radius = .2 + rand() * .34;
        const velocity = Math.sqrt(mu / body.radius);
        body.x = Math.cos(angle) * body.radius;
        body.y = Math.sin(angle) * body.radius;
        body.vx = -Math.sin(angle) * velocity;
        body.vy = Math.cos(angle) * velocity;
        body.trail.length = 0;
      }
      body.radius = Math.hypot(body.x, body.y);
    }
  };

  const drawBody = (body, centerX, centerY, orbitX, orbitY) => {
    const px = centerX + body.x * orbitX / .83;
    const py = centerY + body.y * orbitY / .58;
    const radius = body.size * Math.max(.78, Math.min(1.35, Math.min(width, height) / 440));
    body.trail.push({ x: px, y: py });
    if (body.trail.length > 34) body.trail.shift();

    if (body.trail.length > 2) {
      ctx.beginPath();
      for (let i = 0; i < body.trail.length; i++) {
        const point = body.trail[i];
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.strokeStyle = `${body.color}55`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = body.color;
    ctx.shadowBlur = 17;
    ctx.beginPath();
    ctx.arc(px, py, radius * 1.18, 0, Math.PI * 2);
    ctx.fillStyle = `${body.color}29`;
    ctx.fill();
    ctx.restore();

    const ball = ctx.createRadialGradient(px - radius * .38, py - radius * .4, .4, px, py, radius);
    ball.addColorStop(0, '#fff');
    ball.addColorStop(.3, body.color);
    ball.addColorStop(1, '#151719');
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = ball;
    ctx.fill();

    if (body.name === 'JUPITER') {
      ctx.beginPath();
      ctx.ellipse(px, py, radius * 1.65, radius * .42, -.2, 0, Math.PI * 2);
      ctx.strokeStyle = '#eed1a8c4';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  };

  const render = timestamp => {
    if (document.visibilityState === 'hidden') {
      previous = 0;
      frame = requestAnimationFrame(render);
      return;
    }

    const rect = stage.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2 && (Math.abs(width - rect.width) > 1 || Math.abs(height - rect.height) > 1)) resize();
    if (width < 2 || height < 2) {
      resize();
      frame = requestAnimationFrame(render);
      return;
    }

    const dt = previous ? Math.min((timestamp - previous) / 1000, .033) : 0;
    previous = timestamp;
    if (running) {
      elapsed += dt * speed;
      advance(dt);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, width, height);
    const background = ctx.createRadialGradient(width * .5, height * .51, 1, width * .5, height * .5, Math.max(width, height) * .72);
    background.addColorStop(0, '#111611');
    background.addColorStop(.6, '#0b0d0e');
    background.addColorStop(1, '#08090a');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    for (const star of stars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(235,242,222,${star.alpha * (.75 + .25 * Math.sin(timestamp * .001 + star.phase))})`;
      ctx.fill();
    }

    const centerX = width * .5;
    const centerY = height * .52;
    const orbitX = Math.min(width * .44, height * .62);
    const orbitY = Math.min(height * .42, width * .17);
    for (const body of bodies) {
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, orbitX * body.radius / .83, orbitY * body.radius / .58, 0, 0, Math.PI * 2);
      ctx.strokeStyle = '#e2eddb21';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (pointer && running) {
      const radius = Math.min(width, height) * .2;
      const halo = ctx.createRadialGradient(pointer.x, pointer.y, 1, pointer.x, pointer.y, radius);
      halo.addColorStop(0, '#c6ff3e13');
      halo.addColorStop(1, '#c6ff3e00');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);
    }

    const sunRadius = Math.max(11, Math.min(20, height * .048));
    const glow = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, sunRadius * 5);
    glow.addColorStop(0, '#edffafa0');
    glow.addColorStop(.16, '#c6ff3e63');
    glow.addColorStop(1, '#c6ff3e00');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, sunRadius * 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = '#d6ff93';
    ctx.shadowBlur = 18;
    const sun = ctx.createRadialGradient(centerX - sunRadius * .32, centerY - sunRadius * .36, .5, centerX, centerY, sunRadius);
    sun.addColorStop(0, '#fff');
    sun.addColorStop(.4, '#f1ffc6');
    sun.addColorStop(.78, '#c6ff5b');
    sun.addColorStop(1, '#849b45');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(centerX, centerY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const body of bodies) drawBody(body, centerX, centerY, orbitX, orbitY);

    if (timer) {
      const totalSeconds = Math.floor(elapsed);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor(totalSeconds / 60) % 60).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      timer.textContent = `${hours}:${minutes}:${seconds}`;
    }

    if (coordinates && coordinates.textContent.includes('ЗАГРУЗКА')) coordinates.textContent = 'SYSTEM ONLINE · GRAVITY ACTIVE';
    frame = requestAnimationFrame(render);
  };

  const addPlanet = position => {
    if (bodies.length >= 17) {
      announce('ДОСТИГНУТ ЛИМИТ СИСТЕМЫ');
      return;
    }
    const index = bodies.length - orbits.length;
    const closest = bodies.reduce((distance, body) => Math.min(distance, body.radius), .83);
    const radius = Math.min(.83, closest + .125 + Math.max(0, index) * .01);
    let angle = rand() * Math.PI * 2;
    if (position && width > 0 && height > 0) {
      angle = Math.atan2((position.y - height * .52) / Math.max(height * .42, 1), (position.x - width * .5) / Math.max(width * .44, 1));
    }
    const velocity = Math.sqrt(mu / radius);
    bodies.push({
      name: `BODY ${String(index + 1).padStart(2, '0')}`,
      radius,
      size: 3.2 + rand() * 2.3,
      mass: .000012 + rand() * .000022,
      color: colors[(Math.max(0, index) + 1) % colors.length],
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: -Math.sin(angle) * velocity,
      vy: Math.cos(angle) * velocity,
      trail: []
    });
    updateCount();
    announce('НОВАЯ ПЛАНЕТА ДОБАВЛЕНА');
  };

  reset();
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      previous = 0;
      resize();
    }
  });

  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const rect = stage.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    stage.classList.add('is-pointer');
    if (cursor) {
      cursor.style.left = `${pointer.x}px`;
      cursor.style.top = `${pointer.y}px`;
    }
    if (coordinates) coordinates.textContent = `X ${Math.round(pointer.x)} · Y ${Math.round(pointer.y)} · FIELD ACTIVE`;
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    pointer = null;
    stage.classList.remove('is-pointer');
    if (coordinates) coordinates.textContent = 'SYSTEM ONLINE · GRAVITY ACTIVE';
  });
  canvas.addEventListener('click', event => {
    const rect = stage.getBoundingClientRect();
    addPlanet({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      addPlanet();
    }
  });

  document.querySelector('[data-universe-action="add"]')?.addEventListener('click', () => addPlanet());
  pauseButton?.addEventListener('click', () => {
    running = !running;
    if (pauseButton.firstElementChild) pauseButton.firstElementChild.textContent = running ? 'Ⅱ' : '▶';
    if (pauseLabel) pauseLabel.textContent = running ? 'ПАУЗА' : 'ПРОДОЛЖИТЬ';
    pauseButton.setAttribute('aria-label', running ? 'Приостановить симуляцию' : 'Продолжить симуляцию');
    consolePanel?.classList.toggle('is-paused', !running);
    if (status) status.textContent = running ? 'ГРАВИТАЦИОННОЕ ПОЛЕ АКТИВНО' : 'СИМУЛЯЦИЯ ПРИОСТАНОВЛЕНА';
    previous = 0;
  });
  document.querySelector('[data-universe-action="reset"]')?.addEventListener('click', () => {
    running = true;
    pauseButton?.classList.remove('is-paused');
    if (pauseIcon) pauseIcon.textContent = 'Ⅱ';
    if (pauseLabel) pauseLabel.textContent = 'ПАУЗА';
    if (pauseButton) pauseButton.setAttribute('aria-label', 'Приостановить симуляцию');
    consolePanel?.classList.remove('is-paused');
    reset(true);
    previous = 0;
  });

  speedInput?.addEventListener('input', () => {
    speed = Number(speedInput.value) / 42;
    if (speedOutput) speedOutput.textContent = `${speed.toFixed(1)}×`;
    speedInput.setAttribute('aria-valuetext', `${speed.toFixed(1)}×`);
    const progress = (Number(speedInput.value) - Number(speedInput.min)) / (Number(speedInput.max) - Number(speedInput.min)) * 100;
    speedInput.style.background = `linear-gradient(90deg, var(--acid) ${progress}%, #ffffff24 ${progress}%)`;
  });

  fullscreenButton?.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await consolePanel?.requestFullscreen?.();
    } catch {
      announce('НЕ УДАЛОСЬ ВКЛЮЧИТЬ ПОЛНЫЙ ЭКРАН');
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = document.fullscreenElement === consolePanel;
    if (fullscreenButton) {
      fullscreenButton.setAttribute('aria-label', isFullscreen ? 'Выйти из полноэкранного режима' : 'Развернуть симуляцию на весь экран');
      fullscreenButton.title = isFullscreen ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран';
    }
    if (fullscreenLabel) fullscreenLabel.textContent = isFullscreen ? 'ВЫЙТИ' : 'НА ВЕСЬ ЭКРАН';
    window.setTimeout(resize, 120);
  });

  reduceMotion.addEventListener?.('change', () => { previous = 0; });
  frame = requestAnimationFrame(render);
})();
