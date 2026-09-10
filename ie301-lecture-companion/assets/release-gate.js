/* Student-facing release checks. Load release-schedule.js before this file. */
(() => {
  'use strict';

  const schedule = window.IE301_RELEASE_SCHEDULE || {
    timeZone: 'Europe/Istanbul', releaseHour: 8, weeks: {}
  };
  const WEEK_ID = /^week(01|02|03|04|05|07|08|09|10|11|13|14)$/;
  const activityWeeks = Object.freeze({
    machine: 'week07', energy: 'week08', reservations: 'week09',
    lending: 'week11', support: 'week13', charging: 'week14'
  });
  const formatters = {};

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
    const weekFlow = /^week\d\d\.html$/.test(filename) &&
      (Boolean(params.get('embed')) || Boolean(params.get('view')) ||
       (/^[A-Z0-9]{4,8}$/i.test(params.get('class') || '') && Boolean(params.get('w'))));
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

  function isOpen(value = window.location, now = new Date()) {
    const route = typeof value === 'string' && (WEEK_ID.test(value) || activityWeeks[value]) ? null : routeFor(value);
    if (route?.bypass) return true;
    const week = getWeek(value);
    // Pages such as the common AI tutor do not belong to a weekly release.
    if (!week) return true;
    if (week.status === 'open') return true;
    if (week.status !== 'scheduled') return false;
    const opensAt = instantAtIstanbul(week.opensOn);
    return Boolean(opensAt && now instanceof Date && !Number.isNaN(now) && now >= opensAt);
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
    note.textContent = 'Practice questions, guided modeling and lecture tools will open together.';
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
  if (blocked) document.documentElement.classList.add('release-route-locked');
  document.addEventListener('DOMContentLoaded', () => {
    if (blocked) {
      const main = document.querySelector('main');
      if (main) renderLockedScreen(main, currentRoute.week);
    } else if (filenameFrom() === 'ie301-lecture-companion.html') {
      decorateWeekCards();
    }
  });

  window.IE301_RELEASES = Object.freeze({
    schedule,
    activityWeeks,
    routeFor,
    getWeek,
    isBypass,
    isOpen,
    releaseAt,
    releaseLabel,
    instantAtIstanbul,
    renderLockedScreen,
    decorateWeekCards,
    currentRoute,
    blocked
  });
})();
