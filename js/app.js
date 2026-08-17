/* ═════════════════════════════
   PillSync — App Bootstrap
   ═════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. Initialize state from mock data ── */
  AppState.init();

  /* ── 2. Theme is already applied by theme.js (runs immediately) ── */

  /* ── 3. Update badge counts ── */
  updateBadges();

  /* ── 4. Subscribe to state changes that affect global UI ── */
  AppState.subscribe('unreadReminders', () => updateBadges());
  AppState.subscribe('isLoggedIn', (isLoggedIn) => {
    _updateUserDisplay(isLoggedIn);
  });
  AppState.subscribe('currentUser', () => {
    _updateUserDisplay(AppState.get('isLoggedIn'));
  });

  function _updateUserDisplay(isLoggedIn) {
    const sfAvatar = document.getElementById('sf-avatar');
    const sfName   = document.querySelector('.sf-name');
    const sfRole   = document.querySelector('.sf-role');
    if (!sfAvatar) return;

    const role = AppState.get('currentUser');
    const user = APP_DATA.users[role] || APP_DATA.users.patient;

    sfAvatar.textContent = user.initials;
    if (sfName) sfName.textContent = user.name;
    if (sfRole) sfRole.textContent = role === 'caregiver' ? 'Caregiver' : 'Patient';
  }

  /* ── 5. Wire up nav link clicks (prevent default, use router) ── */
  document.querySelectorAll('.nav-item[data-page], .bnav-item[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page) window.location.hash = `#${page}`;
    });
  });

  /* ── 6. Start the router ── */
  Router.init();

  /* ── 7. Handle viewport resize (update FAB visibility on meds page) ── */
  let _resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      if (typeof _checkHeaderBtn === 'function') _checkHeaderBtn();
    }, 150);
  });

})();
