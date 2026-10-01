/* ═══════════════════════════════════════════════
   PillSync — Shared Components (JS)
   Modal, Toast, Status helpers, SVG icons
   ═══════════════════════════════════════════════ */

/* ─── Status helpers ─── */
const StatusConfig = {
  taken:      { label: 'Taken',      icon: '✓', cssClass: 'badge-taken',      dotClass: 'dot-taken',    emoji: '✅' },
  missed:     { label: 'Missed',     icon: '✕', cssClass: 'badge-missed',     dotClass: 'dot-missed',   emoji: '❌' },
  upcoming:   { label: 'Upcoming',   icon: '◷', cssClass: 'badge-upcoming',   dotClass: 'dot-upcoming', emoji: '🕐' },
  late:       { label: 'Late',       icon: '⚠', cssClass: 'badge-late',       dotClass: 'dot-late',     emoji: '⚠️' },
  skipped:    { label: 'Skipped',    icon: '—', cssClass: 'badge-skipped',    dotClass: '',             emoji: '⏭' },
  /* ESP32 dispenser statuses */
  dispensed:  { label: 'Dispensed',  icon: '💊', cssClass: 'badge-taken',     dotClass: 'dot-taken',    emoji: '💊' },
  dispensing: { label: 'Dispensing', icon: '⚙', cssClass: 'badge-upcoming',  dotClass: 'dot-upcoming', emoji: '⚙️' },
  due:        { label: 'Due',        icon: '🔔', cssClass: 'badge-late',      dotClass: 'dot-late',     emoji: '🔔' },
};

function getStatusBadge(status) {
  const s = StatusConfig[status] || StatusConfig.upcoming;
  return `<span class="badge ${s.cssClass}" aria-label="${s.label}">
    <span aria-hidden="true">${s.icon}</span> ${s.label}
  </span>`;
}

function getMedicineById(id) {
  return AppState.get('medicines').find(m => m.id === id) || null;
}

/* ─── Time formatting ─── */
function formatTime12(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')} ${period}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTimeUntil(time24) {
  const [h, m] = time24.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target <= now) return null;
  const diffMs = target - now;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin} min`;
  const hr = Math.floor(diffMin / 60);
  const mn = diffMin % 60;
  return mn > 0 ? `${hr} hr ${mn} min` : `${hr} hr`;
}

/* ─── Frequency label ─── */
function freqLabel(freq) {
  const map = {
    'once-daily':   'Once daily',
    'twice-daily':  'Twice daily',
    'three-daily':  'Three times daily',
    'as-needed':    'As needed',
    'weekly':       'Weekly',
  };
  return map[freq] || freq;
}

/* ─── Compartment colors ─── */
const compartmentColors = {
  A: '#5B8A72',
  B: '#5B85C4',
  C: '#E8B84B',
  D: '#D96C5A',
  E: '#9B6FBF',
  F: '#7ABFB8',
};

/* ══════════════════════════════════════
   MODAL
   ══════════════════════════════════════ */
const Modal = (() => {
  const overlay   = document.getElementById('modal-overlay');
  const box       = document.getElementById('modal-box');
  const inner     = document.getElementById('modal-inner');
  let _onClose    = null;
  let _focusTrap  = null;
  let _prevFocus  = null;

  function open(htmlContent, onClose) {
    inner.innerHTML = `
      <div class="modal-handle" aria-hidden="true"></div>
      ${htmlContent}
    `;
    overlay.removeAttribute('aria-hidden');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    _onClose = onClose || null;
    _prevFocus = document.activeElement;

    /* Focus first focusable element */
    requestAnimationFrame(() => {
      const focusable = box.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    });

    /* Close on overlay click */
    overlay.addEventListener('click', _overlayClick);
    document.addEventListener('keydown', _keydown);
  }

  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { inner.innerHTML = ''; }, 280);
    overlay.removeEventListener('click', _overlayClick);
    document.removeEventListener('keydown', _keydown);
    if (_prevFocus) _prevFocus.focus();
    if (_onClose) _onClose();
    _onClose = null;
  }

  function _overlayClick(e) {
    if (e.target === overlay) close();
  }

  function _keydown(e) {
    if (e.key === 'Escape') close();
  }

  return { open, close };
})();

/* ══════════════════════════════════════
   TOAST
   ══════════════════════════════════════ */
const Toast = (() => {
  const container = document.getElementById('toast-container');

  function show(message, type = 'info', duration = 3500) {
    const iconMap = {
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>',
      error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${iconMap[type] || iconMap.info}</span>
      <span>${message}</span>
    `;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = 'opacity 200ms, transform 200ms';
      setTimeout(() => el.remove(), 220);
    }, duration);
  }

  return { show };
})();

/* ══════════════════════════════════════
   CONFIRM DIALOG
   ══════════════════════════════════════ */
function showConfirm(title, message, onConfirm) {
  Modal.open(`
    <h2 class="modal-title" id="modal-title">${title}</h2>
    <p style="color:var(--text-secondary); margin-bottom:var(--space-6); line-height:var(--leading-normal);">${message}</p>
    <div style="display:flex; gap:var(--space-3); justify-content:flex-end; flex-wrap:wrap;">
      <button class="btn btn-secondary" id="confirm-cancel" style="min-width:100px;">Cancel</button>
      <button class="btn btn-danger"    id="confirm-ok"     style="min-width:100px;">Confirm</button>
    </div>
  `);
  document.getElementById('confirm-cancel').addEventListener('click', () => Modal.close());
  document.getElementById('confirm-ok').addEventListener('click', () => {
    Modal.close();
    onConfirm();
  });
}

/* ══════════════════════════════════════
   BADGE DOT UPDATE
   ══════════════════════════════════════ */
function updateBadges() {
  const count = AppState.get('unreadReminders');
  ['bnav-badge', 'sidebar-dot'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (count > 0) {
      el.classList.remove('hidden');
      if (id === 'bnav-badge') el.textContent = count;
    } else {
      el.classList.add('hidden');
    }
  });
}
