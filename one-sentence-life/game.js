/**
 * One Sentence Life – casual browser game
 *
 * Gameplay
 *  - Journey through 7 life stages from birth to legacy.
 *  - At each stage choose one of three options that fills in a part of
 *    your "one sentence life" summary.
 *  - At the end, read the complete single sentence that tells your story.
 */

(() => {
  "use strict";

  /* ── DOM refs ───────────────────────────────────────── */
  const titleScreen   = document.getElementById("title-screen");
  const gameScreen    = document.getElementById("game-screen");
  const resultsScreen = document.getElementById("results-screen");
  const progressBar   = document.getElementById("unity-progress-bar-full");
  const loadingLabel  = document.getElementById("loading-label");
  const btnStart      = document.getElementById("btn-start");
  const timelineFill  = document.getElementById("timeline-fill");
  const stageDots     = document.getElementById("stage-dots");
  const stageEmoji    = document.getElementById("stage-emoji");
  const stageLabelEl  = document.getElementById("stage-label");
  const sentenceEl    = document.getElementById("sentence-text");
  const promptEl      = document.getElementById("stage-prompt");
  const choicesEl     = document.getElementById("choices");
  const finalSentEl   = document.getElementById("final-sentence");
  const resultYears   = document.getElementById("result-years");
  const resultScore   = document.getElementById("result-score");
  const btnRestart    = document.getElementById("btn-restart");

  /* ── Life stages definition ─────────────────────────
   *
   * Each stage has:
   *   id       – unique key for the sentence slot
   *   emoji    – stage icon
   *   label    – display name
   *   prompt   – narrative question shown to the player
   *   choices  – array of 3 options, each:
   *     text        – what appears in the sentence (italicised fragment)
   *     label       – short category label above the choice button
   *     description – full choice text on the button
   *     score       – happiness / fulfilment points (0-100)
   *     years       – years this stage lasts (affects final age)
   * ─────────────────────────────────────────────────── */
  const STAGES = [
    {
      id: "origin",
      emoji: "🍼",
      label: "Birth",
      prompt: "Every story begins somewhere. Where did yours start?",
      choices: [
        { text: "born into a small fishing village",   label: "Humble Beginnings", description: "A quiet harbour town where everyone knew your name", score: 72, years: 0 },
        { text: "born in a sprawling city",            label: "City Child",        description: "Concrete streets, neon lights, and endless possibility", score: 68, years: 0 },
        { text: "born on a farm at the edge of a forest", label: "Country Roots", description: "Fresh air, wide skies, and seasons that actually meant something", score: 75, years: 0 },
      ],
    },
    {
      id: "childhood",
      emoji: "🧒",
      label: "Childhood",
      prompt: "The early years shape everything. How did young {name} spend them?",
      choices: [
        { text: "who spent childhood lost in books and stories",  label: "The Dreamer",   description: "Libraries were your second home; stories, your real world", score: 80, years: 12 },
        { text: "who spent childhood climbing trees and getting muddy", label: "The Explorer", description: "Every field and creek was an adventure waiting to happen", score: 77, years: 12 },
        { text: "who spent childhood taking apart machines to see how they worked", label: "The Tinkerer", description: "Broken clocks, radios, and bikes — nothing was safe from your curiosity", score: 74, years: 12 },
      ],
    },
    {
      id: "turning_point",
      emoji: "🌱",
      label: "Coming of Age",
      prompt: "Adolescence brings a first glimpse of who you might become. What defined those years?",
      choices: [
        { text: "discovered a talent for music that filled every quiet moment", label: "The Musician", description: "Chords and melodies spoke what words could not", score: 83, years: 6 },
        { text: "found in sport a language that everyone seemed to understand", label: "The Athlete",  description: "Sweat, teamwork, and the pure joy of using your body well", score: 79, years: 6 },
        { text: "learned that words on a page could change how people thought", label: "The Writer",   description: "A notebook always in your pocket, observing everything", score: 85, years: 6 },
      ],
    },
    {
      id: "career",
      emoji: "💼",
      label: "Working Life",
      prompt: "The years of work arrived. What did {name} build a life doing?",
      choices: [
        { text: "spent decades as a teacher shaping young minds",   label: "The Teacher",   description: "Chalk-dust on your sleeves and a quiet pride in every student's growth", score: 88, years: 30 },
        { text: "worked as a doctor tending to those in need",      label: "The Healer",    description: "Long nights, hard choices, and the privilege of being trusted", score: 85, years: 30 },
        { text: "built businesses that gave others a livelihood",   label: "The Builder",   description: "Risk, resilience, and the satisfaction of creating something from nothing", score: 78, years: 30 },
      ],
    },
    {
      id: "love",
      emoji: "❤️",
      label: "Love & Family",
      prompt: "Life is richer for those we choose to share it with. What was {name}'s love story?",
      choices: [
        { text: "loved deeply and raised a family full of laughter", label: "Family Life",   description: "Sunday mornings, school runs, and a home that was always full", score: 90, years: 0 },
        { text: "loved many and was loved back in different ways",   label: "Many Loves",    description: "Each person taught you something irreplaceable about yourself", score: 75, years: 0 },
        { text: "found completeness in solitude and a chosen few",  label: "Inner Circle",  description: "Deep friendships and the freedom to be entirely yourself", score: 82, years: 0 },
      ],
    },
    {
      id: "achievement",
      emoji: "🏆",
      label: "Greatest Achievement",
      prompt: "When the years were counted, what stood out most as {name}'s crowning moment?",
      choices: [
        { text: "and once crossed an ocean in a small wooden boat", label: "The Voyage",    description: "Salt, stars, and the quiet madness of trusting the sea", score: 91, years: 0 },
        { text: "and quietly published a book that outlived them",  label: "The Book",      description: "Words that found readers in countries you never visited", score: 87, years: 0 },
        { text: "and planted a forest that still stands today",     label: "The Forest",    description: "Seedlings carried by hand, a gift to futures you would never see", score: 95, years: 0 },
      ],
    },
    {
      id: "legacy",
      emoji: "🕯️",
      label: "Legacy",
      prompt: "Every life leaves a mark. How will {name} be remembered?",
      choices: [
        { text: "remembered for a kindness that was never forgotten", label: "Kindness",    description: "Small acts, consistently offered — they added up to everything", score: 93, years: 30 },
        { text: "remembered for a courage that inspired others",     label: "Courage",      description: "You stood when others couldn't, and showed them it was possible", score: 89, years: 30 },
        { text: "remembered for a joy that was impossible to ignore", label: "Joy",         description: "The room always felt different when you walked in", score: 92, years: 30 },
      ],
    },
  ];

  /* ── Name pool (chosen randomly each game) ────────── */
  const FIRST_NAMES = [
    "Ada", "Eli", "Rosa", "Sam", "Nora", "Leo", "Iris", "Finn",
    "Mila", "Theo", "Clara", "Hugo", "Zara", "Otto", "Vera", "Arlo",
  ];
  const LAST_NAMES = [
    "Rivers", "Stone", "Hale", "Marsh", "Bell", "Cross", "Wood",
    "Crane", "Frost", "Vale", "Wick", "Lane", "Quinn", "Swift",
  ];

  /* ── State ──────────────────────────────────────────── */
  let stageIndex = 0;
  let totalScore = 0;
  let totalYears = 0;
  let firstName  = "";
  let lastName   = "";
  /** Map of stage id → chosen text fragment */
  const chosen   = {};

  /* ── Boot ───────────────────────────────────────────── */
  simulateLoading();
  btnStart.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);

  /* ── Loading animation ──────────────────────────────── */
  function simulateLoading() {
    const messages = ["Loading…", "Preparing your story…", "Setting the stage…", "Ready."];
    let pct = 0;
    let msgIdx = 0;
    const iv = setInterval(() => {
      pct += 1.2 + Math.random() * 1.8;
      if (pct >= 100) {
        pct = 100;
        clearInterval(iv);
        progressBar.style.width = "100%";
        loadingLabel.textContent = "Ready.";
        setTimeout(() => { btnStart.style.display = "block"; }, 400);
      } else {
        const nextMsg = Math.floor((pct / 100) * messages.length);
        if (nextMsg !== msgIdx && nextMsg < messages.length) {
          msgIdx = nextMsg;
          loadingLabel.textContent = messages[msgIdx];
        }
      }
      progressBar.style.width = pct + "%";
    }, 40);
  }

  /* ── Start / Restart ────────────────────────────────── */
  function startGame() {
    stageIndex = 0;
    totalScore = 0;
    totalYears = 0;
    Object.keys(chosen).forEach(k => delete chosen[k]);

    firstName = pick(FIRST_NAMES);
    lastName  = pick(LAST_NAMES);

    // Build timeline dots
    stageDots.innerHTML = STAGES.map(() =>
      `<div class="stage-dot"></div>`
    ).join("");

    showScreen(gameScreen);
    showStage();
  }

  /* ── Stage rendering ────────────────────────────────── */
  function showStage() {
    const stage = STAGES[stageIndex];

    // Timeline progress
    const pct = (stageIndex / STAGES.length) * 100;
    timelineFill.style.width = pct + "%";

    // Update dots
    const dots = stageDots.querySelectorAll(".stage-dot");
    dots.forEach((d, i) => {
      d.className = "stage-dot" + (i < stageIndex ? " done" : i === stageIndex ? " active" : "");
    });

    stageEmoji.textContent = stage.emoji;
    stageLabelEl.textContent = stage.label;
    promptEl.textContent = stage.prompt.replace(/{name}/g, firstName);

    renderSentence();
    renderChoices(stage);
  }

  /* ── Sentence renderer ──────────────────────────────── */
  function renderSentence() {
    const parts = buildSentenceParts();
    sentenceEl.innerHTML = parts.join(" ");
  }

  function buildSentenceParts() {
    const name = `<span class="sentence-filled">${firstName} ${lastName}</span>`;
    const parts = [name + ","];

    const slot = id => {
      if (chosen[id]) {
        return `<span class="sentence-filled">${chosen[id]}</span>`;
      }
      return `<span class="sentence-blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
    };

    parts.push(slot("origin") + ",");
    parts.push(slot("childhood") + ",");
    parts.push(slot("turning_point") + ",");
    parts.push(slot("career") + ",");
    parts.push(slot("love") + ",");
    parts.push(slot("achievement") + ",");
    parts.push(slot("legacy") + ".");

    return parts;
  }

  /* ── Choice rendering ───────────────────────────────── */
  function renderChoices(stage) {
    choicesEl.innerHTML = "";
    stage.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn fade-in";
      btn.style.animationDelay = (idx * 0.08) + "s";
      btn.style.opacity = "0";
      btn.innerHTML = `
        <span class="choice-label">${choice.label}</span>
        <span class="choice-text">${choice.description}</span>
      `;
      btn.addEventListener("click", () => onChoose(stage, choice));
      choicesEl.appendChild(btn);
    });
  }

  /* ── Choice handler ─────────────────────────────────── */
  function onChoose(stage, choice) {
    chosen[stage.id] = choice.text;
    totalScore += choice.score;
    totalYears += choice.years;

    stageIndex += 1;

    if (stageIndex >= STAGES.length) {
      finishGame();
    } else {
      renderSentence();
      showStage();
    }
  }

  /* ── Finish ─────────────────────────────────────────── */
  function finishGame() {
    // Build the full final sentence
    const parts = buildSentenceParts()
      .map(p => {
        // Strip HTML tags for a clean plain-text reading, then re-wrap
        const tmp = document.createElement("div");
        tmp.innerHTML = p;
        return tmp.textContent;
      })
      .join(" ")
      .replace(/  +/g, " ")
      .trim();

    // Render with styled fragments
    const styledParts = buildSentenceParts();
    finalSentEl.innerHTML = styledParts.join(" ");

    const avgScore = Math.round(totalScore / STAGES.length);
    const age = 18 + totalYears; // base adult age + career + legacy years

    resultYears.textContent = `Lived to age ${age}`;
    resultScore.textContent = `Fulfilment ${avgScore} / 100`;

    // Timeline full at end
    timelineFill.style.width = "100%";

    showScreen(resultsScreen);
  }

  /* ── Utilities ──────────────────────────────────────── */
  function showScreen(el) {
    [titleScreen, gameScreen, resultsScreen].forEach(s => s.classList.remove("active"));
    el.classList.add("active");
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

})();
