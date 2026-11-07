/* Week 14 guided activity "charging": a continuous-time Markov chain built from a
   two-port charging station. Order: watch a seeded event log → racing clocks
   (per-port vs total rate) → rate diagram and lecture names → rate out = rate in,
   one state at a time → normalize and read the answers → twist (shared power)
   with predict-then-check. Every number on the page is computed from the data
   block below; the simulations are seeded, so every student sees the same log.
   The frame (tabs, data card, progress, usage counts) is assets/guided-kit.js;
   guided.js loads this file and calls window.GUIDED_CUSTOM.charging. The step ids
   and titles live in assets/guided-data.js. The story is invented for practice
   and says so on the page. Design note: docs/guided_redesign/charging.md. */
(() => {
  'use strict';
  const { fb, btn, escapeHtml: escapeAttr, parseNumber } = window.GUIDED_KIT;

  // === EXACT FRACTIONS ===
  // WHY: every answer the page accepts or shows (9/17, 10/17, ...) is computed exactly
  // from the rates, so no hand-typed result can drift from the data.
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
  function R(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }
  const radd = (a, b) => R(a.n * b.d + b.n * a.d, a.d * b.d);
  const rsub = (a, b) => R(a.n * b.d - b.n * a.d, a.d * b.d);
  const rmul = (a, b) => R(a.n * b.n, a.d * b.d);
  const rdiv = (a, b) => R(a.n * b.d, a.d * b.n);
  const rval = a => a.n / a.d;
  const rstr = a => (a.n < 0 ? '−' : '') + (a.d === 1 ? String(Math.abs(a.n)) : Math.abs(a.n) + '/' + a.d);
  const rdec = (a, dp = 3) => a.d === 1 ? rstr(a) : rstr(a) + ' ≈ ' + rval(a).toFixed(dp);

  // === DATA: the story (made up for practice) ===
  const ARRIVAL_RATE = 2;          // cars per hour, Poisson arrivals
  const PORT_RATE = 3;             // charge-ends per hour for ONE busy port at full speed
  const PORTS = 2;                 // no waiting space
  const STATES = Array.from({ length: PORTS + 1 }, (_, n) => n);
  const TWIST_SPEED = R(1, 2);     // twist: each port's speed while all ports are busy
  const MIN_PER_H = 60;
  const LOG_MINUTES = 120;         // the event log covers the first two hours
  const LOG_MAX_GAP = 35;          // readability: no stretch of the log longer than this many minutes without an event
  const LONG_HOURS = 5000;         // the long run used as a check
  const LONG_SEED = 1407;          // any fixed seed: the long run is only a check, not an answer
  const TWIST_SEED = 1408;
  const PORT_NAMES = ['A', 'B'];
  const TOL = { exact: 1e-6, share: 0.005, minutes: 0.05, diag: 0.005 };

  // === MODEL: rates, balance equations, long-run answers ===
  // perPortRate(n): rate at which ONE busy port finishes while n ports are busy.
  function buildModel(perPortRate) {
    const q = STATES.map(i => STATES.map(j => j === i + 1 ? R(ARRIVAL_RATE) : j === i - 1 ? rmul(R(i), perPortRate(i)) : R(0)));
    const qOut = STATES.map(i => STATES.reduce((s, j) => j === i ? s : radd(s, q[i][j]), R(0)));
    const Q = STATES.map(i => STATES.map(j => i === j ? R(-qOut[i].n, qOut[i].d) : q[i][j]));
    const pi = solveBalance(Q);
    const weights = pi.map(p => rdiv(p, pi[0]));
    const weightSum = weights.reduce(radd, R(0));
    const meanBusy = STATES.reduce((s, n) => radd(s, rmul(R(n), pi[n])), R(0));
    const lost = pi[PORTS];                                   // share of arriving cars that find all ports busy
    const served = rmul(R(ARRIVAL_RATE), rsub(R(1), lost));   // cars charged per hour
    const stayMin = qOut.map(v => rdiv(R(MIN_PER_H), v));     // mean minutes per visit, 60 / q_i
    return { q, qOut, Q, pi, weights, weightSum, meanBusy, lost, served, stayMin };
  }
  // Solve pi Q = 0 with sum(pi) = 1 by exact Gaussian elimination (last balance equation
  // replaced by the normalization: one balance equation is always redundant).
  function solveBalance(Q) {
    const n = Q.length;
    const A = STATES.map(j => STATES.map(i => Q[i][j]));
    const b = STATES.map(() => R(0));
    A[n - 1] = STATES.map(() => R(1)); b[n - 1] = R(1);
    for (let c = 0; c < n; c++) {
      const p = A.findIndex((row, r) => r >= c && row[c].n !== 0);
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < n; r++) {
        if (r === c || A[r][c].n === 0) continue;
        const f = rdiv(A[r][c], A[c][c]);
        A[r] = A[r].map((v, k) => rsub(v, rmul(f, A[c][k])));
        b[r] = rsub(b[r], rmul(f, b[c]));
      }
    }
    return STATES.map(i => rdiv(b[i], A[i][i]));
  }
  const fullSpeed = () => R(PORT_RATE);
  const BASE = buildModel(fullSpeed);
  const TWIST = buildModel(n => n === PORTS ? rmul(R(PORT_RATE), TWIST_SPEED) : R(PORT_RATE));
  // The classic error: the all-busy arrow written as ONE port's rate. Used to diagnose answers.
  const ONE_CLOCK = buildModel(n => n === PORTS ? R(PORT_RATE, n) : R(PORT_RATE));
  const ARROWS = [];
  STATES.forEach(i => { if (i < PORTS) ARROWS.push({ id: i + '' + (i + 1), from: i, to: i + 1, kind: 'arr' }); });
  STATES.forEach(i => { if (i > 0) ARROWS.push({ id: i + '' + (i - 1), from: i, to: i - 1, kind: 'end' }); });
  const arrowRate = (m, a) => m.q[a.from][a.to];
  const TWIST_CHANGED = ARROWS.filter(a => rval(arrowRate(BASE, a)) !== rval(arrowRate(TWIST, a)));

  // === SIMULATION (seeded, port by port) ===
  // Each car brings an exponential amount of charging work (mean 1/PORT_RATE hours at full
  // speed), drawn once when it plugs in; arrivals come from one running Poisson clock. The
  // simulation never uses the rates of the diagram, so it is an independent check of them.
  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function simulate(hours, seed, twist, keepEvents) {
    const u = mulberry32(seed), draw = rate => -Math.log(1 - u()) / rate;
    const speed = n => twist && n === PORTS ? rval(TWIST_SPEED) : 1;
    const ports = new Array(PORTS).fill(null);
    const zero = () => STATES.map(() => 0);
    const timeIn = zero(), leaves = zero(), enters = zero(), stays = zero(), staySum = zero(), events = [];
    let t = 0, n = 0, car = 0, arrivals = 0, blocked = 0, served = 0, stayStart = 0, nextArrival = draw(ARRIVAL_RATE);
    for (;;) {
      const sp = speed(n);
      let endPort = -1, endT = Infinity;
      ports.forEach((p, k) => { if (p && t + p.work / sp < endT) { endT = t + p.work / sp; endPort = k; } });
      const tNext = Math.min(nextArrival, endT), stop = tNext >= hours, dt = (stop ? hours : tNext) - t;
      timeIn[n] += dt;
      ports.forEach(p => { if (p) p.work -= dt * sp; });
      if (stop) break;
      t = tNext;
      let next;
      if (nextArrival <= endT) {
        car++; arrivals++; nextArrival = t + draw(ARRIVAL_RATE);
        if (n === PORTS) { blocked++; if (keepEvents) events.push({ t, kind: 'blocked', car, n }); continue; }
        const k = ports.indexOf(null), work = draw(PORT_RATE);
        ports[k] = { car, work, plannedEnd: t + work / speed(n + 1) };
        next = n + 1;
        if (keepEvents) events.push({ t, kind: 'arrive', car, port: k, n: next, ends: ports.map(p => p && { car: p.car, t: p.plannedEnd }) });
      } else {
        const p = ports[endPort]; ports[endPort] = null; served++; next = n - 1;
        if (keepEvents) events.push({ t, kind: 'end', car: p.car, port: endPort, n: next });
      }
      leaves[n]++; enters[next]++; stays[n]++; staySum[n] += t - stayStart; stayStart = t; n = next;
    }
    return {
      hours, arrivals, blocked, served, leaves, enters, events,
      share: timeIn.map(x => x / hours),
      meanBusy: timeIn.reduce((s, x, k) => s + k * x, 0) / hours,
      meanStayMin: staySum.map((s, k) => stays[k] ? MIN_PER_H * s / stays[k] : NaN)
    };
  }
  const LONG = simulate(LONG_HOURS, LONG_SEED, false, false);
  const TWIST_LONG = simulate(LONG_HOURS, TWIST_SEED, true, false);

  // --- The two-hour event log of step 1 ---
  function buildLog(seed) {
    const sim = simulate(LOG_MINUTES / MIN_PER_H, seed, false, true);
    const toMin = t => Math.round(t * MIN_PER_H);
    const events = sim.events.map(e => Object.assign({}, e, { m: toMin(e.t), ends: e.ends ? e.ends.map(x => x && { car: x.car, m: toMin(x.t) }) : null }));
    const minutes = STATES.map(() => 0), visits = STATES.map(() => 0);
    let n = 0, prev = 0; visits[0]++;
    events.forEach(e => { minutes[n] += e.m - prev; prev = e.m; if (e.n !== n) visits[e.n]++; n = e.n; });
    minutes[n] += LOG_MINUTES - prev;
    const firstBoth = events.findIndex(e => e.kind === 'arrive' && e.n === PORTS);
    const leftBoth = firstBoth < 0 ? -1 : events.findIndex((e, i) => i > firstBoth && e.kind === 'end');
    return { seed, events, minutes, visits, firstBoth, leftBoth, firstBlocked: events.findIndex(e => e.kind === 'blocked') };
  }
  // WHY: the log must show every situation the steps talk about (both ports busy, a car
  // turned away, the first of two charges ending) and be easy to read (one event per
  // minute, not too many rows). The first seed that passes is used; the search is
  // deterministic, so every student sees the same log.
  function logIsGood(L) {
    const ms = L.events.map(e => e.m), total = L.visits.reduce((a, b) => a + b, 0);
    const ends = L.firstBoth >= 0 ? L.events[L.firstBoth].ends.map(x => x.m) : [];
    const gaps = ms.map((m, i) => m - (i ? ms[i - 1] : 0)).concat(LOG_MINUTES - ms[ms.length - 1]);
    return L.events.length >= 8 && L.events.length <= 12 &&
      new Set(ms).size === ms.length && ms.every(m => m >= 3 && m <= LOG_MINUTES - 3) &&
      Math.max(...gaps) <= LOG_MAX_GAP && L.firstBlocked >= 3 &&
      L.minutes.every(m => m >= 5) && L.minutes[PORTS] >= 10 && L.minutes[PORTS] <= 30 &&
      L.leftBoth > L.firstBoth && L.firstBoth >= 0 && ends[0] !== ends[1] &&
      L.events[L.leftBoth].m === Math.min(...ends) &&
      Math.abs(L.visits[PORTS] / total - L.minutes[PORTS] / LOG_MINUTES) > 0.03;
  }
  const LOG = (() => { for (let seed = 1; seed < 20000; seed++) { const L = buildLog(seed); if (logIsGood(L)) return L; } throw new Error('No suitable seed for the event log'); })();

  // === TEXT HELPERS ===
  const P = j => 'π<sub>' + j + '</sub>';
  const qs = (i, j) => 'q<sub>' + i + j + '</sub>';
  const clock = m => Math.floor(m / MIN_PER_H) + ':' + String(m % MIN_PER_H).padStart(2, '0');
  const pct = x => (100 * x).toFixed(1) + '%';
  const dec = (x, dp = 3) => x.toFixed(dp);
  const big = x => x.toLocaleString('en-US');
  const busyWord = n => n === 0 ? 'no port busy' : n === 1 ? '1 port busy' : n + ' ports busy';
  // The kit's parser plus the units students type here: "12 min", "6 per hour", "0.5 h".
  const UNIT_SUFFIX = /(minutes|minute|mins|min|perhour|\/hour|\/hr|\/h|hours|hour|hrs|h)$/;
  const parseNum = s => parseNumber(String(s ?? '').trim().toLowerCase().replace(/\s+/g, '').replace(UNIT_SUFFIX, ''));
  const eqText = (m, j) => rstr(m.qOut[j]) + P(j) + ' = ' + STATES.filter(i => i !== j && m.q[i][j].n !== 0).map(i => rstr(m.q[i][j]) + P(i)).join(' + ');

  // === THE RATE DIAGRAM (SVG), laid out like the lecture's slides 23 and 26 ===
  const NX = [70, 230, 390], NY = 100, RN = 26;
  function diagramSVG(o) {
    const opt = Object.assign({ labels: {}, hl: {}, focus: null, changed: [] }, o);
    let arcs = '', pills = '', nodes = '';
    ARROWS.forEach(a => {
      const up = a.to > a.from, x1 = NX[a.from], x2 = NX[a.to], mid = (x1 + x2) / 2, s = up ? -1 : 1;
      const dx = up ? 1 : -1;
      const sx = x1 + dx * 13, sy = NY + s * 22.5, ex = x2 - dx * 15, ey = NY + s * 24.5, cy = NY + s * 75;
      const hl = opt.hl[a.id], changed = opt.changed.includes(a.id);
      const cls = 'gc-arc ' + a.kind + (hl ? ' hl-' + hl : '') + (changed ? ' changed' : '') + (Object.keys(opt.hl).length && !hl ? ' dim' : '');
      const marker = hl ? 'gc-ah-' + hl : 'gc-ah-' + a.kind;
      arcs += '<path class="' + cls + '" data-arrow="' + a.id + '" d="M' + sx + ',' + sy + ' Q' + mid + ',' + cy + ' ' + ex + ',' + ey + '" marker-end="url(#' + marker + ')"/>';
      const label = opt.labels[a.id] === undefined ? '?' : opt.labels[a.id];
      const ly = NY + s * 49, w = Math.max(34, 11 * String(label).length + 16);
      pills += '<rect class="gc-pill' + (changed ? ' changed' : '') + '" x="' + (mid - w / 2) + '" y="' + (ly - 12) + '" width="' + w + '" height="24" rx="12"/>' +
        '<text class="gc-lab' + (label === '?' ? ' unknown' : '') + '" x="' + mid + '" y="' + ly + '">' + label + '</text>';
    });
    STATES.forEach(n => {
      nodes += '<g class="gc-node' + (opt.focus === n ? ' focus' : '') + '"><circle cx="' + NX[n] + '" cy="' + NY + '" r="' + RN + '"/><text x="' + NX[n] + '" y="' + NY + '">' + n + '</text></g>';
    });
    // WHY: userSpaceOnUse keeps arrowheads one size whatever the stroke width.
    const head = (id, color) => '<marker id="gc-ah-' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(' + color + ')"/></marker>';
    // WHY: the viewBox is cropped to the drawing (nodes at x 44–416, labels at y 39–161,
    // caption at 196) so the diagram is as large as possible on a phone.
    return '<div class="gc-diagram"><svg viewBox="34 32 392 172" role="img" aria-label="Rate diagram: states 0, 1, 2 busy ports">' +
      '<defs>' + head('arr', '--s1') + head('end', '--s5') + head('out', '--ink') + head('in', '--s2') + '</defs>' +
      arcs + pills + nodes + '<text class="gc-cap" x="230" y="196">circle = number of busy ports</text></svg>' +
      '<div class="gk-legend"><span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s1);stroke-width:2"/></svg>top: a car arrives</span>' +
      '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s5);stroke-width:2;stroke-dasharray:7 5"/></svg>bottom: a charge ends</span>' +
      (Object.values(opt.hl).includes('out') ? '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--ink);stroke-width:4"/></svg>leaves the ringed state</span>' : '') +
      (Object.values(opt.hl).includes('in') ? '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s2);stroke-width:4"/></svg>enters the ringed state</span>' : '') +
      '<span>numbers = rates per hour</span></div></div>';
  }
  const allLabels = m => Object.fromEntries(ARROWS.map(a => [a.id, rstr(arrowRate(m, a))]));
  const qMatrixHTML = m => '<div class="gc-tablewrap"><table class="gk-table" aria-label="Transition rate matrix Q"><tr><th>Q</th>' + STATES.map(j => '<th>to ' + j + '</th>').join('') + '<th>row sum</th></tr>' +
    STATES.map(i => '<tr><td>from ' + i + '</td>' + STATES.map(j => '<td>' + rstr(m.Q[i][j]) + '</td>').join('') + '<td>' + rstr(m.Q[i].reduce(radd, R(0))) + '</td></tr>').join('') + '</table></div>';

  // === STEP CONTENT (questions; every answer and diagnosis is computed from the model) ===
  const GROUPS = {};
  const group = g => { g.fields.forEach(f => { f.tol = f.tol ?? TOL.exact; }); GROUPS[g.id] = g; return g; };
  const CHOICES = {};
  const choice = c => { CHOICES[c.id] = c; return c; };
  const MEAN_CHARGE_MIN = MIN_PER_H / PORT_RATE;     // 20
  const MEAN_GAP_MIN = MIN_PER_H / ARRIVAL_RATE;     // 30

  // Step 1
  const LOG_SHARE = LOG.minutes[PORTS] / LOG_MINUTES;
  const LOG_VISITS_TOTAL = LOG.visits.reduce((a, b) => a + b, 0);
  const G_SHARE = group({ id: 'share', step: 'watch',
    prompt: 'What <b>share of the two hours</b> were <b>both</b> ports busy? (A fraction like 1/4, a decimal or a percent.)',
    fields: [{ id: 'v', short: 'Share', label: 'share of time, both busy', answer: LOG_SHARE, show: LOG.minutes[PORTS] + '/' + LOG_MINUTES, tol: TOL.share,
      diag: [[LOG.minutes[PORTS], 'That is the number of minutes. A share divides by all ' + LOG_MINUTES + ' minutes we watched.'],
        [LOG.minutes[PORTS] / MIN_PER_H, 'We watched ' + LOG_MINUTES + ' minutes, not ' + MIN_PER_H + '.'],
        [LOG.visits[PORTS] / LOG_VISITS_TOTAL, 'You counted visits (' + LOG.visits[PORTS] + ' of ' + LOG_VISITS_TOTAL + '). Some visits are short, some long. We want the share of <b>time</b>.']] }],
    hint: 'Share of time = minutes with both ports busy ÷ all minutes watched.',
    right: LOG.minutes[PORTS] + ' of ' + LOG_MINUTES + ' minutes = ' + pct(LOG_SHARE) + ' of the time. Two hours is short, though: the next button runs the station much longer.' });

  // Step 2
  group({ id: 'rate2', step: 'clocks',
    prompt: 'One busy port finishes at rate <b>' + PORT_RATE + ' per hour</b> (a charge takes ' + MEAN_CHARGE_MIN + ' minutes on average). Now <b>both</b> ports are busy. How many charge-ends per hour happen, counting both ports?',
    fields: [{ id: 'v', short: 'Rate', label: 'charge-ends per hour', answer: rval(BASE.q[PORTS][PORTS - 1]), show: rstr(BASE.q[PORTS][PORTS - 1]),
      diag: [[PORT_RATE, 'That is one port. Both clocks run at the same time, so charge-ends come twice as often: ' + PORT_RATE + ' + ' + PORT_RATE + '.'],
        [PORT_RATE / PORTS, 'The ports do not share anything here. Each port keeps its own rate ' + PORT_RATE + '.'],
        [MEAN_CHARGE_MIN, 'That is minutes per charge. We want a rate: how many per hour.'],
        [MEAN_CHARGE_MIN / PORTS, 'That is minutes. We want how many per hour.']] }],
    hint: 'Each busy port has its own clock. Count how many charges end in one hour with two clocks running.',
    right: 'Both clocks run: ' + PORT_RATE + ' + ' + PORT_RATE + ' = ' + rstr(BASE.q[PORTS][PORTS - 1]) + ' charge-ends per hour. The lecture says the same: the first of several exponential clocks rings at the <b>sum</b> of their rates (slide 16).' });
  group({ id: 'stay2', step: 'clocks',
    prompt: 'So how many <b>minutes</b>, on average, does “both busy” last before a charge ends?',
    fields: [{ id: 'v', short: 'Minutes', label: 'mean minutes in state ' + PORTS, answer: rval(BASE.stayMin[PORTS]), show: rstr(BASE.stayMin[PORTS]), tol: TOL.minutes,
      diag: [[MEAN_CHARGE_MIN, 'That is one charge. “Both busy” ends at the <b>first</b> of two charges, so it is shorter.'],
        [1 / rval(BASE.qOut[PORTS]), 'That is in hours. Multiply by 60.'],
        [rval(BASE.qOut[PORTS]), 'That is how many per hour. The mean time is 60 ÷ ' + rstr(BASE.qOut[PORTS]) + ' minutes.'],
        [PORTS * MEAN_CHARGE_MIN, 'That is two charges one after the other. The state changes at the first one.']] }],
    hint: 'Mean time = 1 ÷ rate. With the rate per hour, minutes = 60 ÷ rate.',
    right: '60 ÷ ' + rstr(BASE.qOut[PORTS]) + ' = ' + rstr(BASE.stayMin[PORTS]) + ' minutes. Mean time = 1 ÷ rate (slide 10: E[T<sub>i</sub>] = 1/q<sub>i</sub>).' });
  group({ id: 'stay1', step: 'clocks',
    prompt: 'Now state 1. Two different clocks race: a new car (' + ARRIVAL_RATE + ' per hour) and the charge end (' + PORT_RATE + ' per hour). Whichever rings first ends state 1. How many <b>minutes</b> does state 1 last on average?',
    fields: [{ id: 'v', short: 'Minutes', label: 'mean minutes in state 1', answer: rval(BASE.stayMin[1]), show: rstr(BASE.stayMin[1]), tol: TOL.minutes,
      diag: [[MEAN_CHARGE_MIN, 'That is only the charge clock. A new car also ends state 1 (then 2 ports are busy).'],
        [MEAN_GAP_MIN, 'That is only the arrival clock. The charge can also end first (then no port is busy).'],
        [MEAN_CHARGE_MIN + MEAN_GAP_MIN, 'Adding the times makes the stay longer, but two racing clocks make it shorter. Add the <b>rates</b>: ' + ARRIVAL_RATE + ' + ' + PORT_RATE + ' per hour.'],
        [(MEAN_CHARGE_MIN + MEAN_GAP_MIN) / 2, 'Averaging the two times does not work. Add the rates: ' + ARRIVAL_RATE + ' + ' + PORT_RATE + ' per hour.'],
        [rval(BASE.qOut[1]), 'That is how many per hour. In minutes: 60 ÷ ' + rstr(BASE.qOut[1]) + '.'],
        [1 / rval(BASE.qOut[1]), 'That is in hours. Multiply by 60.']] }],
    hint: 'Add the rates of the racing clocks, then minutes = 60 ÷ total rate.',
    right: ARRIVAL_RATE + ' + ' + PORT_RATE + ' = ' + rstr(BASE.qOut[1]) + ' events per hour, so 60 ÷ ' + rstr(BASE.qOut[1]) + ' = ' + rstr(BASE.stayMin[1]) + ' minutes. Slide 16: q<sub>i</sub> = Σ q<sub>ij</sub>, the total rate out.' });

  // Step 3
  function arrowDiag(a) {
    if (a.kind === 'arr') return [
      [PORT_RATE, 'Going up means a car arrives. ' + PORT_RATE + ' is the charge rate.'],
      [MEAN_GAP_MIN, 'That is minutes between cars. The rate counts cars per hour.'],
      [1 / ARRIVAL_RATE, 'That is the mean time between cars in hours. The rate counts cars per hour.'],
      [ARRIVAL_RATE / 2, 'Cars do not come less often when a port is busy: still ' + ARRIVAL_RATE + ' per hour.']];
    const n = a.from, d = [[ARRIVAL_RATE, 'Going down means a charge ends. ' + ARRIVAL_RATE + ' is the arrival rate.'], [MEAN_CHARGE_MIN, 'That is minutes per charge. The rate counts per hour.']];
    if (n > 1) d.push([PORT_RATE, 'That is one port. In state ' + n + ' all ' + n + ' clocks run (step 2): ' + Array(n).fill(PORT_RATE).join(' + ') + '.'], [PORT_RATE / n, 'The ports do not share power here. Each busy port ends at ' + PORT_RATE + ' per hour.']);
    else d.push([PORTS * PORT_RATE, 'In state 1 only one car is charging: one clock, ' + PORT_RATE + ' per hour.']);
    return d;
  }
  const arrowLabel = a => a.from + ' → ' + a.to + (a.kind === 'arr' ? ' (a car arrives)' : ' (a charge ends)');
  const G_RATES = group({ id: 'rates', step: 'diagram',
    prompt: 'Write the rate (per hour) on each arrow of the diagram.',
    fields: ARROWS.map(a => ({ id: a.id, short: a.from + ' → ' + a.to, label: arrowLabel(a), answer: rval(arrowRate(BASE, a)), show: rstr(arrowRate(BASE, a)), diag: arrowDiag(a) })),
    hint: 'Up = a car arrives (' + ARRIVAL_RATE + ' per hour while a port is free). Down = a charge ends: ' + PORT_RATE + ' per hour for each busy port.',
    right: 'Up: ' + ARRIVAL_RATE + ' per hour. Down: ' + PORT_RATE + ' per busy port, so ' + ARROWS.filter(a => a.kind === 'end').map(a => rstr(arrowRate(BASE, a)) + ' from state ' + a.from).join(' and ') + '. The lecture draws its barbershop the same way (slide 23); its two machines example adds clocks the same way: q<sub>01</sub> = 1 + 1 = 2 (slide 25).' });
  const C_BLOCKED_ARROW = choice({ id: 'noArrow', step: 'diagram', answer: 'none',
    prompt: 'A car arrives while both ports are busy. Which arrow does that event draw?',
    options: [
      ['up', 'An arrow 2 → 3', 'There is no state 3: there is no waiting space. The car drives away.'],
      ['loop', 'An arrow from 2 back to 2', 'Staying in the same state is not a transition. The lecture’s diagrams have no such loops (p<sub>ii</sub> = 0, slide 11).'],
      ['none', 'No arrow: the state stays 2', 'The car is turned away and the number of busy ports does not change, so no arrow leaves state 2 upward. We still count these cars in step 5.']] });
  const NAME_ROWS = [
    { id: 'arrow', label: 'The number on the arrow from i to j', answer: 'qij' },
    { id: 'out', label: 'The sum of all arrows leaving state i (for state 1: ' + ARRIVAL_RATE + ' + ' + PORT_RATE + ')', answer: 'qi' },
    { id: 'stay', label: '60 ÷ ' + rstr(BASE.qOut[1]) + ' = ' + rstr(BASE.stayMin[1]) + ' minutes for state 1', answer: 'ET' },
    { id: 'state', label: 'The circle labels 0, 1, 2', answer: 'X' }
  ];
  const NAME_OPTIONS = [
    ['pij', 'p_ij: probability that the next state is j'],
    ['qi', 'q_i: total rate out of state i'],
    ['X', 'X(t): number of busy ports at time t'],
    ['qij', 'q_ij: transition rate from i to j, per hour'],
    ['N', 'number of cars that arrived so far'],
    ['ET', 'E[T_i] = 1/q_i: mean time spent in state i']
  ];
  const NAME_WHY = {
    pij: 'p<sub>ij</sub> is a probability: out of state 1 the two values add to 1 (slide 16). The numbers on the arrows are rates per hour.',
    N: 'Cars that came and left do not change what happens next. Only the busy ports matter.',
    qij: 'q<sub>ij</sub> is one arrow, i to j.', qi: 'q<sub>i</sub> adds all arrows out of state i.',
    ET: 'E[T<sub>i</sub>] is a time, in hours or minutes, not a rate.', X: 'X(t) is where the station is at time t.'
  };

  // Step 4
  const EQ_ORDER = [0, PORTS, 1];   // fading: worked hint → arrows only → alone
  function eqGroup(j, level) {
    const others = STATES.filter(i => i !== j);
    const outs = STATES.filter(k => k !== j && BASE.q[j][k].n !== 0);
    const inSum = others.reduce((s, i) => radd(s, BASE.q[i][j]), R(0));
    const outDiag = outs.length > 1 ? outs.map(k => [rval(BASE.q[j][k]), 'State ' + j + ' has ' + outs.length + ' arrows out: ' + outs.map(o => rstr(BASE.q[j][o])).join(' and ') + '. Add them.']) : [];
    if (rval(inSum) !== rval(BASE.qOut[j])) outDiag.push([rval(inSum), 'Those are the arrows coming <b>in</b>. Rate out uses the arrows leaving state ' + j + '.']);
    if (j === PORTS) outDiag.push([PORT_RATE, 'In state ' + j + ' both clocks run: the arrow is ' + rstr(BASE.qOut[j]) + '.']);
    return group({ id: 'eq' + j, step: 'balance', level, j,
      fields: [{ id: 'out', short: 'Rate out of ' + j, label: 'number in front of π' + j, answer: rval(BASE.qOut[j]), show: rstr(BASE.qOut[j]), diag: outDiag }]
        .concat(others.map(i => ({ id: 'in' + i, short: 'From ' + i, label: 'number in front of π' + i, answer: rval(BASE.q[i][j]), show: rstr(BASE.q[i][j]),
          diagFn: v => {
            const right = rval(BASE.q[i][j]), back = rval(BASE.q[j][i]);
            if (right === 0 && v !== 0) return 'There is no arrow from ' + i + ' to ' + j + ' (cars arrive one at a time, charges end one at a time). Write 0.';
            if (back !== right && Math.abs(v - back) <= TOL.diag) return 'That is the arrow from ' + j + ' to ' + i + ': it leaves ' + j + '. Use the arrow from ' + i + ' <b>into</b> ' + j + '.';
            if (i === PORTS && Math.abs(v - PORT_RATE) <= TOL.diag && right !== PORT_RATE) return 'From state ' + i + ' both clocks run: the arrow ' + i + ' → ' + j + ' is ' + rstr(BASE.q[i][j]) + '.';
            return null;
          } }))),
      hint: 'Left: add the arrows leaving state ' + j + '. Right: for each other state, the arrow from it into ' + j + ' (0 if there is none).',
      right: eqText(BASE, j) });
  }
  const EQ_GROUPS = EQ_ORDER.map((j, k) => eqGroup(j, k));
  const TILES = [['pjqj', 'π<sub>j</sub> q<sub>j</sub>'], ['piqij', 'π<sub>i</sub> q<sub>ij</sub>'], ['pjqij', 'π<sub>j</sub> q<sub>ij</sub>'], ['piqji', 'π<sub>i</sub> q<sub>ji</sub>'], ['pipij', 'π<sub>i</sub> p<sub>ij</sub>'], ['qj', 'q<sub>j</sub>']];
  const SLOT_ANSWER = { L: 'pjqj', Rt: 'piqij' };
  const SLOT_ROLE = { L: 'Left: the rate at which the station leaves j', Rt: 'Inside the sum: the rate of jumps from i into j' };
  const SLOT_WHY = {
    L: { pjqij: 'q<sub>ij</sub> is the arrow from i <b>into</b> j. Leaving j uses q<sub>j</sub>, the total of the arrows out of j.', qj: 'The station leaves j at rate q<sub>j</sub> only while it is in j, a share π<sub>j</sub> of the time: π<sub>j</sub> q<sub>j</sub>.', piqij: 'That is a flow into j: it belongs on the right.' },
    Rt: { piqji: 'q<sub>ji</sub> goes from j to i: that leaves j.', pjqij: 'Jumps from i happen while the station is in i: use π<sub>i</sub>.', pipij: 'p<sub>ij</sub> is a probability (slide 16). Balance equations use rates q<sub>ij</sub>.', pjqj: 'That is the left side.' }
  };
  const tileLabel = id => (TILES.find(x => x[0] === id) || [null, ''])[1];

  // Step 5
  const wDiag2 = [
    [rval(rdiv(BASE.weights[2], BASE.weights[1])), P(2) + ' = (' + rstr(BASE.q[1][2]) + '/' + rstr(BASE.qOut[2]) + ')·' + P(1) + ', and ' + P(1) + ' = ' + rstr(BASE.weights[1]) + ' here, not 1.'],
    [rval(ONE_CLOCK.weights[2]), 'Check the arrow 2 → 1: it is ' + rstr(BASE.q[2][1]) + ', not ' + rstr(ONE_CLOCK.q[2][1]) + '.'],
    [rval(rdiv(BASE.qOut[2], BASE.q[1][2])), 'Reversed: ' + eqText(BASE, 2) + ', so ' + P(2) + ' = ' + P(1) + ' · ' + rstr(BASE.q[1][2]) + '/' + rstr(BASE.qOut[2]) + '.']];
  group({ id: 'weights', step: 'solve',
    prompt: 'Pretend ' + P(0) + ' = 1 for a moment. Use your equations for state 0 and state 2 to get the other two numbers. We call these numbers <b>weights</b>.',
    fields: [
      { id: 'w1', short: 'Weight of state 1', label: 'weight of state 1', answer: rval(BASE.weights[1]), show: rstr(BASE.weights[1]), tol: TOL.share,
        diag: [[1 / rval(BASE.weights[1]), 'Reversed. ' + eqText(BASE, 0) + ' with ' + P(0) + ' = 1 gives ' + P(1) + ' = ' + rstr(BASE.q[0][1]) + '/' + rstr(BASE.q[1][0]) + '.']] },
      { id: 'w2', short: 'Weight of state 2', label: 'weight of state 2', answer: rval(BASE.weights[2]), show: rstr(BASE.weights[2]), tol: TOL.share, diag: wDiag2 }],
    hint: 'State 0: ' + eqText(BASE, 0) + '. State 2: ' + eqText(BASE, 2) + '. Put ' + P(0) + ' = 1 and solve one at a time.',
    right: 'Weights: 1, ' + rstr(BASE.weights[1]) + ', ' + rstr(BASE.weights[2]) + '. They add to ' + rstr(BASE.weightSum) + ', not 1, so they are not yet shares of time.' });
  group({ id: 'pi', step: 'solve',
    prompt: 'Shares of time must add to 1 (π<sub>0</sub> + π<sub>1</sub> + π<sub>2</sub> = 1). Divide each weight by the total ' + rstr(BASE.weightSum) + '.',
    fields: STATES.map(k => ({ id: 'p' + k, short: 'π' + k, label: 'π' + k, answer: rval(BASE.pi[k]), show: rstr(BASE.pi[k]), tol: TOL.share,
      diag: [[rval(BASE.weights[k]), 'That is the weight. The weights add to ' + rstr(BASE.weightSum) + '; divide by it.'],
        [rval(ONE_CLOCK.pi[k]), 'You get this number with ' + rstr(ONE_CLOCK.q[2][1]) + ' on the arrow 2 → 1. It is ' + rstr(BASE.q[2][1]) + '.'],
        [1 / STATES.length, 'The states do not get equal time. Use the weights.']] })),
    groupDiag: vals => {
      const ks = Object.keys(vals);
      if (ks.length < STATES.length) return null;
      const s = ks.reduce((a, k) => a + vals[k], 0);
      return Math.abs(s - 1) > 0.01 ? 'Your three numbers add to ' + dec(s) + '. Shares of time must add to 1.' : null;
    },
    hint: 'π<sub>k</sub> = weight<sub>k</sub> ÷ (sum of the weights).',
    right: 'π = (' + STATES.map(k => rstr(BASE.pi[k])).join(', ') + '). Same style as the lecture’s barbershop answer, π = (16/37, 12/37, 9/37) (slide 23).' });
  group({ id: 'answers', step: 'solve',
    prompt: 'Now answer the two questions of the story.',
    fields: [
      { id: 'busy', short: 'Average busy ports', label: 'long-run average number of busy ports', answer: rval(BASE.meanBusy), show: rstr(BASE.meanBusy), tol: TOL.share,
        diag: [[rval(radd(BASE.pi[1], BASE.pi[2])), 'That is the share of time with at least one busy port. Weight each state by its number of busy ports: 0·π<sub>0</sub> + 1·π<sub>1</sub> + 2·π<sub>2</sub>.'],
          [rval(BASE.meanBusy) / PORTS, 'That is per port (the share of time one port is busy). We want the number of busy ports.'],
          [rval(ONE_CLOCK.meanBusy), 'That number comes from ' + rstr(ONE_CLOCK.q[2][1]) + ' on the arrow 2 → 1.'],
          [STATES.reduce((a, b) => a + b, 0) / STATES.length, 'States 0, 1, 2 do not get equal time. Use π.']] },
      { id: 'lost', short: 'Share turned away', label: 'share of arriving cars turned away', answer: rval(BASE.lost), show: rstr(BASE.lost), tol: TOL.share,
        diag: [[rval(rsub(R(1), BASE.lost)), 'That is the share of cars that <b>can</b> charge (slide 24 asks it this way: π<sub>0</sub> + π<sub>1</sub>). Turned away is the rest.'],
          [rval(rmul(R(ARRIVAL_RATE), BASE.lost)), 'That is cars turned away <b>per hour</b> (' + ARRIVAL_RATE + '·π<sub>2</sub>). As a share of arriving cars, divide by ' + ARRIVAL_RATE + '.'],
          [rval(BASE.pi[0]), 'π<sub>0</sub> is the share of time with both ports free. Those cars all get in.'],
          [rval(ONE_CLOCK.lost), 'That number comes from ' + rstr(ONE_CLOCK.q[2][1]) + ' on the arrow 2 → 1.']] }],
    hint: 'Average busy ports = Σ n·π<sub>n</sub>. A car is turned away when it finds both ports busy.',
    right: 'Average busy ports = 1·' + rstr(BASE.pi[1]) + ' + 2·' + rstr(BASE.pi[2]) + ' = ' + rdec(BASE.meanBusy) + '. Turned away: cars arrive at random moments, so the share of cars that find both ports busy equals the share of <b>time</b> both are busy: π<sub>2</sub> = ' + rdec(BASE.lost) + ' (' + pct(rval(BASE.lost)) + '). Slide 24 uses the same idea.' });

  // Step 6
  const C_TWIST_ARROW = choice({ id: 'twArrow', step: 'twist', answer: TWIST_CHANGED.map(a => a.id).join(','),
    prompt: 'Which arrow of the diagram changes?',
    options: ARROWS.map(a => [a.id, a.from + ' → ' + a.to, a.kind === 'arr' ? 'Cars still arrive ' + ARRIVAL_RATE + ' per hour. Power does not change arrivals.'
      : TWIST_CHANGED.some(x => x.id === a.id) ? 'Only when both ports are busy is the power shared. This is the only arrow that changes.'
      : 'With one car, that port has full power: still ' + PORT_RATE + ' per hour.']) });
  const TW = TWIST_CHANGED[0];
  const G_TWIST_RATE = group({ id: 'twRate', step: 'twist',
    prompt: 'Both ports busy, each at half speed. What is the new rate on the arrow ' + TW.from + ' → ' + TW.to + '?',
    fields: [{ id: 'v', short: 'New rate', label: 'new rate ' + TW.from + ' → ' + TW.to + ', per hour', answer: rval(arrowRate(TWIST, TW)), show: rstr(arrowRate(TWIST, TW)),
      diag: [[rval(rmul(R(PORT_RATE), TWIST_SPEED)), 'That is one port. Two ports, each at ' + rstr(rmul(R(PORT_RATE), TWIST_SPEED)) + ': add them.'],
        [rval(arrowRate(BASE, TW)), 'That was full speed. Now each port runs at half speed.']] }],
    hint: 'Per port: ' + PORT_RATE + ' × ' + rstr(TWIST_SPEED) + '. Then add both ports, as in step 2.',
    right: TW.from + ' busy ports × ' + rstr(rmul(R(PORT_RATE), TWIST_SPEED)) + ' per port = ' + rstr(arrowRate(TWIST, TW)) + ' per hour.' });
  const PREDICT = [
    { id: 'lost', label: 'Share of arriving cars turned away', before: BASE.lost, after: TWIST.lost,
      why: '“Both busy” now lasts ' + rstr(TWIST.stayMin[PORTS]) + ' minutes on average instead of ' + rstr(BASE.stayMin[PORTS]) + ', so more cars find the station full.' },
    { id: 'busy', label: 'Average number of busy ports', before: BASE.meanBusy, after: TWIST.meanBusy,
      why: 'Cars stay plugged in longer, so ports are busy more of the time.' },
    { id: 'served', label: 'Cars charged per hour', before: BASE.served, after: TWIST.served,
      why: 'Cars charged per hour = cars that get in = ' + ARRIVAL_RATE + ' × (1 − π<sub>2</sub>). More cars are turned away, so fewer are charged, even though the ports are busier.' }
  ];
  const DIRECTION_TEXT = { up: 'goes up', same: 'stays', down: 'goes down' };
  const direction = (a, b) => rval(b) > rval(a) ? 'up' : rval(b) < rval(a) ? 'down' : 'same';
  const SAME_AS_ERROR = STATES.every(k => rval(TWIST.pi[k]) === rval(ONE_CLOCK.pi[k]));

  // Step 1 prediction (asked just before the first car is turned away)
  const C_PREDICT = choice({ id: 'blockedNext', step: 'watch', answer: String(PORTS),
    prompt: '',
    options: [[String(PORTS - 1), String(PORTS - 1), 'An arrival never frees a port. Only a finished charge does.'],
      [String(PORTS), String(PORTS), 'There is no waiting space, so the car drives away. The number of busy ports stays ' + PORTS + '.'],
      [String(PORTS + 1), String(PORTS + 1), 'There are only ' + PORTS + ' ports and no waiting space. The car cannot stay.']] });

  // === STATE ===
  // The kit adds stage, status and helped. slotsShown marks the general form as given by "Show me".
  const fresh = () => ({ g: {}, c: {}, log: { k: 0, long: false }, names: {}, namesChecked: false, namesShown: false,
    slots: {}, slotSel: 'L', slotsChecked: false, slotsShown: false, tw: { pred: {}, checked: false, sim: false } });

  // === STEPS (built once per page with the kit's ctx) ===
  function build(ctx) {
    const { S, activity, track, finish, showMe, stepTitle } = ctx;

    // --- Generic parts: number groups and choices ---
    function gState(id) { if (!S.g[id]) S.g[id] = { v: {}, ok: {}, wrong: 0, msg: '', done: false, shown: false }; return S.g[id]; }
    const gDone = id => !!(S.g[id] && S.g[id].done);
    function cState(id) { if (!S.c[id]) S.c[id] = { pick: null, wrong: 0 }; return S.c[id]; }
    const cDone = id => !!(S.c[id] && S.c[id].pick === CHOICES[id].answer);
    function fieldHTML(G, f) {
      const st = gState(G.id), ok = !!st.ok[f.id];
      return '<input class="gk-num' + (ok ? ' ok' : st.wrong ? ' no' : '') + '" type="text" inputmode="text" autocomplete="off" data-g="' + G.id + '" data-f="' + f.id + '" value="' + escapeAttr(st.v[f.id] ?? '') + '"' + (ok ? ' disabled' : '') + ' aria-label="' + escapeAttr(f.label) + '" data-enter="check">';
    }
    function groupHTML(G, template) {
      const st = gState(G.id);
      const inner = template ? template(f => fieldHTML(G, f))
        : '<div class="gc-fields">' + G.fields.map(f => '<label class="gc-field"><span>' + f.label + '</span>' + fieldHTML(G, f) + '</label>').join('') + '</div>';
      return '<div class="gk-panel" data-group="' + G.id + '">' + (G.prompt ? '<p>' + G.prompt + '</p>' : '') + inner +
        (st.done ? '' : '<div class="gk-row">' + btn('data-do="check" data-g="' + G.id + '"', 'Check', ' primary') + (st.wrong ? btn('data-do="show" data-g="' + G.id + '"', 'Show me') : '') + '</div>') +
        (st.msg || '') + '</div>';
    }
    function diagnose(f, v) {
      if (f.diagFn) { const m = f.diagFn(v); if (m) return m; }
      const tol = Math.max(f.tol, TOL.diag);
      const hit = (f.diag || []).find(d => Math.abs(v - d[0]) <= tol);
      return hit ? hit[1] : null;
    }
    function checkGroup(G) {
      const st = gState(G.id);
      if (st.done) return;
      const vals = {};
      for (const f of G.fields) {
        if (st.ok[f.id]) continue;
        const v = parseNum(st.v[f.id] ?? '');
        if (Number.isNaN(v)) { st.msg = fb('no', 'Type a number in ' + (G.fields.length > 1 ? 'every box' : 'the box') + ', for example 2, 0.25 or 2/3.'); return; }
        vals[f.id] = v;
      }
      track('check');
      const notes = [];
      let unexplained = false;
      G.fields.forEach(f => {
        if (st.ok[f.id]) return;
        const v = vals[f.id];
        if (Math.abs(v - f.answer) <= f.tol) { st.ok[f.id] = true; return; }
        const d = diagnose(f, v);
        if (d) notes.push((G.fields.length > 1 ? '<b>' + f.short + '</b>: ' : '') + d); else unexplained = true;
      });
      if (G.fields.every(f => st.ok[f.id])) { st.done = true; st.msg = fb('ok', G.right); return; }
      st.wrong++;
      const allVals = Object.fromEntries(G.fields.map(f => [f.id, f.id in vals ? vals[f.id] : parseNum(st.v[f.id] ?? '')]));
      const extra = G.groupDiag ? G.groupDiag(allVals) : null;
      st.msg = fb('no', notes.concat(extra ? [extra] : [], unexplained ? [G.hint] : []).join('<br>'));
    }
    function showGroup(G) {
      const st = gState(G.id);
      G.fields.forEach(f => { st.v[f.id] = f.show; st.ok[f.id] = true; });
      st.done = true; st.shown = true;
      st.msg = fb('shown', G.right);
      showMe(G.step);
    }
    function choiceHTML(C) {
      const st = cState(C.id), done = st.pick === C.answer;
      const opt = C.options.find(o => o[0] === st.pick);
      return '<div class="gk-panel" data-choice="' + C.id + '">' + (C.prompt ? '<p>' + C.prompt + '</p>' : '') + '<div class="gk-row">' +
        C.options.map(o => btn('data-do="pick" data-c="' + C.id + '" data-v="' + o[0] + '"' + (done && o[0] !== C.answer ? ' disabled' : ''), o[1], st.pick === o[0] ? ' picked' : '')).join('') + '</div>' +
        (opt ? fb(done ? 'ok' : 'no', opt[2]) : '') + '</div>';
    }

    // --- Step completion ---
    const namesOk = () => NAME_ROWS.every(r => S.names[r.id] === r.answer);
    const slotsOk = () => Object.keys(SLOT_ANSWER).every(k => S.slots[k] === SLOT_ANSWER[k]);
    const COMPLETE = {
      watch: () => S.log.k > LOG.events.length && gDone('share') && S.log.long,
      clocks: () => ['rate2', 'stay2', 'stay1'].every(gDone),
      diagram: () => gDone('rates') && cDone('noArrow') && namesOk() && S.namesChecked,
      balance: () => EQ_GROUPS.every(G => gDone(G.id)) && slotsOk() && S.slotsChecked,
      solve: () => ['weights', 'pi', 'answers'].every(gDone),
      twist: () => cDone('twArrow') && gDone('twRate') && S.tw.checked
    };
    // WHY: a step can be completed by several actions (a check, a pick, Show me); the
    // conditions above are the single place that says when. finish() ignores repeats.
    const updateStatus = () => activity.steps.forEach(s => { if (!S.status[s.id] && COMPLETE[s.id]()) finish(s.id); });

    // --- Step 1: watch the station ---
    function logView(k) {
      const E = LOG.events.length, upto = Math.min(k, E);
      const ports = new Array(PORTS).fill(null), min = STATES.map(() => 0);
      let n = 0, prev = 0, arrived = 0, blocked = 0;
      for (let i = 0; i < upto; i++) {
        const e = LOG.events[i];
        min[n] += e.m - prev; prev = e.m;
        if (e.kind === 'arrive') { ports[e.port] = e.car; arrived++; }
        if (e.kind === 'blocked') { blocked++; arrived++; }
        if (e.kind === 'end') ports[e.port] = null;
        n = e.n;
      }
      const finished = k > E;
      if (finished) { min[n] += LOG_MINUTES - prev; prev = LOG_MINUTES; }
      return { clock: prev, n, ports, min, finished, arrived, blocked };
    }
    function eventText(e) {
      if (e.kind === 'arrive') return 'Car ' + e.car + ' arrives. Port ' + PORT_NAMES[e.port] + ' is free: it starts charging.';
      if (e.kind === 'blocked') return 'Car ' + e.car + ' arrives. Both ports are busy: it drives away.';
      return 'Port ' + PORT_NAMES[e.port] + ' finishes car ' + e.car + '. The car leaves.';
    }
    function longTable() {
      return '<div class="gc-tablewrap"><table class="gk-table"><tr><th>Busy ports</th>' + STATES.map(n => '<th>' + n + '</th>').join('') + '</tr>' +
        '<tr><td>Share of time, ' + big(LONG_HOURS) + ' hours</td>' + STATES.map(n => '<td>' + dec(LONG.share[n]) + '</td>').join('') + '</tr></table></div>' +
        '<p>Cars arrived: <b>' + big(LONG.arrivals) + '</b>. Turned away: <b>' + big(LONG.blocked) + '</b> (' + pct(LONG.blocked / LONG.arrivals) + '). Average number of busy ports: <b>' + dec(LONG.meanBusy) + '</b>.</p>';
    }
    function renderWatch() {
      const E = LOG.events.length, k = S.log.k, v = logView(k);
      let out = '<h2>' + stepTitle('watch') + '</h2>' +
        '<p>Here are the first two hours at the station, one event at a time. Press <b>Next event</b>. Watch the clock and the number of busy ports.</p>' +
        '<div class="gk-panel"><div class="gc-clockrow"><div class="gc-clock" aria-label="Clock">' + clock(v.clock) + '</div>' +
        '<div class="gc-ports">' + PORT_NAMES.map((p, i) => '<div class="gc-port' + (v.ports[i] ? ' busy' : '') + '"><b>Port ' + p + '</b>' + (v.ports[i] ? 'car ' + v.ports[i] + ' charging' : 'free') + '</div>').join('') + '</div>' +
        '<div class="gc-busy">Busy ports: <b id="gc-busy-now">' + v.n + '</b></div></div>';
      if (k === LOG.firstBlocked) {
        const e = LOG.events[k];
        out += '<p><b>Predict first.</b> At ' + clock(e.m) + ' car ' + e.car + ' arrives. Both ports are busy. How many ports are busy just after this event?</p>' + choiceHTML(C_PREDICT);
      }
      if (k <= E && (k !== LOG.firstBlocked || cDone('blockedNext'))) {
        out += '<div class="gk-row">' + btn('data-do="nextEvent"', k < E ? 'Next event' : 'Go to ' + clock(LOG_MINUTES), ' primary big') + '<span class="gk-small">' + Math.min(k, E) + ' of ' + E + ' events shown</span></div>';
      }
      const rows = LOG.events.slice(0, Math.min(k, E)).map((e, i) => '<tr class="' + (e.kind === 'blocked' ? 'blocked' : '') + (i === k - 1 ? ' latest' : '') + '"><td class="t">' + clock(e.m) + '</td><td class="what">' + eventText(e) + '</td><td class="n">' + e.n + '</td></tr>').join('') +
        (v.finished ? '<tr class="latest"><td class="t">' + clock(LOG_MINUTES) + '</td><td class="what">We stop watching.</td><td class="n">' + v.n + '</td></tr>' : '');
      out += k ? '<table class="gc-log"><tr><th>Time</th><th>What happened</th><th>Busy</th></tr>' + rows + '</table>' : '<p class="gk-small gk-muted">The event log appears here.</p>';
      const total = v.clock || 1;
      out += '<p class="gk-small"><b>Minutes spent in each state so far</b> (state = number of busy ports):</p><div class="gc-bars">' +
        STATES.map(n => '<span>' + busyWord(n) + '</span><span class="track"><span class="gc-bar" style="display:block;width:' + (100 * v.min[n] / total).toFixed(1) + '%"></span></span><span>' + v.min[n] + ' min</span>').join('') + '</div></div>';
      if (!v.finished) return out;
      out += '<p>In two hours ' + v.arrived + ' cars arrived and ' + v.blocked + ' ' + (v.blocked === 1 ? 'was' : 'were') + ' turned away. The station spent ' + STATES.map(n => '<b>' + v.min[n] + '</b> minutes with ' + busyWord(n)).join(', ') + '.</p>' + groupHTML(G_SHARE);
      if (!gDone('share')) return out;
      if (!S.log.long) return out + '<div class="gk-row">' + btn('data-do="longRun"', 'Run the same station for ' + big(LONG_HOURS) + ' hours', ' primary') + '</div>';
      return out + '<h3>The same station, ' + big(LONG_HOURS) + ' hours</h3>' + longTable() +
        fb('info', 'Over a long time the shares settle down. In this run ' + pct(LONG.share[PORTS]) + ' of the time both ports were busy, and about the same share of cars (' + pct(LONG.blocked / LONG.arrivals) + ') was turned away. Steps 3–5 find these numbers exactly, without a simulation.');
    }

    // --- Step 2: racing clocks ---
    function renderClocks() {
      const e = LOG.events[LOG.firstBoth], left = LOG.events[LOG.leftBoth];
      const endText = x => clock(x.m) + (x.m > LOG_MINUTES ? ' (after our two hours)' : '');
      let out = '<h2>' + stepTitle('clocks') + '</h2>' +
        '<div class="gk-panel"><p><b>From your log.</b> At ' + clock(e.m) + ' car ' + e.car + ' plugged in, so both ports were busy. Each car has its own charging time:</p><ul>' +
        e.ends.map((x, i) => '<li>Port ' + PORT_NAMES[i] + ', car ' + x.car + ': would finish at ' + endText(x) + '</li>').join('') + '</ul>' +
        '<p>The station left “both busy” at <b>' + clock(left.m) + '</b>, when the <b>first</b> of the two charges ended. Two clocks were racing; the first one to ring changed the state.</p></div>';
      out += groupHTML(GROUPS.rate2);
      if (!gDone('rate2')) return out;
      out += groupHTML(GROUPS.stay2);
      if (!gDone('stay2')) return out;
      out += groupHTML(GROUPS.stay1);
      if (!gDone('stay1')) return out;
      return out + '<h3>Check with the long run</h3><p>The ' + big(LONG_HOURS) + '-hour simulation only draws charging times and arrival times. It never uses these rates. Still:</p>' +
        '<div class="gc-tablewrap"><table class="gk-table"><tr><th>State (busy ports)</th>' + STATES.map(n => '<th>' + n + '</th>').join('') + '</tr>' +
        '<tr><td>Ways to leave</td>' + STATES.map(n => '<td>' + STATES.filter(j => j !== n && BASE.q[n][j].n).map(j => rstr(BASE.q[n][j])).join(' + ') + '</td>').join('') + '</tr>' +
        '<tr><td>Total rate out, per hour</td>' + STATES.map(n => '<td>' + rstr(BASE.qOut[n]) + '</td>').join('') + '</tr>' +
        '<tr><td>Mean stay, 60 ÷ rate (min)</td>' + STATES.map(n => '<td>' + rstr(BASE.stayMin[n]) + '</td>').join('') + '</tr>' +
        '<tr><td>Mean stay, simulation (min)</td>' + STATES.map(n => '<td>' + LONG.meanStayMin[n].toFixed(1) + '</td>').join('') + '</tr></table></div>' +
        '<p class="gk-small">Lecture: the time in a state is exponential with mean 1/q<sub>i</sub> (slide 10); q<sub>i</sub> is the sum of the rates out (slides 15–16). The two machines example adds two failure clocks the same way: q<sub>01</sub> = 1 + 1 = 2 (slide 25).</p>';
    }

    // --- Step 3: draw the rate diagram, then name the parts ---
    function renderDiagram() {
      const st = gState('rates');
      const labels = {};
      ARROWS.forEach(a => { if (st.ok[a.id]) labels[a.id] = rstr(arrowRate(BASE, a)); });
      let out = '<h2>' + stepTitle('diagram') + '</h2>' +
        '<p>The lecture draws a continuous-time chain as circles and arrows (slides 23 and 26). A circle is a state: here, the number of busy ports. An arrow is a possible jump, and its number is a <b>rate per hour</b>, not a probability.</p>' +
        diagramSVG({ labels }) + groupHTML(G_RATES);
      if (!gDone('rates')) return out;
      out += choiceHTML(C_BLOCKED_ARROW);
      if (!cDone('noArrow')) return out;
      const rows = NAME_ROWS.map(r => {
        const v = S.names[r.id] || '';
        const mark = S.namesChecked && v ? (v === r.answer ? '<span class="gc-good">✓</span>' : '<span class="gc-bad">✗</span>') : '<span></span>';
        return '<b>' + r.label + '</b><select data-name="' + r.id + '" aria-label="' + escapeAttr(r.label) + '"><option value="">choose…</option>' +
          NAME_OPTIONS.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' + mark;
      }).join('');
      out += '<h3>Name the parts</h3><p>You have used each of these already. Give each one its name from the lecture (slides 10, 15, 16).</p><div class="gk-names">' + rows + '</div>' +
        (namesOk() && S.namesChecked ? '' : '<div class="gk-row">' + btn('data-do="namesCheck"', 'Check names', ' primary') + (S.namesChecked && !namesOk() ? btn('data-do="namesShow"', 'Show me') : '') + '</div>');
      if (S.namesChecked) {
        const wrong = NAME_ROWS.filter(r => S.names[r.id] && S.names[r.id] !== r.answer), empty = NAME_ROWS.filter(r => !S.names[r.id]);
        out += namesOk() ? fb(S.namesShown ? 'shown' : 'ok', 'Each part now has its lecture name.')
          : fb('no', wrong.map(r => '<b>' + r.label + '</b>: ' + NAME_WHY[S.names[r.id]]).join('<br>') + (empty.length ? (wrong.length ? '<br>' : '') + 'Still empty: ' + empty.length + ' row(s).' : ''));
      }
      if (!namesOk() || !S.namesChecked) return out;
      return out + '<h3>The same numbers as a matrix</h3><p>The lecture also writes the rates as the transition rate matrix Q (slide 21): q<sub>ij</sub> off the diagonal, −q<sub>i</sub> on the diagonal, so every row adds to 0.</p>' + qMatrixHTML(BASE);
    }

    // --- Step 4: rate out = rate in ---
    function eqTemplate(G) {
      const j = G.j, others = STATES.filter(i => i !== j);
      return field => '<div class="gc-eq">' + field(G.fields[0]) + '<span>' + P(j) + ' =</span>' +
        others.map((i, k) => field(G.fields[k + 1]) + '<span>' + P(i) + (k < others.length - 1 ? ' +' : '') + '</span>').join('') + '</div>';
    }
    function renderBalance() {
      const current = EQ_GROUPS.find(G => !gDone(G.id));
      const lv = LONG;
      let out = '<h2>' + stepTitle('balance') + '</h2>' +
        '<p>Call <b>' + P('j') + '</b> the long-run share of time in state j, the numbers that settled down in step 1. The lecture calls them steady-state probabilities (slide 19).</p>' +
        '<div class="gk-panel"><p><b>Why “rate out = rate in”?</b> Look at state 0 in the ' + big(LONG_HOURS) + '-hour run. The station left state 0 <b>' + big(lv.leaves[0]) + '</b> times and entered it <b>' + big(lv.enters[0]) + '</b> times. Every exit needs an entry before it, so the two counts can differ by at most 1.</p>' +
        '<p>And the exit count is predictable: the station was in state 0 for ' + dec(lv.share[0]) + ' of ' + big(LONG_HOURS) + ' hours, and leaves at rate ' + rstr(BASE.qOut[0]) + ' per hour while there: ' + rstr(BASE.qOut[0]) + ' × ' + dec(lv.share[0]) + ' × ' + big(LONG_HOURS) + ' ≈ ' + big(Math.round(rval(BASE.qOut[0]) * lv.share[0] * LONG_HOURS)) + '.</p>' +
        '<p>So per hour: <b>(rate out of j) × ' + P('j') + ' = sum of (rate from i into j) × ' + P('i') + '</b>. One equation per state.</p></div>';
      const hl = {};
      if (current && current.level < 2) {
        ARROWS.forEach(a => { if (a.from === current.j) hl[a.id] = 'out'; else if (a.to === current.j) hl[a.id] = 'in'; });
      }
      out += diagramSVG({ labels: allLabels(BASE), hl, focus: current ? current.j : null });
      const doneEqs = EQ_GROUPS.filter(G => gDone(G.id));
      if (doneEqs.length) out += '<div class="gk-panel"><p><b>Your equations</b></p>' + doneEqs.map(G => '<p class="gc-done">State ' + G.j + ': ' + eqText(BASE, G.j) + (gState(G.id).shown ? ' <span class="gk-small">(shown)</span>' : '') + '</p>').join('') + '</div>';
      if (current) {
        const j = current.j, outs = ARROWS.filter(a => a.from === j), ins = ARROWS.filter(a => a.to === j);
        const support = current.level === 0
          ? '<p><b>Worked start.</b> Out of state ' + j + ': ' + outs.map(a => 'the arrow ' + a.from + ' → ' + a.to + ' (' + rstr(arrowRate(BASE, a)) + ')').join(' and ') + '. Into state ' + j + ': ' + ins.map(a => 'the arrow ' + a.from + ' → ' + a.to + ' (' + rstr(arrowRate(BASE, a)) + ')').join(' and ') + '. ' +
            STATES.filter(i => i !== j && BASE.q[i][j].n === 0).map(i => 'There is no arrow from ' + i + ' into ' + j + ', so its number is 0.').join(' ') + '</p>'
          : current.level === 1 ? '<p>The thick arrows are the ones you need: dark ones leave state ' + j + ', green ones enter it.</p>'
            : '<p>Now on your own: no highlights. Read the arrows of state ' + j + ' from the diagram.</p>';
        out += '<h3>Equation for state ' + j + '</h3>' + support + groupHTML(current, eqTemplate(current));
        out += '<p class="gk-small gk-muted">Equation ' + (EQ_GROUPS.indexOf(current) + 1) + ' of ' + EQ_GROUPS.length + '. The help gets lighter each time.</p>';
        return out;
      }
      const left = STATES.map(k => rstr(BASE.qOut[k]) + P(k)).join(' + ');
      const right = STATES.map(k => rstr(STATES.reduce((s, j) => j === k ? s : radd(s, BASE.q[k][j]), R(0))) + P(k)).join(' + ');
      out += fb('info', 'Add all three equations. Left sides: ' + left + '. Right sides: ' + right + '. They are the same, because every arrow appears once as “out” and once as “in”. So one equation is always extra. That is why step 5 needs one more fact: ' + P(0) + ' + ' + P(1) + ' + ' + P(2) + ' = 1.');
      const slot = id => {
        const v = S.slots[id], state = S.slotsChecked && v ? (v === SLOT_ANSWER[id] ? ' ok' : ' no') : '';
        return '<span class="gk-slot' + (S.slotSel === id ? ' sel' : '') + state + '" data-do="slot" data-slot="' + id + '" role="button" tabindex="0" title="' + SLOT_ROLE[id] + '">' + (v ? tileLabel(v) : '&nbsp;') + '</span>';
      };
      const used = new Set(Object.values(S.slots));
      out += '<h3>The lecture’s general form</h3><p>Slide 19 writes all these equations at once. Build it: click a box, then a tile. Click a filled box to empty it. Some tiles are traps.</p>' +
        '<div class="gk-formula">' + slot('L') + ' = Σ<sub>i ≠ j</sub> ' + slot('Rt') + ' &nbsp;<span class="gk-small">for every state j</span></div>' +
        '<p class="gk-small">Selected box: ' + SLOT_ROLE[S.slotSel] + '</p>' +
        '<div class="gk-bank">' + TILES.map(x => '<button class="gk-tile" data-do="tile" data-tile="' + x[0] + '"' + (used.has(x[0]) ? ' disabled' : '') + '>' + x[1] + '</button>').join('') + '</div>';
      if (!(S.slotsChecked && slotsOk())) out += '<div class="gk-row">' + btn('data-do="slotsCheck"', 'Check the equation', ' primary') + (S.slotsChecked && !slotsOk() ? btn('data-do="slotsShow"', 'Show me') : '') + '</div>';
      if (!S.slotsChecked) return out;
      if (slotsOk()) return out + fb(S.slotsShown ? 'shown' : 'ok', 'π<sub>j</sub> q<sub>j</sub> = Σ<sub>i≠j</sub> π<sub>i</sub> q<sub>ij</sub>: rate at which the process leaves j = rate at which it enters j (slide 19). For j = 1: ' + eqText(BASE, 1) + '.');
      return out + fb('no', Object.keys(SLOT_ANSWER).filter(id => S.slots[id] !== SLOT_ANSWER[id]).map(id => {
        const v = S.slots[id];
        return v ? '<b>' + tileLabel(v) + '</b>: ' + ((SLOT_WHY[id] || {})[v] || 'not this one. ' + SLOT_ROLE[id] + '.') : SLOT_ROLE[id] + ' (empty).';
      }).join('<br>'));
    }

    // --- Step 5: solve and read the answers ---
    function renderSolve() {
      let out = '<h2>' + stepTitle('solve') + '</h2><div class="gk-panel"><p><b>Your equations</b> (step 4):</p>' + STATES.map(j => '<p class="gc-done">' + eqText(BASE, j) + '</p>').join('') + '</div>' + groupHTML(GROUPS.weights);
      if (!gDone('weights')) return out;
      out += groupHTML(GROUPS.pi);
      if (!gDone('pi')) return out;
      out += groupHTML(GROUPS.answers);
      if (!gDone('answers')) return out;
      return out + '<h3>Exact answer against the simulation</h3><div class="gc-tablewrap"><table class="gk-table"><tr><th></th><th>Exact (balance equations)</th><th>Simulation, ' + big(LONG_HOURS) + ' h</th></tr>' +
        STATES.map(n => '<tr><td>Share of time, ' + busyWord(n) + '</td><td>' + rdec(BASE.pi[n]) + '</td><td>' + dec(LONG.share[n]) + '</td></tr>').join('') +
        '<tr><td>Average busy ports</td><td>' + rdec(BASE.meanBusy) + '</td><td>' + dec(LONG.meanBusy) + '</td></tr>' +
        '<tr><td>Share of cars turned away</td><td>' + rdec(BASE.lost) + '</td><td>' + dec(LONG.blocked / LONG.arrivals) + '</td></tr>' +
        '<tr><td>Cars charged per hour</td><td>' + rdec(BASE.served) + '</td><td>' + dec(LONG.served / LONG_HOURS) + '</td></tr></table></div>' +
        '<p>The simulation needed thousands of random events and is still a little off. The balance equations give the exact long-run numbers from four rates.</p>';
    }

    // --- Step 6: twist ---
    function renderTwist() {
      const tw = S.tw;
      let out = '<h2>' + stepTitle('twist') + '</h2>' +
        '<p><b>New rule:</b> the two ports share one power line. When <b>both</b> ports are busy, each port charges at <b>half speed</b>. A single car still charges at full speed. Everything else stays the same.</p>' +
        choiceHTML(C_TWIST_ARROW);
      if (!cDone('twArrow')) return out;
      out += groupHTML(G_TWIST_RATE);
      if (!gDone('twRate')) return out;
      const changedLabels = allLabels(BASE);
      TWIST_CHANGED.forEach(a => { changedLabels[a.id] = rstr(arrowRate(BASE, a)) + '→' + rstr(arrowRate(TWIST, a)); });
      out += diagramSVG({ labels: changedLabels, changed: TWIST_CHANGED.map(a => a.id) });
      const predRow = p => '<span>' + p.label + '</span><div class="gk-row">' + ['up', 'same', 'down'].map(d => btn('data-do="predict" data-p="' + p.id + '" data-v="' + d + '"' + (tw.checked ? ' disabled' : ''), DIRECTION_TEXT[d], tw.pred[p.id] === d ? ' picked' : '')).join('') + '</div>';
      out += '<h3>Predict, then check</h3><p>Before solving: what happens to each number?</p><div class="gc-pred">' + PREDICT.map(predRow).join('') + '</div>';
      const allPredicted = PREDICT.every(p => tw.pred[p.id]);
      if (!tw.checked) return out + '<div class="gk-row">' + btn('data-do="twistCheck"' + (allPredicted ? '' : ' disabled'), 'Check: solve the new model', ' primary') + (allPredicted ? '' : '<span class="gk-small">Make all three predictions first.</span>') + '</div>';
      out += '<div class="gk-panel"><p><b>New balance equations:</b> ' + STATES.map(j => eqText(TWIST, j)).join('; ') + '. New π = (' + STATES.map(k => rstr(TWIST.pi[k])).join(', ') + ').</p></div>' +
        '<div class="gc-tablewrap"><table class="gk-table"><tr><th></th><th>Before</th><th>Shared power</th><th>Your guess</th></tr>' +
        PREDICT.map(p => {
          const d = direction(p.before, p.after), ok = tw.pred[p.id] === d;
          return '<tr><td>' + p.label + '</td><td>' + rdec(p.before) + '</td><td>' + rdec(p.after) + '</td><td>' + (ok ? '<span class="gc-good">✓ ' : '<span class="gc-bad">✗ ') + tw.pred[p.id] + '</span></td></tr>';
        }).join('') + '</table></div>';
      const hits = PREDICT.filter(p => tw.pred[p.id] === direction(p.before, p.after)).length;
      out += fb(hits === PREDICT.length ? 'ok' : 'no', 'You predicted ' + hits + ' of ' + PREDICT.length + '.<br>' + PREDICT.map(p => '<b>' + p.label + '</b> ' + DIRECTION_TEXT[direction(p.before, p.after)] + '. ' + p.why).join('<br>'));
      if (SAME_AS_ERROR) out += '<p><b>Look back at step 3.</b> These are exactly the numbers you get if you write ' + rstr(ONE_CLOCK.q[PORTS][PORTS - 1]) + ' instead of ' + rstr(BASE.q[PORTS][PORTS - 1]) + ' on the arrow 2 → 1. Shared power makes two busy ports finish only as fast as one port at full speed.</p>';
      out += tw.sim
        ? '<h3>Simulation with shared power, ' + big(LONG_HOURS) + ' hours</h3><div class="gc-tablewrap"><table class="gk-table"><tr><th></th><th>Exact</th><th>Simulation</th></tr>' +
          STATES.map(n => '<tr><td>Share of time, ' + busyWord(n) + '</td><td>' + rdec(TWIST.pi[n]) + '</td><td>' + dec(TWIST_LONG.share[n]) + '</td></tr>').join('') +
          '<tr><td>Share of cars turned away</td><td>' + rdec(TWIST.lost) + '</td><td>' + dec(TWIST_LONG.blocked / TWIST_LONG.arrivals) + '</td></tr>' +
          '<tr><td>Cars charged per hour</td><td>' + rdec(TWIST.served) + '</td><td>' + dec(TWIST_LONG.served / LONG_HOURS) + '</td></tr></table></div>' +
          '<p class="gk-small">The simulation slows each charge down only while both ports are busy. It agrees with the new diagram.</p>'
        : '<div class="gk-row">' + btn('data-do="twistSim"', 'Check with a simulation (' + big(LONG_HOURS) + ' hours, shared power)') + '</div>';
      ctx.assembled();
      return out + summaryCard();
    }
    function modelLines() {
      return [
        'State: X(t) = number of busy ports at time t, S = {' + STATES.join(', ') + '}.',
        'Rates per hour: ' + ARROWS.map(a => 'q' + a.from + a.to + ' = ' + rstr(arrowRate(BASE, a))).join(', ') + '. A car that finds both ports busy drives away: no arrow.',
        'Total rate out q_i = ' + STATES.map(n => rstr(BASE.qOut[n])).join(', ') + '; mean stay 60/q_i = ' + STATES.map(n => rstr(BASE.stayMin[n])).join(', ') + ' minutes.',
        'Balance (rate out = rate in): ' + STATES.map(j => eqText(BASE, j).replace(/<\/?sub>/g, '')).join('; ') + '; π0 + π1 + π2 = 1.',
        'π = (' + STATES.map(k => rstr(BASE.pi[k])).join(', ') + '). Average busy ports = ' + rstr(BASE.meanBusy) + '. Share of cars turned away = π2 = ' + rstr(BASE.lost) + '.',
        'Shared power: q21 = ' + rstr(TWIST.q[PORTS][PORTS - 1]) + ', π = (' + STATES.map(k => rstr(TWIST.pi[k])).join(', ') + '), average busy ports ' + rstr(TWIST.meanBusy) + ', turned away ' + rstr(TWIST.lost) + ', cars charged per hour ' + rstr(BASE.served) + ' → ' + rstr(TWIST.served) + '.'
      ];
    }
    function summaryCard() {
      const helpedSteps = activity.steps.filter(s => S.status[s.id] === 'helped').map(s => s.title);
      return '<h3>Your model</h3><div class="gk-model" id="gc-model">' +
        '<p><b>State:</b> X(t) = number of busy ports at time t, S = {' + STATES.join(', ') + '}.</p>' +
        '<p><b>Rates per hour:</b> ' + ARROWS.map(a => qs(a.from, a.to) + ' = ' + rstr(arrowRate(BASE, a))).join(', ') + '. A car that finds both ports busy drives away: no arrow.</p>' +
        '<p><b>Balance (rate out = rate in):</b> ' + STATES.map(j => eqText(BASE, j)).join('; ') + '; π<sub>0</sub> + π<sub>1</sub> + π<sub>2</sub> = 1.</p>' +
        '<p><b>Answer:</b> π = (' + STATES.map(k => rstr(BASE.pi[k])).join(', ') + '). Average busy ports ' + rdec(BASE.meanBusy) + '. Share of cars turned away π<sub>2</sub> = ' + rdec(BASE.lost) + '.</p>' +
        '<p><b>Shared power:</b> ' + qs(PORTS, PORTS - 1) + ' = ' + rstr(TWIST.q[PORTS][PORTS - 1]) + ', π = (' + STATES.map(k => rstr(TWIST.pi[k])).join(', ') + '), turned away ' + rdec(TWIST.lost) + ', cars charged per hour ' + rstr(BASE.served) + ' → ' + rstr(TWIST.served) + '.</p></div>' +
        (helpedSteps.length ? '<p class="gk-small">Steps where you used “Show me”: ' + helpedSteps.join(', ') + '. Try those again later without help.</p>' : '<p class="gk-small">You did every step without “Show me”.</p>') +
        '<div class="gk-row">' + btn('id="guided-download" data-do="download"', 'Download my model') + '</div>';
    }
    const downloadLines = () => [activity.title, activity.family, '',
      ...activity.steps.map(s => s.title + ': ' + (S.status[s.id] === 'done' ? 'done' : S.status[s.id] === 'helped' ? 'done with Show me' : 'not finished')), '', 'MODEL', ...modelLines()];

    // --- Actions ---
    const ACTIONS = {
      nextEvent() { if (S.log.k <= LOG.events.length && !(S.log.k === LOG.firstBlocked && !cDone('blockedNext'))) S.log.k++; },
      longRun() { S.log.long = true; track('check'); },
      check(el) { checkGroup(GROUPS[el.dataset.g]); },
      show(el) { const G = GROUPS[el.dataset.g]; if (gState(G.id).wrong) showGroup(G); },
      pick(el) {
        const C = CHOICES[el.dataset.c], st = cState(C.id);
        if (st.pick === C.answer) return;
        st.pick = el.dataset.v; track('check');
        if (st.pick !== C.answer) st.wrong++;
      },
      namesCheck() { S.namesChecked = true; track('check'); },
      namesShow() { NAME_ROWS.forEach(r => { S.names[r.id] = r.answer; }); S.namesShown = true; S.namesChecked = true; showMe('diagram'); },
      slot(el) { const id = el.dataset.slot; delete S.slots[id]; S.slotSel = id; S.slotsChecked = false; },
      tile(el) {
        const target = S.slotSel && !S.slots[S.slotSel] ? S.slotSel : Object.keys(SLOT_ANSWER).find(s => !S.slots[s]);
        if (!target) return;
        S.slots[target] = el.dataset.tile; S.slotsChecked = false;
        S.slotSel = Object.keys(SLOT_ANSWER).find(s => !S.slots[s]) || target;
      },
      slotsCheck() { S.slotsChecked = true; track('check'); },
      slotsShow() { S.slots = Object.assign({}, SLOT_ANSWER); S.slotsChecked = true; S.slotsShown = true; showMe('balance'); },
      predict(el) { if (!S.tw.checked) S.tw.pred[el.dataset.p] = el.dataset.v; },
      twistCheck() { if (PREDICT.every(p => S.tw.pred[p.id])) { S.tw.checked = true; track('twist'); } },
      twistSim() { S.tw.sim = true; },
      download() { ctx.download(downloadLines()); return false; }
    };
    // Every action may complete a step, so each one is followed by the status update.
    const actions = Object.fromEntries(Object.entries(ACTIONS).map(([name, run]) => [name, el => { const result = run(el); updateStatus(); return result; }]));

    // --- What the kit shows ---
    return {
      dataCard: '<h3>The data (always here)</h3>' +
        '<ul><li>A charging station has <b>' + PORTS + ' ports</b>. There is <b>no waiting space</b>: a car that finds both ports busy drives away.</li>' +
        '<li>Cars arrive at random, on average <b>' + ARRIVAL_RATE + ' per hour</b> (a Poisson process; mean gap ' + MEAN_GAP_MIN + ' minutes).</li>' +
        '<li>A charge takes a random, exponential time, on average <b>' + MEAN_CHARGE_MIN + ' minutes</b>. So one busy port finishes at rate <b>' + PORT_RATE + ' per hour</b>.</li>' +
        '<li>Arrivals and charging times are independent.</li></ul>' +
        '<p><b>Questions:</b> in the long run, how many ports are busy on average? What share of arriving cars is turned away?</p>' +
        '<p class="gk-small gk-muted">This story is made up for practice. The lecture’s own examples of this kind are the barbershop (slides 22–24), two machines with one repairman (slides 25–26) and the visitors’ parking lot (slide 33).</p>',
      steps: { watch: renderWatch, clocks: renderClocks, diagram: renderDiagram, balance: renderBalance, solve: renderSolve, twist: renderTwist },
      actions,
      onInput(t) {
        if (t.dataset.g && t.dataset.f) gState(t.dataset.g).v[t.dataset.f] = t.value;
      },
      onChange(t) {
        if (!t.dataset.name) return false;
        S.names[t.dataset.name] = t.value; S.namesChecked = false;
        return true;
      }
    };
  }

  window.GUIDED_CUSTOM.charging = (app, opts) => window.GUIDED_KIT.mount(app, opts, { fresh, build });
})();
