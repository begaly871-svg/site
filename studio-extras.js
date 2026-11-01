(() => {
  'use strict';

  const projectModal = document.getElementById('project-modal');
  const inquiryForm = document.getElementById('inquiry-form');

  if (projectModal && projectModal.dataset.keyboardAccess !== 'enabled') {
    projectModal.dataset.keyboardAccess = 'enabled';
    projectModal.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || projectModal.hidden) return;
      const controls = [...projectModal.querySelectorAll(
        'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )].filter(element => element.getClientRects().length > 0);
      if (!controls.length) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls[controls.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault();
        controls[0].focus();
      }
    });
  }

  if (inquiryForm && inquiryForm.dataset.emailDraftHandler !== 'enabled') {
    inquiryForm.dataset.emailDraftHandler = 'enabled';
    inquiryForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!inquiryForm.reportValidity()) return;

      const values = Object.fromEntries(new FormData(inquiryForm).entries());
      const name = String(values['Имя'] || '').trim();
      const replyTo = String(values['Почта'] || '').trim();
      const category = String(values['Направление'] || '').trim();
      const description = String(values['Описание'] || '').trim();
      if (!name || !replyTo || !category || !description) return;

      const subject = `ORBIT — ${category}`;
      const message = [
        `Имя: ${name}`,
        `Email для ответа: ${replyTo}`,
        `Услуга: ${category}`,
        'Студия: Бишкек, Кыргызстан',
        '',
        'Описание проекта:',
        description
      ].join('\n');
      const encodedSubject = encodeURIComponent(subject);
      const encodedMessage = encodeURIComponent(message);
      const buttons = inquiryForm.querySelector('.form-compose-actions');
      const gmailButton = buttons?.querySelector('.form-open-gmail');
      const mailButton = buttons?.querySelector('.form-email-fallback');
      if (!buttons || !gmailButton || !mailButton) return;

      gmailButton.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent('begaly871@gmail.com')}&su=${encodedSubject}&body=${encodedMessage}`;
      mailButton.href = `mailto:begaly871@gmail.com?subject=${encodedSubject}&body=${encodedMessage}`;
      buttons.hidden = false;

      const submit = inquiryForm.querySelector('button[type="submit"]');
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'ВЫБЕРИТЕ ПОЧТУ НИЖЕ';
      }

      let confirmation = inquiryForm.querySelector('.inquiry-success');
      if (!confirmation) {
        confirmation = document.createElement('p');
        confirmation.className = 'inquiry-success';
        confirmation.setAttribute('role', 'status');
        buttons.after(confirmation);
      }
      confirmation.textContent = 'Черновик подготовлен. Откройте Gmail или почтовое приложение и нажмите «Отправить». Сайт не отправляет письмо без вашего согласия.';
    });
  }
})();
