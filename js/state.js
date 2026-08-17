/* ═══════════════════════════════════════════════
   PillSync — App State (simple pub/sub store)
   ═══════════════════════════════════════════════ */

const AppState = (() => {
  const _state = {
    isLoggedIn: false,
    currentUser: 'patient',       /* 'patient' | 'caregiver' */
    currentPage: 'landing',
    medicines: [],
    todaySchedule: [],
    history: [],
    reminders: [],
    device: null,
    unreadReminders: 0,
    scheduleView: 'list',         /* 'list' | 'calendar' */
    medsView: 'grid',             /* 'grid' | 'list' */
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

  /* Initialize from mock data */
  function init() {
    const data = APP_DATA;
    _state.medicines     = [...data.medicines];
    _state.todaySchedule = [...data.todaySchedule];
    _state.history       = [...data.history];
    _state.reminders     = [...data.reminders];
    _state.device        = { ...data.device };
    _state.unreadReminders = data.reminders.filter(r => !r.acknowledged).length;

    /* Check localStorage for persisted login */
    if (localStorage.getItem('ps_logged_in') === 'true') {
      _state.isLoggedIn = true;
      _state.currentUser = localStorage.getItem('ps_user_role') || 'patient';
    }
  }

  /* ─── Domain actions ─── */

  function markDoseTaken(doseId) {
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

  function addMedicine(med) {
    const newMed = {
      ...med,
      id: `med-${Date.now()}`,
      active: true,
      startDate: new Date().toISOString().split('T')[0],
    };
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

  function login(role) {
    _state.isLoggedIn = true;
    _state.currentUser = role;
    localStorage.setItem('ps_logged_in', 'true');
    localStorage.setItem('ps_user_role', role);
    _notify('isLoggedIn', true);
    _notify('currentUser', role);
  }

  function logout() {
    _state.isLoggedIn = false;
    _state.currentUser = 'patient';
    localStorage.removeItem('ps_logged_in');
    localStorage.removeItem('ps_user_role');
    _notify('isLoggedIn', false);
  }

  function getAdherencePct() {
    const data = APP_DATA.getWeeklyAdherence();
    const total = data.reduce((s, d) => s + d.total, 0);
    const taken = data.reduce((s, d) => s + d.taken, 0);
    return total > 0 ? Math.round((taken / total) * 100) : 0;
  }

  return {
    get,
    set,
    update,
    subscribe,
    init,
    markDoseTaken,
    skipDose,
    acknowledgeReminder,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    login,
    logout,
    getAdherencePct,
  };
})();
