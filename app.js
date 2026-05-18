/*
  Academic Vocabulary Network Adventure
  Stable progression build

  Core rule:
  - Progression state is stored only in PROGRESS_KEY.
  - Weak Words are stored only in WEAK_KEY.
  - Quiz/UI temporary state never controls day unlock directly.
*/

const DATA_URL = './vocabulary.json';
const PROGRESS_KEY = 'tuv_progress_state_v2';
const WEAK_KEY = 'tuv_weak_words_v1';
const ACTIVE_DAY_KEY = 'tuv_active_day_v1';
const ACTIVE_VIEW_KEY = 'tuv_active_view_v1';

const app = document.getElementById('app');
const levelBadge = document.getElementById('levelBadge');
const navButtons = Array.from(document.querySelectorAll('[data-nav]'));

let vocabularyData = null;
let activeDayId = null;
let activeView = 'home';
let quizState = null;
let cardState = { index: 0, flipped: false };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function safeParse(json, fallback) {
  try {
    return JSON.parse(json) ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function getAllDayIds() {
  return (vocabularyData?.days || []).map((day) => day.id);
}

function getDayById(dayId) {
  return (vocabularyData?.days || []).find((day) => day.id === dayId) || vocabularyData?.days?.[0];
}

function createDefaultProgressState() {
  const dayIds = getAllDayIds();
  const unlockedDays = {};
  const completedDays = {};
  const activityCompletion = {};

  dayIds.forEach((dayId, index) => {
    unlockedDays[dayId] = index === 0;
    completedDays[dayId] = false;
    activityCompletion[dayId] = {
      listening: false,
      flashcard: false
    };
  });

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    unlockedDays,
    completedDays,
    activityCompletion
  };
}

function normalizeProgressState(rawState) {
  const defaultState = createDefaultProgressState();
  const state = rawState && typeof rawState === 'object' ? rawState : {};

  const normalized = {
    version: 2,
    updatedAt: state.updatedAt || new Date().toISOString(),
    unlockedDays: { ...defaultState.unlockedDays, ...(state.unlockedDays || {}) },
    completedDays: { ...defaultState.completedDays, ...(state.completedDays || {}) },
    activityCompletion: { ...defaultState.activityCompletion }
  };

  // Defensive migration from older builds that may have mixed quiz data into progress.
  if (state.completedDays && Array.isArray(state.completedDays)) {
    state.completedDays.forEach((dayId) => {
      if (Object.prototype.hasOwnProperty.call(normalized.completedDays, dayId)) {
        normalized.completedDays[dayId] = true;
      }
    });
  }

  if (state.activityCompletion && typeof state.activityCompletion === 'object') {
    getAllDayIds().forEach((dayId) => {
      normalized.activityCompletion[dayId] = {
        listening: Boolean(state.activityCompletion?.[dayId]?.listening),
        flashcard: Boolean(state.activityCompletion?.[dayId]?.flashcard)
      };
    });
  }

  // Day1 must always be available.
  const firstDayId = getAllDayIds()[0];
  if (firstDayId) normalized.unlockedDays[firstDayId] = true;

  // If a day is completed, it must be unlocked, and the next day must be unlocked.
  getAllDayIds().forEach((dayId, index, dayIds) => {
    if (normalized.completedDays[dayId]) {
      normalized.unlockedDays[dayId] = true;
      const nextDayId = dayIds[index + 1];
      if (nextDayId) normalized.unlockedDays[nextDayId] = true;
    }
  });

  return normalized;
}

function loadProgressState() {
  const stored = safeParse(localStorage.getItem(PROGRESS_KEY), null);
  const normalized = normalizeProgressState(stored);
  saveProgressState(normalized);
  return normalized;
}

function saveProgressState(state) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
}

function getProgressState() {
  return loadProgressState();
}

function completeActivity(dayId, activityName, options = { renderAfter: true }) {
  const state = getProgressState();
  if (!state.activityCompletion[dayId]) {
    state.activityCompletion[dayId] = { listening: false, flashcard: false };
  }

  state.activityCompletion[dayId][activityName] = true;

  const activities = state.activityCompletion[dayId];
  if (activities.listening && activities.flashcard) {
    completeDay(dayId, state);
    return;
  }

  saveProgressState(state);
  if (options.renderAfter) render();
}

function completeDay(dayId, existingState = null) {
  const state = existingState || getProgressState();
  const dayIds = getAllDayIds();
  const index = dayIds.indexOf(dayId);
  if (index === -1) return;

  state.completedDays[dayId] = true;
  state.unlockedDays[dayId] = true;

  const nextDayId = dayIds[index + 1];
  if (nextDayId) {
    state.unlockedDays[nextDayId] = true;
    activeDayId = nextDayId;
    localStorage.setItem(ACTIVE_DAY_KEY, nextDayId);
  }

  saveProgressState(state);
  renderCompletionModal(dayId, nextDayId);
}

function isDayUnlocked(dayId) {
  return Boolean(getProgressState().unlockedDays[dayId]);
}

function isDayCompleted(dayId) {
  return Boolean(getProgressState().completedDays[dayId]);
}

function getWeakWords() {
  const list = safeParse(localStorage.getItem(WEAK_KEY), []);
  return Array.isArray(list) ? list : [];
}

function saveWeakWords(list) {
  const unique = [];
  const seen = new Set();
  list.forEach((item) => {
    if (!item?.word || seen.has(item.word)) return;
    seen.add(item.word);
    unique.push(item);
  });
  localStorage.setItem(WEAK_KEY, JSON.stringify(unique));
}

function addWeakWord(wordItem, dayId) {
  const list = getWeakWords();
  saveWeakWords([
    ...list.filter((item) => item.word !== wordItem.word),
    {
      word: wordItem.word,
      meaning: wordItem.meaning,
      example: wordItem.example,
      translation: wordItem.translation,
      root: wordItem.root,
      dayId,
      addedAt: new Date().toISOString()
    }
  ]);
}

function removeWeakWord(word) {
  saveWeakWords(getWeakWords().filter((item) => item.word !== word));
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.86;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildMeaningOptions(correctWord, allWords) {
  const distractors = shuffle(allWords.filter((item) => item.word !== correctWord.word))
    .slice(0, 3)
    .map((item) => item.meaning);
  return shuffle([correctWord.meaning, ...distractors]);
}

function initializeQuiz(dayId, mode = 'listening') {
  const day = getDayById(dayId);
  const words = shuffle(day.words);
  quizState = {
    mode,
    dayId,
    words,
    index: 0,
    correct: 0,
    answered: false,
    selected: null,
    timeLeft: 10,
    timerId: null,
    options: []
  };
  renderQuiz();
}

function clearQuizTimer() {
  if (quizState?.timerId) {
    clearInterval(quizState.timerId);
    quizState.timerId = null;
  }
}

function startQuizTimer() {
  clearQuizTimer();
  if (!quizState || quizState.answered) return;
  quizState.timeLeft = 10;
  quizState.timerId = setInterval(() => {
    quizState.timeLeft -= 1;
    const timerEl = $('#timerValue');
    if (timerEl) timerEl.textContent = String(quizState.timeLeft);
    if (quizState.timeLeft <= 0) {
      answerQuiz(null);
    }
  }, 1000);
}

function answerQuiz(selectedMeaning) {
  if (!quizState || quizState.answered) return;
  clearQuizTimer();
  const current = quizState.words[quizState.index];
  const isCorrect = selectedMeaning === current.meaning;
  quizState.answered = true;
  quizState.selected = selectedMeaning;
  if (isCorrect) {
    quizState.correct += 1;
    playSuccessSound();
  } else {
    addWeakWord(current, quizState.dayId);
  }
  renderQuiz();
}

function nextQuizQuestion() {
  if (!quizState) return;
  if (quizState.index >= quizState.words.length - 1) {
    clearQuizTimer();
    const passed = quizState.correct === quizState.words.length;
    renderQuizResult(passed);
    return;
  }
  quizState.index += 1;
  quizState.answered = false;
  quizState.selected = null;
  quizState.options = [];
  renderQuiz();
}

function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (_error) {
    // Sound is optional.
  }
}

function setView(viewName) {
  clearQuizTimer();
  activeView = viewName;
  localStorage.setItem(ACTIVE_VIEW_KEY, viewName);
  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.nav === viewName));
  if (viewName === 'reset') {
    renderReset();
    return;
  }
  render();
}

function setActiveDay(dayId) {
  if (!isDayUnlocked(dayId)) return;
  activeDayId = dayId;
  localStorage.setItem(ACTIVE_DAY_KEY, dayId);
  activeView = 'home';
  localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
  render();
}

function updateLevelBadge() {
  const state = getProgressState();
  const completed = Object.values(state.completedDays).filter(Boolean).length;
  levelBadge.textContent = `Lv.${Math.max(1, completed + 1)}`;
}

function render() {
  updateLevelBadge();
  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.nav === activeView));

  if (activeView === 'map') return renderMap();
  if (activeView === 'cards') return renderCards();
  if (activeView === 'weak') return renderWeakWords();
  return renderHome();
}

function renderHome() {
  const day = getDayById(activeDayId);
  const state = getProgressState();
  const activities = state.activityCompletion[day.id] || { listening: false, flashcard: false };
  const progressPercent = Math.round((Object.values(state.completedDays).filter(Boolean).length / getAllDayIds().length) * 100);

  app.innerHTML = `
    <section class="hero-card">
      <div class="shark-large">🦈</div>
      <div>
        <p class="eyebrow">${vocabularyData.unit.title}</p>
        <h2>${day.title}</h2>
        <p>${day.theme}</p>
        <p class="core-question">${vocabularyData.unit.coreQuestion}</p>
      </div>
    </section>

    <section class="progress-card">
      <div class="section-title-row">
        <h3>Perception Sea Progress</h3>
        <span>${progressPercent}%</span>
      </div>
      <div class="progress-bar"><div style="width:${progressPercent}%"></div></div>
      <div class="activity-grid">
        <div class="activity-pill ${activities.listening ? 'done' : ''}">🎧 Listening ${activities.listening ? 'CLEAR' : '未完了'}</div>
        <div class="activity-pill ${activities.flashcard ? 'done' : ''}">📚 Flashcard ${activities.flashcard ? 'CLEAR' : '未完了'}</div>
      </div>
      <p class="note">Day解放はこの2つのCLEARだけで判定します。Weak Wordsとは完全に独立しています。</p>
    </section>

    <section class="action-grid">
      <button class="primary-card" id="startListening">
        <span>🎧</span>
        <strong>音声 → 日本語4択</strong>
        <small>1問10秒。全問正解でCLEAR。</small>
      </button>
      <button class="primary-card" id="startCards">
        <span>📚</span>
        <strong>今日のカード学習</strong>
        <small>最後まで確認するとCLEAR。</small>
      </button>
    </section>

    <section class="word-list-card">
      <h3>Today's Words</h3>
      <div class="word-chip-list">
        ${day.words.map((item) => `<button class="word-chip" data-speak="${item.word}">${item.word}<small>${item.meaning}</small></button>`).join('')}
      </div>
    </section>
  `;

  $('#startListening')?.addEventListener('click', () => initializeQuiz(day.id, 'listening'));
  $('#startCards')?.addEventListener('click', () => {
    cardState = { index: 0, flipped: false };
    activeView = 'cards';
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    renderCards();
  });
  $$('[data-speak]').forEach((button) => button.addEventListener('click', () => speak(button.dataset.speak)));
}

function renderMap() {
  const state = getProgressState();
  app.innerHTML = `
    <section class="panel-card">
      <h2>Day Map</h2>
      <p class="muted">progression専用stateだけを参照して表示しています。</p>
      <div class="day-map">
        ${vocabularyData.days.map((day) => {
          const unlocked = Boolean(state.unlockedDays[day.id]);
          const completed = Boolean(state.completedDays[day.id]);
          return `
            <button class="day-node ${unlocked ? 'unlocked' : 'locked'} ${completed ? 'completed' : ''}" data-day-id="${day.id}" ${unlocked ? '' : 'disabled'}>
              <span>${completed ? '✅' : unlocked ? '🌊' : '🔒'}</span>
              <strong>Day ${day.day}</strong>
              <small>${day.title.replace(/^Day \d+:\s*/, '')}</small>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
  $$('[data-day-id]').forEach((button) => button.addEventListener('click', () => setActiveDay(button.dataset.dayId)));
}

function renderCards() {
  const day = getDayById(activeDayId);
  const word = day.words[cardState.index] || day.words[0];
  const total = day.words.length;

  app.innerHTML = `
    <section class="panel-card">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">${day.title}</p>
          <h2>Flashcard</h2>
        </div>
        <span>${cardState.index + 1}/${total}</span>
      </div>

      <button class="flashcard ${cardState.flipped ? 'flipped' : ''}" id="flipCard">
        <div class="front">
          <span class="card-label">WORD</span>
          <strong>${word.word}</strong>
          <small>タップして意味を確認</small>
        </div>
        <div class="back">
          <span class="card-label">MEANING</span>
          <strong>${word.meaning}</strong>
          <p>${word.example}</p>
          <p class="translation">${word.translation}</p>
          <p class="root">${word.root}</p>
        </div>
      </button>

      <div class="button-row">
        <button class="secondary-btn" id="speakWord">🔊 発音</button>
        <button class="secondary-btn" id="prevCard" ${cardState.index === 0 ? 'disabled' : ''}>前へ</button>
        <button class="primary-btn" id="nextCard">${cardState.index >= total - 1 ? 'CLEAR' : '次へ'}</button>
      </div>
    </section>
  `;

  $('#flipCard')?.addEventListener('click', () => {
    cardState.flipped = !cardState.flipped;
    renderCards();
  });
  $('#speakWord')?.addEventListener('click', () => speak(word.word));
  $('#prevCard')?.addEventListener('click', () => {
    cardState.index = Math.max(0, cardState.index - 1);
    cardState.flipped = false;
    renderCards();
  });
  $('#nextCard')?.addEventListener('click', () => {
    if (cardState.index >= total - 1) {
      completeActivity(day.id, 'flashcard');
      activeView = 'home';
      localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
      render();
      return;
    }
    cardState.index += 1;
    cardState.flipped = false;
    renderCards();
  });
}

function renderQuiz() {
  const day = getDayById(quizState.dayId);
  const current = quizState.words[quizState.index];
  if (!quizState.options || quizState.options.length === 0 || !quizState.answered) {
    quizState.options = buildMeaningOptions(current, day.words);
  }
  const options = quizState.options;

  app.innerHTML = `
    <section class="panel-card quiz-card">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">${day.title}</p>
          <h2>音声 → 日本語4択</h2>
        </div>
        <span>Q${quizState.index + 1}/${quizState.words.length}</span>
      </div>

      <div class="timer-pill">残り <strong id="timerValue">${quizState.timeLeft}</strong> 秒</div>
      <button class="audio-orb" id="playAudio">🔊</button>
      <p class="muted">音声を聞いて、日本語の意味を選んでください。</p>

      <div class="option-grid">
        ${options.map((option) => {
          let cls = '';
          if (quizState.answered && option === current.meaning) cls = 'correct';
          if (quizState.answered && option === quizState.selected && option !== current.meaning) cls = 'wrong';
          return `<button class="option-btn ${cls}" data-option="${option}" ${quizState.answered ? 'disabled' : ''}>${option}</button>`;
        }).join('')}
      </div>

      ${quizState.answered ? `
        <div class="answer-box ${quizState.selected === current.meaning ? 'success' : 'fail'}">
          <strong>${quizState.selected === current.meaning ? '正解！' : 'Weak Wordsに追加しました'}</strong>
          <p>${current.word} = ${current.meaning}</p>
          <p>${current.example}</p>
        </div>
        <button class="primary-btn full" id="nextQuestion">${quizState.index >= quizState.words.length - 1 ? '結果を見る' : '次へ'}</button>
      ` : ''}
    </section>
  `;

  $('#playAudio')?.addEventListener('click', () => speak(current.word));
  $$('.option-btn').forEach((button) => button.addEventListener('click', () => answerQuiz(button.dataset.option)));
  $('#nextQuestion')?.addEventListener('click', nextQuizQuestion);

  if (!quizState.answered) {
    speak(current.word);
    startQuizTimer();
  }
}

function renderQuizResult(passed) {
  const day = getDayById(quizState.dayId);
  app.innerHTML = `
    <section class="panel-card result-card">
      <div class="shark-large">${passed ? '🦈✨' : '🦈💧'}</div>
      <h2>${passed ? 'Listening CLEAR!' : 'もう一度挑戦しましょう'}</h2>
      <p>${quizState.correct}/${quizState.words.length} correct</p>
      <p class="muted">全問正解でListening CLEARです。間違えた単語はWeak Wordsに保存されました。</p>
      <div class="button-row">
        <button class="secondary-btn" id="backHome">Homeへ</button>
        <button class="primary-btn" id="retryQuiz">再挑戦</button>
      </div>
    </section>
  `;

  $('#backHome')?.addEventListener('click', () => {
    activeView = 'home';
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    quizState = null;
    render();
  });
  $('#retryQuiz')?.addEventListener('click', () => initializeQuiz(day.id, 'listening'));

  if (passed) {
    const dayId = quizState.dayId;
    quizState = null;
    completeActivity(dayId, 'listening', { renderAfter: false });
  }
}

function renderWeakWords() {
  const weakWords = getWeakWords();
  app.innerHTML = `
    <section class="panel-card">
      <div class="section-title-row">
        <div>
          <p class="eyebrow">Independent Review</p>
          <h2>Weak Words</h2>
        </div>
        <span>${weakWords.length}</span>
      </div>
      <p class="muted">Weak Wordsはprogression stateに一切混ぜていません。復習してもDay解放条件には影響しません。</p>
      ${weakWords.length === 0 ? `
        <div class="empty-state">⭐<p>まだWeak Wordsはありません。</p></div>
      ` : `
        <div class="weak-list">
          ${weakWords.map((item) => `
            <article class="weak-item">
              <div>
                <strong>${item.word}</strong>
                <p>${item.meaning}</p>
                <small>${item.example || ''}</small>
              </div>
              <div class="weak-actions">
                <button class="icon-btn" data-speak-weak="${item.word}">🔊</button>
                <button class="icon-btn" data-remove-weak="${item.word}">CLEAR</button>
              </div>
            </article>
          `).join('')}
        </div>
      `}
    </section>
  `;

  $$('[data-speak-weak]').forEach((button) => button.addEventListener('click', () => speak(button.dataset.speakWeak)));
  $$('[data-remove-weak]').forEach((button) => button.addEventListener('click', () => {
    removeWeakWord(button.dataset.removeWeak);
    renderWeakWords();
  }));
}

function renderReset() {
  app.innerHTML = `
    <section class="panel-card danger-zone">
      <h2>Reset</h2>
      <p>進行状態だけ、またはWeak Wordsだけを個別にリセットできます。</p>
      <div class="button-column">
        <button class="secondary-btn" id="resetProgress">Progressionだけリセット</button>
        <button class="secondary-btn" id="resetWeak">Weak Wordsだけリセット</button>
        <button class="danger-btn" id="resetAll">すべてリセット</button>
        <button class="primary-btn" id="cancelReset">戻る</button>
      </div>
    </section>
  `;

  $('#resetProgress')?.addEventListener('click', () => {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(ACTIVE_DAY_KEY);
    activeDayId = getAllDayIds()[0];
    activeView = 'home';
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    render();
  });
  $('#resetWeak')?.addEventListener('click', () => {
    localStorage.removeItem(WEAK_KEY);
    activeView = 'weak';
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    renderWeakWords();
  });
  $('#resetAll')?.addEventListener('click', () => {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(WEAK_KEY);
    localStorage.removeItem(ACTIVE_DAY_KEY);
    localStorage.removeItem(ACTIVE_VIEW_KEY);
    activeDayId = getAllDayIds()[0];
    activeView = 'home';
    render();
  });
  $('#cancelReset')?.addEventListener('click', () => {
    activeView = 'home';
    localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
    render();
  });
}

function renderCompletionModal(dayId, nextDayId) {
  const completedDay = getDayById(dayId);
  activeView = 'home';
  localStorage.setItem(ACTIVE_VIEW_KEY, activeView);
  app.innerHTML = `
    <section class="panel-card result-card">
      <div class="shark-large">🦈🏆</div>
      <h2>${completedDay.title} CLEAR!</h2>
      <p>${nextDayId ? `Day ${getDayById(nextDayId).day} を解放しました。` : 'Unit 1の現在収録分を完了しました。'}</p>
      <p class="muted">リロード後も、この解放状態は progression専用state に保存されます。</p>
      <button class="primary-btn full" id="continueAfterClear">続ける</button>
    </section>
  `;
  $('#continueAfterClear')?.addEventListener('click', () => render());
}

async function boot() {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('vocabulary.json could not be loaded.');
    vocabularyData = await response.json();

    const state = getProgressState();
    const storedDay = localStorage.getItem(ACTIVE_DAY_KEY);
    const firstUnlockedDay = getAllDayIds().find((dayId) => state.unlockedDays[dayId]) || getAllDayIds()[0];
    activeDayId = storedDay && state.unlockedDays[storedDay] ? storedDay : firstUnlockedDay;

    const storedView = localStorage.getItem(ACTIVE_VIEW_KEY);
    activeView = ['home', 'map', 'cards', 'weak'].includes(storedView) ? storedView : 'home';

    navButtons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.nav)));
    render();
  } catch (error) {
    app.innerHTML = `
      <section class="panel-card danger-zone">
        <h2>読み込みエラー</h2>
        <p>vocabulary.json を読み込めませんでした。</p>
        <pre>${String(error.message || error)}</pre>
      </section>
    `;
  }
}

boot();
