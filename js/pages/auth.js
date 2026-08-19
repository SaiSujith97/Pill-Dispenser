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

    <!-- Error message area -->
    <div id="auth-error" class="auth-error" role="alert" aria-live="polite" style="display:none;"></div>

    <!-- Google Sign-In Button -->
    <button class="btn-google" id="google-signin-btn" type="button" aria-label="Continue with Google">
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      Continue with Google
    </button>

    <div class="auth-divider">
      <span>or</span>
    </div>

    <!-- Traditional form (kept for layout; submits via Google in this version) -->
    <form id="auth-form" novalidate>

      ${!isLogin ? `
      <div class="form-group">
        <label class="form-label" for="auth-name">Full Name</label>
        <input class="form-input" type="text" id="auth-name" name="name"
          placeholder="e.g. Mary Johnson" autocomplete="name" />
      </div>
      ` : ''}

      <div class="form-group">
        <label class="form-label" for="auth-email">Email Address</label>
        <input class="form-input" type="email" id="auth-email" name="email"
          placeholder="you@example.com" autocomplete="email" />
      </div>

      <div class="form-group">
        <label class="form-label" for="auth-password">Password</label>
        <div style="position:relative;">
          <input class="form-input" type="password" id="auth-password" name="password"
            placeholder="${isLogin ? 'Enter your password' : 'Create a strong password'}"
            autocomplete="${isLogin ? 'current-password' : 'new-password'}"
            style="padding-right: 52px;" />
          <button type="button" id="toggle-pw" class="icon-btn" aria-label="Show or hide password"
            style="position:absolute; right:4px; top:50%; transform:translateY(-50%); color:var(--text-muted);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>

      <button type="submit" class="btn btn-secondary btn-full" id="auth-submit" style="margin-top:var(--space-2);">
        ${isLogin ? 'Sign In with Email' : 'Create Account with Email'}
      </button>

    </form>

    <p class="auth-switch">
      ${isLogin
        ? `Don't have an account? <button class="auth-link" id="auth-switch-btn">Sign up</button>`
        : `Already have an account? <button class="auth-link" id="auth-switch-btn">Log in</button>`
      }
    </p>

    <div class="auth-demo-note">
      <strong>Note:</strong> Email sign-in coming soon — use "Continue with Google" above, or
      <button class="auth-link" id="auth-demo-link">try the demo dashboard</button>.
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

/* ─── Friendly error messages ─── */
function _friendlyAuthError(code) {
  const map = {
    'auth/popup-closed-by-user':    'Sign-in was cancelled. Tap "Continue with Google" to try again.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
    'auth/network-request-failed':  'No internet connection. Please check your network and try again.',
    'auth/too-many-requests':       'Too many sign-in attempts. Please wait a moment and try again.',
    'auth/user-disabled':           'This account has been disabled. Please contact support.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email. Try a different sign-in method.',
    'auth/operation-not-allowed':   'Google Sign-In is not enabled. Please contact the app administrator.',
    'auth/internal-error':          'An internal error occurred. If you are running locally, make sure this domain is added to Firebase Authorized Domains.',
    'auth/unauthorized-domain':     'This domain is not authorised for Google Sign-In. Please add it to Firebase Authorized Domains.',
    'auth/invalid-api-key':         'Invalid Firebase API key. Please check your Firebase configuration.',
    'auth/popup-blocked':           'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.',
  };
  return map[code] || `Something went wrong (${code || 'unknown error'}). Please try again in a moment.`;
}

function _showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function _hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

function _setGoogleBtnLoading(loading) {
  const btn = document.getElementById('google-signin-btn');
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = `
      <span class="auth-spinner" aria-hidden="true"></span>
      Signing in…
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      Continue with Google
    `;
  }
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

  /* Demo link in the note */
  document.getElementById('auth-demo-link').addEventListener('click', () => {
    AppState.loginDemo('patient');
    window.location.hash = '#dashboard';
  });

  /* ── Google Sign-In ── */
  document.getElementById('google-signin-btn').addEventListener('click', async () => {
    _hideAuthError();
    _setGoogleBtnLoading(true);
    /* Store selected role BEFORE sign-in so it is available even if the
       popup closes and onAuthStateChanged fires before the try-block resumes */
    sessionStorage.setItem('ps_preferred_role', selectedRole);
    try {
      await FirebaseAuth.signInWithGoogle();
      /* onAuthStateChanged fires next → AppState.onFirebaseAuthChange → navigates */
    } catch (err) {
      console.error('Google sign-in error — full details:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      _setGoogleBtnLoading(false);
      _showAuthError(_friendlyAuthError(err.code));
    }
  });

  /* ── Email form submit (placeholder — shows helpful message) ── */
  document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    _showAuthError('Email sign-in is not yet enabled. Please use "Continue with Google" above.');
  });

  /* Sync icon visibility */
  ThemeManager.apply(ThemeManager.current());
}
