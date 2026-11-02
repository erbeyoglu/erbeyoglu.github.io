/* =====================================================================
   WEEKS 11, 13, 14 · MARKOV CHAIN ANIMATIONS (step by step, deck stops)
   #nextword  (week11, before slide 4): a phone's next-word guess is a chain.
   #diagram   (week11, after slide 19): the arrows and the matrix hold the
              same numbers (balls of slides 18–19, weather of slide 16,
              beer of slide 22).
   #twocounts (week13, after slide 12): what π means — one long path against
              a thousand paths; the periodic chain of slide 11.
   #salesman  (week14, after slide 31): Example 4 — how long he stays and
              where he goes next; share of time against share of trips.
   Every scene returns early when its section is not on the page.
   Random draws use seeded generators, so a step shows the same path every
   time. Needs lecture-animations.js.
   ===================================================================== */
(() => {
  const { num, tex, svgEl, px, colors, stats, setText, rng, pick, expTime, stateDiagram, shareBars, plot2d } = ANIM;

  // === SHARED: fractions, matrices, the scene scaffold ===
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  // 0.25 → "1/4", 1/3 → "1/3", 0.8 → "0.8" (denominators the slides use).
  function frac(v) {
    if (Math.abs(v) < 1e-12) return '0';
    for (const d of [1, 2, 3, 4, 6, 7, 8, 9, 11, 12]) {
      const n = Math.round(v * d);
      if (Math.abs(n / d - v) < 1e-9) return d === 1 ? String(n) : n + '/' + d;
    }
    return num(v, 3);
  }
  const fracTex = v => { const f = frac(v); return f.includes('/') ? '\\tfrac{' + f.replace('/', '}{') + '}' : f; };
  const matMul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const matPow = (P, n) => { let R = P.map((r, i) => r.map((_, j) => +(i === j))); for (let k = 0; k < n; k++) R = matMul(R, P); return R; };
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // Side panel, parts (tabs), keys, resize and theme, debug — one place for all four scenes.
  // render(step, p, index) draws the stage and returns { title, text, formula, stats, fine, note }.
  function scene({ root, steps, phases, render, debug, duration = 800 }) {
    const $ = sel => root.querySelector(sel);
    const partOf = s => s.part || 'main';
    const parts = [...new Set(steps.map(partOf))];
    function paint(index, p) {
      const s = steps[index], part = partOf(s);
      root.dataset.part = part;
      root.querySelectorAll('.js-part').forEach(b => b.classList.toggle('active', b.dataset.part === part));
      const inPart = steps.filter(t => partOf(t) === part);
      $('.js-iter').textContent = (parts.length > 1 ? 'Part ' + (parts.indexOf(part) + 1) + ' · ' : '') + 'step ' + (inPart.indexOf(s) + 1) + ' of ' + inPart.length;
      const names = Array.isArray(phases) ? phases : phases[part];
      $('.js-phases').innerHTML = names.map((n, i) => '<span' + (i === s.phase ? ' class="on"' : '') + '>' + n + '</span>').join('');
      const out = render(s, p, index) || {};
      setText(root, out);
      stats($('.js-stats'), out.stats || []);
      $('.js-fine').textContent = out.fine || '';
      $('.js-note').innerHTML = out.note || '';
    }
    const st = ANIM.stepper({ root, total: () => steps.length, render: paint, duration: i => { const d = steps[i].dur; return (typeof d === 'function' ? d() : d) || duration; } });
    root.querySelectorAll('.js-part').forEach(b => b.addEventListener('click', () => st.go(steps.findIndex(s => partOf(s) === b.dataset.part))));
    new ResizeObserver(() => { if (!root.hidden) st.repaint(); }).observe($('.anim-stage'));
    window.addEventListener('themechange', () => { if (!root.hidden) st.repaint(); });
    ANIM.register(root.id, {
      activate() { st.repaint(); }, deactivate() { st.stop(); },
      step: d => st.step(d), restart: () => st.go(0), togglePlay: () => st.togglePlay(),
      debug: () => ({ index: st.index, total: steps.length, kind: steps[st.index].kind, part: partOf(steps[st.index]), ...(debug ? debug() : {}) })
    });
    return st;
  }
  const key = (cls, text) => '<span class="anim-key ' + cls + '">' + text + '</span>';

  // =====================================================================
  // #nextword · WEEK 11 OPENING: a phone's next-word guess
  // A made-up message history (not from the slides). Counting what follows each
  // word gives a Markov chain; it forgets everything but the current word.
  // =====================================================================
  (function nextWord() {
    const root = document.getElementById('nextword');
    if (!root) return;
    const $ = sel => root.querySelector(sel);
    const TEXT = ['the cafe is open', 'the class is full', 'the exam is hard', 'my class is hard', 'the cafe is full', 'my exam is open'];
    const END = '.';
    // The messages read as one loop: after "." the next message starts.
    const WORDS = TEXT.flatMap(t => [...t.split(' '), END]);
    const at = i => WORDS[(i + WORDS.length) % WORDS.length];
    const tally = keyOf => {
      const m = new Map();
      WORDS.forEach((w, i) => {
        const k = keyOf(i), next = at(i + 1);
        if (!m.has(k)) m.set(k, new Map());
        m.get(k).set(next, (m.get(k).get(next) || 0) + 1);
      });
      return m;
    };
    const ONE = tally(i => at(i));                      // state = current word
    const TWO = tally(i => at(i - 1) + ' ' + at(i));    // state = last two words
    const rowOf = (m, k) => { const r = m.get(k), total = [...r.values()].reduce((a, b) => a + b, 0); return [...r.entries()].map(([to, n]) => ({ to, n, total, p: n / total })); };
    const STATES = ['the', 'my', 'cafe', 'class', 'exam', 'is', 'open', 'full', 'hard', END];
    const POS = { the: [0, 0.3], my: [0, 0.66], cafe: [0.3, 0.12], class: [0.3, 0.47], exam: [0.3, 0.82], is: [0.56, 0.47], open: [0.8, 0.12], full: [0.8, 0.47], hard: [0.8, 0.82], [END]: [1, 0.47] };
    // Long arrows back from the end of a message go around the picture; two crossing arrows bend apart.
    const VIA = { [END + '>the']: [0.55, -0.8], [END + '>my']: [0.5, 1.6] };
    const BEND = { 'the>exam': 0.1, 'my>class': -0.1 };
    const EDGES = STATES.flatMap(s => rowOf(ONE, s).map(r => ({ from: s, to: r.to, label: frac(r.p), p: r.p, via: VIA[s + '>' + r.to], bend: BEND[s + '>' + r.to] })));
    const NODES = STATES.map(s => ({ id: s, label: s === END ? '. (end)' : s, x: POS[s][0], y: POS[s][1] }));
    // One generated message: start after ".", walk until the next ".".
    function generate(seed) {
      const u = rng(seed), path = [END];
      while (path.length < 12) {
        const row = rowOf(ONE, path[path.length - 1]);
        path.push(row[pick(row.map(r => r.p), u())].to);
        if (path[path.length - 1] === END) break;
      }
      return path;
    }
    const probOf = path => path.slice(1).reduce((acc, w, i) => acc * (rowOf(ONE, path[i]).find(r => r.to === w) || { p: 0 }).p, 1);
    const sentence = path => path.slice(1, -1).join(' ');
    let seed = 6;   // the first draw repeats a typed message; "Another message" then gives new ones
    const FORGET = [END, 'the', 'cafe', 'is', 'hard', END];

    // --- stage pictures ---
    function drawMessages(svg, s, p) {
      const W = svg.clientWidth, H = svg.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.replaceChildren();
      const c = colors(), fs = px(root), size = Math.round(fs * 0.95);
      const lineH = Math.min(fs * 1.9, (H * 0.62) / TEXT.length), x0 = fs * 1.2;
      svgEl(svg, 'text', { x: x0, y: fs * 1.2, fill: c.ink2, 'font-size': Math.round(fs * 0.78) }, 'Messages you typed before');
      const shownCount = s.kind === 'count' ? p * TEXT.length : -1;
      TEXT.forEach((t, i) => {
        const y = fs * 2.2 + i * lineH;
        svgEl(svg, 'rect', { x: x0 - fs * 0.4, y: y - fs * 0.6, width: W * 0.5, height: lineH * 0.8, rx: lineH * 0.35, fill: c.region, opacity: 0.55 });
        const text = svgEl(svg, 'text', { x: x0, y: y + fs * 0.45, fill: c.ink, 'font-size': size }, '');
        t.split(' ').forEach((w, k, arr) => {
          const span = svgEl(text, 'tspan', {}, (k ? ' ' : '') + w);
          if (i < shownCount && (w === 'is' || arr[k - 1] === 'is')) { span.setAttribute('font-weight', 750); span.setAttribute('fill', w === 'is' ? c.s1 : c.s5); }
        });
      });
      // Right: the tally of what came after "is".
      const tx = W * 0.62, ty = fs * 2.4;
      if (s.kind === 'count') {
        svgEl(svg, 'text', { x: tx, y: ty - fs * 0.4, fill: c.ink2, 'font-size': Math.round(fs * 0.78) }, 'after "is" came…');
        const seen = TEXT.slice(0, Math.floor(shownCount + 1e-9)).map(t => t.split(' ')[3]);
        ['open', 'full', 'hard'].forEach((w, k) => {
          const n = seen.filter(v => v === w).length, y = ty + fs * 1.4 + k * fs * 2.1;
          svgEl(svg, 'text', { x: tx, y, fill: c.ink, 'font-size': size, 'font-weight': 650 }, w);
          for (let m = 0; m < n; m++) svgEl(svg, 'rect', { x: tx + fs * 3.6 + m * fs * 1.1, y: y - fs * 0.85, width: fs * 0.8, height: fs * 1.0, rx: 2, fill: c.s5 });
          if (p >= 1) svgEl(svg, 'text', { x: tx + fs * 6.4, y, fill: c.ink, 'font-size': size, 'font-weight': 700 }, n + ' of 6 = ' + frac(n / 6));
        });
      }
      // Bottom: a phone's suggestion bar for "the cafe is".
      const by = H - fs * 4.6, bw = Math.min(W - 2 * x0, fs * 24);
      svgEl(svg, 'rect', { x: x0, y: by, width: bw, height: fs * 3.8, rx: fs * 0.8, fill: c.surface, stroke: c.grid, 'stroke-width': 2 });
      svgEl(svg, 'text', { x: x0 + fs * 0.8, y: by + fs * 1.4, fill: c.ink, 'font-size': size }, 'the cafe is ▏');
      ['open', 'full', 'hard'].forEach((w, k) => {
        const cx = x0 + fs * 0.8 + k * (bw - fs * 1.6) / 3;
        svgEl(svg, 'rect', { x: cx, y: by + fs * 2.0, width: (bw - fs * 1.6) / 3 - fs * 0.4, height: fs * 1.4, rx: fs * 0.5, fill: c.region });
        svgEl(svg, 'text', { x: cx + ((bw - fs * 1.6) / 3 - fs * 0.4) / 2, y: by + fs * 3.0, 'text-anchor': 'middle', fill: c.ink, 'font-size': Math.round(fs * 0.85), 'font-weight': 650 }, w);
      });
    }
    function drawChain(svg, s, p) {
      const c = colors();
      const path = s.kind === 'generate' ? generate(seed) : s.kind === 'forget' ? FORGET : null;
      const steps = path ? path.length - 1 : 0, done = p * steps;
      const used = new Set(path ? path.slice(1).map((w, i) => path[i] + '>' + w).filter((_, i) => i < Math.ceil(done)) : []);
      const visibleEdge = (e, i) => s.kind !== 'chain' || i < p * EDGES.length + 0.5;
      const d = stateDiagram(svg, root, {
        nodes: NODES, padTop: 5.4, padBottom: 2.4,
        edges: EDGES.filter(visibleEdge),
        look: (kind, item) => {
          if (kind === 'edge') return used.has(item.from + '>' + item.to) ? { stroke: c.s5, width: 3.5 } : path ? { opacity: 0.45 } : {};
          if (path && path.slice(0, Math.floor(done) + 1).includes(item.id)) return { fill: c.region, stroke: c.s5, width: 3 };
          return {};
        }
      });
      if (!d || !path || p <= 0) return;
      const k = Math.min(steps - 1, Math.floor(done)), local = done - k;
      // At the end the marker waits beside the last box, so it does not cover its label.
      const last = d.at(path[steps]), parked = [last[0], last[1] - d.hh - d.fs * 0.55];
      const [x, y] = local >= 1 || done >= steps ? parked : d.along(path[k], path[k + 1], ease(local));
      svgEl(svg, 'circle', { cx: x, cy: y, r: d.fs * 0.45, fill: c.s5, stroke: c.surface, 'stroke-width': 2 });
    }
    const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function drawPairs(svg, p) {
      const c = colors();
      const pairs = ['cafe is', 'class is', 'exam is'];
      const nodes = pairs.map((k, i) => ({ id: k, label: '(' + k.replace(' ', ', ') + ')', x: 0, y: i / 2 }))
        .concat(['open', 'full', 'hard'].map((w, i) => ({ id: w, label: w, x: 1, y: i / 2 })));
      const edges = pairs.flatMap(k => rowOf(TWO, k).map(r => ({ from: k, to: r.to, label: frac(r.p) })));
      stateDiagram(svg, root, { nodes, edges: edges.filter((_, i) => i < p * edges.length + 0.5), look: (kind, item) => kind === 'edge' && item.from === 'cafe is' ? { stroke: c.s2, width: 3 } : {} });
    }
    function drawMatrix(svg, p) {
      const W = svg.clientWidth, H = svg.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.replaceChildren();
      const c = colors(), fs = px(root);
      const n = STATES.length, head = fs * 3.2, cw = Math.min(fs * 3.2, (W - head - fs * 3.4) / n), ch = Math.min(fs * 1.7, (H - fs * 3) / (n + 1));
      const x0 = (W - head - n * cw - fs * 3) / 2 + head, y0 = fs * 1.6;
      const sz = Math.round(Math.min(fs * 0.72, cw * 0.32));
      svgEl(svg, 'text', { x: x0 + n * cw / 2, y: y0 - fs * 0.5, 'text-anchor': 'middle', fill: c.ink2, 'font-size': Math.round(fs * 0.72), 'font-style': 'italic' }, 'next word →');
      STATES.forEach((s, j) => svgEl(svg, 'text', { x: x0 + j * cw + cw / 2, y: y0 + ch * 0.7, 'text-anchor': 'middle', fill: c.ink2, 'font-size': sz, 'font-weight': 650 }, s));
      svgEl(svg, 'text', { x: x0 + n * cw + fs * 1.5, y: y0 + ch * 0.7, 'text-anchor': 'middle', fill: c.ink2, 'font-size': sz, 'font-weight': 650 }, 'sum');
      STATES.forEach((s, i) => {
        const y = y0 + (i + 1) * ch, shown = i < p * n + 0.5;
        svgEl(svg, 'text', { x: x0 - fs * 0.4, y: y + ch * 0.68, 'text-anchor': 'end', fill: c.ink, 'font-size': sz, 'font-weight': 650 }, s);
        const row = rowOf(ONE, s);
        STATES.forEach((t, j) => {
          const r = row.find(q => q.to === t), v = r ? r.p : 0;
          svgEl(svg, 'rect', { x: x0 + j * cw + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 3, fill: v > 0 && shown ? c.region : c.surface, stroke: c.grid });
          if (shown) svgEl(svg, 'text', { x: x0 + j * cw + cw / 2, y: y + ch * 0.68, 'text-anchor': 'middle', fill: v > 0 ? c.ink : c.muted, 'font-size': sz, 'font-weight': v > 0 ? 700 : 400 }, frac(v));
        });
        if (shown) svgEl(svg, 'text', { x: x0 + n * cw + fs * 1.5, y: y + ch * 0.68, 'text-anchor': 'middle', fill: c.good, 'font-size': sz, 'font-weight': 700 }, '1 ✓');
      });
    }

    const STEPS = [
      { kind: 'ask', phase: 0 },
      { kind: 'count', phase: 0, dur: 2400 },
      { kind: 'chain', phase: 1, dur: 2600 },
      { kind: 'generate', phase: 1, dur: 2600 },
      { kind: 'forget', phase: 2, dur: 2600 },
      { kind: 'pairs', phase: 2, dur: 1500 },
      { kind: 'matrix', phase: 3, dur: 2000 }
    ];
    const isRow = rowOf(ONE, 'is').map(r => r.to + ' ' + frac(r.p)).join(', ');
    function render(s, p) {
      const svg = $('.js-plot');
      $('.js-again').hidden = s.kind !== 'generate';
      if (s.kind === 'ask' || s.kind === 'count') drawMessages(svg, s, p);
      else if (s.kind === 'pairs') drawPairs(svg, p);
      else if (s.kind === 'matrix') drawMatrix(svg, p);
      else drawChain(svg, s, p);
      const fine = 'The six messages are made up for this warm-up; they are not from the slides.';
      if (s.kind === 'ask') return {
        title: 'How does your phone guess the next word?',
        text: 'You type "the cafe is" and the keyboard offers three words. One simple way to choose them: look at everything you typed before and count which word came after "is".', fine
      };
      if (s.kind === 'count') return {
        title: 'Count what came next',
        text: '"is" appears 6 times. It was followed by open twice, full twice and hard twice. So the guess is: each of the three with probability 2/6 = 1/3.',
        formula: 'P(\\text{next} = \\text{open} \\mid \\text{now} = \\text{is}) = \\tfrac{2}{6} = \\tfrac{1}{3}', fine
      };
      if (s.kind === 'chain') return {
        title: 'Words become states, counts become arrows',
        text: 'Do the same count after every word. Each word is a state; an arrow carries the probability of the next word. "." ends a message, and the next message starts with "the" (4 of 6 times) or "my".',
        stats: [['States', String(STATES.length)], ['Arrows', String(EDGES.length)]], fine
      };
      if (s.kind === 'generate') {
        const path = generate(seed), known = TEXT.includes(sentence(path));
        return {
          title: 'Let the chain write a message',
          text: 'Start after ".", draw the next word with the arrow probabilities, repeat until ".". The next word depends only on the current word: that is the Markov property of slide 10. Press "Another message" for a new draw.',
          formula: '\\text{“' + sentence(path) + '”}',
          stats: [['Probability of this message', frac(probOf(path))], ['In your messages?', known ? 'yes' : 'no, a new one']],
          note: key('k-greedy', 'the path of this message'), fine
        };
      }
      if (s.kind === 'forget') return {
        title: 'It forgets everything but the current word',
        text: 'At "is" the chain no longer knows whether we talked about the cafe or the exam. So it happily writes "the cafe is hard", which you never typed. The chain gives it probability 2/3 · 1/2 · 1 · 1/3 · 1 = 1/9.',
        formula: 'P(X_{t+1} \\mid X_t, X_{t-1}, \\dots) = P(X_{t+1} \\mid X_t)',
        stats: [['Next word after "is"', isRow]], fine
      };
      if (s.kind === 'pairs') return {
        title: 'More memory: the state is the last two words',
        text: 'Make the state the pair (previous word, current word). After (cafe, is) only open and full ever came, so "the cafe is hard" is gone. The price: more states. The insurance example of slide 52 does the same; its two-year states are built in Week 13 (slide 25).',
        stats: [['States with one word', String(ONE.size)], ['States with two words', String(TWO.size)]], fine
      };
      return {
        title: 'The Week 11 words, already in your phone',
        text: 'The words X_0, X_1, X_2, … form a stochastic process {X_t} (slides 4–6). Its 10 states are the 9 words and the end mark ".". Each row of the table is one state\'s arrows: the matrix P of slide 13. Every row adds up to 1 (slide 14).',
        formula: 'p_{ij} = P(X_{t+1} = j \\mid X_t = i), \\qquad \\textstyle\\sum_j p_{ij} = 1', fine
      };
    }
    const st = scene({
      root, steps: STEPS, phases: ['Count', 'Chain', 'Memory', 'Matrix'], render,
      debug: () => ({ one: Object.fromEntries([...ONE].map(([k, m]) => [k, Object.fromEntries(m)])), pairs: TWO.size, seed, message: sentence(generate(seed)), messageProb: probOf(generate(seed)), forgetProb: probOf(FORGET) })
    });
    $('.js-again').addEventListener('click', () => { seed += 1; st.replay(); });
    st.go(0);
  })();

  // =====================================================================
  // #diagram · WEEK 11, SLIDE 19: arrows and matrix, the same numbers
  // =====================================================================
  (function arrowsAndMatrix() {
    const root = document.getElementById('diagram');
    if (!root) return;
    const $ = sel => root.querySelector(sel);
    const PRESETS = {
      balls: {
        label: 'Balls (slides 18–19)', focus: 4,
        states: ['[0,1,1]', '[0,2,0]', '[0,0,2]', '[2,0,0]', '[1,1,0]', '[1,0,1]'],
        pos: [[0.1, 0], [0.1, 0.5], [0.1, 1], [0.9, 0], [0.9, 0.5], [0.9, 1]],
        // Routed as on slide 19: around the middle boxes, and [1,1,0] → [0,1,1] over the top.
        via: { '0>2': [-0.12, 0.5], '2>0': [0.3, 0.5], '3>5': [1.12, 0.5], '4>0': [0.5, 0.02] },
        bend: { '5>0': 0.1 },
        P: [[0, 1 / 2, 1 / 2, 0, 0, 0], [1, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0], [0, 0, 0, 0, 1 / 2, 1 / 2], [1 / 4, 1 / 4, 0, 0, 0, 1 / 2], [1 / 4, 0, 1 / 4, 0, 1 / 2, 0]],
        why: 'From [1,1,0]: the unpainted ball (1/2) turns red or black with the coin (1/4 each); the red ball (1/2) turns black.'
      },
      weather: {
        label: 'Weather (slide 16)', focus: 0,
        states: ['0 dry', '1 rain'], pos: [[0.2, 0.55], [0.8, 0.55]], via: {},
        P: [[0.8, 0.2], [0.6, 0.4]],
        why: 'Dry today: dry tomorrow with 0.8, rain with 0.2.'
      },
      beer: {
        label: 'Beer (slide 22)', focus: 1,
        states: ['A', 'B', 'C'], pos: [[0.5, 0], [0.1, 0.92], [0.9, 0.92]], via: {},
        P: [[0.1, 0.2, 0.7], [0.2, 0.4, 0.4], [0.1, 0.3, 0.6]],
        why: 'Brand B this week: A next week with 0.2, B with 0.4, C with 0.4.'
      }
    };
    let presetKey = 'balls', P = null, hoverCell = null, errors = [];
    const preset = () => PRESETS[presetKey];
    const parse = text => {
      const t = String(text).trim();
      if (/^\d+\s*\/\s*\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return b ? a / b : NaN; }
      return t === '' ? 0 : Number(t);
    };
    function usePreset(k) {
      presetKey = k; P = PRESETS[k].P.map(r => r.slice()); hoverCell = null; errors = [];
      root.querySelectorAll('.js-preset').forEach(b => b.classList.toggle('active', b.dataset.preset === k));
      buildTable();
    }
    // The matrix as an HTML table: inputs, so the last step can edit it.
    function buildTable() {
      const S = preset().states;
      const head = '<tr><th></th>' + S.map(s => '<th>' + s + '</th>').join('') + '<th class="js-sumhead">sum</th></tr>';
      const rows = S.map((s, i) => '<tr data-row="' + i + '"><th>' + s + '</th>' + S.map((_, j) => '<td><input data-i="' + i + '" data-j="' + j + '" value="' + frac(P[i][j]) + '" inputmode="decimal" aria-label="p from ' + s + ' to ' + S[j] + '"></td>').join('') + '<td class="sum" data-sum="' + i + '"></td></tr>').join('');
      $('.js-matrix').innerHTML = '<table class="mk-matrix"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table>';
      $('.js-matrix').querySelectorAll('input').forEach(inp => {
        const i = +inp.dataset.i, j = +inp.dataset.j;
        inp.addEventListener('pointerenter', () => setHover([i, j]));
        inp.addEventListener('pointerleave', () => setHover(null));
        inp.addEventListener('focus', () => setHover([i, j]));
        inp.addEventListener('blur', () => setHover(null));
        inp.addEventListener('input', () => {
          const v = parse(inp.value);
          inp.classList.toggle('bad', !(v >= 0 && v <= 1));
          if (v >= 0 && v <= 1) P[i][j] = v;
          st.repaint();
        });
      });
    }
    // Pointing at an arrow lights its cell and the other way round. Only classes
    // change: redrawing under the pointer would lose the pointer-leave event.
    function setHover(cell) {
      hoverCell = cell;
      const id = cell ? cell[0] + '>' + cell[1] : null;
      $('.js-plot').querySelectorAll('path[data-edge]').forEach(el => el.classList.toggle('sd-hover', el.dataset.edge === id));
      $('.js-matrix').querySelectorAll('input').forEach(inp => inp.classList.toggle('hover', !!cell && +inp.dataset.i === cell[0] && +inp.dataset.j === cell[1]));
    }
    function rowProblems() {
      const S = preset().states;
      return P.map((r, i) => ({ i, sum: r.reduce((a, b) => a + b, 0) })).filter(r => Math.abs(r.sum - 1) > 1e-9).map(r => 'Row ' + S[r.i] + ' adds up to ' + num(r.sum, 3) + ', not 1.');
    }
    function paintTable(s, p) {
      const S = preset().states, focus = preset().focus;
      const order = [];   // every arrow in row order, for the "one arrow, one cell" step
      P.forEach((r, i) => r.forEach((v, j) => { if (v > 0) order.push(i + '>' + j); }));
      const lit = s.kind === 'cells' ? new Set(order.slice(0, Math.ceil(p * order.length))) : null;
      $('.js-matrix').querySelectorAll('input').forEach(inp => {
        const i = +inp.dataset.i, j = +inp.dataset.j, v = P[i][j];
        inp.readOnly = s.kind !== 'edit';
        let cls = '';
        if (s.kind === 'row' && i === focus && v > 0) cls = 'on';
        if (lit && lit.has(i + '>' + j)) cls = 'on';
        if (s.kind === 'zeros' && v === 0) cls = 'zero';
        const hovered = hoverCell && hoverCell[0] === i && hoverCell[1] === j;
        inp.className = cls + (inp.classList.contains('bad') ? ' bad' : '') + (hovered ? ' hover' : '');
        if (document.activeElement !== inp) inp.value = frac(v);
      });
      const showSums = s.kind === 'sums' || s.kind === 'edit';
      $('.js-sumhead').style.visibility = showSums ? '' : 'hidden';
      P.forEach((r, i) => {
        const cell = $('[data-sum="' + i + '"]'), sum = r.reduce((a, b) => a + b, 0), ok = Math.abs(sum - 1) < 1e-9;
        cell.textContent = showSums ? (ok ? '1 ✓' : num(sum, 3) + ' ✗') : '';
        cell.className = 'sum ' + (ok ? 'ok' : 'bad');
      });
      $('.js-matrix').querySelectorAll('tbody tr').forEach(tr => tr.classList.toggle('focus', s.kind === 'row' && +tr.dataset.row === focus));
    }
    function drawDiagram(s, p) {
      const c = colors(), pr = preset(), focus = pr.focus;
      const edges = [];
      P.forEach((r, i) => r.forEach((v, j) => { if (v > 0) edges.push({ from: String(i), to: String(j), label: frac(v), via: pr.via[i + '>' + j], bend: (pr.bend || {})[i + '>' + j] }); }));
      const order = edges.map(e => e.from + '>' + e.to);
      const lit = s.kind === 'cells' ? new Set(order.slice(0, Math.ceil(p * order.length))) : null;
      const focusShown = edges.filter(e => +e.from === focus).map(e => e.from + '>' + e.to);
      stateDiagram($('.js-plot'), root, {
        padTop: 3.2, padBottom: 2.4,
        nodes: pr.states.map((label, i) => ({ id: String(i), label, x: pr.pos[i][0], y: pr.pos[i][1] })),
        edges,
        look: (kind, item) => {
          if (kind === 'node') return s.kind === 'row' && +item.id === focus ? { fill: c.region, width: 3 } : {};
          const id = item.from + '>' + item.to;
          if (s.kind === 'row') { const k = focusShown.indexOf(id); return k >= 0 ? (k < p * focusShown.length + 0.5 ? { stroke: c.s5, width: 3.5 } : { opacity: 0.25 }) : { opacity: 0.25 }; }
          if (lit) return lit.has(id) ? { stroke: c.s5, width: 3 } : { opacity: 0.35 };
          return {};
        },
        onHover: item => setHover(item && item.kind === 'edge' ? [+item.from, +item.to] : null)
      });
      setHover(hoverCell);
    }
    const STEPS = [
      { kind: 'intro', phase: 0 },
      { kind: 'row', phase: 0, dur: 1800 },
      { kind: 'cells', phase: 1, dur: 3200 },
      { kind: 'zeros', phase: 1 },
      { kind: 'sums', phase: 2 },
      { kind: 'edit', phase: 3 }
    ];
    function render(s, p) {
      drawDiagram(s, p);
      paintTable(s, p);
      const pr = preset(), S = pr.states, f = pr.focus;
      const nonzero = P.flat().filter(v => v > 0).length, n = S.length;
      const fine = 'Point at an arrow or a cell: its partner lights up.';
      if (s.kind === 'intro') return {
        title: 'One picture, one table, the same numbers',
        text: 'Each box is a state and each arrow is a one-step probability p_ij. The matrix P holds the same numbers: the row is where the chain is now, the column is where it goes next.', fine
      };
      if (s.kind === 'row') return {
        title: 'The arrows out of ' + S[f] + ' are row ' + S[f],
        text: pr.why + ' Those arrows, and nothing else, fill this row.',
        formula: 'p_{ij} = P(X_{t+1} = j \\mid X_t = i)', fine
      };
      if (s.kind === 'cells') return {
        title: 'Every arrow is one cell',
        text: 'Row by row: the arrow from i to j writes its number into row i, column j.',
        stats: [['Arrows', String(nonzero)], ['Cells', String(n * n)]], fine
      };
      if (s.kind === 'zeros') return {
        title: 'No arrow means 0',
        text: n * n - nonzero > 0
          ? 'The grey cells are the moves that cannot happen in one step. The picture leaves them out; the matrix must still write them, as 0.'
          : 'This chain can go from every state to every state in one step, so it has no zeros. Try the balls example to see them.',
        stats: [['Zero cells', String(n * n - nonzero)]], fine
      };
      if (s.kind === 'sums') return {
        title: 'Every row adds up to 1',
        text: 'Every entry is a probability, so it is ≥ 0. From any state the chain must go somewhere next (staying is also a move), so every row adds up to 1 (slide 14).',
        formula: 'p_{ij} \\ge 0, \\qquad \\textstyle\\sum_j p_{ij} = 1 \\text{ for every } i', fine
      };
      errors = rowProblems();
      return {
        title: 'Your turn: change a number',
        text: 'Type into a cell (0.3 or 1/4). The arrow appears, changes or disappears at once. The table checks every row; it never fixes a row for you.',
        note: errors.length ? '<span class="mk-error">' + errors.join(' ') + '</span>' : 'All rows add up to 1.',
        fine: 'Reset: press the example button again.'
      };
    }
    const st = scene({ root, steps: STEPS, phases: ['A row', 'Cells', 'Rows sum to 1', 'Your turn'], render, debug: () => ({ preset: presetKey, P: P.map(r => r.slice()), errors: rowProblems() }) });
    root.querySelectorAll('.js-preset').forEach(b => b.addEventListener('click', () => { usePreset(b.dataset.preset); st.repaint(); }));
    usePreset(ANIM.params.get('preset') in PRESETS ? ANIM.params.get('preset') : 'balls');
    st.go(0);
  })();

  // =====================================================================
  // #twocounts · WEEK 13, SLIDES 3–13: what π means
  // One path's share of days against a thousand paths on one day.
  // =====================================================================
  (function twoCounts() {
    const root = document.getElementById('twocounts');
    if (!root) return;
    const $ = sel => root.querySelector(sel);
    const CHAINS = {
      weather: { P: [[0.8, 0.2], [0.6, 0.4]], pi: [0.75, 0.25], names: ['dry', 'rain'], label: 'weather (slide 3)' },
      periodic: { P: [[0, 1], [1, 0]], pi: [0.5, 0.5], names: ['0', '1'], label: 'periodic (slide 11)' }
    };
    const DAYS_ONE = 400, PATHS = 1000, DAYS_MANY = 20, SEED = 2026;
    // One path from state 0, and its running share of days in state 0 (days 1..t).
    function onePath(ch) {
      const u = rng(SEED), path = [0];
      for (let t = 1; t <= DAYS_ONE; t++) path.push(pick(ch.P[path[t - 1]], u()));
      let zeros = 0;
      const share = path.map((x, t) => { if (t === 0) return null; zeros += x === 0; return zeros / t; });
      return { path, share };
    }
    // A thousand paths from state 0: the share in state 0 on each day.
    function manyPaths(ch) {
      const u = rng(SEED + 1), rows = [];
      for (let m = 0; m < PATHS; m++) { const r = [0]; for (let t = 1; t <= DAYS_MANY; t++) r.push(pick(ch.P[r[t - 1]], u())); rows.push(r); }
      const share = Array.from({ length: DAYS_MANY + 1 }, (_, t) => rows.filter(r => r[t] === 0).length / PATHS);
      return { rows, share };
    }
    const exact = ch => Array.from({ length: DAYS_MANY + 1 }, (_, n) => matPow(ch.P, n)[0][0]);
    const DATA = Object.fromEntries(Object.entries(CHAINS).map(([k, ch]) => [k, { one: onePath(ch), many: manyPaths(ch), exact: exact(ch) }]));
    const stateColor = (c, x) => x === 0 ? c.s2 : c.s1;

    function drawStrip(svg, rows, days, shown, title) {
      const W = svg.clientWidth, H = svg.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.replaceChildren();
      const c = colors(), fs = px(root);
      const left = fs * 2.6, top = fs * 1.3, cw = (W - left - fs * 0.6) / (days + 1), ch = Math.min(cw, (H - top - fs * 0.3) / rows.length);
      svgEl(svg, 'text', { x: left, y: fs * 0.95, fill: c.ink2, 'font-size': Math.round(fs * 0.72) }, title);
      rows.forEach((r, i) => {
        if (rows.length > 1) svgEl(svg, 'text', { x: left - fs * 0.3, y: top + i * ch + ch * 0.75, 'text-anchor': 'end', fill: c.muted, 'font-size': Math.round(Math.min(fs * 0.6, ch * 0.8)) }, String(i + 1));
        for (let t = 0; t <= days && t <= shown; t++) svgEl(svg, 'rect', { x: left + t * cw + 0.5, y: top + i * ch + 0.5, width: Math.max(1, cw - 1), height: Math.max(1, ch - 1), fill: stateColor(c, r[t]) });
      });
    }
    function drawLine(svg, s, ch, data, p) {
      const c = colors();
      if (s.kind === 'one') {
        const shown = Math.max(1, Math.round(p * DAYS_ONE));
        const g = plot2d(svg, root, { x: [0, DAYS_ONE], y: [0, 1] }, { padL: 2.6, padB: 2.2 });
        if (!g) return;
        g.grid([0, 100, 200, 300, 400], [0, 0.25, 0.5, 0.75, 1], { xlabel: 'days', fx: v => String(v), fy: v => num(v, 2) });
        g.text([0, 1], 'share of days so far in ' + ch.names[0], { dy: -0.55, 'text-anchor': 'start', fill: c.ink2, 'font-weight': 400, 'font-style': 'italic' });
        g.line([0, ch.pi[0]], [DAYS_ONE, ch.pi[0]], { stroke: c.ink2, 'stroke-dasharray': '6 5', 'stroke-width': 1.5 });
        g.text([DAYS_ONE, ch.pi[0]], 'π = ' + num(ch.pi[0], 2), { dx: -0.3, dy: -0.5, 'text-anchor': 'end' });
        g.curve(data.one.share.slice(1, shown + 1).map((v, t) => [t + 1, v]), { stroke: c.s5, 'stroke-width': 2.5 });
        return;
      }
      const shown = Math.round(p * DAYS_MANY);
      const g = plot2d(svg, root, { x: [0, DAYS_MANY], y: [0, 1] }, { padL: 2.6, padB: 2.2 });
      if (!g) return;
      g.grid([0, 5, 10, 15, 20], [0, 0.25, 0.5, 0.75, 1], { xlabel: 'day n', fx: v => String(v), fy: v => num(v, 2) });
      g.text([0, 1], 'share of the 1000 paths in ' + ch.names[0] + ' on day n', { dy: -0.55, 'text-anchor': 'start', fill: c.ink2, 'font-weight': 400, 'font-style': 'italic' });
      g.line([0, ch.pi[0]], [DAYS_MANY, ch.pi[0]], { stroke: c.ink2, 'stroke-dasharray': '6 5', 'stroke-width': 1.5 });
      g.curve(data.exact.slice(0, shown + 1).map((v, n) => [n, v]), { stroke: c.ink2, 'stroke-width': 1.5 });
      data.many.share.slice(0, shown + 1).forEach((v, n) => g.dot([n, v], 4.5, c.s5));
    }
    const STEPS = [
      { part: 'weather', kind: 'questions', phase: 0 },
      { part: 'weather', kind: 'one', phase: 1, dur: 3000 },
      { part: 'weather', kind: 'many', phase: 2, dur: 2600 },
      { part: 'weather', kind: 'same', phase: 3, dur: 900 },
      { part: 'periodic', kind: 'one', phase: 0, dur: 3000 },
      { part: 'periodic', kind: 'many', phase: 1, dur: 2600 },
      { part: 'periodic', kind: 'same', phase: 2, dur: 900 }
    ];
    function render(s, p) {
      const ch = CHAINS[s.part], data = DATA[s.part], c = colors();
      const top = $('.js-top'), plot = $('.js-plot');
      // SVG elements have no `hidden` property: set the attribute itself.
      const solo = s.kind === 'questions' || s.kind === 'same';
      top.toggleAttribute('hidden', solo);
      $('.mk-stage').classList.toggle('mk-thin', s.kind === 'one');
      $('.mk-stage').classList.toggle('mk-solo', solo);
      const timeShare = data.one.share[DAYS_ONE], dayShare = data.many.share[DAYS_MANY], dayShareOdd = data.many.share[DAYS_MANY - 1];
      const legend = key('k-memo', ch.names[0]) + key('k-new', ch.names[1]);
      if (s.kind === 'questions') {
        stateDiagram(plot, root, { nodes: [{ id: '0', label: '0 dry', x: 0.2, y: 0.5 }, { id: '1', label: '1 rain', x: 0.8, y: 0.5 }], edges: [{ from: '0', to: '0', label: '0.8' }, { from: '0', to: '1', label: '0.2' }, { from: '1', to: '0', label: '0.6' }, { from: '1', to: '1', label: '0.4' }] });
        return {
          title: 'π answers two different questions',
          text: 'Weather of slides 3 and 9: π = (0.75, 0.25). Slide 6 gives π two meanings. (1) Over a long time, the share of days that are dry: one history, many days. (2) Many days from now, the probability of a dry day: many histories, one day.',
          formula: '\\pi = (0.75,\\; 0.25), \\qquad \\pi = \\pi P'
        };
      }
      if (s.kind === 'one') {
        drawStrip(top, [data.one.path], 60, Math.round(p * DAYS_ONE), 'one path, the first 60 days');
        drawLine(plot, s, ch, data, p);
        return s.part === 'weather' ? {
          title: 'Meaning (1): follow one path for 400 days',
          text: 'One random weather history, starting dry. The line is the share of dry days so far. It wanders at first and then settles near 0.75.',
          stats: [['Days', String(Math.max(1, Math.round(p * DAYS_ONE)))], ['Share dry so far', num(data.one.share[Math.max(1, Math.round(p * DAYS_ONE))], 3)]], note: legend
        } : {
          title: 'The periodic chain of slide 11: one path',
          text: 'From 0 the chain must go to 1, and from 1 back to 0: 0, 1, 0, 1, … The share of days in state 0 settles at 1/2, just like π = (1/2, 1/2) from π = πP.',
          formula: 'P = \\begin{pmatrix} 0 & 1 \\\\ 1 & 0 \\end{pmatrix}',
          stats: [['Share in 0 so far', num(data.one.share[Math.max(1, Math.round(p * DAYS_ONE))], 3)]], note: legend
        };
      }
      if (s.kind === 'many') {
        drawStrip(top, data.many.rows.slice(0, 24), DAYS_MANY, Math.round(p * DAYS_MANY), '24 of the 1000 paths (one row = one path, one column = one day)');
        drawLine(plot, s, ch, data, p);
        return s.part === 'weather' ? {
          title: 'Meaning (2): a thousand paths, one day at a time',
          text: 'Now 1000 histories, all starting dry. The dots are the share of paths that are dry on each day. The grey line is the exact p⁽ⁿ⁾₀₀ of slide 3: 0.8, 0.76, 0.752, … After about 5 days the start is forgotten: 0.75.',
          formula: 'p^{(n)}_{00} \\to \\pi_0 = 0.75',
          stats: [['Day ' + DAYS_MANY + ', paths dry', num(dayShare, 3)], ['Exact p⁽²⁰⁾₀₀', num(data.exact[DAYS_MANY], 3)]], note: legend
        } : {
          title: 'The periodic chain: a thousand paths never settle',
          text: 'All 1000 paths start in 0, so on every even day all of them are in 0 and on every odd day none is. The share jumps 1, 0, 1, 0, … The limit of p⁽ⁿ⁾₀₀ does not exist (slide 11).',
          formula: 'p^{(n)}_{00} = 1 \\text{ (n even)}, \\quad 0 \\text{ (n odd)}',
          stats: [['Day 20 in 0', num(dayShare, 2)], ['Day 19 in 0', num(dayShareOdd, 2)]], note: legend
        };
      }
      const series = s.part === 'weather'
        ? [{ name: 'one path, 400 days', values: [timeShare, 1 - timeShare], color: c.s5 }, { name: '1000 paths, day 20', values: [dayShare, 1 - dayShare], color: c.s2 }, { name: 'π', values: ch.pi, color: c.ink2 }]
        : [{ name: 'one path, 400 days', values: [timeShare, 1 - timeShare], color: c.s5 }, { name: '1000 paths, day 20', values: [dayShare, 1 - dayShare], color: c.s2 }, { name: 'day 19', values: [dayShareOdd, 1 - dayShareOdd], color: c.s1 }, { name: 'π', values: ch.pi, color: c.ink2 }];
      shareBars(plot, root, { categories: ch.names, series: series.map(x => ({ ...x, values: x.values.map(v => v * clamp01(p * 1.2)) })), fmt: v => num(v, 2) });
      return s.part === 'weather' ? {
        title: 'Two questions, one answer',
        text: 'One long path\'s share of days and many paths on one late day both come out close to π (random draws wobble by a few hundredths). The weather chain is irreducible and ergodic (not periodic), so Theorem 1 and slide 6 apply.',
        formula: '\\lim_{n\\to\\infty} p^{(n)}_{ij} = \\pi_j = \\text{long-run share of time in } j'
      } : {
        title: 'Periodic: only the time share survives',
        text: 'Day 20 and day 19 give 1 and 0, never 1/2. But the share of time is still π = (1/2, 1/2). Slide 12: for an irreducible chain π is always the long-run share of time, and slide 13 uses it for the long-run average cost.',
        formula: '\\lim_{n\\to\\infty} \\tfrac{1}{n}\\textstyle\\sum_{k=1}^{n} p^{(k)}_{ij} = \\pi_j'
      };
    }
    scene({
      root, steps: STEPS, phases: { weather: ['Two questions', 'One path', 'Many paths', 'Same answer'], periodic: ['One path', 'Many paths', 'Time share'] }, render,
      debug: () => Object.fromEntries(Object.entries(DATA).map(([k, d]) => [k, { timeShare: d.one.share[DAYS_ONE], dayShare: d.many.share, exact: d.exact }]))
    }).go(0);
  })();

  // =====================================================================
  // #salesman · WEEK 14, EXAMPLE 4 (slides 29–31) with slides 8–16
  // Rates per week. Time in a town ~ Exp(q_i); next town with p_ij = q_ij / q_i.
  // =====================================================================
  (function salesman() {
    const root = document.getElementById('salesman');
    if (!root) return;
    const $ = sel => root.querySelector(sel);
    const TOWNS = ['A', 'B', 'C'];
    const RATE = [[0, 1 / 4, 1 / 4], [3 / 4, 0, 1 / 4], [1 / 2, 1 / 6, 0]];   // q_ij per week (slide 30)
    const Q_OUT = RATE.map(r => r.reduce((a, b) => a + b, 0));              // q_i = 1/2, 1, 2/3
    const JUMP = RATE.map((r, i) => r.map(v => v / Q_OUT[i]));               // p_ij = q_ij / q_i
    const PI = [6 / 11, 2 / 11, 3 / 11];                                     // slide 30
    const PHI = [3 / 7, 2 / 7, 2 / 7];                                       // trip shares: φ = φ·p
    const WEEKS = 5000, SHOW_WEEKS = 30, SEED = 1131;
    // One long trip history from A: (town, arrival time) for every stay.
    function simulate(weeks, seed) {
      const u = rng(seed), stays = [];
      let town = 0, t = 0;
      while (t < weeks) {
        const stay = expTime(Q_OUT[town], u());
        stays.push({ town, start: t, end: Math.min(weeks, t + stay) });
        t += stay;
        town = pick(JUMP[town], u());
      }
      return stays;
    }
    const LONG = simulate(WEEKS, SEED);
    const timeShare = TOWNS.map((_, i) => LONG.filter(s => s.town === i).reduce((a, s) => a + s.end - s.start, 0) / WEEKS);
    const arrivals = LONG.slice(1);   // the first stay starts at home, not after a trip
    const tripShare = TOWNS.map((_, i) => arrivals.filter(s => s.town === i).length / arrivals.length);
    // The race in A: one clock to B and one to C, each Exp(1/4); the first to ring wins.
    // Seed chosen so that the one race shown has readable times (2.39 and 4.36 weeks).
    const RACE = (() => { const u = rng(SEED + 23); return [expTime(RATE[0][1], u()), expTime(RATE[0][2], u())]; })();
    const RACE_MEAN = (() => { const u = rng(SEED + 8); let s = 0; for (let k = 0; k < 10000; k++) s += Math.min(expTime(1 / 4, u()), expTime(1 / 4, u())); return s / 10000; })();
    const townColor = (c, i) => [c.s2, c.s1, c.s5][i];
    const NODES = [{ id: '0', label: 'A · home', x: 0.5, y: 0 }, { id: '1', label: 'B', x: 0.08, y: 0.92 }, { id: '2', label: 'C', x: 0.92, y: 0.92 }];
    function diagram(labels, highlight) {
      const c = colors(), edges = [];
      RATE.forEach((r, i) => r.forEach((v, j) => { if (v > 0) edges.push({ from: String(i), to: String(j), label: labels(i, j) }); }));
      stateDiagram($('.js-plot'), root, {
        nodes: NODES, edges, padBottom: 2.4,
        look: (kind, item) => {
          if (kind === 'node') return { fill: c.surface, stroke: townColor(c, +item.id), width: 3 };
          return highlight && highlight(+item.from, +item.to) ? { stroke: c.s5, width: 3.5 } : {};
        }
      });
    }
    function drawRace(p) {
      const svg = $('.js-plot'), W = svg.clientWidth, H = svg.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.replaceChildren();
      const c = colors(), fs = px(root), left = fs * 6, right = W - fs * 2, tMax = Math.max(...RACE) * 1.1;
      const X = t => left + (t / tMax) * (right - left), now = p * Math.max(...RACE), win = RACE[0] < RACE[1] ? 0 : 1;
      svgEl(svg, 'text', { x: left, y: fs * 1.4, fill: c.ink2, 'font-size': Math.round(fs * 0.78) }, 'He just arrived in A. Two clocks start:');
      ['clock “go to B”, rate 1/4 per week', 'clock “go to C”, rate 1/4 per week'].forEach((label, k) => {
        const y = H * (0.32 + k * 0.26), t = Math.min(now, RACE[k]), rang = now >= RACE[k];
        svgEl(svg, 'text', { x: left, y: y - fs * 0.5, fill: c.ink, 'font-size': Math.round(fs * 0.8), 'font-weight': 650 }, label);
        svgEl(svg, 'rect', { x: left, y, width: Math.max(0, X(t) - left), height: fs * 1.2, rx: 4, fill: k === win && rang ? c.s5 : c.region });
        if (rang) svgEl(svg, 'text', { x: X(RACE[k]) + fs * 0.4, y: y + fs * 0.95, fill: c.ink, 'font-size': Math.round(fs * 0.78), 'font-weight': 700 }, num(RACE[k], 2) + ' weeks' + (k === win ? ' — rings first: he goes to ' + 'BC'[k] : ''));
      });
      const ay = H * 0.86;
      svgEl(svg, 'line', { x1: left, x2: right, y1: ay, y2: ay, stroke: c.axis });
      for (let t = 0; t <= tMax; t += 1) { svgEl(svg, 'line', { x1: X(t), x2: X(t), y1: ay - 4, y2: ay + 4, stroke: c.axis }); svgEl(svg, 'text', { x: X(t), y: ay + fs * 1.1, 'text-anchor': 'middle', fill: c.ink2, 'font-size': Math.round(fs * 0.68) }, String(t)); }
      svgEl(svg, 'text', { x: right, y: ay + fs * 2.1, 'text-anchor': 'end', fill: c.ink2, 'font-size': Math.round(fs * 0.7), 'font-style': 'italic' }, 'weeks in A');
    }
    function drawClock(p) {
      const svg = $('.js-plot'), W = svg.clientWidth, H = svg.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.replaceChildren();
      const c = colors(), fs = px(root), left = fs * 2.4, right = W - fs * 1.2;
      const X = t => left + (t / SHOW_WEEKS) * (right - left), now = p * SHOW_WEEKS;
      const rowY = i => H * 0.18 + i * H * 0.2, h = H * 0.13;
      TOWNS.forEach((name, i) => svgEl(svg, 'text', { x: left - fs * 0.5, y: rowY(i) + h * 0.65, 'text-anchor': 'end', fill: c.ink, 'font-size': Math.round(fs * 0.9), 'font-weight': 700 }, name));
      LONG.filter(s => s.start < now).forEach(s => {
        const end = Math.min(s.end, now);
        svgEl(svg, 'rect', { x: X(s.start), y: rowY(s.town), width: Math.max(1, X(end) - X(s.start)), height: h, rx: 3, fill: townColor(c, s.town) });
      });
      const ay = H * 0.8;
      svgEl(svg, 'line', { x1: left, x2: right, y1: ay, y2: ay, stroke: c.axis });
      for (let t = 0; t <= SHOW_WEEKS; t += 5) { svgEl(svg, 'line', { x1: X(t), x2: X(t), y1: ay - 4, y2: ay + 4, stroke: c.axis }); svgEl(svg, 'text', { x: X(t), y: ay + fs * 1.1, 'text-anchor': 'middle', fill: c.ink2, 'font-size': Math.round(fs * 0.68) }, String(t)); }
      svgEl(svg, 'text', { x: right, y: ay + fs * 2.1, 'text-anchor': 'end', fill: c.ink2, 'font-size': Math.round(fs * 0.7), 'font-style': 'italic' }, 'weeks');
      svgEl(svg, 'line', { x1: X(now), x2: X(now), y1: H * 0.12, y2: ay, stroke: c.ink2, 'stroke-dasharray': '4 4' });
    }
    function drawWhy(p) {
      const svg = $('.js-plot'), W = svg.clientWidth, H = svg.clientHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.replaceChildren();
      const c = colors(), fs = px(root), size = Math.round(fs * 0.9);
      const cols = ['town', 'share of trips φ', '× mean stay', '= weight', 'share of time π'];
      const colX = cols.map((_, k) => W * (0.1 + k * 0.2)), y0 = H * 0.2, rowH = Math.min(fs * 2.6, H * 0.17);
      cols.forEach((name, k) => svgEl(svg, 'text', { x: colX[k], y: y0, 'text-anchor': 'middle', fill: c.ink2, 'font-size': Math.round(fs * 0.75), 'font-weight': 650 }, name));
      const weight = PHI.map((f, i) => f / Q_OUT[i]), total = weight.reduce((a, b) => a + b, 0);
      TOWNS.forEach((name, i) => {
        const y = y0 + (i + 1) * rowH, shown = clamp01(p * 4 - i * 0.6);
        const stay = 1 / Q_OUT[i], cells = [name, frac(PHI[i]), frac(stay) + (stay === 1 ? ' week' : ' weeks'), frac(weight[i]), frac(PI[i])];
        cells.forEach((t, k) => { if (k === 0 || shown > k / 5) svgEl(svg, 'text', { x: colX[k], y, 'text-anchor': 'middle', fill: k === 4 ? townColor(c, i) : c.ink, 'font-size': size, 'font-weight': k === 0 || k === 4 ? 750 : 600 }, t); });
      });
      if (p >= 1) svgEl(svg, 'text', { x: W / 2, y: y0 + 4.4 * rowH, 'text-anchor': 'middle', fill: c.ink2, 'font-size': Math.round(fs * 0.8) }, 'weights add up to ' + frac(total) + '; divide each by ' + frac(total) + ' → 6/11, 2/11, 3/11');
    }
    const rateLabel = (i, j) => frac(RATE[i][j]);
    const STEPS = [
      { kind: 'story', phase: 0 },
      { kind: 'race', phase: 1, dur: 2600 },
      { kind: 'jump', phase: 1 },
      { kind: 'clock', phase: 2, dur: 4000 },
      { kind: 'counts', phase: 3, dur: 900 },
      { kind: 'why', phase: 3, dur: 2400 }
    ];
    function render(s, p) {
      const c = colors();
      const legend = TOWNS.map((t, i) => '<span class="anim-key mk-town' + i + '">' + t + '</span>').join('');
      if (s.kind === 'story') {
        diagram(rateLabel);
        return {
          title: 'Example 4: three towns, rates per week',
          text: 'He stays in A on average 2 weeks, in B 1 week, in C 1.5 weeks. The arrows carry the rates q_ij of slide 30: how many i → j trips per week he would make while he is in town i (slide 15). They are rates, not probabilities: out of C they add up to 2/3.',
          formula: '\\begin{aligned} q_A &= \\tfrac14 + \\tfrac14 = \\tfrac12, \\qquad q_B = \\tfrac34 + \\tfrac14 = 1, \\\\ q_C &= \\tfrac12 + \\tfrac16 = \\tfrac23 \\end{aligned}',
          fine: 'Rates are per week. Mean stay = 1 / q_i (slide 10). Out of B the rates happen to add up to 1, because q_B = 1; they are still rates.'
        };
      }
      if (s.kind === 'race') {
        drawRace(p);
        return {
          title: 'How long he stays: the first clock to ring',
          text: 'Each possible trip has its own exponential clock (slide 15). He leaves when the first clock rings, so the stay is the minimum of the clocks: exponential with the sum of the rates (slide 16).',
          formula: '\\begin{aligned} T_A &= \\min(T_{AB}, T_{AC}) \\sim \\text{Exp}(q_{AB} + q_{AC}) \\\\ &= \\text{Exp}(\\tfrac12), \\qquad E[T_A] = 2 \\text{ weeks} \\end{aligned}',
          stats: [['Clock to B', num(RACE[0], 2) + ' weeks'], ['Clock to C', num(RACE[1], 2) + ' weeks'], ['Average stay in A, 10 000 races', num(RACE_MEAN, 2) + ' weeks']]
        };
      }
      if (s.kind === 'jump') {
        diagram((i, j) => frac(JUMP[i][j]), (i, j) => i === 2 && j === 0);
        return {
          title: 'Where he goes: divide by the total rate',
          text: 'When he leaves, the chance of each town is its rate over the total (slides 11, 16): from A a coin flip, from B and C 3/4 back home. Look at C → A: the rate is 1/2 per week, the probability is 3/4. A rate is not a probability.',
          formula: 'p_{ij} = \\frac{q_{ij}}{q_i}: \\quad p_{CA} = \\frac{1/2}{2/3} = \\tfrac34, \\quad p_{CB} = \\frac{1/6}{2/3} = \\tfrac14',
          fine: 'The arrows now show where he goes next, p_ij. These are the coin flips of slide 29.'
        };
      }
      if (s.kind === 'clock') {
        drawClock(p);
        const now = p * SHOW_WEEKS, shown = LONG.filter(x => x.start < now);
        return {
          title: 'Run the clock: stays of random length',
          text: 'One history, drawn stay by stay: an exponential stay, then a jump with p_ij. Time does not move in equal steps any more; some stays last days, some months.',
          stats: [['Weeks', num(now, 1)], ['Trips so far', String(Math.max(0, shown.length - 1))]], note: legend
        };
      }
      if (s.kind === 'counts') {
        shareBars($('.js-plot'), root, { categories: TOWNS, fmt: v => num(v, 2), series: [{ name: 'share of trips into the town', values: tripShare.map(v => v * clamp01(p * 1.2)), color: c.s1 }, { name: 'share of time in the town', values: timeShare.map(v => v * clamp01(p * 1.2)), color: c.s5 }] });
        return {
          title: 'Two ways to count: trips or time',
          text: 'The same ' + WEEKS + '-week history counted twice. B and C get the same share of trips, but he spends more time in C, because a stay in C is longer. The share of time is the π of slide 30.',
          formula: '\\text{trips} \\approx (\\tfrac37, \\tfrac27, \\tfrac27), \\qquad \\text{time} \\approx \\pi = (\\tfrac{6}{11}, \\tfrac{2}{11}, \\tfrac{3}{11})',
          stats: [['Trips counted', String(arrivals.length)], ['Time in C', num(timeShare[2], 3) + ' (π = ' + num(PI[2], 3) + ')']]
        };
      }
      drawWhy(p);
      return {
        title: 'Time share: trip share × mean stay, rescaled',
        text: 'Weigh each town\'s share of trips φ by its mean stay and rescale to add up to 1: that gives π. (φ is the steady state of the "where next" chain with the p_ij of slide 11.) Slide 31 turns profit and trip costs into money per week in a town, so it weighs them by π.',
        formula: '\\pi_i = \\frac{\\varphi_i / q_i}{\\sum_k \\varphi_k / q_k}'
      };
    }
    scene({
      root, steps: STEPS, phases: ['Rates', 'Stay and next town', 'The clock', 'Time vs trips'], render,
      debug: () => ({ qOut: Q_OUT, jump: JUMP, pi: PI, phi: PHI, timeShare, tripShare, raceMean: RACE_MEAN, trips: arrivals.length })
    }).go(0);
  })();
})();
