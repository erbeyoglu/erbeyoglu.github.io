/* Theme switcher: light | dark | projector.
   Load this in <head> (synchronously) so the data-theme attribute is set
   before first paint. Priority: ?theme= URL param (not persisted, handy for
   bookmarking the projector view) > localStorage > OS preference.
   Dispatches 'themechange' so viz.js can redraw every canvas. */

(() => {
  const KEY = 'ie301-theme';
  const THEMES = ['light', 'dark', 'projector'];
  const LABELS = { light: 'Light', dark: 'Dark', projector: 'Projector' };

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
    host.innerHTML = '';
    THEMES.forEach(t => {
      const btn = document.createElement('button');
      btn.textContent = LABELS[t];
      btn.classList.toggle('active', t === theme);
      btn.addEventListener('click', () => {
        try { localStorage.setItem(KEY, t); } catch {}
        apply(t);
      });
      host.appendChild(btn);
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
