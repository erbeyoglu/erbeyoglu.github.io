/* Theme switcher: light | dark | projector.
   Load this in <head> (synchronously) so the data-theme attribute is set
   before first paint. Priority: ?theme= URL param (not persisted, handy for
   bookmarking the projector view) > localStorage > OS preference.
   Dispatches 'themechange' so viz.js can redraw every canvas. */

(() => {
  const KEY = 'ie301-theme';
  const THEMES = ['light', 'dark', 'projector'];
  const LABELS = { light: 'Light', dark: 'Dark', projector: 'Projector' };
  const ICONS = {
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    dark: '<path d="M20.5 13.2A9 9 0 0 1 10.8 3.5 9 9 0 1 0 20.5 13.2Z"/>',
    projector: '<path d="M3 3h18v12H3zM12 15v6m-5 0 5-4 5 4"/>'
  };

  const urlTheme = new URLSearchParams(location.search).get('theme');
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch {}
  let theme =
    THEMES.includes(urlTheme) ? urlTheme :
    THEMES.includes(stored) ? stored :
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function apply(t) {
    theme = t;
    document.documentElement.dataset.theme = t;
    window.dispatchEvent(new Event('themechange'));
    render();
  }

  function render() {
    const host = document.getElementById('theme-switch');
    if (!host) return;
    if (!host.children.length) {
      const toggle = document.createElement('button');
      toggle.type = 'button'; toggle.className = 'theme-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', 'theme-options');
      const options = document.createElement('div');
      options.id = 'theme-options'; options.className = 'theme-options';
      options.setAttribute('role', 'group'); options.setAttribute('aria-label', 'Color theme');
      const close = () => {
        host.removeAttribute('data-open'); toggle.setAttribute('aria-expanded', 'false');
      };
      toggle.addEventListener('click', () => {
        const open = !host.hasAttribute('data-open');
        host.toggleAttribute('data-open', open); toggle.setAttribute('aria-expanded', String(open));
      });
      THEMES.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.dataset.theme = t; btn.textContent = LABELS[t];
        btn.addEventListener('click', () => {
          try { localStorage.setItem(KEY, t); } catch {}
          apply(t); close();
          if (getComputedStyle(toggle).display !== 'none') toggle.focus();
        });
        options.appendChild(btn);
      });
      host.append(toggle, options);
      document.addEventListener('click', e => { if (!host.contains(e.target)) close(); });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && host.hasAttribute('data-open')) { close(); toggle.focus(); }
      });
      host.addEventListener('focusout', e => { if (!host.contains(e.relatedTarget)) close(); });
    }
    const toggle = host.querySelector('.theme-toggle');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[theme] + '</svg>';
    toggle.setAttribute('aria-label', 'Color theme: ' + LABELS[theme]);
    toggle.title = 'Color theme: ' + LABELS[theme];
    host.querySelectorAll('[data-theme]').forEach(btn => {
      const active = btn.dataset.theme === theme;
      btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', String(active));
    });
  }

  document.documentElement.dataset.theme = theme; // before first paint
  document.addEventListener('DOMContentLoaded', render);

  // Embed mode: ?embed=<sectionId> strips the page down to a single widget.
  // Used by the (local, unpublished) instructor deck to interleave activities
  // between slides.
  const viewId = new URLSearchParams(location.search).get('view');
  const embedId = new URLSearchParams(location.search).get('embed') || viewId;
  if (embedId) {
    document.documentElement.classList.add('embed-mode');
    document.addEventListener('DOMContentLoaded', () => {
      const target = document.getElementById(embedId);
      if (target) target.classList.add('embed-target');
      else if (viewId) document.documentElement.classList.remove('embed-mode');
      if (viewId && target) {
        const back = document.createElement('a');
        back.href = location.pathname.split('/').pop() + '#' + encodeURIComponent(viewId);
        back.textContent = '← Week activities'; back.className = 'activity-view-back';
        target.prepend(back);
      }
    });
  }

  // Class mode: a student who scanned the QR arrives with ?class=CODE&w=<id>.
  // The phone shows ONLY the activity being played in class — no other
  // widgets, no answer keys (classroom.js strips those). Set before first
  // paint so the full page never flashes.
  const q = new URLSearchParams(location.search);
  const classCode = q.get('class');
  const classWidget = q.get('w');
  if (classCode) {
    document.documentElement.classList.add('class-mode');
    if (classWidget) {
      document.documentElement.classList.add('class-focus');
      document.addEventListener('DOMContentLoaded', () => {
        const target = document.getElementById(classWidget);
        if (target) target.classList.add('class-target');
        // Unknown widget id (stale QR): fall back to showing the whole page.
        else document.documentElement.classList.remove('class-focus');
      });
    }
  }
})();
