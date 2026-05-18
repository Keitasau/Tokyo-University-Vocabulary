'use strict';

const STORAGE_KEY = 'todaiVocabulary.progress.v1';
const LEGACY_STORAGE_KEY = 'avna_learning_loop_v5';
const WEAK_WORDS_STORAGE_KEY = 'todaiVocabulary.weakWords.v1';
const LEGACY_WEAK_WORDS_STORAGE_KEY = 'weakWords';
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
let quizType = 'meaning';
let answered = false;
let audioCtx = null;
let weakReviewQueue = [];
let currentWeakReviewItem = null;

const SECTION_COUNT = 3;

const fallbackData = {
  "meta": {
    "schemaVersion": 2,
    "courseId": "todai-avna",
    "series": "東京大学編",
    "title": "Academic Vocabulary Network Adventure 東京大学編"
  },
  "units": [
    {
      "unitId": "u01",
      "unitTitle": "Perception",
      "seaName": "Perception Sea",
      "days": [
        {
          "day": 1,
          "title": "Do we see reality itself?",
          "mission": "音・意味・概念をつなぎ、Perception Seaの入口を解放しよう。",
          "clearTitle": "Sea Area Cleared!",
          "clearMessage": "Perception Seaの入口を解放しました。",
          "rewards": {
            "pearls": 3,
            "exp": 20
          },
          "mapNodes": [
            "perception",
            "representation",
            "framework",
            "assumption",
            "evidence"
          ],
          "words": [
            {
              "id": "u01_d01_w01",
              "word": "perception",
              "jp": "知覚／認識",
              "coreImage": "外界の情報を、脳が意味ある世界として理解する働き。",
              "root": "per = through, ceive = take / grasp",
              "note": "seeより深く、意味づけを含む。",
              "example": "Perception is not a simple copy of reality.",
              "exampleJp": "知覚は現実の単純なコピーではない。",
              "difficulty": "B2-C1",
              "frequency": "high"
            },
            {
              "id": "u01_d01_w02",
              "word": "representation",
              "jp": "表象／表現",
              "coreImage": "頭の中に作られる世界モデル。",
              "root": "re = again, present = show",
              "note": "realityそのものではなく、心や言語の中で再構成されたもの。",
              "example": "Representations simplify the world.",
              "exampleJp": "表象は世界を単純化する。",
              "difficulty": "C1",
              "frequency": "high"
            },
            {
              "id": "u01_d01_w03",
              "word": "framework",
              "jp": "枠組み",
              "coreImage": "情報や議論を整理するための構造。",
              "root": "frame + work",
              "note": "評論文では、思考の前提や分析の型を示す。",
              "example": "A scientific framework helps us interpret evidence.",
              "exampleJp": "科学的枠組みは証拠を解釈する助けになる。",
              "difficulty": "C1",
              "frequency": "high"
            },
            {
              "id": "u01_d01_w04",
              "word": "assumption",
              "jp": "前提／仮定",
              "coreImage": "議論の土台にある、まだ検証されていない考え。",
              "root": "as = toward, sume = take",
              "note": "東大読解では、筆者や社会の隠れた前提を見抜くことが重要。",
              "example": "The argument depends on a hidden assumption.",
              "exampleJp": "その議論は隠れた前提に依存している。",
              "difficulty": "B2-C1",
              "frequency": "high"
            },
            {
              "id": "u01_d01_w05",
              "word": "evidence",
              "jp": "証拠／根拠",
              "coreImage": "主張を支える観察・事実・データ。",
              "root": "e = out, vid = see",
              "note": "argumentとセットで読解上きわめて重要。",
              "example": "Claims should be supported by reliable evidence.",
              "exampleJp": "主張は信頼できる証拠によって支えられるべきである。",
              "difficulty": "B1-B2",
              "frequency": "high"
            }
          ],
          "meaningQuizzes": [],
          "audioQuizzes": []
        },
        {
          "day": 2,
          "title": "How does the mind organize the world?",
          "mission": "認知・概念・文脈をつなぎ、見えたものを思考に変えよう。",
          "clearTitle": "Sea Area Cleared!",
          "clearMessage": "Perception Seaの浅瀬を越えました。",
          "rewards": {
            "pearls": 3,
            "exp": 20
          },
          "mapNodes": [
            "cognition",
            "concept",
            "context",
            "inference",
            "observation",
            "phenomenon"
          ],
          "words": [
            {
              "id": "u01_d02_w01",
              "word": "cognition",
              "jp": "認知",
              "coreImage": "知覚・記憶・推論を含む心の働き。",
              "root": "cogn = know",
              "note": "AI・心理学・哲学テーマに接続する中核語。",
              "example": "Human cognition is shaped by language and culture.",
              "exampleJp": "人間の認知は言語と文化によって形作られる。",
              "difficulty": "C1",
              "frequency": "high"
            },
            {
              "id": "u01_d02_w02",
              "word": "concept",
              "jp": "概念",
              "coreImage": "複数の事例をまとめる抽象的な考え。",
              "root": "con = together, cept = take / grasp",
              "note": "抽象評論の基本語。conceptual, conceptionにもつながる。",
              "example": "The concept of intelligence has changed over time.",
              "exampleJp": "知能という概念は時代とともに変化してきた。",
              "difficulty": "B2",
              "frequency": "high"
            },
            {
              "id": "u01_d02_w03",
              "word": "context",
              "jp": "文脈／状況",
              "coreImage": "言葉や行動の意味を決める周囲の条件。",
              "root": "con = together, text = weave",
              "note": "同じ表現でもcontextが変わると意味が変わる。",
              "example": "Meaning depends heavily on context.",
              "exampleJp": "意味は文脈に大きく依存する。",
              "difficulty": "B2",
              "frequency": "high"
            },
            {
              "id": "u01_d02_w04",
              "word": "inference",
              "jp": "推論",
              "coreImage": "直接書かれていないことを根拠から導くこと。",
              "root": "in = into, fer = carry",
              "note": "東大読解では、明示情報からの論理的読み取りが重要。",
              "example": "Readers often make inferences from small details.",
              "exampleJp": "読者はしばしば小さな細部から推論を行う。",
              "difficulty": "B2-C1",
              "frequency": "high"
            },
            {
              "id": "u01_d02_w05",
              "word": "observation",
              "jp": "観察",
              "coreImage": "対象を注意深く見て情報を得ること。",
              "root": "ob = toward, serv = watch / keep",
              "note": "科学的議論では evidence の出発点になる。",
              "example": "Careful observation can challenge common beliefs.",
              "exampleJp": "注意深い観察は一般的な信念に疑問を投げかけることがある。",
              "difficulty": "B2",
              "frequency": "medium"
            },
            {
              "id": "u01_d02_w06",
              "word": "phenomenon",
              "jp": "現象",
              "coreImage": "観察される出来事や事実。",
              "root": "Greek phainein = appear",
              "note": "自然科学・社会科学の評論で頻出。複数形はphenomena。",
              "example": "Language change is a social phenomenon.",
              "exampleJp": "言語変化は社会的現象である。",
              "difficulty": "B2-C1",
              "frequency": "high"
            }
          ],
          "meaningQuizzes": [],
          "audioQuizzes": []
        },
        {
          "day": 3,
          "title": "Can we interpret the world without bias?",
          "mission": "interpretation / perspective / bias 系の語を回収し、見方の偏りを読み解こう。",
          "clearTitle": "Sea Area Cleared!",
          "clearMessage": "Interpretation Reefを解放しました。",
          "rewards": {
            "pearls": 3,
            "exp": 20
          },
          "mapNodes": [
            "interpretation",
            "perspective",
            "bias",
            "subjective",
            "objective",
            "distort",
            "evaluate"
          ],
          "words": [
            {
              "id": "u01_d03_w01",
              "word": "interpretation",
              "jp": "解釈",
              "coreImage": "情報や出来事に意味を与える読み取り。",
              "root": "inter = between, pret = explain",
              "note": "同じ事実でも、解釈によって議論の方向が変わる。",
              "example": "Different cultures may offer different interpretations of the same event.",
              "exampleJp": "異なる文化は同じ出来事に異なる解釈を与えることがある。",
              "difficulty": "B2-C1",
              "frequency": "high"
            },
            {
              "id": "u01_d03_w02",
              "word": "perspective",
              "jp": "視点／見方",
              "coreImage": "どの位置から世界を見るかという心の構え。",
              "root": "per = through, spect = look",
              "note": "perspectiveが変わると、同じ情報の意味も変わる。",
              "example": "Changing perspective can change the meaning of experience.",
              "exampleJp": "視点を変えることで経験の意味が変わることがある。",
              "difficulty": "B2",
              "frequency": "high"
            },
            {
              "id": "u01_d03_w03",
              "word": "bias",
              "jp": "偏り／先入観",
              "coreImage": "判断を一方向に傾ける見えない力。",
              "root": "Old French biais = slant",
              "note": "認知バイアス、メディアバイアスなど評論で非常に重要。",
              "example": "Bias can affect how we interpret evidence.",
              "exampleJp": "偏りは、私たちが証拠をどう解釈するかに影響しうる。",
              "difficulty": "B2",
              "frequency": "high"
            },
            {
              "id": "u01_d03_w04",
              "word": "subjective",
              "jp": "主観的な",
              "coreImage": "見る人の感情・経験・立場に左右される状態。",
              "root": "sub = under, ject = throw",
              "note": "objectiveとの対比で読解上重要。",
              "example": "Memory is often more subjective than we realize.",
              "exampleJp": "記憶は私たちが思う以上に主観的であることが多い。",
              "difficulty": "B2-C1",
              "frequency": "high"
            },
            {
              "id": "u01_d03_w05",
              "word": "objective",
              "jp": "客観的な",
              "coreImage": "個人の感情や立場から離れて判断しようとする状態。",
              "root": "ob = against, ject = throw",
              "note": "subjectiveとの対比で使う。完全な客観性が可能かという論点にも接続する。",
              "example": "Scientific writing aims to be as objective as possible.",
              "exampleJp": "科学的文章はできるだけ客観的であることを目指す。",
              "difficulty": "B2",
              "frequency": "high"
            },
            {
              "id": "u01_d03_w06",
              "word": "distort",
              "jp": "歪める",
              "coreImage": "事実や形を本来とは違う方向に曲げること。",
              "root": "dis = apart, tort = twist",
              "note": "distorted memory / distorted image のように使う。",
              "example": "Prejudice may distort our view of others.",
              "exampleJp": "偏見は他者に対する私たちの見方を歪めることがある。",
              "difficulty": "C1",
              "frequency": "medium"
            },
            {
              "id": "u01_d03_w07",
              "word": "evaluate",
              "jp": "評価する",
              "coreImage": "価値や妥当性を基準に照らして判断すること。",
              "root": "e = out, value = worth",
              "note": "東大読解では、筆者の主張や根拠の評価に関わる。",
              "example": "We need to evaluate information before accepting it.",
              "exampleJp": "情報を受け入れる前に評価する必要がある。",
              "difficulty": "B2",
              "frequency": "high"
            }
          ],
          "meaningQuizzes": [],
          "audioQuizzes": []
        }
      ]
    }
  ]
};

function defaultState() {
  return {
    schemaVersion: 5,
    currentUnitId: 'u01',
    currentDay: 1,
    exp: 0,
    pearls: 0,
    clearedDays: {},
    dayProgress: {},
    settings: { audioMode: 'manual', correctSound: true }
  };
}

function defaultDayProgress() {
  return {
    unlockedNodes: 1,
    completedSections: { cards: false, meaning: false, audio: false },
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
  if (raw && Array.isArray(raw.units)) return raw;
  return {
    meta: {
      schemaVersion: 2,
      courseId: raw?.course?.courseId || 'todai-avna',
      series: raw?.course?.title || 'Academic Vocabulary Network',
      title: raw?.course?.title || 'Academic Vocabulary Network Adventure'
    },
    units: [
      {
        unitId: raw?.course?.unitId || 'u01',
        unitTitle: raw?.course?.unitTitle || 'Unit 1',
        seaName: raw?.course?.seaName || 'Concept Sea',
        days: [
          {
            day: raw?.course?.day || 1,
            title: raw?.course?.coreQuestion || 'Core Question',
            mission: raw?.course?.mission || '今日の語彙を学習しよう。',
            clearTitle: 'Sea Area Cleared!',
            clearMessage: `${raw?.course?.seaName || 'Concept Sea'}を解放しました。`,
            rewards: { pearls: 3, exp: 20 },
            words: raw?.words || [],
            meaningQuizzes: raw?.meaningQuizzes || [],
            audioQuizzes: raw?.audioQuizzes || [],
            mapNodes: raw?.mapNodes || []
          }
        ]
      }
    ]
  };
}

function loadState() {
  const base = defaultState();
  try {
    const savedRaw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const saved = savedRaw ? JSON.parse(savedRaw) : null;
    if (!saved) return base;
    return {
      ...base,
      ...saved,
      currentDay: Number(saved.currentDay || base.currentDay),
      clearedDays: { ...base.clearedDays, ...(saved.clearedDays || {}) },
      dayProgress: normalizeSavedDayProgress(saved.dayProgress || {}),
      settings: { ...base.settings, ...(saved.settings || {}) }
    };
  } catch (_) {
    return base;
  }
}

function normalizeSavedDayProgress(savedProgress) {
  const normalized = {};
  Object.entries(savedProgress || {}).forEach(([key, value]) => {
    const base = defaultDayProgress();
    normalized[key] = {
      ...base,
      ...(value || {}),
      stats: { ...base.stats, ...((value || {}).stats || {}) },
      completedSections: { ...base.completedSections, ...((value || {}).completedSections || {}) }
    };
  });
  return normalized;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateHeader();
}

function getUnits() { return data.units || []; }
function getCurrentUnit() { return getUnits().find(unit => unit.unitId === state.currentUnitId) || getUnits()[0]; }
function getDay(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const unit = getUnits().find(u => u.unitId === unitId) || getUnits()[0];
  return unit.days.find(day => Number(day.day) === Number(dayNumber)) || unit.days[0];
}
function getAllDays() { return getUnits().flatMap(unit => unit.days.map(day => ({ unit, day }))); }
function makeDayKey(unitId = state.currentUnitId, dayNumber = state.currentDay) { return `${unitId}_d${String(dayNumber).padStart(2, '0')}`; }
function getDayProgress(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const key = makeDayKey(unitId, dayNumber);
  if (!state.dayProgress[key]) state.dayProgress[key] = defaultDayProgress();
  const base = defaultDayProgress();
  state.dayProgress[key] = {
    ...base,
    ...state.dayProgress[key],
    stats: { ...base.stats, ...(state.dayProgress[key].stats || {}) },
    completedSections: { ...base.completedSections, ...(state.dayProgress[key].completedSections || {}) }
  };
  return state.dayProgress[key];
}

function ensureCurrentDayExists() {
  const days = getAllDays();
  if (!days.length) return;
  const exists = days.some(item => item.unit.unitId === state.currentUnitId && Number(item.day.day) === Number(state.currentDay));
  if (!exists) {
    const firstOpen = getFirstUnclearedDayInfo() || days[0];
    state.currentUnitId = firstOpen.unit.unitId;
    state.currentDay = Number(firstOpen.day.day);
    return;
  }
  if (!isDayUnlocked(state.currentUnitId, state.currentDay)) {
    const firstOpen = getFirstUnclearedDayInfo() || days[0];
    state.currentUnitId = firstOpen.unit.unitId;
    state.currentDay = Number(firstOpen.day.day);
  }
}
function getDayIndex(unitId, dayNumber) {
  return getAllDays().findIndex(item => item.unit.unitId === unitId && Number(item.day.day) === Number(dayNumber));
}
function getNextDayInfo(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const days = getAllDays();
  const nowIndex = getDayIndex(unitId, dayNumber);
  return days[nowIndex + 1] || null;
}
function getPreviousDayInfo(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const days = getAllDays();
  const nowIndex = getDayIndex(unitId, dayNumber);
  return days[nowIndex - 1] || null;
}
function getFirstUnclearedDayInfo() {
  return getAllDays().find(({ unit, day }) => !isDayCleared(unit.unitId, day.day)) || getAllDays()[0] || null;
}
function isDayCleared(unitId = state.currentUnitId, dayNumber = state.currentDay) { return Boolean(state.clearedDays[makeDayKey(unitId, dayNumber)]); }
function isDayUnlocked(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const index = getDayIndex(unitId, dayNumber);
  if (index <= 0) return true;
  const previous = getPreviousDayInfo(unitId, dayNumber);
  return previous ? isDayCleared(previous.unit.unitId, previous.day.day) : true;
}
function isSectionComplete(sectionName, unitId = state.currentUnitId, dayNumber = state.currentDay) {
  return Boolean(getDayProgress(unitId, dayNumber).completedSections[sectionName]);
}
function isLearningDayComplete(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const completed = getDayProgress(unitId, dayNumber).completedSections;
  return Boolean(completed.cards && completed.meaning && completed.audio);
}
function sectionProgress(unitId = state.currentUnitId, dayNumber = state.currentDay) {
  const completed = getDayProgress(unitId, dayNumber).completedSections;
  const done = ['cards', 'meaning', 'audio'].filter(key => completed[key]).length;
  return Math.round((done / SECTION_COUNT) * 100);
}
function calculateLevel(exp = state.exp) { return Math.max(1, Math.floor(exp / 40) + 1); }
function updateHeader() { levelLabel.textContent = `Lv.${calculateLevel()}`; }

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      stopTimer();
      cancelSpeech();
      setActiveNav(nav);
      if (nav === 'home') renderHome();
      if (nav === 'map') renderMap();
      if (nav === 'cards') startCards();
      if (nav === 'weak') renderWeakWords();
      if (nav === 'reset') resetState();
    });
  });
}

function setActiveNav(nav) {
  document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.toggle('active', btn.dataset.nav === nav));
}

function resetState() {
  if (!confirm('この端末の学習進捗とWeak Wordsをリセットしますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(WEAK_WORDS_STORAGE_KEY);
  localStorage.removeItem(LEGACY_WEAK_WORDS_STORAGE_KEY);
  state = defaultState();
  ensureCurrentDayExists();
  saveState();
  renderHome();
}

function renderHome() {
  setActiveNav('home');
  const unit = getCurrentUnit();
  const day = getDay();
  const progress = getDayProgress();
  const weakCount = Object.keys(loadWeakWords()).length;
  const percent = sectionProgress();
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">${escapeHTML(unit.seaName || unit.unitTitle)}</p>
      <h2>Day ${escapeHTML(day.day)}: ${escapeHTML(day.title || 'Today\'s Mission')}</h2>
      <p class="muted">${escapeHTML(day.mission || '今日の語彙を学習しましょう。')}</p>
      <div class="progress-rail"><div class="progress-fill" style="width:${percent}%"></div></div>
      <p class="small-note">今日の達成率：${percent}%</p>
      <div class="stats-grid">
        <div class="stat"><strong>${state.pearls}</strong><span>Pearls</span></div>
        <div class="stat"><strong>${state.exp}</strong><span>EXP</span></div>
        <div class="stat"><strong>${weakCount}</strong><span>Weak</span></div>
      </div>
    </section>
    <section class="card">
      <h3>今日の学習ループ</h3>
      <p class="small-note">Cards → 英→日4択 → Listening Quiz の順に進めます。間違えた語はWeak Wordsに自動保存されます。</p>
      <div class="btn-row">
        <button class="btn" type="button" id="startCardsBtn">${isSectionComplete('cards') ? '✅ ' : ''}カード学習を始める</button>
        <button class="btn ghost" type="button" id="startMeaningBtn">${isSectionComplete('meaning') ? '✅ ' : ''}英→日4択</button>
        <button class="btn ghost" type="button" id="startAudioBtn">${isSectionComplete('audio') ? '✅ ' : ''}Listening Quiz</button>
        <button class="btn ghost" type="button" id="weakHomeBtn">Weak Wordsを見る</button>
      </div>
    </section>
  `;
  document.getElementById('startCardsBtn').addEventListener('click', startCards);
  document.getElementById('startMeaningBtn').addEventListener('click', () => startQuiz('meaning'));
  document.getElementById('startAudioBtn').addEventListener('click', () => startQuiz('audio'));
  document.getElementById('weakHomeBtn').addEventListener('click', renderWeakWords);
}

function renderMap() {
  setActiveNav('map');
  const items = getAllDays();
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">Sea Map</p>
      <h2>Deep Sea Route</h2>
      <p class="muted">今回はWeak Words実装のみなので、マップ構造は現状維持の軽量表示です。</p>
    </section>
    <section class="map-grid">
      ${items.map(({unit, day}) => {
        const done = isDayCleared(unit.unitId, day.day);
        const active = unit.unitId === state.currentUnitId && Number(day.day) === Number(state.currentDay);
        const unlocked = isDayUnlocked(unit.unitId, day.day);
        return `<button class="map-node ${done ? 'done' : ''} ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}" type="button" data-unit="${escapeAttr(unit.unitId)}" data-day="${escapeAttr(day.day)}" ${!unlocked ? 'disabled' : ''}>
          <strong>${done ? '✅' : active ? '🫧' : unlocked ? '🌊' : '🔒'} Day ${escapeHTML(day.day)}</strong><br>
          <span class="muted">${escapeHTML(day.title || unit.seaName || unit.unitTitle)}</span>
        </button>`;
      }).join('')}
    </section>
  `;
  document.querySelectorAll('.map-node').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentUnitId = btn.dataset.unit;
      state.currentDay = Number(btn.dataset.day);
      saveState();
      renderHome();
    });
  });
}

function startCards() {
  setActiveNav('cards');
  cardIndex = 0;
  cardStep = 0;
  renderCard();
}

function renderCard() {
  const day = getDay();
  const words = getWordsForDay(day);
  if (!words.length) {
    app.innerHTML = `<section class="card"><h2>No Cards</h2><p>このDayには単語が登録されていません。</p></section>`;
    return;
  }
  const word = words[cardIndex % words.length];
  const flipped = cardStep % 2 === 1;
  const progress = getDayProgress();
  progress.stats.cardsSeen = Math.max(progress.stats.cardsSeen, cardIndex + 1);
  if (cardIndex >= words.length - 1) progress.completedSections.cards = true;
  saveState();
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">Flashcard ${cardIndex + 1} / ${words.length}</p>
      <div class="progress-rail"><div class="progress-fill" style="width:${((cardIndex + 1) / words.length) * 100}%"></div></div>
    </section>
    <section class="card card-flip ${flipped ? 'flipped' : ''}" id="flashcard" role="button" tabindex="0" aria-label="カードをめくる">
      <div class="card-inner">
        <div class="card-face front center">
          <p class="eyebrow">Tap to reveal</p>
          <div class="hero-word">${escapeHTML(getWordText(word))}</div>
          <div class="meta-tags">${renderTags(word)}</div>
        </div>
        <div class="card-face back center">
          <div class="jp-large">${escapeHTML(getMeaningText(word))}</div>
          <p>${escapeHTML(word.coreImage || word.note || '')}</p>
          <p class="small-note"><strong>Example:</strong> ${escapeHTML(word.example || '')}<br>${escapeHTML(word.exampleJp || word.translation || '')}</p>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="btn-row">
        <button class="btn" type="button" id="speakCardBtn">音声を聞く</button>
        <button class="btn ghost" type="button" id="prevCardBtn">前へ</button>
        <button class="btn ghost" type="button" id="nextCardBtn">次へ</button>
        <button class="btn ghost" type="button" id="toMeaningBtn">英→日4択へ</button>
      </div>
    </section>
  `;
  document.getElementById('flashcard').addEventListener('click', () => { cardStep += 1; renderCard(); });
  document.getElementById('speakCardBtn').addEventListener('click', () => speak(getWordText(word)));
  document.getElementById('prevCardBtn').addEventListener('click', () => { cardIndex = (cardIndex - 1 + words.length) % words.length; cardStep = 0; renderCard(); });
  document.getElementById('nextCardBtn').addEventListener('click', () => { cardIndex = (cardIndex + 1) % words.length; cardStep = 0; renderCard(); });
  document.getElementById('toMeaningBtn').addEventListener('click', () => startQuiz('meaning'));
}

function startQuiz(type) {
  quizType = type;
  quizIndex = 0;
  currentQuizSet = buildQuizSet(type);
  if (!currentQuizSet.length) {
    app.innerHTML = `<section class="card"><h2>No Quiz</h2><p>クイズを作成できませんでした。</p></section>`;
    return;
  }
  renderQuiz();
}

function buildQuizSet(type) {
  const day = getDay();
  const words = getWordsForDay(day);
  const prepared = type === 'audio' ? day.audioQuizzes : day.meaningQuizzes;
  if (Array.isArray(prepared) && prepared.length > 0) return prepared.map(q => normalizeQuiz(q));
  return words.map(word => {
    const answer = getMeaningText(word);
    return {
      id: word.id || getWordText(word),
      word: getWordText(word),
      answer,
      choices: makeMeaningChoices(answer),
      explanation: `${getWordText(word)} = ${answer}`,
      sourceWord: word
    };
  });
}

function normalizeQuiz(q) {
  const word = q.sourceWord || findWordByText(q.word || q.prompt || q.answer) || q;
  return {
    id: q.id || word.id || q.word || q.prompt,
    word: q.word || q.prompt || getWordText(word),
    answer: q.answer || q.correct || getMeaningText(word),
    choices: q.choices || makeMeaningChoices(q.answer || q.correct || getMeaningText(word)),
    explanation: q.explanation || `${q.word || getWordText(word)} = ${q.answer || getMeaningText(word)}`,
    sourceWord: word
  };
}

function renderQuiz() {
  answered = false;
  const day = getDay();
  const quiz = currentQuizSet[quizIndex];
  const title = quizType === 'audio' ? 'Listening Quiz' : '英→日4択';
  const prompt = quizType === 'audio'
    ? `<button class="btn" type="button" id="playAudioBtn">▶ 音声を再生</button><p class="small-note">音を聞いて、日本語の意味を選んでください。</p>`
    : `<div class="hero-word">${escapeHTML(quiz.word)}</div><p class="small-note">この英単語の意味を選んでください。</p>`;

  app.innerHTML = `
    <section class="panel">
      <div class="quiz-head">
        <div>
          <p class="eyebrow">Day ${escapeHTML(day.day)} / ${title} ${quizIndex + 1} / ${currentQuizSet.length}</p>
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
        ${shuffle(quiz.choices).map(choice => `<button class="choice" type="button" data-choice="${escapeAttr(choice)}">${escapeHTML(choice)}</button>`).join('')}
      </div>
      <div id="feedbackArea"></div>
    </section>
  `;
  if (quizType === 'audio') {
    document.getElementById('playAudioBtn').addEventListener('click', () => speak(quiz.word));
    window.setTimeout(() => speak(quiz.word), 350);
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
  if (quizType === 'meaning') progress.stats.meaningTotal += 1;
  if (quizType === 'audio') progress.stats.audioTotal += 1;
  if (correct) {
    if (state.settings.correctSound) playCorrectSE();
    if (quizType === 'meaning') progress.stats.meaningCorrect += 1;
    if (quizType === 'audio') progress.stats.audioCorrect += 1;
  } else {
    progress.stats.wrong += 1;
    addWeakWord(quiz.sourceWord || quiz);
  }
  saveState();
  showFeedback(correct, quiz.explanation);
}

function showFeedback(correct, explanation) {
  const area = document.getElementById('feedbackArea');
  area.innerHTML = `
    <div class="feedback ${correct ? 'ok' : 'ng'}">
      <strong>${correct ? '正解！' : 'Weak Wordsに追加しました'}</strong><br>
      ${escapeHTML(explanation || '')}
    </div>
    <div class="btn-row">
      <button class="btn" type="button" id="nextQuizBtn">${quizIndex === currentQuizSet.length - 1 ? '結果を見る' : '次へ'}</button>
    </div>
  `;
  document.getElementById('nextQuizBtn').addEventListener('click', nextQuiz);
}

function nextQuiz() {
  quizIndex += 1;
  if (quizIndex >= currentQuizSet.length) {
    completeQuizSection();
    return;
  }
  renderQuiz();
}

function completeQuizSection() {
  const completedUnitId = state.currentUnitId;
  const completedDayNumber = state.currentDay;
  const completedDay = getDay(completedUnitId, completedDayNumber);
  const progress = getDayProgress(completedUnitId, completedDayNumber);
  progress.completedSections[quizType === 'audio' ? 'audio' : 'meaning'] = true;

  let dayJustCleared = false;
  let nextInfo = getNextDayInfo(completedUnitId, completedDayNumber);
  if (isLearningDayComplete(completedUnitId, completedDayNumber) && !isDayCleared(completedUnitId, completedDayNumber)) {
    dayJustCleared = clearDay(completedUnitId, completedDayNumber);
    nextInfo = getNextDayInfo(completedUnitId, completedDayNumber);
    if (nextInfo) {
      state.currentUnitId = nextInfo.unit.unitId;
      state.currentDay = Number(nextInfo.day.day);
    }
  }
  saveState();
  renderQuizResult({ completedDay, completedDayNumber, dayJustCleared, nextInfo });
}

function clearDay(unitId, dayNumber) {
  const day = getDay(unitId, dayNumber);
  const key = makeDayKey(unitId, dayNumber);
  if (state.clearedDays[key]) return false;
  state.clearedDays[key] = true;
  state.exp += Number(day.rewards?.exp || 20);
  state.pearls += Number(day.rewards?.pearls || 3);
  return true;
}

function renderQuizResult(context = {}) {
  const weakCount = Object.keys(loadWeakWords()).length;
  const nextDayLabel = context.nextInfo ? `次は Day ${escapeHTML(context.nextInfo.day.day)} へ進めます。` : '登録済みのDayはすべて完了しました。';
  app.innerHTML = `
    <section class="card center result-card">
      <h2>${quizType === 'audio' ? 'Listening Complete' : 'Meaning Quiz Complete'}</h2>
      <p class="jp-large">${context.dayJustCleared ? `Day ${escapeHTML(context.completedDayNumber)} CLEAR!` : '今日の学習が一歩進みました。'}</p>
      <p class="small-note">${context.dayJustCleared ? nextDayLabel : 'Cards・英→日4択・Listening Quizがそろうと次のDayが解放されます。'}</p>
      <p class="small-note">Weak Words：${weakCount}語。間違えた語はWeak Words Reviewで回収できます。</p>
      <div class="btn-row">
        <button class="btn" type="button" id="resultHomeBtn">Homeへ</button>
        <button class="btn ghost" type="button" id="resultWeakBtn">Weak Words Review</button>
      </div>
    </section>
  `;
  document.getElementById('resultHomeBtn').addEventListener('click', renderHome);
  document.getElementById('resultWeakBtn').addEventListener('click', startWeakWordsReview);
}

function startTimer() {
  stopTimer();
  timerRemaining = 10;
  updateTimerUI();
  timerId = window.setInterval(() => {
    timerRemaining -= 1;
    updateTimerUI();
    if (timerRemaining <= 0) {
      stopTimer();
      if (!answered) chooseAnswer('__TIMEOUT__');
    }
  }, 1000);
}
function stopTimer() { if (timerId) window.clearInterval(timerId); timerId = null; }
function updateTimerUI() {
  const timer = document.getElementById('timer');
  const fill = document.getElementById('oxygenFill');
  if (timer) timer.textContent = String(timerRemaining);
  if (fill) fill.style.width = `${Math.max(0, timerRemaining) * 10}%`;
}

function loadWeakWords() {
  try {
    const savedRaw = localStorage.getItem(WEAK_WORDS_STORAGE_KEY) || localStorage.getItem(LEGACY_WEAK_WORDS_STORAGE_KEY);
    return savedRaw ? JSON.parse(savedRaw) || {} : {};
  } catch (_) {
    return {};
  }
}
function saveWeakWords(weakWords) { localStorage.setItem(WEAK_WORDS_STORAGE_KEY, JSON.stringify(weakWords)); }
function addWeakWord(wordItem) {
  const wordKey = getWordText(wordItem);
  const meaning = getMeaningText(wordItem);
  if (!wordKey || !meaning) return;
  const weakWords = loadWeakWords();
  if (!weakWords[wordKey]) {
    weakWords[wordKey] = { word: wordKey, meaning, mistakes: 0, correctReviewCount: 0, lastMistakeDay: state?.currentDay || 1 };
  }
  weakWords[wordKey].mistakes += 1;
  weakWords[wordKey].correctReviewCount = 0;
  weakWords[wordKey].meaning = meaning;
  weakWords[wordKey].lastMistakeDay = state?.currentDay || weakWords[wordKey].lastMistakeDay || 1;
  saveWeakWords(weakWords);
}
function recordWeakReviewResult(wordKey, isCorrect) {
  const weakWords = loadWeakWords();
  if (!weakWords[wordKey]) return;
  if (isCorrect) {
    weakWords[wordKey].correctReviewCount += 1;
    if (weakWords[wordKey].correctReviewCount >= 2) {
      delete weakWords[wordKey];
      showToast('Weak Wordsから卒業しました！');
    } else {
      showToast('正解！あと1回連続正解で卒業です。');
    }
  } else {
    weakWords[wordKey].mistakes += 1;
    weakWords[wordKey].correctReviewCount = 0;
    showToast('もう一度復習しましょう。連続正解数はリセットされました。');
  }
  saveWeakWords(weakWords);
}

function renderWeakWords() {
  setActiveNav('weak');
  stopTimer();
  cancelSpeech();
  const weakWords = loadWeakWords();
  const weakList = Object.values(weakWords);
  if (weakList.length === 0) {
    app.innerHTML = `
      <section class="card center">
        <h2>Weak Words</h2>
        <p class="positive-message">Weak Wordsはありません。今日の学習は順調です。</p>
        <button class="btn" type="button" id="weakHomeReturnBtn">Homeに戻る</button>
      </section>
    `;
    document.getElementById('weakHomeReturnBtn').addEventListener('click', renderHome);
    return;
  }
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">Retrieval Practice</p>
      <h2>Weak Words</h2>
      <p class="muted">間違えた語だけを回収します。2回連続正解で卒業です。</p>
    </section>
    <section class="card">
      <ul class="weak-word-list">
        ${weakList.map(item => {
          const remaining = Math.max(0, 2 - Number(item.correctReviewCount || 0));
          return `<li class="weak-word-item">
            <div><strong>${escapeHTML(item.word)}</strong><p>${escapeHTML(item.meaning || '意味情報なし')}</p></div>
            <div class="weak-word-meta"><span>Miss: ${Number(item.mistakes || 0)}</span><span>卒業まであと ${remaining} 回</span></div>
          </li>`;
        }).join('')}
      </ul>
      <div class="btn-row">
        <button class="btn" type="button" id="startWeakReviewBtn">Weak Words Reviewを始める</button>
        <button class="btn ghost" type="button" id="weakHomeBtn2">Homeに戻る</button>
      </div>
    </section>
  `;
  document.getElementById('startWeakReviewBtn').addEventListener('click', startWeakWordsReview);
  document.getElementById('weakHomeBtn2').addEventListener('click', renderHome);
}

function startWeakWordsReview() {
  setActiveNav('weak');
  const weakWords = loadWeakWords();
  weakReviewQueue = shuffle(Object.values(weakWords));
  if (weakReviewQueue.length === 0) { renderWeakWords(); return; }
  showNextWeakReviewQuestion();
}

function showNextWeakReviewQuestion() {
  if (weakReviewQueue.length === 0) {
    const remainingWeakWords = Object.values(loadWeakWords()).length;
    app.innerHTML = `
      <section class="card center">
        <h2>Review Complete</h2>
        <p class="jp-large">Weak Words Reviewが完了しました。</p>
        <p>残りのWeak Words：<strong>${remainingWeakWords}</strong> 語</p>
        <div class="btn-row">
          <button class="btn" type="button" id="backWeakListBtn">Weak Words一覧へ</button>
          <button class="btn ghost" type="button" id="backHomeFromWeakBtn">Homeに戻る</button>
        </div>
      </section>
    `;
    document.getElementById('backWeakListBtn').addEventListener('click', renderWeakWords);
    document.getElementById('backHomeFromWeakBtn').addEventListener('click', renderHome);
    return;
  }
  currentWeakReviewItem = weakReviewQueue.shift();
  const choices = makeMeaningChoices(currentWeakReviewItem.meaning);
  app.innerHTML = `
    <section class="panel">
      <p class="eyebrow">Weak Words Review</p>
      <h2>意味を選んでください</h2>
      <p class="muted">音声なし。苦手語だけをすばやく回収します。</p>
    </section>
    <section class="card center">
      <div class="weak-review-word">${escapeHTML(currentWeakReviewItem.word)}</div>
      <div class="choices">
        ${shuffle(choices).map(choice => `<button class="choice" type="button" data-choice="${escapeAttr(choice)}">${escapeHTML(choice)}</button>`).join('')}
      </div>
      <div id="weakFeedbackArea"></div>
    </section>
  `;
  document.querySelectorAll('.choice').forEach(btn => btn.addEventListener('click', () => answerWeakReview(btn.dataset.choice)));
}

function answerWeakReview(selectedMeaning) {
  if (!currentWeakReviewItem) return;
  const correctMeaning = currentWeakReviewItem.meaning;
  const isCorrect = selectedMeaning === correctMeaning;
  document.querySelectorAll('.choice').forEach(btn => {
    btn.disabled = true;
    if (btn.dataset.choice === correctMeaning) btn.classList.add('correct');
    if (btn.dataset.choice === selectedMeaning && !isCorrect) btn.classList.add('wrong');
  });
  recordWeakReviewResult(currentWeakReviewItem.word, isCorrect);
  const area = document.getElementById('weakFeedbackArea');
  area.innerHTML = `
    <div class="feedback ${isCorrect ? 'ok' : 'ng'}">
      <strong>${isCorrect ? 'Correct!' : 'Review Again'}</strong><br>
      ${escapeHTML(currentWeakReviewItem.word)} = ${escapeHTML(correctMeaning)}
    </div>
    <div class="btn-row"><button class="btn" type="button" id="nextWeakBtn">次へ</button></div>
  `;
  document.getElementById('nextWeakBtn').addEventListener('click', showNextWeakReviewQuestion);
}

function getWordsForDay(day) { return Array.isArray(day.words) ? day.words : []; }
function getAllWords() { return getAllDays().flatMap(({ day }) => getWordsForDay(day)); }
function getWordText(item = {}) { return String(item.word || item.english || item.term || item.name || item.prompt || '').trim(); }
function getMeaningText(item = {}) { return String(item.jp || item.japanese || item.meaning || item.ja || item.translation || item.definition || item.answer || '').trim(); }
function findWordByText(text) { const target = String(text || '').toLowerCase(); return getAllWords().find(w => getWordText(w).toLowerCase() === target); }
function makeMeaningChoices(answer) {
  const pool = getAllWords().map(getMeaningText).filter(v => v && v !== answer);
  const unique = [...new Set(pool)];
  const choices = shuffle(unique).slice(0, 3);
  while (choices.length < 3) choices.push(['制度','推論','証拠','概念','構造','認識'][choices.length] || '別の意味');
  return shuffle([...choices, answer]);
}
function renderTags(word) {
  const tags = [word.root, word.difficulty, word.frequency].filter(Boolean).slice(0, 3);
  return tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('');
}
function shuffle(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  cancelSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}
function cancelSpeech() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
function playCorrectSE() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 740;
    gain.gain.value = 0.03;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.frequency.exponentialRampToValueAtTime(980, audioCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (_) {}
}
function showToast(message) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = message;
  document.body.appendChild(div);
  requestAnimationFrame(() => div.classList.add('show'));
  window.setTimeout(() => {
    div.classList.remove('show');
    window.setTimeout(() => div.remove(), 260);
  }, 1800);
}

function escapeHTML(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function escapeAttr(value) { return escapeHTML(value).replaceAll('`', '&#096;'); }

boot();
