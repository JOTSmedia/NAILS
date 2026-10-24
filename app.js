import { siteConfig } from './site-config.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const nav = document.querySelector('.main-nav');
const menu = document.querySelector('.menu-toggle');
const header = document.querySelector('.site-header');
let selectedLook = siteConfig.looks[0].name;
let scene;
let booking;
let customDesign;

const serviceList = document.getElementById('service-list');
siteConfig.services.forEach(service => {
  const row = document.createElement('article');
  row.className = 'service-row';
  row.dataset.category = service.category;
  row.innerHTML = `<div><h3>${service.name}</h3><p>${service.description} <span class="service-duration">${service.duration} minutes.</span></p></div><div class="service-action"><span class="price"><small>from</small> $${service.price}</span><button type="button" class="round-arrow" data-book data-service="${service.id}" aria-label="Plan a ${service.name} appointment">↗</button></div>`;
  serviceList.append(row);
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  serviceList.querySelectorAll('.service-row').forEach(row => { row.hidden = button.dataset.filter !== 'all' && row.dataset.category !== button.dataset.filter; });
}));

import('./nail-lab.js').then(({ initNailLab }) => {
  return initNailLab(document.querySelector('.nail-lab'), design => { customDesign = design; });
}).catch(error => {
  console.error('Nail designer could not load', error);
  document.querySelector('.nail-status').textContent = 'The interactive preview could not load. Refresh to try again, or explore the collection below.';
  document.querySelector('.nail-options').innerHTML = '<p>The interactive preview could not load. Refresh to try again.</p>';
  document.querySelectorAll('[data-nail-view]').forEach(button => { button.disabled = true; });
});

function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open navigation');
  nav.classList.remove('is-open');
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  nav.classList.toggle('is-open', open);
  if (open) nav.querySelector('a')?.focus();
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menu.focus();
  }
});
document.addEventListener('click', e => { if (!header.contains(e.target)) closeMenu(); });
window.matchMedia('(min-width: 801px)').addEventListener('change', closeMenu);

let toastTimer;
function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('is-visible'), 4000);
}

const bookingReady = import('./booking.js').then(({ initBooking }) => {
  booking = initBooking(siteConfig);
}).catch(error => {
  console.error('Appointment builder could not load', error);
});

document.querySelectorAll('[data-book]').forEach(button => {
  button.addEventListener('click', async () => {
    closeMenu();
    await bookingReady;
    if (booking) booking.open({ service: button.dataset.service, look: selectedLook, design: button.hasAttribute('data-custom-design') ? customDesign : null });
    else toast('The appointment builder could not load. Please refresh and try again.');
  });
});

const sceneReady = import('./scene.js').then(({ initLookbook }) => {
  scene = initLookbook(document.getElementById('lookbook'), {
    images: siteConfig.looks.map(look => ({ ...look, title: look.name })),
    onSelect: (selection, index) => {
      selectedLook = siteConfig.looks[index]?.name || selection?.title || selectedLook;
    }
  });
}).catch(error => {
  console.error('3D lookbook could not load', error);
  const caption = document.querySelector('.lookbook-fallback p');
  if (caption) caption.textContent = 'Explore the collection below.';
});

document.querySelectorAll('[data-look]').forEach(button => {
  button.addEventListener('click', async () => {
    const index = Number(button.dataset.look);
    selectedLook = siteConfig.looks[index].name;
    await sceneReady;
    if (scene?.setLook) scene.setLook(index);
    document.querySelector('#photo-study').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
    if (scene?.explode) scene.explode(true);
    const stage = document.querySelector('#lookbook [tabindex="0"]');
    if (stage) stage.focus({ preventScroll: true });
  });
});

if ('IntersectionObserver' in window && !reducedMotion) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('will-reveal');
    observer.observe(el);
  });
}

document.querySelectorAll('.faq-list details').forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) document.querySelectorAll('.faq-list details').forEach(other => { if (other !== item) other.open = false; });
  });
});

const privacy = document.getElementById('privacy-dialog');
document.getElementById('privacy-button').addEventListener('click', () => { privacy.showModal(); document.body.classList.add('privacy-open'); });
privacy.querySelectorAll('.privacy-close, .privacy-done').forEach(b => b.addEventListener('click', () => privacy.close()));
privacy.addEventListener('close', () => document.body.classList.remove('privacy-open'));
privacy.addEventListener('click', e => {
  const box = privacy.getBoundingClientRect();
  if (e.target === privacy && (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom)) privacy.close();
});
document.getElementById('year').textContent = String(new Date().getFullYear());
