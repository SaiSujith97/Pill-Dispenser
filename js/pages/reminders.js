/* ═════════════════════════════
   Page: Reminders / Alerts
   ═════════════════════════════ */

function renderReminders() {
  const reminders = AppState.get('reminders');
  const medicines = AppState.get('medicines');

  const active = reminders.filter(r => !r.acknowledged);
  const acknowledged = reminders.filter(r => r.acknowledged);

  return `
<div class="page-enter" id="reminders-root">

  <div class="page-header">
    <h1 class="page-title">Reminders & Alerts</h1>
    <p class="page-subtitle">
      ${active.length > 0
        ? `${active.length} action${active.length > 1 ? 's' : ''} require your attention`
        : 'No new alerts — you\'re all caught up!'}
    </p>
  </div>

  <!-- Active reminders -->
  ${active.length > 0 ? `
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-4);">Action Required</h2>
    <div id="active-reminders" style="display:flex; flex-direction:column; gap:var(--space-4);">
      ${active.map(r => renderReminderCard(r, medicines, false)).join('')}
    </div>
  </div>` : `
  <div class="card" style="margin-bottom:var(--space-6);">
    <div class="empty-state" style="padding:var(--space-8) var(--space-4);">
      <div class="empty-state-icon" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <p class="empty-state-title">All clear!</p>
      <p class="empty-state-desc">No active reminders right now. Check back after your next dose time.</p>
    </div>
  </div>`}

  <!-- Acknowledged (history) -->
  ${acknowledged.length > 0 ? `
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-4); color:var(--text-muted);">Acknowledged</h2>
    <div style="display:flex; flex-direction:column; gap:var(--space-3); opacity:0.65;">
      ${acknowledged.map(r => renderReminderCard(r, medicines, true)).join('')}
    </div>
  </div>` : ''}

</div>
  `;
}

const severityConfig = {
  warning: { cssClass: 'severity-warning', color: 'var(--alert)', icon: '⚠️', label: 'Missed Dose' },
  info:    { cssClass: 'severity-info',    color: 'var(--info)',  icon: '🔔', label: 'Upcoming Dose' },
  alert:   { cssClass: 'severity-alert',   color: 'var(--warning)', icon: '💊', label: 'Refill Needed' },
};

function renderReminderCard(reminder, medicines, acknowledged) {
  const med = medicines.find(m => m.id === reminder.medicineId);
  const sv  = severityConfig[reminder.severity] || severityConfig.info;

  return `
  <div class="reminder-card ${sv.cssClass}" data-reminder-id="${reminder.id}" role="article">
    <div style="display:flex; align-items:flex-start; gap:var(--space-3);">
      <span style="font-size:24px; line-height:1; flex-shrink:0;" aria-hidden="true">${sv.icon}</span>
      <div style="flex:1;">
        <div class="reminder-title">${reminder.title}</div>
        <div class="reminder-msg">${reminder.message}</div>
        <div class="reminder-meta" style="margin-top:var(--space-2);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${formatTime12(reminder.time)} today
          ${med ? `· Compartment ${med.compartment}` : ''}
        </div>
      </div>
      <span class="badge ${reminder.severity === 'warning' ? 'badge-late' : reminder.severity === 'alert' ? 'badge-warning' : 'badge-info'}">${sv.label}</span>
    </div>

    ${!acknowledged ? `
    <div class="reminder-actions">
      ${reminder.canTakeNow ? `
      <button class="btn btn-primary" id="take-now-${reminder.id}"
        data-reminder-id="${reminder.id}"
        data-med-id="${reminder.medicineId}"
        aria-label="Mark ${med ? med.name : 'medicine'} as taken now"
        style="flex:1; min-width:140px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        Mark as Taken
      </button>` : ''}
      <button class="btn btn-secondary ack-btn"
        data-reminder-id="${reminder.id}"
        aria-label="Acknowledge this reminder"
        style="${reminder.canTakeNow ? '' : 'flex:1;'}">
        ${reminder.canTakeNow ? 'Dismiss' : 'Acknowledge'}
      </button>
    </div>` : `
    <div style="font-size:var(--text-xs); color:var(--text-muted); display:flex; align-items:center; gap:4px;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      Acknowledged
    </div>`}
  </div>`;
}

function initReminders() {
  document.getElementById('reminders-root').addEventListener('click', (e) => {
    /* Mark as taken */
    const takeBtn = e.target.closest('[id^="take-now-"]');
    if (takeBtn) {
      const remId = takeBtn.dataset.reminderId;
      const medId = takeBtn.dataset.medId;

      /* Mark the corresponding today dose if present */
      const schedule = AppState.get('todaySchedule');
      const todayDose = schedule.find(d => d.medicineId === medId && (d.status === 'missed' || d.status === 'upcoming'));
      if (todayDose) AppState.markDoseTaken(todayDose.id);

      AppState.acknowledgeReminder(remId);
      Toast.show('✓ Dose recorded as taken!', 'success');
      _refreshReminderPage();
      updateBadges();
      return;
    }

    /* Dismiss / acknowledge */
    const ackBtn = e.target.closest('.ack-btn');
    if (ackBtn) {
      AppState.acknowledgeReminder(ackBtn.dataset.reminderId);
      Toast.show('Reminder dismissed.', 'info');
      _refreshReminderPage();
      updateBadges();
    }
  });
}

function _refreshReminderPage() {
  const root = document.getElementById('reminders-root');
  if (!root) return;
  const reminders = AppState.get('reminders');
  const medicines = AppState.get('medicines');

  const active = reminders.filter(r => !r.acknowledged);
  const acknowledged = reminders.filter(r => r.acknowledged);

  /* Update subtitle */
  const subtitle = root.querySelector('.page-subtitle');
  if (subtitle) {
    subtitle.textContent = active.length > 0
      ? `${active.length} action${active.length > 1 ? 's' : ''} require your attention`
      : 'No new alerts — you\'re all caught up!';
  }

  const activeContainer = document.getElementById('active-reminders');
  if (activeContainer && active.length > 0) {
    activeContainer.innerHTML = active.map(r => renderReminderCard(r, medicines, false)).join('');
  } else if (active.length === 0) {
    /* Full refresh */
    root.innerHTML = renderReminders().replace('<div class="page-enter"', '<div');
    initReminders();
  }
}
