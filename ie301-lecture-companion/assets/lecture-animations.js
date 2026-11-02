/* =====================================================================
   Step-by-step lecture animations — shared shell: stepping, keyboard,
   formatting, 2D plots, the 3D surface view, the KKT panels and the
   Markov chain panels (random numbers, state diagram, share bars).
   Each animation (anim-bisection.js, anim-gradient.js, anim-kkt.js,
   anim-dpwarmup.js, anim-markov.js) is one
   <section class="widget anim"> on its week page and registers a module
   { activate, deactivate, step(dir) -> moved?, restart, togglePlay }.
   In the instructor deck (?embed=<id>) the animation fills the iframe and
   takes the presenter's keys; at its first or last step it hands the key
   back to the deck. Load with `defer`, after KaTeX and after viz.js.
   ===================================================================== */
window.ANIM = (() => {
  const params = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modules = new Map();
  let activeId = null;
  const MINUS = '−';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // === FORMATTING ===
  function num(v, digits) {
    let s = Number(v).toFixed(digits);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    if (s === '-0') s = '0';
    return s.replace('-', MINUS);
  }
  function fixed(v, digits) { return Number(v).toFixed(digits).replace('-', MINUS); }
  // Points in the Week 3 examples are dyadic fractions; slide 28 labels them
  // that way, e.g. (1/2, 3/4), so we print them the same way when exact.
  function dyadic(v) {
    for (let d = 1; d <= 1024; d *= 2) {
      const n = Math.round(v * d);
      if (Math.abs(n / d - v) < 1e-11) return { n, d };
    }
    return null;
  }
  function fracText(v) {
    const q = dyadic(v);
    if (!q) return num(v, 4);
    if (q.d === 1) return num(q.n, 0);
    return (q.n < 0 ? MINUS : '') + Math.abs(q.n) + '/' + q.d;
  }
  function fracTex(v) {
    const q = dyadic(v);
    if (!q) return num(v, 4).replace(MINUS, '-');
    if (q.d === 1) return String(q.n);
    return (q.n < 0 ? '-' : '') + '\\tfrac{' + Math.abs(q.n) + '}{' + q.d + '}';
  }
  // KKT numbers such as 4/3 or −13/3 are not dyadic: a fraction with a small
  // denominator prints as a fraction. Denominators that are multiples of 5 are
  // skipped, so slider and drag values (2.99, 3.7) stay decimals, as everything
  // else does.
  function ratTex(v, digits = 2) {
    for (let d = 1; d <= 32; d++) {
      if (d % 5 === 0) continue;
      const n = Math.round(v * d);
      if (Math.abs(n / d - v) < 1e-9) return d === 1 ? String(n) : (n < 0 ? '-' : '') + '\\tfrac{' + Math.abs(n) + '}{' + d + '}';
    }
    return texNum(v, digits);
  }
  function tex(el, src) {
    try { katex.render(src, el, { throwOnError: false }); }
    catch (err) { el.textContent = src; }
  }

  // === DRAWING HELPERS ===
  function svgEl(parent, tag, attrs = {}, text) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (text != null) node.textContent = text;
    parent.appendChild(node);
    return node;
  }
  function px(el) { return parseFloat(getComputedStyle(el).fontSize) || 16; }
  function colors() { return VIZ.theme(); }
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
  }
  const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  // === STEPPER: Back / Next / Play / Restart for one module ===
  // restartAt(): where Restart goes (default: the first step).
  function stepper({ root, total, render, duration = 650, restartAt = () => 0 }) {
    const q = sel => root.querySelector(sel);
    const back = q('.js-back'), next = q('.js-next'), play = q('.js-play');
    const restart = q('.js-restart'), speed = q('.js-speed');
    // anim: the running step animation { began, span, pausedAt } or null when the step is complete.
    let index = 0, timer = null, raf = 0, lastSpan = 0, anim = null, shown = 1;
    function paint(progress) {
      shown = progress;
      render(index, progress);
      back.disabled = index === 0;
      next.disabled = index >= total() - 1;
      root.dataset.step = String(index);
    }
    // The button reads "Pause" while something moves (a step animation or auto-play).
    function label() {
      const moving = !!timer || (!!anim && anim.pausedAt == null);
      play.textContent = moving ? '❚❚ Pause' : '▶ Play';
      play.setAttribute('aria-pressed', moving ? 'true' : 'false');
    }
    function frame(now) {
      const p = Math.min(1, (now - anim.began) / anim.span);
      paint(ease(p));
      if (p < 1) raf = requestAnimationFrame(frame);
      else { anim = null; label(); }
    }
    function go(target, animate) {
      cancelAnimationFrame(raf);
      anim = null;
      index = Math.max(0, Math.min(total() - 1, target));
      lastSpan = 0;
      if (!animate || reduced) { paint(1); label(); return; }
      const span = typeof duration === 'function' ? duration(index) : duration;
      lastSpan = span;
      anim = { began: performance.now(), span, pausedAt: null };
      paint(0);
      raf = requestAnimationFrame(frame);
      label();
    }
    function move(dir) {
      const target = index + dir;
      if (target < 0 || target > total() - 1) return false;
      go(target, dir > 0);
      return true;
    }
    // Stops auto-play only; a step animation that is running goes on.
    function stop() {
      clearTimeout(timer); timer = null;
      label();
    }
    // Auto-play waits for a long step's own animation (plus a short pause) before
    // the next step, so a 13-second step is not cut off after the speed setting.
    function schedule() {
      timer = setTimeout(() => { if (move(1)) schedule(); else stop(); }, Math.max(Number(speed.value), lastSpan + 600));
    }
    // Play / Pause (owner, 2026-11-02): while a step animates, it pauses and
    // resumes THAT animation (and ends auto-play); when the step is complete,
    // Play runs through the following steps on its own.
    function togglePlay() {
      if (anim && anim.pausedAt == null) {
        cancelAnimationFrame(raf);
        anim.pausedAt = performance.now() - anim.began;
        clearTimeout(timer); timer = null;
      } else if (anim) {
        anim.began = performance.now() - anim.pausedAt;
        anim.pausedAt = null;
        raf = requestAnimationFrame(frame);
      } else if (timer) {
        clearTimeout(timer); timer = null;
      } else {
        if (index >= total() - 1) go(0, false);
        lastSpan = 0;   // this step is already complete: the next one comes after the speed setting
        schedule();
      }
      label();
    }
    back.onclick = () => { stop(); move(-1); };
    next.onclick = () => { stop(); move(1); };
    play.onclick = togglePlay;
    restart.onclick = () => { stop(); go(restartAt(), false); };
    speed.onchange = () => { if (timer) { clearTimeout(timer); schedule(); } };
    return {
      step(dir) { stop(); return move(dir); },
      go(target) { stop(); go(target, false); },
      // Play the current step's animation again (e.g. after a new random draw).
      replay() { stop(); go(index, true); },
      stop, togglePlay,
      // Redraw at the progress on screen (a paused animation stays where it is).
      repaint() { paint(anim ? shown : 1); },
      get index() { return index; }
    };
  }

  // === SHARED MATH FOR PLOTS ===
  // Level set f = level of a concave quadratic f(x) = fTop + ½ (x − c)ᵀ H (x − c): an ellipse.
  function ellipse(c, H, fTop, level, n = 180) {
    const rhs = 2 * (fTop - level);
    if (rhs <= 0) return [];
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const a = 2 * Math.PI * k / n, u = [Math.cos(a), Math.sin(a)];
      const q = -(H[0][0] * u[0] * u[0] + 2 * H[0][1] * u[0] * u[1] + H[1][1] * u[1] * u[1]);
      const r = Math.sqrt(rhs / q);
      pts.push([c[0] + r * u[0], c[1] + r * u[1]]);
    }
    return pts;
  }
  // The part of a polygon where a·x ≤ b (one Sutherland–Hodgman pass).
  function clipHalfPlane(poly, a, b) {
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k], q = poly[(k + 1) % poly.length];
      const sp = a[0] * p[0] + a[1] * p[1] - b, sq = a[0] * q[0] + a[1] * q[1] - b;
      if (sp <= 0) out.push(p);
      if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return out;
  }
  const texNum = (v, digits = 3) => num(v, digits).replace(MINUS, '-');

  // === 2D PLOT (SVG): maps and charts sized to their box, in CSS px ===
  function plot2d(svg, root, view, opts = {}) {
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return null;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const fs = px(root), c = colors(), size = Math.round(fs * 0.74);
    const padL = fs * (opts.padL ?? 2.4), padR = fs * (opts.padR ?? 0.8);
    const padT = fs * (opts.padT ?? 1.3), padB = fs * (opts.padB ?? 2.0);
    const spanX = view.x[1] - view.x[0], spanY = view.y[1] - view.y[0];
    let sx = (W - padL - padR) / spanX, sy = (H - padT - padB) / spanY, ox = padL, oy = padT;
    if (opts.equal) {   // maps: one unit is as long across as up, so circles stay circles
      const s = Math.min(sx, sy);
      ox += (W - padL - padR - s * spanX) / 2; oy += (H - padT - padB - s * spanY) / 2;
      sx = sy = s;
    }
    const X = v => ox + (v - view.x[0]) * sx, Y = v => oy + (view.y[1] - v) * sy;
    const invX = p => view.x[0] + (p - ox) / sx, invY = p => view.y[1] - (p - oy) / sy;
    const left = X(view.x[0]), right = X(view.x[1]), top = Y(view.y[1]), bottom = Y(view.y[0]);
    const uid = 'p' + Math.random().toString(36).slice(2, 9);
    const defs = svgEl(svg, 'defs');
    svgEl(svgEl(defs, 'clipPath', { id: uid + 'c' }), 'rect', { x: left, y: top, width: right - left, height: bottom - top });
    const hatch = svgEl(defs, 'pattern', { id: uid + 'h', patternUnits: 'userSpaceOnUse', width: 10, height: 10, patternTransform: 'rotate(45)' });
    svgEl(hatch, 'line', { x1: 0, y1: 0, x2: 0, y2: 10, stroke: c.bad, 'stroke-width': 2.5, opacity: 0.35 });
    const back = svgEl(svg, 'g', { 'clip-path': `url(#${uid}c)` });   // regions, grid and curves stay inside
    const halo = { 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4, 'stroke-linejoin': 'round' };
    const pathOf = pts => pts.map((q, k) => (k ? 'L' : 'M') + X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1)).join('');
    return {
      svg, back, X, Y, invX, invY, left, right, top, bottom, fs, c, size, halo, hatch: `url(#${uid}h)`,
      grid(xt, yt, { xlabel = '', ylabel = '', fx = v => num(v, 2), fy = v => num(v, 2) } = {}) {
        xt.forEach(v => {
          svgEl(back, 'line', { x1: X(v), x2: X(v), y1: top, y2: bottom, stroke: c.grid });
          svgEl(svg, 'text', { x: X(v), y: bottom + fs * 1.1, 'text-anchor': 'middle', fill: c.ink2, 'font-size': size }, fx(v));
        });
        yt.forEach(v => {
          svgEl(back, 'line', { x1: left, x2: right, y1: Y(v), y2: Y(v), stroke: c.grid });
          svgEl(svg, 'text', { x: left - fs * 0.35, y: Y(v) + size * 0.35, 'text-anchor': 'end', fill: c.ink2, 'font-size': size }, fy(v));
        });
        svgEl(svg, 'rect', { x: left, y: top, width: right - left, height: bottom - top, fill: 'none', stroke: c.axis });
        if (xlabel) svgEl(svg, 'text', { x: right, y: bottom + fs * 1.1 + size * 1.1, 'text-anchor': 'end', fill: c.ink2, 'font-size': size, 'font-style': 'italic' }, xlabel);
        if (ylabel) svgEl(svg, 'text', { x: left, y: top - fs * 0.45, 'text-anchor': 'middle', fill: c.ink2, 'font-size': size, 'font-style': 'italic' }, ylabel);
      },
      poly(pts, attrs) { return pts.length > 2 ? svgEl(back, 'path', { d: pathOf(pts) + 'Z', ...attrs }) : null; },
      curve(pts, attrs, front) { return svgEl(front ? svg : back, 'path', { d: pathOf(pts), fill: 'none', ...attrs }); },
      line(a, b, attrs, front) { return svgEl(front ? svg : back, 'line', { x1: X(a[0]), y1: Y(a[1]), x2: X(b[0]), y2: Y(b[1]), ...attrs }); },
      dot(p, r, fill, attrs = {}) {
        svgEl(svg, 'circle', { cx: X(p[0]), cy: Y(p[1]), r: r + 2, fill: c.surface });
        return svgEl(svg, 'circle', { cx: X(p[0]), cy: Y(p[1]), r, fill, ...attrs });
      },
      ring(p, r, color, attrs = {}) { return svgEl(svg, 'circle', { cx: X(p[0]), cy: Y(p[1]), r, fill: 'none', stroke: color, 'stroke-width': 3, ...attrs }); },
      text(p, s, { dx = 0, dy = 0, ...attrs } = {}) {
        return svgEl(svg, 'text', { x: X(p[0]) + dx * fs, y: Y(p[1]) + dy * fs, fill: c.ink, 'font-size': size, 'font-weight': 600, ...halo, ...attrs }, s);
      },
      arrow(a, b, color, width = 3) {
        const x1 = X(a[0]), y1 = Y(a[1]), x2 = X(b[0]), y2 = Y(b[1]);
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len < 2) return;
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len, hs = Math.min(fs * 0.6, len * 0.6);
        const ex2 = x2 - ux * hs * 0.8, ey2 = y2 - uy * hs * 0.8;
        svgEl(svg, 'line', { x1, y1, x2: ex2, y2: ey2, stroke: c.surface, 'stroke-width': width + 4, 'stroke-linecap': 'round' });
        svgEl(svg, 'line', { x1, y1, x2: ex2, y2: ey2, stroke: color, 'stroke-width': width, 'stroke-linecap': 'round' });
        const pts = [[x2, y2], [x2 - ux * hs - uy * hs * 0.55, y2 - uy * hs + ux * hs * 0.55], [x2 - ux * hs + uy * hs * 0.55, y2 - uy * hs - ux * hs * 0.55]];
        svgEl(svg, 'polygon', { points: pts.map(q => q.join(',')).join(' '), fill: color });
      }
    };
  }

  // === KKT PANELS: condition list, meters, stat boxes ===
  // A row is { tag, tex, vals?, state? }: `tex` is the condition as on the slide,
  // `vals` the same condition with today's numbers. Each part stays on one line;
  // when both do not fit side by side, the numbers move under the condition.
  function conditionList(el, rows) {
    el.replaceChildren();
    rows.forEach(row => {
      const div = document.createElement('div');
      div.className = 'cond-row' + (row.state ? ' ' + row.state : '');
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = row.tag;
      const math = document.createElement('span'); math.className = 'math';
      [row.tex, row.vals].filter(Boolean).forEach(src => { const part = document.createElement('span'); tex(part, src); math.appendChild(part); });
      div.append(tag, math);
      el.appendChild(div);
    });
  }
  function meters(el, items, heading) {
    el.replaceChildren();
    if (heading) { const h = document.createElement('div'); h.className = 'm-heading'; h.textContent = heading; el.appendChild(h); }
    items.forEach(item => {
      const zero = Math.abs(item.value) < (item.tol ?? 5e-3);
      const row = document.createElement('div'); row.className = 'meter' + (zero ? ' zero' : '');
      const label = document.createElement('span'); label.className = 'm-label'; tex(label, item.tex);
      const bar = document.createElement('span'); bar.className = 'm-bar';
      const fill = document.createElement('i');
      const share = Math.max(-1, Math.min(1, item.value / item.scale));
      fill.style.left = (50 + Math.min(0, share) * 50) + '%'; fill.style.width = Math.abs(share) * 50 + '%';
      bar.appendChild(fill);
      const value = document.createElement('b'); value.textContent = zero ? '0 ✓' : num(item.value, 3);
      row.append(label, bar, value);
      el.appendChild(row);
    });
  }
  function stats(el, pairs) {
    el.replaceChildren();
    pairs.forEach(([name, value]) => {
      const box = document.createElement('div'); box.className = 'stat';
      const label = document.createElement('span'); label.textContent = name;
      const b = document.createElement('b'); b.textContent = value;
      box.append(label, b); el.appendChild(box);
    });
  }
  // A step without a formula hides the formula box instead of leaving it empty.
  function setText(root, { title, text, formula }) {
    root.querySelector('.js-title').textContent = title;
    root.querySelector('.js-text').textContent = text;
    const box = root.querySelector('.js-formula');
    box.hidden = !formula;
    tex(box, formula || '');
  }

  // === GAIN AGAINST COST: the term in [ ] for one more unit of a variable ===
  // One block per variable: what one more unit adds to f directly (gain) and
  // what the resource it uses is worth at the price λ (cost), as two bars on
  // one shared scale, then the verdict "[ ] = gain − cost" in words.
  // rows: [{ head, gain, cost, gainText, costText, verdict, show: { gain, cost, verdict } }]
  function gainCost(svg, root, rows, title) {
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const c = colors(), fs = px(root), size = Math.round(fs * 0.72), lh = fs * 1.2;
    const write = (x, y, s, attrs = {}) => svgEl(svg, 'text', { x, y, fill: c.ink, 'font-size': size, ...attrs }, s);
    write(fs * 0.4, fs * 0.95, title, { 'font-weight': 600 });
    const vals = [0];
    rows.forEach(r => { if (r.show.gain) vals.push(r.gain); if (r.show.cost) vals.push(r.cost); });
    const lo = Math.min(...vals), hi = Math.max(...vals);
    // A bar's value is written past its end, so leave room on each side a bar grows to.
    const nameW = fs * 2.6, room = fs * 5.2;
    const left = fs * 0.4 + nameW + (lo < 0 ? room : 0), right = W - fs * 0.4 - room;
    const X = v => left + (v - lo) / ((hi - lo) || 1) * (right - left);
    const blockH = Math.min(lh * 4.7, (H - fs * 1.5) / rows.length);
    rows.forEach((r, k) => {
      const top = fs * 1.5 + k * blockH;
      write(fs * 0.4, top + lh * 0.8, r.head, { 'font-weight': 700 });
      [['gain', r.gain, r.gainText, c.s1, r.show.gain], ['cost', r.cost, r.costText, c.s5, r.show.cost]].forEach(([name, v, label, color, on], j) => {
        const yc = top + lh * (1.8 + j * 1.1), bh = fs * 0.75;
        write(fs * 0.4 + nameW - fs * 0.3, yc + size * 0.35, name, { 'text-anchor': 'end', fill: c.ink2 });
        if (!on) return;
        const x0 = X(0), x1 = X(v);
        svgEl(svg, 'rect', { x: Math.min(x0, x1), y: yc - bh / 2, width: Math.max(2, Math.abs(x1 - x0)), height: bh, fill: color, rx: 3 });
        write(v < 0 ? x1 - fs * 0.3 : x1 + fs * 0.3, yc + size * 0.35, label, { 'text-anchor': v < 0 ? 'end' : 'start', 'font-weight': 600 });
      });
      svgEl(svg, 'line', { x1: X(0), x2: X(0), y1: top + lh * 1.2, y2: top + lh * 3.5, stroke: c.axis, 'stroke-width': 1.5 });
      if (r.show.verdict) write(fs * 0.4, top + lh * 4.2, r.verdict, { 'font-weight': 700 });
    });
  }

  // === NUMBER LINE: where prices λ sit ===
  function numberLine(svg, root, { range, ticks, band, marks, title }) {
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const c = colors(), fs = px(root), size = Math.round(fs * 0.72);
    const halo = { 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4, 'stroke-linejoin': 'round' };
    svgEl(svg, 'text', { x: fs * 0.4, y: fs * 0.95, fill: c.ink, 'font-size': size, 'font-weight': 600 }, title);
    const padX = fs * 1.2, yLine = H * 0.62;
    const X = v => padX + (v - range[0]) / (range[1] - range[0]) * (W - 2 * padX);
    if (band) {
      svgEl(svg, 'rect', { x: X(band[0]), y: yLine - fs * 0.45, width: X(band[1]) - X(band[0]), height: fs * 0.9, fill: c.region });
      svgEl(svg, 'text', { x: (X(band[0]) + X(band[1])) / 2, y: yLine - fs * 0.75, 'text-anchor': 'middle', fill: c.ink, 'font-size': size, 'font-weight': 700, ...halo }, band[2]);
    }
    svgEl(svg, 'line', { x1: padX, x2: W - padX, y1: yLine, y2: yLine, stroke: c.ink2, 'stroke-width': 1.5 });
    ticks.forEach(v => {
      svgEl(svg, 'line', { x1: X(v), x2: X(v), y1: yLine - 4, y2: yLine + 4, stroke: c.ink2 });
      svgEl(svg, 'text', { x: X(v), y: yLine + fs * 1.15, 'text-anchor': 'middle', fill: c.ink2, 'font-size': size }, fracText(v));
    });
    // Labels sit above the line; a label that would touch its neighbour moves up a row.
    const placed = [];
    (marks || []).slice().sort((a, b) => a.v - b.v).forEach(mark => {
      const x = X(Math.max(range[0], Math.min(range[1], mark.v)));
      const width = mark.label.length * size * 0.55;
      let row = 0;
      while (placed.some(p => p.row === row && Math.abs(p.x - x) < (p.width + width) / 2 + fs * 0.3)) row++;
      placed.push({ x, width, row });
      svgEl(svg, 'polygon', { points: [[x, yLine - 2], [x - fs * 0.35, yLine - fs * 0.7], [x + fs * 0.35, yLine - fs * 0.7]].map(q => q.join(',')).join(' '), fill: mark.color });
      svgEl(svg, 'text', { x, y: yLine - fs * 0.95 - row * fs * 1.05, 'text-anchor': 'middle', fill: c.ink, 'font-size': size, 'font-weight': 600, ...halo }, mark.label);
    });
  }

  // === SHARED 3D SURFACE VIEW (gradient search, Lagrange) ===
  // Orthographic camera and the painter's algorithm: surface triangles,
  // vertical-plane pieces and level lines are depth-sorted together, so the
  // hill hides what is behind it. Overlays (paths, points, labels) are drawn
  // last and always on top, because they are what the class must see.
  function surface3d({ root, canvas, redraw, onSpin }) {
    const HZ = 1.0;   // world height of the drawn range; the square is 2 world units wide
    const view = { yaw: -0.6, elev: 0.6, spin: false, scale: 0, cx: 0, cy: 0 };
    let space = { dom: [[0, 1], [0, 1]], zLow: 0, zTop: 1 };
    let camRaf = 0, spinRaf = 0, drag = null;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const normalize = v => { const n = Math.hypot(...v) || 1; return v.map(x => x / n); };
    const LIGHT = normalize([-0.45, -0.6, 0.75]);
    const rgba = (rgb, alpha = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));

    function setSpace(dom, zLow, zTop) { space = { dom, zLow, zTop }; view.scale = 0; }
    function world(x1, x2, z) {
      const { dom, zLow, zTop } = space;
      const m0 = (dom[0][0] + dom[0][1]) / 2, m1 = (dom[1][0] + dom[1][1]) / 2;
      const half = Math.max(dom[0][1] - dom[0][0], dom[1][1] - dom[1][0]) / 2;
      const h = (Math.min(zTop, Math.max(zLow, z)) - zLow) / (zTop - zLow);
      return [(x1 - m0) / half, (x2 - m1) / half, h * HZ - HZ / 2];
    }
    // keep(x), when given, drops every triangle whose centre fails it, so one
    // function can be drawn as two meshes (e.g. solid where feasible, ghost elsewhere).
    function mesh(f, levels, N = 36, keep = null) {
      const { dom } = space;
      const pts = [], fv = [], xy = [], tris = [];
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const x1 = dom[0][0] + (dom[0][1] - dom[0][0]) * i / N;
        const x2 = dom[1][0] + (dom[1][1] - dom[1][0]) * j / N;
        const v = f([x1, x2]);
        fv.push(v); xy.push([x1, x2]); pts.push(world(x1, x2, v));
      }
      const at = (i, j) => i * (N + 1) + j;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        [[at(i, j), at(i + 1, j), at(i + 1, j + 1)], [at(i, j), at(i + 1, j + 1), at(i, j + 1)]].forEach(ids => {
          if (keep && !keep([0, 1].map(d => (xy[ids[0]][d] + xy[ids[1]][d] + xy[ids[2]][d]) / 3))) return;
          const [a, b, c] = ids.map(k => pts[k]);
          let n = normalize(cross(sub(b, a), sub(c, a)));
          if (n[2] < 0) n = n.map(v => -v);
          const height = ((a[2] + b[2] + c[2]) / 3 + HZ / 2) / HZ;
          tris.push({ ids, height, light: 0.5 + 0.5 * Math.max(0, dot(n, LIGHT)) });
        });
      }
      return { pts, fv, tris, levels };
    }
    // Level lines are drawn inside each triangle right after it, so the
    // painter's order also hides the parts of a level line behind the hill.
    function isoSegments(ctx, a, b, d, fa, fb, fd, levels) {
      for (const level of levels) {
        const s = [fa - level, fb - level, fd - level], v = [a, b, d], hits = [];
        for (const [i, j] of [[0, 1], [1, 2], [2, 0]]) {
          if ((s[i] < 0) !== (s[j] < 0)) {
            const k = s[i] / (s[i] - s[j]);
            hits.push([v[i][0] + (v[j][0] - v[i][0]) * k, v[i][1] + (v[j][1] - v[i][1]) * k]);
          }
        }
        if (hits.length === 2) { ctx.beginPath(); ctx.moveTo(hits[0][0], hits[0][1]); ctx.lineTo(hits[1][0], hits[1][1]); ctx.stroke(); }
      }
    }
    function project(W, H, smooth, fitPts) {
      const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw), ce = Math.cos(view.elev), se = Math.sin(view.elev);
      const raw = w => {
        const u = w[0] * cy - w[1] * sy, v = w[0] * sy + w[1] * cy;
        return [u, v * se + w[2] * ce, -v * ce + w[2] * se];
      };
      // Fit the surface and its floor (with room for tick labels) to the canvas;
      // ease the zoom while the camera moves so the picture does not jump.
      const { dom } = space, floorZ = -HZ / 2 - 0.03;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([i, j]) => {
        const a = world(dom[0][i], dom[1][j], 0); return [a[0] * 1.16, a[1] * 1.16, floorZ];
      });
      for (const w of fitPts.concat(corners)) {
        const q = raw(w);
        if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
        if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1];
      }
      const fs = px(root);
      const target = Math.min((W - fs * 3.2) / (maxX - minX), (H - fs * 4.2) / (maxY - minY));
      const tx = W / 2 - (minX + maxX) / 2 * target, ty = H / 2 + fs * 0.7 + (minY + maxY) / 2 * target;
      if (smooth && view.scale) {
        view.scale += (target - view.scale) * 0.25; view.cx += (tx - view.cx) * 0.25; view.cy += (ty - view.cy) * 0.25;
      } else { view.scale = target; view.cx = tx; view.cy = ty; }
      return w => { const q = raw(w); return [view.cx + q[0] * view.scale, view.cy - q[1] * view.scale, q[2]]; };
    }

    // scene: { meshes: [{ mesh, mode: 'solid' | 'ghost' }], fit?: world points,
    //          planes: [{ a, b, alpha }], floor: { ticks, contours, lines, names },
    //          overlay(api) }
    function draw(scene, smooth = false) {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H || !scene.meshes.length) return;
      const ratio = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(W * ratio) || canvas.height !== Math.round(H * ratio)) {
        canvas.width = Math.round(W * ratio); canvas.height = Math.round(H * ratio);
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const c = colors(), fs = px(root), { dom } = space;
      const P = project(W, H, smooth, scene.fit || scene.meshes[0].mesh.pts);
      const zFloor = -HZ / 2 - 0.03, zTop = HZ / 2 + 0.1;
      const at = (x1, x2, z) => { const w = world(x1, x2, 0); w[2] = z; return P(w); };
      const fl = (x1, x2) => at(x1, x2, zFloor);
      const high = hexToRgb(c.s1), low = hexToRgb(c.region), violet = hexToRgb(c.s5);
      const floor = scene.floor || {};
      const seg = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
      const inside = q => q[0] >= dom[0][0] && q[0] <= dom[0][1] && q[1] >= dom[1][0] && q[1] <= dom[1][1];

      // Floor: the drawn square, grid, level lines, extra lines, tick labels.
      ctx.beginPath();
      [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([i, j], k) => { const q = fl(dom[0][i], dom[1][j]); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.closePath(); ctx.fillStyle = c.surface; ctx.fill(); ctx.strokeStyle = c.axis; ctx.lineWidth = 1.2; ctx.stroke();
      const ticks = floor.ticks || [[], []];
      ctx.lineWidth = 1; ctx.strokeStyle = c.grid;
      ticks[0].forEach(v => seg(fl(v, dom[1][0]), fl(v, dom[1][1])));
      ticks[1].forEach(v => seg(fl(dom[0][0], v), fl(dom[0][1], v)));
      ctx.strokeStyle = rgba(high, 0.42); ctx.lineWidth = 1.3;
      (floor.contours || []).forEach(pts => {
        ctx.beginPath(); let on = false;
        pts.forEach(q => { if (!inside(q)) { on = false; return; } const p = fl(q[0], q[1]); on ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); on = true; });
        ctx.stroke();
      });
      (floor.lines || []).forEach(l => {
        ctx.save(); ctx.setLineDash(l.dash || []); ctx.strokeStyle = l.color; ctx.lineWidth = l.width || 2;
        ctx.beginPath(); l.pts.forEach((q, k) => { const p = fl(q[0], q[1]); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
        ctx.stroke(); ctx.restore();
      });
      ctx.font = Math.round(fs * 0.68) + 'px system-ui, sans-serif'; ctx.fillStyle = c.ink2;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ticks[0].forEach(v => { const q = fl(v, dom[1][0] - 0.07 * (dom[1][1] - dom[1][0])); ctx.fillText(fracText(v), q[0], q[1]); });
      ticks[1].forEach(v => { const q = fl(dom[0][0] - 0.07 * (dom[0][1] - dom[0][0]), v); ctx.fillText(fracText(v), q[0], q[1]); });
      const names = floor.names || ['x₁', 'x₂'];
      ctx.font = 'italic ' + Math.round(fs * 0.8) + 'px system-ui, sans-serif'; ctx.fillStyle = c.ink;
      let q = fl(dom[0][1] + 0.08 * (dom[0][1] - dom[0][0]), dom[1][0]); ctx.fillText(names[0], q[0], q[1]);
      q = fl(dom[0][0], dom[1][1] + 0.08 * (dom[1][1] - dom[1][0])); ctx.fillText(names[1], q[0], q[1]);

      // Surfaces and vertical planes, depth-sorted together.
      const items = [];
      scene.meshes.forEach(entry => {
        const proj = entry.mesh.pts.map(P);
        entry.mesh.tris.forEach(tri => items.push({ entry, proj, tri, depth: (proj[tri.ids[0]][2] + proj[tri.ids[1]][2] + proj[tri.ids[2]][2]) / 3 }));
      });
      (scene.planes || []).forEach(pl => {
        const S = 14, Z = 6;
        for (let i = 0; i < S; i++) for (let j = 0; j < Z; j++) {
          const pt = s => [pl.a[0] + (pl.b[0] - pl.a[0]) * s, pl.a[1] + (pl.b[1] - pl.a[1]) * s];
          const z0 = zFloor + (zTop - zFloor) * j / Z, z1 = zFloor + (zTop - zFloor) * (j + 1) / Z;
          const p0 = pt(i / S), p1 = pt((i + 1) / S);
          const quad = [at(p0[0], p0[1], z0), at(p1[0], p1[1], z0), at(p1[0], p1[1], z1), at(p0[0], p0[1], z1)];
          items.push({ plane: pl, quad, depth: quad.reduce((s2, v) => s2 + v[2], 0) / 4 });
        }
      });
      items.sort((a, b) => a.depth - b.depth);
      const isoSolid = rgba(hexToRgb(c.surface), 0.55), isoGhost = rgba(hexToRgb(c.ink2), 0.3);
      for (const item of items) {
        ctx.beginPath();
        if (item.tri) {
          const ids = item.tri.ids, [a, b, d] = ids.map(k => item.proj[k]);
          // 'faded' is a see-through solid: the shape stays visible but reads as "not allowed".
          const ghost = item.entry.mode === 'ghost', fade = item.entry.mode === 'faded' ? (item.entry.alpha ?? 0.3) : 1;
          if (!ghost) {
            ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
            const col = mix(low, high, Math.pow(item.tri.height, 0.9)).map(v => Math.round(v * item.tri.light));
            ctx.fillStyle = rgba(col, fade); ctx.strokeStyle = rgba(col, fade); ctx.lineWidth = 0.7; ctx.fill(); ctx.stroke();
          }
          // A ghost mesh may ask for heavier lines (the Lagrange scene's R must read on a projector).
          ctx.strokeStyle = ghost ? (item.entry.alpha ? rgba(hexToRgb(c.ink2), item.entry.alpha) : isoGhost) : fade < 1 ? rgba(hexToRgb(c.surface), 0.4) : isoSolid;
          ctx.lineWidth = ghost ? (item.entry.width || 1.1) : 1.1;
          const fv = item.entry.mesh.fv;
          isoSegments(ctx, a, b, d, fv[ids[0]], fv[ids[1]], fv[ids[2]], item.entry.mesh.levels);
        } else {
          item.quad.forEach((v, k) => k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath();
          ctx.fillStyle = rgba(violet, item.plane.alpha ?? 0.16); ctx.fill();
        }
      }
      (scene.planes || []).forEach(pl => {
        ctx.strokeStyle = rgba(violet, 0.7); ctx.lineWidth = 1.4; ctx.beginPath();
        [at(pl.a[0], pl.a[1], zFloor), at(pl.b[0], pl.b[1], zFloor), at(pl.b[0], pl.b[1], zTop), at(pl.a[0], pl.a[1], zTop)]
          .forEach((v, k) => k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]));
        ctx.closePath(); ctx.stroke();
      });

      // Overlay helpers: everything here is drawn on top.
      const polyline = (pts, color, width) => {
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        [[c.surface, width + 4], [color, width]].forEach(([col, w]) => {
          ctx.beginPath(); pts.forEach((v, k) => k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]));
          ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
        });
      };
      const disc = (p, r, fill) => {
        ctx.beginPath(); ctx.arc(p[0], p[1], r + 2.2, 0, 2 * Math.PI); ctx.fillStyle = c.surface; ctx.fill();
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = fill; ctx.fill();
      };
      const ring = (p, r, color) => { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke(); };
      const label = (text, p, dx = 0.6, dy = -0.7, align = 'left') => {
        ctx.font = '600 ' + Math.round(fs * 0.8) + 'px system-ui, sans-serif';
        ctx.textAlign = align; ctx.textBaseline = 'middle';
        const x = p[0] + dx * fs, y = p[1] + dy * fs;
        ctx.lineWidth = 4; ctx.strokeStyle = c.surface; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
        ctx.fillStyle = c.ink; ctx.fillText(text, x, y);
      };
      const dashed = (a, b, color) => { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = color; ctx.lineWidth = 1.5; seg(a, b); ctx.restore(); };
      const onSurface = (f, x, lift = 0.012) => { const w = world(x[0], x[1], f(x)); w[2] += lift; return P(w); };
      // An arrow that runs along the surface, uphill, over a fixed share of the square.
      const arrow = (f, from, dir, color, text, faded) => {
        const len = 0.2 * Math.max(dom[0][1] - dom[0][0], dom[1][1] - dom[1][0]);
        const n = Math.hypot(dir[0], dir[1]) || 1, u = [dir[0] / n, dir[1] / n];
        const pts = [];
        for (let k = 0; k <= 12; k++) pts.push(onSurface(f, [from[0] + u[0] * len * k / 12, from[1] + u[1] * len * k / 12], 0.02));
        ctx.globalAlpha = faded ? 0.4 : 1;
        polyline(pts, color, 4);
        const a = pts[pts.length - 2], b = pts[pts.length - 1];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), s = fs * 0.7;
        ctx.beginPath(); ctx.moveTo(b[0] + Math.cos(ang) * s * 0.6, b[1] + Math.sin(ang) * s * 0.6);
        ctx.lineTo(b[0] + Math.cos(ang + 2.5) * s, b[1] + Math.sin(ang + 2.5) * s);
        ctx.lineTo(b[0] + Math.cos(ang - 2.5) * s, b[1] + Math.sin(ang - 2.5) * s);
        ctx.closePath(); ctx.fillStyle = color; ctx.fill();
        ctx.globalAlpha = 1;
        if (text) label(text, b, 0.7, -0.7);
      };
      if (scene.overlay) scene.overlay({ ctx, P, at, fl, zFloor, zTop, fs, c, violet, rgba, polyline, disc, ring, label, dashed, onSurface, arrow });
      lastFloor = { at, dom, z: zFloor };
    }
    // The floor point under a canvas pixel: the inverse of the floor's affine
    // map. In the bird's-eye view height does not move a point on screen, so
    // there it is also the point of the surface under the pointer.
    let lastFloor = null;
    function floorAt(px, py) {
      if (!lastFloor) return null;
      const { at, dom, z } = lastFloor;
      const o = at(dom[0][0], dom[1][0], z), a = at(dom[0][1], dom[1][0], z), b = at(dom[0][0], dom[1][1], z);
      const u = [a[0] - o[0], a[1] - o[1]], v = [b[0] - o[0], b[1] - o[1]], d = [px - o[0], py - o[1]];
      const det = u[0] * v[1] - u[1] * v[0];
      if (Math.abs(det) < 1e-9) return null;
      const s = (d[0] * v[1] - d[1] * v[0]) / det, t = (u[0] * d[1] - u[1] * d[0]) / det;
      return [dom[0][0] + s * (dom[0][1] - dom[0][0]), dom[1][0] + t * (dom[1][1] - dom[1][0])];
    }

    function setSpin(on) {
      view.spin = on;
      cancelAnimationFrame(spinRaf);
      if (onSpin) onSpin(on);
      if (on) loop();
    }
    function loop() {
      if (!view.spin || root.hidden) return;
      view.yaw += 0.006; redraw(true);
      spinRaf = requestAnimationFrame(loop);
    }
    function setView(yaw, elev) {
      setSpin(false);
      cancelAnimationFrame(camRaf);
      const fromYaw = view.yaw, fromElev = view.elev;
      const dYaw = ((yaw - fromYaw) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      const began = performance.now(), dur = reduced ? 1 : 700;
      const tick = now => {
        const k = Math.min(1, (now - began) / dur), e = ease(k);
        view.yaw = fromYaw + dYaw * e; view.elev = fromElev + (elev - fromElev) * e;
        redraw(k < 1);
        if (k < 1) camRaf = requestAnimationFrame(tick);
      };
      camRaf = requestAnimationFrame(tick);
    }
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId); drag = [e.clientX, e.clientY];
      setSpin(false); cancelAnimationFrame(camRaf);
    });
    canvas.addEventListener('pointermove', e => {
      if (!drag) return;
      view.yaw -= (e.clientX - drag[0]) * 0.008;
      view.elev = Math.max(0.04, Math.min(Math.PI / 2, view.elev + (e.clientY - drag[1]) * 0.007));
      drag = [e.clientX, e.clientY];
      redraw(true);
    });
    canvas.addEventListener('pointerup', () => { drag = null; redraw(false); });
    canvas.addEventListener('pointercancel', () => { drag = null; });
    return {
      view, setSpace, world, mesh, draw, setView, setSpin, floorAt,
      stop() { cancelAnimationFrame(spinRaf); cancelAnimationFrame(camRaf); },
      resume() { if (view.spin) loop(); }
    };
  }

  // === MARKOV CHAIN PANELS (Weeks 11, 13, 14): random numbers, state diagram, share bars ===
  // A seeded generator (mulberry32): a sample path drawn for a step looks the
  // same every time the step is shown, and a check can replay it.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // The index chosen with the given probabilities (they sum to 1), for u uniform in [0, 1).
  function pick(probs, u) {
    let acc = 0;
    for (let k = 0; k < probs.length; k++) { acc += probs[k]; if (u < acc) return k; }
    return probs.length - 1;
  }
  // An exponential time with the given rate, for u uniform in [0, 1).
  const expTime = (rate, u) => -Math.log(1 - u) / rate;

  // State diagram in SVG. Nodes are labelled boxes at (x, y) in [0, 1] of the
  // picture; arrows carry labels. When i→j and j→i both exist the two arrows
  // bend apart (an edge may set its own `bend`); a self-loop sits above its
  // node. `look(kind, item)` returns { fill, stroke, ink, width, opacity } for a
  // node or an edge, so a step can highlight one row or one arrow.
  // `onHover(item|null)` and `onClick(item)` report the node/edge under the pointer.
  // spec: { nodes: [{ id, label, x, y }], edges: [{ from, to, label, bend?, via? }], look?, scale?, padTop?, padBottom?, onHover?, onClick? }
  function stateDiagram(svg, root, spec) {
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return null;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const c = colors(), fs = px(root) * (spec.scale || 1), size = Math.round(fs * 0.8);
    const look = spec.look || (() => ({}));
    const defs = svgEl(svg, 'defs');
    const heads = new Map();
    const head = color => {
      if (!heads.has(color)) {
        const id = 'sd' + Math.random().toString(36).slice(2, 9);
        const marker = svgEl(defs, 'marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: fs * 0.7, markerHeight: fs * 0.7, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' });
        svgEl(marker, 'path', { d: 'M0,0 L10,5 L0,10 Z', fill: color });
        heads.set(color, `url(#${id})`);
      }
      return heads.get(color);
    };
    // Box sizes come from the measured label widths.
    const probe = svgEl(svg, 'text', { 'font-size': size, 'font-weight': 650 });
    const hh = fs * 0.95;
    const halfWidth = new Map(spec.nodes.map(n => { probe.textContent = n.label; return [n.id, Math.max(hh * 1.25, probe.getComputedTextLength() / 2 + fs * 0.55)]; }));
    probe.remove();
    const maxHw = Math.max(...halfWidth.values());
    // padTop / padBottom (in font sizes): room above and below the boxes for self-loops and long arcs.
    const mx = maxHw + fs * 0.4, myTop = hh + fs * (spec.padTop ?? 2.4), myBottom = hh + fs * (spec.padBottom ?? 0.6);
    const place = ([x, y]) => [mx + x * (W - 2 * mx), myTop + y * (H - myTop - myBottom)];
    const pos = new Map(spec.nodes.map(n => [n.id, place([n.x, n.y])]));
    const edgeLayer = svgEl(svg, 'g'), nodeLayer = svgEl(svg, 'g'), labelLayer = svgEl(svg, 'g');
    const halo = { 'paint-order': 'stroke', stroke: c.surface, 'stroke-width': 4, 'stroke-linejoin': 'round' };
    const has = new Set(spec.edges.map(e => e.from + '>' + e.to));
    const boundary = (id, ux, uy) => {
      const hw = halfWidth.get(id), t = Math.min(Math.abs(ux) > 1e-9 ? hw / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-9 ? hh / Math.abs(uy) : Infinity);
      const [x, y] = pos.get(id);
      return [x + ux * (t + 2), y + uy * (t + 2)];
    };
    const geometry = new Map();
    const hover = (el, item) => {
      if (spec.onHover) { el.addEventListener('pointerenter', () => spec.onHover(item)); el.addEventListener('pointerleave', () => spec.onHover(null)); }
      if (spec.onClick) el.addEventListener('click', () => spec.onClick(item));
    };
    spec.edges.forEach(e => {
      const st = { stroke: c.axis, width: 2, opacity: 1, ink: c.ink, ...look('edge', e) };
      const [ax, ay] = pos.get(e.from);
      let d, lx, ly, at;
      if (e.from === e.to) {
        const hw = halfWidth.get(e.from), s = [ax - hw * 0.45, ay - hh], t = [ax + hw * 0.45, ay - hh];
        const c1 = [ax - hw * 0.95, ay - hh - fs * 2.3], c2 = [ax + hw * 0.95, ay - hh - fs * 2.3];
        d = `M${s[0]},${s[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${t[0]},${t[1]}`;
        [lx, ly] = [ax, ay - hh - fs * 2.0];
        at = k => { const m = 1 - k; return [m ** 3 * s[0] + 3 * m * m * k * c1[0] + 3 * m * k * k * c2[0] + k ** 3 * t[0], m ** 3 * s[1] + 3 * m * m * k * c1[1] + 3 * m * k * k * c2[1] + k ** 3 * t[1]]; };
      } else {
        const [bx, by] = pos.get(e.to);
        const dist = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / dist, uy = (by - ay) / dist;
        // `via` ([x, y] in the same 0–1 units, may lie outside) routes a long arrow around other boxes.
        const bend = e.bend ?? (has.has(e.to + '>' + e.from) ? 0.18 : 0);
        const ctrl = e.via ? place(e.via) : [(ax + bx) / 2 - uy * bend * dist, (ay + by) / 2 + ux * bend * dist];
        const dir = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / L, (q[1] - p[1]) / L]; };
        const s = boundary(e.from, ...dir([ax, ay], ctrl)), t = boundary(e.to, ...dir([bx, by], ctrl));
        d = `M${s[0]},${s[1]} Q${ctrl[0]},${ctrl[1]} ${t[0]},${t[1]}`;
        at = k => { const m = 1 - k; return [m * m * s[0] + 2 * m * k * ctrl[0] + k * k * t[0], m * m * s[1] + 2 * m * k * ctrl[1] + k * k * t[1]]; };
        const mid = at(0.5), side = bend >= 0 ? 1 : -1;
        [lx, ly] = [mid[0] - uy * fs * 0.62 * side, mid[1] + ux * fs * 0.62 * side + size * 0.35];
      }
      geometry.set(e.from + '>' + e.to, at);
      svgEl(edgeLayer, 'path', { d, fill: 'none', stroke: st.stroke, 'stroke-width': st.width, opacity: st.opacity, 'marker-end': head(st.stroke), 'data-edge': e.from + '>' + e.to });
      if (spec.onHover || spec.onClick) hover(svgEl(edgeLayer, 'path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': fs * 1.1, style: 'cursor:pointer' }), { kind: 'edge', ...e });
      if (e.label != null && e.label !== '') svgEl(labelLayer, 'text', { x: lx, y: ly, 'text-anchor': 'middle', 'font-size': Math.round(size * 0.92), 'font-weight': 650, fill: st.ink, opacity: st.opacity, ...halo }, e.label);
    });
    spec.nodes.forEach(n => {
      const st = { fill: c.surface, stroke: c.s1, ink: c.ink, width: 2, opacity: 1, ...look('node', n) };
      const [x, y] = pos.get(n.id), hw = halfWidth.get(n.id);
      const box = svgEl(nodeLayer, 'rect', { x: x - hw, y: y - hh, width: 2 * hw, height: 2 * hh, rx: hh * 0.7, fill: st.fill, stroke: st.stroke, 'stroke-width': st.width, opacity: st.opacity });
      svgEl(nodeLayer, 'text', { x, y: y + size * 0.36, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 650, fill: st.ink, opacity: st.opacity, 'pointer-events': 'none' }, n.label);
      if (spec.onHover || spec.onClick) { box.style.cursor = 'pointer'; hover(box, { kind: 'node', ...n }); }
    });
    return {
      svg, c, fs, size, hh, at: id => pos.get(id), halfWidth: id => halfWidth.get(id),
      // A point on the drawn arrow from → to, k in [0, 1] (for a moving marker).
      along: (from, to, k) => (geometry.get(from + '>' + to) || (() => pos.get(to)))(k)
    };
  }

  // Grouped bars of shares (0 to 1): one group per state, one bar per series,
  // the value written on each bar. series: [{ name, values, color }]
  function shareBars(svg, root, { categories, series, title = '', fmt = v => num(v, 3) }) {
    const p = plot2d(svg, root, { x: [0, categories.length], y: [0, 1] }, { padL: 2.6, padT: 2.4, padB: 2.2 });
    if (!p) return null;
    const { X, Y, fs, c, size } = p;
    p.grid([], [0, 0.25, 0.5, 0.75, 1], { fy: v => num(v, 2) });
    const groupW = X(1) - X(0), barW = Math.min(fs * 3.2, groupW * 0.8 / series.length);
    categories.forEach((name, i) => {
      svgEl(svg, 'text', { x: X(i + 0.5), y: Y(0) + fs * 1.15, 'text-anchor': 'middle', fill: c.ink, 'font-size': size, 'font-weight': 650 }, name);
      series.forEach((s, k) => {
        const v = s.values[i];
        if (v == null) return;
        const x = X(i + 0.5) + (k - (series.length - 1) / 2) * (barW + 2) - barW / 2;
        svgEl(svg, 'rect', { x, y: Y(v), width: barW, height: Math.max(0, Y(0) - Y(v)), fill: s.color, rx: 3 });
        svgEl(svg, 'text', { x: x + barW / 2, y: Y(v) - fs * 0.3, 'text-anchor': 'middle', fill: c.ink, 'font-size': Math.round(size * 0.9), 'font-weight': 650 }, fmt(v));
      });
    });
    let lx = X(0);
    series.forEach(s => {
      svgEl(svg, 'rect', { x: lx, y: fs * 0.35, width: fs * 0.8, height: fs * 0.8, rx: 2, fill: s.color });
      const label = svgEl(svg, 'text', { x: lx + fs * 1.1, y: fs * 1.05, fill: c.ink2, 'font-size': size }, s.name);
      lx += fs * 1.9 + label.getComputedTextLength();
    });
    if (title) svgEl(svg, 'text', { x: X(categories.length), y: fs * 1.05, 'text-anchor': 'end', fill: c.ink2, 'font-size': size, 'font-style': 'italic' }, title);
    return p;
  }

  // === KKT SCENE SCAFFOLD ===
  // A step sets the scene's state when it is entered (and while it animates);
  // sliders and dragging may change the state afterwards, and a repaint keeps
  // those changes until another step is entered.
  function kktScene({ root, steps, state, apply, paint, duration = 700, debug, onActivate, onDeactivate }) {
    let applied = { index: -1, p: 1 };
    // A scene's ".js-changed" note appears when the slider or dragging has moved
    // the picture away from the values the step's text talks about.
    const note = root.querySelector('.js-changed');
    const differs = (a, b) => Array.isArray(a) ? a.some((v, k) => differs(v, b[k])) : typeof a === 'number' ? Math.abs(a - b) > 1e-9 : a !== b;
    function syncNote(index, p) {
      if (!note) return;
      const ref = JSON.parse(JSON.stringify(state));
      apply(ref, steps[index], 1, index);
      note.hidden = p < 1 || !Object.keys(ref).some(k => differs(ref[k], state[k]));
    }
    const st = stepper({
      root, total: () => steps.length,
      duration: i => steps[i].dur || duration,
      render(index, p) {
        if (index !== applied.index || p < 1 || applied.p < 1) { apply(state, steps[index], p, index); applied = { index, p }; }
        root.querySelector('.js-iter').textContent = 'Step ' + (index + 1) + ' of ' + steps.length;
        syncNote(index, p);
        paint(index, p);
      }
    });
    new ResizeObserver(() => { if (!root.hidden) st.repaint(); }).observe(root.querySelector('.anim-stage'));
    window.addEventListener('themechange', () => { if (!root.hidden) st.repaint(); });
    // A scene's Reset button puts back the values this step starts with (after
    // the slider or dragging changed them) without leaving the step.
    const reset = root.querySelector('.js-reset');
    if (reset) reset.addEventListener('click', () => {
      st.stop();
      apply(state, steps[st.index], 1, st.index);
      applied = { index: st.index, p: 1 };
      st.repaint();
    });
    register(root.id, {
      activate() { st.repaint(); if (onActivate) onActivate(); },
      deactivate() { st.stop(); if (onDeactivate) onDeactivate(); },
      step: d => st.step(d), restart: () => st.go(0), togglePlay: () => st.togglePlay(),
      debug: () => ({ index: st.index, total: steps.length, kind: steps[st.index].kind, state: JSON.parse(JSON.stringify(state)), ...(debug ? debug() : {}) })
    });
    return st;
  }

  // Back / Next / Play / Speed / Restart, written once for every animation.
  function fillControls(footer) {
    if (footer.children.length) return;
    const [slow, normal, fast] = (footer.dataset.speeds || '2600 1600 900').split(' ');
    footer.innerHTML = '<button class="js-back">← Back</button><button class="primary js-next">Next step →</button>' +
      '<button class="js-play" aria-pressed="false">▶ Play</button>' +
      '<label>Speed <select class="js-speed"><option value="' + slow + '">Slow</option><option value="' + normal + '" selected>Normal</option><option value="' + fast + '">Fast</option></select></label>' +
      '<button class="js-restart">↺ Restart</button><span class="keys">→ next · ← back · P play</span>';
  }
  document.querySelectorAll('.anim-controls').forEach(fillControls);

  // === WEEK PAGE AND DECK ===
  function register(id, mod) { modules.set(id, mod); }
  // Read-only state snapshot for studio_dev/check_lecture_animations.py.
  window.ANIM_DEBUG = id => { const mod = modules.get(id); return mod && mod.debug ? mod.debug() : null; };
  const embedId = params.get('embed');
  const inDeck = !!embedId && window.parent !== window;

  // In a deck the presenter's clicker sends ArrowRight / PageDown. The animation
  // consumes them while it still has steps; at its last (first) step it hands the
  // key to the deck, so slide -> animation -> slide runs on one button.
  function toDeck(key) {
    if (inDeck) window.parent.postMessage({ type: 'ie301-deck-key', key }, '*');
  }
  function handleKey(key, event) {
    const mod = modules.get(activeId);
    if (!mod) return false;
    if (['ArrowRight', 'PageDown', ' '].includes(key)) { if (!mod.step(1)) toDeck('ArrowRight'); }
    else if (['ArrowLeft', 'PageUp'].includes(key)) { if (!mod.step(-1)) toDeck('ArrowLeft'); }
    else if (key === 'Home') mod.restart();
    else if (key === 'p' || key === 'P') mod.togglePlay();
    else return false;
    if (event) event.preventDefault();
    return true;
  }
  // Which animation the keys drive: in the deck the embedded one; on a week
  // page the one the reader last clicked or focused (Space keeps scrolling
  // the page there, and keys typed outside that card are left alone).
  let lastTouched = null;
  const touch = event => {
    const sec = event.target && event.target.closest && event.target.closest('section.anim');
    lastTouched = sec && modules.has(sec.id) ? sec : null;
    if (lastTouched) activeId = sec.id;
  };
  document.addEventListener('pointerdown', touch, true);
  document.addEventListener('focusin', touch);
  document.addEventListener('keydown', event => {
    if (!activeId || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target || {};
    const tag = target.tagName;
    if (target.isContentEditable || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (tag === 'INPUT' && target.type !== 'range') return;
    if (tag === 'BUTTON' && (event.key === ' ' || event.key === 'Enter')) return;
    if (!embedId) {
      if (event.key === ' ' || !lastTouched) return;
      if (target !== document.body && !lastTouched.contains(target)) return;
    }
    handleKey(event.key, event);
  });
  // The deck forwards the presenter's keys while an animation stop is shown,
  // so they work even before anyone has clicked inside the iframe.
  window.addEventListener('message', event => {
    if (inDeck && event.source === window.parent && event.data && event.data.type === 'ie301-anim-key') handleKey(event.data.key);
  });

  // Each animation draws when its card first comes into view and pauses (stops
  // playing and spinning) when it leaves; in the deck only the embedded one runs.
  function start() {
    modules.forEach((mod, id) => {
      const section = document.getElementById(id);
      if (!section || (embedId && embedId !== id)) return;
      let on = false;
      new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting && !on) { on = true; mod.activate(); }
        else if (!entry.isIntersecting && on) { on = false; mod.deactivate(); }
      }), { rootMargin: '200px' }).observe(section);
    });
    if (embedId && modules.has(embedId)) activeId = embedId;
  }
  document.addEventListener('DOMContentLoaded', start);

  return {
    params, reduced, num, fixed, fracText, fracTex, ratTex, texNum, tex, svgEl, px, colors, hexToRgb, ease,
    ellipse, clipHalfPlane, plot2d, conditionList, meters, stats, setText, gainCost, numberLine,
    surface3d, kktScene, stepper, register, MINUS, rng, pick, expTime, stateDiagram, shareBars,
    get activeId() { return activeId; }
  };
})();
