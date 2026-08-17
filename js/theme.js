/* ═══════════════════════════════════════════════
   PillSync — Theme Manager
   Handles light/dark mode + localStorage + system pref
   ═══════════════════════════════════════════════ */

const ThemeManager = (() => {

  const STORAGE_KEY = 'ps_theme';
  const root = document.documentElement;

  function getPreferred() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateIcons(theme);
    updateMetaTheme(theme);
  }

  function toggle() {
    const current = root.getAttribute('data-theme') || 'light';
    apply(current === 'dark' ? 'light' : 'dark');
  }

  function current() {
    return root.getAttribute('data-theme') || 'light';
  }

  function updateIcons(theme) {
    document.querySelectorAll('.sun-icon').forEach(el => {
      el.style.display = theme === 'dark' ? 'none' : 'block';
    });
    document.querySelectorAll('.moon-icon').forEach(el => {
      el.style.display = theme === 'dark' ? 'block' : 'none';
    });
  }

  function updateMetaTheme(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#1B2226' : '#5B8A72');
  }

  function init() {
    /* Apply before first paint — no transition flash */
    root.style.transition = 'none';
    apply(getPreferred());

    /* Re-enable transitions on next frame */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.style.transition = '';
      });
    });

    /* Listen for system theme changes */
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        apply(e.matches ? 'dark' : 'light');
      }
    });

    /* Wire up all toggle buttons */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.theme-toggle');
      if (btn) toggle();
    });
  }

  return { init, apply, toggle, current };
})();

/* Init immediately so theme applies before render */
ThemeManager.init();
