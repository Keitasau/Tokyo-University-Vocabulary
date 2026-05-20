document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const STORAGE_KEY = "avnTodaiProgress.v1";
  const SENSEI = {
    home: "今日も知性の海を探検しよう！",
    correct: "いいね！意味にすぐアクセスできているよ！",
    wrong: "大丈夫。もう一度つながりで覚えよう！",
    clear: "この海域の語彙ネットワークが見えてきたね！"
  };

  let vocab = [];
  let topics = [];
  let currentTopic = "";
  let currentItems = [];
  let currentIndex = 0;
  let isFlipped = false;
  let quizItems = [];
  let quizIndex = 0;
  let quizCurrent = null;
  let quizMode = "quiz";
  let audioCtx = null;
  let userInteracted = false;

  const state = loadState();

  function safeText(id, value) {
    const el = $(id);
    if (el) el.textContent = value == null ? "" : String(value);
  }

  function safeHTML(id, value) {
    const el = $(id);
    if (el) el.innerHTML = value == null ? "" : String(value);
  }

  function showError(message) {
    const box = $("errorBox");
    if (!box) return;
    box.textContent = message;
    box.classList.remove("hidden");
  }

  function clearError() {
    const box = $("errorBox");
    if (!box) return;
    box.textContent = "";
    box.classList.add("hidden");
  }

  function loadState() {
    const fallback = {
      known: {},
      unsure: {},
      quiz: { correct: 0, total: 0 },
      listening: { correct: 0, total: 0 }
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        known: parsed.known && typeof parsed.known === "object" ? parsed.known : {},
        unsure: parsed.unsure && typeof parsed.unsure === "object" ? parsed.unsure : {},
        quiz: parsed.quiz || { correct: 0, total: 0 },
        listening: parsed.listening || { correct: 0, total: 0 }
      };
    } catch (e) {
      return fallback;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showError("学習記録の保存に失敗しました。ブラウザの保存容量や設定を確認してください。");
    }
  }

  function escapeHTML(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setSensei(message) {
    safeText("senseiComment", message || SENSEI.home);
  }

  function activateAudio() {
    userInteracted = true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx && !audioCtx) audioCtx = new Ctx();
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    } catch (e) {
      audioCtx = null;
    }
  }

  document.body.addEventListener("pointerdown", activateAudio, { once: true });
  document.body.addEventListener("keydown", activateAudio, { once: true });

  function playSuccessSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      const now = audioCtx.currentTime;
      const master = audioCtx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      master.connect(audioCtx.destination);
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.7, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  function speakWord(word) {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      utter.lang = "en-US";
      utter.rate = 0.86;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const el = $(id);
    if (el) el.classList.add("active");
    clearError();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setSeaBackground(topic) {
    const shell = $("appShell");
    if (!shell) return;
    shell.className = shell.className.replace(/\bsea-bg-\d\b/g, "").trim();
    const idx = Math.max(0, topics.indexOf(topic));
    shell.classList.add("sea-bg-" + (idx % 6));
  }

  function groupByTopic() {
    const set = new Set(vocab.map((x) => x.topic || "未分類"));
    topics = Array.from(set);
  }

  function getItemsByTopic(topic) {
    return vocab.filter((x) => (x.topic || "未分類") === topic);
  }

  function getKnownCount(items) {
    return items.filter((x) => state.known[x.id]).length;
  }

  function getUnsureCount(items) {
    return items.filter((x) => state.unsure[x.id]).length;
  }

  function percent(num, den) {
    if (!den) return 0;
    return Math.round((num / den) * 100);
  }

  function accuracy(obj) {
    if (!obj || !obj.total) return 0;
    return Math.round((obj.correct / obj.total) * 100);
  }

  function renderHome() {
    setSeaBackground("");
    setSensei(SENSEI.home);
    const known = getKnownCount(vocab);
    const unsure = getUnsureCount(vocab);
    safeHTML("homeStats", `
      <div class="stat"><span>全体進捗</span><b>${percent(known, vocab.length)}%</b></div>
      <div class="stat"><span>総単語数</span><b>${vocab.length}</b></div>
      <div class="stat"><span>覚えた</span><b>${known}</b></div>
      <div class="stat"><span>まだ不安</span><b>${unsure}</b></div>
      <div class="stat"><span>4択正答率</span><b>${accuracy(state.quiz)}%</b></div>
      <div class="stat"><span>Listening正答率</span><b>${accuracy(state.listening)}%</b></div>
    `);

    const summary = topics.map((topic, i) => {
      const items = getItemsByTopic(topic);
      const k = getKnownCount(items);
      const acc = topicAccuracy(topic);
      return `
        <div class="progress-topic-card">
          <h3>${escapeHTML(topic)}</h3>
          <p>${items.length}語 / 学習済み ${k}語 / 正答率 ${acc}%</p>
          <div class="progress-bar"><div class="progress-fill" style="width:${percent(k, items.length)}%"></div></div>
        </div>
      `;
    }).join("");
    safeHTML("homeTopicSummary", summary);
  }

  function topicAccuracy(topic) {
    const items = getItemsByTopic(topic);
    if (!items.length) return 0;
    const known = getKnownCount(items);
    return percent(known, items.length);
  }

  function renderTopics() {
    setSensei(SENSEI.home);
    const html = topics.map((topic, i) => {
      const items = getItemsByTopic(topic);
      const known = getKnownCount(items);
      const acc = topicAccuracy(topic);
      return `
        <button class="topic-card sea-bg-${i % 6}" data-topic="${escapeHTML(topic)}" type="button">
          <h3>${escapeHTML(topic)}</h3>
          <p>収録語数：${items.length}語</p>
          <p>学習済み：${known}語</p>
          <p>正答率：${acc}%</p>
          <div class="progress-bar"><div class="progress-fill" style="width:${percent(known, items.length)}%"></div></div>
        </button>
      `;
    }).join("");
    safeHTML("topicList", html);
    const list = $("topicList");
    if (list) {
      list.querySelectorAll(".topic-card").forEach((btn) => {
        btn.addEventListener("click", () => selectTopic(btn.getAttribute("data-topic")));
      });
    }
  }

  function selectTopic(topic) {
    currentTopic = topic;
    currentItems = getItemsByTopic(topic);
    currentIndex = 0;
    setSeaBackground(topic);
    safeText("selectedTopicTitle", topic);
    safeText("selectedTopicMeta", `${currentItems.length}語 / 学習済み ${getKnownCount(currentItems)}語`);
    showScreen("modeScreen");
  }

  function renderFlashcard() {
    if (!currentItems.length) {
      showError("このTopicには単語がありません。");
      return;
    }
    currentIndex = Math.max(0, Math.min(currentIndex, currentItems.length - 1));
    const item = currentItems[currentIndex];
    const card = $("flashcard");
    if (card) card.classList.toggle("flipped", isFlipped);
    safeText("flashCounter", `${currentIndex + 1} / ${currentItems.length}`);
    safeText("cardWord", item.word);
    safeText("cardPos", item.pos);
    safeText("cardMeaning", item.meaning);
    safeText("cardDerivatives", item.derivatives);
    safeText("cardExample", item.example);
    safeText("cardExampleJa", item.exampleJa);
  }

  function toggleCard() {
    isFlipped = !isFlipped;
    renderFlashcard();
  }

  function markCard(kind) {
    const item = currentItems[currentIndex];
    if (!item) return;
    if (kind === "known") {
      state.known[item.id] = true;
      delete state.unsure[item.id];
      setSensei(SENSEI.clear);
    } else {
      state.unsure[item.id] = true;
      delete state.known[item.id];
      setSensei(SENSEI.wrong);
    }
    saveState();
    renderFlashcard();
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function uniqueByMeaning(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const key = String(item.meaning || "").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function makeOptions(correctItem, poolItems) {
    const correctMeaning = String(correctItem.meaning || "");
    const topicPool = uniqueByMeaning(poolItems).filter((x) => x.id !== correctItem.id && x.meaning !== correctMeaning);
    const allPool = uniqueByMeaning(vocab).filter((x) => x.id !== correctItem.id && x.meaning !== correctMeaning);
    const selected = [];
    const addFrom = (pool) => {
      for (const item of shuffle(pool)) {
        if (selected.length >= 3) break;
        if (selected.some((x) => x.meaning === item.meaning)) continue;
        selected.push(item);
      }
    };
    addFrom(topicPool);
    if (selected.length < 3) addFrom(allPool);
    const options = [correctMeaning].concat(selected.map((x) => x.meaning));
    return shuffle(Array.from(new Set(options))).slice(0, Math.min(4, options.length));
  }

  function startQuiz(items, mode) {
    quizMode = mode || "quiz";
    quizItems = shuffle(items && items.length ? items : vocab);
    quizIndex = 0;
    if (!quizItems.length) {
      showError("出題できる単語がありません。");
      return;
    }
    if (quizMode === "listening") {
      showScreen("listeningScreen");
      renderListeningQuestion();
    } else {
      showScreen("quizScreen");
      renderQuizQuestion();
    }
  }

  function renderQuizQuestion() {
    quizCurrent = quizItems[quizIndex % quizItems.length];
    const pool = currentTopic ? getItemsByTopic(currentTopic) : vocab;
    safeText("quizTitle", currentTopic ? `${currentTopic}：英語→日本語4択` : "総復習：英語→日本語4択");
    safeText("quizCounter", `${quizIndex + 1}問目`);
    safeText("quizWord", quizCurrent.word);
    safeText("quizPos", quizCurrent.pos);
    safeText("quizFeedback", "");
    const next = $("nextQuizBtn");
    if (next) next.classList.add("hidden");
    renderOptions("quizOptions", makeOptions(quizCurrent, pool), quizCurrent.meaning, handleQuizAnswer);
  }

  function renderListeningQuestion() {
    quizCurrent = quizItems[quizIndex % quizItems.length];
    const pool = currentTopic ? getItemsByTopic(currentTopic) : vocab;
    safeText("listeningTitle", currentTopic ? `${currentTopic}：Listening` : "総復習：Listening");
    safeText("listeningCounter", `${quizIndex + 1}問目`);
    safeText("listeningFeedback", "");
    const next = $("nextListeningBtn");
    if (next) next.classList.add("hidden");
    renderOptions("listeningOptions", makeOptions(quizCurrent, pool), quizCurrent.meaning, handleListeningAnswer);
    setTimeout(() => speakWord(quizCurrent.word), 250);
  }

  function renderOptions(containerId, options, correctMeaning, handler) {
    const box = $(containerId);
    if (!box) return;
    box.innerHTML = "";
    if (!options.length) {
      box.innerHTML = "<p>選択肢を作成できませんでした。</p>";
      return;
    }
    options.forEach((meaning) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = meaning;
      btn.addEventListener("click", () => handler(btn, meaning, correctMeaning));
      box.appendChild(btn);
    });
  }

  function lockOptions(containerId, chosenBtn, chosenMeaning, correctMeaning) {
    const box = $(containerId);
    if (!box) return;
    Array.from(box.querySelectorAll("button")).forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent === correctMeaning) btn.classList.add("correct");
    });
    if (chosenMeaning !== correctMeaning && chosenBtn) chosenBtn.classList.add("wrong");
  }

  function handleQuizAnswer(btn, meaning, correctMeaning) {
    const ok = meaning === correctMeaning;
    state.quiz.total += 1;
    if (ok) state.quiz.correct += 1;
    saveState();
    lockOptions("quizOptions", btn, meaning, correctMeaning);
    const fb = $("quizFeedback");
    if (fb) {
      fb.textContent = ok ? "正解！" : `不正解。正解：${correctMeaning}`;
      fb.className = "feedback " + (ok ? "ok" : "bad");
    }
    if (ok) {
      setSensei(SENSEI.correct);
      playSuccessSound();
    } else {
      setSensei(SENSEI.wrong);
      if (quizCurrent) {
        state.unsure[quizCurrent.id] = true;
        delete state.known[quizCurrent.id];
        saveState();
      }
    }
    const next = $("nextQuizBtn");
    if (next) next.classList.remove("hidden");
  }

  function handleListeningAnswer(btn, meaning, correctMeaning) {
    const ok = meaning === correctMeaning;
    state.listening.total += 1;
    if (ok) state.listening.correct += 1;
    saveState();
    lockOptions("listeningOptions", btn, meaning, correctMeaning);
    const fb = $("listeningFeedback");
    if (fb) {
      fb.textContent = ok ? "正解！" : `不正解。正解：${correctMeaning}`;
      fb.className = "feedback " + (ok ? "ok" : "bad");
    }
    if (ok) {
      setSensei(SENSEI.correct);
      playSuccessSound();
    } else {
      setSensei(SENSEI.wrong);
      if (quizCurrent) {
        state.unsure[quizCurrent.id] = true;
        delete state.known[quizCurrent.id];
        saveState();
      }
    }
    const next = $("nextListeningBtn");
    if (next) next.classList.remove("hidden");
  }

  function nextQuestion(mode) {
    quizIndex += 1;
    if (mode === "listening") renderListeningQuestion();
    else renderQuizQuestion();
  }

  function renderReview() {
    const select = $("reviewTopicSelect");
    if (!select) return;
    select.innerHTML = "";
    const all = document.createElement("option");
    all.value = "__ALL__";
    all.textContent = "Topicランダムの総復習";
    select.appendChild(all);
    topics.forEach((topic) => {
      const opt = document.createElement("option");
      opt.value = topic;
      opt.textContent = topic;
      select.appendChild(opt);
    });
  }

  function getReviewItems() {
    const select = $("reviewTopicSelect");
    const value = select ? select.value : "__ALL__";
    currentTopic = value === "__ALL__" ? "" : value;
    setSeaBackground(currentTopic);
    return value === "__ALL__" ? vocab : getItemsByTopic(value);
  }

  function renderProgress() {
    const known = getKnownCount(vocab);
    const unsure = getUnsureCount(vocab);
    safeHTML("progressStats", `
      <div class="stat"><span>全体進捗</span><b>${percent(known, vocab.length)}%</b></div>
      <div class="stat"><span>総単語数</span><b>${vocab.length}</b></div>
      <div class="stat"><span>覚えた単語数</span><b>${known}</b></div>
      <div class="stat"><span>まだ不安な単語数</span><b>${unsure}</b></div>
      <div class="stat"><span>4択</span><b>${state.quiz.correct}/${state.quiz.total}</b><small>${accuracy(state.quiz)}%</small></div>
      <div class="stat"><span>Listening</span><b>${state.listening.correct}/${state.listening.total}</b><small>${accuracy(state.listening)}%</small></div>
    `);
    const html = topics.map((topic) => {
      const items = getItemsByTopic(topic);
      const k = getKnownCount(items);
      const u = getUnsureCount(items);
      return `
        <div class="progress-topic-card">
          <h3>${escapeHTML(topic)}</h3>
          <p>${items.length}語 / 覚えた ${k}語 / まだ不安 ${u}語</p>
          <div class="progress-bar"><div class="progress-fill" style="width:${percent(k, items.length)}%"></div></div>
        </div>
      `;
    }).join("");
    safeHTML("progressTopics", html);
  }

  function bindEvents() {
    const bind = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener("click", fn);
    };

    bind("homeBtn", () => { renderHome(); showScreen("homeScreen"); });
    bind("progressBtn", () => { renderProgress(); showScreen("progressScreen"); });
    bind("startTopicsBtn", () => { renderTopics(); showScreen("topicScreen"); });
    bind("startReviewBtn", () => { renderReview(); showScreen("reviewScreen"); });

    bind("navHome", () => { renderHome(); showScreen("homeScreen"); });
    bind("navTopics", () => { renderTopics(); showScreen("topicScreen"); });
    bind("navReview", () => { renderReview(); showScreen("reviewScreen"); });
    bind("navProgress", () => { renderProgress(); showScreen("progressScreen"); });

    bind("backToTopicsBtn", () => { renderTopics(); showScreen("topicScreen"); });
    bind("backFromFlashBtn", () => showScreen("modeScreen"));
    bind("backFromQuizBtn", () => currentTopic ? showScreen("modeScreen") : showScreen("reviewScreen"));
    bind("backFromListeningBtn", () => currentTopic ? showScreen("modeScreen") : showScreen("reviewScreen"));
    bind("backFromReviewBtn", () => { renderHome(); showScreen("homeScreen"); });

    bind("flashcardModeBtn", () => {
      isFlipped = false;
      currentItems = getItemsByTopic(currentTopic);
      currentIndex = 0;
      renderFlashcard();
      showScreen("flashcardScreen");
    });
    bind("quizModeBtn", () => startQuiz(getItemsByTopic(currentTopic), "quiz"));
    bind("listeningModeBtn", () => startQuiz(getItemsByTopic(currentTopic), "listening"));
    bind("topicReviewModeBtn", () => {
      renderReview();
      const select = $("reviewTopicSelect");
      if (select) select.value = currentTopic;
      showScreen("reviewScreen");
    });

    bind("flashcard", toggleCard);
    bind("flipCardBtn", toggleCard);
    bind("cardSpeakBtn", (e) => {
      e.stopPropagation();
      const item = currentItems[currentIndex];
      if (item) speakWord(item.word);
    });
    bind("prevCardBtn", () => {
      currentIndex = (currentIndex - 1 + currentItems.length) % currentItems.length;
      isFlipped = false;
      renderFlashcard();
    });
    bind("nextCardBtn", () => {
      currentIndex = (currentIndex + 1) % currentItems.length;
      isFlipped = false;
      renderFlashcard();
    });
    bind("markKnownBtn", () => markCard("known"));
    bind("markUnsureBtn", () => markCard("unsure"));

    bind("nextQuizBtn", () => nextQuestion("quiz"));
    bind("nextListeningBtn", () => nextQuestion("listening"));
    bind("replayListeningBtn", () => {
      if (quizCurrent) speakWord(quizCurrent.word);
    });
    bind("reviewQuizBtn", () => startQuiz(getReviewItems(), "quiz"));
    bind("reviewListeningBtn", () => startQuiz(getReviewItems(), "listening"));

    bind("resetProgressBtn", () => {
      if (!confirm("学習記録をすべてリセットしますか？")) return;
      state.known = {};
      state.unsure = {};
      state.quiz = { correct: 0, total: 0 };
      state.listening = { correct: 0, total: 0 };
      saveState();
      renderProgress();
      renderHome();
      setSensei(SENSEI.home);
    });

    const flash = $("flashcard");
    if (flash) {
      flash.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleCard();
        }
      });
    }
  }

  function normalizeItems(items) {
    return items.map((x, i) => ({
      id: Number.isFinite(Number(x.id)) ? Number(x.id) : i + 1,
      word: x.word == null ? "" : String(x.word),
      pos: x.pos == null ? "" : String(x.pos),
      meaning: x.meaning == null ? "" : String(x.meaning),
      derivatives: x.derivatives == null ? "" : String(x.derivatives),
      topic: x.topic == null || String(x.topic).trim() === "" ? "未分類" : String(x.topic),
      example: x.example == null ? "" : String(x.example),
      exampleJa: x.exampleJa == null ? "" : String(x.exampleJa)
    })).filter((x) => x.word && x.meaning);
  }

  async function loadVocabularyData() {
    let fetchError = null;
    try {
      const vocabUrl = new URL("vocabulary.json?v=fix2", window.location.href);
      const res = await fetch(vocabUrl.href, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json)) throw new Error("vocabulary.jsonの形式が配列ではありません。");
      return json;
    } catch (e) {
      fetchError = e;
    }

    // GitHub Pagesでは上のfetchで読み込みます。
    // ローカルでindex.htmlを直接開いた場合は、ブラウザ制限でfetchが失敗するため、
    // index.html内の埋め込みデータを安全な予備として読み込みます。
    try {
      const embedded = $("embeddedVocabulary");
      if (embedded && embedded.textContent.trim()) {
        const json = JSON.parse(embedded.textContent);
        if (Array.isArray(json)) return json;
      }
    } catch (e) {
      throw new Error("vocabulary.jsonの読み込みと埋め込み語彙データの読み込みに失敗しました。");
    }

    throw new Error((fetchError && fetchError.message) ? `vocabulary.jsonの読み込みに失敗しました: ${fetchError.message}。index.html / app.js / vocabulary.json が同じ階層にあるか、または古いapp.jsがキャッシュされていないか確認してください。` : "vocabulary.jsonの読み込みに失敗しました。");
  }

  async function init() {
    bindEvents();
    try {
      const json = await loadVocabularyData();
      if (!Array.isArray(json)) throw new Error("語彙データの形式が配列ではありません。");
      vocab = normalizeItems(json);
      if (!vocab.length) throw new Error("語彙データに有効な単語データがありません。");
      groupByTopic();
      renderHome();
      renderTopics();
      renderReview();
      clearError();
      showScreen("homeScreen");
    } catch (e) {
      showError(e.message || "語彙データの読み込みに失敗しました。");
    }
  }

  init();
});
