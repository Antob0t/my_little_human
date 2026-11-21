const CONFIG = {
  size: 4,
  image: 'assets/web/puzzle/puzzle.jpg',
  shuffleMoves: 250,
  moveSound: 'assets/sounds/puzzle_move.mp3',
  winSound: 'assets/sounds/puzzle_win.mp3',
};

const N = CONFIG.size;
const EMPTY = N * N - 1;

const board = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const msgEl = document.getElementById('puzzleMsg');
const reloadBtn = document.getElementById('reloadBtn');
const skipBtn = document.getElementById('skipBtn');
const numbersToggle = document.getElementById('numbersToggle');
const previewWrap = document.getElementById('previewWrap');

let tiles = [];
let tileEls = [];
let moves = 0;
let startTime = null;
let timerId = null;
let solved = false;
let hasImage = false;

function build() {
  board.innerHTML = '';
  tileEls = [];
  const pct = 100 / N;

  for (let v = 0; v < N * N; v++) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'tile' + (v === EMPTY ? ' tile-empty' : '');
    el.style.width = pct + '%';
    el.style.height = pct + '%';

    const num = document.createElement('span');
    num.className = 'tile-num';
    num.textContent = v + 1;
    el.appendChild(num);

    if (hasImage) {
      const r = Math.floor(v / N);
      const c = v % N;
      el.style.backgroundImage = `url("${CONFIG.image}")`;
      el.style.backgroundSize = `${N * 100}% ${N * 100}%`;
      el.style.backgroundPosition = `${(c * 100) / (N - 1)}% ${(r * 100) / (N - 1)}%`;
    }

    el.addEventListener('click', () => tryMove(tiles.indexOf(v)));
    board.appendChild(el);
    tileEls.push(el);
  }
  updateNumbers();
}

function layout() {
  tiles.forEach((v, pos) => {
    const el = tileEls[v];
    el.style.left = ((pos % N) * 100) / N + '%';
    el.style.top = (Math.floor(pos / N) * 100) / N + '%';
  });
}

function updateNumbers() {
  board.classList.toggle('show-numbers', !hasImage || numbersToggle.checked);
}

function slide(pos) {
  let e = tiles.indexOf(EMPTY);
  const pr = Math.floor(pos / N), pc = pos % N;
  const er = Math.floor(e / N), ec = e % N;
  let step;
  if (pr === er && pc !== ec) step = pc > ec ? 1 : -1;
  else if (pc === ec && pr !== er) step = pr > er ? N : -N;
  else return 0;

  let count = 0;
  while (e !== pos) {
    const next = e + step;
    tiles[e] = tiles[next];
    tiles[next] = EMPTY;
    e = next;
    count++;
  }
  return count;
}

function tryMove(pos) {
  if (solved || pos < 0) return;
  const moved = slide(pos);
  if (!moved) return;

  if (startTime === null) startTimer();
  moves += moved;
  movesEl.textContent = moves;
  layout();
  Sound.play(CONFIG.moveSound, 'slide');

  if (isSolved()) win();
}

function isSolved() {
  return tiles.every((v, i) => v === i);
}

function shuffle() {
  tiles = Array.from({ length: N * N }, (_, i) => i);
  let e = EMPTY;
  let prev = -1;

  do {
    for (let i = 0; i < CONFIG.shuffleMoves; i++) {
      const r = Math.floor(e / N), c = e % N;
      const options = [];
      if (r > 0) options.push(e - N);
      if (r < N - 1) options.push(e + N);
      if (c > 0) options.push(e - 1);
      if (c < N - 1) options.push(e + 1);
      const choices = options.filter((o) => o !== prev);
      const next = choices[Math.floor(Math.random() * choices.length)];
      tiles[e] = tiles[next];
      tiles[next] = EMPTY;
      prev = e;
      e = next;
    }
  } while (isSolved());

  solved = false;
  moves = 0;
  movesEl.textContent = '0';
  stopTimer();
  startTime = null;
  timeEl.textContent = '0:00';
  msgEl.textContent = '';
  board.classList.remove('solved');

  board.classList.add('no-anim');
  layout();
  void board.offsetWidth;
  board.classList.remove('no-anim');
}

function skip() {
  if (solved) { shuffle(); return; }
  solved = true;
  stopTimer();
  tiles = Array.from({ length: N * N }, (_, i) => i);
  layout();
  board.classList.add('solved');
  msgEl.textContent = 'Skipped! Press Skip or ↻ to play again.';
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function startTimer() {
  startTime = Date.now();
  timerId = setInterval(() => { timeEl.textContent = formatTime(Date.now() - startTime); }, 250);
}
function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function showBest() {
  const best = Store.get('mlc_puzzle_best', null);
  bestEl.textContent = best ? `${best.moves} (${formatTime(best.time)})` : '-';
}

function win() {
  solved = true;
  stopTimer();
  const time = Date.now() - startTime;
  timeEl.textContent = formatTime(time);
  board.classList.add('solved');
  Sound.play(CONFIG.winSound, 'win');
  Sparkles.burst(board.closest('.keychain'), 40);
  msgEl.textContent = `Solved in ${moves} moves and ${formatTime(time)}!`;

  const best = Store.get('mlc_puzzle_best', null);
  if (!best || moves < best.moves || (moves === best.moves && time < best.time)) {
    Store.set('mlc_puzzle_best', { moves, time });
    msgEl.textContent += ' New best!';
  }
  showBest();
}

document.addEventListener('keydown', (ev) => {
  const e = tiles.indexOf(EMPTY);
  const r = Math.floor(e / N), c = e % N;
  let pos = -1;

  if (ev.key === 'ArrowLeft' && c < N - 1) pos = e + 1;
  else if (ev.key === 'ArrowRight' && c > 0) pos = e - 1;
  else if (ev.key === 'ArrowUp' && r < N - 1) pos = e + N;
  else if (ev.key === 'ArrowDown' && r > 0) pos = e - N;
  else return;
  ev.preventDefault();
  tryMove(pos);
});

reloadBtn.addEventListener('click', shuffle);
skipBtn.addEventListener('click', skip);
numbersToggle.addEventListener('change', updateNumbers);
setupAudioButton(document.getElementById('audioBtn'));
setupInfoButton(document.getElementById('infoBtn'), document.getElementById('helpPanel'));

Sound.preload(CONFIG.moveSound);
Sound.preload(CONFIG.winSound);
showBest();

imageExists(CONFIG.image).then((ok) => {
  hasImage = ok;
  previewWrap.innerHTML = ok
    ? `<img class="preview" src="${CONFIG.image}" alt="Solved picture">`
    : `<p>Add the puzzle image at <code>${CONFIG.image}</code></p>`;
  build();
  shuffle();
});
