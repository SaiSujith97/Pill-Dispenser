/* ═════════════════════════════
   Page: Schedule / History
   ═════════════════════════════ */

let _scheduleChart = null;

function renderSchedule() {
  return `
<div class="page-enter" id="schedule-root">

  <div class="page-header">
    <h1 class="page-title">Schedule &amp; History</h1>
    <p class="page-subtitle">14-day medication history</p>
  </div>

  <!-- Summary stats (skeleton while loading) -->
  <div class="stats-row" style="margin-bottom:var(--space-6);" id="schedule-stats">
    <div class="skeleton stat-card" style="height:72px;"></div>
    <div class="skeleton stat-card" style="height:72px;"></div>
    <div class="skeleton stat-card" style="height:72px;"></div>
  </div>

  <!-- Adherence chart -->
  <div class="card" style="margin-bottom:var(--space-6);">
    <h2 class="section-title" style="margin-bottom:var(--space-4);">7-Day Adherence</h2>
    <div class="chart-container" style="height:180px;">
      <canvas id="adherence-chart" aria-label="Weekly adherence chart" role="img"></canvas>
    </div>
    <div id="chart-labels" style="display:flex; justify-content:space-between; margin-top:var(--space-2); padding:0 var(--space-1);"></div>
  </div>

  <!-- Filter Bar -->
  <div class="filter-bar">
    <label class="sr-only" for="filter-med">Filter by medicine</label>
    <select class="filter-select" id="filter-med">
      <option value="all">All medicines</option>
    </select>
    <label class="sr-only" for="filter-status">Filter by status</label>
    <select class="filter-select" id="filter-status">
      <option value="all">All statuses</option>
      <option value="taken">Taken</option>
      <option value="missed">Missed</option>
    </select>
  </div>

  <!-- History list -->
  <div id="history-list">
    <div class="skeleton" style="height:24px;width:140px;border-radius:6px;margin-bottom:var(--space-3);"></div>
    ${[1,2,3,4].map(() => `<div class="skeleton" style="height:64px;border-radius:var(--radius-lg);margin-bottom:var(--space-2);"></div>`).join('')}
  </div>

</div>
  `;
}

function renderHistoryList(sortedDates, grouped, medicines, filterMed, filterStatus) {
  const today = new Date().toISOString().split('T')[0];
  let html = '';

  sortedDates.forEach(date => {
    let doses = grouped[date];
    if (filterMed    !== 'all') doses = doses.filter(d => d.medicineId === filterMed);
    if (filterStatus !== 'all') doses = doses.filter(d => d.status === filterStatus);
    if (doses.length === 0) return;

    html += `<div class="history-day-group">
      <div class="history-day-label">${formatDateShort(date)}</div>`;

    doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)).forEach(dose => {
      /* Resolve medicine name — from snapshot or from medicines array */
      const med = medicines.find(m => m.id === dose.medicineId);
      const medName   = med ? med.name   : (dose.medicineName || '—');
      const medDosage = med ? med.dosage : (dose.dosage       || '');
      const s = StatusConfig[dose.status] || StatusConfig.upcoming;
      const bgMap = { taken: 'var(--success-soft)', missed: 'var(--danger-soft)', upcoming: 'var(--accent-soft)', late: 'var(--alert-soft)' };
      html += `
      <div class="history-dose-row">
        <div class="history-dose-icon" style="background:${bgMap[dose.status] || 'var(--bg-raised)'};" aria-hidden="true">
          <span role="img" aria-label="${s.label}">${s.emoji}</span>
        </div>
        <div class="history-dose-info">
          <div class="history-dose-name">${medName} ${medDosage}</div>
          <div class="history-dose-time">Scheduled: ${formatTime12(dose.scheduledTime)}
            ${dose.takenAt ? `· Taken: ${formatTime12(dose.takenAt)}` : ''}
          </div>
        </div>
        ${getStatusBadge(dose.status)}
      </div>`;
    });
    html += `</div>`;
  });

  return html || `<div class="empty-state">
    <div class="empty-state-icon" aria-hidden="true">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    </div>
    <p class="empty-state-title">No records found</p>
    <p class="empty-state-desc">Try adjusting your filters, or check back once medicines are added.</p>
  </div>`;
}

function _buildWeekData(allDoses) {
  const today = new Date();
  const days  = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr   = d.toISOString().split('T')[0];
    const dayDoses  = allDoses.filter(h => h.date === dateStr);
    const taken     = dayDoses.filter(h => h.status === 'taken').length;
    const total     = dayDoses.length;
    days.push({
      date:  dateStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      taken,
      total,
      pct:   total > 0 ? Math.round((taken / total) * 100) : 0,
    });
  }
  return days;
}

function _buildHistoryDates() {
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function initSchedule() {
  const uid        = AppState.getCurrentUid();
  const isDemoMode = AppState.get('isDemoMode');

  if (isDemoMode) {
    /* Demo: use mock history from AppState */
    const history   = AppState.get('history');
    const medicines = AppState.get('medicines');
    _populateSchedulePage(history, medicines);
    return;
  }

  if (!uid) {
    window.location.hash = '#landing';
    return;
  }

  /* Real: fetch last 14 days from Firestore */
  const dateStrings = _buildHistoryDates();
  FirebaseDB.getHistoryDates(uid, dateStrings, (err, allDoses) => {
    if (err) {
      console.error('History fetch error:', err);
      Toast.show('Could not load your history. Check your connection.', 'error');
      return;
    }
    /* Also include today's live schedule */
    const todayDoses = AppState.get('todaySchedule').map(d => ({
      ...d,
      date: new Date().toISOString().split('T')[0],
    }));
    /* Merge (avoid duplicates from today's date) */
    const todayStr  = new Date().toISOString().split('T')[0];
    const pastDoses = allDoses.filter(d => d.date !== todayStr);
    const combined  = [...pastDoses, ...todayDoses];

    /* Update AppState history for adherence calc */
    AppState.set('history', combined);

    const medicines = AppState.get('medicines');
    _populateSchedulePage(combined, medicines);
  });
}

function _populateSchedulePage(allDoses, medicines) {
  /* Stats */
  const totalDoses = allDoses.length;
  const takenDoses = allDoses.filter(d => d.status === 'taken').length;
  const adherePct  = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  const statsEl = document.getElementById('schedule-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card stat-accent">
        <div class="stat-value">${adherePct}%</div>
        <div class="stat-label">Adherence (14d)</div>
      </div>
      <div class="stat-card stat-success">
        <div class="stat-value">${takenDoses}</div>
        <div class="stat-label">Taken</div>
      </div>
      <div class="stat-card stat-danger">
        <div class="stat-value">${totalDoses - takenDoses}</div>
        <div class="stat-label">Missed</div>
      </div>`;
  }

  /* Chart */
  const weekData = _buildWeekData(allDoses);
  const ctx = document.getElementById('adherence-chart');
  if (ctx && typeof Chart !== 'undefined') {
    if (_scheduleChart) { _scheduleChart.destroy(); _scheduleChart = null; }
    _scheduleChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weekData.map(d => d.label),
        datasets: [{
          label: 'Adherence %',
          data:  weekData.map(d => d.pct),
          backgroundColor: weekData.map(d =>
            d.pct >= 80 ? 'rgba(107, 191, 142, 0.85)' :
            d.pct >= 50 ? 'rgba(232, 184, 75, 0.85)'  :
                          'rgba(217, 108, 90, 0.85)'
          ),
          borderRadius:     6,
          borderSkipped:    false,
          maxBarThickness:  36,
        }],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend:  { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.raw}% adherence` } },
        },
        scales: {
          y: {
            min: 0, max: 100,
            ticks: {
              stepSize: 25,
              callback: v => `${v}%`,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
              font:  { size: 11 },
            },
            grid:   { color: getComputedStyle(document.documentElement).getPropertyValue('--border-light').trim() },
            border: { display: false },
          },
          x: { display: false },
        },
      },
    });
  }

  /* Chart day labels */
  const labelsEl = document.getElementById('chart-labels');
  if (labelsEl) {
    labelsEl.innerHTML = weekData.map(d =>
      `<div style="text-align:center; font-size:10px; color:var(--text-muted);">${d.label}</div>`
    ).join('');
  }

  /* Populate medicine filter */
  const filterMedEl = document.getElementById('filter-med');
  if (filterMedEl && medicines.length > 0) {
    const options = medicines.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    filterMedEl.innerHTML = `<option value="all">All medicines</option>${options}`;
  }

  /* Group history by date */
  const grouped     = {};
  allDoses.forEach(dose => {
    if (!grouped[dose.date]) grouped[dose.date] = [];
    grouped[dose.date].push(dose);
  });
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  /* Render list */
  const histListEl = document.getElementById('history-list');
  if (histListEl) {
    histListEl.innerHTML = renderHistoryList(sortedDates, grouped, medicines, 'all', 'all');
  }

  /* Wire filters */
  function applyFilters() {
    const med = document.getElementById('filter-med')?.value || 'all';
    const sts = document.getElementById('filter-status')?.value || 'all';
    const el  = document.getElementById('history-list');
    if (el) el.innerHTML = renderHistoryList(sortedDates, grouped, medicines, med, sts);
  }
  document.getElementById('filter-med')?.addEventListener('change', applyFilters);
  document.getElementById('filter-status')?.addEventListener('change', applyFilters);
}

function cleanupSchedule() {
  if (_scheduleChart) {
    _scheduleChart.destroy();
    _scheduleChart = null;
  }
}
