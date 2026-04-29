const ROWS = 5;
const REELS = 5;

const BET_LEVELS = [5, 10, 20, 40, 80];
const SYMBOL_META = {
  DANCER: { emoji: "💃", name: "DANCER" },
  BULL: { emoji: "🐂", name: "BULL" },
  ROSE: { emoji: "🌹", name: "ROSE" },
  HAT: { emoji: "🎩", name: "HAT" },
  BOOT: { emoji: "👢", name: "BOOT" },
  MOON: { emoji: "🌙", name: "MOON" },
  SCATTER: { emoji: "🎪", name: "SCATTER" },
  WILD: { emoji: "🟥", name: "WILD" }
};

const SYMBOL_POOL_BASE = [
  "DANCER", "DANCER", "DANCER",
  "BULL", "BULL", "BULL", "BULL",
  "ROSE", "ROSE", "ROSE", "ROSE", "ROSE",
  "HAT", "HAT", "HAT", "HAT", "HAT",
  "BOOT", "BOOT", "BOOT", "BOOT", "BOOT", "BOOT",
  "MOON", "MOON", "MOON", "MOON", "MOON", "MOON", "MOON",
  "WILD",
  "SCATTER"
];

const SYMBOL_POOL_FREE = [
  "DANCER", "DANCER", "DANCER", "DANCER",
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
  DANCER: { 3: 5, 4: 12, 5: 28 },
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
  freeSpinCheerTimer: null,
  bgmTimer: null,
  bgmMode: "idle",
  bgmStep: 0,
  bgmModeExpiresAt: 0,
  bgmTrumpetBusyUntil: 0
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
let activeTrumpetOsc = null;
let activeTrumpetVibrato = null;
let activeTrumpetMasterGain = null;
let trumpetReverbInput = null;
let trumpetSynth = null;

const BGM_TRUMPET_VOLUME = 0.68;
const BGM_DRUM_VOLUME = 0.72;

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

  if (!trumpetReverbInput) {
    const reverbInput = audioContext.createGain();
    const delayA = audioContext.createDelay(1.5);
    const delayB = audioContext.createDelay(1.5);
    const feedbackA = audioContext.createGain();
    const feedbackB = audioContext.createGain();
    const tone = audioContext.createBiquadFilter();
    const wet = audioContext.createGain();

    delayA.delayTime.value = 0.14;
    delayB.delayTime.value = 0.27;
    feedbackA.gain.value = 0.32;
    feedbackB.gain.value = 0.24;
    tone.type = "lowpass";
    tone.frequency.value = 4200;
    wet.gain.value = 0.13;

    reverbInput.connect(delayA);
    reverbInput.connect(delayB);
    delayA.connect(feedbackA);
    feedbackA.connect(delayA);
    delayB.connect(feedbackB);
    feedbackB.connect(delayB);
    delayA.connect(tone);
    delayB.connect(tone);
    tone.connect(wet);
    wet.connect(audioContext.destination);

    trumpetReverbInput = reverbInput;
  }

  updateBackgroundMusicForState();
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

function playTrumpetNote(startTime, frequency, duration, gainPeak = 0.045, articulation = "tenuto") {
  if (!audioContext) {
    return;
  }

  const ensureTrumpetSynth = () => {
    if (trumpetSynth) {
      return trumpetSynth;
    }

    const highpass = audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 170;

    const presence = audioContext.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = 1650;
    presence.Q.value = 1.2;
    presence.gain.value = 4.5;

    const body = audioContext.createBiquadFilter();
    body.type = "lowpass";
    body.frequency.value = 4700;
    body.Q.value = 0.75;

    const master = audioContext.createGain();
    master.gain.value = 0.0001;

    highpass.connect(presence);
    presence.connect(body);
    body.connect(master);
    master.connect(audioContext.destination);

    if (trumpetReverbInput) {
      const send = audioContext.createGain();
      send.gain.value = 0.09;
      master.connect(send);
      send.connect(trumpetReverbInput);
    }

    const vibrato = audioContext.createOscillator();
    const vibratoDepth = audioContext.createGain();
    vibrato.type = "sine";
    vibrato.frequency.value = 4.8;
    vibratoDepth.gain.value = 1.0;
    vibrato.connect(vibratoDepth);

    const osc = audioContext.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 440;
    vibratoDepth.connect(osc.frequency);
    osc.connect(highpass);

    const now = audioContext.currentTime + 0.001;
    vibrato.start(now);
    osc.start(now);

    trumpetSynth = {
      osc,
      vibrato,
      vibratoDepth,
      master,
      currentFreq: 440
    };

    activeTrumpetOsc = osc;
    activeTrumpetVibrato = vibrato;
    activeTrumpetMasterGain = master;

    return trumpetSynth;
  };

  const synth = ensureTrumpetSynth();
  const start = Math.max(startTime, audioContext.currentTime + 0.001);
  const isStaccato = articulation === "staccato";
  const isLegato = articulation === "legato" || articulation === "tenuto";
  const attack = isStaccato ? 0.018 : 0.03;
  const sustainLevel = gainPeak * (isStaccato ? 0.55 : 0.8);
  const airflowFloor = isLegato ? Math.max(0.0001, sustainLevel * 0.45) : 0.0001;
  const releaseStart = start + Math.max(0.04, duration * (isStaccato ? 0.55 : 0.9));
  const releaseEnd = releaseStart + (isStaccato ? 0.045 : 0.08);

  synth.vibratoDepth.gain.cancelScheduledValues(start);
  synth.vibratoDepth.gain.setValueAtTime(synth.vibratoDepth.gain.value, start);
  synth.vibratoDepth.gain.linearRampToValueAtTime(isStaccato ? 0.75 : 1.0, start + 0.03);

  synth.osc.frequency.cancelScheduledValues(start);
  synth.osc.frequency.setValueAtTime(Math.max(80, synth.currentFreq || 440), start);
  synth.osc.frequency.exponentialRampToValueAtTime(Math.max(80, frequency), start + (isStaccato ? 0.016 : 0.025));
  synth.currentFreq = Math.max(80, frequency);

  synth.master.gain.cancelScheduledValues(start);
  synth.master.gain.setValueAtTime(Math.max(airflowFloor, synth.master.gain.value || 0.0001), start);
  synth.master.gain.linearRampToValueAtTime(sustainLevel, start + attack);
  synth.master.gain.setValueAtTime(sustainLevel, releaseStart);
  synth.master.gain.exponentialRampToValueAtTime(isLegato ? airflowFloor : 0.0001, releaseEnd);

  activeTrumpetMasterGain = synth.master;
  activeTrumpetOsc = synth.osc;
  activeTrumpetVibrato = synth.vibrato;

  return;

}

function stopCurrentTrumpetNote(fadeSeconds = 0.03) {
  if (!audioContext) {
    return;
  }

  const now = audioContext.currentTime;

  if (activeTrumpetMasterGain) {
    activeTrumpetMasterGain.gain.cancelScheduledValues(now);
    activeTrumpetMasterGain.gain.setValueAtTime(Math.max(0.0002, activeTrumpetMasterGain.gain.value || 0.0002), now);
    activeTrumpetMasterGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
  }

  if (trumpetSynth) {
    trumpetSynth.currentFreq = trumpetSynth.currentFreq || 440;
  }
}

function playOstinatoPluck(startTime, frequency, gainPeak = 0.02) {
  if (!audioContext) {
    return;
  }

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency, startTime);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.92, startTime + 0.16);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(startTime);
  osc.stop(startTime + 0.2);
}

function playEmotionalTrumpetPhrase(startTime, notes, noteDuration = 0.72, gainPeak = 0.03) {
  if (!audioContext || !Array.isArray(notes) || notes.length === 0) {
    return;
  }

  notes.forEach((note, idx) => {
    if (!note) {
      return;
    }

    const noteStart = startTime + (idx * noteDuration * 0.86);
    const swell = gainPeak * (0.9 + (idx / Math.max(1, notes.length - 1)) * 0.25);
    playTrumpetNote(noteStart, note, noteDuration, swell, "tenuto");
  });
}

function playSpanishDrumHit(startTime, kind = "low", gainPeak = 0.045) {
  if (!audioContext) {
    return;
  }

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  if (kind === "accent") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(210, startTime);
    osc.frequency.exponentialRampToValueAtTime(122, startTime + 0.11);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(620, startTime);
    filter.Q.value = 1.1;
  } else if (kind === "mid") {
    osc.type = "square";
    osc.frequency.setValueAtTime(240, startTime);
    osc.frequency.exponentialRampToValueAtTime(170, startTime + 0.085);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(700, startTime);
    filter.Q.value = 0.85;
  } else {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(132, startTime);
    osc.frequency.exponentialRampToValueAtTime(84, startTime + 0.11);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(980, startTime);
    filter.Q.value = 0.82;
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainPeak * BGM_DRUM_VOLUME, startTime + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + (kind === "accent" ? 0.21 : 0.17));

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(startTime);
  osc.stop(startTime + (kind === "accent" ? 0.24 : 0.19));
}

function getBgmProfile(mode) {
  // Profiles use arranged parts: lead trumpet, optional harmony, and low ostinato.
  const profiles = {
    idle: {
      stepMs: 210,
      leadDur: 0.36,
      leadGain: 0.032,
      lead: [329.63, 349.23, 415.3, 440.0, 493.88, 440.0, 415.3, 349.23, 329.63, 349.23, 415.3, null],
      rhythm: [1.0, 0.5, 1.5, 0.75, 1.25, 0.5, 1.5, 1.0, 0.75, 1.25, 1.0, 0.5],
      harmony: [null, null, 261.63, null, 293.66, null, null, null],
      bass: [164.81, null, 196.0, null, 174.61, null, 164.81, null],
      phraseEvery: 16,
      phraseGain: 0.034,
      drumGain: 0.03,
      drums: ["low", null, "mid", null, "accent", null, "mid", null, "low", null, "mid", null],
      emotionalPhrases: [
        [493.88, 523.25, 587.33, 659.25],
        [523.25, 587.33, 659.25, 587.33]
      ]
    },
    spinning: {
      stepMs: 80,
      leadDur: 0.16,
      leadGain: 0.03,
      lead: [329.63, 349.23, 415.3, 440.0, 493.88, 523.25, 493.88, 440.0, 415.3, 349.23, 329.63, null],
      rhythm: [0.5, 0.5, 1.0, 0.5, 1.0, 0.75, 0.5, 1.0, 0.5, 0.75, 1.0, 0.5],
      harmony: [null, null, null, 392.0, null, null, null, 329.63],
      bass: [196.0, 196.0, 220.0, 246.94, 220.0, 196.0, 174.61, 164.81],
      drumGain: 0.035,
      drums: ["low", "mid", null, "mid", "accent", "mid", null, "mid", "low", "mid", null, "mid"]
    },
    suspense: {
      stepMs: 90,
      leadDur: 0.2,
      leadGain: 0.034,
      lead: [349.23, 415.3, 440.0, 493.88, 523.25, 587.33, 523.25, 493.88, 440.0, 415.3, 349.23, null],
      rhythm: [0.75, 0.5, 1.0, 0.5, 1.0, 0.75, 0.5, 1.0, 0.5, 0.75, 1.25, 0.5],
      harmony: [null, 261.63, null, 293.66, null, 349.23, null, 392.0],
      bass: [164.81, null, 174.61, null, 196.0, null, 220.0, null],
      phraseEvery: 12,
      phraseGain: 0.036,
      drumGain: 0.038,
      drums: ["low", null, "mid", "mid", "accent", null, "mid", "mid", "low", null, "mid", "mid"],
      emotionalPhrases: [
        [523.25, 587.33, 659.25, 587.33],
        [493.88, 523.25, 587.33, 659.25]
      ]
    },
    free: {
      stepMs: 92,
      leadDur: 0.18,
      leadGain: 0.033,
      lead: [440.0, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 440.0, 523.25, 587.33, null],
      rhythm: [0.5, 0.5, 1.0, 0.5, 1.0, 0.75, 0.5, 1.0, 0.5, 0.75, 1.25, 0.5],
      harmony: [392.0, null, 493.88, null, 523.25, null, 493.88, null],
      bass: [261.63, null, 293.66, null, 329.63, null, 293.66, null],
      phraseEvery: 10,
      phraseGain: 0.037,
      drumGain: 0.04,
      drums: ["low", "mid", "mid", null, "accent", "mid", "mid", null, "low", "mid", "mid", null],
      emotionalPhrases: [
        [587.33, 659.25, 783.99, 659.25],
        [659.25, 783.99, 880.0, 783.99]
      ]
    },
    bigwin: {
      stepMs: 78,
      leadDur: 0.18,
      leadGain: 0.038,
      lead: [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33, 659.25, null],
      rhythm: [0.5, 0.5, 0.75, 0.5, 1.0, 0.5, 0.75, 0.5, 1.0, 0.5, 1.0, 0.5],
      harmony: [523.25, 587.33, null, 659.25, null, 587.33, null, 523.25],
      bass: [329.63, null, 392.0, null, 440.0, null, 392.0, null],
      phraseEvery: 8,
      phraseGain: 0.041,
      drumGain: 0.046,
      drums: ["accent", "mid", "mid", "low", "accent", "mid", "mid", "low", "accent", "mid", "mid", "low"],
      emotionalPhrases: [
        [783.99, 880.0, 987.77, 880.0],
        [880.0, 987.77, 1046.5, 987.77]
      ]
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
  const index = state.bgmStep % profile.lead.length;
  const start = audioContext.currentTime + 0.012;
  const now = audioContext.currentTime;

  const trumpetReady = now >= state.bgmTrumpetBusyUntil;

  let noteToPlay = profile.lead[index];
  const rhythm = profile.rhythm && profile.rhythm.length > 0
    ? profile.rhythm[index % profile.rhythm.length]
    : 1;
  let durationToPlay = Math.max(0.06, profile.leadDur * rhythm);
  let gainToPlay = profile.leadGain;
  let articulation = (state.bgmMode === "spinning" || state.bgmMode === "bigwin") ? "staccato" : "legato";

  // Emotional moments are long single-note holds, not layered polyphony.
  if (trumpetReady && profile.phraseEvery && profile.emotionalPhrases && (state.bgmStep % profile.phraseEvery === 0)) {
    const phraseIndex = Math.floor(state.bgmStep / profile.phraseEvery) % profile.emotionalPhrases.length;
    const phrase = profile.emotionalPhrases[phraseIndex];
    noteToPlay = phrase && phrase.length ? phrase[0] : noteToPlay;
    const actionMode = state.bgmMode === "spinning" || state.bgmMode === "suspense" || state.bgmMode === "free" || state.bgmMode === "bigwin";
    durationToPlay = Math.max(durationToPlay, actionMode ? 0.55 : 0.85);
    gainToPlay = Math.max(gainToPlay, profile.phraseGain || (profile.leadGain * 0.8));
    articulation = "tenuto";
  }

  if (trumpetReady && noteToPlay) {
    playTrumpetNote(start, noteToPlay, durationToPlay, gainToPlay * BGM_TRUMPET_VOLUME, articulation);
    state.bgmTrumpetBusyUntil = start + (articulation === "staccato" ? durationToPlay * 0.8 : durationToPlay * 0.96);
  } else if (trumpetReady && !noteToPlay) {
    // Intentional breathing pause.
    stopCurrentTrumpetNote(0.055);
    state.bgmTrumpetBusyUntil = start + 0.08;
  }

  if (profile.drums && profile.drums.length > 0) {
    const drumHit = profile.drums[index % profile.drums.length];
    if (drumHit) {
      playSpanishDrumHit(start, drumHit, profile.drumGain || 0.035);
    }
  }

  state.bgmStep += 1;
}

function setBackgroundMusicMode(mode, holdMs = 0) {
  if (!audioContext) {
    return;
  }

  const profile = getBgmProfile(mode);
  const modeChanged = state.bgmMode !== mode;
  const needsRestart = modeChanged || !state.bgmTimer;
  state.bgmMode = mode;

  if (holdMs > 0) {
    state.bgmModeExpiresAt = performance.now() + holdMs;
  } else {
    state.bgmModeExpiresAt = 0;
  }

  if (!needsRestart) {
    return;
  }

  if (modeChanged) {
    // New stance should be audible immediately.
    stopCurrentTrumpetNote(0.035);
    state.bgmTrumpetBusyUntil = 0;
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

function ringBell(freq, startTime, gainVal = 0.18) {
  if (!audioContext) {
    return;
  }

  // Simulate a bell: fundamental + two inharmonic overtones with long decay.
  [[1, gainVal], [2.756, gainVal * 0.42], [5.404, gainVal * 0.22]].forEach(([mult, g]) => {
    const osc = audioContext.createOscillator();
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

function playBigWinRingRing() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.02;
  ringBell(880, start, 0.24);
  ringBell(1108, start + 0.33, 0.22);
  ringBell(880, start + 0.66, 0.24);
  ringBell(1108, start + 0.99, 0.22);
  playToreroFlourish(start + 1.35, 780, 0.14);
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
  setBackgroundMusicMode("bigwin", 1900);
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
  const candidates = ["DANCER", "BULL", "ROSE", "HAT", "BOOT", "MOON", "WILD"];
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

  visible.forEach((el) => {
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
    const cell = reelCells[row]?.[reelIndex];

    if (!cell) {
      continue;
    }

    if (symbol === "WILD") {
      cell.classList.add("scatter-hit");
      cell.classList.add("win");
      setTimeout(() => {
        cell.classList.remove("scatter-hit");
        cell.classList.remove("win");
      }, 780);
    }

    if (symbol === "SCATTER") {
      cell.classList.add("scatter-hit");
      setTimeout(() => cell.classList.remove("scatter-hit"), 900);
    }
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
  // Collect which reels have at least one WILD and record the origin row of each.
  const wildReels = [];
  const wildOrigin = {};
  for (let reel = 0; reel < REELS; reel += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (rawGrid[row][reel] === "WILD") {
        wildReels.push(reel);
        wildOrigin[reel] = row;
        break;
      }
    }
  }

  // Expansion only triggers when at least 2 reels contain a WILD.
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
    const originRow = wildOrigin[reel];
    const maxDist = Math.max(originRow, ROWS - 1 - originRow);

    playExpandSound(step + 1);
    showBanner(`Wild reel ${reel + 1} expands`, 700);

    // Animate outward from the wild's origin row, one distance step at a time.
    for (let dist = 0; dist <= maxDist; dist += 1) {
      const rowsToFill = dist === 0
        ? [originRow]
        : [originRow - dist, originRow + dist].filter((r) => r >= 0 && r < ROWS);

      for (const row of rowsToFill) {
        working[row][reel] = "WILD";
        const cell = reelCells[row]?.[reel];
        if (cell) {
          renderCell(cell, "WILD", false);
          cell.classList.add("wild-expand-pop");
          setTimeout(() => cell.classList.remove("wild-expand-pop"), 520);
        }
      }
      await wait(170);
    }

    await wait(230);
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
  const scatterSuspenseDelayMs = 980;
  const cruiseSpeed = 1.16;
  const reelAnimations = [];
  const animations = [];
  const scatterReels = [];

  for (let reel = 0; reel < REELS; reel += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (targetGrid[row][reel] === "SCATTER") {
        scatterReels.push(reel);
        break;
      }
    }
  }

  const suspenseTriggerReel = scatterReels.length >= 2 ? scatterReels[1] : -1;
  const suspenseEnabled = scatterReels.length >= 3 && suspenseTriggerReel >= 0 && suspenseTriggerReel < REELS - 1;
  let landedScatterReels = 0;
  let suspenseCuePlayed = false;

  document.body.classList.remove("scatter-suspense");

  for (let reel = 0; reel < REELS; reel += 1) {
    const targetColumn = Array.from({ length: ROWS }, (_, row) => targetGrid[row][reel]);
    const stopPos = 34 + reel * 2;
    const suspenseExtraMs = suspenseEnabled && reel > suspenseTriggerReel ? scatterSuspenseDelayMs : 0;
    const cruiseDuration = baseCruiseMs + reel * staggerCruiseMs + suspenseExtraMs;
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

          if (targetColumn.includes("SCATTER")) {
            landedScatterReels += 1;
          }

          if (suspenseEnabled && !suspenseCuePlayed && landedScatterReels >= 2) {
            suspenseCuePlayed = true;
            document.body.classList.add("scatter-suspense");
            setBackgroundMusicMode("suspense", scatterSuspenseDelayMs + 500);
            showBanner("2 SCATTERS! Hold for one more...", scatterSuspenseDelayMs + 400);
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
    playBigWinRingRing();
    setBackgroundMusicMode("free");
    showBanner("10 FREE SPINS!", 2200);
    setMessage("Matador bonus! 10 free spins awarded. Session total starts at 0.");
    startFreeSpinCheerLoop();
  } else {
    playBigWinRingRing();
    setBackgroundMusicMode("free", 1400);
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
  updateBackgroundMusicForState();

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
    await showAnnouncement(`¡Olé! ${FREE_SPINS_AWARD} Free Spins!`, 2800, "bonus");
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

spinBtn.addEventListener("click", spin);
betUpBtn.addEventListener("click", () => changeBet(1));
betDownBtn.addEventListener("click", () => changeBet(-1));

setupReels();
paintGrid(state.grid);
updateHud();

// Welcome overlay — dismiss on click/tap and initialise audio context.
const welcomeOverlayEl = document.getElementById("welcome-overlay");
const welcomeStartBtn = document.getElementById("welcome-btn");
if (welcomeOverlayEl && welcomeStartBtn) {
  welcomeStartBtn.addEventListener("click", () => {
    initAudio();
    updateBackgroundMusicForState();
    welcomeOverlayEl.classList.add("hide");
    welcomeOverlayEl.addEventListener("transitionend", () => welcomeOverlayEl.remove(), { once: true });
  });
}
