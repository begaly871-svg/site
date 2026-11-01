(() => {
  const preloader = document.querySelector('.preloader');
  const finishLoading = () => window.setTimeout(() => preloader?.classList.add('done'), 1050);
  if (document.readyState === 'complete') finishLoading();
  else window.addEventListener('load', finishLoading, { once: true });

  const year = document.querySelector('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    nav?.classList.toggle('open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Открыть меню');
  }));

  const glow = document.querySelector('.pointer-glow');
  if (glow && matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', event => {
      glow.style.opacity = '1';
      glow.style.transform = `translate(${event.clientX - 210}px, ${event.clientY - 210}px)`;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; });
  }

  document.querySelectorAll('.magnetic').forEach(element => {
    element.addEventListener('pointermove', event => {
      if (!matchMedia('(pointer:fine)').matches) return;
      const box = element.getBoundingClientRect();
      const x = event.clientX - box.left - box.width / 2;
      const y = event.clientY - box.top - box.height / 2;
      element.style.transform = `translate(${x * 0.12}px, ${y * 0.16}px)`;
    });
    element.addEventListener('pointerleave', () => { element.style.transform = ''; });
  });

  const universeCanvas = document.querySelector('#universe-canvas');
  if (universeCanvas) {
    const ctx = universeCanvas.getContext('2d', { alpha: false });
    const simulationReady = () => { document.documentElement.setAttribute('data-simulator', 'ready'); };
    if (ctx) simulationReady();
    const stage = document.querySelector('#universe-stage');
    const timeOutput = document.querySelector('#universe-time');
    const coordinateOutput = document.querySelector('#universe-coordinate');
    const cursor = document.querySelector('#universe-cursor');
    const toast = document.querySelector('#universe-toast');
    const consolePanel = document.querySelector('.universe-console');
    const statusOutput = document.querySelector('#universe-status-text');
    const planetCountOutput = document.querySelector('#planet-count');
    const speedInput = document.querySelector('#universe-speed');
    const speedOutput = document.querySelector('#universe-speed-output');
    const toggleButton = document.querySelector('[data-universe-action="toggle"]');
    const fullscreenButton = document.querySelector('[data-universe-action="fullscreen"]');
    const fullscreenLabel = document.querySelector('.universe-fullscreen-label');
    const toggleLabel = document.querySelector('.sim-toggle-label');
    const playIcon = document.querySelector('.sim-play-icon');
    const maxBodies = 18;
    const animationMotionScale = reducedMotion ? .22 : 1;
    const palettes = ['#c6ff3e', '#b39aff', '#ff996d', '#68ddff', '#ffc968', '#ff80b7', '#83f1c7'];
    const initialBodies = [
      { name: 'MERCURY', distance: .135, size: 3.1, color: '#a69c8b', angle: .5 },
      { name: 'VENUS', distance: .21, size: 5, color: '#e4bd83', angle: 3.9 },
      { name: 'EARTH', distance: .3, size: 5.5, color: '#68ddff', angle: 2.3 },
      { name: 'MARS', distance: .39, size: 4.1, color: '#ff886c', angle: 4.8 },
      { name: 'JUPITER', distance: .51, size: 8.6, color: '#d7b18d', angle: 1.5 }
    ];
    let bodies = [];
    let stars = [];
    let gravityFrameCount = 0;
    const starMass = .055;
    const gravityStrength = 1;
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let lastAnnouncedCount = 0;
    let toastTimer = 0;
    let isRunning = true;
    let isVisible = true;
    let pointer = null;
    let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let speedMultiplier = Number(speedInput?.value || 42) / 42 * (reducedMotion ? .22 : 1);

    const seedRandom = seed => () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const seededRandom = seedRandom(731942);
    const setBodyCount = () => {
      const count = bodies.length + 1;
      if (planetCountOutput) planetCountOutput.textContent = String(count).padStart(2, '0');
    };
    const resetBodies = () => {
      bodies = initialBodies.map((body, index) => {
        const distance = .155 + index * .083;
        const angle = body.angle;
        const orbitSpeed = Math.sqrt((gravityStrength * starMass) / (distance * distance * distance));
        return {
          ...body,
          mass: index === 4 ? .0015 : index === 2 ? .00012 : .00005 + index * .000008,
          phase: angle,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          vx: -Math.sin(angle) * orbitSpeed,
          vy: Math.cos(angle) * orbitSpeed,
          trail: [],
          seed: seededRandom()
        };
      });
      gravityFrameCount = 0;
      setBodyCount();
      elapsed = 0;
      if (timeOutput) timeOutput.textContent = '00:00:00';
      if (isRunning && statusOutput) statusOutput.textContent = 'ГРАВИТАЦИОННОЕ ПОЛЕ АКТИВНО';
    };
    const announce = message => {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1700);
    };
    const resize = () => {
      const box = stage.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      universeCanvas.width = Math.round(width * dpr);
      universeCanvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const random = seedRandom(731942);
      stars = Array.from({ length: Math.max(55, Math.min(160, Math.round(width * height / 3000))) }, () => ({
        x: random() * width,
        y: random() * height,
        r: .35 + random() * .85,
        phase: random() * Math.PI * 2,
        brightness: .14 + random() * .5
      }));
    };
    const advanceGravity = delta => {
      const steps = reducedMotion ? 1 : 2;
      const step = delta * speedMultiplier / steps;
      for (let substep = 0; substep < steps; substep++) {
        for (const body of bodies) {
          let ax = 0;
          let ay = 0;
          const distanceSquared = Math.max(body.x * body.x + body.y * body.y, .0064);
          const distanceCubed = distanceSquared * Math.sqrt(distanceSquared);
          ax -= gravityStrength * starMass * body.x / distanceCubed;
          ay -= gravityStrength * starMass * body.y / distanceCubed;
          for (const other of bodies) {
            if (body === other) continue;
            const dx = other.x - body.x;
            const dy = other.y - body.y;
            const squared = dx * dx + dy * dy;
            if (squared < .0009) continue;
            const distance = Math.sqrt(squared);
            const force = gravityStrength * other.mass / (squared + .0009);
            ax += force * dx / distance;
            ay += force * dy / distance;
          }
          if (pointer && !reducedMotion) {
            const dx = (pointer.x / Math.max(width, 1) - .5) * 1.5 - body.x;
            const dy = (pointer.y / Math.max(height, 1) - .5) * .72 - body.y;
            const squared = dx * dx + dy * dy;
            if (squared < 1.44) {
              const distance = Math.sqrt(Math.max(squared, .0009));
              const force = .12 * (1 - distance / 1.2) / (squared + .025);
              ax += force * dx / distance;
              ay += force * dy / distance;
            }
          }
          body.vx += ax * step * .5;
          body.vy += ay * step * .5;
        }
        for (const body of bodies) {
          body.x += body.vx * step;
          body.y += body.vy * step;
        }
        for (const body of bodies) {
          let ax = 0;
          let ay = 0;
          const distanceSquared = Math.max(body.x * body.x + body.y * body.y, .0064);
          const distanceCubed = distanceSquared * Math.sqrt(distanceSquared);
          ax -= gravityStrength * starMass * body.x / distanceCubed;
          ay -= gravityStrength * starMass * body.y / distanceCubed;
          for (const other of bodies) {
            if (body === other) continue;
            const dx = other.x - body.x;
            const dy = other.y - body.y;
            const squared = dx * dx + dy * dy;
            if (squared < .0009) continue;
            const distance = Math.sqrt(squared);
            const force = gravityStrength * other.mass / (squared + .0009);
            ax += force * dx / distance;
            ay += force * dy / distance;
          }
          if (pointer && !reducedMotion) {
            const dx = (pointer.x / Math.max(width, 1) - .5) * 1.5 - body.x;
            const dy = (pointer.y / Math.max(height, 1) - .5) * .72 - body.y;
            const squared = dx * dx + dy * dy;
            if (squared < 1.44) {
              const distance = Math.sqrt(Math.max(squared, .0009));
              const force = 8 * (1 - distance / 1.2) / (squared + .025);
              ax += force * dx / distance;
              ay += force * dy / distance;
            }
          }
          body.vx += ax * step * .5;
          body.vy += ay * step * .5;
          const distance = Math.hypot(body.x, body.y);
          if (!Number.isFinite(distance) || distance < .065 || distance > 1.48 || !Number.isFinite(body.vx + body.vy)) {
            const angle = seededRandom() * Math.PI * 2;
            const radius = .21 + seededRandom() * .27;
            const orbitSpeed = Math.sqrt((gravityStrength * starMass) / (radius * radius * radius));
            body.x = Math.cos(angle) * radius;
            body.y = Math.sin(angle) * radius;
            body.vx = -Math.sin(angle) * orbitSpeed;
            body.vy = Math.cos(angle) * orbitSpeed;
            body.trail.length = 0;
          }
          body.phase = Math.atan2(body.y, body.x);
          body.distance = Math.hypot(body.x, body.y);
        }
      }
    };
    const drawBody = (body, centerX, centerY, rx, ry, time, delta) => {
      const px = centerX + body.x / 1.05 * rx;
      const py = centerY + body.y / .72 * ry;
      const radius = body.size * Math.max(.72, Math.min(1.22, Math.min(width, height) / 460));
      body.trail.push({ x: px, y: py });
      if (body.trail.length > 24) body.trail.shift();
      for (let index = 1; index < body.trail.length; index++) {
        const progress = index / body.trail.length;
        ctx.beginPath();
        ctx.moveTo(body.trail[index - 1].x, body.trail[index - 1].y);
        ctx.lineTo(body.trail[index].x, body.trail[index].y);
        ctx.strokeStyle = `${body.color}${Math.round(progress * 57).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = .6 + progress * .9;
        ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = body.color;
      ctx.shadowBlur = body.name === 'JUPITER' ? 22 : 17;
      ctx.beginPath();
      ctx.arc(px, py, radius * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = `${body.color}20`;
      ctx.fill();
      ctx.restore();
      const surface = ctx.createRadialGradient(px - radius * .38, py - radius * .42, radius * .07, px, py, radius);
      surface.addColorStop(0, '#ffffff');
      surface.addColorStop(.19, body.color);
      surface.addColorStop(1, '#141518');
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = surface;
      ctx.fill();
      if (body.name === 'EARTH') {
        ctx.beginPath();
        ctx.arc(px, py, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#68ddff32';
        ctx.lineWidth = .7;
        ctx.stroke();
      }
      if (body.name === 'JUPITER') {
        ctx.beginPath();
        ctx.ellipse(px, py, radius * 1.72, radius * .48, -.24, 0, Math.PI * 2);
        ctx.strokeStyle = '#e2c094a0';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      return { x: px, y: py, distance: Math.hypot((pointer?.x ?? -1000) - px, (pointer?.y ?? -1000) - py) };
    };
    const render = timestamp => {
      animationFrame = window.requestAnimationFrame(render);
      if (!isVisible || !width || !height || !ctx) {
        lastFrame = timestamp;
        return;
      }
      const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, .05) : 0;
      lastFrame = timestamp;
      if (isRunning) elapsed += delta * speedMultiplier;
      ctx.clearRect(0, 0, width, height);
      const backdrop = ctx.createRadialGradient(width * .5, height * .49, 2, width * .5, height * .49, Math.max(width, height) * .72);
      backdrop.addColorStop(0, '#111610');
      backdrop.addColorStop(.56, '#0c0d0f');
      backdrop.addColorStop(1, '#090a0b');
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, width, height);
      for (const star of stars) {
        const twinkle = .55 + .45 * Math.sin(timestamp * .00065 + star.phase);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234,238,217,${star.brightness * twinkle})`;
        ctx.fill();
      }
      const centerX = width * .5;
      const centerY = height * .53;
      const rx = Math.min(width * .455, height * .67);
      const ry = Math.min(height * .42, width * .16);
      if (gravityFrameCount === 0 || gravityFrameCount % 60 === 0) {
        for (const body of bodies) body.trail.length = 0;
      }
      for (const body of bodies) {
        const orbit = body.trail;
        if (orbit.length > 4) {
          ctx.beginPath();
          orbit.forEach((point, index) => {
            const x = centerX + point.x / 1.05 * rx;
            const y = centerY + point.y / .72 * ry;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.strokeStyle = `${body.color}30`;
          ctx.lineWidth = .75;
          ctx.stroke();
        }
      }
      if (pointer && isRunning && !reducedMotion) {
        const field = ctx.createRadialGradient(pointer.x, pointer.y, 1, pointer.x, pointer.y, Math.min(width, height) * .25);
        field.addColorStop(0, '#c6ff3e0c');
        field.addColorStop(.45, '#c6ff3e05');
        field.addColorStop(1, '#c6ff3e00');
        ctx.fillStyle = field;
        ctx.fillRect(0, 0, width, height);
      }
      const sunRadius = Math.max(12, Math.min(20, height * .05));
      const sunGlow = ctx.createRadialGradient(centerX, centerY, sunRadius * .25, centerX, centerY, sunRadius * 4.6);
      sunGlow.addColorStop(0, '#fff3b778');
      sunGlow.addColorStop(.28, '#c6ff3e31');
      sunGlow.addColorStop(1, '#c6ff3e00');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sunRadius * 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = '#e4f6a7';
      ctx.shadowBlur = 19;
      const sun = ctx.createRadialGradient(centerX - sunRadius * .34, centerY - sunRadius * .37, 1, centerX, centerY, sunRadius);
      sun.addColorStop(0, '#ffffff');
      sun.addColorStop(.34, '#f4f4ce');
      sun.addColorStop(.75, '#c6ff79');
      sun.addColorStop(1, '#718e3c');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sunRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      let closest = Infinity;
      if (isRunning) {
        advanceGravity(Math.min(delta, .05));
        gravityFrameCount++;
      }
      for (const body of bodies) {
        const position = drawBody(body, centerX, centerY, rx, ry, timestamp, delta);
        if (body.trail.length > 100) body.trail.shift();
        if (body.name === 'EARTH') closest = position.distance;
      }
      if (pointer && closest < 48) {
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 13 + Math.sin(timestamp * .004) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#c6ff3e83';
        ctx.lineWidth = .8;
        ctx.stroke();
      }
      const hours = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const minutes = Math.floor(elapsed % 60).toString().padStart(2, '0');
      const seconds = Math.floor((elapsed * 60) % 60).toString().padStart(2, '0');
      if (timeOutput) timeOutput.textContent = `${hours}:${minutes}:${seconds}`;
    };
    const addPlanet = position => {
      if (bodies.length >= maxBodies - 1) {
        announce('ДОСТИГНУТ ЛИМИТ СИСТЕМЫ');
        return;
      }
      const index = bodies.length - initialBodies.length;
      const palette = palettes[(Math.max(index, 0) + 1) % palettes.length];
      const angle = position ? Math.atan2((position.y - height * .53) / Math.max(height * .42, 1), (position.x - width * .5) / Math.max(width * .455, 1)) : seededRandom() * Math.PI * 2;
      const nearestOrbit = bodies.reduce((nearest, body) => Math.min(nearest, Math.hypot(body.x, body.y)), 1);
      const distance = Math.min(.94, nearestOrbit + .125 + index * .012);
      const mass = .00004 + seededRandom() * .00006;
      const orbitSpeed = Math.sqrt((gravityStrength * starMass) / (distance * distance * distance));
      bodies.push({
        name: `BODY ${String(index + 1).padStart(2, '0')}`,
        distance,
        size: 3 + seededRandom() * 2.4,
        mass,
        color: palette,
        phase: angle,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        vx: -Math.sin(angle) * orbitSpeed,
        vy: Math.cos(angle) * orbitSpeed,
        trail: [],
        seed: seededRandom()
      });
      setBodyCount();
      announce(`НОВАЯ ПЛАНЕТА ДОБАВЛЕНА · ${String(bodies.length + 1).padStart(2, '0')}/${maxBodies}`);
    };
    resetBodies();
    resize();
    if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize, { passive: true });
    if (typeof ResizeObserver === 'function') {
      const resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(stage);
      resizeObserver.observe(consolePanel);
      window.setTimeout(resize, 80);
      window.setTimeout(resize, 300);
      window.setTimeout(resize, 900);
    }
    const updateVisibility = () => {
      isVisible = document.visibilityState !== 'hidden';
      if (isVisible) {
        lastFrame = 0;
        resize();
      }
    };
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();
    if (toggleButton) toggleButton.addEventListener('click', () => {
      isRunning = !isRunning;
      toggleButton.setAttribute('aria-label', isRunning ? 'Приостановить симуляцию' : 'Продолжить симуляцию');
      if (toggleButton.firstElementChild) toggleButton.firstElementChild.textContent = isRunning ? 'Ⅱ' : '▶';
      if (toggleLabel) toggleLabel.textContent = isRunning ? 'ПАУЗА' : 'ПРОДОЛЖИТЬ';
      if (consolePanel) consolePanel.classList.toggle('is-paused', !isRunning);
      if (statusOutput) statusOutput.textContent = isRunning ? 'ГРАВИТАЦИОННОЕ ПОЛЕ АКТИВНО' : 'СИМУЛЯЦИЯ ПРИОСТАНОВЛЕНА';
      lastFrame = 0;
    });
    document.querySelector('[data-universe-action="add"]')?.addEventListener('click', () => addPlanet());
    fullscreenButton?.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement === consolePanel) {
          await document.exitFullscreen();
        } else if (consolePanel?.requestFullscreen) {
          await consolePanel.requestFullscreen();
        } else {
          announce('ПОЛНОЭКРАННЫЙ РЕЖИМ НЕДОСТУПЕН');
        }
      } catch {
        announce('НЕ УДАЛОСЬ ОТКРЫТЬ ПОЛНОЭКРАННЫЙ РЕЖИМ');
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const active = document.fullscreenElement === consolePanel;
      if (fullscreenButton) {
        fullscreenButton.setAttribute('aria-label', active ? 'Выйти из полноэкранного режима' : 'Развернуть симуляцию на весь экран');
        fullscreenButton.setAttribute('title', active ? 'Выйти из полноэкранного режима' : 'Развернуть на весь экран');
      }
      if (fullscreenLabel) fullscreenLabel.textContent = active ? 'ВЫЙТИ' : 'НА ВЕСЬ ЭКРАН';
      window.setTimeout(resize, 80);
    });
    document.querySelector('[data-universe-action="reset"]')?.addEventListener('click', () => {
      resetBodies();
      isRunning = true;
      if (toggleButton) {
        toggleButton.setAttribute('aria-label', 'Приостановить симуляцию');
        if (toggleButton.firstElementChild) toggleButton.firstElementChild.textContent = 'Ⅱ';
      }
      if (toggleLabel) toggleLabel.textContent = 'ПАУЗА';
      if (consolePanel) consolePanel.classList.remove('is-paused');
      announce('СИСТЕМА ПЕРЕЗАПУЩЕНА');
    });
    speedInput?.addEventListener('input', () => {
      speedMultiplier = (Number(speedInput.value) / 42) * animationMotionScale;
      const text = `${speedMultiplier.toFixed(1)}×`;
      if (speedOutput) speedOutput.textContent = text;
      speedInput.setAttribute('aria-valuetext', text);
      const progress = ((Number(speedInput.value) - Number(speedInput.min)) / (Number(speedInput.max) - Number(speedInput.min))) * 100;
      speedInput.style.background = `linear-gradient(90deg,var(--acid) ${progress}%,#ffffff24 ${progress}%)`;
    });
    stage.addEventListener('pointermove', event => {
      if (!matchMedia('(pointer:fine)').matches) return;
      const box = stage.getBoundingClientRect();
      pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
      stage.classList.add('is-pointer');
      if (cursor) {
        cursor.style.left = `${pointer.x}px`;
        cursor.style.top = `${pointer.y}px`;
      }
      if (coordinateOutput) coordinateOutput.textContent = `X ${Math.round(pointer.x).toString().padStart(3, '0')} · Y ${Math.round(pointer.y).toString().padStart(3, '0')} · FIELD ACTIVE`;
    }, { passive: true });
    stage.addEventListener('pointerleave', () => {
      pointer = null;
      stage.classList.remove('is-pointer');
      if (coordinateOutput) coordinateOutput.textContent = 'SYSTEM ONLINE · GRAVITY ACTIVE';
    });
    universeCanvas.addEventListener('click', event => {
      const box = stage.getBoundingClientRect();
      addPlanet({ x: event.clientX - box.left, y: event.clientY - box.top });
    });
    universeCanvas.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        addPlanet();
      }
    });
    const motionPreference = event => { reducedMotion = event.matches; };
    if (matchMedia('(prefers-reduced-motion: reduce)').addEventListener) matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', motionPreference);
    animationFrame = window.requestAnimationFrame(render);
    window.addEventListener('pagehide', () => window.cancelAnimationFrame(animationFrame), { once: true });
  }
})();
