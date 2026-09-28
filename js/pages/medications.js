/* ═════════════════════════════
   Page: Medications
   ═════════════════════════════ */

let _medsView   = 'grid';
let _medsUnsub  = null;

// Mocking "import" from data.js without breaking classic script scope
const { updateHardwareSchedule } = APP_DATA;

function renderMedications() {
  _medsView = AppState.get('medsView') || 'grid';

  return `
<div class="page-enter" id="meds-root">

  <div class="page-header">
    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:var(--space-3);">
      <div>
        <h1 class="page-title">Medications</h1>
        <p class="page-subtitle" id="meds-count">Loading…</p>
      </div>
      <div class="med-header-actions">
        <!-- View toggle -->
        <div class="view-toggle" role="group" aria-label="View mode">
          <button class="view-btn ${_medsView === 'grid' ? 'active' : ''}" id="view-grid-btn" aria-label="Grid view" title="Grid view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          </button>
          <button class="view-btn ${_medsView === 'list' ? 'active' : ''}" id="view-list-btn" aria-label="List view" title="List view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
        <!-- Add on desktop -->
        <button class="btn btn-primary btn-sm" id="add-med-btn-header" style="display:none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Medicine
        </button>
      </div>
    </div>
  </div>

  <!-- Med content (skeleton while loading) -->
  <div id="med-content">
    ${_renderMedsSkeleton()}
  </div>

  <!-- FAB (mobile) -->
  <button class="fab" id="add-med-fab" aria-label="Add new medicine">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </button>

</div>
  `;
}

function _renderMedsSkeleton() {
  if (_medsView === 'list') {
    return `<div class="med-list-view">
      ${[1,2,3].map(() => `<div class="skeleton" style="height:72px;border-radius:var(--radius-lg);margin-bottom:var(--space-3);"></div>`).join('')}
    </div>`;
  }
  return `<div class="med-grid">
    ${[1,2,3].map(() => `<div class="skeleton" style="height:200px;border-radius:var(--radius-xl);"></div>`).join('')}
  </div>`;
}

function renderMedContent(medicines, view) {
  if (medicines.length === 0) {
    return `
    <div class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m10.5 20.5-3-3m9.5-9.5-6.5 6.5"/><path d="M15 3l6 6-3 3-6-6z"/><path d="M9 9l-6 6 3 3 6-6z"/></svg>
      </div>
      <p class="empty-state-title">No medications added yet</p>
      <p class="empty-state-desc">Tap the + button to add your first medication.</p>
    </div>`;
  }

  if (view === 'list') {
    return `<div class="med-list-view">
      ${medicines.map(med => renderMedListItem(med)).join('')}
    </div>`;
  }
  return `<div class="med-grid">
    ${medicines.map(med => renderMedCard(med)).join('')}
  </div>`;
}

function renderMedCard(med) {
  const isLow = med.pillCount !== undefined && med.pillCount < 15;
  return `
  <div class="card med-card card-hover" data-med-id="${med.id}">
    <div class="med-card-color-strip" style="background:${med.color || '#5B8A72'};" aria-hidden="true"></div>
    <div class="med-card-header">
      <div>
        <h3 class="med-card-name">${med.name}</h3>
        <div class="med-card-dosage">${med.dosage}</div>
      </div>
      <div class="compartment-badge" style="background:${med.color || '#5B8A72'};" aria-label="Compartment ${med.compartment}">${med.compartment || '—'}</div>
    </div>
    <p class="med-card-purpose">${med.purpose || ''}</p>
    <div class="med-card-meta">
      <span class="badge badge-accent">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${(med.times || ['08:00']).map(t => formatTime12(t)).join(', ')}
      </span>
      <span class="badge badge-info">
        ${freqLabel(med.frequency || 'once-daily')}
      </span>
    </div>
    ${isLow ? `<div class="low-supply">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
      Only ${med.pillCount} pills left
    </div>` : ''}
    <div class="med-card-actions">
      <button class="btn btn-secondary btn-sm med-edit-btn" data-med-id="${med.id}" aria-label="Edit ${med.name}" style="flex:1;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Edit
      </button>
      <button class="btn btn-ghost btn-sm med-delete-btn" data-med-id="${med.id}" aria-label="Delete ${med.name}" style="color:var(--danger);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        Delete
      </button>
    </div>
  </div>`;
}

function renderMedListItem(med) {
  return `
  <div class="med-list-item" data-med-id="${med.id}">
    <div class="med-list-color" style="background:${med.color || '#5B8A72'};" aria-hidden="true"></div>
    <div class="compartment-badge" style="background:${med.color || '#5B8A72'}; width:36px; height:36px;" aria-label="Compartment ${med.compartment}">${med.compartment || '—'}</div>
    <div class="med-list-info">
      <div class="med-list-name">${med.name} <span style="color:var(--text-muted); font-weight:400;">${med.dosage}</span></div>
      <div class="med-list-detail">${(med.times || ['08:00']).map(t => formatTime12(t)).join(', ')} · ${freqLabel(med.frequency || 'once-daily')}</div>
      <div class="med-list-detail" style="color:var(--text-muted); font-size:var(--text-xs);">${med.purpose || ''}</div>
    </div>
    <div class="med-list-actions">
      <button class="icon-btn med-edit-btn" data-med-id="${med.id}" aria-label="Edit ${med.name}">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="icon-btn med-delete-btn" data-med-id="${med.id}" aria-label="Delete ${med.name}" style="color:var(--danger);">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  </div>`;
}

function initMedications() {
  const uid        = AppState.getCurrentUid();
  const isDemoMode = AppState.get('isDemoMode');

  /* View toggles */
  document.getElementById('view-grid-btn').addEventListener('click', () => setMedView('grid'));
  document.getElementById('view-list-btn').addEventListener('click', () => setMedView('list'));

  /* Add buttons */
  document.getElementById('add-med-fab').addEventListener('click', () => openAddMedModal());
  const headerBtn = document.getElementById('add-med-btn-header');
  if (headerBtn) headerBtn.addEventListener('click', () => openAddMedModal());

  /* Edit / Delete — delegated */
  document.getElementById('meds-root').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.med-edit-btn');
    const delBtn  = e.target.closest('.med-delete-btn');
    if (editBtn) openEditMedModal(editBtn.dataset.medId);
    if (delBtn)  confirmDeleteMed(delBtn.dataset.medId);
  });

  /* Show header button on wider screens */
  _checkHeaderBtn();

  /* ── Data source ── */
  if (isDemoMode) {
    /* Demo: render from AppState mock data */
    _refreshMedUI(AppState.get('medicines') || []);
    return;
  }

  if (!uid) {
    window.location.hash = '#landing';
    return;
  }

  /* Show any currently cached medicines immediately */
  const cachedMeds = AppState.get('medicines') || [];
  if (cachedMeds.length > 0) {
    _refreshMedUI(cachedMeds);
  }

  /* Real: subscribe to Firestore */
  const unsub = FirebaseDB.getMedicines(uid, (err, medicines) => {
    if (err) {
      console.error('Medicines snapshot error:', err);
      Toast.show('Could not load your medications. Check your connection.', 'error');
      return;
    }
    AppState.set('medicines', medicines || []);
    _refreshMedUI(medicines || []);
  });
  AppState.registerListener('medications-list', unsub);
  _medsUnsub = unsub;
}

function _refreshMedUI(medicines) {
  const list = medicines || [];
  const countEl = document.getElementById('meds-count');
  if (countEl) countEl.textContent = `${list.length} active medication${list.length !== 1 ? 's' : ''}`;
  const content = document.getElementById('med-content');
  if (content) content.innerHTML = renderMedContent(list, _medsView);
  _checkHeaderBtn();
}

function _checkHeaderBtn() {
  const headerBtn = document.getElementById('add-med-btn-header');
  const fab       = document.getElementById('add-med-fab');
  if (!headerBtn || !fab) return;
  if (window.innerWidth >= 768) {
    headerBtn.style.display = 'flex';
    fab.style.display = 'none';
  } else {
    headerBtn.style.display = 'none';
    fab.style.display = 'flex';
  }
}

function setMedView(view) {
  _medsView = view;
  AppState.set('medsView', view);
  document.getElementById('view-grid-btn').classList.toggle('active', view === 'grid');
  document.getElementById('view-list-btn').classList.toggle('active', view === 'list');
  document.getElementById('med-content').innerHTML = renderMedContent(AppState.get('medicines') || [], view);
}

function openAddMedModal(existingMed = null) {
  /* Guard against event objects passed if called from event listeners */
  if (existingMed && (existingMed instanceof Event || typeof existingMed.preventDefault === 'function')) {
    existingMed = null;
  }
  const isEdit    = !!(existingMed && existingMed.id);
  const currentMeds = AppState.get('medicines') || [];
  const occupied  = currentMeds
    .filter(m => !isEdit || m.id !== existingMed.id)
    .map(m => m.compartment);

  const compartments = ['A', 'B', 'C', 'D', 'E', 'F'];
  const frequencies  = [
    ['once-daily',   'Once daily'],
    ['twice-daily',  'Twice daily'],
    ['three-daily',  'Three times daily'],
    ['as-needed',    'As needed'],
    ['weekly',       'Weekly'],
  ];
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const selComp  = isEdit ? (existingMed.compartment || 'A') : compartments.find(c => !occupied.includes(c)) || 'A';
  const selFreq  = isEdit ? (existingMed.frequency || 'once-daily') : 'once-daily';
  const selTimes = isEdit ? (existingMed.times || ['08:00']) : ['08:00'];
  const selDays  = isEdit ? (existingMed.daysOfWeek || [0,1,2,3,4,5,6]) : [0,1,2,3,4,5,6];

  Modal.open(`
    <h2 class="modal-title" id="modal-title" style="margin-bottom:var(--space-5);">
      ${isEdit ? 'Edit Medicine' : 'Add Medicine'}
    </h2>

    <form id="med-form" novalidate>
      <div class="form-group">
        <label class="form-label" for="mf-name">Medicine Name <span aria-hidden="true" style="color:var(--danger)">*</span></label>
        <input class="form-input" type="text" id="mf-name" placeholder="e.g. Metformin" required
          value="${isEdit ? existingMed.name : ''}" />
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
        <div class="form-group">
          <label class="form-label" for="mf-dosage">Dosage <span aria-hidden="true" style="color:var(--danger)">*</span></label>
          <input class="form-input" type="text" id="mf-dosage" placeholder="e.g. 500 mg"
            value="${isEdit ? existingMed.dosage : ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="mf-purpose">Purpose</label>
          <input class="form-input" type="text" id="mf-purpose" placeholder="e.g. Diabetes"
            value="${isEdit ? (existingMed.purpose || '') : ''}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Dispenser Compartment <span aria-hidden="true" style="color:var(--danger)">*</span></label>
        <div class="compartment-picker" role="group" aria-label="Select compartment" id="comp-picker">
          ${compartments.map(c => `
            <button type="button" class="comp-option ${c === selComp ? 'selected' : ''} ${occupied.includes(c) ? 'occupied' : ''}"
              data-comp="${c}" ${occupied.includes(c) ? 'aria-disabled="true"' : ''} aria-pressed="${c === selComp}">
              ${c}
            </button>`).join('')}
        </div>
        <p class="form-hint">Grey compartments are occupied by other medicines.</p>
      </div>

      <div class="form-group">
        <label class="form-label" for="mf-freq">Frequency</label>
        <select class="form-select" id="mf-freq">
          ${frequencies.map(([v, l]) => `<option value="${v}" ${v === selFreq ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Dose Times</label>
        <div class="time-inputs" id="time-inputs">
          ${selTimes.map((t, i) => `
          <div class="time-input-chip" data-time-index="${i}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <input type="time" value="${t}" aria-label="Dose time ${i+1}" class="dose-time-input" />
            ${i > 0 ? `<button type="button" class="remove-time-btn" data-idx="${i}" aria-label="Remove time" style="background:none;border:none;cursor:pointer;color:var(--text-muted);line-height:1;">✕</button>` : ''}
          </div>`).join('')}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="add-time-btn" style="margin-top:var(--space-2); height:36px; font-size:var(--text-sm);">
          + Add another time
        </button>
      </div>

      <div class="form-group">
        <label class="form-label">Days of Week</label>
        <div class="day-picker" id="day-picker" role="group" aria-label="Select days">
          ${days.map((d, i) => `
          <button type="button" class="day-option ${selDays.includes(i) ? 'selected' : ''}" data-day="${i}" aria-pressed="${selDays.includes(i)}">
            ${d}
          </button>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="mf-instructions">Instructions</label>
        <input class="form-input" type="text" id="mf-instructions" placeholder="e.g. Take with food"
          value="${isEdit ? (existingMed.instructions || '') : ''}" />
      </div>

      <div class="form-group">
        <label class="form-label" for="mf-prescribed">Prescribed By</label>
        <input class="form-input" type="text" id="mf-prescribed" placeholder="Doctor's name"
          value="${isEdit ? (existingMed.prescribedBy || '') : ''}" />
      </div>

      <div style="display:flex; gap:var(--space-3); justify-content:flex-end; flex-wrap:wrap; margin-top:var(--space-4);">
        <button type="button" class="btn btn-secondary" id="med-form-cancel" style="flex:1; max-width:140px;">Cancel</button>
        <button type="submit" class="btn btn-primary" id="med-form-save" style="flex:1; max-width:200px;">
          ${isEdit ? 'Save Changes' : 'Add Medicine'}
        </button>
      </div>
    </form>
  `);

  /* Compartment selection */
  let selectedComp = selComp;
  document.getElementById('comp-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('.comp-option');
    if (!btn || btn.classList.contains('occupied')) return;
    document.querySelectorAll('.comp-option').forEach(b => {
      b.classList.remove('selected');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('selected');
    btn.setAttribute('aria-pressed', 'true');
    selectedComp = btn.dataset.comp;
  });

  /* Day picker */
  let selectedDays = [...selDays];
  document.getElementById('day-picker').addEventListener('click', (e) => {
    const btn = e.target.closest('.day-option');
    if (!btn) return;
    const day = parseInt(btn.dataset.day);
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      selectedDays = selectedDays.filter(d => d !== day);
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    } else {
      selectedDays.push(day);
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
    }
  });

  /* Add time */
  document.getElementById('add-time-btn').addEventListener('click', () => {
    const container = document.getElementById('time-inputs');
    const idx = container.children.length;
    const chip = document.createElement('div');
    chip.className = 'time-input-chip';
    chip.dataset.timeIndex = idx;
    chip.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      <input type="time" value="12:00" aria-label="Dose time ${idx+1}" class="dose-time-input" />
      <button type="button" class="remove-time-btn" data-idx="${idx}" aria-label="Remove time" style="background:none;border:none;cursor:pointer;color:var(--text-muted);line-height:1;">✕</button>
    `;
    container.appendChild(chip);
  });

  /* Remove time */
  document.getElementById('time-inputs').addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-time-btn');
    if (!btn) return;
    btn.closest('.time-input-chip').remove();
  });

  /* Cancel */
  document.getElementById('med-form-cancel').addEventListener('click', () => Modal.close());

  /* Submit */
  document.getElementById('med-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name   = document.getElementById('mf-name').value.trim();
    const dosage = document.getElementById('mf-dosage').value.trim();
    if (!name || !dosage) {
      Toast.show('Please fill in the required fields.', 'error');
      return;
    }
    const times  = [...document.querySelectorAll('.dose-time-input')].map(i => i.value).filter(Boolean);

    const medData = {
      name,
      dosage,
      compartment:  selectedComp,
      color:        compartmentColors[selectedComp] || '#5B8A72',
      purpose:      document.getElementById('mf-purpose').value.trim(),
      frequency:    document.getElementById('mf-freq').value,
      times:        times.length ? times : ['08:00'],
      daysOfWeek:   selectedDays.sort(),
      instructions: document.getElementById('mf-instructions').value.trim(),
      prescribedBy: document.getElementById('mf-prescribed').value.trim(),
    };

    const saveBtn = document.getElementById('med-form-save');
    saveBtn.disabled = true;
    saveBtn.textContent = isEdit ? 'Saving…' : 'Adding…';

    const uid        = AppState.getCurrentUid();
    const isDemoMode = AppState.get('isDemoMode');

    try {
      if (isDemoMode) {
        if (isEdit) {
          AppState.updateMedicine(existingMed.id, medData);
          Toast.show(`${name} updated!`, 'success');
        } else {
          AppState.addMedicine(medData);
          Toast.show(`${name} added!`, 'success');
        }
      } else {
        if (isEdit) {
          await FirebaseDB.updateMedicine(uid, existingMed.id, medData);
          Toast.show(`${name} updated!`, 'success');
        } else {
          await FirebaseDB.addMedicine(uid, medData);
          Toast.show(`${name} added!`, 'success');
        }
      }
      Modal.close();
      /* onSnapshot will refresh the list automatically in real mode */
      if (isDemoMode) {
        _refreshMedUI(AppState.get('medicines'));
      }

      const angleMap = { 'A': 0, 'B': 45, 'C': 90, 'D': 135, 'E': 180 };
      const selectedAngle = angleMap[selectedComp] !== undefined ? angleMap[selectedComp] : 0;
      const selectedTime = times.length ? times[0] : '08:00';
      await updateHardwareSchedule(selectedTime, selectedAngle);
    } catch (err) {
      console.error('Save medicine error:', err);
      Toast.show('Could not save. Please check your connection and try again.', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save Changes' : 'Add Medicine';
    }
  });
}

function openEditMedModal(medId) {
  const med = AppState.get('medicines').find(m => m.id === medId);
  if (med) openAddMedModal(med);
}

function confirmDeleteMed(medId) {
  const med = AppState.get('medicines').find(m => m.id === medId);
  if (!med) return;
  showConfirm(
    'Remove medicine?',
    `Are you sure you want to remove <strong>${med.name}</strong>? Your dose history will be kept.`,
    async () => {
      const uid        = AppState.getCurrentUid();
      const isDemoMode = AppState.get('isDemoMode');
      try {
        if (isDemoMode) {
          AppState.deleteMedicine(medId);
          _refreshMedUI(AppState.get('medicines'));
        } else {
          await FirebaseDB.softDeleteMedicine(uid, medId);
          /* onSnapshot triggers _refreshMedUI automatically */
        }
        Toast.show(`${med.name} removed.`, 'warning');
      } catch (err) {
        console.error('Delete medicine error:', err);
        Toast.show('Could not remove medicine. Please try again.', 'error');
      }
    }
  );
}

function cleanupMedications() {
  AppState.unregisterListener('medications-list');
  _medsUnsub = null;
}
