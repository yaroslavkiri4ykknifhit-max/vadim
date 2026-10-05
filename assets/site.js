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
navigation?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation?.classList.contains('open')) closeMenu(true);
});
matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const booking = $('#booking-dialog');
const form = $('#booking-form');
let bookingContext = '';
function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
if (form) $('#booking-date').min = localDate();
function showDialog(dialog) {
  if (!dialog || typeof dialog.showModal !== 'function') return false;
  closeMenu();
  dialog.showModal();
  document.body.classList.add('modal-open');
  return true;
}
$$('[data-book]').forEach(link => link.addEventListener('click', event => {
  if (!booking || typeof booking.showModal !== 'function') return;
  event.preventDefault();
  const service = link.dataset.book || document.body.dataset.service || 'enduro';
  const choice = $(`input[name="service"][value="${service}"]`, form);
  if (choice) choice.checked = true;
  bookingContext = link.dataset.context || '';
  $('#booking-context').textContent = bookingContext;
  $('#booking-context').hidden = !bookingContext;
  $('#booking-error').hidden = true;
  $('#booking-handoff').hidden = true;
  $('#booking-fallback').hidden = true;
  $('#booking-date').min = localDate();
  showDialog(booking);
  track('booking_open', { selected_service: service });
}));
$$('dialog').forEach(dialog => {
  $('[data-close]', dialog)?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (!$('dialog[open]')) document.body.classList.remove('modal-open');
  });
});
const serviceLabels = { enduro: 'Прокат эндуро', evacuator: 'Эвакуатор', limuzin: 'Аренда лимузина', moto: 'Прокат дорожного мотоцикла' };
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const service = String(data.get('service') || 'enduro');
  const dateValue = String(data.get('date') || '');
  const error = $('#booking-error');
  if (dateValue && dateValue < localDate()) {
    error.textContent = 'Выберите сегодняшнюю или будущую дату.';
    error.hidden = false;
    $('#booking-date').focus();
    return;
  }
  error.hidden = true;
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
  const url = channel === 'telegram' ? `https://t.me/vadim3030?text=${text}` : `https://wa.me/375296701633?text=${text}`;
  track('messenger_open', { channel, selected_service: service });
  window.open(url, '_blank', 'noopener,noreferrer');
  $('#booking-handoff').hidden = false;
  $('#booking-handoff').textContent = `Откроется ${channel === 'telegram' ? 'Telegram' : 'WhatsApp'}. Нажмите «Отправить» в чате, чтобы мы получили ваше сообщение.`;
  $('#booking-fallback').href = url;
  $('#booking-fallback').hidden = false;
});
$$('input[name="service"]', form || document).forEach(radio => radio.addEventListener('change', () => {
  bookingContext = '';
  $('#booking-context').hidden = true;
}));
$$('[data-period]').forEach(button => button.addEventListener('click', () => {
  const weekend = button.dataset.period === 'weekend';
  $$('[data-period]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $$('[data-weekday][data-weekend]').forEach(item => { item.textContent = weekend ? item.dataset.weekend : item.dataset.weekday; });
  $('#rate-period').textContent = weekend ? 'Тарифы на субботу и воскресенье' : 'Тарифы на понедельник — пятницу';
  track('price_period', { period: button.dataset.period });
}));
const lightbox = $('#lightbox');
$$('[data-gallery]').forEach(button => button.addEventListener('click', () => {
  const source = $('img', button);
  $('#lightbox-img').src = source.src;
  $('#lightbox-img').alt = source.alt;
  $('#lightbox-caption').textContent = source.alt;
  showDialog(lightbox);
}));
$$('a[href^="tel:"]').forEach(link => link.addEventListener('click', () => track('phone_click')));
$$('a[data-messenger]').forEach(link => link.addEventListener('click', () => track('messenger_click', { channel: link.dataset.messenger })));
