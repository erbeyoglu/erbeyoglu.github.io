/* Anonymous self-study counts.

   What it records, per browser per day:
     - pages: which companion pages were opened, how many times, and how long
       each stayed visible on screen, by hour;
     - answers: for the pre-class warm-up, which option was chosen first and
       whether it was right;
     - events: how often, and in which hour, a fixed set of actions happened —
       copying the AI tutor prompt, opening an AI app from the tutor page,
       working through a guided activity (checks, hints, worked steps, the
       changed assumption, downloads), and touching an interactive tool on a
       week page.
   No name, no account, no IP address handled here, and never any text the
   student typed: a count of "checked a step" is sent, the step's answer is not.

   What it deliberately does not record:
     - anything during class. Pages opened through a lesson or quiz QR, and the
       instructor's own deck views, are already covered by the class sessions
       and are skipped outright, so nothing is counted twice;
     - local copies. A page opened from a file or from localhost never pings,
       which keeps the instructor's deck and previews out.

   There is no off switch, by the owner's decision: a switch on every page
   would be pressed for no reason and leave gaps in exactly the numbers the
   course is judged by. Every page says, in its footer, what is counted.

   The identifier is a random value made here, under its own key. It is never
   the classroom device id: that one sits next to the name a student types in
   the end-of-lesson quiz, and reusing it would let the two tables be joined.

   Other scripts report an action by raising
     document.dispatchEvent(new CustomEvent('ie301:usage', { detail: { event, max } }))
   with an event name from the fixed families below; anything else is ignored.

   Writes go to /usage/v1/<date>/<id> in the course database. Until the
   database rules allow that branch, the writes are refused and nothing
   happens; the page is never affected either way. */
(() => {
  'use strict';
  const DB = (window.CLASSROOM_DB || '').replace(/\/$/, '');
  const ID_KEY = 'ie301-usage-id';
  const DAY_PREFIX = 'ie301-usage:';
  const SEEN_KEY = 'ie301-usage-seen';
  const FLUSH_MS = 60000;
  const DAILY_CAP_S = 4 * 3600;       // one page left on screen all day stops counting at four hours
  const params = new URLSearchParams(location.search);

  const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };

  // ---------- where we are, and whether to count at all ----------
  const IN_CLASS = ['class', 'session', 'quiz', 'embed', 'host', 'deck', 'view', 'lesson'];
  const localPage = location.protocol === 'file:' ||
    (['localhost', '127.0.0.1', '::1'].includes(location.hostname) && read('ie301-usage-local') !== '1');
  const WEEK = /^week(0[1-9]|1[0-4])$/;
  const SLUG = /^[a-z0-9-]{2,24}$/;
  // The event families other scripts may report. The database rules hold the
  // same shape, so a malformed name is refused there too.
  const EVENT = /^(tutor:[a-z-]{2,20}|guided:[a-z0-9-]{2,24}:[a-z-]{2,12}|tool:week(0[1-9]|1[0-4]):[a-z0-9-]{2,24})$/;

  function pageKey() {
    const file = location.pathname.split('/').pop() || '';
    const week = params.get('week');
    const activity = params.get('activity');
    if (file === 'ie301-lecture-companion.html') return 'home';
    const w = file.match(/^(week\d\d)\.html$/);
    if (w) return (params.get('tools') ? 'tools:' : '') + w[1];
    if (file === 'polls.html' && WEEK.test(week || '')) return 'practice:' + week;
    if (file === 'guided.html') return SLUG.test(activity || '') ? 'guided:' + activity : WEEK.test(week || '') ? 'guided:' + week : 'guided';
    if (file === 'aitutor.html') return 'aitutor';
    return null;
  }

  const page = pageKey();
  const counting = () => !!DB && !!page && !localPage && !IN_CLASS.some(k => params.has(k));

  // ---------- the notice ----------
  function notice() {
    const footer = document.querySelector('footer.site');
    if (!footer || !page || IN_CLASS.some(k => params.has(k))) return;
    const line = document.createElement('div');
    line.className = 'usage-notice';
    line.style.cssText = 'margin-top:6px;font-size:.82em;opacity:.8';
    line.textContent = 'This site counts visits and the use of its tools anonymously, so your instructor can see which material helps — no names, no accounts, nothing you type.';
    footer.appendChild(line);
  }

  // ---------- the day's record, kept in this browser and sent whole ----------
  const hourFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', hour12: false });
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = () => dayFormat.format(new Date());
  const hour = () => hourFormat.format(new Date()).padStart(2, '0').slice(-2);

  function usageId() {
    let id = read(ID_KEY);
    if (!/^[0-9a-f]{24}$/.test(id || '')) {
      id = Array.from(crypto.getRandomValues(new Uint8Array(12)), v => v.toString(16).padStart(2, '0')).join('');
      if (!write(ID_KEY, id)) return null;       // no storage, no stable id: count nothing
    }
    return id;
  }

  function load(date) {
    let record;
    try { record = JSON.parse(read(DAY_PREFIX + date)); } catch { record = null; }
    record = record || {};
    return { pages: record.pages || {}, answers: record.answers || {}, events: record.events || {} };
  }
  function save(date, record) { write(DAY_PREFIX + date, JSON.stringify(record)); }

  function send(date, record) {
    const id = usageId();
    if (!id || !counting()) return;
    const body = JSON.stringify({ pages: record.pages, answers: record.answers, events: record.events });
    // keepalive lets the last flush survive the tab closing.
    fetch(DB + '/usage/v1/' + date + '/' + id + '.json',
      { method: 'PUT', body, keepalive: body.length < 60000, headers: { 'Content-Type': 'application/json' } })
      .catch(() => { /* offline or refused by the rules: try again at the next flush */ });
  }

  // ---------- visible time ----------
  let visibleSince = null, started = false;

  function settle() {
    if (visibleSince === null) return;
    const now = Date.now();
    const seconds = Math.round((now - visibleSince) / 1000);
    visibleSince = document.visibilityState === 'visible' ? now : null;
    if (seconds <= 0) return;
    const date = today(), record = load(date);
    const entry = record.pages[page] || (record.pages[page] = { n: 0, s: 0, hh: {} });
    const room = Math.max(0, DAILY_CAP_S - entry.s);
    const add = Math.min(seconds, room);
    entry.s += add;
    entry.hh[hour()] = (entry.hh[hour()] || 0) + add;
    save(date, record);
  }

  function flush() {
    settle();
    const date = today();
    send(date, load(date));
  }

  // ---------- actions ----------
  const EVENT_CAP = 1000;             // matches the database rule; a stuck button cannot flood it
  const MAX_CAP = 100;
  function countEvent(name, max) {
    if (!counting() || !EVENT.test(String(name || ''))) return;
    const date = today(), record = load(date);
    const entry = record.events[name] || (record.events[name] = { n: 0, hh: {} });
    if (entry.n >= EVENT_CAP) return;
    entry.n += 1;
    entry.hh[hour()] = (entry.hh[hour()] || 0) + 1;
    // max: the furthest a student got, e.g. guided components reviewed.
    if (Number.isInteger(max) && max >= 0 && max <= MAX_CAP) entry.max = Math.max(entry.max || 0, max);
    save(date, record);
    send(date, record);
  }

  /* On a week page, the first touch of each interactive tool in a page view
     counts once: "which tools students actually use", not every drag. */
  function watchTools() {
    const week = (page || '').replace(/^tools:/, '');
    if (!WEEK.test(week)) return;
    const touched = new Set();
    const onTouch = event => {
      const tool = event.target && event.target.closest && event.target.closest('section.widget[id]');
      if (!tool || touched.has(tool.id) || !SLUG.test(tool.id)) return;
      touched.add(tool.id);
      countEvent(`tool:${week}:${tool.id}`);
    };
    ['pointerdown', 'keydown', 'input'].forEach(type => document.addEventListener(type, onTouch, true));
  }

  function start() {
    if (started || !counting()) return;
    started = true;
    const date = today(), record = load(date);
    const entry = record.pages[page] || (record.pages[page] = { n: 0, s: 0, hh: {} });
    entry.n += 1;
    save(date, record);
    visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
    send(date, record);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
      else visibleSince = Date.now();
    });
    addEventListener('pagehide', flush);
    setInterval(flush, FLUSH_MS);
    document.addEventListener('ie301:usage', event => {
      const d = event.detail || {};
      countEvent(d.event, d.max);
    });
    watchTools();
    // polls.js raises this when a pre-class answer is committed.
    document.addEventListener('ie301:practice-answer', event => {
      const d = event.detail || {};
      if (!/^[A-Za-z0-9_-]{2,60}$/.test(String(d.id || '')) || !Number.isInteger(d.choice)) return;
      const day = today(), rec = load(day);
      const prev = rec.answers[d.id];
      // The FIRST choice is what the analytics use: a second attempt made after
      // reading the explanation drifts toward the right answer and would hide
      // the misconception the warm-up exists to reveal. So later attempts only
      // raise the count of tries — including attempts on a later day, which is
      // why answered questions are remembered across days, not just within one.
      let seen = [];
      try { seen = JSON.parse(read(SEEN_KEY) || '[]'); } catch { seen = []; }
      if (prev) rec.answers[d.id] = { ...prev, tries: prev.tries + 1 };
      else if (seen.includes(d.id)) rec.answers[d.id] = { retry: true, tries: 1 };
      else {
        rec.answers[d.id] = { c: d.choice, ok: !!d.right, tries: 1, at: Date.now() };
        write(SEEN_KEY, JSON.stringify([...seen, d.id].slice(-300)));
      }
      save(day, rec);
      send(day, rec);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { notice(); start(); });
  else { notice(); start(); }
})();
