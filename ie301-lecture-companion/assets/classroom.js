/* Classroom mode: live class leaderboards on top of Firebase RTDB's REST API.
   No SDK, no build step — plain fetch + polling, so the rest of the site
   stays dependency-free and fully offline-capable when this is unused.

   Flow:
   - Instructor (projector): "Start class session" → 4-char code + QR that
     links to this page with ?class=CODE; a top-10 leaderboard polls every
     few seconds.
   - Student (phone): opens the QR link, plays the widget, taps
     "Submit my result" — the current score from the widget's hook is
     POSTed under sessions/CODE/widgetId.
   Local personal bests are kept in localStorage regardless of any session. */

window.CLASSROOM = (() => {
  const DB = (window.CLASSROOM_DB || '').replace(/\/$/, '');
  const params = new URLSearchParams(location.search);
  const joinCode = (params.get('class') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const widgets = [];

  const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

  function pageKey(widgetId) {
    return location.pathname.split('/').pop().replace('.html', '') + ':' + widgetId;
  }

  function sessionUrl(code, widgetId) {
    // Students must always land on the PUBLIC site, even when this page runs
    // from a local file inside the instructor deck. `w` pins the phone to the
    // one activity being played, so students do not have to scroll past the
    // week's other widgets.
    const file = location.pathname.split('/').pop();
    const base = window.CLASSROOM_PUBLIC_BASE || (location.origin + location.pathname.replace(/[^/]*$/, ''));
    return base.replace(/\/?$/, '/') + file + '?class=' + code + '&w=' + encodeURIComponent(widgetId);
  }

  function betterOf(dir, a, b) {
    if (a === null || a === undefined || isNaN(a)) return b;
    if (b === null || b === undefined || isNaN(b)) return a;
    return dir === 'max' ? Math.max(a, b) : Math.min(a, b);
  }

  async function dbGet(path) {
    const r = await fetch(DB + path + '.json');
    if (!r.ok) throw new Error('db read failed');
    return r.json();
  }

  async function dbPost(path, value) {
    const r = await fetch(DB + path + '.json', { method: 'POST', body: JSON.stringify(value) });
    if (!r.ok) throw new Error('db write failed');
    return r.json();
  }

  function renderBoard(host, data, w) {
    const rows = Object.values(data || {}).filter(q => typeof q.v === 'number' && isFinite(q.v));
    rows.sort((a, b) => w.dir === 'max' ? b.v - a.v : a.v - b.v);
    if (!rows.length) {
      host.innerHTML = '<span style="color:var(--muted)">waiting for the first submission…</span>';
      return;
    }
    host.innerHTML = '<table class="attempts lb"><thead><tr><th>#</th><th>name</th><th>' + w.label + '</th></tr></thead><tbody>' +
      rows.slice(0, 10).map((q, i) =>
        '<tr' + (i === 0 ? ' class="best"' : '') + '><td>' + (i + 1) + (i === 0 ? ' 🏆' : '') + '</td><td>' +
        String(q.n || 'anon').slice(0, 18).replace(/[<>&]/g, '') + '</td><td><b>' + q.v.toFixed(w.digits) + '</b></td></tr>').join('') +
      '</tbody></table><span style="color:var(--muted);font-size:0.85rem">' + rows.length + ' submission(s)</span>';
  }

  function instructorUI(box, w) {
    const btn = document.createElement('button');
    btn.textContent = 'Start class session 📱';
    box.appendChild(btn);
    let timer = null;
    btn.addEventListener('click', () => {
      if (timer) { // acting as "end session"
        clearInterval(timer);
        timer = null;
        btn.textContent = 'Start class session 📱';
        box.querySelectorAll('.class-live').forEach(x => x.remove());
        return;
      }
      const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      const live = document.createElement('div');
      live.className = 'class-live';
      const url = sessionUrl(code, w.id);
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      live.innerHTML =
        '<p style="margin:10px 0 4px"><b>Session ' + code + '</b> — students scan or open:<br>' +
        '<span style="font-size:0.85rem;color:var(--ink-2);word-break:break-all">' + url + '</span></p>' +
        '<div class="qr">' + qr.createSvgTag({ cellSize: 4, margin: 2 }) + '</div>' +
        '<div class="lb">waiting for the first submission…</div>';
      box.appendChild(live);
      btn.textContent = 'End session';
      const lb = live.querySelector('.lb');
      const poll = async () => {
        try {
          renderBoard(lb, await dbGet('/sessions/' + code + '/' + w.id), w);
        } catch {
          lb.innerHTML = '<span style="color:var(--critical)">cannot reach the classroom database</span>';
        }
      };
      poll();
      timer = setInterval(poll, 3000);
    });
  }

  // A joined student gets a phone-shaped experience instead of the desktop
  // widget chrome: a context bar at the top and a thumb-reachable submit dock
  // pinned to the bottom of the screen.
  function classBar(w) {
    if (document.querySelector('.class-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'class-bar';
    const title = (document.getElementById(w.id)?.querySelector('h2')?.childNodes[0]?.textContent || '').trim();
    bar.innerHTML = '<span class="code">CLASS ' + joinCode + '</span>' +
      (title ? '<span class="what">' + title.replace(/[<>&]/g, '') + '</span>' : '');
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // The phone is a competition device during class: no answer keys on it.
  // Reveal buttons are marked by their label (each classroom activity has
  // exactly one, always starting with "Reveal"); spoilers are hidden by CSS.
  function stripAnswerKeys(scope) {
    scope.querySelectorAll('button').forEach(b => {
      if (/^\s*(reveal|show the answer|show answer|solution)/i.test(b.textContent || '')) {
        b.classList.add('answer-key');
      }
    });
  }

  function studentUI(box, w) {
    const name0 = (lsGet('classroom-name') || '').replace(/"/g, '');
    const bestPrev = parseFloat(lsGet('best:' + pageKey(w.id)));

    // The dock replaces the in-widget panel: keep the widget area clean.
    box.remove();
    classBar(w);

    const dock = document.createElement('div');
    dock.className = 'class-dock';
    dock.innerHTML =
      '<div class="row">' +
      '<input type="text" id="cl-name-' + w.id + '" placeholder="your name" maxlength="18" ' +
      'autocomplete="name" enterkeyhint="send" value="' + name0 + '">' +
      '<button class="primary send" id="cl-sub-' + w.id + '">Submit</button>' +
      '</div>' +
      '<div class="meta">' +
      '<span>your best: <b id="cl-best-' + w.id + '">' +
      (isNaN(bestPrev) ? '—' : bestPrev.toFixed(w.digits)) + '</b></span>' +
      '<span class="fb" id="cl-fb-' + w.id + '">play, then submit your ' + w.label + '</span>' +
      '</div>';
    document.body.appendChild(dock);

    const fb = dock.querySelector('#cl-fb-' + w.id);
    const nameEl = dock.querySelector('#cl-name-' + w.id);
    const btn = dock.querySelector('#cl-sub-' + w.id);

    const say = (msg, kind) => {
      fb.textContent = msg;
      fb.className = 'fb' + (kind ? ' ' + kind : '');
    };

    const submit = async () => {
      const name = nameEl.value.trim() || 'anon';
      lsSet('classroom-name', name);
      const v = w.get();
      if (!Number.isFinite(v)) {
        say('no valid attempt yet — play the activity first', 'err');
        return;
      }
      btn.disabled = true;
      say('sending…');
      try {
        await dbPost('/sessions/' + joinCode + '/' + w.id, { n: name, v: +v.toFixed(w.digits) });
        say('sent ' + v.toFixed(w.digits) + ' ✓', 'ok');
        btn.textContent = 'Submit again';
        updateBest(w, v);
      } catch {
        say('could not send — check your connection', 'err');
      } finally {
        btn.disabled = false;
      }
    };

    btn.addEventListener('click', submit);
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  }

  function updateBest(w, v) {
    const key = 'best:' + pageKey(w.id);
    const prev = parseFloat(lsGet(key));
    const best = betterOf(w.dir, isNaN(prev) ? null : prev, v);
    lsSet(key, String(best));
    const elb = document.getElementById('cl-best-' + w.id);
    if (elb) elb.textContent = best.toFixed(w.digits);
  }

  // The instructor "Start class session" UI (session code + QR) must appear
  // ONLY for the instructor, never on the student-facing public page. The
  // instructor reaches a widget through the local deck (?embed=<id>) or opens
  // a public page with ?host=1; students either scan the QR (?class=CODE →
  // submit UI) or just browse the plain page (no classroom UI at all).
  const isHost = params.get('embed') !== null || params.get('host') !== null;

  // ?w=<id> pins the student's phone to the single activity being played, so
  // the other widgets on the week page must not build a submit dock of their
  // own (theme.js hides them visually; this keeps their JS out of the way).
  const focusId = params.get('w');

  function register(sectionId, w) {
    // w: {id, label, dir: 'min'|'max', digits, get}
    w.id = w.id || sectionId;
    w.digits = w.digits === undefined ? 2 : w.digits;
    widgets.push(w);
    const section = document.getElementById(sectionId);
    if (!section) return;
    const enabled = DB !== '';
    // Show a classroom panel only to a joined student or the instructor host.
    // A plain public visitor (no join code, not the host) sees nothing.
    if (!joinCode && !isHost) return;
    if (!enabled && !joinCode) return; // classroom mode fully off: no UI at all
    if (joinCode && focusId && focusId !== w.id) return; // not the pinned activity

    const box = document.createElement('div');
    box.className = 'classroom';
    const bestPrev = parseFloat(lsGet('best:' + pageKey(w.id)));
    box.innerHTML = '<span class="readout">your device best: <b id="cl-best-' + w.id + '">' +
      (isNaN(bestPrev) ? '—' : bestPrev.toFixed(w.digits)) + '</b></span> ';
    // WHY direct children only: a widget may keep a .note inside a nested
    // panel (week09 #offers); insertBefore throws for such a node and the
    // exception would abort every later register() call on the page.
    const note = section.querySelector(':scope > .note');
    section.insertBefore(box, note || null);

    if (!enabled) {
      box.innerHTML += '<span style="color:var(--muted)">classroom mode is not configured on this site</span>';
      return;
    }
    if (joinCode) {
      stripAnswerKeys(document);
      studentUI(box, w);
    } else {
      instructorUI(box, w);
    }
  }

  // record local bests even outside sessions: expose for widgets that want it
  return { register, updateBest };
})();
