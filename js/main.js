// Header: transparent over the hero, solid after scrolling
const header = document.querySelector('.site-header');

if (header) {
  const updateHeader = () => header.classList.toggle('site-header--solid', window.scrollY > 40);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
}

// Compact header: menu panel (breakpoint matches the CSS header breakpoint)
const menuToggle = document.querySelector('.site-header__toggle');
const menu = document.getElementById('site-menu');

if (header && menuToggle && menu) {
  const compact = window.matchMedia('(max-width: 72rem)');
  const label = menuToggle.querySelector('.site-header__toggle-label');

  const setMenu = (open) => {
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('is-menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (label) label.textContent = open ? 'Close' : 'Menu';
    // Hidden panel stays out of the tab order and accessibility tree on compact screens
    menu.inert = compact.matches && !open;
  };

  setMenu(false);
  menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('is-open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  compact.addEventListener('change', () => setMenu(false));
}

// Booking forms: date constraints and submit handling
// TODO: Connect to the hotel's booking engine (not selected yet).
const today = new Date().toISOString().split('T')[0];

document.querySelectorAll('.booking-bar, .booking-stack').forEach((form) => {
  const checkIn = form.querySelector('[data-check-in]');
  const checkOut = form.querySelector('[data-check-out]');
  const status = form.querySelector('[role="status"]');

  checkIn.min = today;
  checkOut.min = today;

  checkIn.addEventListener('change', () => {
    checkOut.min = checkIn.value || today;
    if (checkOut.value && checkOut.value <= checkIn.value) checkOut.value = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const missing = [checkIn, checkOut].filter((input) => !input.value);

    [checkIn, checkOut].forEach((input) => input.removeAttribute('aria-invalid'));
    missing.forEach((input) => input.setAttribute('aria-invalid', 'true'));

    if (missing.length) {
      status.textContent = 'Please select your check-in and check-out dates.';
      missing[0].focus();
      return;
    }

    status.textContent = 'Online booking is coming soon.';
  });
});

// =========================================================
// Motion. Hidden states live in CSS under html.has-motion (set in <head>
// only when reduced motion is not requested), so without JS everything is visible.
// =========================================================
const hasMotion = document.documentElement.classList.contains('has-motion');
const clamp01 = (value) => Math.min(1, Math.max(0, value));

// Wraps every word (or letter) in a mask so it can rise from its own baseline.
// Script accents keep their own "writing" reveal and the bracket moves as one unit.
const splitText = (root, byLetter = false) => {
  let index = 0;
  const makeUnit = (content) => {
    const word = document.createElement('span');
    const inner = document.createElement('span');
    word.className = 'word';
    inner.className = 'word__inner';
    inner.style.setProperty('--i', index++);
    inner.append(content);
    word.append(inner);
    return word;
  };
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) fragment.append(part);
          else if (byLetter) [...part].forEach((letter) => fragment.append(makeUnit(letter)));
          else fragment.append(makeUnit(part));
        });
        child.replaceWith(fragment);
      } else if (child.matches('.bracket')) {
        const placeholder = document.createComment('');
        child.replaceWith(placeholder);
        placeholder.replaceWith(makeUnit(child));
      } else if (!child.matches('.script, br')) {
        walk(child);
      }
    });
  };
  walk(root);
  root.dataset.split = '';
};

const revealObserver = hasMotion && 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      entry.target.dispatchEvent(new CustomEvent('reveal'));
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' })
  : null;

if (revealObserver) {
  // Headings: word by word
  document.querySelectorAll('.hero__title-serif, .display, .heading, .page-hero__title-serif, .breakfast__title-serif, .booking__title, .day__title, .room__title')
    .forEach((heading) => splitText(heading));

  // Footer wordmark (decorative): letter by letter
  document.querySelectorAll('.site-footer__wordmark').forEach((line) => {
    splitText(line, true);
    line.style.setProperty('--step', '0.045s');
  });

  // Script accents are written after the heading they belong to
  document.querySelectorAll('.script, .hero__title-script').forEach((script) => { script.dataset.write = ''; });

  // Supporting copy follows, staggered inside its group
  const revealSelector = [
    '.eyebrow', '.hero__meta', '.hero__lead', '.booking-bar', '.lead',
    '.intro__columns > p', '.rooms__lead', '.room-tile__subtitle', '.room-tile__text', '.room-tile__actions',
    '.amenities__panel > p', '.facility__name', '.facility__text',
    '.breakfast__text > p', '.area__text > p', '.place-list__item', '.day-step', '.day__outro',
    '.gallery__lead', '.location__text > *', '.stats__item', '.booking__form-wrap > *', '.site-footer__grid > *',
    '.page-hero__text > p', '.room__label', '.room__subtitle', '.room__text', '.spec-list__item', '.amenity-line', '.room__actions', '.guide__item',
  ].join(', ');
  document.querySelectorAll(revealSelector).forEach((element) => {
    if (element.hasAttribute('data-reveal')) return;
    element.dataset.reveal = '';
    const siblings = [...element.parentElement.children].filter((sibling) => sibling.matches(revealSelector));
    element.style.setProperty('--delay', `${Math.min(siblings.indexOf(element), 6) * 0.09}s`);
  });

  // Home hero: one sequence on load — meta, the title, the handwritten line, then the form
  const heroDelays = { '.hero__meta': 0.1, '.hero__title-serif': 0.25, '.hero__title-script': 1, '.page-hero__title-serif': 0.25, '.page-hero__script': 1, '.hero__lead': 1.25, '.page-hero__text > p': 1.25, '.booking-bar': 1.45 };
  Object.entries(heroDelays).forEach(([selector, delay]) => {
    document.querySelectorAll(`.hero ${selector}, .page-hero ${selector}`).forEach((element, i) => {
      element.style.setProperty('--delay', `${delay + i * 0.09}s`);
    });
  });

  document.querySelectorAll('[data-split], [data-write], [data-reveal], .hero__seal').forEach((element) => revealObserver.observe(element));

  // Distances count up once they appear: the number is the information
  document.querySelectorAll('.stats__item').forEach((item) => {
    const value = item.querySelector('.stats__value');
    const number = value && value.firstChild;
    if (!number || number.nodeType !== Node.TEXT_NODE) return;
    const target = parseInt(number.textContent, 10);
    if (Number.isNaN(target)) return;
    item.addEventListener('reveal', () => {
      const start = performance.now();
      const tick = (now) => {
        const t = clamp01((now - start) / 1400);
        number.textContent = String(Math.round(target * (1 - (1 - t) ** 3)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { once: true });
  });
}

// Scroll-linked effects share one rAF loop
const scrollEffects = [];
let scrollQueued = false;
const runScrollEffects = () => {
  scrollQueued = false;
  scrollEffects.forEach((effect) => effect());
};
const queueScrollEffects = () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(runScrollEffects);
};

// 01 Intro: photos start scattered around the title and settle into one row on the grid
const scatterTrack = document.querySelector('[data-scatter]');

if (hasMotion && scatterTrack) {
  const frame = scatterTrack.querySelector('.intro__frame');
  const photos = [...scatterTrack.querySelectorAll('.intro__photo')];
  const pinned = window.matchMedia('(min-width: 64.01rem)');
  let offsets = [];
  let current = 0;

  const measure = () => {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    offsets = photos.map((photo) => {
      const style = getComputedStyle(photo);
      const x = (parseFloat(style.getPropertyValue('--sx')) / 100) * width;
      const y = (parseFloat(style.getPropertyValue('--sy')) / 100) * height;
      return {
        x: x - (photo.offsetLeft + photo.offsetWidth / 2),
        y: y - (photo.offsetTop + photo.offsetHeight / 2),
        rotate: parseFloat(style.getPropertyValue('--sr')) || 0,
        scale: parseFloat(style.getPropertyValue('--ss')) || 1,
      };
    });
  };

  const render = () => {
    photos.forEach((photo, i) => {
      const o = offsets[i];
      const k = 1 - current; // 1 = scattered, 0 = in the row
      photo.style.transform = `translate3d(${o.x * k}px, ${o.y * k}px, 0) rotate(${o.rotate * k}deg) scale(${1 + (o.scale - 1) * k})`;
    });
  };

  // 0 → 1 while the frame is pinned; the last fifth of the pin holds the finished row
  const target = () => {
    const pinTop = parseFloat(getComputedStyle(frame).top);
    const distance = scatterTrack.offsetHeight - frame.offsetHeight;
    const progress = clamp01((pinTop - scatterTrack.getBoundingClientRect().top) / (distance * 0.8));
    return progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  };

  let settling = false;
  const settle = () => {
    const eased = target();
    current += (eased - current) * 0.14;
    if (Math.abs(eased - current) < 0.001) current = eased;
    render();
    if (current !== eased) requestAnimationFrame(settle);
    else settling = false;
  };

  const update = () => {
    if (!pinned.matches) return;
    if (!settling) {
      settling = true;
      requestAnimationFrame(settle);
    }
  };

  const reset = () => {
    if (pinned.matches) {
      photos.forEach((photo) => { photo.style.transform = ''; });
      measure();
      current = target();
      render();
    } else {
      photos.forEach((photo) => { photo.style.transform = ''; });
    }
  };

  scrollEffects.push(update);
  window.addEventListener('resize', reset);
  pinned.addEventListener('change', reset);
  window.addEventListener('load', reset);
  reset();
}

// 07 Gallery: photos develop in sequence, then drift at different depths around the title
const parallaxStage = document.querySelector('[data-parallax]');

if (hasMotion && parallaxStage) {
  const layers = [...parallaxStage.querySelectorAll('[data-depth]')];
  const collage = window.matchMedia('(min-width: 56.01rem)');
  layers.forEach((layer, i) => layer.style.setProperty('--i', i));
  if (revealObserver) revealObserver.observe(parallaxStage);

  const update = () => {
    if (!collage.matches) return;
    const rect = parallaxStage.getBoundingClientRect();
    if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
    const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
    layers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.depth);
      // Small drift, capped so photos never reach the copy below the collage
      const shift = Math.max(-40, Math.min(40, offset * (1 - depth) * 0.08));
      layer.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    });
  };
  scrollEffects.push(update);
  collage.addEventListener('change', () => {
    layers.forEach((layer) => { layer.style.transform = ''; });
    update();
  });
}

if (scrollEffects.length) {
  window.addEventListener('scroll', queueScrollEffects, { passive: true });
  queueScrollEffects();
}

// 05 Costa Brava video: loaded on approach, plays only while visible
const areaVideo = document.querySelector('.area__video');

// Reduced motion: no autoplay, the visitor starts the video
if (areaVideo && !hasMotion) areaVideo.controls = true;

if (areaVideo && 'IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!areaVideo.src) {
        areaVideo.src = areaVideo.dataset.src;
        areaVideo.preload = 'auto';
      }
      if (hasMotion) areaVideo.play().catch(() => { areaVideo.controls = true; });
    } else if (!areaVideo.paused) {
      areaVideo.pause();
    }
  }, { rootMargin: '200px 0px' }).observe(areaVideo);
}
