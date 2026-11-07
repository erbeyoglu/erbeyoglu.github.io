/* Week 13 guided activity "support" (absorbing chains, absorption probabilities,
   mean first passage times): its own interactive flow instead of the generic step
   engine. Order: follow five tickets with seeded dice → pool many tickets (the
   status today is all that matters) → one day, then the same question, on the
   state diagram → solve the equations with fading help → name the parts and
   build the equations from tiles → twist (experts send tickets back) with
   predict-then-check. The frame (tabs, data card, progress, usage counts) is
   assets/guided-kit.js; guided.js loads this file and calls
   window.GUIDED_CUSTOM.support. The step ids and titles live in
   assets/guided-data.js. Every number on the page is computed from the
   transition table below. The story is invented for practice and says so on the
   page. Design note: docs/guided_redesign/support.md. */
(() => {
  'use strict';
  const { fb, btn, escapeHtml: escapeAttr, parseNumber: parseNum, close } = window.GUIDED_KIT;

  // === MODEL ===
  // The story's daily transition chances, in whole percent so that dice rolls 00-99 match them exactly.
  const ORDER = ['N', 'E', 'R', 'A'];
  const LONG = { N: 'New', E: 'Escalated', R: 'Resolved', A: 'Abandoned' };
  const CLOSED = ['R', 'A'];
  const BASE_PCT = { N: { N: 20, E: 30, R: 40, A: 10 }, E: { N: 0, E: 60, R: 20, A: 20 }, R: { R: 100 }, A: { A: 100 } };
  // Twist: an escalated ticket that is not closed today goes back to the first team (E -> N) with 20 %.
  const SEND_BACK_PCT = Object.assign({}, BASE_PCT, { E: { N: 20, E: 40, R: 20, A: 20 } });
  const pct = (P, i, j) => (P[i] && P[i][j]) || 0;
  const pText = (P, i, j) => String(pct(P, i, j) / 100);

  // --- exact fractions ---
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
  const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
  const qsub = (a, b) => Q(a.n * b.d - b.n * a.d, a.d * b.d);
  const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const qdiv = (a, b) => Q(a.n * b.d, a.d * b.n);
  const qv = a => a.n / a.d;
  const qt = a => a.d === 1 ? String(a.n) : a.n + '/' + a.d;
  const dec = (v, k = 4) => String(Math.round(v * 10 ** k) / 10 ** k);
  const both = a => qt(a) + (a.d === 1 ? '' : ' ≈ ' + dec(qv(a)));
  const pq = (P, i, j) => Q(pct(P, i, j), 100);

  // Solves x_i = b_i + sum over open j of p_ij x_j for the two open states N, E (Cramer's rule).
  function solveOpen(P, b) {
    const a11 = qsub(Q(1), pq(P, 'N', 'N')), a12 = Q(-pct(P, 'N', 'E'), 100);
    const a21 = Q(-pct(P, 'E', 'N'), 100), a22 = qsub(Q(1), pq(P, 'E', 'E'));
    const det = qsub(qmul(a11, a22), qmul(a12, a21));
    return { N: qdiv(qsub(qmul(b.N, a22), qmul(a12, b.E)), det), E: qdiv(qsub(qmul(a11, b.E), qmul(a21, b.N)), det) };
  }
  // f: chance of ever reaching R (slide 54 form). mu: expected days until first closed (slide 43 form, target C = R or A).
  function exact(P) {
    const f = solveOpen(P, { N: pq(P, 'N', 'R'), E: pq(P, 'E', 'R') });
    const mu = solveOpen(P, { N: Q(1), E: Q(1) });
    return { f, mu, fNA: qsub(Q(1), f.N) };
  }
  const BASE = exact(BASE_PCT), SENT = exact(SEND_BACK_PCT);

  // --- seeded dice ---
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const seedOf = (base, k) => (base ^ Math.imul(k + 1, 0x9E3779B1)) >>> 0;
  // WHY: seed 1356 gives five followed tickets with every kind of move (N->N, N->E, E->E, both endings); chosen by a search.
  const FOLLOW_SEED = 1356, POOL_SEED = 2026, TWIST_SEED = 4242;
  const FOLLOW_COUNT = 5, TYPE_DAYS_FOR = 3, POOL_MAX = 5000, POOL_NEEDED = 1000, TWIST_TICKETS = 2000;
  const MAX_DAYS = 1000;

  function ranges(P, i) {
    let acc = 0; const out = [];
    ORDER.forEach(j => { const p = pct(P, i, j); if (p > 0) { out.push({ to: j, lo: acc, hi: acc + p - 1 }); acc += p; } });
    return out;
  }
  const moveFrom = (P, i, roll) => ranges(P, i).find(r => roll >= r.lo && roll <= r.hi).to;
  function runTicket(P, seed) {
    const u = mulberry32(seed), path = ['N'], rolls = [];
    while (!CLOSED.includes(path[path.length - 1]) && rolls.length < MAX_DAYS) {
      const roll = Math.floor(u() * 100);
      rolls.push(roll); path.push(moveFrom(P, path[path.length - 1], roll));
    }
    return { path, rolls, days: rolls.length, end: path[path.length - 1] };
  }
  const followTicket = k => runTicket(BASE_PCT, seedOf(FOLLOW_SEED, k));
  const FOLLOWED = Array.from({ length: FOLLOW_COUNT }, (_, k) => followTicket(k));

  // Pools many tickets; also the groups used in step 2 ("old" tickets against new ones).
  const poolCache = {};
  function poolStats(P, n, seedBase) {
    const cacheKey = seedBase + ':' + n + ':' + JSON.stringify(P.E);
    if (poolCache[cacheKey]) return poolCache[cacheKey];
    const st = { n, resolved: 0, days: 0, hist: Array(11).fill(0), samples: [],
      g: { stillN: [0, 0], everE: [0, 0], waitedE: [0, 0] } };
    const every = Math.max(1, Math.floor(n / 300));
    for (let k = 0; k < n; k++) {
      const t = runTicket(P, seedOf(seedBase, k)), ok = t.end === 'R' ? 1 : 0;
      st.resolved += ok; st.days += t.days; st.hist[Math.min(t.days, 10)]++;
      const s = t.path.join('');
      if (t.path[1] === 'N') { st.g.stillN[0]++; st.g.stillN[1] += ok; }
      if (s.includes('E')) { st.g.everE[0]++; st.g.everE[1] += ok; }
      if (s.includes('EE')) { st.g.waitedE[0]++; st.g.waitedE[1] += ok; }
      if ((k + 1) % every === 0 || k === n - 1) st.samples.push([k + 1, st.resolved / (k + 1)]);
    }
    st.share = n ? st.resolved / n : 0; st.meanDays = n ? st.days / n : 0;
    return (poolCache[cacheKey] = st);
  }

  // === TEXT HELPERS ===
  // An answer within TOL is right; within CLOSE_TOL it gets "close, give three decimals".
  const TOL = 0.005, CLOSE_TOL = 0.03;
  const near = (a, b, tol = TOL) => close(a, b, tol);
  const fH = (i, j) => 'f<sub>' + i + j + '</sub>';
  const muH = i => 'μ<sub>' + i + 'C</sub>';
  const st = s => '<span class="gs-st ' + s + '">' + s + '</span>';
  const pathHTML = (path, rolls) => '<div class="gs-path">' + path.map((s, i) => (i ? '<span class="gs-arrow">→' + (rolls ? '<br>' + String(rolls[i - 1]).padStart(2, '0') : '') + '</span>' : '') + st(s)).join('') + '</div>';
  const share = (x, n) => n ? dec(x / n, 3) : '—';
  const RESOLVED = qv(BASE.f.N), DAYS = qv(BASE.mu.N);

  // === DIAGRAM (SVG) ===
  // The chain drawn as a state transition diagram (Week 11 slide 19; Week 13 slides 17-22 draw the machine example this way).
  const POS = { N: [122, 160], E: [300, 160], R: [480, 62], A: [480, 258] };
  const RN = 28;
  // WHY: the N -> A curve dips low so the two value chips under E (step 4) stay clear of it.
  const CURVE = { 'N>R': [262, -42], 'N>A': [262, 385] };
  const LOOP = { N: 180, E: -90, R: 0, A: 0 };
  function arcsOf(P) {
    const out = [];
    ORDER.forEach(i => ORDER.forEach(j => { if (pct(P, i, j) > 0) out.push({ from: i, to: j, label: pText(P, i, j) }); }));
    return out;
  }
  function diagramSVG(o) {
    const opt = Object.assign({ P: BASE_PCT, active: null, chips: {}, aria: 'State transition diagram of a ticket' }, o);
    const head = '<marker id="gs-ah" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--axis)"/></marker>' +
      '<marker id="gs-ah-hot" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--s1)"/></marker>';
    let arcs = '', labels = '', nodes = '';
    arcsOf(opt.P).forEach(a => {
      const hot = opt.active === a.from, cls = 'd-arc' + (hot ? ' hot' : '') + (opt.active && !hot ? ' dim' : '');
      const mk = hot ? 'url(#gs-ah-hot)' : 'url(#gs-ah)';
      const [x1, y1] = POS[a.from], [x2, y2] = POS[a.to];
      let d, lx, ly;
      if (a.from === a.to) {
        const th = LOOP[a.from] * Math.PI / 180, sp = 0.5, far = 100;
        const p = ang => [x1 + RN * Math.cos(ang), y1 + RN * Math.sin(ang)];
        const c = ang => [x1 + far * Math.cos(ang), y1 + far * Math.sin(ang)];
        const [sx, sy] = p(th - sp), [ex, ey] = p(th + sp), [c1x, c1y] = c(th - 0.75), [c2x, c2y] = c(th + 0.75);
        d = 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) + ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);
        lx = x1 + 84 * Math.cos(th); ly = y1 + 84 * Math.sin(th);
      } else if (CURVE[a.from + '>' + a.to]) {
        const [cx, cy] = CURVE[a.from + '>' + a.to];
        const u1 = Math.hypot(cx - x1, cy - y1), u2 = Math.hypot(x2 - cx, y2 - cy);
        const sx = x1 + (cx - x1) / u1 * RN, sy = y1 + (cy - y1) / u1 * RN;
        const ex = x2 - (x2 - cx) / u2 * (RN + 2), ey = y2 - (y2 - cy) / u2 * (RN + 2);
        d = 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) + ' Q' + cx + ',' + cy + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);
        lx = 0.25 * x1 + 0.5 * cx + 0.25 * x2; ly = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
      } else {
        const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
        d = 'M' + (x1 + ux * RN).toFixed(1) + ',' + (y1 + uy * RN).toFixed(1) + ' L' + (x2 - ux * (RN + 2)).toFixed(1) + ',' + (y2 - uy * (RN + 2)).toFixed(1);
        lx = (x1 + x2) / 2; ly = (y1 + y2) / 2;
      }
      arcs += '<path class="' + cls + '" d="' + d + '" marker-end="' + mk + '"/>';
      labels += '<g' + (opt.active && !hot ? ' opacity=".4"' : '') + '><rect class="d-pill" x="' + (lx - 22).toFixed(1) + '" y="' + (ly - 12).toFixed(1) + '" width="44" height="24" rx="12"/>' +
        '<text class="d-lab' + (hot ? ' hot' : '') + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">' + a.label + '</text></g>';
    });
    // Names and value chips: below N, E, R; above A (A sits at the bottom edge).
    // WHY: chips sit 32 units past the name so they stay apart when the phone CSS enlarges the SVG text.
    const NAME_DY = { N: 48, E: 48, R: 48, A: -40 }, CHIP_DY = { N: 80, E: 80, R: 80, A: -76 };
    ORDER.forEach(s => {
      const [x, y] = POS[s];
      nodes += '<g class="d-node ' + s + (opt.active === s ? ' active' : '') + '" aria-label="' + LONG[s] + '"><circle cx="' + x + '" cy="' + y + '" r="' + RN + '"/><text x="' + x + '" y="' + y + '">' + s + '</text></g>' +
        '<text class="d-name" x="' + x + '" y="' + (y + NAME_DY[s]) + '">' + LONG[s] + '</text>';
      // A chip is one line or a list of lines, stacked away from the node.
      [].concat(opt.chips[s] || []).filter(Boolean).forEach((line, i) => {
        const w = Math.max(54, line.replace(/<[^>]+>/g, '').length * 11 + 16), cy = y + CHIP_DY[s] + i * 30 * Math.sign(CHIP_DY[s]);
        nodes += '<g class="d-chip"><rect x="' + (x - w / 2).toFixed(1) + '" y="' + (cy - 13) + '" width="' + w.toFixed(1) + '" height="26" rx="8"/><text x="' + x + '" y="' + cy + '">' + line + '</text></g>';
      });
    });
    return '<div class="gs-diagram"><svg viewBox="0 0 600 340" role="img" aria-label="' + opt.aria + '"><defs>' + head + '</defs>' + arcs + labels + nodes + '</svg></div>' +
      '<p class="gk-legend">Circle = status at the end of a day. Arrow = what can happen by the end of the next day, with its chance.</p>';
  }

  // === CHARTS (SVG) ===
  function shareChart(stats, guess, exactValue) {
    // WHY: the line labels sit in a right margin so they never cover the blue line.
    const W = 600, H = 230, L = 52, R = 112, T = 14, B = 40, n = Math.max(1, stats.n);
    const x = k => L + (W - L - R) * k / n, y = v => T + (H - T - B) * (1 - v);
    let g = '';
    [0, 0.25, 0.5, 0.75, 1].forEach(v => { g += '<line class="c-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="c-text" x="' + (L - 8) + '" y="' + (y(v) + 5) + '" text-anchor="end">' + v + '</text>'; });
    g += '<line class="c-axis" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    g += '<text class="c-text" x="' + L + '" y="' + (H - 12) + '">0</text><text class="c-text" x="' + (W - R) + '" y="' + (H - 12) + '" text-anchor="end">' + stats.n + ' tickets</text>';
    const exactY = exactValue === null ? null : y(exactValue);
    let guessLabelY = guess === null ? null : y(guess) + 5;
    if (guess !== null && exactY !== null && Math.abs(guessLabelY - (exactY + 5)) < 20) guessLabelY = exactY + 5 + (y(guess) >= exactY ? 20 : -20);
    if (guess !== null) g += '<line class="c-guess" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(guess) + '" y2="' + y(guess) + '"/><text class="c-text" x="' + (W - R + 6) + '" y="' + guessLabelY + '" style="fill:var(--s5)">your guess</text>';
    if (exactValue !== null) g += '<line class="c-exact" x1="' + L + '" x2="' + (W - R) + '" y1="' + exactY + '" y2="' + exactY + '"/><text class="c-text" x="' + (W - R + 6) + '" y="' + (exactY + 5) + '" style="fill:var(--s2)">exact</text>';
    const pts = stats.samples.map(p => x(p[0]).toFixed(1) + ',' + y(p[1]).toFixed(1)).join(' ');
    return '<div class="gs-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Share of tickets resolved, after each new ticket">' + g + '<polyline class="c-line" points="' + pts + '"/></svg></div>';
  }
  function daysHistogram(stats) {
    const W = 600, H = 190, L = 14, R = 14, T = 30, B = 36, max = Math.max(1, ...stats.hist.slice(1));
    const bw = (W - L - R) / 10;
    let g = '';
    for (let d = 1; d <= 10; d++) {
      const h = (H - T - B) * stats.hist[d] / max, x0 = L + (d - 1) * bw;
      g += '<rect class="c-bar" x="' + (x0 + 4).toFixed(1) + '" y="' + (H - B - h).toFixed(1) + '" width="' + (bw - 8).toFixed(1) + '" height="' + h.toFixed(1) + '"/>' +
        '<text class="c-text" x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (H - B - h - 4).toFixed(1) + '" text-anchor="middle">' + stats.hist[d] + '</text>' +
        '<text class="c-text" x="' + (x0 + bw / 2).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle">' + (d === 10 ? '10+' : d) + '</text>';
    }
    return '<div class="gs-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="How many tickets took 1, 2, 3, ... days to close">' + g + '</svg></div>';
  }

  // === STEP CONTENT (fixed data per step) ===
  // One question engine for steps 3, 4 and the twist extra.
  // kinds: num (typed number, diagnosed by value), choice (buttons), arrows (one select per arrow).
  const num = (id, prompt, answer, diag, hint, right, extra = {}) => Object.assign({ id, kind: 'num', prompt, answer, diag, hint, right }, extra);
  const choice = (id, prompt, options, answer, right) => ({ id, kind: 'choice', prompt, options, answer, right });
  const fNum = qv(BASE.f.N), fE = qv(BASE.f.E), muE = qv(BASE.mu.E), muN = qv(BASE.mu.N);
  const p = (i, j) => pct(BASE_PCT, i, j) / 100;

  const PICTURE_QS = [
    num('eR', 'Look at <b>E</b> (ringed). Tomorrow the ticket takes the arrow <b>E → R</b>. From then on, what is the chance that it is resolved?', 1,
      [[p('E', 'R'), p('E', 'R') + ' is the chance of <i>taking</i> this arrow. Here we already know it took it. Once in R, it is resolved for sure.'], [0, 'R means resolved. Once it is in R, the ticket is resolved for sure.']],
      'Where does the arrow end? What does that status mean?', 'In R the ticket is resolved for sure: chance 1.'),
    num('eA', 'Tomorrow the ticket takes the arrow <b>E → A</b> instead. Now what is the chance that it is <b>ever</b> resolved?', 0,
      [[1, 'A is closed, but abandoned is not resolved. And A never changes again (it stays A with chance 1).'], [p('E', 'A'), p('E', 'A') + ' is the chance of taking the arrow. Once in A, can it still become resolved?']],
      'Can an abandoned ticket become resolved later?', 'In A the ticket can never be resolved: chance 0.'),
    choice('eE', 'Tomorrow the ticket takes the arrow <b>E → E</b>: it waits one more day in E. From then on, its chance of being resolved is …',
      [['zero', '0: it was not resolved today', 'It is still open. It can be resolved on a later day.'],
        ['same', 'the same as for any ticket that is in E now', ''],
        ['higher', 'higher: it has waited, so it is closer to the end', 'In this story the chances do not depend on how long a ticket has waited. Step 2 showed it: tickets that waited in E did as well as tickets just escalated.']],
      'same', 'The chance from E is the same whenever a ticket is in E. We call it ' + fH('E', 'R') + ': the chance of ever reaching R, starting in E.'),
    num('dR', 'Now count <b>days</b>. Tomorrow the ticket takes <b>E → R</b>. After it lands in R, how many <b>more</b> days does it need until it is closed?', 0,
      [[1, 'It is closed the moment it lands in R. The day of the move itself is counted once, separately (that is the 1 in front).']],
      'Is a ticket in R still open?', 'A ticket in R (or A) is already closed: 0 more days. Only the day of the move counts.'),
    choice('dE', 'Tomorrow the ticket takes <b>E → E</b>. Days from today = 1 (tomorrow) + the days it still needs from E. On average, those are …',
      [['zero', '0', 'It is still open, so it still needs days.'],
        ['one', 'exactly 1 more day', 'Maybe, maybe more: it can wait many days in E. On average it needs as many days as any ticket in E.'],
        ['same', 'the same as for any ticket in E now', '']],
      'same', 'From E again, it needs on average the same number of days as any ticket in E. We call it ' + muH('E') + ': the expected days until the ticket is closed (C = closed = R or A).')
  ];
  // N's four arrows: which "chance of being resolved" waits at the end of each arrow?
  const N_ARROWS = { id: 'nArrows', kind: 'arrows',
    rows: [['N', 'fNR'], ['E', 'fER'], ['R', 'one'], ['A', 'zero']],
    options: [['one', '1'], ['zero', '0'], ['fNR', 'f_NR (chance from N)'], ['fER', 'f_ER (chance from E)']],
    why: (to, v) => ({
      N: { zero: 'Staying N is not failure. Step 2: a ticket still N after one day did as well as a new one. Its chance is f_NR again.', fER: 'The ticket stayed in N, not E.', one: 'Staying N does not mean it will surely be resolved.' },
      E: { fNR: 'After this arrow the ticket is in E. Use the chance from E.', zero: 'An escalated ticket can still be resolved.', one: 'An escalated ticket is not resolved for sure.' },
      R: { zero: 'R is resolved: chance 1.', fNR: 'In R it is already resolved: chance 1.', fER: 'In R it is already resolved: chance 1.' },
      A: { one: 'A is closed, but not resolved: chance 0.', fNR: 'In A it can never be resolved: chance 0.', fER: 'In A it can never be resolved: chance 0.' }
    }[to] || {})[v] || 'Not this one.' };

  const eqE_f = () => fH('E', 'R') + ' = ' + p('E', 'E') + ' · ' + fH('E', 'R') + ' + ' + p('E', 'R') + ' · 1 + ' + p('E', 'A') + ' · 0';
  const eqN_f = () => fH('N', 'R') + ' = ' + p('N', 'N') + ' · ' + fH('N', 'R') + ' + ' + p('N', 'E') + ' · ' + fH('E', 'R') + ' + ' + p('N', 'R') + ' · 1 + ' + p('N', 'A') + ' · 0';
  const eqE_mu = () => muH('E') + ' = 1 + ' + p('E', 'E') + ' · ' + muH('E');
  const eqN_mu = () => muH('N') + ' = 1 + ' + p('N', 'N') + ' · ' + muH('N') + ' + ' + p('N', 'E') + ' · ' + muH('E');

  // Step 4: support fades from a worked rearrangement to "write it yourself".
  const SOLVE_QS = [
    num('sfE', 'Start with E: <div class="gs-eq">' + eqE_f() + '</div>Move the ' + fH('E', 'R') + ' terms to the left: (1 − ' + p('E', 'E') + ') · ' + fH('E', 'R') + ' = ' + p('E', 'R') + '. So ' + fH('E', 'R') + ' = ?', fE,
      [[p('E', 'R'), 'That is only tomorrow\'s chance. A ticket that waits in E can still be resolved later: that is the ' + p('E', 'E') + ' · ' + fH('E', 'R') + ' term.'],
        [(p('E', 'R') + p('E', 'A')) / (1 - p('E', 'E')), 'You counted A as resolved. A is closed, but not resolved: it gets 0.'],
        [p('E', 'R') / p('E', 'E'), 'Divide by 1 − ' + p('E', 'E') + ' = ' + dec(1 - p('E', 'E')) + ' (the chance to leave E), not by ' + p('E', 'E') + '.']],
      'Divide ' + p('E', 'R') + ' by ' + dec(1 - p('E', 'E')) + '.', fH('E', 'R') + ' = ' + p('E', 'R') + ' / ' + dec(1 - p('E', 'E')) + ' = ' + both(BASE.f.E) + '.'),
    num('sfN', 'Now N. Use ' + fH('E', 'R') + ' = ' + qt(BASE.f.E) + ':<div class="gs-eq">' + eqN_f() + '</div>' + fH('N', 'R') + ' = ? (a fraction like 3/8 is fine)', fNum,
      [[p('N', 'R'), 'That is only the first day. Tickets that stay N or go to E can still be resolved later.'],
        [p('N', 'R') + p('N', 'E') * fE, 'Almost: you left out the ' + p('N', 'N') + ' · ' + fH('N', 'R') + ' term. Move it to the left and divide by 1 − ' + p('N', 'N') + '.'],
        [p('N', 'R') / (1 - p('N', 'N')), 'You left out the route through E: ' + p('N', 'E') + ' · ' + fH('E', 'R') + ' = ' + dec(p('N', 'E') * fE) + '.'],
        [(p('N', 'R') + p('N', 'E')) / (1 - p('N', 'N')), 'You used ' + fH('E', 'R') + ' = 1. An escalated ticket is resolved only with chance ' + qt(BASE.f.E) + '.'],
        [1, 'You counted A as resolved. Then every ticket would be "resolved".']],
      'Move ' + p('N', 'N') + ' · ' + fH('N', 'R') + ' to the left: (1 − ' + p('N', 'N') + ') · ' + fH('N', 'R') + ' = ' + p('N', 'R') + ' + ' + p('N', 'E') + ' · ' + qt(BASE.f.E) + '.',
      fH('N', 'R') + ' = (' + p('N', 'R') + ' + ' + p('N', 'E') + ' · ' + qt(BASE.f.E) + ') / ' + dec(1 - p('N', 'N')) + ' = ' + both(BASE.f.N) + '.'),
    num('sfA', 'Every ticket is closed some day: in R or in A. So what is the chance that a new ticket ends <b>abandoned</b>, ' + fH('N', 'A') + '?', qv(BASE.fNA),
      [[p('N', 'A'), 'That is only the first day. Tickets can also be abandoned later, after waiting or after escalation.'], [fNum, 'That is the chance to be resolved.']],
      'Resolved or abandoned: the two chances add up to 1.', fH('N', 'A') + ' = 1 − ' + qt(BASE.f.N) + ' = ' + both(BASE.fNA) + '.'),
    num('smE', 'Now the days. From E:<div class="gs-eq">' + eqE_mu() + '</div>(The arrows to R and A add nothing more: the ticket is closed there.) ' + muH('E') + ' = ?', muE,
      [[0, 'Without the 1 no day is ever counted: μ = ' + p('E', 'E') + ' μ gives 0. Every day in E is one day.'],
        [1, 'That is only tomorrow. The ticket can wait more days in E.'],
        [1 / p('E', 'E'), 'Divide by 1 − ' + p('E', 'E') + ' = ' + dec(1 - p('E', 'E')) + ', not by ' + p('E', 'E') + '.'],
        [p('E', 'E') / (1 - p('E', 'E')), 'You forgot the day on which the ticket leaves E. Keep the 1.'],
        [(1 + p('E', 'R') + p('E', 'A')) / (1 - p('E', 'E')), 'You gave R and A one more day each. A closed ticket needs 0 more days.']],
      '(1 − ' + p('E', 'E') + ') · ' + muH('E') + ' = 1.', muH('E') + ' = 1 / ' + dec(1 - p('E', 'E')) + ' = ' + both(BASE.mu.E) + ' days.'),
    num('smN', 'Last one, on your own: write the days equation for <b>N</b> from its four arrows, then solve it. Use ' + muH('E') + ' = ' + qt(BASE.mu.E) + '. ' + muH('N') + ' = ?', muN,
      [[p('N', 'E') * muE / (1 - p('N', 'N')), 'You forgot the 1: tomorrow itself is one day.'],
        [1 + p('N', 'E') * muE, 'Almost: you left out ' + p('N', 'N') + ' · ' + muH('N') + '. Move it to the left and divide by 1 − ' + p('N', 'N') + '.'],
        [1 / (1 - p('N', 'N')), 'You left out the route through E: + ' + p('N', 'E') + ' · ' + muH('E') + '.'],
        [(1 + p('N', 'E') * muE + p('N', 'R') + p('N', 'A')) / (1 - p('N', 'N')), 'You gave R and A one more day. A closed ticket needs 0 more days.'],
        [muN + 1, 'One day too many: did you count the arrival day too? Count only the moves.']],
      'Start with 1 for tomorrow. Then add (chance of the arrow) × (days from where it lands) for the arrows that stay open: N → N and N → E.',
      muH('N') + ' = (1 + ' + p('N', 'E') + ' · ' + qt(BASE.mu.E) + ') / ' + dec(1 - p('N', 'N')) + ' = ' + both(BASE.mu.N) + ' days.',
      { fullHint: () => 'Here is the equation: <div class="gs-eq">' + eqN_mu() + '</div>Move ' + p('N', 'N') + ' · ' + muH('N') + ' to the left.' })
  ];

  const NAME_ROWS = [
    { id: 'trans', label: 'N and E', answer: 'transient' },
    { id: 'abs', label: 'R and A', answer: 'absorbing' },
    { id: 'fpt', label: 'The number of days until one ticket is first closed', answer: 'fpt' },
    { id: 'fnr', label: fH('N', 'R') + ' = ' + qt(BASE.f.N), answer: 'absprob' },
    { id: 'mu', label: muH('N') + ' = ' + qt(BASE.mu.N), answer: 'mfpt' }
  ];
  const NAME_OPTIONS = [
    ['pi', 'steady-state probability π'],
    ['transient', 'transient states'],
    ['mfpt', 'mean first passage time, N to closed'],
    ['absorbing', 'absorbing states (p = 1 to stay)'],
    ['nstep', 'n-step probability p(n)'],
    ['absprob', 'absorption probability in R, from N'],
    ['fpt', 'first passage time (a random number)']
  ];
  const NAME_WHY = {
    pi: 'π is a long-run share of time (slides 4–6). Here the question is "ever", and the long run depends on where a ticket starts.',
    nstep: 'p(n) is the chance to be in a state on exactly day n (Week 11). We ask about ever, or about the first time.',
    transient: 'Tickets leave N and E for good at some point; R and A are never left.',
    absorbing: 'A ticket can leave N and E. Absorbing states are never left.',
    mfpt: 'That is an average over many tickets. For one ticket the number of days is random.',
    fpt: 'For one ticket it is random (your five tickets took different numbers of days). Its average has another name.',
    absprob: 'That is a chance (between 0 and 1), not a number of days.'
  };

  const TILES = [['fjR', 'f<sub>jR</sub>'], ['fiR', 'f<sub>iR</sub>'], ['pjR', 'p<sub>jR</sub>'], ['one', '1'], ['zero', '0'], ['one2', '1'],
    ['mukC', 'μ<sub>kC</sub>'], ['muiC', 'μ<sub>iC</sub>'], ['pij', 'π<sub>j</sub>']];
  const SLOT_ANSWER = { s1: ['fjR'], s2: ['one', 'one2'], s3: ['zero'], s4: ['one', 'one2'], s5: ['mukC'] };
  const SLOT_ROLE = { s1: 'Chance of being resolved from where the arrow lands', s2: 'Chance from R itself', s3: 'Chance from A itself',
    s4: 'What does tomorrow itself count?', s5: 'Expected days from where the arrow lands' };
  const SLOT_WHY = {
    s1: { fiR: 'Use the chance from where the arrow lands (j), not where it starts (i).', pjR: 'p<sub>jR</sub> is a one-day chance. After landing in j the ticket may need many days: use f<sub>jR</sub>.', pij: 'π is a long-run share of time, not a chance of ever reaching R.' },
    s2: { zero: 'In R the ticket is already resolved: chance 1.' },
    s3: { one: 'A is closed, but not resolved, and A never changes: 0.', one2: 'A is closed, but not resolved, and A never changes: 0.' },
    s4: { zero: 'Without it, no day is ever counted (μ = 0.6 μ would give 0).' },
    s5: { muiC: 'Use the days from where the arrow lands (k).', fjR: 'That is a chance, not a number of days.' }
  };
  const tileLabel = id => (TILES.find(x => x[0] === id) || [null, ''])[1];
  const slotOk = (id, v) => SLOT_ANSWER[id].includes(v);

  const PIECES = [
    ['row', 'The E row of the table', ''],
    ['bound', 'The end values f<sub>RR</sub> = 1, f<sub>AR</sub> = 0', 'R and A still mean resolved and abandoned, and they are still never left. These stay.'],
    ['plus1', 'The 1 in the days equation', 'Each day still counts as one day.'],
    ['states', 'The list of states', 'The statuses are still N, E, R, A.']
  ];

  // Twist numbers (all computed from SEND_BACK_PCT).
  const dir = (a, b) => near(a, b, 1e-12) ? 'same' : b > a ? 'up' : 'down';
  const TWIST_DIR = { f: dir(qv(BASE.f.N), qv(SENT.f.N)), m: dir(qv(BASE.mu.N), qv(SENT.mu.N)) };
  const DIR_TEXT = { up: 'goes up', same: 'stays the same', down: 'goes down' };
  const sp = (i, j) => pct(SEND_BACK_PCT, i, j) / 100;
  const TWIST_Q = num('xfN', 'Extra (about 2 minutes): now the two chances depend on each other.<div class="gs-eq">' + fH('N', 'R') + ' = ' + sp('N', 'N') + ' · ' + fH('N', 'R') + ' + ' + sp('N', 'E') + ' · ' + fH('E', 'R') + ' + ' + sp('N', 'R') + '</div><div class="gs-eq">' +
    fH('E', 'R') + ' = ' + sp('E', 'N') + ' · ' + fH('N', 'R') + ' + ' + sp('E', 'E') + ' · ' + fH('E', 'R') + ' + ' + sp('E', 'R') + '</div>Solve them. ' + fH('N', 'R') + ' = ?', qv(SENT.f.N),
    [[fNum, 'That is the old answer. ' + fH('E', 'R') + ' changed too, so ' + fH('N', 'R') + ' changes.'],
      [(sp('N', 'R') + sp('N', 'E') * fE) / (1 - sp('N', 'N')), 'You used the old ' + fH('E', 'R') + ' = ' + qt(BASE.f.E) + '. Solve the E equation again: it now contains ' + fH('N', 'R') + '.']],
    'From the second equation: ' + fH('E', 'R') + ' = (' + sp('E', 'R') + ' + ' + sp('E', 'N') + ' · ' + fH('N', 'R') + ') / ' + dec(1 - sp('E', 'E')) + '. Put this into the first one.',
    fH('N', 'R') + ' = ' + both(SENT.f.N) + ', and ' + fH('E', 'R') + ' = ' + both(SENT.f.E) + '.');

  // === STATE ===
  // The kit adds stage, status and helped.
  const fresh = () => ({
    follow: { k: 0, rolls: 0, typed: {} }, guess: '', guessSet: null,
    pool: 0, oldNew: { pick: null, checked: false },
    q: {}, lastOk: null, names: {}, namesChecked: false, slots: {}, slotSel: 's1', slotsChecked: false,
    twist: { piece: null, pf: null, pm: null, checked: false }
  });

  // === STEPS (built once per page with the kit's ctx) ===
  function build(ctx) {
    const { S, activity, track, finish, showMe } = ctx;
    const title = id => ctx.stepTitle(id);
    const qs = id => (S.q[id] = S.q[id] || { v: '', ok: false, wrong: 0, msg: null, sel: {} });
    const allOk = list => list.every(q => qs(q.id).ok);
    const LISTS = { picture: PICTURE_QS.concat([N_ARROWS]), solve: SOLVE_QS };
    const findQ = (stepId, id) => (stepId === 'twist' ? [TWIST_Q] : LISTS[stepId]).find(q => q.id === id);

    // --- generic question rendering and checking ---
    function renderQ(q, stepId) {
      const s = qs(q.id), here = 'data-q="' + q.id + '" data-step="' + stepId + '"';
      const checkRow = () => s.ok ? '' : btn('data-do="qCheck" ' + here, 'Check', ' primary') + (s.wrong ? btn('data-do="qShow" ' + here, 'Show me') : '');
      let out = '<div class="gk-panel"><p>' + q.prompt + '</p>';
      if (q.kind === 'num') {
        out += '<div class="gk-row"><input class="gk-num' + (s.ok ? ' ok' : s.wrong ? ' no' : '') + '" type="text" inputmode="text" autocomplete="off" data-qin="' + q.id + '" ' + here + ' data-enter="qCheck" value="' + escapeAttr(s.v) + '" aria-label="Your answer"' + (s.ok ? ' disabled' : '') + '>' +
          checkRow() + '</div>';
      } else if (q.kind === 'choice') {
        out += '<div class="gk-row">' + q.options.map(o => btn('data-do="qPick" ' + here + ' data-v="' + o[0] + '"' + (s.ok ? ' disabled' : ''), o[1], s.v === o[0] ? ' picked' : '')).join('') + '</div>';
      } else if (q.kind === 'arrows') {
        out += '<div class="gs-arrows">' + q.rows.map(([to]) => {
          const v = s.sel[to] || '', mark = s.wrong || s.ok ? (v && v === q.rows.find(r => r[0] === to)[1] ? '<span style="color:var(--good)">✓</span>' : v ? '<span style="color:var(--critical)">✗</span>' : '') : '';
          return '<span class="lab">Arrow N → ' + to + ' (' + pText(BASE_PCT, 'N', to) + ') lands on</span><select data-arrow="' + to + '" aria-label="Value at the end of arrow N to ' + to + '"' + (s.ok ? ' disabled' : '') + '><option value="">choose…</option>' +
            q.options.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select><span>' + mark + '</span>';
        }).join('') + '</div>' + (s.ok ? '' : '<div class="gk-row">' + checkRow() + '</div>');
      }
      return out + (s.msg || '') + '</div>';
    }
    function checkQ(q, stepId, list) {
      const s = qs(q.id);
      if (q.kind === 'num') {
        const v = parseNum(s.v);
        if (Number.isNaN(v)) { s.msg = fb('no', 'Type a number, for example 0.25 or 3/8.'); return; }
        track('check');
        if (near(v, q.answer)) { s.ok = true; S.lastOk = q.id; s.msg = fb('ok', q.right); }
        else {
          s.wrong++;
          const d = q.diag.find(([val]) => near(v, val));
          const almost = near(v, q.answer, CLOSE_TOL) ? 'Close, but not exact. Give three decimals, or a fraction like 11/16.' : null;
          s.msg = fb('no', d ? d[1] : almost || (s.wrong >= 2 && q.fullHint ? q.fullHint() : q.hint));
        }
      } else if (q.kind === 'arrows') {
        track('check');
        const bad = q.rows.filter(([to, want]) => s.sel[to] !== want);
        if (!bad.length) { s.ok = true; S.lastOk = q.id; s.msg = fb('ok', 'Each arrow ends where the same question starts again.'); }
        else { s.wrong++; s.msg = fb('no', bad.map(([to]) => '<b>N → ' + to + '</b>: ' + (s.sel[to] ? q.why(to, s.sel[to]) : 'still empty.')).join('<br>')); }
      }
      // WHY: only steps 3 and 4 are made of questions; the twist's extra question never changes a step's mark.
      if (LISTS[stepId] && allOk(list)) finish(stepId);
    }
    function showQ(q, stepId, list) {
      const s = qs(q.id); s.ok = true; S.lastOk = q.id; showMe(stepId);
      if (q.kind === 'num') { s.v = q.answer === Math.round(q.answer) ? String(q.answer) : dec(q.answer); s.msg = fb('shown', q.right); }
      if (q.kind === 'arrows') { q.rows.forEach(([to, want]) => { s.sel[to] = want; }); s.msg = fb('shown', 'N → N lands on f_NR, N → E on f_ER, N → R on 1, N → A on 0.'); }
      if (LISTS[stepId] && allOk(list)) finish(stepId);
    }
    // The feedback of the question just solved stays visible above the next question.
    const lastOkMsg = (list, cur) => S.lastOk && cur && list.some(q => q.id === S.lastOk) && qs(S.lastOk).ok ? qs(S.lastOk).msg || '' : '';

    // --- Step 1: follow a ticket ---
    function renderFollow() {
      const F = S.follow;
      let out = '<h2>' + title('follow') + '</h2>' +
        '<p>A help desk gets support requests. Each request is a <b>ticket</b>. At the end of every day the ticket has one status: <b>N</b> (new, open), <b>E</b> (escalated to experts), <b>R</b> (resolved) or <b>A</b> (abandoned). R and A are final.</p>' +
        '<p>Follow ' + FOLLOW_COUNT + ' tickets. Each day you roll two dice (00–99). The table says where the roll sends the ticket.</p>';
      if (F.k < FOLLOW_COUNT) {
        const t = FOLLOWED[F.k], path = t.path.slice(0, F.rolls + 1), cur = path[path.length - 1], closed = CLOSED.includes(cur);
        out += '<div class="gk-panel"><div class="gk-now">Ticket ' + (F.k + 1) + ' of ' + FOLLOW_COUNT + ' · day ' + F.rolls + ' · status ' + st(cur) + ' ' + LONG[cur] + '</div>' + pathHTML(path, t.rolls.slice(0, F.rolls));
        if (!closed) {
          const last = F.rolls ? t.rolls[F.rolls - 1] : null;
          out += '<table class="gk-table" aria-label="Where a roll sends a ticket in ' + cur + '"><tr><th>Roll (from ' + cur + ')</th><th>Next status</th><th>Chance</th></tr>' +
            ranges(BASE_PCT, cur).map(r => '<tr><td>' + String(r.lo).padStart(2, '0') + '–' + String(r.hi).padStart(2, '0') + '</td><td>' + st(r.to) + ' ' + LONG[r.to] + '</td><td>' + (r.hi - r.lo + 1) / 100 + '</td></tr>').join('') + '</table>' +
            (last !== null ? '<p class="gk-small">Last roll: <b>' + String(last).padStart(2, '0') + '</b> → ' + LONG[path[path.length - 1]] + '.</p>' : '') +
            '<div class="gk-row">' + btn('data-do="roll"', 'Roll for day ' + (F.rolls + 1), ' big primary') + '</div>';
        } else {
          out += '<p data-closed="' + t.days + '">Ticket ' + (F.k + 1) + ' is <b>' + LONG[cur].toLowerCase() + '</b>.</p>';
          const nextBtn = '<div class="gk-row">' + btn('data-do="nextTicket"', F.k + 1 < FOLLOW_COUNT ? 'Next ticket' : 'See all five', ' primary') + '</div>';
          if (F.k < TYPE_DAYS_FOR) {
            const s = F.typed[F.k] || { v: '', ok: false, wrong: 0, msg: null };
            out += '<p>How many days did it take to close? (It arrived on day 0.)</p><div class="gk-row"><input class="gk-num' + (s.ok ? ' ok' : s.wrong ? ' no' : '') + '" type="text" inputmode="numeric" autocomplete="off" data-days="1" data-enter="daysCheck" value="' + escapeAttr(s.v) + '" aria-label="Days to close"' + (s.ok ? ' disabled' : '') + '>' +
              (s.ok ? '' : btn('data-do="daysCheck"', 'Check', ' primary') + (s.wrong ? btn('data-do="daysShow"', 'Show me') : '')) + '</div>' + (s.msg || '');
            if (s.ok) out += nextBtn;
          } else {
            out += '<p>It took <b>' + t.days + '</b> day' + (t.days === 1 ? '' : 's') + ' (one per arrow).</p>' + nextBtn;
          }
        }
        out += '</div>';
      }
      const doneTickets = FOLLOWED.slice(0, Math.min(F.k, FOLLOW_COUNT));
      if (doneTickets.length) {
        out += '<h3>Your tickets</h3><table class="gs-log"><tr><th>Ticket</th><th>Path</th><th>Ended</th><th class="num">Days</th></tr>' +
          doneTickets.map((t, i) => '<tr><td>' + (i + 1) + '</td><td>' + t.path.join(' → ') + '</td><td>' + LONG[t.end] + '</td><td class="num">' + t.days + '</td></tr>').join('') + '</table>';
      }
      if (F.k >= FOLLOW_COUNT) {
        const res = FOLLOWED.filter(t => t.end === 'R').length, avg = FOLLOWED.reduce((a, t) => a + t.days, 0) / FOLLOW_COUNT;
        out += '<p>Resolved: <b>' + res + ' of ' + FOLLOW_COUNT + '</b>. Average: <b>' + dec(avg, 2) + '</b> days to close. Five tickets are a small sample. Every ticket is different.</p>' +
          '<h3>Guess first</h3><p>Out of <b>1000</b> new tickets, about how many will end <b>resolved</b>?</p>' +
          '<div class="gk-row"><input class="gk-num" type="text" inputmode="numeric" autocomplete="off" data-guess="1" data-enter="guess" value="' + escapeAttr(S.guess) + '" aria-label="Your guess out of 1000">' + btn('data-do="guess"', 'Save my guess', ' primary') + '</div>';
        // WHY: a guess is neither right nor wrong, so its note carries no ✓/✗ tag.
        if (S.guessSet !== null) out += fb('note', 'Saved: ' + S.guessSet + ' of 1000. Step 2 checks it with many tickets.');
      }
      return out;
    }

    // --- Step 2: many tickets ---
    function renderMany() {
      const stt = poolStats(BASE_PCT, S.pool, POOL_SEED), guess = S.guessSet === null ? null : S.guessSet / 1000;
      let out = '<h2>' + title('many') + '</h2><p>The computer now rolls the dice for many new tickets, with the same table. Watch the share of resolved tickets.</p>' +
        '<div class="gk-row">' + [10, 100, 1000].map(k => btn('data-do="pool" data-n="' + k + '"' + (S.pool >= POOL_MAX ? ' disabled' : ''), '+ ' + k + ' tickets')).join('') + '</div>';
      if (!S.pool) return out + '<p class="gk-small gk-muted">No tickets yet. ' + (guess !== null ? 'Your guess from step 1: ' + S.guessSet + ' of 1000.' : '') + '</p>';
      out += '<div class="gs-stats"><div class="gs-stat"><b data-stat="n">' + stt.n + '</b><span>tickets</span></div>' +
        '<div class="gs-stat"><b data-stat="share">' + dec(stt.share, 3) + '</b><span>share resolved (resolved ÷ tickets)</span></div>' +
        '<div class="gs-stat"><b>' + dec(1 - stt.share, 3) + '</b><span>share abandoned</span></div>' +
        '<div class="gs-stat"><b data-stat="days">' + dec(stt.meanDays, 2) + '</b><span>average days until closed</span></div></div>' +
        shareChart(stt, guess, null) + '<p class="gk-small">Blue line: share resolved after each new ticket.' + (guess !== null ? ' Dashed: your guess (' + S.guessSet + ' of 1000).' : '') + ' The line wobbles at first, then settles.</p>' +
        '<h3>Days until closed</h3>' + daysHistogram(stt) + '<p class="gk-small">How many tickets took 1, 2, 3, … days. The number of days is random; its average is ' + dec(stt.meanDays, 2) + '.</p>';
      if (S.pool < POOL_NEEDED) return out + '<p class="gk-small gk-muted">Add tickets until you have at least ' + POOL_NEEDED + '. Then a question appears.</p>';
      const on = S.oldNew, pick = (v, text) => btn('data-do="oldNew" data-v="' + v + '"' + (on.checked ? ' disabled' : ''), text, on.pick === v ? ' picked' : '');
      out += '<h3>Predict first</h3><p>Ticket X is still <b>N</b> after day 1: it was not lucky. Ticket Y has just arrived. Which one is more likely to end <b>resolved</b>?</p>' +
        '<div class="gk-row">' + pick('old', 'X (it has waited)') + pick('new', 'Y (the new one)') + pick('same', 'The same chance') + '</div>';
      if (!on.pick) return out;
      if (!on.checked) return out + '<div class="gk-row">' + btn('data-do="oldNewCheck"', 'Check with my ' + stt.n + ' tickets', ' primary') + '</div>';
      const g = stt.g, row = (label, pair) => '<tr><td>' + label + '</td><td class="num">' + pair[0] + '</td><td class="num">' + share(pair[1], pair[0]) + '</td></tr>';
      out += '<table class="gs-log" data-groups="1"><tr><th>Tickets</th><th class="num">How many</th><th class="num">Share resolved</th></tr>' +
        row('All new tickets (like Y)', [stt.n, stt.resolved]) + row('Still N after day 1 (like X)', g.stillN) +
        row('Reached E at some point', g.everE) + row('Waited in E at least one extra day', g.waitedE) + '</table>';
      out += on.pick === 'same'
        ? fb('ok', 'X and Y have about the same share. Both are in N today, and the story says the chances depend only on today\'s status.')
        : fb('no', 'Look at the first two rows: about the same share. Both tickets are in N today. In this story tomorrow depends only on today\'s status, not on how long a ticket has waited.');
      out += '<p>The same holds for E (rows 3 and 4): a ticket that waited in E did about as well as any ticket that reached E. <b>So the status today is all we need to know.</b> Step 3 uses this.</p>' +
        '<p class="gk-small gk-muted">In a real help desk old tickets may be harder. Then the status alone would not be enough, and the model would need more information.</p>';
      return out;
    }

    // --- Step 3: one day, then the same question ---
    function renderPicture() {
      const list = LISTS.picture, cur = list.find(q => !qs(q.id).ok);
      const okId = id => qs(id).ok;
      let out = '<h2>' + title('picture') + '</h2>' +
        '<p>Your tickets moved along the arrows of this picture. The lecture draws chains the same way (state transition diagram, Week 11 slide 19).</p>' +
        '<p><b>The idea:</b> look only at <b>one day</b>. Wherever the ticket lands, ask the <b>same question again</b> from there.</p>' +
        diagramSVG({ active: cur ? (cur.id === 'nArrows' ? 'N' : 'E') : null, chips: {
          R: okId('eR') ? 'chance 1' : '', A: okId('eA') ? 'chance 0' : '',
          E: okId('eE') ? 'f<tspan font-size="70%" dy="4">ER</tspan>' : '', N: okId('nArrows') ? 'f<tspan font-size="70%" dy="4">NR</tspan>' : '' } });
      const built = [];
      if (okId('eE')) built.push('<b>Chance from E:</b> ' + eqE_f());
      if (okId('dE')) built.push('<b>Days from E:</b> ' + eqE_mu() + ' <span class="gk-small">(1 for tomorrow; R and A add 0 more days)</span>');
      if (okId('nArrows')) built.push('<b>Chance from N:</b> ' + eqN_f());
      if (built.length) out += '<div class="gk-panel"><p><b>What you have built</b></p>' + built.map(b => '<div class="gs-eq">' + b + '</div>').join('') + '</div>';
      if (cur) {
        if (cur.id === 'nArrows') out += '<p>Now <b>N</b>. Each of its four arrows lands somewhere. Which chance of being resolved waits at the end of each arrow?</p>';
        out += lastOkMsg(list, cur) + renderQ(cur, 'picture') + '<p class="gk-small gk-muted">Question ' + (list.indexOf(cur) + 1) + ' of ' + list.length + '.</p>';
        return out;
      }
      return out + fb(S.helped.picture ? 'shown' : 'ok', 'The rule you used: <b>chance from here = add, over tomorrow\'s arrows, (chance of the arrow) × (chance from where it lands)</b>. For days: <b>1 + add (chance of the arrow) × (days from where it lands)</b>, leaving out the closed states. The lecture explains it the same way on slide 43: "The first transition from state i can be to either state j or to some other state k."');
    }

    // --- Step 4: solve it ---
    function renderSolve() {
      const list = LISTS.solve, cur = list.find(q => !qs(q.id).ok), ok = id => qs(id).ok;
      const chip = (fq, f, mq, m) => [ok(fq) ? 'f=' + qt(f) : '', ok(mq) ? 'μ=' + qt(m) : ''];
      let out = '<h2>' + title('solve') + '</h2><p>Solve the equations from step 3, one at a time. The help gets lighter as you go.</p>' +
        diagramSVG({ active: cur ? (['sfE', 'smE'].includes(cur.id) ? 'E' : 'N') : null,
          chips: { E: chip('sfE', BASE.f.E, 'smE', BASE.mu.E), N: chip('sfN', BASE.f.N, 'smN', BASE.mu.N), R: 'f=1', A: 'f=0' } });
      list.filter(q => qs(q.id).ok && !(cur && q.id === S.lastOk)).forEach(q => { out += '<p class="gk-small">✓ ' + q.right + '</p>'; });
      if (cur) return out + lastOkMsg(list, cur) + renderQ(cur, 'solve') + '<p class="gk-small gk-muted">' + (list.indexOf(cur) + 1) + ' of ' + list.length + '.</p>';
      const stt = poolStats(BASE_PCT, S.pool, POOL_SEED);
      out += fb(S.helped.solve ? 'shown' : 'ok', 'A new ticket is resolved with chance <b>' + both(BASE.f.N) + '</b> and is closed after <b>' + both(BASE.mu.N) + '</b> days on average.');
      if (S.pool) {
        out += '<table class="gs-log" data-compare="1"><tr><th></th><th class="num">Your ' + stt.n + ' tickets</th><th class="num">Equations</th></tr>' +
          '<tr><td>Share resolved</td><td class="num">' + dec(stt.share, 3) + '</td><td class="num">' + dec(RESOLVED, 4) + '</td></tr>' +
          '<tr><td>Average days until closed</td><td class="num">' + dec(stt.meanDays, 3) + '</td><td class="num">' + dec(DAYS, 4) + '</td></tr></table>' +
          shareChart(stt, S.guessSet === null ? null : S.guessSet / 1000, RESOLVED) +
          '<p>The simulated share settles near the exact value, but it never stops wobbling. The equations give the exact number from a few lines of algebra.</p>';
      }
      return out;
    }

    // --- Step 5: name the parts ---
    const namesAllOk = () => NAME_ROWS.every(r => S.names[r.id] === r.answer);
    const slotsAllOk = () => Object.keys(SLOT_ANSWER).every(id => slotOk(id, S.slots[id]));
    function renderName() {
      const days = FOLLOWED.map(t => t.days).join(', ');
      const rows = NAME_ROWS.map(r => {
        const v = S.names[r.id] || '';
        const mark = S.namesChecked && v ? (v === r.answer ? '<span style="color:var(--good)">✓</span>' : '<span style="color:var(--critical)">✗</span>') : '';
        const label = r.id === 'fpt' ? r.label + ' (yours: ' + days + ')' : r.label;
        return '<b>' + label + '</b><select data-name="' + r.id + '" aria-label="' + label.replace(/<[^>]+>/g, '') + '"><option value="">choose…</option>' +
          NAME_OPTIONS.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select><span>' + mark + '</span>';
      }).join('');
      const namesOk = namesAllOk();
      let out = '<h2>' + title('name') + '</h2><p>You have used every part already. Now give each one the name the lecture uses (Week 13, slides 37–43 and 52–54).</p>' +
        '<div class="gk-names">' + rows + '</div><div class="gk-row">' + btn('data-do="namesCheck"', 'Check names', ' primary') + '</div>';
      if (S.namesChecked) {
        const wrong = NAME_ROWS.filter(r => S.names[r.id] && S.names[r.id] !== r.answer), empty = NAME_ROWS.filter(r => !S.names[r.id]);
        out += namesOk ? fb('ok', 'A chain with absorbing states and transient states is an <b>absorbing chain</b> (slide 52). Your ' + FOLLOW_COUNT + ' tickets each had their own first passage time; μ is its average.')
          : fb('no', wrong.map(r => '<b>' + r.label + '</b>: you chose "' + NAME_OPTIONS.find(o => o[0] === S.names[r.id])[1] + '". ' + NAME_WHY[S.names[r.id]]).join('<br>') +
            (empty.length ? (wrong.length ? '<br>' : '') + 'Still empty: ' + empty.map(r => r.label).join(', ') + '.' : ''));
      }
      if (!namesOk) return out;
      const slot = id => {
        const v = S.slots[id], cls = S.slotsChecked && v ? (slotOk(id, v) ? ' ok' : ' no') : '';
        return '<span class="gk-slot' + (S.slotSel === id ? ' sel' : '') + cls + '" data-do="slot" data-slot="' + id + '" role="button" tabindex="0" title="' + SLOT_ROLE[id] + '">' + (v ? tileLabel(v) : '&nbsp;') + '</span>';
      };
      const used = new Set(Object.values(S.slots));
      out += '<h3>Build the general equations</h3><p>For any open state i. Click a box, then a tile. Click a filled box to empty it. Some tiles are traps.</p>' +
        '<div class="gk-formula">f<sub>iR</sub> = Σ<sub>j</sub> p<sub>ij</sub> · ' + slot('s1') + ' <span class="gk-cap">(slide 54)</span><br>' +
        'f<sub>RR</sub> = ' + slot('s2') + ' , f<sub>AR</sub> = ' + slot('s3') + '<br>' +
        'μ<sub>iC</sub> = ' + slot('s4') + ' + Σ<sub>k not closed</sub> p<sub>ik</sub> · ' + slot('s5') + ' <span class="gk-cap">(slide 43, target C = closed)</span></div>' +
        '<p class="gk-small">Selected box: ' + SLOT_ROLE[S.slotSel] + '</p>' +
        '<div class="gk-bank">' + TILES.map(x => '<button class="gk-tile" data-do="tile" data-tile="' + x[0] + '"' + (used.has(x[0]) ? ' disabled' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
        '<div class="gk-row">' + btn('data-do="slotsCheck"', 'Check the equations', ' primary') + (S.slotsChecked && !slotsAllOk() ? btn('data-do="slotsShow"', 'Show me') : '') + '</div>';
      if (!S.slotsChecked) return out;
      if (slotsAllOk()) {
        return out + fb(S.helped.name ? 'shown' : 'ok', 'These are the lecture\'s equations. Test them on E: ' + eqE_mu() + ' gives ' + muH('E') + ' = ' + qt(BASE.mu.E) + ', the number from step 4. ' +
          'The lecture solves the accounts receivable example (slide 59) with the same f-equations: f<sub>44</sub> = 1 for Paid, f<sub>54</sub> = 0 for Bad Debt.');
      }
      return out + fb('no', Object.keys(SLOT_ANSWER).filter(id => !slotOk(id, S.slots[id])).map(id => {
        const v = S.slots[id];
        return v ? '<b>' + tileLabel(v) + '</b>: ' + ((SLOT_WHY[id] || {})[v] || 'not this one. ' + SLOT_ROLE[id] + '?') : SLOT_ROLE[id] + ' (empty)';
      }).join('<br>'));
    }

    // --- Step 6: twist ---
    function renderTwist() {
      const tw = S.twist;
      let out = '<h2>' + title('twist') + '</h2>' +
        '<p>New rule: the experts send some tickets back. Each day, a ticket in E goes <b>back to N</b> with chance ' + sp('E', 'N') + ', and waits in E with chance ' + sp('E', 'E') + '. E → R and E → A stay at ' + sp('E', 'R') + ' and ' + sp('E', 'A') + '.</p>' +
        '<table class="gk-table" style="max-width:420px"><tr><th>From E to</th>' + ORDER.map(j => '<th>' + j + '</th>').join('') + '</tr>' +
        '<tr><td>old rule</td>' + ORDER.map(j => '<td>' + pText(BASE_PCT, 'E', j) + '</td>').join('') + '</tr>' +
        '<tr class="gs-hit"><td>new rule</td>' + ORDER.map(j => '<td>' + pText(SEND_BACK_PCT, 'E', j) + '</td>').join('') + '</tr></table>' +
        '<h3>Which part of the model changes?</h3><div class="gk-row">' + PIECES.map(pc => btn('data-do="piece" data-v="' + pc[0] + '"', pc[1], tw.piece === pc[0] ? ' picked' : '')).join('') + '</div>';
      if (!tw.piece) return out;
      if (tw.piece !== 'row') return out + fb('no', PIECES.find(pc => pc[0] === tw.piece)[2] + ' Try again.');
      out += fb('ok', 'Only the E row changes. The states, the end values and the 1 for each day stay.');
      const pick = (k, v) => btn('data-do="predict" data-k="' + k + '" data-v="' + v + '"' + (tw.checked ? ' disabled' : ''), DIR_TEXT[v], tw[k] === v ? ' picked' : '');
      out += '<h3>Predict, then check</h3><p>Being sent back sounds like a step backwards. For a <b>new</b> ticket, what happens to …</p>' +
        '<div class="gk-twins"><div class="gk-panel"><p>… the chance to be resolved, ' + fH('N', 'R') + '?</p><div class="gk-row">' + ['up', 'same', 'down'].map(v => pick('pf', v)).join('') + '</div></div>' +
        '<div class="gk-panel"><p>… the expected days until closed, ' + muH('N') + '?</p><div class="gk-row">' + ['up', 'same', 'down'].map(v => pick('pm', v)).join('') + '</div></div></div>';
      if (!tw.checked) return out + '<div class="gk-row">' + btn('data-do="twistCheck"' + (tw.pf && tw.pm ? '' : ' disabled'), 'Check: ' + TWIST_TICKETS + ' tickets under each rule', ' primary') + '</div>';
      const oldS = poolStats(BASE_PCT, TWIST_TICKETS, TWIST_SEED), newS = poolStats(SEND_BACK_PCT, TWIST_TICKETS, TWIST_SEED);
      out += '<table class="gs-log" data-twist="1"><tr><th></th><th class="num">Old rule</th><th class="num">New rule</th></tr>' +
        '<tr><td>Simulated share resolved (' + TWIST_TICKETS + ' tickets)</td><td class="num">' + dec(oldS.share, 3) + '</td><td class="num">' + dec(newS.share, 3) + '</td></tr>' +
        '<tr><td>Exact ' + fH('N', 'R') + '</td><td class="num">' + both(BASE.f.N) + '</td><td class="num">' + both(SENT.f.N) + '</td></tr>' +
        '<tr><td>Simulated average days</td><td class="num">' + dec(oldS.meanDays, 3) + '</td><td class="num">' + dec(newS.meanDays, 3) + '</td></tr>' +
        '<tr><td>Exact ' + muH('N') + '</td><td class="num">' + both(BASE.mu.N) + '</td><td class="num">' + both(SENT.mu.N) + '</td></tr></table>';
      const res = (k, want, name) => (tw[k] === want ? '✓ ' : '✗ ') + name + ' ' + DIR_TEXT[want] + (tw[k] === want ? '.' : ' (you said: ' + DIR_TEXT[tw[k]] + ').');
      out += fb(tw.pf === TWIST_DIR.f && tw.pm === TWIST_DIR.m ? 'ok' : 'no', res('pf', TWIST_DIR.f, fH('N', 'R')) + '<br>' + res('pm', TWIST_DIR.m, muH('N'))) +
        '<p><b>Why?</b> Compare the two places with the old numbers: from N a ticket is resolved with chance ' + both(BASE.f.N) + ' and closes in ' + both(BASE.mu.N) + ' days; from E only ' + both(BASE.f.E) + ' and ' + both(BASE.mu.E) + ' days. ' +
        'N is the better place to be. Sending a ticket from E back to N moves it to the better place.</p>' +
        '<p class="gk-small">The change in days is small: with ' + TWIST_TICKETS + ' tickets the simulation can only just show it. The equations settle it exactly. (Both rules use the same dice rolls, which makes the comparison fairer.)</p>';
      out += renderQ(TWIST_Q, 'twist');
      ctx.assembled();
      return out + summaryCard();
    }
    function modelLines() {
      return [
        'States: N (new), E (escalated) are transient; R (resolved), A (abandoned) are absorbing. One step = one day.',
        'Table: N -> (N ' + p('N', 'N') + ', E ' + p('N', 'E') + ', R ' + p('N', 'R') + ', A ' + p('N', 'A') + '); E -> (E ' + p('E', 'E') + ', R ' + p('E', 'R') + ', A ' + p('E', 'A') + ').',
        'Chance of ever resolved: f_iR = sum_j p_ij f_jR, with f_RR = 1, f_AR = 0.',
        'Expected days until closed (C = R or A): mu_iC = 1 + sum over k not closed of p_ik mu_kC.',
        'f_ER = ' + qt(BASE.f.E) + ', f_NR = ' + qt(BASE.f.N) + ' (abandoned ' + qt(BASE.fNA) + '); mu_EC = ' + qt(BASE.mu.E) + ', mu_NC = ' + qt(BASE.mu.N) + ' days.',
        'Twist (E sends back to N with ' + sp('E', 'N') + '): f_NR = ' + qt(SENT.f.N) + ', mu_NC = ' + qt(SENT.mu.N) + ' days.'
      ];
    }
    function summaryCard() {
      const helpedSteps = activity.steps.filter(s => S.status[s.id] === 'helped').map(s => s.title);
      return '<h3>Your model</h3><div class="gk-model">' +
        '<p><b>States:</b> N, E are transient; R, A are absorbing. One step = one day.</p>' +
        '<p><b>Chance of ever being resolved:</b> f<sub>iR</sub> = Σ<sub>j</sub> p<sub>ij</sub> f<sub>jR</sub>, with f<sub>RR</sub> = 1, f<sub>AR</sub> = 0.</p>' +
        '<p><b>Expected days until closed</b> (C = R or A): μ<sub>iC</sub> = 1 + Σ<sub>k not closed</sub> p<sub>ik</sub> μ<sub>kC</sub>.</p>' +
        '<p>' + fH('E', 'R') + ' = ' + qt(BASE.f.E) + ', <b>' + fH('N', 'R') + ' = ' + both(BASE.f.N) + '</b> (abandoned: ' + qt(BASE.fNA) + '). ' + muH('E') + ' = ' + qt(BASE.mu.E) + ', <b>' + muH('N') + ' = ' + both(BASE.mu.N) + ' days</b>.</p>' +
        '<p><b>Twist</b> (send back): ' + fH('N', 'R') + ' = ' + both(SENT.f.N) + ', ' + muH('N') + ' = ' + both(SENT.mu.N) + ' days.</p></div>' +
        (helpedSteps.length ? '<p class="gk-small">Steps where you used "Show me": ' + helpedSteps.join(', ') + '. Try those again later without help.</p>' : '<p class="gk-small">You did every step without "Show me".</p>') +
        '<div class="gk-row">' + btn('id="guided-download" data-do="download"', 'Download my model') + '</div>';
    }
    const downloadLines = () => [activity.title, activity.family, '',
      ...activity.steps.map(s => s.title + ': ' + (S.status[s.id] === 'done' ? 'done' : S.status[s.id] === 'helped' ? 'done with Show me' : 'not finished')),
      '', 'My tickets: ' + FOLLOWED.map(t => t.path.join('') + ' (' + t.days + ' days)').join('; '),
      'My guess: ' + (S.guessSet === null ? 'none' : S.guessSet + ' of 1000 resolved'), '', 'MODEL', ...modelLines()];

    // --- Actions ---
    const typedDays = () => (S.follow.typed[S.follow.k] = S.follow.typed[S.follow.k] || { v: '', ok: false, wrong: 0, msg: null });
    const listFor = step => step === 'twist' ? [TWIST_Q] : LISTS[step];
    const ACTIONS = {
      roll() { const t = FOLLOWED[S.follow.k]; if (t && S.follow.rolls < t.days) S.follow.rolls++; },
      daysCheck() {
        const t = FOLLOWED[S.follow.k], s = typedDays();
        if (!t || s.ok) return;
        const v = parseNum(s.v);
        if (Number.isNaN(v)) { s.msg = fb('no', 'Type a whole number of days.'); return; }
        track('check');
        if (v === t.days) { s.ok = true; s.msg = fb('ok', t.days + ' days: one per arrow (one per roll).'); return; }
        s.wrong++;
        s.msg = fb('no', v === t.path.length ? 'You counted the statuses (' + t.path.length + ' of them), including day 0. Count the arrows: each arrow is one day.'
          : v === t.days - 1 ? 'Count every arrow, also the last one into ' + t.end + '.'
            : 'Count the arrows in the path: each arrow is one day.');
      },
      daysShow() { const t = FOLLOWED[S.follow.k], s = typedDays(); s.ok = true; s.v = String(t.days); showMe('follow'); s.msg = fb('shown', t.path.join(' → ') + ' has ' + t.days + ' arrows: ' + t.days + ' days.'); },
      nextTicket() { S.follow.k++; S.follow.rolls = 0; },
      guess() {
        const v = parseNum(S.guess);
        if (Number.isNaN(v) || v < 0 || v > 1000) { S.guessSet = null; return; }
        S.guessSet = Math.round(v);
        if (S.follow.k >= FOLLOW_COUNT) finish('follow');
      },
      pool(el) { S.pool = Math.min(POOL_MAX, S.pool + Number(el.dataset.n)); },
      oldNew(el) { S.oldNew.pick = el.dataset.v; },
      oldNewCheck() { S.oldNew.checked = true; track('check'); finish('many'); },
      qCheck(el) { const step = el.dataset.step; checkQ(findQ(step, el.dataset.q), step, listFor(step)); },
      qShow(el) { const step = el.dataset.step; showQ(findQ(step, el.dataset.q), step, listFor(step)); },
      qPick(el) {
        const step = el.dataset.step, q = findQ(step, el.dataset.q), s = qs(q.id), o = q.options.find(x => x[0] === el.dataset.v);
        track('check');
        s.v = o[0];
        if (o[0] === q.answer) { s.ok = true; S.lastOk = q.id; s.msg = fb('ok', q.right); }
        else { s.wrong++; s.msg = fb('no', o[2]); }
        if (allOk(LISTS[step])) finish(step);
      },
      namesCheck() { S.namesChecked = true; track('check'); },
      slot(el) { const id = el.dataset.slot; delete S.slots[id]; S.slotSel = id; S.slotsChecked = false; },
      tile(el) {
        const target = S.slotSel && !S.slots[S.slotSel] ? S.slotSel : Object.keys(SLOT_ANSWER).find(s => !S.slots[s]);
        if (!target) return;
        S.slots[target] = el.dataset.tile; S.slotsChecked = false;
        S.slotSel = Object.keys(SLOT_ANSWER).find(s => !S.slots[s]) || target;
      },
      slotsCheck() { S.slotsChecked = true; track('check'); if (slotsAllOk() && namesAllOk()) finish('name'); },
      slotsShow() { Object.keys(SLOT_ANSWER).forEach(id => { S.slots[id] = SLOT_ANSWER[id][id === 's4' ? 1 : 0]; }); showMe('name'); S.slotsChecked = true; finish('name'); },
      piece(el) { S.twist.piece = el.dataset.v; track('check'); },
      predict(el) { S.twist[el.dataset.k] = el.dataset.v; },
      twistCheck() { if (S.twist.pf && S.twist.pm) { S.twist.checked = true; finish('twist'); track('twist'); } },
      download() { ctx.download(downloadLines()); return false; }
    };

    // --- What the kit shows ---
    const dataRow = i => '<tr><td>' + st(i) + '</td>' + ORDER.map(j => '<td>' + pText(BASE_PCT, i, j) + '</td>').join('') + '</tr>';
    return {
      dataCard: '<h3>The data (always here)</h3>' +
        '<p>Chance that a ticket with today\'s status (row) has tomorrow\'s status (column):</p>' +
        '<table class="gk-table" data-card="1"><tr><th>Today</th>' + ORDER.map(j => '<th>' + j + '</th>').join('') + '</tr>' + ORDER.map(dataRow).join('') + '</table>' +
        '<p><b>N</b> new, open · <b>E</b> escalated · <b>R</b> resolved · <b>A</b> abandoned. R and A never change again. <b>C</b> = closed = R or A.</p>' +
        '<p>A ticket starts in N. We look at it once a day, at the end of the day. The chances depend only on today\'s status, not on the ticket\'s age or past.</p>' +
        '<p class="gk-small gk-muted">This story is made up for practice. The lecture\'s own absorbing chains are accounts receivable (Week 13 slides 55–61) and Freezco (slides 62–66); mean first passage times are on slides 41–47.</p>',
      steps: { follow: renderFollow, many: renderMany, picture: renderPicture, solve: renderSolve, name: renderName, twist: renderTwist },
      actions: ACTIONS,
      // WHY: step 4 solves the equations that step 3 builds.
      gate: { solve: { ready: () => !!S.status.picture, step: 'picture', text: 'This step solves the equations you build in step 3. Please finish step 3 first.' } },
      onInput(t) {
        if (t.dataset.qin) qs(t.dataset.qin).v = t.value;
        if (t.dataset.days) typedDays().v = t.value;
        if (t.dataset.guess) S.guess = t.value;
        if (t.dataset.arrow) qs('nArrows').sel[t.dataset.arrow] = t.value;
      },
      onChange(t) {
        if (t.dataset.arrow) { qs('nArrows').sel[t.dataset.arrow] = t.value; return false; }
        if (!t.dataset.name) return false;
        S.names[t.dataset.name] = t.value; S.namesChecked = false;
        return true;
      }
    };
  }

  window.GUIDED_CUSTOM.support = (app, opts) => window.GUIDED_KIT.mount(app, opts, { fresh, build });
})();
