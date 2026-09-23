/* Student release schedule — edit this file or use instructor/index.html.
 * opensOn is the syllabus Monday (YYYY-MM-DD). Scheduled weeks open at
 * 08:00 Europe/Istanbul with guided modeling and in-class interactions; each week's
 * thinking warm-up opens one release earlier, with the previous week.
 * status: draft = hold, scheduled = open on date, open = immediate, closed = unavailable.
 */
(() => {
  'use strict';
  const weeks = {
    week01: { status: 'scheduled', opensOn: '2026-09-21' },
    week02: { status: 'scheduled', opensOn: '2026-09-28' },
    week03: { status: 'scheduled', opensOn: '2026-10-05' },
    week04: { status: 'scheduled', opensOn: '2026-10-12' },
    week05: { status: 'scheduled', opensOn: '2026-10-19' },
    week07: { status: 'scheduled', opensOn: '2026-11-02' },
    week08: { status: 'scheduled', opensOn: '2026-11-09' },
    week09: { status: 'scheduled', opensOn: '2026-11-16' },
    week10: { status: 'scheduled', opensOn: '2026-11-23' },
    week11: { status: 'scheduled', opensOn: '2026-11-30' },
    week13: { status: 'scheduled', opensOn: '2026-12-14' },
    week14: { status: 'scheduled', opensOn: '2026-12-21' }
  };
  // Semesters and weekly lecture times (Türkiye time), newest last. Read only by
  // the instructor's class analytics; edit them in the instructor console with
  // the rest of this file. Kept as JSON between the markers.
  const semesters = /* semesters:begin */[
    {"label":"Fall 2026","starts":"2026-09-21","lectures":[{"day":"Monday","from":"15:30","to":"18:30"}]}
  ]/* semesters:end */;
  window.IE301_RELEASE_SCHEDULE = Object.freeze({
    timeZone: 'Europe/Istanbul',
    releaseHour: 8,
    weeks: Object.freeze(weeks),
    semesters: Object.freeze(semesters)
  });
})();
