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
  const scenarioScreen = document.getElementById("scenario-screen");
  const progressBar   = document.getElementById("unity-progress-bar-full");
  const loadingLabel  = document.getElementById("loading-label");
  const btnStart      = document.getElementById("btn-start");
  const scenariosContainer = document.getElementById("scenarios-container");
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

  /* ── Multiple Scenarios with Branching Paths ────────
   *
   * Each scenario represents a different life archetype.
   * Stages can branch based on previous choices using "nextStageIds".
   * A choice can specify which next stage to go to, allowing non-linear paths.
   * ─────────────────────────────────────────────────── */
  
  const SCENARIOS = [
    /* ════════════════════════════════════════════════════
       SCENARIO 1: THE CLASSIC PATH
       ════════════════════════════════════════════════════ */
    {
      id: "classic",
      title: "The Classic Path",
      description: "A traditional journey through life's major milestones",
      stages: [
        {
          id: "origin",
          emoji: "🍼",
          label: "Birth",
          prompt: "Every story begins somewhere. Where did yours start?",
          choices: [
            { text: "born into a small fishing village", label: "Humble Beginnings", description: "A quiet harbour town where everyone knew your name", score: 72, years: 0, nextStageId: "childhood" },
            { text: "born in a sprawling city", label: "City Child", description: "Concrete streets, neon lights, and endless possibility", score: 68, years: 0, nextStageId: "childhood" },
            { text: "born on a farm at the edge of a forest", label: "Country Roots", description: "Fresh air, wide skies, and seasons that actually meant something", score: 75, years: 0, nextStageId: "childhood" },
          ],
        },
        {
          id: "childhood",
          emoji: "🧒",
          label: "Childhood",
          prompt: "The early years shape everything. How did young {name} spend them?",
          choices: [
            { text: "who spent childhood lost in books and stories", label: "The Dreamer", description: "Libraries were your second home; stories, your real world", score: 80, years: 12, nextStageId: "turning_point" },
            { text: "who spent childhood climbing trees and getting muddy", label: "The Explorer", description: "Every field and creek was an adventure waiting to happen", score: 77, years: 12, nextStageId: "turning_point" },
            { text: "who spent childhood taking apart machines to see how they worked", label: "The Tinkerer", description: "Broken clocks, radios, and bikes — nothing was safe from your curiosity", score: 74, years: 12, nextStageId: "turning_point" },
          ],
        },
        {
          id: "turning_point",
          emoji: "🌱",
          label: "Coming of Age",
          prompt: "Adolescence brings a first glimpse of who you might become. What defined those years?",
          choices: [
            { text: "discovered a talent for music that filled every quiet moment", label: "The Musician", description: "Chords and melodies spoke what words could not", score: 83, years: 6, nextStageId: "career" },
            { text: "found in sport a language that everyone seemed to understand", label: "The Athlete", description: "Sweat, teamwork, and the pure joy of using your body well", score: 79, years: 6, nextStageId: "career" },
            { text: "learned that words on a page could change how people thought", label: "The Writer", description: "A notebook always in your pocket, observing everything", score: 85, years: 6, nextStageId: "career" },
          ],
        },
        {
          id: "career",
          emoji: "💼",
          label: "Working Life",
          prompt: "The years of work arrived. What did {name} build a life doing?",
          choices: [
            { text: "spent decades as a teacher shaping young minds", label: "The Teacher", description: "Chalk-dust on your sleeves and a quiet pride in every student's growth", score: 88, years: 30, nextStageId: "love" },
            { text: "worked as a doctor tending to those in need", label: "The Healer", description: "Long nights, hard choices, and the privilege of being trusted", score: 85, years: 30, nextStageId: "love" },
            { text: "built businesses that gave others a livelihood", label: "The Builder", description: "Risk, resilience, and the satisfaction of creating something from nothing", score: 78, years: 30, nextStageId: "love" },
          ],
        },
        {
          id: "love",
          emoji: "❤️",
          label: "Love & Family",
          prompt: "Life is richer for those we choose to share it with. What was {name}'s love story?",
          choices: [
            { text: "loved deeply and raised a family full of laughter", label: "Family Life", description: "Sunday mornings, school runs, and a home that was always full", score: 90, years: 0, nextStageId: "achievement" },
            { text: "loved many and was loved back in different ways", label: "Many Loves", description: "Each person taught you something irreplaceable about yourself", score: 75, years: 0, nextStageId: "achievement" },
            { text: "found completeness in solitude and a chosen few", label: "Inner Circle", description: "Deep friendships and the freedom to be entirely yourself", score: 82, years: 0, nextStageId: "achievement" },
          ],
        },
        {
          id: "achievement",
          emoji: "🏆",
          label: "Greatest Achievement",
          prompt: "When the years were counted, what stood out most as {name}'s crowning moment?",
          choices: [
            { text: "and once crossed an ocean in a small wooden boat", label: "The Voyage", description: "Salt, stars, and the quiet madness of trusting the sea", score: 91, years: 0, nextStageId: "legacy" },
            { text: "and quietly published a book that outlived them", label: "The Book", description: "Words that found readers in countries you never visited", score: 87, years: 0, nextStageId: "legacy" },
            { text: "and planted a forest that still stands today", label: "The Forest", description: "Seedlings carried by hand, a gift to futures you would never see", score: 95, years: 0, nextStageId: "legacy" },
          ],
        },
        {
          id: "legacy",
          emoji: "🕯️",
          label: "Legacy",
          prompt: "Every life leaves a mark. How will {name} be remembered?",
          choices: [
            { text: "remembered for a kindness that was never forgotten", label: "Kindness", description: "Small acts, consistently offered — they added up to everything", score: 93, years: 30, nextStageId: null },
            { text: "remembered for a courage that inspired others", label: "Courage", description: "You stood when others couldn't, and showed them it was possible", score: 89, years: 30, nextStageId: null },
            { text: "remembered for a joy that was impossible to ignore", label: "Joy", description: "The room always felt different when you walked in", score: 92, years: 30, nextStageId: null },
          ],
        },
      ],
    },

    /* ════════════════════════════════════════════════════
       SCENARIO 2: THE ARTIST'S REBELLION
       A path for the creatively driven with branching choices
       ════════════════════════════════════════════════════ */
    {
      id: "artist",
      title: "The Artist's Rebellion",
      description: "A bohemian journey of self-expression and creative chaos",
      stages: [
        {
          id: "art_birth",
          emoji: "🎨",
          label: "Artistic Birth",
          prompt: "Where was your spirit born?",
          choices: [
            { text: "born in a bustling artsy district full of galleries and late-night cafés", label: "Urban Canvas", description: "Surrounded by other dreamers and rebels from day one", score: 85, years: 0, nextStageId: "art_medium" },
            { text: "born in a quiet corner of the world where art was unheard of", label: "Hidden Spark", description: "Art found you when no one else could see it", score: 82, years: 0, nextStageId: "art_medium" },
          ],
        },
        {
          id: "art_medium",
          emoji: "🖌️",
          label: "Finding Your Medium",
          prompt: "What became your weapon of expression?",
          choices: [
            { text: "obsessed over painting until your fingers were permanently stained", label: "Painter", description: "Every canvas was a scream, every color a confession", score: 87, years: 8, nextStageId: "art_struggle" },
            { text: "poured your soul into music that echoed through empty rooms", label: "Musician", description: "Notes became your language when words failed", score: 89, years: 8, nextStageId: "art_struggle" },
            { text: "captured moments with a lens that nobody else could see", label: "Photographer", description: "The world revealed its secrets through your viewfinder", score: 84, years: 8, nextStageId: "art_struggle" },
          ],
        },
        {
          id: "art_struggle",
          emoji: "😤",
          label: "The Struggle Years",
          prompt: "How did you survive when nobody understood?",
          choices: [
            { text: "worked odd jobs by day and created art in secret by night", label: "Night Creator", description: "The day job was a prison, the night was freedom", score: 88, years: 15, nextStageId: "art_recognition" },
            { text: "refused compromise and lived hand-to-mouth for your vision", label: "Idealist", description: "Hungry but unbroken, pure but desperate", score: 91, years: 15, nextStageId: "art_recognition" },
            { text: "found wealthy patrons who believed in your impossible dream", label: "Fortunate", description: "Lucky enough to be discovered before you broke", score: 79, years: 15, nextStageId: "art_recognition" },
          ],
        },
        {
          id: "art_recognition",
          emoji: "⭐",
          label: "Recognition or Obscurity?",
          prompt: "Eventually, the world had to listen. Or did it?",
          choices: [
            { text: "became celebrated, though you never believed you deserved it", label: "Reluctant Fame", description: "Success felt like a disguise that didn't quite fit", score: 86, years: 0, nextStageId: "art_ending" },
            { text: "remained unknown but created your most honest work anyway", label: "Unsung", description: "The absence of applause freed you completely", score: 92, years: 0, nextStageId: "art_ending" },
            { text: "traded your vision for commercial success and lived with the guilt", label: "Sellout", description: "The money was warm but the art turned cold", score: 68, years: 0, nextStageId: "art_ending" },
          ],
        },
        {
          id: "art_ending",
          emoji: "🌙",
          label: "The Final Canvas",
          prompt: "How does your story end?",
          choices: [
            { text: "and left behind a legacy that moved people long after you were gone", label: "Immortal Work", description: "Your art outlived you and changed the world", score: 96, years: 25, nextStageId: null },
            { text: "and found peace knowing you never compromised what mattered", label: "Inner Victory", description: "The only applause you needed was your own", score: 94, years: 25, nextStageId: null },
            { text: "and died tragically, becoming the legend you never were in life", label: "Tragic Muse", description: "Death made you immortal in ways success never could", score: 85, years: 20, nextStageId: null },
          ],
        },
      ],
    },

    /* ════════════════════════════════════════════════════
       SCENARIO 3: THE ADVENTURER'S COMPASS
       A life of exploration, risk, and discovery
       ════════════════════════════════════════════════════ */
    {
      id: "adventurer",
      title: "The Adventurer's Compass",
      description: "A restless life in search of horizons beyond the familiar",
      stages: [
        {
          id: "adv_birth",
          emoji: "🗺️",
          label: "Wanderlust Birth",
          prompt: "Your restlessness began where?",
          choices: [
            { text: "born in a seaside town where ships always departed at dawn", label: "Seafarer Blood", description: "The ocean called your name before you could walk", score: 84, years: 0, nextStageId: "adv_first_journey" },
            { text: "born in the mountains where paths disappear into mystery", label: "Mountain Child", description: "Every ridge promised another story beyond it", score: 87, years: 0, nextStageId: "adv_first_journey" },
          ],
        },
        {
          id: "adv_first_journey",
          emoji: "🧭",
          label: "First Journey",
          prompt: "Where did your first real journey take you?",
          choices: [
            { text: "crossed deserts where silence taught you who you really were", label: "Desert Wanderer", description: "Heat and solitude stripped away everything false", score: 88, years: 5, nextStageId: "adv_survival" },
            { text: "navigated jungles so thick that civilization felt like a dream", label: "Jungle Explorer", description: "Survival and wonder were the same thing", score: 90, years: 5, nextStageId: "adv_survival" },
            { text: "sailed uncharted waters where no map existed", label: "Ocean Voyager", description: "The only certainty was uncertainty", score: 92, years: 5, nextStageId: "adv_survival" },
          ],
        },
        {
          id: "adv_survival",
          emoji: "⛺",
          label: "Survival & Adaptation",
          prompt: "How did you learn to survive on your own terms?",
          choices: [
            { text: "learned from indigenous peoples and earned their respect", label: "Student of Worlds", description: "You became a bridge between cultures", score: 94, years: 8, nextStageId: "adv_choice" },
            { text: "survived on wit, charm, and an impossible amount of luck", label: "Golden Tongue", description: "Your words were your greatest survival tool", score: 87, years: 8, nextStageId: "adv_choice" },
            { text: "faced death multiple times and walked away scarred but alive", label: "Survivor", description: "Each scar was proof you belonged out here", score: 91, years: 8, nextStageId: "adv_choice" },
          ],
        },
        {
          id: "adv_choice",
          emoji: "🚪",
          label: "The Crossroads",
          prompt: "Did you ever want to stop moving?",
          choices: [
            { text: "found a place so beautiful you finally decided to stay", label: "Found Haven", description: "After years of running, you finally rested", score: 85, years: 0, nextStageId: "adv_home" },
            { text: "could never stop, movement was the only thing that felt like living", label: "Eternal Wanderer", description: "Home was a concept you outgrew", score: 89, years: 0, nextStageId: "adv_legacy_adventure" },
          ],
        },
        {
          id: "adv_home",
          emoji: "🏡",
          label: "Settling Down",
          prompt: "What did stillness bring you?",
          choices: [
            { text: "built a refuge for other wanderers seeking shelter", label: "Way Station Keeper", description: "Your home became a legend among travelers", score: 92, years: 15, nextStageId: "adv_ending" },
            { text: "settled but never truly belonged, always watching the horizon", label: "Restless Local", description: "The walls never quite held you", score: 79, years: 15, nextStageId: "adv_ending" },
          ],
        },
        {
          id: "adv_legacy_adventure",
          emoji: "📖",
          label: "Tales & Legacy",
          prompt: "What stories survived you?",
          choices: [
            { text: "and had your adventures recorded in books read around the world", label: "Legend", description: "Your tales inspired a thousand journeys", score: 96, years: 20, nextStageId: null },
            { text: "and vanished into mystery, leaving only whispered legends", label: "Ghost Story", description: "Were you real or just a tale told at campfires?", score: 94, years: 20, nextStageId: null },
          ],
        },
        {
          id: "adv_ending",
          emoji: "🌅",
          label: "Finally Still",
          prompt: "How did your story end?",
          choices: [
            { text: "content with the life you lived and the places you'd seen", label: "Satisfied Wanderer", description: "You'd found what you were searching for all along", score: 90, years: 20, nextStageId: null },
            { text: "with stories enough to fill lifetimes and peace enough to share them", label: "Wise Elder", description: "Your journey had made you whole", score: 93, years: 20, nextStageId: null },
          ],
        },
      ],
    },

    /* ════════════════════════════════════════════════════
       SCENARIO 4: THE REVOLUTIONARY
       Fighting for change and believing in a better world
       ════════════════════════════════════════════════════ */
    {
      id: "revolutionary",
      title: "The Revolutionary",
      description: "A life dedicated to changing the world, no matter the cost",
      stages: [
        {
          id: "rev_awakening",
          emoji: "⚡",
          label: "The Awakening",
          prompt: "What injustice first broke your heart?",
          choices: [
            { text: "witnessed poverty so brutal you couldn't look away anymore", label: "Witness", description: "You saw what others chose not to see", score: 86, years: 0, nextStageId: "rev_choice" },
            { text: "lived the oppression yourself and refused to accept it", label: "From Within", description: "Your own suffering became your fire", score: 89, years: 0, nextStageId: "rev_choice" },
          ],
        },
        {
          id: "rev_choice",
          emoji: "🔥",
          label: "The Path You Chose",
          prompt: "How did you decide to fight?",
          choices: [
            { text: "joined organized movements and fought within the system", label: "Organizer", description: "Structure and solidarity were your weapons", score: 82, years: 8, nextStageId: "rev_consequence" },
            { text: "became a radical voice, unafraid to burn bridges for the cause", label: "Radical", description: "Compromise was surrender", score: 88, years: 8, nextStageId: "rev_consequence" },
            { text: "worked quietly behind the scenes, moving pieces nobody noticed", label: "Shadow Mover", description: "The most powerful revolutions leave no fingerprints", score: 85, years: 8, nextStageId: "rev_consequence" },
          ],
        },
        {
          id: "rev_consequence",
          emoji: "😢",
          label: "The Price You Paid",
          prompt: "Every revolution demands sacrifice. What was yours?",
          choices: [
            { text: "was imprisoned for your beliefs but never renounced them", label: "Political Prisoner", description: "Chains couldn't break what had already set you free", score: 92, years: 5, nextStageId: "rev_outcome" },
            { text: "lost loved ones to the cause and carried that weight forever", label: "Bereaved Fighter", description: "They died so others could live free", score: 94, years: 5, nextStageId: "rev_outcome" },
            { text: "sacrificed comfort, security, and a normal life for the struggle", label: "The Exiled", description: "Everything you had, you gave to the cause", score: 87, years: 5, nextStageId: "rev_outcome" },
          ],
        },
        {
          id: "rev_outcome",
          emoji: "🌏",
          label: "Did It Work?",
          prompt: "What was the outcome of your struggle?",
          choices: [
            { text: "lived to see the system crumble and something new rise in its place", label: "Victory", description: "You changed the world. They can never erase that.", score: 98, years: 10, nextStageId: "rev_legacy" },
            { text: "didn't see the end, but knew your sacrifice planted seeds for others", label: "Unfinished", description: "You were a link in a chain longer than any life", score: 94, years: 10, nextStageId: "rev_legacy" },
            { text: "watched the powerful adapt and survive, and wondered if anything changed", label: "Incomplete Victory", description: "The struggle continues. It always will.", score: 81, years: 10, nextStageId: "rev_legacy" },
          ],
        },
        {
          id: "rev_legacy",
          emoji: "🕊️",
          label: "Your Legacy",
          prompt: "How will you be remembered?",
          choices: [
            { text: "as someone who dared to imagine freedom and fought for it", label: "Freedom Fighter", description: "Your name is whispered in the dark by those still fighting", score: 96, years: 15, nextStageId: null },
            { text: "as the one who refused to surrender even when all seemed lost", label: "Unbreakable", description: "Your spirit became a symbol that could not be crushed", score: 95, years: 15, nextStageId: null },
          ],
        },
      ],
    },

    /* ════════════════════════════════════════════════════
       SCENARIO 5: THE QUIET HEALER
       A life of service, compassion, and healing others
       ════════════════════════════════════════════════════ */
    {
      id: "healer",
      title: "The Quiet Healer",
      description: "A life devoted to mending wounds and easing suffering",
      stages: [
        {
          id: "heal_origin",
          emoji: "💚",
          label: "Compassion's Birth",
          prompt: "Where did your healing heart come from?",
          choices: [
            { text: "born to a mother who healed everyone in her village with her hands and wisdom", label: "Inherited Gift", description: "Healing was in your blood before you were born", score: 88, years: 0, nextStageId: "heal_training" },
            { text: "grew up in pain and learned that helping others eased your own suffering", label: "Healed Healer", description: "You mended yourself by mending others", score: 90, years: 0, nextStageId: "heal_training" },
          ],
        },
        {
          id: "heal_training",
          emoji: "📚",
          label: "Learning to Heal",
          prompt: "How did you develop your gifts?",
          choices: [
            { text: "studied medicine and became a doctor serving the most vulnerable", label: "Medicine Bearer", description: "Science and compassion became your twin weapons", score: 88, years: 10, nextStageId: "heal_work" },
            { text: "learned ancient healing practices from healers and teachers others had forgotten", label: "Keeper of Old Ways", description: "You remembered what the modern world wanted to forget", score: 91, years: 10, nextStageId: "heal_work" },
            { text: "discovered that your presence alone could heal wounds no medicine could touch", label: "Spiritual Healer", description: "Sometimes the best medicine is being truly seen", score: 89, years: 10, nextStageId: "heal_work" },
          ],
        },
        {
          id: "heal_work",
          emoji: "🏥",
          label: "The Work of Healing",
          prompt: "Where did you pour your gifts?",
          choices: [
            { text: "worked in war zones where every life saved felt like a miracle", label: "Warzone Healer", description: "You brought light to humanity's darkest corners", score: 94, years: 12, nextStageId: "heal_toll" },
            { text: "settled in forgotten communities and became their lifeline", label: "Community Anchor", description: "They knew your name and trusted you with their lives", score: 91, years: 12, nextStageId: "heal_toll" },
            { text: "traveled relentlessly, bringing medicine and hope to those nobody remembered", label: "Wandering Healer", description: "You were an angel passing through hell", score: 92, years: 12, nextStageId: "heal_toll" },
          ],
        },
        {
          id: "heal_toll",
          emoji: "💔",
          label: "The Toll of Compassion",
          prompt: "What did it cost you to care so deeply?",
          choices: [
            { text: "your health deteriorated, but you kept going until the very end", label: "Burned Out Saint", description: "You gave until there was nothing left to give", score: 92, years: 0, nextStageId: "heal_reflection" },
            { text: "learned to protect your own heart while still saving others", label: "Wise Healer", description: "You discovered you couldn't pour from an empty cup", score: 93, years: 0, nextStageId: "heal_reflection" },
            { text: "lost some to death despite everything, and learned to sit with grief", label: "Sorrow Bearer", description: "You held the weight of the world and didn't break", score: 95, years: 0, nextStageId: "heal_reflection" },
          ],
        },
        {
          id: "heal_reflection",
          emoji: "🌟",
          label: "Your Healing Gift",
          prompt: "What did your life heal in the world?",
          choices: [
            { text: "saved thousands of lives and showed them what grace looked like", label: "Life Saver", description: "Each person you healed became someone who could heal others", score: 97, years: 18, nextStageId: null },
            { text: "taught others that true wealth is in the lives you touch", label: "Teacher of Compassion", description: "Your legacy is every person you inspired to heal", score: 96, years: 18, nextStageId: null },
            { text: "proved that one person's devotion can change the world, slowly but surely", label: "Living Testament", description: "You were proof that love still matters", score: 95, years: 18, nextStageId: null },
          ],
        },
      ],
    },

    /* ════════════════════════════════════════════════════
       SCENARIO 6: THE SEEKER
       A contemplative life in pursuit of truth and meaning
       ════════════════════════════════════════════════════ */
    {
      id: "seeker",
      title: "The Seeker",
      description: "A philosophical journey through mystery, doubt, and enlightenment",
      stages: [
        {
          id: "seek_question",
          emoji: "❓",
          label: "The First Question",
          prompt: "What question haunted you from the beginning?",
          choices: [
            { text: "asked why suffering exists and couldn't accept easy answers", label: "Philosopher", description: "Every answer only led to deeper questions", score: 85, years: 0, nextStageId: "seek_path" },
            { text: "felt that something sacred was hidden beneath the ordinary world", label: "Mystic", description: "You sensed truth that others couldn't see", score: 88, years: 0, nextStageId: "seek_path" },
          ],
        },
        {
          id: "seek_path",
          emoji: "🧘",
          label: "The Path of Seeking",
          prompt: "How did you search for answers?",
          choices: [
            { text: "studied under masters and in great libraries, filling your mind with wisdom", label: "Scholar", description: "Knowledge was your meditation", score: 87, years: 14, nextStageId: "seek_revelation" },
            { text: "traveled to temples and holy places, seeking enlightenment through practice", label: "Pilgrim", description: "Every step was a prayer", score: 89, years: 14, nextStageId: "seek_revelation" },
            { text: "retreated from the world to sit in silence and listen to what lay beneath thought", label: "Hermit", description: "Solitude revealed truths that company could only obscure", score: 91, years: 14, nextStageId: "seek_revelation" },
          ],
        },
        {
          id: "seek_revelation",
          emoji: "✨",
          label: "The Revelation",
          prompt: "Did you find what you were looking for?",
          choices: [
            { text: "experienced a moment of clarity that changed everything forever", label: "Enlightened", description: "The veil lifted and the mystery became luminous", score: 94, years: 0, nextStageId: "seek_sharing" },
            { text: "realized the seeking itself was the answer, not arrival", label: "Wise Skeptic", description: "The journey became more important than the destination", score: 92, years: 0, nextStageId: "seek_sharing" },
            { text: "accepted that some mysteries must remain unsolved, and that was beautiful", label: "Mystery Keeper", description: "You learned to live comfortably in the unknown", score: 90, years: 0, nextStageId: "seek_sharing" },
          ],
        },
        {
          id: "seek_sharing",
          emoji: "🕯️",
          label: "Sharing Your Light",
          prompt: "What did you give back to the world?",
          choices: [
            { text: "became a teacher passing wisdom to those ready to receive it", label: "Guide", description: "You lit lamps for others to find their own way", score: 95, years: 10, nextStageId: "seek_legacy" },
            { text: "wrote or created works that touched hearts and opened minds", label: "Artist of Truth", description: "Your insights lived beyond you in your creations", score: 94, years: 10, nextStageId: "seek_legacy" },
            { text: "simply lived as an example of peace, and that was enough", label: "Silent Witness", description: "Your presence was the message", score: 93, years: 10, nextStageId: "seek_legacy" },
          ],
        },
        {
          id: "seek_legacy",
          emoji: "🌙",
          label: "The Eternal Question",
          prompt: "How will your search be remembered?",
          choices: [
            { text: "as someone who dared to ask the deepest questions and showed others they could too", label: "Question Bearer", description: "Your curiosity became a torch for generations", score: 96, years: 15, nextStageId: null },
            { text: "as a bridge between the material and spiritual, showing both are one", label: "Bridge Builder", description: "You unified what others thought opposed", score: 97, years: 15, nextStageId: null },
          ],
        },
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
  let currentScenario = null;
  let stageIndex = 0;
  let totalScore = 0;
  let totalYears = 0;
  let firstName  = "";
  let lastName   = "";
  /** Map of stage id → chosen text fragment */
  const chosen   = {};

  /* ── Boot ───────────────────────────────────────────── */
  simulateLoading();
  btnStart.addEventListener("click", chooseScenario);
  btnRestart.addEventListener("click", chooseScenario);

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
  function chooseScenario() {
    stageIndex = 0;
    totalScore = 0;
    totalYears = 0;
    Object.keys(chosen).forEach(k => delete chosen[k]);

    firstName = pick(FIRST_NAMES);
    lastName  = pick(LAST_NAMES);

    // Show scenario selection screen
    scenariosContainer.innerHTML = "";
    SCENARIOS.forEach(scenario => {
      const card = document.createElement("div");
      card.className = "scenario-card fade-in";
      card.innerHTML = `
        <div class="scenario-icon">${scenario.stages[0]?.emoji || "✨"}</div>
        <h3>${esc(scenario.title)}</h3>
        <p>${esc(scenario.description)}</p>
        <button class="scenario-btn">Choose This Path</button>
      `;
      card.querySelector(".scenario-btn").addEventListener("click", () => startGame(scenario.id));
      scenariosContainer.appendChild(card);
    });

    showScreen(scenarioScreen);
  }

  function startGame(scenarioId) {
    currentScenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!currentScenario) return;

    stageIndex = 0;
    totalScore = 0;
    totalYears = 0;
    Object.keys(chosen).forEach(k => delete chosen[k]);

    const stages = currentScenario.stages;

    // Build timeline dots
    stageDots.innerHTML = stages.map(() =>
      `<div class="stage-dot"></div>`
    ).join("");

    showScreen(gameScreen);
    showStage();
  }

  /* ── Stage rendering ────────────────────────────────── */
  function showStage() {
    if (!currentScenario) return;
    
    const stages = currentScenario.stages;
    const stage = stages[stageIndex];
    
    if (!stage) {
      finishGame();
      return;
    }

    // Timeline progress
    const pct = (stageIndex / stages.length) * 100;
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
    if (!currentScenario) return [];
    
    const name = `<span class="sentence-filled">${esc(firstName)} ${esc(lastName)}</span>`;
    const parts = [name + ","];

    const slot = id => {
      if (chosen[id]) {
        return `<span class="sentence-filled">${esc(chosen[id])}</span>`;
      }
      return `<span class="sentence-blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`;
    };

    // Build sentence parts based on the current scenario's stages
    const stages = currentScenario.stages;
    stages.forEach((stage, idx) => {
      const slotText = slot(stage.id);
      const isLast = idx === stages.length - 1;
      const punctuation = isLast ? "." : ",";
      parts.push(slotText + punctuation);
    });

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
        <span class="choice-label">${esc(choice.label)}</span>
        <span class="choice-text">${esc(choice.description)}</span>
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

    if (!currentScenario) return;
    
    const stages = currentScenario.stages;
    
    // Handle branching: find the next stage based on nextStageId
    if (choice.nextStageId) {
      const nextStageIndex = stages.findIndex(s => s.id === choice.nextStageId);
      if (nextStageIndex !== -1) {
        stageIndex = nextStageIndex;
      } else {
        // If nextStageId not found, go to end
        finishGame();
        return;
      }
    } else if (choice.nextStageId === null) {
      // Explicitly marked as ending
      finishGame();
      return;
    } else {
      // Default: advance by 1
      stageIndex += 1;
    }

    if (stageIndex >= stages.length) {
      finishGame();
    } else {
      renderSentence();
      showStage();
    }
  }

  /* ── Finish ─────────────────────────────────────────── */
  function finishGame() {
    if (!currentScenario) return;
    
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

    const stageCount = currentScenario.stages.length;
    const avgScore = Math.round(totalScore / stageCount);
    const age = 18 + totalYears;

    resultYears.textContent = `Lived to age ${age}`;
    resultScore.textContent = `Fulfilment ${avgScore} / 100`;

    // Timeline full at end
    timelineFill.style.width = "100%";

    showScreen(resultsScreen);
  }

  /* ── Utilities ──────────────────────────────────────── */
  function showScreen(el) {
    const allScreens = [titleScreen, scenarioScreen, gameScreen, resultsScreen];
    allScreens.forEach(s => {
      if (s) s.classList.remove("active");
    });
    if (el) el.classList.add("active");
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** Escape a plain-text string for safe insertion into HTML. */
  function esc(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

})();
