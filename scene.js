const icons = {
  explode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m8 3-5 0 0 5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8 3 3m13 5 5-5M8 16l-5 5m13-5 5 5"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.9 7.2M4 4v6h6"/></svg>',
  spin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><ellipse cx="12" cy="12" rx="9" ry="4.5"/><path d="m15 3 4 4-4 4"/><path d="M12 3c4 0 7 2 7 4"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 12h12"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true"><path d="M4 10c1-3 4-5 8-5 5 0 9 3 9 7s-4 7-9 7c-4 0-7-2-8-5M4 5v5h5"/></svg>',
};

const defaultImages = [
  { id: 'cherry', title: 'Cherry muse', src: './assets/cherry-muse.webp', alt: 'Glossy deep cherry manicure photographed in warm studio light', color: '#6b2333' },
  { id: 'pearl', title: 'Pearl French', src: './assets/pearl-french.webp', alt: 'A softly luminous pearl French manicure', color: '#e7d6c5' },
  { id: 'chrome', title: 'Chrome study', src: './assets/chrome-study.webp', alt: 'Sculptural chrome nail art', color: '#a49b8a' },
];

let instanceCount = 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * A dependency-free, genuinely spatial photo lookbook.
 * @param {HTMLElement} root
 * @param {{images?: Array<{id?: string,title: string,src: string,alt?: string,color?: string}>,onSelect?: Function}} options
 * @returns {{selectLook: Function,explode: Function,reset: Function,getState: Function,destroy: Function}}
 */
export function initLookbook(root, { images = defaultImages, onSelect } = {}) {
  if (!root) throw new Error('initLookbook requires a root element.');
  if (root.__lookbook) root.__lookbook.destroy();
  images = images.length ? images : defaultImages;
  const instanceId = `lookbook-${++instanceCount}`;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cleanup = [];
  let destroyed = false;
  let visible = true;
  let raf = 0;
  let previousTime = 0;
  let width = 280;
  let height = 350;
  let selectedIndex = 0;
  let spin = false;
  let lastExplosion = -1;
  let lastAnnouncedExplosion = false;
  let lastInteracted = 0;
  const target = { x: -5, y: -12, zoom: 1, explosion: 0 };
  const current = { ...target };
  const pointers = new Map();
  let pinchDistance = null;

  root.classList.add('lookbook');
  root.innerHTML = `
    <div class="lookbook-stage" tabindex="0" role="region" aria-label="Interactive 3D nail lookbook" aria-describedby="${instanceId}-help" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + - E R Space">
      <div class="lookbook-topline" aria-hidden="true"><span>The photo lookbook</span><span class="lookbook-drag-note">${icons.rotate}<span>Drag to rotate</span></span></div>
      <div class="lookbook-floor" aria-hidden="true"></div>
      <div class="lookbook-orbit">
        <div class="lookbook-satellite lookbook-satellite-one" aria-hidden="true"><div class="lookbook-photo-front"><img alt="" draggable="false"><span class="lookbook-satellite-label"></span></div><div class="lookbook-card-back"></div></div>
        <div class="lookbook-satellite lookbook-satellite-two" aria-hidden="true"><div class="lookbook-photo-front"><img alt="" draggable="false"><span class="lookbook-satellite-label"></span></div><div class="lookbook-card-back"></div></div>
        <div class="lookbook-main-mat" aria-hidden="true"><div class="lookbook-main-mat-front"></div><div class="lookbook-card-back"></div></div>
        <div class="lookbook-fragments" role="img"></div>
        <div class="lookbook-photo-caption" aria-hidden="true"><span class="lookbook-image-number">01</span><span class="lookbook-image-name"></span><span>↗</span></div>
      </div>
      <div class="lookbook-stage-footer" aria-hidden="true"><span>Your set. Every angle.</span><span class="lookbook-view-state">Assembled</span></div>
    </div>
    <div class="lookbook-controls">
      <div class="lookbook-looks" role="group" aria-label="Choose a manicure look"></div>
      <div class="lookbook-action-row">
        <button type="button" class="lookbook-explode" aria-pressed="false">${icons.explode}<span>Explode view</span></button>
        <label class="lookbook-spread"><span>Spread</span><input type="range" min="0" max="100" value="0" aria-label="Image explosion amount" aria-valuetext="Assembled"></label>
        <div class="lookbook-utilities" role="group" aria-label="View controls">
          <button type="button" data-action="spin" aria-label="Auto-rotate" aria-pressed="false" title="Auto-rotate">${icons.spin}</button>
          <button type="button" data-action="zoom-out" aria-label="Zoom out" title="Zoom out">${icons.minus}</button>
          <button type="button" data-action="zoom-in" aria-label="Zoom in" title="Zoom in">${icons.plus}</button>
          <button type="button" data-action="reset" aria-label="Reset 3D view" title="Reset view">${icons.reset}</button>
        </div>
      </div>
    </div>
    <p id="${instanceId}-help" class="lookbook-sr-only">Drag to rotate the photographs. Pinch to zoom. Use the Explode view button to separate the image into floating pieces. With the image focused, arrow keys rotate; plus and minus zoom; E toggles the explosion; R resets; Space toggles auto-rotate.</p>
    <span class="lookbook-sr-only lookbook-announcement" aria-live="polite" aria-atomic="true"></span>`;

  const stage = root.querySelector('.lookbook-stage');
  const orbit = root.querySelector('.lookbook-orbit');
  const fragments = root.querySelector('.lookbook-fragments');
  const caption = root.querySelector('.lookbook-photo-caption');
  const mat = root.querySelector('.lookbook-main-mat');
  const satellites = [...root.querySelectorAll('.lookbook-satellite')];
  const explosionButton = root.querySelector('.lookbook-explode');
  const spreadInput = root.querySelector('.lookbook-spread input');
  const spinButton = root.querySelector('[data-action="spin"]');
  const viewState = root.querySelector('.lookbook-view-state');
  const announcement = root.querySelector('.lookbook-announcement');
  const tiles = [];

  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      const tile = document.createElement('div');
      tile.className = 'lookbook-tile';
      tile.innerHTML = '<div class="lookbook-tile-front"><img alt="" draggable="false"></div><div class="lookbook-tile-back"></div>';
      fragments.append(tile);
      tiles.push({ element: tile, image: tile.querySelector('img'), row, column });
    }
  }

  const listen = (element, name, listener, options) => {
    element.addEventListener(name, listener, options);
    cleanup.push(() => element.removeEventListener(name, listener, options));
  };
  const announce = (message) => { announcement.textContent = message; };
  const interact = () => { lastInteracted = performance.now(); start(); };

  const lookButtons = images.map((look, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(index === 0));
    const swatch = document.createElement('span');
    swatch.className = 'lookbook-swatch';
    swatch.style.background = look.color || '#6b2333';
    swatch.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = look.title;
    button.append(swatch, name);
    listen(button, 'click', () => selectLook(index));
    root.querySelector('.lookbook-looks').append(button);
    return button;
  });

  function setImage(element, source) {
    element.style.opacity = '';
    element.onerror = () => { element.style.opacity = '0'; };
    element.src = source;
  }

  function selectLook(value, announceChange = true) {
    const index = typeof value === 'number' ? value : images.findIndex((look) => look.id === value || look.title === value);
    if (index < 0 || index >= images.length || destroyed) return;
    selectedIndex = index;
    const look = images[index];
    tiles.forEach(({ image }) => setImage(image, look.src));
    fragments.setAttribute('aria-label', look.alt || look.title);
    root.querySelector('.lookbook-image-name').textContent = look.title;
    root.querySelector('.lookbook-image-number').textContent = String(index + 1).padStart(2, '0');
    satellites.forEach((card, offset) => {
      const other = images[(index + offset + 1) % images.length];
      setImage(card.querySelector('img'), other.src);
      card.querySelector('.lookbook-satellite-label').textContent = other.title;
      card.hidden = images.length < offset + 2;
    });
    lookButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    root.style.setProperty('--lookbook-accent', look.color || '#6b2333');
    updateControlLabels();
    if (announceChange) {
      announce(`${look.title} selected.`);
      if (typeof onSelect === 'function') onSelect(look, index);
      root.dispatchEvent(new CustomEvent('lookchange', { detail: { look, index }, bubbles: true }));
    }
    interact();
  }

  function updateControlLabels() {
    const exploded = target.explosion > 0.02;
    explosionButton.setAttribute('aria-pressed', String(exploded));
    explosionButton.querySelector('span').textContent = exploded ? 'Reassemble' : 'Explode view';
    spreadInput.value = String(Math.round(target.explosion * 100));
    spreadInput.setAttribute('aria-valuetext', target.explosion === 0 ? 'Assembled' : `${Math.round(target.explosion * 100)} percent exploded`);
    viewState.textContent = exploded ? 'Exploded' : 'Assembled';
    spinButton.setAttribute('aria-pressed', String(spin));
    root.querySelector('[data-action="zoom-out"]').disabled = target.zoom <= 0.7;
    root.querySelector('[data-action="zoom-in"]').disabled = target.zoom >= 1.4;
  }

  function explode(value = true) {
    target.explosion = typeof value === 'boolean' ? (value ? 1 : 0) : clamp(Number(value) || 0, 0, 1);
    updateControlLabels();
    const exploded = target.explosion > 0.02;
    if (lastAnnouncedExplosion !== exploded) {
      announce(exploded ? 'The photograph is separating into sixteen floating pieces. Drag to explore the depth.' : 'The photograph is reassembling.');
      lastAnnouncedExplosion = exploded;
    }
    interact();
  }

  function changeZoom(delta) {
    target.zoom = clamp(Math.round((target.zoom + delta) * 100) / 100, 0.7, 1.4);
    updateControlLabels();
    interact();
  }

  function reset() {
    Object.assign(target, { x: -5, y: -12, zoom: 1, explosion: 0 });
    spin = false;
    lastAnnouncedExplosion = false;
    updateControlLabels();
    announce('View reset. Photograph reassembled.');
    interact();
  }

  function toggleSpin() {
    spin = !spin;
    updateControlLabels();
    announce(spin ? 'Auto-rotate on.' : 'Auto-rotate off.');
    interact();
  }

  listen(explosionButton, 'click', () => explode(target.explosion < 0.05));
  listen(spreadInput, 'input', () => explode(Number(spreadInput.value) / 100));
  listen(spinButton, 'click', toggleSpin);
  listen(root.querySelector('[data-action="reset"]'), 'click', reset);
  listen(root.querySelector('[data-action="zoom-in"]'), 'click', () => changeZoom(0.1));
  listen(root.querySelector('[data-action="zoom-out"]'), 'click', () => changeZoom(-0.1));

  const getPinchDistance = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
  };

  listen(stage, 'pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    root.classList.add('is-dragging');
    spin = false;
    updateControlLabels();
    pinchDistance = getPinchDistance();
    interact();
  });
  listen(stage, 'pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) {
      const distance = getPinchDistance();
      if (pinchDistance && distance) {
        target.zoom = clamp(target.zoom * distance / pinchDistance, 0.7, 1.4);
        updateControlLabels();
      }
      pinchDistance = distance;
    } else {
      target.y += (event.clientX - previous.x) * 0.38;
      target.x = clamp(target.x - (event.clientY - previous.y) * 0.28, -75, 75);
    }
    interact();
  });
  const endPointer = (event) => {
    pointers.delete(event.pointerId);
    pinchDistance = getPinchDistance();
    if (!pointers.size) root.classList.remove('is-dragging');
  };
  listen(stage, 'pointerup', endPointer);
  listen(stage, 'pointercancel', endPointer);
  listen(stage, 'lostpointercapture', endPointer);
  listen(stage, 'wheel', (event) => {
    // Preserve normal page scrolling until the visitor explicitly focuses the stage.
    if (document.activeElement !== stage || Math.abs(event.deltaY) < 1) return;
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 0.04 : -0.04);
  }, { passive: false });
  listen(stage, 'keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let handled = true;
    switch (event.key) {
      case 'ArrowLeft': target.y -= 12; break;
      case 'ArrowRight': target.y += 12; break;
      case 'ArrowUp': target.x = clamp(target.x - 10, -75, 75); break;
      case 'ArrowDown': target.x = clamp(target.x + 10, -75, 75); break;
      case '+': case '=': changeZoom(0.1); break;
      case '-': case '_': changeZoom(-0.1); break;
      case 'e': case 'E': explode(target.explosion < 0.05); break;
      case 'r': case 'R': reset(); break;
      case ' ': toggleSpin(); break;
      default: handled = false;
    }
    if (handled) { event.preventDefault(); interact(); }
  });

  function sizeScene() {
    const bounds = stage.getBoundingClientRect();
    width = Math.round(Math.min(390, bounds.width * (bounds.width < 500 ? 0.7 : 0.64), bounds.height * 0.65));
    height = Math.round(width * 1.24);
    root.style.setProperty('--photo-width', `${width}px`);
    root.style.setProperty('--photo-height', `${height}px`);
    root.style.setProperty('--satellite-width', `${Math.round(width * 0.55)}px`);
    root.style.setProperty('--satellite-height', `${Math.round(height * 0.59)}px`);
    tiles.forEach(({ element, image, column, row }) => {
      // A fractional-pixel overlap prevents seams at the un-exploded resting position.
      element.style.width = `${width / 4 + 0.6}px`;
      element.style.height = `${height / 4 + 0.6}px`;
      image.style.width = `${width}px`;
      image.style.height = `${height}px`;
      image.style.left = `${-column * width / 4}px`;
      image.style.top = `${-row * height / 4}px`;
    });
    lastExplosion = -1;
    start();
  }

  function draw(time) {
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
    previousTime = time;
    if (spin && !pointers.size) target.y += delta * 11;
    const smoothing = reducedMotion.matches ? 1 : 1 - Math.pow(0.0014, delta);
    let moving = false;
    for (const key of Object.keys(current)) {
      current[key] += (target[key] - current[key]) * smoothing;
      if (Math.abs(target[key] - current[key]) > 0.0008) moving = true;
      else current[key] = target[key];
    }
    const idle = !reducedMotion.matches && !pointers.size && time - lastInteracted > 1700;
    const bob = idle ? Math.sin(time / 2400) * 3.2 : 0;
    const drift = idle && !spin ? Math.sin(time / 5200) * 0.6 : 0;
    const e = current.explosion;
    // Pull the exploded composition back into the viewport while retaining the
    // visitor's independently chosen zoom level.
    const fittedZoom = current.zoom * (1 - 0.22 * e);
    orbit.style.transform = `translate3d(0,${bob}px,0) rotateX(${current.x}deg) rotateY(${current.y + drift}deg) rotateZ(-2deg) scale3d(${fittedZoom},${fittedZoom},${fittedZoom})`;

    if (Math.abs(lastExplosion - e) > 0.0001) {
      lastExplosion = e;
      tiles.forEach(({ element, row, column }) => {
        const nx = column - 1.5;
        const ny = row - 1.5;
        const spreadX = nx * width * 0.105 * e;
        const spreadY = ny * height * 0.07 * e;
        const depth = (Math.abs(nx) * 32 + Math.abs(ny) * 19 + ((row + column) % 3) * 28) * e;
        const x = -width / 2 + column * width / 4 + spreadX;
        const y = -height / 2 + row * height / 4 + spreadY;
        element.style.transform = `translate3d(${x}px,${y}px,${depth}px) rotateX(${ny * -9 * e}deg) rotateY(${nx * 10 * e}deg) rotateZ(${nx * ny * 2.3 * e}deg)`;
        element.style.setProperty('--tile-shadow', String(e));
      });
      mat.style.opacity = String(1 - e);
      mat.style.transform = `translate3d(${-width / 2 - 9}px,${-height / 2 - 9}px,-2px)`;
      caption.style.transform = `translate3d(${-width / 2}px,${height / 2 + 12 + e * 40}px,${e * 50}px)`;
      caption.style.opacity = String(1 - e * 0.7);
      satellites[0].style.transform = `translate3d(${width * (0.35 + 0.15 * e)}px,${-height * (0.48 + 0.035 * e)}px,${-85 - e * 60}px) rotateZ(${12 + e * 12}deg) rotateY(${-8 - e * 9}deg)`;
      satellites[1].style.transform = `translate3d(${-width * (0.98 + 0.14 * e)}px,${height * (0.05 + 0.08 * e)}px,${-75 - e * 45}px) rotateZ(${-12 - e * 9}deg) rotateY(${14 + e * 12}deg)`;
      root.classList.toggle('is-exploded', e > 0.1);
    }
    raf = 0;
    if (visible && !document.hidden && !destroyed && (moving || spin || !reducedMotion.matches)) raf = requestAnimationFrame(draw);
  }

  function start() {
    if (!raf && visible && !document.hidden && !destroyed) raf = requestAnimationFrame(draw);
  }

  const resizeObserver = new ResizeObserver(sizeScene);
  resizeObserver.observe(stage);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { previousTime = 0; start(); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: '120px' });
  intersectionObserver.observe(root);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else { previousTime = 0; start(); }
  });
  listen(reducedMotion, 'change', () => { if (reducedMotion.matches) spin = false; updateControlLabels(); start(); });

  const api = {
    setLook: selectLook,
    selectLook,
    explode,
    reset,
    getState: () => ({ selectedIndex, look: images[selectedIndex], ...target, autoRotate: spin }),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cleanup.forEach((fn) => fn());
      root.classList.remove('lookbook', 'is-dragging', 'is-exploded');
      delete root.__lookbook;
    },
  };
  root.__lookbook = api;
  selectLook(0, false);
  sizeScene();
  return api;
}

export default initLookbook;
