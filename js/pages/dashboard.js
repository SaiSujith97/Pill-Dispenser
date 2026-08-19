/* ═════════════════════════════
   Page: Dashboard (Home)
   ═════════════════════════════ */

let _dashboardTimer      = null;
let _scheduleUnsub       = null;
let _dashboardDateStr    = null;

/* ─── Skeleton loader ─── */
function _renderDashboardSkeleton() {
  return `
  <div class="page-enter" id="dashboard-root">
    <div class="page-header">
      <div class="skeleton" style="height:28px;width:220px;border-radius:8px;margin-bottom:8px;"></div>
      <div class="skeleton" style="height:16px;width:160px;border-radius:6px;"></div>
    </div>
    <div class="skeleton" style="height:160px;border-radius:var(--radius-xl);margin-bottom:var(--space-5);"></div>
    <div class="stats-row" style="margin-bottom:var(--space-5);">
      ${[1,2,3,4].map(() => `<div class="skeleton stat-card" style="height:72px;"></div>`).join('')}
    </div>
    <div class="skeleton" style="height:24px;width:160px;border-radius:6px;margin-bottom:var(--space-4);"></div>
    ${[1,2,3].map(() => `<div class="skeleton" style="height:72px;border-radius:var(--radius-lg);margin-bottom:var(--space-3);"></div>`).join('')}
  </div>`;
}

function renderDashboard() {
  /* Show skeleton immediately; real data fills in after Firestore responds */
  return _renderDashboardSkeleton();
}

function _renderDashboardContent() {
  const schedule   = AppState.get('todaySchedule');
  const medicines  = AppState.get('medicines');
  const device     = AppState.get('device') || {};
  const profile    = AppState.get('userProfile');
  const isDemoMode = AppState.get('isDemoMode');

  const firstName  = profile
    ? (profile.name || 'Friend').split(' ')[0]
    : (isDemoMode ? APP_DATA.users.patient.name.split(' ')[0] : 'Friend');

  const now      = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  /* Next upcoming dose */
  const upcoming = schedule
    .filter(d => d.status === 'upcoming')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const nextDose = upcoming[0] || null;
  const nextMed  = nextDose
    ? medicines.find(m => m.id === nextDose.medicineId) || {
        name: nextDose.medicineName || '—',
        dosage: nextDose.dosage || '',
        instructions: nextDose.instructions || '',
        color: nextDose.color || '#5B8A72',
        compartment: nextDose.compartment || '',
      }
    : null;

  /* Stats */
  const taken  = schedule.filter(d => d.status === 'taken').length;
  const missed = schedule.filter(d => d.status === 'missed').length;
  const total  = schedule.length;

  /* Adherence from real history */
  const weekPct = AppState.getAdherencePct();

  return `
<div class="page-enter" id="dashboard-root">

  <!-- Page header -->
  <div class="page-header">
    <h1 class="page-title">${greeting}, ${firstName} 👋</h1>
    <p class="page-subtitle">${now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
  </div>

  <!-- Next Dose Hero Card -->
  ${nextDose && nextMed ? `
  <div class="next-dose-card" id="next-dose-card" role="region" aria-label="Next dose">
    <p class="next-dose-eyebrow">Next Dose</p>
    <p class="next-dose-name">${nextMed.name} ${nextMed.dosage}</p>
    <p class="next-dose-detail">${nextMed.instructions || ''}</p>
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
      ${total === 0
        ? `<div class="empty-state">
             <div class="empty-state-icon" aria-hidden="true">
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
             </div>
             <p class="empty-state-title">No doses scheduled today</p>
             <p class="empty-state-desc">Add medicines to see your daily schedule here.</p>
           </div>`
        : renderTimeline(schedule, medicines)
      }
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
          <div class="device-name">${device.name || 'No device paired'}</div>
          <div class="device-status">
            <span class="status-dot ${device.connected ? '' : 'offline'}" aria-hidden="true"></span>
            <span>${device.connected ? 'Connected' : 'Offline'}</span>
            ${device.lastSync ? `&middot; Synced ${device.lastSync}` : ''}
          </div>
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:var(--text-sm); font-weight:600; color:${(device.battery||100) < 20 ? 'var(--danger)' : 'var(--text-primary)'}">
            🔋 ${device.battery || '—'}%
          </div>
          <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:2px;">
            v${device.firmware || '—'}
          </div>
        </div>
      </div>

      <!-- Compartment grid -->
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:var(--space-2); margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--border-light);">
        ${device.compartments ? Object.entries(device.compartments).map(([key, comp]) => {
          const med = medicines.find(m => m.id === comp.medicineId);
          return `
          <div style="background:var(--bg-raised); border-radius:var(--radius-md); padding:var(--space-3); text-align:center;">
            <div style="font-size:var(--text-xs); font-weight:700; color:${med ? med.color : 'var(--text-muted)'};">${key}</div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${med ? med.name : 'Empty'}</div>
            <div style="font-size:10px; color:var(--text-muted);">${comp.pillCount} left</div>
          </div>`;
        }).join('') : '<div style="grid-column:1/-1; text-align:center; color:var(--text-muted); font-size:var(--text-sm); padding:var(--space-3);">Pair a device to see compartments</div>'}
      </div>
    </div>
  </div>

</div>
  `;
}

function renderTimeline(schedule, medicines) {
  const sorted = [...schedule].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return sorted.map(dose => {
    /* Support both Firestore docs (medicineName) and mock objects (medicineId lookup) */
    const med = medicines.find(m => m.id === dose.medicineId) || {
      name:        dose.medicineName  || '—',
      dosage:      dose.dosage        || '',
      instructions:dose.instructions  || '',
      color:       dose.color         || '#5B8A72',
      compartment: dose.compartment   || '',
    };
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
          <div class="timeline-med-dosage">${med.dosage}${med.instructions ? ' · ' + med.instructions : ''}</div>
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

async function initDashboard() {
  const uid        = AppState.getCurrentUid();
  const isDemoMode = AppState.get('isDemoMode');

  _dashboardDateStr = new Date().toISOString().split('T')[0];

  if (isDemoMode) {
    /* Demo mode: just render from mock AppState */
    _renderRealDashboard();
    _initDashboardInteractions();
    _dashboardTimer = setInterval(_updateCountdown, 30000);
    return;
  }

  if (!uid) {
    window.location.hash = '#landing';
    return;
  }

  /* Real mode: generate today's schedule if needed, then subscribe */
  try {
    const medicines = AppState.get('medicines');
    await FirebaseDB.generateTodaySchedule(uid, _dashboardDateStr, medicines);
  } catch (err) {
    console.warn('Schedule generation error:', err);
  }

  /* Subscribe to live updates */
  const unsub = FirebaseDB.getTodaySchedule(uid, _dashboardDateStr, async (err, doses) => {
    if (err) {
      console.error('Schedule snapshot error:', err);
      Toast.show('Could not load today\'s schedule. Check your connection.', 'error');
      return;
    }

    AppState.set('todaySchedule', doses);

    /* Flag missed doses (client-side) */
    try {
      await FirebaseDB.flagMissedDoses(uid, _dashboardDateStr, doses);
    } catch (_) {}

    _renderRealDashboard();
    _initDashboardInteractions();
  });

  AppState.registerListener('dashboard-schedule', unsub);
  _dashboardTimer = setInterval(_updateCountdown, 30000);
}

function _renderRealDashboard() {
  const root = document.getElementById('dashboard-root');
  if (!root) return;
  /* Replace skeleton with real content */
  root.outerHTML = _renderDashboardContent();
  _initDashboardInteractions();
}

function _initDashboardInteractions() {
  /* Mark as taken — next dose card */
  const markNextBtn = document.getElementById('mark-next-taken-btn');
  if (markNextBtn) {
    markNextBtn.addEventListener('click', () => _handleTakeDose(markNextBtn.dataset.doseId));
  }

  /* Skip button */
  const skipBtn = document.getElementById('skip-next-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      const doseId = skipBtn.dataset.doseId;
      showConfirm('Skip this dose?', 'Are you sure you want to skip this dose? Your caregiver may be notified.', () => {
        _handleSkipDose(doseId);
      });
    });
  }

  /* Timeline take buttons (delegated) */
  const timeline = document.getElementById('today-timeline');
  if (timeline) {
    timeline.addEventListener('click', (e) => {
      const btn = e.target.closest('.timeline-take-btn');
      if (btn) _handleTakeDose(btn.dataset.doseId);
    });
  }
}

async function _handleTakeDose(doseId) {
  const uid        = AppState.getCurrentUid();
  const isDemoMode = AppState.get('isDemoMode');

  if (isDemoMode) {
    AppState.markDoseTaken(doseId);
    Toast.show('✓ Dose marked as taken!', 'success');
    refreshDashboard();
    return;
  }

  try {
    await FirebaseDB.markDoseTaken(uid, _dashboardDateStr, doseId);
    Toast.show('✓ Dose marked as taken!', 'success');
    /* onSnapshot will fire and refreshDashboard automatically */
  } catch (err) {
    console.error('markDoseTaken error:', err);
    Toast.show('Could not update dose. Please try again.', 'error');
  }
}

async function _handleSkipDose(doseId) {
  const uid        = AppState.getCurrentUid();
  const isDemoMode = AppState.get('isDemoMode');

  if (isDemoMode) {
    AppState.skipDose(doseId);
    Toast.show('Dose skipped.', 'warning');
    refreshDashboard();
    return;
  }

  try {
    await FirebaseDB.skipDose(uid, _dashboardDateStr, doseId);
    Toast.show('Dose skipped.', 'warning');
  } catch (err) {
    console.error('skipDose error:', err);
    Toast.show('Could not skip dose. Please try again.', 'error');
  }
}

function _updateCountdown() {
  const countdownEl = document.getElementById('next-dose-countdown');
  if (!countdownEl) return;
  const schedule = AppState.get('todaySchedule');
  const nextDose = schedule.filter(d => d.status === 'upcoming')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))[0];
  if (nextDose) {
    const t = getTimeUntil(nextDose.scheduledTime);
    countdownEl.textContent = t ? `In ${t}` : 'Due now!';
  }
}

/* Called by onSnapshot callback (real mode) to re-render dashboard content area */
function refreshDashboard() {
  const root = document.getElementById('dashboard-root');
  if (!root) return;

  clearInterval(_dashboardTimer);

  const schedule  = AppState.get('todaySchedule');
  const medicines = AppState.get('medicines');

  /* Update timeline */
  const timelineEl = document.getElementById('today-timeline');
  if (timelineEl) {
    timelineEl.innerHTML = schedule.length === 0
      ? `<div class="empty-state">
           <div class="empty-state-icon" aria-hidden="true">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
           </div>
           <p class="empty-state-title">No doses scheduled today</p>
           <p class="empty-state-desc">Add medicines to see your daily schedule here.</p>
         </div>`
      : renderTimeline(schedule, medicines);
  }

  /* Update stat cards */
  const taken   = schedule.filter(d => d.status === 'taken').length;
  const missed  = schedule.filter(d => d.status === 'missed').length;
  const total   = schedule.length;
  const weekPct = AppState.getAdherencePct();

  const statEls = root.querySelectorAll('.stat-card .stat-value');
  if (statEls.length >= 4) {
    statEls[0].textContent = `${weekPct}%`;
    statEls[1].textContent = taken;
    statEls[2].textContent = missed;
    statEls[3].textContent = total;
  }
  const statCards = root.querySelectorAll('.stat-card');
  if (statCards[2]) {
    statCards[2].className = `stat-card ${missed > 0 ? 'stat-danger' : ''}`;
  }

  /* Update next-dose hero */
  const upcoming  = schedule.filter(d => d.status === 'upcoming')
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const nextDoseCard = document.getElementById('next-dose-card');

  if (!upcoming[0] && nextDoseCard) {
    nextDoseCard.outerHTML = `
      <div class="all-done-card" role="region" aria-label="All doses complete">
        <div class="all-done-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style="font-size:var(--text-xl); font-weight:700; color:#fff; margin-bottom:4px;">All done for today!</h2>
        <p style="color:rgba(255,255,255,0.8); font-size:var(--text-sm);">All your doses are complete. Great job staying on track.</p>
      </div>`;
  } else if (upcoming[0] && nextDoseCard) {
    const med = medicines.find(m => m.id === upcoming[0].medicineId) || {
      name: upcoming[0].medicineName || '—', dosage: upcoming[0].dosage || '',
      instructions: upcoming[0].instructions || '',
    };
    const nameEl   = nextDoseCard.querySelector('.next-dose-name');
    const detailEl = nextDoseCard.querySelector('.next-dose-detail');
    const timeEl   = nextDoseCard.querySelector('.next-dose-time');
    const cdEl     = nextDoseCard.querySelector('.next-dose-countdown');
    const btn      = nextDoseCard.querySelector('#mark-next-taken-btn');
    const skipBtn  = nextDoseCard.querySelector('#skip-next-btn');
    if (nameEl)   nameEl.textContent   = `${med.name} ${med.dosage}`;
    if (detailEl) detailEl.textContent = med.instructions;
    if (timeEl)   timeEl.textContent   = formatTime12(upcoming[0].scheduledTime);
    if (cdEl) {
      const t = getTimeUntil(upcoming[0].scheduledTime);
      cdEl.textContent = t ? `In ${t}` : 'Due now!';
    }
    if (btn)     btn.dataset.doseId     = upcoming[0].id;
    if (skipBtn) skipBtn.dataset.doseId = upcoming[0].id;
    _initDashboardInteractions();
  }

  updateBadges();
  _dashboardTimer = setInterval(_updateCountdown, 30000);
}

function cleanupDashboard() {
  clearInterval(_dashboardTimer);
  _dashboardTimer = null;
  AppState.unregisterListener('dashboard-schedule');
}
