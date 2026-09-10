/* Student-facing release checks. Load release-schedule.js before this file. */
(() => {
  'use strict';

  let schedule = window.IE301_RELEASE_SCHEDULE || {
    timeZone: 'Europe/Istanbul', releaseHour: 8, weeks: {}
  };
  const WEEK_ID = /^week(01|02|03|04|05|07|08|09|10|11|13|14)$/;
  const WEEK_IDS = Object.freeze(['week01','week02','week03','week04','week05','week07','week08','week09','week10','week11','week13','week14']);
  const RELEASE_STATUSES = Object.freeze(['draft','scheduled','open','closed']);
  const activityWeeks = Object.freeze({
    machine: 'week07', energy: 'week08', reservations: 'week09',
    lending: 'week11', support: 'week13', charging: 'week14'
  });
  const weekWidgets = Object.freeze({
    week01: Object.freeze(['regression','box','explorer','hunt','convexity','hessian']),
    week02: Object.freeze(['warehouse','tank','bisection','newton','candidates','monopolist']),
    week03: Object.freeze(['classify','profit','openbox','gradient']),
    week04: Object.freeze(['cubic','utility','adv','chem','kkt']),
    week05: Object.freeze(['geometry','notation','simplex']),
    week07: Object.freeze(['matches','network','efficiency','inventory']),
    week08: Object.freeze(['ww','teams','glueco','fishery']),
    week09: Object.freeze(['milk','pinv','sally','reject']),
    week10: Object.freeze(['bayes','voter','memoryless','race','poisson']),
    week11: Object.freeze(['weather','gambler','paths','classify','insurance']),
    week13: Object.freeze(['steady','premium','camera','accounts','freezco','hth']),
    week14: Object.freeze(['updown','balance','barbersim'])
  });
  const formatters = {};
  const CLOCK_KEY = 'ie301-release-clock-v1';
  const SCHEDULE_KEY = 'ie301-release-schedule-v1';
  const CLOCK_TTL_MS = 60 * 60 * 1000;

  function normalizedSchedule(value) {
    if (!value || value.timeZone !== 'Europe/Istanbul' || value.releaseHour !== 8 || !value.weeks) return null;
    const weeks = {};
    for (const week of WEEK_IDS) {
      const row = value.weeks[week];
      if (!row || !RELEASE_STATUSES.includes(row.status)) return null;
      if (row.opensOn && !isDate(row.opensOn)) return null;
      if (row.status === 'scheduled' && !isDate(row.opensOn)) return null;
      weeks[week] = Object.freeze({ status: row.status, ...(row.opensOn ? { opensOn: row.opensOn } : {}) });
    }
    return Object.freeze({ timeZone: 'Europe/Istanbul', releaseHour: 8, weeks: Object.freeze(weeks) });
  }

  function scheduleFromSource(source) {
    if (typeof source !== 'string') return null;
    const weeks = {};
    for (const week of WEEK_IDS) {
      const match = source.match(new RegExp(week + "\\s*:\\s*\\{\\s*status\\s*:\\s*'(" + RELEASE_STATUSES.join('|') + ")'(?:\\s*,\\s*opensOn\\s*:\\s*'(\\d{4}-\\d{2}-\\d{2})')?\\s*\\}"));
      if (!match) return null;
      weeks[week] = { status: match[1], ...(match[2] ? { opensOn: match[2] } : {}) };
    }
    return normalizedSchedule({ timeZone: 'Europe/Istanbul', releaseHour: 8, weeks });
  }

  function readSavedSchedule() {
    try { return normalizedSchedule(JSON.parse(sessionStorage.getItem(SCHEDULE_KEY))); }
    catch (_) { return null; }
  }

  function storeSession(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  function readClock() {
    try {
      const value = JSON.parse(sessionStorage.getItem(CLOCK_KEY));
      if (Number.isFinite(value?.offsetMs) && Number.isFinite(value?.checkedAt) &&
          Math.abs(Date.now() - value.checkedAt) < CLOCK_TTL_MS) return value;
    } catch (_) { /* Storage can be unavailable; device time remains the fallback. */ }
    return null;
  }

  const savedClock = readClock();
  const savedSchedule = readSavedSchedule();
  if (savedSchedule) {
    schedule = savedSchedule;
    window.IE301_RELEASE_SCHEDULE = savedSchedule;
  }
  let clockOffsetMs = savedClock?.offsetMs || 0;

  function releaseNow() {
    return new Date(Date.now() + clockOffsetMs);
  }

  function dateFormatter() {
    return formatters.parts ||= new Intl.DateTimeFormat('en-CA', {
      timeZone: schedule.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', hourCycle: 'h23', minute: '2-digit', second: '2-digit'
    });
  }

  function partsAt(date) {
    const fields = {};
    dateFormatter().formatToParts(date).forEach(part => {
      if (part.type !== 'literal') fields[part.type] = Number(part.value);
    });
    return fields;
  }

  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  // Convert a wall-clock time in Europe/Istanbul to an instant without assuming
  // the browser's timezone or Türkiye's present-day UTC offset.
  function instantAtIstanbul(dateText, hour = schedule.releaseHour) {
    if (!isDate(dateText) || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
    const [year, month, day] = dateText.split('-').map(Number);
    const target = Date.UTC(year, month - 1, day, hour, 0, 0);
    let instant = target;
    // A second pass handles timezone transitions as well as ordinary offsets.
    for (let i = 0; i < 2; i += 1) {
      const local = partsAt(new Date(instant));
      instant += target - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    }
    return new Date(instant);
  }

  function idFrom(value) {
    if (typeof value !== 'string') return null;
    return WEEK_ID.test(value) ? value : activityWeeks[value] || null;
  }

  function routeFor(location = window.location) {
    const url = location instanceof URL ? location : new URL(String(location), window.location.href);
    const params = url.searchParams;
    const filename = url.pathname.split('/').pop().toLowerCase();
    let week = null;
    if (/^week\d\d\.html$/.test(filename)) week = idFrom(filename.slice(0, -5));
    else if (filename === 'polls.html') week = idFrom(params.get('week'));
    else if (filename === 'guided.html') week = idFrom(params.get('activity'));
    const local = url.protocol === 'file:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    const pollFlow = filename === 'polls.html' &&
      (params.get('host') === '1' || /^[A-Z0-9]{4,8}$/i.test(params.get('session') || ''));
    const validWidget = value => Boolean(week && value && weekWidgets[week]?.includes(value));
    const weekFlow = /^week\d\d\.html$/.test(filename) &&
      (validWidget(params.get('embed')) || validWidget(params.get('view')) ||
       (/^[A-Z0-9]{4,8}$/i.test(params.get('class') || '') && validWidget(params.get('w'))));
    const bypass = local || pollFlow || weekFlow;
    return Object.freeze({ week, bypass, filename, activity: params.get('activity') || null });
  }

  function getWeek(value = window.location) {
    if (value && typeof value === 'object' && 'week' in value) value = value.week;
    const direct = idFrom(value);
    if (direct) return Object.freeze({ id: direct, ...(schedule.weeks[direct] || { status: 'draft' }) });
    if (typeof value === 'string' && !value.includes('/') && !value.includes('.html') && !value.includes('?')) return null;
    const route = routeFor(value);
    return route.week ? Object.freeze({ id: route.week, ...(schedule.weeks[route.week] || { status: 'draft' }) }) : null;
  }

  function isBypass(value = window.location) {
    return routeFor(value).bypass;
  }

  function isOpen(value = window.location, now = releaseNow()) {
    const route = typeof value === 'string' && (WEEK_ID.test(value) || activityWeeks[value]) ? null : routeFor(value);
    if (route?.bypass) return true;
    const week = getWeek(value);
    // Pages such as the common AI tutor do not belong to a weekly release.
    if (!week) return true;
    if (week.status === 'open') return true;
    if (week.status !== 'scheduled') return false;
    const opensAt = instantAtIstanbul(week.opensOn);
    return Boolean(opensAt && now instanceof Date && !Number.isNaN(now.getTime()) && now >= opensAt);
  }

  async function syncServerClock() {
    const result = { fetched: false, clockSynced: false, clockStored: false, scheduleChanged: false, scheduleStored: false };
    if (currentRoute.bypass) return result;
    const script = [...document.scripts].find(node => /release-schedule\.js(?:[?#]|$)/.test(node.src));
    if (!script?.src) return result;
    const url = new URL(script.src);
    url.searchParams.set('clock', String(Date.now()));
    const started = Date.now();
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const ended = Date.now();
      if (!response.ok) return result;
      result.fetched = true;
      const freshSchedule = scheduleFromSource(await response.text());
      if (freshSchedule) {
        result.scheduleChanged = JSON.stringify(freshSchedule.weeks) !== JSON.stringify(schedule.weeks);
        schedule = freshSchedule;
        window.IE301_RELEASE_SCHEDULE = freshSchedule;
        result.scheduleStored = storeSession(SCHEDULE_KEY, freshSchedule);
      }
      const serverMs = Date.parse(response.headers.get('Date') || '');
      if (Number.isFinite(serverMs)) {
        clockOffsetMs = serverMs + (ended - started) / 2 - ended;
        result.clockSynced = true;
        result.clockStored = storeSession(CLOCK_KEY, { offsetMs: clockOffsetMs, checkedAt: ended });
      }
      return result;
    } catch (_) {
      return result;
    }
  }

  function releaseAt(value = window.location) {
    const week = getWeek(value);
    return week?.status === 'scheduled' ? instantAtIstanbul(week.opensOn) : null;
  }

  function releaseLabel(value = window.location) {
    const week = getWeek(value);
    if (!week || week.status === 'open') return 'Available now';
    if (week.status === 'closed') return 'Temporarily unavailable';
    const opensAt = releaseAt(week.id);
    if (!opensAt) return 'Release date to be announced';
    const text = new Intl.DateTimeFormat('en-GB', {
      timeZone: schedule.timeZone, day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).format(opensAt);
    return `Opens ${text} (Türkiye time)`;
  }

  function renderLockedScreen(container, value = window.location) {
    if (!(container instanceof Element)) throw new TypeError('renderLockedScreen needs a DOM element.');
    const week = getWeek(value);
    container.replaceChildren();
    const section = document.createElement('section');
    section.className = 'widget release-locked';
    section.setAttribute('aria-labelledby', 'release-locked-title');
    const title = document.createElement('h2');
    title.id = 'release-locked-title';
    title.textContent = week ? `Week ${Number(week.id.slice(4))} is not available yet` : 'This material is not available yet';
    const message = document.createElement('p');
    message.textContent = releaseLabel(week?.id);
    const note = document.createElement('p');
    note.textContent = 'Practice questions, guided modeling and lecture tools will open together. If this page was already open at 08:00, refresh it.';
    const home = document.createElement('a');
    home.href = '../ie301-lecture-companion.html';
    home.textContent = '← Course home';
    section.append(title, message, note, home);
    container.append(section);
    return section;
  }

  function filenameFrom() {
    return window.location.pathname.split('/').pop().toLowerCase();
  }

  function decorateWeekCards(container = document) {
    // Local copies are the instructor's preview and keep every week reachable.
    if (currentRoute.bypass) return;
    container.querySelectorAll('a.card[data-week]').forEach(card => {
      const week = card.dataset.week;
      if (isOpen(week)) return;
      const locked = document.createElement('div');
      locked.className = card.className + ' release-card-locked';
      locked.dataset.week = week;
      locked.setAttribute('aria-disabled', 'true');
      while (card.firstChild) locked.appendChild(card.firstChild);
      const label = document.createElement('p');
      label.className = 'release-date';
      label.textContent = releaseLabel(week);
      locked.appendChild(label);
      card.replaceWith(locked);
    });
  }

  const currentRoute = routeFor();
  const blocked = Boolean(currentRoute.week && !currentRoute.bypass && !isOpen(currentRoute.week));
  const schedulePage = currentRoute.week || ['ie301-lecture-companion.html','polls.html','guided.html'].includes(currentRoute.filename);
  if (schedulePage && !currentRoute.bypass) document.documentElement.classList.add('release-time-pending');
  if (blocked) document.documentElement.classList.add('release-route-locked');
  const clockSync = schedulePage ? syncServerClock() : Promise.resolve({});
  document.addEventListener('DOMContentLoaded', () => {
    if (blocked) {
      const main = document.querySelector('main');
      if (main) renderLockedScreen(main, currentRoute.week);
    } else if (filenameFrom() === 'ie301-lecture-companion.html') {
      decorateWeekCards();
    }
    clockSync.then(result => {
      const correctedBlocked = Boolean(currentRoute.week && !currentRoute.bypass && !isOpen(currentRoute.week));
      // Reload once from the session-cached config/clock so every dependent
      // script starts with the same state. Storage guards against reload loops.
      const shouldReload = (result.scheduleChanged && result.scheduleStored) ||
          (!savedClock && result.clockSynced && result.clockStored) ||
          (correctedBlocked !== blocked && (result.scheduleStored || result.clockStored));
      if (shouldReload) {
        window.location.reload();
        return;
      }
      document.documentElement.classList.remove('release-time-pending');
      if (correctedBlocked && !blocked) {
        document.documentElement.classList.add('release-route-locked');
        const main = document.querySelector('main');
        if (main) renderLockedScreen(main, currentRoute.week);
      }
    });
  });

  window.IE301_RELEASES = Object.freeze({
    get schedule() { return schedule; },
    activityWeeks,
    weekWidgets,
    routeFor,
    getWeek,
    isBypass,
    isOpen,
    releaseAt,
    releaseLabel,
    instantAtIstanbul,
    releaseNow,
    syncServerClock,
    renderLockedScreen,
    decorateWeekCards,
    currentRoute,
    blocked
  });
})();
