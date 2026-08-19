/* ═════════════════════════════
   Page: Settings / Profile
   ═════════════════════════════ */

function renderSettings() {
  const profile  = AppState.get('userProfile');
  const isDemoMode = AppState.get('isDemoMode');
  const device   = AppState.get('device') || {};
  const theme    = ThemeManager.current();

  /* Resolve user data — real profile or demo fallback */
  const user = profile || (isDemoMode ? APP_DATA.users.patient : null);
  const name  = user ? (profile ? profile.name  : user.name)  : 'User';
  const email = user ? (profile ? profile.email : user.email) : '';
  const role  = user ? (profile ? (profile.role || 'patient') : 'patient') : 'patient';
  const caregiverEmail = profile ? (profile.caregiverEmail || '') : '';
  const photoURL = profile ? profile.photoURL : null;

  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const avatarHtml = photoURL
    ? `<img src="${photoURL}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : initials;

  return `
<div class="page-enter" id="settings-root">

  <div class="page-header">
    <h1 class="page-title">Profile &amp; Settings</h1>
  </div>

  <!-- Profile Card -->
  <div class="profile-card">
    <div class="avatar avatar-lg" style="background:${photoURL ? 'transparent' : 'var(--accent)'};" aria-hidden="true">${avatarHtml}</div>
    <div class="profile-info">
      <div class="profile-name" id="profile-display-name">${name}</div>
      <div class="profile-role">${role === 'caregiver' ? 'Caregiver' : 'Patient'}</div>
      <div class="profile-email">${email}</div>
      ${isDemoMode ? `<span class="badge badge-info" style="margin-top:var(--space-2);">Demo Mode</span>` : ''}
    </div>
    <button class="btn btn-secondary btn-sm" id="edit-profile-btn" aria-label="Edit profile">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      Edit
    </button>
  </div>

  <!-- Edit Profile Form (hidden by default) -->
  <div id="edit-profile-form" style="display:none;" class="settings-section">
    <div class="settings-section-title">Edit Profile</div>
    <div class="settings-card" style="padding:var(--space-5);">
      <div class="form-group">
        <label class="form-label" for="pf-name">Display Name</label>
        <input class="form-input" type="text" id="pf-name" value="${name}" placeholder="Your name" />
      </div>
      <div class="form-group">
        <label class="form-label" for="pf-role">Role</label>
        <select class="form-select" id="pf-role">
          <option value="patient"   ${role === 'patient'   ? 'selected' : ''}>Patient</option>
          <option value="caregiver" ${role === 'caregiver' ? 'selected' : ''}>Caregiver</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="pf-caregiver-email">Linked Caregiver Email <span style="color:var(--text-muted); font-weight:400;">(optional)</span></label>
        <input class="form-input" type="email" id="pf-caregiver-email"
          value="${caregiverEmail}" placeholder="caregiver@example.com" />
      </div>
      <div style="display:flex; gap:var(--space-3); justify-content:flex-end; margin-top:var(--space-4);">
        <button class="btn btn-secondary" id="cancel-profile-edit" style="min-width:100px;">Cancel</button>
        <button class="btn btn-primary" id="save-profile-btn" style="min-width:140px;">Save Changes</button>
      </div>
    </div>
  </div>

  <!-- Appearance -->
  <div class="settings-section">
    <div class="settings-section-title">Appearance</div>
    <div class="settings-card" style="padding:0 var(--space-5);">
      <div class="toggle-wrap">
        <div class="toggle-info">
          <div class="toggle-label">Dark Mode</div>
          <div class="toggle-desc">Switch between light and dark theme</div>
        </div>
        <label class="toggle-switch" aria-label="Toggle dark mode">
          <input type="checkbox" id="theme-toggle-settings" ${theme === 'dark' ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <!-- Notification Preferences -->
  <div class="settings-section">
    <div class="settings-section-title">Notifications</div>
    <div class="settings-card" style="padding:0 var(--space-5);">
      ${notifToggle('Email reminders',   'Receive dose reminders via email',              'notif-email',  true)}
      ${notifToggle('SMS reminders',     'Get text alerts for each dose',                  'notif-sms',    true)}
      ${notifToggle('Push notifications','In-app reminder notifications',                  'notif-push',   true)}
      ${notifToggle('Missed dose alerts','Alert me and caregiver when a dose is missed',   'notif-missed', true)}
      ${notifToggle('Weekly report',     'Sunday summary of your adherence',               'notif-weekly', true)}
    </div>
  </div>

  <!-- Reminder Lead Time -->
  <div class="settings-section">
    <div class="settings-section-title">Reminder Timing</div>
    <div class="settings-card" style="padding:var(--space-5);">
      <div class="form-group" style="margin:0;">
        <label class="form-label" for="lead-time">Remind me before each dose</label>
        <select class="form-select" id="lead-time">
          <option value="5">5 minutes before</option>
          <option value="10">10 minutes before</option>
          <option value="15">15 minutes before</option>
          <option value="30" selected>30 minutes before</option>
          <option value="60">1 hour before</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Connected Device -->
  <div class="settings-section">
    <div class="settings-section-title">Connected Device</div>
    <div class="settings-card">
      <div class="device-card" style="padding:var(--space-5);">
        <div class="device-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
        </div>
        <div class="device-info">
          <div class="device-name">${device.name || 'No device paired'}</div>
          <div class="device-status">
            <span class="status-dot ${device.connected ? '' : 'offline'}" aria-hidden="true"></span>
            ${device.connected ? 'Connected' : 'Offline'}${device.id ? ` · ID: ${device.id}` : ''}
          </div>
          ${device.wifiStrength ? `<div style="font-size:var(--text-xs); color:var(--text-muted); margin-top:2px;">Wi-Fi: ${device.wifiStrength} · Firmware v${device.firmware || '—'}</div>` : ''}
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <div style="font-size:var(--text-sm); font-weight:600;">🔋 ${device.battery || '—'}%</div>
          <button class="btn btn-secondary btn-sm" id="sync-device-btn" style="margin-top:var(--space-2);">Sync now</button>
        </div>
      </div>
      <div style="margin:0 var(--space-5) var(--space-5); padding:var(--space-4); background:var(--accent-soft); border-radius:var(--radius-md);">
        <div style="font-size:var(--text-sm); font-weight:600; color:var(--accent); margin-bottom:var(--space-2);">Pair a new device</div>
        <div style="font-size:var(--text-sm); color:var(--text-secondary); line-height:var(--leading-snug);">
          To pair your ESP32 dispenser: hold the pairing button for 3 seconds, then tap "Pair Device" below. Make sure you're connected to the same Wi-Fi network.
        </div>
        <button class="btn btn-secondary btn-sm" id="pair-device-btn" style="margin-top:var(--space-3);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
          Pair Device
        </button>
      </div>
    </div>
  </div>

  <!-- Security -->
  <div class="settings-section">
    <div class="settings-section-title">Security</div>
    <div class="settings-card">
      ${settingsRow('shield', 'Two-Factor Authentication', 'Off')}
      ${settingsRow('download', 'Export Health Data', 'CSV / JSON')}
    </div>
  </div>

  <!-- Account / Sign Out -->
  <div class="settings-section">
    <div class="settings-section-title">Account</div>
    <div class="danger-zone">
      <div class="danger-zone-text">
        <div class="danger-zone-title">Sign Out</div>
        <div class="danger-zone-desc">You will be returned to the welcome screen.</div>
      </div>
      <button class="btn btn-danger btn-sm" id="logout-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </button>
    </div>
  </div>

</div>
  `;
}

function settingsRow(iconName, label, value) {
  const icons = {
    calendar:   '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
    phone:      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.7 14.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 3.5h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 11.1a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
    'map-pin':  '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    user:       '<circle cx="12" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2"/>',
    lock:       '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    shield:     '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    download:   '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  };
  const path = icons[iconName] || icons.user;
  return `
  <div class="settings-row">
    <div class="settings-row-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>
    </div>
    <span class="settings-row-label">${label}</span>
    ${value ? `<span class="settings-row-value">${value}</span>` : ''}
    <svg class="settings-row-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
  </div>`;
}

function notifToggle(label, desc, id, checked) {
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

function initSettings() {
  const uid        = AppState.getCurrentUid();
  const isDemoMode = AppState.get('isDemoMode');

  /* ── Edit profile toggle ── */
  document.getElementById('edit-profile-btn').addEventListener('click', () => {
    const form = document.getElementById('edit-profile-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('cancel-profile-edit').addEventListener('click', () => {
    document.getElementById('edit-profile-form').style.display = 'none';
  });

  document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const newName           = document.getElementById('pf-name').value.trim();
    const newRole           = document.getElementById('pf-role').value;
    const newCaregiverEmail = document.getElementById('pf-caregiver-email').value.trim();

    if (!newName) {
      Toast.show('Name cannot be empty.', 'error');
      return;
    }

    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving…';

    const updates = { name: newName, role: newRole, caregiverEmail: newCaregiverEmail };

    if (isDemoMode) {
      /* Demo: update local state only */
      const existing = AppState.get('userProfile') || {};
      AppState.setUserProfile({ ...existing, ...updates });
      Toast.show('Profile updated!', 'success');
      document.getElementById('edit-profile-form').style.display = 'none';
      document.getElementById('profile-display-name').textContent = newName;
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Save Changes';
      return;
    }

    try {
      await FirebaseDB.updateUserProfile(uid, updates);
      const updatedProfile = { ...AppState.get('userProfile'), ...updates };
      AppState.setUserProfile(updatedProfile);
      Toast.show('Profile updated!', 'success');
      document.getElementById('edit-profile-form').style.display = 'none';
      document.getElementById('profile-display-name').textContent = newName;
    } catch (err) {
      console.error('Profile update error:', err);
      Toast.show('Could not save changes. Please try again.', 'error');
    } finally {
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Save Changes';
    }
  });

  /* ── Notification toggles ── */
  document.querySelectorAll('.toggle-switch input:not(#theme-toggle-settings)').forEach(t => {
    t.addEventListener('change', () => {
      Toast.show(t.checked ? 'Notification enabled.' : 'Notification disabled.', t.checked ? 'success' : 'info');
    });
  });

  /* ── Lead time ── */
  document.getElementById('lead-time').addEventListener('change', (e) => {
    Toast.show(`Reminder set for ${e.target.value} minutes before dose.`, 'success');
  });

  /* ── Theme toggle in settings ── */
  const themeCheckbox = document.getElementById('theme-toggle-settings');
  if (themeCheckbox) {
    themeCheckbox.addEventListener('change', () => {
      ThemeManager.toggle();
    });
    const updateThemeCheck = () => {
      if (themeCheckbox) themeCheckbox.checked = ThemeManager.current() === 'dark';
    };
    const syncInterval = setInterval(updateThemeCheck, 500);
    themeCheckbox._syncInterval = syncInterval;
  }

  /* ── Device buttons ── */
  document.getElementById('sync-device-btn').addEventListener('click', (e) => {
    e.target.textContent = 'Syncing…';
    e.target.disabled = true;
    setTimeout(() => {
      e.target.textContent = 'Sync now';
      e.target.disabled = false;
      Toast.show('Device synced successfully!', 'success');
    }, 1500);
  });

  document.getElementById('pair-device-btn').addEventListener('click', () => {
    Toast.show('Scanning for nearby dispensers…', 'info');
  });

  /* ── Settings rows ── */
  document.querySelectorAll('.settings-row').forEach(row => {
    row.addEventListener('click', () => {
      Toast.show('This feature is coming soon!', 'info');
    });
  });

  /* ── Sign Out ── */
  document.getElementById('logout-btn').addEventListener('click', () => {
    showConfirm('Sign out?', 'You will be returned to the welcome screen.', () => {
      AppState.logout(); /* handles both demo and real Firebase sign-out */
    });
  });
}

function cleanupSettings() {
  const themeCheckbox = document.getElementById('theme-toggle-settings');
  if (themeCheckbox && themeCheckbox._syncInterval) {
    clearInterval(themeCheckbox._syncInterval);
  }
}
