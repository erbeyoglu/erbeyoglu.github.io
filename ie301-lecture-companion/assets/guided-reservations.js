/* Week 9 guided activity "reservations": its own interactive flow instead of the
   generic step engine. Order: play with booking requests → luck vs. expected value
   → the day-places map → solve it backward → name the parts and build the
   recursion → twist (decide before you see the request). The frame (tabs, data
   card, progress, usage counts) is assets/guided-kit.js; guided.js loads this file
   and calls window.GUIDED_CUSTOM.reservations. The step ids and titles live in
   assets/guided-data.js. Every number on the page is computed from the DATA block.
   The story is invented for practice and says so on the page.
   Rationale and independent check of the numbers: docs/guided_redesign/reservations.md. */
(() => {
  'use strict';
  const { fb, btn, escapeHtml: escapeAttr, parseNumber: parseNum, close } = window.GUIDED_KIT;

  // === DATA ===
  // DECISION: the large fee is 12, not 9. With 9, "accept whatever fits" is already
  // optimal in every reachable state, so the activity's question "accept or wait?"
  // always has the answer "accept" (docs/guided_redesign/reservations.md, section 2).
  const DAYS = 3;
  const PLACES = 3;
  const END = DAYS + 1;
  const TYPES = [
    { id: 'S', name: 'small', size: 1, fee: 4, p: 0.6 },
    { id: 'L', name: 'large', size: 2, fee: 12, p: 0.4 }
  ];
  // WHY: a fixed seed gives every student the same request lists. Seed 56 was chosen
  // (smallest seed found by search) so that rounds 1 and 2 both meet the "wait?" moment,
  // once with each outcome: S,S,L then S,S,S. Later rounds continue the same stream.
  const SEED = 56;
  const ROUNDS_TO_FINISH = 2;
  const TOL = 0.005;              // accepted rounding error for typed answers (2 decimals)
  const EPS = 1e-9;

  // === MODEL ===
  const key = (t, c) => t + '-' + c;
  const parseKey = k => k.split('-').map(Number);
  const fits = (type, c) => type.size <= c;
  const typeById = id => TYPES.find(x => x.id === id);

  // see = the request is seen before the decision (the story);
  // announce = the rule is chosen before the request arrives (step 6).
  function solve(mode) {
    const f = {}, parts = {};
    for (let c = 0; c <= PLACES; c++) f[key(END, c)] = 0;
    for (let t = DAYS; t >= 1; t--) {
      for (let c = 0; c <= PLACES; c++) {
        const k = key(t, c), rej = f[key(t + 1, c)];
        if (mode === 'see') {
          let total = 0; parts[k] = {};
          TYPES.forEach(ty => {
            const acc = fits(ty, c) ? ty.fee + f[key(t + 1, c - ty.size)] : null;
            const best = acc === null ? rej : Math.max(acc, rej);
            const act = acc === null ? 'nofit' : acc > rej + EPS ? 'A' : rej > acc + EPS ? 'W' : 'tie';
            parts[k][ty.id] = { acc, rej, best, act };
            total += ty.p * best;
          });
          f[k] = total;
        } else {
          const accRule = TYPES.reduce((s, ty) => s + ty.p * (fits(ty, c) ? ty.fee + f[key(t + 1, c - ty.size)] : rej), 0);
          f[k] = Math.max(accRule, rej);
          parts[k] = { accRule, rej, rule: accRule > rej + EPS ? 'accept' : rej > accRule + EPS ? 'reject' : 'tie' };
        }
      }
    }
    return { f, parts };
  }
  const SEE = solve('see');
  const ANNOUNCE = solve('announce');

  // Expected revenue of a fixed rule decide(t, c, typeId) -> accept?, by backward evaluation.
  function evaluate(decide) {
    const v = {};
    for (let c = 0; c <= PLACES; c++) v[key(END, c)] = 0;
    for (let t = DAYS; t >= 1; t--) for (let c = 0; c <= PLACES; c++) {
      v[key(t, c)] = TYPES.reduce((s, ty) => s + ty.p * (fits(ty, c) && decide(t, c, ty.id) ? ty.fee + v[key(t + 1, c - ty.size)] : v[key(t + 1, c)]), 0);
    }
    return v[key(1, PLACES)];
  }
  const bestDecide = (t, c, id) => SEE.parts[key(t, c)][id].act !== 'W';
  const GREEDY_VALUE = evaluate(() => true);

  // Circles of the map: every (day, places) reachable from the start under some decisions.
  const REACH = { 1: [PLACES] };
  for (let t = 1; t <= DAYS; t++) {
    const next = new Set();
    REACH[t].forEach(c => TYPES.forEach(ty => { next.add(c); if (fits(ty, c)) next.add(c - ty.size); }));
    REACH[t + 1] = [...next].sort((a, b) => b - a);
  }
  const DECISION_NODES = [];
  for (let t = DAYS; t >= 1; t--) REACH[t].forEach(c => DECISION_NODES.push(key(t, c)));
  const END_NODES = REACH[END].map(c => key(END, c));
  // A circle where no request fits needs no work: it is filled in for the student.
  const AUTO_NODES = DECISION_NODES.filter(k => TYPES.every(ty => !fits(ty, parseKey(k)[1])));
  const WORK_NODES = DECISION_NODES.filter(k => !AUTO_NODES.includes(k));
  // The reachable moment where waiting beats accepting a request that fits (step 2).
  const WAIT_CASES = [];
  DECISION_NODES.forEach(k => TYPES.forEach(ty => { if (SEE.parts[k][ty.id].act === 'W') WAIT_CASES.push({ k, t: parseKey(k)[0], c: parseKey(k)[1], ty }); }));
  const DILEMMA = WAIT_CASES[0];
  const CHANGED_BY_ANNOUNCE = DECISION_NODES.filter(k => Math.abs(SEE.f[k] - ANNOUNCE.f[k]) > EPS);
  const START = key(1, PLACES);

  // All request lists for the DAYS days, with probability and revenue under a rule.
  const ALL_LISTS = [];
  (function enumerate(prefix) {
    if (prefix.length === DAYS) { ALL_LISTS.push(prefix); return; }
    TYPES.forEach(ty => enumerate(prefix.concat(ty.id)));
  })([]);
  const listProb = list => list.reduce((p, id) => p * typeById(id).p, 1);

  // === RANDOM REQUESTS (seeded, reproducible) ===
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rng = mulberry32(SEED), ROUNDS = [];
  function drawType() {
    const u = rng(); let acc = 0;
    for (const ty of TYPES) { acc += ty.p; if (u < acc) return ty.id; }
    return TYPES[TYPES.length - 1].id;
  }
  // WHY: rounds are drawn in order and cached, so round n is the same whatever was opened first.
  function roundAt(n) { while (ROUNDS.length <= n) ROUNDS.push(Array.from({ length: DAYS }, drawType)); return ROUNDS[n]; }

  // Play a request list with a list of choices ('A' accept / 'R' reject); accept only if it fits.
  function runRound(reqs, acts) {
    let c = PLACES, total = 0;
    const lines = acts.map((a, i) => {
      const ty = typeById(reqs[i]), ok = fits(ty, c), took = a === 'A' && ok;
      const line = { day: i + 1, ty, before: c, act: took ? 'A' : 'R', gain: took ? ty.fee : 0 };
      if (took) { c -= ty.size; total += ty.fee; }
      line.after = c;
      return line;
    });
    return { lines, total, c, finished: acts.length === DAYS };
  }
  const greedyTotal = reqs => runRound(reqs, reqs.map(() => 'A')).total;
  const policyTotal = reqs => {
    let c = PLACES, total = 0;
    reqs.forEach((id, i) => { const ty = typeById(id); if (fits(ty, c) && bestDecide(i + 1, c, id)) { c -= ty.size; total += ty.fee; } });
    return total;
  };
  function hindsightBest(reqs) {
    let best = 0;
    for (let m = 0; m < (1 << DAYS); m++) best = Math.max(best, runRound(reqs, reqs.map((_, i) => (m >> i) & 1 ? 'A' : 'R')).total);
    return best;
  }
  // Did this round reach the DILEMMA moment? Then compare both choices on the same requests.
  function dilemmaIn(reqs, acts) {
    if (!DILEMMA) return null;
    const run = runRound(reqs, acts), i = DILEMMA.t - 1, line = run.lines[i];
    if (!line || line.before !== DILEMMA.c || reqs[i] !== DILEMMA.ty.id) return null;
    const head = acts.slice(0, i);
    const withAct = a => runRound(reqs, head.concat(a, reqs.slice(i + 1).map(() => 'A'))).total;
    return { chose: line.act, acceptTotal: withAct('A'), waitTotal: withAct('R'), later: reqs.slice(i + 1) };
  }

  // === TEXT HELPERS ===
  const fmt = v => { const r = Math.round(v * 1000) / 1000; return (r < 0 ? '−' : '') + String(Math.abs(r)); };
  const fH = (t, c) => 'f<sub>' + t + '</sub>(' + c + ')';
  const fN = arg => 'f<sub>t+1</sub>(' + arg + ')';
  const near = (a, b) => close(a, b, TOL);
  const SMALL = TYPES[0], LARGE = TYPES[1];
  const tyLabel = ty => ty.name + ' (' + ty.size + ' place' + (ty.size > 1 ? 's' : '') + ', pays ' + ty.fee + ')';
  const reqText = list => list.map(id => typeById(id).name).join(', ');
  const reqShort = list => list.join(' ');
  const numInput = (attrs, value, cls) => '<input class="gk-num' + (cls || '') + '" type="text" inputmode="decimal" autocomplete="off" ' + attrs + ' value="' + escapeAttr(value) + '">';
  const nodeName = k => { const [t, c] = parseKey(k); return t === END ? 'End, ' + c + ' left' : 'day ' + t + ', ' + c + ' place' + (c === 1 ? '' : 's') + ' left'; };
  const actWord = a => ({ A: 'Accept', W: 'Wait (reject)', nofit: 'does not fit', tie: 'either' }[a]);
  const MEAN_FEE = TYPES.reduce((s, ty) => s + ty.p * ty.fee, 0);
  const MEAN_SIZE = TYPES.reduce((s, ty) => s + ty.p * ty.size, 0);

  // === MAP (SVG) ===
  // Columns = days, rows = free places. Like the lecture's decision tree (slide 4), but here
  // the random request comes FIRST and decides which arrows you may use.
  const MX = { 1: 105, 2: 250, 3: 395, 4: 540 };
  const MY = c => 50 + (PLACES - c) * 82;
  const R_NODE = 23;
  const KIND_CLASS = { W: 'w', S: 's', L: 'l' };
  function arcsOf(k) {
    const [t, c] = parseKey(k);
    const list = [{ kind: 'W', from: k, to: key(t + 1, c), gain: 0 }];
    TYPES.forEach(ty => { if (fits(ty, c)) list.push({ kind: ty.id, from: k, to: key(t + 1, c - ty.size), gain: ty.fee }); });
    return list;
  }
  function mapSVG(o) {
    const opt = Object.assign({ values: {}, active: null, best: {}, path: [], marks: [], changed: [], clickable: () => false, locked: () => false, endLabel: 'End' }, o);
    const pos = k => { const [t, c] = parseKey(k); return [MX[t], MY(c)]; };
    const pathSet = new Set(opt.path);
    const targets = opt.active ? arcsOf(opt.active).map(a => a.to) : [];
    let lines = '', labels = '', nodes = '';
    DECISION_NODES.slice().reverse().forEach(k => arcsOf(k).forEach(arc => {
      const [x1, y1] = pos(arc.from), [x2, y2] = pos(arc.to);
      const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      const sx = x1 + ux * R_NODE, sy = y1 + uy * R_NODE, ex = x2 - ux * (R_NODE + 2), ey = y2 - uy * (R_NODE + 2);
      const kc = KIND_CLASS[arc.kind], hot = opt.active === arc.from;
      const onPath = pathSet.has(arc.from + '>' + arc.kind);
      const isBest = (opt.best[arc.from] || []).includes(arc.kind);
      const cls = 'r-arc ' + kc + (hot ? ' hot' : '') + (onPath ? ' path' : isBest ? ' best' : '') + (opt.active && !hot ? ' dim' : '');
      const marker = onPath || isBest ? 'url(#gr-ah-best)' : 'url(#gr-ah-' + kc + ')';
      lines += '<line class="' + cls + '" x1="' + sx.toFixed(1) + '" y1="' + sy.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '" marker-end="' + marker + '"/>';
      if (hot) {
        const f = arc.kind === 'W' ? 0.5 : arc.kind === 'S' ? 0.42 : 0.62;
        const lx = x1 + (x2 - x1) * f, ly = y1 + (y2 - y1) * f;
        labels += '<rect class="r-pill" x="' + (lx - 22).toFixed(1) + '" y="' + (ly - 11).toFixed(1) + '" width="44" height="22" rx="11"/>' +
          '<text class="r-lab ' + kc + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">+' + arc.gain + '</text>';
      }
    }));
    DECISION_NODES.concat(END_NODES).forEach(k => {
      const [x, y] = pos(k), [t] = parseKey(k), v = opt.values[k];
      const cls = ['r-node', t === END ? 'end' : '', opt.active === k ? 'active' : '', targets.includes(k) ? 'target' : '',
        opt.marks.includes(k) ? 'marked' : '', opt.changed.includes(k) ? 'changed' : '', opt.clickable(k) ? 'click' : '', opt.locked(k) ? 'locked' : ''].join(' ');
      nodes += '<g class="' + cls + '" data-node="' + k + '"' + (opt.clickable(k) ? ' role="button" tabindex="0"' : '') + ' aria-label="' + nodeName(k) + '">' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + R_NODE + '"/>' +
        // WHY: values with 6+ characters (e.g. 14.016) are wider than the circle; they get a smaller font.
        '<text x="' + x + '" y="' + y + '"' + (v === undefined ? ' class="unknown"' : fmt(v).length >= 6 ? ' class="long"' : '') + '>' + (v === undefined ? '?' : fmt(v)) + '</text></g>';
    });
    const cols = [1, 2, 3].map(t => '<text class="r-col" x="' + MX[t] + '" y="16">Day ' + t + '</text>').join('') +
      '<text class="r-col" x="' + MX[END] + '" y="16">' + opt.endLabel + '</text>';
    const rows = Array.from({ length: PLACES + 1 }, (_, i) => PLACES - i).map(c => '<text class="r-row" x="2" y="' + (MY(c) + 5) + '">' + c + ' left</text>').join('');
    // WHY: userSpaceOnUse keeps arrowheads one size; the default scales them with stroke width.
    const head = (id, color) => '<marker id="gr-ah-' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:var(' + color + ')"/></marker>';
    return '<div class="gr-map"><svg viewBox="0 0 590 330" role="img" aria-label="Map of days and free places">' +
      '<defs>' + head('w', '--muted') + head('s', '--s1') + head('l', '--s5') + head('best', '--s2') + '</defs>' +
      cols + rows + lines + labels + nodes +
      '<text class="r-start" x="' + MX[1] + '" y="' + (MY(PLACES) + R_NODE + 16) + '">start</text></svg>' +
      '<div class="gk-legend">' +
      '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--muted);stroke-width:2"/></svg>reject (any request): +0, places stay</span>' +
      '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s1);stroke-width:2"/></svg>accept a small request: +' + SMALL.fee + ', ' + SMALL.size + ' place used</span>' +
      '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s5);stroke-width:2;stroke-dasharray:7 5"/></svg>accept a large request: +' + LARGE.fee + ', ' + LARGE.size + ' places used</span>' +
      (Object.keys(opt.best).length || opt.path.length ? '<span><svg viewBox="0 0 34 10"><line x1="0" y1="5" x2="34" y2="5" style="stroke:var(--s2);stroke-width:5"/></svg>' + (opt.path.length ? 'your last round' : 'best choice for that request') + '</span>' : '') +
      '<span>Each day the request decides which accept arrow is open: small (probability ' + SMALL.p + ') or large (' + LARGE.p + '). Number in a circle = f, the largest expected revenue from there to the end.</span></div></div>';
  }

  // === STEP CONTENT (fixed data per step) ===
  const MAP_ASK = DILEMMA ? DILEMMA.k : key(2, 2);
  const [ASK_T, ASK_C] = parseKey(MAP_ASK);
  const NOFIT_NODE = DECISION_NODES.find(k => { const [t, c] = parseKey(k); return t < DAYS && !fits(LARGE, c) && fits(SMALL, c); });
  const END_ASK_C = Math.min(2, PLACES);
  const MAP_QUESTIONS = [
    { id: 'next', node: MAP_ASK, kind: 'num',
      prompt: 'Look at the ringed circle: <b>day ' + ASK_T + ', ' + ASK_C + ' places left</b>. A small request comes and you <b>accept</b> it. How many places are left at the start of day ' + (ASK_T + 1) + '?',
      answer: ASK_C - SMALL.size,
      diag: { [ASK_C]: 'Accepting uses places: a small request takes ' + SMALL.size + '. Only rejecting keeps ' + ASK_C + '.', [ASK_C - LARGE.size]: 'A small request uses only ' + SMALL.size + ' place. ' + (ASK_C - LARGE.size) + ' would be after a large one.', [ASK_C + SMALL.size]: 'Booked places never come back.' },
      hint: 'Free places now minus the places the request needs.',
      right: 'The blue arrow goes one row down: ' + ASK_C + ' − ' + SMALL.size + ' = ' + (ASK_C - SMALL.size) + ' place' + (ASK_C - SMALL.size === 1 ? '' : 's') + ' on day ' + (ASK_T + 1) + '.' },
    { id: 'nofit', node: NOFIT_NODE, kind: 'choice',
      prompt: 'Now the ringed circle is <b>' + nodeName(NOFIT_NODE) + '</b>. A <b>large</b> request comes (it needs ' + LARGE.size + ' places). What can you do?',
      options: [['accept', 'Accept it'], ['half', 'Accept part of it: 1 place for half the fee'], ['reject', 'Only reject: the arrow stays in the same row']],
      answer: 'reject',
      diag: { accept: 'It needs ' + LARGE.size + ' places and you have ' + parseKey(NOFIT_NODE)[1] + '. Free places cannot go below 0.', half: 'A request is accepted in full or not at all.' },
      right: 'From this circle there is no purple arrow. Rejecting is always possible; accepting only if the request fits.' },
    { id: 'end', node: key(END, END_ASK_C), kind: 'num',
      prompt: 'After day ' + DAYS + ' the workshop starts. Free places earn nothing then. What number goes in the <b>End circle with ' + END_ASK_C + ' places left</b>?',
      answer: 0,
      diag: { [END_ASK_C]: 'Places are not money. A free place earns nothing after day ' + DAYS + '.', [END_ASK_C * SMALL.fee]: 'That would sell the places. After day ' + DAYS + ' nobody can book any more.', [LARGE.fee]: 'That would sell the places. After day ' + DAYS + ' nobody can book any more.' },
      hint: 'How much money do unused places bring after the last day?',
      right: 'Every End circle holds 0: f<sub>' + END + '</sub>(c) = 0 for every c.' }
  ];
  const NAME_ROWS = [
    { id: 'stage', label: 'Stage', answer: 'day' },
    { id: 'state', label: 'State', answer: 'places' },
    { id: 'random', label: 'Random event', answer: 'request' },
    { id: 'decision', label: 'Decision', answer: 'ar' },
    { id: 'reward', label: 'Reward during the stage', answer: 'reward' },
    { id: 'next', label: 'Next state', answer: 'next' },
    { id: 'value', label: 'f<sub>t</sub>(c)', answer: 'f' }
  ];
  const NAME_OPTIONS = [
    ['money', 'the money earned so far'],
    ['next', 'c − ' + SMALL.size + ' or c − ' + LARGE.size + ' after accepting; c after rejecting'],
    ['day', 'the day t = 1, 2, 3'],
    ['all', 'the requests of all three days'],
    ['f', 'largest expected revenue from day t on, with c places, before that day’s request'],
    ['ar', 'accept the request you see (only if it fits) or reject it'],
    ['request', 'the type of today’s request: small (' + SMALL.p + ') or large (' + LARGE.p + ')'],
    ['places', 'free places c at the start of day t'],
    ['reward', SMALL.fee + ' or ' + LARGE.fee + ' if you accept; 0 if you reject']
  ];
  const NAME_WHY = {
    money: 'Money already earned does not change what you can still earn. In step 2 you used only the day and the free places.',
    all: 'Future requests are not known when you decide. Only today’s request is seen.',
    request: 'Nobody chooses the request type: it is random. It is the random event of the day. Our f is defined before the request arrives.',
    places: 'Together with the day, this is all the future depends on.',
    day: 'This counts the decisions: one per day.',
    ar: 'This is what you clicked in step 1.',
    reward: 'These are the numbers on the arrows.',
    next: 'This is where each arrow ends.',
    f: 'This is the number in each circle of your map.'
  };
  const SKELETONS = [
    { id: 'inside', text: 'f<sub>t</sub>(c) = ' + SMALL.p + ' · max{ reject, accept small } + ' + LARGE.p + ' · max{ reject, accept large }', cap: 'See the request, take the best choice for it, then average.' },
    { id: 'outside', text: 'f<sub>t</sub>(c) = max{ ' + SMALL.p + ' · (accept small) + ' + LARGE.p + ' · (accept large), reject }', cap: 'Pick one action for any request, then average.' },
    { id: 'mean', text: 'f<sub>t</sub>(c) = max{ reject, accept the average request: fee ' + fmt(MEAN_FEE) + ', ' + fmt(MEAN_SIZE) + ' places }', cap: 'Replace the random request by its average.' }
  ];
  const SKELETON_WHY = {
    outside: 'This chooses <b>before</b> the request is seen: the same action for small and large. In this story you see the request first, so you may treat them differently (step 2: wait for a small one, accept a large one). Remember this formula for step 6. Compare the class question “Place the expectation” (inventory, before slide 17): there production is chosen before demand is known, so the min sits outside the expectation. The order of information decides.',
    mean: 'There is no request of ' + fmt(MEAN_SIZE) + ' places. Requests are accepted in full, so an average request hides whether it fits.'
  };
  const TILES = [
    ['p6', String(SMALL.p)], ['p4', String(LARGE.p)], ['p5', '0.5'],
    ['fc', fN('c')], ['sacc', SMALL.fee + ' + ' + fN('c−' + SMALL.size)], ['snp', SMALL.fee + ' + ' + fN('c')],
    ['fcm1', fN('c−' + SMALL.size)], ['four', String(SMALL.fee)],
    ['lacc', LARGE.fee + ' + ' + fN('c−' + LARGE.size)], ['lwrong', LARGE.fee + ' + ' + fN('c−' + SMALL.size)],
    ['zero', '0'], ['cc', 'c'], ['fourc', SMALL.fee + 'c']
  ];
  const tileLabel = id => (TILES.find(x => x[0] === id) || [null, ''])[1];
  const SLOT_IDS = ['w1', 's1', 's2', 'w2', 'l1', 'l2', 'b'];
  // A bracket max{ , } takes reject and accept in either order; the other boxes take one tile.
  const PAIR = { s1: ['fc', 'sacc'], s2: ['fc', 'sacc'], l1: ['fc', 'lacc'], l2: ['fc', 'lacc'] };
  const SINGLE = { w1: 'p6', w2: 'p4', b: 'zero' };
  const PARTNER = { s1: 's2', s2: 's1', l1: 'l2', l2: 'l1' };
  const SLOT_SOLUTION = { w1: 'p6', s1: 'fc', s2: 'sacc', w2: 'p4', l1: 'fc', l2: 'lacc', b: 'zero' };
  const SLOT_ROLE = {
    w1: 'How likely is a small request?', s1: 'Small request: one of the two choices', s2: 'Small request: the other choice',
    w2: 'How likely is a large request?', l1: 'Large request: one of the two choices', l2: 'Large request: the other choice',
    b: 'End: what are free places worth after day ' + DAYS + '?'
  };
  const PAIR_WHY = {
    snp: 'Accepting uses a place: the next state is c − ' + SMALL.size + ', not c.',
    fcm1: 'If you accept, you also earn the fee ' + SMALL.fee + '.',
    four: 'Add the future: after accepting, ' + fN('c−' + SMALL.size) + ' is still ahead.',
    lwrong: 'A large request uses ' + LARGE.size + ' places: c − ' + LARGE.size + '.',
    lacc: 'That is the large request. This bracket is for a small one.',
    sacc: 'That is the small request. This bracket is for a large one.'
  };
  const SLOT_WHY = {
    w1: { p4: LARGE.p + ' is the chance of a large request. This bracket is for a small one.', p5: 'The two requests are not equally likely: small ' + SMALL.p + ', large ' + LARGE.p + '.' },
    w2: { p6: SMALL.p + ' is the chance of a small request. This bracket is for a large one.', p5: 'The two requests are not equally likely: small ' + SMALL.p + ', large ' + LARGE.p + '.' },
    b: { cc: 'Free places earn nothing after day ' + DAYS + ', so the End value does not grow with c.', fourc: 'After day ' + DAYS + ' nobody can book; free places cannot be sold.' }
  };
  const PIECES = [
    ['state', 'The state (day, free places)', 'The day and the free places still say everything about the future.'],
    ['rewards', 'The rewards ' + SMALL.fee + ' and ' + LARGE.fee, 'The fees do not change. Only the moment of the decision moves.'],
    ['maxpos', 'Where the max sits: now it comes before the average', ''],
    ['end', 'The End value f<sub>' + END + '</sub>(c)', 'Free places are still worth nothing after day ' + DAYS + '.']
  ];

  // === STATE ===
  const fresh = () => ({
    round: 0, acts: [], history: [], playMsg: null,
    luck: { predict: null, A: '', W: '', okA: false, okW: false, wrong: 0, msg: null, know: null },
    mapq: { next: { v: '', ok: false, msg: null, wrong: 0 }, nofit: { v: '', ok: false, msg: null, wrong: 0 }, end: { v: '', ok: false, msg: null, wrong: 0 } },
    fill: {}, active: null, solveNote: null, lockMsg: null, showLists: false,
    names: {}, namesChecked: false, skel: null,
    slots: {}, slotSel: 'w1', slotsChecked: false,
    twist: { piece: null, dir: null, marks: [], checked: false }
  });

  // === STEPS (built once per page with the kit's ctx) ===
  function build(ctx) {
    const { S, activity, track, finish, showMe } = ctx;
    const stepIds = activity.steps.map(s => s.id);
    const title = id => ctx.stepTitle(id);

    // --- Step 1: play it ---
    function renderPlay() {
      const reqs = roundAt(S.round), run = runRound(reqs, S.acts);
      const day = S.acts.length + 1, c = run.c;
      let out = '<h2>' + title('play') + '</h2>' +
        '<p>Your workshop has <b>' + PLACES + ' free places</b>. For ' + DAYS + ' days, one booking request arrives each day. You see the request, then you <b>accept</b> it or <b>reject</b> it. A rejected request is gone.</p>' +
        '<p><b>Goal:</b> earn as much as you can. Play at least ' + ROUNDS_TO_FINISH + ' rounds. Everyone gets the same requests in the same order.</p>' +
        '<div class="gk-panel">';
      if (!run.finished) {
        const ty = typeById(reqs[day - 1]);
        out += '<div class="gk-now">Round ' + (S.round + 1) + ' · Day ' + day + ' of ' + DAYS + ' · ' + c + ' free place' + (c === 1 ? '' : 's') + '</div>' +
          '<div>Today’s request: <span class="gr-request ' + ty.id + '" id="play-request">' + tyLabel(ty) + '</span></div>' +
          '<div class="gk-row">' + btn('data-do="act" data-act="A"', 'Accept (+' + ty.fee + ')', ' big') + btn('data-do="act" data-act="R"', 'Reject', ' big') +
          (S.acts.length ? btn('data-do="undo"', 'Undo last day') : '') + '</div>' + (S.playMsg || '');
      } else {
        out += '<div class="gk-now">Round ' + (S.round + 1) + ' finished.</div>';
      }
      if (S.acts.length) {
        out += '<table class="gk-receipt"><tr><th>Day</th><th>Request</th><th>You</th><th class="amt">Earned</th><th class="amt">Places left</th></tr>' +
          run.lines.map(l => '<tr><td>' + l.day + '</td><td>' + l.ty.name + '</td><td>' + (l.act === 'A' ? 'accept' : 'reject') + '</td><td class="amt">' + l.gain + '</td><td class="amt">' + l.after + '</td></tr>').join('') +
          '<tr class="total"><td colspan="3">' + (run.finished ? 'Total' : 'So far') + '</td><td class="amt" id="play-total">' + run.total + '</td><td></td></tr></table>';
      } else out += '<p class="gk-small gk-muted">Your receipt appears here.</p>';
      out += '</div>';
      if (run.finished) {
        const g = greedyTotal(reqs), h = hindsightBest(reqs), d = dilemmaIn(reqs, S.acts);
        out += '<div class="gk-fb info" id="round-result">You earned <b>' + run.total + '</b>. On the same requests, “accept whatever fits” earns <b>' + g + '</b>. Knowing all ' + DAYS + ' requests in advance, the best possible is <b>' + h + '</b> — but nobody knows the future.' +
          (d ? '<br>On day ' + DILEMMA.t + ' you had ' + DILEMMA.c + ' places and a ' + DILEMMA.ty.name + ' request. You chose to <b>' + (d.chose === 'A' ? 'accept' : 'wait') + '</b>. Day ' + (DILEMMA.t + 1) + ' brought: ' + reqText(d.later) + '. Accepting would give ' + d.acceptTotal + ' in total, waiting ' + d.waitTotal + '. This time <b>' + (d.waitTotal > d.acceptTotal ? 'waiting' : d.waitTotal < d.acceptTotal ? 'accepting' : 'neither') + '</b> was the luckier choice.' : '') +
          '</div><div class="gk-row">' + btn('data-do="nextRound"', 'Next round', ' primary') + '</div>';
      }
      if (S.history.length) {
        out += '<h3>Your rounds</h3><div class="gk-chips">' + S.history.map(r => {
          const rq = roundAt(r.round), tot = runRound(rq, r.acts).total;
          return '<span class="gk-chip">Round ' + (r.round + 1) + ' (' + reqShort(rq) + '): you ' + tot + ' · accept-all ' + greedyTotal(rq) + '</span>';
        }).join('') + '</div>';
      }
      if (S.history.length >= ROUNDS_TO_FINISH) {
        const met = S.history.map(r => ({ r, d: dilemmaIn(roundAt(r.round), r.acts) })).filter(x => x.d);
        const flips = met.some(x => x.d.waitTotal > x.d.acceptTotal) && met.some(x => x.d.waitTotal < x.d.acceptTotal);
        out += fb('info', 'You played ' + S.history.length + ' rounds. ' +
          (flips ? 'You met the same moment twice (day ' + DILEMMA.t + ', ' + DILEMMA.c + ' places, a ' + DILEMMA.ty.name + ' request): once waiting was luckier, once accepting was. ' : '') +
          'One round says little: the total depends on luck. To compare decisions fairly, we look at the <b>average over all possible requests, weighted by their probabilities</b>: the <b>expected revenue</b>. Step 2 does this for one decision.');
      }
      return out;
    }

    // --- Step 2: luck or a good decision? ---
    function luckValues() {
      const D = DILEMMA, cA = D.c - D.ty.size, nt = D.t + 1;
      return { D, cA, nt, accept: D.ty.fee + SEE.f[key(nt, cA)], wait: SEE.f[key(nt, D.c)], futA: SEE.f[key(nt, cA)], futW: SEE.f[key(nt, D.c)] };
    }
    function branchList(nt, c) {
      return '<ul>' + TYPES.map(ty => {
        const b = SEE.parts[key(nt, c)][ty.id];
        return '<li>' + ty.name + ' (' + ty.p + ') → ' + (b.act === 'nofit' ? 'does not fit: +0' : '+' + fmt(b.best)) + '</li>';
      }).join('') + '</ul>';
    }
    function diagAccept(v, L) {
      const D = L.D;
      if (near(v, D.ty.fee * 2) && !near(D.ty.fee * 2, L.accept)) return 'Accept: that assumes day ' + L.nt + ' surely brings a small request. It is small only with probability ' + SMALL.p + '.';
      if (near(v, D.ty.fee)) return 'Accept: that is only today’s ' + D.ty.fee + '. Add what day ' + L.nt + ' brings on average.';
      if (near(v, L.futA)) return 'Accept: that is only day ' + L.nt + '. Add the ' + D.ty.fee + ' you earn today.';
      if (near(v, D.ty.fee + TYPES.reduce((s, ty) => s + 0.5 * (fits(ty, L.cA) ? ty.fee : 0), 0))) return 'Accept: use the probabilities ' + SMALL.p + ' and ' + LARGE.p + ', not one half each.';
      if (near(v, D.ty.fee + MEAN_FEE)) return 'Accept: after accepting you have ' + L.cA + ' place left, so a large request does not fit on day ' + L.nt + '.';
      if (near(v, L.wait)) return 'Accept: that is the value of waiting. Accepting gives ' + D.ty.fee + ' today and leaves ' + L.cA + ' place.';
      return null;
    }
    function diagWait(v, L) {
      const sum = TYPES.reduce((s, ty) => s + ty.fee, 0), half = sum / TYPES.length;
      if (near(v, LARGE.fee)) return 'Wait: that assumes a large request comes. It comes only with probability ' + LARGE.p + '.';
      if (near(v, sum)) return 'Wait: only one request comes on day ' + L.nt + ', not both.';
      if (near(v, half)) return 'Wait: use the probabilities ' + SMALL.p + ' and ' + LARGE.p + ', not one half each.';
      if (near(v, SMALL.p * SMALL.fee)) return 'Wait: you only counted the small request. Add ' + LARGE.p + ' × ' + LARGE.fee + '.';
      if (near(v, LARGE.p * LARGE.fee)) return 'Wait: you only counted the large request. Add ' + SMALL.p + ' × ' + SMALL.fee + '.';
      if (near(v, LARGE.p * SMALL.fee + SMALL.p * LARGE.fee)) return 'Wait: the probabilities are swapped. Small has ' + SMALL.p + ', large has ' + LARGE.p + '.';
      if (near(v, L.accept)) return 'Wait: that is the value of accepting. Waiting earns 0 today and keeps ' + L.D.c + ' places.';
      return null;
    }
    function renderLuck() {
      if (!DILEMMA) return '<h2>' + title('luck') + '</h2>' + fb('no', 'With these data no fitting request is ever worth rejecting.');
      const L = luckValues(), D = L.D, lk = S.luck;
      const pBtn = (id, text) => btn('data-do="predict" data-v="' + id + '"' + (lk.predict ? ' disabled' : ''), text, lk.predict === id ? ' picked' : '');
      let out = '<h2>' + title('luck') + '</h2>' +
        '<p>Take one moment from your rounds. <b>Day ' + D.t + '</b> starts. You have <b>' + D.c + ' free places</b>. Today’s request is <b>' + tyLabel(D.ty) + '</b>. Day ' + L.nt + ' is the last day.</p>' +
        '<h3>Predict first</h3><p>Accept it now, or wait (reject it and hope for a large request tomorrow)?</p>' +
        '<div class="gk-row">' + pBtn('A', 'Accept now') + pBtn('W', 'Wait') + pBtn('same', 'No difference') + '</div>';
      if (!lk.predict) return out;
      const fieldCls = ok => ok ? ' ok' : lk.wrong ? ' no' : '';
      out += '<h3>Now compute the average</h3><p>For each choice: today’s money + what day ' + L.nt + ' brings <b>on average</b>. Day ' + L.nt + ' is the last day, so then you accept any request that fits.</p>' +
        '<div class="gr-branches">' +
        '<div class="gr-branch"><h4>Accept now</h4><p>Today: <b>+' + D.ty.fee + '</b>. Places left: ' + L.cA + '.</p><p>Day ' + L.nt + ':</p>' + branchList(L.nt, L.cA) +
        '<label>Expected total from today: ' + numInput('data-luck="A" aria-label="Accept: expected total" data-enter="luckCheck"' + (lk.okA ? ' disabled' : ''), lk.A, fieldCls(lk.okA)) + '</label></div>' +
        '<div class="gr-branch"><h4>Wait</h4><p>Today: <b>+0</b>. Places left: ' + D.c + '.</p><p>Day ' + L.nt + ':</p>' + branchList(L.nt, D.c) +
        '<label>Expected total from today: ' + numInput('data-luck="W" aria-label="Wait: expected total" data-enter="luckCheck"' + (lk.okW ? ' disabled' : ''), lk.W, fieldCls(lk.okW)) + '</label></div></div>';
      if (!(lk.okA && lk.okW)) {
        return out + '<div class="gk-row">' + btn('data-do="luckCheck"', 'Check', ' primary') + (lk.wrong ? btn('data-do="luckShow"', 'Show me') : '') + '</div>' + (lk.msg || '');
      }
      out += lk.msg || '';
      const better = L.wait > L.accept + EPS ? 'W' : L.accept > L.wait + EPS ? 'A' : 'same';
      const rows = TYPES.map(ty => {
        const accTot = D.ty.fee + (fits(ty, L.cA) ? ty.fee : 0), waitTot = fits(ty, D.c) ? ty.fee : 0;
        return '<tr><td>Day ' + L.nt + ' is ' + ty.name + ' (' + ty.p + ')</td><td class="amt">' + accTot + '</td><td class="amt">' + waitTot + '</td><td>' + (waitTot > accTot ? 'waiting wins by ' + (waitTot - accTot) : waitTot < accTot ? 'waiting loses ' + (accTot - waitTot) : 'equal') + '</td></tr>';
      }).join('');
      out += '<div class="gr-tablewrap"><table class="gk-receipt" id="luck-table"><tr><th>What happens</th><th class="amt">Accept</th><th class="amt">Wait</th><th></th></tr>' + rows +
        '<tr class="total"><td>Average (expected)</td><td class="amt">' + fmt(L.accept) + '</td><td class="amt">' + fmt(L.wait) + '</td><td>' + (better === 'W' ? 'waiting is better by ' + fmt(L.wait - L.accept) : better === 'A' ? 'accepting is better by ' + fmt(L.accept - L.wait) : 'equal') + '</td></tr></table></div>';
      const loseP = TYPES.filter(ty => (fits(ty, D.c) ? ty.fee : 0) < D.ty.fee + (fits(ty, L.cA) ? ty.fee : 0)).reduce((s, ty) => s + ty.p, 0);
      const verdict = { A: 'accepting now is better on average', W: 'waiting is better on average', same: 'both are equal on average' }[better];
      out += '<div id="predict-verdict">' + (lk.predict === better
        ? fb('ok', 'You predicted it: ' + verdict + '.')
        : fb('no', 'You predicted “' + { A: 'accept now', W: 'wait', same: 'no difference' }[lk.predict] + '”. The averages show: ' + verdict + '.')) + '</div>';
      out += '<p>Surprise: waiting <b>loses</b> with probability ' + fmt(loseP) + ' — more often than it wins. But when it wins, it wins a lot. On average waiting is better. One lucky or unlucky round (step 1) cannot show this; the expected value can.</p>';
      const kBtn = (id, text) => btn('data-do="know" data-v="' + id + '"', text, lk.know === id ? ' picked' : '');
      out += '<h3>What did you know when you decided?</h3><div class="gk-row">' +
        kBtn('today', 'Today’s request (' + D.ty.name + '), not tomorrow’s') + kBtn('both', 'Today’s and tomorrow’s requests') + kBtn('none', 'Nothing about today’s request') + '</div>';
      const why = {
        today: fb('ok', 'You saw today’s request <b>before</b> deciding. Tomorrow’s request was only known as probabilities. So the best decision may differ for a small and a large request. This order matters in step 5.'),
        both: fb('no', 'Tomorrow’s request was not known. That is why we used the probabilities ' + SMALL.p + ' and ' + LARGE.p + '.'),
        none: fb('no', 'You did see today’s request: the question said it is ' + D.ty.name + '.')
      };
      return out + (lk.know ? why[lk.know] : '');
    }

    // --- Step 3: draw it as a map ---
    const mapReady = () => MAP_QUESTIONS.every(q => S.mapq[q.id].ok);
    function lastRoundPath() {
      const r = S.history[S.history.length - 1]; if (!r) return [];
      const run = runRound(roundAt(r.round), r.acts);
      return run.lines.map(l => key(l.day, l.before) + '>' + (l.act === 'A' ? l.ty.id : 'W'));
    }
    function renderMap() {
      const done = mapReady(), values = {};
      if (S.mapq.end.ok) END_NODES.forEach(k => { values[k] = SEE.f[k]; });
      const q = MAP_QUESTIONS.find(x => !S.mapq[x.id].ok);
      let out = '<h2>' + title('map') + '</h2>' +
        '<p>Each circle is a <b>(day, free places)</b> pair. Each arrow is a choice: <b>reject</b> (gray, same row), <b>accept a small request</b> (blue, one row down) or <b>accept a large request</b> (purple, two rows down). Every round you played is one path from start to End.</p>' +
        '<p class="gk-small">The lecture draws a decision tree (slide 4): first the decision, then the random outcome. Here the order is the other way: <b>first</b> the random request arrives, <b>then</b> you decide. The request opens one accept arrow.</p>' +
        mapSVG({ values, active: done ? null : q.node, path: done ? lastRoundPath() : [] });
      if (!done) {
        const st = S.mapq[q.id];
        out += '<div class="gk-panel"><p>' + q.prompt + '</p>';
        if (q.kind === 'num') {
          out += '<div class="gk-row">' + numInput('data-mapq="' + q.id + '" aria-label="Your answer" data-enter="mapCheck"', st.v) + btn('data-do="mapCheck"', 'Check', ' primary') + (st.wrong ? btn('data-do="mapShow"', 'Show me') : '') + '</div>';
        } else {
          out += '<div class="gk-row">' + q.options.map(o => btn('data-do="mapChoice" data-v="' + o[0] + '"', o[1], st.v === o[0] ? ' picked' : '')).join('') + (st.wrong ? btn('data-do="mapShow"', 'Show me') : '') + '</div>';
        }
        out += (st.msg || '') + '</div><p class="gk-small gk-muted">Question ' + (MAP_QUESTIONS.indexOf(q) + 1) + ' of ' + MAP_QUESTIONS.length + '.</p>';
        return out;
      }
      out += MAP_QUESTIONS.map(x => S.mapq[x.id].msg || '').join('');
      return out + fb('ok', 'The map is complete. ' + (S.history.length ? 'The thick green path is your last round from step 1.' : '') + ' Which arrow you may use each day depends on that day’s request.');
    }

    // --- Step 4: solve it backward ---
    const isDone = k => AUTO_NODES.includes(k) || !!(S.fill[k] && S.fill[k].done);
    const doneCount = () => WORK_NODES.filter(isDone).length;
    const knownValues = () => {
      const v = {};
      END_NODES.forEach(k => { v[k] = SEE.f[k]; });
      DECISION_NODES.forEach(k => { if (isDone(k)) v[k] = SEE.f[k]; });
      return v;
    };
    const isReady = (k, values) => arcsOf(k).every(a => values[a.to] !== undefined);
    function fillOf(k) {
      // WHY: support fades with practice: the first circle shows the numbers, the next four
      // only the symbols, the rest only the boxes (worked example → faded steps → alone).
      // Four, not three, so that day 2 with 2 places (the "wait" circle, usually the fifth)
      // still shows the symbols.
      if (!S.fill[k]) { const n = doneCount(); S.fill[k] = { S: '', L: '', F: '', okS: false, okL: false, okF: false, tried: false, wrong: 0, done: false, msg: null, level: n === 0 ? 0 : n <= 4 ? 1 : 2 }; }
      return S.fill[k];
    }
    function exprs(k, level) {
      const [t, c] = parseKey(k), nt = t + 1, out = {};
      TYPES.forEach(ty => {
        const P = SEE.parts[k][ty.id], ok = fits(ty, c);
        if (level === 0) out[ty.id] = ok
          ? 'max{ reject: ' + fH(nt, c) + ' = ' + fmt(P.rej) + ' , accept: ' + ty.fee + ' + ' + fH(nt, c - ty.size) + ' = ' + ty.fee + ' + ' + fmt(SEE.f[key(nt, c - ty.size)]) + ' } ='
          : 'does not fit, only reject: ' + fH(nt, c) + ' = ' + fmt(P.rej) + ' →';
        else if (level === 1) out[ty.id] = ok ? 'max{ ' + fH(nt, c) + ' , ' + ty.fee + ' + ' + fH(nt, c - ty.size) + ' } =' : 'does not fit: ' + fH(nt, c) + ' =';
        else out[ty.id] = 'best value =';
      });
      out.F = level <= 1 ? fH(t, c) + ' = ' + SMALL.p + ' × (small box) + ' + LARGE.p + ' × (large box) =' : fH(t, c) + ' =';
      return out;
    }
    function diagBest(k, ty, v) {
      const [t, c] = parseKey(k), nt = t + 1, P = SEE.parts[k][ty.id], name = ty.name[0].toUpperCase() + ty.name.slice(1);
      if (P.acc === null) {
        if (near(v, ty.fee) || near(v, ty.fee + P.rej)) return name + ': it needs ' + ty.size + ' places and you have ' + c + '. Only reject is possible: ' + fH(nt, c) + ' = ' + fmt(P.rej) + '.';
        if (near(v, 0) && !near(P.rej, 0)) return name + ': rejecting keeps your ' + c + ' place' + (c === 1 ? '' : 's') + '. The future ' + fH(nt, c) + ' = ' + fmt(P.rej) + ' is still ahead.';
        return null;
      }
      const lo = Math.min(P.acc, P.rej);
      if (!near(P.acc, P.rej) && near(v, lo)) return name + ': you took the smaller option. Reject gives ' + fmt(P.rej) + ', accept gives ' + fmt(P.acc) + '. We maximize, so take the larger.';
      if (near(v, ty.fee)) return name + ': that is only today’s fee. If you accept, add the value where the arrow ends: ' + fH(nt, c - ty.size) + ' = ' + fmt(SEE.f[key(nt, c - ty.size)]) + '.';
      if (near(v, SEE.f[key(nt, c - ty.size)])) return name + ': you forgot today’s fee +' + ty.fee + '.';
      if (near(v, ty.fee + P.rej)) return name + ': accepting uses ' + ty.size + ' place' + (ty.size > 1 ? 's' : '') + ': the arrow ends at ' + fH(nt, c - ty.size) + ', not ' + fH(nt, c) + '.';
      if (near(v, ty.p * P.best)) return name + ': do not multiply by the probability here. That happens in the last box.';
      return null;
    }
    function diagF(k, v, sv, lv) {
      const P = SEE.parts[k], bS = P.S.best, bL = P.L.best;
      if (near(v, (bS + bL) / 2)) return 'f: use the probabilities ' + SMALL.p + ' and ' + LARGE.p + ', not one half each.';
      if (near(v, bS + bL)) return 'f: only one request comes. Multiply each box by its probability.';
      if (near(v, Math.max(bS, bL))) return 'f: you cannot choose the request type. Average the two boxes with their probabilities.';
      if (near(v, LARGE.p * bS + SMALL.p * bL)) return 'f: the probabilities are swapped. Small has ' + SMALL.p + ', large has ' + LARGE.p + '.';
      if (!Number.isNaN(sv) && !Number.isNaN(lv) && near(v, SMALL.p * sv + LARGE.p * lv)) return 'f: your average is right for your two boxes. Fix the boxes above first.';
      return null;
    }
    function nodePanel(k) {
      const [t, c] = parseKey(k), F = fillOf(k), ex = exprs(k, F.level);
      const field = (side, ok, label) => numInput('data-fill="' + k + '" data-side="' + side + '" aria-label="' + label + '" data-enter="fillCheck"' + (ok ? ' disabled' : ''), F[side], ok ? ' ok' : F.tried ? ' no' : '');
      let out = '<div class="gk-panel" id="node-panel"><p><b>Day ' + t + ', ' + c + ' free place' + (c === 1 ? '' : 's') + '.</b> First the best choice for each request, then the average.</p><div class="gk-calc">' +
        '<span class="who s">If small (' + SMALL.p + ')</span><span class="eq">' + ex.S + '</span>' + field('S', F.okS, 'Best if small') +
        '<span class="who l">If large (' + LARGE.p + ')</span><span class="eq">' + ex.L + '</span>' + field('L', F.okL, 'Best if large') +
        '<span class="who">Average</span><span class="eq">' + ex.F + '</span>' + field('F', F.okF, 'f value') + '</div>';
      if (!F.done) out += '<div class="gk-row">' + btn('data-do="fillCheck"', 'Check', ' primary') + (F.wrong ? btn('data-do="fillShow"', 'Show me') : '') + '</div>';
      return out + (F.msg || '') + '</div>';
    }
    function bestArcs(k) {
      const P = SEE.parts[k], arr = [];
      TYPES.forEach(ty => { if (P[ty.id].act === 'A') arr.push(ty.id); if (P[ty.id].act === 'W') arr.push('W'); });
      return arr;
    }
    const decisionsText = k => TYPES.map(ty => 'if ' + ty.name + ': ' + actWord(SEE.parts[k][ty.id].act).toLowerCase()).join(', ');
    function completeNode(k, kind) {
      const F = fillOf(k), [t, c] = parseKey(k), P = SEE.parts[k];
      F.done = true; F.msg = null;
      const hasWait = TYPES.some(ty => P[ty.id].act === 'W');
      S.solveNote = { kind, html: fH(t, c) + ' = ' + SMALL.p + ' × ' + fmt(P.S.best) + ' + ' + LARGE.p + ' × ' + fmt(P.L.best) + ' = <b>' + fmt(SEE.f[k]) + '</b>. Best: ' + decisionsText(k) + '.' +
        (hasWait ? ' <b>Here waiting beats accepting a request that fits</b> — the moment from step 2.' : '') };
      if (doneCount() === WORK_NODES.length) finish('solve');
    }
    function renderSolve() {
      const values = knownValues(), allDone = doneCount() === WORK_NODES.length;
      if (!S.active || isDone(S.active)) S.active = WORK_NODES.find(k => !isDone(k) && isReady(k, values)) || null;
      const best = {};
      DECISION_NODES.filter(isDone).forEach(k => { best[k] = bestArcs(k); });
      let out = '<h2>' + title('solve') + '</h2>' +
        '<p>Start at End and move left, like the lecture’s tables for f<sub>3</sub>, f<sub>2</sub>, f<sub>1</sub> (slides 22–24). For each circle: <b>first</b> find the best choice for each request (the larger of reject and accept), <b>then</b> average with the probabilities. Click any circle whose arrows end at known values.</p>' +
        mapSVG({ values, active: allDone ? null : S.active, best,
          clickable: k => !allDone && WORK_NODES.includes(k) && !isDone(k) && isReady(k, values),
          locked: k => !allDone && WORK_NODES.includes(k) && !isDone(k) && !isReady(k, values) });
      if (AUTO_NODES.length) out += '<p class="gk-small">' + AUTO_NODES.map(k => { const [t, c] = parseKey(k); return 'Day ' + t + ' with ' + c + ' places: nothing fits, so ' + fH(t, c) + ' = ' + fH(t + 1, c) + ' = ' + fmt(SEE.f[k]) + '.'; }).join(' ') + ' Filled in for you.</p>';
      if (S.lockMsg) { out += fb('no', S.lockMsg); S.lockMsg = null; }
      if (S.solveNote && !allDone) out += fb(S.solveNote.kind, S.solveNote.html);
      if (!allDone && S.active) out += nodePanel(S.active);
      out += '<p class="gk-small gk-muted">' + doneCount() + ' of ' + WORK_NODES.length + ' circles done. The help gets lighter as you go.</p>';
      if (!allDone) return out;
      const fStart = SEE.f[START];
      const byDayThenPlaces = (a, b) => { const [ta, ca] = parseKey(a), [tb, cb] = parseKey(b); return ta - tb || cb - ca; };
      const policyRows = WORK_NODES.slice().sort(byDayThenPlaces).map(k => {
        const [t, c] = parseKey(k);
        return '<tr><td>Day ' + t + ', ' + c + ' left</td>' + TYPES.map(ty => { const a = SEE.parts[k][ty.id].act; return '<td' + (a === 'W' ? ' class="wait"' : '') + '>' + actWord(a) + '</td>'; }).join('') + '<td class="amt">' + fmt(SEE.f[k]) + '</td></tr>';
      }).join('');
      const waitText = WAIT_CASES.map(w => 'day ' + w.t + ' with ' + w.c + ' places and a ' + w.ty.name + ' request').join('; ');
      out += fb('ok', fH(1, PLACES) + ' = <b id="f-start">' + fmt(fStart) + '</b>: the best expected revenue from the start.') +
        '<h3>The best rule (the policy)</h3><div class="gr-tablewrap"><table class="gr-policy" id="policy-table"><tr><th>Circle</th>' + TYPES.map(ty => '<th>If ' + ty.name + '</th>').join('') + '<th>f</th></tr>' + policyRows + '</table></div>' +
        '<p>Accept every request that fits, <b>except</b>: ' + waitText + '. Then wait. Like slide 24 says for the inventory model: the decision depends on what has happened, so the answer is a rule, not one fixed plan.</p>' +
        '<p id="greedy-compare">“Accept whatever fits” earns <b>' + fmt(GREEDY_VALUE) + '</b> on average. The best rule earns <b>' + fmt(fStart) + '</b>, which is ' + fmt(fStart - GREEDY_VALUE) + ' more.</p>' +
        (S.showLists ? listsTable() : '<div class="gk-row">' + btn('data-do="showLists"', 'Check with all ' + ALL_LISTS.length + ' request lists') + '</div>');
      return out;
    }
    function listsTable() {
      let sum = 0;
      const rows = ALL_LISTS.map(list => {
        const p = listProb(list), rev = policyTotal(list); sum += p * rev;
        return '<tr><td>' + reqText(list) + '</td><td class="amt">' + fmt(p) + '</td><td class="amt">' + rev + '</td><td class="amt">' + fmt(p * rev) + '</td></tr>';
      }).join('');
      return '<div class="gr-tablewrap"><table class="gk-receipt" id="lists-table"><tr><th>Requests (day 1, 2, 3)</th><th class="amt">Probability</th><th class="amt">Revenue with the best rule</th><th class="amt">Prob. × revenue</th></tr>' + rows +
        '<tr class="total"><td colspan="3">Sum = expected revenue</td><td class="amt" id="lists-sum">' + fmt(sum) + '</td></tr></table></div>' +
        '<p class="gk-small">The sum equals ' + fH(1, PLACES) + ' = ' + fmt(SEE.f[START]) + '. Listing all request lists works for ' + DAYS + ' days (' + ALL_LISTS.length + ' lists). With 20 days there are 2<sup>20</sup> = ' + Math.pow(2, 20).toLocaleString('en-US') + ' lists, and a rule must be found too. The backward table needs only one small sum per circle.</p>';
    }

    // --- Step 5: name the parts ---
    const slotOk = id => {
      const v = S.slots[id]; if (!v) return false;
      if (SINGLE[id]) return v === SINGLE[id];
      return PAIR[id].includes(v) && S.slots[PARTNER[id]] !== v;
    };
    const slotsOk = () => SLOT_IDS.every(slotOk);
    function renderName() {
      const nameRows = NAME_ROWS.map(r => {
        const v = S.names[r.id] || '';
        const mark = S.namesChecked && v ? (v === r.answer ? '<span style="color:var(--good)">✓</span>' : '<span style="color:var(--critical)">✗</span>') : '';
        return '<b>' + r.label + '</b><select data-name="' + r.id + '" aria-label="' + r.label.replace(/<[^>]+>/g, '') + '"><option value="">choose…</option>' +
          NAME_OPTIONS.map(o => '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select><span>' + mark + '</span>';
      }).join('');
      const namesOk = NAME_ROWS.every(r => S.names[r.id] === r.answer);
      let out = '<h2>' + title('name') + '</h2><p>You have already used every part of a probabilistic DP model. Now give each one its name.</p>' +
        '<div class="gk-names">' + nameRows + '</div><div class="gk-row">' + btn('data-do="namesCheck"', 'Check names', ' primary') + '</div>';
      if (S.namesChecked) {
        const wrong = NAME_ROWS.filter(r => S.names[r.id] && S.names[r.id] !== r.answer), empty = NAME_ROWS.filter(r => !S.names[r.id]);
        out += namesOk ? fb('ok', 'Each piece of your map now has its name. Note the order of one day: state → random request (seen) → decision → reward and next state.')
          : fb('no', wrong.map(r => '<b>' + r.label + '</b>: you chose “' + NAME_OPTIONS.find(o => o[0] === S.names[r.id])[1] + '”. ' + NAME_WHY[S.names[r.id]]).join('<br>') +
            (empty.length ? (wrong.length ? '<br>' : '') + 'Still empty: ' + empty.map(r => r.label).join(', ') + '.' : ''));
      }
      if (!namesOk) return out;
      out += '<h3>Where does the max go?</h3><p>Which shape matches this story? (You see the request, then decide.)</p><div class="gr-skel">' +
        SKELETONS.map(s => btn('data-do="skel" data-v="' + s.id + '"', s.text + '<span class="cap">' + s.cap + '</span>', S.skel === s.id ? ' picked' : '')).join('') + '</div>';
      if (!S.skel) return out;
      if (S.skel !== 'inside') return out + fb('no', SKELETON_WHY[S.skel]);
      out += fb('ok', 'The max sits <b>inside</b> the average: one best choice per request type, then the probabilities. That is exactly what you did in step 4.');
      const slot = id => {
        const v = S.slots[id], state = S.slotsChecked && v ? (slotOk(id) ? ' ok' : ' no') : '';
        return '<span class="gk-slot' + (S.slotSel === id ? ' sel' : '') + state + '" data-do="slot" data-slot="' + id + '" role="button" tabindex="0" title="' + SLOT_ROLE[id] + '">' + (v ? tileLabel(v) : '&nbsp;') + '</span>';
      };
      out += '<h3>Build the recursion</h3><p>Click a box, then a tile. Click a filled box to empty it. A tile can be used more than once. Some tiles are traps.</p>' +
        '<div class="gk-formula" id="formula">f<sub>t</sub>(c) = ' + slot('w1') + ' · max{ ' + slot('s1') + ' , ' + slot('s2') + ' } <span class="gk-cap">(small request)</span><br>' +
        '&nbsp;&nbsp;&nbsp;+ ' + slot('w2') + ' · max{ ' + slot('l1') + ' , ' + slot('l2') + ' } <span class="gk-cap">(large request)</span><br>' +
        'f<sub>' + END + '</sub>(c) = ' + slot('b') + ' <span class="gk-cap">(End)</span></div>' +
        '<p class="gk-small">If a large request does not fit (c &lt; ' + LARGE.size + '), its max keeps only the reject option. Selected box: ' + SLOT_ROLE[S.slotSel] + '</p>' +
        '<div class="gk-bank">' + TILES.map(x => '<button class="gk-tile" data-do="tile" data-tile="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
        '<div class="gk-row">' + btn('data-do="slotsCheck"', 'Check the recursion', ' primary') + (S.slotsChecked && !slotsOk() ? btn('data-do="slotsShow"', 'Show me') : '') + '</div>';
      if (!S.slotsChecked) return out;
      if (slotsOk()) {
        const k = MAP_ASK, [t, c] = parseKey(k), P = SEE.parts[k];
        return out + fb(S.helped.name ? 'shown' : 'ok', 'This is the recursion. Test it on one circle of your map: ' + fH(t, c) + ' = ' + SMALL.p + ' · max{ ' + fmt(P.S.rej) + ' , ' + fmt(P.S.acc) + ' } + ' + LARGE.p + ' · max{ ' + fmt(P.L.rej) + ' , ' + fmt(P.L.acc) + ' } = ' + SMALL.p + ' · ' + fmt(P.S.best) + ' + ' + LARGE.p + ' · ' + fmt(P.L.best) + ' = <b>' + fmt(SEE.f[k]) + '</b>, the number in that circle.');
      }
      return out + fb('no', SLOT_IDS.filter(id => !slotOk(id)).map(id => {
        const v = S.slots[id];
        if (!v) return SLOT_ROLE[id] + ' (empty)';
        if (PAIR[id] && PAIR[id].includes(v)) return '<b>' + tileLabel(v) + '</b>: this bracket needs two different choices: reject and accept.';
        const why = (SLOT_WHY[id] || {})[v] || (PAIR[id] ? PAIR_WHY[v] : null) || ('not this one. ' + SLOT_ROLE[id]);
        return '<b>' + tileLabel(v) + '</b>: ' + why;
      }).join('<br>'));
    }

    // --- Step 6: twist ---
    function renderTwist() {
      const tw = S.twist;
      let out = '<h2>' + title('twist') + '</h2>' +
        '<p>New rule: each morning, <b>before</b> the request arrives, the workshop must announce one of two rules: “today we accept any request that fits” or “today we take no request”. Everything else stays the same.</p>' +
        '<h3>Which part of the model changes?</h3><div class="gk-row">' +
        PIECES.map(p => btn('data-do="piece" data-v="' + p[0] + '"', p[1], tw.piece === p[0] ? ' picked' : '')).join('') + '</div>';
      if (!tw.piece) return out;
      if (tw.piece !== 'maxpos') return out + fb('no', PIECES.find(p => p[0] === tw.piece)[2] + ' Try again.');
      out += fb('ok', 'Now you choose before you see the request, so the max moves <b>outside</b> the average: f<sub>t</sub>(c) = max{ ' + SMALL.p + ' · (' + SMALL.fee + ' + ' + fN('c−' + SMALL.size) + ') + ' + LARGE.p + ' · (' + LARGE.fee + ' + ' + fN('c−' + LARGE.size) + ', or ' + fN('c') + ' if it does not fit) , ' + fN('c') + ' }. This is the trap formula from step 5, and the lecture’s usual order (slides 4–5 and 25): decide, then the random outcome.');
      const dBtn = (id, text) => btn('data-do="dir" data-v="' + id + '"' + (tw.dir ? ' disabled' : ''), text, tw.dir === id ? ' picked' : '');
      out += '<h3>Predict</h3><p>What happens to ' + fH(1, PLACES) + ', the best expected revenue from the start?</p><div class="gk-row">' + dBtn('up', 'It goes up') + dBtn('same', 'It stays the same') + dBtn('down', 'It goes down') + '</div>';
      if (!tw.dir) return out;
      if (!tw.checked) {
        return out + '<h3>Predict, then check</h3><p>This is your solved map from step 4. At which circles does the <b>value</b> change under the new rule? Click them, then press Check.</p>' +
          mapSVG({ values: SEE.f, best: Object.fromEntries(DECISION_NODES.map(k => [k, bestArcs(k)])), marks: tw.marks, clickable: k => DECISION_NODES.includes(k) }) +
          '<div class="gk-row">' + btn('data-do="twistCheck"', 'Check: recompute with the max outside', ' primary') + '<span class="gk-small">' + tw.marks.length + ' circle(s) marked</span></div>';
      }
      const dropped = SEE.f[START] - ANNOUNCE.f[START];
      const realDir = dropped > EPS ? 'down' : dropped < -EPS ? 'up' : 'same';
      out += tw.dir === realDir
        ? fb('ok', 'It goes ' + (realDir === 'same' ? 'nowhere' : realDir) + ': from ' + fmt(SEE.f[START]) + ' to ' + fmt(ANNOUNCE.f[START]) + '. Deciding with less information can never earn more on average.')
        : fb('no', 'You predicted “' + { up: 'up', same: 'the same', down: 'down' }[tw.dir] + '”. It goes ' + realDir + ': from ' + fmt(SEE.f[START]) + ' to ' + fmt(ANNOUNCE.f[START]) + '. Deciding with less information can never earn more on average.');
      out += '<h3>The map after the change</h3>' + mapSVG({ values: ANNOUNCE.f, marks: tw.marks, changed: CHANGED_BY_ANNOUNCE, endLabel: 'End' }) +
        '<p class="gk-small">Thick purple ring = the value changed. Blue fill = you marked it.</p>';
      const hits = CHANGED_BY_ANNOUNCE.filter(k => tw.marks.includes(k)), extra = tw.marks.filter(k => !CHANGED_BY_ANNOUNCE.includes(k));
      const lines = CHANGED_BY_ANNOUNCE.map(k => (tw.marks.includes(k) ? '✓ ' : '• ') + '<b>' + nodeName(k) + '</b>: before ' + fmt(SEE.f[k]) + ', now ' + fmt(ANNOUNCE.f[k]) + '.');
      extra.forEach(k => lines.push('✗ <b>' + nodeName(k) + '</b>: still ' + fmt(ANNOUNCE.f[k]) + '.'));
      out += fb(hits.length === CHANGED_BY_ANNOUNCE.length && !extra.length ? 'ok' : 'no', 'You found ' + hits.length + ' of ' + CHANGED_BY_ANNOUNCE.length + '.<br>' + lines.join('<br>'));
      if (DILEMMA) {
        const k = DILEMMA.k, A = ANNOUNCE.parts[k];
        out += '<p>Why? Only at <b>' + nodeName(k) + '</b> did the best choice depend on the request: wait if small, accept if large. An announced rule must treat both the same. There “accept any request that fits” (' + fmt(A.accRule) + ') beats “take no request” (' + fmt(A.rej) + '), so the small request is accepted too. Circles to the left read this value, so they change as well.</p>';
      }
      out += '<p>Seeing the request before deciding is worth <b>' + fmt(dropped) + '</b> here. The new value ' + fmt(ANNOUNCE.f[START]) + ' equals “accept whatever fits” from step 4 (' + fmt(GREEDY_VALUE) + ').</p>';
      ctx.assembled();
      return out + summaryCard();
    }
    function modelLines() {
      return [
        'Stage: day t = 1, 2, 3. State: free places c at the start of day t, before the request.',
        'Random event: the request, small (1 place, pays ' + SMALL.fee + ', prob. ' + SMALL.p + ') or large (2 places, pays ' + LARGE.fee + ', prob. ' + LARGE.p + '), seen before the decision.',
        'Decision: accept (only if it fits) or reject. Next state: c − size after accepting, c after rejecting.',
        'f_t(c) = ' + SMALL.p + ' max{ f_t+1(c), ' + SMALL.fee + ' + f_t+1(c−1) } + ' + LARGE.p + ' max{ f_t+1(c), ' + LARGE.fee + ' + f_t+1(c−2) }  (large bracket: only f_t+1(c) if c < 2), t = 3, 2, 1.',
        'f_4(c) = 0.',
        'Answer: f_1(' + PLACES + ') = ' + fmt(SEE.f[START]) + '. Accept whatever fits, except: ' + WAIT_CASES.map(w => 'day ' + w.t + ', ' + w.c + ' places, ' + w.ty.name + ' request → wait').join('; ') + '.',
        'Twist (announce before seeing): f_t(c) = max{ average of accept-if-it-fits, f_t+1(c) }; f_1(' + PLACES + ') = ' + fmt(ANNOUNCE.f[START]) + '.'
      ];
    }
    function summaryCard() {
      const helpedSteps = activity.steps.filter(s => S.status[s.id] === 'helped').map(s => s.title);
      return '<h3>Your model</h3><div class="gk-model" id="your-model">' +
        '<p><b>Stage:</b> day t = 1, 2, 3. <b>State:</b> free places c at the start of day t, before the request.</p>' +
        '<p><b>Random event:</b> the request: small (' + SMALL.p + ') or large (' + LARGE.p + '), <b>seen before</b> the decision.</p>' +
        '<p><b>Decision:</b> accept (only if it fits) or reject. <b>Reward:</b> ' + SMALL.fee + ' or ' + LARGE.fee + ' if accepted, 0 if rejected. <b>Next state:</b> c − ' + SMALL.size + ', c − ' + LARGE.size + ' or c.</p>' +
        '<p>f<sub>t</sub>(c) = ' + SMALL.p + ' · max{ ' + fN('c') + ', ' + SMALL.fee + ' + ' + fN('c−' + SMALL.size) + ' } + ' + LARGE.p + ' · max{ ' + fN('c') + ', ' + LARGE.fee + ' + ' + fN('c−' + LARGE.size) + ' }, t = 3, 2, 1. f<sub>' + END + '</sub>(c) = 0.</p>' +
        '<p><b>Answer:</b> ' + fH(1, PLACES) + ' = ' + fmt(SEE.f[START]) + '. Accept whatever fits, except ' + WAIT_CASES.map(w => 'on day ' + w.t + ' with ' + w.c + ' places and a ' + w.ty.name + ' request: wait').join('; ') + '.</p>' +
        '<p><b>Twist</b> (announce before seeing): the max moves outside the average; ' + fH(1, PLACES) + ' = ' + fmt(ANNOUNCE.f[START]) + '.</p></div>' +
        (helpedSteps.length ? '<p class="gk-small">Steps where you used “Show me”: ' + helpedSteps.join(', ') + '. Try those again later without help.</p>' : '<p class="gk-small">You did every step without “Show me”.</p>') +
        '<div class="gk-row">' + btn('id="guided-download" data-do="download"', 'Download my model') + '</div>';
    }
    const downloadLines = () => [activity.title, activity.family, '',
      ...activity.steps.map(s => s.title + ': ' + (S.status[s.id] === 'done' ? 'done' : S.status[s.id] === 'helped' ? 'done with Show me' : 'not finished')),
      '', 'Rounds I played: ' + (S.history.map(r => 'round ' + (r.round + 1) + ' = ' + runRound(roundAt(r.round), r.acts).total).join('; ') || 'none'), '', 'MODEL', ...modelLines()];

    // --- Actions ---
    const ACTIONS = {
      act(el) {
        if (S.acts.length >= DAYS) return;
        const reqs = roundAt(S.round), c = runRound(reqs, S.acts).c, ty = typeById(reqs[S.acts.length]);
        if (el.dataset.act === 'A' && !fits(ty, c)) {
          S.playMsg = fb('no', 'It does not fit: a ' + ty.name + ' request needs ' + ty.size + ' places and you have ' + c + '. A request is accepted in full or not at all, so here you can only reject.');
          return;
        }
        S.playMsg = null;
        S.acts.push(el.dataset.act);
        if (S.acts.length === DAYS) {
          S.history.push({ round: S.round, acts: S.acts.slice() });
          track('check');
          if (S.history.length >= ROUNDS_TO_FINISH) finish('play');
        }
      },
      undo() { S.acts.pop(); S.playMsg = null; },
      nextRound() { S.round += 1; S.acts = []; S.playMsg = null; },
      predict(el) { S.luck.predict = el.dataset.v; },
      luckCheck() {
        const lk = S.luck, L = luckValues();
        const vA = parseNum(lk.A), vW = parseNum(lk.W);
        if ((!lk.okA && Number.isNaN(vA)) || (!lk.okW && Number.isNaN(vW))) { lk.msg = fb('no', 'Type a number in both boxes, for example 5.6.'); return; }
        track('check');
        if (!lk.okA) lk.okA = near(vA, L.accept);
        if (!lk.okW) lk.okW = near(vW, L.wait);
        if (lk.okA && lk.okW) { lk.msg = fb('ok', 'Accept: ' + L.D.ty.fee + ' + ' + fmt(L.futA) + ' = ' + fmt(L.accept) + '. Wait: 0 + ' + fmt(L.futW) + ' = ' + fmt(L.wait) + '.'); return; }
        lk.wrong++;
        const notes = [];
        if (!lk.okA) notes.push(diagAccept(vA, L) || 'Accept: today’s ' + L.D.ty.fee + ' + for each day-' + L.nt + ' request, its probability × what you earn.');
        if (!lk.okW) notes.push(diagWait(vW, L) || 'Wait: 0 today + for each day-' + L.nt + ' request, its probability × what you earn.');
        lk.msg = fb('no', notes.join('<br>'));
      },
      luckShow() {
        const lk = S.luck, L = luckValues();
        lk.A = fmt(L.accept); lk.W = fmt(L.wait); lk.okA = lk.okW = true; showMe('luck');
        const terms = c => TYPES.map(ty => ty.p + ' × ' + (fits(ty, c) ? ty.fee : 0)).join(' + ');
        lk.msg = fb('shown', 'Accept: ' + L.D.ty.fee + ' + (' + terms(L.cA) + ') = ' + fmt(L.accept) + '. Wait: 0 + (' + terms(L.D.c) + ') = ' + fmt(L.wait) + '.');
      },
      know(el) { S.luck.know = el.dataset.v; track('check'); if (S.luck.know === 'today') finish('luck'); },
      mapCheck() {
        const q = MAP_QUESTIONS.find(x => !S.mapq[x.id].ok); if (!q || q.kind !== 'num') return;
        const st = S.mapq[q.id], v = parseNum(st.v);
        if (Number.isNaN(v)) { st.msg = fb('no', 'Type a number, for example 2.'); return; }
        track('check');
        if (near(v, q.answer)) { st.ok = true; st.msg = fb('ok', q.right); }
        else { st.wrong++; st.msg = fb('no', q.diag[String(v)] || q.hint); }
        if (mapReady()) finish('map');
      },
      mapChoice(el) {
        const q = MAP_QUESTIONS.find(x => !S.mapq[x.id].ok); if (!q || q.kind !== 'choice') return;
        const st = S.mapq[q.id]; st.v = el.dataset.v; track('check');
        if (st.v === q.answer) { st.ok = true; st.msg = fb('ok', q.right); }
        else { st.wrong++; st.msg = fb('no', q.diag[st.v] || 'Not this one.'); }
        if (mapReady()) finish('map');
      },
      mapShow() {
        const q = MAP_QUESTIONS.find(x => !S.mapq[x.id].ok); if (!q) return;
        const st = S.mapq[q.id]; st.ok = true; st.v = q.kind === 'num' ? fmt(q.answer) : q.answer; showMe('map');
        st.msg = fb('shown', q.right);
        if (mapReady()) finish('map');
      },
      node(el) {
        const k = el.dataset.node, id = stepIds[S.stage];
        if (id === 'solve') {
          if (!WORK_NODES.includes(k) || isDone(k) || doneCount() === WORK_NODES.length) return;
          if (!isReady(k, knownValues())) { S.lockMsg = 'Not yet: the arrows from ' + nodeName(k) + ' end at circles without a value. Work from right to left.'; return; }
          S.active = k;
        } else if (id === 'twist' && S.twist.piece === 'maxpos' && S.twist.dir && !S.twist.checked && DECISION_NODES.includes(k)) {
          const m = S.twist.marks; S.twist.marks = m.includes(k) ? m.filter(x => x !== k) : m.concat(k);
        }
      },
      fillCheck() {
        const k = S.active; if (!k) return;
        const F = fillOf(k), P = SEE.parts[k];
        const vS = parseNum(F.S), vL = parseNum(F.L), vF = parseNum(F.F);
        if ((!F.okS && Number.isNaN(vS)) || (!F.okL && Number.isNaN(vL)) || (!F.okF && Number.isNaN(vF))) { F.msg = fb('no', 'Type a number in all three boxes, for example 7.2.'); return; }
        track('check');
        F.tried = true;
        if (!F.okS) F.okS = near(vS, P.S.best);
        if (!F.okL) F.okL = near(vL, P.L.best);
        if (!F.okF) F.okF = near(vF, SEE.f[k]);
        if (F.okS && F.okL && F.okF) { completeNode(k, 'ok'); return; }
        F.wrong++;
        const notes = [];
        if (!F.okS) notes.push(diagBest(k, SMALL, vS));
        if (!F.okL) notes.push(diagBest(k, LARGE, vL));
        if (!F.okF) notes.push(diagF(k, vF, F.okS ? P.S.best : vS, F.okL ? P.L.best : vL));
        const specific = notes.filter(Boolean), ex = exprs(k, 0);
        const generic = F.wrong >= 2
          ? 'Here are the numbers. Small: ' + ex.S + ' ?  Large: ' + ex.L + ' ?'
          : 'Each box: the larger of reject (value where the gray arrow ends) and accept (fee + value where the accept arrow ends). Then average with ' + SMALL.p + ' and ' + LARGE.p + '.';
        F.msg = fb('no', specific.length ? specific.join('<br>') + (specific.length < notes.length ? '<br>' + generic : '') : generic);
      },
      fillShow() {
        const k = S.active; if (!k) return;
        const F = fillOf(k), P = SEE.parts[k];
        F.S = fmt(P.S.best); F.L = fmt(P.L.best); F.F = fmt(SEE.f[k]); F.okS = F.okL = F.okF = true; showMe('solve');
        completeNode(k, 'shown');
      },
      showLists() { S.showLists = true; },
      namesCheck() { S.namesChecked = true; track('check'); },
      skel(el) { S.skel = el.dataset.v; track('check'); },
      slot(el) { const id = el.dataset.slot; delete S.slots[id]; S.slotSel = id; S.slotsChecked = false; },
      tile(el) {
        const target = S.slotSel && !S.slots[S.slotSel] ? S.slotSel : SLOT_IDS.find(s => !S.slots[s]);
        if (!target) return;
        S.slots[target] = el.dataset.tile; S.slotsChecked = false;
        S.slotSel = SLOT_IDS.find(s => !S.slots[s]) || target;
      },
      slotsCheck() { S.slotsChecked = true; track('check'); if (slotsOk()) finish('name'); },
      slotsShow() { S.slots = Object.assign({}, SLOT_SOLUTION); showMe('name'); S.slotsChecked = true; finish('name'); },
      piece(el) { S.twist.piece = el.dataset.v; track('check'); },
      dir(el) { S.twist.dir = el.dataset.v; },
      twistCheck() { S.twist.checked = true; finish('twist'); track('twist'); },
      download() { ctx.download(downloadLines()); return false; }
    };

    // --- What the kit shows ---
    return {
      dataCard: '<h3>The data (always here)</h3><table class="gk-table">' +
        '<tr><th>Request</th><th>Places</th><th>Pays</th><th>Prob.</th></tr>' +
        TYPES.map(ty => '<tr><td>' + ty.name + '</td><td>' + ty.size + '</td><td>' + ty.fee + '</td><td>' + ty.p + '</td></tr>').join('') + '</table>' +
        '<p>The workshop has <b>' + PLACES + ' free places</b> and takes bookings for <b>' + DAYS + ' days</b>. Exactly one request arrives each day; days are independent.</p>' +
        '<p><b>One day:</b></p><ol class="gk-strip"><li>a request arrives — you see it</li><li>accept it (only if it fits) or reject it</li><li>accepted places are gone; a rejected request does not come back</li></ol>' +
        '<p class="gk-small">After day ' + DAYS + ' the workshop starts. Free places then earn nothing. A request is accepted in full or not at all.</p>' +
        '<p class="gk-small gk-muted">This story is made up for practice. The lecture’s own Week 9 examples are the milk stores (slides 6–12), the inventory model (slides 13–24), Sally at the bank (slides 26–33) and the reject allowances (slides 34–45).</p>',
      steps: { play: renderPlay, luck: renderLuck, map: renderMap, solve: renderSolve, name: renderName, twist: renderTwist },
      actions: ACTIONS,
      // WHY: steps 4 and 6 read the arrows and End values that step 3 establishes.
      gate: Object.fromEntries(['solve', 'twist'].map(id => [id, { ready: mapReady, step: 'map', text: 'This step uses the arrows and End values from step 3. Please finish step 3 first.' }])),
      onInput(t) {
        if (t.dataset.luck) S.luck[t.dataset.luck] = t.value;
        if (t.dataset.mapq) S.mapq[t.dataset.mapq].v = t.value;
        if (t.dataset.fill) fillOf(t.dataset.fill)[t.dataset.side] = t.value;
      },
      onChange(t) {
        if (!t.dataset.name) return false;
        S.names[t.dataset.name] = t.value; S.namesChecked = false;
        return true;
      }
    };
  }

  window.GUIDED_CUSTOM.reservations = (app, opts) => window.GUIDED_KIT.mount(app, opts, { fresh, build });
})();
