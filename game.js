const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startImage = new Image();
startImage.src = "Gemini_Generated_Image_wygi05wygi05wygi.png";

const arenaSize = 40;
const arenaHalf = arenaSize / 2;
const cellSize = 16;
const view = { left: 80, top: 40, size: arenaSize * cellSize };
const speed = 6; // cells per second
const bikeRadius = 0.35;
const touchThreshold = 0.12;
const turnTolerance = 0.15;

const state = {
  phase: "start",
  countdown: 3,
  lastTime: 0,
  elapsed: 0,
  winner: null,
  score: { player: 0, opponent: 0 },
};

const player = createBike("Rot", 10, 3, -1, 0, { left: "ArrowLeft", right: "ArrowRight" });
const opponent = createBike("Blau", -10, -3, 1, 0, { left: "KeyA", right: "KeyD" });
opponent.isAI = false;

const bikes = [player, opponent];

function createBike(name, x, z, dx, dz, controls) {
  return {
    name,
    x,
    z,
    dir: { x: dx, z: dz },
    nextTurn: null,
    color: name === "Rot" ? "#ff4a4a" : "#3bd2ff",
    trail: [{ x1: x, z1: z, x2: x, z2: z }],
    alive: true,
    controls,
    lastTurnTime: 0,
  };
}

function resetRound() {
  state.phase = "countdown";
  state.countdown = 3;
  state.elapsed = 0;
  state.winner = null;
  player.x = 10;
  player.z = 3;
  player.dir = { x: -1, z: 0 };
  player.nextTurn = null;
  player.trail = [{ x1: 10, z1: 3, x2: 10, z2: 3 }];
  player.alive = true;
  opponent.x = -10;
  opponent.z = -3;
  opponent.dir = { x: 1, z: 0 };
  opponent.nextTurn = null;
  opponent.trail = [{ x1: -10, z1: -3, x2: -10, z2: -3 }];
  opponent.alive = true;
}

function gridToScreen(x, z) {
  return {
    x: view.left + (x + arenaHalf) * cellSize,
    y: view.top + (arenaHalf - z) * cellSize,
  };
}

function isNearCenter(bike) {
  if (Math.abs(bike.dir.x) > 0) {
    return Math.abs(bike.z - Math.round(bike.z)) < turnTolerance;
  }
  return Math.abs(bike.x - Math.round(bike.x)) < turnTolerance;
}

function applyTurn(bike) {
  if (!bike.nextTurn || !isNearCenter(bike)) return;
  const turn = bike.nextTurn;
  const oldX = bike.x;
  const oldZ = bike.z;
  if (bike.dir.x !== 0) {
    bike.z = Math.round(bike.z);
  } else {
    bike.x = Math.round(bike.x);
  }
  const newDir = turn === "left" ? { x: -bike.dir.z, z: bike.dir.x } : { x: bike.dir.z, z: -bike.dir.x };
  bike.dir = newDir;
  bike.trail[bike.trail.length - 1].x2 = bike.x;
  bike.trail[bike.trail.length - 1].z2 = bike.z;
  bike.trail.push({ x1: bike.x, z1: bike.z, x2: bike.x, z2: bike.z });
  bike.nextTurn = null;
  bike.lastTurnTime = performance.now();
}

function moveBike(bike, dt) {
  if (!bike.alive) return;
  const distance = speed * dt;
  bike.x += bike.dir.x * distance;
  bike.z += bike.dir.z * distance;
  const segment = bike.trail[bike.trail.length - 1];
  segment.x2 = bike.x;
  segment.z2 = bike.z;
}

function circleSegmentCollision(px, pz, segment) {
  const x1 = segment.x1;
  const z1 = segment.z1;
  const x2 = segment.x2;
  const z2 = segment.z2;
  let dist;
  if (Math.abs(x1 - x2) < 0.001) {
    const minZ = Math.min(z1, z2);
    const maxZ = Math.max(z1, z2);
    const clampedZ = Math.max(minZ, Math.min(maxZ, pz));
    dist = Math.hypot(px - x1, pz - clampedZ);
  } else {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const clampedX = Math.max(minX, Math.min(maxX, px));
    dist = Math.hypot(px - clampedX, pz - z1);
  }
  return dist < bikeRadius + 0.05;
}

function checkCollision(bike) {
  if (!bike.alive) return false;
  if (bike.x < -arenaHalf || bike.x > arenaHalf || bike.z < -arenaHalf || bike.z > arenaHalf) {
    return true;
  }
  const ignoreOwn = bike.trail.length - 1;
  for (const other of bikes) {
    for (let i = 0; i < other.trail.length; i++) {
      if (other === bike && i >= ignoreOwn) continue;
      if (circleSegmentCollision(bike.x, bike.z, other.trail[i])) {
        return true;
      }
    }
  }
  const opponentBike = bikes.find((b) => b !== bike);
  if (opponentBike && opponentBike.alive) {
    const dx = bike.x - opponentBike.x;
    const dz = bike.z - opponentBike.z;
    if (Math.hypot(dx, dz) < bikeRadius * 2) {
      return true;
    }
  }
  return false;
}

function decideAI(bike) {
  if (!bike.isAI || !bike.alive) return;
  if (!isNearCenter(bike)) return;
  const distanceToWall = bike.dir.x > 0 ? arenaHalf - bike.x : bike.dir.x < 0 ? bike.x + arenaHalf : bike.dir.z > 0 ? arenaHalf - bike.z : bike.z + arenaHalf;
  if (distanceToWall < 4 || Math.random() < 0.02) {
    const leftDir = { x: -bike.dir.z, z: bike.dir.x };
    const rightDir = { x: bike.dir.z, z: -bike.dir.x };
    const leftSafe = Math.abs(leftDir.x) > 0 ? Math.abs((leftDir.x > 0 ? arenaHalf - bike.x : bike.x + arenaHalf)) > 2 : Math.abs((leftDir.z > 0 ? arenaHalf - bike.z : bike.z + arenaHalf)) > 2;
    const rightSafe = Math.abs(rightDir.x) > 0 ? Math.abs((rightDir.x > 0 ? arenaHalf - bike.x : bike.x + arenaHalf)) > 2 : Math.abs((rightDir.z > 0 ? arenaHalf - bike.z : bike.z + arenaHalf)) > 2;
    if (leftSafe && rightSafe) {
      bike.nextTurn = Math.random() > 0.5 ? "left" : "right";
    } else if (leftSafe) {
      bike.nextTurn = "left";
    } else if (rightSafe) {
      bike.nextTurn = "right";
    }
  }
}

function update(dt) {
  if (state.phase === "countdown") {
    state.elapsed += dt;
    if (state.elapsed >= 1) {
      state.countdown -= 1;
      state.elapsed = 0;
      if (state.countdown <= 0) {
        state.phase = "playing";
      }
    }
    return;
  }

  if (state.phase !== "playing") return;

  decideAI(opponent);
  applyTurn(player);
  applyTurn(opponent);
  moveBike(player, dt);
  moveBike(opponent, dt);

  const playerCrash = checkCollision(player);
  const opponentCrash = checkCollision(opponent);
  if (playerCrash || opponentCrash) {
    player.alive = !playerCrash;
    opponent.alive = !opponentCrash;
    if (playerCrash && opponentCrash) {
      state.winner = "Unentschieden";
    } else if (playerCrash) {
      state.winner = "Blau gewinnt";
      state.score.opponent += 1;
    } else {
      state.winner = "Rot gewinnt";
      state.score.player += 1;
    }
    state.phase = "gameover";
  }
}

function drawArena() {
  ctx.fillStyle = "#020a14";
  ctx.fillRect(view.left, view.top, view.size, view.size);

  ctx.strokeStyle = "rgba(17, 183, 255, 0.15)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= arenaSize; i++) {
    const offset = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(view.left + offset, view.top);
    ctx.lineTo(view.left + offset, view.top + view.size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(view.left, view.top + offset);
    ctx.lineTo(view.left + view.size, view.top + offset);
    ctx.stroke();
  }

  ctx.strokeStyle = "#0ff";
  ctx.lineWidth = 4;
  ctx.strokeRect(view.left, view.top, view.size, view.size);
}

function drawTrails() {
  for (const bike of bikes) {
    ctx.strokeStyle = bike.color;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < bike.trail.length; i++) {
      const segment = bike.trail[i];
      const start = gridToScreen(segment.x1, segment.z1);
      const end = gridToScreen(segment.x2, segment.z2);
      if (i === 0) {
        ctx.moveTo(start.x, start.y);
      } else {
        ctx.moveTo(start.x, start.y);
      }
      ctx.lineTo(end.x, end.y);
    }
    ctx.stroke();
  }
}

function drawBike(bike) {
  const pos = gridToScreen(bike.x, bike.z);
  ctx.fillStyle = bike.color;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, bikeRadius * cellSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();

  const front = {
    x: pos.x + bike.dir.x * bikeRadius * cellSize * 1.8,
    y: pos.y - bike.dir.z * bikeRadius * cellSize * 1.8,
  };
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(front.x, front.y);
  ctx.stroke();
}

function drawOverlay() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvas.width, 60);
  ctx.fillStyle = "#c8f8ff";
  ctx.font = "18px Segoe UI, sans-serif";
  ctx.fillText(`Spieler Rot: Pfeiltasten links/rechts`, 20, 28);
  ctx.fillText(`Spieler Blau: A/D`, 20, 52);

  ctx.fillStyle = "#ff4a4a";
  ctx.fillText(`Rot: ${state.score.player}`, 600, 28);
  ctx.fillStyle = "#3bd2ff";
  ctx.fillText(`Blau: ${state.score.opponent}`, 600, 52);
}

function drawStartScreen() {
  ctx.drawImage(startImage, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00f6ff";
  ctx.font = "bold 48px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Tron 4.0", canvas.width / 2, 200);

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Segoe UI, sans-serif";
  ctx.fillText("Drücke Enter, um zu starten", canvas.width / 2, 300);
  ctx.fillText("Steuerung: Rot = Pfeiltasten, Blau = A/D", canvas.width / 2, 340);
  ctx.fillText("Ziel: Weiche Hindernissen aus und überlebe", canvas.width / 2, 380);
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#00f6ff";
  ctx.font = "bold 44px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.winner, canvas.width / 2, 280);
  ctx.font = "22px Segoe UI, sans-serif";
  ctx.fillText("Drücke Enter, um erneut zu spielen", canvas.width / 2, 340);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawArena();
  drawTrails();
  drawBike(opponent);
  drawBike(player);
  drawOverlay();

  if (state.phase === "start") {
    drawStartScreen();
  } else if (state.phase === "countdown") {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00f6ff";
    ctx.font = "bold 96px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(state.countdown > 0 ? state.countdown : "GO!", canvas.width / 2, canvas.height / 2 + 20);
  } else if (state.phase === "gameover") {
    drawGameOver();
  }
}

function loop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
  state.lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Enter") {
    event.preventDefault();
    if (state.phase === "start" || state.phase === "gameover") {
      resetRound();
    }
    return;
  }

  if (state.phase !== "playing" && state.phase !== "countdown") return;
  for (const bike of bikes) {
    if (!bike.controls) continue;
    if (event.code === bike.controls.left) {
      bike.nextTurn = "left";
    }
    if (event.code === bike.controls.right) {
      bike.nextTurn = "right";
    }
  }
});

startImage.onload = () => {
  render();
  requestAnimationFrame(loop);
};

window.app = { state, player, opponent, bikes };

startImage.onerror = () => {
  console.warn("Startbild konnte nicht geladen werden.");
  requestAnimationFrame(loop);
};
