/* =====================================================================
   WEEK 2 · BISECTION (slides 17–21)
   Notation follows the slides: x′ trial solution, x̲ / x̄ lower / upper bound,
   ε error tolerance; stop when x̄ − x̲ ≤ 2ε (slide 19). Iterations are numbered
   like the slide 21 table: row 0 is the initial bracket and its midpoint; row i
   holds f′ at the previous x′, the new bounds and the new x′.
   ===================================================================== */
(() => {
  const root = document.getElementById('bisection');
  const $ = sel => root.querySelector(sel);
  const { num, fixed, tex, svgEl, px, colors, MINUS } = ANIM;

  const EXAMPLES = {
    lecture: {
      f: x => 12 * x - 3 * x ** 4 - 2 * x ** 6,
      d: x => 12 - 12 * x ** 3 - 12 * x ** 5,
      lo: 0, hi: 2, eps: 0.001, y: [-14, 10],
      xticks: [0, 0.5, 1, 1.5, 2], yticks: [-10, -5, 0, 5, 10],
      fTex: '\\max\\; f(x) = 12x - 3x^4 - 2x^6',
      dTex: "f'(x) = 12 - 12x^3 - 12x^5",
      epsTex: '\\varepsilon = 0.001',
      note: 'Near x = 2 the curve goes below the picture (f(2) = −152). The graph does not zoom; the strip below it does.'
    },
    parabola: {
      f: x => 8 - (x - 1.3) ** 2,
      d: x => -2 * (x - 1.3),
      lo: 0, hi: 4, eps: 0.01, y: [-0.6, 9],
      xticks: [0, 1, 2, 3, 4], yticks: [0, 2, 4, 6, 8],
      fTex: '\\max\\; f(x) = 8 - (x - 1.3)^2',
      dTex: "f'(x) = -2(x - 1.3)",
      epsTex: '\\varepsilon = 0.01',
      note: 'A warm-up curve, not from the slides. The strip below the graph zooms in on the interval.'
    }
  };
  const PHASE_OF = { start: 3, slope: 0, keep: 1, move: 2, mid: 3 };
  let ex = null, data = null;

  // === STEP LIST (computed once per example, then replayed) ===
  function build(example) {
    const rows = [];
    const steps = [];
    let lo = example.lo, hi = example.hi, x = (lo + hi) / 2;
    const done = (a, b) => b - a <= 2 * example.eps;
    rows.push({ i: 0, d: null, lo, hi, x, fx: example.f(x), w: hi - lo });
    steps.push({ kind: 'start', i: 0, lo, hi, x, stop: done(lo, hi) });
    for (let i = 1; i < 60 && !done(lo, hi); i++) {
      const d = example.d(x);
      if (d === 0) { steps.push({ kind: 'slope', i, lo, hi, x, d, exact: true }); break; }
      const nlo = d > 0 ? x : lo, nhi = d > 0 ? hi : x;
      steps.push({ kind: 'slope', i, lo, hi, x, d });
      steps.push({ kind: 'keep', i, lo, hi, x, d, nlo, nhi });
      steps.push({ kind: 'move', i, lo, hi, x, d, nlo, nhi });
      lo = nlo; hi = nhi;
      const nx = (lo + hi) / 2;
      rows.push({ i, d, lo, hi, x: nx, fx: example.f(nx), w: hi - lo });
      steps.push({ kind: 'mid', i, lo, hi, x: nx, prev: x, d, stop: done(lo, hi) });
      x = nx;
    }
    return { rows, steps };
  }

  // Bracket shown for a step at animation progress p (the bound slides first,
  // then the zoom strip rescales).
  function bracketAt(s, p) {
    if (s.kind !== 'move') return { L: s.lo, R: s.hi, zoomL: s.lo, zoomR: s.hi, slide: 1 };
    const slide = Math.min(1, p / 0.55);
    const zoom = Math.max(0, (p - 0.55) / 0.45);
    const L = s.lo + (s.nlo - s.lo) * slide, R = s.hi + (s.nhi - s.hi) * slide;
    return { L, R, slide, zoomL: s.lo + (s.nlo - s.lo) * zoom, zoomR: s.hi + (s.nhi - s.hi) * zoom };
  }

  // === MAIN GRAPH ===
  function drawPlot(s, p) {
    const svg = $('.js-plot');
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const c = colors(), fs = px(root);
    const span = ex.hi - ex.lo, x0 = ex.lo - 0.035 * span, x1 = ex.hi + 0.035 * span;
    const padL = fs * 2.7, padR = fs * 0.9, padT = fs * 1.7, padB = fs * 1.7;
    const X = v => padL + (v - x0) / (x1 - x0) * (W - padL - padR);
    const Y = v => padT + (ex.y[1] - v) / (ex.y[1] - ex.y[0]) * (H - padT - padB);
    const top = Y(ex.y[1]), bottom = Y(ex.y[0]);
    const tick = Math.round(fs * 0.78);
    const halo = { 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4, 'stroke-linejoin': 'round' };

    const defs = svgEl(svg, 'defs');
    const clip = svgEl(defs, 'clipPath', { id: 'bi-clip' });
    svgEl(clip, 'rect', { x: padL, y: top, width: W - padL - padR, height: bottom - top });
    // Discarded half: crossed out in the "critical" color on a plain surface,
    // so it never reads as a third tint of blue or violet.
    const hatch = svgEl(defs, 'pattern', { id: 'bi-hatch', patternUnits: 'userSpaceOnUse', width: 11, height: 11, patternTransform: 'rotate(45)' });
    svgEl(hatch, 'rect', { width: 11, height: 11, fill: c.surface });
    svgEl(hatch, 'line', { x1: 0, y1: 0, x2: 0, y2: 11, stroke: c.bad, 'stroke-width': 3, opacity: 0.4 });
    const plot = svgEl(svg, 'g', { 'clip-path': 'url(#bi-clip)' });

    const b = bracketAt(s, p);
    // Where x* can still be: the bracket.
    svgEl(plot, 'rect', { x: X(b.L), y: top, width: Math.max(0, X(b.R) - X(b.L)), height: bottom - top, fill: c.region, opacity: 0.55 });
    // The half that cannot hold x*.
    let cut = null;
    if (s.kind === 'keep') cut = s.d > 0 ? [s.lo, s.x] : [s.x, s.hi];
    if (s.kind === 'move' && b.slide < 1) cut = s.d > 0 ? [s.lo, b.L] : [b.R, s.hi];
    if (cut) {
      const fade = s.kind === 'keep' ? p : 1 - b.slide;
      svgEl(plot, 'rect', { x: X(cut[0]), y: top, width: Math.max(0, X(cut[1]) - X(cut[0])), height: bottom - top, fill: 'url(#bi-hatch)', opacity: fade });
      if (s.kind === 'keep' && X(cut[1]) - X(cut[0]) > fs * 6) {
        svgEl(svg, 'text', { x: (X(cut[0]) + X(cut[1])) / 2, y: top + fs * 1.1, 'text-anchor': 'middle', fill: c.ink, 'font-size': tick, 'font-weight': 600, opacity: fade, ...halo }, 'x* is not here');
      }
    }
    // Grid and ticks.
    ex.xticks.forEach(v => {
      svgEl(plot, 'line', { x1: X(v), x2: X(v), y1: top, y2: bottom, stroke: c.grid });
      svgEl(svg, 'text', { x: X(v), y: bottom + fs * 1.15, 'text-anchor': 'middle', fill: c.ink2, 'font-size': tick }, num(v, 2));
    });
    ex.yticks.forEach(v => {
      svgEl(plot, 'line', { x1: padL, x2: W - padR, y1: Y(v), y2: Y(v), stroke: c.grid });
      svgEl(svg, 'text', { x: padL - fs * 0.4, y: Y(v) + tick * 0.35, 'text-anchor': 'end', fill: c.ink2, 'font-size': tick }, num(v, 0));
    });
    if (ex.y[0] < 0 && ex.y[1] > 0) svgEl(plot, 'line', { x1: padL, x2: W - padR, y1: Y(0), y2: Y(0), stroke: c.axis, 'stroke-width': 1.5 });
    svgEl(svg, 'text', { x: W - padR, y: bottom + fs * 1.15, 'text-anchor': 'end', fill: c.ink2, 'font-size': tick, 'font-style': 'italic' }, 'x');
    svgEl(svg, 'text', { x: padL - fs * 0.4, y: top - fs * 0.5, 'text-anchor': 'end', fill: c.ink2, 'font-size': tick, 'font-style': 'italic' }, 'f(x)');

    // The function.
    let d = '';
    for (let k = 0; k <= 600; k++) {
      const v = x0 + (x1 - x0) * k / 600;
      d += (k ? 'L' : 'M') + X(v).toFixed(1) + ',' + Y(ex.f(v)).toFixed(1);
    }
    svgEl(plot, 'path', { d, fill: 'none', stroke: c.s1, 'stroke-width': 3.2 });

    // Bounds: dashed lines, labelled while there is room (the strip takes over later).
    [[b.L, 'lo'], [b.R, 'hi']].forEach(([v, which]) => {
      svgEl(plot, 'line', { x1: X(v), x2: X(v), y1: top, y2: bottom, stroke: c.ink2, 'stroke-width': 1.6, 'stroke-dasharray': '6 5' });
    });
    if (X(b.R) - X(b.L) > fs * 7.5) {
      boundLabel(svg, X(b.L) + fs * 0.3, top - fs * 0.45, 'lo', num(b.L, 6), 'start', c, tick);
      boundLabel(svg, X(b.R) - fs * 0.3, top - fs * 0.45, 'hi', num(b.R, 6), 'end', c, tick);
    } else {
      svgEl(svg, 'text', { x: (X(b.L) + X(b.R)) / 2, y: top - fs * 0.45, 'text-anchor': 'middle', fill: c.ink2, 'font-size': tick }, 'too narrow to see here: look at the strip below');
    }

    // Trial solution x′ (and the tangent at it).
    const showOld = !(s.kind === 'move' && b.slide >= 1);
    const mx = s.x, my = ex.f(mx);
    const grow = s.kind === 'mid' || s.kind === 'start' ? p : 1;
    if (showOld) {
      svgEl(plot, 'line', { x1: X(mx), x2: X(mx), y1: Y(my), y2: bottom, stroke: c.s5, 'stroke-width': 1.6, 'stroke-dasharray': '3 4', opacity: grow });
    }
    if ((s.kind === 'slope' || s.kind === 'keep') && !s.exact) {
      // Fixed on-screen length so a steep slope does not shoot off the graph.
      const sx = (W - padL - padR) / (x1 - x0), sy = (bottom - top) / (ex.y[1] - ex.y[0]);
      let vx = 1, vy = -s.d * sy / sx;
      const len = Math.hypot(vx, vy); vx /= len; vy /= len;
      const half = fs * 3.4 * (s.kind === 'slope' ? p : 1);
      const ax = X(mx) - vx * half, ay = Y(my) - vy * half, bx = X(mx) + vx * half, by = Y(my) + vy * half;
      svgEl(svg, 'line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: c.surface, 'stroke-width': 8, 'stroke-linecap': 'round' });
      svgEl(svg, 'line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: c.s5, 'stroke-width': 3.6, 'stroke-linecap': 'round' });
      arrowHead(svg, bx, by, vx, vy, fs * 0.55, c.s5);
      const lx = bx + fs * 0.4, ly = by + (vy < 0 ? -fs * 0.3 : fs * 0.9);
      svgEl(svg, 'text', { x: lx, y: ly, fill: c.ink, 'font-size': Math.round(fs * 0.9), 'font-weight': 700, ...halo }, 'f′(x′) ' + (s.d > 0 ? '> 0' : '< 0'));
    }
    if (showOld) {
      const r = fs * 0.38 * grow;
      const isStop = s.kind === 'mid' && s.stop;
      svgEl(svg, 'circle', { cx: X(mx), cy: Y(my), r: Math.max(0.1, r + 2), fill: c.surface });
      svgEl(svg, 'circle', { cx: X(mx), cy: Y(my), r: Math.max(0.1, r), fill: isStop ? c.s2 : c.s5 });
      if (isStop) svgEl(svg, 'circle', { cx: X(mx), cy: Y(my), r: r + fs * 0.35, fill: 'none', stroke: c.s2, 'stroke-width': 2.5 });
      svgEl(svg, 'text', { x: X(mx) + fs * 0.55, y: Y(my) - fs * 0.55, fill: c.ink, 'font-size': Math.round(fs * 0.95), 'font-weight': 700, opacity: grow, ...halo }, 'x′');
    }
  }

  function boundLabel(svg, x, y, which, value, anchor, c, size) {
    const t = svgEl(svg, 'text', { x, y, 'text-anchor': anchor, fill: c.ink, 'font-size': size, 'font-weight': 600 });
    svgEl(t, 'tspan', { 'text-decoration': which === 'lo' ? 'underline' : 'overline' }, 'x');
    svgEl(t, 'tspan', {}, ' = ' + value);
  }
  function arrowHead(svg, x, y, vx, vy, size, color) {
    const nx = -vy, ny = vx;
    const pts = [[x + vx * size, y + vy * size], [x - nx * size * 0.6, y - ny * size * 0.6], [x + nx * size * 0.6, y + ny * size * 0.6]];
    svgEl(svg, 'polygon', { points: pts.map(q => q.join(',')).join(' '), fill: color });
  }

  // === ZOOM STRIP: the bracket always fills the strip ===
  function drawStrip(s, p) {
    const svg = $('.js-strip');
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const c = colors(), fs = px(root), size = Math.round(fs * 0.78);
    const b = bracketAt(s, p);
    const margin = (b.zoomR - b.zoomL) * 0.07;
    const vL = b.zoomL - margin, vR = b.zoomR + margin;
    const padX = fs * 1.2;
    const S = v => padX + (v - vL) / (vR - vL) * (W - 2 * padX);
    const yBar = H * 0.48;
    const digits = Math.min(9, Math.max(2, Math.ceil(-Math.log10(Math.max(1e-12, b.R - b.L))) + 2));
    svgEl(svg, 'line', { x1: S(b.L), x2: S(b.R), y1: yBar, y2: yBar, stroke: c.region, 'stroke-width': fs * 0.6, 'stroke-linecap': 'round' });
    let cut = null;
    if (s.kind === 'keep') cut = s.d > 0 ? [s.lo, s.x] : [s.x, s.hi];
    if (s.kind === 'move' && b.slide < 1) cut = s.d > 0 ? [s.lo, b.L] : [b.R, s.hi];
    if (cut) {
      const fade = s.kind === 'keep' ? p : 1 - b.slide;
      svgEl(svg, 'line', { x1: S(cut[0]), x2: S(cut[1]), y1: yBar, y2: yBar, stroke: c.surface, 'stroke-width': fs * 0.6 + 2 });
      svgEl(svg, 'line', { x1: S(cut[0]), x2: S(cut[1]), y1: yBar, y2: yBar, stroke: c.bad, 'stroke-width': fs * 0.6, opacity: 0.8 * fade });
    }
    const marks = [[b.L, 'lo', c.ink2], [b.R, 'hi', c.ink2]];
    const showX = !(s.kind === 'move' && b.slide >= 1);
    if (showX) marks.push([s.x, 'x', c.s5]);
    marks.forEach(([v, name, color]) => {
      const sx = S(v);
      if (name === 'x') {
        svgEl(svg, 'circle', { cx: sx, cy: yBar, r: fs * 0.36 + 2, fill: c.surface });
        svgEl(svg, 'circle', { cx: sx, cy: yBar, r: fs * 0.36, fill: color });
      } else {
        svgEl(svg, 'line', { x1: sx, x2: sx, y1: yBar - fs * 0.6, y2: yBar + fs * 0.6, stroke: c.ink, 'stroke-width': 2.4 });
      }
      const anchor = name === 'lo' ? 'start' : name === 'hi' ? 'end' : 'middle';
      const off = name === 'lo' ? -fs * 0.15 : name === 'hi' ? fs * 0.15 : 0;
      const label = svgEl(svg, 'text', { x: sx + off, y: yBar - fs * 0.85, 'text-anchor': anchor, fill: c.ink, 'font-size': size, 'font-weight': 700 });
      if (name === 'x') label.textContent = 'x′';
      else svgEl(label, 'tspan', { 'text-decoration': name === 'lo' ? 'underline' : 'overline' }, 'x');
      svgEl(svg, 'text', { x: sx + off, y: yBar + fs * 1.45, 'text-anchor': anchor, fill: c.ink2, 'font-size': size }, num(v, digits));
    });
  }

  // === SIDE PANEL ===
  function renderSide(s, p) {
    const phase = PHASE_OF[s.kind];
    [...$('.js-phases').children].forEach((n, k) => n.classList.toggle('on', k === phase));
    const stopNow = s.kind === 'mid' && s.stop;
    $('.js-iter').textContent = s.kind === 'start' ? 'Iteration 0 · start' : 'Iteration ' + s.i + (stopNow ? ' · stop' : '');
    const lo = s.kind === 'move' ? s.nlo : s.lo, hi = s.kind === 'move' ? s.nhi : s.hi;
    const right = s.d > 0;
    let title, text, formula;
    if (s.kind === 'start') {
      title = 'Start: the peak x* is between two bounds.';
      text = 'x* is between the lower bound x̲ and the upper bound x̄. The slope is positive at x̲ and negative at x̄ (slide 19). Our first trial solution x′ is the middle point.';
      formula = "x' = \\frac{\\underline{x} + \\bar{x}}{2} = \\frac{" + num(s.lo, 6) + ' + ' + num(s.hi, 6) + '}{2} = ' + num(s.x, 9);
    } else if (s.kind === 'slope' && s.exact) {
      title = 'Step 1 · The slope is zero, so x′ is the peak.';
      text = 'f is concave and f′(x′) = 0, so x′ is the maximum. We stop.';
      formula = "f'(" + num(s.x, 9) + ') = 0';
    } else if (s.kind === 'slope') {
      title = 'Step 1 · Look at the slope at x′.';
      text = right ? 'The tangent goes up. f still increases here, so the peak is to the right of x′.'
                   : 'The tangent goes down. f already decreases here, so the peak is to the left of x′.';
      formula = "f'(" + num(s.x, 9) + ') = ' + fixed(s.d, 3).replace(MINUS, '-') + (right ? ' > 0' : ' < 0');
    } else if (s.kind === 'keep') {
      title = right ? 'Steps 2–3 · Keep the right half.' : 'Steps 2–3 · Keep the left half.';
      text = right ? 'f is concave and the slope is positive, so x* > x′. The left half cannot hold the peak. x′ becomes the new lower bound.'
                   : 'f is concave and the slope is negative, so x* < x′. The right half cannot hold the peak. x′ becomes the new upper bound.';
      // Two aligned lines: one long line would wrap at a random "=" in a narrow panel.
      formula = right ? "\\begin{aligned} f'(x') > 0 &\\;\\Rightarrow\\; x^* > x' \\\\ &\\;\\Rightarrow\\; \\underline{x} = x' = " + num(s.x, 9) + ' \\end{aligned}'
                      : "\\begin{aligned} f'(x') < 0 &\\;\\Rightarrow\\; x^* < x' \\\\ &\\;\\Rightarrow\\; \\bar{x} = x' = " + num(s.x, 9) + ' \\end{aligned}';
    } else if (s.kind === 'move') {
      title = 'Move the bound. The interval is now half as wide.';
      text = 'x* is still inside the new interval. The strip below the graph zooms in on it.';
      formula = '\\begin{aligned} \\underline{x} &= ' + num(s.nlo, 9) + ' \\\\ \\bar{x} &= ' + num(s.nhi, 9) + ' \\end{aligned}';
    } else if (stopNow) {
      title = 'Stop: x′ is close enough to x*.';
      text = 'Now x̄ − x̲ ≤ 2ε. x* is inside the interval and x′ is its middle. So x′ is at most ε away from x*.';
      formula = "\\begin{aligned} x' &= " + num(s.x, 9) + ' \\\\ \\bar{x} - \\underline{x} &= ' + fixed(s.hi - s.lo, 5) + ' \\le 2\\varepsilon = ' + num(2 * ex.eps, 4) + ' \\end{aligned}';
    } else {
      title = 'Step 4 · New trial solution: the middle point.';
      text = 'We stop when x̄ − x̲ ≤ 2ε, because then x′ is at most ε away from x*. Not yet, so we test this new x′.';
      formula = "\\begin{aligned} x' &= \\tfrac{1}{2}(" + num(s.lo, 9) + ' + ' + num(s.hi, 9) + ') = ' + num(s.x, 9) + ' \\\\ \\bar{x} - \\underline{x} &= ' + num(s.hi - s.lo, 9) + ' > 2\\varepsilon = ' + num(2 * ex.eps, 4) + ' \\end{aligned}';
    }
    $('.js-title').textContent = title;
    $('.js-text').textContent = text;
    tex($('.js-formula'), formula);
    const width = hi - lo;
    $('.js-stats').innerHTML =
      '<div class="stat"><span>Interval width <span class="hi">x</span> − <span class="lo">x</span></span><b class="js-width">' + num(width, 9) + '</b></div>' +
      '<div class="stat"><span>x′ is at most this far from x*</span><b class="js-error">' + num(width / 2, 9) + '</b></div>' +
      '<div class="stat"><span>Stop when the width is ≤ 2ε</span><b>' + num(2 * ex.eps, 4) + '</b></div>';
    renderTable(s);
  }

  function renderTable(s) {
    const body = $('.js-rows');
    body.replaceChildren();
    let current = null;
    for (let r = 0; r <= s.i && r < data.rows.length; r++) {
      const row = data.rows[r];
      let level = 3;
      if (r === s.i && s.kind !== 'mid' && s.kind !== 'start') level = s.kind === 'move' ? 2 : 1;
      const cells = [
        String(row.i),
        r > 0 && level >= 1 ? fixed(row.d, 3) : '',
        level >= 2 ? num(row.lo, 6) : '',
        level >= 2 ? num(row.hi, 6) : '',
        level >= 3 ? num(row.x, 6) : '',
        level >= 3 ? fixed(row.fx, 4) : '',
        level >= 3 ? fixed(row.w, 5) : ''
      ];
      const tr = document.createElement('tr');
      if (r === s.i) { tr.className = 'now'; current = tr; }
      if (r === s.i && s.kind === 'mid' && s.stop) tr.className = 'now stop';
      cells.forEach(text => { const td = document.createElement('td'); td.textContent = text; tr.appendChild(td); });
      body.appendChild(tr);
    }
    const wrap = $('.js-tablewrap');
    if (current) {
      const bottom = current.offsetTop + current.offsetHeight;
      if (bottom > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = bottom - wrap.clientHeight + 2;
    }
  }

  // === WIRING ===
  function render(index, p) {
    const s = data.steps[index];
    drawPlot(s, p);
    drawStrip(s, p);
    renderSide(s, p);
  }
  const stepper = ANIM.stepper({ root, total: () => data.steps.length, render, duration: 620 });

  function useExample(key) {
    if (!EXAMPLES[key]) key = 'lecture';
    ex = EXAMPLES[key];
    data = build(ex);
    root.querySelectorAll('.js-example').forEach(b => b.classList.toggle('active', b.dataset.example === key));
    $('.js-caption').innerHTML = '<span class="js-ftex"></span><span class="js-dtex"></span><span class="js-eps"></span>';
    tex($('.js-ftex'), ex.fTex); tex($('.js-dtex'), ex.dTex); tex($('.js-eps'), ex.epsTex);
    $('.js-note').textContent = ex.note;
    $('.js-fine').innerHTML = 'Why it works: f is concave on [<span class="lo">x</span>, <span class="hi">x</span>] and f′(<span class="lo">x</span>) &gt; 0 &gt; f′(<span class="hi">x</span>). So the sign of f′(x′) tells us on which side x* is (slides 17, 19). ' +
      'The table is the table of slide 21. Its last column is the interval width (slide 21 calls it “Error”). The error of x′ is at most half of it.';
    stepper.go(0);
  }
  root.querySelectorAll('.js-example').forEach(b => b.addEventListener('click', () => useExample(b.dataset.example)));
  new ResizeObserver(() => { if (!root.hidden) stepper.repaint(); }).observe($('.js-plot'));
  window.addEventListener('themechange', () => { if (!root.hidden) stepper.repaint(); });

  useExample(ANIM.params.get('example') || 'lecture');
  ANIM.register('bisection', {
    activate() { stepper.repaint(); },
    deactivate() { stepper.stop(); },
    step: dir => stepper.step(dir),
    restart: () => stepper.go(0),
    togglePlay: () => stepper.togglePlay(),
    debug: () => ({ index: stepper.index, total: data.steps.length, step: data.steps[stepper.index], rows: data.rows, eps: ex.eps })
  });
})();
