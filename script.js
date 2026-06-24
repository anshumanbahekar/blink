const STORAGE_KEY = 'reflex_v2';

const RANKS = [
  { name: 'Sloth',       threshold: Infinity,  color: '#78716c' },
  { name: 'Rookie',      threshold: 500,       color: '#78716c' },
  { name: 'Human',       threshold: 350,       color: '#2563eb' },
  { name: 'Sharp',       threshold: 280,       color: '#7c3aed' },
  { name: 'Hawk',        threshold: 230,       color: '#d97706' },
  { name: 'Lightning',   threshold: 190,       color: '#dc2626' },
  { name: 'Reflex God',  threshold: 160,       color: '#16a34a' },
];

function getRank(bestMs) {
  if (bestMs == null) return RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (bestMs <= RANKS[i].threshold) return RANKS[i];
  }
  return RANKS[1];
}

let state = loadState();

const target = document.getElementById('target');
const targetLabel = document.getElementById('target-label');
const lastResult = document.getElementById('last-result');
const resultLabel = document.getElementById('result-label');
const rankBadge = document.getElementById('rank-badge');
const rankToast = document.getElementById('rank-toast');
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let gameState = 'idle';
let waitTimer = null;
let startTime = null;
let particles = [];
let animFrame = null;
let previousRank = getRank(state.best).name;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { history: [], best: null, streak: 0 };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}

function avg10(hist) {
  const recent = hist.slice(-10);
  if (!recent.length) return null;
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

function updateUI() {
  const best = state.best;
  const avg = avg10(state.history);
  const count = state.history.length;
  const streak = state.streak;
  const rank = getRank(best);

  document.getElementById('stat-best').textContent = best != null ? best : '—';
  document.getElementById('stat-avg').textContent = avg != null ? avg : '—';
  document.getElementById('stat-count').textContent = count;
  document.getElementById('stat-streak').textContent = streak;

  rankBadge.textContent = rank.name;
  rankBadge.style.background = rank.color + '22';
  rankBadge.style.color = rank.color;

  renderBars();
}

function renderBars() {
  const container = document.getElementById('history-bars');
  const hist = state.history.slice(-20);
  container.innerHTML = '';

  if (!hist.length) {
    document.getElementById('axis-max').textContent = '—';
    return;
  }

  const min = Math.min(...hist);
  const max = Math.max(...hist);
  document.getElementById('axis-max').textContent = max + 'ms';

  hist.forEach(val => {
    const bar = document.createElement('div');
    bar.className = 'history-bar';
    const pct = max === min ? 70 : 20 + 70 * (1 - (val - min) / (max - min));
    bar.style.height = pct + '%';
    if (val === min) bar.classList.add('best');
    if (val === max) bar.classList.add('worst');
    container.appendChild(bar);
  });
}

function showToast(msg) {
  rankToast.textContent = msg;
  rankToast.classList.add('show');
  setTimeout(() => rankToast.classList.remove('show'), 2800);
}

function recordResult(ms) {
  state.history.push(ms);
  if (state.history.length > 100) state.history.shift();

  const isGood = ms < 400;
  state.streak = isGood ? state.streak + 1 : 0;

  const prevBest = state.best;
  if (state.best == null || ms < state.best) state.best = ms;

  const prevRankName = getRank(prevBest).name;
  const newRankName = getRank(state.best).name;
  if (newRankName !== prevRankName && prevBest != null) {
    showToast('🏆 Rank up: ' + newRankName + '!');
  }

  saveState();
  updateUI();

  lastResult.textContent = ms + 'ms';
  lastResult.style.color = ms < 200 ? '#16a34a' : ms < 300 ? '#d97706' : ms < 450 ? '#b45309' : '#dc2626';

  const labels = ['inhuman!', 'insane!', 'excellent!', 'great!', 'nice!', 'decent', 'slow...', 'asleep?'];
  const thresholds = [160, 200, 250, 300, 350, 450, 600];
  let label = labels[labels.length - 1];
  for (let i = 0; i < thresholds.length; i++) {
    if (ms < thresholds[i]) { label = labels[i]; break; }
  }
  resultLabel.textContent = label;
}

function burst(cx, cy, color) {
  const count = 28 + Math.floor(Math.random() * 14);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 2.5 + Math.random() * 5;
    const size = 2 + Math.random() * 4;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      size,
      color,
      decay: 0.022 + Math.random() * 0.018,
    });
  }
  if (!animFrame) tickParticles();
}

function tickParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(p => p.alpha > 0.02);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12;
    p.vx *= 0.97;
    p.alpha -= p.decay;
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 1;
  if (particles.length > 0) {
    animFrame = requestAnimationFrame(tickParticles);
  } else {
    animFrame = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function getCanvasCenter() {
  const rect = canvas.getBoundingClientRect();
  return { x: canvas.width / 2, y: canvas.height / 2 };
}

function setWaiting() {
  gameState = 'waiting';
  target.className = 'waiting';
  targetLabel.textContent = 'Wait...';
  lastResult.textContent = '';
  resultLabel.textContent = '';

  const delay = 1200 + Math.random() * 2800;
  waitTimer = setTimeout(() => {
    gameState = 'ready';
    target.className = 'ready';
    targetLabel.textContent = 'NOW!';
    startTime = performance.now();
  }, delay);
}

function handleClick() {
  if (gameState === 'idle') {
    setWaiting();
    return;
  }

  if (gameState === 'waiting') {
    clearTimeout(waitTimer);
    gameState = 'idle';
    target.className = 'toosoon';
    targetLabel.textContent = 'Too soon!';
    state.streak = 0;
    saveState();
    updateUI();
    lastResult.textContent = '!!';
    lastResult.style.color = '#dc2626';
    resultLabel.textContent = 'too early';
    const c = getCanvasCenter();
    burst(c.x, c.y, '#dc2626');
    setTimeout(() => {
      target.className = 'waiting';
      targetLabel.textContent = 'Click\nto start';
      gameState = 'idle';
      lastResult.textContent = '';
      resultLabel.textContent = '';
    }, 1500);
    return;
  }

  if (gameState === 'ready') {
    const ms = Math.round(performance.now() - startTime);
    gameState = 'idle';
    recordResult(ms);
    const c = getCanvasCenter();
    const isGreat = ms < 300;
    burst(c.x, c.y, isGreat ? '#16a34a' : '#d97706');
    if (isGreat) burst(c.x - 30, c.y - 20, '#d97706');
    target.className = 'waiting';
    targetLabel.textContent = 'Again?';
    setTimeout(() => {
      if (gameState === 'idle') targetLabel.textContent = 'Click\nto start';
    }, 2000);
    return;
  }
}

target.addEventListener('click', handleClick);
target.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') handleClick(); });

document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Reset all your stats?')) return;
  state = { history: [], best: null, streak: 0 };
  saveState();
  updateUI();
  lastResult.textContent = '';
  resultLabel.textContent = '';
  target.className = 'waiting';
  targetLabel.textContent = 'Click\nto start';
  gameState = 'idle';
});

function resizeCanvas() {
  const size = Math.min(420, window.innerWidth - 32);
  canvas.width = size;
  canvas.height = size;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
updateUI();
