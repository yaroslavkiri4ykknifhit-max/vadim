'use strict';

document.documentElement.classList.replace('no-js', 'js');

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function track(event, details = {}) {
  const payload = { event, service: document.body.dataset.service || 'home', ...details };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  if (typeof window.gtag === 'function') window.gtag('event', event, details);
  const counter = document.body.dataset.metrika;
  if (counter && typeof window.ym === 'function') window.ym(Number(counter), 'reachGoal', event, details);
}

/* ==========================================================================
   Header & Mobile Navigation Menu
   ========================================================================== */
const menuButton = $('.menu-toggle');
const navigation = $('#navigation');

function closeMenu(returnFocus = false) {
  if (!menuButton || !navigation) return;
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Открыть меню');
  if (returnFocus) menuButton.focus();
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
});

navigation?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('click', event => {
  if (!event.target.closest('.header') && navigation?.classList.contains('open')) {
    closeMenu();
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation?.classList.contains('open')) {
    closeMenu(true);
  }
});

matchMedia('(min-width: 860px)').addEventListener('change', event => {
  if (event.matches) closeMenu();
});

/* ==========================================================================
   Interactive Bento Showcase Carousel (Auto-rotation & Dots)
   ========================================================================== */
const carouselSlides = $$('.carousel-slide');
const carouselDots = $$('.carousel-dot');
let carouselIndex = 0;
let carouselTimer = null;

function showSlide(index) {
  if (!carouselSlides.length) return;
  carouselIndex = (index + carouselSlides.length) % carouselSlides.length;
  carouselSlides.forEach((slide, i) => {
    slide.classList.toggle('active', i === carouselIndex);
  });
  carouselDots.forEach((dot, i) => {
    dot.classList.toggle('active', i === carouselIndex);
  });
}

function startCarousel() {
  if (!carouselSlides.length) return;
  stopCarousel();
  carouselTimer = setInterval(() => {
    showSlide(carouselIndex + 1);
  }, 4200);
}

function stopCarousel() {
  if (carouselTimer) clearInterval(carouselTimer);
}

if (carouselSlides.length > 0) {
  showSlide(0);
  startCarousel();

  carouselDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = Number(dot.dataset.index || 0);
      showSlide(idx);
      startCarousel();
    });
  });

  const carouselBox = $('.bento-card-carousel');
  carouselBox?.addEventListener('mouseenter', stopCarousel);
  carouselBox?.addEventListener('mouseleave', startCarousel);
}

/* ==========================================================================
   Interactive Feature Showcase Tabs ("Everything lives in one quiet app")
   ========================================================================== */
const featureTabs = $$('.feature-tab-btn');
const featureTitle = $('#feature-active-title');
const featureDesc = $('#feature-active-desc');
const featureImage = $('#feature-active-img');
const featureBadgeTitle = $('#feature-active-badge-title');
const featureBadgeSub = $('#feature-active-badge-sub');

featureTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    featureTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    if (featureTitle && tab.dataset.title) featureTitle.textContent = tab.dataset.title;
    if (featureDesc && tab.dataset.desc) featureDesc.textContent = tab.dataset.desc;
    if (featureBadgeTitle && tab.dataset.badgeTitle) featureBadgeTitle.textContent = tab.dataset.badgeTitle;
    if (featureBadgeSub && tab.dataset.badgeSub) featureBadgeSub.textContent = tab.dataset.badgeSub;

    if (featureImage && tab.dataset.img) {
      featureImage.style.opacity = '0';
      setTimeout(() => {
        featureImage.src = tab.dataset.img;
        featureImage.alt = tab.dataset.title || '';
        featureImage.style.opacity = '1';
      }, 150);
    }
  });
});

/* ==========================================================================
   Horizontal Snapping Carousel Scroll Arrows
   ========================================================================== */
const snapTrack = $('.carousel-snap-track');
const prevBtn = $('#carousel-prev');
const nextBtn = $('#carousel-next');

prevBtn?.addEventListener('click', () => {
  if (snapTrack) snapTrack.scrollBy({ left: -320, behavior: 'smooth' });
});

nextBtn?.addEventListener('click', () => {
  if (snapTrack) snapTrack.scrollBy({ left: 320, behavior: 'smooth' });
});

/* ==========================================================================
   Floating Cursor Tooltip (nor.ma Signature)
   ========================================================================== */
const cursorTip = $('.cursor-tooltip');
const trustCard = $('.trust-layer');

if (cursorTip && trustCard && matchMedia('(pointer: fine)').matches) {
  trustCard.addEventListener('mouseenter', () => {
    cursorTip.style.opacity = '1';
  });
  trustCard.addEventListener('mouseleave', () => {
    cursorTip.style.opacity = '0';
  });
  trustCard.addEventListener('mousemove', event => {
    cursorTip.style.left = `${event.clientX}px`;
    cursorTip.style.top = `${event.clientY}px`;
  });
}

/* ==========================================================================
   Weekday / Weekend Rate Switcher
   ========================================================================== */
$$('[data-period]').forEach(button => {
  button.addEventListener('click', () => {
    const weekend = button.dataset.period === 'weekend';
    $$('[data-period]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    $$('[data-weekday][data-weekend]').forEach(item => {
      item.textContent = weekend ? item.dataset.weekend : item.dataset.weekday;
    });
    const periodLabel = $('#rate-period');
    if (periodLabel) {
      periodLabel.textContent = weekend ? 'Тарифы на субботу и воскресенье' : 'Тарифы на понедельник — пятницу';
    }
    track('price_period', { period: button.dataset.period });
  });
});

/* ==========================================================================
   Booking Dialog & Modal System
   ========================================================================== */
const booking = $('#booking-dialog');
const form = $('#booking-form');
let bookingContext = '';

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

if (form) {
  const dateInput = $('#booking-date');
  if (dateInput) dateInput.min = localDate();
}

function showDialog(dialog) {
  if (!dialog || typeof dialog.showModal !== 'function') return false;
  closeMenu();
  dialog.showModal();
  document.body.classList.add('modal-open');
  return true;
}

$$('[data-book]').forEach(link => {
  link.addEventListener('click', event => {
    if (!booking || typeof booking.showModal !== 'function') return;
    event.preventDefault();
    const service = link.dataset.book || document.body.dataset.service || 'enduro';
    const choice = $(`input[name="service"][value="${service}"]`, form);
    if (choice) choice.checked = true;

    bookingContext = link.dataset.context || '';
    const contextEl = $('#booking-context');
    if (contextEl) {
      contextEl.textContent = bookingContext;
      contextEl.hidden = !bookingContext;
    }

    const err = $('#booking-error');
    if (err) err.hidden = true;
    const handoff = $('#booking-handoff');
    if (handoff) handoff.hidden = true;
    const fallback = $('#booking-fallback');
    if (fallback) fallback.hidden = true;

    const dateInput = $('#booking-date');
    if (dateInput) dateInput.min = localDate();

    showDialog(booking);
    track('booking_open', { selected_service: service });
  });
});

$$('dialog').forEach(dialog => {
  $('[data-close]', dialog)?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    ) {
      dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    if (!$('dialog[open]')) document.body.classList.remove('modal-open');
  });
});

const serviceLabels = {
  enduro: 'Прокат эндуро',
  evacuator: 'Эвакуатор',
  limuzin: 'Аренда лимузина',
  moto: 'Прокат дорожного мотоцикла'
};

form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const service = String(data.get('service') || 'enduro');
  const dateValue = String(data.get('date') || '');
  const error = $('#booking-error');

  if (dateValue && dateValue < localDate()) {
    if (error) {
      error.textContent = 'Выберите сегодняшнюю или будущую дату.';
      error.hidden = false;
    }
    $('#booking-date')?.focus();
    return;
  }
  if (error) error.hidden = true;

  const lines = [`Здравствуйте! Интересует ${serviceLabels[service] || serviceLabels.enduro}.`];
  if (bookingContext) lines.push(`Вариант: ${bookingContext}.`);
  const name = String(data.get('name') || '').trim();
  const comment = String(data.get('comment') || '').trim();
  if (name) lines.push(`Меня зовут ${name}.`);
  if (dateValue) lines.push(`Дата: ${dateValue.split('-').reverse().join('.')}.`);
  if (comment) lines.push(comment);
  lines.push('Подскажите, пожалуйста, доступность и итоговую стоимость.');

  const text = encodeURIComponent(lines.join('\n'));
  const channel = event.submitter?.value === 'telegram' ? 'telegram' : 'whatsapp';
  const url = channel === 'telegram'
    ? `https://t.me/vadim3030?text=${text}`
    : `https://wa.me/375296701633?text=${text}`;

  track('messenger_open', { channel, selected_service: service });
  window.open(url, '_blank', 'noopener,noreferrer');

  const handoff = $('#booking-handoff');
  if (handoff) {
    handoff.hidden = false;
    handoff.textContent = `Откроется ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'}. Нажмите «Отправить» в чате, чтобы мы получили ваше сообщение.`;
  }
  const fallback = $('#booking-fallback');
  if (fallback) {
    fallback.href = url;
    fallback.hidden = false;
  }
});

$$('input[name="service"]', form || document).forEach(radio => {
  radio.addEventListener('change', () => {
    bookingContext = '';
    const ctx = $('#booking-context');
    if (ctx) ctx.hidden = true;
  });
});

/* ==========================================================================
   Photo Gallery Lightbox
   ========================================================================== */
const lightbox = $('#lightbox');
$$('[data-gallery]').forEach(button => {
  button.addEventListener('click', () => {
    const source = $('img', button);
    if (!source || !lightbox) return;
    const imgEl = $('#lightbox-img');
    const captionEl = $('#lightbox-caption');
    if (imgEl) {
      imgEl.src = source.src;
      imgEl.alt = source.alt;
    }
    if (captionEl) captionEl.textContent = source.alt;
    showDialog(lightbox);
  });
});

$$('a[href^="tel:"]').forEach(link => link.addEventListener('click', () => track('phone_click')));
$$('a[data-messenger]').forEach(link => link.addEventListener('click', () => track('messenger_click', { channel: link.dataset.messenger })));
