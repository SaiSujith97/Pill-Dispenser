/* ═══════════════════════════════════════════════
   PillSync — App State (simple pub/sub store)
   ═══════════════════════════════════════════════ */

const AppState = (() => {
  const _state = {
    /* ── Auth ── */
    isLoggedIn:   false,
    firebaseUser: null,   /* raw Firebase Auth user object */
    userProfile:  null,   /* Firestore users/{uid} document */
    isDemoMode:   false,  /* true when "Skip to demo" is used */

    /* ── App role (used by UI, derived from userProfile.role) ── */
    currentUser: 'patient',       /* 'patient' | 'caregiver' */

    /* ── Page ── */
    currentPage: 'landing',

    /* ── Data (populated by Firestore listeners or mock in demo mode) ── */
    medicines:     [],
    todaySchedule: [],
    history:       [],
    reminders:     [],
    device:        null,
    unreadReminders: 0,

    /* ── UI prefs ── */
    scheduleView: 'list',
    medsView:     'grid',
  };

  const _listeners = {};

  function get(key) {
    return key ? _state[key] : { ..._state };
  }

  function set(key, value) {
    const old = _state[key];
    _state[key] = value;
    _notify(key, value, old);
  }

  function update(updates) {
    Object.entries(updates).forEach(([k, v]) => {
      _state[k] = v;
    });
    _notify('*', _state);
  }

  function subscribe(key, fn) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(fn);
    return () => {
      _listeners[key] = _listeners[key].filter(f => f !== fn);
    };
  }

  function _notify(key, value, old) {
    (_listeners[key] || []).forEach(fn => fn(value, old));
    (_listeners['*'] || []).forEach(fn => fn(_state));
  }

  /* ─── Bootstrap from mock data (demo mode only) ─── */
  function init() {
    /* Keep device info from mock even in real mode (until IoT layer added) */
    const data = APP_DATA;
    _state.device   = { ...data.device };
    _state.reminders = [...data.reminders];
    _state.unreadReminders = data.reminders.filter(r => !r.acknowledged).length;

    /* In demo mode, also load mock medicines + schedule */
    if (_state.isDemoMode) {
      _state.medicines     = [...data.medicines];
      _state.todaySchedule = [...data.todaySchedule];
      _state.history       = [...data.history];
    }
  }

  /* ═══════════════════════════════════════════════
     FIREBASE AUTH INTEGRATION
     Called from firebase.js onAuthStateChanged
     ═══════════════════════════════════════════════ */

  /**
   * Called whenever Firebase Auth state changes.
   * user = Firebase Auth user object, or null if signed out.
   */
  async function onFirebaseAuthChange(user) {
    if (user) {
      /* ── Signed in ── */
      _state.firebaseUser = user;
      _state.isDemoMode   = false;

      try {
        /* Ensure Firestore profile exists / load it */
        const profile = await FirebaseDB.ensureUserProfile(user, 'patient');
        _state.userProfile  = profile;
        _state.currentUser  = profile.role || 'patient';
        _state.isLoggedIn   = true;

        _notify('firebaseUser',  user);
        _notify('userProfile',   profile);
        _notify('isLoggedIn',    true);
        _notify('currentUser',   _state.currentUser);

        /* Update sidebar avatar with real name */
        _updateUserDisplay(true);

        /* Navigate to dashboard (Router is already listening to state) */
        if (window.location.hash === '' ||
            window.location.hash === '#' ||
            window.location.hash === '#landing' ||
            window.location.hash === '#login' ||
            window.location.hash === '#signup') {
          window.location.hash = '#dashboard';
        }
      } catch (err) {
        console.error('PillSync: failed to load profile', err);
        Toast.show('Trouble loading your profile. Please try again.', 'error');
      }

    } else {
      /* ── Signed out ── */
      _state.firebaseUser  = null;
      _state.userProfile   = null;
      _state.isLoggedIn    = false;
      _state.isDemoMode    = false;
      _state.currentUser   = 'patient';
      _state.medicines     = [];
      _state.todaySchedule = [];
      _state.history       = [];

      _notify('isLoggedIn',   false);
      _notify('firebaseUser', null);
      _notify('userProfile',  null);

      /* Cancel any active Firestore listeners */
      _cancelListeners();

      /* Go to landing */
      window.location.hash = '#landing';
    }
  }

  /* Active Firestore unsubscribe functions */
  const _activeListeners = {};
  function registerListener(key, unsub) {
    if (_activeListeners[key]) _activeListeners[key]();
    _activeListeners[key] = unsub;
  }
  function _cancelListeners() {
    Object.values(_activeListeners).forEach(fn => { try { fn(); } catch (_) {} });
    Object.keys(_activeListeners).forEach(k => delete _activeListeners[k]);
  }
  function unregisterListener(key) {
    if (_activeListeners[key]) {
      _activeListeners[key]();
      delete _activeListeners[key];
    }
  }

  function setUserProfile(profile) {
    _state.userProfile = profile;
    _state.currentUser = profile.role || 'patient';
    _notify('userProfile', profile);
    _notify('currentUser', _state.currentUser);
    _updateUserDisplay(_state.isLoggedIn);
  }

  function getCurrentUid() {
    return _state.firebaseUser ? _state.firebaseUser.uid : null;
  }

  async function firebaseSignOut() {
    try {
      await FirebaseAuth.signOut();
      /* onAuthStateChanged will handle state cleanup + navigation */
    } catch (err) {
      console.error('Sign-out error:', err);
      Toast.show('Could not sign out. Please try again.', 'error');
    }
  }

  function _updateUserDisplay(isLoggedIn) {
    const sfAvatar = document.getElementById('sf-avatar');
    const sfName   = document.querySelector('.sf-name');
    const sfRole   = document.querySelector('.sf-role');
    if (!sfAvatar) return;

    if (isLoggedIn && _state.userProfile) {
      const profile = _state.userProfile;
      const initials = (profile.name || 'U')
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      /* Show photo if available */
      if (profile.photoURL) {
        sfAvatar.innerHTML = `<img src="${profile.photoURL}" alt="${profile.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        sfAvatar.style.background = 'transparent';
      } else {
        sfAvatar.textContent = initials;
        sfAvatar.style.background = '';
      }
      if (sfName) sfName.textContent = profile.name || 'User';
      if (sfRole) sfRole.textContent = profile.role === 'caregiver' ? 'Caregiver' : 'Patient';

    } else if (isLoggedIn && _state.isDemoMode) {
      const user = APP_DATA.users.patient;
      sfAvatar.textContent = user.initials;
      if (sfName) sfName.textContent = user.name;
      if (sfRole) sfRole.textContent = 'Patient';
    } else {
      sfAvatar.textContent = '?';
      if (sfName) sfName.textContent = '';
      if (sfRole) sfRole.textContent = '';
    }
  }

  /* ═══════════════════════════════════════════════
     DEMO MODE LOGIN (landing "Skip to demo")
     ═══════════════════════════════════════════════ */
  function loginDemo(role = 'patient') {
    _state.isLoggedIn  = true;
    _state.isDemoMode  = true;
    _state.currentUser = role;
    _state.medicines     = [...APP_DATA.medicines];
    _state.todaySchedule = [...APP_DATA.todaySchedule];
    _state.history       = [...APP_DATA.history];
    _notify('isLoggedIn', true);
    _notify('currentUser', role);
    _updateUserDisplay(true);
  }

  /* Legacy — kept so landing page's "Skip" still works */
  function login(role = 'patient') { loginDemo(role); }

  function logout() {
    if (_state.isDemoMode) {
      _state.isLoggedIn  = false;
      _state.isDemoMode  = false;
      _state.currentUser = 'patient';
      _notify('isLoggedIn', false);
      window.location.hash = '#landing';
    } else {
      firebaseSignOut();
    }
  }

  /* ═══════════════════════════════════════════════
     DOMAIN ACTIONS (work in both demo & real mode)
     ═══════════════════════════════════════════════ */

  function markDoseTaken(doseId) {
    if (!_state.isDemoMode) return; /* real mode: call FirebaseDB.markDoseTaken directly */
    const idx = _state.todaySchedule.findIndex(d => d.id === doseId);
    if (idx === -1) return false;
    const dose = { ..._state.todaySchedule[idx] };
    dose.status = 'taken';
    const now = new Date();
    dose.takenAt = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    _state.todaySchedule = [
      ..._state.todaySchedule.slice(0, idx),
      dose,
      ..._state.todaySchedule.slice(idx + 1),
    ];
    _notify('todaySchedule', _state.todaySchedule);
    return true;
  }

  function skipDose(doseId) {
    if (!_state.isDemoMode) return;
    const idx = _state.todaySchedule.findIndex(d => d.id === doseId);
    if (idx === -1) return false;
    const dose = { ..._state.todaySchedule[idx], status: 'skipped' };
    _state.todaySchedule = [
      ..._state.todaySchedule.slice(0, idx),
      dose,
      ..._state.todaySchedule.slice(idx + 1),
    ];
    _notify('todaySchedule', _state.todaySchedule);
    return true;
  }

  function acknowledgeReminder(remId) {
    const idx = _state.reminders.findIndex(r => r.id === remId);
    if (idx === -1) return;
    _state.reminders[idx] = { ..._state.reminders[idx], acknowledged: true };
    _state.unreadReminders = _state.reminders.filter(r => !r.acknowledged).length;
    _notify('reminders', _state.reminders);
    _notify('unreadReminders', _state.unreadReminders);
  }

  /* In demo mode only — real mode uses Firestore directly */
  function addMedicine(med) {
    const newMed = { ...med, id: `med-${Date.now()}`, active: true, startDate: new Date().toISOString().split('T')[0] };
    _state.medicines = [..._state.medicines, newMed];
    _notify('medicines', _state.medicines);
    return newMed;
  }

  function updateMedicine(id, updates) {
    const idx = _state.medicines.findIndex(m => m.id === id);
    if (idx === -1) return false;
    _state.medicines = [
      ..._state.medicines.slice(0, idx),
      { ..._state.medicines[idx], ...updates },
      ..._state.medicines.slice(idx + 1),
    ];
    _notify('medicines', _state.medicines);
    return true;
  }

  function deleteMedicine(id) {
    _state.medicines = _state.medicines.filter(m => m.id !== id);
    _notify('medicines', _state.medicines);
  }

  function getAdherencePct() {
    const history = _state.history;
    if (!history || history.length === 0) return 0;
    const taken = history.filter(d => d.status === 'taken').length;
    return Math.round((taken / history.length) * 100);
  }

  return {
    /* Core store */
    get, set, update, subscribe, init,
    /* Firebase auth */
    onFirebaseAuthChange,
    getCurrentUid,
    firebaseSignOut,
    setUserProfile,
    registerListener,
    unregisterListener,
    /* Session */
    login, loginDemo, logout,
    /* Domain */
    markDoseTaken, skipDose,
    acknowledgeReminder,
    addMedicine, updateMedicine, deleteMedicine,
    getAdherencePct,
  };
})();
