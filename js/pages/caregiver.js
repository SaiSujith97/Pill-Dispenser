/* ═════════════════════════════
   Page: Caregiver View
   ═════════════════════════════ */

function renderCaregiver() {
  const patient  = APP_DATA.users.patient;
  const schedule = AppState.get('todaySchedule');
  const medicines = AppState.get('medicines');
  const history  = AppState.get('history');
  const reminders = AppState.get('reminders').filter(r => !r.acknowledged);

  const taken  = schedule.filter(d => d.status === 'taken').length;
  const missed = schedule.filter(d => d.status === 'missed').length;
  const total  = schedule.length;

  /* 14-day stats */
  const weeklyPct = AppState.getAdherencePct();
  const weekData  = APP_DATA.getWeeklyAdherence();
  const bestDay   = [...weekData].sort((a,b) => b.pct - a.pct)[0];
  const worstDay  = [...weekData].sort((a,b) => a.pct - b.pct)[0];

  return `
<div class="page-enter" id="caregiver-root">

  <!-- Caregiver Banner -->
  <div class="caregiver-banner" role="banner">
    <div class="caregiver-banner-icon" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    </div>
    <div class="caregiver-banner-text">
      <div class="caregiver-banner-title">Caregiver View — Read Only</div>
      <div class="caregiver-banner-sub">Viewing as: <strong>James Johnson (Son)</strong></div>
    </div>
  </div>

  <!-- Patient Selector -->
  <div class="patient-selector card" style="border-radius:var(--radius-lg);">
    <div class="avatar avatar-md" style="background:var(--accent);" aria-hidden="true">
      ${patient.initials}
    </div>
    <div class="patient-info">
      <div class="patient-name">${patient.name}</div>
      <div class="patient-meta">
        Age ${patient.age} · ${patient.conditions.join(', ')}
      </div>
      <div class="patient-meta" style="margin-top:2px;">
        📍 ${patient.address}
      </div>
    </div>
    <span class="badge badge-accent">My Patient</span>
  </div>

  <!-- Alert for missed doses -->
  ${missed > 0 ? `
  <div class="card card-alert" style="margin-bottom:var(--space-5); border-radius:var(--radius-lg);">
    <div style="display:flex; align-items:center; gap:var(--space-3);">
      <span style="font-size:22px;" aria-hidden="true">⚠️</span>
      <div>
        <div style="font-weight:600; color:var(--text-primary);">${missed} missed dose${missed > 1 ? 's' : ''} today</div>
        <div style="font-size:var(--text-sm); color:var(--text-secondary);">Mary missed her ${schedule.filter(d=>d.status==='missed').map(d=>{const m=medicines.find(x=>x.id===d.medicineId); return m?m.name:'';}).join(', ')} dose${missed>1?'s':''}.</div>
      </div>
    </div>
  </div>` : `
  <div class="card card-success" style="margin-bottom:var(--space-5); border-radius:var(--radius-lg);">
    <div style="display:flex; align-items:center; gap:var(--space-3);">
      <span style="font-size:22px;" aria-hidden="true">✅</span>
      <div>
        <div style="font-weight:600; color:var(--text-primary);">All doses taken today</div>
        <div style="font-size:var(--text-sm); color:var(--text-secondary);">Mary is on track with her medication today.</div>
      </div>
    </div>
  </div>`}

  <!-- Stats -->
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-3);">Adherence Overview</h2>
    <div class="stats-row">
      <div class="stat-card stat-accent">
        <div class="stat-value">${weeklyPct}%</div>
        <div class="stat-label">7-Day Rate</div>
      </div>
      <div class="stat-card stat-success">
        <div class="stat-value">${taken}/${total}</div>
        <div class="stat-label">Doses Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${bestDay ? bestDay.pct : 0}%</div>
        <div class="stat-label">Best Day</div>
      </div>
      <div class="stat-card ${(worstDay && worstDay.pct < 60) ? 'stat-danger' : ''}">
        <div class="stat-value">${worstDay ? worstDay.pct : 0}%</div>
        <div class="stat-label">Worst Day</div>
      </div>
    </div>
  </div>

  <!-- Today's summary (read only) -->
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-4);">Today's Schedule</h2>
    <div class="timeline">
      ${schedule.map(dose => {
        const med = medicines.find(m => m.id === dose.medicineId);
        if (!med) return '';
        const s = StatusConfig[dose.status] || StatusConfig.upcoming;
        return `
        <div class="timeline-item">
          <div class="timeline-time-col">
            <div class="timeline-dot ${s.dotClass}" aria-hidden="true"></div>
            <div class="timeline-time">${formatTime12(dose.scheduledTime).replace(' ','\n')}</div>
          </div>
          <div class="timeline-card">
            <div class="compartment-badge" style="background:${med.color};" aria-label="Compartment ${med.compartment}">${med.compartment}</div>
            <div class="timeline-card-info">
              <div class="timeline-med-name">${med.name} ${med.dosage}</div>
              <div class="timeline-med-dosage">${med.purpose}</div>
            </div>
            ${getStatusBadge(dose.status)}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Active reminders for caregiver -->
  ${reminders.length > 0 ? `
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-4);">Active Alerts</h2>
    <div style="display:flex; flex-direction:column; gap:var(--space-3);">
      ${reminders.map(r => {
        const sv = severityConfig[r.severity] || severityConfig.info;
        return `
        <div class="card ${r.severity === 'warning' ? 'card-danger' : 'card-warning'}" style="border-radius:var(--radius-lg);">
          <div style="display:flex; align-items:flex-start; gap:var(--space-3);">
            <span style="font-size:20px;" aria-hidden="true">${sv.icon}</span>
            <div>
              <div style="font-weight:600; color:var(--text-primary);">${r.title}</div>
              <div style="font-size:var(--text-sm); color:var(--text-secondary); margin-top:2px;">${r.message}</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>` : ''}

  <!-- Notification Settings for caregiver -->
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-3);">My Notification Preferences</h2>
    <div class="settings-card">
      ${renderCaregiverToggle('Missed dose alert', 'Notify me when Mary misses a dose', 'cg-notif-missed', true)}
      ${renderCaregiverToggle('Weekly report', 'Receive a weekly adherence summary', 'cg-notif-weekly', true)}
      ${renderCaregiverToggle('SMS notifications', 'Receive alerts via text message', 'cg-notif-sms', true)}
      ${renderCaregiverToggle('Email notifications', 'Receive alerts via email', 'cg-notif-email', true)}
      ${renderCaregiverToggle('Push notifications', 'In-app push notifications', 'cg-notif-push', false)}
    </div>
  </div>

</div>
  `;
}

function renderCaregiverToggle(label, desc, id, checked) {
  return `
  <div class="toggle-wrap">
    <div class="toggle-info">
      <div class="toggle-label">${label}</div>
      <div class="toggle-desc">${desc}</div>
    </div>
    <label class="toggle-switch" aria-label="${label}">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} />
      <span class="toggle-slider"></span>
    </label>
  </div>`;
}

function initCaregiver() {
  /* Caregiver toggles — just show toast on change */
  document.querySelectorAll('.toggle-switch input').forEach(toggle => {
    toggle.addEventListener('change', () => {
      Toast.show(
        toggle.checked ? 'Notification enabled.' : 'Notification disabled.',
        toggle.checked ? 'success' : 'info'
      );
    });
  });
}
