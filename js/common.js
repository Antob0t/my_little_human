const Store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  },
};

function imageExists(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

const Sound = (() => {
  let ctx = null;
  const files = {};

  function audioCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function preload(url) {
    if (!url) return null;
    if (files[url]) return files[url];
    const audio = new Audio();
    const entry = { audio, ok: false, failed: false };
    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', () => { entry.ok = true; }, { once: true });
    audio.addEventListener('error', () => { entry.failed = true; }, { once: true });
    audio.src = url;
    files[url] = entry;
    return entry;
  }

  function tone(c, o) {
    const t0 = c.currentTime + (o.start || 0);
    const dur = o.dur || 0.12;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(o.vol || 0.2, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const synths = {
    pop(c) {
      tone(c, { freq: 520, to: 1040, dur: 0.09, type: 'triangle', vol: 0.3 });
      tone(c, { freq: 1560, to: 1200, start: 0.03, dur: 0.08, vol: 0.12 });
    },
    chime(c) {
      [784, 988, 1175, 1568].forEach((f, i) =>
        tone(c, { freq: f, start: i * 0.07, dur: 0.35, vol: 0.18 }));
    },
    slide(c) {
      tone(c, { freq: 320, to: 220, dur: 0.06, type: 'triangle', vol: 0.15 });
    },
    win(c) {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(c, { freq: f, start: i * 0.1, dur: 0.4, type: 'triangle', vol: 0.2 }));
    },
    end(c) {
      [784, 659, 523].forEach((f, i) =>
        tone(c, { freq: f, start: i * 0.12, dur: 0.3, type: 'triangle', vol: 0.18 }));
    },
  };

  function synth(name) {
    const c = audioCtx();
    if (c && synths[name]) synths[name](c);
  }

  let muted = Store.get('mlc_muted', false);

  function play(url, synthName) {
    if (muted) return;
    const entry = preload(url);
    if (entry && entry.ok && !entry.failed) {
      const a = entry.audio.cloneNode();
      a.play().catch(() => synth(synthName));
      return;
    }
    synth(synthName);
  }

  return {
    preload,
    play,
    get muted() { return muted; },
    setMuted(v) { muted = v; Store.set('mlc_muted', v); },
  };
})();

function setupAudioButton(btn) {
  if (!btn) return;
  const sync = () => {
    btn.setAttribute('aria-pressed', String(Sound.muted));
    btn.title = Sound.muted ? 'Sound off' : 'Sound on';
  };
  btn.addEventListener('click', () => { Sound.setMuted(!Sound.muted); sync(); });
  sync();
}

function setupInfoButton(btn, panel) {
  if (!btn || !panel) return;
  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
  });
}

(function injectCrayonFilters() {
  const variants = [['crayon-a', 2, 4], ['crayon-b', 5, 8], ['crayon-c', 9, 12]];
  const filters = variants.map(([id, warpSeed, grainSeed]) => `
    <filter id="${id}" x="-15%" y="-30%" width="130%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${warpSeed}" result="warp"/>
      <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="wobble"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="${grainSeed}" result="grain"/>
      <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.3" result="mask"/>
      <feComposite in="wobble" in2="mask" operator="in"/>
    </filter>`).join('');
  const holder = document.createElement('div');
  holder.innerHTML = `<svg class="svg-defs" aria-hidden="true" focusable="false">${filters}</svg>`;
  document.body.prepend(holder.firstElementChild);
})();

const Sparkles = (() => {
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = ['#ffffff', '#ffd93b', '#fc02a5', '#ff4fbb', '#0cb3d8', '#c35cd6'];
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>';
  const AUTO_TARGETS = '.game-card, .mascot-wrap, .keychain, .logo';

  function layerFor(el) {
    let layer = el.querySelector(':scope > .sparkle-layer');
    if (!layer) {
      layer = document.createElement('span');
      layer.className = 'sparkle-layer';
      layer.setAttribute('aria-hidden', 'true');
      el.appendChild(layer);
    }
    return layer;
  }

  function spawn(el, size) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    s.innerHTML = STAR;
    const px = size || 8 + Math.random() * 14;
    s.style.width = s.style.height = px + 'px';
    s.style.left = -4 + Math.random() * 100 + '%';
    s.style.top = -4 + Math.random() * 100 + '%';
    s.style.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    s.style.animationDuration = 0.8 + Math.random() * 0.9 + 's';
    s.addEventListener('animationend', () => s.remove());
    layerFor(el).appendChild(s);
  }

  function burst(el, n = 16) {
    if (reduceMotion || !el) return;
    for (let i = 0; i < n; i++) setTimeout(() => spawn(el, 12 + Math.random() * 20), i * 35);
  }

  function auto() {
    if (reduceMotion) return;
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
    });
    document.querySelectorAll(AUTO_TARGETS).forEach((el) => io.observe(el));
    setInterval(() => {
      if (document.hidden) return;
      visible.forEach((el) => { if (Math.random() < 0.55) spawn(el); });
    }, 380);
  }

  return { spawn, burst, auto };
})();

function retrigger(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

(function () {
  function swap(img) {
    if (img.dataset.swapped) return;
    img.dataset.swapped = '1';
    const box = document.createElement('div');
    box.className = 'img-placeholder ' + img.className;
    box.textContent = img.dataset.placeholder || img.alt || 'imagen';
    img.replaceWith(box);
  }
  document.querySelectorAll('img[data-placeholder]').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) swap(img);
    else img.addEventListener('error', () => swap(img));
  });
})();

Sparkles.auto();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update())
      .catch(() => {});
  });
}
