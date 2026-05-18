'use strict';

const STORAGE_KEY = 'avna_learning_loop_v5';
const app = document.getElementById('app');
const levelLabel = document.getElementById('levelLabel');

let data = null;
let state = null;
let timerId = null;
let timerRemaining = 10;
let cardIndex = 0;
let cardStep = 0;
let quizIndex = 0;
let currentQuizSet = [];
let currentCardSet = [];
let quizType = 'meaning';
let answered = false;
let audioCtx = null;

const SECTION_COUNT = 3;

const fallbackData = {
  "meta": {
    "schemaVersion": 2,
    "courseId": "todai-avna",
    "series": "東京大学編",
    "title": "Academic Vocabulary Network Adventure 東京大学編",
    "description": "東大型抽象思考・音声から意味への即時想起・概念ネットワーク理解を育てる軽量MVP。"
  },
  "units": [
    {
      "unitId": "u01",
      "unitTitle": "Perception",
      "seaName": "Perception Sea",
      "unitQuestion": "Do we see reality itself?",
      "days": [
        {
          "day": 1,
          "title": "Do we see reality itself?",
          "mission": "5語を学び、音・意味・概念をつなげてPerception Seaの入口を解放しよう。",
          "clearTitle": "🌊 Sea Area Cleared!",
          "clearMessage": "Perception Seaの入口を解放しました。見たものをそのまま信じるのではなく、認識のしくみに気づく力が育ちました。",
          "rewards": {
            "pearls": 3,
            "exp": 20
          },
          "words": [
            {
              "id": "u01_d01_w01",
              "word": "perception",
              "jp": "知覚／認識／ものの見方",
              "coreImage": "外界の情報を、脳が意味ある世界として理解する働き。",
              "root": "per = through / completely, ceive = take / grasp",
              "note": "単なるseeではなく、情報を意味あるものとして認識すること。東大評論では「現実そのもの」と「認識された現実」の区別が重要になる。",
              "example": "Our perception of reality is shaped by memory, language, and expectation.",
              "exampleJp": "私たちの現実認識は、記憶・言語・期待によって形作られる。"
            },
            {
              "id": "u01_d01_w02",
              "word": "representation",
              "jp": "表象／再構成されたモデル",
              "coreImage": "世界を理解可能な形で頭の中に再構築したもの。",
              "root": "re = again, present = show",
              "note": "realityそのものではなく、心や言語が作る世界モデル。抽象評論ではmental representationやsocial representationとして出やすい。",
              "example": "Mental representations help us organize complex information.",
              "exampleJp": "心的表象は、複雑な情報を整理する助けになる。"
            },
            {
              "id": "u01_d01_w03",
              "word": "interpretation",
              "jp": "解釈／意味づけ",
              "coreImage": "受け取った情報に意味を与える働き。",
              "root": "inter = between, pret = value / explain",
              "note": "同じ情報でも、経験・文化・文脈によって解釈は変わる。perceptionとセットで理解したい語。",
              "example": "Perception always involves interpretation.",
              "exampleJp": "知覚には常に解釈が含まれる。"
            },
            {
              "id": "u01_d01_w04",
              "word": "bias",
              "jp": "認知の偏り／先入観",
              "coreImage": "判断や認識が特定の方向へ傾くこと。",
              "root": "Old French biais = oblique / slanting",
              "note": "biasは単なる悪意ではなく、認知の効率化が生む偏りでもある。confirmation biasなどの形で評論に頻出。",
              "example": "Bias can influence how people interpret evidence.",
              "exampleJp": "バイアスは、人が証拠をどう解釈するかに影響しうる。"
            },
            {
              "id": "u01_d01_w05",
              "word": "illusion",
              "jp": "錯覚／幻想",
              "coreImage": "現実とは異なる形で知覚される経験。",
              "root": "in = at / upon, ludere = play",
              "note": "illusionは知覚の失敗であると同時に、知覚が能動的な構築である証拠。",
              "example": "Illusions reveal that perception is an active process.",
              "exampleJp": "錯覚は、知覚が能動的なプロセスであることを示す。"
            }
          ],
          "meaningQuizzes": [
            {
              "id": "u01_d01_mq01",
              "wordId": "u01_d01_w01",
              "prompt": "perception",
              "choices": [
                "知覚／認識",
                "制度",
                "証拠",
                "帰属意識"
              ],
              "answer": "知覚／認識",
              "explanation": "perceptionは、情報を意味ある世界として理解する働き。"
            },
            {
              "id": "u01_d01_mq02",
              "wordId": "u01_d01_w02",
              "prompt": "representation",
              "choices": [
                "表象／再構成されたモデル",
                "監視",
                "確率",
                "自律性"
              ],
              "answer": "表象／再構成されたモデル",
              "explanation": "representationは、realityを理解可能にする内的モデル。"
            },
            {
              "id": "u01_d01_mq03",
              "wordId": "u01_d01_w03",
              "prompt": "interpretation",
              "choices": [
                "解釈／意味づけ",
                "革新",
                "証明",
                "遺伝"
              ],
              "answer": "解釈／意味づけ",
              "explanation": "interpretationは、入力情報に意味を与える働き。"
            },
            {
              "id": "u01_d01_mq04",
              "wordId": "u01_d01_w04",
              "prompt": "bias",
              "choices": [
                "認知の偏り／先入観",
                "記号",
                "推論",
                "文化"
              ],
              "answer": "認知の偏り／先入観",
              "explanation": "biasは、判断や認識が特定方向に傾くこと。"
            },
            {
              "id": "u01_d01_mq05",
              "wordId": "u01_d01_w05",
              "prompt": "illusion",
              "choices": [
                "錯覚／幻想",
                "証拠",
                "制度",
                "分類"
              ],
              "answer": "錯覚／幻想",
              "explanation": "illusionは、perceptionが能動的な構築であることを示す。"
            }
          ],
          "audioQuizzes": [
            {
              "id": "u01_d01_aq01",
              "wordId": "u01_d01_w01",
              "spoken": "perception",
              "choices": [
                "知覚／認識",
                "制度",
                "推論",
                "証拠"
              ],
              "answer": "知覚／認識",
              "explanation": "perception = 知覚／認識／ものの見方。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d01_aq02",
              "wordId": "u01_d01_w02",
              "spoken": "representation",
              "choices": [
                "表象／再構成されたモデル",
                "監視",
                "確率",
                "自律性"
              ],
              "answer": "表象／再構成されたモデル",
              "explanation": "representation = 表象／再構成されたモデル。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d01_aq03",
              "wordId": "u01_d01_w03",
              "spoken": "interpretation",
              "choices": [
                "解釈／意味づけ",
                "革新",
                "証明",
                "遺伝"
              ],
              "answer": "解釈／意味づけ",
              "explanation": "interpretation = 解釈／意味づけ。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d01_aq04",
              "wordId": "u01_d01_w04",
              "spoken": "bias",
              "choices": [
                "認知の偏り／先入観",
                "記号",
                "推論",
                "文化"
              ],
              "answer": "認知の偏り／先入観",
              "explanation": "bias = 認知の偏り／先入観。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d01_aq05",
              "wordId": "u01_d01_w05",
              "spoken": "illusion",
              "choices": [
                "錯覚／幻想",
                "証拠",
                "制度",
                "分類"
              ],
              "answer": "錯覚／幻想",
              "explanation": "illusion = 錯覚／幻想。音から意味を即時に想起する練習です。"
            }
          ],
          "mapNodes": [
            "perception",
            "interpretation",
            "representation",
            "bias",
            "illusion",
            "reality"
          ]
        },
        {
          "day": 2,
          "title": "How does the mind select meaning?",
          "mission": "Day 1で開いた海域をさらに潜り、注意・仮定・視点の語彙をつなげよう。",
          "clearTitle": "🌊 Deeper Area Cleared!",
          "clearMessage": "Perception Seaの浅瀬から、意味選択の深い海域へ進みました。注意・視点・前提を意識して読む準備が整いました。",
          "rewards": {
            "pearls": 3,
            "exp": 20
          },
          "words": [
            {
              "id": "u01_d02_w01",
              "word": "attention",
              "jp": "注意／注目",
              "coreImage": "多くの情報の中から、意識が特定の対象に光を当てる働き。",
              "root": "ad = toward, tend = stretch",
              "note": "attentionは単なる集中ではなく、どの情報を意味あるものとして選ぶかに関わる。",
              "example": "Attention determines which information enters awareness.",
              "exampleJp": "注意は、どの情報が意識に入るかを決める。"
            },
            {
              "id": "u01_d02_w02",
              "word": "cognition",
              "jp": "認知／知的処理",
              "coreImage": "知覚・記憶・判断・推論を含む、心の情報処理全体。",
              "root": "co = together, gnoscere = know",
              "note": "AI・心理学・哲学系の英文で非常に重要。perceptionより広く、thinking全体を含む。",
              "example": "Human cognition depends on both perception and memory.",
              "exampleJp": "人間の認知は、知覚と記憶の両方に依存している。"
            },
            {
              "id": "u01_d02_w03",
              "word": "perspective",
              "jp": "視点／見方",
              "coreImage": "どこから世界を見るかという認識の位置。",
              "root": "per = through, spect = look",
              "note": "perspectiveは物理的な視点だけでなく、社会的・文化的なものの見方も表す。",
              "example": "A change in perspective can alter the meaning of an event.",
              "exampleJp": "視点が変わると、出来事の意味も変わりうる。"
            },
            {
              "id": "u01_d02_w04",
              "word": "assumption",
              "jp": "前提／思い込み",
              "coreImage": "意識されないまま判断の土台になっている考え。",
              "root": "ad = toward, sumere = take",
              "note": "東大型読解では、筆者がどのassumptionを疑っているかを読むことが重要。",
              "example": "Hidden assumptions often shape our interpretation.",
              "exampleJp": "隠れた前提は、しばしば私たちの解釈を形作る。"
            },
            {
              "id": "u01_d02_w05",
              "word": "framework",
              "jp": "枠組み／思考の構造",
              "coreImage": "情報を整理し、意味づけるための見取り図。",
              "root": "frame = structure, work = constructed system",
              "note": "frameworkは抽象評論で頻出。概念をばらばらに覚えず、枠組みの中で読む力につながる。",
              "example": "A theoretical framework helps us connect different ideas.",
              "exampleJp": "理論的枠組みは、異なる考えを結びつける助けになる。"
            }
          ],
          "meaningQuizzes": [
            {
              "id": "u01_d02_mq01",
              "wordId": "u01_d02_w01",
              "prompt": "attention",
              "choices": [
                "注意／注目",
                "錯覚",
                "証拠",
                "分類"
              ],
              "answer": "注意／注目",
              "explanation": "attentionは、多くの情報の中から意識が選び取る働き。"
            },
            {
              "id": "u01_d02_mq02",
              "wordId": "u01_d02_w02",
              "prompt": "cognition",
              "choices": [
                "認知／知的処理",
                "制度",
                "帰属意識",
                "証明"
              ],
              "answer": "認知／知的処理",
              "explanation": "cognitionは、知覚・記憶・判断・推論を含む心の情報処理。"
            },
            {
              "id": "u01_d02_mq03",
              "wordId": "u01_d02_w03",
              "prompt": "perspective",
              "choices": [
                "視点／見方",
                "監視",
                "遺伝",
                "確率"
              ],
              "answer": "視点／見方",
              "explanation": "perspectiveは、どこから世界を見るかという認識の位置。"
            },
            {
              "id": "u01_d02_mq04",
              "wordId": "u01_d02_w04",
              "prompt": "assumption",
              "choices": [
                "前提／思い込み",
                "文化",
                "革新",
                "表象"
              ],
              "answer": "前提／思い込み",
              "explanation": "assumptionは、判断の土台になる前提や思い込み。"
            },
            {
              "id": "u01_d02_mq05",
              "wordId": "u01_d02_w05",
              "prompt": "framework",
              "choices": [
                "枠組み／思考の構造",
                "感覚入力",
                "錯覚",
                "証拠"
              ],
              "answer": "枠組み／思考の構造",
              "explanation": "frameworkは、情報を整理し意味づけるための枠組み。"
            }
          ],
          "audioQuizzes": [
            {
              "id": "u01_d02_aq01",
              "wordId": "u01_d02_w01",
              "spoken": "attention",
              "choices": [
                "注意／注目",
                "錯覚",
                "証拠",
                "分類"
              ],
              "answer": "注意／注目",
              "explanation": "attention = 注意／注目。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d02_aq02",
              "wordId": "u01_d02_w02",
              "spoken": "cognition",
              "choices": [
                "認知／知的処理",
                "制度",
                "帰属意識",
                "証明"
              ],
              "answer": "認知／知的処理",
              "explanation": "cognition = 認知／知的処理。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d02_aq03",
              "wordId": "u01_d02_w03",
              "spoken": "perspective",
              "choices": [
                "視点／見方",
                "監視",
                "遺伝",
                "確率"
              ],
              "answer": "視点／見方",
              "explanation": "perspective = 視点／見方。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d02_aq04",
              "wordId": "u01_d02_w04",
              "spoken": "assumption",
              "choices": [
                "前提／思い込み",
                "文化",
                "革新",
                "表象"
              ],
              "answer": "前提／思い込み",
              "explanation": "assumption = 前提／思い込み。音から意味を即時に想起する練習です。"
            },
            {
              "id": "u01_d02_aq05",
              "wordId": "u01_d02_w05",
              "spoken": "framework",
              "choices": [
                "枠組み／思考の構造",
                "感覚入力",
                "錯覚",
                "証拠"
              ],
              "answer": "枠組み／思考の構造",
              "explanation": "framework = 枠組み／思考の構造。音から意味を即時に想起する練習です。"
            }
          ],
          "mapNodes": [
            "attention",
            "cognition",
            "perspective",
            "assumption",
            "framework",
            "meaning selection"
          ]
        }
      ]
    }
  ]
};

function defaultState() {
  return {
    schemaVersion: 4,
    currentUnitId: 'u01',
    currentDay: 1,
    exp: 0,
    pearls: 0,
    completedDays: {},
    unlockedDays: {},
    clearedDays: {},
    dayProgress: {},
    settings: {
      audioMode: 'manual',
      correctSound: true
    }
  };
}

function defaultDayProgress() {
  return {
    unlockedNodes: 1,
    completedSections: { cards: false, meaning: false, audio: false },
    progress: {
      flashcard: { seenWordIds: [] },
      quiz_en_jp: { answeredWordIds: [], correctWordIds: [] },
      quiz_audio: { answeredWordIds: [], correctWordIds: [] }
    },
    stats: { cardsSeen: 0, meaningCorrect: 0, meaningTotal: 0, audioCorrect: 0, audioTotal: 0, wrong: 0 }
  };
}

async function boot() {
  try {
    const res = await fetch('vocabulary.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('JSON not found');
    data = normalizeData(await res.json());
  } catch (error) {
    data = normalizeData(fallbackData);
    console.warn('Using fallback data:', error);
  }
  state = loadState();
  ensureCurrentDayExists();
  bindNav();
  updateHeader();
  renderHome();
}

function normalizeData(raw) {
  if (Array.isArray(raw.units)) return raw;

  // Backward compatibility: old single-Day JSON can still run.
  return {
    meta: {
      schemaVersion: 2,
      courseId: raw.course?.courseId || 'todai-avna',
      series: raw.course?.title || 'Academic Vocabulary Network',
      title: raw.course?.title || 'Academic Vocabulary Network Adventure'
    },
    units: [
      {
        unitId: raw.course?.unitId || 'u01',
        unitTitle: raw.course?.unitTitle || 'Unit 1',
        seaName: raw.course?.seaName || 'Concept Sea',
        days: [
          {
            day: raw.course?.day || 1,
            title: raw.course?.coreQuestion || 'Core Question',
            mission: raw.course?.mission || '今日の語彙を学習しよう。',
            clearTitle: 'Sea Area Cleared!',
            clearMessage: `${raw.course?.seaName || 'Concept Sea'}を解放しました。`,
            rewards: { pearls: 3, exp: 20 },
            words: raw.words || [],
            meaningQuizzes: raw.meaningQuizzes || [],
            audioQuizzes: raw.audioQuizzes || [],
            mapNodes: raw.mapNodes || []
          }
        ]
      }
    ]
  };
}

function loadState() {
  try {
    const base = defaultState();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return base;
    return {
      ...base,
      ...saved,
      completedDays: { ...base.completedDays, ...(saved.completedDays || {}) },
      unlockedDays: { ...base.unlockedDays, ...(saved.unlockedDays || {}) },
      clearedDays: { ...base.clearedDays, ...(saved.clearedDays || {}) },
      dayProgress: { ...base.dayProgress, ...(saved.dayProgress || {}) },
      settings: { ...base.settings, ...(saved.settings || {}) }
    };
  } catch (_) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateHeader();
}

function getUnits() {
  return data.units || [];
}

function getCurrentUnit() {
  return getUnits().find(unit => unit.unitId === state.currentUnitId) || getUnits()[0];
}

function getDay(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const unit = getUnits().find(u => u.unitId === unitId) || getUnits()[0];
  return unit.days.find(day => Number(day.day) === Number(dayNumber)) || unit.days[0];
}

function getAllDays() {
  return getUnits().flatMap(unit => unit.days.map(day => ({ unit, day })));
}

function makeDayKey(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  return `${unitId}_d${String(dayNumber).padStart(2, '0')}`;
}

function getDayProgress(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const key = makeDayKey(unitId, dayNumber);
  if (!state.dayProgress[key]) state.dayProgress[key] = defaultDayProgress();
  const base = defaultDayProgress();
  state.dayProgress[key] = {
    ...base,
    ...state.dayProgress[key],
    stats: { ...base.stats, ...(state.dayProgress[key].stats || {}) },
    completedSections: { ...base.completedSections, ...(state.dayProgress[key].completedSections || {}) },
    progress: {
      flashcard: { ...base.progress.flashcard, ...(state.dayProgress[key].progress?.flashcard || {}) },
      quiz_en_jp: { ...base.progress.quiz_en_jp, ...(state.dayProgress[key].progress?.quiz_en_jp || {}) },
      quiz_audio: { ...base.progress.quiz_audio, ...(state.dayProgress[key].progress?.quiz_audio || {}) }
    }
  };
  return state.dayProgress[key];
}

function ensureCurrentDayExists() {
  const unit = getCurrentUnit();
  if (!unit) return;
  state.currentUnitId = unit.unitId;
  if (!unit.days.some(day => Number(day.day) === Number(state.currentDay))) {
    state.currentDay = unit.days[0]?.day || 1;
  }
  const first = getAllDays()[0];
  if (first) unlockDay(first.unit.unitId, first.day.day);
  if (!isDayUnlocked(state.currentUnitId, state.currentDay)) {
    const firstUnlocked = getAllDays().find(item => isDayUnlocked(item.unit.unitId, item.day.day)) || first;
    if (firstUnlocked) {
      state.currentUnitId = firstUnlocked.unit.unitId;
      state.currentDay = firstUnlocked.day.day;
    }
  }
}

function getNextDayInfo() {
  const days = getAllDays();
  const nowIndex = days.findIndex(item => item.unit.unitId === state.currentUnitId && Number(item.day.day) === Number(state.currentDay));
  return days[nowIndex + 1] || null;
}

function isDayCleared(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const key = makeDayKey(unitId, dayNumber);
  return Boolean(state.completedDays[key] || state.clearedDays[key]);
}

function isDayUnlocked(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const key = makeDayKey(unitId, dayNumber);
  const allDays = getAllDays();
  const first = allDays[0];
  if (first && first.unit.unitId === unitId && Number(first.day.day) === Number(dayNumber)) return true;
  return Boolean(state.unlockedDays[key] || isDayCleared(unitId, dayNumber));
}

function unlockDay(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  state.unlockedDays[makeDayKey(unitId, dayNumber)] = true;
}

function unlockNextDay(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const days = getAllDays();
  const nowIndex = days.findIndex(item => item.unit.unitId === unitId && Number(item.day.day) === Number(dayNumber));
  const next = days[nowIndex + 1];
  if (next) unlockDay(next.unit.unitId, next.day.day);
  return next || null;
}

function sectionProgress(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const progress = getDayProgress(unitId, dayNumber);
  const done = Object.values(progress.completedSections).filter(Boolean).length;
  return Math.round((done / SECTION_COUNT) * 100);
}

function calculateLevel(exp = state.exp) {
  return Math.max(1, Math.floor(exp / 40) + 1);
}

function updateHeader() {
  levelLabel.textContent = `Lv.${calculateLevel()}`;
}

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      stopTimer();
      cancelSpeech();
      if (nav === 'home') renderHome();
      if (nav === 'map') renderMap();
      if (nav === 'cards') startCards();
      if (nav === 'reset') resetState();
    });
  });
}

function resetState() {
  if (!confirm('このアプリの学習記録をリセットしますか？')) return;
  stopTimer();
  cancelSpeech();
  state = defaultState();
  ensureCurrentDayExists();
  saveState();
  renderHome();
}

function setActiveNav(name) {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === name);
  });
}

function renderHome() {
  setActiveNav('home');
  const unit = getCurrentUnit();
  const day = getDay();
  const progress = getDayProgress();
  const pct = sectionProgress();
  const cleared = isDayCleared();
  const nextDay = getNextDayInfo();
  const clearRecord = state.clearedDays[makeDayKey()];
  const statusText = cleared ? `Clear済み / 正答率 ${clearRecord.accuracy}%` : `${pct}% Clear`;

  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">${escapeHTML(data.meta?.series || data.meta?.title || 'Academic Vocabulary Network')}</p>
      <h2>${escapeHTML(unit.seaName || unit.unitTitle)} / Day ${day.day}</h2>
      <p class="subtle">${escapeHTML(day.title)}</p>
      <div class="stat-grid" aria-label="Learning status">
        <div class="stat"><strong>${state.pearls}</strong><span>Pearls</span></div>
        <div class="stat"><strong>${state.exp}</strong><span>EXP</span></div>
        <div class="stat"><strong>${statusText}</strong><span>Today</span></div>
      </div>
      <div class="progress-rail"><div class="progress-fill" style="width:${cleared ? 100 : pct}%"></div></div>
    </section>

    <section class="card">
      <h3>今日のミッション</h3>
      <p class="jp-large">${escapeHTML(day.mission)}</p>
      <div class="pill-row">
        <span class="pill">🃏 Flashcard</span>
        <span class="pill">🔤 英→日4択</span>
        <span class="pill">🔊 音声→日本語4択</span>
      </div>
      <div class="setting-row" aria-label="Listening mode setting">
        <span>音声クイズ</span>
        <button class="mode-toggle" type="button" id="audioModeToggle">${state.settings.audioMode === 'auto' ? '自動再生' : '手動再生'}</button>
      </div>
      <div class="btn-row">
        <button class="btn" type="button" id="startBtn">${cleared ? '今日の内容を復習する' : '今日の冒険を始める'}</button>
        ${cleared && nextDay && isDayUnlocked(nextDay.unit.unitId, nextDay.day.day) ? `<button class="btn secondary" type="button" id="nextDayBtn">Day ${nextDay.day.day}へ進む</button>` : ''}
        <button class="btn secondary" type="button" id="mapBtn">簡易海域マップを見る</button>
      </div>
    </section>

    <section class="panel">
      <h3>サメ先生</h3>
      <p class="subtle">${escapeHTML(getSenseiLine(day.day, cleared, progress))}</p>
    </section>
  `;

  document.getElementById('audioModeToggle').addEventListener('click', toggleAudioMode);
  document.getElementById('startBtn').addEventListener('click', startCards);
  document.getElementById('mapBtn').addEventListener('click', renderMap);
  const nextBtn = document.getElementById('nextDayBtn');
  if (nextBtn) nextBtn.addEventListener('click', () => goToDay(nextDay.unit.unitId, nextDay.day.day));
}

function getSenseiLine(dayNumber, cleared, progress) {
  if (cleared) return `“Day ${dayNumber} clear! 小さくても毎日潜れば、語彙の海図は確実に広がるよ。”`;
  if (progress.completedSections.cards) return '“カードで概念の輪郭は見えたね。次は意味をすばやく取り出そう。”';
  return '“今日は軽く、壊れず、最後まで。音から意味へ潜る準備をしよう。”';
}

function goToDay(unitId, dayNumber) {
  if (!isDayUnlocked(unitId, dayNumber)) {
    renderMap();
    return;
  }
  state.currentUnitId = unitId;
  state.currentDay = dayNumber;
  getDayProgress(unitId, dayNumber);
  saveState();
  renderHome();
}

function toggleAudioMode() {
  state.settings.audioMode = state.settings.audioMode === 'auto' ? 'manual' : 'auto';
  saveState();
  renderHome();
}

function startCards() {
  stopTimer();
  setActiveNav('cards');
  const day = getDay();
  // Flashcard用の順番。クイズとは独立して毎回シャッフルする。
  currentCardSet = shuffle([...(day.words || [])]);
  cardIndex = 0;
  cardStep = 0;
  renderCard();
}

function renderCard() {
  const day = getDay();
  const progress = getDayProgress();
  const words = currentCardSet.length ? currentCardSet : shuffle([...(day.words || [])]);
  if (!words.length) {
    app.innerHTML = `<section class="card"><h2>単語データがありません</h2><p>vocabulary.jsonのdays[].wordsを確認してください。</p></section>`;
    return;
  }
  const word = words[cardIndex];
  const isLast = cardIndex === words.length - 1;
  const details = cardStep >= 1 ? `<div class="detail-box"><strong>Core Image</strong><br>${escapeHTML(word.coreImage)}</div>` : '';
  const example = cardStep >= 2 ? `<div class="detail-box example"><strong>Example</strong><br>${escapeHTML(word.example)}<br><span class="subtle">${escapeHTML(word.exampleJp)}</span></div>` : '';
  const root = cardStep >= 3 ? `<div class="detail-box"><strong>Root / Memory Hook</strong><br>${escapeHTML(word.root)}<br>${escapeHTML(word.note)}</div>` : '';

  app.innerHTML = `
    <section class="panel">
      <div class="quiz-head">
        <div>
          <p class="eyebrow">Day ${day.day} / Flashcard ${cardIndex + 1} / ${words.length}</p>
          <h2>Concept Pearl探索</h2>
        </div>
        <span class="pearl">${cardIndex + 1}</span>
      </div>
      <div class="progress-rail"><div class="progress-fill" style="width:${((cardIndex + 1) / words.length) * 100}%"></div></div>
    </section>
    <section class="card center">
      <div class="hero-word">${escapeHTML(word.word)}</div>
      <p class="jp-large">${escapeHTML(word.jp)}</p>
      ${details}${example}${root}
      <div class="btn-row">
        <button class="btn" type="button" id="revealBtn">${cardStep < 3 ? 'もう少し深く見る' : (isLast ? '英→日クイズへ' : '次のカードへ')}</button>
        <button class="btn ghost" type="button" id="speakBtn">🔊 発音を聞く</button>
      </div>
    </section>
  `;

  document.getElementById('speakBtn').addEventListener('click', () => speak(word.word));
  document.getElementById('revealBtn').addEventListener('click', () => {
    if (cardStep < 3) {
      cardStep += 1;
      renderCard();
      return;
    }
    if (!progress.progress.flashcard.seenWordIds.includes(word.id)) {
      progress.progress.flashcard.seenWordIds.push(word.id);
    }
    progress.stats.cardsSeen = Math.max(progress.stats.cardsSeen, progress.progress.flashcard.seenWordIds.length);
    saveState();
    if (isLast) {
      progress.completedSections.cards = true;
      progress.unlockedNodes = Math.max(progress.unlockedNodes, 2);
      saveState();
      startMeaningQuiz();
    } else {
      cardIndex += 1;
      cardStep = 0;
      renderCard();
    }
  });
}

function startMeaningQuiz() {
  quizType = 'meaning';
  const day = getDay();
  // 英→日クイズ用の順番。Flashcard順とは独立して毎回シャッフルする。
  currentQuizSet = buildQuizSetForDay(day, 'meaning');
  quizIndex = 0;
  renderQuiz();
}

function startAudioQuiz() {
  quizType = 'audio';
  const day = getDay();
  // 音声クイズ用の順番。Flashcard順・英→日順とは独立して毎回シャッフルする。
  currentQuizSet = buildQuizSetForDay(day, 'audio');
  quizIndex = 0;
  renderQuiz();
}

function renderQuiz() {
  stopTimer();
  answered = false;
  const day = getDay();
  const quiz = currentQuizSet[quizIndex];
  const title = quizType === 'audio' ? '音声→日本語4択' : '英→日4択';
  const prompt = quizType === 'audio'
    ? `<div class="audio-panel">
        <button class="btn" type="button" id="playAudioBtn">🔊 音声を聞く</button>
        <div class="setting-row compact">
          <span>再生モード</span>
          <button class="mode-toggle" type="button" id="quizAudioModeToggle">${state.settings.audioMode === 'auto' ? '自動再生' : '手動再生'}</button>
        </div>
        <p class="small-note">音声を聞いて、正しい日本語の意味を選んでください。</p>
      </div>`
    : `<div class="hero-word">${escapeHTML(quiz.prompt)}</div>`;

  app.innerHTML = `
    <section class="panel">
      <div class="quiz-head">
        <div>
          <p class="eyebrow">Day ${day.day} / ${title} ${quizIndex + 1} / ${currentQuizSet.length}</p>
          <h2>${title}</h2>
        </div>
        <div class="oxygen-widget" aria-label="Oxygen gauge">
          <span class="oxygen-label">O₂</span>
          <div class="oxygen-rail"><div class="oxygen-fill" id="oxygenFill"></div></div>
          <span class="oxygen-time" id="timer">10</span>
        </div>
      </div>
      <div class="progress-rail"><div class="progress-fill" style="width:${(quizIndex / currentQuizSet.length) * 100}%"></div></div>
    </section>
    <section class="card center">
      ${prompt}
      <div class="choices" id="choices">
        ${getStableChoices(quiz, day).map(choice => `<button class="choice" type="button" data-choice="${escapeAttr(choice)}">${escapeHTML(choice)}</button>`).join('')}
      </div>
      <div id="feedbackArea"></div>
    </section>
  `;

  if (quizType === 'audio') {
    document.getElementById('playAudioBtn').addEventListener('click', () => speak(getSpokenText(quiz)));
    document.getElementById('quizAudioModeToggle').addEventListener('click', () => {
      state.settings.audioMode = state.settings.audioMode === 'auto' ? 'manual' : 'auto';
      saveState();
      renderQuiz();
    });
    if (state.settings.audioMode === 'auto') window.setTimeout(() => speak(getSpokenText(quiz)), 350);
  }

  document.querySelectorAll('.choice').forEach(btn => btn.addEventListener('click', () => chooseAnswer(btn.dataset.choice)));
  startTimer();
}

function chooseAnswer(choice) {
  if (answered) return;
  answered = true;
  stopTimer();
  const progress = getDayProgress();
  const quiz = currentQuizSet[quizIndex];
  const correct = choice === quiz.answer;

  document.querySelectorAll('.choice').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.choice === quiz.answer) btn.classList.add('correct');
    if (btn.dataset.choice === choice && !correct) btn.classList.add('wrong');
  });

  if (quizType === 'meaning') {
    progress.stats.meaningTotal += 1;
    if (!progress.progress.quiz_en_jp.answeredWordIds.includes(quiz.wordId)) progress.progress.quiz_en_jp.answeredWordIds.push(quiz.wordId);
  }
  if (quizType === 'audio') {
    progress.stats.audioTotal += 1;
    if (!progress.progress.quiz_audio.answeredWordIds.includes(quiz.wordId)) progress.progress.quiz_audio.answeredWordIds.push(quiz.wordId);
  }

  if (correct) {
    if (state.settings.correctSound) playCorrectSE();
    if (quizType === 'meaning') {
      progress.stats.meaningCorrect += 1;
      if (!progress.progress.quiz_en_jp.correctWordIds.includes(quiz.wordId)) progress.progress.quiz_en_jp.correctWordIds.push(quiz.wordId);
    }
    if (quizType === 'audio') {
      progress.stats.audioCorrect += 1;
      if (!progress.progress.quiz_audio.correctWordIds.includes(quiz.wordId)) progress.progress.quiz_audio.correctWordIds.push(quiz.wordId);
    }
  } else {
    progress.stats.wrong += 1;
  }
  saveState();
  showFeedback(correct, quiz.explanation);
}

function showFeedback(correct, explanation) {
  const area = document.getElementById('feedbackArea');
  area.innerHTML = `
    <div class="feedback ${correct ? 'ok' : 'ng'}">
      <strong>${correct ? '正解！' : '惜しい！'}</strong><br>
      ${escapeHTML(explanation)}
    </div>
    <div class="btn-row">
      <button class="btn" type="button" id="nextQuizBtn">${quizIndex === currentQuizSet.length - 1 ? '次へ進む' : '次の問題へ'}</button>
    </div>
  `;
  document.getElementById('nextQuizBtn').addEventListener('click', () => {
    if (quizIndex < currentQuizSet.length - 1) {
      quizIndex += 1;
      renderQuiz();
      return;
    }
    const progress = getDayProgress();
    const day = getDay();
    if (quizType === 'meaning') {
      progress.completedSections.meaning = true;
      progress.unlockedNodes = Math.max(progress.unlockedNodes, Math.ceil((day.mapNodes || []).length * 0.6));
      saveState();
      startAudioQuiz();
    } else {
      progress.completedSections.audio = true;
      progress.unlockedNodes = (day.mapNodes || []).length;
      saveState();
      completeCurrentDay();
    }
  });
}

function completeCurrentDay() {
  const key = makeDayKey();
  const day = getDay();
  const progress = getDayProgress();
  const rewards = day.rewards || { pearls: 3, exp: 20 };
  const alreadyCleared = Boolean(state.clearedDays[key]);
  const accuracy = calculateAccuracy(progress.stats);

  if (!alreadyCleared) {
    state.pearls += Number(rewards.pearls || 0);
    state.exp += Number(rewards.exp || 0);
  }

  const clearRecord = {
    clearedAt: new Date().toISOString(),
    accuracy,
    stats: { ...progress.stats },
    rewards,
    rewardGranted: !alreadyCleared
  };
  state.completedDays[key] = true;
  state.clearedDays[key] = clearRecord;
  unlockDay(state.currentUnitId, state.currentDay);
  unlockNextDay(state.currentUnitId, state.currentDay);
  saveState();
  renderClear({ alreadyCleared, rewards, accuracy });
}

function calculateAccuracy(stats) {
  const total = (stats.meaningTotal || 0) + (stats.audioTotal || 0);
  const correct = (stats.meaningCorrect || 0) + (stats.audioCorrect || 0);
  return total ? Math.round((correct / total) * 100) : 0;
}

function startTimer() {
  timerRemaining = 10;
  updateTimer();
  timerId = setInterval(() => {
    timerRemaining -= 1;
    updateTimer();
    if (timerRemaining <= 0) {
      const quiz = currentQuizSet[quizIndex];
      chooseAnswer(`__timeout_${quiz.id}`);
    }
  }, 1000);
}

function updateTimer() {
  const el = document.getElementById('timer');
  const fill = document.getElementById('oxygenFill');
  if (!el) return;
  el.textContent = String(timerRemaining);
  const pct = Math.max(0, Math.min(100, timerRemaining * 10));
  if (fill) {
    fill.style.width = `${pct}%`;
    fill.classList.toggle('low', timerRemaining <= 3);
  }
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function renderClear({ alreadyCleared, rewards, accuracy }) {
  stopTimer();
  setActiveNav('home');
  const unit = getCurrentUnit();
  const day = getDay();
  const nextDay = getNextDayInfo();
  const rewardLine = alreadyCleared
    ? '復習完了！報酬は初回クリア時に獲得済みです。'
    : `Concept Pearls +${rewards.pearls || 0} / Shark Sensei EXP +${rewards.exp || 0}`;

  app.innerHTML = `
    <section class="card celebration">
      <div class="big">🌊🦈✨</div>
      <p class="eyebrow">Day ${day.day} Clear</p>
      <h2>${escapeHTML(day.clearTitle || 'Sea Area Cleared!')}</h2>
      <p class="jp-large">${escapeHTML(day.clearMessage || `${unit.seaName}を解放しました。`)}</p>
      <div class="reward-box">
        <strong>${escapeHTML(rewardLine)}</strong>
        <span>Accuracy ${accuracy}%</span>
      </div>
      <div class="pill-row" style="justify-content:center">
        <span class="pill">Pearls ${state.pearls}</span>
        <span class="pill">EXP ${state.exp}</span>
        <span class="pill">Shark Lv.${calculateLevel()}</span>
      </div>
      <div class="btn-row">
        ${nextDay && isDayUnlocked(nextDay.unit.unitId, nextDay.day.day) ? `<button class="btn" type="button" id="nextDayBtn">Day ${nextDay.day.day}へ進む</button>` : ''}
        <button class="btn secondary" type="button" id="clearMapBtn">海域マップを見る</button>
        <button class="btn ghost dark" type="button" id="homeBtn">Homeへ戻る</button>
      </div>
    </section>
  `;
  const nextBtn = document.getElementById('nextDayBtn');
  if (nextBtn) nextBtn.addEventListener('click', () => goToDay(nextDay.unit.unitId, nextDay.day.day));
  document.getElementById('clearMapBtn').addEventListener('click', renderMap);
  document.getElementById('homeBtn').addEventListener('click', renderHome);
}

function renderMap() {
  setActiveNav('map');
  const unit = getCurrentUnit();
  const day = getDay();
  const progress = getDayProgress();
  const nodes = day.mapNodes || [];
  const dayList = getAllDays();

  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">Ocean Map</p>
      <h2>${escapeHTML(unit.seaName || unit.unitTitle)}</h2>
      <p class="subtle">Dayごとに小さな海域を解放します。大量追加の前に、まずDay 1→Day 2の安定運用を確認します。</p>
    </section>
    <section class="panel day-selector">
      ${dayList.map(item => {
        const active = item.unit.unitId === state.currentUnitId && Number(item.day.day) === Number(state.currentDay);
        const cleared = isDayCleared(item.unit.unitId, item.day.day);
        const unlocked = isDayUnlocked(item.unit.unitId, item.day.day);
        return `<button class="day-chip ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}" type="button" data-unit="${escapeAttr(item.unit.unitId)}" data-day="${item.day.day}" ${unlocked ? '' : 'disabled'}>${cleared ? '✅' : (unlocked ? '🌊' : '🔒')} Day ${item.day.day}</button>`;
      }).join('')}
    </section>
    <section class="panel">
      <p class="eyebrow">Day ${day.day} Concept Route</p>
      <div class="map-list">
        ${nodes.map((node, i) => {
          const unlocked = i < progress.unlockedNodes || isDayCleared();
          return `<div class="map-node ${unlocked ? '' : 'locked'}"><strong>${unlocked ? '🌊' : '🔒'} ${escapeHTML(node)}</strong><span>${unlocked ? '解放' : '未解放'}</span></div>`;
        }).join('')}
      </div>
      <div class="btn-row">
        <button class="btn" type="button" id="mapStartBtn">${isDayCleared() ? 'このDayを復習する' : '冒険を続ける'}</button>
      </div>
    </section>
  `;
  document.querySelectorAll('.day-chip').forEach(btn => {
    btn.addEventListener('click', () => goToDay(btn.dataset.unit, Number(btn.dataset.day)));
  });
  document.getElementById('mapStartBtn').addEventListener('click', startCards);
}

function playCorrectSE() {
  if (!('AudioContext' in window || 'webkitAudioContext' in window)) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = audioCtx || new AudioContextClass();
  const now = audioCtx.currentTime;

  const makeDrop = (start, frequency, gainValue) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, now + start);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.62, now + start + 0.16);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.22);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + start);
    osc.stop(now + start + 0.24);
  };

  makeDrop(0, 820, 0.045);
  makeDrop(0.08, 1240, 0.028);
}

function speak(text) {
  if (!('speechSynthesis' in window)) {
    alert('このブラウザでは音声読み上げに対応していません。');
    return;
  }
  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

function cancelSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function buildQuizSetForDay(day, type) {
  const words = day.words || [];
  const existingQuizzes = type === 'audio' ? (day.audioQuizzes || []) : (day.meaningQuizzes || []);
  const generatedQuizzes = type === 'audio' ? buildAudioQuizzes(day) : buildMeaningQuizzes(day);
  const existingByWordId = new Map(existingQuizzes.filter(q => q.wordId).map(q => [q.wordId, q]));
  const generatedByWordId = new Map(generatedQuizzes.map(q => [q.wordId, q]));

  // day.wordsを基準にすることで、重複出題・出題漏れを防ぐ。
  return shuffle([...words]).map(word => {
    const base = existingByWordId.get(word.id) || generatedByWordId.get(word.id);
    const answer = normalizeMeaning(word.jp);
    const quiz = {
      ...base,
      id: base?.id || `${type === 'audio' ? 'aq' : 'mq'}_${word.id}`,
      wordId: word.id,
      answer: base?.answer || answer,
      explanation: base?.explanation || (type === 'audio'
        ? `${word.word} = ${word.jp}。音から意味を即時に想起する練習です。`
        : `${word.word} = ${word.jp}`)
    };
    if (type === 'audio') quiz.spoken = quiz.spoken || word.word;
    else quiz.prompt = quiz.prompt || word.word;
    quiz.choices = getStableChoices(quiz, day);
    return quiz;
  });
}

function buildMeaningQuizzes(day) {
  const meanings = (day.words || []).map(w => normalizeMeaning(w.jp));
  return (day.words || []).map(w => {
    const answer = normalizeMeaning(w.jp);
    const distractors = meanings.filter(m => m !== answer).concat(['制度', '証拠', '推論', '自律性', '文化', '分類', '監視']);
    return {
      id: `mq_${w.id}`,
      wordId: w.id,
      prompt: w.word,
      answer,
      choices: buildFourChoices(answer, distractors),
      explanation: `${w.word} = ${w.jp}`
    };
  });
}

function buildAudioQuizzes(day) {
  const meanings = (day.words || []).map(w => normalizeMeaning(w.jp));
  return (day.words || []).map(w => {
    const answer = normalizeMeaning(w.jp);
    const distractors = meanings.filter(m => m !== answer).concat(['制度', '証拠', '推論', '自律性', '文化', '分類', '監視']);
    return {
      id: `aq_${w.id}`,
      wordId: w.id,
      spoken: w.word,
      answer,
      choices: buildFourChoices(answer, distractors),
      explanation: `${w.word} = ${w.jp}。音から意味を即時に想起する練習です。`
    };
  });
}

function getStableChoices(quiz, day) {
  const answer = String(quiz.answer || '').trim();
  const dayMeanings = (day.words || []).map(w => normalizeMeaning(w.jp));
  const candidates = [
    ...(Array.isArray(quiz.choices) ? quiz.choices : []),
    ...dayMeanings,
    '制度', '証拠', '推論', '自律性', '文化', '分類', '監視', '革新', '確率', '遺伝', '記号', '証明'
  ];
  return buildFourChoices(answer, candidates);
}

function buildFourChoices(answer, candidates) {
  const cleanAnswer = String(answer || '').trim();
  const unique = [];
  const add = value => {
    const text = String(value || '').trim();
    if (!text) return;
    if (unique.includes(text)) return;
    unique.push(text);
  };
  add(cleanAnswer);
  (candidates || []).forEach(add);
  const fillers = ['制度', '証拠', '推論', '自律性', '文化', '分類', '監視', '革新', '確率', '遺伝', '記号', '証明'];
  fillers.forEach(add);
  return shuffle([cleanAnswer, ...shuffle(unique.filter(choice => choice !== cleanAnswer)).slice(0, 3)]);
}

function getSpokenText(quiz) {
  if (quiz.spoken) return quiz.spoken;
  if (quiz.prompt && quizType === 'audio') return quiz.prompt;
  if (quiz.word) return quiz.word;
  const day = getDay();
  const word = (day.words || []).find(w => w.jp === quiz.answer || normalizeMeaning(w.jp) === quiz.answer);
  return word ? word.word : quiz.answer;
}

function normalizeMeaning(jp) {
  return String(jp || '').split('／').slice(0, 2).join('／').trim();
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/'/g, '&#39;');
}

window.addEventListener('beforeunload', () => {
  stopTimer();
  cancelSpeech();
});

boot();
