(() => {
  'use strict';

  const modal = document.getElementById('project-modal');
  if (modal && modal.dataset.keyboardReady !== 'true') {
    modal.dataset.keyboardReady = 'true';
    modal.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || modal.hidden) return;
      const items = [...modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled])')]
        .filter(element => element.getClientRects().length);
      if (!items.length) return event.preventDefault();
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault(); items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault(); items[0].focus();
      }
    });
  }

  const form = document.getElementById('inquiry-form');
  if (form && form.dataset.submitReady !== 'true') {
    form.dataset.submitReady = 'true';
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const get = key => String(data.get(key) || '').trim();
      const name = get('Имя');
      const email = get('Почта');
      const service = get('Направление');
      const description = get('Описание');
      if (!name || !email || !service || !description) return;

      const subject = `ORBIT — ${service}`;
      const message = [
        `Имя: ${name}`,
        `Email для ответа: ${email}`,
        `Услуга: ${service}`,
        'Студия: Бишкек, Кыргызстан',
        '',
        'Описание проекта:',
        description
      ].join('\n');
      const recipient = 'begaly871@gmail.com';
      const encodedSubject = encodeURIComponent(subject);
      const encodedMessage = encodeURIComponent(message);
      const actions = form.querySelector('.form-compose-actions');
      const gmail = actions?.querySelector('.form-open-gmail');
      const mailto = actions?.querySelector('.form-email-fallback');
      if (!actions || !gmail || !mailto) return;

      gmail.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodedSubject}&body=${encodedMessage}`;
      mailto.href = `mailto:${recipient}?subject=${encodedSubject}&body=${encodedMessage}`;
      actions.hidden = false;
      const submit = form.querySelector('button[type="submit"]');
      if (submit) {
        submit.disabled = true;
        submit.replaceChildren(document.createTextNode('ЧЕРНОВИК ПОДГОТОВЛЕН'));
      }
      let confirmation = form.querySelector('.inquiry-success');
      if (!confirmation) {
        confirmation = document.createElement('p');
        confirmation.className = 'inquiry-success';
        confirmation.setAttribute('role', 'status');
        actions.after(confirmation);
      }
      confirmation.textContent = 'Черновик готов. Нажмите «Открыть черновик Gmail» или «Открыть почтовое приложение», затем нажмите «Отправить». Данные заявки не отправляются без вашего согласия.';
    });
  }
})();
