/* Shared frame for the guided activities (guided.html?activity=<id>).
   Each activity lives in assets/guided-<id>.js (+ .css) and registers
     window.GUIDED_CUSTOM[id] = (app, { activity, track }) => GUIDED_KIT.mount(app, { activity, track }, spec)
   guided.js loads that file on demand; assets/guided-data.js holds the activity's
   metadata and step ids/titles (the instructor analytics count the steps).

   The kit owns: the header with step tabs (✓ done alone, ◐ done with "Show me"),
   the two-column layout with the always-visible data card, the Back / Start over /
   Next bar, progress in localStorage (key ie301-guided-v2:<id>), the storage note,
   anonymous usage counts, and event delegation.

   spec = {
     fresh(): {...}                 activity state (the kit adds stage, status, helped)
     build(ctx): parts              called once with ctx (ctx.S is the live state, reset in
                                    place); returns the parts below, so renderers can close
                                    over ctx.S, ctx.finish, ctx.showMe, ctx.track
   }
   parts = {
     dataCard: html                 the aside's content
     steps: { <stepId>: ctx => html }            one renderer per step id
     actions: { <name>: (el, ctx) => void|false } clicked [data-do="<name>"];
                                    return false to skip the re-render.
                                    actions.node(el, ctx) receives clicks on [data-node].
     onInput(el, ctx), onChange(el, ctx)         optional; the page re-renders after
                                    onChange only when it returns true
     gate: { <stepId>: { ready: ctx => bool, step: <stepId>, text } }
                                    a step that needs an earlier one finished first
   }
   ctx = { S, activity, track, finish(id), showMe(id), done(), assembled(), render(),
           stepTitle(id), stepIndex(id), download(lines) }
   Usage events (all anonymous counts, never what a student types):
     check       a student checked an answer         → ctx.track('check')
     correct     a step finished without "Show me"    → sent by ctx.finish
     worked      "Show me" used                      → sent by ctx.showMe
     assembled   the final summary was reached        → ctx.assembled()
     twist       the twist was checked                → ctx.track('twist')
     download    "Download my model"                  → sent by ctx.download */
(() => {
  'use strict';

  // === TEXT HELPERS ===
  const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Accepts 5, -2, −2, 0.375, 0,375, 3/8, −1/2 and 37.5% (→ 0.375). Anything else is NaN.
  function parseNumber(text) {
    let s = String(text ?? '').replace(/[−–]/g, '-').replace(/\s+/g, '');
    let scale = 1;
    if (s.endsWith('%')) { s = s.slice(0, -1); scale = 100; }
    if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
    if (/^-?(\d+(\.\d*)?|\.\d+)$/.test(s)) return Number(s) / scale;
    const f = s.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    return f && Number(f[2]) !== 0 ? Number(f[1]) / Number(f[2]) / scale : NaN;
  }
  const close = (value, target, tolerance = 1e-9) => Number.isFinite(value) && Math.abs(value - target) <= tolerance;
  const fb = (kind, html) => {
    const tag = { ok: '✓ Right.', no: '✗ Not yet.', shown: 'Shown:' }[kind] || '';
    return '<div class="gk-fb ' + kind + '">' + (tag ? '<b class="gk-tag">' + tag + '</b>' : '') + html + '</div>';
  };
  const btn = (attrs, text, extra = '') => '<button class="gk-btn' + extra + '" ' + attrs + '>' + text + '</button>';

  // === MOUNT ===
  function mount(app, { activity, track }, spec) {
    const STORE_KEY = 'ie301-guided-v2:' + activity.id;
    const stepIds = activity.steps.map(s => s.id);
    const initial = () => Object.assign({ stage: 0, status: {}, helped: {} }, spec.fresh());
    const S = initial();
    let storageWorks = true, assembledCounted = false;
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) Object.assign(S, JSON.parse(raw)); } catch (e) { storageWorks = false; }
    S.stage = Math.max(0, Math.min(stepIds.length - 1, Number(S.stage) || 0));
    const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { storageWorks = false; } };

    const done = () => stepIds.filter(id => S.status[id]).length;
    const ctx = {
      S, activity, track,
      done,
      stepTitle: id => activity.steps[stepIds.indexOf(id)].title,
      stepIndex: id => stepIds.indexOf(id),
      // A step finished without "Show me" counts as correct for the instructor's counts.
      finish(id) {
        if (S.status[id]) return;
        S.status[id] = S.helped[id] ? 'helped' : 'done';
        if (!S.helped[id]) track('correct', done());
      },
      showMe(id) { S.helped[id] = true; track('worked', done()); },
      assembled() { if (!assembledCounted) { assembledCounted = true; track('assembled', done()); } },
      render: () => render(),
      download(lines) {
        track('download');
        const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
        const a = document.createElement('a'); a.href = url; a.download = 'ie301-' + activity.id + '-my-model.txt'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    };
    const parts = spec.build(ctx);
    const BUILT_IN = {
      go(el) { S.stage = Number(el.dataset.stage); app.scrollIntoView({ block: 'start' }); },
      reset() {
        if (!confirm('Clear this activity’s saved progress on this browser?')) return;
        Object.keys(S).forEach(k => delete S[k]); Object.assign(S, initial());
        assembledCounted = false; app.scrollIntoView({ block: 'start' });
      }
    };

    app.classList.add('gk-wide');
    app.innerHTML = '<div class="gk gk-' + activity.id + '"><section class="widget gk-head"><div class="learning-eyebrow">Week ' + Number(activity.week.slice(4)) + ' · ' + escapeHtml(activity.family) + '</div>' +
      '<h2>' + escapeHtml(activity.title) + '</h2><p class="learning-context">' + escapeHtml(activity.intro) + '</p>' +
      '<p id="storage-note" class="learning-muted"></p><nav class="gk-tabs" id="gk-tabs" aria-label="Steps"></nav></section>' +
      '<div class="gk-layout"><div class="gk-main" id="gk-stage" aria-live="polite"></div>' +
      '<aside class="gk-data" aria-label="Data">' + parts.dataCard + '</aside></div></div>';
    const tabsEl = app.querySelector('#gk-tabs'), stageEl = app.querySelector('#gk-stage'), noteEl = app.querySelector('#storage-note');

    function render() {
      tabsEl.innerHTML = activity.steps.map((s, i) => {
        const st = S.status[s.id];
        const mark = st === 'done' ? '<span class="gk-mark" title="done">✓</span>' : st === 'helped' ? '<span class="gk-mark" title="done with Show me">◐</span>' : '';
        return '<button class="gk-tab" data-do="go" data-stage="' + i + '"' + (i === S.stage ? ' aria-current="step"' : '') + '>' + escapeHtml(s.title) + mark + '</button>';
      }).join('');
      const id = stepIds[S.stage], gate = parts.gate && parts.gate[id];
      let body = gate && !gate.ready(ctx)
        ? '<h2>' + escapeHtml(activity.steps[S.stage].title) + '</h2>' + fb('no', gate.text) +
          '<div class="gk-row">' + btn('data-do="go" data-stage="' + stepIds.indexOf(gate.step) + '"', 'Go to ' + escapeHtml(ctx.stepTitle(gate.step)), ' primary') + '</div>'
        : parts.steps[id](ctx);
      const last = stepIds.length - 1;
      body += '<div class="gk-nav">' + (S.stage > 0 ? btn('data-do="go" data-stage="' + (S.stage - 1) + '"', '← Back') : '<span></span>') +
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
      if (node && parts.actions.node) { parts.actions.node(node, ctx); render(); return; }
      const el = e.target.closest('[data-do]');
      if (!el || el.disabled) return;
      const name = el.dataset.do, action = BUILT_IN[name] || parts.actions[name];
      if (!action) return;
      if (action(el, ctx) !== false) render();
    });
    app.addEventListener('keydown', e => {
      const t = e.target;
      if (e.key === 'Enter' && t.dataset && t.dataset.enter && parts.actions[t.dataset.enter]) { e.preventDefault(); parts.actions[t.dataset.enter](t, ctx); render(); return; }
      if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[role="button"]')) { e.preventDefault(); t.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    });
    app.addEventListener('input', e => { if (parts.onInput) { parts.onInput(e.target, ctx); save(); } });
    // WHY: re-render only when onChange asks (returns true). Leaving a text box fires
    // "change" just before a click; re-rendering then would swallow that click.
    app.addEventListener('change', e => { if (parts.onChange && parts.onChange(e.target, ctx) === true) render(); });
    render();
    return ctx;
  }

  window.GUIDED_KIT = { mount, fb, btn, escapeHtml, parseNumber, close };
  window.GUIDED_CUSTOM = window.GUIDED_CUSTOM || {};
})();
