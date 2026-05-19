(function () {
  'use strict';

  var DATA_FILE = 'vocabulary.json';
  var STORAGE_KEY = 'tuv_recovery_progress_v1';
  var WEAK_STORAGE_KEY = 'weakWordsState';
  var TIMER_SECONDS = 10;

  var app = null;
  var data = null;
  var state = null;
  var weakState = null;
  var currentDayIndex = 0;
  var currentMode = 'home';
  var flashIndex = 0;
  var flashFlipped = false;
  var quiz = null;
  var quizTimer = null;
  var quizAutoNext = null;
  var lastClearEvent = null;
  var lastWeakClear = false;

  var fallbackData = {
    appTitle: 'Academic Vocabulary Network Adventure',
    unit: { id: 'unit1', title: 'Unit 1: Perception Sea', coreQuestion: 'Do we see reality itself?' },
    units: [
      { id: 'unit1', title: 'Unit 1: Perception Sea', seaTitle: 'Perception Sea', coreQuestion: 'Do we see reality itself?' },
      { id: 'unit2', title: 'Unit 2: Language Sea', seaTitle: 'Language Sea', coreQuestion: 'How does language create meaning?' }
    ],
    days: []
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    app = document.getElementById('app');
    if (!app) {
      app = document.createElement('div');
      app.id = 'app';
      app.className = 'app-shell';
      document.body.appendChild(app);
    }

    loadData()
      .then(function (loaded) {
        data = normalizeData(loaded || fallbackData);
        state = loadState(data);
        weakState = loadWeakState();
        currentDayIndex = firstUsableDayIndex();
        render();
      })
      .catch(function (error) {
        console.error(error);
        data = normalizeData(fallbackData);
        state = loadState(data);
        weakState = loadWeakState();
        currentDayIndex = firstUsableDayIndex();
        renderErrorNotice('vocabulary.json の読み込みに失敗しました。ファイル名と配置を確認してください。');
      });
  }

  function loadData() {
    if (!window.fetch) return Promise.resolve(fallbackData);
    return fetch(DATA_FILE, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('vocabulary.json not found');
      return res.json();
    });
  }

  function normalizeData(src) {
    var clean = src && Array.isArray(src.days) && src.days.length ? src : fallbackData;
    clean.days.forEach(function (day, index) {
      if (!day.id) day.id = 'unit1-day' + (index + 1);
      if (!day.day) day.day = index + 1;
      if (!day.unitId) day.unitId = day.id.indexOf('unit2-') === 0 ? 'unit2' : 'unit1';
      if (!day.unitNumber) day.unitNumber = day.unitId === 'unit2' ? 2 : 1;
      if (!day.unitDay) day.unitDay = day.unitId === 'unit2' ? Math.max(1, (Number(day.day) || index + 1) - 7) : (Number(day.day) || index + 1);
      if (!day.seaTitle) day.seaTitle = day.unitId === 'unit2' ? 'Language Sea' : 'Perception Sea';
      if (!day.unitTitle) day.unitTitle = 'Unit ' + day.unitNumber + ': ' + day.seaTitle;
      if (!Array.isArray(day.words)) day.words = [];
      day.words.forEach(function (word) {
        word.word = String(word.word || '').trim();
        word.meaning = String(word.meaning || '').trim();
      });
    });
    return clean;
  }

  function defaultState(sourceData) {
    var s = { unlocked: {}, completed: {}, clears: {} };
    sourceData.days.forEach(function (day, index) {
      s.unlocked[day.id] = index === 0;
      s.completed[day.id] = false;
      s.clears[day.id] = { listening: false, quiz: false, flashcard: false };
    });
    return s;
  }

  function loadState(sourceData) {
    var base = defaultState(sourceData);
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      var saved = JSON.parse(raw);
      sourceData.days.forEach(function (day, index) {
        if (saved.unlocked && typeof saved.unlocked[day.id] === 'boolean') base.unlocked[day.id] = saved.unlocked[day.id];
        if (saved.completed && typeof saved.completed[day.id] === 'boolean') base.completed[day.id] = saved.completed[day.id];
        if (saved.clears && saved.clears[day.id]) {
          base.clears[day.id].listening = !!saved.clears[day.id].listening;
          base.clears[day.id].quiz = !!saved.clears[day.id].quiz;
          base.clears[day.id].flashcard = !!saved.clears[day.id].flashcard;
        }
        if (index === 0) base.unlocked[day.id] = true;
      });
      applyUnlockRules(base, sourceData);
      return base;
    } catch (e) {
      console.warn('Progress reset because saved state was invalid.', e);
      return base;
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('progress localStorage save failed', e); }
  }

  function loadWeakState() {
    var empty = { version: 1, words: {} };
    try {
      var raw = localStorage.getItem(WEAK_STORAGE_KEY);
      if (!raw) return empty;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return empty;
      if (!saved.words || typeof saved.words !== 'object') saved.words = {};
      saved.version = 1;
      return saved;
    } catch (e) {
      console.warn('Weak Words reset because saved state was invalid.', e);
      return empty;
    }
  }

  function saveWeakState() {
    try { localStorage.setItem(WEAK_STORAGE_KEY, JSON.stringify(weakState)); }
    catch (e) { console.warn('weak localStorage save failed', e); }
  }

  function addWeakWord(word, source) {
    if (!word || !word.word) return;
    var key = word.word.toLowerCase();
    var now = new Date().toISOString();
    var current = weakState.words[key] || {};
    weakState.words[key] = {
      word: word.word,
      meaning: word.meaning,
      pos: word.pos || '',
      example: word.example || '',
      translation: word.translation || '',
      root: word.root || '',
      mistakeCount: (Number(current.mistakeCount) || 0) + 1,
      lastMistakeAt: now,
      source: source || 'quiz'
    };
    saveWeakState();
  }

  function removeWeakWord(word) {
    var key = typeof word === 'string' ? word.toLowerCase() : (word && word.word ? word.word.toLowerCase() : '');
    if (!key) return;
    if (weakState.words[key]) {
      delete weakState.words[key];
      saveWeakState();
    }
  }

  function clearWeakWords() {
    weakState = { version: 1, words: {} };
    saveWeakState();
  }

  function weakList() {
    return Object.keys(weakState.words || {}).map(function (key) { return weakState.words[key]; })
      .filter(function (w) { return w && w.word && w.meaning; })
      .sort(function (a, b) { return String(a.word).localeCompare(String(b.word)); });
  }

  function applyUnlockRules(s, sourceData) {
    sourceData.days.forEach(function (day, index) {
      var clears = s.clears[day.id] || { listening: false, quiz: false, flashcard: false };
      s.completed[day.id] = !!(clears.listening && clears.quiz && clears.flashcard);
      if (index === 0) s.unlocked[day.id] = true;
      if (s.completed[day.id] && sourceData.days[index + 1]) {
        s.unlocked[sourceData.days[index + 1].id] = true;
      }
    });
  }

  function firstUsableDayIndex() {
    var last = 0;
    data.days.forEach(function (day, index) {
      if (state.unlocked[day.id]) last = index;
    });
    return last;
  }

  function currentDay() {
    if (!data || !Array.isArray(data.days) || data.days.length === 0) {
      return { id: 'unit1-day1', day: 1, unitId: 'unit1', unitNumber: 1, unitDay: 1, unitTitle: 'Unit 1: Perception Sea', seaTitle: 'Perception Sea', title: 'Day 1', theme: '', words: [] };
    }
    return data.days[currentDayIndex] || data.days[0];
  }

  function h(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function render() {
    if (!app || !data || !state || !weakState) return;
    var day = currentDay();
    app.innerHTML = '';
    app.appendChild(buildHeader(day));
    var main = document.createElement('main');
    main.className = 'main';

    if (currentMode === 'home') main.innerHTML = homeHtml(day);
    else if (currentMode === 'listening') main.innerHTML = modeIntroHtml(day, 'listening');
    else if (currentMode === 'quiz') main.innerHTML = modeIntroHtml(day, 'quiz');
    else if (currentMode === 'flashcard') main.innerHTML = flashcardHtml(day);
    else if (currentMode === 'weak') main.innerHTML = weakHtml();
    else main.innerHTML = homeHtml(day);

    app.appendChild(main);
    app.appendChild(buildBottomNav());
    bindEvents();
  }

  function buildHeader(day) {
    var header = document.createElement('header');
    header.className = 'hero';
    var unitTitle = day.unitTitle || (data.unit && data.unit.title ? data.unit.title : 'Academic Vocabulary Network');
    var progress = progressPercent();
    var area = seaAreaName(day);
    var weakCount = weakList().length;
    header.innerHTML = '' +
      '<div class="topline"><div><div class="app-title">' + h(data.appTitle || 'Vocabulary Adventure') + '</div><div class="unit-title">' + h(unitTitle) + '</div></div>' +
      '<button class="ghost-btn" data-action="reset">Reset</button></div>' +
      '<div class="hero-main"><div><h1>' + h(day.title) + '</h1><p>' + h(day.theme || '') + '</p><p class="core-question">' + h(day.coreQuestion || '') + '</p></div>' +
      '<div class="level-badge">Lv.' + h(sharkLevel()) + '</div></div>' +
      '<div class="current-area">Current Area: ' + h(area) + '</div>' +
      seaProgressHtml(progress, day) +
      '<div class="weak-mini"><span>Weak Words</span><strong>' + h(weakCount) + '</strong><button data-action="mode" data-mode="weak">Review</button></div>';
    return header;
  }

  function progressPercent() {
    var total = data.days.length || 1;
    var done = data.days.filter(function (d) { return state.completed[d.id]; }).length;
    return Math.round((done / total) * 100);
  }

  function completedDayCount() {
    return data.days.filter(function (d) { return state.completed[d.id]; }).length;
  }

  function sharkLevel() {
    return completedDayCount() + 1;
  }

  function seaAreaName(day) {
    var perceptionNames = ['Meaning Lagoon', 'Evidence Current', 'Concept Atoll', 'Bias Trench', 'Abstraction Shelf', 'Framework Reef', 'Reflection Abyss'];
    var languageNames = ['Symbol Lagoon', 'Expression Current', 'Narrative Reef', 'Rhetoric Trench', 'Translation Shelf', 'Metaphor Grotto', 'Media Abyss'];
    var names = day && day.unitId === 'unit2' ? languageNames : perceptionNames;
    var n = day && day.unitDay ? Number(day.unitDay) : (day && day.day ? Number(day.day) : 1);
    return names[n - 1] || ((day && day.seaTitle ? day.seaTitle : 'Sea') + ' Area ' + n);
  }

  function unitProgressPercent(day) {
    var unitId = day && day.unitId ? day.unitId : 'unit1';
    var unitDays = data.days.filter(function (d) { return d.unitId === unitId; });
    var total = unitDays.length || 1;
    var done = unitDays.filter(function (d) { return state.completed[d.id]; }).length;
    return Math.round((done / total) * 100);
  }


  function unitProgressById(unitId) {
    var unitDays = data.days.filter(function (d) { return d.unitId === unitId; });
    if (!unitDays.length) return 0;
    var done = unitDays.filter(function (d) { return state.completed[d.id]; }).length;
    return Math.round((done / unitDays.length) * 100);
  }

  function unitDayCounts(unitId) {
    var unitDays = data.days.filter(function (d) { return d.unitId === unitId; });
    var done = unitDays.filter(function (d) { return state.completed[d.id]; }).length;
    var unlocked = unitDays.filter(function (d) { return state.unlocked[d.id]; }).length;
    return { total: unitDays.length, done: done, unlocked: unlocked };
  }

  function firstUnlockedDayIndexForUnit(unitId) {
    var found = -1;
    data.days.forEach(function (day, index) {
      if (day.unitId === unitId && state.unlocked[day.id] && found === -1) found = index;
    });
    return found;
  }

  function nextOpenDayIndexForUnit(unitId) {
    var fallback = -1;
    var target = -1;
    data.days.forEach(function (day, index) {
      if (day.unitId !== unitId || !state.unlocked[day.id]) return;
      if (fallback === -1) fallback = index;
      if (!state.completed[day.id] && target === -1) target = index;
    });
    return target !== -1 ? target : fallback;
  }

  function seaSelectionHtml() {
    var implementedUnits = Array.isArray(data.units) && data.units.length ? data.units : [
      { id: 'unit1', title: 'Unit 1: Perception Sea', seaTitle: 'Perception Sea', coreQuestion: 'Do we see reality itself?' },
      { id: 'unit2', title: 'Unit 2: Language Sea', seaTitle: 'Language Sea', coreQuestion: 'How does language create meaning?' }
    ];
    var comingSoon = [
      { id: 'society', seaTitle: 'Society Sea', coreQuestion: 'How do individuals and systems shape each other?' },
      { id: 'logic', seaTitle: 'Logic Sea', coreQuestion: 'How do reasons connect?' },
      { id: 'ai', seaTitle: 'AI Sea', coreQuestion: 'What does intelligence mean in the age of machines?' }
    ];
    return '<section class="card sea-select-card"><div class="sea-map-bg" aria-hidden="true"></div><div class="eyebrow">Sea Selection</div><h2>知性の海域を選ぶ</h2><p>Perception SeaからLanguage Seaへ。単語を覚えるだけでなく、評論を読むための概念ネットワークを探索します。</p>' +
      '<div class="sea-grid">' + implementedUnits.map(function (unit, i) { return seaCardHtml(unit, i + 1, false); }).join('') + comingSoon.map(function (unit, i) { return seaCardHtml(unit, implementedUnits.length + i + 1, true); }).join('') + '</div></section>';
  }

  function seaCardHtml(unit, number, lockedPlaceholder) {
    var unitId = unit.id;
    var progress = lockedPlaceholder ? 0 : unitProgressById(unitId);
    var counts = lockedPlaceholder ? { total: 7, done: 0, unlocked: 0 } : unitDayCounts(unitId);
    var selectableIndex = lockedPlaceholder ? -1 : nextOpenDayIndexForUnit(unitId);
    var open = selectableIndex !== -1;
    var active = !lockedPlaceholder && currentDay().unitId === unitId;
    var icon = lockedPlaceholder || !open ? '🔒' : '🌊';
    var status = lockedPlaceholder ? 'COMING SOON' : (open ? (progress === 100 ? 'FULLY EXPLORED' : 'OPEN') : 'LOCKED');
    var barWidth = Math.max(0, Math.min(100, progress));
    return '<button class="sea-card ' + (active ? 'active ' : '') + (lockedPlaceholder || !open ? 'locked ' : '') + '" data-action="selectUnit" data-unit-id="' + h(unitId) + '" ' + (open ? '' : 'disabled') + '>' +
      '<div class="sea-card-top"><span class="sea-icon">' + icon + '</span><span class="sea-number">Sea ' + h(number) + '</span></div>' +
      '<strong>' + h(unit.seaTitle || unit.title || unitId) + '</strong>' +
      '<small>' + h(unit.coreQuestion || 'Coming soon') + '</small>' +
      '<div class="sea-card-progress"><span>' + h(progress) + '% explored</span><span>' + h(counts.done) + ' / ' + h(counts.total) + '</span></div>' +
      '<div class="mini-bar"><div style="width:' + h(barWidth) + '%"></div></div>' +
      '<div class="sea-status">' + h(status) + '</div>' +
      '</button>';
  }

  function seaProgressHtml(progress, day) {
    var unitProgress = unitProgressPercent(day);
    var filled = Math.max(0, Math.min(10, Math.round(unitProgress / 10)));
    var bar = '';
    for (var i = 0; i < 10; i++) bar += i < filled ? '█' : '░';
    var sea = day && day.seaTitle ? day.seaTitle : 'Learning Sea';
    return '<div class="sea-progress"><div class="progress-label"><span>' + h(sea) + '</span><span>' + h(unitProgress) + '% explored</span></div><div class="bar-shell"><div class="bar-fill" style="width:' + h(unitProgress) + '%"></div></div><div class="pixel-bar">' + h(bar) + '</div><div class="overall-progress">Total Voyage: ' + h(progress) + '% explored</div></div>';
  }

  function dayClearEventHtml(event) {
    if (!event) return '';
    var nextLine = event.nextDay ? 'New Sea Unlocked: Unit ' + (event.nextDay.unitNumber || 1) + ' Day ' + (event.nextDay.unitDay || event.nextDay.day) : (event.sea || 'This Sea') + ' fully explored';
    return '<section class="clear-event"><div class="sparkle">✦✧✦</div><div class="clear-label">DAY CLEAR</div><h2>' + h(event.area) + ' discovered</h2><p>' + h(nextLine) + '</p><p>Shark Sensei Lv.' + h(event.oldLevel) + ' → Lv.' + h(event.newLevel) + '</p><p>Perception Sea ' + h(event.progress) + '% explored</p></section>';
  }

  function weakClearEventHtml() {
    if (!lastWeakClear) return '';
    return '<section class="clear-event weak-clear"><div class="sparkle">✦↺✦</div><div class="clear-label">REVIEW CLEAR</div><h2>Recovered Words Returned to the Sea</h2><p>苦手語を再び潜って回収しました。</p></section>';
  }

  function homeHtml(day) {
    var clears = state.clears[day.id];
    var completed = state.completed[day.id];
    var next = data.days[currentDayIndex + 1];
    var status = completed ? 'CLEAR：この海域の探索は完了しました。次の海へ進めます。' : 'Flashcard / Quiz / Listening をすべてCLEARすると次の海域が解放されます。';
    var area = seaAreaName(day);
    var celebration = lastClearEvent && lastClearEvent.dayId === day.id ? dayClearEventHtml(lastClearEvent) : '';
    return '' + celebration + seaSelectionHtml() +
      '<section class="card home-card"><div class="eyebrow">Unit ' + h(day.unitNumber || 1) + ' Day ' + h(day.unitDay || day.day) + ' / 7 ・ Voyage Day ' + h(day.day) + ' ・ ' + h(day.words.length) + ' words</div>' +
      '<h2>今日の海域：' + h(area) + '</h2><p>' + h(status) + '</p>' +
      '<div class="status-line"><span>Shark Sensei Lv.' + h(sharkLevel()) + '</span><span>' + h(day.seaTitle || 'Learning Sea') + ' ' + h(unitProgressPercent(day)) + '% explored</span></div>' +
      '<div class="clear-row">' + clearPill('Flashcard', clears.flashcard) + clearPill('Quiz', clears.quiz) + clearPill('Listening', clears.listening) + '</div>' +
      '<div class="mode-grid">' +
      modeCard('flashcard', '📘', 'Flashcard', '例文・語源・意味を確認します。') +
      modeCard('quiz', '🫧', '英語 → 日本語4択', '語の意味を正確に確認します。') +
      modeCard('listening', '🎧', '音声 → 日本語4択', '英単語を聞いて意味を即時想起します。') +
      modeCard('weak', '↺', 'Weak Words', '間違えた単語だけ、あとで再挑戦します。') +
      '</div></section>' +
      '<section class="card"><h2>Voyage Route</h2><p>Flashcard → Quiz → Listen の順で、Perception SeaからLanguage Seaへ進みます。Weak Wordsは進行判定とは完全に分離されています。</p>' +
      '<div class="day-row">' + dayButtonsHtml() + '</div>' +
      (next && completed ? '<button class="primary wide" data-action="nextDay">Unit ' + h(next.unitNumber || 1) + ' Day ' + h(next.unitDay || next.day) + 'へ進む</button>' : '') + '</section>';
  }

  function clearPill(label, ok) {
    return '<div class="clear-pill ' + (ok ? 'ok' : '') + '"><span>' + h(label) + '</span><strong>' + (ok ? 'CLEAR' : '未完了') + '</strong></div>';
  }

  function modeCard(mode, icon, title, desc) {
    return '<button class="mode-card" data-action="mode" data-mode="' + h(mode) + '"><span class="mode-icon">' + h(icon) + '</span><strong>' + h(title) + '</strong><small>' + h(desc) + '</small></button>';
  }

  function dayButtonsHtml() {
    return data.days.map(function (day, index) {
      var unlocked = !!state.unlocked[day.id];
      var active = index === currentDayIndex;
      var done = !!state.completed[day.id];
      return '<button class="day-btn ' + (active ? 'active ' : '') + (done ? 'done ' : '') + '" data-action="selectDay" data-index="' + index + '" ' + (unlocked ? '' : 'disabled') + '><span>U' + h(day.unitNumber || 1) + '-D' + h(day.unitDay || day.day) + '</span><small>' + (unlocked ? (done ? 'CLEAR' : 'OPEN') : 'LOCK') + '</small></button>';
    }).join('');
  }

  function modeIntroHtml(day, mode) {
    var title = mode === 'listening' ? '音声 → 日本語4択' : '英語 → 日本語4択';
    var lead = mode === 'listening' ? '再生ボタンで単語を聞き、日本語の意味を選びます。1問10秒です。' : '表示された英単語に合う日本語の意味を選びます。1問10秒です。';
    return '<section class="card"><h2>' + h(title) + '</h2><p>' + h(lead) + '</p><button class="primary wide" data-action="startQuiz" data-mode="' + h(mode) + '">Start</button></section>';
  }

  function flashcardHtml(day) {
    var safeIndex = Math.max(0, Math.min(flashIndex, day.words.length - 1));
    flashIndex = safeIndex;
    var word = day.words[safeIndex];
    if (!word) return '<section class="card"><h2>単語がありません</h2></section>';
    var clear = state.clears[day.id].flashcard;
    return '<section class="card flash-wrap"><div class="eyebrow">' + (safeIndex + 1) + ' / ' + day.words.length + '</div>' +
      '<button class="flash-card" data-action="flip">' +
      (!flashFlipped ? '<div class="word-big">' + h(word.word) + '</div><div class="pos">' + h(word.pos || '') + '</div><p>タップして意味を見る</p>' : '<div class="meaning-big">' + h(word.meaning) + '</div><p class="example">' + h(word.example || '') + '</p><p class="translation">' + h(word.translation || '') + '</p><div class="root">' + h(word.root || '') + '</div>') +
      '</button><div class="button-row"><button data-action="prevCard" ' + (safeIndex === 0 ? 'disabled' : '') + '>前へ</button><button data-action="speak" data-word="' + h(word.word) + '">音声</button>' +
      (safeIndex < day.words.length - 1 ? '<button data-action="nextCard">次へ</button>' : '<button class="primary" data-action="clearFlash">Flashcard CLEAR</button>') + '</div>' +
      (clear ? '<p class="done-note">Flashcard CLEAR済みです。</p>' : '') + '</section>';
  }

  function weakHtml() {
    var list = weakList();
    if (!list.length) {
      return '' + weakClearEventHtml() + '<section class="card empty-weak"><div class="big-icon">🌊</div><h2>Weak Wordsはありません</h2><p>間違えた単語はここに蓄積されます。通常のDay progressionとは分離されているので、安心してあとで復習できます。</p><button class="primary wide" data-action="home">Homeへ戻る</button></section>';
    }
    return '<section class="card"><div class="eyebrow">Dive Again</div><h2>Weak Words</h2><p>間違えた単語だけを再挑戦します。正解した語はWeak Wordsから外れます。間違えた語は残ります。</p>' +
      '<div class="weak-list">' + list.map(function (w) {
        return '<div class="weak-item"><div><strong>' + h(w.word) + '</strong><small>' + h(w.meaning) + '</small></div><span>×' + h(w.mistakeCount || 1) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="button-row stack-mobile"><button class="primary" data-action="startWeakReview">Review Weak Words</button><button data-action="clearWeakConfirm">Weak Wordsを空にする</button></div></section>';
  }

  function buildBottomNav() {
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML = '' +
      '<button data-action="home">Home</button>' +
      '<button data-action="mode" data-mode="flashcard">Cards</button>' +
      '<button data-action="mode" data-mode="quiz">Quiz</button>' +
      '<button data-action="mode" data-mode="listening">Listen</button>' +
      '<button data-action="mode" data-mode="weak">Weak</button>';
    return nav;
  }

  function bindEvents() {
    app.querySelectorAll('[data-action]').forEach(function (el) {
      el.addEventListener('click', handleAction);
    });
  }

  function handleAction(event) {
    var target = event.currentTarget;
    var action = target.getAttribute('data-action');

    if (action === 'home') { stopQuizTimer(); currentMode = 'home'; quiz = null; render(); return; }
    if (action === 'mode') {
      stopQuizTimer();
      currentMode = target.getAttribute('data-mode') || 'home';
      quiz = null;
      if (currentMode === 'flashcard') { flashIndex = 0; flashFlipped = false; }
      render();
      return;
    }
    if (action === 'selectDay') { selectDay(Number(target.getAttribute('data-index'))); return; }
    if (action === 'selectUnit') { selectUnit(target.getAttribute('data-unit-id')); return; }
    if (action === 'startQuiz') { startQuiz(target.getAttribute('data-mode')); return; }
    if (action === 'answer') { answerQuiz(Number(target.getAttribute('data-choice')), false); return; }
    if (action === 'nextQuestion') { nextQuestion(); return; }
    if (action === 'speak') { speak(target.getAttribute('data-word') || ''); return; }
    if (action === 'flip') { flashFlipped = !flashFlipped; render(); return; }
    if (action === 'prevCard') { moveCard(-1); return; }
    if (action === 'nextCard') { moveCard(1); return; }
    if (action === 'clearFlash') { clearMode('flashcard'); return; }
    if (action === 'nextDay') { nextDay(); return; }
    if (action === 'reset') { resetProgress(); return; }
    if (action === 'startWeakReview') { startWeakReview(); return; }
    if (action === 'clearWeakConfirm') { if (confirm('Weak Wordsだけを空にします。progressionには影響しません。')) { clearWeakWords(); lastWeakClear = false; render(); } return; }
  }

  function selectUnit(unitId) {
    var index = nextOpenDayIndexForUnit(unitId);
    if (index === -1) return;
    selectDay(index);
  }

  function selectDay(index) {
    var day = data.days[index];
    if (!day || !state.unlocked[day.id]) return;
    currentDayIndex = index;
    currentMode = 'home';
    flashIndex = 0;
    flashFlipped = false;
    stopQuizTimer();
    quiz = null;
    if (!lastClearEvent || lastClearEvent.dayId !== day.id) lastClearEvent = null;
    render();
  }

  function startQuiz(mode) {
    var day = currentDay();
    if (!day || !day.words.length) { currentMode = 'home'; render(); return; }
    stopQuizTimer();
    quiz = {
      type: 'day',
      mode: mode === 'listening' ? 'listening' : 'quiz',
      order: shuffle(day.words.map(function (_, i) { return i; })),
      words: day.words.slice(),
      pos: 0,
      score: 0,
      locked: false,
      selected: -1,
      timedOut: false,
      timeLeft: TIMER_SECONDS
    };
    renderQuizQuestion();
  }

  function startWeakReview() {
    var list = weakList();
    if (!list.length) { currentMode = 'weak'; render(); return; }
    stopQuizTimer();
    currentMode = 'weak';
    lastWeakClear = false;
    quiz = {
      type: 'weak',
      mode: 'weak',
      order: shuffle(list.map(function (_, i) { return i; })),
      words: list,
      pos: 0,
      score: 0,
      locked: false,
      selected: -1,
      timedOut: false,
      timeLeft: TIMER_SECONDS
    };
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    var main = app.querySelector('.main');
    if (!main || !quiz) return;
    stopQuizTimer();
    var word = quiz.words[quiz.order[quiz.pos]];
    if (!word) { finishQuiz(); return; }
    var pool = quiz.type === 'weak' ? allWords() : currentDay().words;
    var choices = makeChoices(word, pool);
    quiz.correctChoice = choices.indexOf(word.meaning);
    quiz.timeLeft = TIMER_SECONDS;
    quiz.locked = false;
    quiz.selected = -1;
    quiz.timedOut = false;

    var title = quiz.type === 'weak' ? 'Weak Words Review' : (quiz.mode === 'listening' ? '音声 → 日本語4択' : '英語 → 日本語4択');
    main.innerHTML = '<section class="card quiz-card"><div class="quiz-top"><span>' + h(title) + '</span><span>' + (quiz.pos + 1) + ' / ' + quiz.order.length + '</span></div>' +
      '<div class="timer" aria-live="polite">⏱ <span id="timerText">' + TIMER_SECONDS + '</span> sec</div>' +
      (quiz.mode === 'listening' ? '<button class="sound-btn" data-action="speak" data-word="' + h(word.word) + '">▶ 音声を再生</button><p>聞こえた英単語の意味を選んでください。</p>' : '<h2 class="quiz-word">' + h(word.word) + '</h2><p>この英単語の意味を選んでください。</p>') +
      '<div class="choices">' + choices.map(function (choice, i) { return '<button data-action="answer" data-choice="' + i + '">' + h(choice) + '</button>'; }).join('') + '</div><div id="feedback" class="feedback"></div></section>';
    bindEvents();
    if (quiz.mode === 'listening') setTimeout(function () { speak(word.word); }, 250);
    startQuizTimer();
  }

  function startQuizTimer() {
    var text = document.getElementById('timerText');
    quizTimer = setInterval(function () {
      if (!quiz || quiz.locked) { stopQuizTimer(); return; }
      quiz.timeLeft -= 1;
      if (text) text.textContent = String(Math.max(0, quiz.timeLeft));
      var timer = app.querySelector('.timer');
      if (timer && quiz.timeLeft <= 3) timer.classList.add('urgent');
      if (quiz.timeLeft <= 0) {
        stopQuizTimer();
        answerQuiz(-1, true);
      }
    }, 1000);
  }

  function stopQuizTimer() {
    if (quizTimer) clearInterval(quizTimer);
    if (quizAutoNext) clearTimeout(quizAutoNext);
    quizTimer = null;
    quizAutoNext = null;
  }

  function answerQuiz(choiceIndex, timedOut) {
    if (!quiz || quiz.locked) return;
    stopQuizTimer();
    quiz.locked = true;
    quiz.selected = choiceIndex;
    quiz.timedOut = !!timedOut;
    var word = quiz.words[quiz.order[quiz.pos]];
    var correct = choiceIndex === quiz.correctChoice;
    if (correct) {
      quiz.score += 1;
      if (quiz.type === 'weak') removeWeakWord(word.word);
    } else {
      addWeakWord(word, quiz.type === 'weak' ? 'weak-review' : quiz.mode);
    }
    showQuizFeedback(correct, timedOut, word);
    quizAutoNext = setTimeout(function () { nextQuestion(); }, correct ? 900 : 1350);
  }

  function showQuizFeedback(correct, timedOut, word) {
    var choiceButtons = app.querySelectorAll('.choices button');
    choiceButtons.forEach(function (btn, i) {
      btn.disabled = true;
      if (i === quiz.correctChoice) btn.classList.add('correct');
      if (i === quiz.selected && !correct) btn.classList.add('wrong');
    });
    var feedback = document.getElementById('feedback');
    if (!feedback) return;
    if (correct) {
      feedback.className = 'feedback ok';
      feedback.innerHTML = '正解。' + (quiz.type === 'weak' ? 'Weak Wordsから回収しました。' : '');
    } else {
      feedback.className = 'feedback ng';
      feedback.innerHTML = (timedOut ? '時間切れ。' : '不正解。') + '<br><strong>' + h(word.word) + '</strong> = ' + h(word.meaning) + '<br>Weak Wordsへ追加しました。';
    }
  }

  function nextQuestion() {
    if (!quiz) return;
    stopQuizTimer();
    quiz.pos += 1;
    if (quiz.pos >= quiz.order.length) finishQuiz();
    else renderQuizQuestion();
  }

  function finishQuiz() {
    stopQuizTimer();
    var finished = quiz;
    quiz = null;
    var main = app.querySelector('.main');
    if (!main) return;

    if (finished.type === 'weak') {
      var remaining = weakList().length;
      lastWeakClear = remaining === 0;
      main.innerHTML = '<section class="card result-card"><h2>' + (remaining === 0 ? 'Review CLEAR' : 'Review Finished') + '</h2><p>Score: ' + h(finished.score) + ' / ' + h(finished.order.length) + '</p>' +
        (remaining === 0 ? '<p>Weak Wordsはすべて回収されました。</p>' : '<p>まだ ' + h(remaining) + ' 語残っています。もう一度潜って回収できます。</p>') +
        '<button class="primary wide" data-action="mode" data-mode="weak">Weak Wordsへ戻る</button></section>';
      bindEvents();
      return;
    }

    clearMode(finished.mode === 'listening' ? 'listening' : 'quiz', finished.score, finished.order.length);
  }

  function clearMode(mode, score, total) {
    var day = currentDay();
    var wasCompleted = !!state.completed[day.id];
    var oldLevel = sharkLevel();
    if (!state.clears[day.id]) state.clears[day.id] = { listening: false, quiz: false, flashcard: false };
    state.clears[day.id][mode] = true;
    applyUnlockRules(state, data);
    saveState();
    var nowCompleted = !!state.completed[day.id];
    if (!wasCompleted && nowCompleted) {
      lastClearEvent = {
        dayId: day.id,
        area: seaAreaName(day),
        oldLevel: oldLevel,
        newLevel: sharkLevel(),
        progress: progressPercent(),
        unitProgress: unitProgressPercent(day),
        sea: day.seaTitle || 'Learning Sea',
        nextDay: data.days[currentDayIndex + 1] || null
      };
    }
    currentMode = 'home';
    render();
  }

  function moveCard(delta) {
    var day = currentDay();
    flashIndex = Math.max(0, Math.min(day.words.length - 1, flashIndex + delta));
    flashFlipped = false;
    render();
  }

  function nextDay() {
    var next = data.days[currentDayIndex + 1];
    if (!next || !state.unlocked[next.id]) return;
    currentDayIndex += 1;
    currentMode = 'home';
    flashIndex = 0;
    flashFlipped = false;
    lastClearEvent = null;
    render();
  }

  function resetProgress() {
    if (!confirm('学習進行をリセットします。Weak Wordsは別管理なので残ります。')) return;
    state = defaultState(data);
    saveState();
    currentDayIndex = 0;
    currentMode = 'home';
    flashIndex = 0;
    flashFlipped = false;
    quiz = null;
    lastClearEvent = null;
    render();
  }

  function makeChoices(correctWord, pool) {
    var correct = correctWord.meaning;
    var candidates = shuffle(pool.filter(function (w) {
      return w && w.meaning && w.word !== correctWord.word && !tooSimilarMeaning(w.meaning, correct);
    }));
    var choices = [correct];
    candidates.forEach(function (w) {
      if (choices.length < 4 && choices.indexOf(w.meaning) === -1) choices.push(w.meaning);
    });
    if (choices.length < 4) {
      shuffle(allWords()).forEach(function (w) {
        if (choices.length < 4 && w.word !== correctWord.word && choices.indexOf(w.meaning) === -1 && !tooSimilarMeaning(w.meaning, correct)) choices.push(w.meaning);
      });
    }
    if (choices.length < 4) {
      shuffle(allWords()).forEach(function (w) {
        if (choices.length < 4 && choices.indexOf(w.meaning) === -1) choices.push(w.meaning);
      });
    }
    return shuffle(choices.slice(0, 4));
  }

  function tooSimilarMeaning(a, b) {
    var aa = normalizeMeaning(a);
    var bb = normalizeMeaning(b);
    if (!aa || !bb) return false;
    if (aa === bb) return true;
    if (aa.indexOf(bb) >= 0 || bb.indexOf(aa) >= 0) return true;
    var pa = aa.split(/[／/、・\s]+/).filter(Boolean);
    var pb = bb.split(/[／/、・\s]+/).filter(Boolean);
    for (var i = 0; i < pa.length; i++) {
      for (var j = 0; j < pb.length; j++) {
        if (pa[i].length >= 2 && pa[i] === pb[j]) return true;
      }
    }
    return false;
  }

  function normalizeMeaning(s) {
    return String(s || '').replace(/[（）()［］\[\]\s]/g, '').replace(/する$/g, '').trim();
  }

  function allWords() {
    var out = [];
    data.days.forEach(function (day) {
      day.words.forEach(function (word) { out.push(word); });
    });
    return out;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function speak(word) {
    if (!word || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.88;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('speech synthesis failed', e);
    }
  }

  function renderErrorNotice(message) {
    if (!app) return;
    app.innerHTML = '<main class="main"><section class="card"><h1>起動エラー</h1><p>' + h(message) + '</p></section></main>';
  }
})();
