let bookingInstance = 0;

const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function tomorrowISO() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function safeBookingURL(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

const defaultServices = [
  { id: 'signature-gel', name: 'Signature gel', price: 65, duration: 60 },
  { id: 'sculpted-extensions', name: 'Sculpted extensions', price: 95, duration: 90 },
  { id: 'bespoke-nail-art', name: 'Bespoke nail art', price: 120, duration: 120 },
];

/** A browser-local appointment brief; it never sends or confirms an appointment. */
export function initBooking(config = {}) {
  const brand = config.brand || 'NAILS by LISA';
  const services = Array.isArray(config.services) && config.services.length ? config.services : defaultServices;
  const lookDefinitions = Array.isArray(config.looks) && config.looks.length ? config.looks : [
    { id: 'cherry', name: 'Cherry muse' },
    { id: 'pearl', name: 'Pearl French' },
    { id: 'chrome', name: 'Chrome study' },
  ];
  const looks = ['No preference yet', ...lookDefinitions.map(look => String(look.name || look.title || look.id))];
  const bookingURL = safeBookingURL(config.bookingUrl);
  const contactEmail = typeof config.contactEmail === 'string' && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(config.contactEmail) ? config.contactEmail : '';
  const id = `forme-booking-${++bookingInstance}`;
  const dialog = document.createElement('dialog');
  dialog.className = 'bk-dialog';
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  dialog.setAttribute('aria-describedby', `${id}-description`);
  dialog.innerHTML = `
    <div class="bk-shell">
      <header class="bk-header">
        <div class="bk-eyebrow"><span class="bk-star" aria-hidden="true">✳</span> A LITTLE TIME, JUST FOR YOU</div>
        <button class="bk-close" type="button" aria-label="Close appointment planner"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        <h2 id="${id}-title" class="bk-title">Your next good nail day.</h2>
        <p id="${id}-description" class="bk-description">Start with a treatment and a little inspiration.</p>
        <div class="bk-progress" aria-label="Appointment planner progress">
          <span data-progress="1" class="is-current"><b>01</b> Your treatment</span><i aria-hidden="true"></i><span data-progress="2"><b>02</b> Your details</span>
        </div>
      </header>
      <form class="bk-form" novalidate>
        <div class="bk-content">
          <section class="bk-panel" data-step="1" aria-labelledby="${id}-service-label">
            <fieldset class="bk-fieldset">
              <legend id="${id}-service-label" class="bk-label">THE FOUNDATION</legend>
              <div class="bk-services">${services.map((service, index) => `
                <label class="bk-service">
                  <input type="radio" name="service" value="${escapeHTML(service.id)}" ${index === 0 ? 'checked' : ''}>
                  <span class="bk-service-radio" aria-hidden="true"></span>
                  <span class="bk-service-copy"><strong>${escapeHTML(service.name)}</strong><small>${escapeHTML(service.duration)} minutes · tailored to your nails</small></span>
                  <span class="bk-service-price"><small>from</small> $${escapeHTML(service.price)}</span>
                </label>`).join('')}
              </div>
            </fieldset>
            <label class="bk-field bk-look-field"><span class="bk-label">A LITTLE INSPIRATION</span><select name="look">${looks.map(look => `<option value="${escapeHTML(look)}">${escapeHTML(look)}</option>`).join('')}</select><span class="bk-hint">Choose a look from the studio, or bring your own idea.</span></label>
            <p class="bk-note">A starting point, never a limit. Final timing and pricing depend on your design.</p>
          </section>
          <section class="bk-panel" data-step="2" hidden aria-label="Your appointment preferences">
            <div class="bk-selection"></div>
            <div class="bk-fields-grid">
              <label class="bk-field"><span class="bk-label">PREFERRED DATE <span aria-hidden="true">*</span></span><input type="date" name="date" min="${tomorrowISO()}" required><span class="bk-hint">A preference, subject to the stylist’s availability.</span></label>
              <label class="bk-field"><span class="bk-label">PREFERRED TIME</span><select name="time"><option value="Flexible">I’m flexible</option value="Morning">Morning</option><option value="Afternoon">Afternoon</option><option value="Evening">Evening</option></select></label>
              <label class="bk-field"><span class="bk-label">YOUR NAME <span aria-hidden="true">*</span></span><input type="text" name="name" autocomplete="name" placeholder="First & last name" maxlength="120" required></label>
              <label class="bk-field"><span class="bk-label">EMAIL ADDRESS <span aria-hidden="true">*</span></span><input type="email" name="email" autocomplete="email" placeholder="you@example.com" maxlength="180" required></label>
            </div>
            <label class="bk-field bk-notes-field"><span class="bk-label">WHAT ARE YOU DREAMING OF? <span class="bk-optional">optional</span></span><textarea name="notes" rows="3" maxlength="1000" placeholder="Shape, colors, a special occasion, or anything we should know…"></textarea></label>
            <p class="bk-note bk-privacy-note">Your details stay in this browser. Preparing a brief does not reserve an appointment.</p>
          </section>
          <section class="bk-panel bk-result" data-step="3" hidden aria-label="Your prepared appointment brief">
            <div class="bk-result-icon" aria-hidden="true">✳</div>
            <h3>Your appointment brief is ready.</h3>
            <p class="bk-result-description"></p>
            <dl class="bk-summary"></dl>
            <div class="bk-share-actions"></div>
            <details class="bk-brief-details"><summary>View your complete brief</summary><textarea class="bk-brief-text" readonly rows="11" aria-label="Complete appointment brief"></textarea></details>
            <p class="bk-feedback" role="status" aria-live="polite"></p>
          </section>
        </div>
        <footer class="bk-footer">
          <button class="bk-back" type="button" hidden><span aria-hidden="true">←</span> Back</button>
          <span class="bk-footer-note">A set that feels like you.</span>
          <button class="bk-primary bk-next" type="submit">Your details <span aria-hidden="true">↗</span></button>
        </footer>
      </form>
    </div>`;
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const field = name => form.elements.namedItem(name);
  const panel = step => dialog.querySelector(`[data-step="${step}"]`);
  const next = dialog.querySelector('.bk-next');
  const back = dialog.querySelector('.bk-back');
  const progress = dialog.querySelector('.bk-progress');
  const feedback = dialog.querySelector('.bk-feedback');
  let step = 1;
  let previousFocus = null;
  let previousOverflow = '';
  let previousPadding = '';
  let requestText = '';
  let copyTimer = null;
  let designSelection = null;

  const selectedService = () => services.find(service => String(service.id) === field('service').value) || services[0];
  const formatDate = value => {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day));
  };

  function showStep(value, focus = true) {
    step = value;
    dialog.querySelectorAll('.bk-panel').forEach(element => { element.hidden = Number(element.dataset.step) !== step; });
    progress.hidden = step === 3;
    dialog.querySelectorAll('[data-progress]').forEach(element => {
      const current = Number(element.dataset.progress) === step;
      element.classList.toggle('is-current', current);
      if (current) element.setAttribute('aria-current', 'step');
      else element.removeAttribute('aria-current');
    });
    back.hidden = step === 1;
    back.innerHTML = step === 3 ? '<span aria-hidden="true">←</span> Edit brief' : '<span aria-hidden="true">←</span> Back';
    next.innerHTML = step === 1 ? 'Your details <span aria-hidden="true">↗</span>' : step === 2 ? 'Prepare my brief <span aria-hidden="true">↗</span>' : 'Done <span aria-hidden="true">✓</span>';
    dialog.querySelector('.bk-footer-note').hidden = step !== 1;
    dialog.querySelector('.bk-description').textContent = step === 1 ? 'Start with a treatment and a little inspiration.' : step === 2 ? 'A few preferences to make your appointment your own.' : 'The start of something beautifully yours.';
    dialog.querySelector('.bk-content').scrollTop = 0;
    if (step === 2) {
      const service = selectedService();
      dialog.querySelector('.bk-selection').innerHTML = `<span>${escapeHTML(service.name)}</span><span>from $${escapeHTML(service.price)} <i>·</i> ${escapeHTML(service.duration)} min</span>`;
      field('date').min = tomorrowISO();
    }
    if (focus) {
      requestAnimationFrame(() => {
        if (step === 1) panel(1).querySelector('input:checked').focus({ preventScroll: true });
        else if (step === 2) field('date').focus({ preventScroll: true });
        else {
          const heading = panel(3).querySelector('h3');
          heading.setAttribute('tabindex', '-1');
          heading.focus({ preventScroll: true });
        }
      });
    }
  }

  function validateDetails() {
    field('name').value = field('name').value.trim();
    field('email').value = field('email').value.trim();
    field('name').setCustomValidity(field('name').value ? '' : 'Please enter your name.');
    field('date').setCustomValidity(field('date').value && field('date').value < tomorrowISO() ? 'Please choose tomorrow or a later date.' : '');
    for (const name of ['date', 'name', 'email']) {
      if (!field(name).checkValidity()) {
        field(name).reportValidity();
        return false;
      }
    }
    return true;
  }

  function prepareBrief() {
    const service = selectedService();
    const selectedLook = field('look').value;
    const date = formatDate(field('date').value);
    const time = field('time').value;
    requestText = [
      `${brand.toUpperCase()} — APPOINTMENT REQUEST`,
      'Not a confirmed booking',
      '',
      `Service: ${service.name}`,
      `Starting price: $${service.price}`,
      `Estimated treatment: ${service.duration} minutes`,
      designSelection ? `Custom design: ${designSelection.description}` : `Look: ${selectedLook}`,
      `Preferred date: ${date}`,
      `Preferred time: ${time}`,
      '',
      `Name: ${field('name').value}`,
      `Email: ${field('email').value}`,
      field('notes').value.trim() ? `Design notes: ${field('notes').value.trim()}` : '',
      '',
      'Please confirm availability, final pricing, and appointment details with the stylist.',
    ].filter((line, index, all) => line || all[index - 1] !== '').join('\n');
    dialog.querySelector('.bk-brief-text').value = requestText;
    dialog.querySelector('.bk-summary').innerHTML = [
      ['Treatment', `${service.name} · from $${service.price}`],
      ['Inspiration', designSelection ? designSelection.description : selectedLook],
      ['Your preference', `${date} · ${time}`],
      ['Prepared for', field('name').value],
    ].map(([label, value]) => `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('');
    dialog.querySelector('.bk-result-description').textContent = bookingURL
      ? 'Take your inspiration to the stylist’s booking page to check availability. Your appointment is not reserved yet.'
      : contactEmail
        ? 'Open your email app to share this brief with the stylist. They’ll need to confirm availability before your appointment is booked.'
        : 'This concept site does not send requests. Copy or download your brief to share with your stylist.';
    const shareActions = dialog.querySelector('.bk-share-actions');
    shareActions.replaceChildren();
    if (bookingURL || contactEmail) {
      const link = document.createElement('a');
      link.className = 'bk-primary bk-contact-link';
      if (bookingURL) {
        link.href = bookingURL;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open booking page ↗';
      } else {
        link.href = `mailto:${contactEmail.split('@').map(encodeURIComponent).join('@')}?subject=${encodeURIComponent(`Appointment request — ${field('name').value}`)}&body=${encodeURIComponent(requestText)}`;
        link.textContent = 'Open in email ↗';
      }
      shareActions.append(link);
    }
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'bk-secondary';
    copy.textContent = 'Copy brief';
    copy.addEventListener('click', () => copyBrief(copy));
    const download = document.createElement('button');
    download.type = 'button';
    download.className = 'bk-secondary';
    download.textContent = 'Download brief ↓';
    download.addEventListener('click', downloadBrief);
    shareActions.append(copy, download);
    feedback.textContent = '';
    showStep(3);
  }

  async function copyBrief(button) {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(requestText);
        copied = true;
      }
    } catch { /* Fall back to a selected temporary text field. */ }
    if (!copied) {
      const temporary = document.createElement('textarea');
      temporary.value = requestText;
      temporary.setAttribute('readonly', '');
      temporary.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;';
      dialog.append(temporary);
      temporary.focus();
      temporary.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
      temporary.remove();
      button.focus();
    }
    if (copied) {
      feedback.textContent = 'Brief copied. Ready to share with your stylist.';
      button.textContent = 'Copied ✓';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { button.textContent = 'Copy brief'; }, 2400);
    } else {
      const details = dialog.querySelector('.bk-brief-details');
      details.open = true;
      const text = dialog.querySelector('.bk-brief-text');
      text.focus();
      text.select();
      feedback.textContent = 'Select the brief below and copy it using your device’s copy command.';
    }
  }

  function downloadBrief() {
    const blob = new Blob([requestText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nails-by-lisa-appointment-brief.txt';
    dialog.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback.textContent = 'Your brief is ready to save. Share it with your stylist to request an appointment.';
  }

  function close() { if (dialog.open) dialog.close(); }

  function open({ service, look, design } = {}) {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    designSelection = design || null;
    const customOption = field('look').querySelector('[data-custom-option]');
    customOption?.remove();
    if (designSelection) {
      const option = document.createElement('option');
      option.dataset.customOption = 'true';
      option.value = designSelection.description;
      option.textContent = `My design: ${designSelection.description}`;
      field('look').append(option);
    }
    const requestedService = typeof service === 'object' ? service?.id : service;
    const match = services.find(item => item.id === requestedService || item.name === requestedService);
    if (match) field('service').value = String(match.id);
    if (look) {
      const lookName = typeof look === 'object' ? look.name || look.title || look.id : look;
      const normalized = String(lookName).toLowerCase().replace(/[-_]/g, ' ');
      const configuredLook = lookDefinitions.find(item => String(item.id).toLowerCase() === normalized);
      const matchingLook = configuredLook ? String(configuredLook.name || configuredLook.title || configuredLook.id) : looks.find(value => value.toLowerCase() === normalized);
      if (matchingLook) field('look').value = matchingLook;
    }
    if (designSelection) field('look').value = designSelection.description;
    previousOverflow = document.body.style.overflow;
    previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${padding + scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    field('date').min = tomorrowISO();
    dialog.showModal();
    showStep(1);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (step === 1) showStep(2);
    else if (step === 2 && validateDetails()) prepareBrief();
    else if (step === 3) close();
  });
  field('look').addEventListener('change', () => { if (field('look').value !== designSelection?.description) designSelection = null; });
  form.addEventListener('input', event => {
    if (event.target instanceof HTMLInputElement) event.target.setCustomValidity('');
  });
  back.addEventListener('click', () => showStep(step === 3 ? 2 : 1));
  dialog.querySelector('.bk-close').addEventListener('click', close);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPadding;
    clearTimeout(copyTimer);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  });

  return { open, close };
}
