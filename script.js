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

  // The canvas simulation starts independently from orbit.js.
})();
