// Game State
let gameState = {
  isPlaying: false,
  isPaused: false,
  difficulty: 'medium',
  selectedInsect: null,
  score: 0,
  highScore: localStorage.getItem('insectGameHighScore') || 0,
  time: 0,
  startTime: 0,
  lives: 3,
  maxLives: 3,
  insects: [],
  powerUps: {
    multiscore: false,
    shield: false
  },
  combo: 0,
  maxCombo: 0,
  comboTimer: null,
  multiscoreTimer: null,
  shieldTimer: null,
  achievements: [],
  insectsCaught: 0,
  specialInsectsCaught: {
    butterfly: 0,
    bee: 0
  }
};

// Achievements System
const achievements = [
  { id: 'first_blood', name: 'First Blood', icon: '🎯', desc: 'Catch your first insect', condition: () => gameState.insectsCaught >= 1 },
  { id: 'catcher', name: 'Catcher', icon: '🦟', desc: 'Catch 10 insects', condition: () => gameState.insectsCaught >= 10 },
  { id: 'expert', name: 'Expert', icon: '👨‍🏫', desc: 'Catch 50 insects', condition: () => gameState.insectsCaught >= 50 },
  { id: 'master', name: 'Master', icon: '👑', desc: 'Catch 100 insects', condition: () => gameState.insectsCaught >= 100 },
  { id: 'combo_starter', name: 'Combo Starter', icon: '🔥', desc: 'Reach a 5x combo', condition: () => gameState.maxCombo >= 5 },
  { id: 'combo_master', name: 'Combo Master', icon: '💫', desc: 'Reach a 10x combo', condition: () => gameState.maxCombo >= 10 },
  { id: 'score_100', name: 'Century', icon: '⭐', desc: 'Score 100 points', condition: () => gameState.score >= 100 },
  { id: 'score_500', name: 'Half Century', icon: '🌟', desc: 'Score 500 points', condition: () => gameState.score >= 500 },
  { id: 'score_1000', name: 'Legend', icon: '🏆', desc: 'Score 1000 points', condition: () => gameState.score >= 1000 },
  { id: 'butterfly_hunter', name: 'Butterfly Hunter', icon: '🦋', desc: 'Catch 5 butterflies', condition: () => gameState.specialInsectsCaught.butterfly >= 5 },
  { id: 'bee_king', name: 'Bee King', icon: '🐝', desc: 'Catch 5 bees', condition: () => gameState.specialInsectsCaught.bee >= 5 },
  { id: 'survivor', name: 'Survivor', icon: '🛡️', desc: 'Play for 2 minutes', condition: () => gameState.time >= 120 },
  { id: 'speed_demon', name: 'Speed Demon', icon: '⚡', desc: 'Catch 20 insects in 1 minute', condition: () => gameState.score >= 20 && gameState.time <= 60 }
];

// DOM Elements
const screens = document.querySelectorAll('.screen');
const startBtn = document.getElementById('start-btn');
const howToBtn = document.getElementById('how-to-btn');
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const insectBtns = document.querySelectorAll('.choose-insect-btn');
const gameContainer = document.getElementById('game-container');
const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const message = document.getElementById('message');
const pauseBtn = document.getElementById('pause-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const highScoreEl = document.getElementById('high-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const backBtn = document.getElementById('back-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseMenuBtn = document.getElementById('pause-menu-btn');

// Audio Context for sound effects
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Sound Effects
const sounds = {
  catch: () => playTone(600, 'sine', 0.1),
  miss: () => playTone(200, 'sawtooth', 0.2),
  powerUp: () => {
    playTone(800, 'sine', 0.1);
    setTimeout(() => playTone(1200, 'sine', 0.2), 100);
  },
  gameOver: () => {
    playTone(400, 'sawtooth', 0.3);
    setTimeout(() => playTone(300, 'sawtooth', 0.3), 200);
    setTimeout(() => playTone(200, 'sawtooth', 0.5), 400);
  },
  bonus: () => {
    playTone(1000, 'square', 0.1);
    setTimeout(() => playTone(1500, 'square', 0.2), 100);
  }
};

function playTone(frequency, type, duration) {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration);
}

// Screen Navigation
function showScreen(screenId) {
  screens.forEach(screen => screen.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// Event Listeners
startBtn.addEventListener('click', () => showScreen('difficulty-screen'));

howToBtn.addEventListener('click', () => showScreen('how-to-screen'));

backBtn.addEventListener('click', () => showScreen('start-screen'));

difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    gameState.difficulty = btn.dataset.difficulty;
    showScreen('insect-select-screen');
  });
});

insectBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    gameState.selectedInsect = btn.dataset.insect;
    startGame();
  });
});

pauseBtn.addEventListener('click', togglePause);

restartBtn.addEventListener('click', () => {
  resetGame();
  startGame();
});

menuBtn.addEventListener('click', () => {
  showScreen('start-screen');
  gameState.isPlaying = false;
});

resumeBtn.addEventListener('click', togglePause);

pauseMenuBtn.addEventListener('click', () => {
  resetGame();
  showScreen('start-screen');
  gameState.isPlaying = false;
  gameState.isPaused = false;
});

// Game Functions
function startGame() {
  gameState.isPlaying = true;
  gameState.score = 0;
  gameState.time = 0;
  gameState.lives = gameState.maxLives;
  gameState.powerUps = { multiscore: false, shield: false };
  gameState.insects = [];
  gameState.combo = 0;
  gameState.maxCombo = 0;
  gameState.achievements = [];
  gameState.insectsCaught = 0;
  gameState.specialInsectsCaught = { butterfly: 0, bee: 0 };
  gameState.startTime = Date.now();
  
  // Clear existing insects
  document.querySelectorAll('.insect').forEach(insect => insect.remove());
  document.querySelectorAll('.particle').forEach(p => p.remove());
  document.querySelectorAll('.floating-score').forEach(f => f.remove());
  
  updateHUD();
  showScreen('game-container');
  gameOverScreen.classList.remove('active');
  message.classList.remove('visible');
  
  // Start game timers
  gameState.gameInterval = setInterval(increaseTime, 1000);
  
  // Create first insect
  setTimeout(createInsect, 1000);
  setTimeout(createInsect, 2000);
  
  // Spawn power-ups
  setInterval(spawnPowerUp, 15000);
}

function resetGame() {
  clearInterval(gameState.gameInterval);
  clearTimeout(gameState.multiscoreTimer);
  clearTimeout(gameState.shieldTimer);
  gameState.isPlaying = false;
  gameState.isPaused = false;
}

function increaseTime() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  gameState.time++;
  
  // Increase difficulty over time
  const difficultyMultipliers = {
    easy: 1,
    medium: 1.2,
    hard: 1.5,
    impossible: 2
  };
  
  const multiplier = difficultyMultipliers[gameState.difficulty];
  
  // Spawn more insects as time progresses
  const insectCount = Math.floor(gameState.time * 0.1 * multiplier) + 2;
  
  while (gameState.insects.length < insectCount) {
    createInsect();
  }
  
  // Check for game over
  if (gameState.time > 60 && gameState.score > 0 && gameState.score < 10) {
    message.classList.add('visible');
  }
  
  updateHUD();
}

function createInsect() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  if (gameState.insects.length >= 20) return;
  
  const insect = document.createElement('div');
  insect.classList.add('insect');
  
  const { x, y } = getRandomLocation();
  insect.style.top = `${y}px`;
  insect.style.left = `${x}px`;
  
  const insectImages = {
    fly: 'http://pngimg.com/uploads/fly/fly_PNG3946.png',
    mosquito: 'http://pngimg.com/uploads/mosquito/mosquito_PNG18175.png',
    spider: 'http://pngimg.com/uploads/spider/spider_PNG12.png',
    roach: 'http://pngimg.com/uploads/roach/roach_PNG12163.png',
    bee: 'https://static.vecteezy.com/system/resources/previews/050/277/020/non_2x/honey-bee-insect-with-transparent-wings-free-png.png',
    butterfly: 'https://static.vecteezy.com/system/resources/previews/075/783/189/non_2x/monarch-butterfly-orange-wing-black-pattern-insect-isolated-transparency-background-nature-wildlife-symmetrical-delicate-beautiful-detailed-macro-spring-summer-pollinator-animal-flying-elegant-png.png'
  };
  
  // Use selected insect or random one
  const insectType = gameState.selectedInsect || Object.keys(insectImages)[Math.floor(Math.random() * 6)];
  const src = insectImages[insectType];
  
  insect.innerHTML = `<img src="${src}" alt="${insectType}" />`;
  insect.dataset.type = insectType;
  
  // Add special classes for animations
  if (insectType === 'butterfly') {
    insect.classList.add('butterfly');
  } else if (insectType === 'bee') {
    insect.classList.add('bee');
  }
  
  // Random rotation
  const rotation = Math.random() * 360;
  insect.querySelector('img').style.transform = `rotate(${rotation}deg)`;
  
  // Click event
  insect.addEventListener('click', (e) => catchInsect(e, insect));
  insect.addEventListener('touchstart', (e) => {
    e.preventDefault();
    catchInsect(e, insect);
  });
  
  gameContainer.appendChild(insect);
  gameState.insects.push(insect);
  
  // Remove insect after some time
  setTimeout(() => {
    if (insect.parentNode && !insect.classList.contains('caught')) {
      insect.remove();
      gameState.insects = gameState.insects.filter(i => i !== insect);
      loseLife();
    }
  }, getInsectLifetime());
}

function getRandomLocation() {
  const padding = 150;
  const x = Math.random() * (window.innerWidth - padding * 2) + padding;
  const y = Math.random() * (window.innerHeight - padding * 2) + padding;
  return { x, y };
}

function getInsectLifetime() {
  const lifetimes = {
    easy: 8000,
    medium: 5000,
    hard: 3000,
    impossible: 2000
  };
  return lifetimes[gameState.difficulty];
}

function catchInsect(e, insect) {
  if (!gameState.isPlaying || gameState.isPaused || insect.classList.contains('caught')) return;
  
  e.stopPropagation();
  
  // Play sound
  sounds.catch();
  
  // Combo system
  clearTimeout(gameState.comboTimer);
  gameState.combo++;
  if (gameState.combo > gameState.maxCombo) {
    gameState.maxCombo = gameState.combo;
  }
  
  // Combo timer to reset
  gameState.comboTimer = setTimeout(() => {
    gameState.combo = 0;
    updateHUD();
  }, 3000);
  
  // Calculate score with combo bonus
  let points = 1;
  const comboBonus = Math.floor(gameState.combo / 5);
  points += comboBonus;
  
  if (gameState.powerUps.multiscore) {
    points *= 2;
    sounds.powerUp();
  }
  
  // Bonus for special insects
  const insectType = insect.dataset.type;
  if (insectType === 'butterfly') {
    points += 5;
    gameState.specialInsectsCaught.butterfly++;
    sounds.bonus();
  } else if (insectType === 'bee') {
    points += 3;
    gameState.specialInsectsCaught.bee++;
    sounds.bonus();
  }
  
  gameState.score += points;
  gameState.insectsCaught++;
  
  // Check achievements
  checkAchievements();
  
  // Show floating score
  showFloatingScore(e.clientX || e.touches[0].clientX, e.clientY || e.touches[0].clientY, `+${points}`);
  
  // Create particles
  createParticles(insect.getBoundingClientRect());
  
  insect.classList.add('caught');
  setTimeout(() => {
    if (insect.parentNode) {
      insect.remove();
      gameState.insects = gameState.insects.filter(i => i !== insect);
    }
  }, 500);
  
  updateHUD();
  
  // Spawn new insect
  setTimeout(createInsect, 500);
}

function loseLife() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  gameState.lives--;
  sounds.miss();
  
  if (gameState.powerUps.shield) {
    gameState.lives++;
    gameState.powerUps.shield = false;
    updateHUD();
    return;
  }
  
  updateHUD();
  
  if (gameState.lives <= 0) {
    gameOver();
  }
}

function updateHUD() {
  const minutes = Math.floor(gameState.time / 60).toString().padStart(2, '0');
  const seconds = (gameState.time % 60).toString().padStart(2, '0');
  timeEl.textContent = `${minutes}:${seconds}`;
  scoreEl.textContent = gameState.score;
  
  let livesDisplay = '';
  for (let i = 0; i < gameState.lives; i++) {
    livesDisplay += '❤️';
  }
  livesEl.textContent = livesDisplay || '💔';
}

function showFloatingScore(x, y, text) {
  const floating = document.createElement('div');
  floating.classList.add('floating-score');
  floating.textContent = text;
  floating.style.left = `${x}px`;
  floating.style.top = `${y}px`;
  gameContainer.appendChild(floating);
  
  setTimeout(() => floating.remove(), 1000);
}

function createParticles(rect) {
  const colors = ['#ffd93d', '#6bff6b', '#ff6b6b', '#6b4cff'];
  
  for (let i = 0; i < 10; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    const angle = (Math.PI * 2 * i) / 10;
    const distance = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * distance + 'px';
    const ty = Math.sin(angle) * distance + 'px';
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = '8px';
    particle.style.height = '8px';
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.setProperty('--tx', tx);
    particle.style.setProperty('--ty', ty);
    
    gameContainer.appendChild(particle);
    
    setTimeout(() => particle.remove(), 1000);
  }
}

function spawnPowerUp() {
  if (!gameState.isPlaying || gameState.isPaused) return;
  
  const powerUp = document.createElement('div');
  powerUp.classList.add('insect', 'power-up');
  
  const { x, y } = getRandomLocation();
  powerUp.style.top = `${y}px`;
  powerUp.style.left = `${x}px`;
  
  const powerUpTypes = ['multiscore', 'shield'];
  const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  
  const icons = {
    multiscore: '💎',
    shield: '🛡️'
  };
  
  powerUp.innerHTML = `<span style="font-size: 50px;">${icons[type]}</span>`;
  powerUp.dataset.type = type;
  
  powerUp.addEventListener('click', (e) => {
    e.stopPropagation();
    activatePowerUp(type, powerUp);
  });
  
  gameContainer.appendChild(powerUp);
  
  setTimeout(() => {
    if (powerUp.parentNode) {
      powerUp.remove();
    }
  }, 5000);
}

function activatePowerUp(type, element) {
  sounds.powerUp();
  
  if (type === 'multiscore') {
    gameState.powerUps.multiscore = true;
    element.querySelector('span').style.fontSize = '70px';
    
    setTimeout(() => {
      gameState.powerUps.multiscore = false;
      element.remove();
    }, 10000);
  } else if (type === 'shield') {
    gameState.powerUps.shield = true;
    element.querySelector('span').style.fontSize = '70px';
    
    setTimeout(() => {
      gameState.powerUps.shield = false;
      element.remove();
    }, 15000);
  }
  
  updateHUD();
}

function togglePause() {
  if (!gameState.isPlaying) return;
  
  gameState.isPaused = !gameState.isPaused;
  pauseBtn.textContent = gameState.isPaused ? '▶️' : '⏸️';
  
  if (gameState.isPaused) {
    document.querySelector('.pause-overlay').classList.add('active');
  } else {
    document.querySelector('.pause-overlay').classList.remove('active');
  }
}

// Achievement System
function checkAchievements() {
  achievements.forEach(achievement => {
    if (achievement.condition() && !gameState.achievements.includes(achievement.id)) {
      gameState.achievements.push(achievement.id);
      showAchievement(achievement);
    }
  });
}

function showAchievement(achievement) {
  const achievementsContainer = document.getElementById('achievements');
  const achievementEl = document.createElement('div');
  achievementEl.classList.add('achievement-item');
  achievementEl.innerHTML = `
    <span class="achievement-icon">${achievement.icon}</span>
    <div class="achievement-text">
      <div class="achievement-name">${achievement.name}</div>
      <div class="achievement-desc">${achievement.desc}</div>
    </div>
  `;
  
  achievementsContainer.appendChild(achievementEl);
  
  // Play achievement sound
  sounds.bonus();
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    achievementEl.style.opacity = '0';
    achievementEl.style.transform = 'translateX(-100%)';
    setTimeout(() => achievementEl.remove(), 500);
  }, 5000);
}

function gameOver() {
  gameState.isPlaying = false;
  clearInterval(gameState.gameInterval);
  clearTimeout(gameState.comboTimer);
  sounds.gameOver();
  
  // Update high score
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    localStorage.setItem('insectGameHighScore', gameState.highScore);
  }
  
  // Display stats
  finalScoreEl.textContent = gameState.score;
  highScoreEl.textContent = gameState.highScore;
  document.getElementById('best-combo').textContent = `${gameState.maxCombo}x`;
  
  const minutes = Math.floor(gameState.time / 60).toString().padStart(2, '0');
  const seconds = (gameState.time % 60).toString().padStart(2, '0');
  document.getElementById('time-played').textContent = `${minutes}:${seconds}`;
  
  gameOverScreen.classList.add('active');
  
  // Create confetti
  createConfetti();
}

function createConfetti() {
  const colors = ['#ffd93d', '#6bff6b', '#ff6b6b', '#6b4cff', '#ff6b9d'];
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.classList.add('confetti');
    
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = `${Math.random() * 2}s`;
    
    gameContainer.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 5000);
  }
}

// Initialize
showScreen('start-screen');

// Handle window resize
window.addEventListener('resize', () => {
  // Adjust insect positions if needed
});

// Prevent double-tap zoom
document.addEventListener('dblclick', (e) => {
  e.preventDefault();
});
