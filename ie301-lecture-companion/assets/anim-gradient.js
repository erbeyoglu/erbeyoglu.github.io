/* =====================================================================
   WEEK 3 · GRADIENT SEARCH (slides 17–28)
   The procedure of slide 24: at x′ take the direction ∇f(x′), keep it fixed,
   maximize φ(t) = f(x′ + t∇f(x′)) over t ≥ 0, move to x′ + t*∇f(x′), then
   recompute the gradient. Stop when every |∂f/∂xj| ≤ ε.
   Both examples are the slides' own: Example 1 (slides 25–26) and Example 2
   (slides 27–28, the zigzag figure).
   ===================================================================== */
(() => {
  const root = document.getElementById('gradient');
  const $ = sel => root.querySelector(sel);
  const { num, fracText, fracTex, tex, svgEl, px, colors, ellipse } = ANIM;

  // f and ∇f are typed exactly as on the slides. H and the peak c are used
  // only for the floor contours and the exact line search (both examples are
  // concave quadratics, so φ(t) is a parabola and t* = gᵀg / (−gᵀHg)).
  // dom is the drawn square: it holds every slice of the search, and the hill
  // is never cropped (the lowest drawn height is the lowest corner).
  const EXAMPLES = {
    ex1: {
      f: x => -((x[0] - 3) ** 2) - (x[1] - 2) ** 2,
      grad: x => [-2 * (x[0] - 3), -2 * (x[1] - 2)],
      H: [[-2, 0], [0, -2]], c: [3, 2], fTop: 0,
      start: [1, 1], dom: [[0, 5], [0, 4]], eps: 0.05,
      ticks: [[0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4]], levels: [-0.5, -2, -4, -6, -8, -10, -12],
      camera: [-0.55, 0.62],
      fTex: '\\max\\; f(x_1, x_2) = -(x_1 - 3)^2 - (x_2 - 2)^2',
      startText: 'Example 1 (slide 25) starts at x′ = (1, 1). We want to go up the hill, but we do not know where the top is.',
      stopText: 'Both partial derivatives are 0, so we stop (slide 26: ∇f(3, 2) = (0, 0)). One step was enough.'
    },
    ex2: {
      f: x => 2 * x[0] * x[1] + 2 * x[1] - x[0] ** 2 - 2 * x[1] ** 2,
      grad: x => [2 * x[1] - 2 * x[0], 2 * x[0] + 2 - 4 * x[1]],
      H: [[-2, 2], [2, -4]], c: [1, 1], fTop: 1,
      start: [0, 0], dom: [[-0.15, 1.35], [-0.15, 1.35]], eps: 0.05,
      ticks: [[0, 0.5, 1], [0, 0.5, 1]], levels: [0.9, 0.7, 0.4, 0, -0.5, -1, -1.6, -2.2],
      camera: [-0.95, 0.66],
      fTex: '\\max\\; f(x_1, x_2) = 2x_1x_2 + 2x_2 - x_1^2 - 2x_2^2',
      startText: 'Example 2 (slide 27) starts at x′ = (0, 0). Slide 28 shows the path of this search.',
      stopText: 'Every |∂f/∂xⱼ| is now at most ε = 0.05, so we stop. The path gets closer and closer to x* = (1, 1), as in slide 28.'
    }
  };
  const PHASE_OF = { start: -1, gradient: 0, slice: 1, best: 2, move: 3, check: 4 };
  const KINDS = ['gradient', 'slice', 'best', 'move', 'check'];
  let ex = null, rounds = [], steps = [], mesh = null, isolate = false;
  let probe = 0, probeRound = -1;
  let current = { s: null, p: 1 };
  const s3d = ANIM.surface3d({
    root, canvas: $('.js-canvas'),
    redraw: smooth => draw3D(smooth),
    onSpin: on => $('.js-spin').setAttribute('aria-pressed', String(on))
  });

  // === LINE SEARCHES (computed once per example) ===
  function buildRounds(example) {
    const list = [];
    let x = example.start.slice();
    for (let k = 1; k <= 40; k++) {
      const g = example.grad(x);
      const gg = g[0] * g[0] + g[1] * g[1];
      if (gg === 0) break;
      const Hg = [example.H[0][0] * g[0] + example.H[0][1] * g[1], example.H[1][0] * g[0] + example.H[1][1] * g[1]];
      const gHg = g[0] * Hg[0] + g[1] * Hg[1];
      const t = gg / -gHg;
      const next = [x[0] + t * g[0], x[1] + t * g[1]];
      const gNext = example.grad(next);
      const stop = Math.max(Math.abs(gNext[0]), Math.abs(gNext[1])) <= example.eps;
      // φ(t) = f(x′) + (gᵀg) t + ½ (gᵀHg) t²
      list.push({ k, x, g, t, next, gNext, stop, phi: [example.f(x), gg, gHg / 2] });
      if (stop) break;
      x = next;
    }
    return list;
  }
  function buildSteps() {
    const list = [{ kind: 'start', r: 0 }];
    rounds.forEach((round, r) => KINDS.forEach(kind => list.push({ kind, r })));
    return list;
  }
  const phiAt = (round, t) => round.phi[0] + round.phi[1] * t + round.phi[2] * t * t;
  const vecText = v => '(' + v.map(fracText).join(', ') + ')';
  const vecTex = v => '(' + v.map(fracTex).join(',\\ ') + ')';
  function polyTex(coef) {
    const terms = [];
    [[coef[0], ''], [coef[1], 't'], [coef[2], 't^2']].forEach(([a, power]) => {
      if (Math.abs(a) < 1e-12) return;
      const mag = Math.abs(a), sign = a < 0 ? '-' : '+';
      const body = power && Math.abs(mag - 1) < 1e-12 ? power : fracTex(mag) + power;
      terms.push({ sign, body });
    });
    if (!terms.length) return '0';
    return terms.map((term, k) => (k === 0 ? (term.sign === '-' ? '-' : '') : ' ' + term.sign + ' ') + term.body).join('');
  }
  function sliceSegment(x, g, tMax) {
    // Clip x + t g, 0 ≤ t ≤ tMax, to the drawn domain.
    let hi = tMax;
    for (let j = 0; j < 2; j++) {
      if (g[j] > 0) hi = Math.min(hi, (ex.dom[j][1] - x[j]) / g[j]);
      if (g[j] < 0) hi = Math.min(hi, (ex.dom[j][0] - x[j]) / g[j]);
    }
    return Math.max(0, hi);
  }

  // === 3D VIEW ===
  function draw3D(smooth = false) {
    if (!mesh || !current.s) return;
    const state = sceneState();
    const sl = state.slice;
    s3d.draw({
      meshes: [{ mesh, mode: isolate ? 'ghost' : 'solid' }],
      planes: sl ? [{ a: sl.x, b: [sl.x[0] + sl.tEnd * sl.g[0], sl.x[1] + sl.tEnd * sl.g[1]], alpha: isolate ? 0.08 : 0.16 }] : [],
      floor: { ticks: ex.ticks, contours: ex.levels.map(level => ellipse(ex.c, ex.H, ex.fTop, level)) },
      overlay: api => overlay(api, state)
    }, smooth);
  }
  function overlay(api, state) {
    const { c, fs, onSurface, at, zFloor } = api;
    const f = ex.f;
    if (state.slice) {
      const { x, g, tEnd, round } = state.slice;
      const cut = [];
      for (let k = 0; k <= 80; k++) { const t = tEnd * k / 80; cut.push(onSurface(f, [x[0] + t * g[0], x[1] + t * g[1]], 0.006)); }
      if (isolate) {
        // The isolated slice as a cut-out sheet: the shape φ(t) has below.
        const ctx = api.ctx, a = at(x[0], x[1], zFloor), b = at(x[0] + tEnd * g[0], x[1] + tEnd * g[1], zFloor);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); cut.forEach(v => ctx.lineTo(v[0], v[1])); ctx.lineTo(b[0], b[1]); ctx.closePath();
        ctx.fillStyle = api.rgba(api.violet, 0.26); ctx.fill();
      }
      api.polyline(cut, c.s5, 4.2);
      if (state.probe != null) {
        const t = state.probe, pt = [x[0] + t * g[0], x[1] + t * g[1]];
        const top = onSurface(f, pt);
        api.dashed(top, at(pt[0], pt[1], zFloor), c.s5);
        api.disc(top, fs * 0.36, c.s5);
        if (!state.showBest && t > 0) api.label('t = ' + fracText(t), top, 0, 1.15, 'center');
      }
      if (state.showBest) api.ring(onSurface(f, [x[0] + round.t * g[0], x[1] + round.t * g[1]]), fs * 0.6, c.s2);
    }
    // The path is drawn in ink: on a blue hill a blue path would disappear.
    if (state.path.length > 1) api.polyline(state.path.map(v => onSurface(f, v)), c.ink, 3.4);
    state.visited.forEach(v => api.disc(onSurface(f, v), fs * 0.2, c.ink));
    state.arrows.forEach(a => api.arrow(f, a.from, a.dir, a.color, a.label, a.faded));
    if (state.target) { api.ring(onSurface(f, state.target), fs * 0.62, c.s2); api.label(state.targetLabel, onSurface(f, state.target), 0.7, -1.1); }
    const here = onSurface(f, state.point);
    api.disc(here, fs * 0.36, c.ink);
    // Put the x′ label on the side away from the path, the arrow and the slice.
    const away = [];
    if (state.path.length > 1) away.push(onSurface(f, state.path[state.path.length - 2]));
    state.arrows.forEach(a => away.push(onSurface(f, [a.from[0] + a.dir[0] * 1e-3, a.from[1] + a.dir[1] * 1e-3])));
    if (state.slice) { const { x, g, tEnd } = state.slice; away.push(onSurface(f, [x[0] + g[0] * tEnd / 2, x[1] + g[1] * tEnd / 2])); }
    let ax = 0, ay = 0;
    away.forEach(q => { const dx = q[0] - here[0], dy = q[1] - here[1], n = Math.hypot(dx, dy) || 1; ax += dx / n; ay += dy / n; });
    let n = Math.hypot(ax, ay);
    if (n < 0.3) { ax = 1; ay = -1; n = Math.SQRT2; }
    // Only "x′" here: its coordinates are in the side panel, and a long label
    // would cover the zigzag.
    api.label('x′', here, -ax / n * 0.95, -ay / n * 0.95, 'center');
  }

  // === WHAT EACH STEP SHOWS ===
  function sceneState() {
    const { s, p } = current;
    const round = rounds[s.r];
    const done = rounds.slice(0, s.r);
    const visited = [ex.start, ...done.map(r => r.next)];
    const out = { path: visited.slice(), visited: visited.slice(0, -1), arrows: [], slice: null, probe: null, showBest: false, point: visited[visited.length - 1], target: null };
    if (s.kind === 'start' || !round) return out;
    const tEnd = sliceSegment(round.x, round.g, 2 * round.t);
    if (s.kind === 'gradient') out.arrows.push({ from: round.x, dir: round.g, color: colors().s5, label: '∇f(x′)' });
    if (s.kind === 'slice' || s.kind === 'best') {
      out.arrows.push({ from: round.x, dir: round.g, color: colors().s5 });
      out.slice = { x: round.x, g: round.g, tEnd, round };
      out.probe = probe;
      out.showBest = s.kind === 'best';
    }
    if (s.kind === 'move') {
      const t = round.t * p;
      out.point = [round.x[0] + t * round.g[0], round.x[1] + t * round.g[1]];
      out.path.push(out.point); out.visited.push(round.x);
      out.slice = { x: round.x, g: round.g, tEnd, round };
      out.showBest = true;
    }
    if (s.kind === 'check') {
      out.point = round.next; out.path.push(round.next); out.visited.push(round.x);
      if (!round.stop) {
        out.arrows.push({ from: round.next, dir: round.g, color: colors().s5, faded: true });
        out.arrows.push({ from: round.next, dir: round.gNext, color: colors().s5, label: 'new ∇f(x′)' });
      } else {
        out.target = round.next; out.targetLabel = 'stop';
      }
    }
    return out;
  }

  // === φ(t) CHART: the same slice, drawn as a function of t ===
  let phiMap = null;
  function drawPhi() {
    const svg = $('.js-phi');
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H || !current.s) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const c = colors(), fs = px(root), size = Math.round(fs * 0.74);
    const { s, p } = current;
    const round = rounds[s.r];
    const padL = fs * 3.2, padR = fs * 1.2, padT = fs * 2.1, padB = fs * 1.6;
    root.style.setProperty('--phi-pad-l', padL + 'px');
    root.style.setProperty('--phi-pad-r', padR + 'px');
    const active = round && ['slice', 'best', 'move', 'check'].includes(s.kind);
    if (!active) {
      phiMap = null;
      svgEl(svg, 'text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', fill: c.ink2, 'font-size': size }, 'φ(t) appears in step 2, when the direction is fixed.');
      return;
    }
    const T = 2 * round.t;
    const values = [0, 0.25, 0.5, 0.75, 1].map(k => phiAt(round, T * k));
    const yTop = phiAt(round, round.t), yBot = Math.min(...values);
    const padY = (yTop - yBot) * 0.12 || 1;
    const y0 = yBot - padY, y1 = yTop + padY;
    const X = t => padL + t / T * (W - padL - padR);
    const Y = v => padT + (y1 - v) / (y1 - y0) * (H - padT - padB);
    phiMap = { X, T, padL, padR, W };
    const bottom = Y(y0);
    svgEl(svg, 'line', { x1: padL, x2: W - padR, y1: bottom, y2: bottom, stroke: c.axis, 'stroke-width': 1.5 });
    svgEl(svg, 'line', { x1: padL, x2: padL, y1: padT, y2: bottom, stroke: c.axis, 'stroke-width': 1.5 });
    [0, round.t, T].forEach(t => svgEl(svg, 'text', { x: X(t), y: bottom + fs * 1.15, 'text-anchor': 'middle', fill: c.ink2, 'font-size': size }, fracText(t)));
    [yBot, yTop].forEach(v => svgEl(svg, 'text', { x: padL - fs * 0.75, y: Y(v) + size * 0.35, 'text-anchor': 'end', fill: c.ink2, 'font-size': size }, fracText(v)));
    svgEl(svg, 'text', { x: W - padR, y: bottom - fs * 0.4, 'text-anchor': 'end', fill: c.ink2, 'font-size': size, 'font-style': 'italic' }, 't');
    svgEl(svg, 'text', { x: padL - fs * 0.75, y: fs * 0.95, fill: c.ink, 'font-size': size, 'font-weight': 600 },
      s.kind === 'check' ? 'The line search is finished: φ(t) and its best t*' : 'φ(t) = f(x′ + t ∇f(x′)): the height of the hill along the slice');
    let d = '';
    for (let k = 0; k <= 120; k++) { const t = T * k / 120; d += (k ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(phiAt(round, t)).toFixed(1); }
    svgEl(svg, 'path', { d, fill: 'none', stroke: c.surface, 'stroke-width': 8 });
    svgEl(svg, 'path', { d, fill: 'none', stroke: c.s5, 'stroke-width': 4 });
    const halo = { 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4, 'stroke-linejoin': 'round' };
    if (s.kind !== 'slice') {
      svgEl(svg, 'line', { x1: X(round.t), x2: X(round.t), y1: Y(yTop), y2: bottom, stroke: c.s2, 'stroke-width': 1.8, 'stroke-dasharray': '5 4' });
      svgEl(svg, 'circle', { cx: X(round.t), cy: Y(yTop), r: fs * 0.55, fill: 'none', stroke: c.s2, 'stroke-width': 3 });
      svgEl(svg, 'text', { x: X(round.t), y: Y(yTop) - fs * 0.8, 'text-anchor': 'middle', fill: c.ink, 'font-size': size, 'font-weight': 700, ...halo }, 't* = ' + fracText(round.t));
    }
    // t = 0 is the current point x′; during "Move" that point travels to t*.
    const tHere = s.kind === 'move' ? round.t * p : s.kind === 'check' ? round.t : 0;
    svgEl(svg, 'circle', { cx: X(tHere), cy: Y(phiAt(round, tHere)), r: fs * 0.32 + 2, fill: c.surface });
    svgEl(svg, 'circle', { cx: X(tHere), cy: Y(phiAt(round, tHere)), r: fs * 0.32, fill: c.ink });
    if (s.kind === 'slice' || s.kind === 'best') {
      svgEl(svg, 'circle', { cx: X(probe), cy: Y(phiAt(round, probe)), r: fs * 0.36 + 2, fill: c.surface });
      svgEl(svg, 'circle', { cx: X(probe), cy: Y(phiAt(round, probe)), r: fs * 0.36, fill: c.s5, class: 'js-phi-probe' });
    }
  }

  // === SIDE PANEL ===
  function renderSide() {
    const { s } = current;
    const round = rounds[s.r];
    const phase = PHASE_OF[s.kind];
    [...$('.js-phases').children].forEach((n, k) => n.classList.toggle('on', k === phase));
    $('.js-iter').textContent = s.kind === 'start' ? 'Start' : 'Line search ' + round.k + ' of ' + rounds.length;
    const g = round ? round.g : ex.grad(ex.start);
    let title, text, formula;
    if (s.kind === 'start') {
      title = 'Start at the trial solution x′.';
      text = ex.startText;
      formula = "x' = " + vecTex(ex.start) + ',\\qquad f(x\') = ' + fracTex(ex.f(ex.start));
    } else if (s.kind === 'gradient') {
      title = '1 · Direction: the gradient at x′.';
      text = 'At x′, f goes up fastest in the direction of ∇f(x′) (slides 17–18). We search only along this direction.';
      formula = '\\nabla f(x\') = \\Big(\\tfrac{\\partial f}{\\partial x_1},\\ \\tfrac{\\partial f}{\\partial x_2}\\Big)\\Big|_{x\' = ' + vecTex(round.x) + '} = ' + vecTex(g);
    } else if (s.kind === 'slice') {
      title = '2 · Fix the direction. Now there is only one variable: t.';
      text = 'The points on this line are x′ + t∇f(x′). The vertical plane cuts the hill along a curve. The height on this curve is φ(t), and it depends only on t. Move t: the point moves on the hill and on the φ(t) graph at the same time.';
      formula = '\\varphi(t) = f\\big(' + vecTex(round.x) + ' + t\\,' + vecTex(g) + '\\big) = ' + polyTex(round.phi);
    } else if (s.kind === 'best') {
      const deriv = polyTex([round.phi[1], 2 * round.phi[2], 0]);
      title = '3 · Distance: find the t* ≥ 0 that maximizes φ(t).';
      text = 'This is a one-variable problem, like in Week 2. Here we solve φ′(t) = 0 by hand. Bisection would also work (slide 23).';
      formula = "\\varphi'(t) = " + deriv + ' = 0 \\;\\Rightarrow\\; t^* = ' + fracTex(round.t);
    } else if (s.kind === 'move') {
      title = '4 · Move to the best point on this line.';
      text = 'x′ + t*∇f(x′) is the highest point on this line. It is not always the top of the hill.';
      formula = "x' \\leftarrow " + vecTex(round.x) + ' + ' + fracTex(round.t) + '\\,' + vecTex(g) + ' = ' + vecTex(round.next);
    } else if (round.stop) {
      title = '5 · Check: the gradient is (almost) zero. Stop.';
      text = ex.stopText;
      formula = '\\nabla f(x\') = ' + vecTex(round.gNext) + ',\\qquad \\max_j \\Big|\\tfrac{\\partial f}{\\partial x_j}\\Big| = ' + fracTex(Math.max(...round.gNext.map(Math.abs))) + ' \\le \\varepsilon = ' + num(ex.eps, 3);
    } else {
      title = '5 · Check: find the gradient again.';
      text = 'After the move the gradient is different (slide 19). With the best t*, the new direction makes a right angle (90°) with the old one. This gives the zigzag of slide 28. The gradient is not small yet, so we repeat.';
      formula = '\\nabla f(x\') = ' + vecTex(round.gNext) + ',\\qquad \\max_j \\Big|\\tfrac{\\partial f}{\\partial x_j}\\Big| = ' + fracTex(Math.max(...round.gNext.map(Math.abs))) + ' > \\varepsilon = ' + num(ex.eps, 3);
    }
    $('.js-title').textContent = title;
    $('.js-text').textContent = text;
    tex($('.js-formula'), formula);
    const point = sceneState().point;
    const pairs = [['x′', vecText(point)], ['f(x′)', fracText(ex.f(point))], ['∇f(x′)', vecText(ex.grad(point))]];
    if (round && ['best', 'move', 'check'].includes(s.kind)) pairs.push(['t* (this line)', fracText(round.t)]);
    ANIM.stats($('.js-stats'), pairs);
    $('.js-fine').textContent = 'We go up the hill (maximization) and find the best t on each line. t multiplies ∇f(x′); it is not a distance. ' +
      'The direction does not change during one line search. ε = 0.05 is our choice for this animation. For minimization, go along −∇f (slide 29).';
  }

  // === PROBE t (slider and dragging on the φ chart) ===
  function syncSlider() {
    const { s } = current;
    const round = rounds[s.r];
    const slider = $('.js-t');
    const live = round && (s.kind === 'slice' || s.kind === 'best');
    slider.disabled = !live;
    if (round) { slider.max = String(2 * round.t); slider.step = String(round.t / 400); }
    slider.value = String(live ? probe : 0);
  }
  function setProbe(t) {
    const round = rounds[current.s.r];
    if (!round) return;
    probe = Math.max(0, Math.min(2 * round.t, t));
    syncSlider(); drawPhi(); draw3D();
  }
  $('.js-t').addEventListener('input', e => setProbe(Number(e.target.value)));
  const phiSvg = $('.js-phi');
  let phiDrag = false;
  phiSvg.addEventListener('pointerdown', e => {
    if (!phiMap || $('.js-t').disabled) return;
    phiDrag = true; phiSvg.setPointerCapture(e.pointerId); phiPointer(e);
  });
  phiSvg.addEventListener('pointermove', e => { if (phiDrag) phiPointer(e); });
  phiSvg.addEventListener('pointerup', () => { phiDrag = false; });
  function phiPointer(e) {
    const box = phiSvg.getBoundingClientRect();
    const x = e.clientX - box.left;
    setProbe((x - phiMap.padL) / (phiMap.W - phiMap.padL - phiMap.padR) * phiMap.T);
  }

  // === CAMERA CONTROLS ===
  function currentDirection() {
    const { s } = current;
    const round = rounds[s.r];
    if (!round || s.kind === 'start') return null;
    return s.kind === 'check' && !round.stop ? round.gNext : round.g;
  }
  root.querySelectorAll('.js-view').forEach(btn => btn.addEventListener('click', () => {
    const kind = btn.dataset.view;
    if (kind === 'persp') s3d.setView(ex.camera[0], ex.camera[1]);
    if (kind === 'top') s3d.setView(0, Math.PI / 2);
    if (kind === 'side') {
      const g = currentDirection();
      if (!g) return;
      // Turn the camera so the slice faces us: its direction becomes screen-horizontal.
      s3d.setView(-Math.atan2(g[1], g[0]), 0.1);
    }
  }));
  $('.js-isolate').addEventListener('click', () => {
    isolate = !isolate;
    $('.js-isolate').setAttribute('aria-pressed', String(isolate));
    draw3D();
  });
  $('.js-spin').addEventListener('click', () => s3d.setSpin(!s3d.view.spin));

  // === WIRING ===
  function render(index, p) {
    const s = steps[index];
    // The probe starts at t = 0 for every new line search; in "Best t*" it glides to t*.
    if (s.r !== probeRound || s.kind === 'gradient' || s.kind === 'start') { probe = 0; probeRound = s.r; }
    if (s.kind === 'best' && p < 1) probe = probe + (rounds[s.r].t - probe) * p;
    if (s.kind === 'best' && p >= 1) probe = rounds[s.r].t;
    current = { s, p };
    root.querySelector('.js-view[data-view="side"]').disabled = !currentDirection();
    syncSlider();
    draw3D();
    drawPhi();
    renderSide();
  }
  const stepper = ANIM.stepper({ root, total: () => steps.length, render, duration: 800 });

  // start: a point the student chose ("Choose your start"); otherwise the slides' start.
  function useExample(key, start) {
    if (!EXAMPLES[key]) key = 'ex1';
    baseKey = key;
    const base = EXAMPLES[key];
    ex = !start ? base : {
      ...base, start,
      startText: 'Your own start: x′ = ' + vecText(start) + '. Watch which way the search goes from here, and how many line searches it needs.',
      stopText: 'Every |∂f/∂xⱼ| is now at most ε = ' + num(base.eps, 3) + ', so we stop.'
    };
    rounds = buildRounds(ex);
    if (start && !rounds.length) ex.startText = 'x′ = ' + vecText(start) + ' is already the top: ∇f(x′) = (0, 0), so there is nothing to search. Choose another start.';
    steps = buildSteps();
    const zLow = Math.min(...[0, 1].flatMap(i => [0, 1].map(j => ex.f([ex.dom[0][i], ex.dom[1][j]]))));
    s3d.setSpace(ex.dom, zLow, ex.fTop);
    mesh = s3d.mesh(ex.f, ex.levels);
    probeRound = -1;
    root.querySelectorAll('.js-example').forEach(b => b.classList.toggle('active', b.dataset.example === key));
    $('.js-caption').innerHTML = '<span class="js-ftex"></span><span class="js-eps"></span>';
    tex($('.js-ftex'), ex.fTex);
    tex($('.js-eps'), '\\text{stop when every } |\\partial f/\\partial x_j| \\le \\varepsilon = ' + num(ex.eps, 3));
    s3d.view.yaw = ex.camera[0]; s3d.view.elev = ex.camera[1];
    stepper.go(0);
  }
  root.querySelectorAll('.js-example').forEach(b => b.addEventListener('click', () => { setPicking(false); useExample(b.dataset.example); }));

  // === CHOOSE YOUR START ===
  // The button turns the camera to the bird's-eye view; the next click on the
  // picture sets x′ (rounded to 0.05) and the search is rebuilt from there.
  // The capture listener runs before the canvas's own drag-to-rotate.
  let picking = false, baseKey = 'ex1';
  const hint = $('.drag-hint'), hintText = hint.textContent;
  function setPicking(on) {
    picking = on;
    $('.js-pick').setAttribute('aria-pressed', String(on));
    $('.js-pick').classList.toggle('active', on);
    hint.textContent = on ? 'Click the picture to choose x′' : hintText;
    if (on) { stepper.go(0); s3d.setView(0, Math.PI / 2); }
  }
  $('.js-pick').addEventListener('click', () => setPicking(!picking));
  $('.s3d').addEventListener('pointerdown', e => {
    if (!picking) return;
    e.stopPropagation(); e.preventDefault();
    const box = $('.js-canvas').getBoundingClientRect();
    const q = s3d.floorAt(e.clientX - box.left, e.clientY - box.top), d = EXAMPLES[baseKey].dom;
    if (!q || q[0] < d[0][0] || q[0] > d[0][1] || q[1] < d[1][0] || q[1] > d[1][1]) return;
    setPicking(false);
    useExample(baseKey, q.map(v => Math.round(v * 20) / 20));
    s3d.setView(ex.camera[0], ex.camera[1]);
  }, true);
  new ResizeObserver(() => { if (!root.hidden && current.s) { draw3D(); drawPhi(); } }).observe($('.gr-stage'));
  window.addEventListener('themechange', () => { if (!root.hidden && current.s) stepper.repaint(); });

  // ?mode= (the deck's activity URL) or ?example= picks the example.
  useExample(ANIM.params.get('example') || ANIM.params.get('mode') || 'ex1');
  ANIM.register('gradient', {
    activate() { stepper.repaint(); s3d.resume(); },
    deactivate() { stepper.stop(); s3d.stop(); },
    step: dir => stepper.step(dir),
    restart: () => stepper.go(0),
    togglePlay: () => stepper.togglePlay(),
    debug: () => ({ index: stepper.index, total: steps.length, kind: current.s.kind, r: current.s.r, rounds, probe, view: { ...s3d.view }, state: sceneState() })
  });
})();
