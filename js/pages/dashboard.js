/* ═════════════════════════════
   Page: Dashboard (Home)
   ═════════════════════════════ */

let _dashboardTimer = null;

function renderDashboard() {
  const schedule   = AppState.get('todaySchedule');
  const medicines  = AppState.get('medicines');
  const device     = AppState.get('device');
  const user       = APP_DATA.users.patient;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  /* Next upcoming dose */
  const upcoming = schedule
    .filter(d => d.status === 'upcoming')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const nextDose = upcoming[0] || null;
  const nextMed  = nextDose ? medicines.find(m => m.id === nextDose.medicineId) : null;

  /* Stats */
  const taken  = schedule.filter(d => d.status === 'taken').length;
  const missed = schedule.filter(d => d.status === 'missed').length;
  const total  = schedule.length;
  const weekPct = AppState.getAdherencePct();

  return `
<div class="page-enter" id="dashboard-root">

  <!-- Page header -->
  <div class="page-header">
    <h1 class="page-title">${greeting}, ${user.name.split(' ')[0]} 👋</h1>
    <p class="page-subtitle">${now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
  </div>

  <!-- Next Dose Hero Card -->
  ${nextDose && nextMed ? `
  <div class="next-dose-card" id="next-dose-card" role="region" aria-label="Next dose">
    <p class="next-dose-eyebrow">Next Dose</p>
    <p class="next-dose-name">${nextMed.name} ${nextMed.dosage}</p>
    <p class="next-dose-detail">${nextMed.instructions}</p>
    <div class="next-dose-time" id="next-dose-time" aria-live="polite">${formatTime12(nextDose.scheduledTime)}</div>
    <div class="next-dose-countdown" id="next-dose-countdown">
      In ${getTimeUntil(nextDose.scheduledTime) || '—'}
    </div>
    <div class="next-dose-actions">
      <button class="btn btn-on-accent btn-sm" id="mark-next-taken-btn" data-dose-id="${nextDose.id}" style="min-width:140px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        Mark as Taken
      </button>
      <button class="btn btn-on-accent btn-sm" id="skip-next-btn" data-dose-id="${nextDose.id}">
        Skip
      </button>
    </div>
  </div>
  ` : `
  <div class="all-done-card" role="region" aria-label="All doses complete">
    <div class="all-done-icon" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h2 style="font-size:var(--text-xl); font-weight:700; color:#fff; margin-bottom:4px;">All done for today!</h2>
    <p style="color:rgba(255,255,255,0.8); font-size:var(--text-sm);">All your doses are complete. Great job staying on track.</p>
  </div>
  `}

  <!-- Stats Row -->
  <div class="content-section">
    <div class="stats-row">
      <div class="stat-card stat-accent">
        <div class="stat-value">${weekPct}%</div>
        <div class="stat-label">This Week</div>
      </div>
      <div class="stat-card stat-success">
        <div class="stat-value">${taken}</div>
        <div class="stat-label">Taken Today</div>
      </div>
      <div class="stat-card ${missed > 0 ? 'stat-danger' : ''}">
        <div class="stat-value">${missed}</div>
        <div class="stat-label">Missed Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${total}</div>
        <div class="stat-label">Doses Today</div>
      </div>
    </div>
  </div>

  <!-- Today's Timeline -->
  <div class="content-section">
    <div class="section-header">
      <div>
        <h2 class="section-title">Today's Schedule</h2>
        <p class="section-subtitle">${total} doses scheduled</p>
      </div>
      <a href="#schedule" class="btn btn-ghost btn-sm">View history</a>
    </div>

    <div class="timeline" id="today-timeline" role="list">
      ${renderTimeline(schedule, medicines)}
    </div>
  </div>

  <!-- Device Status -->
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-3);">Device Status</h2>
    <div class="card">
      <div class="device-card">
        <div class="device-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        </div>
        <div class="device-info">
          <div class="device-name">${device.name}</div>
          <div class="device-status">
            <span class="status-dot ${device.connected ? '' : 'offline'}" aria-hidden="true"></span>
            <span>${device.connected ? 'Connected' : 'Offline'}</span>
            &middot; Synced ${device.lastSync}
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:var(--text-sm); font-weight:600; color:${device.battery < 20 ? 'var(--danger)' : 'var(--text-primary)'}">
            🔋 ${device.battery}%
          </div>
          <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:2px;">
            v${device.firmware}
          </div>
        </div>
      </div>

      <!-- Compartment grid -->
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-2); margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--border-light);">
        ${Object.entries(device.compartments).map(([key, comp]) => {
          const med = medicines.find(m => m.id === comp.medicineId);
          return `
          <div style="background:var(--bg-raised); border-radius:var(--radius-md); padding:var(--space-3); text-align:center;">
            <div style="font-size:var(--text-xs); font-weight:700; color:${med ? med.color : 'var(--text-muted)'};">${key}</div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${med ? med.name : 'Empty'}</div>
            <div style="font-size:10px; color:var(--text-muted);">${comp.pillCount} left</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

</div>
  `;
}

function renderTimeline(schedule, medicines) {
  const sorted = [...schedule].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return sorted.map(dose => {
    const med = medicines.find(m => m.id === dose.medicineId);
    if (!med) return '';
    const s = StatusConfig[dose.status] || StatusConfig.upcoming;
    return `
    <div class="timeline-item" role="listitem" data-dose-id="${dose.id}">
      <div class="timeline-time-col">
        <div class="timeline-dot ${s.dotClass}" aria-hidden="true">
          ${dose.status === 'taken'
            ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : dose.status === 'missed'
            ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
            : ''}
        </div>
        <div class="timeline-time">${formatTime12(dose.scheduledTime).replace(' ', '\n')}</div>
      </div>
      <div class="timeline-card">
        <div class="compartment-badge" style="background:${med.color};" aria-label="Compartment ${med.compartment}">${med.compartment}</div>
        <div class="timeline-card-info">
          <div class="timeline-med-name">${med.name}</div>
          <div class="timeline-med-dosage">${med.dosage} · ${med.instructions}</div>
        </div>
        <div style="flex-shrink:0;">${getStatusBadge(dose.status)}</div>
        ${dose.status === 'upcoming' ? `
        <button class="btn btn-primary btn-sm timeline-take-btn" data-dose-id="${dose.id}" aria-label="Mark ${med.name} as taken" style="min-width:90px; flex-shrink:0;">
          Take now
        </button>` : ''}
        ${dose.status === 'missed' ? `
        <button class="btn btn-alert btn-sm timeline-take-btn" data-dose-id="${dose.id}" aria-label="Take ${med.name} late" style="min-width:90px; flex-shrink:0;">
          Take late
        </button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function initDashboard() {
  /* Mark as taken — next dose card */
  const markNextBtn = document.getElementById('mark-next-taken-btn');
  if (markNextBtn) {
    markNextBtn.addEventListener('click', () => {
      const doseId = markNextBtn.dataset.doseId;
      if (AppState.markDoseTaken(doseId)) {
        Toast.show('✓ Dose marked as taken!', 'success');
        refreshDashboard();
      }
    });
  }

  /* Skip button */
  const skipBtn = document.getElementById('skip-next-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      const doseId = skipBtn.dataset.doseId;
      showConfirm('Skip this dose?', 'Are you sure you want to skip this dose? Your caregiver may be notified.', () => {
        AppState.skipDose(doseId);
        Toast.show('Dose skipped.', 'warning');
        refreshDashboard();
      });
    });
  }

  /* Timeline take buttons */
  document.addEventListener('click', _timelineTakeHandler);

  /* Countdown timer */
  _dashboardTimer = setInterval(_updateCountdown, 30000);
}

function _timelineTakeHandler(e) {
  const btn = e.target.closest('.timeline-take-btn');
  if (!btn) return;
  const doseId = btn.dataset.doseId;
  if (AppState.markDoseTaken(doseId)) {
    Toast.show('✓ Dose marked as taken!', 'success');
    refreshDashboard();
  }
}

function _updateCountdown() {
  const countdownEl = document.getElementById('next-dose-countdown');
  const schedule = AppState.get('todaySchedule');
  const nextDose = schedule.filter(d => d.status === 'upcoming')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))[0];
  if (countdownEl && nextDose) {
    const t = getTimeUntil(nextDose.scheduledTime);
    countdownEl.textContent = t ? `In ${t}` : 'Due now!';
  }
}

function refreshDashboard() {
  const root = document.getElementById('dashboard-root');
  if (!root) return;
  clearInterval(_dashboardTimer);
  document.removeEventListener('click', _timelineTakeHandler);

  const schedule  = AppState.get('todaySchedule');
  const medicines = AppState.get('medicines');

  /* ── Update timeline ── */
  const timelineEl = document.getElementById('today-timeline');
  if (timelineEl) {
    timelineEl.innerHTML = renderTimeline(schedule, medicines);
  }

  /* ── Update stat cards inline ── */
  const taken  = schedule.filter(d => d.status === 'taken').length;
  const missed = schedule.filter(d => d.status === 'missed').length;
  const total  = schedule.length;
  const weekPct = AppState.getAdherencePct();

  const statEls = root.querySelectorAll('.stat-card .stat-value');
  if (statEls.length >= 4) {
    statEls[0].textContent = `${weekPct}%`;
    statEls[1].textContent = taken;
    statEls[2].textContent = missed;
    statEls[3].textContent = total;
  }
  /* Color the missed card */
  const statCards = root.querySelectorAll('.stat-card');
  if (statCards[2]) {
    statCards[2].className = `stat-card ${missed > 0 ? 'stat-danger' : ''}`;
  }

  /* ── Update next-dose hero card ── */
  const upcoming = schedule.filter(d => d.status === 'upcoming')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const nextDoseCard = document.getElementById('next-dose-card');
  if (!upcoming[0] && nextDoseCard) {
    /* All done */
    nextDoseCard.outerHTML = `
      <div class="all-done-card" role="region" aria-label="All doses complete">
        <div class="all-done-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style="font-size:var(--text-xl); font-weight:700; color:#fff; margin-bottom:4px;">All done for today!</h2>
        <p style="color:rgba(255,255,255,0.8); font-size:var(--text-sm);">All your doses are complete. Great job staying on track.</p>
      </div>`;
  } else if (upcoming[0] && nextDoseCard) {
    /* Update dose card details to show next upcoming dose */
    const nextMed = medicines.find(m => m.id === upcoming[0].medicineId);
    if (nextMed) {
      const nameEl = nextDoseCard.querySelector('.next-dose-name');
      const detailEl = nextDoseCard.querySelector('.next-dose-detail');
      const timeEl = nextDoseCard.querySelector('.next-dose-time');
      const cdEl = nextDoseCard.querySelector('.next-dose-countdown');
      const btn = nextDoseCard.querySelector('#mark-next-taken-btn');
      const skipBtn = nextDoseCard.querySelector('#skip-next-btn');
      if (nameEl)   nameEl.textContent   = `${nextMed.name} ${nextMed.dosage}`;
      if (detailEl) detailEl.textContent = nextMed.instructions;
      if (timeEl)   timeEl.textContent   = formatTime12(upcoming[0].scheduledTime);
      if (cdEl) {
        const t = getTimeUntil(upcoming[0].scheduledTime);
        cdEl.textContent = t ? `In ${t}` : 'Due now!';
      }
      if (btn)     btn.dataset.doseId    = upcoming[0].id;
      if (skipBtn) skipBtn.dataset.doseId = upcoming[0].id;
      /* Re-wire buttons */
      initDashboard();
    }
  }

  updateBadges();
  document.addEventListener('click', _timelineTakeHandler);
  _dashboardTimer = setInterval(_updateCountdown, 30000);
}

function cleanupDashboard() {
  clearInterval(_dashboardTimer);
  _dashboardTimer = null;
  document.removeEventListener('click', _timelineTakeHandler);
}
