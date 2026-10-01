/* ═══════════════════════════════════════════════
   Page: Dispenser (ESP32 Control Panel)
   ═══════════════════════════════════════════════
   IMPORTANT: This page only handles communication
   through Firestore. It does NOT contain any
   motor-control logic. The ESP32 firmware handles
   all physical operations.
   ═══════════════════════════════════════════════ */

let _dispenserStatusUnsub  = null;
let _dispenserCommandUnsub = null;

/* ─── Device offline threshold: >90 seconds without a heartbeat ─── */
const OFFLINE_THRESHOLD_MS = 90 * 1000;

/* ─── Dispense command status labels ─── */
const CMD_STATUS = {
  pending:   { label: 'Pending',   cls: 'badge-upcoming', icon: '⏳' },
  executing: { label: 'Executing', cls: 'badge-late',     icon: '⚙️' },
  done:      { label: 'Done',      cls: 'badge-taken',    icon: '✅' },
  failed:    { label: 'Failed',    cls: 'badge-missed',   icon: '❌' },
};

/* ══════════════════════════════════════════════════════════════
   RENDER
   ══════════════════════════════════════════════════════════════ */
function renderDispenser() {
  return `
<div class="page-enter" id="dispenser-root">

  <div class="page-header">
    <h1 class="page-title">Dispenser Control</h1>
    <p class="page-subtitle">ESP32 device status &amp; manual dispense</p>
  </div>

  <!-- ─── Device Status Card ─── -->
  <div class="content-section">
    <h2 class="section-title" style="margin-bottom:var(--space-3);">Device Status</h2>
    <div class="card" id="device-status-card">
      <div style="display:flex; align-items:center; gap:var(--space-4); padding:var(--space-5);">
        <div class="skeleton" style="width:48px;height:48px;border-radius:50%;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div class="skeleton" style="height:18px;width:160px;border-radius:6px;margin-bottom:8px;"></div>
          <div class="skeleton" style="height:14px;width:220px;border-radius:6px;"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── Manual Test Dispense ─────────────────────────────────
       NOTE: This section is SEPARATE from the automatic scheduled
       dispensing that the ESP32 handles autonomously.
       ─────────────────────────────────────────────────────────── -->
  <div class="content-section">
    <div class="section-header">
      <div>
        <h2 class="section-title">Manual Test Dispense</h2>
        <p class="section-subtitle" style="color:var(--text-muted);">
          Send a one-off command to the ESP32 — for calibration &amp; testing only
        </p>
      </div>
    </div>

    <div class="card" style="padding:var(--space-5);">
      <div style="background:var(--accent-soft); border-radius:var(--radius-md); padding:var(--space-3) var(--space-4); margin-bottom:var(--space-5); display:flex; align-items:flex-start; gap:var(--space-3);">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" style="flex-shrink:0;margin-top:1px;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <p style="font-size:var(--text-sm); color:var(--accent); line-height:var(--leading-snug); margin:0;">
          This sends a command through Firestore → Wi-Fi → ESP32. The ESP32 must be online and connected.
          Normal scheduled dispensing runs automatically on the ESP32 and does not require this panel.
        </p>
      </div>

      <form id="dispense-form" novalidate>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); margin-bottom:var(--space-4);">
          <div class="form-group" style="margin:0;">
            <label class="form-label" for="disp-compartment">
              Compartment <span style="color:var(--danger)" aria-hidden="true">*</span>
            </label>
            <select class="form-select" id="disp-compartment">
              <option value="">Select compartment…</option>
              <option value="1">Compartment 1</option>
              <option value="2">Compartment 2</option>
              <option value="3">Compartment 3</option>
              <option value="4">Compartment 4</option>
              <option value="5">Compartment 5</option>
              <option value="6">Compartment 6</option>
              <option value="7">Compartment 7</option>
            </select>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label" for="disp-dosage">Pills to Dispense</label>
            <input class="form-input" type="number" id="disp-dosage" min="1" max="10" value="1" />
          </div>
        </div>

        <!-- Auto-populate from medicines -->
        <div class="form-group">
          <label class="form-label" for="disp-medicine">Medication (optional)</label>
          <select class="form-select" id="disp-medicine">
            <option value="">— None / custom test —</option>
          </select>
          <p class="form-hint">Selecting a medicine auto-fills compartment &amp; dosage.</p>
        </div>

        <div style="display:flex; gap:var(--space-3); align-items:center; flex-wrap:wrap;">
          <button type="submit" class="btn btn-primary" id="dispense-btn" style="min-width:180px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Test Dispense
          </button>
          <span id="dispense-hint" style="font-size:var(--text-sm); color:var(--text-muted);">
            Command will be sent to ESP32 via Firestore
          </span>
        </div>
      </form>
    </div>
  </div>

  <!-- ─── Command History (real-time) ─── -->
  <div class="content-section">
    <div class="section-header">
      <h2 class="section-title">Command History</h2>
      <span style="font-size:var(--text-xs); color:var(--text-muted); align-self:center;">Live updates</span>
    </div>
    <div id="command-history-list">
      ${[1,2,3].map(() => `<div class="skeleton" style="height:64px;border-radius:var(--radius-lg);margin-bottom:var(--space-2);"></div>`).join('')}
    </div>
  </div>

</div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   DEVICE STATUS CARD
   ══════════════════════════════════════════════════════════════ */
function _renderDeviceStatusCard(device) {
  if (!device) {
    return `
    <div style="padding:var(--space-5); display:flex; flex-direction:column; align-items:center; gap:var(--space-3); text-align:center;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      <div style="color:var(--text-muted); font-size:var(--text-sm);">No device registered yet.</div>
      <div style="font-size:var(--text-xs); color:var(--text-muted); max-width:340px; line-height:var(--leading-snug);">
        Flash the ESP32 firmware and it will register automatically when it connects to Wi-Fi and Firebase.
      </div>
    </div>`;
  }

  const now       = Date.now();
  const lastSeen  = device.lastSeen?.toMillis ? device.lastSeen.toMillis()
                  : (device.lastSeen?.seconds  ? device.lastSeen.seconds * 1000 : 0);
  const isOnline  = lastSeen > 0 && (now - lastSeen) < OFFLINE_THRESHOLD_MS;
  const agoMs     = now - lastSeen;
  const agoStr    = lastSeen === 0 ? 'Never'
    : agoMs < 60000   ? 'Just now'
    : agoMs < 3600000 ? `${Math.floor(agoMs / 60000)} min ago`
    : `${Math.floor(agoMs / 3600000)} hr ago`;

  const statusStr = device.status || 'idle';
  const statusBadge = statusStr === 'dispensing'
    ? `<span class="badge badge-upcoming">⚙️ Dispensing</span>`
    : statusStr === 'error'
    ? `<span class="badge badge-missed">⚠️ Error</span>`
    : `<span class="badge ${isOnline ? 'badge-taken' : 'badge-missed'}">${isOnline ? '● Idle' : '● Offline'}</span>`;

  return `
  <div style="padding:var(--space-5);">
    <div style="display:flex; align-items:center; gap:var(--space-4); flex-wrap:wrap;">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      </div>
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:var(--text-base); margin-bottom:4px;">ESP32 Pill Dispenser</div>
        <div style="font-size:var(--text-sm); color:var(--text-muted);">
          ID: ${device.id || '—'} &nbsp;·&nbsp;
          Firmware: v${device.firmwareVersion || '—'} &nbsp;·&nbsp;
          Wi-Fi: ${device.wifiRSSI ? `${device.wifiRSSI} dBm` : '—'}
        </div>
      </div>
      <div style="flex-shrink:0; text-align:right;">
        ${statusBadge}
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:4px;">
          Last seen: ${agoStr}
        </div>
      </div>
    </div>

    <div style="margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--border-light);
         display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:var(--space-3);">
      <div style="background:var(--bg-raised);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-bottom:2px;">Connection</div>
        <div style="font-weight:600; font-size:var(--text-sm); color:${isOnline ? 'var(--success)' : 'var(--danger)'};">
          ${isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>
      <div style="background:var(--bg-raised);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-bottom:2px;">Current Compartment</div>
        <div style="font-weight:600; font-size:var(--text-sm);">${device.currentCompartment ?? '—'}</div>
      </div>
      <div style="background:var(--bg-raised);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-bottom:2px;">Last Dispense</div>
        <div style="font-weight:600; font-size:var(--text-sm);">${_formatTimestamp(device.lastDispense)}</div>
      </div>
      <div style="background:var(--bg-raised);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;">
        <div style="font-size:var(--text-xs); color:var(--text-muted); margin-bottom:2px;">Status</div>
        <div style="font-weight:600; font-size:var(--text-sm); text-transform:capitalize;">${statusStr}</div>
      </div>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   COMMAND HISTORY
   ══════════════════════════════════════════════════════════════ */
function _renderCommandHistory(commands) {
  if (!commands || commands.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </div>
      <p class="empty-state-title">No commands sent yet</p>
      <p class="empty-state-desc">Use the Test Dispense form above to send your first command.</p>
    </div>`;
  }

  return commands.map(cmd => {
    const cfg   = CMD_STATUS[cmd.status] || CMD_STATUS.pending;
    const tsMs  = cmd.createdAt?.toMillis ? cmd.createdAt.toMillis()
                : (cmd.createdAt?.seconds  ? cmd.createdAt.seconds * 1000 : 0);
    const timeStr = tsMs > 0 ? new Date(tsMs).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—';

    return `
    <div class="history-dose-row" style="margin-bottom:var(--space-2);">
      <div class="history-dose-icon" style="background:var(--bg-raised);" aria-hidden="true">
        <span role="img" aria-label="${cfg.label}">${cfg.icon}</span>
      </div>
      <div class="history-dose-info">
        <div class="history-dose-name">
          Compartment ${cmd.compartment} · ${cmd.dosage ?? 1} pill${(cmd.dosage || 1) > 1 ? 's' : ''}
          ${cmd.medicineName ? `<span style="color:var(--text-muted); font-weight:400;"> — ${cmd.medicineName}</span>` : ''}
        </div>
        <div class="history-dose-time">
          ${cmd.type === 'manual' ? 'Manual' : 'Scheduled'} · ${timeStr}
          ${cmd.result ? ` · ${cmd.result}` : ''}
        </div>
      </div>
      <span class="badge ${cfg.cls}" aria-label="${cfg.label}">${cfg.label}</span>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */
function initDispenser() {
  const uid        = AppState.getCurrentUid();
  const isDemoMode = AppState.get('isDemoMode');

  if (isDemoMode) {
    _renderDemoDispenserStatus();
    _populateMedicineDropdown();
    _wireForms(null);
    return;
  }

  if (!uid) {
    window.location.hash = '#landing';
    return;
  }

  /* ── Subscribe to device status ── */
  const deviceId = _getDeviceId();
  if (deviceId) {
    _dispenserStatusUnsub = FirebaseDB.getDeviceStatus(deviceId, (err, device) => {
      const card = document.getElementById('device-status-card');
      if (!card) return;
      if (err) {
        card.innerHTML = `<div style="padding:var(--space-5);color:var(--danger);font-size:var(--text-sm);">Could not load device status.</div>`;
        return;
      }
      card.innerHTML = _renderDeviceStatusCard(device);
    });
    AppState.registerListener('dispenser-status', _dispenserStatusUnsub);
  } else {
    const card = document.getElementById('device-status-card');
    if (card) card.innerHTML = _renderDeviceStatusCard(null);
  }

  /* ── Subscribe to command history ── */
  _dispenserCommandUnsub = FirebaseDB.listenDispenseCommands(uid, (err, commands) => {
    const el = document.getElementById('command-history-list');
    if (!el) return;
    el.innerHTML = err ? `<div style="color:var(--danger);font-size:var(--text-sm);padding:var(--space-3);">Could not load command history.</div>`
                       : _renderCommandHistory(commands);
  });
  AppState.registerListener('dispenser-commands', _dispenserCommandUnsub);

  /* ── Populate medicine dropdown & wire form ── */
  _populateMedicineDropdown();
  _wireForms(uid);
}

function _renderDemoDispenserStatus() {
  /* Demo: show a mock online device */
  const card = document.getElementById('device-status-card');
  if (card) {
    const mockDevice = {
      id:               'ESP32-DEMO',
      firmwareVersion:  '1.0.0-demo',
      wifiRSSI:         -55,
      status:           'idle',
      currentCompartment: 1,
      lastSeen:         { toMillis: () => Date.now() - 15000 },
      lastDispense:     { toMillis: () => Date.now() - 3600000 },
    };
    card.innerHTML = _renderDeviceStatusCard(mockDevice);
  }
  const histEl = document.getElementById('command-history-list');
  if (histEl) histEl.innerHTML = _renderCommandHistory([]);
}

function _populateMedicineDropdown() {
  const sel = document.getElementById('disp-medicine');
  if (!sel) return;
  const medicines = AppState.get('medicines') || [];
  medicines.forEach(med => {
    const opt = document.createElement('option');
    opt.value       = med.id;
    opt.textContent = `${med.name} — Compartment ${med.compartment}`;
    opt.dataset.compartment = med.compartment;
    opt.dataset.dosage      = typeof med.dosage === 'number' ? med.dosage : 1;
    sel.appendChild(opt);
  });

  /* Auto-fill compartment + dosage when a medicine is selected */
  sel.addEventListener('change', () => {
    const opt = sel.selectedOptions[0];
    if (!opt || !opt.value) return;
    const comp = opt.dataset.compartment;
    /* Compartments are letters A-F; dispenser uses numbers 1-7 */
    const compNum = _compartmentLetterToNumber(comp);
    const compSel = document.getElementById('disp-compartment');
    if (compSel && compNum) compSel.value = String(compNum);
    const dosageInput = document.getElementById('disp-dosage');
    if (dosageInput && opt.dataset.dosage) dosageInput.value = opt.dataset.dosage;
  });
}

function _wireForms(uid) {
  const form = document.getElementById('dispense-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const compartmentStr = document.getElementById('disp-compartment').value;
    const dosageStr      = document.getElementById('disp-dosage').value;
    const medSel         = document.getElementById('disp-medicine');
    const selectedOpt    = medSel?.selectedOptions[0];

    if (!compartmentStr) {
      Toast.show('Please select a compartment.', 'error');
      return;
    }

    const compartment  = parseInt(compartmentStr, 10);
    const dosage       = Math.max(1, parseInt(dosageStr, 10) || 1);
    const medicineId   = selectedOpt?.value   || '';
    const medicineName = selectedOpt?.value
      ? (AppState.get('medicines') || []).find(m => m.id === selectedOpt.value)?.name || ''
      : '';

    const btn  = document.getElementById('dispense-btn');
    const hint = document.getElementById('dispense-hint');

    btn.disabled = true;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"
           style="animation:spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
      Sending…`;
    if (hint) hint.textContent = 'Writing command to Firestore…';

    /* Demo mode: simulate without Firestore */
    if (AppState.get('isDemoMode')) {
      await new Promise(r => setTimeout(r, 1000));
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Test Dispense`;
      if (hint) hint.textContent = '[Demo] Command would be sent to ESP32 via Firestore';
      Toast.show('Demo: command simulated. In real mode this writes to Firestore.', 'info');
      return;
    }

    try {
      await FirebaseDB.sendDispenseCommand(uid, { compartment, dosage, medicineId, medicineName });
      Toast.show('✓ Dispense command sent! Waiting for ESP32 to execute…', 'success');
      if (hint) hint.textContent = 'Command sent — watch the history below for the result.';
    } catch (err) {
      console.error('sendDispenseCommand error:', err);
      Toast.show('Could not send command. Check your connection.', 'error');
      if (hint) hint.textContent = 'Failed to send command.';
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Test Dispense`;
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */

/** Map compartment letter (A-F) to number (1-6) for ESP32 */
function _compartmentLetterToNumber(letter) {
  const map = { A:1, B:2, C:3, D:4, E:5, F:6, G:7 };
  return map[String(letter).toUpperCase()] || null;
}

/** Retrieve the stored device ID for the current user */
function _getDeviceId() {
  const profile = AppState.get('userProfile');
  return profile?.deviceId || null;
}

function _formatTimestamp(ts) {
  if (!ts) return 'Never';
  const ms = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : 0);
  if (!ms) return 'Never';
  const ago = Date.now() - ms;
  if (ago < 60000)   return 'Just now';
  if (ago < 3600000) return `${Math.floor(ago / 60000)} min ago`;
  if (ago < 86400000)return `${Math.floor(ago / 3600000)} hr ago`;
  return new Date(ms).toLocaleDateString('en-IN', { month:'short', day:'numeric' });
}

/* ══════════════════════════════════════════════════════════════
   CLEANUP
   ══════════════════════════════════════════════════════════════ */
function cleanupDispenser() {
  AppState.unregisterListener('dispenser-status');
  AppState.unregisterListener('dispenser-commands');
  _dispenserStatusUnsub  = null;
  _dispenserCommandUnsub = null;
}
