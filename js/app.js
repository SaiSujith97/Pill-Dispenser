/* ═════════════════════════════
   PillSync — App Bootstrap
   ═════════════════════════════ */

(function () {
  'use strict';

  function bootstrap() {
    /* ── 1. Initialize state (device / reminders / demo-data pre-load) ── */
    AppState.init();

    /* ── 2. Theme is already applied by theme.js (runs immediately) ── */

    /* ── 3. Update badge counts ── */
    updateBadges();

    /* ── 4. Subscribe to state changes that affect global UI ── */
    AppState.subscribe('unreadReminders', () => updateBadges());
    AppState.subscribe('isLoggedIn', (isLoggedIn) => {
      _updateUserDisplay(isLoggedIn);
    });
    AppState.subscribe('userProfile', () => {
      _updateUserDisplay(AppState.get('isLoggedIn'));
    });
    AppState.subscribe('currentUser', () => {
      _updateUserDisplay(AppState.get('isLoggedIn'));
    });

    function _updateUserDisplay(isLoggedIn) {
      /* Delegate to AppState internal helper via a state update to trigger it */
      const sfAvatar = document.getElementById('sf-avatar');
      const sfName   = document.querySelector('.sf-name');
      const sfRole   = document.querySelector('.sf-role');
      if (!sfAvatar) return;

      const profile = AppState.get('userProfile');
      const isDemoMode = AppState.get('isDemoMode');

      if (isLoggedIn && profile) {
        const initials = (profile.name || 'U')
          .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        if (profile.photoURL) {
          sfAvatar.innerHTML = `<img src="${profile.photoURL}" alt="${profile.name}"
            style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
          sfAvatar.style.background = 'transparent';
        } else {
          sfAvatar.innerHTML = '';
          sfAvatar.textContent = initials;
          sfAvatar.style.background = '';
        }
        if (sfName) sfName.textContent = profile.name || 'User';
        if (sfRole) sfRole.textContent = profile.role === 'caregiver' ? 'Caregiver' : 'Patient';
      } else if (isLoggedIn && isDemoMode) {
        const user = APP_DATA.users.patient;
        sfAvatar.innerHTML = '';
        sfAvatar.textContent = user.initials;
        if (sfName) sfName.textContent = user.name;
        if (sfRole) sfRole.textContent = 'Patient';
      } else {
        sfAvatar.innerHTML = '';
        sfAvatar.textContent = '?';
        if (sfName) sfName.textContent = '';
        if (sfRole) sfRole.textContent = '';
      }
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
  }

  /* Wait for Firebase module to set up onAuthStateChanged before booting the
     router — this prevents a flash-of-wrong-page on reload when auth state
     is already known (e.g. user is still signed in). */
  window.addEventListener('FirebaseReady', bootstrap, { once: true });

  /* Fallback: if Firebase module fails to load for any reason, still boot. */
  setTimeout(() => {
    if (!AppState.get('isLoggedIn') && !AppState.get('firebaseUser')) {
      bootstrap();
    }
  }, 3000);

})();
