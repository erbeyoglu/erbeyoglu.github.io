/* Week 4 KKT animations: six scenes on week04.html, in slide order on the page
   and in the deck (Lagrange after slide 13, change one variable after 20,
   λ as a price after 22, x ≥ 0 after 26, when KKT is enough after 27,
   Example 2 after 35). Needs lecture-animations.js. */

/* =====================================================================
   WEEK 4 · KKT — shared example data
   Always a max problem with ≤ constraints, as in the slides. Conditions are
   written exactly as on slides 17, 26 and 35; their group names follow the
   instructor's board: (1)(2) stationarity, (3) complementary slackness,
   (4)(5) primal feasibility, (6) dual feasibility.
   ===================================================================== */
window.KKT = (() => {
  // Example 2 of slide 13: revenue in $1000s, x = TV minutes, y = radio
  // minutes; TV costs 3 and radio 1 ($1000 per minute).
  const R = v => -2 * v[0] ** 2 - v[1] ** 2 + v[0] * v[1] + 8 * v[0] + 3 * v[1];
  const gradR = v => [-4 * v[0] + v[1] + 8, v[0] - 2 * v[1] + 3];
  const TOP = [19 / 7, 20 / 7];          // where ∇R = 0
  const H = [[-4, 1], [1, -2]];          // Hessian of R
  const RTOP = R(TOP);                   // 106/7
  // On a budget line 3x + y = b, ∇R = λ(3, 1) gives y = x + 1/7, so the best
  // plan that spends exactly b is x = (b − 1/7)/4, with λ = (11 − b)/4.
  const onBudget = b => { const x = (b - 1 / 7) / 4; return [x, x + 1 / 7]; };
  const lamEq = b => (11 - b) / 4;
  const bestEq = b => RTOP - (11 - b) ** 2 / 8;   // R at onBudget(b); its slope in b is lamEq(b)
  const R_TEX = 'R(x, y) = -2x^2 - y^2 + xy + 8x + 3y';
  // Condition (1) of slide 17 for this example, one row per variable, with the
  // numbers at the point: ∂R/∂x − 3λ and ∂R/∂y − λ, because g = 3x + y.
  // `zero` is true when the term rounds to 0 at two decimals. `show` writes a
  // number: each scene passes the style its own texts use (fractions in scene
  // 2, decimals in scene 3).
  const DG = [3, 1];
  function stationarityRows(point, lam, show) {
    const g = gradR(point);
    const lamTex = lam < 0 ? '(' + show(lam) + ')' : show(lam);
    return ['x', 'y'].map((name, j) => {
      const term = g[j] - lam * DG[j], zero = Math.abs(term) < 5e-3;
      const times = DG[j] === 1 ? '' : DG[j];
      return {
        tag: '(1) stationarity', zero,
        tex: '\\tfrac{\\partial R}{\\partial ' + name + '} - ' + times + '\\lambda = 0',
        vals: show(g[j]) + ' - ' + (times ? times + ' \\cdot ' : '') + lamTex + ' = ' + (zero ? '0' : show(term) + ' \\ne 0')
      };
    });
  }
  return { R, gradR, TOP, H, RTOP, onBudget, lamEq, bestEq, R_TEX, stationarityRows, LEVELS: [15, 14, 12.5, 10.5, 8, 5] };
})();

/* KKT SCENE 1 · LAGRANGE (slides 6–9, on the slide 13 example spent exactly)
   L(x, y, λ) = R + λ[10 − 3x − y]. On the line the bracket is 0, so L = R there
   for every λ; the top of L moves with λ and sits on the line at λ = 1/4. */
(() => {
  const { R, gradR, TOP, H, RTOP, LEVELS, R_TEX } = KKT;
  const { num, fracText, colors, ellipse, tex } = ANIM;
  const root = document.getElementById('kkt-lagrange');
  const $ = sel => root.querySelector(sel);
  const B = 10;
  const L = lam => v => R(v) + lam * (B - 3 * v[0] - v[1]);
  // For a fixed λ the top of L solves ∇R = λ(3, 1): x − top = λ H⁻¹(3, 1) = −λ(1, 1).
  const topOfL = lam => [TOP[0] - lam, TOP[1] - lam];
  const DOM = [[1, 4], [0.5, 5]];
  const LINE = [[5 / 3, 5], [19 / 6, 0.5]];   // the part of 3x + y = 10 over the drawn square
  const CAMERA = [0.72, 0.55];
  const FACE = [-Math.atan2(LINE[1][1] - LINE[0][1], LINE[1][0] - LINE[0][0]), 0.12];
  const s3d = ANIM.surface3d({ root, canvas: $('.js-canvas'), redraw: smooth => draw3D(smooth), onSpin: on => $('.js-spin').setAttribute('aria-pressed', String(on)) });
  s3d.setSpace(DOM, 0, 16.5);   // fixed heights, so the tilt of L is visible
  s3d.view.yaw = CAMERA[0]; s3d.view.elev = CAMERA[1];
  const rMesh = s3d.mesh(R, LEVELS, 30);
  let lMesh = null, lMeshLam = NaN;

  const STEPS = [
    { kind: 'problem', lam: 0 },
    { kind: 'lagrangian', lam: 0 },
    { kind: 'turn', lam: 0, anim: p => 0.8 * Math.sin(Math.PI * p), dur: 2800 },
    { kind: 'lam0', lam: 0 },
    { kind: 'slide', lam: 0.25, anim: p => 0.25 * p, dur: 2000 },
    { kind: 'solved', lam: 0.25 }
  ];
  const TEXT = {
    problem: { title: 'Example 2 (slide 13): spend exactly $10,000.',
      text: 'R is the revenue in $1000s. x = TV minutes, y = radio minutes. One TV minute costs 3 and one radio minute costs 1 (in $1000). So the plan must satisfy 3x + y = 10: only points on the line under the vertical plane are allowed. The top of R would spend 11, which is too much.',
      // The whole model, one part per line, as it would be written on the board.
      formula: '\\begin{aligned} \\max\\quad & R(x, y) = -2x^2 - y^2 + xy + 8x + 3y \\\\ \\text{s.t.}\\quad & 3x + y = 10 \\\\ & x,\\ y \\ge 0 \\end{aligned}' },
    lagrangian: { title: 'Form the Lagrangian (slide 6).',
      text: 'Add λ times the bracket [b − g(x)]. On the line this bracket is 0, so L = R there (slide 7). The black curve on the vertical plane lies on both surfaces.',
      formula: '\\begin{aligned} L(x, y, \\lambda) &= R(x, y) + \\lambda\\,[\\,10 - 3x - y\\,] \\\\ &= -2x^2 - y^2 + xy + 8x + 3y \\\\ &\\quad + \\lambda\\,[\\,10 - 3x - y\\,] \\end{aligned}' },
    turn: { title: 'Change λ: L turns around the black curve.',
      text: 'Away from the line, L − R = λ(10 − 3x − y), so L tilts when λ changes. The grey lines show R. On the line nothing moves. Try the λ slider.',
      formula: 'L - R = \\lambda\\,(10 - 3x - y) = 0 \\ \\text{ on the line}' },
    lam0: { title: 'λ = 0: the top of L is the top of R.',
      text: 'Where is the highest point of L? At λ = 0 it is the top of R. But that point spends 3x + y = 11, so it is not on the line.',
      formula: '\\lambda = 0:\\quad \\tfrac{\\partial L}{\\partial \\lambda} = 10 - 3x - y = -1 \\ne 0' },
    slide: { title: 'Set every partial derivative of L to zero (slide 8).',
      text: 'At the top of L, ∂L/∂x = 0 and ∂L/∂y = 0, for every λ. When λ grows, the top moves along the dashed line. ∂L/∂λ = 10 − 3x − y shows how far the top still is from the budget line.',
      formula: '\\begin{aligned} \\tfrac{\\partial L}{\\partial x} &= -4x + y + 8 - 3\\lambda = 0 \\\\ \\tfrac{\\partial L}{\\partial y} &= x - 2y + 3 - \\lambda = 0 \\\\ \\tfrac{\\partial L}{\\partial \\lambda} &= 10 - 3x - y = 0 \\end{aligned}' },
    solved: { title: 'λ = 1/4: all partial derivatives are zero.',
      text: 'Now the top of L is on the budget line. The last equation is the constraint itself (slide 9). So λ is the number that moves the top of L onto the constraint. L is a single hill here (R is concave, the bracket is linear), so the point where its slopes are 0 is its top. Why is this point the optimum? Look at the black curve: it is R on the line, and it lies on the surface of L. No point of L is higher than the top of L. Now the top of L sits on the black curve, so it is the highest point of the curve: the best R on the line.',
      formula: '\\lambda = \\tfrac14,\\quad (\\bar x, \\bar y) = \\big(\\tfrac{69}{28}, \\tfrac{73}{28}\\big) \\approx (2.464,\\ 2.607),\\quad R \\approx 15.018' }
  };
  const state = { lam: 0 };
  const stepper = ANIM.kktScene({
    root, steps: STEPS, state,
    apply: (st, s, p) => { st.lam = s.anim && p < 1 ? s.anim(p) : s.lam; },
    paint: index => { syncSlider(index); draw3D(false); renderSide(index); },
    onActivate: () => s3d.resume(), onDeactivate: () => s3d.stop(),
    debug: () => { const t = topOfL(state.lam); return { top: t, gap: B - 3 * t[0] - t[1] }; }
  });

  function draw3D(smooth = false) {
    const c = colors(), lam = state.lam, index = stepper.index;
    if (lam !== lMeshLam) { lMesh = s3d.mesh(L(lam), LEVELS, 30); lMeshLam = lam; }
    const meshes = [{ mesh: lMesh, mode: 'solid' }];
    if (Math.abs(lam) > 1e-6) meshes.push({ mesh: rMesh, mode: 'ghost', width: 2.4, alpha: 0.8 });
    const lines = [{ pts: LINE, color: c.ink2, width: 2.4 }];
    if (index >= 3) lines.push({ pts: [topOfL(0), topOfL(1)], color: c.s5, width: 1.6, dash: [6, 5] });
    s3d.draw({
      meshes, fit: rMesh.pts,
      planes: [{ a: LINE[0], b: LINE[1], alpha: 0.12 }],
      floor: { ticks: [[1, 2, 3, 4], [1, 2, 3, 4, 5]], contours: [15, 13, 10, 6].map(l => ellipse(TOP, H, RTOP, l)), lines, names: ['x', 'y'] },
      overlay: api => overlay(api, lam, index)
    }, smooth);
  }
  function overlay(api, lam, index) {
    const { c, fs } = api;
    const hinge = [];
    for (let k = 0; k <= 60; k++) { const x = LINE[0][0] + (LINE[1][0] - LINE[0][0]) * k / 60; hinge.push(api.onSurface(R, [x, B - 3 * x], 0.01)); }
    api.polyline(hinge, c.ink, 4.4);
    if (index >= 1) api.label('L = R on the line', hinge[4], 0.4, -1.5);
    if (index === 0 || index >= 3) {
      const top = topOfL(lam);
      const p = api.onSurface(L(lam), top, 0.015), base = api.fl(top[0], top[1]);
      api.dashed(p, base, c.ink2);
      api.disc(base, fs * 0.14, c.ink2);
      const onLine = index >= 3 && Math.abs(B - 3 * top[0] - top[1]) < 0.004;
      api.disc(p, fs * 0.36, onLine ? c.s2 : c.ink);
      if (onLine) api.ring(p, fs * 0.62, c.s2);
      api.label(index === 0 ? 'top of R' : 'top of L', p, 0.7, -0.8);
    }
  }
  function syncSlider(index) {
    const slider = $('.js-slider');
    slider.disabled = index < 2;
    $('.js-reset').disabled = index < 2;
    slider.value = String(state.lam);
    $('.js-slider-value').textContent = fracText(Math.round(state.lam * 1000) / 1000);
  }
  $('.js-slider').addEventListener('input', e => {
    let v = Number(e.target.value);
    if (Math.abs(v - 0.25) < 0.012) v = 0.25;   // easy to land on the answer
    state.lam = v;
    stepper.repaint();
  });
  function renderSide(index) {
    ANIM.setText(root, TEXT[STEPS[index].kind]);
    const top = topOfL(state.lam), g = gradR(top);
    const showMeters = index >= 3;
    $('.js-meters').hidden = !showMeters;
    if (showMeters) ANIM.meters($('.js-meters'), [
      { tex: '\\tfrac{\\partial L}{\\partial x} = -4x + y + 8 - 3\\lambda', value: g[0] - 3 * state.lam, scale: 2 },
      { tex: '\\tfrac{\\partial L}{\\partial y} = x - 2y + 3 - \\lambda', value: g[1] - state.lam, scale: 2 },
      { tex: '\\tfrac{\\partial L}{\\partial \\lambda} = 10 - 3x - y', value: B - 3 * top[0] - top[1], scale: 2 }
    ], 'Values at the top of L:');
    ANIM.stats($('.js-stats'), [
      ['λ', fracText(Math.round(state.lam * 1000) / 1000)],
      [index === 0 ? 'top of R' : 'top of L', '(' + num(top[0], 3) + ', ' + num(top[1], 3) + ')'],
      ['3x + y there', num(3 * top[0] + top[1], 3)]
    ]);
  }
  root.querySelectorAll('.js-view').forEach(btn => btn.addEventListener('click', () => {
    const v = btn.dataset.view === 'persp' ? CAMERA : btn.dataset.view === 'top' ? [0, Math.PI / 2] : FACE;
    s3d.setView(v[0], v[1]);
  }));
  $('.js-spin').addEventListener('click', () => s3d.setSpin(!s3d.view.spin));
  tex($('.js-caption'), '\\max\\; ' + R_TEX + ' \\quad \\text{s.t.}\\; 3x + y = 10,\\ \\ x,\\ y \\ge 0');
})();

/* KKT SCENE 2 · λ AS A PRICE (slides 18, 21, 22)
   "Spend at most b": λ is the slope of the best revenue in b. It falls to 0
   at b = 11, stays 0 while the budget is slack, and is never negative. The
   same problem with "= b" is dashed: there λ may turn negative. */
(() => {
  const { TOP, H, RTOP, LEVELS, onBudget, lamEq, bestEq, R_TEX, stationarityRows } = KKT;
  const { num, fracText, fracTex, texNum, colors, ellipse, clipHalfPlane, tex } = ANIM;
  const root = document.getElementById('kkt-price');
  const $ = sel => root.querySelector(sel);
  const MAP = { x: [0.9, 4.1], y: [0.6, 5.4] };
  const VALUE = { x: [8, 13], y: [13.95, 15.4] };
  // "At most b": below 11 the budget binds; from 11 on the best plan is the top of R.
  const lamLe = b => Math.max(0, lamEq(b));
  const bestLe = b => (b < 11 ? bestEq(b) : RTOP);
  const planLe = b => (b < 11 ? onBudget(b) : TOP);
  const STEPS = [
    { kind: 'problem', b: 10 }, { kind: 'price', b: 10 }, { kind: 'delta', b: 10 },
    { kind: 'to11', from: 10, b: 11, dur: 2000 }, { kind: 'slack', from: 11, b: 12.5, dur: 2000 },
    { kind: 'sign', b: 12.5 }, { kind: 'equality', b: 12.5 }
  ];
  const TEXT = {
    problem: { title: 'Same example, now “spend at most b”.',
      text: 'Now the constraint is 3x + y ≤ b, so we may also spend less. At b = 10 the best plan still uses all of the budget, because the top of R needs 11.',
      formula: '\\begin{aligned} \\max\\quad & R(x, y) = -2x^2 - y^2 + xy + 8x + 3y \\\\ \\text{s.t.}\\quad & 3x + y \\le b \\qquad (\\lambda) \\\\ & x,\\ y \\ge 0 \\end{aligned}' },
    price: { title: 'λ is the shadow price of the budget (slide 18).',
      text: 'The right graph shows the best revenue for each budget b. Its slope at b = 10 is λ = 1/4. So one more $1000 of budget brings about $250 more revenue.',
      formula: '\\lambda = \\text{slope of the best } R \\text{ at } b = 10 = \\tfrac14' },
    delta: { title: 'It is only approximate (slide 18).',
      text: 'Raise b from 10 to 11. The tangent says +0.25 (that is λΔ). The curve says +0.125. λ gives the rate at b = 10. For a big change the true answer is different.',
      formula: '\\lambda\\Delta = 0.25 \\quad\\text{vs.}\\quad R^*(11) - R^*(10) = 0.125' },
    to11: { title: 'More budget, smaller λ.',
      text: 'When b grows, the best plan moves toward the top of R, and λ = (11 − b)/4 gets smaller. At b = 11 the constraint is still binding (fully used), but λ = 0. So a binding constraint can have λ = 0.',
      formula: '\\lambda = \\tfrac{11 - b}{4} \\ \\ (b \\le 11), \\qquad b = 11:\\ \\ g(\\bar x) = b,\\ \\ \\lambda = 0' },
    slack: { title: 'b > 11: the constraint is slack, so λ = 0 (slide 21).',
      text: 'The best plan stays at the top of R, and some money is not used (slack). Extra budget is worth nothing, so the curve is flat. Condition (2): if g(x̄) < b, then λ = 0. If λ > 0, the constraint is binding.',
      formula: 'g(\\bar x) < b \\;\\Rightarrow\\; \\lambda = 0, \\qquad \\lambda > 0 \\;\\Rightarrow\\; g(\\bar x) = b' },
    sign: { title: 'Why λ ≥ 0 (slide 22).',
      text: 'A bigger b gives us more choices. In a max problem the best value cannot go down, so the curve never goes down. The change Δλ is ≥ 0 when Δ > 0. This is condition (4).',
      formula: '\\Delta > 0:\\ \\ \\Delta\\lambda \\ge 0 \\;\\Rightarrow\\; \\lambda \\ge 0' },
    equality: { title: 'With “= b”, λ can be negative.',
      text: 'Dashed curve: the same problem with 3x + y = b. Now a bigger b means we must spend more. Above 11 this lowers the revenue, so the slope is negative. For an equality constraint we skip complementary slackness and dual feasibility.',
      formula: '3x + y = b:\\quad \\lambda = \\tfrac{11 - b}{4} = -\\tfrac38 \\ \\text{ at } b = 12.5' }
  };
  const state = { b: 10 };
  const stepper = ANIM.kktScene({
    root, steps: STEPS, state,
    apply: (st, s, p) => { st.b = s.from != null && p < 1 ? s.from + (s.b - s.from) * p : s.b; },
    paint: index => { sync(); drawMap(index); drawValue(index); renderSide(index); },
    debug: () => ({ lamLe: lamLe(state.b), lamEq: lamEq(state.b), plan: planLe(state.b), bestLe: bestLe(state.b), bestEq: bestEq(state.b) })
  });

  function drawMap(index) {
    const m = ANIM.plot2d($('.js-map'), root, MAP, { equal: true, padL: 2.2 });
    if (!m) return;
    const { c, fs } = m, b = state.b, eq = index >= 6;
    m.grid([1, 2, 3, 4], [1, 2, 3, 4, 5], { xlabel: 'x (TV)', ylabel: 'y (radio)', fx: v => num(v, 0), fy: v => num(v, 0) });
    const rect = [[MAP.x[0], MAP.y[0]], [MAP.x[1], MAP.y[0]], [MAP.x[1], MAP.y[1]], [MAP.x[0], MAP.y[1]]];
    m.poly(clipHalfPlane(rect, [3, 1], b), { fill: c.region, opacity: eq ? 0.25 : 0.6 });
    LEVELS.forEach(l => m.curve(ellipse(TOP, H, RTOP, l), { stroke: c.s1, 'stroke-width': 1.3, opacity: 0.5 }));
    const a = [(b - MAP.y[1]) / 3, MAP.y[1]], z = [(b - MAP.y[0]) / 3, MAP.y[0]];
    m.line(a, z, { stroke: c.ink2, 'stroke-width': 2.4 });
    m.text([Math.max(MAP.x[0], a[0]), MAP.y[1]], eq ? '3x + y = b' : '3x + y ≤ b', { dx: 0.5, dy: 1.3 });
    m.line([TOP[0] - 0.08, TOP[1]], [TOP[0] + 0.08, TOP[1]], { stroke: c.ink, 'stroke-width': 2 }, true);
    m.line([TOP[0], TOP[1] - 0.08], [TOP[0], TOP[1] + 0.08], { stroke: c.ink, 'stroke-width': 2 }, true);
    const plan = planLe(b);
    const atTop = Math.hypot(plan[0] - TOP[0], plan[1] - TOP[1]) < 0.03;
    if (!atTop) m.text(TOP, 'top of R', { dx: 0.5, dy: -0.5 });
    m.ring(plan, fs * 0.6, c.s2);
    m.dot(plan, fs * 0.26, c.s2);
    m.text(plan, atTop ? 'best plan = top of R' : 'best plan', { dx: 0.8, dy: 1.2 });
    if (eq) {
      const pe = onBudget(b);
      m.dot(pe, fs * 0.3, c.surface, { stroke: c.ink, 'stroke-width': 2.5 });
      m.text(pe, 'with “= b”: this plan', { dx: 0.7, dy: 0.35 });
    }
  }
  function drawValue(index) {
    const v = ANIM.plot2d($('.js-value'), root, VALUE, { padL: 3.0 });
    if (!v) return;
    const { c, fs } = v, b = state.b, eq = index >= 6;
    v.grid([8, 9, 10, 11, 12, 13], [14, 14.5, 15], { xlabel: 'budget b', ylabel: 'best R', fx: n => num(n, 0), fy: n => num(n, 1) });
    const sample = f => Array.from({ length: 101 }, (_, k) => { const bb = 8 + 5 * k / 100; return [bb, f(bb)]; });
    if (eq) v.curve(sample(bestEq), { stroke: c.ink2, 'stroke-width': 2.5, 'stroke-dasharray': '7 5' });
    v.curve(sample(bestLe), { stroke: c.s1, 'stroke-width': 3.2 });
    // A legend in the empty top-left corner instead of labels that would cross the curves.
    const legend = [['spend at most b (≤)', c.s1, null]];
    if (eq) legend.push(['spend exactly b (=): slope λ = ' + fracText(lamEq(b)), c.ink2, '7 5']);
    legend.forEach(([text, color, dash], k) => {
      const y = VALUE.y[1] - 0.06 - k * 0.075;
      const attrs = { stroke: color, 'stroke-width': 3 };
      if (dash) attrs['stroke-dasharray'] = dash;
      v.line([8.15, y], [8.55, y], attrs, true);
      v.text([8.6, y], text, { dy: 0.3, 'font-weight': 500 });
    });
    const tangent = (value, slope, color, dashed, label) => {
      const attrs = { stroke: color, 'stroke-width': 2.6 };
      if (dashed) attrs['stroke-dasharray'] = '6 4';
      v.line([b - 1.1, value - 1.1 * slope], [b + 1.1, value + 1.1 * slope], attrs);   // clipped to the chart
      if (label) v.text([b - 1.1, value - 1.1 * slope], 'slope λ = ' + fracText(slope), { dy: 1.3 });
    };
    if (index >= 1 && !eq) tangent(bestLe(b), lamLe(b), c.s5, false, true);
    if (index === 2 && Math.abs(b - 10) < 1e-9) {
      const v10 = bestLe(10);
      v.line([10, v10], [11, v10], { stroke: c.ink2, 'stroke-dasharray': '3 3' }, true);
      v.line([11, v10], [11, v10 + 0.25], { stroke: c.s5, 'stroke-width': 3, 'stroke-dasharray': '5 3' }, true);
      v.line([11, v10], [11, bestLe(11)], { stroke: c.s1, 'stroke-width': 5 }, true);
      v.text([11, v10 + 0.25], 'λΔ = 0.25', { dx: 0.4, dy: 0.2 });
      v.text([11, bestLe(11)], 'actual: 0.125', { dx: 0.4, dy: 0.9 });
    }
    v.ring([b, bestLe(b)], fs * 0.5, c.s2);
    v.dot([b, bestLe(b)], fs * 0.22, c.s2);
    if (eq) {
      tangent(bestEq(b), lamEq(b), c.s5, true, false);
      v.dot([b, bestEq(b)], fs * 0.28, c.surface, { stroke: c.ink, 'stroke-width': 2.5 });
    }
  }
  function sync() {
    const slider = $('.js-slider');
    slider.value = String(state.b);
    $('.js-slider-value').textContent = num(state.b, 2);
  }
  $('.js-slider').addEventListener('input', e => { state.b = Number(e.target.value); stepper.repaint(); });
  function renderSide(index) {
    const kind = STEPS[index].kind, b = state.b, eq = index >= 6;
    ANIM.setText(root, TEXT[kind]);
    const plan = eq ? onBudget(b) : planLe(b);
    const lam = eq ? lamEq(b) : lamLe(b);
    const use = 3 * plan[0] + plan[1], slack = b - use;
    const skipped = eq ? ' · skipped for “=”' : '';
    ANIM.conditionList($('.js-conds'), [
      // 4 decimals keep these rows exact: b moves in steps of 0.05, so λ in steps of 0.0125.
      ...stationarityRows(plan, lam, v => ANIM.ratTex(v, 4)),
      { tag: '(2) complementary slackness' + skipped, tex: '\\lambda\\,[\\,b - g(\\bar x)\\,] = 0', vals: fracTex(lam) + ' \\cdot ' + texNum(slack, 3) + ' = 0',
        state: eq ? 'dim' : (kind === 'slack' || kind === 'to11' ? 'on' : '') },
      { tag: '(3) primal feasibility', tex: 'g(\\bar x) \\le b', vals: '3\\bar x + \\bar y = ' + texNum(use, 3) + (eq ? ' = ' : ' \\le ') + texNum(b, 2), state: '' },
      { tag: '(4) dual feasibility' + skipped, tex: '\\lambda \\ge 0', vals: '\\lambda = ' + fracTex(lam), state: eq ? 'dim' : (kind === 'sign' ? 'on' : '') }
    ]);
    ANIM.stats($('.js-stats'), [['budget b', num(b, 2)], ['λ', fracText(lam)], ['unused budget', num(slack, 3)], ['best R', num(eq ? bestEq(b) : bestLe(b), 3)]]);
  }
  tex($('.js-caption'), '\\max\\; ' + R_TEX + ' \\quad \\text{s.t.}\\; 3x + y \\le b,\\ \\ x,\\ y \\ge 0');
})();

/* KKT SCENE 3 · CHANGE ONE VARIABLE BY Δ (slides 18–20)
   The plan (2, 4) is tested with the price of the budget, λ = 1/4 — the
   multiplier the Lagrange scene finds, read as a price (slide 18). In the
   deck this scene comes after slide 20, before the "λ as a price" scene. One more unit of a variable has a gain (∂R/∂xⱼ) and a
   cost (the budget it uses, priced at λ); the term in [ ] is gain − cost. The
   bottom chart shows what $1000 earns on each channel: a term is 0 only where
   its line meets λ, so both are 0 only where the two lines cross. */
(() => {
  const { TOP, H, RTOP, LEVELS, gradR, R_TEX, stationarityRows } = KKT;
  const { num, colors, ellipse, clipHalfPlane, tex } = ANIM;
  const root = document.getElementById('kkt-move');
  const $ = sel => root.querySelector(sel);
  const MAP = { x: [0.9, 4.1], y: [0.6, 5.4] };
  const B = 10, DG = [3, 1];       // ∂g/∂x and ∂g/∂y for g = 3x + y
  const XOPT = 69 / 28, D = 0.42;  // optimum on the line; drawn length of a move Δ
  const LAM = 1 / 4;               // the multiplier of the budget at b = 10 (Lagrange scene)
  const ZERO = 5e-3;               // a term this small counts as 0 (it shows as 0 at two decimals)
  const STEPS = [
    { kind: 'setup', x: 2, lam: LAM }, { kind: 'gainX', x: 2, lam: LAM }, { kind: 'useX', x: 2, lam: LAM },
    { kind: 'costX', x: 2, lam: LAM }, { kind: 'totalX', x: 2, lam: LAM }, { kind: 'moveY', x: 2, lam: LAM },
    { kind: 'slide', fromX: 2, x: XOPT, lam: LAM, dur: 2400 }, { kind: 'why0', x: XOPT, lam: LAM }
  ];
  const TEXT = {
    setup: { title: 'Slides 18–19: is the plan (2, 4) the best one?',
      text: 'Take the plan x̄ = (2, 4) on the budget line. For this budget the Lagrange method gave λ = 1/4, and slide 18 says what λ means: one more unit of budget is worth about λ. With this price we test the plan: does a small change in one variable increase R?',
      formula: '\\bar x = (2, 4),\\quad 3\\cdot 2 + 4 = 10,\\quad \\lambda = \\tfrac14' },
    gainX: { title: 'Step 1 · One more TV minute: R goes up by (∂R/∂x)Δ.',
      text: 'At (2, 4), ∂R/∂x = 4. So one more TV minute adds about 4 (in $1000s) to the revenue. This is the gain.',
      formula: '\\tfrac{\\partial R}{\\partial x}\\,\\Delta = 4\\Delta' },
    useX: { title: 'Step 2 · It also uses budget: (∂g/∂x)Δ = 3Δ.',
      text: 'One TV minute costs 3 units of budget. This is the same as keeping x̄ and lowering the right-hand side to b − 3Δ (slide 19). The dashed line shows the budget that is left.',
      formula: 'g(\\bar x) + \\tfrac{\\partial g}{\\partial x}\\Delta \\le b \\iff g(\\bar x) \\le b - 3\\Delta' },
    costX: { title: 'Step 3 · Losing 3Δ of budget costs about λ·3Δ.',
      text: 'Each unit of budget is worth λ = 1/4 (slide 18). So the budget that one TV minute uses is worth 3 · 1/4 = 0.75. This is the cost.',
      formula: '-\\Delta\\,\\lambda\\,\\tfrac{\\partial g}{\\partial x} = -\\Delta\\cdot\\tfrac14\\cdot 3 = -0.75\\,\\Delta' },
    totalX: { title: 'Step 4 · Total change: Δ times the term in [ ] (slide 20).',
      text: 'The term in [ ] is gain minus cost: 4 − 0.75 = 3.25. It is > 0, so one more TV minute increases R. If the term were < 0, R would go down.',
      formula: '\\Delta\\Big[\\tfrac{\\partial R}{\\partial x} - \\lambda\\tfrac{\\partial g}{\\partial x}\\Big] = \\Delta\\,[\\,4 - 0.75\\,] = 3.25\\,\\Delta > 0' },
    moveY: { title: 'Now y: its term in [ ] is negative.',
      text: 'For y, the gain ∂R/∂y = −3 is negative and the cost is λ·1 = 1/4, so the term in [ ] is −3.25 < 0: fewer radio minutes help. Both terms say: move money from radio to TV. So (2, 4) is not optimal. The bottom chart shows why: $1000 more earns 1.33 on TV but −3 on radio.',
      formula: '\\Big[\\tfrac{\\partial R}{\\partial y} - \\lambda\\tfrac{\\partial g}{\\partial y}\\Big] = -3 - \\tfrac14 = -3.25 < 0' },
    slide: { title: 'Move money from radio to TV until both terms are 0.',
      text: 'x̄ moves along the line to (69/28, 73/28). TV earns less and less per $1000, radio more and more. The two lines meet at 1/4 = λ: there $1000 more on TV (0.75/3) or on radio (0.25/1) gives the same extra revenue, and both terms in [ ] are 0. You can drag x̄ or move λ.',
      formula: '\\tfrac{1}{3}\\tfrac{\\partial R}{\\partial x} = \\tfrac{0.75}{3} = \\tfrac{0.25}{1} = \\tfrac{\\partial R}{\\partial y} = \\lambda = \\tfrac14' },
    why0: { title: 'Why exactly 0? Condition (1): stationarity (slide 17).',
      text: 'x and y have no sign limits, so each one can go up or down. A positive term in [ ] means “increase it”. A negative term means “decrease it”. At an optimum no change may help, so every term must be 0.',
      formula: '\\frac{\\partial f(\\bar x)}{\\partial x_j} - \\sum_{i=1}^{m} \\lambda_i \\frac{\\partial g_i(\\bar x)}{\\partial x_j} = 0 \\qquad (j = 1, 2, \\dots, n)' }
  };
  const state = { x: 2, lam: LAM };
  const point = () => [state.x, B - 3 * state.x];
  const terms = () => { const g = gradR(point()); return [g[0] - state.lam * DG[0], g[1] - state.lam * DG[1]]; };
  // What $1000 more earns on TV and on radio for the plan with x TV minutes on the line.
  const earnAt = x => { const g = gradR([x, B - 3 * x]); return [g[0] / DG[0], g[1] / DG[1]]; };
  const stepper = ANIM.kktScene({
    root, steps: STEPS, state,
    apply: (st, s, p) => {
      st.x = s.fromX != null && p < 1 ? s.fromX + (s.x - s.fromX) * p : s.x;
      st.lam = s.lam;
    },
    paint: index => { sync(index); drawMap(index); drawGainCost(index); drawEarn(index); renderSide(index); },
    debug: () => ({ point: point(), terms: terms(), earn: earnAt(state.x) })
  });

  let lastMap = null;
  function drawMap(index) {
    const m = ANIM.plot2d($('.js-map'), root, MAP, { equal: true, padL: 2.2 });
    lastMap = m;
    if (!m) return;
    const { c, fs } = m;
    m.grid([1, 2, 3, 4], [1, 2, 3, 4, 5], { xlabel: 'x (TV)', ylabel: 'y (radio)', fx: v => num(v, 0), fy: v => num(v, 0) });
    const rect = [[MAP.x[0], MAP.y[0]], [MAP.x[1], MAP.y[0]], [MAP.x[1], MAP.y[1]], [MAP.x[0], MAP.y[1]]];
    m.poly(clipHalfPlane(rect, [3, 1], B), { fill: c.region, opacity: 0.6 });
    LEVELS.forEach(l => m.curve(ellipse(TOP, H, RTOP, l), { stroke: c.s1, 'stroke-width': 1.3, opacity: 0.5 }));
    m.line([(B - MAP.y[1]) / 3, MAP.y[1]], [(B - MAP.y[0]) / 3, MAP.y[0]], { stroke: c.ink2, 'stroke-width': 2.4 });
    m.text([(B - MAP.y[1]) / 3, MAP.y[1]], '3x + y ≤ 10', { dx: 0.5, dy: 1.3 });
    const pt = point(), t = terms();
    if (index >= 2 && index <= 4) {
      const bb = B - 3 * D;
      m.line([(bb - MAP.y[1]) / 3, MAP.y[1]], [(bb - MAP.y[0]) / 3, MAP.y[0]], { stroke: c.s5, 'stroke-width': 2, 'stroke-dasharray': '7 5' });
      m.text([(bb - 0.9) / 3, 0.9], 'b − 3Δ: budget left', { 'text-anchor': 'end', dx: -0.3 });
    }
    if (index >= 1 && index <= 4) {
      m.arrow(pt, [pt[0] + D, pt[1]], c.s5);
      m.text([pt[0] + D, pt[1]], 'x + Δ', { dx: 0.4, dy: -0.4 });
    }
    if (index >= 5) {
      // Draw the change that pays: the sign of each term in [ ].
      if (Math.abs(t[0]) > ZERO) {
        const end = [pt[0] + Math.sign(t[0]) * D, pt[1]];
        m.arrow(pt, end, c.s5);
        m.text(end, t[0] > 0 ? 'x + Δ helps' : 'x − Δ helps', { dx: t[0] > 0 ? 0.4 : -0.4, dy: -0.5, 'text-anchor': t[0] > 0 ? 'start' : 'end' });
      }
      if (Math.abs(t[1]) > ZERO) {
        const end = [pt[0], pt[1] + Math.sign(t[1]) * D];
        m.arrow(pt, end, c.s5);
        m.text(end, t[1] > 0 ? 'y + Δ helps' : 'y − Δ helps', { dx: 0.5, dy: t[1] < 0 ? 0.9 : -0.4 });
      }
      if (Math.abs(t[0]) <= ZERO && Math.abs(t[1]) <= ZERO) {
        m.ring(pt, fs * 0.65, c.s2);
        m.text(pt, 'no change helps', { dx: 0.9, dy: -0.6 });
      }
    }
    m.dot(pt, fs * 0.32, c.ink);
    m.text(pt, 'x̄', { dx: -0.9, dy: -0.4 });
  }
  // Top chart: gain against cost of one more minute, TV from step 2 on (built
  // as on slides 19–20), radio from step 6 on.
  function drawGainCost(index) {
    const g = gradR(point()), lam = state.lam, t = terms();
    const row = (j, head, gainName, more, less, from) => {
      const cost = lam * DG[j];
      const sign = Math.abs(t[j]) <= ZERO ? ' → no change helps' : t[j] > 0 ? ' > 0 → ' + more : ' < 0 → ' + less;
      return {
        head, gain: g[j], cost, gainText: gainName + ' = ' + num(g[j], 2), costText: 'λ·' + DG[j] + ' = ' + num(cost, 2),
        verdict: '[ ] = ' + num(g[j], 2) + ' − ' + num(cost, 2) + ' = ' + num(Math.abs(t[j]) <= ZERO ? 0 : t[j], 2) + sign,
        show: from
      };
    };
    ANIM.gainCost($('.js-water'), root, [
      row(0, 'One more TV minute (x + Δ)', '∂R/∂x', 'more TV helps', 'less TV helps', { gain: index >= 1, cost: index >= 3, verdict: index >= 4 }),
      row(1, 'One more radio minute (y + Δ)', '∂R/∂y', 'more radio helps', 'less radio helps', { gain: index >= 5, cost: index >= 5, verdict: index >= 5 })
    ], 'One more minute: gain against cost (in $1000s)');
  }
  // Bottom chart (from step 6 on): what $1000 more earns on TV, (∂R/∂x)/3, and
  // on radio, (∂R/∂y)/1, for every plan on the budget line, with the price λ.
  // A term in [ ] is (budget used) × (earning − λ), so it is 0 where its line
  // meets λ; both are 0 only where the two lines cross.
  const EARN = { x: [1.75, 3.1], y: [-5, 5] };
  function drawEarn(index) {
    const svg = $('.js-line');
    if (index < 5) { svg.replaceChildren(); return; }
    const m = ANIM.plot2d(svg, root, EARN, { padL: 2.0, padT: 1.9 });
    if (!m) return;
    const { c, fs, size } = m;
    ANIM.svgEl(svg, 'text', { x: fs * 0.4, y: fs * 0.95, fill: c.ink, 'font-size': size, 'font-weight': 600 }, 'What $1000 more earns (in $1000s)');
    m.grid([2, 2.5, 3], [-4, -2, 0, 2, 4], { xlabel: 'x̄ on the budget line (TV minutes)', fx: v => num(v, 1), fy: v => num(v, 0) });
    const ends = EARN.x.map(earnAt);   // both earnings are straight lines along the budget line
    m.line([EARN.x[0], ends[0][0]], [EARN.x[1], ends[1][0]], { stroke: c.ink, 'stroke-width': 2.6 });
    m.line([EARN.x[0], ends[0][1]], [EARN.x[1], ends[1][1]], { stroke: c.ink, 'stroke-width': 2.6, 'stroke-dasharray': '8 5' });
    m.line([EARN.x[0], state.lam], [EARN.x[1], state.lam], { stroke: c.s5, 'stroke-width': 2.4 });
    // Under the λ line, where the TV line (high on the left) cannot cover it.
    m.text([EARN.x[0], state.lam], 'λ = ' + num(state.lam, 2), { dx: 0.3, dy: 1.05, fill: c.s5 });
    if (index >= 6) m.ring([XOPT, earnAt(XOPT)[0]], fs * 0.55, c.s2);
    // The current plan: a dot on each line, labelled with its name and value.
    // The higher dot is labelled above, the lower one below, and a label that
    // would leave the chart goes to the other side. When the dots meet, all four
    // lines pass near them, so the one label goes to the top of the guide line.
    const x = state.x, e = earnAt(x), right = x < (EARN.x[0] + EARN.x[1]) / 2;
    m.line([x, EARN.y[0]], [x, EARN.y[1]], { stroke: c.ink2, 'stroke-dasharray': '3 4' });
    m.dot([x, e[0]], fs * 0.26, c.ink);
    m.dot([x, e[1]], fs * 0.26, c.surface, { stroke: c.ink, 'stroke-width': 2.5 });
    const at = (v, above) => {
      const up = v > EARN.y[1] - 1.3 ? false : v < EARN.y[0] + 1.3 ? true : above;
      return { dx: right ? 0.5 : -0.5, dy: up ? -0.45 : 1.05, 'text-anchor': right ? 'start' : 'end' };
    };
    if (Math.abs(e[0] - e[1]) < 0.05) m.text([x, EARN.y[1]], 'TV = radio = ' + num(e[0], 2), at(EARN.y[1], false));
    else {
      m.text([x, e[0]], 'TV: ' + num(e[0], 2), at(e[0], e[0] > e[1]));
      m.text([x, e[1]], 'radio: ' + num(e[1], 2), at(e[1], e[1] > e[0]));
    }
  }
  function sync(index) {
    const slider = $('.js-slider');
    slider.disabled = index < 5;
    $('.js-reset').disabled = index < 5;   // x̄ and λ can only be changed from step 6 on
    slider.value = String(state.lam);
    $('.js-slider-value').textContent = num(state.lam, 3);
  }
  $('.js-slider').addEventListener('input', e => {
    let v = Number(e.target.value);
    if (Math.abs(v - LAM) < 0.02) v = LAM;   // easy to land on λ = 1/4 again
    state.lam = v;
    stepper.repaint();
  });
  // Drag x̄ along the budget line (from step 6 on).
  const svg = $('.js-map');
  let dragging = false;
  const moveTo = e => {
    if (!lastMap) return;
    const box = svg.getBoundingClientRect();
    state.x = Math.max(1.75, Math.min(3.1, lastMap.invX(e.clientX - box.left)));
    stepper.repaint();
  };
  svg.addEventListener('pointerdown', e => { if (stepper.index < 5) return; dragging = true; svg.setPointerCapture(e.pointerId); moveTo(e); });
  svg.addEventListener('pointermove', e => { if (dragging) moveTo(e); });
  svg.addEventListener('pointerup', () => { dragging = false; });
  function renderSide(index) {
    ANIM.setText(root, TEXT[STEPS[index].kind]);
    const pt = point();
    // The term in [ ] is condition (1). Each row stays faded until the scene has
    // built it: x's term at step 5 (slide 20), y's term at step 6.
    ANIM.conditionList($('.js-conds'), stationarityRows(pt, state.lam, v => ANIM.texNum(v, 2)).map((row, j) => ({
      ...row, state: index < 4 + j ? 'dim' : [index === 7 ? 'on' : '', row.zero ? 'done' : ''].join(' ').trim()
    })));
    ANIM.stats($('.js-stats'), [['x̄', '(' + num(pt[0], 3) + ', ' + num(pt[1], 3) + ')'], ['λ', num(state.lam, 3)]]);
  }
  tex($('.js-caption'), '\\max\\; ' + R_TEX + ' \\quad \\text{s.t.}\\; g(x, y) = 3x + y \\le 10,\\ \\ x,\\ y \\ge 0');
})();

/* KKT SCENE 4 · x ≥ 0 (slides 25–26 and the board drawings)
   Only the sign constraints, so the term in [ ] is ∂f/∂x_j: > 0 means "increase
   x_j" (not optimal); = 0 allows any x_j ≥ 0; < 0 is allowed only at x_j = 0,
   where x_j ≥ 0 stops the decrease. */
(() => {
  const { num, texNum, colors, tex } = ANIM;
  const root = document.getElementById('kkt-nonneg');
  const $ = sel => root.querySelector(sel);
  const MAP = { x: [-2.2, 3.4], y: [-0.6, 3.2] };
  // `on`: the condition rows a step talks about (see conditionRows for the order).
  const STEPS = [
    { kind: 'setup', top: [2, 1.5], cand: null, on: [] },
    { kind: 'gt0', top: [2, 1.5], cand: [0, 1.5], on: [0] },
    { kind: 'eq0', top: [2, 1.5], cand: 'best', on: [0, 1] },
    { kind: 'moveTop', from: [2, 1.5], top: [-1, 1.5], cand: 'best', dur: 2200, on: [] },
    { kind: 'lt0', top: [-1, 1.5], cand: 'best', on: [0, 2] },
    { kind: 'rules', top: [-1, 1.5], cand: 'best', on: [0, 1, 2, 3, 4] }
  ];
  const TEXT = {
    setup: { title: 'Slide 25 adds x ≥ 0. First, only x ≥ 0.',
      text: 'To see the change, keep only x₁, x₂ ≥ 0 and no other constraint. Then the term in [ ] of slide 26 is just ∂f/∂xⱼ. The blue area is allowed. The top of f is inside it.',
      formula: '\\begin{aligned} \\max\\quad & f(x_1, x_2) = -(x_1 - 2)^2 - (x_2 - 1.5)^2 \\\\ \\text{s.t.}\\quad & x_1,\\ x_2 \\ge 0 \\end{aligned}' },
    gt0: { title: 'If [ ] > 0, we would increase x₁.',
      text: 'At x̄ = (0, 1.5), the slope ∂f/∂x₁ = 4 is positive. f goes up when x₁ goes up, and nothing stops us. So x̄ is not optimal. This is why condition (1) needs ≤ 0.',
      formula: '\\frac{\\partial f(\\bar x)}{\\partial x_1} = 4 > 0 \\;\\Rightarrow\\; \\text{increase } x_1' },
    eq0: { title: 'If [ ] = 0, any xⱼ ≥ 0 is allowed.',
      text: 'At the top of f both slopes are 0, so no change helps. Here x₁ and x₂ are positive. This is fine, because the slopes are 0 (left drawing on the board).',
      formula: '\\frac{\\partial f(\\bar x)}{\\partial x_1} = \\frac{\\partial f(\\bar x)}{\\partial x_2} = 0, \\qquad \\bar x_1, \\bar x_2 > 0' },
    moveTop: { title: 'Now move the top of f to x₁ < 0.',
      text: 'The top leaves the allowed area. The best allowed point moves to the wall x₁ = 0 and stays there.',
      formula: '\\text{top of } f = (-1, 1.5) \\;\\Rightarrow\\; \\bar x = (0, 1.5)' },
    lt0: { title: 'If [ ] < 0, we want a smaller x₁, but x₁ ≥ 0 stops us.',
      text: 'At x̄ = (0, 1.5), ∂f/∂x₁ = −2 < 0. f would go up if x₁ went down, but x₁ is already 0. So a negative term in [ ] is allowed only when xⱼ = 0 (right drawing on the board).',
      formula: '\\bar x_1 = 0, \\quad \\frac{\\partial f(\\bar x)}{\\partial x_1} = -2 \\le 0, \\quad \\bar x_1 \\cdot (-2) = 0' },
    rules: { title: 'Conditions (1), (2) and (5) of slide 26.',
      text: 'The term in [ ] is never positive. If xⱼ > 0, it is exactly 0. If it is negative, then xⱼ = 0. Drag the top of f and watch the best point and its slopes.',
      formula: '\\begin{aligned} &\\tfrac{\\partial f(\\bar x)}{\\partial x_j} - \\textstyle\\sum_{i=1}^{m} \\lambda_i \\tfrac{\\partial g_i(\\bar x)}{\\partial x_j} \\le 0 &(1) \\\\ &\\bar x_j\\Big(\\tfrac{\\partial f(\\bar x)}{\\partial x_j} - \\textstyle\\sum_{i=1}^{m} \\lambda_i \\tfrac{\\partial g_i(\\bar x)}{\\partial x_j}\\Big) = 0 &(2) \\\\ &\\bar x_j \\ge 0 &(5) \\end{aligned}' }
  };
  const CASES = [
    '[ ] > 0: we would increase xⱼ, so x̄ is not optimal.',
    '[ ] = 0: any xⱼ ≥ 0 is allowed.',
    '[ ] < 0: we want a smaller xⱼ, but xⱼ ≥ 0 stops us, so xⱼ = 0.'
  ];
  const state = { top: [2, 1.5], cand: null };
  const grad = v => [-2 * (v[0] - state.top[0]), -2 * (v[1] - state.top[1])];
  const best = () => [Math.max(0, state.top[0]), Math.max(0, state.top[1])];   // closest allowed point to the top
  const candidate = () => (state.cand === 'best' ? best() : state.cand);
  const stepper = ANIM.kktScene({
    root, steps: STEPS, state,
    apply: (st, s, p) => {
      st.top = s.from && p < 1 ? [s.from[0] + (s.top[0] - s.from[0]) * p, s.from[1] + (s.top[1] - s.from[1]) * p] : s.top.slice();
      st.cand = s.cand === 'best' ? 'best' : (s.cand ? s.cand.slice() : null);
    },
    paint: index => { drawMap(index); renderSide(index); },
    debug: () => { const x = candidate(); return { candidate: x, grad: x ? grad(x) : null, best: best() }; }
  });

  let lastMap = null;
  function drawMap(index) {
    const m = ANIM.plot2d($('.js-map'), root, MAP, { equal: true, padL: 2 });
    lastMap = m;
    if (!m) return;
    const { c, fs } = m;
    m.grid([-2, -1, 0, 1, 2, 3], [0, 1, 2, 3], { xlabel: 'x₁', ylabel: 'x₂', fx: v => num(v, 0), fy: v => num(v, 0) });
    m.poly([[MAP.x[0], MAP.y[0]], [0, MAP.y[0]], [0, MAP.y[1]], [MAP.x[0], MAP.y[1]]], { fill: m.hatch });
    m.poly([[0, MAP.y[0]], [MAP.x[1], MAP.y[0]], [MAP.x[1], 0], [0, 0]], { fill: m.hatch });
    m.poly([[0, 0], [MAP.x[1], 0], [MAP.x[1], MAP.y[1]], [0, MAP.y[1]]], { fill: c.region, opacity: 0.55 });
    const top = state.top;
    [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5].forEach(r => {
      const pts = Array.from({ length: 121 }, (_, k) => [top[0] + r * Math.cos(2 * Math.PI * k / 120), top[1] + r * Math.sin(2 * Math.PI * k / 120)]);
      m.curve(pts, { stroke: c.s1, 'stroke-width': 1.3, opacity: 0.5 });
    });
    m.line([0, 0], [0, MAP.y[1]], { stroke: c.ink, 'stroke-width': 3 });
    m.line([0, 0], [MAP.x[1], 0], { stroke: c.ink, 'stroke-width': 3 });
    m.text([MAP.x[0], MAP.y[1]], 'x₁ < 0: not allowed', { dx: 0.4, dy: 1.2, 'font-weight': 500 });
    m.dot(top, fs * 0.22, c.s1);
    m.text(top, 'top of f', { dx: -0.3, dy: 1.1, 'text-anchor': 'middle' });
    const x = candidate();
    if (!x) return;
    const d = grad(x);
    [0, 1].forEach(j => {
      if (Math.abs(d[j]) < 0.01) return;
      const len = Math.max(-1.3, Math.min(1.3, 0.28 * d[j]));
      const end = j === 0 ? [x[0] + len, x[1]] : [x[0], x[1] + len];
      m.arrow(x, end, c.s5);
      const name = j === 0 ? '∂f/∂x₁ = ' : '∂f/∂x₂ = ';
      // The label sits beside the middle of the arrow, clear of its tip.
      const mid = [(x[0] + end[0]) / 2, (x[1] + end[1]) / 2];
      m.text(mid, name + num(d[j], 2), j === 0 ? { dy: -0.6, 'text-anchor': 'middle' } : { dx: 0.4, dy: 0.3 });
    });
    if (x[0] === 0 && d[0] < -0.01) {
      m.line([0, x[1] - 0.3], [0, x[1] + 0.3], { stroke: c.bad, 'stroke-width': 6 }, true);
      m.text([0, x[1] - 0.3], 'x₁ ≥ 0 stops us', { dx: -0.3, dy: 1.0, 'text-anchor': 'end' });
    }
    m.dot(x, fs * 0.32, c.ink);
    m.text(x, 'x̄', { dx: 0.45, dy: 0.95 });
  }
  // Drag the top of f (from step 3 on); the best allowed point follows.
  const svg = $('.js-map');
  let dragging = false;
  const moveTop = e => {
    if (!lastMap) return;
    const box = svg.getBoundingClientRect();
    state.top = [Math.max(MAP.x[0], Math.min(MAP.x[1], lastMap.invX(e.clientX - box.left))), Math.max(MAP.y[0], Math.min(MAP.y[1], lastMap.invY(e.clientY - box.top)))];
    state.cand = 'best';
    stepper.repaint();
  };
  svg.addEventListener('pointerdown', e => { if (stepper.index < 2) return; dragging = true; svg.setPointerCapture(e.pointerId); moveTop(e); });
  svg.addEventListener('pointermove', e => { if (dragging) moveTop(e); });
  svg.addEventListener('pointerup', () => { dragging = false; });
  // Slide 26 with no constraint g (m = 0): the sum with λ is empty, so the term
  // in [ ] is ∂f/∂xⱼ and only (1), (2) and (5) are left. Rows: (1) x₁, (1) x₂,
  // (2) x₁, (2) x₂, (5), then (3)(4)(6), which this example does not have.
  // Before a candidate x̄ exists, the rows show the conditions only.
  const ZERO = 5e-3;
  const paren = v => (v < 0 ? '(' + texNum(v, 2) + ')' : texNum(v, 2));
  function conditionRows(x, d) {
    const ok = pass => (pass ? 'done' : 'fail');
    const rows = [];
    [0, 1].forEach(j => rows.push({
      tag: '(1) stationarity', tex: '\\tfrac{\\partial f}{\\partial x_' + (j + 1) + '} \\le 0',
      vals: x && texNum(d[j], 2) + ' \\le 0', state: x ? ok(d[j] <= ZERO) : ''
    }));
    [0, 1].forEach(j => rows.push({
      tag: '(2) stationarity', tex: '\\bar x_' + (j + 1) + '\\,\\tfrac{\\partial f}{\\partial x_' + (j + 1) + '} = 0',
      vals: x && texNum(x[j], 2) + ' \\cdot ' + paren(d[j]) + ' = ' + texNum(x[j] * d[j], 2), state: x ? ok(Math.abs(x[j] * d[j]) <= ZERO) : ''
    }));
    rows.push({
      tag: '(5) primal feasibility', tex: '\\bar x_1,\\ \\bar x_2 \\ge 0',
      vals: x && texNum(x[0], 2) + ',\\ ' + texNum(x[1], 2) + ' \\ge 0', state: x ? ok(x[0] >= -1e-9 && x[1] >= -1e-9) : ''
    });
    rows.push({ tag: '(3), (4), (6)', tex: '\\text{no constraint } g_i \\text{ here, so no } \\lambda', state: 'dim' });
    return rows;
  }
  function renderSide(index) {
    ANIM.setText(root, TEXT[STEPS[index].kind]);
    const x = candidate(), d = x ? grad(x) : null;
    const active = !d ? -1 : d[0] > 0.01 ? 0 : d[0] < -0.01 ? 2 : 1;
    const list = $('.js-cases');
    list.replaceChildren();
    CASES.forEach((text, k) => {
      const li = document.createElement('li');
      li.textContent = text + (k === active ? '   ← x₁ now' : '');
      if (k === active) li.className = 'on';
      list.appendChild(li);
    });
    const on = STEPS[index].on;
    ANIM.conditionList($('.js-conds'), conditionRows(x, d).map((row, k) => ({
      ...row, state: !x || row.state === 'dim' ? 'dim' : (on.includes(k) ? 'on ' : '') + row.state
    })));
    const shift = (name, v) => '(' + name + (v < 0 ? ' + ' : ' - ') + texNum(Math.abs(v), 2) + ')^2';
    tex($('.js-caption'), '\\max\\; f(x) = -' + shift('x_1', state.top[0]) + ' - ' + shift('x_2', state.top[1]) + ' \\quad \\text{s.t.}\\; x_1, x_2 \\ge 0');
  }
})();

/* KKT SCENE 5 · EXAMPLE 2 (slides 33–36)
   The slide 35 conditions, read one deduction at a time as on slide 36; each
   deduction shrinks the set of candidates on the map. */
(() => {
  const { num, fracText, colors, tex } = ANIM;
  const root = document.getElementById('kkt-example2');
  const $ = sel => root.querySelector(sel);
  const MAP = { x: [-0.9, 1.9], y: [-0.3, 4.6] };
  const ROWS = [
    { tag: '(1) stationarity', tex: '\\tfrac{1}{x_1 + 1} - 2\\lambda \\le 0' },
    { tag: '(1) stationarity', tex: '1 - \\lambda \\le 0' },
    { tag: '(2) stationarity', tex: 'x_1\\big(\\tfrac{1}{x_1 + 1} - 2\\lambda\\big) = 0' },
    { tag: '(2) stationarity', tex: 'x_2(1 - \\lambda) = 0' },
    { tag: '(3) complementary slackness', tex: '\\lambda(3 - 2x_1 - x_2) = 0' },
    { tag: '(4) primal feasibility (constraint)', tex: '2x_1 + x_2 \\le 3' },
    { tag: '(6) dual feasibility', tex: '\\lambda \\ge 0' },
    { tag: '(5) primal feasibility (variables)', tex: 'x_1, x_2 \\ge 0' }
  ];
  const STEPS = [
    { kind: 'problem', on: [], done: [] },
    { kind: 'list', on: [], done: [] },
    { kind: 'lam', on: [1], done: [] },
    { kind: 'binding', on: [4], done: [1] },
    { kind: 'x1zero', on: [0, 2], done: [1, 4] },
    { kind: 'x2', on: [3, 5], done: [1, 4, 0, 2] },
    { kind: 'done', on: [], done: [0, 1, 2, 3, 4, 5, 6, 7] }
  ];
  const TEXT = {
    problem: { title: 'Example 2 (slide 33).',
      text: 'Maximize ln(x₁ + 1) + x₂ with one resource constraint and x ≥ 0. f is concave and g is linear, so the KKT conditions are necessary and sufficient (slide 34).',
      formula: '\\begin{aligned} \\max\\quad & \\ln(x_1 + 1) + x_2 \\\\ \\text{s.t.}\\quad & 2x_1 + x_2 \\le 3 \\qquad (\\lambda) \\\\ & x_1,\\ x_2 \\ge 0 \\end{aligned}' },
    list: { title: 'The KKT conditions (slide 35).',
      text: 'These are the six groups of slide 26 for this example. We look for x₁, x₂ and λ that satisfy all of them. We find them step by step (slide 36).',
      formula: '\\text{find } x_1,\\ x_2,\\ \\lambda' },
    lam: { title: '1 − λ ≤ 0, so λ ≥ 1.',
      text: 'Look at x₂. One more unit adds 1 to f and uses 1 unit of the resource. So its term in [ ] is 1 − λ. It must be ≤ 0, so λ ≥ 1 > 0.',
      formula: '1 - \\lambda \\le 0 \\;\\Rightarrow\\; \\lambda \\ge 1' },
    binding: { title: 'λ > 0, so the constraint is binding.',
      text: 'Complementary slackness: λ can be positive only if the resource is fully used. So the optimum is on the line 2x₁ + x₂ = 3.',
      formula: '\\lambda > 0 \\;\\Rightarrow\\; 3 - 2x_1 - x_2 = 0' },
    x1zero: { title: 'The term in [ ] for x₁ is negative, so x₁ = 0.',
      text: '1/(x₁ + 1) ≤ 1 and 2λ ≥ 2, so the term in [ ] is < 0. We want a smaller x₁, but x₁ ≥ 0 stops us. So x₁ = 0.',
      formula: '\\tfrac{1}{x_1 + 1} - 2\\lambda \\le 1 - 2 < 0 \\;\\Rightarrow\\; x_1 = 0' },
    x2: { title: 'Then x₂ = 3 and λ = 1.',
      text: 'On the line, with x₁ = 0, we get x₂ = 3 > 0. Because x₂ is positive, its term in [ ] must be 0: 1 − λ = 0.',
      formula: 'x_2 = 3 - 2\\cdot 0 = 3 > 0 \\;\\Rightarrow\\; 1 - \\lambda = 0 \\;\\Rightarrow\\; \\lambda = 1' },
    done: { title: 'x̄ = (0, 3), λ = 1: the optimal solution (slide 36).',
      text: 'All conditions hold. f is concave and g is linear, so this KKT point is optimal (slide 27). Without x₁ ≥ 0, the best point would be (−1/2, 4). The wall x₁ = 0 stops us, like in the board drawing.',
      formula: '\\bar x = (0, 3), \\quad \\lambda = 1, \\quad f(\\bar x) = 3' }
  };
  const state = {};
  ANIM.kktScene({
    root, steps: STEPS, state, apply: () => {},
    paint: index => { drawMap(index); drawWater(index); drawLine(index); renderSide(index); }
  });
  function level(cst) {
    const pts = [];
    for (let k = 0; k <= 160; k++) { const x1 = -0.88 + (MAP.x[1] + 0.88) * k / 160; pts.push([x1, cst - Math.log(x1 + 1)]); }
    return pts;
  }
  function drawMap(index) {
    const m = ANIM.plot2d($('.js-map'), root, MAP, { equal: true, padL: 2 });
    if (!m) return;
    const { c, fs } = m;
    m.grid([-0.5, 0, 0.5, 1, 1.5], [0, 1, 2, 3, 4], { xlabel: 'x₁', ylabel: 'x₂', fx: fracText, fy: v => num(v, 0) });
    const tri = [[0, 0], [1.5, 0], [0, 3]];
    m.poly(tri, { fill: c.region, opacity: index >= 3 ? 0.22 : 0.6 });
    [1, 2, 3, 4].forEach(cst => m.curve(level(cst), { stroke: c.s1, 'stroke-width': cst === 3 && index >= 4 ? 2.4 : 1.3, opacity: cst === 3 && index >= 4 ? 0.9 : 0.5 }));
    m.line([0, 0], [0, MAP.y[1]], { stroke: c.ink, 'stroke-width': 2.6 });
    m.line([0, 0], [MAP.x[1], 0], { stroke: c.ink, 'stroke-width': 2.6 });
    const binding = index >= 3;
    m.line([0, 3], [1.5, 0], { stroke: binding ? c.s1 : c.ink2, 'stroke-width': binding ? 5 : 2.4 });
    m.text([0.75, 1.5], binding ? '2x₁ + x₂ = 3' : '2x₁ + x₂ ≤ 3', { dx: 0.5, dy: 0.2 });
    if (index >= 4) { m.ring([0, 3], fs * 0.62, c.s2); m.dot([0, 3], fs * 0.26, c.s2); m.text([0, 3], 'x̄ = (0, 3)', { dx: 0.7, dy: -0.4 }); }
    if (index === 4) {
      m.arrow([0, 3], [-0.42, 3], c.s5);
      m.line([0, 2.7], [0, 3.3], { stroke: c.bad, 'stroke-width': 6 }, true);
      m.text([-0.42, 3], 'x₁ wants to go down', { dx: -0.2, dy: -0.6, 'text-anchor': 'end' });
    }
    if (index === 6) {
      // Without x₁ ≥ 0: the line continues left and the best point is (−1/2, 4).
      m.line([0, 3], [-0.8, 4.6], { stroke: c.ink2, 'stroke-width': 2, 'stroke-dasharray': '6 4' });
      m.curve(level(Math.log(0.5) + 4), { stroke: c.s2, 'stroke-width': 1.6, 'stroke-dasharray': '5 4' });
      m.dot([-0.5, 4], fs * 0.28, c.surface, { stroke: c.s2, 'stroke-width': 2.5 });
      m.text([-0.5, 4], 'without x₁ ≥ 0', { dx: 0.5, dy: -0.5 });
    }
  }
  // Gain against cost of one more unit. At step 5 only bounds are known
  // (x₁ ≥ 0 and λ ≥ 1), so the bars show the bounds and the labels say so.
  function drawWater(index) {
    const exact = index >= 5;
    ANIM.gainCost($('.js-water'), root, [
      { head: 'One more unit of x₁', gain: 1, cost: 2, show: { gain: index >= 4, cost: index >= 4, verdict: index >= 4 },
        gainText: exact ? '1/(x₁+1) = 1' : '1/(x₁+1) ≤ 1', costText: exact ? 'λ·2 = 2' : 'λ·2 ≥ 2',
        verdict: exact ? '[ ] = 1 − 2 = −1 < 0 → x₁ = 0' : '[ ] < 0, but x₁ ≥ 0 stops us → x₁ = 0' },
      { head: 'One more unit of x₂', gain: 1, cost: 1, show: { gain: index >= 5, cost: index >= 5, verdict: index >= 5 },
        gainText: '∂f/∂x₂ = 1', costText: 'λ·1 = 1', verdict: '[ ] = 1 − 1 = 0 → x₂ > 0 is allowed' }
    ], 'One more unit: gain against cost');
  }
  function drawLine(index) {
    const c = colors();
    ANIM.numberLine($('.js-line'), root, {
      range: [0, 3], ticks: [0, 1, 2, 3], title: 'What we know about λ',
      band: index >= 2 ? [1, 3, 'λ ≥ 1'] : null,
      marks: index >= 5 ? [{ v: 1, label: 'λ = 1', color: c.s5 }] : []
    });
  }
  function renderSide(index) {
    const s = STEPS[index];
    ANIM.setText(root, TEXT[s.kind]);
    ANIM.conditionList($('.js-conds'), ROWS.map((row, k) => ({
      ...row, state: s.on.includes(k) ? 'on' : s.done.includes(k) ? 'done' : index === 0 ? 'dim' : ''
    })));
  }
  tex($('.js-caption'), '\\max\\; \\ln(x_1 + 1) + x_2 \\quad \\text{s.t.}\\; 2x_1 + x_2 \\le 3,\\ \\ x_1, x_2 \\ge 0');
})();

/* KKT SCENE 6 · WHEN IS A KKT POINT OPTIMAL? (slide 27)
   Concave f and convex g: the KKT point is the optimum. A convex (not concave)
   f, or a constraint g that is not convex (a region with a hole), can give KKT
   points that are not optimal. Both counterexamples are not from the slides. */
(() => {
  const { num, fracText, colors, tex } = ANIM;
  const root = document.getElementById('kkt-sufficient');
  const $ = sel => root.querySelector(sel);
  const TRI = { x: [-0.45, 2.6], y: [-0.45, 2.6] };
  // Each case: f, its gradient df, the one constraint g(x) ≤ b with gradient dg,
  // and nonneg = whether x ≥ 0 is part of the problem (slide 26) or not (slide 17).
  const TRI_G = { g: v => v[0] + v[1], dg: () => [1, 1], b: 2, nonneg: true };
  const CASES = {
    concave: {
      view: TRI, f: v => -((v[0] - 1.5) ** 2) - (v[1] - 1.5) ** 2, df: v => [-2 * (v[0] - 1.5), -2 * (v[1] - 1.5)], ...TRI_G,
      centre: [1.5, 1.5], centreLabel: 'top of f', radii: [0.35, 0.7, 1.05, 1.4, 1.75, 2.1, 2.45], region: 'triangle',
      points: [{ x: [1, 1], lam: 1, best: true, at: [0.5, -0.5] }],
      caption: '\\max\\; -(x_1 - \\tfrac32)^2 - (x_2 - \\tfrac32)^2 \\quad \\text{s.t.}\\; x_1 + x_2 \\le 2,\\ \\ x_1, x_2 \\ge 0'
    },
    convexF: {
      view: TRI, f: v => v[0] ** 2 + v[1] ** 2, df: v => [2 * v[0], 2 * v[1]], ...TRI_G,
      centre: [0, 0], centreLabel: 'lowest f', radii: [0.5, 1, 1.5, 2, 2.5, 3, 3.5], region: 'triangle',
      points: [{ x: [1, 1], lam: 2, at: [0.5, -0.5] }, { x: [2, 0], lam: 4, best: true, at: [-0.4, -0.9], end: true },
               { x: [0, 2], lam: 4, best: true, at: [0.6, 0.1] }, { x: [0, 0], lam: 0, at: [0.6, -0.6] }],
      caption: '\\max\\; x_1^2 + x_2^2 \\quad \\text{s.t.}\\; x_1 + x_2 \\le 2,\\ \\ x_1, x_2 \\ge 0'
    },
    hole: {
      view: { x: [-2.1, 2.1], y: [-1.6, 1.6] }, f: v => -((v[0] - 0.5) ** 2) - v[1] ** 2, df: v => [-2 * (v[0] - 0.5), -2 * v[1]],
      g: v => -(v[0] ** 2) - v[1] ** 2, dg: v => [-2 * v[0], -2 * v[1]], b: -1, nonneg: false,
      centre: [0.5, 0], centreLabel: 'top of f', radii: [0.5, 1, 1.5, 2, 2.5], region: 'hole',
      points: [{ x: [1, 0], lam: 0.5, best: true, at: [0.5, -0.6] }, { x: [-1, 0], lam: 1.5, at: [-0.5, -0.6], end: true }],
      caption: '\\max\\; -(x_1 - \\tfrac12)^2 - x_2^2 \\quad \\text{s.t.}\\; -x_1^2 - x_2^2 \\le -1'
    }
  };
  const STEPS = [
    // verdict: false keeps "optimal?" open until the next step answers it.
    // sel: the point whose conditions are listed (the one the step talks about).
    { kind: 'rule', use: 'concave', show: [0], verdict: true, sel: 0 },
    { kind: 'convexF', use: 'convexF', show: [0], verdict: false, sel: 0 },
    { kind: 'walk', use: 'convexF', show: [0, 1, 2], walk: 'edge', dur: 2400, verdict: true, sel: 0 },
    { kind: 'origin', use: 'convexF', show: [0, 1, 2, 3], verdict: true, sel: 3 },
    { kind: 'hole', use: 'hole', show: [0, 1], verdict: false, sel: 1 },
    { kind: 'walk2', use: 'hole', show: [0, 1], walk: 'circle', dur: 2400, verdict: true, sel: 1 },
    { kind: 'summary', use: 'hole', show: [0, 1], verdict: true, sel: 1 }
  ];
  const TEXT = {
    rule: { title: 'Slide 27: when is a KKT point optimal?',
      text: 'If f is concave and every gᵢ is convex, every point that satisfies the KKT conditions is optimal. Then the conditions are necessary and sufficient. Here f is concave and the constraint is linear. So the only KKT point, (1, 1), is the optimum.',
      formula: 'f \\text{ concave},\\ g_i \\text{ convex} \\;\\Rightarrow\\; \\text{every KKT point is optimal}' },
    convexF: { title: 'Same region, but f is not concave.',
      text: 'This example is not in the slides. f(x) = x₁² + x₂² is the squared distance from (0, 0). It is convex, not concave. (1, 1) still satisfies every KKT condition, with λ = 2.',
      formula: '\\tfrac{\\partial f}{\\partial x_j} - \\lambda\\tfrac{\\partial g}{\\partial x_j} = 2 - 2 = 0\\ \\ (j = 1, 2),\\quad x_1 + x_2 = 2,\\quad \\lambda = 2 \\ge 0' },
    walk: { title: 'But (1, 1) is not optimal.',
      // No formula from here: the table already lists every KKT point with its f.
      text: 'Walk along the edge from (1, 1) to (2, 0): f goes up from 2 to 4. So (1, 1) is the worst point of this edge, but it passes every KKT condition. The corners (2, 0) and (0, 2) are also KKT points, with λ = 4.' },
    origin: { title: 'Even the lowest point is a KKT point.',
      text: 'At (0, 0) both partial derivatives are 0 and λ = 0, so all conditions hold. But f(0, 0) = 0 is the minimum! When f is not concave, KKT points are only possible answers.' },
    hole: { title: 'Now f is concave, but the feasible region is not convex.',
      text: 'This example is not in the slides either. We must stay at least 1 away from (0, 0): x₁² + x₂² ≥ 1, written as g(x) = −x₁² − x₂² ≤ −1. This g is not convex, so the region has a hole. The top of f, (1/2, 0), is inside the hole. Two points satisfy the KKT conditions.',
      formula: '(1, 0):\\ \\lambda = \\tfrac12, \\qquad (-1, 0):\\ \\lambda = \\tfrac32' },
    walk2: { title: '(−1, 0) passes the test, but it is not optimal.',
      text: 'Walk around the circle from (−1, 0) to (1, 0): f goes up from −9/4 to −1/4. Both points satisfy the KKT conditions, but only (1, 0) is optimal.',
      formula: 'f(-1, 0) = -\\tfrac94 \\;<\\; f(1, 0) = -\\tfrac14' },
    summary: { title: 'KKT is necessary. It is sufficient only with concave f and convex g.',
      text: 'If f is concave and every gᵢ is convex (slide 27), every KKT point is optimal. If not, the KKT conditions only give possible answers. Find them all and compare their f values.',
      formula: 'f \\text{ concave},\\ g_i \\text{ convex} \\;\\Rightarrow\\; \\text{KKT point} = \\text{optimal solution}' }
  };
  const state = { walk: null, sel: 0 };
  const walkPoint = (kind, s) => kind === 'edge' ? [1 + s, 1 - s] : [Math.cos(Math.PI * (1 - s)), Math.sin(Math.PI * (1 - s))];
  // The picture has two views (buttons at its top right): the 3D surface,
  // where students can see whether f is a hill (concave) or a bowl (convex),
  // and the map from above with its level circles. The choice is kept across steps.
  let mode = '3d';
  const stepper = ANIM.kktScene({
    root, steps: STEPS, state,
    apply: (st, s, p) => { st.walk = s.walk ? p : null; st.sel = s.sel; },
    paint: index => { if (mode === '3d') draw3D(false, index); else drawMap(index); renderSide(index); },
    onActivate: () => s3d.resume(), onDeactivate: () => s3d.stop(),
    debug: () => {
      const s = STEPS[Number(root.dataset.step || 0)];
      return { mode, sel: state.sel, points: CASES[s.use].points.map(pt => ({ x: pt.x, lam: pt.lam, f: CASES[s.use].f(pt.x), best: !!pt.best })) };
    }
  });
  function setMode(next) {
    mode = next;
    // toggleAttribute, because an <svg> has no `hidden` property, only the attribute.
    $('.js-s3d').toggleAttribute('hidden', next !== '3d');
    $('.js-map').toggleAttribute('hidden', next !== 'map');
    root.querySelectorAll('.js-mode').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === next)));
    if (next !== '3d') s3d.stop();
    stepper.repaint();
  }
  root.querySelectorAll('.js-mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // === 3D VIEW ===
  // f is solid over the feasible region and see-through elsewhere, so the
  // whole hill or bowl stays visible; the region's edges are drawn on the
  // surface and on the floor.
  const FEASIBLE = {
    triangle: v => v[0] >= 0 && v[1] >= 0 && v[0] + v[1] <= 2,
    hole: v => v[0] ** 2 + v[1] ** 2 >= 1
  };
  const seg = (a, b, n = 30) => Array.from({ length: n + 1 }, (_, k) => [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  const unitCircle = Array.from({ length: 121 }, (_, k) => [Math.cos(2 * Math.PI * k / 120), Math.sin(2 * Math.PI * k / 120)]);
  const EDGES = { triangle: [seg([0, 0], [2, 0]), seg([2, 0], [0, 2]), seg([0, 2], [0, 0])], hole: [unitCircle] };
  const SHAPE = { concave: 'f is concave: one hill', convexF: 'f is convex: a bowl', hole: 'f is concave: one hill' };
  const s3d = ANIM.surface3d({ root, canvas: $('.js-canvas'), redraw: smooth => draw3D(smooth, stepper.index) });
  s3d.view.yaw = 0.72; s3d.view.elev = 0.5;
  const built = {};
  let spaceOf = null;
  // Each case's height range and its two meshes, built the first time they are needed.
  function caseSurface(key) {
    const cs = CASES[key], V = cs.view, dom = [V.x, V.y];
    if (!built[key]) {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 40; i++) for (let j = 0; j <= 40; j++) {
        const v = cs.f([V.x[0] + (V.x[1] - V.x[0]) * i / 40, V.y[0] + (V.y[1] - V.y[0]) * j / 40]);
        lo = Math.min(lo, v); hi = Math.max(hi, v);
      }
      s3d.setSpace(dom, lo, hi); spaceOf = key;
      const levels = cs.radii.map(r => cs.f([cs.centre[0] + r, cs.centre[1]]));   // the map's circles
      const feasible = FEASIBLE[cs.region];
      built[key] = { lo, hi, solid: s3d.mesh(cs.f, levels, 64, feasible), rest: s3d.mesh(cs.f, levels, 40, v => !feasible(v)) };
    }
    if (spaceOf !== key) { s3d.setSpace(dom, built[key].lo, built[key].hi); spaceOf = key; }
    return built[key];
  }
  function draw3D(smooth, index) {
    if (mode !== '3d') return;
    const s = STEPS[index], cs = CASES[s.use], surf = caseSurface(s.use), c = colors(), edges = EDGES[cs.region];
    s3d.draw({
      meshes: [{ mesh: surf.solid, mode: 'solid' }, { mesh: surf.rest, mode: 'faded', alpha: 0.22 }],
      fit: surf.solid.pts.concat(surf.rest.pts),
      floor: {
        ticks: cs.region === 'triangle' ? [[0, 1, 2], [0, 1, 2]] : [[-2, -1, 0, 1, 2], [-1, 0, 1]],
        lines: edges.map(pts => ({ pts, color: c.ink2, width: 2 })), names: ['x₁', 'x₂']
      },
      overlay: api => overlay3d(api, s, cs, edges)
    }, smooth);
  }
  function overlay3d(api, s, cs, edges) {
    const { c, fs, ctx } = api;
    edges.forEach(pts => api.polyline(pts.map(q => api.onSurface(cs.f, q, 0.01)), c.ink, 2.6));
    const top = api.onSurface(cs.f, cs.centre, 0.015);
    api.disc(top, fs * 0.2, c.s1);
    api.label(cs.centreLabel, top, 0.5, cs.region === 'hole' ? 1.0 : -0.7);   // in the hole the λ labels sit above
    if (state.walk != null) {
      const trail = [];
      for (let k = 0; k <= 40; k++) trail.push(api.onSurface(cs.f, walkPoint(s.walk, state.walk * k / 40), 0.02));
      api.polyline(trail, c.s5, 4);
      const herePt = walkPoint(s.walk, state.walk), here = api.onSurface(cs.f, herePt, 0.02);
      api.disc(here, fs * 0.3, c.s5);
      api.label('f = ' + num(cs.f(herePt), 2), here, 0.6, 1.3);
    }
    s.show.forEach(k => {
      const pt = cs.points[k], p = api.onSurface(cs.f, pt.x, 0.02);
      api.disc(p, fs * 0.24, s.verdict && pt.best ? c.s2 : c.ink);
      api.ring(p, fs * 0.62, !s.verdict ? c.ink2 : pt.best ? c.s2 : c.bad);
      api.label('λ = ' + fracText(pt.lam), p, 0.8, -0.8);
    });
    api.label(SHAPE[s.use] + ' · solid = allowed, see-through = not allowed', [0, ctx.canvas.clientHeight], 0.6, -1.0);
  }
  // The KKT conditions of one point with its numbers: slide 26 when x ≥ 0 is
  // part of the problem (the triangle), slide 17 when it is not (the hole).
  const fr = v => ANIM.fracTex(Math.abs(v) < 1e-12 ? 0 : v);
  const par = v => (v < 0 ? '(' + fr(v) + ')' : fr(v));
  const TOL = 1e-9;
  function conditionRows(cs, pt) {
    const { x, lam } = pt, df = cs.df(x), dg = cs.dg(x), g = cs.g(x);
    const term = j => df[j] - lam * dg[j], ok = pass => (pass ? 'done' : 'fail');
    const n = cs.nonneg ? { cs: 3, primal: 4, dual: 6 } : { cs: 2, primal: 3, dual: 4 };
    const d = j => '\\tfrac{\\partial f}{\\partial x_' + j + '} - \\lambda\\tfrac{\\partial g}{\\partial x_' + j + '}';
    const rows = [0, 1].map(j => ({
      tag: '(1) stationarity', tex: d(j + 1) + (cs.nonneg ? ' \\le 0' : ' = 0'),
      vals: fr(df[j]) + ' - ' + par(lam) + ' \\cdot ' + par(dg[j]) + ' = ' + fr(term(j)) + (cs.nonneg ? ' \\le 0' : ''),
      state: ok(cs.nonneg ? term(j) <= TOL : Math.abs(term(j)) <= TOL)
    }));
    if (cs.nonneg) [0, 1].forEach(j => rows.push({
      tag: '(2) stationarity', tex: '\\bar x_' + (j + 1) + '\\big(' + d(j + 1) + '\\big) = 0',
      vals: fr(x[j]) + ' \\cdot ' + par(term(j)) + ' = ' + fr(x[j] * term(j)), state: ok(Math.abs(x[j] * term(j)) <= TOL)
    }));
    rows.push(
      { tag: '(' + n.cs + ') complementary slackness', tex: '\\lambda\\,[\\,b - g(\\bar x)\\,] = 0',
        vals: fr(lam) + ' \\cdot (' + fr(cs.b) + ' - ' + par(g) + ') = ' + fr(lam * (cs.b - g)), state: ok(Math.abs(lam * (cs.b - g)) <= TOL) },
      { tag: '(' + n.primal + ') primal feasibility', tex: 'g(\\bar x) \\le b', vals: fr(g) + ' \\le ' + fr(cs.b), state: ok(g <= cs.b + TOL) });
    if (cs.nonneg) rows.push({ tag: '(5) primal feasibility', tex: '\\bar x_1,\\ \\bar x_2 \\ge 0',
      vals: fr(x[0]) + ',\\ ' + fr(x[1]) + ' \\ge 0', state: ok(x[0] >= -TOL && x[1] >= -TOL) });
    rows.push({ tag: '(' + n.dual + ') dual feasibility', tex: '\\lambda \\ge 0', vals: fr(lam) + ' \\ge 0', state: ok(lam >= -TOL) });
    return rows;
  }
  function drawMap(index) {
    const s = STEPS[index], cs = CASES[s.use];
    const m = ANIM.plot2d($('.js-map'), root, cs.view, { equal: true, padL: 2 });
    if (!m) return;
    const { c, fs } = m, V = cs.view;
    if (cs.region === 'triangle') {
      m.grid([0, 1, 2], [0, 1, 2], { xlabel: 'x₁', ylabel: 'x₂', fx: v => num(v, 0), fy: v => num(v, 0) });
      m.poly([[0, 0], [2, 0], [0, 2]], { fill: c.region, opacity: 0.6 });
      m.line([0, 0], [0, V.y[1]], { stroke: c.ink, 'stroke-width': 2.6 });
      m.line([0, 0], [V.x[1], 0], { stroke: c.ink, 'stroke-width': 2.6 });
      m.line([2.3, -0.3], [-0.3, 2.3], { stroke: c.ink2, 'stroke-width': 2.4 });
      m.text([1.4, 0.6], 'x₁ + x₂ ≤ 2', { dx: 0.6, dy: 0.2 });
    } else {
      m.grid([-2, -1, 0, 1, 2], [-1, 0, 1], { xlabel: 'x₁', ylabel: 'x₂', fx: v => num(v, 0), fy: v => num(v, 0) });
      const circle = Array.from({ length: 121 }, (_, k) => [Math.cos(2 * Math.PI * k / 120), Math.sin(2 * Math.PI * k / 120)]);
      m.poly([[V.x[0], V.y[0]], [V.x[1], V.y[0]], [V.x[1], V.y[1]], [V.x[0], V.y[1]]], { fill: c.region, opacity: 0.6 });
      m.poly(circle, { fill: c.surface });
      m.poly(circle, { fill: m.hatch });
      m.curve(circle, { stroke: c.ink2, 'stroke-width': 2.4 });
      m.text([0, -0.25], 'hole: not allowed', { 'text-anchor': 'middle', 'font-weight': 500 });
    }
    cs.radii.forEach(r => {
      const pts = Array.from({ length: 121 }, (_, k) => [cs.centre[0] + r * Math.cos(2 * Math.PI * k / 120), cs.centre[1] + r * Math.sin(2 * Math.PI * k / 120)]);
      m.curve(pts, { stroke: c.s1, 'stroke-width': 1.3, opacity: 0.5 });
    });
    m.dot(cs.centre, fs * 0.2, c.s1);
    m.text(cs.centre, cs.centreLabel, cs.region === 'hole' ? { dx: 0.4, dy: 0.9 } : { dx: 0.4, dy: 0.9 });
    if (state.walk != null) {
      const trail = [];
      for (let k = 0; k <= 40; k++) trail.push(walkPoint(s.walk, state.walk * k / 40));
      m.curve(trail, { stroke: c.s5, 'stroke-width': 4 }, true);
      const here = walkPoint(s.walk, state.walk);
      m.dot(here, fs * 0.3, c.s5);
      // Clear of the λ labels, which sit beside the KKT points the walk ends at.
      m.text(here, 'f = ' + num(cs.f(here), 2), s.walk === 'circle' ? { dx: 0.4, dy: -1.6 } : { dx: 0.6, dy: 1.3 });
    }
    s.show.forEach(k => {
      const pt = cs.points[k];
      m.ring(pt.x, fs * 0.62, !s.verdict ? c.ink2 : pt.best ? c.s2 : c.bad);
      m.dot(pt.x, fs * 0.24, s.verdict && pt.best ? c.s2 : c.ink);
      m.text(pt.x, 'λ = ' + fracText(pt.lam), { dx: pt.at[0], dy: pt.at[1], 'text-anchor': pt.end ? 'end' : 'start' });
    });
  }
  function renderSide(index) {
    const s = STEPS[index], cs = CASES[s.use];
    ANIM.setText(root, TEXT[s.kind]);
    tex($('.js-caption'), cs.caption);
    const body = $('.js-points'), name = pt => '(' + pt.x.map(fracText).join(', ') + ')';
    const sel = s.show.includes(state.sel) ? state.sel : s.show[0];
    body.replaceChildren();
    s.show.forEach(k => {
      const pt = cs.points[k], tr = document.createElement('tr');
      if (pt.best && s.verdict) tr.classList.add('best');
      if (k === sel) tr.classList.add('sel');
      // The point is a button: it lists that point's conditions below the table.
      const td0 = document.createElement('td'), btn = document.createElement('button');
      btn.className = 'pt'; btn.textContent = name(pt); btn.setAttribute('aria-pressed', String(k === sel));
      btn.addEventListener('click', () => { state.sel = k; stepper.repaint(); });
      td0.appendChild(btn); tr.appendChild(td0);
      const all = conditionRows(cs, pt).every(row => row.state === 'done');
      const verdict = !s.verdict ? ['?'] : pt.best ? ['yes ✓', 'yes'] : ['no ✗', 'no'];
      [[fracText(pt.lam)], [fracText(cs.f(pt.x))], all ? ['all hold ✓', 'yes'] : ['not all ✗', 'no'], verdict].forEach(([text, cls]) => {
        const td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    const pt = cs.points[sel];
    $('.js-cond-head').textContent = 'Conditions at ' + name(pt) + ', λ = ' + fracText(pt.lam) + ' (slide ' + (cs.nonneg ? 26 : 17) + ')' +
      (s.show.length > 1 ? '. Click a point to switch.' : '.');
    ANIM.conditionList($('.js-conds'), conditionRows(cs, pt));
  }
})();
