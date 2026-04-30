/**
 * Pong 3001 – Futuristic Pong
 *
 * Gameplay
 *  - Player (left, cyan) vs AI (right, magenta).
 *  - W / S or ↑ / ↓ to move your paddle.
 *  - First to 7 points wins.
 *  - Every 3 combined points the level increases (ball speeds up).
 *  - Power-ups drift into the arena:
 *      ⚡ Speed Boost  – player paddle moves faster for 8 s
 *      ⬛ Big Paddle   – player paddle enlarges for 8 s
 *      🔴 Shrink AI    – AI paddle shrinks for 8 s
 *      ✦  Multi-ball   – spawns a second ball (max 3)
 */

(() => {
  "use strict";

  /* ── DOM refs ──────────────────────────────────────── */
  const titleScreen    = document.getElementById("title-screen");
  const progressBar    = document.getElementById("unity-progress-bar-full");
  const btnStart       = document.getElementById("btn-start");
  const controlsHint   = document.getElementById("controls-hint");
  const canvas         = document.getElementById("game-canvas");
  const ctx            = canvas.getContext("2d");
  const hud            = document.getElementById("hud");
  const hudPlayer      = document.getElementById("hud-player");
  const hudLevel       = document.getElementById("hud-level");
  const hudAI          = document.getElementById("hud-ai");
  const pauseScreen    = document.getElementById("pause-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const resultTitle    = document.getElementById("result-title");
  const finalPlayer    = document.getElementById("final-player");
  const finalAI        = document.getElementById("final-ai");
  const btnRestart     = document.getElementById("btn-restart");

  /* ── Constants ─────────────────────────────────────── */
  const W            = 800;
  const H            = 520;
  const PAD_W        = 12;
  const PAD_H        = 80;
  const BALL_R       = 7;
  const WIN_SCORE    = 7;
  const TRAIL_LEN    = 20;
  const PU_DURATION  = 8000;   // power-up active duration in ms
  const PU_LIFETIME  = 10000;  // power-up stays on-screen in ms
  const PLAYER_COLOR = "#00ffff";
  const AI_COLOR     = "#ff00ff";
  const GRID_SIZE    = 40;
  const PADDLE_GRADIENT_ALPHA = "99"; // hex opacity suffix for paddle gradient end-stop

  /* ── State ─────────────────────────────────────────── */
  let state, paused, raf;
  let playerScore, aiScore, level;
  let player, ai;
  let balls, particles, powerups;
  let keys;
  let globalHue;
  let gridOffset;
  let lastPowerupSpawn;
  let scoreCooldown;     // prevent double-score flicker

  /* ── Audio (Web Audio API) ──────────────────────────── */
  let audioCtx = null;

  function getAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    try {
      const ac = getAudio();
      if (!ac) return;
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur);
    } catch (_) {}
  }

  const sfx = {
    paddleHit : () => playTone(440, 0.08, "square",   0.12),
    wallHit   : () => playTone(220, 0.06, "sine",     0.08),
    score     : () => {
      playTone(880, 0.25, "triangle", 0.18);
      setTimeout(() => playTone(1100, 0.2, "triangle", 0.18), 150);
    },
    powerup   : () => {
      playTone(660, 0.1,  "sawtooth", 0.12);
      setTimeout(() => playTone(880, 0.1, "sawtooth", 0.12), 110);
    },
    levelUp   : () => {
      playTone(550, 0.15, "triangle", 0.14);
      setTimeout(() => playTone(660, 0.15, "triangle", 0.14), 130);
      setTimeout(() => playTone(880, 0.2,  "triangle", 0.14), 260);
    },
    gameOver  : () => {
      playTone(440, 0.2, "sawtooth", 0.18);
      setTimeout(() => playTone(330, 0.3, "sawtooth", 0.18), 200);
      setTimeout(() => playTone(220, 0.4, "sawtooth", 0.18), 450);
    },
    win: () => {
      playTone(660, 0.15, "triangle", 0.2);
      setTimeout(() => playTone(880, 0.15, "triangle", 0.2),  140);
      setTimeout(() => playTone(1100, 0.2, "triangle", 0.2),  280);
      setTimeout(() => playTone(1320, 0.3, "triangle", 0.2),  460);
    },
  };

  /* ── Canvas sizing ──────────────────────────────────── */
  function resize() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width  = Math.floor(W * scale) + "px";
    canvas.style.height = Math.floor(H * scale) + "px";
    canvas.width  = W;
    canvas.height = H;
  }

  /* ── Helpers ────────────────────────────────────────── */
  function ballSpeed() { return 4.5 + (level - 1) * 0.45; }

  function makeBall(x, y, dir) {
    const angle = (Math.random() * 50 - 25) * (Math.PI / 180);
    const d     = dir !== undefined ? dir : (Math.random() < 0.5 ? 1 : -1);
    const spd   = ballSpeed();
    return {
      x: x ?? W / 2,
      y: y ?? H / 2,
      vx: Math.cos(angle) * spd * d,
      vy: Math.sin(angle) * spd,
      trail: [],
      hue: Math.random() * 360,
    };
  }

  /* ── Init ───────────────────────────────────────────── */
  function initState() {
    state            = "playing";
    paused           = false;
    playerScore      = 0;
    aiScore          = 0;
    level            = 1;
    globalHue        = 0;
    gridOffset       = 0;
    lastPowerupSpawn = Date.now();
    scoreCooldown    = 0;
    keys             = {};

    player = {
      x: 20,
      y: H / 2 - PAD_H / 2,
      w: PAD_W,
      h: PAD_H,
      dy: 0,
      speedBoosted: false, speedTimer: 0,
      bigPaddle:    false, bigTimer:   0,
    };

    ai = {
      x: W - 20 - PAD_W,
      y: H / 2 - PAD_H / 2,
      w: PAD_W,
      h: PAD_H,
      dy: 0,
      shrunk: false, shrinkTimer: 0,
    };

    balls     = [makeBall()];
    particles = [];
    powerups  = [];
  }

  /* ── Update ─────────────────────────────────────────── */
  function update() {
    if (paused || state !== "playing") return;

    globalHue  = (globalHue + 1) % 360;
    gridOffset = (gridOffset + 0.5) % GRID_SIZE;

    updatePlayer();
    updateAI();
    balls.forEach(b => updateBall(b));
    removeScoredBalls();
    updateParticles();
    updatePowerupTimers();
    maybeSpawnPowerup();
  }

  /* player paddle */
  function updatePlayer() {
    const spd = player.speedBoosted ? 9 : 6;
    const up  = keys["ArrowUp"]   || keys["w"] || keys["W"];
    const dn  = keys["ArrowDown"] || keys["s"] || keys["S"];

    if (up)       player.dy = -spd;
    else if (dn)  player.dy =  spd;
    else          player.dy *= 0.75;

    player.y = Math.max(0, Math.min(H - player.h, player.y + player.dy));
  }

  /* AI paddle – tracks the nearest ball heading toward it */
  function updateAI() {
    let target = null;
    let minDist = Infinity;
    balls.forEach(b => {
      if (b.vx > 0) {
        const d = Math.abs(b.x - ai.x);
        if (d < minDist) { minDist = d; target = b; }
      }
    });

    if (target) {
      const center = ai.y + ai.h / 2;
      const diff   = target.y - center;
      const noise  = (Math.random() - 0.5) * 14;
      const aiSpd  = 3.6 + (level - 1) * 0.18;
      if (Math.abs(diff + noise) > 4) {
        ai.dy = Math.sign(diff + noise) * Math.min(aiSpd, Math.abs(diff + noise));
      } else {
        ai.dy *= 0.7;
      }
    } else {
      // drift back to center when no ball is approaching
      const center = ai.y + ai.h / 2;
      const diff   = H / 2 - center;
      ai.dy = Math.sign(diff) * Math.min(2, Math.abs(diff));
    }

    ai.y = Math.max(0, Math.min(H - ai.h, ai.y + ai.dy));
  }

  function updateBall(ball) {
    // save trail position
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > TRAIL_LEN) ball.trail.shift();

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.hue = (ball.hue + 2) % 360;

    // top / bottom walls
    if (ball.y - BALL_R <= 0) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
      spawnParticles(ball.x, 0, 8, "#88ffff");
      sfx.wallHit();
    }
    if (ball.y + BALL_R >= H) {
      ball.y = H - BALL_R;
      ball.vy = -Math.abs(ball.vy);
      spawnParticles(ball.x, H, 8, "#88ffff");
      sfx.wallHit();
    }

    // player paddle collision
    if (overlaps(ball, player) && ball.vx < 0) {
      ball.x = player.x + player.w + BALL_R + 1;
      deflect(ball, player, true);
      spawnParticles(ball.x, ball.y, 16, PLAYER_COLOR);
      sfx.paddleHit();
      collectPowerup(ball);
    }

    // AI paddle collision
    if (overlaps(ball, ai) && ball.vx > 0) {
      ball.x = ai.x - BALL_R - 1;
      deflect(ball, ai, false);
      spawnParticles(ball.x, ball.y, 16, AI_COLOR);
      sfx.paddleHit();
    }
  }

  function overlaps(ball, pad) {
    return (
      ball.x + BALL_R > pad.x &&
      ball.x - BALL_R < pad.x + pad.w &&
      ball.y + BALL_R > pad.y &&
      ball.y - BALL_R < pad.y + pad.h
    );
  }

  function deflect(ball, pad, toRight) {
    const center   = pad.y + pad.h / 2;
    const rel      = Math.max(-1, Math.min(1, (ball.y - center) / (pad.h / 2)));
    const maxAngle = 65 * (Math.PI / 180);
    const angle    = rel * maxAngle;
    const curSpd   = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const newSpd   = Math.min(curSpd + 0.25, 16);
    ball.vx = Math.cos(angle) * newSpd * (toRight ? 1 : -1);
    ball.vy = Math.sin(angle) * newSpd;
  }

  /* mark balls that went out; handled after iteration to avoid splice-during-loop */
  function removeScoredBalls() {
    if (scoreCooldown > 0) { scoreCooldown--; return; }

    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      if (b.x + BALL_R < 0) {
        // AI scores
        if (balls.length === 1) {
          aiScore++;
          sfx.score();
          checkWin();
          if (state === "playing") resetBall(b);
          scoreCooldown = 60;
        } else {
          balls.splice(i, 1);
        }
      } else if (b.x - BALL_R > W) {
        // Player scores
        if (balls.length === 1) {
          playerScore++;
          sfx.score();
          checkWin();
          if (state === "playing") resetBall(b);
          scoreCooldown = 60;
        } else {
          balls.splice(i, 1);
        }
      }
    }
  }

  function resetBall(ball) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.trail = [];
    const angle = (Math.random() * 50 - 25) * (Math.PI / 180);
    const dir   = Math.random() < 0.5 ? 1 : -1;
    const spd   = ballSpeed();
    ball.vx = Math.cos(angle) * spd * dir;
    ball.vy = Math.sin(angle) * spd;
  }

  function checkWin() {
    updateHUD();
    if (playerScore >= WIN_SCORE || aiScore >= WIN_SCORE) {
      state = "gameover";
      const won = playerScore > aiScore;
      won ? sfx.win() : sfx.gameOver();
      setTimeout(showGameOver, 700);
      return;
    }
    // Level up every 3 combined points
    const combined = playerScore + aiScore;
    if (combined > 0 && combined % 3 === 0) {
      level++;
      sfx.levelUp();
      // speed up all existing balls
      balls.forEach(b => {
        const spd = ballSpeed();
        const cur = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (cur > 0) {
          const ratio = spd / cur;
          b.vx *= ratio;
          b.vy *= ratio;
        }
      });
    }
  }

  /* ── Particles ──────────────────────────────────────── */
  function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 1.5 + Math.random() * 3.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        decay: 0.028 + Math.random() * 0.025,
        r: 2 + Math.random() * 3,
        color,
      });
    }
  }

  function updateParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= p.decay;
    });
  }

  /* ── Power-ups ──────────────────────────────────────── */
  const PU_TYPES = [
    { type: "speedBoost", emoji: "⚡", color: "#ffff00", label: "SPEED BOOST" },
    { type: "bigPaddle",  emoji: "⬛", color: "#00ff88", label: "BIG PADDLE"  },
    { type: "shrinkAI",   emoji: "🔴", color: "#ff4444", label: "SHRINK AI"   },
    { type: "multiball",  emoji: "✦",  color: "#ff88ff", label: "MULTI BALL"  },
  ];

  function spawnPowerup() {
    const def = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
    powerups.push({
      x   : W * 0.25 + Math.random() * W * 0.5,
      y   : 60 + Math.random() * (H - 120),
      r   : 15,
      born: Date.now(),
      ...def,
    });
  }

  function maybeSpawnPowerup() {
    const now = Date.now();
    if (now - lastPowerupSpawn > 7000 && powerups.length < 2) {
      spawnPowerup();
      lastPowerupSpawn = now;
    }
  }

  function updatePowerupTimers() {
    const now = Date.now();
    // expire old power-ups from screen
    powerups = powerups.filter(p => now - p.born < PU_LIFETIME);

    // deactivate expired buffs
    if (player.speedBoosted && now > player.speedTimer) {
      player.speedBoosted = false;
    }
    if (player.bigPaddle && now > player.bigTimer) {
      player.bigPaddle = false;
      player.h = PAD_H;
      // keep player paddle inside bounds
      player.y = Math.min(player.y, H - player.h);
    }
    if (ai.shrunk && now > ai.shrinkTimer) {
      ai.shrunk = false;
      ai.h = PAD_H;
    }
  }

  function collectPowerup(ball) {
    const now = Date.now();
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p  = powerups[i];
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < BALL_R + p.r) {
        applyPowerup(p, now);
        spawnParticles(p.x, p.y, 22, p.color);
        powerups.splice(i, 1);
        sfx.powerup();
      }
    }
  }

  function applyPowerup(p, now) {
    switch (p.type) {
      case "speedBoost":
        player.speedBoosted = true;
        player.speedTimer   = now + PU_DURATION;
        break;
      case "bigPaddle":
        player.bigPaddle = true;
        player.h         = Math.round(PAD_H * 1.8);
        player.bigTimer  = now + PU_DURATION;
        break;
      case "shrinkAI":
        ai.shrunk      = true;
        ai.h           = Math.round(PAD_H * 0.5);
        ai.shrinkTimer = now + PU_DURATION;
        break;
      case "multiball":
        if (balls.length < 3) {
          balls.push(makeBall(W / 2 + 30, H / 2, 1));
        }
        break;
    }
  }

  /* ── Draw ───────────────────────────────────────────── */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawCenterDivider();
    drawPowerups();
    drawParticles();
    drawPaddle(player, PLAYER_COLOR);
    drawPaddle(ai, AI_COLOR);
    balls.forEach(drawBall);
    if (paused) drawPausedOverlay();
  }

  function drawBackground() {
    // Radial dark-space gradient
    const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.72);
    grad.addColorStop(0, "#0a0028");
    grad.addColorStop(1, "#000010");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Scrolling grid
    ctx.save();
    ctx.strokeStyle = "rgba(0,200,255,0.06)";
    ctx.lineWidth   = 0.5;
    const off = gridOffset % GRID_SIZE;
    for (let x = -GRID_SIZE + off; x < W + GRID_SIZE; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = -GRID_SIZE + off; y < H + GRID_SIZE; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // Subtle scanlines
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }

  function drawCenterDivider() {
    ctx.save();
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = `hsla(${globalHue},80%,60%,0.25)`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawPaddle(pad, color) {
    ctx.save();
    ctx.shadowBlur  = 28;
    ctx.shadowColor = color;
    const grad = ctx.createLinearGradient(pad.x, pad.y, pad.x + pad.w, pad.y + pad.h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + PADDLE_GRADIENT_ALPHA);
    ctx.fillStyle = grad;
    ctx.beginPath();
    roundRect(ctx, pad.x, pad.y, pad.w, pad.h, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawBall(ball) {
    // Trail
    ball.trail.forEach((t, i) => {
      const progress = i / ball.trail.length;
      const alpha    = progress * 0.5;
      const radius   = BALL_R * (0.3 + progress * 0.7);
      ctx.beginPath();
      ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${(ball.hue + i * 5) % 360},100%,65%,${alpha})`;
      ctx.fill();
    });

    // Ball core with glow
    ctx.save();
    ctx.shadowBlur  = 22;
    ctx.shadowColor = `hsl(${ball.hue},100%,65%)`;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${ball.hue},100%,78%)`;
    ctx.fill();
    ctx.restore();
  }

  function drawPowerups() {
    const now = Date.now();
    powerups.forEach(p => {
      const age   = now - p.born;
      const fade  = age > PU_LIFETIME * 0.8
        ? 1 - (age - PU_LIFETIME * 0.8) / (PU_LIFETIME * 0.2)
        : 1;
      const pulse = 0.86 + Math.sin(now * 0.005) * 0.14;

      ctx.save();
      ctx.globalAlpha = Math.max(0, fade);
      ctx.shadowBlur  = 18 * pulse;
      ctx.shadowColor = p.color;

      // Glowing ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.lineWidth   = 2.5;
      ctx.stroke();

      // Emoji icon
      ctx.font         = `${Math.round(p.r * 1.5)}px serif`;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle    = "#ffffff";
      ctx.fillText(p.emoji, p.x, p.y);

      ctx.restore();
    });
  }

  function drawParticles() {
    ctx.save();
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.restore();
  }

  function drawPausedOverlay() {
    // The #pause-screen overlay handles display; nothing extra needed on canvas
  }

  /* ── roundRect polyfill ─────────────────────────────── */
  function roundRect(c, x, y, w, h, r) {
    if (typeof c.roundRect === "function") {
      c.roundRect(x, y, w, h, r);
    } else {
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }
  }

  /* ── HUD ────────────────────────────────────────────── */
  function updateHUD() {
    hudPlayer.textContent = `YOU: ${playerScore}`;
    hudAI.textContent     = `AI: ${aiScore}`;
    hudLevel.textContent  = `LEVEL ${level}`;
  }

  /* ── Screens ────────────────────────────────────────── */
  function showGameOver() {
    const won = playerScore > aiScore;
    resultTitle.textContent = won ? "🏆 YOU WIN!" : "💀 GAME OVER";
    resultTitle.style.color = won ? "#00ffff" : "#ff4444";
    finalPlayer.textContent = playerScore;
    finalAI.textContent     = aiScore;
    gameoverScreen.style.display = "flex";
    hud.style.display = "none";
  }

  /* ── Game loop ──────────────────────────────────────── */
  function loop() {
    update();
    draw();
    raf = requestAnimationFrame(loop);
  }

  /* ── Start / Restart ────────────────────────────────── */
  function startGame() {
    titleScreen.style.display    = "none";
    gameoverScreen.style.display = "none";
    pauseScreen.style.display    = "none";
    canvas.style.display         = "block";
    hud.style.display            = "flex";
    resize();
    canvas.focus();
    initState();
    updateHUD();
    if (raf) cancelAnimationFrame(raf);
    loop();
  }

  /* ── Input ──────────────────────────────────────────── */
  window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key === " " && state === "playing") {
      e.preventDefault();
      paused = !paused;
      pauseScreen.style.display = paused ? "flex" : "none";
    }
  });

  window.addEventListener("keyup", e => {
    keys[e.key] = false;
  });

  // Touch / mouse: drag player paddle vertically
  let touchActive = false;
  function handlePointerMove(clientY) {
    if (!touchActive) return;
    const rect  = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    const gameY  = (clientY - rect.top) * scaleY;
    player.y = Math.max(0, Math.min(H - player.h, gameY - player.h / 2));
  }

  canvas.addEventListener("mousedown",  e => { touchActive = true;  handlePointerMove(e.clientY); });
  canvas.addEventListener("mousemove",  e => handlePointerMove(e.clientY));
  window.addEventListener("mouseup",    () => { touchActive = false; });

  canvas.addEventListener("touchstart", e => { touchActive = true;  handlePointerMove(e.touches[0].clientY); e.preventDefault(); }, { passive: false });
  canvas.addEventListener("touchmove",  e => { handlePointerMove(e.touches[0].clientY); e.preventDefault(); }, { passive: false });
  window.addEventListener("touchend",   () => { touchActive = false; });

  window.addEventListener("resize", resize);

  btnStart.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);

  /* ── Loading animation ──────────────────────────────── */
  function simulateLoading() {
    let pct = 0;
    const iv = setInterval(() => {
      pct += 1.4 + Math.random() * 1.6;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        progressBar.style.width = "100%";
        setTimeout(() => {
          controlsHint.style.display = "block";
          btnStart.style.display     = "block";
        }, 400);
      }
      progressBar.style.width = pct + "%";
    }, 40);
  }

  simulateLoading();
  resize();

})();
