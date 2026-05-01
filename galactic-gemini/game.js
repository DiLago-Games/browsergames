// ── Game configuration ───────────────────────────────────
const ROWS  = 3;
const REELS = 3;

const BET_LEVELS = [5, 10, 20, 40, 80];

const SYMBOL_META = {
  GEMINI:  { emoji: "♊",   name: "GEMINI" },
  STAR:    { emoji: "⭐",   name: "STAR" },
  PLANET:  { emoji: "🪐",   name: "PLANET" },
  CRYSTAL: { emoji: "💎",   name: "CRYSTAL" },
  BAR:     { label: "BAR",  cssClass: "sym-bar",   name: "BAR",   isLabel: true },
  SEVEN:   { label: "7",    cssClass: "sym-seven", name: "SEVEN", isLabel: true },
  WILD:    { emoji: "🌀",   name: "WILD" },
  SCATTER: { emoji: "☄️",   name: "SCATTER" }
};

// Static reel strips – 20 positions each (as specified)
const REEL_STRIPS = [
  [
    "GEMINI", "STAR", "PLANET", "CRYSTAL", "BAR", "SEVEN",
    "STAR", "PLANET", "CRYSTAL", "BAR", "GEMINI",
    "PLANET", "STAR", "CRYSTAL", "BAR", "SEVEN",
    "CRYSTAL", "PLANET", "WILD", "SCATTER"
  ],
  [
    "STAR", "PLANET", "CRYSTAL", "BAR", "GEMINI", "SEVEN",
    "PLANET", "CRYSTAL", "BAR", "STAR", "GEMINI",
    "CRYSTAL", "PLANET", "STAR", "BAR", "SEVEN",
    "PLANET", "STAR", "WILD", "SCATTER"
  ],
  [
    "PLANET", "CRYSTAL", "BAR", "GEMINI", "STAR", "SEVEN",
    "CRYSTAL", "BAR", "STAR", "PLANET", "GEMINI",
    "BAR", "STAR", "PLANET", "CRYSTAL", "SEVEN",
    "STAR", "PLANET", "WILD", "SCATTER"
  ]
];

// Paylines: [row_reel0, row_reel1, row_reel2]
const PAYLINES = [
  [1, 1, 1],  // line 1: middle row
  [0, 0, 0],  // line 2: top row
  [2, 2, 2]   // line 3: bottom row
];

// Paytable – payout multiplier for 3 consecutive matching symbols
const PAYTABLE = {
  SEVEN:   { 3: 100 },
  WILD:    { 3: 75 },
  GEMINI:  { 3: 50 },
  STAR:    { 3: 30 },
  PLANET:  { 3: 20 },
  CRYSTAL: { 3: 15 },
  BAR:     { 3: 10 }
};

const FREE_SPINS_AWARD       = 8;
const BIG_WIN_MULTIPLIER     = 20;
const MAX_POSSIBLE_WIN_MULT  = PAYLINES.length * PAYTABLE.SEVEN[3];  // 3 × 100 = 300
const FREE_SPIN_INTERVAL_MS  = 1500;

// ── State ────────────────────────────────────────────────
const state = {
  balance: 500,
  betIndex: 1,
  win: 0,
  spinning: false,
  grid: null,
  freeSpinsRemaining: 0,
  freeSpinIndex: 0,
  freeSpinsTotalWin: 0,
  freeSpinSessionActive: false,
  cosmicWildReels: 0,
  bannerTimeout: null,
  spinTickTimer: null,
  freeSpinCheerTimer: null,
  bgmTimer: null,
  bgmMode: "idle",
  bgmStep: 0,
  bgmModeExpiresAt: 0
};

// ── DOM references ───────────────────────────────────────
const reelsEl          = document.getElementById("reels");
const balanceEl        = document.getElementById("balance");
const betEl            = document.getElementById("bet");
const winEl            = document.getElementById("win");
const freeSpinsEl      = document.getElementById("free-spins");
const featureLabelEl   = document.getElementById("feature-label");
const messageBoxEl     = document.getElementById("message-box");
const bonusBannerEl    = document.getElementById("bonus-banner");
const announcementOverlayEl = document.getElementById("announcement-overlay");
const announcementCardEl    = document.getElementById("announcement-card");
const spinBtn   = document.getElementById("spin");
const betUpBtn  = document.getElementById("bet-up");
const betDownBtn = document.getElementById("bet-down");

const reelCells    = [];
const reelElements = [];

// ── Audio state ──────────────────────────────────────────
let audioContext = null;
let reverbInput  = null;

// ── Utility helpers ──────────────────────────────────────
function money(value) {
  return `$${value}`;
}

function getBet() {
  return BET_LEVELS[state.betIndex];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── UI helpers ───────────────────────────────────────────
function updateHud() {
  balanceEl.textContent  = money(state.balance);
  betEl.textContent      = money(getBet());
  winEl.textContent      = money(state.win);
  freeSpinsEl.textContent = String(state.freeSpinsRemaining);
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
  announcementCardEl.className   = "announcement-card";
  if (tone) {
    announcementCardEl.classList.add(tone);
  }
  announcementOverlayEl.classList.add("show");
  await wait(ms);
  announcementOverlayEl.classList.remove("show");
}

function setButtonsDisabled(disabled) {
  spinBtn.disabled    = disabled;
  betUpBtn.disabled   = disabled;
  betDownBtn.disabled = disabled;
}

// ── Audio ─────────────────────────────────────────────────
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!reverbInput) {
    const input    = audioContext.createGain();
    const delayA   = audioContext.createDelay(1.5);
    const delayB   = audioContext.createDelay(1.5);
    const fbA      = audioContext.createGain();
    const fbB      = audioContext.createGain();
    const tone     = audioContext.createBiquadFilter();
    const wet      = audioContext.createGain();

    delayA.delayTime.value = 0.18;
    delayB.delayTime.value = 0.32;
    fbA.gain.value = 0.28;
    fbB.gain.value = 0.20;
    tone.type = "lowpass";
    tone.frequency.value = 3600;
    wet.gain.value = 0.10;

    input.connect(delayA);
    input.connect(delayB);
    delayA.connect(fbA);
    fbA.connect(delayA);
    delayB.connect(fbB);
    fbB.connect(delayB);
    delayA.connect(tone);
    delayB.connect(tone);
    tone.connect(wet);
    wet.connect(audioContext.destination);

    reverbInput = input;
  }

  updateBackgroundMusicForState();
}

// Low-level synth tone: shaped attack-decay, optional reverb send
function playSynthTone(startTime, freq, duration, gainPeak = 0.1, wave = "triangle", sendReverb = false) {
  if (!audioContext) {
    return;
  }

  const osc  = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filt = audioContext.createBiquadFilter();

  osc.type = wave;
  osc.frequency.setValueAtTime(freq, startTime);

  filt.type = "lowpass";
  filt.frequency.setValueAtTime(freq * 4, startTime);
  filt.frequency.exponentialRampToValueAtTime(Math.max(80, freq * 1.2), startTime + duration);
  filt.Q.value = 1.4;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.025);
  gain.gain.setValueAtTime(gainPeak * 0.75, startTime + duration * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filt);
  filt.connect(gain);
  gain.connect(audioContext.destination);

  if (sendReverb && reverbInput) {
    const send = audioContext.createGain();
    send.gain.value = 0.12;
    gain.connect(send);
    send.connect(reverbInput);
  }

  osc.start(startTime);
  osc.stop(startTime + duration + 0.06);
}

// Cosmic drum hit – synthesized kick/percussion
function playCosmicDrum(startTime, kind = "kick", gainPeak = 0.06) {
  if (!audioContext) {
    return;
  }

  const osc  = audioContext.createOscillator();
  const gain = audioContext.createGain();

  if (kind === "kick") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, startTime);
    osc.frequency.exponentialRampToValueAtTime(48, startTime + 0.12);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
  } else if (kind === "snare") {
    osc.type = "square";
    osc.frequency.setValueAtTime(320, startTime);
    osc.frequency.exponentialRampToValueAtTime(180, startTime + 0.08);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak * 0.7, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);
  } else {
    // hi-hat
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(900, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak * 0.4, startTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.06);
  }

  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.22);
}

// ── BGM profiles ─────────────────────────────────────────
function getBgmProfile(mode) {
  // Frequencies in Hz – pentatonic / modal scales, space-synth feel
  const A3 = 220, C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392,
        A4 = 440, C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99,
        A5 = 880, C6 = 1046.5;

  const profiles = {
    idle: {
      stepMs: 260,
      melody: [A3, null, C4, null, E4, null, G4, null, A4, null, G4, null, E4, null, C4, null],
      bass:   [A3, null, A3, null, C4, null, C4, null],
      drums:  ["kick", null, null, "hat", null, null, "snare", null],
      melGain: 0.05, bassGain: 0.04, drumGain: 0.04
    },
    spinning: {
      stepMs: 90,
      melody: [A4, C5, E5, G5, A5, G5, E5, C5, A4, G4, E4, C4, D4, E4, G4, A4],
      bass:   [A3, A3, C4, C4, E4, E4, G4, G4],
      drums:  ["kick", "hat", "snare", "hat", "kick", "hat", "snare", "hat"],
      melGain: 0.045, bassGain: 0.035, drumGain: 0.045
    },
    suspense: {
      stepMs: 130,
      melody: [E4, null, G4, null, A4, null, C5, null, D5, null, C5, null, A4, null, G4, null],
      bass:   [A3, null, C4, null, E4, null, G4, null],
      drums:  ["kick", null, "hat", null, "snare", null, "hat", null],
      melGain: 0.055, bassGain: 0.04, drumGain: 0.04
    },
    free: {
      stepMs: 80,
      melody: [C5, E5, G5, A5, C6, A5, G5, E5, C5, A4, G4, E4, G4, A4, C5, E5],
      bass:   [C4, C4, E4, E4, G4, G4, A4, A4],
      drums:  ["kick", "hat", "snare", "hat", "kick", "hat", "snare", "hat"],
      melGain: 0.055, bassGain: 0.04, drumGain: 0.055
    },
    bigwin: {
      stepMs: 85,
      melody: [G4, A4, C5, D5, E5, G5, A5, G5, E5, D5, C5, A4, G4, A4, C5, E5],
      bass:   [G3 = 196, G3, C4, C4, E4, E4, G4, G4],
      drums:  ["kick", "hat", "snare", "hat", "kick", "kick", "snare", "hat"],
      melGain: 0.06, bassGain: 0.045, drumGain: 0.06
    }
  };

  return profiles[mode] || profiles.idle;
}

function playBackgroundMusicStep() {
  if (!audioContext) {
    return;
  }

  if (state.bgmModeExpiresAt && performance.now() >= state.bgmModeExpiresAt) {
    state.bgmModeExpiresAt = 0;
    updateBackgroundMusicForState();
  }

  const profile = getBgmProfile(state.bgmMode);
  const mIdx    = state.bgmStep % profile.melody.length;
  const bIdx    = state.bgmStep % profile.bass.length;
  const dIdx    = state.bgmStep % profile.drums.length;
  const start   = audioContext.currentTime + 0.012;

  const note = profile.melody[mIdx];
  if (note) {
    playSynthTone(start, note, (profile.stepMs / 1000) * 0.75, profile.melGain, "triangle", true);
  }

  const bass = profile.bass[bIdx];
  if (bass) {
    playSynthTone(start, bass, (profile.stepMs / 1000) * 0.65, profile.bassGain, "sine");
  }

  const drum = profile.drums[dIdx];
  if (drum) {
    playCosmicDrum(start, drum, profile.drumGain);
  }

  state.bgmStep += 1;
}

function setBackgroundMusicMode(mode, holdMs = 0) {
  if (!audioContext) {
    return;
  }

  const profile    = getBgmProfile(mode);
  const modeChanged = state.bgmMode !== mode;
  const needsRestart = modeChanged || !state.bgmTimer;

  state.bgmMode = mode;
  state.bgmModeExpiresAt = holdMs > 0 ? performance.now() + holdMs : 0;

  if (!needsRestart) {
    return;
  }

  if (state.bgmTimer) {
    clearInterval(state.bgmTimer);
    state.bgmTimer = null;
  }

  state.bgmStep = 0;
  playBackgroundMusicStep();
  state.bgmTimer = setInterval(playBackgroundMusicStep, profile.stepMs);
}

function updateBackgroundMusicForState() {
  if (!audioContext) {
    return;
  }

  if (state.spinning) {
    if (document.body.classList.contains("scatter-suspense")) {
      setBackgroundMusicMode("suspense");
      return;
    }
    setBackgroundMusicMode("spinning");
    return;
  }

  if (state.freeSpinSessionActive) {
    setBackgroundMusicMode("free");
    return;
  }

  setBackgroundMusicMode("idle");
}

// ── Sound effects ────────────────────────────────────────
function playSpinTick() {
  if (!audioContext) {
    return;
  }

  playSynthTone(audioContext.currentTime, 200 + Math.random() * 40, 0.08, 0.045, "square");
}

function playReelStop(reelIndex) {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  const base  = 320 + reelIndex * 45;
  playSynthTone(start, base, 0.10, 0.08, "triangle");
  playSynthTone(start + 0.07, base * 1.25, 0.12, 0.07, "triangle");
}

function startSpinSound() {
  if (!audioContext) {
    return;
  }

  stopSpinSound();
  playSpinTick();
  state.spinTickTimer = setInterval(playSpinTick, 100);
}

function stopSpinSound() {
  if (state.spinTickTimer) {
    clearInterval(state.spinTickTimer);
    state.spinTickTimer = null;
  }
}

function playCosmicFlourish(startTime, root) {
  // Rising arpeggio – space victory fanfare
  [1, 1.25, 1.5, 2, 2.5].forEach((mult, i) => {
    playSynthTone(startTime + i * 0.10, root * mult, 0.15, 0.10 + i * 0.012, "triangle", true);
  });
}

function playWinChime() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime;
  playCosmicFlourish(start, 400);
  playSynthTone(start + 0.56, 1200, 0.22, 0.11, "sine", true);
}

function playScatterBell() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.02;
  playCosmicFlourish(start, 660, 0.13);
  playSynthTone(start + 0.54, 1400, 0.24, 0.14, "sine", true);
}

function playWildSignal() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  playSynthTone(start, 480, 0.12, 0.09, "sawtooth");
  playSynthTone(start + 0.10, 720, 0.13, 0.09, "sawtooth");
}

function playScatterSignal() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  playSynthTone(start, 620, 0.13, 0.11, "triangle");
  playSynthTone(start + 0.12, 930, 0.16, 0.12, "triangle", true);
}

function playExpandSound(step) {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime;
  const root  = 360 + step * 48;
  playSynthTone(start, root, 0.13, 0.10, "sawtooth");
  playSynthTone(start + 0.09, root * 1.33, 0.14, 0.09, "triangle", true);
}

function ringBell(freq, startTime, gainVal = 0.18) {
  if (!audioContext) {
    return;
  }

  [[1, gainVal], [2.756, gainVal * 0.42], [5.404, gainVal * 0.22]].forEach(([mult, g]) => {
    const osc  = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * mult, startTime);
    gain.gain.setValueAtTime(g, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.6);
    osc.start(startTime);
    osc.stop(startTime + 1.7);
  });
}

function playBigWinSound() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.02;
  ringBell(880, start, 0.22);
  ringBell(1108, start + 0.34, 0.20);
  ringBell(880,  start + 0.68, 0.22);
  ringBell(1108, start + 1.02, 0.20);
  playCosmicFlourish(start + 1.40, 660);
}

function playCheerBurst(intensity = 1) {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.01;
  const base  = 540 + 60 * intensity;
  playSynthTone(start, base, 0.12, 0.07 + 0.025 * intensity, "triangle");
  playSynthTone(start + 0.10, base * 1.25, 0.14, 0.07 + 0.025 * intensity, "triangle");
  if (intensity >= 3) {
    playSynthTone(start + 0.22, base * 1.6, 0.16, 0.08 + 0.02 * intensity, "triangle", true);
  }
}

function startFreeSpinCheerLoop() {
  if (!audioContext || state.freeSpinCheerTimer) {
    return;
  }

  playCheerBurst(1);
  state.freeSpinCheerTimer = setInterval(() => {
    playCheerBurst(1);
  }, 1700);
}

function stopFreeSpinCheerLoop() {
  if (state.freeSpinCheerTimer) {
    clearInterval(state.freeSpinCheerTimer);
    state.freeSpinCheerTimer = null;
  }
}

function triggerScatterImpact() {
  document.body.classList.add("scatter-flash");
  setTimeout(() => {
    document.body.classList.remove("scatter-flash");
  }, 950);
}

// ── Big-win classification ────────────────────────────────
function classifyBigWin(payout, bet) {
  const ratio = payout / (bet * MAX_POSSIBLE_WIN_MULT);

  if (ratio >= 0.65) {
    return { name: "LEGENDARY", tone: "legendary", cheer: 4 };
  }
  if (ratio >= 0.40) {
    return { name: "COLOSSAL",  tone: "colossal",  cheer: 3 };
  }
  if (ratio >= 0.20) {
    return { name: "MEGA",      tone: "mega",      cheer: 2 };
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
  setBackgroundMusicMode("bigwin", 2000);
  triggerBigWinFlash();
  showBanner(`${tier.name} WIN!`, 1700);
  playBigWinSound();
  playCheerBurst(tier.cheer);
  await showAnnouncement(`${tier.name} WIN ${money(payout)}!`, 1800, tier.tone);
}

// ── Reel-strip helpers ────────────────────────────────────
// Pick a random stop position on each reel strip and derive the visible 3-row window.
function createGridFromStrips() {
  const grid = Array.from({ length: ROWS }, () => Array(REELS).fill(null));

  for (let reel = 0; reel < REELS; reel += 1) {
    const strip  = REEL_STRIPS[reel];
    const stopPos = Math.floor(Math.random() * strip.length);

    for (let row = 0; row < ROWS; row += 1) {
      grid[row][reel] = strip[(stopPos + row) % strip.length];
    }
  }

  return grid;
}

// ── Reel rendering ────────────────────────────────────────
function setupReels() {
  reelsEl.innerHTML     = "";
  reelElements.length   = 0;

  for (let reel = 0; reel < REELS; reel += 1) {
    const reelEl = document.createElement("div");
    reelEl.className    = "reel";
    reelElements[reel]  = reelEl;

    mountFinalReel(reel, Array.from({ length: ROWS }, () => "CRYSTAL"));

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

  if (meta.isLabel) {
    cell.innerHTML = `<span class="sym-label ${meta.cssClass}" aria-label="${meta.name}">${meta.label}</span>`;
  } else {
    cell.innerHTML = `<span class="emoji" aria-label="${meta.name}">${meta.emoji}</span>`;
  }

  cell.classList.toggle("wild", symbol === "WILD");
  cell.classList.toggle("win", isWin);
}

function paintGrid(grid, winCoords = new Set(), scatterCoords = new Set()) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let reel = 0; reel < REELS; reel += 1) {
      const cell   = reelCells[row][reel];
      const symbol = grid[row][reel];
      renderCell(cell, symbol, winCoords.has(`${row}-${reel}`));
      cell.classList.toggle("scatter-hit", scatterCoords.has(`${row}-${reel}`));
    }
  }
}

// ── Spin animation ────────────────────────────────────────
function createSpinSymbolCell(symbol) {
  const meta = SYMBOL_META[symbol] || { emoji: symbol, name: symbol };
  const cell = document.createElement("div");
  cell.className    = "spin-symbol";
  cell.dataset.symbol = symbol;

  if (meta.isLabel) {
    cell.innerHTML = `<span class="sym-label ${meta.cssClass}" aria-label="${meta.name}">${meta.label}</span>`;
  } else {
    cell.innerHTML = `<span class="emoji" aria-label="${meta.name}">${meta.emoji}</span>`;
  }

  if (symbol === "WILD") {
    cell.classList.add("wild");
  }

  return cell;
}

function getReelStepPx(trackEl) {
  const first   = trackEl.firstElementChild;
  const height  = first ? first.getBoundingClientRect().height : 0;
  const styles  = window.getComputedStyle(trackEl);
  const gap     = parseFloat(styles.rowGap || styles.gap || "0") || 0;

  return height + gap;
}

function signalSpecialsOnReelStop(trackEl, stopIndex) {
  Array.from(trackEl.children).slice(stopIndex, stopIndex + ROWS).forEach((el) => {
    const symbol = el.dataset.symbol;
    if (symbol === "WILD") {
      el.classList.add("hit-wild");
      setTimeout(() => el.classList.remove("hit-wild"), 780);
    }
    if (symbol === "SCATTER") {
      el.classList.add("hit-scatter");
      setTimeout(() => el.classList.remove("hit-scatter"), 900);
    }
  });
}

function signalSpecialsOnFinalReel(reelIndex, columnSymbols) {
  for (let row = 0; row < ROWS; row += 1) {
    const symbol = columnSymbols[row];
    const cell   = reelCells[row]?.[reelIndex];
    if (!cell) {
      continue;
    }

    if (symbol === "WILD") {
      cell.classList.add("scatter-hit", "win");
      setTimeout(() => {
        cell.classList.remove("scatter-hit", "win");
      }, 780);
    }

    if (symbol === "SCATTER") {
      cell.classList.add("scatter-hit");
      setTimeout(() => cell.classList.remove("scatter-hit"), 900);
    }
  }
}

// Build an animation strip: random preroll symbols + target column at stopPos
function buildAnimationStrip(reelIndex, targetColumn, stopPos) {
  const allSyms  = ["GEMINI", "STAR", "PLANET", "CRYSTAL", "BAR", "SEVEN", "GEMINI", "STAR", "PLANET"];
  const total    = stopPos + ROWS + 80;
  const strip    = Array.from({ length: total }, (_, i) => {
    if (i >= stopPos && i < stopPos + ROWS) {
      return targetColumn[i - stopPos];
    }
    return allSyms[Math.floor(Math.random() * allSyms.length)];
  });

  return strip;
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

  return { trackEl, stepPx, stopPx: stopPos * stepPx };
}

function easeOutCubic(t) {
  return 1 - ((1 - t) ** 3);
}

function setTrackPhase(trackEl, phase) {
  trackEl.classList.remove("speed-fast", "speed-medium", "speed-slow");
  trackEl.classList.add(phase);
}

function animateSingleReel(trackEl, startPx, stopPx, reelIndex, stopIndex, config, onStop) {
  const { cruiseSpeed, cruiseDuration, decelDuration } = config;

  const totalDistance   = startPx - stopPx;
  const decelDistance   = cruiseSpeed * decelDuration / 3;
  const cruiseDistance  = totalDistance - decelDistance;
  const adjCruiseSpeed  = cruiseDistance / cruiseDuration;
  const totalDuration   = cruiseDuration + decelDuration;

  return new Promise((resolve) => {
    let stopSoundPlayed = false;
    const startTs = performance.now();

    function frame(now) {
      const elapsed = now - startTs;
      let position;

      if (elapsed < cruiseDuration) {
        setTrackPhase(trackEl, "speed-fast");
        position = startPx - (adjCruiseSpeed * elapsed);
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

async function spinAnimation(targetGrid) {
  const baseCruiseMs           = 1400;
  const staggerCruiseMs        = 500;
  const baseDecelMs            = 960;
  const decelStepMs            = 60;
  const scatterSuspenseDelayMs = 1000;
  const cruiseSpeed            = 1.14;
  const reelAnimations         = [];
  const animations             = [];
  const scatterReels           = [];

  // Determine which reels have scatter symbols (for suspense logic)
  for (let reel = 0; reel < REELS; reel += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (targetGrid[row][reel] === "SCATTER") {
        scatterReels.push(reel);
        break;
      }
    }
  }

  const suspenseTriggerReel = scatterReels.length >= 2 ? scatterReels[1] : -1;
  const suspenseEnabled     = scatterReels.length >= 3 && suspenseTriggerReel >= 0 && suspenseTriggerReel < REELS - 1;
  let landedScatterReels    = 0;
  let suspenseCuePlayed     = false;

  document.body.classList.remove("scatter-suspense");

  for (let reel = 0; reel < REELS; reel += 1) {
    const targetColumn  = Array.from({ length: ROWS }, (_, row) => targetGrid[row][reel]);
    const stopPos       = 28 + reel * 2;
    const suspenseExtra = suspenseEnabled && reel > suspenseTriggerReel ? scatterSuspenseDelayMs : 0;
    const cruiseDuration = baseCruiseMs + reel * staggerCruiseMs + suspenseExtra;
    const decelDuration  = baseDecelMs + reel * decelStepMs;
    const decelDistance  = cruiseSpeed * decelDuration / 3;
    const cruiseDistance = cruiseSpeed * cruiseDuration;
    const totalDistance  = cruiseDistance + decelDistance;

    const strip = buildAnimationStrip(reel, targetColumn, stopPos);
    reelAnimations[reel] = buildAnimatedReel(reel, strip, stopPos);

    const { trackEl, stepPx, stopPx } = reelAnimations[reel];
    const startPos = stopPos + Math.ceil(totalDistance / stepPx) + 3;
    const startPx  = startPos * stepPx;
    trackEl.style.transform  = `translateY(-${startPx}px)`;
    trackEl.style.transition = "none";

    animations.push(
      animateSingleReel(
        trackEl, startPx, stopPx, reel, stopPos,
        { cruiseSpeed, cruiseDuration, decelDuration },
        () => {
          mountFinalReel(reel, targetColumn);
          signalSpecialsOnFinalReel(reel, targetColumn);

          if (targetColumn.includes("SCATTER")) {
            landedScatterReels += 1;
          }

          if (suspenseEnabled && !suspenseCuePlayed && landedScatterReels >= 2) {
            suspenseCuePlayed = true;
            document.body.classList.add("scatter-suspense");
            setBackgroundMusicMode("suspense", scatterSuspenseDelayMs + 500);
            showBanner("2 SCATTERS! One more for free spins…", scatterSuspenseDelayMs + 400);
            playScatterSignal();
            playScatterSignal();

            for (let i = reel + 1; i < REELS; i += 1) {
              reelElements[i]?.classList.add("scatter-suspense");
            }
          }
        }
      )
    );
  }

  await Promise.all(animations);

  document.body.classList.remove("scatter-suspense");
  for (const reelEl of reelElements) {
    reelEl.classList.remove("scatter-suspense");
  }

  updateBackgroundMusicForState();
}

// ── Cosmic Wild expansion (free spins feature) ────────────
async function animateCosmicWilds(rawGrid, wildReels) {
  if (wildReels.length < 1) {
    state.cosmicWildReels = 0;
    return rawGrid.map((row) => [...row]);
  }

  const working = rawGrid.map((row) => [...row]);
  state.cosmicWildReels = wildReels.length;

  featureLabelEl.textContent = `Cosmic Wilds: ${wildReels.length} reel${wildReels.length > 1 ? "s" : ""}!`;

  for (let step = 0; step < wildReels.length; step += 1) {
    const reel = wildReels[step];

    playExpandSound(step + 1);
    showBanner(`Reel ${reel + 1} becomes Cosmic Wild!`, 750);

    for (let row = 0; row < ROWS; row += 1) {
      working[row][reel] = "WILD";
      const cell = reelCells[row]?.[reel];
      if (cell) {
        renderCell(cell, "WILD", false);
        cell.classList.add("wild-expand-pop");
        setTimeout(() => cell.classList.remove("wild-expand-pop"), 520);
      }
      await wait(130);
    }

    await wait(220);
  }

  if (wildReels.length === REELS) {
    showBanner("TRIPLE COSMIC WILD!", 1100);
  }

  return working;
}

function getCosmicWildCount() {
  const roll = Math.random();
  if (roll < 0.55) {
    return 1;
  }
  if (roll < 0.90) {
    return 2;
  }
  return 3;  // rare: all 3 reels
}

function getShuffledReels() {
  const list = [0, 1, 2];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// ── Game logic ────────────────────────────────────────────
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
  const candidates = ["SEVEN", "WILD", "GEMINI", "STAR", "PLANET", "CRYSTAL", "BAR"];
  let best = { symbol: null, count: 0, multiplier: 0 };

  for (const symbol of candidates) {
    const count      = countConsecutive(lineSymbols, symbol);
    const multiplier = (PAYTABLE[symbol] && PAYTABLE[symbol][count]) || 0;

    if (multiplier > best.multiplier) {
      best = { symbol, count, multiplier };
    }
  }

  return best;
}

function evaluateGrid(grid, bet) {
  let totalWin   = 0;
  const winCoords = new Set();
  const hits      = [];

  PAYLINES.forEach((lineDef, lineIndex) => {
    const lineSymbols = lineDef.map((row, reel) => grid[row][reel]);
    const result      = evaluateLine(lineSymbols);

    if (result.multiplier > 0) {
      const lineWin = bet * result.multiplier;
      totalWin += lineWin;

      for (let reel = 0; reel < result.count; reel += 1) {
        winCoords.add(`${lineDef[reel]}-${reel}`);
      }

      hits.push({ line: lineIndex + 1, symbol: result.symbol, count: result.count, lineWin });
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

function describeWinEvent(payout, bet) {
  const totalMult = Math.round((payout.totalWin / bet) * 10) / 10;
  const topHits   = payout.hits.slice(0, 2).map((hit) => {
    const name = SYMBOL_META[hit.symbol]?.name || hit.symbol;
    return `Line ${hit.line}: 3× ${name} pays ${money(hit.lineWin)}`;
  });

  const details = topHits.length > 0 ? ` ${topHits.join(". ")}.` : "";
  return `Win ${money(payout.totalWin)} (${totalMult}× bet).${details}`;
}

function startFreeSpins() {
  const wasActive = state.freeSpinSessionActive;
  state.freeSpinsRemaining += FREE_SPINS_AWARD;

  if (!wasActive) {
    state.freeSpinSessionActive = true;
    document.body.classList.add("free-spins-active");
    state.freeSpinIndex        = 0;
    state.freeSpinsTotalWin    = 0;
    state.cosmicWildReels      = 0;
    playBigWinSound();
    setBackgroundMusicMode("free");
    showBanner(`${FREE_SPINS_AWARD} FREE SPINS!`, 2400);
    setMessage(`Scatter bonus! ${FREE_SPINS_AWARD} free spins with guaranteed Cosmic Wild reels!`);
    startFreeSpinCheerLoop();
  } else {
    playBigWinSound();
    setBackgroundMusicMode("free", 1500);
    showBanner(`RETRIGGER +${FREE_SPINS_AWARD} SPINS!`, 2400);
    setMessage(`Scatter retrigger! +${FREE_SPINS_AWARD} free spins.`);
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

// ── Core spin function ────────────────────────────────────
async function spin() {
  if (state.spinning) {
    return;
  }

  initAudio();

  const inFreeSpins = state.freeSpinSessionActive && state.freeSpinsRemaining > 0;
  const bet         = getBet();

  if (!inFreeSpins && state.balance < bet) {
    setMessage("Not enough balance. Lower your bet.");
    return;
  }

  state.spinning = true;
  setButtonsDisabled(true);
  updateBackgroundMusicForState();

  if (inFreeSpins) {
    state.freeSpinsRemaining -= 1;
    state.freeSpinIndex      += 1;
  } else {
    state.balance -= bet;
    featureLabelEl.textContent = "Base Spin";
    setMessage("Launching into the cosmos…");
  }

  state.win = 0;
  updateHud();

  const rawGrid = createGridFromStrips();

  // During free spins: guarantee N cosmic wild reels (fill them with WILD if needed)
  if (inFreeSpins) {
    const numWilds       = getCosmicWildCount();
    const reelOrder      = getShuffledReels();
    const cosmicReels    = reelOrder.slice(0, numWilds);

    cosmicReels.forEach((reel) => {
      if (!rawGrid.some((row) => row[reel] === "WILD")) {
        rawGrid[Math.floor(Math.random() * ROWS)][reel] = "WILD";
      }
    });

    featureLabelEl.textContent = `Free Spin ${state.freeSpinIndex} · ${numWilds}× Cosmic Wild`;
    setMessage(`Free spin ${state.freeSpinIndex} — ${numWilds} reel${numWilds > 1 ? "s" : ""} guaranteed Cosmic Wild! Session total: ${money(state.freeSpinsTotalWin)}.`);
  }

  startSpinSound();
  await spinAnimation(rawGrid);
  stopSpinSound();

  const scatterResult = countScatters(rawGrid);
  const scatterCount  = scatterResult.total;

  let outcomeGrid  = rawGrid;
  let expandedText = "";

  // During free spins: expand any WILD-bearing reels to full Cosmic Wild reels
  if (inFreeSpins) {
    const wildReels = [];
    for (let reel = 0; reel < REELS; reel += 1) {
      if (rawGrid.some((row) => row[reel] === "WILD")) {
        wildReels.push(reel);
      }
    }

    outcomeGrid  = await animateCosmicWilds(rawGrid, wildReels);
    expandedText = ` Cosmic Wild reels: ${wildReels.map((r) => r + 1).join(", ")}.`;
  }

  const payout = evaluateGrid(outcomeGrid, bet);

  state.grid    = outcomeGrid;
  state.win     = payout.totalWin;
  state.balance += payout.totalWin;

  paintGrid(state.grid, payout.winCoords, scatterResult.coords);
  updateHud();

  if (scatterCount >= 3) {
    triggerScatterImpact();
    playScatterBell();
    showBanner(`${scatterCount} SCATTERS!`, 1800);
    await showAnnouncement(`${scatterCount} SCATTERS!`, 1300, "bonus");
  }

  if (scatterCount >= 3 && !state.freeSpinSessionActive) {
    startFreeSpins();
    await showAnnouncement(`${FREE_SPINS_AWARD} Free Spins — Cosmic Wilds Await!`, 2900, "bonus");
  } else if (scatterCount >= 3 && state.freeSpinSessionActive) {
    startFreeSpins();
    showAnnouncement(`Retrigger! +${FREE_SPINS_AWARD} Free Spins!`, 1900, "bonus");
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
    showBanner(`WIN ${money(payout.totalWin)}`, 1500);
  } else if (state.freeSpinSessionActive) {
    setMessage(`No payline win. Session total ${money(state.freeSpinsTotalWin)}. ${state.freeSpinsRemaining} free spins remain.${expandedText}`);
  } else {
    setMessage("No payline win this spin. The cosmos holds more surprises — spin again.");
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
    featureLabelEl.textContent = `Free Spins (${state.freeSpinsRemaining} left)`;
    setButtonsDisabled(true);
  } else if (state.freeSpinSessionActive && state.freeSpinsRemaining === 0) {
    stopFreeSpinCheerLoop();
    await showAnnouncement(`Free Spins Complete! Session Win ${money(state.freeSpinsTotalWin)}`, 2700, "summary");
    playCheerBurst(3);
    playBigWinSound();
    setMessage(`Free spins complete. Session win: ${money(state.freeSpinsTotalWin)}.`);
    featureLabelEl.textContent   = "Ready";
    state.freeSpinSessionActive  = false;
    document.body.classList.remove("free-spins-active");
    state.freeSpinIndex          = 0;
    state.cosmicWildReels        = 0;
    setButtonsDisabled(false);
  } else {
    featureLabelEl.textContent = "Ready";
    state.freeSpinIndex        = 0;
    setButtonsDisabled(false);
  }

  state.spinning = false;
  updateBackgroundMusicForState();

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

// ── Event listeners ──────────────────────────────────────
spinBtn.addEventListener("click", spin);
betUpBtn.addEventListener("click", () => changeBet(1));
betDownBtn.addEventListener("click", () => changeBet(-1));

// ── Initialise ───────────────────────────────────────────
state.grid = createGridFromStrips();
setupReels();
paintGrid(state.grid);
updateHud();

// ── Starfield canvas background ──────────────────────────
(function initStarfield() {
  const canvas = document.getElementById("space-bg");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");

  const STAR_COUNT   = 180;
  const NEBULA_COUNT = 3;

  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x:     Math.random(),
    y:     Math.random(),
    r:     0.3 + Math.random() * 1.6,
    alpha: 0.2 + Math.random() * 0.7,
    twinkleSpeed: 0.004 + Math.random() * 0.012,
    twinklePhase: Math.random() * Math.PI * 2
  }));

  // Slow-drifting "nebula" blobs
  const nebulas = Array.from({ length: NEBULA_COUNT }, (_, i) => ({
    x:    0.2 + i * 0.3,
    y:    0.2 + Math.random() * 0.6,
    rx:   0.15 + Math.random() * 0.2,
    ry:   0.10 + Math.random() * 0.15,
    hue:  [200, 260, 180][i],
    alpha: 0.025 + Math.random() * 0.025,
    dx:   (Math.random() - 0.5) * 0.00006,
    dy:   (Math.random() - 0.5) * 0.00004
  }));

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  let frame = 0;

  function loop() {
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Deep space gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0,    "#020208");
    bg.addColorStop(0.30, "#06061a");
    bg.addColorStop(0.65, "#080828");
    bg.addColorStop(1,    "#030310");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Nebula blobs
    for (const neb of nebulas) {
      neb.x += neb.dx;
      neb.y += neb.dy;
      if (neb.x < -0.2) { neb.x = 1.1; }
      if (neb.x >  1.1) { neb.x = -0.1; }
      if (neb.y < -0.1) { neb.y = 1.0; }
      if (neb.y >  1.0) { neb.y = -0.05; }

      const grad = ctx.createRadialGradient(
        neb.x * w, neb.y * h, 0,
        neb.x * w, neb.y * h, Math.max(neb.rx * w, neb.ry * h)
      );
      grad.addColorStop(0,   `hsla(${neb.hue}, 80%, 55%, ${neb.alpha})`);
      grad.addColorStop(0.5, `hsla(${neb.hue}, 60%, 35%, ${neb.alpha * 0.4})`);
      grad.addColorStop(1,   `hsla(${neb.hue}, 40%, 20%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(neb.x * w, neb.y * h, neb.rx * w, neb.ry * h, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stars with twinkling
    frame += 1;
    for (const star of stars) {
      star.twinklePhase += star.twinkleSpeed;
      const brightness = 0.55 + 0.45 * Math.sin(star.twinklePhase);
      const alpha      = star.alpha * brightness;

      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210, 235, 255, ${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(loop);
  }

  loop();
}());

// ── Welcome overlay ──────────────────────────────────────
const welcomeOverlayEl = document.getElementById("welcome-overlay");
const welcomeStartBtn  = document.getElementById("welcome-btn");

if (welcomeOverlayEl && welcomeStartBtn) {
  welcomeStartBtn.addEventListener("click", () => {
    initAudio();
    updateBackgroundMusicForState();
    welcomeOverlayEl.classList.add("hide");
    welcomeOverlayEl.addEventListener("transitionend", () => welcomeOverlayEl.remove(), { once: true });
  });
}
