/*
 * Student release schedule
 *
 * Edit this one file in GitHub when a teaching date is known.  `opensOn` is a
 * calendar date in Türkiye (YYYY-MM-DD); every scheduled week opens at 08:00
 * Europe/Istanbul on that date.  Practice questions, guided modeling and
 * lecture tools share the same release: there is deliberately no second date.
 *
 * status:
 *   draft     keep the week closed, even if an opensOn date is present
 *   scheduled open automatically at 08:00 Europe/Istanbul on opensOn
 *   open      make the week available immediately (use while preparing dates)
 *   closed    close a previously available week until its status changes
 *
 * The 2026 dates use the first day (Monday) of each syllabus week. To delay a
 * week while reviewing it, change its status to `draft`; restore `scheduled`
 * when it is ready. For example:
 *   week07: { status: 'scheduled', opensOn: '2026-10-22' },
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

  window.IE301_RELEASE_SCHEDULE = Object.freeze({
    timeZone: 'Europe/Istanbul',
    releaseHour: 8,
    weeks: Object.freeze(weeks)
  });
})();
