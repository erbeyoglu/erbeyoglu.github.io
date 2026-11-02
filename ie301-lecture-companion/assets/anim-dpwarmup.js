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
  // The memo version, call by call: 'call' (the function is called), 'read'
  // (the answer is already in the memo) and 'store' (an answer is written in).
  // 11 calls, 4 reads, 7 stores; the memo step plays them one at a time.
  const MEMO_EVENTS = [];
  (function walk(node) {
    MEMO_EVENTS.push({ type: 'call', node });
    if (node.lookup) { MEMO_EVENTS.push({ type: 'read', node }); return; }
    node.kids.forEach(walk);
    MEMO_EVENTS.push({ type: 'store', node });
  })(TREE.nodes[0]);
  const MEMO_EVENT_MS = 600;
  // The stepper eases its progress; the walk should tick at an even pace.
  const unease = q => q < 0.5 ? Math.sqrt(q / 2) : 1 - Math.sqrt(2 * (1 - q)) / 2;
  function memoState(p) {
    const done = Math.min(MEMO_EVENTS.length, Math.floor(unease(p) * MEMO_EVENTS.length + 1e-9));
    const called = new Set(), stored = new Set(), read = new Set();
    MEMO_EVENTS.slice(0, done).forEach(e => (e.type === 'call' ? called : e.type === 'store' ? stored : read).add(e.node));
    return { done, called, stored, read, current: done > 0 ? MEMO_EVENTS[done - 1] : null };
  }
  function memoEventText(e) {
    const a = e.node.arg, v = fibValue(a);
    if (e.type === 'read') return 'Yes: read F(' + a + ') = ' + v + ' from the memo. No new calls below it.';
    if (e.type === 'store') return 'Store F(' + a + ') = ' + v + ' in the memo.';
    if (e.node.lookup) return 'F(' + a + ') is called. Is it in the memo?';
    return 'F(' + a + ') is called. Not in the memo yet, so work it out' + (a > 1 ? ': ask F(' + (a - 1) + ') and F(' + (a - 2) + ').' : '.');
  }
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
  let atm = solveAtm(PRESETS.usual.bills, PRESETS.usual.amount), atmPreset = 'usual';

  // === STEP LIST: part 1 then part 2 ===
  const STEPS = [
    { part: 'fib', kind: 'ask', phase: 0 },
    { part: 'fib', kind: 'grow', phase: 0, dur: () => TREE.nodes.length * 300 },
    { part: 'fib', kind: 'repeat', phase: 1, dur: 900 },
    { part: 'fib', kind: 'memo', phase: 2, dur: () => MEMO_EVENTS.length * MEMO_EVENT_MS },
    { part: 'fib', kind: 'calls', phase: 3 },
    { part: 'fib', kind: 'time', phase: 3, dur: 1200 },
    // The story (owner, 2026-11-02): greedy on three ATMs in a row. The usual
    // bills, where it works; 60-50-15-10-5, where it needs more bills than
    // necessary; only 50 and 20, where it gets stuck. Then what DP would do; how
    // DP finds it is left to the lecture (match puzzle, Joe's trip). Entering a
    // step with `preset` loads that ATM; a preset button jumps to its ATM.
    { part: 'atm', kind: 'ask', phase: 0, preset: 'usual' },
    { part: 'atm', kind: 'greedy', phase: 0, preset: 'usual', dur: () => ATM_ITEM_MS * Math.max(1, atm.greedy.length) + 400 },
    { part: 'atm', kind: 'ask', phase: 1, preset: 'odd', again: true },
    { part: 'atm', kind: 'greedy', phase: 1, preset: 'odd', again: true, dur: () => ATM_ITEM_MS * Math.max(1, atm.greedy.length) + 400 },
    { part: 'atm', kind: 'ask', phase: 2, preset: 'stuck', again: true },
    { part: 'atm', kind: 'greedy', phase: 2, preset: 'stuck', again: true, dur: () => ATM_ITEM_MS * Math.max(1, atm.greedy.length) + 400 },
    { part: 'atm', kind: 'words', phase: 3, dur: 2400 }
  ];
  const PHASES = { fib: ['Recursion', 'Repeats', 'Memo', 'Bigger n'], atm: ['ATM 1', 'ATM 2', 'ATM 3', 'What DP does'] };
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
    if (s.kind === 'grow') return clamp01(unease(p) * (TREE.nodes.length - 1) - node.order + 1);
    return 1;
  }
  function nodeColor(node, s, c) {
    if (s.kind === 'ask' || s.kind === 'grow') return null;     // outline only: nothing is judged yet
    return node.first ? c.s1 : c.bad;
  }
  // Circle positions, shared by every tree step (room below for the memo table).
  function treeLayout(k, tableH) {
    const { W, H, fs } = k;
    // The radius first, so that the outer circles keep a margin of one radius.
    const r0 = Math.min((W - 3 * fs) / (TREE.leaves - 1) * 0.42, (H - tableH - 3 * fs) / TREE.depth * 0.36, fs * 1.4);
    const margin = r0 + 4, top = r0 + fs * 0.4, bottom = H - tableH - r0 - fs * 0.4;
    const dx = (W - 2 * margin) / (TREE.leaves - 1), dy = (bottom - top) / TREE.depth;
    const r = Math.max(7, Math.min(r0, dx * 0.42, dy * 0.36));
    return {
      r, top,
      at: node => [margin + node.x * dx, top + node.depth * dy],
      label: node => r >= fs * 1.05 ? 'F(' + node.arg + ')' : String(node.arg),
      size: Math.round(Math.min(r * 0.78, fs * 0.95))
    };
  }
  function drawTree(s, p) {
    const k = canvas();
    if (!k) return;
    if (s.kind === 'memo') return drawMemoWalk(k, p);
    const { c, fs, add, write } = k;
    const { r, top, at, label, size } = treeLayout(k, 0);
    TREE.nodes.forEach(node => node.kids.forEach(kid => {
      const a = Math.min(nodeAlpha(node, s, p), nodeAlpha(kid, s, p));
      if (a <= 0) return;
      const [x1, y1] = at(node), [x2, y2] = at(kid);
      add('line', { x1, y1, x2, y2, stroke: c.axis, 'stroke-width': 1.6, opacity: a });
    }));
    TREE.nodes.forEach(node => {
      const a = nodeAlpha(node, s, p);
      if (a <= 0) return;
      const [x, y] = at(node), fill = nodeColor(node, s, c);
      const showRed = s.kind === 'repeat' && !node.first;
      add('circle', { cx: x, cy: y, r, fill: fill ? (showRed ? c.bad : fill) : c.surface, stroke: fill || c.s1, 'stroke-width': 2, opacity: showRed ? 0.25 + 0.75 * p : a });
      write(x, y + r * 0.3, label(node), { 'font-size': size, 'font-weight': 650, fill: fill ? '#fff' : c.ink, opacity: a });
    });
    if (s.kind === 'grow' && p >= 1) write(at(TREE.nodes[0])[0] + r + fs * 0.5, top + fs * 0.3, 'answer: F(6) = 8', { 'font-weight': 700, 'text-anchor': 'start' });
  }
  // The memo version played call by call: the 25 circles of the plain tree stay as
  // dashed outlines; the 11 calls that really happen light up in order, the memo
  // fills as answers are stored, and the current call has a ring and a sentence.
  function drawMemoWalk(k, p) {
    const { H, c, fs, add, write } = k;
    const tableH = fs * 5.0;
    const { r, at, label, size } = treeLayout(k, tableH);
    const st = memoState(p);
    TREE.nodes.forEach(node => node.kids.forEach(kid => {
      const real = st.called.has(kid);
      const [x1, y1] = at(node), [x2, y2] = at(kid);
      add('line', real ? { x1, y1, x2, y2, stroke: c.axis, 'stroke-width': 2 } : { x1, y1, x2, y2, stroke: c.grid, 'stroke-width': 1.2, 'stroke-dasharray': '4 4' });
    }));
    TREE.nodes.forEach(node => {
      const [x, y] = at(node);
      if (!st.called.has(node)) {   // not called (yet, or ever)
        add('circle', { cx: x, cy: y, r, fill: c.surface, stroke: c.muted, 'stroke-width': 1.5, 'stroke-dasharray': '4 3', opacity: 0.55 });
        write(x, y + r * 0.3, label(node), { 'font-size': size, fill: c.muted, opacity: 0.55 });
        return;
      }
      const fill = st.read.has(node) ? c.s2 : st.stored.has(node) ? c.s1 : null;   // null: still working it out
      add('circle', { cx: x, cy: y, r, fill: fill || c.surface, stroke: fill || c.s1, 'stroke-width': 2.5 });
      write(x, y + r * 0.3, label(node), { 'font-size': size, 'font-weight': 650, fill: fill ? '#fff' : c.ink });
    });
    if (st.current) {
      const [x, y] = at(st.current.node);
      add('circle', { cx: x, cy: y, r: r + 5, fill: 'none', stroke: c.s5, 'stroke-width': 3.5 });
    }
    const text = st.current ? memoEventText(st.current) : 'Start: the memo is empty. F(6) is called first.';
    write(fs * 0.8, H - tableH + fs * 0.9, text, { 'text-anchor': 'start', 'font-weight': 650, 'font-size': Math.round(fs * 0.85) });
    drawMemoTable(k, st, H - tableH + fs * 1.5, tableH - fs * 1.5);
  }
  function drawMemoTable(k, st, y0, h) {
    const { W, c, fs, add, write } = k;
    const n = TREE_N + 1, labelW = fs * 4.2;
    const w = Math.min(fs * 4.4, (W - labelW - fs) / n), x0 = (W - labelW - n * w) / 2 + labelW;
    const storedArgs = new Set([...st.stored].map(node => node.arg));
    const touched = st.current && st.current.type !== 'call' ? st.current.node.arg : null;   // the cell just written or read
    write(x0 - fs * 0.5, y0 + h * 0.55, 'memo:', { 'text-anchor': 'end', 'font-weight': 650 });
    for (let arg = 0; arg <= TREE_N; arg++) {
      const filled = storedArgs.has(arg);
      const x = x0 + arg * w, y = y0 + fs * 0.3, ch = h - fs * 0.7;
      add('rect', { x: x + 2, y, width: w - 4, height: ch, rx: 6, fill: filled ? c.region : c.surface, stroke: arg === touched ? c.s5 : filled ? c.s2 : c.grid, 'stroke-width': arg === touched ? 3.5 : 2 });
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
  const ATM_ITEM_MS = 1000;   // one bill, one arrow or one answer step per second
  function drawAtm(s, p) {
    if (s.kind === 'greedy') p = unease(p);
    const k = canvas();
    if (!k) return;
    if (s.kind === 'ask') drawAsk(k);
    else if (s.kind === 'greedy') drawGreedy(k, p);
    else drawWords(k, p);
  }

  // === SIDE PANEL TEXT ===
  const plus = list => list.join(' + ');
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
      text: 'A bag of apples: count them once and write the number on the bag; next time, read the number. The memo is that note: before working out F(k), look it up. Watch it call by call: a green circle only reads the memo, so the dashed calls below it are never made.',
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
    if (s.kind === 'grow') return [['Calls so far', String(Math.min(TREE.nodes.length, Math.floor(unease(p) * (TREE.nodes.length - 1)) + 1))], ['Answer', p >= 1 ? 'F(6) = 8' : '…']];
    if (s.kind === 'repeat') return [['Calls', '25'], ['Different questions', '7'], ['F(3) worked out', ASKED[3] + ' times'], ['F(2) worked out', ASKED[2] + ' times']];
    if (s.kind === 'memo') {
      const st = memoState(p), memoTotal = TREE.nodes.filter(v => !v.gone).length;
      return [['Calls without memo', String(TREE.nodes.length)], ['Calls with memo so far', st.called.size + ' of ' + memoTotal], ['Answers read from memo', String(st.read.size)]];
    }
    if (s.kind === 'calls') { const n = sliderN(); return [['n', String(n)], ['Calls without memo', group(naiveCalls(n))], ['Calls with memo', String(memoCalls(n))]]; }
    if (s.kind === 'time') {
      const last = MEASURED.rows[MEASURED.rows.length - 1];
      return [['Without memo, n = ' + last[0], seconds(last[1])], ['With memo, n = ' + last[0], seconds(last[2])]];
    }
    return [];
  }
  // Where greedy and the DP answer first choose different bills, and what each choice leaves.
  function partWays() {
    let m = atm.amount;
    for (let i = 0; i < Math.min(atm.greedy.length, atm.policy.length); i++) {
      const gb = atm.greedy[i], db = atm.policy[i];
      if (gb !== db) {
        const more = k => k + (k === 1 ? ' more bill' : ' more bills');
        return 'At ' + m + ' TL they part: greedy gives ' + gb + ' and leaves ' + (m - gb) + ' TL, which needs ' + more(atm.f.get(m - gb)) +
          '; the better way gives ' + db + ' and leaves ' + (m - db) + ' TL, which needs ' + more(atm.f.get(m - db)) + '.';
      }
      m -= gb;
    }
    return 'Greedy never looks at what a bill leaves behind.';
  }
  function atmText(s) {
    const A = atm.amount, list = atm.bills.join(', ');
    const g = atm.greedy, o = atm.outcome;
    if (s.kind === 'ask') return {
      title: s.again ? 'Another ATM: pay ' + A + ' TL' : 'Pay ' + A + ' TL with as few bills as possible',
      text: (s.again ? 'This ATM has bills of ' : 'The ATM has bills of ') + list + ' TL, as many of each as it needs. Which bills should it give? Make your own guess before the next step.'
    };
    if (s.kind === 'greedy') return {
      title: 'Greedy: always the largest bill that still fits',
      text: o === 'stuck' ? 'Greedy gives ' + plus(g) + ' and then ' + atm.left + ' TL is left. No bill is that small, so greedy is stuck. Is there a way to pay at all?'
        : o === 'none' ? 'Greedy ends with ' + atm.left + ' TL that no bill can pay.'
        : o === 'same' ? 'Greedy gives ' + plus(g) + ' = ' + A + ': ' + g.length + ' bills, and no way uses fewer. A simple rule that works here. Does it always? Next: another ATM.'
        : 'Greedy gives ' + plus(g) + ' = ' + A + ': ' + g.length + ' bills. But ' + plus(atm.policy) + ' pays it with only ' + atm.best + '. ' + partWays(),
      formula: [A].concat(g.map((b, i) => A - g.slice(0, i + 1).reduce((x, y) => x + y, 0))).join(' \\to ')
    };
    return {
      title: 'Greedy breaks; DP looks ahead',
      text: (atm.best < Infinity ? 'DP would pay ' + plus(atm.policy) + '. ' : '') + 'It never gives a bill before it knows that what is left can be paid well. Its words: state = the amount still to pay, decision = which bill to give, stage = the 1st, 2nd, 3rd bill. How DP finds the answer: the match puzzle of slide 4.',
      formula: '\\begin{aligned} f(\\text{state}) = \\min\\limits_{\\text{decision}} \\{\\, &\\text{cost of the decision} \\\\ &+ f(\\text{next state}) \\,\\} \\end{aligned}'
    };
  }
  function atmStats(s) {
    if (s.kind === 'greedy') return [['Greedy bills', atm.left > 0 ? 'stuck' : String(atm.greedy.length)]];
    if (s.kind === 'words') return [['DP bills', atm.best === Infinity ? '—' : String(atm.best)], ['Greedy bills', atm.left > 0 ? 'stuck' : String(atm.greedy.length)]];
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
  // A preset button starts that ATM's part of the story (its first step loads it).
  function usePreset(key) {
    atmPreset = null; lastIndex = -1;   // reload even when that step is already shown
    atmMessage('');
    stepper.go(STEPS.findIndex(st => st.preset === key));
  }
  // Own bills and amount: whole TL amounts only. They stay until a step of the story loads its own ATM.
  function useOwn() {
    const bills = $('.js-bills').value.split(/[^0-9]+/).filter(Boolean).map(Number);
    const amount = Number($('.js-amount').value);
    if (!bills.length || bills.length > MAX_BILLS || bills.some(b => !Number.isInteger(b) || b < 1 || b > 1000)) return atmMessage('Bills: 1 to ' + MAX_BILLS + ' whole amounts between 1 and 1000 TL, e.g. 60, 50, 15.');
    if (!Number.isInteger(amount) || amount < 1 || amount > 2000) return atmMessage('Amount: a whole number of TL between 1 and 2000.');
    const g = bills.reduce(gcd);
    if (amount % g) return atmMessage('These bills only make multiples of ' + g + ' TL, so ' + amount + ' TL cannot be paid exactly.');
    atmPreset = Object.keys(PRESETS).find(key => PRESETS[key].amount === amount && String(PRESETS[key].bills) === String([...new Set(bills)].sort((a, b) => b - a))) || null;
    atm = solveAtm(bills, amount);
    afterAtmChange();
  }
  function afterAtmChange() {
    atmMessage('');
    syncAtmInputs();
    const i = stepper.index;
    if (STEPS[i].part === 'atm') stepper.replay(); else stepper.go(firstOf('atm'));
  }
  const sliderN = () => Number($('.js-n').value);

  function legend(part, kind) {
    const dot = (cls, text) => '<span class="anim-key ' + cls + '">' + text + '</span>';
    if (part === 'fib') {
      if (kind === 'repeat') return dot('k-new', 'worked out the first time') + dot('k-again', 'asked again, worked out again');
      if (kind === 'memo') return dot('k-new', 'answer stored') + dot('k-memo', 'read from the memo') + dot('k-gone', 'not called') + dot('k-ring', 'now');
      if (kind === 'calls' || kind === 'time') return dot('k-again', 'without memo') + dot('k-memo', 'with memo') + (kind === 'time' ? ' Times from ' + MEASURED.source + ', measured before class, not in your browser.' : '');
      return '';
    }
    if (kind === 'greedy') return dot('k-greedy', 'bills greedy gives');
    return '';
  }

  // === WIRING ===
  let lastPart = null, lastIndex = -1;
  function render(index, p) {
    const s = STEPS[index];
    if (s.part !== lastPart) { lastPart = s.part; if (s.part === 'fib') atmMessage(''); }
    // A step of the story loads its ATM when it is entered (not on every frame,
    // so a preset button pressed on that step still wins).
    if (index !== lastIndex) {
      lastIndex = index;
      if (s.preset && s.preset !== atmPreset) { atmPreset = s.preset; atm = solveAtm(PRESETS[s.preset].bills, PRESETS[s.preset].amount); atmMessage(''); syncAtmInputs(); }
    }
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
      : (body.fine || 'Bills of every kind are unlimited.');
    if (s.part === 'fib') {
      if (s.kind === 'calls') drawCalls(sliderN());
      else if (s.kind === 'time') drawTime(p);
      else drawTree(s, p);
    } else drawAtm(s, p);
  }
  const stepper = ANIM.stepper({
    root, total: () => STEPS.length, render,
    duration: i => { const d = STEPS[i].dur; return typeof d === 'function' ? d() : d || 700; },
    restartAt: () => firstOf(STEPS[stepper.index].part)
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
    restart: () => stepper.go(firstOf(STEPS[stepper.index].part)),
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
