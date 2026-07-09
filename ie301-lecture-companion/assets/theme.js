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
  const stored = localStorage.getItem(KEY);
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
        localStorage.setItem(KEY, t);
        apply(t);
      });
      host.appendChild(btn);
    });
  }

  document.documentElement.dataset.theme = theme; // before first paint
  document.addEventListener('DOMContentLoaded', render);
})();
