/* DOM-safe recovery stable + English-to-Japanese Quiz restored. Weak Words intentionally disabled. */
(function () {
  'use strict';

  var DATA_FILE = 'vocabulary.json';
  var STORAGE_KEY = 'tuv_recovery_progress_v1';
  var app = null;
  var data = null;
  var state = null;
  var currentDayIndex = 0;
  var currentMode = 'home';
  var quiz = null;

  var fallbackData = {
    appTitle: 'Academic Vocabulary Network Adventure',
    unit: { id: 'unit1', title: 'Unit 1: Perception Sea', coreQuestion: 'Do we see reality itself?' },
    days: [
      { id: 'unit1-day1', day: 1, title: 'Day 1: Seeing and Meaning', theme: 'Perception and interpretation', words: [
        { word: 'perception', meaning: '知覚／認識', pos: 'noun', example: 'Our perception of reality is shaped by language and memory.', translation: '私たちの現実認識は、言語や記憶によって形作られる。', root: 'per- + ceive = completely take in' },
        { word: 'represent', meaning: '表す／代表する', pos: 'verb', example: 'A graph can represent complex information in a simple form.', translation: 'グラフは複雑な情報を単純な形で表すことができる。', root: 're- + present = present again' },
        { word: 'interpret', meaning: '解釈する', pos: 'verb', example: 'Readers interpret the same text in different ways.', translation: '読者は同じ文章を異なる方法で解釈する。', root: 'inter- + pret = explain between' },
        { word: 'assumption', meaning: '前提／思い込み', pos: 'noun', example: 'The argument depends on a hidden assumption.', translation: 'その議論は隠れた前提に依存している。', root: 'as- + sumere = take up' },
        { word: 'framework', meaning: '枠組み', pos: 'noun', example: 'This framework helps us compare different theories.', translation: 'この枠組みは異なる理論を比較するのに役立つ。', root: 'frame + work = supporting structure' }
      ] },
      { id: 'unit1-day2', day: 2, title: 'Day 2: Evidence and Inference', theme: 'How we move from signs to conclusions', words: [
        { word: 'evidence', meaning: '証拠／根拠', pos: 'noun', example: 'The claim is weak because there is little evidence to support it.', translation: 'その主張を支える証拠がほとんどないため、その主張は弱い。', root: 'e- + videre = clearly seen' },
        { word: 'infer', meaning: '推論する', pos: 'verb', example: "We can infer the writer's position from the final paragraph.", translation: '最後の段落から筆者の立場を推論できる。', root: 'in- + ferre = carry into' },
        { word: 'indicate', meaning: '示す', pos: 'verb', example: 'The data indicate a change in public attitudes.', translation: 'そのデータは世論の変化を示している。', root: 'in- + dicare = point out' },
        { word: 'distinguish', meaning: '区別する', pos: 'verb', example: 'It is important to distinguish fact from opinion.', translation: '事実と意見を区別することが重要である。', root: 'dis- + stinguere = mark apart' },
        { word: 'context', meaning: '文脈／状況', pos: 'noun', example: 'The meaning of a word often depends on its context.', translation: '単語の意味はしばしば文脈に依存する。', root: 'con- + texere = weave together' }
      ] },
      { id: 'unit1-day3', day: 3, title: 'Day 3: Concepts and Models', theme: 'Thinking through abstract tools', words: [
        { word: 'concept', meaning: '概念', pos: 'noun', example: 'The concept of freedom has changed across history.', translation: '自由という概念は歴史を通じて変化してきた。', root: 'con- + capere = take together' },
        { word: 'category', meaning: '分類／カテゴリー', pos: 'noun', example: 'The boundary between the two categories is not always clear.', translation: 'その二つのカテゴリーの境界は常に明確とは限らない。', root: 'Greek kategoria = statement, class' },
        { word: 'structure', meaning: '構造', pos: 'noun', example: 'The structure of the essay makes the argument easy to follow.', translation: 'そのエッセイの構造により、議論を追いやすくなっている。', root: 'struere = build' },
        { word: 'model', meaning: '模型／モデル化する', pos: 'noun/verb', example: 'Scientists use models to explain complex systems.', translation: '科学者は複雑なシステムを説明するためにモデルを用いる。', root: 'modulus = measure' },
        { word: 'abstract', meaning: '抽象的な／抽出する', pos: 'adjective/verb', example: 'Abstract ideas become clearer when we connect them to examples.', translation: '抽象的な考えは、具体例と結びつけるとより明確になる。', root: 'ab- + trahere = draw away' }
      ] }
    ]
  };

  function init() {
    app = document.getElementById('app');
    if (!app) {
      app = document.createElement('div');
      app.id = 'app';
      app.className = 'app-shell';
      document.body.appendChild(app);
    }
    loadData().then(function (loaded) {
      data = normalizeData(loaded || fallbackData);
      state = loadState(data);
      currentDayIndex = firstUsableDayIndex();
      render();
    }).catch(function (error) {
      console.error(error);
      data = normalizeData(fallbackData);
      state = loadState(data);
      currentDayIndex = firstUsableDayIndex();
      renderErrorNotice('vocabulary.json の読み込みに失敗したため、内蔵データで起動しました。');
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
    var clean = src && src.days && src.days.length ? src : fallbackData;
    clean.days.forEach(function (day, index) {
      if (!day.id) day.id = 'unit1-day' + (index + 1);
      if (!day.day) day.day = index + 1;
      if (!Array.isArray(day.words)) day.words = [];
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
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
    if (!data || !Array.isArray(data.days) || data.days.length === 0) return { id: 'unit1-day1', day: 1, title: 'Day 1', theme: '', words: [] };
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
    if (!app || !data || !state) return;
    var day = currentDay();
    app.innerHTML = '';
    app.appendChild(buildHeader(day));
    var main = document.createElement('main');
    main.className = 'main';
    if (currentMode === 'home') main.innerHTML = homeHtml(day);
    if (currentMode === 'listening') main.innerHTML = modeIntroHtml(day, 'listening');
    if (currentMode === 'quiz') main.innerHTML = modeIntroHtml(day, 'quiz');
    if (currentMode === 'flashcard') main.innerHTML = flashcardHtml(day, 0, false);
    app.appendChild(main);
    app.appendChild(buildBottomNav());
    bindEvents();
  }

  function buildHeader(day) {
    var header = document.createElement('header');
    header.className = 'hero';
    var unitTitle = data.unit && data.unit.title ? data.unit.title : 'Academic Vocabulary Network';
    var progress = progressPercent();
    header.innerHTML =
      '<div class="hero-top">' +
        '<div class="brand"><span class="brand-icon">🦈</span><span>' + h(data.appTitle || 'Vocabulary Adventure') + '</span></div>' +
        '<button class="small-button" data-action="reset">Reset</button>' +
      '</div>' +
      '<p class="unit-title">' + h(unitTitle) + '</p>' +
      '<h1>' + h(day.title) + '</h1>' +
      '<p class="theme">' + h(day.theme || '') + '</p>' +
      '<div class="oxygen-wrap"><div class="oxygen-label"><span>Progress</span><span>' + progress + '%</span></div><div class="oxygen"><div style="width:' + progress + '%"></div></div></div>';
    return header;
  }

  function progressPercent() {
    var total = data.days.length || 1;
    var done = data.days.filter(function (d) { return state.completed[d.id]; }).length;
    return Math.round((done / total) * 100);
  }

  function homeHtml(day) {
    var clears = state.clears[day.id];
    var completed = state.completed[day.id];
    var next = data.days[currentDayIndex + 1];
    var status = completed ? 'CLEAR：次のDayが解放されています。' : 'Listening / Quiz / Flashcard をすべてCLEARすると次のDayが解放されます。';
    return '' +
      '<section class="card current-card">' +
        '<div class="badge">' + h(day.words.length) + ' words</div>' +
        '<h2>今日の海域</h2>' +
        '<p>' + h(status) + '</p>' +
        '<div class="clear-grid">' +
          clearPill('Listening', clears.listening) +
          clearPill('Quiz', clears.quiz) +
          clearPill('Flashcard', clears.flashcard) +
        '</div>' +
      '</section>' +
      '<section class="mode-grid">' +
        modeCard('listening', '🔊', '音声 → 日本語4択', '英単語を聞いて意味を即時想起します。') +
        modeCard('quiz', '📝', '英語 → 日本語4択', '語の意味を正確に確認します。') +
        modeCard('flashcard', '🌊', 'Flashcard', '例文・語源・意味を確認します。') +
      '</section>' +
      '<section class="card day-list-card"><h2>Day選択</h2><div class="day-list">' + dayButtonsHtml() + '</div></section>' +
      (next && completed ? '<button class="primary wide" data-action="nextDay">Day ' + h(next.day) + 'へ進む</button>' : '');
  }

  function clearPill(label, ok) {
    return '<div class="clear-pill ' + (ok ? 'is-clear' : '') + '"><span>' + h(label) + '</span><strong>' + (ok ? 'CLEAR' : '未完了') + '</strong></div>';
  }

  function modeCard(mode, icon, title, desc) {
    return '<button class="mode-card" data-action="mode" data-mode="' + mode + '"><span class="mode-icon">' + icon + '</span><strong>' + h(title) + '</strong><small>' + h(desc) + '</small></button>';
  }

  function dayButtonsHtml() {
    return data.days.map(function (day, index) {
      var unlocked = !!state.unlocked[day.id];
      var active = index === currentDayIndex;
      var done = !!state.completed[day.id];
      return '<button class="day-button ' + (active ? 'active ' : '') + (done ? 'done ' : '') + '" data-action="selectDay" data-index="' + index + '" ' + (unlocked ? '' : 'disabled') + '>' +
        '<span>Day ' + h(day.day) + '</span><small>' + (unlocked ? (done ? 'CLEAR' : 'OPEN') : 'LOCK') + '</small></button>';
    }).join('');
  }

  function modeIntroHtml(day, mode) {
    var title = mode === 'listening' ? '音声 → 日本語4択' : '英語 → 日本語4択';
    var lead = mode === 'listening' ? '再生ボタンで単語を聞き、日本語の意味を選びます。' : '表示された英単語に合う日本語の意味を選びます。';
    return '<section class="card quiz-start"><h2>' + h(title) + '</h2><p>' + h(lead) + '</p><button class="primary wide" data-action="startQuiz" data-mode="' + mode + '">Start</button></section>';
  }

  function flashcardHtml(day, index, flipped) {
    var safeIndex = Math.max(0, Math.min(index, day.words.length - 1));
    var word = day.words[safeIndex];
    var clear = state.clears[day.id].flashcard;
    return '' +
      '<section class="flash-wrap" data-card-index="' + safeIndex + '" data-flipped="' + (flipped ? '1' : '0') + '">' +
        '<div class="flash-counter">' + (safeIndex + 1) + ' / ' + day.words.length + '</div>' +
        '<button class="flash-card" data-action="flip">' +
          (!flipped ? '<span class="word-main">' + h(word.word) + '</span><span class="pos">' + h(word.pos || '') + '</span><small>タップして意味を見る</small>' :
          '<span class="meaning-main">' + h(word.meaning) + '</span><p>' + h(word.example || '') + '</p><p class="translation">' + h(word.translation || '') + '</p><small>' + h(word.root || '') + '</small>') +
        '</button>' +
        '<div class="flash-controls">' +
          '<button class="secondary" data-action="prevCard" ' + (safeIndex === 0 ? 'disabled' : '') + '>前へ</button>' +
          '<button class="secondary" data-action="speak" data-word="' + h(word.word) + '">音声</button>' +
          (safeIndex < day.words.length - 1 ? '<button class="primary" data-action="nextCard">次へ</button>' : '<button class="primary" data-action="clearFlash">Flashcard CLEAR</button>') +
        '</div>' +
        (clear ? '<p class="clear-message">Flashcard CLEAR済みです。</p>' : '') +
      '</section>';
  }

  function buildBottomNav() {
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.innerHTML =
      '<button data-action="home" class="' + (currentMode === 'home' ? 'active' : '') + '">Home</button>' +
      '<button data-action="mode" data-mode="listening" class="' + (currentMode === 'listening' ? 'active' : '') + '">Listen</button>' +
      '<button data-action="mode" data-mode="quiz" class="' + (currentMode === 'quiz' ? 'active' : '') + '">Quiz</button>' +
      '<button data-action="mode" data-mode="flashcard" class="' + (currentMode === 'flashcard' ? 'active' : '') + '">Cards</button>';
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
    if (action === 'home') { currentMode = 'home'; render(); }
    if (action === 'mode') { currentMode = target.getAttribute('data-mode') || 'home'; quiz = null; render(); }
    if (action === 'selectDay') selectDay(Number(target.getAttribute('data-index')));
    if (action === 'startQuiz') startQuiz(target.getAttribute('data-mode'));
    if (action === 'answer') answerQuiz(Number(target.getAttribute('data-choice')));
    if (action === 'nextQuestion') nextQuestion();
    if (action === 'speak') speak(target.getAttribute('data-word') || '');
    if (action === 'flip') flipCard();
    if (action === 'prevCard') moveCard(-1);
    if (action === 'nextCard') moveCard(1);
    if (action === 'clearFlash') clearMode('flashcard');
    if (action === 'nextDay') nextDay();
    if (action === 'reset') resetProgress();
  }

  function selectDay(index) {
    var day = data.days[index];
    if (!day || !state.unlocked[day.id]) return;
    currentDayIndex = index;
    currentMode = 'home';
    quiz = null;
    render();
  }

  function startQuiz(mode) {
    var day = currentDay();
    if (!day || !Array.isArray(day.words) || day.words.length === 0) {
      currentMode = 'home';
      render();
      return;
    }
    quiz = { mode: mode, order: shuffle(day.words.map(function (_, i) { return i; })), pos: 0, score: 0, locked: false, selected: -1 };
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    var day = currentDay();
    var main = app.querySelector('.main');
    if (!main || !quiz) return;
    var word = day.words[quiz.order[quiz.pos]];
    if (!word) { finishQuiz(); return; }
    var choices = makeChoices(word, day.words);
    quiz.correctChoice = choices.indexOf(word.meaning);
    main.innerHTML = '' +
      '<section class="card quiz-card">' +
        '<div class="flash-counter">' + (quiz.pos + 1) + ' / ' + quiz.order.length + '</div>' +
        (quiz.mode === 'listening' ? '<button class="sound-button" data-action="speak" data-word="' + h(word.word) + '">🔊 音声を再生</button><p class="hint">聞こえた英単語の意味を選んでください。</p>' : '<h2 class="quiz-word">' + h(word.word) + '</h2><p class="hint">この英単語の意味を選んでください。</p>') +
        '<div class="choices">' + choices.map(function (choice, i) { return '<button class="choice" data-action="answer" data-choice="' + i + '">' + h(choice) + '</button>'; }).join('') + '</div>' +
      '</section>';
    bindEvents();
    if (quiz.mode === 'listening') setTimeout(function () { speak(word.word); }, 250);
  }

  function makeChoices(correctWord, words) {
    var meanings = words.map(function (w) { return w.meaning; }).filter(function (m) { return m && m !== correctWord.meaning; });
    var extras = ['構造', '分類', '証拠／根拠', '抽象的な／抽出する', '変化', '比較する'].filter(function (m) { return m !== correctWord.meaning; });
    var pool = shuffle(meanings.concat(extras));
    var choices = [correctWord.meaning];
    pool.forEach(function (m) {
      if (choices.length < 4 && choices.indexOf(m) === -1) choices.push(m);
    });
    return shuffle(choices);
  }

  function answerQuiz(choiceIndex) {
    if (!quiz || quiz.locked) return;
    quiz.locked = true;
    quiz.selected = choiceIndex;
    if (choiceIndex === quiz.correctChoice) quiz.score += 1;
    var buttons = app.querySelectorAll('.choice');
    buttons.forEach(function (button, i) {
      button.disabled = true;
      if (i === quiz.correctChoice) button.classList.add('correct');
      if (i === choiceIndex && i !== quiz.correctChoice) button.classList.add('wrong');
    });
    var card = app.querySelector('.quiz-card');
    if (!card) {
      renderQuizQuestion();
      return;
    }
    var result = document.createElement('div');
    result.className = 'result-box';
    result.innerHTML = (choiceIndex === quiz.correctChoice ? '<strong>Correct!</strong>' : '<strong>Review!</strong>') +
      '<button class="primary wide" data-action="nextQuestion">' + (quiz.pos < quiz.order.length - 1 ? '次の問題へ' : '結果を見る') + '</button>';
    card.appendChild(result);
    bindEvents();
  }

  function nextQuestion() {
    if (!quiz) return;
    if (quiz.pos < quiz.order.length - 1) {
      quiz.pos += 1;
      quiz.locked = false;
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    if (!quiz) return;
    var mode = quiz.mode;
    var score = quiz.score;
    var total = quiz.order.length;
    var passed = score === total;
    var main = app ? app.querySelector('.main') : null;
    if (passed) clearMode(mode, true);
    if (!main) {
      currentMode = 'home';
      quiz = null;
      render();
      return;
    }
    main.innerHTML = '<section class="card result-card"><h2>' + (passed ? 'CLEAR!' : 'もう一度挑戦') + '</h2><p>Score: ' + score + ' / ' + total + '</p><p>' + (passed ? 'このモードはCLEARです。' : '全問正解でCLEARになります。') + '</p><button class="primary wide" data-action="' + (passed ? 'home' : 'startQuiz') + '" data-mode="' + h(mode) + '">' + (passed ? 'Homeへ戻る' : '再挑戦') + '</button></section>';
    quiz = null;
    bindEvents();
  }

  function clearMode(mode, silent) {
    var day = currentDay();
    if (!state.clears[day.id]) state.clears[day.id] = { listening: false, quiz: false, flashcard: false };
    state.clears[day.id][mode] = true;
    applyUnlockRules(state, data);
    saveState();
    if (!silent) {
      currentMode = 'home';
      render();
    }
  }

  function nextDay() {
    var next = data.days[currentDayIndex + 1];
    if (!next || !state.unlocked[next.id]) return;
    currentDayIndex += 1;
    currentMode = 'home';
    render();
  }

  function resetProgress() {
    var ok = confirm('学習進行をリセットしますか？ Weak Words機能はこの復旧版には含まれていません。');
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state = defaultState(data);
    currentDayIndex = 0;
    currentMode = 'home';
    quiz = null;
    saveState();
    render();
  }

  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('speech failed', e);
    }
  }

  function flipCard() {
    var wrap = app.querySelector('.flash-wrap');
    if (!wrap) return;
    var index = Number(wrap.getAttribute('data-card-index')) || 0;
    var flipped = wrap.getAttribute('data-flipped') === '1';
    var main = app.querySelector('.main');
    if (!main) { render(); return; }
    main.innerHTML = flashcardHtml(currentDay(), index, !flipped);
    bindEvents();
  }

  function moveCard(delta) {
    var wrap = app.querySelector('.flash-wrap');
    if (!wrap) return;
    var index = Number(wrap.getAttribute('data-card-index')) || 0;
    var main = app.querySelector('.main');
    if (!main) { render(); return; }
    main.innerHTML = flashcardHtml(currentDay(), index + delta, false);
    bindEvents();
  }

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function renderErrorNotice(message) {
    render();
    var main = app ? app.querySelector('.main') : null;
    if (!main) return;
    var notice = document.createElement('section');
    notice.className = 'card warning';
    if (notice) notice.textContent = message || '';
    main.insertBefore(notice, main.firstChild || null);
  }

  window.addEventListener('error', function (event) {
    console.error('App error:', event.error || event.message);
    if (app) {
      app.innerHTML = '<main class="main"><section class="card warning"><h1>起動エラーを検出しました</h1><p>app.jsの実行中にエラーが発生しました。ブラウザを再読み込みしてください。</p><p class="mono">' + h(event.message || '') + '</p></section></main>';
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
