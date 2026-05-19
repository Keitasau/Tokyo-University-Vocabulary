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
  var quizTimer = null;
  var quizAutoNext = null;
  var lastClearEvent = null;

  var fallbackData = {
    "appTitle": "Academic Vocabulary Network Adventure",
    "unit": {
        "id": "unit1",
        "title": "Unit 1: Perception Sea",
        "coreQuestion": "Do we see reality itself?"
    },
    "days": [
        {
            "id": "unit1-day1",
            "day": 1,
            "title": "Day 1: Seeing and Meaning",
            "theme": "Perception and interpretation",
            "words": [
                {
                    "word": "perception",
                    "meaning": "知覚／認識",
                    "pos": "noun",
                    "example": "Our perception of reality is shaped by language and memory.",
                    "translation": "私たちの現実認識は、言語や記憶によって形作られる。",
                    "root": "per- + ceive = completely take in"
                },
                {
                    "word": "represent",
                    "meaning": "表す／代表する",
                    "pos": "verb",
                    "example": "A graph can represent complex information in a simple form.",
                    "translation": "グラフは複雑な情報を単純な形で表すことができる。",
                    "root": "re- + present = present again"
                },
                {
                    "word": "interpret",
                    "meaning": "解釈する",
                    "pos": "verb",
                    "example": "Readers interpret the same text in different ways.",
                    "translation": "読者は同じ文章を異なる方法で解釈する。",
                    "root": "inter- + pret = explain between"
                },
                {
                    "word": "assumption",
                    "meaning": "前提／思い込み",
                    "pos": "noun",
                    "example": "The argument depends on a hidden assumption.",
                    "translation": "その議論は隠れた前提に依存している。",
                    "root": "as- + sumere = take up"
                },
                {
                    "word": "framework",
                    "meaning": "枠組み",
                    "pos": "noun",
                    "example": "This framework helps us compare different theories.",
                    "translation": "この枠組みは異なる理論を比較するのに役立つ。",
                    "root": "frame + work = supporting structure"
                }
            ]
        },
        {
            "id": "unit1-day2",
            "day": 2,
            "title": "Day 2: Evidence and Inference",
            "theme": "How we move from signs to conclusions",
            "words": [
                {
                    "word": "evidence",
                    "meaning": "証拠／根拠",
                    "pos": "noun",
                    "example": "The claim is weak because there is little evidence to support it.",
                    "translation": "その主張を支える証拠がほとんどないため、その主張は弱い。",
                    "root": "e- + videre = clearly seen"
                },
                {
                    "word": "infer",
                    "meaning": "推論する",
                    "pos": "verb",
                    "example": "We can infer the writer's position from the final paragraph.",
                    "translation": "最後の段落から筆者の立場を推論できる。",
                    "root": "in- + ferre = carry into"
                },
                {
                    "word": "indicate",
                    "meaning": "示す",
                    "pos": "verb",
                    "example": "The data indicate a change in public attitudes.",
                    "translation": "そのデータは世論の変化を示している。",
                    "root": "in- + dicare = point out"
                },
                {
                    "word": "distinguish",
                    "meaning": "区別する",
                    "pos": "verb",
                    "example": "It is important to distinguish fact from opinion.",
                    "translation": "事実と意見を区別することが重要である。",
                    "root": "dis- + stinguere = mark apart"
                },
                {
                    "word": "context",
                    "meaning": "文脈／状況",
                    "pos": "noun",
                    "example": "The meaning of a word often depends on its context.",
                    "translation": "単語の意味はしばしば文脈に依存する。",
                    "root": "con- + texere = weave together"
                }
            ]
        },
        {
            "id": "unit1-day3",
            "day": 3,
            "title": "Day 3: Concepts and Models",
            "theme": "Thinking through abstract tools",
            "words": [
                {
                    "word": "concept",
                    "meaning": "概念",
                    "pos": "noun",
                    "example": "The concept of freedom has changed across history.",
                    "translation": "自由という概念は歴史を通じて変化してきた。",
                    "root": "con- + capere = take together"
                },
                {
                    "word": "category",
                    "meaning": "分類／カテゴリー",
                    "pos": "noun",
                    "example": "The boundary between the two categories is not always clear.",
                    "translation": "その二つのカテゴリーの境界は常に明確とは限らない。",
                    "root": "Greek kategoria = statement, class"
                },
                {
                    "word": "structure",
                    "meaning": "構造",
                    "pos": "noun",
                    "example": "The structure of the essay makes the argument easy to follow.",
                    "translation": "そのエッセイの構造により、議論を追いやすくなっている。",
                    "root": "struere = build"
                },
                {
                    "word": "model",
                    "meaning": "模型／モデル化する",
                    "pos": "noun/verb",
                    "example": "Scientists use models to explain complex systems.",
                    "translation": "科学者は複雑なシステムを説明するためにモデルを用いる。",
                    "root": "modulus = measure"
                },
                {
                    "word": "abstract",
                    "meaning": "抽象的な／抽出する",
                    "pos": "adjective/verb",
                    "example": "Abstract ideas become clearer when we connect them to examples.",
                    "translation": "抽象的な考えは、具体例と結びつけるとより明確になる。",
                    "root": "ab- + trahere = draw away"
                }
            ]
        },
        {
            "id": "unit1-day4",
            "day": 4,
            "title": "Day 4: Bias and Assumptions",
            "theme": "How hidden expectations shape what we see",
            "words": [
                {
                    "word": "bias",
                    "meaning": "偏り／先入観",
                    "pos": "noun",
                    "example": "A writer's bias can influence the way evidence is selected.",
                    "translation": "筆者の偏りは、証拠の選び方に影響を与えることがある。",
                    "root": "Old French biais = slant, oblique angle"
                },
                {
                    "word": "assumption",
                    "meaning": "前提／思い込み",
                    "pos": "noun",
                    "example": "We should examine the assumption behind the argument before accepting it.",
                    "translation": "その議論を受け入れる前に、その背後にある前提を検討すべきである。",
                    "root": "as- + sumere = take up; something taken as true"
                },
                {
                    "word": "stereotype",
                    "meaning": "固定観念／ステレオタイプ",
                    "pos": "noun",
                    "example": "A stereotype reduces a complex person to a simple image.",
                    "translation": "固定観念は、複雑な人間を単純なイメージに還元してしまう。",
                    "root": "stereo- = solid + type = model, impression"
                },
                {
                    "word": "prejudice",
                    "meaning": "偏見／先入観",
                    "pos": "noun",
                    "example": "Prejudice often appears before careful observation begins.",
                    "translation": "偏見は、注意深い観察が始まる前に現れることが多い。",
                    "root": "pre- + judge = judge before"
                },
                {
                    "word": "perspective",
                    "meaning": "視点／観点",
                    "pos": "noun",
                    "example": "Changing our perspective can change the meaning of the same event.",
                    "translation": "視点を変えると、同じ出来事の意味が変わることがある。",
                    "root": "per- + specere = look through"
                },
                {
                    "word": "expectation",
                    "meaning": "期待／予想",
                    "pos": "noun",
                    "example": "Our expectations can make some details more noticeable than others.",
                    "translation": "私たちの期待は、ある細部を他の細部より目立たせることがある。",
                    "root": "ex- + spectare = look out for"
                },
                {
                    "word": "tendency",
                    "meaning": "傾向",
                    "pos": "noun",
                    "example": "Humans have a tendency to find patterns even in random events.",
                    "translation": "人間には、偶然の出来事の中にもパターンを見出す傾向がある。",
                    "root": "tendere = stretch, move toward"
                }
            ]
        },
        {
            "id": "unit1-day5",
            "day": 5,
            "title": "Day 5: Abstraction and Classification",
            "theme": "How the mind groups experience into ideas",
            "words": [
                {
                    "word": "abstraction",
                    "meaning": "抽象化／抽象概念",
                    "pos": "noun",
                    "example": "Abstraction allows us to think beyond particular examples.",
                    "translation": "抽象化によって、個別の例を超えて考えることができる。",
                    "root": "ab- + trahere = draw away"
                },
                {
                    "word": "category",
                    "meaning": "分類／カテゴリー",
                    "pos": "noun",
                    "example": "A category helps us organize many different objects under one idea.",
                    "translation": "カテゴリーは、多くの異なる物を一つの考えの下に整理するのに役立つ。",
                    "root": "Greek kategoria = class, statement"
                },
                {
                    "word": "classification",
                    "meaning": "分類／分類体系",
                    "pos": "noun",
                    "example": "Classification is not neutral; it reflects what a society considers important.",
                    "translation": "分類は中立ではなく、社会が何を重要と考えるかを反映する。",
                    "root": "classis = group + facere = make"
                },
                {
                    "word": "classify",
                    "meaning": "分類する",
                    "pos": "verb",
                    "example": "Scientists classify living things according to shared features.",
                    "translation": "科学者は共通する特徴に基づいて生物を分類する。",
                    "root": "classis = group + facere = make"
                },
                {
                    "word": "generalize",
                    "meaning": "一般化する",
                    "pos": "verb",
                    "example": "We must be careful not to generalize from too few examples.",
                    "translation": "少なすぎる例から一般化しないよう注意しなければならない。",
                    "root": "genus = kind, class"
                },
                {
                    "word": "distinction",
                    "meaning": "区別／相違",
                    "pos": "noun",
                    "example": "The distinction between fact and interpretation is central to critical reading.",
                    "translation": "事実と解釈の区別は、批判的読解の中心である。",
                    "root": "dis- + stinguere = mark apart"
                },
                {
                    "word": "feature",
                    "meaning": "特徴／特性",
                    "pos": "noun",
                    "example": "The most important feature of the model is its simplicity.",
                    "translation": "そのモデルの最も重要な特徴は単純さである。",
                    "root": "Old French faiture = form, make"
                }
            ]
        },
        {
            "id": "unit1-day6",
            "day": 6,
            "title": "Day 6: Models and Frameworks",
            "theme": "Tools for seeing hidden structure",
            "words": [
                {
                    "word": "model",
                    "meaning": "モデル／模型",
                    "pos": "noun",
                    "example": "A model simplifies reality so that we can understand its structure.",
                    "translation": "モデルは現実を単純化し、その構造を理解できるようにする。",
                    "root": "modulus = small measure"
                },
                {
                    "word": "framework",
                    "meaning": "枠組み",
                    "pos": "noun",
                    "example": "A useful framework shows how different ideas are connected.",
                    "translation": "有用な枠組みは、異なる考えがどのように結びついているかを示す。",
                    "root": "frame + work = supporting structure"
                },
                {
                    "word": "structure",
                    "meaning": "構造",
                    "pos": "noun",
                    "example": "The structure of a system may be invisible at first glance.",
                    "translation": "システムの構造は、一見しただけでは見えないことがある。",
                    "root": "struere = build, arrange"
                },
                {
                    "word": "system",
                    "meaning": "体系／制度／システム",
                    "pos": "noun",
                    "example": "A change in one part of the system can affect the whole.",
                    "translation": "システムの一部の変化が全体に影響を与えることがある。",
                    "root": "Greek systema = things placed together"
                },
                {
                    "word": "mechanism",
                    "meaning": "仕組み／メカニズム",
                    "pos": "noun",
                    "example": "The mechanism behind the effect is still not fully understood.",
                    "translation": "その効果の背後にある仕組みは、まだ完全には理解されていない。",
                    "root": "Greek mechane = machine, device"
                },
                {
                    "word": "component",
                    "meaning": "構成要素",
                    "pos": "noun",
                    "example": "Each component plays a different role in the larger structure.",
                    "translation": "それぞれの構成要素は、より大きな構造の中で異なる役割を果たす。",
                    "root": "com- + ponere = put together"
                },
                {
                    "word": "relation",
                    "meaning": "関係／関連",
                    "pos": "noun",
                    "example": "Meaning often emerges from the relation between words, not from one word alone.",
                    "translation": "意味は一語だけからではなく、語と語の関係から生まれることが多い。",
                    "root": "re- + ferre/latum = carry back, connect"
                }
            ]
        },
        {
            "id": "unit1-day7",
            "day": 7,
            "title": "Day 7: Meta-cognition and Reflection",
            "theme": "Thinking about how we think and interpret",
            "words": [
                {
                    "word": "metacognition",
                    "meaning": "メタ認知／自分の思考を考えること",
                    "pos": "noun",
                    "example": "Metacognition helps learners notice how they understand a difficult text.",
                    "translation": "メタ認知は、学習者が難しい文章をどのように理解しているかに気づく助けとなる。",
                    "root": "meta- = beyond, about + cognition = knowing"
                },
                {
                    "word": "interpretation",
                    "meaning": "解釈",
                    "pos": "noun",
                    "example": "Every interpretation should be tested against the evidence in the text.",
                    "translation": "すべての解釈は、本文中の根拠と照らし合わせて検証されるべきである。",
                    "root": "inter- + pretari = explain between"
                },
                {
                    "word": "reflection",
                    "meaning": "振り返り／反省／反映",
                    "pos": "noun",
                    "example": "Reflection turns experience into learning.",
                    "translation": "振り返りは、経験を学びへと変える。",
                    "root": "re- + flectere = bend back"
                },
                {
                    "word": "awareness",
                    "meaning": "気づき／認識",
                    "pos": "noun",
                    "example": "Awareness of one's own bias is the first step toward better judgment.",
                    "translation": "自分自身の偏りへの気づきは、よりよい判断への第一歩である。",
                    "root": "aware = watchful, informed"
                },
                {
                    "word": "monitor",
                    "meaning": "観察する／監視する",
                    "pos": "verb",
                    "example": "Good readers monitor their understanding while they read.",
                    "translation": "優れた読み手は、読んでいる間に自分の理解を確認する。",
                    "root": "monere = warn, remind"
                },
                {
                    "word": "evaluate",
                    "meaning": "評価する／見極める",
                    "pos": "verb",
                    "example": "We need to evaluate whether the conclusion follows from the evidence.",
                    "translation": "結論が証拠から導かれるかどうかを評価する必要がある。",
                    "root": "e- + value = determine worth"
                },
                {
                    "word": "insight",
                    "meaning": "洞察／見抜く力",
                    "pos": "noun",
                    "example": "Insight often comes when we question our first interpretation.",
                    "translation": "洞察は、最初の解釈を疑うときに生まれることが多い。",
                    "root": "in- + sight = seeing inward"
                },
                {
                    "word": "revision",
                    "meaning": "修正／見直し",
                    "pos": "noun",
                    "example": "Revision is not failure; it is evidence that thinking has improved.",
                    "translation": "修正は失敗ではなく、思考が改善した証拠である。",
                    "root": "re- + videre = see again"
                }
            ]
        }
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
    var area = seaAreaName(day);
    header.innerHTML =
      '<div class="hero-top">' +
        '<div class="brand"><span class="brand-icon">🦈</span><span>' + h(data.appTitle || 'Vocabulary Adventure') + '</span></div>' +
        '<button class="small-button" data-action="reset">Reset</button>' +
      '</div>' +
      '<p class="unit-title">' + h(unitTitle) + '</p>' +
      '<h1>' + h(day.title) + '</h1>' +
      '<p class="theme">' + h(day.theme || '') + '</p>' +
      '<div class="sea-chip">🧭 Current Area: ' + h(area) + '</div>' +
      seaProgressHtml(progress);
    return header;
  }

  function progressPercent() {
    var total = data.days.length || 1;
    var done = data.days.filter(function (d) { return state.completed[d.id]; }).length;
    return Math.round((done / total) * 100);
  }


  function completedDayCount() {
    if (!data || !Array.isArray(data.days)) return 0;
    return data.days.filter(function (d) { return state.completed[d.id]; }).length;
  }

  function sharkLevel() {
    return completedDayCount() + 1;
  }

  function seaAreaName(day) {
    var names = [
      'Meaning Lagoon',
      'Evidence Current',
      'Concept Atoll',
      'Bias Trench',
      'Abstraction Shelf',
      'Framework Reef',
      'Reflection Abyss'
    ];
    var n = day && day.day ? Number(day.day) : 1;
    return names[n - 1] || ('Perception Area ' + n);
  }

  function seaProgressHtml(progress) {
    var filled = Math.max(0, Math.min(10, Math.round(progress / 10)));
    var bar = '';
    for (var i = 0; i < 10; i++) bar += i < filled ? '█' : '░';
    return '<div class="oxygen-wrap sea-progress-card">' +
      '<div class="oxygen-label"><span>Perception Sea</span><span>' + progress + '% explored</span></div>' +
      '<div class="sea-ascii" aria-label="Perception Sea ' + progress + '% explored">' + bar + '</div>' +
      '<div class="oxygen"><div style="width:' + progress + '%"></div></div>' +
    '</div>';
  }

  function dayClearEventHtml(event) {
    if (!event) return '';
    var nextLine = event.nextDay ? 'New Sea Unlocked: Day ' + event.nextDay.day : 'Perception Sea fully explored';
    return '' +
      '<section class="card day-clear-card">' +
        '<div class="sparkles" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span></div>' +
        '<p class="clear-kicker">DAY CLEAR</p>' +
        '<h2>' + h(event.area) + ' discovered</h2>' +
        '<p class="unlock-line">' + h(nextLine) + '</p>' +
        '<div class="level-up">🦈 Shark Sensei Lv.' + h(event.oldLevel) + ' → Lv.' + h(event.newLevel) + '</div>' +
        '<div class="explore-meter"><span>Perception Sea</span><strong>' + h(event.progress) + '% explored</strong></div>' +
        '<div class="oxygen"><div style="width:' + h(event.progress) + '%"></div></div>' +
      '</section>';
  }

  function homeHtml(day) {
    var clears = state.clears[day.id];
    var completed = state.completed[day.id];
    var next = data.days[currentDayIndex + 1];
    var status = completed ? 'CLEAR：この海域の探索は完了しました。次の海へ進めます。' : 'Flashcard / Quiz / Listening をすべてCLEARすると次の海域が解放されます。';
    var area = seaAreaName(day);
    var celebration = lastClearEvent && lastClearEvent.dayId === day.id ? dayClearEventHtml(lastClearEvent) : '';
    return '' +
      celebration +
      '<section class="card current-card">' +
        '<div class="badge">Day ' + h(day.day) + ' / ' + h(data.days.length) + ' ・ ' + h(day.words.length) + ' words</div>' +
        '<h2>今日の海域：' + h(area) + '</h2>' +
        '<p>' + h(status) + '</p>' +
        '<div class="mini-stats"><span>🦈 Shark Sensei Lv.' + h(sharkLevel()) + '</span><span>' + h(progressPercent()) + '% explored</span></div>' +
        '<div class="clear-grid">' +
          clearPill('Flashcard', clears.flashcard) +
          clearPill('Quiz', clears.quiz) +
          clearPill('Listening', clears.listening) +
        '</div>' +
      '</section>' +
      '<section class="mode-grid">' +
        modeCard('flashcard', '🌊', 'Flashcard', '例文・語源・意味を確認します。') +
        modeCard('quiz', '📝', '英語 → 日本語4択', '語の意味を正確に確認します。') +
        modeCard('listening', '🔊', '音声 → 日本語4択', '英単語を聞いて意味を即時想起します。') +
      '</section>' +
      '<section class="card day-list-card"><h2>Perception Sea Route</h2><p class="route-note">Flashcard → Quiz → Listen の順で、Day7まで進みます。</p><div class="day-list">' + dayButtonsHtml() + '</div></section>' +
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
      '<button data-action="mode" data-mode="flashcard" class="' + (currentMode === 'flashcard' ? 'active' : '') + '">Cards</button>' +
      '<button data-action="mode" data-mode="quiz" class="' + (currentMode === 'quiz' ? 'active' : '') + '">Quiz</button>' +
      '<button data-action="mode" data-mode="listening" class="' + (currentMode === 'listening' ? 'active' : '') + '">Listen</button>';
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
    if (action === 'home') { stopQuizTimer(); currentMode = 'home'; render(); }
    if (action === 'mode') { stopQuizTimer(); currentMode = target.getAttribute('data-mode') || 'home'; quiz = null; render(); }
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
    stopQuizTimer();
    quiz = null;
    if (!lastClearEvent || lastClearEvent.dayId !== day.id) lastClearEvent = null;
    render();
  }

  function startQuiz(mode) {
    var day = currentDay();
    if (!day || !Array.isArray(day.words) || day.words.length === 0) {
      currentMode = 'home';
      render();
      return;
    }
    stopQuizTimer();
    quiz = { mode: mode, order: shuffle(day.words.map(function (_, i) { return i; })), pos: 0, score: 0, locked: false, selected: -1, timeLeft: 10 };
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    var day = currentDay();
    var main = app.querySelector('.main');
    if (!main || !quiz) return;
    stopQuizTimer();
    var word = day.words[quiz.order[quiz.pos]];
    if (!word) { finishQuiz(); return; }
    var choices = makeChoices(word, day.words);
    quiz.correctChoice = choices.indexOf(word.meaning);
    quiz.timeLeft = 10;
    main.innerHTML = '' +
      '<section class="card quiz-card">' +
        '<div class="quiz-topline">' +
          '<div class="flash-counter quiz-counter">' + (quiz.pos + 1) + ' / ' + quiz.order.length + '</div>' +
          '<div class="timer-chip" aria-live="polite"><span>⏱</span><strong id="quizTimerText">10</strong><small>sec</small></div>' +
        '</div>' +
        '<div class="timer-bar"><div id="quizTimerBar" style="width:100%"></div></div>' +
        (quiz.mode === 'listening' ? '<button class="sound-button" data-action="speak" data-word="' + h(word.word) + '">🔊 音声を再生</button><p class="hint">聞こえた英単語の意味を選んでください。</p>' : '<h2 class="quiz-word">' + h(word.word) + '</h2><p class="hint">この英単語の意味を選んでください。</p>') +
        '<div class="choices">' + choices.map(function (choice, i) { return '<button class="choice" data-action="answer" data-choice="' + i + '">' + h(choice) + '</button>'; }).join('') + '</div>' +
      '</section>';
    bindEvents();
    startQuizTimer();
    if (quiz.mode === 'listening') setTimeout(function () { if (quiz && !quiz.locked) speak(word.word); }, 250);
  }

  function makeChoices(correctWord, words) {
    var baseMeanings = words.map(function (w) { return w.meaning; }).filter(function (m) {
      return isGoodDistractor(m, correctWord.meaning);
    });
    var extras = [
      '構造', '分類', '証拠／根拠', '抽象的な考え', '変化', '比較', '関係', '文脈／状況',
      '仕組み／メカニズム', '構成要素', '気づき／認識', '修正／見直し', '洞察', '一般化'
    ].filter(function (m) { return isGoodDistractor(m, correctWord.meaning); });
    var pool = shuffle(baseMeanings.concat(extras));
    var choices = [correctWord.meaning];
    pool.forEach(function (m) {
      if (choices.length < 4 && choices.every(function (existing) { return isGoodDistractor(m, existing); })) choices.push(m);
    });
    return shuffle(choices);
  }

  function isGoodDistractor(candidate, anchor) {
    if (!candidate || !anchor || candidate === anchor) return false;
    var c = normalizeMeaning(candidate);
    var a = normalizeMeaning(anchor);
    if (!c || !a || c === a) return false;
    if (c.indexOf(a) !== -1 || a.indexOf(c) !== -1) return false;
    var cParts = meaningParts(candidate);
    var aParts = meaningParts(anchor);
    for (var i = 0; i < cParts.length; i++) {
      for (var j = 0; j < aParts.length; j++) {
        if (cParts[i] === aParts[j]) return false;
        if (cParts[i].length >= 2 && aParts[j].length >= 2 && (cParts[i].indexOf(aParts[j]) !== -1 || aParts[j].indexOf(cParts[i]) !== -1)) return false;
      }
    }
    return true;
  }

  function normalizeMeaning(text) {
    return String(text || '')
      .replace(/[\s　]/g, '')
      .replace(/[／\/・,，、()（）]/g, '')
      .replace(/する$/g, '')
      .replace(/的な/g, '')
      .replace(/こと/g, '');
  }

  function meaningParts(text) {
    var raw = String(text || '').split(/[／\/・,，、()（）\s　]+/);
    var parts = [];
    raw.forEach(function (part) {
      var clean = normalizeMeaning(part);
      if (clean && clean.length >= 2 && parts.indexOf(clean) === -1) parts.push(clean);
    });
    return parts;
  }

  function startQuizTimer() {
    if (!quiz) return;
    stopQuizTimer();
    updateQuizTimerView();
    quizTimer = setInterval(function () {
      if (!quiz || quiz.locked) { stopQuizTimer(); return; }
      quiz.timeLeft -= 1;
      updateQuizTimerView();
      if (quiz.timeLeft <= 0) answerQuiz(-1, true);
    }, 1000);
  }

  function stopQuizTimer() {
    if (quizTimer) {
      clearInterval(quizTimer);
      quizTimer = null;
    }
    if (quizAutoNext) {
      clearTimeout(quizAutoNext);
      quizAutoNext = null;
    }
  }

  function updateQuizTimerView() {
    if (!quiz) return;
    var left = Math.max(0, quiz.timeLeft || 0);
    var text = document.getElementById('quizTimerText');
    var bar = document.getElementById('quizTimerBar');
    if (text) text.textContent = String(left);
    if (bar) bar.style.width = Math.max(0, Math.min(100, left * 10)) + '%';
  }

  function answerQuiz(choiceIndex, timedOut) {
    if (!quiz || quiz.locked) return;
    stopQuizTimer();
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
    result.className = 'result-box ' + (timedOut ? 'time-up-box' : '');
    result.innerHTML = (choiceIndex === quiz.correctChoice ? '<strong>Correct!</strong>' : (timedOut ? '<strong>Time up!</strong>' : '<strong>Review!</strong>')) +
      '<p>' + (timedOut ? '10秒経過しました。次の問題へ進みます。' : (choiceIndex === quiz.correctChoice ? '瞬時に意味へアクセスできました。' : '正解を確認して次へ進みましょう。')) + '</p>' +
      '<button class="primary wide" data-action="nextQuestion">' + (quiz.pos < quiz.order.length - 1 ? '次の問題へ' : '結果を見る') + '</button>';
    card.appendChild(result);
    bindEvents();
    if (timedOut) {
      quizAutoNext = setTimeout(function () { nextQuestion(); }, 900);
    }
  }

  function nextQuestion() {
    stopQuizTimer();
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
    stopQuizTimer();
    if (!quiz) return;
    var mode = quiz.mode;
    var score = quiz.score;
    var total = quiz.order.length;
    var passed = score === total;
    var main = app ? app.querySelector('.main') : null;
    var celebration = passed ? clearMode(mode, true) : null;
    if (!main) {
      currentMode = 'home';
      quiz = null;
      render();
      return;
    }
    main.innerHTML = (celebration ? dayClearEventHtml(celebration) : '') + '<section class="card result-card"><h2>' + (passed ? 'CLEAR!' : 'もう一度挑戦') + '</h2><p>Score: ' + score + ' / ' + total + '</p><p>' + (passed ? (celebration ? 'Day CLEAR! 新しい海域が見えてきました。' : 'このモードはCLEARです。') : '全問正解でCLEARになります。') + '</p><button class="primary wide" data-action="' + (passed ? 'home' : 'startQuiz') + '" data-mode="' + h(mode) + '">' + (passed ? 'Homeへ戻る' : '再挑戦') + '</button></section>';
    quiz = null;
    bindEvents();
  }

  function clearMode(mode, silent) {
    var day = currentDay();
    var wasCompleted = !!state.completed[day.id];
    var oldLevel = sharkLevel();
    if (!state.clears[day.id]) state.clears[day.id] = { listening: false, quiz: false, flashcard: false };
    state.clears[day.id][mode] = true;
    applyUnlockRules(state, data);
    var becameCompleted = !wasCompleted && !!state.completed[day.id];
    var event = null;
    if (becameCompleted) {
      event = {
        dayId: day.id,
        area: seaAreaName(day),
        oldLevel: oldLevel,
        newLevel: sharkLevel(),
        progress: progressPercent(),
        nextDay: data.days[currentDayIndex + 1] || null
      };
      lastClearEvent = event;
    }
    saveState();
    if (!silent) {
      currentMode = 'home';
      render();
    }
    return event;
  }

  function nextDay() {
    var next = data.days[currentDayIndex + 1];
    if (!next || !state.unlocked[next.id]) return;
    currentDayIndex += 1;
    currentMode = 'home';
    lastClearEvent = null;
    render();
  }

  function resetProgress() {
    var ok = confirm('学習進行をリセットしますか？ Weak Words機能はこの復旧版には含まれていません。');
    if (!ok) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    state = defaultState(data);
    currentDayIndex = 0;
    currentMode = 'home';
    stopQuizTimer();
    quiz = null;
    lastClearEvent = null;
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
