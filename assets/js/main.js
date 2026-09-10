// Mobile menu
(() => {
  const btn = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
})();

// Email capture forms → MailerLite (every form also adds to the newsletter group,
// configured inside MailerLite). If not configured yet, we just continue to the
// thank-you page so the funnel can be tested.
document.querySelectorAll('form[data-next]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('.form-error');
    const show = (msg) => { if (err) { err.textContent = msg; err.style.display = 'block'; } };
    const email = form.querySelector('input[type=email]');
    const consent = form.querySelector('input[name=consent]');
    if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return show('Please enter a valid email address.');
    if (consent && !consent.checked) return show('Please tick the box so we can send this to you.');

    const btn = form.querySelector('button[type=submit]');
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';

    const { mlAccount: account, mlForm: formId, next } = form.dataset;
    if (account && formId) {
      const data = new FormData(form);
      data.delete('consent');
      data.append('ml-submit', '1');
      data.append('anticsrf', 'true');
      try {
        await fetch(`https://assets.mailerlite.com/jsonp/${account}/forms/${formId}/subscribe`, { method: 'POST', body: data, mode: 'no-cors' });
      } catch (_) {
        btn.disabled = false; btn.textContent = label;
        return show('Something went wrong — please check your connection and try again.');
      }
    } else {
      console.warn('MailerLite form not configured yet (see _data/settings.yml). Email was NOT saved.');
    }
    try { sessionStorage.setItem('mbe_name', form.querySelector('input[name="fields[name]"]')?.value || ''); } catch (_) {}
    window.location.href = next;
  });
});

// Personalise thank-you pages
(() => {
  const el = document.querySelector('[data-first-name]');
  if (!el) return;
  try { const n = sessionStorage.getItem('mbe_name'); if (n) el.textContent = ', ' + n.split(' ')[0]; } catch (_) {}
})();

// Privacy-friendly YouTube: only loads YouTube after a click
document.querySelectorAll('[data-youtube]').forEach((b) => {
  b.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.youtube}?autoplay=1&rel=0`;
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.title = 'Video';
    b.replaceWith(f);
  });
});

// Blog category filter
(() => {
  const bar = document.querySelector('.filters');
  if (!bar) return;
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    bar.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    const cat = b.dataset.filter;
    document.querySelectorAll('[data-category]').forEach((c) => { c.hidden = cat !== 'all' && c.dataset.category !== cat; });
  });
})();

// Weekly workshop: "Add to Google Calendar" link (Budapest time)
(() => {
  const a = document.querySelector('[data-gcal]');
  if (!a) return;
  const { day, time, duration, title, link } = a.dataset;
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const d = days.indexOf((day || '').toLowerCase());
  if (d < 0 || !/^\d{1,2}:\d{2}$/.test(time || '')) { a.hidden = true; return; }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() + ((d - start.getDay() + 7) % 7));
  const [h, m] = time.split(':').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (dt) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + (Number(duration) || 60) * 60000);
  const code = ['SU','MO','TU','WE','TH','FR','SA'][d];
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${fmt(start)}/${fmt(end)}`, ctz: 'Europe/Budapest', recur: `RRULE:FREQ=WEEKLY;BYDAY=${code}`, details: link ? `Join on Zoom: ${link}` : 'The Zoom link is in your email.' });
  a.href = `https://calendar.google.com/calendar/render?${params}`;
})();

// Certificates slideshow + lightbox
document.querySelectorAll('[data-slideshow]').forEach((ss) => {
  const track = ss.querySelector('.ss-track');
  const slides = [...track.children];
  const prev = ss.querySelector('.ss-prev');
  const next = ss.querySelector('.ss-next');
  const dotsWrap = ss.querySelector('.ss-dots');
  if (!slides.length) { ss.hidden = true; return; }
  const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20);
  const perView = () => Math.max(1, Math.round(track.clientWidth / step()));
  const pages = () => Math.max(1, slides.length - perView() + 1);
  const index = () => Math.round(track.scrollLeft / step());
  const go = (i) => track.scrollTo({ left: Math.max(0, Math.min(i, pages() - 1)) * step() });
  const renderDots = () => {
    dotsWrap.innerHTML = '';
    for (let i = 0; i < pages(); i++) {
      const d = document.createElement('button');
      d.type = 'button'; d.addEventListener('click', () => go(i));
      dotsWrap.appendChild(d);
    }
    update();
  };
  const update = () => {
    const i = index();
    [...dotsWrap.children].forEach((d, n) => d.setAttribute('aria-current', n === i));
    prev.disabled = i <= 0; next.disabled = i >= pages() - 1;
    const hide = pages() <= 1; prev.hidden = next.hidden = dotsWrap.hidden = hide;
  };
  prev.addEventListener('click', () => go(index() - 1));
  next.addEventListener('click', () => go(index() + 1));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', renderDots);
  renderDots();

  // gentle autoplay, paused while the visitor interacts
  let paused = false;
  ['mouseenter', 'focusin', 'touchstart'].forEach((ev) => ss.addEventListener(ev, () => { paused = true; }, { passive: true }));
  ['mouseleave', 'focusout'].forEach((ev) => ss.addEventListener(ev, () => { paused = false; }));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => { if (!paused && pages() > 1) go(index() >= pages() - 1 ? 0 : index() + 1); }, 4500);
  }

  // click to enlarge
  const box = ss.parentElement.querySelector('.lightbox');
  if (box && box.showModal) {
    slides.forEach((s) => s.addEventListener('click', () => { box.querySelector('img').src = s.dataset.full; box.showModal(); }));
    box.addEventListener('click', () => box.close());
  } else {
    slides.forEach((s) => s.addEventListener('click', () => window.open(s.dataset.full, '_blank')));
  }
});
