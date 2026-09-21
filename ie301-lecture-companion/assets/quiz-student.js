/* End-of-lesson quiz, student side.

   This page holds no questions. It renders whatever the instructor's deck has
   written into the session, and the correct answer only arrives at reveal, so
   a student reading the page source learns nothing they cannot already see.

   Answers are written once per question: the first tap is final, which is what
   makes "how long did you take" meaningful. The stored time is a Firebase
   server timestamp, so a phone with a wrong clock gains nothing. */
(() => {
  'use strict';
  const DB = (window.CLASSROOM_DB || '').replace(/\/$/, '');
  const params = new URLSearchParams(location.search);
  const code = (params.get('quiz') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const $ = id => document.getElementById(id);
  const stage = $('qz-stage');
  const connection = $('qz-connection');
  const escape = x => String(x ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
  const uuid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)),
    v => v.toString(16).padStart(2, '0')).join('');

  // Shared with the lesson page so a student who switches keeps one identity.
  const device = read('ie301-poll-device') || uuid();
  save('ie301-poll-device', device);

  const SHAPES = ['tri', 'dia', 'cir', ''];
  const historyKey = 'ie301-quiz-history:' + code;
  let meta = null, revision = -1, myName = read('classroom-name') || '';
  let answered = {};          // question index -> chosen option, this browser
  let history = {};           // question index -> {c, correct, id}
  let questionSeenAt = 0;     // local clock, only used to draw the countdown
  let sending = false, ticker = null;

  try { history = JSON.parse(read(historyKey) || '{}') || {}; } catch { history = {}; }
  try { answered = Object.fromEntries(Object.entries(history).map(([k, v]) => [k, v.c])); } catch { answered = {}; }

  function status(message, bad) {
    connection.textContent = message || '';
    connection.className = bad ? 'learning-error' : 'learning-muted';
  }

  async function request(path, method, value) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(DB + path + '.json', {
        method: method || 'GET', signal: controller.signal,
        headers: method === 'PUT' ? { 'Content-Type': 'application/json' } : {},
        ...(value === undefined ? {} : { body: JSON.stringify(value) })
      });
      if (!response.ok) throw new Error('database refused the request');
      return response.json();
    } finally { clearTimeout(timeout); }
  }

  const metaPath = () => '/sessions/' + code + '/quiz/meta';

  function tiles(question, interactive) {
    return '<div class="qz-tiles">' + question.options.map((text, i) =>
      '<button class="qz-tile" data-choice="' + i + '" aria-pressed="false"' +
      (interactive ? '' : ' disabled') + '>' +
      '<span class="qz-mark">' + String.fromCharCode(65 + i) + '</span>' +
      '<span class="qz-shape ' + SHAPES[i % 4] + '"></span>' +
      '<span>' + escape(text) + '</span></button>').join('') + '</div>';
  }

  function drawRing(secondsLeft, limitSeconds) {
    const ring = stage.querySelector('.qz-ring');
    if (!ring) return;
    const circumference = 2 * Math.PI * 24;
    const gone = Math.min(1, Math.max(0, (limitSeconds - secondsLeft) / limitSeconds));
    ring.querySelector('.fg').style.strokeDashoffset = (circumference * gone).toFixed(1);
    ring.querySelector('b').textContent = Math.max(0, Math.ceil(secondsLeft));
    ring.classList.toggle('low', secondsLeft <= 5);
  }

  function startTicker(limitSeconds) {
    clearInterval(ticker);
    const paint = () => {
      const left = limitSeconds - (Date.now() - questionSeenAt) / 1000;
      drawRing(left, limitSeconds);
      if (left <= 0) clearInterval(ticker);
    };
    paint();
    ticker = setInterval(paint, 250);
  }

  async function submit(choice) {
    if (sending || answered[meta.index] !== undefined) return;
    sending = true;
    render();
    try {
      await request('/sessions/' + code + '/quiz/rounds/' + meta.index + '/answers/' + device,
        'PUT', { c: choice, at: { '.sv': 'timestamp' } });
      answered[meta.index] = choice;
      history[meta.index] = { c: choice, id: meta.q && meta.q.id };
      save(historyKey, JSON.stringify(history));
      status('Answer sent. You cannot change it.');
    } catch {
      status('Could not send that answer. Tap again.', true);
    } finally {
      sending = false;
      render();
    }
  }

  async function saveName(name) {
    myName = name;
    save('classroom-name', name);
    if (!name) return;
    await request('/sessions/' + code + '/quiz/players/' + device, 'PUT', { n: name });
  }

  function joinScreen() {
    const blocked = stage.dataset.blocked === '1';
    stage.innerHTML =
      '<p class="qz-eyebrow">Before we start</p>' +
      '<p>A name puts you on the class leaderboard. You can skip it and still play.</p>' +
      '<input class="learning-input" id="qz-name" maxlength="18" placeholder="your name" ' +
      'autocomplete="name" enterkeyhint="done" value="' + escape(myName) + '">' +
      (blocked ? '<p class="learning-error">Pick a different name.</p>' : '') +
      '<div class="learning-actions"><button class="primary" id="qz-ready">I’m ready</button>' +
      '<button id="qz-skip">Play without a name</button></div>' +
      '<p class="learning-muted">Waiting for your instructor to start question 1…</p>';
    const field = $('qz-name');
    const ready = async () => {
      const name = field.value.trim();
      if (name && !window.NAME_FILTER.check(name).ok) {
        stage.dataset.blocked = '1';
        joinScreen();
        return;
      }
      stage.dataset.blocked = '0';
      await saveName(name);
      status(name ? 'You are in as ' + name + '.' : 'You are in.');
      stage.innerHTML = '<h2>You’re in' + (name ? ', ' + escape(name) : '') + '.</h2>' +
        '<p>Keep this page open. Question 1 appears here when your instructor starts it.</p>';
    };
    $('qz-ready').onclick = ready;
    $('qz-skip').onclick = async () => { field.value = ''; await ready(); };
    field.onkeydown = e => { if (e.key === 'Enter') ready(); };
  }

  function questionScreen() {
    const question = meta.q;
    const mine = answered[meta.index];
    const limit = Math.round((meta.limitMs || 25000) / 1000);
    stage.innerHTML =
      '<div class="qz-timer"><div class="qz-ring"><svg width="56" height="56" aria-hidden="true">' +
      '<circle class="bg" cx="28" cy="28" r="24"></circle>' +
      '<circle class="fg" cx="28" cy="28" r="24" stroke-dasharray="150.8" stroke-dashoffset="0"></circle>' +
      '</svg><b>' + limit + '</b></div><div class="qz-status">' +
      (mine === undefined ? 'Answer fast.<br>Earlier is better.' : 'Answer sent.<br>You cannot change it.') +
      '</div></div>' +
      '<p class="qz-eyebrow">Question ' + (meta.index + 1) + ' of ' + meta.total + '</p>' +
      '<p class="qz-prompt">' + escape(question.prompt) + '</p>' +
      tiles(question, mine === undefined && !sending);
    if (mine !== undefined) {
      const chosen = stage.querySelector('[data-choice="' + mine + '"]');
      if (chosen) chosen.setAttribute('aria-pressed', 'true');
    } else {
      stage.querySelectorAll('[data-choice]').forEach(button => {
        button.onclick = () => submit(Number(button.dataset.choice));
      });
    }
    startTicker(limit);
  }

  function lockedScreen() {
    const mine = answered[meta.index];
    stage.innerHTML = '<h2>Time is up.</h2>' +
      '<p>' + (mine === undefined ? 'No answer was recorded from this phone.'
        : 'Your answer is in. Look at the projector.') + '</p>' +
      '<p class="learning-muted">Waiting for the answer to be revealed…</p>';
  }

  function revealScreen() {
    const mine = answered[meta.index];
    const right = mine !== undefined && mine === meta.answer;
    if (history[meta.index]) {
      history[meta.index].correct = right;
      save(historyKey, JSON.stringify(history));
    }
    const standing = (meta.standings || {})[device];
    stage.innerHTML =
      '<div class="qz-verdict ' + (right ? 'ok' : 'no') + '">' +
      '<div class="qz-big">' + (right ? 'Correct' : mine === undefined ? 'No answer' : 'Not this time') + '</div>' +
      (standing ? '<div class="qz-lead">' + standing.c + '/' + (meta.index + 1) + '</div>' +
        '<small>correct so far · ' + clock(standing.t) + ' total answering time</small>' : '') +
      '</div>' +
      '<p><b>' + String.fromCharCode(65 + meta.answer) + '.</b> ' +
      escape(meta.q.options[meta.answer]) + '</p>' +
      '<p class="learning-muted">Waiting for the next question…</p>';
  }

  function clock(ms) {
    const total = Math.round((ms || 0) / 1000);
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function boardScreen() {
    const standing = (meta.standings || {})[device];
    const rows = (meta.board || []).map((entry, i) =>
      '<div class="qz-row' + (i === 0 ? ' lead' : '') + (entry.d === device ? ' you' : '') + '">' +
      '<span class="qz-rank">' + (i + 1) + '</span><span>' + escape(entry.n) + '</span>' +
      '<span class="qz-score">' + entry.c + '/' + (meta.index + 1) + '</span>' +
      '<span class="qz-clock">' + clock(entry.t) + '</span></div>').join('');
    stage.innerHTML = '<p class="qz-eyebrow">After question ' + (meta.index + 1) + ' of ' + meta.total + '</p>' +
      '<div class="qz-board">' + (rows || '<p>No names yet.</p>') + '</div>' +
      (standing ? '<p class="qz-note">You: ' + standing.c + ' correct in ' + clock(standing.t) +
        (standing.r ? ' · place ' + standing.r : '') + '</p>' : '') +
      '<p class="learning-muted">Waiting for the next question…</p>';
  }

  function finalScreen() {
    const standing = (meta.standings || {})[device];
    const items = [];
    for (let i = 0; i < meta.total; i++) {
      const entry = history[i];
      const mark = !entry ? '<span class="w">✗</span> no answer'
        : entry.correct ? '<span class="r">✓</span> correct'
          : '<span class="w">✗</span> wrong';
      items.push('<li>' + mark + '</li>');
    }
    stage.innerHTML =
      (standing ? '<div class="qz-verdict ok"><div class="qz-big">' +
        (standing.r ? 'Place ' + standing.r : 'Finished') + '</div>' +
        '<div class="qz-lead">' + standing.c + '/' + meta.total + '</div>' +
        '<small>correct · ' + clock(standing.t) + ' total answering time</small></div>'
        : '<h2>Quiz finished.</h2>') +
      '<ol class="qz-wrap">' + items.join('') + '</ol>' +
      '<p class="learning-muted">Thanks for playing. You can close this page.</p>';
  }

  function render() {
    if (!meta) return;
    const phase = meta.phase;
    if (phase === 'join') { if (!stage.dataset.joined) joinScreen(); return; }
    stage.dataset.joined = '1';
    if (phase === 'question') questionScreen();
    else if (phase === 'locked') lockedScreen();
    else if (phase === 'revealed') revealScreen();
    else if (phase === 'board') boardScreen();
    else if (phase === 'final') finalScreen();
    else if (phase === 'ended') {
      stage.innerHTML = '<h2>This quiz has ended.</h2><p>See you next week.</p>';
    }
  }

  async function poll() {
    try {
      const next = await request(metaPath());
      if (!next || next.version !== 1) {
        status('That quiz code is not in use. Check the code on the screen.', true);
        return;
      }
      const changed = next.revision !== revision;
      const newQuestion = !meta || next.index !== meta.index || next.phase !== meta.phase;
      if (next.phase === 'question' && (!meta || meta.index !== next.index || meta.phase !== 'question')) {
        questionSeenAt = Date.now();
      }
      meta = next;
      revision = next.revision;
      if (changed || newQuestion) { status(''); render(); }
    } catch {
      status('Cannot reach the classroom. Your sent answers are safe.', true);
    }
  }

  if (!DB) {
    status('Live quizzes are not configured on this site.', true);
  } else if (!/^[A-Z0-9]{4,8}$/.test(code)) {
    stage.innerHTML = '<h2>Scan your instructor’s quiz code.</h2>' +
      '<p>This page needs the code shown on the lecture screen.</p>';
  } else {
    $('qz-sub').textContent = 'Quiz ' + code + ' · answer on this phone';
    stage.innerHTML = '<p>Connecting…</p>';
    poll();
    setInterval(poll, 1500);
  }
})();
