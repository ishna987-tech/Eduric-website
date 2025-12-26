(function(){
  const burger = document.querySelector('[data-burger]');
  const mobile = document.querySelector('[data-mobile]');
  if (burger && mobile){
    burger.addEventListener('click', ()=>{
      const open = mobile.getAttribute('data-open') === 'true';
      mobile.setAttribute('data-open', String(!open));
      mobile.style.display = open ? 'none' : 'block';
      burger.setAttribute('aria-expanded', String(!open));
    });
  }

  // Contact form -> mailto (static-friendly)
  const form = document.querySelector('form[data-mailto]');
  if (form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const email = form.getAttribute('data-mailto');
      const subject = form.querySelector('[name="subject"]')?.value || 'Eduric inquiry';
      const name = form.querySelector('[name="name"]')?.value || '';
      const company = form.querySelector('[name="company"]')?.value || '';
      const message = form.querySelector('[name="message"]')?.value || '';
      const body = [
        `Name: ${name}`,
        `Company: ${company}`,
        '',
        message
      ].join('\n');

      const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = href;
    });
  }
})();
