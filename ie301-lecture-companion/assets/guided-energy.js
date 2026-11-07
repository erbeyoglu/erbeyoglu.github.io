/* Week 8 guided activity "energy" (Spend a limited upgrade budget): its own
   interactive flow on the shared frame. Order: spend the budget by hand → same
   budget, same future (the state) → the building-budget map → solve it backward
   in the lecture's table layout → name the parts and build the recursion →
   twist: a second limit (workdays). The frame (tabs, data card, progress, usage
   counts) is assets/guided-kit.js; guided.js loads this file and calls
   window.GUIDED_CUSTOM.energy. The step ids and titles live in
   assets/guided-data.js. The story and its numbers (including the workdays of
   the twist) are invented for practice and the page says so. Every number shown
   is computed from the data block below. Rationale: docs/guided_redesign/energy.md. */
(() => {
  'use strict';
  const { fb, btn, escapeHtml: escapeAttr, parseNumber: parseNum } = window.GUIDED_KIT;

  // === DATA (the only hand-typed numbers; everything shown is computed from these) ===
  const BUDGET = 6;
  const BUILDINGS = ['A', 'B', 'C'];
  // OPTIONS[building][x] = { g: cost in budget units, p: saving in MWh per year }; x = 0 is "none".
  const OPTIONS = [
    [{ g: 0, p: 0 }, { g: 2, p: 5 }, { g: 4, p: 8 }],
    [{ g: 0, p: 0 }, { g: 3, p: 8 }, { g: 5, p: 11 }],
    [{ g: 0, p: 0 }, { g: 2, p: 4 }, { g: 3, p: 7 }]
  ];
  // Twist only (step 6): installation workdays per option and the total limit. Invented for practice.
  const WORKDAYS = [[0, 1, 2], [0, 2, 3], [0, 1, 3]];
  const DAY_LIMIT = 4;
  // Step 2: two pairs of partial plans (choices at A and B), chosen to contrast "saved so far" with "budget left".
  const PAIR_SAME_SAVED = [[2, 0], [0, 1]];
  const PAIR_SAME_LEFT = [[0, 2], [1, 1]];
  // Step 4: size of the "bigger problem" used to compare listing all plans with DP.
  const SCALE_BUILDINGS = 10, SCALE_BUDGET = 20;

  // === MODEL ===
  const N = BUILDINGS.length, END = N + 1, NOPT = OPTIONS[0].length;
  const OPT_NAME = ['None', 'Option 1', 'Option 2'];
  const optLower = x => x === 0 ? 'none' : 'option ' + x;
  const key = (n, s) => n + '-' + s;
  const parseKey = k => k.split('-').map(Number);
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const optionsAt = n => OPTIONS[n - 1].map((o, x) => ({ x, g: o.g, p: o.p, w: WORKDAYS[n - 1][x] }));
  const allowedAt = (n, s, h) => optionsAt(n).filter(o => o.g <= s && (h === undefined || o.w <= h));

  // Backward DP over every budget 0..BUDGET; f_{N+1}(s) = 0 (money left over is worth nothing).
  function solveBudget() {
    const f = {}, best = {}, totals = {};
    range(0, BUDGET).forEach(s => { f[key(END, s)] = 0; });
    for (let n = N; n >= 1; n--) range(0, BUDGET).forEach(s => {
      const t = {};
      allowedAt(n, s).forEach(o => { t[o.x] = o.p + f[key(n + 1, s - o.g)]; });
      const m = Math.max(...Object.values(t));
      f[key(n, s)] = m; totals[key(n, s)] = t;
      best[key(n, s)] = Object.keys(t).map(Number).filter(x => t[x] === m);
    });
    return { f, best, totals };
  }
  const SOL = solveBudget();
  // WHY: the map shows only the budgets that can really occur (like Joe's map), not every 0..6.
  const REACH = { 1: [BUDGET] };
  for (let n = 1; n <= N; n++) REACH[n + 1] = [...new Set(REACH[n].flatMap(s => allowedAt(n, s).map(o => s - o.g)))].sort((a, b) => b - a);
  const DECISION_NODES = [];
  for (let n = N; n >= 1; n--) REACH[n].forEach(s => DECISION_NODES.push(key(n, s)));
  const END_NODES = REACH[END].map(s => key(END, s));
  const ARCS = [];
  DECISION_NODES.slice().reverse().forEach(k => { const [n, s] = parseKey(k); allowedAt(n, s).forEach(o => ARCS.push({ from: k, to: key(n + 1, s - o.g), n, s, x: o.x, g: o.g, p: o.p })); });

  function routeOf(bestOf, startState, step) {
    let st = startState; const steps = [];
    for (let n = 1; n <= N; n++) { const x = bestOf(n, st); steps.push({ n, x, st }); st = step(n, st, x); }
    return { steps, plan: steps.map(r => r.x), end: st };
  }
  const ROUTE = routeOf((n, s) => SOL.best[key(n, s)][0], BUDGET, (n, s, x) => s - OPTIONS[n - 1][x].g);

  // Twist: two limits, state (budget left s, workdays left h).
  function solveTwoLimits() {
    const k2 = (n, s, h) => n + '|' + s + '|' + h, f = {}, best = {};
    range(0, BUDGET).forEach(s => range(0, DAY_LIMIT).forEach(h => { f[k2(END, s, h)] = 0; }));
    for (let n = N; n >= 1; n--) range(0, BUDGET).forEach(s => range(0, DAY_LIMIT).forEach(h => {
      let m = -Infinity, arg = null;
      allowedAt(n, s, h).forEach(o => { const v = o.p + f[k2(n + 1, s - o.g, h - o.w)]; if (v > m) { m = v; arg = o.x; } });
      f[k2(n, s, h)] = m; best[k2(n, s, h)] = arg;
    }));
    const route = routeOf((n, st) => best[k2(n, st[0], st[1])], [BUDGET, DAY_LIMIT], (n, st, x) => [st[0] - OPTIONS[n - 1][x].g, st[1] - WORKDAYS[n - 1][x]]);
    return { f, best, k2, route, value: f[k2(1, BUDGET, DAY_LIMIT)] };
  }
  const TWO = solveTwoLimits();

  function runPlan(plan) {
    let left = BUDGET, total = 0, days = 0;
    const lines = plan.map((x, i) => {
      const o = OPTIONS[i][x], l = { n: i + 1, x, g: o.g, p: o.p, w: WORKDAYS[i][x], before: left, after: left - o.g };
      left -= o.g; total += o.p; days += WORKDAYS[i][x];
      return l;
    });
    return { lines, left, total, days, finished: plan.length === N };
  }
  const ALL_PLANS = [];
  (function enumerate(prefix) {
    if (prefix.length === N) { ALL_PLANS.push(prefix); return; }
    for (let x = 0; x < NOPT; x++) enumerate(prefix.concat(x));
  })([]);
  const FEASIBLE = ALL_PLANS.filter(p => runPlan(p).left >= 0);
  const BEST_TOTAL = Math.max(...FEASIBLE.map(p => runPlan(p).total));
  // The rule of thumb used as the benchmark: most saving per budget unit first, one option per building.
  function ratioRulePlan() {
    const plan = Array(N).fill(0), used = new Set(), cands = [];
    let left = BUDGET;
    OPTIONS.forEach((opts, i) => opts.forEach((o, x) => { if (o.g > 0) cands.push({ i, x, r: o.p / o.g }); }));
    cands.sort((a, b) => b.r - a.r);
    cands.forEach(c => { const g = OPTIONS[c.i][c.x].g; if (!used.has(c.i) && g <= left) { used.add(c.i); plan[c.i] = c.x; left -= g; } });
    return plan;
  }
  const RULE_PLAN = ratioRulePlan(), RULE_TOTAL = runPlan(RULE_PLAN).total;

  // === TEXT HELPERS ===
  const fH = (n, s) => 'f<sub>' + n + '</sub>(' + s + ')';
  const planText = p => p.map((x, i) => BUILDINGS[i] + ': ' + optLower(x)).join(' → ');
  const sumText = parts => parts.join(' + ');

  // === MAP (SVG) ===
  // Columns = "before building n" and End; rows = budget left. An arrow drops by the option's cost.
  const isNarrow = () => window.innerWidth <= 520;
  // WHY: a phone shows the map at about 55% size, so the phone geometry uses larger circles,
  // text and row spacing in SVG units (sc = text scale) to keep labels at about 12 px on screen.
  function geometry() {
    const g = isNarrow()
      ? { MX: { 1: 118, 2: 268, 3: 418, 4: 568 }, ROW: 66, TOP: 58, VIEW_W: 600, sc: 1.75, lsc: 1.55, R: 26 }
      : { MX: { 1: 110, 2: 250, 3: 390, 4: 530 }, ROW: 54, TOP: 50, VIEW_W: 580, sc: 1, lsc: 1, R: 19 };
    g.VIEW_H = g.TOP + BUDGET * g.ROW + 30 + 6 * g.sc;
    g.MY = s => g.TOP + (BUDGET - s) * g.ROW;
    return g;
  }
  const overlapArea = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));

  // WHY: 12 labelled arrows share a small grid, so each label is placed where it overlaps
  // the fewest circles and other labels (checked again by studio_dev/guided_walks/energy.py).
  function placeLabels(labelArcs, pos, G) {
    const { R, VIEW_W, VIEW_H } = G;
    const nodeBoxes = DECISION_NODES.concat(END_NODES).map(k => { const [x, y] = pos(k); return [x - R - 2, y - R - 2, x + R + 2, y + R + 2]; });
    const flatBoxes = ARCS.filter(a => a.x === 0).map(a => { const [x1, y1] = pos(a.from), [x2] = pos(a.to); return [x1, y1 - 3, x2, y1 + 3]; });
    const placed = [];
    return labelArcs.map(a => {
      const [x1, y1] = pos(a.from), [x2, y2] = pos(a.to);
      const w = (a.text.length * 8.4 + 10) * G.lsc, h = 19 * G.lsc;
      let best = null;
      for (let f = 0.2; f <= 0.801; f += 0.03) {
        const cx = x1 + (x2 - x1) * f, cy = y1 + (y2 - y1) * f, box = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
        let score = Math.abs(f - 0.45) * 4;
        placed.forEach(b => { score += overlapArea(box, b) * 100; });
        nodeBoxes.forEach(b => { score += overlapArea(box, b) * 100; });
        flatBoxes.forEach(b => { score += overlapArea(box, b) * 2; });
        if (box[0] < 0 || box[2] > VIEW_W || box[1] < 0 || box[3] > VIEW_H) score += 1e6;
        if (!best || score < best.score) best = { score, cx, cy, box, w, h };
      }
      placed.push(best.box);
      return Object.assign({}, a, best);
    });
  }

  function mapSVG(o) {
    const opt = Object.assign({ values: {}, hideLabels: false, best: null, path: null, active: null, ring: null, clickable: () => false, locked: () => false }, o);
    const G = geometry(), { MX, MY, sc, R, VIEW_W, VIEW_H } = G;
    const pos = k => { const [n, s] = parseKey(k); return [MX[n], MY(s)]; };
    const pathSet = new Set();
    if (opt.path) { let s = BUDGET; opt.path.forEach((x, i) => { pathSet.add(key(i + 1, s) + '>' + x); s -= OPTIONS[i][x].g; }); }
    const targets = opt.active ? ARCS.filter(a => a.from === opt.active).map(a => a.to) : [];
    let guides = '', lines = '', labels = '', nodes = '';
    range(0, BUDGET).forEach(s => { guides += '<line class="m-guide" x1="' + (MX[1] - R - 6) + '" y1="' + MY(s) + '" x2="' + (VIEW_W - 8) + '" y2="' + MY(s) + '"/>'; });
    ARCS.forEach(a => {
      const [x1, y1] = pos(a.from), [x2, y2] = pos(a.to);
      const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const onPath = pathSet.has(a.from + '>' + a.x);
      const isBest = !!(opt.best && opt.best[a.from] && opt.best[a.from].includes(a.x));
      const hot = opt.active === a.from;
      const cls = 'm-arc o' + a.x + (hot ? ' hot' : '') + (onPath ? ' path' : isBest ? ' best' : '') + (opt.active && !hot ? ' dim' : '');
      const marker = onPath || isBest ? 'best' : 'o' + a.x;
      lines += '<line class="' + cls + '" data-arc="' + a.from + '>' + a.x + '" x1="' + (x1 + ux * R).toFixed(1) + '" y1="' + (y1 + uy * R).toFixed(1) + '" x2="' + (x2 - ux * (R + 2)).toFixed(1) + '" y2="' + (y2 - uy * (R + 2)).toFixed(1) + '" marker-end="url(#ge-ah-' + marker + ')"/>';
    });
    const labelArcs = ARCS.filter(a => a.x > 0).map(a => Object.assign({}, a, { text: '+' + (opt.hideLabels ? '?' : a.p) }));
    placeLabels(labelArcs, pos, G).forEach(L => {
      const dim = opt.active && opt.active !== L.from;
      labels += '<g class="m-label"' + (dim ? ' opacity=".4"' : '') + '><rect class="m-pill" x="' + L.box[0].toFixed(1) + '" y="' + L.box[1].toFixed(1) + '" width="' + L.w.toFixed(1) + '" height="' + L.h.toFixed(1) + '" rx="' + (L.h / 2).toFixed(1) + '"/>' +
        '<text class="m-lab o' + L.x + '" x="' + L.cx.toFixed(1) + '" y="' + L.cy.toFixed(1) + '" style="font-size:' + (13.5 * G.lsc).toFixed(1) + 'px">' + L.text + '</text></g>';
    });
    DECISION_NODES.concat(END_NODES).forEach(k => {
      const [x, y] = pos(k), [n, s] = parseKey(k), v = opt.values[k];
      const cls = ['m-node', n === END ? 'end' : '', opt.active === k ? 'active' : '', targets.includes(k) ? 'target' : '', opt.ring === k ? 'ring' : '',
        opt.clickable(k) ? 'click' : '', opt.locked(k) ? 'locked' : ''].join(' ').replace(/\s+/g, ' ').trim();
      const name = (n === END ? 'End' : 'Before building ' + BUILDINGS[n - 1]) + ', ' + s + ' left';
      nodes += '<g class="' + cls + '" data-node="' + k + '"' + (opt.clickable(k) ? ' role="button" tabindex="0"' : '') + ' aria-label="' + name + '">' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + R + '"/>' +
        '<text x="' + x + '" y="' + y + '" style="font-size:' + (15 * sc).toFixed(1) + 'px"' + (v === undefined ? ' class="unknown"' : '') + '>' + (v === undefined ? '?' : v) + '</text></g>';
    });
    const cols = range(1, N).map(n => '<text class="m-col" x="' + MX[n] + '" y="20" style="font-size:' + (15 * sc).toFixed(1) + 'px">Before ' + BUILDINGS[n - 1] + '</text>').join('') +
      '<text class="m-col" x="' + MX[END] + '" y="20" style="font-size:' + (15 * sc).toFixed(1) + 'px">End</text>';
    const used = new Set(DECISION_NODES.concat(END_NODES).map(k => parseKey(k)[1]));
    const rows = range(0, BUDGET).map(s => '<text class="m-row' + (used.has(s) ? '' : ' empty') + '" x="4" y="' + (MY(s) + 5) + '" style="font-size:' + (14 * sc).toFixed(1) + 'px">' + s + ' left</text>').join('');
    // WHY: userSpaceOnUse keeps arrowheads one size; the default scales them with stroke width.
    const head = (id, color) => '<marker id="ge-ah-' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(' + color + ')"/></marker>';
    return '<div class="ge-map"><svg viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" role="img" aria-label="Map of buildings and budget left">' +
      '<defs>' + head('o0', '--axis') + head('o1', '--s1') + head('o2', '--s5') + head('best', '--s2') + '</defs>' +
      guides + cols + rows + lines + labels + nodes +
      '<text class="m-start" x="' + MX[1] + '" y="' + (MY(BUDGET) + R + 16 * sc) + '" style="font-size:' + (12 * sc).toFixed(1) + 'px">start</text></svg>' +
      '<div class="gk-legend"><span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--axis);stroke-width:2.5"/></svg>flat = none (saves 0)</span>' +
      '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s1);stroke-width:2"/></svg>option 1</span>' +
      '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s5);stroke-width:2;stroke-dasharray:7 5"/></svg>option 2</span>' +
      (opt.best || opt.path ? '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s2);stroke-width:5"/></svg>best choice</span>' : '') +
      '<span>An arrow drops by the option\'s cost. +8 on an arrow = its saving. Number in a circle = f, the most saving still possible from there.</span></div></div>';
  }
  const nodeName = k => { const [n, s] = parseKey(k); return (n === END ? 'End' : 'before ' + BUILDINGS[n - 1]) + ' with ' + s + ' left'; };

  // === STEP CONTENT (fixed data per step; answers computed) ===
  const ASK_NODE = key(2, 4), ASK_X = 1;
  const askOpt = OPTIONS[1][ASK_X];
  const askEnd = 4 - askOpt.g;
  function diagMap(entries, answer) { const d = {}; entries.forEach(([v, msg]) => { if (v !== answer && !(String(v) in d)) d[String(v)] = msg; }); return d; }
  const ARC_QUESTIONS = [
    { id: 'next', prompt: 'Look at the ringed circle: <b>before B, with 4 left</b>. You choose <b>B option 1</b>. Where does its arrow end? Type the budget left.', answer: askEnd,
      diag: diagMap([[4 - ASK_X, '4 − 1 uses the option <i>number</i>. Option 1 of building B <b>costs ' + askOpt.g + '</b>: 4 − ' + askOpt.g + ' = ' + askEnd + '.'],
        [4, 'You still pay for the option: the budget goes down by its cost.'], [4 + askOpt.g, 'Spending makes the budget smaller: 4 − ' + askOpt.g + ', not 4 + ' + askOpt.g + '.']], askEnd),
      hint: 'Budget left after = budget left now − the cost of the option.',
      right: 'Option 1 of B costs ' + askOpt.g + ', so the arrow drops from 4 to ' + askEnd + ' left. It carries B\'s saving, +' + askOpt.p + '.' },
    { id: 'count', prompt: 'How many arrows leave that circle (before B, 4 left)? Each arrow is one option you are <b>allowed</b> to choose.', answer: allowedAt(2, 4).length,
      diag: diagMap([[NOPT, 'Option 2 of B costs ' + OPTIONS[1][2].g + ', but only 4 is left. You cannot choose it, so it has no arrow.'],
        [NOPT - 2, '"None" is also a choice: it costs 0 and keeps the budget. It is the flat arrow.']], allowedAt(2, 4).length),
      hint: 'Count the options whose cost is at most 4. "None" counts too.',
      right: 'None (cost 0) and option 1 (cost ' + askOpt.g + ') fit into 4. Option 2 (cost ' + OPTIONS[1][2].g + ') does not, so it has no arrow.' },
    { id: 'end', prompt: 'At <b>End</b> a student still has 2 budget units. What are they worth in savings? (This number goes into every End circle.)', answer: 0,
      diag: diagMap([[2, 'Money left over is not energy saved. The story says leftover budget earns nothing.'], [-2, 'Leftover money is not a loss either. It is simply worth nothing.']], 0),
      hint: 'Read the rules in the data box: what is money left over worth?',
      right: 'Money left over is worth 0, whatever the amount. So every End circle holds 0.' }
  ];
  const NAME_ROWS = [
    { id: 'stage', label: 'Stage n', answer: 'building' },
    { id: 'state', label: 'State s', answer: 'left' },
    { id: 'decision', label: 'Decision x<sub>n</sub>(s)', answer: 'option' },
    { id: 'reward', label: 'Saving during the stage', answer: 'saving' },
    { id: 'next', label: 'Next state', answer: 'next' },
    { id: 'value', label: 'f<sub>n</sub>(s)', answer: 'f' }
  ];
  const NAME_OPTIONS = [
    ['sofar', 'the savings so far'],
    ['next', 's − gₙ(x): the budget left minus the cost of the option'],
    ['building', 'the building: n = 1, 2, 3 for A, B, C'],
    ['f', 'the most saving you can still get from building n to the end, with s left'],
    ['option', 'which option you take at building n: none, 1 or 2'],
    ['minusx', 's − x: the budget left minus the option number'],
    ['left', 'the budget left before building n'],
    ['saving', 'pₙ(x): the saving of the chosen option'],
    ['year', 'the year']
  ];
  const NAME_WHY = {
    sofar: 'Step 2 showed it: two students with the same savings had different futures.',
    minusx: 'x is only a name (option 1, option 2). The budget goes down by the cost gₙ(x).',
    year: 'There are no years here. The buildings give the order of the decisions.',
    next: 'This is what the decision does to the state.', building: 'This counts the decisions: one per building.',
    f: 'This is the number in each circle of your map.', option: 'This is what you clicked in step 1.',
    left: 'Together with the building, this is all the future depends on.', saving: 'These are the +numbers on the arrows.'
  };
  const TILES = [
    ['max', 'max'], ['min', 'min'], ['gle', 'g<sub>n</sub>(x) ≤ s'], ['xle', 'x ≤ s'], ['geq', 'g<sub>n</sub>(x) = s'],
    ['p', 'p<sub>n</sub>(x)'], ['pminus', 'p<sub>n</sub>(x) − g<sub>n</sub>(x)'], ['g', 'g<sub>n</sub>(x)'],
    ['sg', 's − g<sub>n</sub>(x)'], ['sx', 's − x'], ['s', 's'], ['zero', '0']
  ];
  const SLOT_ANSWER = { op: 'max', feas: 'gle', rew: 'p', next: 'sg', end: 'zero' };
  const SLOT_ORDER = Object.keys(SLOT_ANSWER);
  const SLOT_ROLE = { op: 'Do we want the largest or the smallest total?', feas: 'Which options are allowed?', rew: 'What does this building give you?', next: 'Where does the arrow end: how much budget is left?', end: 'End: what is money left over worth?' };
  const SLOT_WHY = {
    op: { min: 'We want the largest saving, so max.' },
    feas: { xle: 'x is the option number, not its cost. Compare the cost gₙ(x) with s.', geq: 'You may leave money unused. The cost must be at most s, not exactly s.' },
    rew: { pminus: 'Saving and budget are different units. The cost is already paid: the next building only gets s − gₙ(x).', g: 'That is the cost. This building gives you its saving.' },
    next: { sx: 'Subtract the cost of the option, not its number.', s: 'Then the budget would never go down. You could spend the same money twice.', sg: '' },
    end: { s: 'Money left over saves no energy. The story says it is worth nothing.' }
  };
  const tileLabel = id => (TILES.find(t => t[0] === id) || [null, ''])[1];
  const PARTS = [
    ['state', 'The state (what we must remember)', true, 'Budget left is not enough any more: we also need the workdays left. The state becomes the pair (s, h).'],
    ['allowed', 'The allowed options', true, 'An option must now fit both limits: gₙ(x) ≤ s and wₙ(x) ≤ h.'],
    ['next', 'The next state', true, 'Both parts go down: (s − gₙ(x), h − wₙ(x)).'],
    ['saving', 'The saving of an option', false, 'The savings pₙ(x) are the same numbers as before.'],
    ['end', 'The End value', false, 'Leftover money and leftover days are both worth nothing: f₄ = 0 stays.'],
    ['stage', 'The stages (buildings A, B, C)', false, 'We still decide one building at a time.']
  ];
  // Twist circle: the node "before C" on the old best route, and the workdays left there on that route.
  const TW_NODE = key(N, ROUTE.steps[N - 1].st);
  const TW_LEFT = ROUTE.steps[N - 1].st;
  const TW_DAYS_LEFT = DAY_LIMIT - ROUTE.plan.slice(0, N - 1).reduce((d, x, i) => d + WORKDAYS[i][x], 0);
  const TW_OLD = SOL.f[TW_NODE], TW_NEW = TWO.f[TWO.k2(N, TW_LEFT, TW_DAYS_LEFT)];
  const TW_DIRECTION = TW_NEW < TW_OLD ? 'less' : TW_NEW > TW_OLD ? 'more' : 'same';
  const ROUTE_DAYS = runPlan(ROUTE.plan).days;
  const TOTAL_DIRECTION = TWO.value < BEST_TOTAL ? 'less' : TWO.value > BEST_TOTAL ? 'more' : 'same';

  // === STATE ===
  const fresh = () => ({
    play: [], plays: [], playMsg: null, showAll: false,
    pair1: null, pair1Checked: false, pair2: null, pair2Checked: false, remember: null,
    arcs: { next: { v: '', ok: false, msg: null, wrong: 0 }, count: { v: '', ok: false, msg: null, wrong: 0 }, end: { v: '', ok: false, msg: null, wrong: 0 } },
    last: { v: {}, ok: {}, tried: false, wrong: 0, done: false, msg: null },
    fill: {}, active: null, solveNote: null, lockMsg: null,
    names: {}, namesChecked: false,
    slots: {}, slotSel: 'op', slotsChecked: false,
    tw: { days: '', daysOk: false, daysWrong: 0, daysMsg: null, circle: null, parts: [], partsChecked: false, total: null }
  });

  // === STEPS (built once per page with the kit's ctx) ===
  function build(ctx) {
    const { S, activity, track, finish, showMe, stepTitle } = ctx;
    const stepIds = activity.steps.map(s => s.id);

    // --- Step 1: play it ---
    function optionButton(o, left) {
      const dear = o.g > left;
      return '<button class="gk-btn ge-opt' + (dear ? ' dear' : '') + '" data-do="choose" data-x="' + o.x + '"><b>' + OPT_NAME[o.x] + '</b><span>cost ' + o.g + ' · saves ' + o.p + '</span></button>';
    }
    function budgetBar(run) {
      const cells = [];
      run.lines.forEach(l => { for (let i = 0; i < l.g; i++) cells.push('<span class="ge-cell spent" title="spent at ' + BUILDINGS[l.n - 1] + '">' + BUILDINGS[l.n - 1] + '</span>'); });
      while (cells.length < BUDGET) cells.push('<span class="ge-cell" title="not spent">·</span>');
      return '<div class="ge-bar" aria-label="Budget: ' + (BUDGET - run.left) + ' of ' + BUDGET + ' spent">' + cells.join('') + '<span class="gk-small">&nbsp;' + run.left + ' of ' + BUDGET + ' left</span></div>';
    }
    function renderPlay() {
      const run = runPlan(S.play);
      let out = '<h2>' + stepTitle('play') + '</h2>' +
        '<p>The university has <b>' + BUDGET + ' budget units</b> for energy upgrades in three buildings: A, B and C. At each building you choose <b>one</b> option: none, option 1 or option 2. Savings add up. Money left over is worth nothing.</p>' +
        '<p><b>Goal:</b> a simple rule — "take the most saving per budget unit first" — saves <b>' + RULE_TOTAL + '</b>. Can you save more?</p><div class="gk-panel">';
      if (run.finished) out += '<div class="gk-now">All three buildings done.</div>';
      else {
        const n = S.play.length + 1;
        out += '<div class="gk-now">Building ' + BUILDINGS[n - 1] + ' · you have ' + run.left + ' left</div><div class="ge-opts">' + optionsAt(n).map(o => optionButton(o, run.left)).join('') + '</div>';
      }
      out += budgetBar(run);
      if (S.play.length) {
        out += '<table class="gk-receipt"><tr><th>Building · choice</th><th class="amt">cost</th><th class="amt">saving</th><th class="amt">left</th></tr>' +
          run.lines.map(l => '<tr><td>' + BUILDINGS[l.n - 1] + ' · <b>' + OPT_NAME[l.x] + '</b></td><td class="amt">' + l.g + '</td><td class="amt">+' + l.p + '</td><td class="amt">' + l.after + '</td></tr>').join('') +
          '<tr class="total"><td>' + (run.finished ? 'Total saving' : 'Saved so far') + '</td><td class="amt">' + (BUDGET - run.left) + '</td><td class="amt">' + run.total + '</td><td class="amt">' + run.left + '</td></tr></table>';
      } else out += '<p class="gk-small gk-muted">Your receipt appears here.</p>';
      out += '<div class="gk-row">' + (run.finished ? btn('data-do="newPlay"', 'Play a new plan', ' primary') : '') + (S.play.length && !run.finished ? btn('data-do="undo"', 'Undo last choice') : '') + '</div></div>';
      if (S.playMsg && !run.finished) out += S.playMsg;
      if (run.finished) {
        const leftNote = run.left ? ' You left ' + run.left + ' unspent; it is worth nothing.' : '';
        out += run.total === BEST_TOTAL
          ? fb('ok', 'You saved <b>' + run.total + '</b>: the most of all ' + FEASIBLE.length + ' plans that fit the budget.' + leftNote + ' But how could you be sure without trying them all? Here there are 3 × 3 × 3 = ' + ALL_PLANS.length + ' combinations. With ' + SCALE_BUILDINGS + ' buildings there are 3<sup>' + SCALE_BUILDINGS + '</sup> = ' + Math.pow(NOPT, SCALE_BUILDINGS).toLocaleString('en-US') + '. The next steps show how DP avoids trying them all.')
          : run.total > RULE_TOTAL
            ? fb('ok', 'You beat ' + RULE_TOTAL + ' with <b>' + run.total + '</b>.' + leftNote + ' Can you save even more?')
            : fb('no', 'This plan saves <b>' + run.total + '</b>.' + leftNote + ' Try another one: can you save more than ' + RULE_TOTAL + '?');
      }
      const chips = S.plays.map(p => { const t = runPlan(p).total; return '<span class="gk-chip' + (t === BEST_TOTAL ? ' best' : '') + '">' + planText(p) + ': ' + t + '</span>'; }).join('');
      if (S.plays.length) out += '<h3>Your plans</h3><div class="gk-chips">' + chips + '</div>';
      if (S.plays.length >= 2 && !S.showAll) out += '<div class="gk-row">' + btn('data-do="showAll"', 'Show all ' + FEASIBLE.length + ' plans that fit') + '</div>';
      if (S.showAll) {
        const sorted = FEASIBLE.slice().sort((a, b) => runPlan(b).total - runPlan(a).total);
        out += '<table class="gk-receipt"><tr><th>All plans that fit the budget</th><th class="amt">cost</th><th class="amt">saving</th></tr>' +
          sorted.map(p => { const r = runPlan(p); return '<tr><td>' + planText(p) + '</td><td class="amt">' + (BUDGET - r.left) + '</td><td class="amt' + (r.total === BEST_TOTAL ? ' best' : '') + '">' + r.total + '</td></tr>'; }).join('') + '</table>' +
          '<p class="gk-small">' + (ALL_PLANS.length - FEASIBLE.length) + ' of the ' + ALL_PLANS.length + ' combinations cost more than ' + BUDGET + '. Notice: the best plan spends nothing at A.</p>';
      }
      return out;
    }

    // --- Step 2: same budget, same future? ---
    function pairCard(name, plan) {
      const r = runPlan(plan);
      return '<div class="gk-twin"><h4>' + name + '</h4><p>' + plan.map((x, i) => BUILDINGS[i] + ': ' + optLower(x)).join(' · ') + '</p><p>Saved so far: <b>' + r.total + '</b></p><p>Budget left before C: <b>' + r.left + '</b></p></div>';
    }
    function lastStageText(left) {
      const fits = allowedAt(N, left), bestX = SOL.best[key(N, left)][0];
      return 'with ' + left + ' left, ' + fits.map(o => optLower(o.x) + ' (cost ' + o.g + ')').join(', ') + (fits.length > 1 ? ' fit' : ' fits') + '; the best is ' + optLower(bestX) + ': <b>+' + SOL.f[key(N, left)] + '</b>';
    }
    function pairBlock(id, names, plans, checked, pick) {
      const r = plans.map(runPlan), fut = r.map(x => SOL.f[key(N, x.left)]);
      const answer = fut[0] > fut[1] ? names[0] : fut[1] > fut[0] ? names[1] : 'same';
      const pBtn = (v, text) => btn('data-do="predict" data-pair="' + id + '" data-v="' + v + '"' + (pick ? ' disabled' : ''), text, pick === v ? ' picked' : '');
      let out = '<div class="gk-twins">' + pairCard(names[0], plans[0]) + pairCard(names[1], plans[1]) + '</div>' +
        '<p><b>Predict:</b> at building C, who can still <b>add</b> more saving?</p><div class="gk-row">' + pBtn(names[0], names[0]) + pBtn(names[1], names[1]) + pBtn('same', 'The same for both') + '</div>';
      if (!pick) return out;
      if (!checked) return out + '<div class="gk-row">' + btn('data-do="pairCheck" data-pair="' + id + '"', 'Check by working out building C', ' primary') + '</div>';
      out += '<div class="gk-panel"><p>' + names[0] + ': ' + lastStageText(r[0].left) + '.</p><p>' + names[1] + ': ' + lastStageText(r[1].left) + '.</p></div>';
      const same = r[0].total === r[1].total;
      if (pick === answer) return out + fb('ok', same ? 'Same savings so far, but different budgets left, so different futures.' : 'Different savings so far, but the same budget left, so the same future.');
      return out + fb('no', same
        ? 'Both saved ' + r[0].total + ' so far, but that does not decide the future. ' + (answer === 'same' ? '' : answer + ' has more budget left.') + ' What you can still buy depends on the budget left.'
        : names[0] + ' and ' + names[1] + ' saved different amounts, but both have ' + r[0].left + ' left. The past savings are already counted; they do not change what C can add.');
    }
    function renderTwin() {
      let out = '<h2>' + stepTitle('twin') + '</h2><p>Four students played steps A and B in different ways. Each one now stands before building C.</p>' +
        '<h3>Pair 1</h3>' + pairBlock(1, ['Ana', 'Bora'], PAIR_SAME_SAVED, S.pair1Checked, S.pair1);
      if (!S.pair1Checked) return out;
      out += '<h3>Pair 2</h3>' + pairBlock(2, ['Can', 'Defne'], PAIR_SAME_LEFT, S.pair2Checked, S.pair2);
      if (!S.pair2Checked) return out;
      const rBtn = (v, text) => btn('data-do="remember" data-v="' + v + '"', text, S.remember === v ? ' picked' : '');
      out += '<h3>So what must we remember?</h3><p>Before building C, which information is enough to plan the rest?</p><div class="gk-row">' +
        rBtn('saved', 'The savings so far') + rBtn('left', 'The budget left') + rBtn('history', 'The full list of past choices') + rBtn('spent', 'The money spent so far') + '</div>';
      const why = {
        saved: fb('no', 'Ana and Bora saved the same but have different futures. Savings so far are already counted; they do not tell what you can still buy.'),
        history: fb('no', 'That works, but it is more than needed: Can and Defne made different choices and face the same future. Keep only what changes the future.'),
        left: fb('ok', 'The <b>budget left</b>, together with <b>which building is next</b>, is enough. This pair is the <b>state</b>. Different pasts with the same state have the same best future, so we plan once per state. The lecture uses the same state for the medical teams: "teams still available" (Week 8, slide 15).'),
        spent: fb('ok', 'That works too: money spent = ' + BUDGET + ' − budget left, so it is the same information. We will use the <b>budget left</b>, together with which building is next, as the <b>state</b>, like the lecture\'s "teams still available" (Week 8, slide 15).')
      };
      return out + (S.remember ? why[S.remember] : '');
    }

    // --- Step 3: draw it as a map ---
    const mapReady = () => ARC_QUESTIONS.every(q => S.arcs[q.id].ok);
    function renderMap() {
      const done = mapReady(), values = {};
      if (S.arcs.end.ok) END_NODES.forEach(k => { values[k] = 0; });
      const mine = S.plays.slice().sort((p, q) => runPlan(q).total - runPlan(p).total)[0] || null;
      let out = '<h2>' + stepTitle('map') + '</h2>' +
        '<p>Remember Joe\'s trip from NYC to LA (Week 7, slides 8–18): cities were circles, roads were arrows with miles. Here a circle is <b>(the next building, the budget left)</b>. An arrow is one option: it <b>drops by the option\'s cost</b> and carries the option\'s <b>saving</b>. A plan is a route from start to End.</p>' +
        mapSVG({ values, hideLabels: !done, active: done ? null : ASK_NODE, path: done && mine ? mine : null });
      if (!done) {
        const q = ARC_QUESTIONS.find(x => !S.arcs[x.id].ok), st = S.arcs[q.id];
        out += '<div class="gk-panel"><p>' + q.prompt + '</p><div class="gk-row"><input class="gk-num" type="text" inputmode="text" autocomplete="off" data-arc="' + q.id + '" value="' + escapeAttr(st.v) + '" aria-label="Your answer" data-enter="arcCheck">' +
          btn('data-do="arcCheck"', 'Check', ' primary') + (st.wrong ? btn('data-do="arcShow"', 'Show me') : '') + '</div>' + (st.msg || '') + '</div>' +
          '<p class="gk-small gk-muted">Question ' + (ARC_QUESTIONS.indexOf(q) + 1) + ' of ' + ARC_QUESTIONS.length + '. The savings on the arrows appear when these are done.</p>';
        return out;
      }
      out += ARC_QUESTIONS.map(q => S.arcs[q.id].msg || '').join('');
      if (!mine) return out + fb('ok', 'All savings are on the map now. Every plan from step 1 is one route from start to End.');
      const r = runPlan(mine);
      return out + fb('ok', 'All savings are on the map now. Your best plan ' + planText(mine) + ' is the thick green route: ' + sumText(r.lines.map(l => String(l.p))) + ' = <b>' + r.total + '</b>, the same as your receipt.');
    }

    // --- Step 4: solve it backward ---
    const isPicked = k => !!(S.fill[k] && S.fill[k].pick !== null && S.fill[k].pick !== undefined);
    const earlyNodes = DECISION_NODES.filter(k => parseKey(k)[0] < N);
    const earlyDone = () => earlyNodes.filter(isPicked).length;
    function knownValues() {
      const v = {};
      END_NODES.forEach(k => { v[k] = 0; });
      if (S.last.done) REACH[N].forEach(s => { v[key(N, s)] = SOL.f[key(N, s)]; });
      earlyNodes.forEach(k => { if (isPicked(k)) v[k] = SOL.f[k]; });
      return v;
    }
    const isReady = (k, values) => { const [n, s] = parseKey(k); return allowedAt(n, s).every(o => values[key(n + 1, s - o.g)] !== undefined); };
    function diagLast(s, v) {
      const all = optionsAt(N), fits = allowedAt(N, s), want = SOL.f[key(N, s)];
      const tooDear = all.find(o => o.g > s && o.p === v);
      if (tooDear) return 'With ' + s + ' left, ' + optLower(tooDear.x) + ' (cost ' + tooDear.g + ') does not fit.';
      if (all.some((a, i) => all.some((b, j) => i < j && a.p > 0 && b.p > 0 && a.p + b.p === v))) return 'Only one option per building: you cannot take two options together.';
      const smaller = fits.find(o => o.p === v && v < want);
      if (smaller) { const b = fits.find(o => o.p === want); return OPT_NAME[smaller.x] + ' fits, but ' + optLower(b.x) + ' (cost ' + b.g + ') also fits and saves more.'; }
      if (v === s && v !== want) return 'That is the money left, not a saving.';
      return null;
    }
    function renderLastPanel() {
      const L = S.last;
      const fields = REACH[N].map(s => {
        const ok = L.ok[s], cls = ok ? ' ok' : L.tried ? ' no' : '';
        return '<label>' + fH(N, s) + ' =<input class="gk-num' + cls + '" type="text" inputmode="text" autocomplete="off" data-last="' + s + '" value="' + escapeAttr(L.v[s] || '') + '"' + (ok ? ' disabled' : '') + ' aria-label="f ' + N + ' of ' + s + '" data-enter="lastCheck"></label>';
      }).join('');
      return '<div class="gk-panel"><p><b>Start with the last building, C.</b> After C comes End, which adds 0. So ' + fH(N, 's') + ' is simply the <b>biggest saving of a C option you can afford with s left</b>. The lecture starts the same way: "Country 3", f<sub>3</sub>(0) … f<sub>3</sub>(5) (Week 8, slide 18).</p>' +
        '<div class="ge-lastgrid">' + fields + '</div>' +
        (L.done ? '' : '<div class="gk-row">' + btn('data-do="lastCheck"', 'Check', ' primary') + (L.wrong ? btn('data-do="lastShow"', 'Show me') : '') + '</div>') + (L.msg || '') + '</div>';
    }
    function fillOf(k) {
      // WHY: support fades with practice: the first table shows every number, the second only
      // the symbols to read on the map, the rest only the options (worked example → faded → alone).
      if (!S.fill[k]) { const d = earlyDone(); S.fill[k] = { tot: {}, ok: {}, tried: false, wrong: 0, pick: null, msg: null, level: d === 0 ? 0 : d === 1 ? 1 : 2 }; }
      return S.fill[k];
    }
    function diagTotal(n, s, o, v) {
      const after = s - o.g, nextF = SOL.f[key(n + 1, after)], want = o.p + nextF, name = OPT_NAME[o.x];
      const cands = [
        [o.p, name + ': you wrote only its saving. Add ' + fH(n + 1, after) + ' = ' + nextF + ', the value where its arrow ends.'],
        [nextF, name + ': that is only the future. Add the saving of this option, ' + o.p + '.'],
        [s - o.x >= 0 ? o.p + SOL.f[key(n + 1, s - o.x)] : NaN, name + ': the arrow ends at ' + s + ' − ' + o.g + ' = ' + after + ' left. Subtract the cost, not the option number.'],
        [o.p + SOL.f[key(n + 1, s)], name + ': after paying ' + o.g + ' you have ' + after + ' left, not ' + s + '. Use ' + fH(n + 1, after) + '.'],
        [o.p - o.g + nextF, name + ': do not subtract the cost. It is already paid: the next building only gets ' + after + ' left. Saving and budget are different units.']
      ];
      const hit = cands.find(c => c[0] === v && c[0] !== want);
      return hit ? hit[1] : null;
    }
    function nodeTable(k) {
      const [n, s] = parseKey(k), F = fillOf(k), lv = F.level, b = BUILDINGS[n - 1];
      const rows = optionsAt(n).map(o => {
        const lab = '<span class="ge-who' + o.x + '">' + OPT_NAME[o.x] + '</span>';
        // WHY: each cell's content sits in one <span>, so the phone layout (flex: label | value)
        // keeps "f<sub>3</sub>(4)" together instead of splitting it into flex items.
        const td = (label, html) => '<td data-label="' + label + '"><span>' + html + '</span></td>';
        if (o.g > s) return '<tr class="off"><td class="first">' + lab + '</td>' + td('cost g(x)', o.g) + td('saving p(x)', o.p) + '<td colspan="3" data-label=""><span>costs ' + o.g + ', only ' + s + ' left: not allowed</span></td></tr>';
        const after = s - o.g, ok = F.ok[o.x];
        const leftCell = lv === 0 ? s + ' − ' + o.g + ' = ' + after : lv === 1 ? String(after) : '…';
        const fCell = lv === 0 ? fH(n + 1, after) + ' = ' + SOL.f[key(n + 1, after)] : lv === 1 ? fH(n + 1, after) + ' <span class="gk-small">(read the circle)</span>' : '…';
        const field = '<input class="gk-num' + (ok ? ' ok' : F.tried ? ' no' : '') + '" type="text" inputmode="text" autocomplete="off" data-tot="' + o.x + '" value="' + escapeAttr(F.tot[o.x] || '') + '"' + (ok ? ' disabled' : '') + ' aria-label="' + OPT_NAME[o.x] + ' total" data-enter="fillCheck">';
        return '<tr><td class="first">' + lab + '</td>' + td('cost g(x)', o.g) + td('saving p(x)', o.p) + td('left after', leftCell) + td('f(left after)', fCell) + td('total', field) + '</tr>';
      }).join('');
      const allOk = allowedAt(n, s).every(o => F.ok[o.x]);
      let out = '<div class="gk-panel"><p><b>Before ' + b + ', ' + s + ' left:</b> ' + fH(n, s) + ' = the largest total. Each total = <b>saving of the option + f where its arrow ends</b>.' + (lv === 2 ? ' Now you work out "left after" and f yourself from the map.' : '') + '</p>' +
        '<table class="ge-dp"><thead><tr><th>Option x</th><th>cost g(x)</th><th>saving p(x)</th><th>left after</th><th>' + fH(n + 1, 'left after') + '</th><th>total</th></tr></thead><tbody>' + rows + '</tbody></table>';
      if (!allOk) out += '<div class="gk-row">' + btn('data-do="fillCheck"', 'Check', ' primary') + (F.wrong ? btn('data-do="fillShow"', 'Show me') : '') + '</div>';
      else {
        const fits = allowedAt(n, s);
        out += '<p>Which is best? (We want the largest saving.)</p><div class="gk-row">' + fits.map(o => btn('data-do="pick" data-v="' + o.x + '"', OPT_NAME[o.x])).join('') + (fits.length > 1 ? btn('data-do="pick" data-v="tie"', 'Tie: more than one') : '') + '</div>';
      }
      return out + (F.msg || '') + '<p class="gk-small gk-muted">Same layout as the lecture\'s tables for the medical teams (Week 8, slides 20–22): x, p(x), f(s − x), total, best.</p></div>';
    }
    function renderSolve() {
      const values = knownValues(), allDone = S.last.done && earlyDone() === earlyNodes.length;
      if (S.last.done && (!S.active || isPicked(S.active))) S.active = earlyNodes.find(k => !isPicked(k) && isReady(k, values)) || null;
      const best = {};
      if (S.last.done) REACH[N].forEach(s => { best[key(N, s)] = SOL.best[key(N, s)]; });
      earlyNodes.filter(isPicked).forEach(k => { best[k] = SOL.best[k]; });
      let out = '<h2>' + stepTitle('solve') + '</h2>' +
        '<p>Like Joe\'s trip (Week 7, slides 11–18), start at the end and move left. In each circle write <b>f = the most saving still possible from there</b>.' + (S.last.done ? ' Click any circle whose arrows all end at known values.' : '') + '</p>' +
        mapSVG({ values, best, active: allDone ? null : (S.last.done ? S.active : null),
          clickable: k => S.last.done && !allDone && earlyNodes.includes(k) && !isPicked(k) && isReady(k, values),
          locked: k => S.last.done && !allDone && earlyNodes.includes(k) && !isReady(k, values) });
      if (S.lockMsg) { out += fb('no', S.lockMsg); S.lockMsg = null; }
      if (!S.last.done) return out + renderLastPanel();
      // solveNote = { kind: 'ok' | 'shown', html }: the result of the last finished circle or column.
      if (S.solveNote && !allDone) out += fb(S.solveNote.kind, S.solveNote.html);
      if (!allDone && S.active) out += nodeTable(S.active);
      const circles = REACH[N].length + earlyNodes.length;
      out += '<p class="gk-small gk-muted">' + ((S.last.done ? REACH[N].length : 0) + earlyDone()) + ' of ' + circles + ' circles done. The help gets lighter as you go.</p>';
      if (!allDone) return out;
      const sums = ARCS.length, statesBig = SCALE_BUILDINGS * (SCALE_BUDGET + 1), sumsBig = statesBig * NOPT;
      return out + fb('ok', fH(1, BUDGET) + ' = <b>' + SOL.f[key(1, BUDGET)] + '</b>. Follow the green arrows forward from the start: ' + planText(ROUTE.plan) + ', with ' + ROUTE.end + ' left over. That is the best plan, found without listing all ' + ALL_PLANS.length + ' combinations.') +
        '<p>Building A gets nothing, although its option 1 has a good saving per unit. In the Glueco example, region 1 also gets no representative (Week 8, slide 30). DP compares whole futures, not single buildings.</p>' +
        '<p class="gk-small">Count: one sum per arrow, ' + sums + ' sums here. For ' + SCALE_BUILDINGS + ' buildings and a budget of ' + SCALE_BUDGET + ': at most ' + statesBig + ' circles × ' + NOPT + ' options = ' + sumsBig + ' sums, against ' + Math.pow(NOPT, SCALE_BUILDINGS).toLocaleString('en-US') + ' combinations.</p>';
    }

    // --- Step 5: name the parts ---
    const slotsOk = () => SLOT_ORDER.every(id => S.slots[id] === SLOT_ANSWER[id]);
    function renderName() {
      const rows = NAME_ROWS.map(r => {
        const v = S.names[r.id] || '';
        const mark = S.namesChecked && v ? (v === r.answer ? '<span style="color:var(--good)">✓</span>' : '<span style="color:var(--critical)">✗</span>') : '';
        return '<b>' + r.label + '</b><select data-name="' + r.id + '" aria-label="' + r.label.replace(/<[^>]+>/g, '') + '"><option value="">choose…</option>' +
          NAME_OPTIONS.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select><span>' + mark + '</span>';
      }).join('');
      const namesOk = NAME_ROWS.every(r => S.names[r.id] === r.answer);
      let out = '<h2>' + stepTitle('name') + '</h2><p>You have already used every part of a DP model. Now give each one its name. We write g<sub>n</sub>(x) for the cost (the resource used, as on Week 8, slide 23) and p<sub>n</sub>(x) for the saving (as on slide 17).</p>' +
        '<div class="gk-names">' + rows + '</div><div class="gk-row">' + btn('data-do="namesCheck"', 'Check names', ' primary') + '</div>';
      if (S.namesChecked) {
        const wrong = NAME_ROWS.filter(r => S.names[r.id] && S.names[r.id] !== r.answer), empty = NAME_ROWS.filter(r => !S.names[r.id]);
        out += namesOk ? fb('ok', 'Each piece of your map now has its DP name.')
          : fb('no', wrong.map(r => '<b>' + r.label + '</b>: you chose "' + NAME_OPTIONS.find(o => o[0] === S.names[r.id])[1] + '". ' + NAME_WHY[S.names[r.id]]).join('<br>') +
            (empty.length ? (wrong.length ? '<br>' : '') + 'Still empty: ' + empty.map(r => r.label).join(', ') + '.' : ''));
      }
      if (!namesOk) return out;
      const slot = id => {
        const v = S.slots[id], st = S.slotsChecked && v ? (v === SLOT_ANSWER[id] ? ' ok' : ' no') : '';
        return '<span class="gk-slot' + (S.slotSel === id ? ' sel' : '') + st + '" data-do="slot" data-slot="' + id + '" role="button" tabindex="0" title="' + SLOT_ROLE[id] + '">' + (v ? tileLabel(v) : '&nbsp;') + '</span>';
      };
      const used = new Set(Object.values(S.slots));
      out += '<h3>Build the recursion</h3><p>Click a box, then a tile. Click a filled box to empty it. Some tiles are traps.</p>' +
        '<div class="gk-formula">f<sub>n</sub>(s) = ' + slot('op') + ' over options x with ' + slot('feas') + ' of { ' + slot('rew') + ' + f<sub>n+1</sub>( ' + slot('next') + ' ) } <span class="gk-cap">(n = 3, 2, 1)</span><br>' +
        'f<sub>4</sub>(s) = ' + slot('end') + ' for every s ≥ 0 <span class="gk-cap">(End)</span></div>' +
        '<p class="gk-small">Selected box: ' + SLOT_ROLE[S.slotSel] + '</p>' +
        '<div class="gk-bank">' + TILES.map(t => '<button class="gk-tile" data-do="tile" data-tile="' + t[0] + '"' + (used.has(t[0]) ? ' disabled' : '') + '>' + t[1] + '</button>').join('') + '</div>' +
        '<div class="gk-row">' + btn('data-do="slotsCheck"', 'Check the recursion', ' primary') + (S.slotsChecked && !slotsOk() ? btn('data-do="slotsShow"', 'Show me') : '') + '</div>';
      if (!S.slotsChecked) return out;
      if (slotsOk()) {
        const k = key(2, BUDGET), fits = allowedAt(2, BUDGET);
        return out + fb(S.helped.name ? 'shown' : 'ok', 'This is the recursion of Week 8, slide 24, with this story\'s names. Test it on one circle of your map: ' + fH(2, BUDGET) + ' = max{ ' +
          fits.map(o => o.p + ' + ' + fH(3, BUDGET - o.g)).join(', ') + ' } = max{ ' + fits.map(o => SOL.totals[k][o.x]).join(', ') + ' } = ' + SOL.f[k] + ', the number in that circle.');
      }
      return out + fb('no', SLOT_ORDER.filter(id => S.slots[id] !== SLOT_ANSWER[id]).map(id => {
        const v = S.slots[id];
        return v ? '<b>' + tileLabel(v) + '</b>: ' + ((SLOT_WHY[id] || {})[v] || 'not this one here. ' + SLOT_ROLE[id]) : SLOT_ROLE[id] + ' (empty)';
      }).join('<br>'));
    }

    // --- Step 6: twist ---
    function daysTable() {
      return '<table class="gk-table"><tr><th>Workdays</th>' + OPT_NAME.map(t => '<th>' + t + '</th>').join('') + '</tr>' +
        BUILDINGS.map((b, i) => '<tr><td>' + b + '</td>' + WORKDAYS[i].map(w => '<td>' + w + '</td>').join('') + '</tr>').join('') + '</table>';
    }
    function renderTwist() {
      const tw = S.tw;
      let out = '<h2>' + stepTitle('twist') + '</h2>' +
        '<p>New rule: each upgrade also needs <b>workdays</b> of the technical team. There are at most <b>' + DAY_LIMIT + ' workdays</b> in total for all three buildings. The budget rule stays.</p>' +
        '<div class="gk-panel">' + daysTable() + '</div>' +
        '<p>Your best plan was <b>' + planText(ROUTE.plan) + '</b>. How many workdays does it need?</p>' +
        '<div class="gk-row"><input class="gk-num' + (tw.daysOk ? ' ok' : '') + '" type="text" inputmode="text" autocomplete="off" data-tw="days" value="' + escapeAttr(tw.days) + '"' + (tw.daysOk ? ' disabled' : '') + ' aria-label="Workdays needed" data-enter="daysCheck">' +
        (tw.daysOk ? '' : btn('data-do="daysCheck"', 'Check', ' primary') + (tw.daysWrong ? btn('data-do="daysShow"', 'Show me') : '')) + '</div>' + (tw.daysMsg || '');
      if (!tw.daysOk) return out;
      const daysUsed = DAY_LIMIT - TW_DAYS_LEFT;
      out += '<h3>Predict, then check</h3><p>Look at the ringed circle on your solved map: before C with ' + TW_LEFT + ' left. It says ' + fH(N, TW_LEFT) + ' = <b>' + TW_OLD + '</b>. A student who arrives here by your plan has used ' + daysUsed + ' workdays, so ' + TW_DAYS_LEFT + ' are left. Is ' + TW_OLD + ' still right for this student?</p>' +
        mapSVG({ values: SOL.f, best: SOL.best, ring: TW_NODE });
      const cBtn = (v, text) => btn('data-do="twCircle" data-v="' + v + '"' + (tw.circle ? ' disabled' : ''), text, tw.circle === v ? ' picked' : '');
      out += '<div class="gk-row">' + cBtn('same', 'Yes, still ' + TW_OLD) + cBtn('less', 'No, less now') + cBtn('more', 'No, more now') + '</div>';
      if (!tw.circle) return out;
      const fitsNow = allowedAt(N, TW_LEFT, TW_DAYS_LEFT), bestNow = TWO.best[TWO.k2(N, TW_LEFT, TW_DAYS_LEFT)];
      const lost = allowedAt(N, TW_LEFT).filter(o => o.w > TW_DAYS_LEFT);
      const expl = (lost.length ? lost.map(o => 'C ' + optLower(o.x) + ' needs ' + o.w + ' workdays, but only ' + TW_DAYS_LEFT + ' are left.').join(' ') + ' ' : '') +
        'Now only ' + fitsNow.map(o => optLower(o.x)).join(' and ') + ' fit, so the best is ' + optLower(bestNow) + ': <b>' + TW_NEW + '</b>. The circle "' + TW_LEFT + ' left" does not know how many workdays are left, so the budget alone no longer tells the future.';
      out += fb(tw.circle === TW_DIRECTION ? 'ok' : 'no', expl);
      out += '<h3>Which parts of the model change?</h3><p>Click every part that must change, then press Check.</p><div class="gk-row">' +
        PARTS.map(p => btn('data-do="part" data-v="' + p[0] + '"' + (tw.partsOk ? ' disabled' : ''), p[1], tw.parts.includes(p[0]) ? ' picked' : '')).join('') + '</div>' +
        (tw.partsOk ? '' : '<div class="gk-row">' + btn('data-do="partsCheck"', 'Check', ' primary') + '</div>');
      if (tw.partsChecked) {
        const wrongIn = PARTS.filter(p => tw.parts.includes(p[0]) && !p[2]), missing = PARTS.filter(p => !tw.parts.includes(p[0]) && p[2]);
        out += tw.partsOk
          ? fb('ok', PARTS.filter(p => p[2]).map(p => '<b>' + p[1] + '</b>: ' + p[3]).join('<br>') + '<br>The savings, the End value and the stages stay.')
          : fb('no', wrongIn.map(p => '<b>' + p[1] + '</b> stays: ' + p[3]).concat(missing.length ? ['You missed ' + missing.length + ' part(s) that change. Think: what must we remember, what may we choose, where do we go?'] : []).join('<br>'));
      }
      if (!tw.partsOk) return out;
      const tBtn = (v, text) => btn('data-do="twTotal" data-v="' + v + '"' + (tw.total ? ' disabled' : ''), text, tw.total === v ? ' picked' : '');
      out += '<h3>Predict the new best total</h3><p>With both limits, the best total saving is…</p><div class="gk-row">' + tBtn('more', 'more than ' + BEST_TOTAL) + tBtn('same', 'exactly ' + BEST_TOTAL) + tBtn('less', 'less than ' + BEST_TOTAL) + '</div>';
      if (!tw.total) return out;
      const pairs = (BUDGET + 1) * (DAY_LIMIT + 1);
      out += fb(tw.total === TOTAL_DIRECTION ? 'ok' : 'no', 'A new limit can only remove plans, never add them, so the best can only stay or drop. Here the old best plan needs ' + ROUTE_DAYS + ' workdays and is out. Solving again with the state (s, h) gives ' +
        'f<sub>1</sub>(' + BUDGET + ', ' + DAY_LIMIT + ') = <b>' + TWO.value + '</b>: ' + planText(TWO.route.plan) + ' (' + runPlan(TWO.route.plan).days + ' workdays, cost ' + (BUDGET - runPlan(TWO.route.plan).left) + ').') +
        '<div class="gk-panel"><p>f<sub>n</sub>(s, h) = max over options x with g<sub>n</sub>(x) ≤ s and w<sub>n</sub>(x) ≤ h of { p<sub>n</sub>(x) + f<sub>n+1</sub>(s − g<sub>n</sub>(x), h − w<sub>n</sub>(x)) }, f<sub>4</sub>(s, h) = 0.</p>' +
        '<p class="gk-small">Here w<sub>n</sub>(x) is the number of workdays of option x and h the workdays left. Each building now has up to ' + (BUDGET + 1) + ' × ' + (DAY_LIMIT + 1) + ' = ' + pairs + ' possible states instead of ' + (BUDGET + 1) + '. Every extra limit multiplies the states: this is the difficulty of Week 8, slide 38.</p></div>';
      ctx.assembled();
      return out + summaryCard();
    }
    function modelLines() {
      return [
        'Stage: building n = 1, 2, 3 (A, B, C). State: budget left s before building n. Decision: x_n(s), one option of building n.',
        'Allowed: options with cost g_n(x) <= s. Saving during the stage: p_n(x). Next state: s - g_n(x).',
        'f_n(s) = max over allowed x of { p_n(x) + f_n+1(s - g_n(x)) }, n = 3, 2, 1; f_4(s) = 0 for every s >= 0.',
        'Answer: f_1(' + BUDGET + ') = ' + SOL.f[key(1, BUDGET)] + ' with ' + planText(ROUTE.plan) + '.',
        'Twist (at most ' + DAY_LIMIT + ' workdays): state (s, h); f_1(' + BUDGET + ', ' + DAY_LIMIT + ') = ' + TWO.value + ' with ' + planText(TWO.route.plan) + '.'
      ];
    }
    function summaryCard() {
      const helped = activity.steps.filter(s => S.status[s.id] === 'helped').map(s => s.title);
      return '<h3>Your model</h3><div class="gk-model">' +
        '<p><b>Stage:</b> building n = 1, 2, 3 (A, B, C). <b>State:</b> budget left s before building n. <b>Decision:</b> x<sub>n</sub>(s), one option of building n.</p>' +
        '<p><b>Allowed:</b> options with cost g<sub>n</sub>(x) ≤ s. <b>Saving during the stage:</b> p<sub>n</sub>(x). <b>Next state:</b> s − g<sub>n</sub>(x).</p>' +
        '<p>f<sub>n</sub>(s) = max over allowed x of { p<sub>n</sub>(x) + f<sub>n+1</sub>(s − g<sub>n</sub>(x)) }, n = 3, 2, 1; f<sub>4</sub>(s) = 0 for every s ≥ 0.</p>' +
        '<p><b>Answer:</b> ' + fH(1, BUDGET) + ' = ' + SOL.f[key(1, BUDGET)] + ' with ' + planText(ROUTE.plan) + '.</p>' +
        '<p><b>Twist</b> (at most ' + DAY_LIMIT + ' workdays): state (s, h); f<sub>1</sub>(' + BUDGET + ', ' + DAY_LIMIT + ') = ' + TWO.value + ' with ' + planText(TWO.route.plan) + '.</p></div>' +
        (helped.length ? '<p class="gk-small">Steps where you used "Show me": ' + helped.join(', ') + '. Try those again later without help.</p>' : '<p class="gk-small">You did every step without "Show me".</p>') +
        '<div class="gk-row">' + btn('id="guided-download" data-do="download"', 'Download my model') + '</div>';
    }
    const downloadLines = () => [activity.title, activity.family, '',
      ...activity.steps.map(s => s.title + ': ' + (S.status[s.id] === 'done' ? 'done' : S.status[s.id] === 'helped' ? 'done with Show me' : 'not finished')),
      '', 'Plans I played: ' + (S.plays.map(p => planText(p) + ' = ' + runPlan(p).total).join('; ') || 'none'), '', 'MODEL', ...modelLines()];

    // --- Actions ---
    const ACTIONS = {
      choose(el) {
        const run = runPlan(S.play), n = S.play.length + 1, x = Number(el.dataset.x);
        if (run.finished) return;
        const o = OPTIONS[n - 1][x];
        if (o.g > run.left) { S.playMsg = fb('no', OPT_NAME[x] + ' of building ' + BUILDINGS[n - 1] + ' costs ' + o.g + ', but you have only ' + run.left + ' left. Choose an option you can pay for.'); track('check'); return; }
        S.playMsg = null; S.play.push(x);
        if (S.play.length !== N) return;
        if (!S.plays.some(p => planText(p) === planText(S.play))) S.plays.push(S.play.slice());
        track('check'); finish('play');
      },
      undo() { S.play.pop(); S.playMsg = null; },
      newPlay() { S.play = []; S.playMsg = null; },
      showAll() { S.showAll = true; },
      predict(el) { S['pair' + el.dataset.pair] = el.dataset.v; },
      pairCheck(el) { S['pair' + el.dataset.pair + 'Checked'] = true; track('check'); },
      remember(el) { S.remember = el.dataset.v; track('check'); if (S.remember === 'left' || S.remember === 'spent') finish('twin'); },
      arcCheck() {
        const q = ARC_QUESTIONS.find(x => !S.arcs[x.id].ok); if (!q) return;
        const st = S.arcs[q.id], v = parseNum(st.v);
        if (Number.isNaN(v)) { st.msg = fb('no', 'Type a number, for example 3.'); return; }
        track('check');
        if (v === q.answer) { st.ok = true; st.msg = fb('ok', q.right); }
        else { st.wrong++; st.msg = fb('no', q.diag[String(v)] || q.hint); }
        if (mapReady()) finish('map');
      },
      arcShow() {
        const q = ARC_QUESTIONS.find(x => !S.arcs[x.id].ok); if (!q) return;
        const st = S.arcs[q.id]; st.ok = true; st.v = String(q.answer); showMe('map');
        st.msg = fb('shown', q.right);
        if (mapReady()) finish('map');
      },
      lastCheck() {
        const L = S.last, vals = {};
        const missing = REACH[N].filter(s => !L.ok[s] && Number.isNaN(vals[s] = parseNum(L.v[s] || '')));
        if (missing.length) { L.msg = fb('no', 'Type a number in every box, for example 4.'); return; }
        track('check'); L.tried = true;
        const notes = [];
        REACH[N].forEach(s => {
          if (L.ok[s]) return;
          if (vals[s] === SOL.f[key(N, s)]) { L.ok[s] = true; return; }
          notes.push(fH(N, s) + ': ' + (diagLast(s, vals[s]) || 'with ' + s + ' left, list the C options that cost at most ' + s + ' and take the biggest saving.'));
        });
        if (!notes.length) { L.done = true; L.msg = null; S.solveNote = { kind: 'ok', html: 'Column C is done: ' + REACH[N].map(s => fH(N, s) + ' = ' + SOL.f[key(N, s)]).join(', ') + '.' }; return; }
        L.wrong++; L.msg = fb('no', notes.join('<br>'));
      },
      lastShow() {
        const L = S.last; REACH[N].forEach(s => { L.v[s] = String(SOL.f[key(N, s)]); L.ok[s] = true; });
        L.done = true; showMe('solve');
        L.msg = null;
        S.solveNote = { kind: 'shown', html: REACH[N].map(s => fH(N, s) + ' = ' + SOL.f[key(N, s)] + ' (' + optLower(SOL.best[key(N, s)][0]) + ')').join(', ') + '.' };
      },
      node(el) {
        const k = el.dataset.node, id = stepIds[S.stage];
        if (id !== 'solve' || !S.last.done || !earlyNodes.includes(k) || isPicked(k)) return;
        if (!isReady(k, knownValues())) { S.lockMsg = 'Not yet: the arrows from ' + nodeName(k) + ' end at circles without a value. Work from right to left.'; return; }
        S.active = k;
      },
      fillCheck() {
        const k = S.active; if (!k) return;
        const [n, s] = parseKey(k), F = fillOf(k), fits = allowedAt(n, s), vals = {};
        if (fits.some(o => !F.ok[o.x] && Number.isNaN(vals[o.x] = parseNum(F.tot[o.x] || '')))) { F.msg = fb('no', 'Type a number in every "total" box, for example 7.'); return; }
        track('check'); F.tried = true;
        const notes = [];
        fits.forEach(o => {
          if (F.ok[o.x]) return;
          if (vals[o.x] === SOL.totals[k][o.x]) { F.ok[o.x] = true; return; }
          notes.push(diagTotal(n, s, o, vals[o.x]));
        });
        if (!notes.length) { F.msg = fb('ok', fits.map(o => OPT_NAME[o.x] + ' ' + SOL.totals[k][o.x]).join(', ') + '.'); return; }
        F.wrong++;
        const specific = notes.filter(Boolean);
        const generic = F.wrong >= 2
          ? 'Here are the numbers: ' + fits.filter(o => !F.ok[o.x]).map(o => OPT_NAME[o.x] + ': ' + o.p + ' + ' + fH(n + 1, s - o.g) + ' = ' + o.p + ' + ' + SOL.f[key(n + 1, s - o.g)] + ' = ?').join('; ')
          : 'Each total = the saving of the option + the value in the circle where its arrow ends (the shaded circles).';
        F.msg = fb('no', specific.length ? specific.join('<br>') + (specific.length < notes.length ? '<br>' + generic : '') : generic);
      },
      fillShow() {
        const k = S.active; if (!k) return;
        const [n, s] = parseKey(k), F = fillOf(k), fits = allowedAt(n, s);
        fits.forEach(o => { F.tot[o.x] = String(SOL.totals[k][o.x]); F.ok[o.x] = true; });
        showMe('solve');
        F.msg = fb('shown', fits.map(o => OPT_NAME[o.x] + ': ' + o.p + ' + ' + fH(n + 1, s - o.g) + ' = ' + o.p + ' + ' + SOL.f[key(n + 1, s - o.g)] + ' = ' + SOL.totals[k][o.x]).join('<br>'));
      },
      pick(el) {
        const k = S.active; if (!k) return;
        const F = fillOf(k), best = SOL.best[k], t = SOL.totals[k], p = el.dataset.v;
        const [n, s] = parseKey(k);
        const accept = note => { F.pick = best.join(','); F.msg = null; S.solveNote = { kind: 'ok', html: note }; if (earlyDone() === earlyNodes.length) finish('solve'); };
        const listed = Object.keys(t).map(x => t[x]).join(', ');
        if (best.length > 1) {
          if (p === 'tie') { accept(fH(n, s) + ' = ' + SOL.f[k] + '. A tie: ' + best.map(optLower).join(' and ') + ' are both best.'); return; }
          F.msg = fb('no', 'Look again: more than one option reaches ' + SOL.f[k] + '.'); return;
        }
        if (p === 'tie') { F.msg = fb('no', 'They are not equal: ' + listed + '. Only one total is the largest.'); return; }
        if (Number(p) !== best[0]) { F.msg = fb('no', 'That total is ' + t[p] + ', not the largest. We want the largest saving.'); return; }
        accept(fH(n, s) + ' = max{' + listed + '} = ' + SOL.f[k] + ', best: ' + optLower(best[0]) + '.');
      },
      namesCheck() { S.namesChecked = true; track('check'); },
      slot(el) { const id = el.dataset.slot; delete S.slots[id]; S.slotSel = id; S.slotsChecked = false; },
      tile(el) {
        const target = S.slotSel && !S.slots[S.slotSel] ? S.slotSel : SLOT_ORDER.find(s => !S.slots[s]);
        if (!target) return;
        S.slots[target] = el.dataset.tile; S.slotsChecked = false;
        S.slotSel = SLOT_ORDER.find(s => !S.slots[s]) || target;
      },
      slotsCheck() { S.slotsChecked = true; track('check'); if (slotsOk()) finish('name'); },
      slotsShow() { S.slots = Object.assign({}, SLOT_ANSWER); showMe('name'); S.slotsChecked = true; finish('name'); },
      daysCheck() {
        const tw = S.tw, v = parseNum(tw.days);
        if (Number.isNaN(v)) { tw.daysMsg = fb('no', 'Type a number, for example 3.'); return; }
        track('check');
        const perB = ROUTE.plan.map((x, i) => WORKDAYS[i][x]);
        if (v === ROUTE_DAYS) { tw.daysOk = true; tw.daysMsg = fb('ok', sumText(perB.map(String)) + ' = ' + ROUTE_DAYS + (ROUTE_DAYS > DAY_LIMIT ? ' workdays, more than ' + DAY_LIMIT + '. Your best plan is not allowed any more.' : ' workdays: it still fits.')); return; }
        tw.daysWrong++;
        const msgs = {}; msgs[DAY_LIMIT] = 'That is the limit. Add the workdays of the options in your plan.';
        ROUTE.plan.forEach((x, i) => { if (!(String(perB[i]) in msgs)) msgs[perB[i]] = 'That is only building ' + BUILDINGS[i] + '. Add the workdays of all three buildings.'; });
        tw.daysMsg = fb('no', msgs[v] || 'Read the workdays of ' + ROUTE.plan.map((x, i) => BUILDINGS[i] + ' ' + optLower(x)).join(', ') + ' in the table and add them.');
      },
      daysShow() {
        const tw = S.tw, perB = ROUTE.plan.map((x, i) => WORKDAYS[i][x]);
        tw.days = String(ROUTE_DAYS); tw.daysOk = true; showMe('twist');
        tw.daysMsg = fb('shown', sumText(perB.map(String)) + ' = ' + ROUTE_DAYS + ' workdays' + (ROUTE_DAYS > DAY_LIMIT ? ', more than ' + DAY_LIMIT + '. Your best plan is not allowed any more.' : '.'));
      },
      twCircle(el) { S.tw.circle = el.dataset.v; track('check'); },
      part(el) { const v = el.dataset.v, p = S.tw.parts; S.tw.parts = p.includes(v) ? p.filter(x => x !== v) : p.concat(v); S.tw.partsChecked = false; },
      partsCheck() {
        const tw = S.tw; tw.partsChecked = true; track('check');
        tw.partsOk = PARTS.every(p => tw.parts.includes(p[0]) === p[2]);
      },
      twTotal(el) { S.tw.total = el.dataset.v; finish('twist'); track('twist'); },
      download() { ctx.download(downloadLines()); return false; }
    };

    // WHY: the map's geometry and label sizes depend on the width (phone vs. desktop);
    // redraw when the page crosses that width. ctx.render is the kit's re-render.
    let wasNarrow = isNarrow();
    window.addEventListener('resize', () => { if (isNarrow() !== wasNarrow) { wasNarrow = isNarrow(); ctx.render(); } });

    // --- What the kit shows ---
    // WHY: step 4 reads the arrows and End values that step 3 establishes; step 6 reads the solved map.
    const gateText = id => {
      const at = ctx.stepIndex(id);
      return 'This step uses your work from step ' + (at + 1) + ', "' + stepTitle(id).replace(/^\d+ · /, '') + '". Please finish that step first.';
    };
    return {
      dataCard: '<h3>The data (always here)</h3>' +
        '<table class="gk-table"><tr><th>Building</th>' + OPT_NAME.map(t => '<th>' + t + '</th>').join('') + '</tr>' +
        BUILDINGS.map((b, i) => '<tr><td><b>' + b + '</b></td>' + OPTIONS[i].map(o => '<td><span class="ge-c">' + o.g + '</span> / <span class="ge-p">' + o.p + '</span></td>').join('') + '</tr>').join('') + '</table>' +
        '<p class="gk-small">Each cell: <b>cost</b> (budget units) / <b>saving</b> (MWh per year).</p>' +
        '<p><b>Rules:</b></p><ul class="gk-strip"><li>Budget: <b>' + BUDGET + '</b> units in total.</li><li>One option per building (none is allowed).</li><li>Options cannot be split.</li><li>Savings of different buildings add up.</li><li>Money left over is worth nothing.</li></ul>' +
        '<p class="gk-small gk-muted">This story and its numbers are made up for practice. The lecture\'s own example of this kind is the medical teams problem (Week 8, slides 13–22).</p>',
      steps: { play: renderPlay, twin: renderTwin, map: renderMap, solve: renderSolve, name: renderName, twist: renderTwist },
      actions: ACTIONS,
      gate: {
        solve: { ready: mapReady, step: 'map', text: gateText('map') },
        twist: { ready: () => !!S.status.solve, step: 'solve', text: gateText('solve') }
      },
      onInput(t) {
        if (t.dataset.arc) S.arcs[t.dataset.arc].v = t.value;
        if (t.dataset.last) S.last.v[t.dataset.last] = t.value;
        if (t.dataset.tot && S.active) fillOf(S.active).tot[t.dataset.tot] = t.value;
        if (t.dataset.tw === 'days') S.tw.days = t.value;
      },
      onChange(t) {
        if (!t.dataset.name) return false;
        S.names[t.dataset.name] = t.value; S.namesChecked = false;
        return true;
      }
    };
  }

  window.GUIDED_CUSTOM.energy = (app, opts) => window.GUIDED_KIT.mount(app, opts, { fresh, build });
})();
