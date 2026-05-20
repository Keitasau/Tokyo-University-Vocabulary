'use strict';

// ============================================================
// STATE
// ============================================================
const State = {
  vocab: [],
  progress: {}, // word -> { seen, correct, wrong, mastered }
  sessions: {}, // day -> { fc: bool, quiz: bool, listening: bool }
  weakWords: new Set(),
  currentScreen: 'screen-home',
};

const STORAGE_KEY = 'avn_v1';
const TOTAL = 254;

const TOPIC_META = {
  'Perception Sea':    { emoji: '🧠', color: '#29b6f6' },
  'Language Reef':     { emoji: '🗣️', color: '#66bb6a' },
  'Deep Digital Sea':  { emoji: '🤖', color: '#7e57c2' },
  'Society Ocean':     { emoji: '🏛️', color: '#ef5350' },
  'Evolution Abyss':   { emoji: '🧬', color: '#26c6da' },
  'Mangrove Bay':      { emoji: '🌿', color: '#8d6e63' },
};

const SHARK_CORRECT = [
  "Great Dive! 🦈", "Concept Found!", "Excellent!", "Ocean Brain Activated!",
  "That's the way! 🌊", "Splash! Perfect!", "Deep Knowledge!", "Surfing Smart!",
];
const SHARK_WRONG = [
  "Keep swimming! 🦈", "Almost there...", "Next wave~", "Don't give up!",
  "You'll get it! 💪", "Keep going!", "One more dive!",
];
const SHARK_HOME = [
  "Let's dive deep into vocabulary!", "Ready for today's session?",
  "254 words await! 🌊", "The ocean of knowledge awaits!",
  "Swim through the words today!", "Let's explore the deep!",
];

// ============================================================
// PERSISTENCE
// ============================================================
function saveState() {
  try {
    const data = {
      progress: State.progress,
      sessions: State.sessions,
      weakWords: [...State.weakWords],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) { /* ignore */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.progress) State.progress = data.progress;
    if (data.sessions) State.sessions = data.sessions;
    if (data.weakWords) State.weakWords = new Set(data.weakWords);
  } catch(e) { State.progress = {}; State.sessions = {}; State.weakWords = new Set(); }
}

// ============================================================
// APP INIT
// ============================================================
const App = {
  sessionWords: [],
  sessionMode: 'flashcard', // flashcard | quiz | listening
  sessionIndex: 0,
  sessionCorrect: 0,
  sessionSource: 'day', // day | topic | weak | random
  sessionTopic: null,
  sessionDay: null,
  quizTimer: null,
  quizTimerLeft: 10,
  quizCurrentWord: null,
  quizChoices: [],
  quizAnswered: false,
  fcFlipped: false,

  async init() {
    loadState();
    try {
      const res = await fetch('vocabulary.json');
      State.vocab = await res.json();
    } catch(e) {
      console.error('Failed to load vocabulary.json', e);
      State.vocab = [];
    }
    this.spawnBubbles();
    this.updateHeader();
    this.renderHome();
    this.renderTopics();
    this.renderReview();
    this.showScreen('screen-home');
  },

  // ---- SCREEN NAV ----
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) { el.classList.add('active'); State.currentScreen = id; }
    window.scrollTo(0,0);
  },

  // ---- BUBBLES ----
  spawnBubbles() {
    const container = document.getElementById('bubbles');
    if (!container) return;
    for (let i = 0; i < 18; i++) {
      const b = document.createElement('div');
      b.className = 'bubble';
      const size = 8 + Math.random() * 20;
      b.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}%;
        bottom:-${size}px;
        animation-duration:${8+Math.random()*12}s;
        animation-delay:-${Math.random()*20}s;
      `;
      container.appendChild(b);
    }
  },

  // ---- HEADER STATS ----
  updateHeader() {
    const seen = Object.values(State.progress).filter(p => p.seen).length;
    const mastered = Object.values(State.progress).filter(p => p.mastered).length;
    const weak = State.weakWords.size;
    const exploredPct = Math.round(seen / TOTAL * 100);

    const elExp = document.getElementById('stat-explored');
    const elMas = document.getElementById('stat-mastered');
    const elWk = document.getElementById('stat-weak');
    if (elExp) elExp.textContent = exploredPct + '%';
    if (elMas) elMas.textContent = mastered + '/' + TOTAL;
    if (elWk) elWk.textContent = '⚑' + weak;
  },

  // ---- HOME ----
  renderHome() {
    // Shark greeting
    const greet = document.getElementById('shark-greeting');
    if (greet) greet.textContent = SHARK_HOME[Math.floor(Math.random() * SHARK_HOME.length)];

    // Days
    const dayScroll = document.getElementById('day-scroll');
    if (!dayScroll) return;
    dayScroll.innerHTML = '';
    const todayDay = this.getTodayDay();
    for (let d = 1; d <= 30; d++) {
      const pill = document.createElement('div');
      pill.className = 'day-pill';
      if (d === todayDay) pill.classList.add('today');
      else if (this.isDayClear(d)) pill.classList.add('clear');
      else if (this.isDayPartial(d)) pill.classList.add('partial');

      const status = d === todayDay ? '📍' : this.isDayClear(d) ? '✅' : '○';
      pill.innerHTML = `<span class="day-num">Day ${d}</span><span class="day-status">${status}</span>`;
      pill.onclick = () => this.startDaySession(d);
      dayScroll.appendChild(pill);
    }
    // Scroll to today
    const todayEl = dayScroll.children[todayDay - 1];
    if (todayEl) setTimeout(() => todayEl.scrollIntoView({behavior:'smooth', inline:'center'}), 300);

    // Progress bar
    const mastered = Object.values(State.progress).filter(p => p.mastered).length;
    const pct = Math.round(mastered / TOTAL * 100);
    const bar = document.getElementById('total-progress-bar');
    const pctEl = document.getElementById('total-progress-pct');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  },

  getTodayDay() {
    // Calculate based on first usage or just use 1 for demo
    try {
      let firstDate = localStorage.getItem('avn_start');
      if (!firstDate) {
        firstDate = new Date().toDateString();
        localStorage.setItem('avn_start', firstDate);
      }
      const start = new Date(firstDate);
      const now = new Date();
      const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      return Math.min(30, Math.max(1, diff + 1));
    } catch(e) { return 1; }
  },

  isDayClear(day) {
    const s = State.sessions[day];
    return s && s.listening;
  },

  isDayPartial(day) {
    const s = State.sessions[day];
    return s && (s.fc || s.quiz);
  },

  // ---- TOPICS ----
  renderTopics() {
    const grid = document.getElementById('topic-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const topics = [...new Set(State.vocab.map(v => v.topic))];
    topics.forEach(topic => {
      const words = State.vocab.filter(v => v.topic === topic);
      const seen = words.filter(w => State.progress[w.word]?.seen).length;
      const pct = words.length ? Math.round(seen / words.length * 100) : 0;
      const meta = TOPIC_META[topic] || { emoji: '🌊', color: '#29b6f6' };
      const card = document.createElement('div');
      card.className = 'topic-card';
      card.innerHTML = `
        <div class="topic-emoji">${meta.emoji}</div>
        <div class="topic-name">${topic}</div>
        <div class="topic-name-jp">${words[0]?.topicJp || ''}</div>
        <div class="topic-count">${words.length}語</div>
        <div class="topic-mini-bar"><div class="topic-mini-fill" style="width:${pct}%;background:${meta.color}"></div></div>
      `;
      card.onclick = () => this.startTopicSession(topic);
      grid.appendChild(card);
    });
  },

  // ---- REVIEW ----
  renderReview() {
    const weakCount = document.getElementById('weak-count');
    if (weakCount) weakCount.textContent = State.weakWords.size + '語';

    const list = document.getElementById('topic-review-list');
    if (!list) return;
    list.innerHTML = '';
    const topics = [...new Set(State.vocab.map(v => v.topic))];
    topics.forEach(topic => {
      const words = State.vocab.filter(v => v.topic === topic);
      const meta = TOPIC_META[topic] || { emoji: '🌊', color: '#29b6f6' };
      const btn = document.createElement('button');
      btn.className = 'review-btn';
      btn.innerHTML = `
        <span class="r-icon">${meta.emoji}</span>
        <span class="r-label">${topic}</span>
        <span class="r-count">${words.length}語</span>
      `;
      btn.onclick = () => { this.startTopicSession(topic); };
      list.appendChild(btn);
    });
  },

  // ---- SESSIONS ----
  startTodaySession() {
    const day = this.getTodayDay();
    this.startDaySession(day);
  },

  startDaySession(day) {
    const words = State.vocab.filter(v => v.day === day);
    if (!words.length) { this.showShark("今日の単語が見つかりません。"); return; }
    this.sessionSource = 'day';
    this.sessionDay = day;
    this.sessionWords = this.shuffleArr([...words]);
    this.startPhase('flashcard');
  },

  startTopicSession(topic) {
    document.body.setAttribute('data-topic', topic);
    const words = State.vocab.filter(v => v.topic === topic);
    this.sessionSource = 'topic';
    this.sessionTopic = topic;
    this.sessionWords = this.shuffleArr([...words]);
    this.startPhase('flashcard');
    this.showScreen('screen-flashcard');
  },

  startReview(mode) {
    let words = [];
    if (mode === 'weak') {
      words = State.vocab.filter(v => State.weakWords.has(v.word));
      if (!words.length) { this.showShark("Weak Wordsがありません！素晴らしい！🎉"); return; }
    } else if (mode === 'random') {
      words = this.shuffleArr([...State.vocab]).slice(0, 30);
    }
    this.sessionSource = mode;
    this.sessionWords = this.shuffleArr(words);
    this.startPhase('quiz');
  },

  startPhase(phase) {
    this.sessionMode = phase;
    this.sessionIndex = 0;
    this.sessionCorrect = 0;

    if (phase === 'flashcard') {
      this.setupFlashcard();
      this.showScreen('screen-flashcard');
    } else if (phase === 'quiz') {
      this.setupQuiz();
      this.showScreen('screen-quiz');
    } else if (phase === 'listening') {
      this.sessionMode = 'listening';
      this.setupQuiz();
      this.showScreen('screen-quiz');
    }
  },

  // ---- FLASHCARD ----
  setupFlashcard() {
    const backBtn = document.getElementById('fc-back-btn');
    if (backBtn) backBtn.onclick = () => { this.clearQuizTimer(); this.showScreen('screen-home'); };
    this.renderFlashcard();
  },

  renderFlashcard() {
    const w = this.sessionWords[this.sessionIndex];
    if (!w) { this.advancePhase(); return; }

    // Mark as seen
    if (!State.progress[w.word]) State.progress[w.word] = { seen: false, correct: 0, wrong: 0, mastered: false };
    State.progress[w.word].seen = true;
    saveState();
    this.updateHeader();

    // Topic bg
    document.body.setAttribute('data-topic', w.topic);

    const fc = document.getElementById('flashcard');
    if (fc) fc.classList.remove('flipped');
    this.fcFlipped = false;

    this.setText('card-pos', w.pos);
    this.setText('card-word', w.word);
    this.setText('card-meaning', w.meaning);
    this.setText('card-example', '📖 ' + w.example);
    this.setText('card-translation', '　' + w.translation);
    this.setText('card-etymology', w.etymology ? '🔤 ' + w.etymology : '');
    const deriv = w.derivatives && w.derivatives.length
      ? '🔗 ' + w.derivatives.join('  /  ')
      : '';
    this.setText('card-derivatives', deriv);
    this.setText('fc-progress', `${this.sessionIndex + 1} / ${this.sessionWords.length}`);
    this.setText('fc-topic-label', w.topic);
  },

  flipCard() {
    const fc = document.getElementById('flashcard');
    if (!fc) return;
    this.fcFlipped = !this.fcFlipped;
    fc.classList.toggle('flipped', this.fcFlipped);
  },

  fcNext() {
    if (this.sessionIndex < this.sessionWords.length - 1) {
      this.sessionIndex++;
      this.renderFlashcard();
    } else {
      this.advancePhase();
    }
  },

  fcPrev() {
    if (this.sessionIndex > 0) {
      this.sessionIndex--;
      this.renderFlashcard();
    }
  },

  fcKnew() {
    const w = this.sessionWords[this.sessionIndex];
    if (w) {
      if (!State.progress[w.word]) State.progress[w.word] = { seen: true, correct: 0, wrong: 0, mastered: false };
      State.progress[w.word].correct++;
      State.weakWords.delete(w.word);
      saveState();
    }
    this.fcNext();
  },

  fcSkip() { this.fcNext(); },

  // ---- PHASE ADVANCEMENT ----
  advancePhase() {
    if (this.sessionMode === 'flashcard') {
      // Mark FC done
      if (this.sessionDay && this.sessionSource === 'day') {
        if (!State.sessions[this.sessionDay]) State.sessions[this.sessionDay] = {};
        State.sessions[this.sessionDay].fc = true;
        saveState();
      }
      this.sessionIndex = 0;
      this.startPhase('quiz');
    } else if (this.sessionMode === 'quiz') {
      if (this.sessionDay && this.sessionSource === 'day') {
        if (!State.sessions[this.sessionDay]) State.sessions[this.sessionDay] = {};
        State.sessions[this.sessionDay].quiz = true;
        saveState();
      }
      this.sessionIndex = 0;
      this.startPhase('listening');
    } else {
      // Done
      if (this.sessionDay && this.sessionSource === 'day') {
        if (!State.sessions[this.sessionDay]) State.sessions[this.sessionDay] = {};
        State.sessions[this.sessionDay].listening = true;
        saveState();
      }
      this.showResults();
    }
  },

  // ---- QUIZ ----
  setupQuiz() {
    const backBtn = document.getElementById('quiz-back-btn');
    if (backBtn) backBtn.onclick = () => { this.clearQuizTimer(); this.showScreen('screen-home'); };
    const modeLabel = document.getElementById('quiz-mode-label');
    if (modeLabel) modeLabel.textContent = this.sessionMode === 'listening' ? '🔊 Listening' : '英→日';
    const listenBtn = document.getElementById('quiz-listen-btn');
    if (listenBtn) listenBtn.style.display = this.sessionMode === 'listening' ? 'flex' : 'none';
    this.renderQuiz();
  },

  renderQuiz() {
    this.clearQuizTimer();
    const feedback = document.getElementById('quiz-feedback');
    if (feedback) feedback.style.display = 'none';

    const w = this.sessionWords[this.sessionIndex];
    if (!w) { this.advancePhase(); return; }
    this.quizCurrentWord = w;
    this.quizAnswered = false;

    this.setText('quiz-word', this.sessionMode === 'listening' ? '🔊 ??　??' : w.word);
    this.setText('quiz-progress', `${this.sessionIndex + 1}/${this.sessionWords.length}`);

    // Generate choices
    const correct = w.meaning;
    const distractors = this.getDistractors(w, 3);
    const all = this.shuffleArr([correct, ...distractors]);
    this.quizChoices = all;

    const choicesEl = document.getElementById('quiz-choices');
    if (!choicesEl) return;
    choicesEl.innerHTML = '';
    all.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.innerHTML = `<span class="choice-num">${i+1}</span><span>${choice}</span>`;
      btn.onclick = () => this.selectChoice(choice, btn);
      choicesEl.appendChild(btn);
    });

    // Timer
    this.quizTimerLeft = 10;
    this.updateTimerUI(10);
    this.quizTimer = setInterval(() => {
      this.quizTimerLeft--;
      this.updateTimerUI(this.quizTimerLeft);
      if (this.quizTimerLeft <= 0) {
        this.clearQuizTimer();
        if (!this.quizAnswered) this.selectChoice(null, null);
      }
    }, 1000);

    // Auto-play speech for listening mode
    if (this.sessionMode === 'listening') {
      setTimeout(() => this.speak(w.word), 500);
    }
  },

  updateTimerUI(t) {
    const bar = document.getElementById('quiz-timer-bar');
    const text = document.getElementById('quiz-timer-text');
    if (bar) bar.style.setProperty('--timer-pct', (t / 10 * 100) + '%');
    if (text) text.textContent = t;
  },

  clearQuizTimer() {
    if (this.quizTimer) { clearInterval(this.quizTimer); this.quizTimer = null; }
  },

  selectChoice(choice, btn) {
    if (this.quizAnswered) return;
    this.quizAnswered = true;
    this.clearQuizTimer();
    const w = this.quizCurrentWord;
    const correct = w.meaning;
    const isCorrect = choice === correct;

    // Update progress
    if (!State.progress[w.word]) State.progress[w.word] = { seen: true, correct: 0, wrong: 0, mastered: false };
    if (isCorrect) {
      State.progress[w.word].correct++;
      State.weakWords.delete(w.word);
      if (State.progress[w.word].correct >= 3) State.progress[w.word].mastered = true;
      this.sessionCorrect++;
      this.playCelebration();
    } else {
      State.progress[w.word].wrong++;
      State.weakWords.add(w.word);
    }
    saveState();
    this.updateHeader();

    // Reveal listening word
    if (this.sessionMode === 'listening') {
      const qw = document.getElementById('quiz-word');
      if (qw) qw.textContent = w.word;
    }

    // Highlight choices
    document.querySelectorAll('.choice-btn').forEach(b => {
      b.classList.add('disabled');
      const txt = b.querySelector('span:last-child')?.textContent;
      if (txt === correct) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });

    // Feedback
    const feedback = document.getElementById('quiz-feedback');
    const icon = document.getElementById('feedback-icon');
    const msg = document.getElementById('feedback-msg');
    const correctEl = document.getElementById('feedback-correct');
    if (feedback) feedback.style.display = 'block';
    if (icon) icon.textContent = isCorrect ? '🎉' : '😅';
    if (msg) msg.textContent = isCorrect
      ? SHARK_CORRECT[Math.floor(Math.random() * SHARK_CORRECT.length)]
      : SHARK_WRONG[Math.floor(Math.random() * SHARK_WRONG.length)];
    if (correctEl) correctEl.textContent = isCorrect ? '' : `正解: ${correct}`;

    // Auto advance after 2s
    setTimeout(() => this.nextQuiz(), 2000);
  },

  nextQuiz() {
    if (this.sessionIndex < this.sessionWords.length - 1) {
      this.sessionIndex++;
      this.renderQuiz();
    } else {
      this.advancePhase();
    }
  },

  getDistractors(word, count) {
    const topic = word.topic;
    // Prefer same topic but not same meaning
    let pool = State.vocab.filter(v =>
      v.word !== word.word &&
      v.meaning !== word.meaning &&
      !this.meaningsAreSimilar(v.meaning, word.meaning)
    );
    // Shuffle and take
    pool = this.shuffleArr(pool);
    return pool.slice(0, count).map(v => v.meaning);
  },

  meaningsAreSimilar(a, b) {
    // Basic check: shared kanji or short edit distance
    const ka = a.replace(/[；・]/g, '').slice(0, 4);
    const kb = b.replace(/[；・]/g, '').slice(0, 4);
    return ka === kb;
  },

  playCurrentWord() {
    if (this.quizCurrentWord) this.speak(this.quizCurrentWord.word);
  },

  speak(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-US';
      utt.rate = 0.85;
      window.speechSynthesis.speak(utt);
    } catch(e) { /* ignore */ }
  },

  // ---- CELEBRATION ----
  playCelebration() {
    const container = document.getElementById('celebration');
    if (!container) return;
    const colors = ['#ffd54f','#29b6f6','#4dd0e1','#ff6b6b','#81c784'];
    for (let i = 0; i < 20; i++) {
      const spark = document.createElement('div');
      spark.className = 'spark';
      const x = 30 + Math.random() * 40;
      const dy = -(80 + Math.random() * 200);
      const dx = -80 + Math.random() * 160;
      spark.style.cssText = `
        left:${x}%; top:60%;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        --dx:${dx}px; --dy:${dy}px;
        animation-duration:${0.6 + Math.random()*0.6}s;
        animation-delay:${Math.random()*0.3}s;
        width:${4+Math.random()*8}px; height:${4+Math.random()*8}px;
      `;
      container.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove());
    }
    // Play tone
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523, 659, 784];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i*0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.1 + 0.3);
        osc.start(ctx.currentTime + i*0.1);
        osc.stop(ctx.currentTime + i*0.1 + 0.35);
      });
    } catch(e) { /* ignore */ }
  },

  // ---- RESULTS ----
  showResults() {
    const total = this.sessionWords.length;
    const correct = this.sessionCorrect;
    const pct = total ? Math.round(correct / total * 100) : 0;

    this.setText('results-score', `${correct} / ${total}`);
    this.setText('results-title', pct >= 80 ? 'Excellent Dive! 🌊' : pct >= 50 ? 'Good Progress!' : 'Keep Swimming!');

    const comments = pct >= 90
      ? "Perfect! You're a vocabulary shark! 🦈"
      : pct >= 70
      ? "Great work! The ocean is yours! 🌊"
      : pct >= 50
      ? "Keep diving deeper! 💪"
      : "Every mistake makes you stronger! 🦈";
    this.setText('results-comment', comments);

    const statsEl = document.getElementById('results-stats');
    if (statsEl) {
      const mastered = Object.values(State.progress).filter(p => p.mastered).length;
      const weak = State.weakWords.size;
      statsEl.innerHTML = `
        <div class="r-stat"><div class="r-stat-num">${pct}%</div><div class="r-stat-label">正答率</div></div>
        <div class="r-stat"><div class="r-stat-num">${mastered}</div><div class="r-stat-label">習得済み</div></div>
        <div class="r-stat"><div class="r-stat-num">${weak}</div><div class="r-stat-label">Weak Words</div></div>
        <div class="r-stat"><div class="r-stat-num">${total}</div><div class="r-stat-label">学習語数</div></div>
      `;
    }

    if (pct >= 80) this.playCelebration();
    this.renderHome();
    this.renderTopics();
    this.renderReview();
    this.showScreen('screen-results');
  },

  goHome() {
    this.showScreen('screen-home');
  },

  retryWeak() {
    if (!State.weakWords.size) { this.showShark("Weak Wordsがありません！ 🎉"); return; }
    this.showScreen('screen-review');
    this.startReview('weak');
  },

  // ---- SHARK OVERLAY ----
  showShark(msg) {
    const overlay = document.getElementById('shark-overlay');
    const msgEl = document.getElementById('shark-overlay-msg');
    if (!overlay || !msgEl) return;
    msgEl.textContent = msg;
    overlay.style.display = 'flex';
  },

  closeShark() {
    const overlay = document.getElementById('shark-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  // ---- UTILITIES ----
  shuffleArr(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '';
  },
};

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => App.init());
