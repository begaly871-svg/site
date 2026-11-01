(() => {
  'use strict';

  const projects = {
    aurel: {
      number: '01 / 03',
      name: 'AUREL',
      category: 'АЙДЕНТИКА · E-COMMERCE',
      description: 'Мир предметов для жизни без спешки. Тёплая природная палитра, тактильная типографика и магазин, который помогает почувствовать вещь ещё до покупки.',
      meta: 'БРЕНДИНГ · АРТ-ДИРЕКШН · ОНЛАЙН-МАГАЗИН',
      art: 'art-a',
      action: 'ПОСМОТРЕТЬ ДРУГУЮ КОМПОЗИЦИЮ'
    },
    noir: {
      number: '02 / 03',
      name: 'NOIR RUN',
      category: 'КАМПАНИЯ · СПОРТ · DIGITAL',
      description: 'Запуск коллекции спортивной обуви, превращённый в цифровую гоночную трассу. Контрастный кислотный цвет, ритм движения и кампания, которая стартует вместе с посетителем.',
      meta: 'КРЕАТИВНАЯ КОНЦЕПЦИЯ · КАМПАНИЯ · ИНТЕРАКТИВ',
      art: 'art-b',
      action: 'ЗАПУСТИТЬ ДРУГОЙ СТАРТ'
    },
    forme: {
      number: '03 / 03',
      name: 'FORME',
      category: 'АРХИТЕКТУРА · ЦИФРОВОЙ ОПЫТ',
      description: 'Интерактивное пространство студии архитектуры. Геометрия, движение и свободная сетка показывают проект через его форму, а не через очередной шаблонный каталог.',
      meta: 'СТРАТЕГИЯ · АЙДЕНТИКА · ГЕНЕРАТИВНЫЙ САЙТ',
      art: 'art-c',
      action: 'ИЗМЕНИТЬ ФОРМУ'
    }
  };

  const modal = document.getElementById('project-modal');
  const dialog = modal?.querySelector('.project-modal-dialog');
  const artwork = document.getElementById('project-modal-art');
  let previousFocus = null;

  document.querySelectorAll('[data-project]').forEach(button => {
    button.addEventListener('click', () => {
      const project = projects[button.dataset.project];
      if (!project || !modal || !artwork) return;
      previousFocus = button;
      document.getElementById('project-modal-number').textContent = project.number;
      document.getElementById('project-modal-title').textContent = project.name;
      document.getElementById('project-modal-category').textContent = project.category;
      document.getElementById('project-modal-description').textContent = project.description;
      document.getElementById('project-modal-meta').textContent = project.meta;
      const original = button.querySelector('.project-art');
      artwork.replaceChildren(original ? original.cloneNode(true) : document.createTextNode(project.name));
      artwork.className = `project-modal-art ${project.art}`;
      const demo = document.createElement('button');
      demo.className = 'case-demo-button';
      demo.type = 'button';
      demo.innerHTML = `${project.action} <span>↗</span>`;
      demo.addEventListener('click', () => {
        artwork.classList.toggle('case-case-shift');
        demo.querySelector('span').textContent = artwork.classList.contains('case-case-shift') ? '✓' : '↗';
      });
      artwork.after(demo);
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      modal.querySelector('.project-modal-close').focus();
    });
  });

  const closeModal = () => {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    artwork?.nextElementSibling?.remove();
    previousFocus?.focus();
  };
  modal?.querySelector('#project-modal-contact')?.addEventListener('click', () => {
    closeModal();
    showInquiry();
  });
  modal?.querySelectorAll('[data-close-project]').forEach(button => button.addEventListener('click', closeModal));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });

  const inquiry = document.getElementById('inquiry-form');
  const openInquiry = document.querySelectorAll('.contact-form-trigger,.header-cta,[data-contact-inquiry]');
  const formClose = inquiry?.querySelector('.inquiry-close');
  let requestedService = '';
  const showInquiry = () => {
    if (!inquiry) return;
    inquiry.classList.add('is-open');
    document.body.classList.add('inquiry-open');
    document.querySelector('#contact .contact-note')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    window.setTimeout(() => inquiry.querySelector('input[name="Имя"]')?.focus(), 180);
  };
  document.querySelectorAll('[data-service-contact]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    requestedService = link.getAttribute('data-service-contact') || '';
    showInquiry();
    const select = inquiry?.querySelector('select[name="Направление"]');
    if (select) {
      const target = requestedService.toLowerCase();
      const map = target.includes('сайт') ? 'новый сайт' : target.includes('айдентика') || target.includes('бренд') ? 'айдентика и брендинг' : target.includes('кампан') ? 'рекламная кампания' : '';
      const match = [...select.options].find(option => option.textContent.toLowerCase() === map);
      if (match) select.value = match.value;
    }
  }));
  openInquiry.forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    requestedService = '';
    showInquiry();
  }));
  formClose?.addEventListener('click', () => {
    inquiry?.classList.remove('is-open');
    requestedService = '';
    document.body.classList.remove('inquiry-open');
  });
  // The inquiry form's submit action is handled once, in studio-extras.js.

  const zoomInput = document.getElementById('universe-zoom');
  const zoomOutput = document.getElementById('universe-zoom-output');
  const resetView = document.querySelector('[data-universe-action="camera-reset"]');
  zoomInput?.addEventListener('input', () => {
    const factor = Number(zoomInput.value) / 100;
    if (zoomOutput) zoomOutput.textContent = `${factor.toFixed(1)}×`;
    zoomInput.setAttribute('aria-valuetext', `${factor.toFixed(1)}×`);
  });
  resetView?.addEventListener('click', () => {
    if (zoomInput) zoomInput.value = '100';
    if (zoomOutput) zoomOutput.textContent = '1.0×';
  });

  const year = document.getElementById('year');
  if (year && !year.textContent) year.textContent = String(new Date().getFullYear());
})();
