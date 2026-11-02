/* =====================================================================
   WEEK 7 · DP WARM-UP (the instructor's opening, before the match puzzle
   of slide 4). Two parts, shown as two tabs; the stepper runs through both,
   so in the deck the presenter's keys go from part 1 straight into part 2.
   Part 1 · Fibonacci: the plain recursion asks the same questions again and
   again; storing each answer the first time (memoization) removes the
   repeats. Calls: 2F(n+1) − 1 without the memo, 2n − 1 with it.
   Part 2 · ATM: "largest bill first" (greedy) against DP over the amount
   still to pay, f(m) = 1 + min over bills c ≤ m of f(m − c), f(0) = 0.
   The seconds in part 1 were measured in advance, not in the browser:
   studio_dev/measure_fib_timing.py, log in artifacts/dp-warmup/.
   Needs lecture-animations.js.
   ===================================================================== */
(() => {
  const root = document.getElementById('dp-warmup');
  if (!root) return;
  const $ = sel => root.querySelector(sel);
  const { num, tex, svgEl, px, colors, stats, setText } = ANIM;

  // === SHARED FORMATTING ===
  const group = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');   // 15 625, as slide 22 prints it
  function seconds(s) {
    if (s >= 1) return num(s, 1) + ' s';
    if (s >= 1e-3) return num(s * 1e3, 1) + ' ms';
    return Math.round(s * 1e6) + ' µs';
  }
  const fibValue = n => { let a = 0, b = 1; for (let k = 0; k < n; k++) [a, b] = [b, a + b]; return a; };
  const naiveCalls = n => 2 * fibValue(n + 1) - 1;
  const memoCalls = n => 2 * n - 1;
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // === PART 1 DATA: the call tree of F(6) ===
  const TREE_N = 6;
  // Every call is one node. `first`: the first time this question is asked (in
  // the order the computer asks). With the memo, a later call of the same
  // question only reads the stored answer ("lookup"), and its own calls vanish.
  function buildTree(n) {
    const nodes = [], seen = new Set();
    let leaf = 0;
    (function call(arg, depth, parent) {
      const node = { arg, depth, parent, kids: [], order: nodes.length, first: !seen.has(arg) };
      seen.add(arg);
      nodes.push(node);
      if (parent) parent.kids.push(node);
      if (arg > 1) { call(arg - 1, depth + 1, node); call(arg - 2, depth + 1, node); }
      node.x = node.kids.length ? (node.kids[0].x + node.kids[1].x) / 2 : leaf++;
      return node;
    })(n, 0, null);
    nodes.forEach(node => {
      node.lookup = !node.first && node.parent.first;
      node.gone = !node.first && !node.lookup;
    });
    return { nodes, leaves: leaf, depth: Math.max(...nodes.map(v => v.depth)) };
  }
  const TREE = buildTree(TREE_N);
  // The order in which the memo receives its answers: F(1), F(0), F(2), …, F(6).
  const STORE_ORDER = [];
  (function post(node) { node.kids.forEach(post); if (node.first) STORE_ORDER.push(node.arg); })(TREE.nodes[0]);
  const ASKED = Array.from({ length: TREE_N + 1 }, (_, k) => TREE.nodes.filter(v => v.arg === k).length);

  // Seconds as printed by the course notebook (lecture_material/Week 7 -
  // fibmemo.ipynb, one run per n on the instructor's machine). Its memo is kept
  // between runs; studio_dev/measure_fib_timing.py re-timed the memo emptied
  // before every run and it stays below 50 µs up to n = 40.
  const MEASURED = {
    source: 'the course notebook (Week 7 – fibmemo.ipynb)',
    rows: [   // [n, seconds without memo, seconds with memo]
      [5, 0.000009, 0.000008], [10, 0.000010, 0.000005], [20, 0.001028, 0.000006],
      [30, 0.321424, 0.000015], [35, 2.109444, 0.000006], [37, 5.299980, 0.000007],
      [40, 20.444126, 0.000009], [41, 26.697599, 0.000007], [42, 48.552090, 0.000017],
      [43, 72.896932, 0.000009]
    ]
  };

  const NAIVE_CODE = 'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)';
  const MEMO_CODE = 'memo = {}\ndef fibonacci_memo(n):\n    if n in memo:            # already computed?\n        return memo[n]       # then read it\n    if n <= 1:\n        memo[n] = n\n    else:\n        memo[n] = fibonacci_memo(n-1) + fibonacci_memo(n-2)\n    return memo[n]';

  // === PART 2 DATA: the ATM ===
  const PRESETS = {
    usual: { bills: [100, 50, 20, 10, 5], amount: 160, label: '100·50·20·10·5, pay 160' },
    odd: { bills: [60, 50, 15, 10, 5], amount: 160, label: '60·50·15·10·5, pay 160' },
    stuck: { bills: [50, 20], amount: 60, label: 'only 50 and 20, pay 60' }
  };
  const MAX_CELLS = 81;          // amounts in the DP table (0 included), so every cell stays readable
  const MAX_BILLS = 6;
  const gcd = (a, b) => b ? gcd(b, a % b) : a;

  function solveAtm(billsIn, amount) {
    const bills = [...new Set(billsIn)].sort((a, b) => b - a);
    const g = bills.reduce(gcd);
    const greedy = []; let left = amount;
    bills.forEach(b => { while (left >= b) { greedy.push(b); left -= b; } });
    const cells = [];
    for (let m = 0; m <= amount; m += g) cells.push(m);
    const f = new Map([[0, 0]]), choice = new Map();
    cells.slice(1).forEach(m => {
      let best = Infinity, pick = null;
      bills.forEach(b => {   // largest bill first, so ties go to the larger bill
        if (b <= m && f.get(m - b) + 1 < best) { best = f.get(m - b) + 1; pick = b; }
      });
      f.set(m, best); choice.set(m, pick);
    });
    const policy = [];
    for (let m = amount; m > 0 && choice.get(m) != null && f.get(amount) < Infinity; m -= choice.get(m)) policy.push(choice.get(m));
    const best = f.get(amount);
    const outcome = best === Infinity ? 'none' : left > 0 ? 'stuck' : greedy.length > best ? 'worse' : 'same';
    return { bills, amount, g, greedy, left, cells, f, choice, policy, best, outcome };
  }
  let atm = solveAtm(PRESETS.odd.bills, PRESETS.odd.amount), atmPreset = 'odd';

  // === STEP LIST: part 1 then part 2 ===
  const STEPS = [
    { part: 'fib', kind: 'ask', phase: 0 },
    { part: 'fib', kind: 'grow', phase: 0, dur: 3600 },
    { part: 'fib', kind: 'repeat', phase: 1, dur: 900 },
    { part: 'fib', kind: 'memo', phase: 2, dur: 3000 },
    { part: 'fib', kind: 'calls', phase: 3 },
    { part: 'fib', kind: 'time', phase: 3, dur: 1200 },
    { part: 'atm', kind: 'ask', phase: 0 },
    { part: 'atm', kind: 'greedy', phase: 0, dur: () => 450 * Math.max(1, atm.greedy.length) + 300 },
    { part: 'atm', kind: 'state', phase: 1, dur: 1200 },
    { part: 'atm', kind: 'table', phase: 2, dur: () => Math.min(4500, 600 + 80 * atm.cells.length) },
    { part: 'atm', kind: 'cell', phase: 2, dur: 900 },
    { part: 'atm', kind: 'policy', phase: 3, dur: () => 500 * Math.max(1, atm.policy.length) + 400 },
    { part: 'atm', kind: 'words', phase: 3, dur: 1200 }
  ];
  const PHASES = { fib: ['Recursion', 'Repeats', 'Memo', 'Bigger n'], atm: ['Greedy', 'State', 'Table', 'Answer'] };
  const firstOf = part => STEPS.findIndex(s => s.part === part);
  const partSteps = part => STEPS.filter(s => s.part === part);

  // === DRAWING: common SVG setup ===
  function canvas() {
    const svg = $('.js-plot');
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return null;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const c = colors(), fs = px(root);
    const add = (tag, attrs, text, parent = svg) => svgEl(parent, tag, attrs, text);
    const write = (x, y, s, attrs = {}) => add('text', { x, y, fill: c.ink, 'font-size': Math.round(fs * 0.8), 'text-anchor': 'middle', ...attrs }, s);
    return { svg, W, H, c, fs, add, write };
  }
  function arrowHead(k, id, color) {
    const marker = k.add('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, null, k.add('defs', {}));
    k.add('path', { d: 'M0,0 L10,5 L0,10 Z', fill: color }, null, marker);
    return `url(#${id})`;
  }

  // === PART 1 DRAWING ===
  function nodeAlpha(node, s, p) {
    if (s.kind === 'ask') return node.order === 0 ? 1 : 0;
    if (s.kind === 'grow') return clamp01(p * (TREE.nodes.length - 1) - node.order + 1);
    if (s.kind === 'memo' && node.gone) return 1 - 0.88 * p;
    return 1;
  }
  function nodeColor(node, s, p, c) {
    if (s.kind === 'ask' || s.kind === 'grow') return null;     // outline only: nothing is judged yet
    if (s.kind === 'memo' && node.lookup) return p > 0.35 ? c.s2 : c.bad;
    return node.first ? c.s1 : c.bad;
  }
  function drawTree(s, p) {
    const k = canvas();
    if (!k) return;
    const { W, H, c, fs, add, write } = k;
    const tableH = s.kind === 'memo' ? fs * 3.4 : 0;
    // The radius first, so that the outer circles keep a margin of one radius.
    const r0 = Math.min((W - 3 * fs) / (TREE.leaves - 1) * 0.42, (H - tableH - 3 * fs) / TREE.depth * 0.36, fs * 1.4);
    const margin = r0 + 4, top = r0 + fs * 0.4, bottom = H - tableH - r0 - fs * 0.4;
    const dx = (W - 2 * margin) / (TREE.leaves - 1), dy = (bottom - top) / TREE.depth;
    const r = Math.max(7, Math.min(r0, dx * 0.42, dy * 0.36));
    const at = node => [margin + node.x * dx, top + node.depth * dy];
    const label = node => r >= fs * 1.05 ? 'F(' + node.arg + ')' : String(node.arg);
    TREE.nodes.forEach(node => node.kids.forEach(kid => {
      const a = Math.min(nodeAlpha(node, s, p), nodeAlpha(kid, s, p), s.kind === 'memo' && kid.gone ? 1 - 0.75 * p : 1);
      if (a <= 0) return;
      const [x1, y1] = at(node), [x2, y2] = at(kid);
      add('line', { x1, y1, x2, y2, stroke: c.axis, 'stroke-width': 1.6, opacity: a });
    }));
    TREE.nodes.forEach(node => {
      const a = nodeAlpha(node, s, p);
      if (a <= 0) return;
      const [x, y] = at(node), fill = nodeColor(node, s, s.kind === 'repeat' ? 1 : p, c);
      const showRed = s.kind === 'repeat' && !node.first;
      if (s.kind === 'memo' && node.gone) {   // a call that never happens: red fades into a grey dashed ring
        add('circle', { cx: x, cy: y, r, fill: c.bad, opacity: 1 - p });
        add('circle', { cx: x, cy: y, r, fill: 'none', stroke: c.muted, 'stroke-width': 1.5, 'stroke-dasharray': '4 3', opacity: 0.25 + 0.5 * p });
        write(x, y + r * 0.3, label(node), { 'font-size': Math.round(Math.min(r * 0.78, fs * 0.95)), fill: p < 0.5 ? '#fff' : c.muted, opacity: 1 - 0.6 * p });
        return;
      }
      add('circle', { cx: x, cy: y, r, fill: fill ? (showRed ? c.bad : fill) : c.surface, stroke: fill || c.s1, 'stroke-width': 2, opacity: showRed ? 0.25 + 0.75 * p : a });
      write(x, y + r * 0.3, label(node), { 'font-size': Math.round(Math.min(r * 0.78, fs * 0.95)), 'font-weight': 650, fill: fill ? '#fff' : c.ink, opacity: a });
    });
    if (s.kind === 'grow' && p >= 1) write(at(TREE.nodes[0])[0] + r + fs * 0.5, top + fs * 0.3, 'answer: F(6) = 8', { 'font-weight': 700, 'text-anchor': 'start' });
    if (s.kind === 'memo') drawMemoTable(k, p, H - tableH, tableH);
  }
  function drawMemoTable(k, p, y0, h) {
    const { W, c, fs, add, write } = k;
    const n = TREE_N + 1, labelW = fs * 4.2;
    const w = Math.min(fs * 4.4, (W - labelW - fs) / n), x0 = (W - labelW - n * w) / 2 + labelW;
    write(x0 - fs * 0.5, y0 + h * 0.55, 'memo:', { 'text-anchor': 'end', 'font-weight': 650 });
    for (let arg = 0; arg <= TREE_N; arg++) {
      const rank = STORE_ORDER.indexOf(arg), filled = p * n > rank + 0.5;
      const x = x0 + arg * w, y = y0 + fs * 0.4, ch = h - fs * 0.9;
      add('rect', { x: x + 2, y, width: w - 4, height: ch, rx: 6, fill: filled ? c.region : c.surface, stroke: filled ? c.s2 : c.grid, 'stroke-width': 2 });
      write(x + w / 2, y + ch * 0.38, 'F(' + arg + ')', { fill: c.ink2, 'font-size': Math.round(fs * 0.68) });
      if (filled) write(x + w / 2, y + ch * 0.82, String(fibValue(arg)), { 'font-weight': 700, 'font-size': Math.round(fs * 0.9) });
    }
  }
  // Calls against n on a log scale: each grid line is 10 times the one below.
  function drawCalls(n) {
    const k = canvas();
    if (!k) return;
    const { W, H, c, fs, add, write } = k;
    const N0 = 1, N1 = 45, Y1 = 10;
    const padL = fs * 4.6, padR = fs * 6.2, padT = fs * 1.4, padB = fs * 2.4;
    const X = v => padL + (v - N0) / (N1 - N0) * (W - padL - padR);
    const Y = v => padT + (1 - v / Y1) * (H - padT - padB);
    const names = ['1', '10', '100', '1 000', '10 000', '100 000', '1 million', '10 million', '100 million', '1 billion', '10 billion'];
    for (let e = 0; e <= Y1; e++) {
      add('line', { x1: X(N0), x2: X(N1), y1: Y(e), y2: Y(e), stroke: c.grid });
      if (e % 2 === 0 || H > fs * 22) write(X(N0) - fs * 0.4, Y(e) + fs * 0.25, names[e], { 'text-anchor': 'end', fill: c.ink2, 'font-size': Math.round(fs * 0.66) });
    }
    [5, 10, 15, 20, 25, 30, 35, 40, 45].forEach(v => {
      add('line', { x1: X(v), x2: X(v), y1: Y(0), y2: Y(Y1), stroke: c.grid });
      write(X(v), Y(0) + fs * 1.05, String(v), { fill: c.ink2, 'font-size': Math.round(fs * 0.7) });
    });
    write(X(N1), Y(0) + fs * 2.1, 'n', { 'text-anchor': 'end', fill: c.ink2, 'font-style': 'italic', 'font-size': Math.round(fs * 0.72) });
    write(X(N0), padT - fs * 0.45, 'number of calls', { 'text-anchor': 'start', fill: c.ink2, 'font-style': 'italic', 'font-size': Math.round(fs * 0.72) });
    const path = fn => Array.from({ length: N1 - N0 + 1 }, (_, i) => (i ? 'L' : 'M') + X(N0 + i).toFixed(1) + ',' + Y(Math.log10(fn(N0 + i))).toFixed(1)).join('');
    add('path', { d: path(naiveCalls), fill: 'none', stroke: c.bad, 'stroke-width': 2.5 });
    add('path', { d: path(memoCalls), fill: 'none', stroke: c.s2, 'stroke-width': 2.5 });
    write(X(N1) + fs * 0.4, Y(Math.log10(naiveCalls(N1))) + fs * 0.3, 'without memo', { 'text-anchor': 'start', 'font-size': Math.round(fs * 0.72), 'font-weight': 600 });
    write(X(N1) + fs * 0.4, Y(Math.log10(memoCalls(N1))) + fs * 0.3, 'with memo', { 'text-anchor': 'start', 'font-size': Math.round(fs * 0.72), 'font-weight': 600 });
    add('line', { x1: X(n), x2: X(n), y1: Y(0), y2: Y(Y1), stroke: c.ink2, 'stroke-dasharray': '4 4' });
    [[naiveCalls(n), c.bad], [memoCalls(n), c.s2]].forEach(([v, col]) => {
      add('circle', { cx: X(n), cy: Y(Math.log10(v)), r: 6, fill: col, stroke: c.surface, 'stroke-width': 2 });
      write(X(n) + (n > 36 ? -fs * 0.6 : fs * 0.6), Y(Math.log10(v)) - fs * 0.5, group(v), { 'text-anchor': n > 36 ? 'end' : 'start', 'font-weight': 700, 'font-size': Math.round(fs * 0.78), 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4 });
    });
  }
  // Measured seconds on a plain (linear) scale, like the notebook's plot.
  function drawTime(p) {
    const k = canvas();
    if (!k) return;
    const { W, H, c, fs, add, write } = k;
    const rows = MEASURED.rows, nMax = rows[rows.length - 1][0];
    const tMax = Math.max(...rows.map(r => r[1]));
    const yStep = [0.5, 1, 2, 5, 10, 20, 50, 100].find(st => tMax / st <= 5) || 200, yTop = Math.ceil(tMax / yStep) * yStep;
    const padL = fs * 3.4, padR = fs * 6.2, padT = fs * 1.4, padB = fs * 2.4;
    const X = v => padL + (v - 5) / (nMax - 5) * (W - padL - padR);
    const Y = v => padT + (1 - v / yTop) * (H - padT - padB);
    const ticks = []; for (let t = 0; t <= yTop + 1e-9; t += yStep) ticks.push(t);
    ticks.forEach(t => {
      add('line', { x1: X(5), x2: X(nMax), y1: Y(t), y2: Y(t), stroke: c.grid });
      write(X(5) - fs * 0.4, Y(t) + fs * 0.25, num(t, 1), { 'text-anchor': 'end', fill: c.ink2, 'font-size': Math.round(fs * 0.68) });
    });
    for (let v = 5; v <= nMax; v += 5) write(X(v), Y(0) + fs * 1.05, String(v), { fill: c.ink2, 'font-size': Math.round(fs * 0.66) });
    write(X(nMax), Y(0) + fs * 2.1, 'n', { 'text-anchor': 'end', fill: c.ink2, 'font-style': 'italic', 'font-size': Math.round(fs * 0.72) });
    write(X(5), padT - fs * 0.45, 'seconds', { 'text-anchor': 'start', fill: c.ink2, 'font-style': 'italic', 'font-size': Math.round(fs * 0.72) });
    // The curves are drawn from left to right while the step plays.
    const shown = rows.filter((r, i) => i <= p * (rows.length - 1) + 1e-9);
    const line = (idx, col) => {
      add('path', { d: shown.map((r, i) => (i ? 'L' : 'M') + X(r[0]).toFixed(1) + ',' + Y(r[idx]).toFixed(1)).join(''), fill: 'none', stroke: col, 'stroke-width': 2.5 });
      shown.forEach(r => add('circle', { cx: X(r[0]), cy: Y(r[idx]), r: 4.5, fill: col, stroke: c.surface, 'stroke-width': 1.5 }));
    };
    line(1, c.bad); line(2, c.s2);
    if (p >= 1) {
      const last = rows[rows.length - 1];
      write(X(last[0]) - fs * 0.6, Y(last[1]) + fs * 0.3, 'without memo: ' + seconds(last[1]), { 'text-anchor': 'end', 'font-weight': 700, 'font-size': Math.round(fs * 0.72), 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4 });
      write(X(last[0]) + fs * 0.4, Y(last[2]) - fs * 0.3, 'with memo: ' + seconds(last[2]), { 'text-anchor': 'start', 'font-weight': 700, 'font-size': Math.round(fs * 0.72) });
    }
  }

  // === PART 2 DRAWING ===
  // A bill is a small rounded note with its value.
  function bill(k, x, y, w, h, value, color, opacity = 1) {
    const { c, fs, add, write } = k;
    add('rect', { x, y, width: w, height: h, rx: 5, fill: color, 'fill-opacity': 0.16, stroke: color, 'stroke-width': 2, opacity });
    write(x + w / 2, y + h / 2 + fs * 0.3, String(value), { 'font-weight': 700, 'font-size': Math.round(Math.min(fs * 0.95, h * 0.55)), fill: c.ink, opacity });
  }
  function billRow(k, values, y, color, { visible = values.length, highlight = -1, label = '' } = {}) {
    const { W, fs, write, c } = k;
    const labelW = label ? fs * 5 : 0;
    const w = Math.min(fs * 3.4, (W - labelW - fs) / Math.max(1, values.length) - fs * 0.35), h = Math.min(fs * 1.9, w * 0.62);
    const gap = fs * 0.35, total = values.length * (w + gap) - gap, x0 = labelW + (W - labelW - total) / 2;
    if (label) write(x0 - fs * 0.6, y + h / 2 + fs * 0.3, label, { 'text-anchor': 'end', 'font-weight': 650, 'font-size': Math.round(fs * 0.8) });
    values.forEach((v, i) => { if (i < visible) bill(k, x0 + i * (w + gap), y, w, h, v, i === highlight ? c.s1 : color); });
    return { h, x0, w, gap };
  }
  function drawAsk(k) {
    const { H, W, c, fs, write } = k;
    write(W / 2, H * 0.22, 'Bills in the ATM (as many of each as needed)', { fill: c.ink2, 'font-size': Math.round(fs * 0.8) });
    billRow(k, atm.bills, H * 0.27, c.ink2);
    write(W / 2, H * 0.66, 'Pay ' + atm.amount + ' TL', { 'font-size': Math.round(fs * 2.1), 'font-weight': 750 });
    write(W / 2, H * 0.66 + fs * 1.8, 'with as few bills as possible', { fill: c.ink2, 'font-size': Math.round(fs * 0.9) });
  }
  function drawGreedy(k, p) {
    const { H, W, c, fs, write } = k;
    const shown = Math.min(atm.greedy.length, Math.floor(p * atm.greedy.length + 1e-9));
    const current = shown < atm.greedy.length ? atm.bills.indexOf(atm.greedy[shown]) : -1;
    write(W / 2, H * 0.14, 'Bills in the ATM', { fill: c.ink2, 'font-size': Math.round(fs * 0.8) });
    billRow(k, atm.bills, H * 0.18, c.ink2, { highlight: current });
    write(W / 2, H * 0.47, 'Greedy pays', { fill: c.ink2, 'font-size': Math.round(fs * 0.8) });
    billRow(k, atm.greedy, H * 0.51, c.s5, { visible: shown });
    let left = atm.amount; const chain = [left];
    atm.greedy.slice(0, shown).forEach(b => { left -= b; chain.push(left); });
    write(W / 2, H * 0.8, 'still to pay: ' + chain.join(' → '), { 'font-size': Math.round(fs * 0.9), 'font-weight': 600 });
    if (p >= 1 && atm.left > 0) write(W / 2, H * 0.8 + fs * 1.6, atm.left + ' TL left, and no bill is that small: greedy is stuck.', { fill: c.bad, 'font-weight': 700, 'font-size': Math.round(fs * 0.85) });
  }
  // One decision from the full amount: each bill c leads to the smaller problem m − c.
  function drawState(k, p) {
    const { H, W, c, fs, add, write } = k;
    const opts = atm.bills.filter(b => b <= atm.amount);
    const head = arrowHead(k, 'dw-a1', c.s1);
    const x0 = W * 0.16, y0 = H / 2, x1 = W * 0.72, r = Math.min(fs * 1.9, H / (2.6 * Math.max(2, opts.length)));
    add('circle', { cx: x0, cy: y0, r: fs * 2, fill: c.region, stroke: c.s1, 'stroke-width': 2.5 });
    write(x0, y0 + fs * 0.35, String(atm.amount), { 'font-weight': 750, 'font-size': Math.round(fs * 1.05) });
    write(x0, y0 + fs * 3.2, 'still to pay', { fill: c.ink2, 'font-size': Math.round(fs * 0.72) });
    opts.forEach((b, i) => {
      const a = clamp01(p * opts.length - i);
      if (a <= 0) return;
      const y = H * (i + 0.5) / opts.length, rest = atm.amount - b;
      add('line', { x1: x0 + fs * 2.1, y1: y0, x2: x1 - fs * 2.3, y2: y, stroke: c.s1, 'stroke-width': 2, 'marker-end': head, opacity: a });
      const mx = (x0 + x1) / 2, my = (y0 + y) / 2;
      write(mx, my - fs * 0.35, 'give ' + b, { 'font-weight': 650, 'font-size': Math.round(fs * 0.75), opacity: a, 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4 });
      add('rect', { x: x1 - fs * 2.2, y: y - r * 0.55, width: fs * 4.4, height: r * 1.1, rx: 8, fill: c.surface, stroke: c.s1, 'stroke-width': 2, opacity: a });
      write(x1, y + fs * 0.3, 'f(' + rest + ') = ?', { 'font-weight': 650, 'font-size': Math.round(Math.min(fs * 0.85, r * 0.6)), opacity: a });
    });
  }
  // The DP table: one cell per amount 0, g, 2g, …, the amount to pay.
  function tableLayout(k, yTop, yBottom) {
    const { W, fs } = k;
    const n = atm.cells.length;
    const cols = Math.max(1, Math.min(n, Math.floor((W - fs) / (fs * 4.2))));
    const rows = Math.ceil(n / cols);
    const w = Math.min(fs * 6, (W - fs) / cols), h = Math.min(w * 0.85, (yBottom - yTop) / rows);
    const x0 = (W - cols * w) / 2, y0 = yTop + Math.max(0, (yBottom - yTop - rows * h) / 2);
    return atm.cells.map((m, i) => ({ m, x: x0 + (i % cols) * w, y: y0 + Math.floor(i / cols) * h, w, h }));
  }
  function drawTable(k, s, p) {
    const { H, c, fs, add, write } = k;
    const policyRows = fs * 5.2;   // kept free in every table step, so the table does not jump
    const cells = tableLayout(k, fs * 0.5, H - policyRows - fs * 0.4);
    const filled = s.kind === 'table' ? p * atm.cells.length : Infinity;
    const target = atm.amount;
    const cand = s.kind === 'cell' ? new Map(atm.bills.filter(b => b <= target).map(b => [target - b, b])) : new Map();
    const bestRest = atm.best < Infinity ? target - atm.choice.get(target) : null;
    // The answer read back: the amounts visited, each labelled with the bill that led there.
    const path = new Map(), steps = Math.floor(p * (atm.policy.length + 0.999));
    if (s.kind === 'policy' && atm.best < Infinity) {
      let m = target; path.set(m, 'start');
      atm.policy.slice(0, steps).forEach(b => { m -= b; path.set(m, '−' + b); });
    }
    cells.forEach((cell, i) => {
      const done = i < filled;
      const value = atm.f.get(cell.m);
      let stroke = c.grid, fill = c.surface, width = 1.5;
      if (done) fill = c.page || c.surface;
      if (s.kind === 'table' && i === Math.floor(filled)) { stroke = c.s1; width = 3; }
      if (cand.has(cell.m)) { stroke = c.s1; width = 3; if (cell.m === bestRest) fill = c.region; }
      if (path.has(cell.m)) { stroke = c.s2; width = 3; fill = c.region; }
      if ((s.kind === 'cell') && cell.m === target) { stroke = c.ink; width = 3; }
      add('rect', { x: cell.x + 2, y: cell.y + 2, width: cell.w - 4, height: cell.h - 4, rx: 6, fill, stroke, 'stroke-width': width });
      write(cell.x + cell.w / 2, cell.y + cell.h * 0.34, String(cell.m), { fill: c.ink2, 'font-size': Math.round(Math.min(fs * 0.62, cell.h * 0.26)) });
      if (done) write(cell.x + cell.w / 2, cell.y + cell.h * 0.78, value === Infinity ? '✗' : String(value), { 'font-weight': 700, 'font-size': Math.round(Math.min(fs * 0.95, cell.h * 0.38)), fill: value === Infinity ? c.muted : c.ink });
      const tag = cand.has(cell.m) ? ['−' + cand.get(cell.m), c.s1] : path.has(cell.m) ? [path.get(cell.m), c.s2] : null;
      if (tag) write(cell.x + cell.w / 2, cell.y + cell.h * 0.04 + fs * 0.1, tag[0], { 'font-weight': 700, 'font-size': Math.round(fs * 0.62), fill: tag[1], 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4 });
    });
    if (s.kind === 'policy') {
      const y0 = H - policyRows + fs * 0.4;
      billRow(k, atm.policy, y0, c.s2, { visible: steps, label: 'DP' });
      if (atm.left > 0) write(k.W / 2 + fs * 2.5, y0 + fs * 3.6, 'Greedy: stuck with ' + atm.left + ' TL left', { fill: c.bad, 'font-weight': 700, 'font-size': Math.round(fs * 0.8) });
      else billRow(k, atm.greedy, y0 + fs * 2.5, c.s5, { label: 'Greedy' });
    }
  }
  // The DP words on the answer itself: states in boxes, decisions on the arrows.
  function drawWords(k, p) {
    const { W, H, c, fs, add, write } = k;
    const states = [atm.amount]; atm.policy.forEach(b => states.push(states[states.length - 1] - b));
    if (atm.best === Infinity) { write(W / 2, H / 2, 'No combination of these bills pays ' + atm.amount + ' TL.', { 'font-weight': 650 }); return; }
    const head = arrowHead(k, 'dw-a3', c.s2);
    const n = states.length, bw = Math.min(fs * 4.2, W / (n * 1.9)), gap = (W - n * bw) / (n + 1), y = H * 0.42, bh = fs * 2.2;
    write(fs * 0.5, y - bh * 1.1, 'state = amount still to pay', { 'text-anchor': 'start', fill: c.ink2, 'font-size': Math.round(fs * 0.75), 'font-style': 'italic' });
    states.forEach((m, i) => {
      const a = clamp01(p * n - i + 0.5);
      const x = gap + i * (bw + gap);
      add('rect', { x, y: y - bh / 2, width: bw, height: bh, rx: 8, fill: c.region, stroke: c.s2, 'stroke-width': 2, opacity: a });
      write(x + bw / 2, y + fs * 0.35, String(m), { 'font-weight': 750, 'font-size': Math.round(fs * 1.0), opacity: a });
      if (i < n - 1) {
        const a2 = clamp01(p * n - i - 0.5);
        add('line', { x1: x + bw + 3, y1: y, x2: x + bw + gap - 5, y2: y, stroke: c.s2, 'stroke-width': 2.5, 'marker-end': head, opacity: a2 });
        write(x + bw + gap / 2, y - fs * 0.55, 'give ' + atm.policy[i], { 'font-weight': 650, 'font-size': Math.round(fs * 0.74), opacity: a2 });
        write(x + bw + gap / 2, y + bh * 0.5 + fs * 1.1, 'stage ' + (i + 1), { fill: c.ink2, 'font-size': Math.round(fs * 0.7), opacity: a2 });
      }
    });
    write(W / 2, H * 0.82, 'decision = which bill to give · the arrows are the decisions', { fill: c.ink2, 'font-size': Math.round(fs * 0.75), 'font-style': 'italic' });
  }
  function drawAtm(s, p) {
    const k = canvas();
    if (!k) return;
    if (s.kind === 'ask') drawAsk(k);
    else if (s.kind === 'greedy') drawGreedy(k, p);
    else if (s.kind === 'state') drawState(k, p);
    else if (s.kind === 'words') drawWords(k, p);
    else drawTable(k, s, p);
  }

  // === SIDE PANEL TEXT ===
  const plus = list => list.join(' + ');
  const texInf = v => v === Infinity ? '\\infty' : String(v);
  const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size).join(', '));
  function fibText(s) {
    if (s.kind === 'ask') return {
      title: 'One question: what is F(6)?',
      text: 'Each Fibonacci number is the sum of the two before it: 0, 1, 1, 2, 3, 5, 8, … The function below answers F(6) by asking two smaller questions, F(5) and F(4).',
      formula: '\\begin{aligned} F(n) &= F(n-1) + F(n-2) \\\\ F(0) &= 0, \\quad F(1) = 1 \\end{aligned}', code: NAIVE_CODE
    };
    if (s.kind === 'grow') return {
      title: 'Every call asks two more questions',
      text: 'To answer F(6) the computer needs F(5) and F(4). For F(5) it needs F(4) and F(3), and so on, down to F(1) = 1 and F(0) = 0. One circle is one call of the function.',
      code: NAIVE_CODE
    };
    if (s.kind === 'repeat') return {
      title: 'The same questions, again and again',
      text: 'There are only 7 different questions, F(0) to F(6), but the tree has 25 calls. Every red circle is a question that was already answered somewhere else in the tree, and it is worked out again from scratch.'
    };
    if (s.kind === 'memo') return {
      title: 'Store each answer the first time',
      text: 'A bag of apples: count them once and write the number on the bag; next time, read the number. The memo is that note: before working out F(k), look it up. Green circles only read the memo, so the grey calls below them never happen.',
      code: MEMO_CODE
    };
    if (s.kind === 'calls') return {
      title: 'Bigger n: the gap explodes',
      text: 'Without the memo the number of calls grows about 1.6 times with each step of n, like the Fibonacci numbers themselves. With the memo it grows by 2 per step. Each grid line on this scale is 10 times the one below it. Move the slider.',
      formula: '\\begin{aligned} \\text{without memo:}\\;& 2F(n+1) - 1 \\text{ calls} \\\\ \\text{with memo:}\\;& 2n - 1 \\text{ calls} \\end{aligned}'
    };
    return {
      title: 'What that means in seconds',
      text: 'The two functions above, timed in the course notebook. Without the memo each step of n multiplies the time by about 1.6, like the number of calls: F(43) takes more than a minute. With the memo every n takes millionths of a second.'
    };
  }
  function fibStats(s, p) {
    if (s.kind === 'grow') return [['Calls so far', String(Math.min(TREE.nodes.length, Math.floor(p * (TREE.nodes.length - 1)) + 1))], ['Answer', p >= 1 ? 'F(6) = 8' : '…']];
    if (s.kind === 'repeat') return [['Calls', '25'], ['Different questions', '7'], ['F(3) worked out', ASKED[3] + ' times'], ['F(2) worked out', ASKED[2] + ' times']];
    if (s.kind === 'memo') return [['Calls without memo', String(TREE.nodes.length)], ['Calls with memo', String(TREE.nodes.filter(v => !v.gone).length)], ['Answers read from memo', String(TREE.nodes.filter(v => v.lookup).length)]];
    if (s.kind === 'calls') { const n = sliderN(); return [['n', String(n)], ['Calls without memo', group(naiveCalls(n))], ['Calls with memo', String(memoCalls(n))]]; }
    if (s.kind === 'time') {
      const last = MEASURED.rows[MEASURED.rows.length - 1];
      return [['Without memo, n = ' + last[0], seconds(last[1])], ['With memo, n = ' + last[0], seconds(last[2])]];
    }
    return [];
  }
  // Other first bills that reach the same minimum (the table keeps the larger one).
  function tieNote(m) {
    const ties = atm.bills.filter(b => b <= m && b !== atm.choice.get(m) && atm.f.get(m - b) + 1 === atm.f.get(m));
    return ties.length ? ' (' + ties.join(' or ') + ' would tie; the table keeps the larger bill)' : '';
  }
  // Where greedy and the DP answer first choose different bills, and what each choice leaves.
  function partWays() {
    let m = atm.amount;
    for (let i = 0; i < Math.min(atm.greedy.length, atm.policy.length); i++) {
      const gb = atm.greedy[i], db = atm.policy[i];
      if (gb !== db) {
        const more = k => k + (k === 1 ? ' more bill' : ' more bills');
        return 'At ' + m + ' TL they part: greedy gives ' + gb + ' and leaves ' + (m - gb) + ' TL, which needs ' + more(atm.f.get(m - gb)) +
          '; DP gives ' + db + ' and leaves ' + (m - db) + ' TL, which needs ' + more(atm.f.get(m - db)) + '.';
      }
      m -= gb;
    }
    return 'Greedy never looks at what a bill leaves behind.';
  }
  function atmText(s) {
    const A = atm.amount, list = atm.bills.join(', ');
    const g = atm.greedy, o = atm.outcome;
    if (s.kind === 'ask') return {
      title: 'Pay ' + A + ' TL with as few bills as possible',
      text: 'The ATM has bills of ' + list + ' TL, as many of each as it needs. Which bills should it give? Make your own guess before the next step.'
    };
    if (s.kind === 'greedy') return {
      title: 'Greedy: always the largest bill that still fits',
      text: o === 'stuck' ? 'Greedy gives ' + plus(g) + ' and then ' + atm.left + ' TL is left. No bill is that small, so greedy is stuck. Is there a way to pay at all?'
        : o === 'none' ? 'Greedy ends with ' + atm.left + ' TL that no bill can pay.'
        : 'Greedy gives ' + plus(g) + ' = ' + A + ': ' + g.length + ' bills. Each choice is the best for this moment only; greedy never looks at what the choice leaves behind. Is ' + g.length + ' the fewest?',
      formula: [A].concat(g.map((b, i) => A - g.slice(0, i + 1).reduce((x, y) => x + y, 0))).join(' \\to ')
    };
    if (s.kind === 'state') return {
      title: 'DP: what matters is the amount still to pay',
      text: 'After the first bill, what is left is a smaller problem of the same kind. Let f(m) be the fewest bills that pay exactly m TL. If the first bill is c, the rest needs f(m − c) bills at best. So try every bill and keep the best.',
      formula: 'f(m) = 1 + \\min\\limits_{\\text{bills } c \\,\\le\\, m} f(m - c), \\qquad f(0) = 0'
    };
    if (s.kind === 'table') return {
      title: 'Fill the table from 0 TL upward',
      text: 'Each cell shows an amount (small number) and its fewest bills f(m) (large number). A cell needs only smaller amounts, and those are already in the table: store and reuse, as with the memo in part 1. ✗ means these bills cannot make that amount.'
    };
    if (s.kind === 'cell') {
      const opts = atm.bills.filter(b => b <= A);
      return {
        title: 'Up close: f(' + A + ')',
        text: 'Try each bill as the first one, look up what is left in the table and add 1. The smallest result wins' + (atm.best < Infinity ? ': the first bill is ' + atm.choice.get(A) + tieNote(A) + '.' : '. Here every option is ✗: no combination pays ' + A + ' TL.'),
        formula: '\\begin{aligned} f(' + A + ') &= 1 + \\min\\{' + chunks(opts.map(b => 'f(' + (A - b) + ')'), 3).join(', \\\\ &\\qquad\\qquad ') + '\\} \\\\ &= 1 + \\min\\{' + opts.map(b => texInf(atm.f.get(A - b))).join(', ') + '\\} = ' + texInf(atm.best) + ' \\end{aligned}'
      };
    }
    if (s.kind === 'policy') {
      if (o === 'none') return { title: 'No way to pay ' + A + ' TL', text: 'f(' + A + ') = ∞: these bills cannot make this amount, so neither greedy nor DP can pay it.' };
      const verdict = o === 'same' ? 'Here greedy also needs ' + atm.best + ' bills: ' + (atmPreset === 'usual' ? 'with the usual bills greedy happens to work.' : 'here greedy happens to work.') + ' DP does not depend on luck: it checks every choice.'
        : o === 'stuck' ? 'Greedy got stuck, but DP pays with ' + atm.best + ' bills. DP never commits to a bill before it knows what the rest will cost.'
        : 'DP: ' + atm.best + ' bills. Greedy: ' + g.length + ' bills. ' + partWays();
      return {
        title: 'Read the answer back',
        text: 'Start at ' + A + ', give the bill that gave the minimum, move to what is left and repeat: ' + atm.policy.join(', then ') + '. ' + verdict,
        formula: plus(atm.policy) + ' = ' + A
      };
    }
    return {
      title: 'The DP words for today',
      text: 'State: the amount still to pay. Decision: which bill to give. Stage: the 1st, 2nd, 3rd bill. The recursion links each state to smaller states, and we solve the small ones first. Next, the match puzzle of slide 4: there the state is the number of matches left.',
      formula: '\\begin{aligned} f(\\text{state}) = \\min\\limits_{\\text{decision}} \\{\\, &\\text{cost of the decision} \\\\ &+ f(\\text{next state}) \\,\\} \\end{aligned}'
    };
  }
  function atmStats(s) {
    if (s.kind === 'greedy') return [['Greedy bills', atm.left > 0 ? 'stuck' : String(atm.greedy.length)]];
    if (s.kind === 'table') return [['Amounts in the table', String(atm.cells.length)], ['Bills tried per amount', 'up to ' + atm.bills.length]];
    if (s.kind === 'policy' || s.kind === 'words') return [['DP bills', atm.best === Infinity ? '—' : String(atm.best)], ['Greedy bills', atm.left > 0 ? 'stuck' : String(atm.greedy.length)]];
    return [];
  }

  // === CAPTION, SLIDER, NOTE (change only when the part changes) ===
  let captionPart = null;
  function setCaption(part) {
    if (captionPart === part) return;
    captionPart = part;
    const cap = $('.js-caption');
    cap.replaceChildren();
    if (part === 'fib') {
      const span = document.createElement('span');
      tex(span, 'F(n) = F(n-1) + F(n-2)');
      cap.append(span);
      return;
    }
    cap.innerHTML = '<span class="segwrap dw-presets" role="group" aria-label="Bills and amount">' +
      Object.entries(PRESETS).map(([key, pr]) => '<button class="seg js-preset" data-preset="' + key + '">' + pr.label + '</button>').join('') +
      '</span><span class="dw-own"><label>bills <input class="js-bills" type="text" inputmode="numeric" size="14"></label>' +
      '<label>pay <input class="js-amount" type="number" min="1" max="2000" step="1"></label>' +
      '<button class="js-use">Use</button></span>';
    cap.querySelectorAll('.js-preset').forEach(b => b.addEventListener('click', () => usePreset(b.dataset.preset)));
    cap.querySelector('.js-use').addEventListener('click', useOwn);
    cap.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') useOwn(); }));
    syncAtmInputs();
  }
  function syncAtmInputs() {
    root.querySelectorAll('.js-preset').forEach(b => b.classList.toggle('active', b.dataset.preset === atmPreset));
    const bills = $('.js-bills'), amount = $('.js-amount');
    if (bills) { bills.value = atm.bills.join(', '); amount.value = atm.amount; }
  }
  function atmMessage(text) { const note = $('.js-note'); note.textContent = text; note.classList.toggle('dw-error', !!text); }
  function usePreset(key) {
    atmPreset = key;
    atm = solveAtm(PRESETS[key].bills, PRESETS[key].amount);
    afterAtmChange();
  }
  // Own bills and amount: whole TL amounts only, a table that stays readable.
  function useOwn() {
    const bills = $('.js-bills').value.split(/[^0-9]+/).filter(Boolean).map(Number);
    const amount = Number($('.js-amount').value);
    if (!bills.length || bills.length > MAX_BILLS || bills.some(b => !Number.isInteger(b) || b < 1 || b > 1000)) return atmMessage('Bills: 1 to ' + MAX_BILLS + ' whole amounts between 1 and 1000 TL, e.g. 60, 50, 15.');
    if (!Number.isInteger(amount) || amount < 1 || amount > 2000) return atmMessage('Amount: a whole number of TL between 1 and 2000.');
    const g = bills.reduce(gcd);
    if (amount % g) return atmMessage('These bills only make multiples of ' + g + ' TL, so ' + amount + ' TL cannot be paid exactly.');
    if (amount / g + 1 > MAX_CELLS) return atmMessage('The table would need ' + (amount / g + 1) + ' cells; keep it at ' + MAX_CELLS + ' or fewer (a smaller amount or larger bills).');
    atmPreset = Object.keys(PRESETS).find(key => PRESETS[key].amount === amount && String(PRESETS[key].bills) === String([...new Set(bills)].sort((a, b) => b - a))) || null;
    atm = solveAtm(bills, amount);
    afterAtmChange();
  }
  function afterAtmChange() {
    atmMessage('');
    syncAtmInputs();
    const i = stepper.index;
    if (STEPS[i].part === 'atm') stepper.repaint(); else stepper.go(firstOf('atm'));
  }
  const sliderN = () => Number($('.js-n').value);

  function legend(part, kind) {
    const dot = (cls, text) => '<span class="anim-key ' + cls + '">' + text + '</span>';
    if (part === 'fib') {
      if (kind === 'repeat') return dot('k-new', 'worked out the first time') + dot('k-again', 'asked again, worked out again');
      if (kind === 'memo') return dot('k-new', 'worked out once') + dot('k-memo', 'read from the memo') + dot('k-gone', 'never called');
      if (kind === 'calls' || kind === 'time') return dot('k-again', 'without memo') + dot('k-memo', 'with memo') + (kind === 'time' ? ' Times from ' + MEASURED.source + ', measured before class, not in your browser.' : '');
      return '';
    }
    if (kind === 'greedy') return dot('k-greedy', 'bills greedy gives');
    if (kind === 'table' || kind === 'cell') return 'small number: amount m (TL) · large number: f(m), the fewest bills · ✗: cannot be paid';
    if (kind === 'policy') return dot('k-memo', 'DP answer') + dot('k-greedy', 'greedy');
    return '';
  }

  // === WIRING ===
  let lastPart = null;
  function render(index, p) {
    const s = STEPS[index];
    if (s.part !== lastPart) { lastPart = s.part; if (s.part === 'fib') atmMessage(''); }
    setCaption(s.part);
    root.dataset.part = s.part;
    root.querySelectorAll('.js-part').forEach(b => b.classList.toggle('active', b.dataset.part === s.part));
    const inPart = partSteps(s.part), at = inPart.indexOf(s);
    $('.js-iter').textContent = 'Part ' + (s.part === 'fib' ? 1 : 2) + ' · step ' + (at + 1) + ' of ' + inPart.length;
    $('.js-phases').innerHTML = PHASES[s.part].map((name, i) => '<span' + (i === s.phase ? ' class="on"' : '') + '>' + name + '</span>').join('');
    $('.js-nrow').hidden = !(s.part === 'fib' && s.kind === 'calls');
    if (!$('.js-note').classList.contains('dw-error')) $('.js-note').innerHTML = legend(s.part, s.kind);
    const body = s.part === 'fib' ? fibText(s) : atmText(s);
    setText(root, body);
    const code = $('.js-code');
    code.hidden = !body.code;
    code.textContent = body.code || '';
    stats($('.js-stats'), s.part === 'fib' ? fibStats(s, p) : atmStats(s));
    $('.js-fine').textContent = s.part === 'fib'
      ? (s.kind === 'time' ? 'ms = thousandth of a second, µs = millionth of a second. One run per n. The notebook kept its memo between runs; with an empty memo each n still takes under 50 µs. Another computer gives other numbers but the same shape.' : 'F(k) is the k-th Fibonacci number: F(0) = 0, F(1) = 1, F(2) = 1, F(3) = 2, …')
      : 'Bills of every kind are unlimited. The table lists the amounts 0, ' + atm.g + ', ' + 2 * atm.g + ', … TL: these bills cannot make anything in between.';
    if (s.part === 'fib') {
      if (s.kind === 'calls') drawCalls(sliderN());
      else if (s.kind === 'time') drawTime(p);
      else drawTree(s, p);
    } else drawAtm(s, p);
  }
  const stepper = ANIM.stepper({
    root, total: () => STEPS.length, render,
    duration: i => { const d = STEPS[i].dur; return typeof d === 'function' ? d() : d || 700; }
  });

  root.querySelectorAll('.js-part').forEach(b => b.addEventListener('click', () => stepper.go(firstOf(b.dataset.part))));
  $('.js-n').addEventListener('input', () => { $('.js-nval').textContent = sliderN(); stepper.repaint(); });
  new ResizeObserver(() => { if (!root.hidden) stepper.repaint(); }).observe($('.js-plot'));
  window.addEventListener('themechange', () => { if (!root.hidden) stepper.repaint(); });

  stepper.go(ANIM.params.get('part') === 'atm' ? firstOf('atm') : 0);
  ANIM.register('dp-warmup', {
    activate() { stepper.repaint(); },
    deactivate() { stepper.stop(); },
    step: dir => stepper.step(dir),
    restart: () => stepper.go(0),
    togglePlay: () => stepper.togglePlay(),
    debug: () => ({
      index: stepper.index, total: STEPS.length, part: STEPS[stepper.index].part, kind: STEPS[stepper.index].kind,
      tree: { calls: TREE.nodes.length, memoCalls: TREE.nodes.filter(v => !v.gone).length, lookups: TREE.nodes.filter(v => v.lookup).length, asked: ASKED, storeOrder: STORE_ORDER },
      calls: { n: sliderN(), naive: naiveCalls(sliderN()), memo: memoCalls(sliderN()) },
      measured: MEASURED,
      atm: { bills: atm.bills, amount: atm.amount, greedy: atm.greedy, left: atm.left, best: atm.best === Infinity ? null : atm.best, policy: atm.policy, outcome: atm.outcome, cells: atm.cells.length, preset: atmPreset }
    })
  });
})();
