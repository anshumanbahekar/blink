const STORAGE_KEY = 'blink_v1';

let state = { history: [], best: null, streak: 0 };

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) state = JSON.parse(saved);
} catch (e) {}

const circle = document.getElementById('circle');
const timeEl = document.getElementById('time');
const labelEl = document.getElementById('label');

let mode = 'idle';
let timer = null;
let t0 = null;

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function updateUI() {
  const h = state.history;

  document.getElementById('s-best').textContent = state.best ?? '—';
  document.getElementById('s-avg').textContent = h.length
    ? Math.round(h.slice(-10).reduce((a, b) => a + b, 0) / Math.min(h.length, 10))
    : '—';
  document.getElementById('s-count').textContent = h.length;
  document.getElementById('s-streak').textContent = state.streak;

  renderBars();
}

function renderBars() {
  const bars = document.getElementById('bars');
  bars.innerHTML = '';

  const recent = state.history.slice(-20);
  if (!recent.length) return;

  const mn = Math.min(...recent);
  const mx = Math.max(...recent);

  recent.forEach(v => {
    const b = document.createElement('div');
    const isBest = v === mn;
    const isWorst = v === mx;
    b.className = 'bar' + (isBest ? ' best' : isWorst ? ' worst' : '');
    b.style.height = (mx === mn ? 60 : 15 + 70 * ((mx - v) / (mx - mn))) + '%';
    bars.appendChild(b);
  });
}

function handleClick() {
  if (mode === 'idle') {
    mode = 'waiting';
    circle.className = '';
    circle.textContent = 'wait...';
    timeEl.textContent = '';
    labelEl.textContent = '';

    const delay = 1200 + Math.random() * 2800;
    timer = setTimeout(() => {
      mode = 'ready';
      circle.className = 'ready';
      circle.textContent = 'NOW!';
      t0 = performance.now();
    }, delay);

  } else if (mode === 'waiting') {
    clearTimeout(timer);
    mode = 'idle';
    circle.className = 'toosoon';
    circle.textContent = 'too soon!';
    state.streak = 0;
    save();
    updateUI();
    timeEl.textContent = '!!';
    labelEl.textContent = 'too early';

    setTimeout(() => {
      circle.className = '';
      circle.textContent = 'click to start';
      timeEl.textContent = '';
      labelEl.textContent = '';
    }, 1500);

  } else if (mode === 'ready') {
    const ms = Math.round(performance.now() - t0);
    mode = 'idle';

    state.history.push(ms);
    if (state.history.length > 100) state.history.shift();
    state.streak = ms < 400 ? state.streak + 1 : 0;
    if (state.best == null || ms < state.best) state.best = ms;

    save();
    updateUI();

    timeEl.textContent = ms + 'ms';
    labelEl.textContent =
      ms < 200 ? 'inhuman!' :
      ms < 280 ? 'great!' :
      ms < 380 ? 'ok' :
      ms < 500 ? 'slow...' : 'asleep?';

    circle.className = '';
    circle.textContent = 'again?';

    setTimeout(() => {
      if (mode === 'idle') circle.textContent = 'click to start';
    }, 2000);
  }
}

circle.addEventListener('click', handleClick);

document.getElementById('reset').addEventListener('click', () => {
  if (!confirm('reset all stats?')) return;
  state = { history: [], best: null, streak: 0 };
  save();
  updateUI();
  circle.className = '';
  circle.textContent = 'click to start';
  timeEl.textContent = '';
  labelEl.textContent = '';
  mode = 'idle';
});

updateUI();
