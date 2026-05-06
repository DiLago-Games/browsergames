/**
 * Space Blaster – casual browser game
 *
 * Gameplay
 *  - Shoot incoming asteroids before they reach the bottom.
 *  - Missing an asteroid costs one life (3 lives total).
 *  - Every 10 asteroids cleared advances the level (faster + more asteroids).
 *  - Power-ups drop occasionally: rapid-fire (🔴) and shield (🔵).
 */

(() => {
  "use strict";

  /* ── DOM refs ──────────────────────────────────── */
  const loadingScreen  = document.getElementById("loading-screen");
  const progressBar    = document.getElementById("unity-progress-bar-full");
  const btnStart       = document.getElementById("btn-start");
  const canvas         = document.getElementById("unity-canvas");
  const hud            = document.getElementById("hud");
  const hudScore       = document.getElementById("hud-score");
  const hudLives       = document.getElementById("hud-lives");
  const hudLevel       = document.getElementById("hud-level");
  const gameoverScreen = document.getElementById("gameover-screen");
  const finalScore     = document.getElementById("final-score");
  const highScoreEl    = document.getElementById("high-score");
  const btnRestart     = document.getElementById("btn-restart");
  const mobileControls = document.getElementById("mobile-controls");
  const btnLeft        = document.getElementById("btn-left");
  const btnRight       = document.getElementById("btn-right");
  const btnFire        = document.getElementById("btn-fire");
  const btnPause       = document.getElementById("btn-pause");
  const ctx            = canvas.getContext("2d");

  /* ── Constants ─────────────────────────────────── */
  const W = 800, H = 600;
  canvas.width  = W;
  canvas.height = H;

  const LIVES_MAX              = 3;
  const BULLET_SPEED           = 9;
  const SHIP_SPEED             = 5;
  const STAR_COUNT             = 120;

  // Scoring
  const BASE_SCORE_PER_ASTEROID = 10;
  const ASTEROID_SIZE_DIVISOR   = 15;

  // Spawn-rate / speed difficulty scaling
  const MIN_SPAWN_RATE        = 8;
  const BASE_SPAWN_RATE       = 55;
  const LEVEL_SPAWN_MODIFIER  = 4;
  const BASE_ASTEROID_SPEED   = 1.2;
  const LEVEL_SPEED_INCREMENT = 0.35;

  // Power-up durations (frames at 60 fps)
  const RAPID_FIRE_DURATION = 300;   // ~5 s
  const SHIELD_DURATION     = 360;   // ~6 s

  /* ── Palette ────────────────────────────────────── */
  const COLOR = {
    bg:      "#000010",
    ship:    "#4af",
    bullet:  "#ff4",
    asteroid:"#9988aa",
    powerup: { rapid:"#ff4040", shield:"#4080ff" },
    text:    "#cef",
    danger:  "#f44",
  };

  /* ── Game state ─────────────────────────────────── */
  let state, score, lives, level, clearedInLevel,
      ship, bullets, asteroids, powerups, particles,
      stars, keys, paused, highScore, raf,
      rapidFireTimer, shieldTimer, rapidFireActive, shieldActive;

  let touchLeftPressed = false;
  let touchRightPressed = false;
  let touchFirePressed = false;

  const isTouchDevice =
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    window.matchMedia("(max-width: 900px) and (any-pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0 ||
    ("ontouchstart" in window);

  /* ── Simulated loading bar ──────────────────────── */
  simulateLoading();

  function simulateLoading() {
    let pct = 0;
    const iv = setInterval(() => {
      pct += 1.4 + Math.random() * 1.5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        progressBar.style.width = "100%";
        setTimeout(() => { btnStart.style.display = "block"; }, 400);
      }
      progressBar.style.width = pct + "%";
    }, 40);
  }

  /* ── Start ──────────────────────────────────────── */
  btnStart.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);

  function startGame() {
    loadingScreen.style.display  = "none";
    gameoverScreen.style.display = "none";
    hud.style.display            = "flex";
    if (isTouchDevice) {
      mobileControls.style.display = "grid";
      mobileControls.setAttribute("aria-hidden", "false");
    }
    canvas.focus();
    initState();
    if (raf) cancelAnimationFrame(raf);
    loop();
  }

  /* ── Input ──────────────────────────────────────── */
  keys = {};
  document.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (e.code === "KeyP") paused = !paused;
    if (e.code === "Space" || e.code === "KeyZ") e.preventDefault();
  });
  document.addEventListener("keyup",  e => { keys[e.code] = false; });

  function setBtnState(button, active) {
    if (!button) return;
    button.style.opacity = active ? "1" : "0.86";
  }

  function pressHold(button, onPress, onRelease) {
    if (!button) return;
    const start = e => {
      e.preventDefault();
      onPress();
      setBtnState(button, true);
    };
    const end = e => {
      e.preventDefault();
      onRelease();
      setBtnState(button, false);
    };

    button.addEventListener("pointerdown", start);
    button.addEventListener("touchstart", start, { passive: false });
    ["pointerup", "pointercancel", "pointerleave", "touchend", "touchcancel"].forEach(type => {
      if (type.startsWith("touch")) {
        button.addEventListener(type, end, { passive: false });
      } else {
        button.addEventListener(type, end);
      }
    });
  }

  function clientToWorldX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    return Math.max(ship.w / 2, Math.min(W - ship.w / 2, x * W));
  }

  function moveShipToClientX(clientX) {
    if (state !== "playing") return;
    ship.x = clientToWorldX(clientX);
  }

  canvas.addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    e.preventDefault();
    moveShipToClientX(e.clientX);
    touchFirePressed = true;
  });
  canvas.addEventListener("pointermove", e => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    e.preventDefault();
    moveShipToClientX(e.clientX);
  });
  ["pointerup", "pointercancel"].forEach(type => {
    canvas.addEventListener(type, e => {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
      e.preventDefault();
      touchFirePressed = false;
    });
  });

  canvas.addEventListener("touchstart", e => {
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    moveShipToClientX(touch.clientX);
    touchFirePressed = true;
  }, { passive: false });
  canvas.addEventListener("touchmove", e => {
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    moveShipToClientX(touch.clientX);
  }, { passive: false });
  ["touchend", "touchcancel"].forEach(type => {
    canvas.addEventListener(type, e => {
      e.preventDefault();
      touchFirePressed = false;
    }, { passive: false });
  });

  if (btnLeft && btnRight && btnFire && btnPause) {
    pressHold(btnLeft, () => { touchLeftPressed = true; }, () => { touchLeftPressed = false; });
    pressHold(btnRight, () => { touchRightPressed = true; }, () => { touchRightPressed = false; });
    pressHold(btnFire, () => { touchFirePressed = true; }, () => { touchFirePressed = false; });
    btnPause.addEventListener("click", e => {
      e.preventDefault();
      paused = !paused;
      canvas.focus();
    });
  }

  /* ── Init ───────────────────────────────────────── */
  function initState() {
    state         = "playing";
    score         = 0;
    lives         = LIVES_MAX;
    level         = 1;
    clearedInLevel= 0;
    paused        = false;
    rapidFireActive = false;
    shieldActive    = false;
    rapidFireTimer  = 0;
    shieldTimer     = 0;
    touchLeftPressed = false;
    touchRightPressed = false;
    touchFirePressed = false;

    ship = {
      x: W / 2, y: H - 70,
      w: 36, h: 40,
      shootCooldown: 0,
    };

    bullets    = [];
    asteroids  = [];
    powerups   = [];
    particles  = [];
    highScore  = parseInt(localStorage.getItem("spaceBlasterHS") || "0", 10);

    // Background stars (parallax layers)
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.6 + 0.15,
      brightness: Math.random(),
    }));

    updateHUD();
  }

  /* ── Main loop ──────────────────────────────────── */
  function loop() {
    raf = requestAnimationFrame(loop);
    if (state !== "playing") return;
    if (paused) { drawPaused(); return; }
    update();
    draw();
  }

  /* ── Update ─────────────────────────────────────── */
  function update() {
    // Ship movement
    const movingLeft = keys["ArrowLeft"] || keys["KeyA"] || touchLeftPressed;
    const movingRight = keys["ArrowRight"] || keys["KeyD"] || touchRightPressed;
    if (movingLeft) ship.x = Math.max(ship.w / 2, ship.x - SHIP_SPEED);
    if (movingRight) ship.x = Math.min(W - ship.w / 2, ship.x + SHIP_SPEED);

    // Shooting
    ship.shootCooldown--;
    const cooldown = rapidFireActive ? 8 : 18;
    const isShooting = keys["Space"] || keys["KeyZ"] || touchFirePressed;
    if (isShooting && ship.shootCooldown <= 0) {
      bullets.push({ x: ship.x, y: ship.y - ship.h / 2 });
      ship.shootCooldown = cooldown;
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= BULLET_SPEED;
      if (bullets[i].y < -10) bullets.splice(i, 1);
    }

    // Spawn asteroids
    const spawnRate = Math.max(MIN_SPAWN_RATE, BASE_SPAWN_RATE - level * LEVEL_SPAWN_MODIFIER);
    if (Math.random() < 1 / spawnRate) spawnAsteroid();

    // Asteroids
    const asteroidSpeed = BASE_ASTEROID_SPEED + level * LEVEL_SPEED_INCREMENT;
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.y += a.speed * asteroidSpeed;
      a.rot += a.rotSpeed;

      // Off bottom → lose a life
      if (a.y - a.r > H) {
        asteroids.splice(i, 1);
        if (!shieldActive) {
          lives--;
          spawnExplosion(a.x, H - 20, "#f66", 12);
          updateHUD();
          if (lives <= 0) endGame();
        }
        continue;
      }

      // Bullet collision
      let hit = false;
      for (let b = bullets.length - 1; b >= 0; b--) {
        if (dist(bullets[b], a) < a.r + 5) {
          score += Math.ceil(BASE_SCORE_PER_ASTEROID * a.r / ASTEROID_SIZE_DIVISOR);
          spawnExplosion(a.x, a.y, COLOR.asteroid, 10);
          bullets.splice(b, 1);
          asteroids.splice(i, 1);
          clearedInLevel++;
          if (clearedInLevel % 10 === 0) {
            level++;
            spawnPowerup();
          }
          updateHUD();
          hit = true;
          break;
        }
      }
      if (hit) continue;

      // Ship collision
      if (!shieldActive && dist({ x: ship.x, y: ship.y }, a) < a.r + 18) {
        lives--;
        spawnExplosion(a.x, a.y, "#ff8", 16);
        asteroids.splice(i, 1);
        updateHUD();
        if (lives <= 0) endGame();
      }
    }

    // Power-ups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += 2;
      p.rot += 0.04;
      if (p.y > H + 20) { powerups.splice(i, 1); continue; }
      if (dist({ x: ship.x, y: ship.y }, p) < p.r + 22) {
        if (p.type === "rapid") { rapidFireActive = true; rapidFireTimer = RAPID_FIRE_DURATION; }
        if (p.type === "shield"){ shieldActive    = true; shieldTimer     = SHIELD_DURATION; }
        spawnExplosion(p.x, p.y, COLOR.powerup[p.type], 14);
        powerups.splice(i, 1);
      }
    }

    // Power-up timers
    if (rapidFireActive && --rapidFireTimer <= 0) rapidFireActive = false;
    if (shieldActive    && --shieldTimer    <= 0) shieldActive    = false;

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Scroll stars
    stars.forEach(s => {
      s.y += s.speed;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    });
  }

  /* ── Draw ───────────────────────────────────────── */
  function draw() {
    // Background
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    stars.forEach(s => {
      ctx.globalAlpha = 0.3 + s.brightness * 0.7;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Bullets
    bullets.forEach(b => {
      ctx.save();
      ctx.shadowColor = "#ff0";
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = COLOR.bullet;
      ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
      ctx.restore();
    });

    // Asteroids
    asteroids.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);
      ctx.shadowColor = "#aaa";
      ctx.shadowBlur  = 4;
      ctx.strokeStyle = "#cbbdcc";
      ctx.lineWidth   = 2;
      ctx.fillStyle   = COLOR.asteroid;
      ctx.beginPath();
      for (let i = 0; i < a.verts.length; i++) {
        const v = a.verts[i];
        i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // Power-ups
    powerups.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.shadowColor = COLOR.powerup[p.type];
      ctx.shadowBlur  = 16;
      ctx.strokeStyle = COLOR.powerup[p.type];
      ctx.lineWidth   = 2;
      ctx.fillStyle   = COLOR.powerup[p.type] + "44";
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${p.r}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.type === "rapid" ? "⚡" : "🛡", 0, 0);
      ctx.restore();
    });

    // Ship
    drawShip();

    // Shield bubble
    if (shieldActive) {
      const pct = shieldTimer / SHIELD_DURATION;
      ctx.save();
      ctx.strokeStyle = `rgba(64,128,255,${0.4 + pct * 0.6})`;
      ctx.lineWidth   = 2;
      ctx.shadowColor = "#48f";
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(ship.x, ship.y, 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Rapid-fire indicator
    if (rapidFireActive) {
      ctx.save();
      ctx.fillStyle = "#ffa500cc";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚡ RAPID FIRE", ship.x, ship.y + 36);
      ctx.restore();
    }

    // Pause overlay
    if (paused) drawPaused();
  }

  function drawShip() {
    const x = ship.x, y = ship.y;
    ctx.save();
    ctx.shadowColor = COLOR.ship;
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = COLOR.ship;
    ctx.strokeStyle = "#8ef";
    ctx.lineWidth   = 1.5;

    // Main body
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x + 16, y + 18);
    ctx.lineTo(x, y + 10);
    ctx.lineTo(x - 16, y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Engine glow
    const flicker = 0.7 + Math.random() * 0.3;
    ctx.shadowColor = "#f80";
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = `rgba(255,140,0,${flicker})`;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 12);
    ctx.lineTo(x, y + 20 + flicker * 10);
    ctx.lineTo(x + 8, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawPaused() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,20,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#cef";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor  = "#48f";
    ctx.shadowBlur   = 20;
    ctx.fillText("⏸ PAUSED", W / 2, H / 2);
    ctx.restore();
  }

  /* ── Helpers ────────────────────────────────────── */
  function spawnAsteroid() {
    const r = 12 + Math.random() * 22;
    const numVerts = 7 + Math.floor(Math.random() * 5);
    const verts = Array.from({ length: numVerts }, (_, i) => {
      const angle  = (i / numVerts) * Math.PI * 2;
      const jitter = r * (0.7 + Math.random() * 0.6);
      return { x: Math.cos(angle) * jitter, y: Math.sin(angle) * jitter };
    });
    asteroids.push({
      x: r + Math.random() * (W - r * 2),
      y: -r,
      r,
      speed: 0.8 + Math.random() * 1.2,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      verts,
    });
  }

  function spawnPowerup() {
    const type = Math.random() < 0.5 ? "rapid" : "shield";
    powerups.push({
      x: 60 + Math.random() * (W - 120),
      y: -20,
      r: 14,
      type,
      rot: 0,
    });
  }

  function spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const life  = 20 + Math.floor(Math.random() * 20);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1.5 + Math.random() * 2.5,
        color,
        life,
        maxLife: life,
      });
    }
  }

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function endGame() {
    state = "gameover";
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("spaceBlasterHS", highScore);
    }
    finalScore.textContent    = score;
    highScoreEl.textContent   = highScore;
    gameoverScreen.style.display = "flex";
    hud.style.display            = "none";
  }

  function updateHUD() {
    hudScore.textContent = `Score: ${score}`;
    hudLives.textContent = "❤".repeat(lives) + "🖤".repeat(Math.max(0, LIVES_MAX - lives));
    hudLevel.textContent = `Level ${level}`;
  }

})();
