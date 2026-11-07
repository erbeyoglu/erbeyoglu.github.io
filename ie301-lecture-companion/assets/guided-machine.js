/* Week 7 guided activity "machine": its own interactive flow instead of the
   generic step engine. Order: play with numbers → same age, same future (the
   state) → the stage-age map → solve it backward → name the parts and build the
   recursion → twist. guided.js mounts it through window.GUIDED_CUSTOM.machine;
   the step ids and titles live in assets/guided-data.js (the instructor
   analytics count them as the activity's components). The story is invented
   for practice and says so on the page. Rationale: docs/GUIDED_MODELING_REDESIGN_PLAN.md. */
(() => {
  'use strict';

  // === MODEL ===
  // All numbers below come from the story; every value the page shows is computed from them.
  const MAINT = [1, 4, 9, 16, 25];   // M(a), index = machine age
  const SALE = [8, 6, 3, 1, 0];      // S(a)
  const PRICE = 13;                  // price of a new machine
  const YEARS = 3;
  const END = YEARS + 1;             // stage index of the final sale
  const START_AGE = 1;
  const REPLACE_EVERY_YEAR = ['R', 'R', 'R'];

  const keepCost = a => MAINT[a];
  const replaceCost = a => PRICE - SALE[a] + MAINT[0];
  // WHY: starting from age 1, year t can only see ages 1..t (replace gives 1, keep adds 1).
  const agesAt = t => Array.from({ length: t }, (_, i) => i + 1);
  const key = (t, a) => t + '-' + a;
  const parseKey = k => k.split('-').map(Number);

  function solve(endValue) {
    const f = {}, best = {}, totals = {};
    agesAt(END).forEach(a => { f[key(END, a)] = endValue(a); });
    for (let t = YEARS; t >= 1; t--) agesAt(t).forEach(a => {
      const k = keepCost(a) + f[key(t + 1, a + 1)];
      const r = replaceCost(a) + f[key(t + 1, 1)];
      f[key(t, a)] = Math.min(k, r);
      best[key(t, a)] = k < r ? 'K' : r < k ? 'R' : 'KR';
      totals[key(t, a)] = { K: k, R: r };
    });
    return { f, best, totals };
  }
  const SOLD = solve(a => -SALE[a]);
  const DONATED = solve(() => 0);
  const DECISION_NODES = [];
  for (let t = YEARS; t >= 1; t--) agesAt(t).forEach(a => DECISION_NODES.push(key(t, a)));
  const CHANGED_BY_DONATION = DECISION_NODES.filter(k => SOLD.best[k] !== DONATED.best[k]);

  function runPlan(plan) {
    let age = START_AGE;
    const lines = plan.map((act, i) => {
      const line = act === 'K'
        ? { t: i + 1, act, age, parts: [['maintenance at age ' + age + ', M(' + age + ')', MAINT[age]]], next: age + 1 }
        : { t: i + 1, act, age, parts: [['buy a new machine', PRICE], ['sell the old age-' + age + ' machine, S(' + age + ')', -SALE[age]], ['the new machine runs at age 0, M(0)', MAINT[0]]], next: 1 };
      age = line.next;
      return line;
    });
    const finished = plan.length === YEARS;
    const sale = finished ? -SALE[age] : 0;
    const total = lines.reduce((s, l) => s + l.parts.reduce((x, p) => x + p[1], 0), 0) + sale;
    return { lines, age, finished, sale, total };
  }
  const ALL_PLANS = [];
  (function enumerate(prefix) {
    if (prefix.length === YEARS) { ALL_PLANS.push(prefix); return; }
    enumerate(prefix.concat('K')); enumerate(prefix.concat('R'));
  })([]);
  const BEST_TOTAL = Math.min(...ALL_PLANS.map(p => runPlan(p).total));

  // === TEXT HELPERS ===
  const num = v => v < 0 ? '−' + (-v) : String(v);
  const inSum = v => v < 0 ? '(−' + (-v) + ')' : String(v);
  const fH = (t, a) => 'f<sub>' + t + '</sub>(' + a + ')';
  const ACT = { K: 'Keep', R: 'Replace' };
  const planText = p => p.join(' → ');
  const lineSum = l => l.parts.reduce((x, p) => x + p[1], 0);
  const parseNum = s => {
    const clean = String(s).replace(/[−–]/g, '-').replace(',', '.').replace(/\s+/g, '');
    return clean === '' || !/^-?\d+(\.\d+)?$/.test(clean) ? NaN : Number(clean);
  };
  const escapeAttr = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fb = (kind, html) => {
    const tag = { ok: '✓ Right.', no: '✗ Not yet.', shown: 'Shown:' }[kind] || '';
    return '<div class="gm-fb ' + kind + '">' + (tag ? '<b class="gm-tag">' + tag + '</b>' : '') + html + '</div>';
  };
  const btn = (attrs, text, extra = '') => '<button class="gm-btn' + extra + '" ' + attrs + '>' + text + '</button>';

  // === MAP (SVG) ===
  // The stage-age network, drawn like Joe's NYC-LA map: columns = years, rows = machine age.
  const MX = { 1: 90, 2: 235, 3: 380, 4: 520 };
  const MY = a => 52 + (a - 1) * 80;
  const R_NODE = 22;
  const LABEL_AT = { K: 0.27, R: 0.62 };  // label positions along each arc, chosen so no two pills overlap

  function arcsOf(k) {
    const [t, a] = parseKey(k);
    return [{ act: 'K', from: k, to: key(t + 1, a + 1), cost: keepCost(a) }, { act: 'R', from: k, to: key(t + 1, 1), cost: replaceCost(a) }];
  }
  function mapSVG(o) {
    const opt = Object.assign({ values: {}, costs: true, hidden: [], best: null, path: [], pathActs: {}, active: null, clickable: () => false, marks: [], changed: [], locked: () => false, endLabel: 'End: sell' }, o);
    const pos = k => { const [t, a] = parseKey(k); return [MX[t], MY(a)]; };
    const pathArcs = new Set();
    for (let i = 0; i + 1 < opt.path.length; i++) pathArcs.add(opt.path[i] + '>' + opt.path[i + 1]);
    const targets = opt.active ? arcsOf(opt.active).map(x => x.to) : [];
    let lines = '', labels = '', nodes = '';
    DECISION_NODES.slice().reverse().forEach(k => arcsOf(k).forEach(arc => {
      const [x1, y1] = pos(arc.from), [x2, y2] = pos(arc.to);
      const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const sx = x1 + ux * R_NODE, sy = y1 + uy * R_NODE, ex = x2 - ux * (R_NODE + 2), ey = y2 - uy * (R_NODE + 2);
      const act = arc.act.toLowerCase();
      const isBest = !!(opt.best && opt.best[arc.from] && opt.best[arc.from].includes(arc.act));
      const onPath = pathArcs.has(arc.from + '>' + arc.to) && opt.pathActs[arc.from] === arc.act;
      const hot = opt.active === arc.from;
      const cls = 'm-arc ' + act + (hot ? ' hot' : '') + (onPath ? ' path' : isBest ? ' best' : '') + (opt.active && !hot ? ' dim' : '');
      const marker = onPath || isBest ? 'url(#gm-ah-best)' : 'url(#gm-ah-' + act + ')';
      lines += '<line class="' + cls + '" x1="' + sx.toFixed(1) + '" y1="' + sy.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '" marker-end="' + marker + '"/>';
      const f = LABEL_AT[arc.act], lx = x1 + (x2 - x1) * f, ly = y1 + (y2 - y1) * f;
      const hiddenCost = !opt.costs || opt.hidden.includes(arc.from + ':' + arc.act);
      labels += '<g' + (opt.active && !hot ? ' opacity=".45"' : '') + '><rect class="m-pill" x="' + (lx - 22).toFixed(1) + '" y="' + (ly - 10).toFixed(1) + '" width="44" height="20" rx="10"/>' +
        '<text class="m-lab ' + act + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">' + arc.act + ' ' + (hiddenCost ? '?' : num(arc.cost)) + '</text></g>';
    }));
    DECISION_NODES.concat(agesAt(END).map(a => key(END, a))).forEach(k => {
      const [x, y] = pos(k), [t, a] = parseKey(k), v = opt.values[k];
      const cls = ['m-node', t === END ? 'end' : '', opt.active === k ? 'active' : '', targets.includes(k) ? 'target' : '',
        opt.marks.includes(k) ? 'marked' : '', opt.changed.includes(k) ? 'changed' : '', opt.clickable(k) ? 'click' : '', opt.locked(k) ? 'locked' : ''].join(' ');
      const name = t === END ? 'End, age ' + a : 'Year ' + t + ', age ' + a;
      nodes += '<g class="' + cls + '" data-node="' + k + '"' + (opt.clickable(k) ? ' role="button" tabindex="0"' : '') + ' aria-label="' + name + '">' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + R_NODE + '"/>' +
        '<text x="' + x + '" y="' + y + '"' + (v === undefined ? ' class="unknown"' : '') + '>' + (v === undefined ? '?' : num(v)) + '</text></g>';
    });
    const cols = [1, 2, 3].map(t => '<text class="m-col" x="' + MX[t] + '" y="16">Year ' + t + '</text>').join('') +
      '<text class="m-col" x="' + MX[END] + '" y="16">' + opt.endLabel + '</text>';
    const rows = [1, 2, 3, 4].map(a => '<text class="m-row" x="4" y="' + (MY(a) + 5) + '">age ' + a + '</text>').join('');
    // WHY: userSpaceOnUse keeps arrowheads one size; the default scales them with stroke width.
    const head = (id, color) => '<marker id="gm-ah-' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(' + color + ')"/></marker>';
    return '<div class="gm-map"><svg viewBox="0 0 584 330" role="img" aria-label="Map of years and machine ages">' +
      '<defs>' + head('k', '--s1') + head('r', '--s5') + head('best', '--s2') + '</defs>' +
      cols + rows + lines + labels + nodes +
      '<text class="m-start" x="' + MX[1] + '" y="' + (MY(1) + R_NODE + 16) + '">start</text></svg>' +
      '<div class="gm-legend"><span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s1);stroke-width:2"/></svg>K = Keep</span>' +
      '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s5);stroke-width:2;stroke-dasharray:7 5"/></svg>R = Replace</span>' +
      (opt.best || opt.path.length ? '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s2);stroke-width:5"/></svg>best choice</span>' : '') +
      '<span>number on an arrow = this year\'s cost · number in a circle = f, the least cost from there to the end</span></div></div>';
  }
  function planPath(plan) {
    let age = START_AGE; const path = [key(1, age)], acts = {};
    plan.forEach((act, i) => { acts[key(i + 1, age)] = act; age = act === 'K' ? age + 1 : 1; path.push(key(i + 2, age)); });
    return { path, acts };
  }
  function describeRoute(bestMap) {
    let age = START_AGE; const parts = [];
    for (let t = 1; t <= YEARS; t++) {
      const b = bestMap[key(t, age)], act = b === 'KR' ? 'K' : b;
      parts.push('year ' + t + ' (age ' + age + '): ' + ACT[act]);
      age = act === 'K' ? age + 1 : 1;
    }
    return parts.join(' → ') + ' → sell at age ' + age;
  }
  const nodeName = k => { const [t, a] = parseKey(k); return 'year ' + t + ', age ' + a; };

  // === STEP CONTENT (fixed data per step) ===
  const LAB_A = ['K', 'R'], LAB_B = ['R', 'R'];
  const ASK_NODE = key(2, 2);
  const ARC_QUESTIONS = [
    { id: 'keep', prompt: 'The Keep arrow from <b>year 2, age 2</b> (ringed) goes to year 3, age 3. What does <b>Keep</b> cost this year?', answer: keepCost(2),
      diag: { 16: 'That is M(3). This year the machine runs at age 2; it is age 3 only after the year.', 4: 'That is M(1). The machine is age 2 now.' },
      hint: 'Keep: you only pay maintenance at the current age.',
      right: 'Keep at age 2 costs M(2) = 9 this year.' },
    { id: 'replace', prompt: 'The Replace arrow from the same circle goes to year 3, <b>age 1</b>. What does <b>Replace</b> cost this year?', answer: replaceCost(2),
      diag: { 14: 'You forgot to sell the old machine: money in, −S(2) = −3.', 10: 'The new machine also runs this year at age 0: add M(0) = 1.', 13: 'Two parts are missing: selling the old machine (−3) and the new machine\'s maintenance M(0) = 1.', 17: 'Selling brings money in, so it lowers the cost: 13 − 3, not 13 + 3.', 9: 'That is the Keep cost. Replace means: buy a new machine, sell the old one, run the new one.' },
      hint: 'Replace: buy new (13), sell the old one (money in), and the new machine runs this year at age 0.',
      right: 'Replace at age 2: 13 − 3 + 1 = 11. Buy, sell the old one, run the new one at age 0.' },
    { id: 'end', prompt: 'At <b>End</b> the machine is sold. Each End circle holds that sale <b>as a cost</b>. What goes in the End circle for an <b>age-2</b> machine?', answer: -SALE[2],
      diag: { 3: 'Selling brings money in. In a cost, money that comes in has a minus sign: −3.', 0: 'The machine is sold, not given away, so something comes in.', 1: 'That is S(3). This End circle is for an age-2 machine.', '-1': 'That is −S(3). This End circle is for an age-2 machine.' },
      hint: 'We count costs. Money that comes in lowers the cost.',
      right: 'All End circles follow the same rule: f<sub>4</sub>(a) = −S(a). Selling lowers the cost.' }
  ];
  const NAME_ROWS = [
    { id: 'stage', label: 'Stage', answer: 'year' },
    { id: 'state', label: 'State', answer: 'age' },
    { id: 'decision', label: 'Decision x<sub>t</sub>(a)', answer: 'kr' },
    { id: 'cost', label: 'Cost during the stage', answer: 'cost' },
    { id: 'next', label: 'Next state', answer: 'next' },
    { id: 'value', label: 'f<sub>t</sub>(a)', answer: 'f' }
  ];
  const NAME_OPTIONS = [
    ['money', 'the money spent so far'],
    ['next', 'a+1 after Keep; 1 after Replace'],
    ['year', 'the year t = 1, 2, 3'],
    ['f', 'the least total cost from year t to the final sale, starting with an age-a machine'],
    ['kr', 'Keep (K) or Replace (R)'],
    ['age', 'the machine age a at the start of year t'],
    ['cost', 'M(a) for Keep; 13 − S(a) + M(0) for Replace']
  ];
  const NAME_WHY = {
    money: 'Step 2 showed it: money already spent does not change the future.',
    next: 'This is what the decision does to the state.', year: 'This counts the decisions: one per year.',
    f: 'This is the number in each circle of your map.', kr: 'This is what you click each year.',
    age: 'Together with the year, this is all the future depends on.', cost: 'These are the numbers on the arrows.'
  };
  const TILES = [
    ['M(a)', 'M(a)'], ['Ma1', 'M(a+1)'], ['fa1', 'f<sub>t+1</sub>(a+1)'], ['fa', 'f<sub>t+1</sub>(a)'],
    ['rep', '13 − S(a) + M(0)'], ['repNoSale', '13 + M(0)'], ['f1', 'f<sub>t+1</sub>(1)'], ['f0', 'f<sub>t+1</sub>(0)'],
    ['minusS', '−S(a)'], ['plusS', 'S(a)'], ['zero', '0']
  ];
  const SLOT_ANSWER = { k1: 'M(a)', k2: 'fa1', r1: 'rep', r2: 'f1', b: 'minusS' };
  const SLOT_WHY = {
    k1: { Ma1: 'This year the machine runs at age a; it is a+1 only after the year.', rep: 'That is the Replace cost.' },
    k2: { fa: 'A kept machine also gets one year older: a → a+1.', f1: 'That is where Replace goes.', f0: 'Keep does not make the machine new.' },
    r1: { repNoSale: 'You also sell the old machine: money in, −S(a).', 'M(a)': 'That is the Keep cost.' },
    r2: { f0: 'The new machine runs this year at age 0; at the next decision it is age 1.', fa1: 'That is where Keep goes.', fa: 'After Replace the old age does not matter any more.' },
    b: { plusS: 'Selling brings money in. In a cost it has a minus sign.', zero: 'That would give the machine away for free. In this story it is sold. (Remember this tile for step 6.)' }
  };
  const SLOT_ROLE = { k1: 'Keep: what do you pay this year?', k2: 'Keep: where does the Keep arrow end?', r1: 'Replace: what do you pay this year?', r2: 'Replace: where does the Replace arrow end?', b: 'End: what is the sale worth as a cost?' };
  const tileLabel = id => (TILES.find(x => x[0] === id) || [null, ''])[1];
  const PIECES = [
    ['state', 'The state (year, age)', 'The year and the age still say everything about the future.'],
    ['rep', 'The Replace cost 13 − S(a) + M(0)', 'Selling the old machine when you replace is still allowed, so this cost stays.'],
    ['end', 'The End value f<sub>4</sub>(a)', ''],
    ['arrows', 'The arrows (next states)', 'The machine still ages the same way: a+1 after Keep, 1 after Replace.']
  ];
  const bestText = (sol, k) => (sol.best[k] === 'KR' ? 'a tie' : ACT[sol.best[k]]) + ' (Keep ' + sol.totals[k].K + ', Replace ' + sol.totals[k].R + ')';

  // === MOUNT ===
  function mount(app, { activity, track }) {
    const STORE_KEY = 'ie301-guided-v2:' + activity.id;
    const fresh = () => ({
      stage: 0, status: {}, helped: {},
      play: [], plays: [], showAll: false,
      twin: { predict: null, checked: false, remember: null },
      arcs: { keep: { v: '', ok: false, msg: null, wrong: 0 }, replace: { v: '', ok: false, msg: null, wrong: 0 }, end: { v: '', ok: false, msg: null, wrong: 0 } },
      fill: {}, active: null, solveNote: null, lockMsg: null,
      names: {}, namesChecked: false,
      slots: {}, slotSel: 'k1', slotsChecked: false,
      twist: { piece: null, marks: [], checked: false }
    });
    let storageWorks = true, assembledCounted = false;
    let S = fresh();
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) { storageWorks = false; }
    S.stage = Math.max(0, Math.min(activity.steps.length - 1, Number(S.stage) || 0));
    function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { storageWorks = false; } }

    const stepIds = activity.steps.map(s => s.id);
    const stagesDone = () => stepIds.filter(id => S.status[id]).length;
    // A step finished without "Show me" counts as correct for the instructor's counts.
    function finish(id) {
      if (S.status[id]) return;
      S.status[id] = S.helped[id] ? 'helped' : 'done';
      if (!S.helped[id]) track('correct', stagesDone());
    }
    function showMe(id) { S.helped[id] = true; }

    // --- Step 1: play it ---
    function renderPlay() {
      const run = runPlan(S.play);
      let rows = '';
      run.lines.forEach(l => {
        rows += '<tr><td>Year ' + l.t + ' · <b>' + ACT[l.act] + '</b> (machine age ' + l.age + ')</td><td class="amt">' + num(lineSum(l)) + '</td></tr>' +
          '<tr class="sub"><td colspan="2">' + (l.parts.length > 1 ? l.parts.map(p => p[0] + ': ' + num(p[1])).join(' · ') : l.parts[0][0]) + '</td></tr>';
      });
      if (run.finished) rows += '<tr><td>End of year 3 · sell the age-' + run.age + ' machine, S(' + run.age + ')</td><td class="amt">' + num(run.sale) + '</td></tr>';
      if (S.play.length) rows += '<tr class="total"><td>' + (run.finished ? 'Total' : 'So far') + '</td><td class="amt">' + num(run.total) + '</td></tr>';
      const benchmark = runPlan(REPLACE_EVERY_YEAR).total;
      let msg = '';
      if (run.finished) {
        msg = run.total === BEST_TOTAL
          ? fb('ok', 'Your plan costs <b>' + run.total + '</b>: that is the cheapest of all ' + ALL_PLANS.length + ' plans. But how could you be sure without trying every plan? With 3 years there are 2 × 2 × 2 = 8 plans; with 20 years there are more than a million. The next steps show how DP avoids trying them all.')
          : run.total < benchmark
            ? fb('ok', 'You beat ' + benchmark + ' with <b>' + run.total + '</b>. Can you go even lower?')
            : fb('no', 'This plan costs <b>' + run.total + '</b>. Try another one: can you get below ' + benchmark + '?');
      }
      const chips = S.plays.map(p => { const tot = runPlan(p).total; return '<span class="gm-chip' + (tot === BEST_TOTAL ? ' best' : '') + '">' + planText(p) + ': ' + tot + '</span>'; }).join('');
      const all = !S.showAll ? '' : '<table class="gm-receipt"><tr><td><b>All plans</b></td><td class="amt"><b>Total</b></td></tr>' +
        ALL_PLANS.map(p => { const tot = runPlan(p).total; return '<tr><td>' + planText(p) + '</td><td class="amt' + (tot === BEST_TOTAL ? ' best' : '') + '">' + tot + '</td></tr>'; }).join('') + '</table>' +
        '<p class="gm-small">8 plans are easy to list. With 20 years there are 2<sup>20</sup> = 1,048,576 plans. DP will need far fewer sums.</p>';
      return '<h2>' + activity.steps[0].title + '</h2>' +
        '<p>You run a laboratory machine for 3 years. At the start of each year you <b>keep</b> it or <b>replace</b> it. Older machines need more maintenance and sell for less. Use the data in the box.</p>' +
        '<p><b>Goal:</b> replacing every year costs <b>' + benchmark + '</b> in total. Find a cheaper plan.</p>' +
        '<div class="gm-panel">' +
        (run.finished ? '<div class="gm-now">All 3 years played.</div>' : '<div class="gm-now">Start of year ' + (S.play.length + 1) + ' · your machine is age ' + run.age + '</div>') +
        '<div class="gm-row">' +
        (run.finished ? btn('data-do="newPlay"', 'Play a new plan', ' primary')
          : btn('data-do="act" data-act="K"', 'Keep', ' big') + btn('data-do="act" data-act="R"', 'Replace', ' big')) +
        (S.play.length && !run.finished ? btn('data-do="undo"', 'Undo last year') : '') +
        '</div>' + (S.play.length ? '<table class="gm-receipt">' + rows + '</table>' : '<p class="gm-small gm-muted">Your receipt appears here.</p>') + '</div>' +
        msg +
        (S.plays.length ? '<h3>Your plans</h3><div class="gm-chips">' + chips + '</div>' : '') +
        (S.plays.length >= 2 && !S.showAll ? '<div class="gm-row">' + btn('data-do="showAll"', 'Show all 8 plans') + '</div>' : '') + all;
    }

    // --- Step 2: same age, same future? ---
    function renderTwin() {
      const a = runPlan(LAB_A), b = runPlan(LAB_B), tw = S.twin;
      const card = (name, plan, run) => '<div class="gm-twin"><h4>' + name + '</h4><p>Year 1: ' + ACT[plan[0]] + ' · Year 2: ' + ACT[plan[1]] + '</p>' +
        '<p>Paid so far: <b>' + run.total + '</b></p><p>Now: start of year 3, machine <b>age ' + run.age + '</b></p></div>';
      const pBtn = (id, text) => btn('data-do="predict" data-v="' + id + '"' + (tw.predict ? ' disabled' : ''), text, tw.predict === id ? ' picked' : '');
      let out = '<h2>' + activity.steps[1].title + '</h2>' +
        '<p>Two labs played the first two years differently. Both now start year 3.</p>' +
        '<div class="gm-twins">' + card('Lab A', LAB_A, a) + card('Lab B', LAB_B, b) + '</div>' +
        '<h3>Predict first</h3><p>From now on (year 3 and the final sale), what is the <b>least</b> each lab can still pay?</p>' +
        '<div class="gm-row">' + pBtn('A', 'Lab A can pay less') + pBtn('B', 'Lab B can pay less') + pBtn('same', 'The same for both') + '</div>';
      if (!tw.predict) return out;
      if (!tw.checked) return out + '<div class="gm-row">' + btn('data-do="twinCheck"', 'Check by working out year 3', ' primary') + '</div>';
      const age = a.age, keepRest = keepCost(age) - SALE[age + 1], repRest = replaceCost(age) - SALE[1];
      out += '<div class="gm-panel"><p><b>Year 3 with an age-' + age + ' machine</b> (the same for both labs):</p>' +
        '<p>Keep: maintenance M(' + age + ') = ' + keepCost(age) + ', then sell the age-' + (age + 1) + ' machine: ' + num(-SALE[age + 1]) + ' → <b>' + keepRest + '</b></p>' +
        '<p>Replace: 13 − ' + SALE[age] + ' + 1 = ' + replaceCost(age) + ', then sell the age-1 machine: ' + num(-SALE[1]) + ' → <b>' + repRest + '</b></p>' +
        '<p>Least from here: <b>' + Math.min(keepRest, repRest) + '</b> for <b>both</b> labs.</p></div>';
      out += tw.predict === 'same'
        ? fb('ok', 'Both labs face exactly the same future: year 3 with an age-' + age + ' machine.')
        : fb('no', 'Lab ' + tw.predict + ' paid ' + (tw.predict === 'A' ? 'less' : 'more') + ' so far, but that money is already gone. It does not change any future cost. From here both labs face the same situation: year 3 with an age-' + age + ' machine.');
      const rBtn = (id, text) => btn('data-do="remember" data-v="' + id + '"', text, tw.remember === id ? ' picked' : '');
      out += '<h3>So what must we remember?</h3><p>To plan the rest of the years, which information is enough?</p>' +
        '<div class="gm-row">' + rBtn('money', 'The money spent so far') + rBtn('state', 'The year and the machine age') + rBtn('history', 'The full list of past decisions') + '</div>';
      const why = {
        money: fb('no', 'The two labs spent different amounts but have the same best future. Money already spent changes nothing ahead.'),
        history: fb('no', 'That would work, but it is more than needed: K → R and R → R are different lists that lead to the same future. Keep only what changes the future.'),
        state: fb('ok', 'The year t and the machine age a are enough. This pair is the <b>state</b>. Different pasts with the same state have the same best future, so we plan once per state, not once per past.')
      };
      return out + (tw.remember ? why[tw.remember] : '');
    }

    // --- Step 3: draw it as a map ---
    const mapReady = () => ARC_QUESTIONS.every(q => S.arcs[q.id].ok);
    function renderMap() {
      const done = mapReady(), values = {};
      if (S.arcs.end.ok) agesAt(END).forEach(a => { values[key(END, a)] = -SALE[a]; });
      const hidden = done ? [] : DECISION_NODES.flatMap(k => [k + ':K', k + ':R']);
      const mine = S.plays.slice().sort((p, q) => runPlan(p).total - runPlan(q).total)[0] || null;
      const pp = done && mine ? planPath(mine) : { path: [], acts: {} };
      let out = '<h2>' + activity.steps[2].title + '</h2>' +
        '<p>Remember Joe\'s trip from NYC to LA (slide 8): cities were circles, roads were arrows with miles. Here a circle is a <b>(year, machine age)</b> pair, an arrow is a decision with <b>this year\'s cost</b>, and End is the final sale. The cheapest plan is the cheapest route from start to End.</p>' +
        '<p class="gm-small">Keep: one year older (age a → a+1). Replace: the new machine runs this year at age 0, so next year it is age 1.</p>' +
        mapSVG({ values, hidden, active: done ? null : ASK_NODE, path: pp.path, pathActs: pp.acts });
      if (!done) {
        const q = ARC_QUESTIONS.find(x => !S.arcs[x.id].ok), st = S.arcs[q.id];
        out += '<div class="gm-panel"><p>' + q.prompt + '</p><div class="gm-row"><input class="gm-num" type="text" inputmode="text" autocomplete="off" data-arc="' + q.id + '" value="' + escapeAttr(st.v) + '" aria-label="Your answer" data-enter="arcCheck">' +
          btn('data-do="arcCheck"', 'Check', ' primary') + (st.wrong ? btn('data-do="arcShow"', 'Show me') : '') + '</div>' + (st.msg || '') + '</div>' +
          '<p class="gm-small gm-muted">Question ' + (ARC_QUESTIONS.indexOf(q) + 1) + ' of ' + ARC_QUESTIONS.length + '. The other arrow costs appear when these are done.</p>';
        return out;
      }
      out += ARC_QUESTIONS.map(q => S.arcs[q.id].msg || '').join('');
      if (!mine) return out + fb('ok', 'All costs are on the map now. Every plan from step 1 is one route from start to End.');
      const run = runPlan(mine);
      return out + fb('ok', 'All costs are on the map now. Your best plan ' + planText(mine) + ' is the thick green route: ' + run.lines.map(l => num(lineSum(l))).join(' + ') + ' + ' + inSum(run.sale) + ' = <b>' + run.total + '</b>, the same as your receipt.');
    }

    // --- Step 4: solve it backward ---
    const knownValues = () => {
      const v = {};
      agesAt(END).forEach(a => { v[key(END, a)] = -SALE[a]; });
      DECISION_NODES.forEach(k => { if (S.fill[k] && S.fill[k].pick) v[k] = SOLD.f[k]; });
      return v;
    };
    const isReady = (k, values) => arcsOf(k).every(arc => values[arc.to] !== undefined);
    const isPicked = k => !!(S.fill[k] && S.fill[k].pick);
    const doneCount = () => DECISION_NODES.filter(isPicked).length;
    function fillOf(k) {
      // WHY: support fades with practice — the first circle shows the numbers, the next two
      // only the symbols, the rest only the boxes (worked example → faded steps → alone).
      if (!S.fill[k]) { const n = doneCount(); S.fill[k] = { K: '', R: '', okK: false, okR: false, tried: false, wrong: 0, pick: null, msg: null, level: n === 0 ? 0 : n <= 2 ? 1 : 2 }; }
      return S.fill[k];
    }
    function diagKeep(t, a, v) {
      const now = keepCost(a), fut = SOLD.f[key(t + 1, a + 1)];
      if (v === now) return 'Keep: you wrote only this year\'s cost. Add the value where the Keep arrow ends: ' + fH(t + 1, a + 1) + ' = ' + num(fut) + '.';
      if (v === fut) return 'Keep: that is only the future. Add this year\'s maintenance M(' + a + ') = ' + now + '.';
      if (fut < 0 && v === now - fut) return 'Keep: careful with the sign. Adding a negative number lowers the total: ' + now + ' + ' + inSum(fut) + ' = ' + (now + fut) + '.';
      if (a + 1 < MAINT.length && v === MAINT[a + 1] + fut) return 'Keep: this year the machine runs at age ' + a + ', so pay M(' + a + ') = ' + now + ', not M(' + (a + 1) + ').';
      return null;
    }
    function diagReplace(t, a, v) {
      const now = replaceCost(a), fut = SOLD.f[key(t + 1, 1)], keepFut = SOLD.f[key(t + 1, a + 1)];
      if (v === now) return 'Replace: you wrote only this year\'s cost. Add the value where the Replace arrow ends: ' + fH(t + 1, 1) + ' = ' + num(fut) + '.';
      if (v === fut) return 'Replace: that is only the future. Add this year\'s cost 13 − S(' + a + ') + M(0) = ' + now + '.';
      if (v === PRICE + MAINT[0] + fut) return 'Replace: you forgot to sell the old machine, −S(' + a + ') = ' + num(-SALE[a]) + '.';
      if (v === PRICE - SALE[a] + fut) return 'Replace: the new machine also runs this year at age 0. Add M(0) = 1.';
      if (v === PRICE + SALE[a] + MAINT[0] + fut) return 'Replace: selling brings money in, so subtract S(' + a + ').';
      if (v === now + keepFut) return 'Replace: after Replace you go to age 1, not age ' + (a + 1) + '. Use ' + fH(t + 1, 1) + '.';
      if (fut < 0 && v === now - fut) return 'Replace: careful with the sign: ' + now + ' + ' + inSum(fut) + ' = ' + (now + fut) + '.';
      return null;
    }
    function exprs(k, level) {
      const [t, a] = parseKey(k), fk = SOLD.f[key(t + 1, a + 1)], fr = SOLD.f[key(t + 1, 1)];
      if (level === 0) return {
        K: 'M(' + a + ') + ' + fH(t + 1, a + 1) + ' = ' + keepCost(a) + ' + ' + inSum(fk) + ' =',
        R: '13 − S(' + a + ') + M(0) + ' + fH(t + 1, 1) + ' = 13 − ' + SALE[a] + ' + 1 + ' + inSum(fr) + ' =' };
      if (level === 1) return { K: 'M(' + a + ') + ' + fH(t + 1, a + 1) + ' =', R: '13 − S(' + a + ') + M(0) + ' + fH(t + 1, 1) + ' =' };
      return { K: 'Keep total =', R: 'Replace total =' };
    }
    function nodePanel(k) {
      const [t, a] = parseKey(k), F = fillOf(k), ex = exprs(k, F.level);
      const field = (side, ok) => '<input class="gm-num' + (ok ? ' ok' : F.tried ? ' no' : '') + '" type="text" inputmode="text" autocomplete="off" data-fill="' + k + '" data-side="' + side + '" value="' + escapeAttr(F[side]) + '"' + (ok ? ' disabled' : '') + ' aria-label="' + ACT[side] + ' total" data-enter="fillCheck">';
      let out = '<div class="gm-panel"><p><b>Year ' + t + ', age ' + a + ':</b> ' + fH(t, a) + ' = the smaller of</p><div class="gm-calc">' +
        '<span class="who k">Keep</span><span class="eq">' + ex.K + '</span>' + field('K', F.okK) +
        '<span class="who r">Replace</span><span class="eq">' + ex.R + '</span>' + field('R', F.okR) + '</div>';
      if (!(F.okK && F.okR)) out += '<div class="gm-row">' + btn('data-do="fillCheck"', 'Check', ' primary') + (F.wrong ? btn('data-do="fillShow"', 'Show me') : '') + '</div>';
      else out += '<p>Which is best? (We minimize cost.)</p><div class="gm-row">' +
        btn('data-do="pick" data-v="K"', 'Keep') + btn('data-do="pick" data-v="R"', 'Replace') + btn('data-do="pick" data-v="KR"', 'Tie: both') + '</div>';
      return out + (F.msg || '') + '</div>';
    }
    function renderSolve() {
      const values = knownValues(), allDone = doneCount() === DECISION_NODES.length;
      if (!S.active || isPicked(S.active)) S.active = DECISION_NODES.find(k => !isPicked(k) && isReady(k, values)) || null;
      const best = {};
      DECISION_NODES.filter(isPicked).forEach(k => { best[k] = SOLD.best[k]; });
      let out = '<h2>' + activity.steps[3].title + '</h2>' +
        '<p>Like Joe\'s trip (slides 11–14), start at the end and move left. For each circle: <b>f = the least cost from here to the end</b> = the smaller of the two options, each <b>this year\'s cost + the value where its arrow ends</b>. Click any circle whose arrows end at known values.</p>' +
        mapSVG({ values, active: allDone ? null : S.active, best,
          clickable: k => !allDone && DECISION_NODES.includes(k) && !isPicked(k) && isReady(k, values),
          locked: k => !allDone && DECISION_NODES.includes(k) && !isReady(k, values) });
      if (S.lockMsg) { out += fb('no', S.lockMsg); S.lockMsg = null; }
      if (S.solveNote && !allDone) out += fb('ok', S.solveNote);
      if (!allDone && S.active) out += nodePanel(S.active);
      out += '<p class="gm-small gm-muted">' + doneCount() + ' of ' + DECISION_NODES.length + ' circles done. The help gets lighter as you go.</p>';
      if (!allDone) return out;
      const tieNodes = DECISION_NODES.filter(k => SOLD.best[k] === 'KR');
      const circles20 = 20 * 21 / 2;
      return out + fb('ok', fH(1, 1) + ' = <b>' + SOLD.f[key(1, 1)] + '</b>. Follow the green arrows forward from the start: ' + describeRoute(SOLD.best) + '. That is the cheapest plan — found without listing all 8 plans.') +
        (tieNodes.length ? '<p>' + tieNodes.map(k => { const [t, a] = parseKey(k); return 'At year ' + t + ' with an age-' + a + ' machine both options cost ' + SOLD.totals[k].K + ': a tie, so both are best.'; }).join(' ') + ' That circle is not on the best route from the start, but DP still knows what to do there.</p>' : '') +
        '<p class="gm-small">Count: ' + DECISION_NODES.length + ' circles × 2 sums = ' + 2 * DECISION_NODES.length + ' sums. For 20 years: ' + circles20 + ' circles, ' + 2 * circles20 + ' sums — against 1,048,576 plans.</p>';
    }

    // --- Step 5: name the parts ---
    const slotsOk = () => Object.keys(SLOT_ANSWER).every(id => S.slots[id] === SLOT_ANSWER[id]);
    function renderName() {
      const nameRows = NAME_ROWS.map(r => {
        const v = S.names[r.id] || '';
        const mark = S.namesChecked && v ? (v === r.answer ? '<span style="color:var(--good)">✓</span>' : '<span style="color:var(--critical)">✗</span>') : '';
        return '<b>' + r.label + '</b><select data-name="' + r.id + '" aria-label="' + r.label.replace(/<[^>]+>/g, '') + '"><option value="">choose…</option>' +
          NAME_OPTIONS.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select><span>' + mark + '</span>';
      }).join('');
      const namesOk = NAME_ROWS.every(r => S.names[r.id] === r.answer);
      let out = '<h2>' + activity.steps[4].title + '</h2><p>You have already used every part of a DP model. Now give each one its name.</p>' +
        '<div class="gm-names">' + nameRows + '</div><div class="gm-row">' + btn('data-do="namesCheck"', 'Check names', ' primary') + '</div>';
      if (S.namesChecked) {
        const wrong = NAME_ROWS.filter(r => S.names[r.id] && S.names[r.id] !== r.answer), empty = NAME_ROWS.filter(r => !S.names[r.id]);
        out += namesOk ? fb('ok', 'Each piece of your map now has its DP name.')
          : fb('no', wrong.map(r => '<b>' + r.label + '</b>: you chose "' + NAME_OPTIONS.find(o => o[0] === S.names[r.id])[1] + '". ' + NAME_WHY[S.names[r.id]]).join('<br>') +
            (empty.length ? (wrong.length ? '<br>' : '') + 'Still empty: ' + empty.map(r => r.label).join(', ') + '.' : ''));
      }
      if (!namesOk) return out;
      const slot = id => {
        const v = S.slots[id], state = S.slotsChecked && v ? (v === SLOT_ANSWER[id] ? ' ok' : ' no') : '';
        return '<span class="gm-slot' + (S.slotSel === id ? ' sel' : '') + state + '" data-do="slot" data-slot="' + id + '" role="button" tabindex="0" title="' + SLOT_ROLE[id] + '">' + (v ? tileLabel(v) : '&nbsp;') + '</span>';
      };
      const used = new Set(Object.values(S.slots));
      out += '<h3>Build the recursion</h3><p>Click a box, then a tile. Click a filled box to empty it. Some tiles are traps.</p>' +
        '<div class="gm-formula">f<sub>t</sub>(a) = min { ' + slot('k1') + ' + ' + slot('k2') + ' <span class="gm-cap">(Keep)</span> , ' + slot('r1') + ' + ' + slot('r2') + ' <span class="gm-cap">(Replace)</span> }<br>' +
        'f<sub>4</sub>(a) = ' + slot('b') + ' <span class="gm-cap">(End: the sale)</span></div>' +
        '<p class="gm-small">Selected box: ' + SLOT_ROLE[S.slotSel] + '</p>' +
        '<div class="gm-bank">' + TILES.map(x => '<button class="gm-tile" data-do="tile" data-tile="' + x[0] + '"' + (used.has(x[0]) ? ' disabled' : '') + '>' + x[1] + '</button>').join('') + '</div>' +
        '<div class="gm-row">' + btn('data-do="slotsCheck"', 'Check the recursion', ' primary') + (S.slotsChecked && !slotsOk() ? btn('data-do="slotsShow"', 'Show me') : '') + '</div>';
      if (!S.slotsChecked) return out;
      if (slotsOk()) {
        const k = key(3, 2);
        return out + fb(S.helped.name ? 'shown' : 'ok', 'This is the recursion. Test it on one circle of your map: ' + fH(3, 2) + ' = min{ ' + keepCost(2) + ' + ' + inSum(-SALE[3]) + ', ' + replaceCost(2) + ' + ' + inSum(-SALE[1]) + ' } = min{ ' + SOLD.totals[k].K + ', ' + SOLD.totals[k].R + ' } = ' + SOLD.f[k] + ' — the number in that circle.');
      }
      return out + fb('no', Object.keys(SLOT_ANSWER).filter(id => S.slots[id] !== SLOT_ANSWER[id]).map(id => {
        const v = S.slots[id];
        return v ? '<b>' + tileLabel(v) + '</b>: ' + ((SLOT_WHY[id] || {})[v] || 'not this one. ' + SLOT_ROLE[id]) : SLOT_ROLE[id] + ' (empty)';
      }).join('<br>'));
    }

    // --- Step 6: twist ---
    function renderTwist() {
      const tw = S.twist;
      let out = '<h2>' + activity.steps[5].title + '</h2>' +
        '<p>New rule: at the end of year 3 the lab must <b>give its machine to a school</b>. No money comes in at the end. Selling the old machine when you replace is still allowed.</p>' +
        '<h3>Which part of the model changes?</h3><div class="gm-row">' +
        PIECES.map(p => btn('data-do="piece" data-v="' + p[0] + '"', p[1], tw.piece === p[0] ? ' picked' : '')).join('') + '</div>';
      if (!tw.piece) return out;
      if (tw.piece !== 'end') return out + fb('no', PIECES.find(p => p[0] === tw.piece)[2] + ' Try again.');
      out += fb('ok', 'Only the End value changes: f<sub>4</sub>(a) = 0 for every age. Everything else stays.');
      if (!tw.checked) {
        return out + '<h3>Predict, then check</h3><p>This is your solved map from step 4 (with the sale). With the new End values, at which circles does the <b>best decision change</b>? Click them, then press Check.</p>' +
          mapSVG({ values: SOLD.f, best: SOLD.best, marks: tw.marks, clickable: k => DECISION_NODES.includes(k) }) +
          '<div class="gm-row">' + btn('data-do="twistCheck"', 'Check: recompute with f<sub>4</sub>(a) = 0', ' primary') + '<span class="gm-small">' + tw.marks.length + ' circle(s) marked</span></div>';
      }
      out += '<h3>The map after the change</h3>' + mapSVG({ values: DONATED.f, best: DONATED.best, marks: tw.marks, changed: CHANGED_BY_DONATION, endLabel: 'End: donate' }) +
        '<p class="gm-small">Thick purple ring = the decision changed. Blue fill = you marked it.</p>';
      const hits = CHANGED_BY_DONATION.filter(k => tw.marks.includes(k));
      const extra = tw.marks.filter(k => !CHANGED_BY_DONATION.includes(k));
      const lines = CHANGED_BY_DONATION.map(k => (tw.marks.includes(k) ? '✓ ' : '• ') + '<b>' + nodeName(k) + '</b>: before ' + bestText(SOLD, k) + ', now ' + bestText(DONATED, k) + '.');
      extra.forEach(k => lines.push('✗ <b>' + nodeName(k) + '</b>: still ' + bestText(DONATED, k) + '.'));
      out += fb(hits.length === CHANGED_BY_DONATION.length && !extra.length ? 'ok' : 'no', 'You found ' + hits.length + ' of ' + CHANGED_BY_DONATION.length + '.<br>' + lines.join('<br>')) +
        '<p>Why year 3, age 2? With the sale, replacing gave a young age-1 machine that sold for 6 at the end. Without the sale that reason is gone, so keeping is cheaper.</p>' +
        '<p>The best plan from the start is still ' + describeRoute(DONATED.best) + ', now costing <b>' + DONATED.f[key(1, 1)] + '</b> instead of ' + SOLD.f[key(1, 1)] + '. Same route, but other circles changed: DP gives the best decision for <b>every</b> state, not only along one route.</p>';
      if (!assembledCounted) { assembledCounted = true; track('assembled', stagesDone()); }
      return out + summaryCard();
    }
    function modelLines() {
      return [
        'Stage: year t = 1, 2, 3. State: machine age a at the start of year t. Decision: x_t(a) in {K, R}.',
        'Cost during the stage: Keep M(a); Replace 13 − S(a) + M(0). Next state: Keep a+1; Replace 1.',
        'f_t(a) = min{ M(a) + f_t+1(a+1), 13 − S(a) + M(0) + f_t+1(1) }, t = 3, 2, 1.',
        'f_4(a) = −S(a) (sell) · f_4(a) = 0 (donate).',
        'Answer: f_1(1) = ' + SOLD.f[key(1, 1)] + ' with the sale, ' + DONATED.f[key(1, 1)] + ' with the donation; plan K → R → K in both.'
      ];
    }
    function summaryCard() {
      const helpedSteps = activity.steps.filter(s => S.status[s.id] === 'helped').map(s => s.title);
      return '<h3>Your model</h3><div class="gm-model">' +
        '<p><b>Stage:</b> year t = 1, 2, 3. <b>State:</b> machine age a at the start of year t. <b>Decision:</b> x<sub>t</sub>(a) ∈ {K, R}.</p>' +
        '<p><b>Cost during the stage:</b> Keep M(a); Replace 13 − S(a) + M(0). <b>Next state:</b> Keep a+1; Replace 1.</p>' +
        '<p>f<sub>t</sub>(a) = min{ M(a) + f<sub>t+1</sub>(a+1), 13 − S(a) + M(0) + f<sub>t+1</sub>(1) }, t = 3, 2, 1.</p>' +
        '<p>f<sub>4</sub>(a) = −S(a) (sell) · f<sub>4</sub>(a) = 0 (donate).</p>' +
        '<p><b>Answer:</b> ' + fH(1, 1) + ' = ' + SOLD.f[key(1, 1)] + ' with the sale, ' + DONATED.f[key(1, 1)] + ' with the donation; plan K → R → K in both.</p></div>' +
        (helpedSteps.length ? '<p class="gm-small">Steps where you used "Show me": ' + helpedSteps.join(', ') + '. Try those again later without help.</p>' : '<p class="gm-small">You did every step without "Show me".</p>') +
        '<div class="gm-row">' + btn('id="guided-download" data-do="download"', 'Download my model') + '</div>';
    }
    function download() {
      const parts = [activity.title, activity.family, '',
        ...activity.steps.map(s => s.title + ': ' + (S.status[s.id] === 'done' ? 'done' : S.status[s.id] === 'helped' ? 'done with Show me' : 'not finished')),
        '', 'Plans I played: ' + (S.plays.map(p => planText(p) + ' = ' + runPlan(p).total).join('; ') || 'none'), '', 'MODEL', ...modelLines()];
      const url = URL.createObjectURL(new Blob([parts.join('\n')], { type: 'text/plain;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = 'ie301-' + activity.id + '-my-model.txt'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // --- Actions ---
    const ACTIONS = {
      act(el) {
        if (S.play.length < YEARS) S.play.push(el.dataset.act);
        if (S.play.length !== YEARS) return;
        if (!S.plays.some(p => planText(p) === planText(S.play))) S.plays.push(S.play.slice());
        track('check'); finish('play');
      },
      undo() { S.play.pop(); },
      newPlay() { S.play = []; },
      showAll() { S.showAll = true; },
      predict(el) { S.twin.predict = el.dataset.v; },
      twinCheck() { S.twin.checked = true; track('check'); },
      remember(el) { S.twin.remember = el.dataset.v; track('check'); if (S.twin.remember === 'state') finish('twin'); },
      arcCheck() {
        const q = ARC_QUESTIONS.find(x => !S.arcs[x.id].ok); if (!q) return;
        const st = S.arcs[q.id], v = parseNum(st.v);
        if (Number.isNaN(v)) { st.msg = fb('no', 'Type a number, for example 5 or −2.'); return; }
        track('check');
        if (v === q.answer) { st.ok = true; st.msg = fb('ok', q.right); }
        else { st.wrong++; st.msg = fb('no', q.diag[String(v)] || q.hint); }
        if (mapReady()) finish('map');
      },
      arcShow() {
        const q = ARC_QUESTIONS.find(x => !S.arcs[x.id].ok); if (!q) return;
        const st = S.arcs[q.id]; st.ok = true; st.v = num(q.answer); showMe('map');
        st.msg = fb('shown', q.right);
        if (mapReady()) finish('map');
        track('worked', stagesDone());
      },
      node(el) {
        const k = el.dataset.node, id = stepIds[S.stage];
        if (id === 'solve') {
          if (!DECISION_NODES.includes(k) || isPicked(k) || doneCount() === DECISION_NODES.length) return;
          if (!isReady(k, knownValues())) { S.lockMsg = 'Not yet: the arrows from ' + nodeName(k) + ' end at circles without a value. Work from right to left.'; return; }
          S.active = k;
        } else if (id === 'twist' && S.twist.piece === 'end' && !S.twist.checked && DECISION_NODES.includes(k)) {
          const m = S.twist.marks; S.twist.marks = m.includes(k) ? m.filter(x => x !== k) : m.concat(k);
        }
      },
      fillCheck() {
        const k = S.active; if (!k) return;
        const [t, a] = parseKey(k), F = fillOf(k), want = SOLD.totals[k];
        const vK = parseNum(F.K), vR = parseNum(F.R);
        if ((!F.okK && Number.isNaN(vK)) || (!F.okR && Number.isNaN(vR))) { F.msg = fb('no', 'Type a number in both boxes, for example 5 or −2.'); return; }
        track('check');
        F.tried = true;
        if (!F.okK) F.okK = vK === want.K;
        if (!F.okR) F.okR = vR === want.R;
        if (F.okK && F.okR) { F.msg = fb('ok', 'Keep ' + want.K + ', Replace ' + want.R + '.'); return; }
        F.wrong++;
        const notes = [];
        if (!F.okK) notes.push(diagKeep(t, a, vK));
        if (!F.okR) notes.push(diagReplace(t, a, vR));
        const specific = notes.filter(Boolean), ex = exprs(k, 0);
        const generic = F.wrong >= 2
          ? 'Here are the numbers: Keep ' + ex.K + ' ?   Replace ' + ex.R + ' ?'
          : 'Each total = this year\'s cost (number on the arrow) + the value where the arrow ends (shaded circle).';
        F.msg = fb('no', specific.length ? specific.join('<br>') + (specific.length < notes.length ? '<br>' + generic : '') : generic);
      },
      fillShow() {
        const k = S.active, F = fillOf(k), want = SOLD.totals[k], ex = exprs(k, 0);
        F.K = String(want.K); F.R = String(want.R); F.okK = F.okR = true; showMe('solve');
        F.msg = fb('shown', 'Keep: ' + ex.K + ' ' + want.K + '. Replace: ' + ex.R + ' ' + want.R + '.');
        track('worked', stagesDone());
      },
      pick(el) {
        const k = S.active, F = fillOf(k), want = SOLD.totals[k], best = SOLD.best[k], p = el.dataset.v;
        const [t, a] = parseKey(k);
        const accept = note => { F.pick = best; F.msg = null; S.solveNote = note; if (doneCount() === DECISION_NODES.length) finish('solve'); };
        if (best === 'KR') { accept(fH(t, a) + ' = ' + SOLD.f[k] + '. ' + (p === 'KR' ? '' : 'Both totals are ' + want.K + '. ') + 'A tie: both decisions are best here, so the map marks both.'); return; }
        if (p === 'KR') { F.msg = fb('no', 'They are not equal: ' + want.K + ' vs ' + want.R + '.'); return; }
        if (p !== best) { F.msg = fb('no', 'That total is larger. We minimize cost, so take the smaller one.'); return; }
        accept(fH(t, a) + ' = min{' + want.K + ', ' + want.R + '} = ' + SOLD.f[k] + ', best: ' + ACT[best] + '.');
      },
      namesCheck() { S.namesChecked = true; track('check'); },
      slot(el) { const id = el.dataset.slot; delete S.slots[id]; S.slotSel = id; S.slotsChecked = false; },
      tile(el) {
        const target = S.slotSel && !S.slots[S.slotSel] ? S.slotSel : Object.keys(SLOT_ANSWER).find(s => !S.slots[s]);
        if (!target) return;
        S.slots[target] = el.dataset.tile; S.slotsChecked = false;
        S.slotSel = Object.keys(SLOT_ANSWER).find(s => !S.slots[s]) || target;
      },
      slotsCheck() { S.slotsChecked = true; track('check'); if (slotsOk()) finish('name'); },
      slotsShow() { S.slots = Object.assign({}, SLOT_ANSWER); showMe('name'); S.slotsChecked = true; finish('name'); track('worked', stagesDone()); },
      piece(el) { S.twist.piece = el.dataset.v; track('check'); },
      twistCheck() { S.twist.checked = true; finish('twist'); track('twist'); },
      download() { track('download'); download(); },
      go(el) { S.stage = Number(el.dataset.stage); app.scrollIntoView({ block: 'start' }); },
      reset() { if (confirm('Clear this activity’s saved progress on this browser?')) { S = fresh(); assembledCounted = false; app.scrollIntoView({ block: 'start' }); } }
    };

    // --- Layout and rendering ---
    const RENDER = { play: renderPlay, twin: renderTwin, map: renderMap, solve: renderSolve, name: renderName, twist: renderTwist };
    // WHY: steps 4 and 6 read the arrow costs and End values that step 3 establishes.
    const NEEDS_MAP = ['solve', 'twist'];
    app.classList.add('gm-wide');
    app.innerHTML = '<div class="gm"><section class="widget gm-head"><div class="learning-eyebrow">Week ' + Number(activity.week.slice(4)) + ' · ' + escapeAttr(activity.family) + '</div>' +
      '<h2>' + escapeAttr(activity.title) + '</h2><p class="learning-context">' + escapeAttr(activity.intro) + '</p>' +
      '<p id="storage-note" class="learning-muted"></p><nav class="gm-tabs" id="gm-tabs" aria-label="Steps"></nav></section>' +
      '<div class="gm-layout"><div class="gm-main" id="gm-stage" aria-live="polite"></div>' +
      '<aside class="gm-data" aria-label="Data"><h3>The data (always here)</h3><table class="gm-table">' +
      '<tr><th>Machine age a</th>' + MAINT.map((_, a) => '<th>' + a + '</th>').join('') + '</tr>' +
      '<tr><td>Maintenance M(a)</td>' + MAINT.map(v => '<td>' + v + '</td>').join('') + '</tr>' +
      '<tr><td>Sale value S(a)</td>' + SALE.map(v => '<td>' + v + '</td>').join('') + '</tr></table>' +
      '<p>A new machine costs <b>' + PRICE + '</b>. Year 1 starts with an <b>age-' + START_AGE + '</b> machine. At the end of year ' + YEARS + ' the machine is <b>sold</b>.</p>' +
      '<p><b>One year:</b></p><ol class="gm-strip"><li>decide: Keep or Replace</li><li>pay this year\'s cost</li><li>the machine runs one year</li><li>it is one year older</li></ol>' +
      '<p class="gm-small"><b>Replace</b> = sell the old machine (money in: S(a)), buy a new one (' + PRICE + '). The new machine runs this year at age 0.</p>' +
      '<p class="gm-small gm-muted">This story is made up for practice. The lecture\'s own examples are the match puzzle, Joe\'s trip and the inventory problem.</p></aside></div></div>';
    const tabsEl = app.querySelector('#gm-tabs'), stageEl = app.querySelector('#gm-stage'), noteEl = app.querySelector('#storage-note');

    function render() {
      tabsEl.innerHTML = activity.steps.map((s, i) => {
        const st = S.status[s.id];
        const mark = st === 'done' ? '<span class="gm-mark" title="done">✓</span>' : st === 'helped' ? '<span class="gm-mark" title="done with Show me">◐</span>' : '';
        return '<button class="gm-tab" data-do="go" data-stage="' + i + '"' + (i === S.stage ? ' aria-current="step"' : '') + '>' + s.title + mark + '</button>';
      }).join('');
      const id = stepIds[S.stage];
      let body = NEEDS_MAP.includes(id) && !mapReady()
        ? '<h2>' + activity.steps[S.stage].title + '</h2>' + fb('no', 'This step uses the arrow costs and End values from step 3. Please finish step 3 first.') +
          '<div class="gm-row">' + btn('data-do="go" data-stage="' + stepIds.indexOf('map') + '"', 'Go to step 3', ' primary') + '</div>'
        : RENDER[id]();
      const last = activity.steps.length - 1;
      body += '<div class="gm-nav">' + (S.stage > 0 ? btn('data-do="go" data-stage="' + (S.stage - 1) + '"', '← Back') : '<span></span>') +
        btn('data-do="reset" id="guided-restart"', 'Start over') +
        (S.stage < last ? btn('data-do="go" data-stage="' + (S.stage + 1) + '"', 'Next →', ' primary') : '<span></span>') + '</div>';
      stageEl.innerHTML = body;
      save();
      noteEl.textContent = storageWorks
        ? 'Your progress is saved in this browser. Nothing you type is sent anywhere; the site only counts, anonymously, how far students get.'
        : 'Browser storage is unavailable. Your progress will be lost when you leave this page.';
    }

    app.addEventListener('click', e => {
      const node = e.target.closest('[data-node]');
      if (node) { ACTIONS.node(node); render(); return; }
      const el = e.target.closest('[data-do]');
      if (!el || el.disabled || !ACTIONS[el.dataset.do]) return;
      ACTIONS[el.dataset.do](el);
      if (el.dataset.do !== 'download') render();
    });
    app.addEventListener('keydown', e => {
      const t = e.target;
      if (e.key === 'Enter' && t.dataset && t.dataset.enter) { e.preventDefault(); ACTIONS[t.dataset.enter](t); render(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[role="button"]')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    });
    app.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.arc) S.arcs[t.dataset.arc].v = t.value;
      if (t.dataset.fill) fillOf(t.dataset.fill)[t.dataset.side] = t.value;
      save();
    });
    app.addEventListener('change', e => {
      if (e.target.dataset.name) { S.names[e.target.dataset.name] = e.target.value; S.namesChecked = false; render(); }
    });
    render();
  }

  window.GUIDED_CUSTOM = Object.assign(window.GUIDED_CUSTOM || {}, { machine: mount });
})();
