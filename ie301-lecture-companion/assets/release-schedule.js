/* Student release schedule — edit this file or use instructor/index.html.
 * opensOn is the syllabus Monday (YYYY-MM-DD). Scheduled weeks open at
 * 08:00 Europe/Istanbul; warm-ups, guided activities and in-class interactions open together.
 * status: draft = hold, scheduled = open on date, open = immediate, closed = unavailable.
 */
(() => {
  'use strict';
  const weeks = {
    week01: { status: 'open', opensOn: '2026-09-21' },
    week02: { status: 'open', opensOn: '2026-09-28' },
    week03: { status: 'open', opensOn: '2026-10-05' },
    week04: { status: 'open', opensOn: '2026-10-12' },
    week05: { status: 'open', opensOn: '2026-10-19' },
    week07: { status: 'scheduled', opensOn: '2026-11-02' },
    week08: { status: 'scheduled', opensOn: '2026-11-09' },
    week09: { status: 'scheduled', opensOn: '2026-11-16' },
    week10: { status: 'scheduled', opensOn: '2026-11-23' },
    week11: { status: 'scheduled', opensOn: '2026-11-30' },
    week13: { status: 'scheduled', opensOn: '2026-12-14' },
    week14: { status: 'scheduled', opensOn: '2026-12-21' }
  };
  window.IE301_RELEASE_SCHEDULE = Object.freeze({
    timeZone: 'Europe/Istanbul',
    releaseHour: 8,
    weeks: Object.freeze(weeks)
  });
})();
