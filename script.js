'use strict';

const STORAGE_KEYS = {
  highScore: 'catchSwarmHighScore',
  achievements: 'catchSwarmAchievements',
  sound: 'catchSwarmSound'
};

const insectData = {
  fly: {
    name: 'Fly',
    emoji: '🪰',
    points: 10,
    color: '#c7d2ff',
    description: 'Quick & nimble',
    size: 74
  },
  mosquito: {
    name: 'Mosquito',
    emoji: '🦟',
    points: 12,
    color: '#bca7ff',
    description: 'Small & speedy',
    size: 68
  },
  spider: {
    name: 'Spider',
    emoji: '🕷️',
    points: 14,
    color: '#ff78b9',
    description: 'Slow & sneaky',
    size: 80
  },
  roach: {
    name: 'Roach',
    emoji: '🪳',
    points: 16,
    color: '#d69b71',
    description: 'Erratic runner',
    size: 78
  },
  bee: {
    name: 'Bee',
    emoji: '🐝',
    points: 20,
    color: '#ffd166',
    description: 'Bonus hunter',
    size: 82
  },
  butterfly: {
    name: 'Butterfly',
    emoji: '🦋',
    points: 24,
    color: '#5ee7ff',
    description: 'Rare & rewarding',
    size: 90
  }
};

const difficultyData = {
  easy: {
    name: 'Warm up',
    spawnInterval: 1650,
    minimumSpawnInterval: 900,
    lifetime: 5600,
    minimumLifetime: 3000,
    maxTargets: 4,
    waveLabel: 'CALIBRATION'
  },
  medium: {
    name: 'Lock in',
    spawnInterval: 1350,
    minimumSpawnInterval: 700,
    lifetime: 4400,
    minimumLifetime: 2200,
    maxTargets: 5,
    waveLabel: 'FOCUS'
  },
  hard: {
    name: 'Overdrive',
    spawnInterval: 1050,
    minimumSpawnInterval: 540,
    lifetime: 3400,
    minimumLifetime: 1700,
    maxTargets: 6,
    waveLabel: 'PRESSURE'
  },
  impossible: {
    name: 'Unfair',
    spawnInterval: 820,
    minimumSpawnInterval: 420,
    lifetime: 2700,
    minimumLifetime: 1350,
    maxTargets: 7,
    waveLabel: 'CHAOS'
  }
};

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function readNumber(key, fallback = 0) {
  const value = Number(readStorage(key, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function readAchievements() {
  try {
    const saved = JSON.parse(readStorage(STORAGE_KEYS.achievements, '[]'));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // The game still works when browser storage is unavailable.
  }
}

const gameState = {
  isPlaying: false,
  isPaused: false,
  difficulty: 'medium',
  selectedInsect: 'butterfly',
  score: 0,
  highScore: readNumber(STORAGE_KEYS.highScore),
  elapsedMs: 0,
  time: 0,
  lives: 3,
  maxLives: 3,
  insects: [],
  stagePowerUps: [],
  activePowerUps: {
    multiscoreUntil: 0,
    shieldUntil: 0
  },
  combo: 0,
  maxCombo: 0,
  comboExpiresAt: 0,
  insectsCaught: 0,
  insectsEscaped: 0,
  achievements: [],
  unlockedAchievements: readAchievements(),
  tickTimer: null,
  spawnTimeout: null,
  runTimeouts: new Set(),
  runId: 0,
  lastTickAt: 0,
  nextPowerUpAt: 0,
  soundEnabled: readStorage(STORAGE_KEYS.sound, 'on') !== 'off'
};

const achievements = [
  { id: 'first_blood', name: 'First contact', icon: '⌖', desc: 'Catch your first target', condition: () => gameState.insectsCaught >= 1 },
  { id: 'catcher', name: 'Clean sweep', icon: '✦', desc: 'Catch 10 targets in one run', condition: () => gameState.insectsCaught >= 10 },
  { id: 'expert', name: 'Field expert', icon: '◎', desc: 'Catch 50 targets in one run', condition: () => gameState.insectsCaught >= 50 },
  { id: 'master', name: 'Swarm master', icon: '♛', desc: 'Catch 100 targets in one run', condition: () => gameState.insectsCaught >= 100 },
  { id: 'combo_starter', name: 'Streak starter', icon: '↗', desc: 'Reach a 5 target streak', condition: () => gameState.maxCombo >= 5 },
  { id: 'combo_master', name: 'Unstoppable', icon: '∞', desc: 'Reach a 10 target streak', condition: () => gameState.maxCombo >= 10 },
  { id: 'score_100', name: 'Triple digits', icon: '01', desc: 'Score 100 points', condition: () => gameState.score >= 100 },
  { id: 'score_500', name: 'High voltage', icon: '⚡', desc: 'Score 500 points', condition: () => gameState.score >= 500 },
  { id: 'score_1000', name: 'Night legend', icon: '★', desc: 'Score 1,000 points', condition: () => gameState.score >= 1000 },
  { id: 'butterfly_hunter', name: 'Wing collector', icon: '🦋', desc: 'Catch 5 butterflies', condition: () => gameState.selectedInsect === 'butterfly' && gameState.insectsCaught >= 5 },
  { id: 'bee_king', name: 'Hive mind', icon: '🐝', desc: 'Catch 5 bees', condition: () => gameState.selectedInsect === 'bee' && gameState.insectsCaught >= 5 },
  { id: 'survivor', name: 'Stayed in the zone', icon: '◷', desc: 'Survive for 2 minutes', condition: () => gameState.time >= 120 },
  { id: 'speed_demon', name: 'Fast hands', icon: '⌁', desc: 'Catch 20 targets in 60 seconds', condition: () => gameState.insectsCaught >= 20 && gameState.time <= 60 }
];

const $ = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll('.screen')];
const startBtn = $('start-btn');
const howToBtn = $('how-to-btn');
const guideStartBtn = $('guide-start-btn');
const difficultyBtns = [...document.querySelectorAll('.difficulty-btn')];
const insectBtns = [...document.querySelectorAll('.target-option')];
const gameContainer = $('game-container');
const timeEl = $('time');
const scoreEl = $('score');
const comboEl = $('combo');
const multiplierEl = $('multiplier');
const livesEl = $('lives');
const livesIconsEl = $('lives-icons');
const waveEl = $('wave');
const waveLabelEl = $('wave-label');
const currentTargetEl = $('current-target');
const messageEl = $('arena-message');
const messageTextEl = $('message-text');
const comboHintEl = $('combo-hint');
const comboProgressEl = $('combo-progress');
const powerMultiscoreEl = $('power-multiscore');
const powerShieldEl = $('power-shield');
const multiscoreTimeEl = $('multiscore-time');
const shieldTimeEl = $('shield-time');
const pauseBtn = $('pause-btn');
const soundBtn = $('sound-btn');
const pauseOverlay = $('pause-overlay');
const gameOverScreen = $('game-over-screen');
const finalScoreEl = $('final-score');
const highScoreEl = $('high-score');
const bestComboEl = $('best-combo');
const caughtCountEl = $('caught-count');
const accuracyEl = $('accuracy');
const timePlayedEl = $('time-played');
const resultKickerEl = $('result-kicker');
const gameOverTitleEl = $('game-over-title');
const resultReasonEl = $('result-reason');
const newRecordEl = $('new-record');
const achievementsEl = $('achievements');
const achievementSummaryEl = $('achievement-summary');

let audioContext = null;

function showScreen(screenId) {
  screens.forEach((screen) => screen.classList.remove('active'));
  const nextScreen = $(screenId);
  if (nextScreen) {
    nextScreen.classList.add('active');
  }
  if (screenId === 'start-screen') {
    updateMenuStats();
  }
}

function updateMenuStats() {
  gameState.highScore = readNumber(STORAGE_KEYS.highScore, gameState.highScore);
  $('menu-high-score').textContent = gameState.highScore.toLocaleString();
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function getDifficulty() {
  return difficultyData[gameState.difficulty] || difficultyData.medium;
}

function getMultiplier() {
  if (gameState.combo < 4) return 1;
  return Math.min(5, 1 + Math.floor(gameState.combo / 3));
}

function getSpawnInterval() {
  const difficulty = getDifficulty();
  const wavePressure = Math.min(390, gameState.time * 5.5);
  return Math.max(difficulty.minimumSpawnInterval, difficulty.spawnInterval - wavePressure);
}

function getInsectLifetime() {
  const difficulty = getDifficulty();
  const wavePressure = Math.min(difficulty.lifetime - difficulty.minimumLifetime, gameState.time * 13);
  return Math.max(difficulty.minimumLifetime, difficulty.lifetime - wavePressure);
}

function getMaxTargets() {
  const difficulty = getDifficulty();
  return Math.min(10, difficulty.maxTargets + Math.floor(gameState.time / 45));
}

function setMessage(text, shouldFlash = false) {
  messageTextEl.textContent = text;
  if (shouldFlash) {
    messageEl.classList.remove('flash');
    // Force a reflow so consecutive catches can animate the message again.
    void messageEl.offsetWidth;
    messageEl.classList.add('flash');
  }
}

function updateHUD() {
  timeEl.textContent = formatTime(gameState.time);
  scoreEl.textContent = gameState.score.toLocaleString();
  comboEl.textContent = gameState.combo;
  multiplierEl.textContent = `×${getMultiplier()}`;
  livesEl.textContent = gameState.lives;
  livesIconsEl.textContent = gameState.lives > 0 ? `${'♥ '.repeat(gameState.lives).trim()}${gameState.lives < gameState.maxLives ? `  ${'· '.repeat(gameState.maxLives - gameState.lives).trim()}` : ''}` : '· · ·';

  const wave = Math.floor(gameState.time / 15) + 1;
  waveEl.textContent = wave.toString().padStart(2, '0');
  waveLabelEl.textContent = wave > 1 ? `WAVE ${wave}` : getDifficulty().waveLabel;
  currentTargetEl.textContent = (insectData[gameState.selectedInsect] || insectData.butterfly).name.toUpperCase();

  const charge = gameState.combo === 0 ? 0 : gameState.combo % 3 === 0 ? 100 : ((gameState.combo % 3) / 3) * 100;
  comboProgressEl.style.width = `${charge}%`;
  if (gameState.combo >= 12) {
    comboHintEl.textContent = 'MAX MULTIPLIER — stay sharp';
  } else {
    const catchesToNext = gameState.combo === 0 ? 3 : 3 - (gameState.combo % 3 || 3);
    comboHintEl.textContent = `Catch ${catchesToNext} more for ×${Math.min(5, getMultiplier() + 1)}`;
  }

  refreshPowerUpUI();
}

function refreshPowerUpUI() {
  const multiscoreRemaining = Math.max(0, gameState.activePowerUps.multiscoreUntil - gameState.elapsedMs);
  const shieldRemaining = Math.max(0, gameState.activePowerUps.shieldUntil - gameState.elapsedMs);
  const hasMultiscore = multiscoreRemaining > 0;
  const hasShield = shieldRemaining > 0;

  powerMultiscoreEl.hidden = !hasMultiscore;
  powerShieldEl.hidden = !hasShield;
  if (hasMultiscore) multiscoreTimeEl.textContent = `${Math.ceil(multiscoreRemaining / 1000)}s`;
  if (hasShield) shieldTimeEl.textContent = `${Math.ceil(shieldRemaining / 1000)}s`;
}

function updateSoundButton() {
  soundBtn.textContent = gameState.soundEnabled ? '♪' : '×';
  soundBtn.setAttribute('aria-label', gameState.soundEnabled ? 'Mute sound' : 'Turn sound on');
  soundBtn.setAttribute('aria-pressed', String(gameState.soundEnabled));
  soundBtn.title = gameState.soundEnabled ? 'Mute sound' : 'Turn sound on';
}

function ensureAudio() {
  if (!gameState.soundEnabled) return null;
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  try {
    if (!audioContext) audioContext = new AudioContextConstructor();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  } catch (error) {
    return null;
  }
}

function playTone(frequency, type = 'sine', duration = 0.1, volume = 0.045, delay = 0) {
  const context = ensureAudio();
  if (!context) return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(Math.max(0.001, volume), startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
  } catch (error) {
    // Audio is an enhancement; a blocked or missing Web Audio API is harmless.
  }
}

const sounds = {
  catch() {
    playTone(570, 'sine', 0.08, 0.035);
    playTone(860, 'sine', 0.1, 0.025, 0.045);
  },
  miss() {
    playTone(180, 'triangle', 0.18, 0.045);
    playTone(120, 'sawtooth', 0.16, 0.02, 0.06);
  },
  powerUp() {
    playTone(620, 'sine', 0.1, 0.04);
    playTone(920, 'sine', 0.12, 0.035, 0.08);
    playTone(1240, 'sine', 0.15, 0.03, 0.16);
  },
  bonus() {
    playTone(760, 'square', 0.08, 0.025);
    playTone(1120, 'square', 0.12, 0.022, 0.08);
  },
  gameOver() {
    playTone(390, 'triangle', 0.18, 0.035);
    playTone(290, 'triangle', 0.2, 0.03, 0.16);
    playTone(190, 'triangle', 0.3, 0.025, 0.34);
  }
};

function stopTimers() {
  if (gameState.tickTimer) {
    window.clearInterval(gameState.tickTimer);
    gameState.tickTimer = null;
  }
  if (gameState.spawnTimeout) {
    window.clearTimeout(gameState.spawnTimeout);
    gameState.spawnTimeout = null;
  }
  gameState.runTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
  gameState.runTimeouts.clear();
}

function cleanupArena() {
  gameContainer.querySelectorAll('.insect, .power-up, .particle, .floating-score, .toast, .confetti').forEach((element) => element.remove());
  gameState.insects = [];
  gameState.stagePowerUps = [];
}

function resetGame() {
  stopTimers();
  gameState.runId += 1;
  gameState.isPlaying = false;
  gameState.isPaused = false;
  gameState.elapsedMs = 0;
  gameState.time = 0;
  gameState.activePowerUps = { multiscoreUntil: 0, shieldUntil: 0 };
  gameState.combo = 0;
  gameState.comboExpiresAt = 0;
  gameState.achievements = [];
  cleanupArena();
  gameContainer.classList.remove('paused');
  pauseOverlay.classList.remove('active');
  pauseOverlay.setAttribute('aria-hidden', 'true');
  gameOverScreen.classList.remove('active');
  gameOverScreen.setAttribute('aria-hidden', 'true');
}

function startGame() {
  resetGame();
  gameState.runId += 1;
  gameState.isPlaying = true;
  gameState.lives = gameState.maxLives;
  gameState.score = 0;
  gameState.insectsCaught = 0;
  gameState.insectsEscaped = 0;
  gameState.maxCombo = 0;
  gameState.nextPowerUpAt = 10000 + Math.random() * 5000;
  gameState.lastTickAt = performance.now();

  const target = insectData[gameState.selectedInsect] || insectData.butterfly;
  currentTargetEl.textContent = target.name.toUpperCase();
  pauseBtn.textContent = 'Ⅱ';
  pauseBtn.setAttribute('aria-label', 'Pause game');
  pauseBtn.setAttribute('aria-pressed', 'false');
  setMessage(`Target acquired: ${target.name}. Tap it before it escapes.`, true);
  showScreen('game-container');
  gameOverScreen.classList.remove('active');
  gameOverScreen.setAttribute('aria-hidden', 'true');
  updateHUD();

  createInsect();
  scheduleRunTimeout(() => createInsect(), 550);
  scheduleNextSpawn(1150);
  gameState.tickTimer = window.setInterval(gameTick, 100);
}

function scheduleRunTimeout(callback, delay) {
  const runId = gameState.runId;
  const timeoutId = window.setTimeout(() => {
    gameState.runTimeouts.delete(timeoutId);
    if (runId === gameState.runId) callback();
  }, delay);
  gameState.runTimeouts.add(timeoutId);
  return timeoutId;
}

function scheduleNextSpawn(delay = getSpawnInterval()) {
  if (!gameState.isPlaying || gameState.isPaused) return;
  if (gameState.spawnTimeout) window.clearTimeout(gameState.spawnTimeout);
  const runId = gameState.runId;
  gameState.spawnTimeout = window.setTimeout(() => {
    gameState.spawnTimeout = null;
    if (runId !== gameState.runId || !gameState.isPlaying || gameState.isPaused) return;
    if (gameState.insects.length < getMaxTargets()) createInsect();
    scheduleNextSpawn(getSpawnInterval());
  }, Math.max(220, delay));
}

function gameTick() {
  if (!gameState.isPlaying || gameState.isPaused) return;

  const now = performance.now();
  const delta = Math.min(250, Math.max(0, now - gameState.lastTickAt));
  gameState.lastTickAt = now;
  gameState.elapsedMs += delta;

  const previousTime = gameState.time;
  gameState.time = Math.floor(gameState.elapsedMs / 1000);
  if (gameState.time !== previousTime) checkAchievements();

  if (gameState.combo > 0 && gameState.elapsedMs >= gameState.comboExpiresAt) {
    gameState.combo = 0;
    setMessage('Streak faded. Find your rhythm again.');
  }

  [...gameState.insects].forEach((insect) => {
    if (gameState.isPlaying && Number(insect.dataset.expiresAt) <= gameState.elapsedMs) {
      expireInsect(insect);
    }
  });

  [...gameState.stagePowerUps].forEach((powerUp) => {
    if (gameState.elapsedMs >= powerUp.expiresAt) removeStagePowerUp(powerUp);
  });

  if (gameState.elapsedMs >= gameState.nextPowerUpAt) {
    if (gameState.stagePowerUps.length < 2) spawnPowerUp();
    gameState.nextPowerUpAt = gameState.elapsedMs + Math.max(8500, 17000 - gameState.time * 35) + Math.random() * 3500;
  }

  updateHUD();
}

function getRandomLocation(size = 76) {
  const width = gameContainer.clientWidth || window.innerWidth;
  const height = gameContainer.clientHeight || window.innerHeight;
  const horizontalPadding = Math.max(36, size / 2 + 12);
  const minX = horizontalPadding;
  const maxX = Math.max(minX + 10, width - horizontalPadding);
  const minY = Math.min(Math.max(205, height * 0.34), Math.max(205, height - 145));
  const maxY = Math.max(minY + 18, height - Math.max(70, size / 2 + 16));

  return {
    x: minX + Math.random() * Math.max(10, maxX - minX),
    y: minY + Math.random() * Math.max(10, maxY - minY)
  };
}

function createInsect() {
  if (!gameState.isPlaying || gameState.isPaused || gameState.insects.length >= getMaxTargets()) return null;

  const data = insectData[gameState.selectedInsect] || insectData.butterfly;
  const target = document.createElement('button');
  const availableWidth = gameContainer.clientWidth || window.innerWidth;
  const size = Math.min(data.size, Math.max(62, availableWidth * 0.18));
  const location = getRandomLocation(size);
  const lifetime = getInsectLifetime();

  target.type = 'button';
  target.className = `insect target-${gameState.selectedInsect}`;
  target.setAttribute('aria-label', `Catch ${data.name}, worth ${data.points} points`);
  target.dataset.type = gameState.selectedInsect;
  target.dataset.expiresAt = String(gameState.elapsedMs + lifetime);
  target.style.left = `${location.x}px`;
  target.style.top = `${location.y}px`;
  target.style.setProperty('--target-size', `${size}px`);
  target.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 25)}px`);
  target.style.setProperty('--dy', `${Math.round((Math.random() - 0.5) * 25)}px`);
  target.style.setProperty('--drift-time', `${(2.4 + Math.random() * 2.4).toFixed(2)}s`);
  target.style.setProperty('--rotation', `${Math.round(Math.random() * 35 - 17)}deg`);
  target.innerHTML = `<span class="target-core"><span class="target-emoji" aria-hidden="true">${data.emoji}</span></span>`;

  target.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    catchInsect(event, target);
  });
  target.addEventListener('click', (event) => {
    // Pointer devices are handled on pointerdown for a snappier response; click
    // remains here for keyboard activation and browsers without Pointer Events.
    if (event.detail === 0) catchInsect(event, target);
  });

  gameContainer.appendChild(target);
  gameState.insects.push(target);
  return target;
}

function removeInsect(target, removeFromDom = true) {
  gameState.insects = gameState.insects.filter((item) => item !== target);
  if (removeFromDom && target.parentNode) target.remove();
}

function getArenaPoint(clientX, clientY, fallbackRect) {
  const arenaRect = gameContainer.getBoundingClientRect();
  const x = typeof clientX === 'number' ? clientX - arenaRect.left : fallbackRect.left - arenaRect.left + fallbackRect.width / 2;
  const y = typeof clientY === 'number' ? clientY - arenaRect.top : fallbackRect.top - arenaRect.top + fallbackRect.height / 2;
  return {
    x: Math.max(20, Math.min(arenaRect.width - 20, x)),
    y: Math.max(20, Math.min(arenaRect.height - 20, y))
  };
}

function showFloatingScore(x, y, text, kind = '') {
  const floating = document.createElement('div');
  floating.className = `floating-score ${kind}`.trim();
  floating.textContent = text;
  floating.style.left = `${x}px`;
  floating.style.top = `${y}px`;
  gameContainer.appendChild(floating);
  scheduleRunTimeout(() => floating.remove(), 950);
}

function createParticles(rect, color = '#5ee7ff') {
  const arenaRect = gameContainer.getBoundingClientRect();
  const x = rect.left - arenaRect.left + rect.width / 2;
  const y = rect.top - arenaRect.top + rect.height / 2;
  const particleCount = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 4 : 12;

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement('span');
    const angle = (Math.PI * 2 * index) / particleCount;
    const distance = 38 + Math.random() * 50;
    particle.className = 'particle';
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--particle-color', color);
    gameContainer.appendChild(particle);
    scheduleRunTimeout(() => particle.remove(), 780);
  }
}

function catchInsect(event, target) {
  if (!gameState.isPlaying || gameState.isPaused || !target.isConnected || target.classList.contains('caught') || target.classList.contains('escaped')) return;
  event.stopPropagation();

  const data = insectData[target.dataset.type] || insectData.butterfly;
  const rect = target.getBoundingClientRect();
  const point = getArenaPoint(event.clientX, event.clientY, rect);
  const targetType = target.dataset.type;

  removeInsect(target, false);
  target.classList.add('caught');
  gameState.combo += 1;
  gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);
  gameState.comboExpiresAt = gameState.elapsedMs + 3400;

  const multiplier = getMultiplier();
  const streakBonus = gameState.combo % 5 === 0 ? 10 * multiplier : 0;
  let points = (data.points * multiplier) + streakBonus;
  if (gameState.activePowerUps.multiscoreUntil > gameState.elapsedMs) points *= 2;

  gameState.score += points;
  gameState.insectsCaught += 1;
  checkAchievements();
  sounds.catch();
  if (streakBonus > 0) sounds.bonus();

  createParticles(rect, data.color);
  showFloatingScore(point.x, point.y, `+${points}${multiplier > 1 ? `  ×${multiplier}` : ''}`, streakBonus > 0 ? 'special' : '');
  scheduleRunTimeout(() => target.remove(), 380);

  if (gameState.combo % 3 === 0) {
    setMessage(`Streak charged — ×${getMultiplier()} multiplier ready.`, true);
  } else if (streakBonus > 0) {
    setMessage('Milestone bonus. Keep the chain alive!', true);
  }

  updateHUD();
  if (gameState.insects.length < Math.min(2, getMaxTargets())) scheduleNextSpawn(280);

  // Keeping this branch explicit makes special-target stats easy to extend
  // without changing the scoring path.
  if (targetType === 'bee' || targetType === 'butterfly') updateHUD();
}

function expireInsect(insect) {
  if (!insect || !insect.isConnected || insect.classList.contains('caught') || insect.classList.contains('escaped')) return;
  const rect = insect.getBoundingClientRect();
  const point = getArenaPoint(undefined, undefined, rect);
  removeInsect(insect, false);
  insect.classList.add('escaped');
  gameState.insectsEscaped += 1;
  gameState.combo = 0;
  gameState.comboExpiresAt = 0;
  showFloatingScore(point.x, point.y, 'MISS', 'penalty');
  scheduleRunTimeout(() => insect.remove(), 360);
  loseLife();
}

function loseLife() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  sounds.miss();

  if (gameState.activePowerUps.shieldUntil > gameState.elapsedMs) {
    gameState.activePowerUps.shieldUntil = 0;
    setMessage('Shield absorbed the miss. Stay in the zone.', true);
    sounds.powerUp();
    updateHUD();
    return;
  }

  gameState.lives = Math.max(0, gameState.lives - 1);
  if (gameState.lives > 0) {
    setMessage(`${gameState.lives} ${gameState.lives === 1 ? 'life' : 'lives'} left. Lock in.`, true);
    updateHUD();
  } else {
    updateHUD();
    gameOver('You ran out of lives.');
  }
}

function spawnPowerUp() {
  if (!gameState.isPlaying || gameState.isPaused || gameState.stagePowerUps.length >= 2) return;

  const type = Math.random() > 0.5 ? 'multiscore' : 'shield';
  const location = getRandomLocation(72);
  const powerUp = document.createElement('button');
  const expiresAt = gameState.elapsedMs + 6500;
  const icon = type === 'multiscore' ? '◆' : '⬡';

  powerUp.type = 'button';
  powerUp.className = `insect power-up ${type === 'shield' ? 'shield-drop' : ''}`.trim();
  powerUp.setAttribute('aria-label', type === 'multiscore' ? 'Catch for double score' : 'Catch for a protective shield');
  powerUp.dataset.powerType = type;
  powerUp.style.left = `${location.x}px`;
  powerUp.style.top = `${location.y}px`;
  powerUp.style.setProperty('--target-size', `${Math.min(74, Math.max(60, (gameContainer.clientWidth || window.innerWidth) * 0.15))}px`);
  powerUp.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 18)}px`);
  powerUp.style.setProperty('--dy', `${Math.round((Math.random() - 0.5) * 18)}px`);
  powerUp.innerHTML = `<span class="power-up-core" aria-hidden="true">${icon}</span>`;

  const stageItem = { element: powerUp, type, expiresAt };
  powerUp.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    activatePowerUp(stageItem);
  });
  powerUp.addEventListener('click', (event) => {
    if (event.detail === 0) activatePowerUp(stageItem);
  });

  gameContainer.appendChild(powerUp);
  gameState.stagePowerUps.push(stageItem);
  setMessage(type === 'multiscore' ? 'Double score dropped — grab it!' : 'Shield dropped — make it count!', true);
}

function removeStagePowerUp(stageItem) {
  gameState.stagePowerUps = gameState.stagePowerUps.filter((item) => item !== stageItem);
  if (stageItem.element && stageItem.element.parentNode) stageItem.element.remove();
}

function activatePowerUp(stageItem) {
  if (!gameState.isPlaying || gameState.isPaused || !gameState.stagePowerUps.includes(stageItem)) return;
  const point = getArenaPoint(undefined, undefined, stageItem.element.getBoundingClientRect());
  removeStagePowerUp(stageItem);
  sounds.powerUp();

  if (stageItem.type === 'multiscore') {
    gameState.activePowerUps.multiscoreUntil = Math.max(gameState.elapsedMs, gameState.activePowerUps.multiscoreUntil) + 10000;
    setMessage('Double score online for 10 seconds!', true);
    showFloatingScore(point.x, point.y, '×2 SCORE', 'special');
  } else {
    gameState.activePowerUps.shieldUntil = Math.max(gameState.elapsedMs, gameState.activePowerUps.shieldUntil) + 15000;
    setMessage('Shield online. One miss is forgiven.', true);
    showFloatingScore(point.x, point.y, 'SHIELD', 'special');
  }
  updateHUD();
}

function togglePause() {
  if (!gameState.isPlaying) return;
  gameState.isPaused = !gameState.isPaused;
  gameContainer.classList.toggle('paused', gameState.isPaused);
  pauseOverlay.classList.toggle('active', gameState.isPaused);
  pauseOverlay.setAttribute('aria-hidden', String(!gameState.isPaused));
  pauseBtn.textContent = gameState.isPaused ? '▶' : 'Ⅱ';
  pauseBtn.setAttribute('aria-label', gameState.isPaused ? 'Resume game' : 'Pause game');
  pauseBtn.setAttribute('aria-pressed', String(gameState.isPaused));

  if (gameState.isPaused) {
    if (gameState.spawnTimeout) {
      window.clearTimeout(gameState.spawnTimeout);
      gameState.spawnTimeout = null;
    }
  } else {
    gameState.lastTickAt = performance.now();
    scheduleNextSpawn(320);
  }
}

function showAchievementToast(achievement) {
  gameContainer.querySelectorAll('.toast').forEach((toast) => toast.remove());
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `${achievement.icon}  ${achievement.name} unlocked`;
  gameContainer.appendChild(toast);
  scheduleRunTimeout(() => toast.remove(), 2250);
}

function checkAchievements() {
  achievements.forEach((achievement) => {
    if (!achievement.condition() || gameState.achievements.includes(achievement.id)) return;
    gameState.achievements.push(achievement.id);
    if (!gameState.unlockedAchievements.includes(achievement.id)) {
      gameState.unlockedAchievements.push(achievement.id);
      saveStorage(STORAGE_KEYS.achievements, JSON.stringify(gameState.unlockedAchievements));
    }
    showAchievementToast(achievement);
  });
}

function renderAchievements() {
  const unlockedThisRun = achievements.filter((achievement) => gameState.achievements.includes(achievement.id));
  achievementSummaryEl.textContent = `${unlockedThisRun.length} unlocked`;
  if (unlockedThisRun.length === 0) {
    achievementsEl.innerHTML = '<p class="no-achievements">No unlocks this run — your next streak is waiting.</p>';
    return;
  }

  achievementsEl.innerHTML = unlockedThisRun.map((achievement) => `
    <div class="achievement-item">
      <span class="achievement-icon" aria-hidden="true">${achievement.icon}</span>
      <span><strong class="achievement-name">${achievement.name}</strong><small class="achievement-desc">${achievement.desc}</small></span>
    </div>
  `).join('');
}

function createConfetti() {
  const colors = ['#5ee7ff', '#b8f36b', '#ffd166', '#ff78b9', '#8b7cff'];
  const count = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 8 : 34;
  for (let index = 0; index < count; index += 1) {
    const confetti = document.createElement('span');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.setProperty('--fall-x', `${Math.round((Math.random() - 0.5) * 280)}px`);
    confetti.style.setProperty('--confetti-color', colors[index % colors.length]);
    confetti.style.animationDelay = `${Math.random() * 0.55}s`;
    gameContainer.appendChild(confetti);
    window.setTimeout(() => confetti.remove(), 3400);
  }
}

function gameOver(reason = 'Run complete.') {
  if (!gameState.isPlaying) return;
  checkAchievements();
  gameState.isPlaying = false;
  gameState.isPaused = false;
  stopTimers();
  gameContainer.classList.remove('paused');
  pauseOverlay.classList.remove('active');
  pauseOverlay.setAttribute('aria-hidden', 'true');
  sounds.gameOver();

  const isNewRecord = gameState.score > gameState.highScore;
  if (isNewRecord) {
    gameState.highScore = gameState.score;
    saveStorage(STORAGE_KEYS.highScore, String(gameState.highScore));
  }

  const attempts = gameState.insectsCaught + gameState.insectsEscaped;
  const accuracy = attempts === 0 ? 0 : Math.round((gameState.insectsCaught / attempts) * 100);
  finalScoreEl.textContent = gameState.score.toLocaleString();
  highScoreEl.textContent = gameState.highScore.toLocaleString();
  bestComboEl.textContent = `${gameState.maxCombo}×`;
  caughtCountEl.textContent = gameState.insectsCaught;
  accuracyEl.textContent = `${accuracy}%`;
  timePlayedEl.textContent = formatTime(gameState.time);
  newRecordEl.hidden = !isNewRecord;
  resultKickerEl.textContent = isNewRecord ? 'NEW PERSONAL BEST' : 'RUN COMPLETE';
  gameOverTitleEl.textContent = isNewRecord ? 'You own the night.' : gameState.score > 0 ? 'The swarm got away.' : 'Warm-up complete.';
  resultReasonEl.textContent = isNewRecord ? 'That reaction speed is a problem for the swarm.' : reason;
  renderAchievements();
  gameOverScreen.classList.add('active');
  gameOverScreen.setAttribute('aria-hidden', 'false');
  createConfetti();
}

function returnToMenu() {
  resetGame();
  showScreen('start-screen');
}

// Navigation events
startBtn.addEventListener('click', () => {
  ensureAudio();
  showScreen('difficulty-screen');
});

howToBtn.addEventListener('click', () => showScreen('how-to-screen'));
guideStartBtn.addEventListener('click', () => showScreen('difficulty-screen'));
$('difficulty-back-btn').addEventListener('click', () => showScreen('start-screen'));
$('target-back-btn').addEventListener('click', () => showScreen('difficulty-screen'));
$('back-btn').addEventListener('click', () => showScreen('start-screen'));

for (const button of difficultyBtns) {
  button.addEventListener('click', () => {
    gameState.difficulty = button.dataset.difficulty;
    showScreen('insect-select-screen');
  });
}

for (const button of insectBtns) {
  button.addEventListener('click', () => {
    gameState.selectedInsect = button.dataset.insect;
    startGame();
  });
}

pauseBtn.addEventListener('click', togglePause);
$('resume-btn').addEventListener('click', togglePause);
$('pause-menu-btn').addEventListener('click', returnToMenu);
$('restart-btn').addEventListener('click', startGame);
$('menu-btn').addEventListener('click', returnToMenu);

soundBtn.addEventListener('click', () => {
  gameState.soundEnabled = !gameState.soundEnabled;
  saveStorage(STORAGE_KEYS.sound, gameState.soundEnabled ? 'on' : 'off');
  updateSoundButton();
  if (gameState.soundEnabled) {
    sounds.catch();
    setMessage('Sound on. Stay sharp.');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === ' ' && gameState.isPlaying) {
    event.preventDefault();
    togglePause();
  }
  if (event.key === 'Escape' && gameState.isPlaying) {
    event.preventDefault();
    if (!gameState.isPaused) togglePause();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && gameState.isPlaying && !gameState.isPaused) togglePause();
});

window.addEventListener('resize', () => {
  // New targets use the current arena bounds; existing targets stay where they
  // are so a resize never moves a target underneath the player's pointer.
  updateHUD();
});

updateMenuStats();
updateSoundButton();
updateHUD();
showScreen('start-screen');
