/* ═════════════════════════════
   Page: Auth (Login / Sign Up)
   ═════════════════════════════ */

function renderAuth(mode = 'login') {
  const isLogin = mode === 'login';

  return `
<div class="auth-page page-enter">

  <button class="auth-back-btn" id="auth-back-btn" aria-label="Go back">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
    Back
  </button>

  <div class="auth-card">

    <!-- Logo -->
    <div class="auth-logo">
      <svg width="36" height="36" viewBox="0 0 38 38" fill="none" aria-hidden="true">
        <rect width="38" height="38" rx="11" fill="var(--accent)"/>
        <ellipse cx="19" cy="19" rx="9.5" ry="5.8" transform="rotate(45 19 19)" fill="white" opacity="0.95"/>
        <ellipse cx="19" cy="19" rx="4.8" ry="5.8" transform="rotate(45 19 19)" fill="var(--accent)"/>
      </svg>
      <span class="auth-logo-name">PillSync</span>
    </div>

    <h1 class="auth-title">${isLogin ? 'Welcome back' : 'Create account'}</h1>
    <p class="auth-subtitle">${isLogin ? 'Sign in to manage your medications' : 'Start managing your health today'}</p>

    <!-- Role Selector -->
    <div class="role-selector" role="group" aria-label="Account type">
      <button class="role-option selected" id="role-patient" data-role="patient" type="button">
        <div class="role-option-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2"/></svg>
        </div>
        <span class="role-option-name">Patient</span>
        <span class="role-option-desc">Manage my meds</span>
      </button>
      <button class="role-option" id="role-caregiver" data-role="caregiver" type="button">
        <div class="role-option-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <span class="role-option-name">Caregiver</span>
        <span class="role-option-desc">Monitor my patient</span>
      </button>
    </div>

    <!-- Form -->
    <form id="auth-form" novalidate>

      ${!isLogin ? `
      <div class="form-group">
        <label class="form-label" for="auth-name">Full Name</label>
        <input class="form-input" type="text" id="auth-name" name="name"
          placeholder="e.g. Mary Johnson" autocomplete="name" required />
      </div>
      ` : ''}

      <div class="form-group">
        <label class="form-label" for="auth-email">Email Address</label>
        <input class="form-input" type="email" id="auth-email" name="email"
          placeholder="you@example.com" autocomplete="email" required />
      </div>

      <div class="form-group">
        <label class="form-label" for="auth-password">Password</label>
        <div style="position:relative;">
          <input class="form-input" type="password" id="auth-password" name="password"
            placeholder="${isLogin ? 'Enter your password' : 'Create a strong password'}"
            autocomplete="${isLogin ? 'current-password' : 'new-password'}" required
            style="padding-right: 52px;" />
          <button type="button" id="toggle-pw" class="icon-btn" aria-label="Show or hide password"
            style="position:absolute; right:4px; top:50%; transform:translateY(-50%); color:var(--text-muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      ${!isLogin ? `
      <div class="form-group">
        <label class="form-label" for="auth-phone">Phone (optional)</label>
        <input class="form-input" type="tel" id="auth-phone" name="phone"
          placeholder="+1 (555) 000-0000" autocomplete="tel" />
      </div>
      ` : ''}

      <button type="submit" class="btn btn-primary btn-full" id="auth-submit" style="margin-top:var(--space-2);">
        ${isLogin ? 'Sign In' : 'Create Account'}
      </button>

    </form>

    <p class="auth-switch">
      ${isLogin
        ? `Don't have an account? <button class="auth-link" id="auth-switch-btn">Sign up</button>`
        : `Already have an account? <button class="auth-link" id="auth-switch-btn">Log in</button>`
      }
    </p>

    <div class="auth-demo-note">
      <strong>Demo mode:</strong> No real credentials needed — just click "Sign In" or enter anything.
    </div>

  </div>

  <!-- Theme toggle for auth page -->
  <div style="margin-top:var(--space-6);">
    <button class="icon-btn theme-toggle" aria-label="Toggle dark/light mode" style="margin:0 auto;">
      <svg class="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <svg class="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>
  </div>

</div>
  `;
}

function initAuth(mode) {
  let selectedRole = 'patient';

  /* Back button */
  document.getElementById('auth-back-btn').addEventListener('click', () => {
    window.location.hash = '#landing';
  });

  /* Role selector */
  document.querySelectorAll('.role-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedRole = btn.dataset.role;
    });
  });

  /* Password toggle */
  document.getElementById('toggle-pw').addEventListener('click', () => {
    const pw = document.getElementById('auth-password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  });

  /* Switch mode link */
  document.getElementById('auth-switch-btn').addEventListener('click', () => {
    window.location.hash = mode === 'login' ? '#signup' : '#login';
  });

  /* Form submit — demo mode, no real validation */
  document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('auth-submit');
    btn.textContent = 'Signing in…';
    btn.disabled = true;
    setTimeout(() => {
      AppState.login(selectedRole);
      window.location.hash = selectedRole === 'caregiver' ? '#caregiver' : '#dashboard';
    }, 600);
  });

  /* Sync icon visibility */
  ThemeManager.apply(ThemeManager.current());
}
