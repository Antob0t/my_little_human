const CONFIG = {
  normalImages: [
    { src: 'assets/web/robot/iamnotarobot.jpg', label: 'IMG' },
  ],

  specialImage: { src: 'assets/web/robot/iamnotarobotGOLD.jpg', label: '★ GOLD ★' },
  specialChance: 0.02,

  clickSound: 'assets/sounds/robot_click.mp3',
  specialSound: 'assets/sounds/robot_golden.mp3',
};

const box = document.getElementById('robotBox');
const keychain = box.closest('.keychain');
const img = document.getElementById('robotImg');
const label = document.getElementById('robotLabel');
const clicksEl = document.getElementById('clicks');
const goldenEl = document.getElementById('golden');
const msgEl = document.getElementById('robotMsg');

let index = 0;
let clicks = Store.get('mlc_robot_clicks', 0);
let golden = Store.get('mlc_robot_golden', 0);
const available = {};

function show(entry, special) {
  label.textContent = entry.label;
  if (available[entry.src] !== false) {
    img.src = entry.src;
    img.hidden = false;
    label.hidden = true;
  } else {
    img.hidden = true;
    label.hidden = false;
  }
  box.classList.toggle('is-special', special);
}

function updateStats() {
  clicksEl.textContent = clicks;
  goldenEl.textContent = golden;
}

box.addEventListener('click', () => {
  clicks++;
  const special = Math.random() < CONFIG.specialChance;

  if (special) {
    golden++;
    show(CONFIG.specialImage, true);
    Sound.play(CONFIG.specialSound, 'chime');
    Sparkles.burst(keychain, 30);
    msgEl.textContent = 'You found a golden one!';
  } else {
    index = (index + 1) % CONFIG.normalImages.length;
    show(CONFIG.normalImages[index], false);
    Sound.play(CONFIG.clickSound, 'pop');
    Sparkles.burst(keychain, 4);
    msgEl.textContent = '';
  }

  retrigger(box, 'bump');
  updateStats();
  Store.set('mlc_robot_clicks', clicks);
  Store.set('mlc_robot_golden', golden);
});

Sound.preload(CONFIG.clickSound);
Sound.preload(CONFIG.specialSound);
const allImages = [...CONFIG.normalImages, CONFIG.specialImage];
Promise.all(allImages.map((e) => imageExists(e.src).then((ok) => { available[e.src] = ok; })))
  .then(() => show(CONFIG.normalImages[index], false));

show(CONFIG.normalImages[index], false);
updateStats();
