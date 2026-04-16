const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const endOverlay = document.getElementById("end");
const endText = endOverlay.querySelector("p");
const hud = document.getElementById("hud");
const levelText = document.getElementById("levelText");
const playBtn = document.getElementById("playBtn");
const restartBtn = document.getElementById("restartBtn");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GRAVITY = 1800;
const MOVE_SPEED = 260;
const JUMP_SPEED = 640;
const BOSS_SPEED = 170;
const BOSS_STOMPS_TO_DEFEAT = 4;
const BOSS_PROJECTILE_SPEED = 290;
const PLAYER_BOSS_HEALTH = 5;

const keys = new Set();

const levels = [
  {
    name: "Level 1",
    playerStart: { x: 60, y: 430 },
    platforms: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 170, y: 430, w: 150, h: 24 },
      { x: 380, y: 360, w: 150, h: 24 },
      { x: 600, y: 290, w: 170, h: 24 },
      { x: 790, y: 225, w: 110, h: 24 }
    ],
    hazards: [],
    flag: { x: 870, y: 145, w: 24, h: 80 }
  },
  {
    name: "Level 2",
    playerStart: { x: 50, y: 420 },
    platforms: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 80, y: 420, w: 120, h: 22 },
      { x: 270, y: 345, w: 130, h: 22 },
      { x: 470, y: 280, w: 120, h: 22 },
      { x: 650, y: 340, w: 100, h: 22 },
      { x: 790, y: 255, w: 130, h: 22 }
    ],
    hazards: [
      { x: 210, y: 500, w: 55, h: 40 },
      { x: 410, y: 500, w: 55, h: 40 },
      { x: 610, y: 500, w: 55, h: 40 }
    ],
    flag: { x: 900, y: 175, w: 24, h: 80 }
  },
  {
    name: "Level 3",
    playerStart: { x: 60, y: 440 },
    platforms: [
      { x: 0, y: 500, w: 150, h: 40 },
      { x: 210, y: 450, w: 100, h: 20 },
      { x: 360, y: 390, w: 100, h: 20 },
      { x: 520, y: 330, w: 100, h: 20 },
      { x: 700, y: 270, w: 110, h: 20 },
      { x: 850, y: 210, w: 90, h: 20 },
      { x: 0, y: 500, w: 960, h: 40 }
    ],
    hazards: [
      { x: 155, y: 500, w: 45, h: 40 },
      { x: 315, y: 500, w: 45, h: 40 },
      { x: 470, y: 500, w: 45, h: 40 },
      { x: 630, y: 500, w: 45, h: 40 },
      { x: 815, y: 500, w: 30, h: 40 }
    ],
    flag: { x: 910, y: 130, w: 24, h: 80 }
  },
  {
    name: "Boss Level",
    playerStart: { x: 70, y: 420 },
    platforms: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 120, y: 420, w: 180, h: 20 },
      { x: 370, y: 360, w: 220, h: 20 },
      { x: 690, y: 420, w: 170, h: 20 }
    ],
    hazards: [
      { x: 870, y: 500, w: 90, h: 40 }
    ],
    boss: {
      x: 480,
      y: 320,
      w: 72,
      h: 72,
      leftBound: 250,
      rightBound: 760
    }
  }
];

const game = {
  state: "menu",
  levelIndex: 0,
  player: {
    x: 0,
    y: 0,
    w: 30,
    h: 40,
    vx: 0,
    vy: 0,
    onGround: false
  },
  lastTime: 0,
  boss: null,
  playerHealth: 0,
  playerMaxHealth: 0,
  bossHintUntil: 0,
  audio: {
    enabled: false,
    ctx: null,
    gain: null,
    musicTimer: null,
    musicStep: 0
  }
};

function intersects(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function touchesHazard(player, hazard) {
  const overlapX = player.x < hazard.x + hazard.w && player.x + player.w > hazard.x;
  const feetY = player.y + player.h;
  return overlapX && feetY >= hazard.y && player.y < hazard.y + hazard.h;
}

function loadLevel(index) {
  const level = levels[index];
  game.levelIndex = index;
  game.player.x = level.playerStart.x;
  game.player.y = level.playerStart.y;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.onGround = false;
  game.boss = null;
  game.playerHealth = 0;
  game.playerMaxHealth = 0;

  if (level.boss) {
    game.boss = {
      x: level.boss.x,
      y: level.boss.y,
      w: level.boss.w,
      h: level.boss.h,
      vx: BOSS_SPEED,
      leftBound: level.boss.leftBound,
      rightBound: level.boss.rightBound,
      health: BOSS_STOMPS_TO_DEFEAT,
      maxHealth: BOSS_STOMPS_TO_DEFEAT,
      hitCooldown: 0,
      shotTimer: 1.1,
      projectiles: []
    };
    game.playerHealth = PLAYER_BOSS_HEALTH;
    game.playerMaxHealth = PLAYER_BOSS_HEALTH;
    game.bossHintUntil = performance.now() + 5000;
  } else {
    game.bossHintUntil = 0;
  }

  levelText.textContent = level.name;
}

function beginGame() {
  game.state = "playing";
  menu.classList.add("hidden");
  endOverlay.classList.add("hidden");
  hud.classList.remove("hidden");
  loadLevel(0);
  startAudio();
}

function finishGame() {
  game.state = "won";
  endText.textContent = "You Win!";
  endOverlay.classList.remove("hidden");
}

function resetLevel() {
  loadLevel(game.levelIndex);
}

function nextLevel() {
  playSfx("flag");
  if (game.levelIndex + 1 >= levels.length) {
    finishGame();
    return;
  }
  loadLevel(game.levelIndex + 1);
}

function handleInput() {
  const left = keys.has("arrowleft") || keys.has("a");
  const right = keys.has("arrowright") || keys.has("d");
  game.player.vx = 0;
  if (left) {
    game.player.vx = -MOVE_SPEED;
  }
  if (right) {
    game.player.vx = MOVE_SPEED;
  }
}

function jump() {
  if (game.state !== "playing") {
    return;
  }
  if (game.player.onGround) {
    game.player.vy = -JUMP_SPEED;
    game.player.onGround = false;
    playSfx("jump");
  }
}

function damagePlayer() {
  if (game.boss && game.playerMaxHealth > 0) {
    game.playerHealth = Math.max(0, game.playerHealth - 1);
    playSfx("hit");
    if (game.playerHealth <= 0) {
      resetLevel();
      return true;
    }
    return false;
  }

  playSfx("hit");
  resetLevel();
  return true;
}

function update(dt) {
  if (game.state !== "playing") {
    return;
  }

  const level = levels[game.levelIndex];
  const p = game.player;

  handleInput();

  p.x += p.vx * dt;
  for (const platform of level.platforms) {
    if (!intersects(p, platform)) {
      continue;
    }
    if (p.vx > 0) {
      p.x = platform.x - p.w;
    } else if (p.vx < 0) {
      p.x = platform.x + platform.w;
    }
  }

  p.vy += GRAVITY * dt;
  p.y += p.vy * dt;
  p.onGround = false;

  for (const platform of level.platforms) {
    if (!intersects(p, platform)) {
      continue;
    }
    if (p.vy > 0) {
      p.y = platform.y - p.h;
      p.vy = 0;
      p.onGround = true;
    } else if (p.vy < 0) {
      p.y = platform.y + platform.h;
      p.vy = 0;
    }
  }

  p.x = Math.max(0, Math.min(WIDTH - p.w, p.x));

  for (const hazard of level.hazards) {
    if (touchesHazard(p, hazard)) {
      if (damagePlayer()) {
        return;
      }
      // Briefly pop player upward so repeated contact doesn't chain all health instantly.
      p.vy = -JUMP_SPEED * 0.35;
      return;
    }
  }

  if (p.y > HEIGHT + 100) {
    playSfx("hit");
    resetLevel();
    return;
  }

  if (game.boss) {
    if (updateBoss(dt)) {
      return;
    }
    if (game.state !== "playing") {
      return;
    }
  }

  if (level.flag && intersects(p, level.flag)) {
    nextLevel();
  }
}

function updateBoss(dt) {
  const p = game.player;
  const boss = game.boss;
  if (!boss) {
    return false;
  }

  boss.x += boss.vx * dt;
  if (boss.x <= boss.leftBound) {
    boss.x = boss.leftBound;
    boss.vx = Math.abs(BOSS_SPEED);
  }
  if (boss.x + boss.w >= boss.rightBound) {
    boss.x = boss.rightBound - boss.w;
    boss.vx = -Math.abs(BOSS_SPEED);
  }

  boss.hitCooldown = Math.max(0, boss.hitCooldown - dt);

  const isPhaseTwo = boss.health <= boss.maxHealth / 2;
  if (isPhaseTwo) {
    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      const centerX = boss.x + boss.w / 2;
      const centerY = boss.y + boss.h / 2;
      const toPlayerX = p.x + p.w / 2 - centerX;
      const toPlayerY = p.y + p.h / 2 - centerY;
      const mag = Math.hypot(toPlayerX, toPlayerY) || 1;

      boss.projectiles.push({
        x: centerX - 7,
        y: centerY - 7,
        w: 14,
        h: 14,
        vx: (toPlayerX / mag) * BOSS_PROJECTILE_SPEED,
        vy: (toPlayerY / mag) * BOSS_PROJECTILE_SPEED
      });
      boss.shotTimer = 1.0;
      playSfx("bossShoot");
    }
  }

  for (const proj of boss.projectiles) {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
  }

  boss.projectiles = boss.projectiles.filter((proj) => {
    const inBounds = proj.x + proj.w >= -40 && proj.x <= WIDTH + 40 && proj.y + proj.h >= -40 && proj.y <= HEIGHT + 40;
    return inBounds;
  });

  for (const proj of boss.projectiles) {
    if (intersects(p, proj)) {
      return damagePlayer();
    }
  }

  if (!intersects(p, boss)) {
    return false;
  }

  const playerBottom = p.y + p.h;
  const stomped = p.vy > 40 && playerBottom - boss.y < 20 && boss.hitCooldown <= 0;
  if (stomped) {
    boss.health -= 1;
    boss.hitCooldown = 0.25;
    p.vy = -JUMP_SPEED * 0.72;
    playSfx("bossHit");

    if (boss.health <= 0) {
      game.boss = null;
      playSfx("bossDown");
      finishGame();
    }
    return false;
  }

  return damagePlayer();
}

function drawBackground(levelIndex) {
  const palettes = [
    ["#0f2741", "#1d4f7c"],
    ["#113449", "#2b6f95"],
    ["#0e2f3d", "#217a6b"]
  ];
  const [c1, c2] = palettes[levelIndex % palettes.length];
  const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = i % 2 ? "#ffffff" : "#8ecae6";
    const x = (i * 110 + performance.now() * 0.01) % (WIDTH + 220) - 220;
    const y = 40 + i * 35;
    ctx.fillRect(x, y, 180, 12);
  }
  ctx.globalAlpha = 1;
}

function drawLevel() {
  const level = levels[game.levelIndex];

  drawBackground(game.levelIndex);

  for (const platform of level.platforms) {
    ctx.fillStyle = "#f6f1d3";
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#d1c489";
    ctx.fillRect(platform.x, platform.y + platform.h - 6, platform.w, 6);
  }

  for (const hazard of level.hazards) {
    ctx.fillStyle = "#ff595e";
    ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
  }

  if (level.flag) {
    const f = level.flag;
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(f.x, f.y, 4, f.h);
    ctx.fillStyle = "#2ec4b6";
    ctx.beginPath();
    ctx.moveTo(f.x + 4, f.y + 8);
    ctx.lineTo(f.x + f.w, f.y + 18);
    ctx.lineTo(f.x + 4, f.y + 28);
    ctx.closePath();
    ctx.fill();
  }

  if (game.boss) {
    const b = game.boss;
    ctx.fillStyle = "#7a0018";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "#ff8fab";
    ctx.fillRect(b.x + 12, b.y + 14, 10, 10);
    ctx.fillRect(b.x + 50, b.y + 14, 10, 10);

    const barX = 280;
    const barY = 26;
    const barW = 400;
    const barH = 16;
    const healthRatio = Math.max(0, b.health / b.maxHealth);
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#ff595e";
    ctx.fillRect(barX, barY, barW * healthRatio, barH);
    ctx.strokeStyle = "#ffe6ea";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barW, barH);

    const hpBarX = 26;
    const hpBarY = 26;
    const hpBarW = 180;
    const hpBarH = 16;
    const hpRatio = game.playerMaxHealth ? game.playerHealth / game.playerMaxHealth : 0;
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    ctx.fillStyle = "#7df9a7";
    ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
    ctx.strokeStyle = "#d9ffe9";
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
    ctx.fillStyle = "#ecfff4";
    ctx.font = "bold 14px Trebuchet MS";
    ctx.fillText("HP", hpBarX + hpBarW + 10, hpBarY + 13);

    for (const proj of b.projectiles) {
      ctx.fillStyle = "#ff6b6b";
      ctx.beginPath();
      ctx.arc(proj.x + proj.w / 2, proj.y + proj.h / 2, proj.w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (performance.now() < game.bossHintUntil) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(210, 50, 540, 34);
      ctx.fillStyle = "#fff3cd";
      ctx.font = "bold 20px Trebuchet MS";
      ctx.textAlign = "center";
      ctx.fillText("Jump on the boss to kill it!", WIDTH / 2, 73);
      ctx.textAlign = "start";
    }
  }

  const p = game.player;
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(p.x + 8, p.y + 10, 4, 4);
  ctx.fillRect(p.x + 18, p.y + 10, 4, 4);
}

function draw() {
  if (game.state === "menu") {
    drawBackground(0);
    return;
  }

  if (game.state === "won") {
    drawBackground(2);
    return;
  }

  drawLevel();
}

function gameLoop(ts) {
  const dt = Math.min(0.033, (ts - game.lastTime) / 1000 || 0);
  game.lastTime = ts;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function initAudio() {
  if (game.audio.ctx) {
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  game.audio.ctx = new AudioCtx();
  game.audio.gain = game.audio.ctx.createGain();
  game.audio.gain.gain.value = 0.05;
  game.audio.gain.connect(game.audio.ctx.destination);
  game.audio.enabled = true;
}

function playTone(freq, duration, type = "sine", volume = 0.2) {
  if (!game.audio.enabled || !game.audio.ctx || !game.audio.gain) {
    return;
  }

  const now = game.audio.ctx.currentTime;
  const osc = game.audio.ctx.createOscillator();
  const gain = game.audio.ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(game.audio.gain);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playSfx(name) {
  if (name === "jump") {
    playTone(520, 0.08, "square", 0.25);
  } else if (name === "flag") {
    playTone(660, 0.09, "triangle", 0.22);
    setTimeout(() => playTone(880, 0.1, "triangle", 0.2), 80);
  } else if (name === "hit") {
    playTone(180, 0.15, "sawtooth", 0.2);
  } else if (name === "bossHit") {
    playTone(430, 0.08, "square", 0.18);
    setTimeout(() => playTone(360, 0.08, "square", 0.16), 70);
  } else if (name === "bossDown") {
    playTone(520, 0.1, "triangle", 0.2);
    setTimeout(() => playTone(620, 0.1, "triangle", 0.2), 95);
    setTimeout(() => playTone(780, 0.16, "triangle", 0.22), 190);
  } else if (name === "bossShoot") {
    playTone(310, 0.06, "sawtooth", 0.12);
  }
}

function startAudio() {
  initAudio();
  if (!game.audio.enabled || game.audio.musicTimer) {
    return;
  }

  const melody = [220, 277, 330, 392, 330, 277];
  const bossMelody = [196, 247, 294, 370, 330, 294, 247, 220];
  game.audio.musicTimer = setInterval(() => {
    if (game.state !== "playing") {
      return;
    }
    const inBossLevel = game.levelIndex === 3;
    const track = inBossLevel ? bossMelody : melody;
    const f = track[game.audio.musicStep % track.length];
    game.audio.musicStep += 1;
    if (inBossLevel) {
      playTone(f, 0.18, "sawtooth", 0.12);
      playTone(f / 2, 0.18, "square", 0.05);
    } else {
      playTone(f, 0.16, "triangle", 0.08);
    }
  }, 280);
}

playBtn.addEventListener("click", () => {
  beginGame();
});

restartBtn.addEventListener("click", () => {
  beginGame();
});

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);

  if (["arrowup", " ", "w"].includes(key)) {
    e.preventDefault();
    jump();
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

draw();
requestAnimationFrame(gameLoop);
