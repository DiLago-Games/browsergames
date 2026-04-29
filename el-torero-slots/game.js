const ROWS = 5;
const REELS = 5;

const BET_LEVELS = [5, 10, 20, 40, 80];
const SYMBOL_META = {
  BULL: { emoji: "🐂", name: "BULL" },
  ROSE: { emoji: "🌹", name: "ROSE" },
  HAT: { emoji: "🎩", name: "HAT" },
  BOOT: { emoji: "👢", name: "BOOT" },
  MOON: { emoji: "🌙", name: "MOON" },
  SCATTER: { emoji: "🎪", name: "SCATTER" },
  WILD: { emoji: "🟥", name: "WILD" }
};

const SYMBOL_POOL_BASE = [
  "BULL", "BULL", "BULL", "BULL",
  "ROSE", "ROSE", "ROSE", "ROSE", "ROSE",
  "HAT", "HAT", "HAT", "HAT", "HAT",
  "BOOT", "BOOT", "BOOT", "BOOT", "BOOT", "BOOT",
  "MOON", "MOON", "MOON", "MOON", "MOON", "MOON", "MOON",
  "WILD",
  "SCATTER"
];

const SYMBOL_POOL_FREE = [
  "BULL", "BULL", "BULL", "BULL",
  "ROSE", "ROSE", "ROSE", "ROSE", "ROSE", "ROSE",
  "HAT", "HAT", "HAT", "HAT", "HAT", "HAT",
  "BOOT", "BOOT", "BOOT", "BOOT", "BOOT", "BOOT", "BOOT",
  "MOON", "MOON", "MOON", "MOON", "MOON", "MOON", "MOON", "MOON",
  "WILD", "WILD",
  "SCATTER"
];

const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  [4, 4, 4, 4, 4],
  [0, 1, 2, 3, 4],
  [4, 3, 2, 1, 0],
  [0, 0, 1, 0, 0],
  [4, 4, 3, 4, 4],
  [1, 2, 3, 2, 1],
  [3, 2, 1, 2, 3],
  [0, 1, 1, 1, 0],
  [4, 3, 3, 3, 4],
  [2, 1, 0, 1, 2],
  [2, 3, 4, 3, 2]
];

const PAYTABLE = {
  BULL: { 3: 4, 4: 10, 5: 24 },
  ROSE: { 3: 3, 4: 8, 5: 18 },
  HAT: { 3: 2, 4: 6, 5: 14 },
  BOOT: { 3: 2, 4: 5, 5: 12 },
  MOON: { 3: 1, 4: 4, 5: 10 },
  WILD: { 3: 6, 4: 16, 5: 40 }
};

const FREE_SPINS_AWARD = 10;
const BIG_WIN_MULTIPLIER = 25;
const MAX_POSSIBLE_WIN_MULTIPLIER = PAYLINES.length * PAYTABLE.WILD[5];
const FREE_SPIN_INTERVAL_MS = 1400;

const state = {
  balance: 500,
  betIndex: 1,
  win: 0,
  spinning: false,
  grid: createRandomGrid(),
  freeSpinsRemaining: 0,
  freeSpinIndex: 0,
  freeSpinsTotalWin: 0,
  freeSpinSessionActive: false,
  expandingWildReels: 0,
  bannerTimeout: null,
  spinTickTimer: null,
  freeSpinCheerTimer: null
};

const reelsEl = document.getElementById("reels");
const balanceEl = document.getElementById("balance");
const betEl = document.getElementById("bet");
const winEl = document.getElementById("win");
const freeSpinsEl = document.getElementById("free-spins");
const featureLabelEl = document.getElementById("feature-label");
const messageBoxEl = document.getElementById("message-box");
const bonusBannerEl = document.getElementById("bonus-banner");
const announcementOverlayEl = document.getElementById("announcement-overlay");
const announcementCardEl = document.getElementById("announcement-card");

const spinBtn = document.getElementById("spin");
const betUpBtn = document.getElementById("bet-up");
const betDownBtn = document.getElementById("bet-down");

const reelCells = [];
const reelElements = [];
let audioContext = null;

function money(value) {
  return `$${value}`;
}

function getBet() {
  return BET_LEVELS[state.betIndex];
}

function randomSymbol(inFreeSpins = false) {
  const pool = inFreeSpins ? SYMBOL_POOL_FREE : SYMBOL_POOL_BASE;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createRandomGrid(inFreeSpins = false) {
  const grid = Array.from({ length: ROWS }, () => Array(REELS).fill("MOON"));

  for (let reel = 0; reel < REELS; reel += 1) {
    let scatterPlaced = false;

    for (let row = 0; row < ROWS; row += 1) {
      let symbol = randomSymbol(inFreeSpins);

      // Hard cap: at most one scatter symbol per reel.
      while (symbol === "SCATTER" && scatterPlaced) {
        symbol = randomSymbol(inFreeSpins);
      }

      if (symbol === "SCATTER") {
        scatterPlaced = true;
      }

      grid[row][reel] = symbol;
    }
  }

  return grid;
}

function setupReels() {
  reelsEl.innerHTML = "";
  reelElements.length = 0;

  for (let reel = 0; reel < REELS; reel += 1) {
    const reelEl = document.createElement("div");
    reelEl.className = "reel";
    reelElements[reel] = reelEl;

    mountFinalReel(reel, Array.from({ length: ROWS }, () => "MOON"));

    reelsEl.appendChild(reelEl);
  }
}

function mountFinalReel(reelIndex, columnSymbols) {
  const reelEl = reelElements[reelIndex];
  reelEl.innerHTML = "";

  for (let row = 0; row < ROWS; row += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    renderCell(cell, columnSymbols[row], false);
    reelEl.appendChild(cell);

    if (!reelCells[row]) {
      reelCells[row] = [];
    }
    reelCells[row][reelIndex] = cell;
  }
}

function renderCell(cell, symbol, isWin) {
  const meta = SYMBOL_META[symbol] || { emoji: symbol, name: symbol };
  cell.innerHTML = `<span class="emoji" aria-label="${meta.name}">${meta.emoji}</span>`;
  cell.classList.toggle("wild", symbol === "WILD");
  cell.classList.toggle("win", isWin);
}

function paintGrid(grid, winningCoordinates = new Set(), scatterCoordinates = new Set()) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let reel = 0; reel < REELS; reel += 1) {
      const cell = reelCells[row][reel];
      const symbol = grid[row][reel];
      renderCell(cell, symbol, winningCoordinates.has(`${row}-${reel}`));
      cell.classList.toggle("scatter-hit", scatterCoordinates.has(`${row}-${reel}`));
    }
  }
}

function setMessage(text) {
  messageBoxEl.textContent = text;
}

function showBanner(text, ms = 1600) {
  bonusBannerEl.textContent = text;
  bonusBannerEl.classList.add("show");

  if (state.bannerTimeout) {
    clearTimeout(state.bannerTimeout);
  }

  state.bannerTimeout = setTimeout(() => {
    bonusBannerEl.classList.remove("show");
  }, ms);
}

async function showAnnouncement(text, ms = 2600, tone = "") {
  announcementCardEl.textContent = text;
  announcementCardEl.className = "announcement-card";
  if (tone) {
    announcementCardEl.classList.add(tone);
  }
  announcementOverlayEl.classList.add("show");
  await wait(ms);
  announcementOverlayEl.classList.remove("show");
}

function updateHud() {
  balanceEl.textContent = money(state.balance);
  betEl.textContent = money(getBet());
  winEl.textContent = money(state.win);
  freeSpinsEl.textContent = String(state.freeSpinsRemaining);
}

function setButtonsDisabled(disabled) {
  spinBtn.disabled = disabled;
  betUpBtn.disabled = disabled;
  betDownBtn.disabled = disabled;
}

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function ringTone(startTime, frequency, duration, gainPeak = 0.22, wave = "triangle") {
  if (!audioContext) {
    return;
  }

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = wave;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function bloopTone(startTime, frequency, duration, gainPeak = 0.16) {
  if (!audioContext) {
    return;
  }

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency * 1.08, startTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(90, frequency * 0.92), startTime + duration);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playToreroFlourish(startTime, root, gain = 0.12) {
  // Andalusian-style color movement (i - VII - VI - V contour).
  bloopTone(startTime, root, 0.16, gain);
  bloopTone(startTime + 0.12, root * 0.89, 0.16, gain);
  bloopTone(startTime + 0.24, root * 0.84, 0.16, gain);
  bloopTone(startTime + 0.36, root * 0.75, 0.18, gain + 0.02);
}

function playSpinTick() {
  if (!audioContext) {
    return;
  }

  bloopTone(audioContext.currentTime, 170 + Math.random() * 30, 0.09, 0.055);
}

function playReelStop(reelIndex) {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  const base = 290 + reelIndex * 34;
  bloopTone(start, base, 0.11, 0.09);
  bloopTone(start + 0.08, base * 1.24, 0.13, 0.08);
}

function startSpinSound() {
  if (!audioContext) {
    return;
  }

  stopSpinSound();
  playSpinTick();
  state.spinTickTimer = setInterval(playSpinTick, 105);
}

function stopSpinSound() {
  if (state.spinTickTimer) {
    clearInterval(state.spinTickTimer);
    state.spinTickTimer = null;
  }
}

function playExpandSound(step) {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime;
  const root = 340 + step * 42;
  bloopTone(start, root, 0.14, 0.11);
  bloopTone(start + 0.09, root * 1.33, 0.14, 0.1);
}

function playWinChime() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime;
  playToreroFlourish(start, 640, 0.115);
  bloopTone(start + 0.52, 920, 0.18, 0.12);
}

function playScatterBell() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.02;
  playToreroFlourish(start, 780, 0.14);
  bloopTone(start + 0.54, 1180, 0.22, 0.15);
}

function playWildSignal() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  bloopTone(start, 520, 0.12, 0.1);
  bloopTone(start + 0.1, 700, 0.13, 0.1);
}

function playScatterSignal() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  bloopTone(start, 700, 0.14, 0.12);
  bloopTone(start + 0.12, 940, 0.16, 0.12);
}

function triggerScatterImpact() {
  document.body.classList.add("scatter-flash");
  setTimeout(() => {
    document.body.classList.remove("scatter-flash");
  }, 950);
}

function playBigWinRingRing() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.02;
  playToreroFlourish(start, 760, 0.14);
  playToreroFlourish(start + 0.52, 840, 0.15);
  bloopTone(start + 1.08, 1280, 0.24, 0.16);
}

function playCheerBurst(intensity = 1) {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  const base = 520 + 60 * intensity;
  bloopTone(start, base, 0.12, 0.07 + 0.025 * intensity);
  bloopTone(start + 0.1, base * 1.24, 0.14, 0.07 + 0.025 * intensity);
  if (intensity >= 3) {
    bloopTone(start + 0.22, base * 1.56, 0.16, 0.08 + 0.02 * intensity);
  }
}

function startFreeSpinCheerLoop() {
  if (!audioContext || state.freeSpinCheerTimer) {
    return;
  }

  playCheerBurst(1);
  state.freeSpinCheerTimer = setInterval(() => {
    playCheerBurst(1);
  }, 1650);
}

function stopFreeSpinCheerLoop() {
  if (state.freeSpinCheerTimer) {
    clearInterval(state.freeSpinCheerTimer);
    state.freeSpinCheerTimer = null;
  }
}

function classifyBigWin(payout, bet) {
  const ratioToMax = payout / (bet * MAX_POSSIBLE_WIN_MULTIPLIER);

  if (ratioToMax >= 0.65) {
    return { name: "LEGENDARY", tone: "legendary", cheer: 4 };
  }
  if (ratioToMax >= 0.4) {
    return { name: "COLOSSAL", tone: "colossal", cheer: 3 };
  }
  if (ratioToMax >= 0.2) {
    return { name: "MEGA", tone: "mega", cheer: 2 };
  }

  return { name: "BIG", tone: "big", cheer: 1 };
}

function triggerBigWinFlash() {
  document.body.classList.add("big-win-flash");
  setTimeout(() => {
    document.body.classList.remove("big-win-flash");
  }, 1100);
}

async function announceBigWin(payout, bet) {
  const tier = classifyBigWin(payout, bet);
  triggerBigWinFlash();
  showBanner(`${tier.name} WIN!`, 1600);
  playBigWinRingRing();
  playCheerBurst(tier.cheer);
  await showAnnouncement(`${tier.name} WIN ${money(payout)}!`, 1700, tier.tone);
}

function countConsecutive(symbols, targetSymbol) {
  let count = 0;

  for (const symbol of symbols) {
    if (symbol === "SCATTER") {
      break;
    }

    const isMatch = targetSymbol === "WILD"
      ? symbol === "WILD"
      : symbol === targetSymbol || symbol === "WILD";

    if (!isMatch) {
      break;
    }

    count += 1;
  }

  return count;
}

function evaluateLine(lineSymbols) {
  const candidates = ["BULL", "ROSE", "HAT", "BOOT", "MOON", "WILD"];
  let best = { symbol: null, count: 0, multiplier: 0 };

  for (const symbol of candidates) {
    const count = countConsecutive(lineSymbols, symbol);
    const multiplier = PAYTABLE[symbol][count] || 0;

    if (multiplier > best.multiplier) {
      best = { symbol, count, multiplier };
    }
  }

  return best;
}

function evaluateGrid(grid, bet) {
  let totalWin = 0;
  const winCoords = new Set();
  const hits = [];

  PAYLINES.forEach((lineDef, lineIndex) => {
    const lineSymbols = lineDef.map((row, reel) => grid[row][reel]);
    const result = evaluateLine(lineSymbols);

    if (result.multiplier > 0) {
      const lineWin = bet * result.multiplier;
      totalWin += lineWin;

      for (let reel = 0; reel < result.count; reel += 1) {
        winCoords.add(`${lineDef[reel]}-${reel}`);
      }

      hits.push({
        line: lineIndex + 1,
        symbol: result.symbol,
        count: result.count,
        lineWin
      });
    }
  });

  return { totalWin, winCoords, hits };
}

function countScatters(grid) {
  let total = 0;
  const coords = new Set();

  for (let row = 0; row < ROWS; row += 1) {
    for (let reel = 0; reel < REELS; reel += 1) {
      if (grid[row][reel] === "SCATTER") {
        total += 1;
        coords.add(`${row}-${reel}`);
      }
    }
  }

  return { total, coords };
}

function getShuffledReels() {
  const list = [0, 1, 2, 3, 4];

  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  return list;
}

function getExpandingWildTargetCount() {
  // Balance mode: each free spin independently rolls 3/4/5 expanding reels.
  // 5-reel full house remains rare and does not become permanent.
  const roll = Math.random();

  if (roll < 0.64) {
    return 3;
  }
  if (roll < 0.91) {
    return 4;
  }
  return 5;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildReelStrip(targetColumn, stopPos) {
  const strip = Array.from({ length: stopPos + ROWS + 120 }, () => randomSymbol());

  for (let row = 0; row < ROWS; row += 1) {
    strip[stopPos + row] = targetColumn[row];
  }

  return strip;
}

function renderReelFromStrip(reelIndex, strip, position) {
  for (let row = 0; row < ROWS; row += 1) {
    renderCell(reelCells[row][reelIndex], strip[position + row], false);
  }
}

function createSpinSymbolCell(symbol) {
  const meta = SYMBOL_META[symbol] || { emoji: symbol, name: symbol };
  const cell = document.createElement("div");
  cell.className = "spin-symbol";
  cell.dataset.symbol = symbol;
  cell.innerHTML = `<span class="emoji" aria-label="${meta.name}">${meta.emoji}</span>`;
  if (symbol === "WILD") {
    cell.classList.add("wild");
  }
  return cell;
}

function getReelStepPx(trackEl) {
  const firstSymbol = trackEl.firstElementChild;
  const symbolHeight = firstSymbol ? firstSymbol.getBoundingClientRect().height : 0;
  const trackStyles = window.getComputedStyle(trackEl);
  const gap = parseFloat(trackStyles.rowGap || trackStyles.gap || "0") || 0;

  return symbolHeight + gap;
}

function signalSpecialsOnReelStop(trackEl, stopIndex) {
  const symbols = Array.from(trackEl.children);
  const visible = symbols.slice(stopIndex, stopIndex + ROWS);

  let hasWild = false;
  let hasScatter = false;

  visible.forEach((el) => {
    const symbol = el.dataset.symbol;
    if (symbol === "WILD") {
      hasWild = true;
      el.classList.add("hit-wild");
      setTimeout(() => el.classList.remove("hit-wild"), 780);
    }
    if (symbol === "SCATTER") {
      hasScatter = true;
      el.classList.add("hit-scatter");
      setTimeout(() => el.classList.remove("hit-scatter"), 900);
    }
  });

  if (hasWild) {
    playWildSignal();
  }
  if (hasScatter) {
    playScatterSignal();
  }
}

function signalSpecialsOnFinalReel(reelIndex, columnSymbols) {
  let hasWild = false;
  let hasScatter = false;

  for (let row = 0; row < ROWS; row += 1) {
    const symbol = columnSymbols[row];
    const cell = reelCells[row]?.[reelIndex];

    if (!cell) {
      continue;
    }

    if (symbol === "WILD") {
      hasWild = true;
      cell.classList.add("scatter-hit");
      cell.classList.add("win");
      setTimeout(() => {
        cell.classList.remove("scatter-hit");
        cell.classList.remove("win");
      }, 780);
    }

    if (symbol === "SCATTER") {
      hasScatter = true;
      cell.classList.add("scatter-hit");
      setTimeout(() => cell.classList.remove("scatter-hit"), 900);
    }
  }

  if (hasWild) {
    playWildSignal();
  }
  if (hasScatter) {
    playScatterSignal();
  }
}

function buildAnimatedReel(reelIndex, strip, stopPos) {
  const reelEl = reelElements[reelIndex];
  reelEl.innerHTML = "";

  const windowEl = document.createElement("div");
  windowEl.className = "reel-window";

  const trackEl = document.createElement("div");
  trackEl.className = "reel-track";

  strip.forEach((symbol) => {
    trackEl.appendChild(createSpinSymbolCell(symbol));
  });

  windowEl.appendChild(trackEl);
  reelEl.appendChild(windowEl);

  const stepPx = getReelStepPx(trackEl);

  return {
    trackEl,
    stepPx,
    stopPx: stopPos * stepPx
  };
}

function easeOutCubic(t) {
  return 1 - ((1 - t) ** 3);
}

function setTrackPhase(trackEl, phase) {
  trackEl.classList.remove("speed-fast", "speed-medium", "speed-slow");
  trackEl.classList.add(phase);
}

function animateSingleReel(trackEl, startPx, stopPx, reelIndex, stopIndex, config, onStop) {
  const {
    cruiseSpeed,
    cruiseDuration,
    decelDuration
  } = config;

  const totalDistance = startPx - stopPx;
  const decelDistance = cruiseSpeed * decelDuration / 3;
  const cruiseDistance = totalDistance - decelDistance;
  const adjustedCruiseSpeed = cruiseDistance / cruiseDuration;
  const totalDuration = cruiseDuration + decelDuration;

  return new Promise((resolve) => {
    let stopSoundPlayed = false;
    const startTs = performance.now();

    function frame(now) {
      const elapsed = now - startTs;
      let position;

      if (elapsed < cruiseDuration) {
        setTrackPhase(trackEl, "speed-fast");
        position = startPx - (adjustedCruiseSpeed * elapsed);
      } else if (elapsed < totalDuration) {
        setTrackPhase(trackEl, "speed-slow");
        const slowElapsed = elapsed - cruiseDuration;
        const p = Math.min(1, slowElapsed / decelDuration);
        position = startPx - cruiseDistance - (decelDistance * easeOutCubic(p));

        if (!stopSoundPlayed && p > 0.88) {
          playReelStop(reelIndex);
          stopSoundPlayed = true;
        }
      } else {
        setTrackPhase(trackEl, "speed-slow");
        trackEl.style.transform = `translateY(-${stopPx}px)`;
        if (onStop) {
          onStop();
        }
        resolve();
        return;
      }

      trackEl.style.transform = `translateY(-${position}px)`;
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  });
}

async function animateExpandingWilds(rawGrid) {
  // Collect which reels have at least one WILD symbol.
  const wildReels = [];
  for (let reel = 0; reel < REELS; reel += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (rawGrid[row][reel] === "WILD") {
        wildReels.push(reel);
        break;
      }
    }
  }

  // Expansion only triggers when at least 2 reels contain a WILD.
  // Each qualifying reel expands vertically (all rows become WILD).
  // No horizontal spreading — only the exact reels that have wilds expand.
  if (wildReels.length < 2) {
    state.expandingWildReels = 0;
    return { grid: rawGrid.map((row) => [...row]), expandedReels: [] };
  }

  const selected = wildReels.slice().sort((a, b) => a - b);
  state.expandingWildReels = selected.length;

  const working = rawGrid.map((row) => [...row]);
  featureLabelEl.textContent = `Free Spins: ${selected.length} expanding wild reels`;

  for (let step = 0; step < selected.length; step += 1) {
    const reel = selected[step];

    // Expand this reel vertically — all rows become WILD.
    for (let row = 0; row < ROWS; row += 1) {
      working[row][reel] = "WILD";
    }

    paintGrid(working);
    playExpandSound(step + 1);
    showBanner(`Wild reel ${reel + 1} expands`, 700);
    await wait(400);
  }

  if (selected.length === REELS) {
    showBanner("Full house wilds!", 1000);
  }

  return { grid: working, expandedReels: selected.map((r) => r + 1) };
}

async function spinAnimation(targetGrid) {
  const baseCruiseMs = 1900;
  const staggerCruiseMs = 450;
  const baseDecelMs = 1080;
  const decelStepMs = 60;
  const cruiseSpeed = 1.16;
  const reelAnimations = [];
  const animations = [];

  for (let reel = 0; reel < REELS; reel += 1) {
    const targetColumn = Array.from({ length: ROWS }, (_, row) => targetGrid[row][reel]);
    const stopPos = 34 + reel * 2;
    const cruiseDuration = baseCruiseMs + reel * staggerCruiseMs;
    const decelDuration = baseDecelMs + reel * decelStepMs;
    const decelDistance = cruiseSpeed * decelDuration / 3;
    const cruiseDistance = cruiseSpeed * cruiseDuration;
    const totalDistance = cruiseDistance + decelDistance;
    const strip = buildReelStrip(targetColumn, stopPos);
    reelAnimations[reel] = buildAnimatedReel(reel, strip, stopPos);

    const { trackEl, stepPx, stopPx } = reelAnimations[reel];
    const startPos = stopPos + Math.ceil(totalDistance / stepPx) + 3;
    const startPx = startPos * stepPx;
    trackEl.style.transform = `translateY(-${startPx}px)`;
    trackEl.style.transition = "none";

    animations.push(
      animateSingleReel(
        trackEl,
        startPx,
        stopPx,
        reel,
        stopPos,
        {
          cruiseSpeed,
          cruiseDuration,
          decelDuration
        },
        () => {
          mountFinalReel(reel, targetColumn);
          signalSpecialsOnFinalReel(reel, targetColumn);
        }
      )
    );
  }

  await Promise.all(animations);

  // Re-apply spin blur cleanup state just in case animation classes were present.
  for (const cell of reelCells.flat()) {
    cell.classList.remove("spin-blur");
  }
}

function describeWinEvent(payout, bet) {
  const totalMultiplier = Math.round((payout.totalWin / bet) * 10) / 10;
  const topHits = payout.hits.slice(0, 2).map((hit) => {
    const symbolName = SYMBOL_META[hit.symbol]?.name || hit.symbol;
    return `Line ${hit.line}: ${hit.count} ${symbolName} pays ${money(hit.lineWin)}`;
  });

  const details = topHits.length > 0 ? ` ${topHits.join(". ")}.` : "";
  return `Win ${money(payout.totalWin)} (${totalMultiplier}x bet).${details}`;
}

function startFreeSpins() {
  const wasActive = state.freeSpinSessionActive;
  state.freeSpinsRemaining += FREE_SPINS_AWARD;

  if (!wasActive) {
    state.freeSpinSessionActive = true;
    document.body.classList.add("free-spins-active");
    state.freeSpinIndex = 0;
    state.freeSpinsTotalWin = 0;
    state.expandingWildReels = 3;
    showBanner("10 FREE SPINS!", 2200);
    setMessage("Matador bonus! 10 free spins awarded. Session total starts at 0.");
    startFreeSpinCheerLoop();
  } else {
    showBanner(`RETRIGGER +${FREE_SPINS_AWARD} SPINS!`, 2300);
    setMessage(`Scatter retrigger! +${FREE_SPINS_AWARD} free spins. Session total keeps counting.`);
    playCheerBurst(2);
  }
}

function queueNextAutoFreeSpin(delayMs = FREE_SPIN_INTERVAL_MS) {
  if (state.freeSpinsRemaining <= 0) {
    return;
  }

  setTimeout(() => {
    if (!state.spinning && state.freeSpinsRemaining > 0) {
      spin();
    }
  }, delayMs);
}

async function spin() {
  if (state.spinning) {
    return;
  }

  initAudio();

  const inFreeSpins = state.freeSpinSessionActive && state.freeSpinsRemaining > 0;
  const bet = getBet();

  if (!inFreeSpins && state.balance < bet) {
    setMessage("Not enough balance. Lower your bet.");
    return;
  }

  state.spinning = true;
  setButtonsDisabled(true);

  if (inFreeSpins) {
    state.freeSpinsRemaining -= 1;
    state.freeSpinIndex += 1;
    featureLabelEl.textContent = `Free Spin ${state.freeSpinIndex}`;
    setMessage(`Free spin ${state.freeSpinIndex} in play. Session total: ${money(state.freeSpinsTotalWin)}.`);
  } else {
    state.balance -= bet;
    featureLabelEl.textContent = "Base Spin";
    setMessage("The crowd is roaring...");
  }

  state.win = 0;
  updateHud();

  const rawGrid = createRandomGrid(inFreeSpins);
  startSpinSound();
  await spinAnimation(rawGrid);
  stopSpinSound();

  const scatterResult = countScatters(rawGrid);
  const scatterCount = scatterResult.total;

  let outcomeGrid = rawGrid;
  let expandedText = "";

  if (inFreeSpins) {
    const expanded = await animateExpandingWilds(rawGrid);
    outcomeGrid = expanded.grid;
    expandedText = ` Expanding reels: ${expanded.expandedReels.join(", ")}.`;
  }

  const payout = evaluateGrid(outcomeGrid, bet);

  state.grid = outcomeGrid;
  state.win = payout.totalWin;
  state.balance += payout.totalWin;

  paintGrid(state.grid, payout.winCoords, scatterResult.coords);
  updateHud();

  if (scatterCount >= 3) {
    triggerScatterImpact();
    playScatterBell();
    showBanner(`${scatterCount} SCATTERS!`, 1700);
    await showAnnouncement(`${scatterCount} SCATTERS!`, 1250, "bonus");
  }

  if (scatterCount >= 3 && !state.freeSpinSessionActive) {
    startFreeSpins();
    await showAnnouncement(`Ole! ${FREE_SPINS_AWARD} Free Spins!`, 2800, "bonus");
  } else if (scatterCount >= 3 && state.freeSpinSessionActive) {
    startFreeSpins();
    showAnnouncement(`Retrigger! +${FREE_SPINS_AWARD} Free Spins!`, 1800, "bonus");
  }

  if (inFreeSpins) {
    state.freeSpinsTotalWin += payout.totalWin;
  }

  if (payout.totalWin > 0) {
    playWinChime();
    if (inFreeSpins) {
      playCheerBurst(1);
    }
    const winExplanation = describeWinEvent(payout, bet);

    if (inFreeSpins) {
      setMessage(`${winExplanation} Session total ${money(state.freeSpinsTotalWin)}.${expandedText}`);
    } else {
      setMessage(`${winExplanation}${expandedText}`);
    }
    showBanner(`WIN EVENT ${money(payout.totalWin)}`, 1400);
  } else if (state.freeSpinSessionActive) {
    setMessage(`No payline win. Session total ${money(state.freeSpinsTotalWin)}. ${state.freeSpinsRemaining} free spins remain.${expandedText}`);
  } else {
    setMessage("No payline win this spin. Hold your nerve and spin again.");
  }

  if (payout.totalWin >= bet * BIG_WIN_MULTIPLIER) {
    if (inFreeSpins) {
      announceBigWin(payout.totalWin, bet);
    } else {
      await announceBigWin(payout.totalWin, bet);
    }
    if (inFreeSpins) {
      setMessage(`Big hit inside free spins! Session total ${money(state.freeSpinsTotalWin)}.`);
    }
  }

  if (state.freeSpinSessionActive && state.freeSpinsRemaining > 0) {
    featureLabelEl.textContent = `Free Spins Active (${state.freeSpinsRemaining} left)`;
    setButtonsDisabled(true);
  } else if (state.freeSpinSessionActive && state.freeSpinsRemaining === 0) {
    stopFreeSpinCheerLoop();
    await showAnnouncement(`Free Spins End! Session Win ${money(state.freeSpinsTotalWin)}`, 2600, "summary");
    playCheerBurst(3);
    playBigWinRingRing();
    setMessage(`Free spins complete. Isolated session win: ${money(state.freeSpinsTotalWin)}.`);
    featureLabelEl.textContent = "Ready";
    state.freeSpinSessionActive = false;
    document.body.classList.remove("free-spins-active");
    state.freeSpinIndex = 0;
    state.expandingWildReels = 0;
    setButtonsDisabled(false);
  } else {
    featureLabelEl.textContent = "Ready";
    state.freeSpinIndex = 0;
    setButtonsDisabled(false);
  }

  state.spinning = false;

  if (state.freeSpinSessionActive && state.freeSpinsRemaining > 0) {
    queueNextAutoFreeSpin(FREE_SPIN_INTERVAL_MS);
  }
}

function changeBet(delta) {
  if (state.spinning || state.freeSpinsRemaining > 0) {
    return;
  }

  const next = Math.max(0, Math.min(BET_LEVELS.length - 1, state.betIndex + delta));
  state.betIndex = next;
  updateHud();
}

spinBtn.addEventListener("click", spin);
betUpBtn.addEventListener("click", () => changeBet(1));
betDownBtn.addEventListener("click", () => changeBet(-1));

setupReels();
paintGrid(state.grid);
updateHud();
