/* ═════════════════════════════
   PillSync — Hash Router
   ═════════════════════════════ */

const Router = (() => {

  /* Pages that don't require auth and hide the nav chrome */
  const AUTH_PAGES = new Set(['landing', 'login', 'signup']);

  /* Page cleanup functions (called before leaving a page) */
  const cleanupFns = {
    dashboard: () => typeof cleanupDashboard === 'function' && cleanupDashboard(),
    schedule:  () => typeof cleanupSchedule  === 'function' && cleanupSchedule(),
    settings:  () => typeof cleanupSettings  === 'function' && cleanupSettings(),
  };

  /* Page render + init mapping */
  const pages = {
    landing:     { render: renderLanding,     init: initLanding,     title: 'Welcome' },
    login:       { render: () => renderAuth('login'),   init: () => initAuth('login'),   title: 'Log In' },
    signup:      { render: () => renderAuth('signup'),  init: () => initAuth('signup'),  title: 'Sign Up' },
    dashboard:   { render: renderDashboard,   init: initDashboard,   title: 'Dashboard' },
    medications: { render: renderMedications, init: initMedications, title: 'Medications' },
    schedule:    { render: renderSchedule,    init: initSchedule,    title: 'Schedule' },
    reminders:   { render: renderReminders,   init: initReminders,   title: 'Reminders' },
    caregiver:   { render: renderCaregiver,   init: initCaregiver,   title: 'Caregiver View' },
    settings:    { render: renderSettings,    init: initSettings,    title: 'Settings' },
  };

  let _currentPage = null;

  function navigate(hash) {
    const page = (hash || 'landing').replace('#', '');
    const pageKey = page || 'landing';
    const def = pages[pageKey];

    if (!def) {
      window.location.hash = '#landing';
      return;
    }

    /* Auth guard: redirect to login if trying to access app pages without login */
    if (!AUTH_PAGES.has(pageKey) && !AppState.get('isLoggedIn')) {
      window.location.hash = '#login';
      return;
    }

    /* Redirect logged-in users away from auth pages */
    if (AUTH_PAGES.has(pageKey) && AppState.get('isLoggedIn') && pageKey !== 'landing') {
      window.location.hash = '#dashboard';
      return;
    }

    /* Run cleanup on previous page */
    if (_currentPage && cleanupFns[_currentPage]) {
      cleanupFns[_currentPage]();
    }

    _currentPage = pageKey;

    /* Toggle nav chrome visibility */
    const appShell = document.getElementById('app');
    if (AUTH_PAGES.has(pageKey)) {
      appShell.classList.add('is-auth-page');
    } else {
      appShell.classList.remove('is-auth-page');
    }

    /* Update active nav items */
    _updateNav(pageKey);

    /* Render page */
    const content = document.getElementById('app-content');
    content.innerHTML = def.render();
    document.title = `${def.title} — PillSync`;

    /* Scroll to top */
    content.scrollTo?.(0, 0);
    window.scrollTo(0, 0);

    /* Initialize page interactions */
    requestAnimationFrame(() => {
      def.init();
      updateBadges();
      /* Re-apply theme icons after render */
      ThemeManager.apply(ThemeManager.current());
    });
  }

  function _updateNav(pageKey) {
    /* Sidebar nav items */
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
      const isActive = link.dataset.page === pageKey;
      link.classList.toggle('is-active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    /* Bottom nav items */
    document.querySelectorAll('.bnav-item[data-page]').forEach(link => {
      const isActive = link.dataset.page === pageKey;
      link.classList.toggle('is-active', isActive);
      link.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function init() {
    /* Handle hash changes */
    window.addEventListener('hashchange', () => {
      navigate(window.location.hash.slice(1));
    });

    /* Handle initial load */
    const initial = window.location.hash.slice(1) || 'landing';
    navigate(initial);
  }

  return { init, navigate };
})();
