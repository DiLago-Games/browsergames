const ROWS = 3;
const REELS = 5;

const BET_LEVELS = [5, 10, 20, 40, 80];
const SYMBOL_POOL = [
  "BULL",
  "BULL",
  "BULL",
  "ROSE",
  "ROSE",
  "HAT",
  "HAT",
  "BOOT",
  "BOOT",
  "MOON",
  "MOON",
  "MOON",
  "WILD"
];

const PAYLINES = [
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0]
];

const PAYTABLE = {
  BULL: { 3: 10, 4: 25, 5: 60 },
  ROSE: { 3: 8, 4: 20, 5: 40 },
  HAT: { 3: 6, 4: 15, 5: 30 },
  BOOT: { 3: 5, 4: 12, 5: 24 },
  MOON: { 3: 4, 4: 10, 5: 20 },
  WILD: { 3: 15, 4: 35, 5: 120 }
};

const BIG_WIN_MULTIPLIER = 25;

const state = {
  balance: 500,
  betIndex: 1,
  win: 0,
  spinning: false,
  grid: createRandomGrid()
};

const reelsEl = document.getElementById("reels");
const balanceEl = document.getElementById("balance");
const betEl = document.getElementById("bet");
const winEl = document.getElementById("win");
const featureLabelEl = document.getElementById("feature-label");
const messageBoxEl = document.getElementById("message-box");

const spinBtn = document.getElementById("spin");
const betUpBtn = document.getElementById("bet-up");
const betDownBtn = document.getElementById("bet-down");

const reelCells = [];
let audioContext = null;

function getBet() {
  return BET_LEVELS[state.betIndex];
}

function randomSymbol() {
  return SYMBOL_POOL[Math.floor(Math.random() * SYMBOL_POOL.length)];
}

function createRandomGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: REELS }, () => randomSymbol())
  );
}

function setupReels() {
  reelsEl.innerHTML = "";

  for (let reel = 0; reel < REELS; reel += 1) {
    const reelEl = document.createElement("div");
    reelEl.className = "reel";

    for (let row = 0; row < ROWS; row += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      reelEl.appendChild(cell);

      if (!reelCells[row]) {
        reelCells[row] = [];
      }
      reelCells[row][reel] = cell;
    }

    reelsEl.appendChild(reelEl);
  }
}

function paintGrid(grid, winningCoordinates = new Set()) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let reel = 0; reel < REELS; reel += 1) {
      const cell = reelCells[row][reel];
      const symbol = grid[row][reel];

      cell.textContent = symbol;
      cell.classList.toggle("wild", symbol === "WILD");
      cell.classList.toggle("win", winningCoordinates.has(`${row}-${reel}`));
    }
  }
}

function setMessage(text) {
  messageBoxEl.textContent = text;
}

function updateHud() {
  balanceEl.textContent = String(state.balance);
  betEl.textContent = String(getBet());
  winEl.textContent = String(state.win);
}

function setButtonsDisabled(disabled) {
  spinBtn.disabled = disabled;
  betUpBtn.disabled = disabled;
  betDownBtn.disabled = disabled;
}

function countConsecutive(symbols, targetSymbol) {
  let count = 0;

  for (const symbol of symbols) {
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

function applyExpandingWilds(grid) {
  const expandedReels = [];
  const nextGrid = grid.map((row) => [...row]);

  for (let reel = 0; reel < REELS; reel += 1) {
    const hasWild = nextGrid.some((row) => row[reel] === "WILD");

    if (hasWild) {
      expandedReels.push(reel + 1);
      for (let row = 0; row < ROWS; row += 1) {
        nextGrid[row][reel] = "WILD";
      }
    }
  }

  return { grid: nextGrid, expandedReels };
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function spinAnimation() {
  const spinCells = reelCells.flat();
  spinCells.forEach((cell) => cell.classList.add("spin-blur"));

  for (let tick = 0; tick < 12; tick += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let reel = 0; reel < REELS; reel += 1) {
        reelCells[row][reel].textContent = randomSymbol();
      }
    }
    await wait(70);
  }

  spinCells.forEach((cell) => cell.classList.remove("spin-blur"));
}

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function ringTone(startTime, frequency) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "triangle";
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(startTime);
  osc.stop(startTime + 0.37);
}

function playBigWinRingRing() {
  if (!audioContext) {
    return;
  }

  const start = audioContext.currentTime + 0.02;
  // Three clear "ring-ring" bell pairs.
  ringTone(start, 1174.66);
  ringTone(start + 0.22, 1318.51);
  ringTone(start + 0.55, 1174.66);
  ringTone(start + 0.78, 1318.51);
  ringTone(start + 1.1, 1174.66);
  ringTone(start + 1.33, 1318.51);
}

async function spin() {
  if (state.spinning) {
    return;
  }

  initAudio();

  const bet = getBet();

  if (state.balance < bet) {
    setMessage("Not enough balance. Lower your bet.");
    return;
  }

  state.spinning = true;
  setButtonsDisabled(true);
  state.balance -= bet;
  state.win = 0;
  featureLabelEl.textContent = "Spinning";
  updateHud();
  setMessage("The crowd is roaring...");

  await spinAnimation();

  const rawGrid = createRandomGrid();
  const featureResult = applyExpandingWilds(rawGrid);
  const payout = evaluateGrid(featureResult.grid, bet);

  state.grid = featureResult.grid;
  state.win = payout.totalWin;
  state.balance += payout.totalWin;

  paintGrid(state.grid, payout.winCoords);
  updateHud();

  if (featureResult.expandedReels.length > 0) {
    featureLabelEl.textContent = `Toro Charge on reel ${featureResult.expandedReels.join(", ")}`;
  } else {
    featureLabelEl.textContent = "Ready";
  }

  if (payout.totalWin > 0) {
    const lineSummary = payout.hits
      .slice(0, 3)
      .map((hit) => `L${hit.line} ${hit.symbol}x${hit.count}`)
      .join(" | ");

    setMessage(`Win ${payout.totalWin}! ${lineSummary}`);
  } else {
    setMessage("No hit this spin. Hold your nerve and spin again.");
  }

  if (payout.totalWin >= bet * BIG_WIN_MULTIPLIER) {
    setMessage(`BIG WIN ${payout.totalWin}! Ring-ring!`);
    playBigWinRingRing();
  }

  state.spinning = false;
  setButtonsDisabled(false);
}

function changeBet(delta) {
  if (state.spinning) {
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
