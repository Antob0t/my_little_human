const CONFIG = {
  levels: [
    { image: 'assets/web/lucky/lucky1.jpg', lucky: [6, 9], optional: [3] },
    { image: 'assets/web/lucky/lucky2.jpg', lucky: [6, 9], optional: [3] },
    { image: 'assets/web/lucky/lucky3.jpg', lucky: [3, 7], optional: [6] },
    { image: 'assets/web/lucky/lucky4.jpg', lucky: [1, 8], optional: [4] },
    { image: 'assets/web/lucky/lucky5.jpg', lucky: [2, 7], optional: [] },
    { image: 'assets/web/lucky/lucky6.jpg', lucky: [1, 9], optional: [4] },
  ],
  randomOrder: false,
  prompt: 'lucky objects',

  sounds: {
    select:  'assets/sounds/lucky_select.mp3',
    correct: 'assets/sounds/lucky_correct.mp3',
    wrong:   'assets/sounds/lucky_wrong.mp3',
    allDone: 'assets/sounds/lucky_alldone.mp3',
  },
  nextLevelDelay: 1200,
};

const grid = document.getElementById('grid');
const promptEl = document.getElementById('promptBig');
const levelEl = document.getElementById('level');
const levelTotalEl = document.getElementById('levelTotal');
const msgEl = document.getElementById('luckyMsg');
const actionBtn = document.getElementById('actionBtn');
const reloadBtn = document.getElementById('reloadBtn');

const cells = [];
let order = [];
let step = 0;
let locked = false;
let finished = false;

for (let i = 0; i < 9; i++) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'lucky-cell';
  el.setAttribute('aria-pressed', 'false');
  el.innerHTML = `<span class="lucky-num">${i + 1}</span><span class="lucky-check">✓</span>`;
  const r = Math.floor(i / 3), c = i % 3;
  el.style.backgroundPosition = `${c * 50}% ${r * 50}%`;
  el.addEventListener('click', () => toggle(i));
  grid.appendChild(el);
  cells.push(el);
}

function selected() {
  return cells
    .map((el, i) => (el.classList.contains('selected') ? i + 1 : null))
    .filter((n) => n !== null);
}

function updateActionLabel() {
  if (finished) actionBtn.textContent = 'Again';
  else actionBtn.textContent = selected().length ? 'Verify' : 'Skip';
}

function toggle(i) {
  if (locked || finished) return;
  const el = cells[i];
  const on = !el.classList.contains('selected');
  el.classList.toggle('selected', on);
  el.setAttribute('aria-pressed', String(on));
  Sound.play(CONFIG.sounds.select, 'pop');
  msgEl.textContent = '';
  updateActionLabel();
}

function clearSelection() {
  cells.forEach((el) => {
    el.classList.remove('selected', 'correct');
    el.setAttribute('aria-pressed', 'false');
  });
}

function newGame() {
  order = CONFIG.levels.map((_, i) => i);
  if (CONFIG.randomOrder) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  loadStep(0);
}

function currentLevel() {
  return CONFIG.levels[order[step]];
}

function loadStep(s) {
  step = s;
  finished = false;
  locked = false;
  const level = currentLevel();
  levelEl.textContent = s + 1;
  levelTotalEl.textContent = CONFIG.levels.length;
  promptEl.textContent = level.prompt || CONFIG.prompt;
  msgEl.textContent = '';
  clearSelection();
  updateActionLabel();

  imageExists(level.image).then((ok) => {
    if (currentLevel() !== level) return;
    grid.classList.toggle('has-image', ok);
    cells.forEach((el) => { el.style.backgroundImage = ok ? `url("${level.image}")` : ''; });
    if (!ok) msgEl.textContent = `Add the image at ${level.image}`;
  });
}

function reload() {
  if (locked) return;
  if (finished) { newGame(); return; }
  if (order.length - step < 2) { loadStep(step); return; }
  order.push(order.splice(step, 1)[0]);
  loadStep(step);
}

function isCorrect(picked, level) {
  const must = level.lucky || [];
  const ok = new Set([...must, ...(level.optional || [])]);
  return must.every((n) => picked.includes(n)) && picked.every((n) => ok.has(n));
}

function check() {
  if (locked) return;
  if (finished) { newGame(); return; }

  const level = currentLevel();
  const picked = selected();

  if (!isCorrect(picked, level)) {
    Sound.play(CONFIG.sounds.wrong, 'end');
    msgEl.textContent = picked.length ? 'Please try again.' : 'There are lucky objects here. Look again!';
    retrigger(grid, 'shake');
    return;
  }

  cells.forEach((el) => { if (el.classList.contains('selected')) el.classList.add('correct'); });
  locked = true;
  const last = step === order.length - 1;

  if (last) {
    Sound.play(CONFIG.sounds.allDone, 'win');
    Sparkles.burst(grid.closest('.keychain'), 40);
    msgEl.textContent = 'You found all the lucky objects! 🍀';
    finished = true;
    locked = false;
    updateActionLabel();
    Store.set('mlc_lucky_completed', Store.get('mlc_lucky_completed', 0) + 1);
  } else {
    Sound.play(CONFIG.sounds.correct, 'chime');
    Sparkles.burst(grid.closest('.keychain'), 18);
    msgEl.textContent = 'Lucky! Next one...';
    setTimeout(() => loadStep(step + 1), CONFIG.nextLevelDelay);
  }
}

actionBtn.addEventListener('click', check);
reloadBtn.addEventListener('click', reload);
setupAudioButton(document.getElementById('audioBtn'));
setupInfoButton(document.getElementById('infoBtn'), document.getElementById('helpPanel'));

Object.values(CONFIG.sounds).forEach((s) => Sound.preload(s));
CONFIG.levels.forEach((l) => imageExists(l.image));
newGame();
