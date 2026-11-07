/* Week 11 guided activity "lending": its own interactive flow on the shared kit.
   Order: run the desk for five days → same count, same future? (the state, the
   Markov property) → build P from trees, with the state diagram → two days ahead
   (paths, P²) → name the parts and classify → twist (the request comes before the
   returns). The frame (tabs, data card, progress, usage counts) is
   assets/guided-kit.js; guided.js loads this file and calls
   window.GUIDED_CUSTOM.lending. The step ids and titles live in
   assets/guided-data.js. The story is invented for practice and says so on the
   page. Every number on the page is computed from the constants in MODEL.
   Design note: docs/guided_redesign/lending.md. */
(() => {
  'use strict';
  const { fb, btn, escapeHtml: escapeAttr, parseNumber } = window.GUIDED_KIT;

  // === FRACTIONS ===
  // Exact arithmetic so that 3/8 is shown as 3/8, never 0.37499999.
  const gcdInt = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; };
  const fr = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcdInt(n, d); return { n: n / g, d: d / g }; };
  const ZERO = fr(0), ONE = fr(1);
  const add = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
  const mul = (a, b) => fr(a.n * b.n, a.d * b.d);
  const sub = (a, b) => add(a, fr(-b.n, b.d));
  const value = a => a.n / a.d;
  const same = (a, b) => a.n === b.n && a.d === b.d;
  const sum = list => list.reduce(add, ZERO);
  const fx = a => (a.d === 1 ? String(a.n) : a.n + '/' + a.d);
  const dec = a => Number(value(a).toFixed(4)).toString();

  // === MODEL ===
  // The story's numbers. Every number on the page is computed from these.
  const CAMS = ['A', 'B'];
  const N_CAMS = CAMS.length;
  const P_RETURN = fr(1, 2);           // each camera on loan comes back tomorrow morning
  const P_REQUEST = fr(1, 2);          // one student asks for one camera
  const STATES = Array.from({ length: N_CAMS + 1 }, (_, i) => i);
  const START_AVAILABLE = 1;           // day 0 closing in the play: A on the shelf, B on loan
  const DAYS = 5;                      // days played in step 1
  const CONTRAST_STATE = 1;            // step 2: two desks with 1 camera tonight
  const TWO_STEP = { from: 0, to: N_CAMS };  // step 4 asks p(2) from an empty to a full shelf
  const SIM_RUNS = 1000;               // desks per press of the simulation button in step 4
  const SIM_SEED = 4242;

  // WHY: when i cameras are on the shelf we call the ones on loan the last letters
  // (i = 1: B is away). The cameras are identical, so the labels only help the tree.
  const awayAt = i => CAMS.slice(i);

  // Every way one day can go from i cameras on the shelf. requestFirst = the twist.
  function dayLeaves(i, requestFirst) {
    const away = awayAt(i), leaves = [];
    const combos = away.reduce((acc) => acc.flatMap(c => [c.concat(true), c.concat(false)]), [[]]);
    combos.forEach(combo => {
      const returned = away.filter((_, k) => combo[k]);
      const coins = combo.map(back => (back ? P_RETURN : sub(ONE, P_RETURN)));
      const pReturns = coins.reduce(mul, ONE);
      [true, false].forEach(ask => {
        const p = mul(pReturns, ask ? P_REQUEST : sub(ONE, P_REQUEST));
        const shelfWhenAsked = requestFirst ? i : i + returned.length;
        const served = ask && shelfWhenAsked > 0;
        const next = i + returned.length - (served ? 1 : 0);
        leaves.push({ away, returned, coins, ask, p, next, served, lost: ask && !served });
      });
    });
    return leaves;
  }
  function buildMatrix(requestFirst) {
    return STATES.map(i => STATES.map(j => sum(dayLeaves(i, requestFirst).filter(l => l.next === j).map(l => l.p))));
  }
  const matmul = (A, B) => A.map(row => B[0].map((_, j) => sum(row.map((a, k) => mul(a, B[k][j])))));
  const P = buildMatrix(false), P2 = matmul(P, P);
  const T = buildMatrix(true), T2 = matmul(T, T);
  const lostChance = (i, requestFirst) => sum(dayLeaves(i, requestFirst).filter(l => l.lost).map(l => l.p));

  // Classification from the matrix (slides 35-50): reachability, classes, period.
  function reach(M) {
    const R = STATES.map(i => STATES.map(j => i === j || M[i][j].n > 0));
    STATES.forEach(k => STATES.forEach(i => STATES.forEach(j => { R[i][j] = R[i][j] || (R[i][k] && R[k][j]); })));
    return R;
  }
  function classesOf(M) {
    const R = reach(M), out = [];
    STATES.forEach(i => {
      const cls = STATES.filter(j => R[i][j] && R[j][i]);
      if (!out.some(c => c.join() === cls.join())) out.push(cls);
    });
    return out;
  }
  function periodOf(M, i) {
    let Mk = M, g = 0;
    for (let n = 1; n <= 2 * STATES.length; n++) { if (Mk[i][i].n > 0) g = gcdInt(g, n); Mk = matmul(Mk, M); }
    return g;
  }
  function describeChain(M) {
    const classes = classesOf(M);
    const R = reach(M);
    const closed = cls => cls.every(i => STATES.every(j => !R[i][j] || cls.includes(j)));
    return {
      classes,
      irreducible: classes.length === 1,
      allRecurrent: classes.every(closed),
      periods: STATES.map(i => periodOf(M, i)),
      absorbing: STATES.filter(i => same(M[i][i], ONE))
    };
  }
  const CHAIN = describeChain(P), TWIST_CHAIN = describeChain(T);
  const ERGODIC = CHAIN.irreducible && CHAIN.allRecurrent && CHAIN.periods.every(p => p === 1);
  const CHANGED_ROWS = STATES.filter(i => STATES.some(j => !same(P[i][j], T[i][j])));

  // === SEEDED DAYS FOR STEP 1 ===
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeWeek(seed) {
    const rnd = mulberry32(seed);
    const cams = {};
    CAMS.forEach((c, k) => { cams[c] = k < START_AVAILABLE ? { loan: false, since: null } : { loan: true, since: 0 }; });
    const snapshot = () => JSON.parse(JSON.stringify(cams));
    const onShelf = () => CAMS.filter(c => !cams[c].loan);
    const days = [];
    for (let t = 1; t <= DAYS; t++) {
      const before = onShelf().length, camsBefore = snapshot();
      const away = CAMS.filter(c => cams[c].loan);
      const returned = away.filter(() => rnd() < value(P_RETURN));
      returned.forEach(c => { cams[c] = { loan: false, since: null }; });
      const ask = rnd() < value(P_REQUEST);
      const shelf = onShelf();
      const lentOut = ask && shelf.length ? shelf[0] : null;
      if (lentOut) cams[lentOut] = { loan: true, since: t };
      days.push({ t, before, camsBefore, away, returned, ask, lentOut, lost: ask && !lentOut, after: onShelf().length });
    }
    return days;
  }
  // WHY: the seed is the first one whose five days show every lesson of step 1: a lost
  // request, a returned camera that goes out again the same morning, and all three counts.
  function teachesEnough(days) {
    return days.some(d => d.lost) &&
      days.some(d => d.before === 0 && d.returned.length > 0 && d.lentOut) &&
      STATES.every(s => days.some(d => d.after === s));
  }
  let PLAY_SEED = 1;
  while (!teachesEnough(makeWeek(PLAY_SEED)) && PLAY_SEED < 100000) PLAY_SEED++;
  const WEEK = makeWeek(PLAY_SEED);

  // === TEXT HELPERS ===
  const row = html => '<div class="gk-row">' + html + '</div>';
  const pij = (i, j) => 'p<sub>' + i + j + '</sub>';
  const p2ij = (i, j) => 'p<sub>' + i + j + '</sub><sup>(2)</sup>';
  const camText = n => n + ' camera' + (n === 1 ? '' : 's');
  const list = xs => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
  const rowText = M => i => '(' + M[i].map(fx).join(', ') + ')';

  // Answers: whole numbers for counts; fractions, decimals or percents for chances (kit parser).
  const parseCount = s => { const v = parseNumber(s); return Number.isInteger(v) ? v : NaN; };
  // WHY: a decimal rounded to 3 places (0.219 for 7/32) is accepted; 0.22 is "close".
  // A typed fraction must be exact.
  const DECIMAL_TOLERANCE = 5e-4, CLOSE_TOLERANCE = 1e-2;
  function chanceMatch(s, target) {
    const v = parseNumber(s);
    if (Number.isNaN(v)) return 'empty';
    const gap = Math.abs(v - value(target));
    if (gap < 1e-9 || (!String(s).includes('/') && gap <= DECIMAL_TOLERANCE)) return 'ok';
    return gap <= CLOSE_TOLERANCE ? 'close' : 'no';
  }
  const isChance = (s, f) => chanceMatch(s, f) === 'ok';

  // A wrong closing count, diagnosed. Shared by the play (step 1) and the trees (step 3).
  function diagnoseCount(before, nBack, ask, v) {
    const shelf = before + nBack, served = ask && shelf > 0, right = shelf - (served ? 1 : 0);
    if (v === right) return null;
    if (v < 0) return 'The count cannot go below 0. With no camera on the shelf, the student leaves without one: the request is lost.';
    if (v > N_CAMS) return 'The desk owns only ' + N_CAMS + ' cameras. The count is 0, 1 or 2.';
    if (ask && before === 0 && nBack > 0 && v === nBack) return 'Order of events: the returns come first. The returned camera is on the shelf when the student asks, so it goes out again.';
    if (served && v === shelf) return 'A student asked and got a camera. That camera leaves the shelf: take one away.';
    if (nBack > 0 && v === Math.max(0, before - (ask ? 1 : 0))) return camText(nBack) + ' came back this morning. Add ' + (nBack === 1 ? 'it' : 'them') + ' to the shelf first.';
    return 'Start from last night: ' + before + '. Add the cameras that came back. Take one away if a student got a camera.';
  }
  const countLine = (before, nBack, served) => before + ' last night + ' + nBack + ' back − ' + (served ? 1 : 0) + ' lent = ' + (before + nBack - (served ? 1 : 0));

  // === PICTURES ===
  // State transition diagram (like slide 19 and the Week 11 "Arrows and matrix" animation):
  // circles are closing counts, arrows carry p_ij, a missing arrow means 0.
  const NX = [110, 270, 430], NY = 165, NR = 28;
  let svgUid = 0;
  const at = (i, deg, r = NR) => [NX[i] + r * Math.cos(deg * Math.PI / 180), NY + r * Math.sin(deg * Math.PI / 180)];
  const pt = p => p[0].toFixed(1) + ',' + p[1].toFixed(1);
  // WHY: loops point away from the other arrows: 0 to the left, 1 up, 2 to the right.
  const LOOP_DIR = { 0: 180, 1: -90, 2: 0 };
  function edgeGeometry(i, j) {
    if (i === j) {
      const c = LOOP_DIR[i], a = at(i, c - 28), b = at(i, c + 28), c1 = at(i, c - 42, NR + 80), c2 = at(i, c + 42, NR + 80);
      return { d: 'M' + pt(a) + ' C' + pt(c1) + ' ' + pt(c2) + ' ' + pt(b), label: at(i, c, NR + 62) };
    }
    if (Math.abs(i - j) === 1) {
      const right = j > i, s = at(i, right ? -35 : 145), e = at(j, right ? -145 : 35);
      const cy = right ? NY - 55 : NY + 55, cx = (NX[i] + NX[j]) / 2;
      return { d: 'M' + pt(s) + ' Q' + cx + ',' + cy + ' ' + pt(e), label: [cx, (s[1] + e[1]) / 4 + cy / 2] };
    }
    // WHY: a 2 → 0 arrow never exists in this story (one request per day), but the
    // bottom arc is kept inside the drawing so a changed rule cannot push it out.
    const top = j > i, s = at(i, top ? -60 : 120), e = at(j, top ? -120 : 60), cy = top ? 0 : NY + 90;
    return { d: 'M' + pt(s) + ' C' + (NX[i] + 40) + ',' + cy + ' ' + (NX[j] - 40) + ',' + cy + ' ' + pt(e), label: [(NX[i] + NX[j]) / 2, (s[1] + e[1]) / 8 + cy * 0.75] };
  }
  function diagramSVG(M, opt = {}) {
    // WHY: marker ids must be unique per page; the prefix keeps them apart from other activities.
    const uid = 'ld' + (++svgUid), hot = new Set(opt.hot || []), anyHot = hot.size > 0;
    let edges = '', labels = '';
    STATES.forEach(i => {
      if (!M[i]) return;
      STATES.forEach(j => {
        if (M[i][j].n === 0) return;
        const g = edgeGeometry(i, j), id = i + '>' + j, cls = hot.has(id) ? ' hot' : anyHot ? ' dim' : '';
        edges += '<path class="d-edge' + cls + '" d="' + g.d + '" marker-end="url(#' + uid + (hot.has(id) ? 'h' : 'n') + ')" data-edge="' + id + '"/>';
        const w = 14 + 9 * fx(M[i][j]).length;
        labels += '<g class="d-lab' + cls + '"><rect class="d-pill" x="' + (g.label[0] - w / 2).toFixed(1) + '" y="' + (g.label[1] - 12).toFixed(1) + '" width="' + w + '" height="24" rx="12"/><text x="' + g.label[0].toFixed(1) + '" y="' + g.label[1].toFixed(1) + '">' + fx(M[i][j]) + '</text></g>';
      });
    });
    const nodes = STATES.map(i => '<g class="d-node"><circle cx="' + NX[i] + '" cy="' + NY + '" r="' + NR + '"/><text x="' + NX[i] + '" y="' + NY + '">' + i + '</text></g>').join('');
    // WHY: userSpaceOnUse keeps arrowheads one size; the default scales them with stroke width.
    const head = (id, color) => '<marker id="' + uid + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(' + color + ')"/></marker>';
    return '<div class="ld-diagram"><svg viewBox="0 0 540 245" role="img" aria-label="' + escapeAttr(opt.label || 'State transition diagram of the closing count') + '"><defs>' + head('n', '--ink-2') + head('h', '--s1') + '</defs>' +
      edges + labels + nodes + '<text class="d-cap" x="270" y="236">circle = cameras on the shelf at closing · arrow = chance for one day</text></svg></div>';
  }
  function matrixTable(M, opt = {}) {
    const hlCells = new Set(opt.cells || []), hlRows = opt.rows || [], chg = opt.changed || [];
    return '<table class="ld-table ld-matrix"' + (opt.id ? ' id="' + opt.id + '"' : '') + '>' + (opt.caption ? '<caption class="gk-small">' + opt.caption + '</caption>' : '') +
      '<tr><th>from \\ to</th>' + STATES.map(j => '<th class="num">' + j + '</th>').join('') + (opt.sums ? '<th class="num">sum</th>' : '') + '</tr>' +
      STATES.map(i => '<tr' + (hlRows.includes(i) ? ' class="hl"' : '') + '><th class="num">' + i + '</th>' +
        STATES.map(j => '<td class="num' + (hlCells.has(i + ',' + j) ? ' hl' : '') + (chg.includes(i) ? ' chg' : '') + '">' + (M[i] ? fx(M[i][j]) : '?') + '</td>').join('') +
        (opt.sums ? '<td class="num">' + (M[i] ? fx(sum(M[i])) : '') + '</td>' : '') + '</tr>').join('') + '</table>';
  }

  // === STEP CONTENT (fixed data per step) ===
  // Step 2: two desks with the same count tonight and different pasts (made-up histories).
  const DESKS = [
    { id: 'north', name: 'Desk North', away: 'Camera B went out <b>this morning</b>.', week: 'A busy week: 5 requests.' },
    { id: 'south', name: 'Desk South', away: 'Camera B has been away for <b>6 days</b>.', week: 'A quiet week: 1 request.' }
  ];
  const STORY_SENTENCES = [
    ['age', 'Each camera on loan comes back with probability ' + fx(P_RETURN) + ', no matter how long it has been away.'],
    ['ask', 'With probability ' + fx(P_REQUEST) + ' one student asks for one camera.'],
    ['look', 'We count the cameras every evening at closing.']
  ];

  // Step 3: the three rows, with support that fades: full tree with path chances → tree only → no tree.
  const BUILD_SUBS = ['tree0', 'leaf0', 'row0', 'row1', 'row2'];
  const ROW_OF_SUB = { row0: 0, row1: 1, row2: 2 };
  const TREE_LEAVES = STATES.map(i => dayLeaves(i, false));

  // Step 5: names and the one-day rule.
  const NAME_ROWS = [
    { id: 'x', label: 'X<sub>t</sub>' },
    { id: 'path', label: '{X<sub>t</sub>} = X<sub>0</sub>, X<sub>1</sub>, X<sub>2</sub>, …' },
    { id: 'pij', label: 'p<sub>ij</sub>' },
    { id: 'P', label: 'P' },
    { id: 'p2', label: 'p<sub>ij</sub><sup>(2)</sup>' },
    { id: 'markov', label: 'Markov property' }
  ];
  // WHY: short option texts, so a closed dropdown still shows the whole choice on a phone.
  const NAME_OPTIONS = [
    ['which', 'which camera is out, since when'],
    ['x', 'cameras on the shelf, evening of day t'],
    ['p2', 'chance: i tonight → j in two evenings'],
    ['path', 'the whole list of closing counts'],
    ['markov', 'only tonight’s count matters'],
    ['pij', 'chance: i tonight → j tomorrow'],
    ['requests', 'how many students asked so far'],
    ['P', 'the table of all one-day chances']
  ];
  const NAME_WHY = {
    which: 'Step 2 showed it: which camera is out, and for how long, does not change tomorrow.',
    requests: 'Past requests are history. Tonight’s count already holds what matters.',
    x: 'This is one number on one evening.', path: 'This is the whole list of evenings.',
    pij: 'This is one day ahead.', p2: 'This is two days ahead.',
    P: 'This is the whole table.', markov: 'This is a property of the chain, not a number.'
  };
  const TILES = [
    ['rule', 'max(0, X<sub>t</sub> + R − D)'], ['away', '2 − X<sub>t</sub>'], ['noMax', 'X<sub>t</sub> + R − D'],
    ['shelf', 'X<sub>t</sub>'], ['reqFirst', 'max(0, X<sub>t</sub> − D) + R'], ['two', '2']
  ];
  const SLOT_ANSWER = { next: 'rule', among: 'away' };
  const SLOT_ROLE = { next: 'Tomorrow’s count: which rule?', among: 'How many cameras can come back?' };
  const SLOT_WHY = {
    next: { noMax: 'This can give −1. In step 1 a student who found an empty shelf left without a camera: the count stays 0.',
      reqFirst: 'This lets the student ask before the returns reach the shelf. That is not our order. (Remember this tile for step 6.)' },
    among: { shelf: 'X<sub>t</sub> cameras are on the shelf. Only cameras on loan can come back.',
      two: 'Both cameras can come back only when both are on loan, that is when X<sub>t</sub> = 0.' }
  };
  const tileLabel = id => (TILES.find(x => x[0] === id) || [null, ''])[1];

  // Step 5: classification questions, answered on the diagram. The right option is computed.
  const ZERO_FROM_FULL = { one: P[N_CAMS][0].n > 0, two: P[N_CAMS][0].n === 0 && P2[N_CAMS][0].n > 0 };
  const CLASS_QUESTIONS = [
    { id: 'reach', prompt: 'Look at the diagram. Can the desk go from <b>2</b> cameras to <b>0</b> cameras?',
      options: [['one', 'Yes, in one day'], ['two', 'Yes, but it takes at least two days'], ['never', 'Never']],
      answer: ZERO_FROM_FULL.one ? 'one' : ZERO_FROM_FULL.two ? 'two' : 'never',
      why: { one: 'There is no arrow 2 → 0: ' + pij(2, 0) + ' = ' + fx(P[2][0]) + '. One day has at most one request, so at most one camera leaves.',
        never: 'Follow the arrows: 2 → 1 → 0. Its chance is ' + p2ij(2, 0) + ' = ' + fx(P2[2][0]) + ', more than 0.' },
      right: 'The path 2 → 1 → 0 has chance ' + fx(P[2][1]) + ' × ' + fx(P[1][0]) + ' = ' + fx(P2[2][0]) + '. So state 0 is <b>accessible</b> from state 2 (slide 35), just not in one step.' },
    { id: 'class', prompt: 'Each state can reach each other state along the arrows. Which states <b>communicate</b>?',
      options: [['one', 'All three: one class {0, 1, 2}'], ['split', 'Two classes: {0} and {1, 2}'], ['none', 'No two states communicate']],
      answer: CHAIN.irreducible ? 'one' : 'split',
      why: { split: 'From 0 the desk can reach 1 and 2 (returns), and from 1 or 2 it can reach 0 (loans). So 0 is not alone.',
        none: 'Two states communicate when each can reach the other. 0 ↔ 1 ↔ 2 all do.' },
      right: 'One class {' + CHAIN.classes[0].join(', ') + '}: the chain is <b>irreducible</b> (slide 39).' },
    { id: 'kind', prompt: 'So what kind of states are they?',
      options: [['erg', 'All recurrent, with period 1 (aperiodic)'], ['abs', 'State 0 is absorbing'], ['tr', 'State 0 is transient; 1 and 2 are recurrent'], ['per', 'All recurrent, with period 2']],
      answer: ERGODIC ? 'erg' : 'other',
      why: { abs: 'Absorbing needs ' + pij(0, 0) + ' = 1 (slide 45). Here ' + pij(0, 0) + ' = ' + fx(P[0][0]) + ': returns take the desk out of 0.',
        tr: 'From 0 the desk can always come back to 0. In a finite chain with one class, all states are recurrent (slide 46).',
        per: 'Every state has a loop (p<sub>ii</sub> > 0). The desk can be in state i on day s and on day s + 1, so the period is 1 (slide 48).' },
      right: 'Finite and one class → all recurrent (slide 46). Loops → period 1 (slide 48). Recurrent and aperiodic in one class: the chain is <b>ergodic</b> (slide 50).' }
  ];

  // === STATE ===
  // The kit adds stage, status and helped, and stores everything under ie301-guided-v2:lending.
  const fresh = () => ({
    play: { day: 1, phase: 0, v: '', msg: '', wrong: 0 },
    twin: { predict: null, checked: false, remember: null, sentence: null },
    build: { sub: 0, tree0: Array(TREE_LEAVES[0].length).fill(''), leaf0: '', row0: ['', '', ''], tree1: Array(TREE_LEAVES[1].length).fill(''), row1: ['', '', ''], row2: ['', '', ''], msg: '', wrong: 0 },
    two: { prod: STATES.map(() => ''), prodOk: false, sum: '', sumOk: false, msg: '', wrong: 0, sim: { runs: 0, hits: 0, batches: 0 } },
    name: { names: {}, namesChecked: false, namesWrong: 0, slots: {}, slotSel: 'next', slotsChecked: false, q: 0, pick: {} },
    twist: { rows: [], rowsChecked: false, predict: null, checked: false }
  });

  // === STEPS (built once per page with the kit's ctx) ===
  function build(ctx) {
    // WHY: the kit resets S in place, so S itself stays valid; its sub-objects
    // (S.play, S.build, …) are replaced on "Start over" and are read fresh each time.
    const { S, activity, track, finish, showMe } = ctx;
    const h2 = id => '<h2>' + ctx.stepTitle(id) + '</h2>';

    // --- Step 1: run the desk ---
    function shelfCards(cams, today) {
      return '<div class="ld-shelf">' + CAMS.map(c => cams[c].loan
        ? '<span class="ld-cam away">Camera ' + c + ': on loan (out since day ' + cams[c].since + ', ' + (today - cams[c].since) + ' night' + (today - cams[c].since === 1 ? '' : 's') + ' away)</span>'
        : '<span class="ld-cam on">Camera ' + c + ': on the shelf</span>').join('') + '</div>';
    }
    function returnsText(d) {
      if (!d.away.length) return 'No camera was on loan, so nothing can come back.';
      const still = d.away.filter(c => !d.returned.includes(c));
      if (!d.returned.length) return 'Nothing came back. Camera ' + list(still) + ' is still away.';
      return 'Camera ' + list(d.returned) + ' came back.' + (still.length ? ' Camera ' + list(still) + ' is still away.' : '');
    }
    const requestText = d => (d.ask ? 'A student asks for a camera.' : 'No student asks today.');
    function dayResult(d) {
      return countLine(d.before, d.returned.length, !!d.lentOut) + '.' +
        (d.lentOut ? ' Camera ' + d.lentOut + ' goes out on loan.' : '') +
        (d.lost ? ' The shelf was empty, so the student leaves without a camera: a <b>lost request</b>.' : '');
    }
    function renderPlay() {
      const pl = S.play, finished = pl.day > DAYS;
      let out = h2('play') + '<p>You work at the lending desk for ' + DAYS + ' days. The coins for each day are already flipped, the same for everyone. Reveal them in order and keep the count.</p>';
      if (!finished) {
        const d = WEEK[pl.day - 1];
        out += '<div class="gk-panel" id="ld-day" data-day="' + d.t + '" data-before="' + d.before + '" data-back="' + d.returned.length + '" data-ask="' + (d.ask ? 1 : 0) + '">' +
          '<div class="gk-now">Day ' + d.t + ' of ' + DAYS + ' · last night: ' + camText(d.before) + ' on the shelf</div>' + shelfCards(d.camsBefore, d.t);
        out += pl.phase >= 1 ? '<p class="ld-event" id="ld-returns"><b>Morning:</b> ' + returnsText(d) + '</p>' : row(btn('data-do="reveal"', '1 · Morning: open the return box', ' primary'));
        if (pl.phase >= 2) out += '<p class="ld-event" id="ld-request"><b>Then:</b> ' + requestText(d) + '</p>';
        else if (pl.phase === 1) out += row(btn('data-do="reveal"', '2 · Does a student ask?', ' primary'));
        if (pl.phase === 2) {
          out += '<p>How many cameras are on the shelf at closing tonight?</p>' + row('<input class="gk-num ld-count" id="play-count" type="text" inputmode="numeric" autocomplete="off" value="' + escapeAttr(pl.v) + '" data-bind="play.v" data-enter="playCheck" aria-label="Closing count">' +
            btn('data-do="playCheck"', 'Check', ' primary') + (pl.wrong ? btn('data-do="playShow"', 'Show me') : ''));
        }
        out += pl.msg;
        if (pl.phase === 3) out += row(btn('data-do="nextDay"', d.t < DAYS ? 'Next day →' : 'Close the week', ' primary'));
        out += '</div>';
      }
      const shown = WEEK.filter(d => d.t < pl.day || (d.t === pl.day && pl.phase === 3));
      out += '<h3>Your log</h3><div class="ld-scroll"><table class="ld-table" id="play-log"><tr><th>Day</th><th>Morning returns</th><th>Request</th><th class="num">Closing count</th></tr>' +
        '<tr><td>0</td><td colspan="2" class="gk-small">start: camera ' + list(CAMS.slice(0, START_AVAILABLE)) + ' on the shelf</td><td class="num"><b>' + START_AVAILABLE + '</b></td></tr>' +
        shown.map(d => '<tr><td>' + d.t + '</td><td>' + (d.returned.length ? list(d.returned) + ' back' : d.away.length ? 'none' : 'none on loan') + '</td><td>' + (d.ask ? (d.lost ? 'yes, lost' : 'yes, served') : 'no') + '</td><td class="num"><b>' + d.after + '</b></td></tr>').join('') + '</table></div>';
      if (finished) {
        const counts = [START_AVAILABLE].concat(WEEK.map(d => d.after));
        out += fb(S.helped.play ? 'shown' : 'ok', 'Week done. Your closing counts: <b id="play-path">' + counts.join(' → ') + '</b>.') +
          '<p>Look at how you found each count: last night’s count, plus that day’s coins. Did you ever need to know <b>which</b> camera was out, or <b>how long</b> it had been away? Step 2 tests this.</p>';
      }
      return out;
    }

    // --- Step 2: same count, same future? ---
    function renderTwin() {
      const tw = S.twin, i = CONTRAST_STATE, full = N_CAMS;
      const card = d => '<div class="gk-twin"><h4>' + d.name + '</h4><p>' + d.away + '</p><p>' + d.week + '</p><p>Tonight: <b>' + camText(i) + '</b> on the shelf.</p></div>';
      const pBtn = (id, text) => btn('data-do="predict" data-v="' + id + '"' + (tw.predict ? ' disabled' : ''), text, tw.predict === id ? ' picked' : '');
      let out = h2('twin') + '<p>Two lending desks follow the same rules. Their weeks were different, but tonight both have ' + camText(i) + ' on the shelf.</p>' +
        '<div class="gk-twins">' + DESKS.map(card).join('') + '</div>' +
        '<h3>Predict first</h3><p>Which desk is more likely to have <b>both</b> cameras on the shelf tomorrow evening?</p>' +
        row(pBtn('north', 'Desk North') + pBtn('south', 'Desk South') + pBtn('same', 'The same chance'));
      if (!tw.predict) return out;
      if (!tw.checked) return out + row(btn('data-do="twinCheck"', 'Check: work out tomorrow', ' primary'));
      const ways = dayLeaves(i, false).filter(l => l.next === full);
      const how = ways.map(l => (l.returned.length ? 'the camera on loan comes back (' + fx(l.coins[0]) + ')' : 'it stays away') + ' <b>and</b> ' + (l.ask ? 'a student asks' : 'no student asks') + ' (' + fx(l.ask ? P_REQUEST : sub(ONE, P_REQUEST)) + ')').join(', or ');
      out += '<div class="gk-panel" id="twin-work"><p>For <b>both</b> desks, tomorrow evening has 2 cameras only if ' + how + '.</p>' +
        '<p>Chance: ' + ways.map(l => l.coins.map(fx).concat(fx(l.ask ? P_REQUEST : sub(ONE, P_REQUEST))).join(' × ')).join(' + ') + ' = <b>' + fx(P[i][full]) + '</b> for Desk North and <b>' + fx(P[i][full]) + '</b> for Desk South.</p></div>';
      out += tw.predict === 'same'
        ? fb('ok', 'Tomorrow uses only tomorrow’s coins and tonight’s count. Both desks start from ' + camText(i) + '.')
        : tw.predict === 'south'
          ? fb('no', 'After 6 days it feels "due". But the story says a camera on loan comes back with probability ' + fx(P_RETURN) + ' <b>no matter how long</b> it has been away. Day 7 is like day 1.')
          : fb('no', 'A busy week does not change tomorrow’s coins. Tomorrow a student asks with probability ' + fx(P_REQUEST) + ' at both desks.');
      const rBtn = (id, text) => btn('data-do="remember" data-v="' + id + '"', text, tw.remember === id ? ' picked' : '');
      out += '<h3>So what must the desk remember?</h3><p>Tonight, to give the chances for tomorrow evening, which information is enough?</p>' +
        row(rBtn('count', 'The number of cameras on the shelf') + rBtn('which', 'Which camera is out, and since when') + rBtn('all', 'The whole week: every count and every request'));
      const why = {
        which: fb('no', 'The two desks differ here, but they have the same chances for tomorrow. Which camera, and how long, changes nothing ahead.'),
        all: fb('no', 'That works, but it is more than needed: two different weeks gave the same future. Keep only what changes the future.'),
        count: fb('ok', 'Tonight’s count is enough. Different pasts with the same count have the same future. That count is the <b>state</b>, and "the past does not matter once you know the state" is the <b>Markov property</b> (slide 10).')
      };
      if (!tw.remember) return out;
      out += why[tw.remember];
      if (tw.remember !== 'count') return out;
      const sBtn = (id, text) => btn('data-do="sentence" data-v="' + id + '"', text, tw.sentence === id ? ' picked' : '');
      out += '<h3>Which sentence of the story makes this work?</h3><div class="gk-row ld-stack">' + STORY_SENTENCES.map(s => sBtn(s[0], s[1])).join('') + '</div>';
      const sWhy = {
        age: fb('ok', 'If long loans came back more often, Desk South would have a better chance. Then the count alone would not be enough: the state would also need each loan’s age. In the insurance example (slide 52) the premium depends on the last two years, so there the state must remember two years.'),
        ask: fb('no', 'That sentence is about requests. It is true at every desk, every day. Look for the sentence about how long a camera has been away.'),
        look: fb('no', 'That sentence says when we look. It does not say why the past can be forgotten.')
      };
      return out + (tw.sentence ? sWhy[tw.sentence] : '');
    }

    // --- Step 3: all chances for one day ---
    function returnsLabel(l) {
      if (!l.away.length) return 'nothing on loan';
      if (l.away.length === 1) return 'camera ' + l.away[0] + (l.returned.length ? ' back' : ' not back');
      if (l.returned.length === l.away.length) return 'A and B back';
      return l.returned.length ? 'only ' + l.returned[0] + ' back' : 'nothing back';
    }
    function treeTable(i, key, opt) {
      const leaves = TREE_LEAVES[i], values = S.build[key];
      const rows = leaves.map((l, k) => {
        const first = k % 2 === 0;
        const ret = first ? '<td class="ret" rowspan="2">' + returnsLabel(l) + (l.away.length ? '<span class="coin">' + l.coins.map(fx).join(' × ') + '</span>' : '') + '</td>' : '';
        const req = '<td>' + (l.ask ? 'a student asks' : 'no student') + '<span class="coin">' + fx(l.ask ? P_REQUEST : sub(ONE, P_REQUEST)) + '</span></td>';
        const prob = opt.probs ? '<td class="num">' + (opt.probs === 'all' || (opt.probs === 'first' && k === 0) ? (opt.probs === 'first' && k === 0 ? '?' : fx(l.p)) : '') + '</td>' : '';
        const cell = opt.locked
          ? '<td class="num"><b>' + l.next + '</b>' + (l.lost ? ' <span class="gk-small">(lost)</span>' : '') + '</td>'
          : '<td class="num"><input class="gk-num ld-count" type="text" inputmode="numeric" autocomplete="off" data-bind="build.' + key + '.' + k + '" value="' + escapeAttr(values[k]) + '" aria-label="Closing count, leaf ' + (k + 1) + '" data-enter="buildCheck"></td>';
        return '<tr' + (opt.probs === 'first' && k === 0 ? ' class="hl"' : '') + '>' + ret + req + prob + cell + '</tr>';
      }).join('');
      return '<div class="ld-scroll"><table class="ld-table ld-tree" id="tree-' + i + '"><tr><th>Morning returns</th><th>Request</th>' + (opt.probs ? '<th class="num">Path chance</th>' : '') + '<th class="num">Closing count</th></tr>' + rows + '</table></div>';
    }
    function rowInputs(i) {
      const key = 'row' + i;
      return '<div class="ld-fields" id="row-inputs-' + i + '">' + STATES.map(j => '<label>' + pij(i, j) + ' =<input class="gk-num ld-frac" type="text" inputmode="text" autocomplete="off" data-bind="build.' + key + '.' + j + '" value="' + escapeAttr(S.build[key][j]) + '" aria-label="p ' + i + j + '" data-enter="buildCheck"></label>').join('') + '</div>';
    }
    function knownRows() {
      const reached = S.build.sub, done = !!S.status.build || reached >= BUILD_SUBS.length;
      return STATES.map(i => (done || reached > BUILD_SUBS.indexOf('row' + i) ? P[i] : null));
    }
    function pSoFar() {
      const M = knownRows();
      return '<h3>P so far</h3><div class="ld-mats">' + matrixTable(M, { sums: true, id: 'p-so-far' }) + '</div>' +
        (M.some(Boolean) ? diagramSVG(M) : '<p class="gk-small gk-muted">The diagram appears here, row by row.</p>');
    }
    function renderBuild() {
      const b = S.build, part = BUILD_SUBS[b.sub] || 'done';
      let out = h2('build') + '<p>Now find <b>every</b> chance for one day, not just one played day. Each way the morning coins can fall is one path in a tree.</p>';
      const ctrl = (label) => row(btn('data-do="buildCheck"', label || 'Check', ' primary') + (b.wrong ? btn('data-do="buildShow"', 'Show me') : ''));
      // Row 0, with a full tree.
      out += '<h3>Row 0: tonight the shelf is empty</h3><p>Both cameras are on loan. Tomorrow each may come back, then a student may ask.</p>';
      if (part === 'tree0') {
        out += '<p>Fill in the closing count at the end of every path.</p>' + treeTable(0, 'tree0', {}) + ctrl() + b.msg;
        return out + pSoFar();
      }
      out += treeTable(0, 'tree0', { locked: true, probs: part === 'leaf0' ? 'first' : 'all' });
      if (part === 'leaf0') {
        const l = TREE_LEAVES[0][0];
        out += '<p>What is the chance of the shaded path: <b>' + returnsLabel(l) + '</b> and <b>' + (l.ask ? 'a student asks' : 'no student') + '</b>?</p>' +
          row('<input class="gk-num ld-frac" id="leaf-chance" type="text" autocomplete="off" data-bind="build.leaf0" value="' + escapeAttr(b.leaf0) + '" aria-label="Path chance" data-enter="buildCheck">' + btn('data-do="buildCheck"', 'Check', ' primary') + (b.wrong ? btn('data-do="buildShow"', 'Show me') : '')) + b.msg;
        return out + pSoFar();
      }
      if (part === 'row0') {
        out += '<p>Every path has chance ' + fx(TREE_LEAVES[0][0].p) + '. Now add the paths by their closing count. Fractions like 3/8 or decimals like 0.375 are fine.</p>' + rowInputs(0) + ctrl() + b.msg;
        return out + pSoFar();
      }
      out += '<p>Row 0 = ' + rowText(P)(0) + '.</p>';
      // Row 1, tree without path chances.
      out += '<h3>Row 1: tonight 1 camera on the shelf</h3><p>Camera ' + awayAt(1)[0] + ' is on loan, camera ' + CAMS[0] + ' is on the shelf.</p>';
      if (part === 'row1') {
        out += '<p>This time the tree has no path chances. Fill in the closing counts, then the row.</p>' + treeTable(1, 'tree1', {}) + rowInputs(1) + ctrl() + b.msg;
        return out + pSoFar();
      }
      out += treeTable(1, 'tree1', { locked: true, probs: 'all' }) + '<p>Row 1 = ' + rowText(P)(1) + '.</p>';
      // Row 2, no tree.
      out += '<h3>Row 2: tonight both cameras on the shelf</h3>';
      if (part === 'row2') {
        out += '<p>No tree this time. Think it through, then fill in the row.</p>' + rowInputs(2) + ctrl() + b.msg;
        return out + pSoFar();
      }
      out += '<p>Row 2 = ' + rowText(P)(2) + '.</p>' + b.msg;
      out += fb(S.helped.build ? 'shown' : 'ok', 'All three rows are done. The table is the <b>transition matrix P</b> (slide 13), and the picture is its <b>state transition diagram</b> (slide 19). Every row adds up to 1 (slide 14). There is no arrow 2 → 0: one day has at most one request.');
      return out + pSoFar();
    }
    // Diagnose a typed row against the tree's leaves.
    function diagnoseRow(i, values, wrongBefore) {
      const leaves = TREE_LEAVES[i], notes = [];
      const parsed = values.map(parseNumber);
      if (parsed.some(Number.isNaN)) return { ok: false, text: 'Type a number in each box, for example 3/8 or 0.375.' };
      const okAll = STATES.every(j => isChance(values[j], P[i][j]));
      if (okAll) return { ok: true };
      const total = parsed.reduce((a, b) => a + b, 0);
      if (Math.abs(total - 1) > DECIMAL_TOLERANCE * 3) notes.push('Your row adds up to ' + Number(total.toFixed(4)) + '. Every row of P adds up to 1 (slide 14): tomorrow the count must be 0, 1 or 2.');
      STATES.forEach(j => {
        const s = values[j], m = chanceMatch(s, P[i][j]);
        if (m === 'ok') return;
        const ends = leaves.filter(l => l.next === j), name = pij(i, j);
        if (m === 'close') { notes.push(name + ': close. Give at least 3 decimals, or a fraction like 3/8.'); return; }
        if (i === N_CAMS && j === 0) { notes.push(name + ': going from ' + N_CAMS + ' to 0 in one day needs ' + N_CAMS + ' loans, but at most one student asks per day.'); return; }
        if (i === N_CAMS && j === N_CAMS && isChance(s, ONE)) { notes.push(name + ': a student asks with probability ' + fx(P_REQUEST) + ' and takes a camera, so staying at ' + N_CAMS + ' is not certain.'); return; }
        const lostLeaf = ends.find(l => l.lost);
        if (lostLeaf && isChance(s, sub(P[i][j], lostLeaf.p))) { notes.push(name + ': you missed the path "' + returnsLabel(lostLeaf) + ', a student asks". The student leaves without a camera, and that day also ends at ' + j + '.'); return; }
        const missed = ends.find(l => isChance(s, sub(P[i][j], l.p)));
        if (missed) { notes.push(name + ': one path is missing: "' + returnsLabel(missed) + ', ' + (missed.ask ? 'a student asks' : 'no student') + '" also ends at ' + j + '.'); return; }
        const extra = leaves.find(l => l.next !== j && isChance(s, add(P[i][j], l.p)));
        if (extra) { notes.push(name + ': one path too many: "' + returnsLabel(extra) + ', ' + (extra.ask ? 'a student asks' : 'no student') + '" ends at ' + extra.next + ', not ' + j + '.'); return; }
        notes.push(name + ': ' + (wrongBefore >= 1 ? ends.length + ' path' + (ends.length === 1 ? '' : 's') + ' end' + (ends.length === 1 ? 's' : '') + ' at ' + j + '. Add their chances.' : 'add the chances of all paths that end at ' + j + '.'));
      });
      return { ok: false, text: notes.join('<br>') };
    }

    // --- Step 4: two days ahead ---
    function renderTwo() {
      const tw = S.two, a = TWO_STEP.from, z = TWO_STEP.to;
      const paths = STATES.map(k => ({ k, d1: P[a][k], d2: P[k][z], prod: mul(P[a][k], P[k][z]) }));
      const hot = tw.sumOk ? [] : STATES.flatMap(k => [a + '>' + k, k + '>' + z]);
      let out = h2('two') + '<p>Tonight the shelf is empty (' + a + ' cameras). What is the chance of <b>' + z + ' cameras</b> on the shelf <b>two evenings</b> from now?</p>' +
        '<p>Tomorrow evening the desk is at 0, 1 or 2: a stopover k. Every path ' + a + ' → k → ' + z + ' is marked on the diagram.</p>' + diagramSVG(P, { hot, label: 'Paths from ' + a + ' to ' + z + ' in two days' });
      const prodCell = (p, k) => tw.prodOk ? '<b>' + fx(p.prod) + '</b>' : '<input class="gk-num ld-frac" type="text" autocomplete="off" data-bind="two.prod.' + k + '" value="' + escapeAttr(tw.prod[k]) + '" aria-label="Chance of path through ' + p.k + '" data-enter="twoCheck">';
      out += '<div class="ld-scroll"><table class="ld-table" id="two-paths"><tr><th>Path</th><th class="num">day 1</th><th class="num">day 2</th><th class="num">path chance</th></tr>' +
        paths.map((p, k) => '<tr><td>' + a + ' → ' + p.k + ' → ' + z + '</td><td class="num">' + pij(a, p.k) + ' = ' + fx(p.d1) + '</td><td class="num">' + pij(p.k, z) + ' = ' + fx(p.d2) + '</td><td class="num">' + prodCell(p, k) + '</td></tr>').join('') + '</table></div>';
      if (!tw.prodOk) return out + '<p>Fill in the chance of each path.</p>' + row(btn('data-do="twoCheck"', 'Check', ' primary') + (tw.wrong ? btn('data-do="twoShow"', 'Show me') : '')) + tw.msg;
      out += '<p>Now the answer: the chance of ' + z + ' cameras two evenings from now.</p>';
      if (!tw.sumOk) return out + row(p2ij(a, z) + ' = <input class="gk-num ld-frac" id="two-sum" type="text" autocomplete="off" data-bind="two.sum" value="' + escapeAttr(tw.sum) + '" aria-label="Two-day chance" data-enter="twoCheck">' + btn('data-do="twoCheck"', 'Check', ' primary') + (tw.wrong ? btn('data-do="twoShow"', 'Show me') : '')) + tw.msg;
      out += tw.msg;
      out += '<h3>Check it with many desks</h3><p>Let ' + SIM_RUNS + ' desks start tonight with an empty shelf. Each flips its own coins for two days.</p>' +
        row(btn('data-do="simulate"', tw.sim.runs ? 'Run ' + SIM_RUNS + ' more desks' : 'Run ' + SIM_RUNS + ' desks', ' primary'));
      if (tw.sim.runs) out += '<p id="sim-result">' + tw.sim.hits + ' of ' + tw.sim.runs + ' desks had ' + z + ' cameras on day 2: ' + (tw.sim.hits / tw.sim.runs).toFixed(3) + '. The exact chance is ' + fx(P2[a][z]) + ' = ' + dec(P2[a][z]) + '. More desks bring the share closer.</p>';
      out += '<h3>All two-day chances at once</h3><p>Do the same sum for every start and every end, and you get the table P² (slides 26–27). Your number is row ' + a + ', column ' + z + '.</p>' +
        matrixTable(P2, { cells: [a + ',' + z], sums: true, id: 'p2-table' }) +
        '<p class="gk-small">The lecture does the same sum for the beer example (slides 22–23) and the cola example (slides 31–32).</p>';
      return out;
    }

    // --- Step 5: name the parts ---
    const slotsOk = () => Object.keys(SLOT_ANSWER).every(id => S.name.slots[id] === SLOT_ANSWER[id]);
    const namesOk = () => NAME_ROWS.every(r => S.name.names[r.id] === r.id);
    function renderName() {
      const nm = S.name;
      const nameRows = NAME_ROWS.map(r => {
        const v = nm.names[r.id] || '';
        const mark = nm.namesChecked && v ? (v === r.id ? '<span style="color:var(--good)">✓</span>' : '<span style="color:var(--critical)">✗</span>') : '';
        return '<b>' + r.label + '</b><select data-name="' + r.id + '" aria-label="' + r.label.replace(/<[^>]+>/g, '') + '"><option value="">choose…</option>' +
          NAME_OPTIONS.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + escapeAttr(o[1]) + '</option>').join('') + '</select><span>' + mark + '</span>';
      }).join('');
      let out = h2('name') + '<p>You have used every part of a Markov chain. Now give each part its name from the lecture (slides 4–14, 24).</p>' +
        '<div class="gk-names">' + nameRows + '</div>' + row(btn('data-do="namesCheck"', 'Check names', ' primary') + (nm.namesChecked && !namesOk() ? btn('data-do="namesShow"', 'Show me') : ''));
      if (nm.namesChecked) {
        const wrong = NAME_ROWS.filter(r => nm.names[r.id] && nm.names[r.id] !== r.id), empty = NAME_ROWS.filter(r => !nm.names[r.id]);
        out += namesOk() ? fb(S.helped.name ? 'shown' : 'ok', 'Each part of your desk now has its name.')
          : fb('no', wrong.map(r => '<b>' + r.label + '</b>: you chose "' + escapeAttr(NAME_OPTIONS.find(o => o[0] === nm.names[r.id])[1]) + '". ' + NAME_WHY[nm.names[r.id]]).join('<br>') +
            (empty.length ? (wrong.length ? '<br>' : '') + 'Still empty: ' + empty.map(r => r.label).join(', ') + '.' : ''));
      }
      if (!namesOk()) return out;
      // The one-day rule from tiles.
      const slot = id => {
        const v = nm.slots[id], st = nm.slotsChecked && v ? (v === SLOT_ANSWER[id] ? ' ok' : ' no') : '';
        return '<span class="gk-slot' + (nm.slotSel === id ? ' sel' : '') + st + '" data-do="slot" data-slot="' + id + '" role="button" tabindex="0" title="' + escapeAttr(SLOT_ROLE[id]) + '">' + (v ? tileLabel(v) : '&nbsp;') + '</span>';
      };
      const used = new Set(Object.values(nm.slots));
      out += '<h3>Write the one-day rule</h3><p>Let R = the number of cameras that come back tomorrow morning, and D = 1 if a student asks (else 0). Click a box, then a tile. Click a filled box to empty it. Some tiles are traps.</p>' +
        '<div class="gk-formula" id="rule-formula">X<sub>t+1</sub> = ' + slot('next') + '<br>R counts returns among ' + slot('among') + ' cameras on loan, each with chance ' + fx(P_RETURN) + '</div>' +
        '<p class="gk-small">Selected box: ' + SLOT_ROLE[nm.slotSel] + '</p>' +
        '<div class="gk-bank">' + TILES.map(x => '<button class="gk-tile" data-do="tile" data-tile="' + x[0] + '"' + (used.has(x[0]) ? ' disabled' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
        row(btn('data-do="slotsCheck"', 'Check the rule', ' primary') + (nm.slotsChecked && !slotsOk() ? btn('data-do="slotsShow"', 'Show me') : ''));
      if (nm.slotsChecked && !slotsOk()) {
        out += fb('no', Object.keys(SLOT_ANSWER).filter(id => nm.slots[id] !== SLOT_ANSWER[id]).map(id => {
          const v = nm.slots[id];
          return v ? '<b>' + tileLabel(v) + '</b>: ' + ((SLOT_WHY[id] || {})[v] || 'not this one. ' + SLOT_ROLE[id]) : SLOT_ROLE[id] + ' (empty)';
        }).join('<br>'));
      }
      if (!slotsOk() || !nm.slotsChecked) return out;
      out += fb(S.helped.name ? 'shown' : 'ok', 'This is the rule you used in step 1 and in every tree. The max(0, …) is the lost request.');
      // Classification on the diagram.
      out += '<h3>Classify the states</h3>' + diagramSVG(P);
      CLASS_QUESTIONS.forEach((q, n) => {
        if (n > nm.q) return;
        const pick = nm.pick[q.id];
        out += '<p>' + q.prompt + '</p>' + row(q.options.map(o => btn('data-do="classPick" data-q="' + q.id + '" data-v="' + o[0] + '"' + (n < nm.q ? ' disabled' : ''), o[1], pick === o[0] ? ' picked' : '')).join(''));
        if (pick) out += pick === q.answer ? fb('ok', q.right) : fb('no', q.why[pick] || 'Look again at the arrows.');
      });
      return out;
    }

    // --- Step 6: twist ---
    function renderTwist() {
      const tw = S.twist, a = TWO_STEP.from, z = TWO_STEP.to;
      let out = h2('twist') + '<p><b>New rule:</b> the return box is opened only after the first student of the day. So the request comes <b>first</b>. Cameras that come back that morning cannot serve it. Everything else stays the same.</p>' +
        '<p class="gk-small">In step 5 this was a trap tile: X<sub>t+1</sub> = max(0, X<sub>t</sub> − D) + R.</p>' +
        '<h3>Predict: which rows of P change?</h3><p>Tick the rows you expect to change, then check.</p>' +
        row(STATES.map(i => btn('data-do="twistRow" data-v="' + i + '"' + (tw.rowsChecked ? ' disabled' : ''), (tw.rows.includes(i) ? '☑' : '☐') + ' Row ' + i + ' (' + camText(i) + ' tonight)', tw.rows.includes(i) ? ' picked' : '')).join('')) +
        (tw.rowsChecked ? '' : row(btn('data-do="twistRowsCheck"', 'Check: rebuild P with the new order', ' primary')));
      if (!tw.rowsChecked) return out;
      out += '<div class="ld-mats">' + matrixTable(P, { caption: 'Before: returns first', id: 'p-before' }) + matrixTable(T, { caption: 'Now: request first', changed: CHANGED_ROWS, id: 'p-after' }) + '</div>';
      const lines = STATES.map(i => {
        const changed = CHANGED_ROWS.includes(i), picked = tw.rows.includes(i), mark = changed === picked ? '✓' : '✗';
        if (changed) return mark + ' <b>Row ' + i + ' changes</b>: ' + rowText(P)(i) + ' → ' + rowText(T)(i) + '. The shelf is empty when the student asks, so the student always leaves without a camera. Cameras that come back stay on the shelf.';
        return mark + ' <b>Row ' + i + ' stays</b>: a camera is on the shelf when the student asks, so the order does not matter.';
      });
      const allRight = STATES.every(i => CHANGED_ROWS.includes(i) === tw.rows.includes(i));
      out += fb(allRight ? 'ok' : 'no', lines.join('<br>'));
      out += '<h3>Predict, then check</h3><p>Start again from an empty shelf tonight. With the new rule, is ' + z + ' cameras on the shelf two evenings later…</p>';
      const pBtn = (id, text) => btn('data-do="twistPredict" data-v="' + id + '"' + (tw.checked ? ' disabled' : ''), text, tw.predict === id ? ' picked' : '');
      out += row(pBtn('more', 'more likely') + pBtn('less', 'less likely') + pBtn('same', 'the same'));
      if (!tw.predict) return out;
      if (!tw.checked) return out + row(btn('data-do="twistCheck"', 'Check: recompute P²', ' primary'));
      const before = P2[a][z], after = T2[a][z], dir = value(after) > value(before) ? 'more' : value(after) < value(before) ? 'less' : 'same';
      out += '<div class="gk-panel" id="twist-p2"><p>' + p2ij(a, z) + ': before <b>' + fx(before) + '</b> ≈ ' + dec(before) + ', now <b>' + fx(after) + '</b> ≈ ' + dec(after) + '.</p></div>';
      out += tw.predict === dir
        ? fb('ok', 'The shelf is fuller with the new rule.')
        : fb('no', 'Many people expect "less", because the new rule is worse for students. But the shelf is fuller.');
      out += '<p>Why? A student who finds an empty shelf now leaves, so the camera that comes back stays on the shelf. A fuller shelf does <b>not</b> mean better service: from an empty shelf, the chance that tomorrow’s student leaves without a camera goes from <b>' + fx(lostChance(a, false)) + '</b> to <b>' + fx(lostChance(a, true)) + '</b>.</p>' +
        '<p>What stays: the state (the count, 0 to ' + N_CAMS + '), and the classification: ' + (TWIST_CHAIN.irreducible ? 'one class, ' : '') + (TWIST_CHAIN.allRecurrent ? 'all recurrent, ' : '') + (TWIST_CHAIN.periods.every(p => p === 1) ? 'aperiodic' : 'periodic') + '. The order of events inside one day changes the numbers in P, not the states.</p>';
      ctx.assembled();
      return out + summaryCard();
    }
    function modelLines() {
      const a = TWO_STEP.from, z = TWO_STEP.to;
      return [
        'State: X_t = cameras on the shelf at closing on day t. State space {' + STATES.join(', ') + '}.',
        'One day: returns first (each of the 2 − X_t cameras on loan comes back with chance ' + fx(P_RETURN) + '), then one request with chance ' + fx(P_REQUEST) + '. X_t+1 = max(0, X_t + R − D).',
        'Markov property: holds because a camera’s return chance does not depend on how long it has been away.',
        'P (rows = tonight, columns = tomorrow): ' + STATES.map(i => rowText(P)(i)).join(' ') + '.',
        'Classes: one class {' + CHAIN.classes[0].join(', ') + '}; all states recurrent and aperiodic, so the chain is ergodic.',
        'Two days: p(2)_' + a + z + ' = ' + fx(P2[a][z]) + '.',
        'Twist (request first): only row ' + CHANGED_ROWS.join(', ') + ' changes, to ' + CHANGED_ROWS.map(i => rowText(T)(i)).join(' ') + '; p(2)_' + a + z + ' = ' + fx(T2[a][z]) + '; lost request from an empty shelf: ' + fx(lostChance(a, false)) + ' → ' + fx(lostChance(a, true)) + '.'
      ];
    }
    function summaryCard() {
      const a = TWO_STEP.from, z = TWO_STEP.to;
      const helpedSteps = activity.steps.filter(s => S.status[s.id] === 'helped').map(s => s.title);
      return '<h3>Your model</h3><div class="gk-model" id="your-model">' +
        '<p><b>State:</b> X<sub>t</sub> = cameras on the shelf at closing on day t. <b>State space:</b> {' + STATES.join(', ') + '}.</p>' +
        '<p><b>One day:</b> returns first (each of the 2 − X<sub>t</sub> cameras on loan, chance ' + fx(P_RETURN) + '), then one request (chance ' + fx(P_REQUEST) + '). X<sub>t+1</sub> = max(0, X<sub>t</sub> + R − D).</p>' +
        '<p><b>Markov property:</b> holds because the return chance does not depend on how long a camera has been away.</p>' +
        matrixTable(P, { caption: 'P: rows = tonight, columns = tomorrow evening' }) +
        '<p><b>Classes:</b> one class {' + CHAIN.classes[0].join(', ') + '}, all recurrent, aperiodic: ergodic.</p>' +
        '<p><b>Two days:</b> ' + p2ij(a, z) + ' = ' + fx(P2[a][z]) + '.</p>' +
        '<p><b>Twist</b> (request first): only row ' + CHANGED_ROWS.join(', ') + ' changes; ' + p2ij(a, z) + ' = ' + fx(T2[a][z]) + '; lost request from an empty shelf ' + fx(lostChance(a, false)) + ' → ' + fx(lostChance(a, true)) + '.</p></div>' +
        (helpedSteps.length ? '<p class="gk-small">Steps where you used "Show me": ' + helpedSteps.join(', ') + '. Try those again later without help.</p>' : '<p class="gk-small">You did every step without "Show me".</p>') +
        row(btn('id="guided-download" data-do="download"', 'Download my model'));
    }
    const downloadLines = () => [activity.title, '',
      ...activity.steps.map(s => s.title + ': ' + (S.status[s.id] === 'done' ? 'done' : S.status[s.id] === 'helped' ? 'done with Show me' : 'not finished')),
      '', 'MODEL', ...modelLines()];

    // --- Actions ---
    const ACTIONS = {
      download() { ctx.download(downloadLines()); return false; },
      // Step 1
      reveal() { if (S.play.phase < 2) S.play.phase++; },
      playCheck() {
        const pl = S.play, d = WEEK[pl.day - 1], v = parseCount(pl.v);
        if (pl.phase !== 2) return;
        if (Number.isNaN(v)) { pl.msg = fb('no', 'Type a whole number: 0, 1 or 2.'); return; }
        track('check');
        const why = diagnoseCount(d.before, d.returned.length, d.ask, v);
        if (why) { pl.wrong++; pl.msg = fb('no', why); return; }
        pl.phase = 3; pl.msg = fb('ok', dayResult(d));
      },
      playShow() { const pl = S.play, d = WEEK[pl.day - 1]; pl.v = String(d.after); pl.phase = 3; showMe('play'); pl.msg = fb('shown', dayResult(d)); },
      nextDay() { const pl = S.play; pl.day++; pl.phase = 0; pl.v = ''; pl.msg = ''; pl.wrong = 0; if (pl.day > DAYS) finish('play'); },
      // Step 2
      predict(el) { S.twin.predict = el.dataset.v; },
      twinCheck() { S.twin.checked = true; track('check'); },
      remember(el) { S.twin.remember = el.dataset.v; track('check'); },
      sentence(el) { S.twin.sentence = el.dataset.v; track('check'); if (S.twin.remember === 'count' && S.twin.sentence === 'age') finish('twin'); },
      // Step 3
      buildCheck() {
        const b = S.build, part = BUILD_SUBS[b.sub];
        if (!part) return;
        const advance = msg => { b.sub++; b.wrong = 0; b.msg = msg || ''; if (b.sub >= BUILD_SUBS.length) finish('build'); };
        if (part === 'tree0' || part === 'row1') {
          const i = part === 'tree0' ? 0 : 1, key = 'tree' + i, notes = [];
          track('check');
          TREE_LEAVES[i].forEach((l, k) => {
            const v = parseCount(b[key][k]);
            const why = Number.isNaN(v) ? 'type a whole number.' : diagnoseCount(i, l.returned.length, l.ask, v);
            if (why) notes.push('Path ' + (k + 1) + ' (' + returnsLabel(l) + ', ' + (l.ask ? 'a student asks' : 'no student') + '): ' + why);
          });
          if (notes.length) { b.wrong++; b.msg = fb('no', notes.join('<br>')); return; }
          if (part === 'tree0') { advance(fb('ok', 'Every closing count is right. One path ends with a lost request.')); return; }
        }
        if (part === 'leaf0') {
          const l = TREE_LEAVES[0][0], m = chanceMatch(b.leaf0, l.p);
          if (m === 'empty') { b.msg = fb('no', 'Type a chance, for example 1/4 or 0.25.'); return; }
          track('check');
          if (m === 'ok') { advance(fb('ok', 'Multiply along the path: ' + l.coins.map(fx).join(' × ') + ' × ' + fx(P_REQUEST) + ' = ' + fx(l.p) + ' (independent coins, Week 10 slides 8–9). Every path has this chance.')); return; }
          b.wrong++;
          const pRet = l.coins.reduce(mul, ONE);
          b.msg = fb('no', isChance(b.leaf0, pRet) ? 'That is the two return coins. The request coin (' + fx(P_REQUEST) + ') is on this path too.'
            : isChance(b.leaf0, fr(l.coins.length + 1, 2)) || isChance(b.leaf0, add(pRet, P_REQUEST)) ? 'All three things must happen, so multiply the chances. Do not add them.'
              : isChance(b.leaf0, P_REQUEST) ? 'One coin is not enough: this path has ' + (l.coins.length + 1) + ' coins. Multiply them all.'
                : m === 'close' ? 'Close. Give at least 3 decimals, or a fraction.' : 'Multiply the chances of the coins on the path.');
          return;
        }
        const i = ROW_OF_SUB[part];
        // WHY: row 1 was already counted with its tree above; every other row counts here.
        if (part !== 'row1') track('check');
        const res = diagnoseRow(i, b['row' + i], b.wrong);
        if (!res.ok) { b.wrong++; b.msg = fb('no', res.text); return; }
        // WHY: after the last row the step's closing message says it all; no extra line.
        advance(i === N_CAMS ? '' : fb('ok', 'Row ' + i + ' = ' + rowText(P)(i) + '. It adds up to 1. Its arrows are now in the diagram.'));
      },
      buildShow() {
        const b = S.build, part = BUILD_SUBS[b.sub];
        if (!part) return;
        showMe('build');
        const advance = msg => { b.sub++; b.wrong = 0; b.msg = msg; if (b.sub >= BUILD_SUBS.length) finish('build'); };
        if (part === 'tree0') { b.tree0 = TREE_LEAVES[0].map(l => String(l.next)); advance(fb('shown', 'Each closing count = last night + cameras back − 1 if a student got a camera.')); return; }
        if (part === 'leaf0') { const l = TREE_LEAVES[0][0]; b.leaf0 = fx(l.p); advance(fb('shown', l.coins.map(fx).join(' × ') + ' × ' + fx(P_REQUEST) + ' = ' + fx(l.p) + '.')); return; }
        const i = ROW_OF_SUB[part];
        if (i === 1) b.tree1 = TREE_LEAVES[1].map(l => String(l.next));
        b['row' + i] = P[i].map(fx);
        advance(fb('shown', 'Row ' + i + ' = ' + rowText(P)(i) + ': add the chances of the paths that end at each count.'));
      },
      // Step 4
      twoCheck() {
        const tw = S.two, a = TWO_STEP.from, z = TWO_STEP.to;
        if (tw.sumOk) return;
        if (!tw.prodOk) {
          track('check');
          const notes = [];
          STATES.forEach(k => {
            const s = tw.prod[k], want = mul(P[a][k], P[k][z]), m = chanceMatch(s, want);
            if (m === 'ok') return;
            const name = 'Path ' + a + ' → ' + k + ' → ' + z + ': ';
            if (m === 'empty') notes.push(name + 'type a chance.');
            else if (isChance(s, add(P[a][k], P[k][z]))) notes.push(name + 'both days must happen, so multiply. Do not add.');
            else if (isChance(s, P[a][k]) || isChance(s, P[k][z])) notes.push(name + 'that is one day. Multiply day 1 by day 2.');
            else if (m === 'close') notes.push(name + 'close. Give at least 3 decimals, or a fraction.');
            else notes.push(name + 'multiply ' + pij(a, k) + ' by ' + pij(k, z) + '.');
          });
          if (notes.length) { tw.wrong++; tw.msg = fb('no', notes.join('<br>')); return; }
          tw.prodOk = true; tw.wrong = 0; tw.msg = fb('ok', 'Each path chance = day 1 × day 2. The Markov property lets day 2 start fresh from the stopover k.');
          return;
        }
        const m = chanceMatch(tw.sum, P2[a][z]);
        if (m === 'empty') { tw.msg = fb('no', 'Type a chance, for example 7/32 or 0.219.'); return; }
        track('check');
        if (m === 'ok') { tw.sumOk = true; tw.msg = fb('ok', p2ij(a, z) + ' = ' + STATES.map(k => fx(mul(P[a][k], P[k][z]))).join(' + ') + ' = <b>' + fx(P2[a][z]) + '</b> ≈ ' + dec(P2[a][z]) + '. The paths cannot happen together, so their chances add.'); finish('two'); return; }
        tw.wrong++;
        const firstVisit = sum(STATES.filter(k => k !== z).map(k => mul(P[a][k], P[k][z])));
        const single = STATES.find(k => isChance(tw.sum, mul(P[a][k], P[k][z])));
        tw.msg = fb('no', isChance(tw.sum, firstVisit) ? 'You left out the path ' + a + ' → ' + z + ' → ' + z + '. The question is where the desk is on day 2, not when it first reaches ' + z + '. A desk that is already at ' + z + ' on day 1 and stays there also counts.'
          : isChance(tw.sum, P[a][z]) ? 'That is ' + pij(a, z) + ', one day. We ask about two days.'
            : isChance(tw.sum, mul(P[a][z], P[a][z])) ? 'That is ' + pij(a, z) + ' × ' + pij(a, z) + '. On day 2 the desk starts from the stopover, so day 2 uses ' + pij('k', z) + '.'
              : single !== undefined ? 'That is only the path through ' + single + '. Add all three paths.'
                : m === 'close' ? 'Close. Give at least 3 decimals, or a fraction.' : 'Add the three path chances from the table.');
      },
      twoShow() {
        const tw = S.two, a = TWO_STEP.from, z = TWO_STEP.to;
        if (tw.sumOk) return;
        showMe('two');
        if (!tw.prodOk) { tw.prod = STATES.map(k => fx(mul(P[a][k], P[k][z]))); tw.prodOk = true; tw.wrong = 0; tw.msg = fb('shown', 'Each path chance = day 1 × day 2.'); return; }
        tw.sum = fx(P2[a][z]); tw.sumOk = true; finish('two');
        tw.msg = fb('shown', p2ij(a, z) + ' = ' + STATES.map(k => fx(mul(P[a][k], P[k][z]))).join(' + ') + ' = <b>' + fx(P2[a][z]) + '</b> ≈ ' + dec(P2[a][z]) + '.');
      },
      simulate() {
        const sim = S.two.sim, rnd = mulberry32(SIM_SEED + sim.batches), a = TWO_STEP.from, z = TWO_STEP.to;
        const step = i => {
          let u = rnd(), acc = 0;
          for (const j of STATES) { acc += value(P[i][j]); if (u < acc) return j; }
          return STATES[STATES.length - 1];
        };
        for (let r = 0; r < SIM_RUNS; r++) if (step(step(a)) === z) sim.hits++;
        sim.runs += SIM_RUNS; sim.batches++;
      },
      // Step 5
      namesCheck() { S.name.namesChecked = true; track('check'); if (!namesOk()) S.name.namesWrong++; },
      namesShow() { NAME_ROWS.forEach(r => { S.name.names[r.id] = r.id; }); showMe('name'); S.name.namesChecked = true; },
      slot(el) { const id = el.dataset.slot; delete S.name.slots[id]; S.name.slotSel = id; S.name.slotsChecked = false; },
      tile(el) {
        const nm = S.name, target = nm.slotSel && !nm.slots[nm.slotSel] ? nm.slotSel : Object.keys(SLOT_ANSWER).find(s => !nm.slots[s]);
        if (!target) return;
        nm.slots[target] = el.dataset.tile; nm.slotsChecked = false;
        nm.slotSel = Object.keys(SLOT_ANSWER).find(s => !nm.slots[s]) || target;
      },
      slotsCheck() { S.name.slotsChecked = true; track('check'); },
      slotsShow() { S.name.slots = Object.assign({}, SLOT_ANSWER); showMe('name'); S.name.slotsChecked = true; },
      classPick(el) {
        const nm = S.name, q = CLASS_QUESTIONS.find(x => x.id === el.dataset.q);
        nm.pick[q.id] = el.dataset.v;
        track('check');
        if (el.dataset.v === q.answer) { nm.q = Math.max(nm.q, CLASS_QUESTIONS.indexOf(q) + 1); if (nm.q >= CLASS_QUESTIONS.length) finish('name'); }
      },
      // Step 6
      twistRow(el) { const i = Number(el.dataset.v), r = S.twist.rows; S.twist.rows = r.includes(i) ? r.filter(x => x !== i) : r.concat(i).sort(); },
      twistRowsCheck() { S.twist.rowsChecked = true; track('check'); },
      twistPredict(el) { S.twist.predict = el.dataset.v; },
      twistCheck() { S.twist.checked = true; finish('twist'); track('twist'); }
    };

    // Text boxes write into S through data-bind="path.to.field" (no re-render while typing).
    function bind(path, v) {
      const keys = path.split('.'), last = keys.pop();
      const target = keys.reduce((o, k) => o[k], S);
      target[last] = v;
    }

    // --- What the kit shows ---
    return {
      dataCard: '<h3>The desk (always here)</h3>' +
        '<p>The desk owns <b>' + N_CAMS + '</b> identical cameras, ' + list(CAMS) + '.</p>' +
        '<p><b>One day, in this order:</b></p><ol class="gk-strip">' +
        '<li><b>Morning returns.</b> Each camera on loan comes back with probability <b>' + fx(P_RETURN) + '</b>, no matter how long it has been away.</li>' +
        '<li><b>A request?</b> With probability <b>' + fx(P_REQUEST) + '</b> one student asks for one camera.</li>' +
        '<li>If a camera is on the shelf, the student takes it. If not, the student leaves without one: a <b>lost request</b>.</li>' +
        '<li><b>Closing.</b> We count the cameras on the shelf.</li></ol>' +
        '<p class="gk-small">A camera lent today comes back at the earliest the next morning. All coin flips are independent.</p>' +
        '<p class="gk-small gk-muted">This story is made up for practice. The closest lecture example is the store with two machines that are up or down (Week 11, slide 21).</p>',
      steps: { play: renderPlay, twin: renderTwin, build: renderBuild, two: renderTwo, name: renderName, twist: renderTwist },
      actions: ACTIONS,
      // WHY: steps 4-6 show P, which is the answer of step 3.
      gate: Object.fromEntries(['two', 'name', 'twist'].map(id => [id, { ready: () => !!S.status.build, step: 'build', text: 'This step uses the table of one-day chances from step 3. Please finish step 3 first.' }])),
      onInput(t) { if (t.dataset.bind) bind(t.dataset.bind, t.value); },
      onChange(t) {
        if (!t.dataset.name) return false;
        S.name.names[t.dataset.name] = t.value; S.name.namesChecked = false;
        return true;
      }
    };
  }

  window.GUIDED_CUSTOM.lending = (app, opts) => window.GUIDED_KIT.mount(app, opts, { fresh, build });
})();
