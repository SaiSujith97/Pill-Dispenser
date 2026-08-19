/* ═════════════════════════════
   Page: Landing / Welcome
   ═════════════════════════════ */

function renderLanding() {
  return `
<div class="landing-page page-enter">

  <!-- Top nav -->
  <div class="landing-nav">
    <div class="landing-brand">
      <svg width="34" height="34" viewBox="0 0 38 38" fill="none" aria-hidden="true">
        <rect width="38" height="38" rx="11" fill="var(--accent)"/>
        <ellipse cx="19" cy="19" rx="9.5" ry="5.8" transform="rotate(45 19 19)" fill="white" opacity="0.95"/>
        <ellipse cx="19" cy="19" rx="4.8" ry="5.8" transform="rotate(45 19 19)" fill="var(--accent)"/>
      </svg>
      <span class="landing-brand-name">PillSync</span>
    </div>
    <button class="icon-btn theme-toggle" id="landing-theme-btn" aria-label="Toggle dark/light mode">
      <svg class="sun-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <svg class="moon-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="display:none" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>
  </div>

  <!-- Hero -->
  <div class="landing-hero">

    <!-- SVG Illustration -->
    <svg class="landing-hero-illustration" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">
      <!-- Background circle -->
      <circle cx="140" cy="140" r="130" fill="var(--accent-soft)"/>

      <!-- Dispenser body -->
      <rect x="80" y="80" width="120" height="140" rx="20" fill="var(--bg-surface)" stroke="var(--border)" stroke-width="2"/>

      <!-- Compartment grid -->
      <rect x="96" y="100" width="40" height="40" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.5"/>
      <rect x="144" y="100" width="40" height="40" rx="8" fill="#D4DCEF" stroke="#5B85C4" stroke-width="1.5"/>
      <rect x="96" y="148" width="40" height="40" rx="8" fill="#FDF4DC" stroke="#E8B84B" stroke-width="1.5"/>
      <rect x="144" y="148" width="40" height="40" rx="8" fill="var(--danger-soft)" stroke="var(--danger)" stroke-width="1.5"/>

      <!-- Labels A B C D -->
      <text x="116" y="126" text-anchor="middle" font-size="14" font-weight="700" fill="var(--accent)">A</text>
      <text x="164" y="126" text-anchor="middle" font-size="14" font-weight="700" fill="#5B85C4">B</text>
      <text x="116" y="174" text-anchor="middle" font-size="14" font-weight="700" fill="#E8B84B">C</text>
      <text x="164" y="174" text-anchor="middle" font-size="14" font-weight="700" fill="var(--danger)">D</text>

      <!-- Pills in compartments -->
      <!-- A: capsule -->
      <ellipse cx="116" cy="113" rx="8" ry="4" transform="rotate(35 116 113)" fill="var(--accent)" opacity="0.6"/>
      <!-- B: round pill -->
      <circle cx="164" cy="113" r="5" fill="#5B85C4" opacity="0.7"/>
      <!-- C: oval -->
      <ellipse cx="116" cy="163" rx="6" ry="4" fill="#E8B84B" opacity="0.8"/>
      <!-- D: small capsule -->
      <ellipse cx="164" cy="163" rx="7" ry="3.5" transform="rotate(-20 164 163)" fill="var(--danger)" opacity="0.7"/>

      <!-- Dispenser lid/slot -->
      <rect x="105" y="200" width="70" height="6" rx="3" fill="var(--border)"/>

      <!-- Wifi / connectivity icon on top of dispenser -->
      <path d="M130 68 Q140 58 150 68" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <path d="M122 74 Q140 54 158 74" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
      <circle cx="140" cy="72" r="3" fill="var(--accent)"/>

      <!-- Floating notification bubble -->
      <rect x="168" y="55" width="68" height="36" rx="10" fill="var(--bg-surface)" stroke="var(--border)" stroke-width="1.5" filter="url(#shadow)"/>
      <text x="202" y="70" text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-primary)">Time to take</text>
      <text x="202" y="83" text-anchor="middle" font-size="10" fill="var(--accent)" font-weight="700">Metformin</text>

      <!-- Phone icon -->
      <rect x="32" y="110" width="32" height="56" rx="7" fill="var(--bg-surface)" stroke="var(--border)" stroke-width="1.5"/>
      <rect x="37" y="118" width="22" height="34" rx="3" fill="var(--accent-soft)"/>
      <circle cx="48" cy="158" r="2.5" fill="var(--text-muted)"/>
      <!-- Mini chart on phone -->
      <rect x="39" y="124" width="4" height="8" rx="1" fill="var(--accent)" opacity="0.6"/>
      <rect x="45" y="120" width="4" height="12" rx="1" fill="var(--accent)" opacity="0.8"/>
      <rect x="51" y="126" width="4" height="6" rx="1" fill="var(--accent)" opacity="0.5"/>

      <!-- Checkmark done bubble -->
      <circle cx="212" cy="198" r="18" fill="var(--success-soft)" stroke="var(--success)" stroke-width="1.5"/>
      <path d="M204 198l6 6 10-10" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

      <defs>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.08)"/>
        </filter>
      </defs>
    </svg>

    <div>
      <p class="landing-eyebrow">IoT Medication Manager</p>
      <h1 class="landing-headline">Never miss a dose again</h1>
    </div>

    <p class="landing-subhead">
      PillSync connects with your smart dispenser to remind you, track your doses, and keep your caregiver informed — automatically.
    </p>

    <div class="landing-ctas">
      <button class="btn btn-primary btn-lg" id="landing-login-btn" style="flex:1">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Log In
      </button>
      <button class="btn btn-secondary btn-lg" id="landing-signup-btn" style="flex:1">
        Sign Up
      </button>
    </div>

    <button class="btn btn-ghost" id="landing-demo-btn" style="font-size:var(--text-sm); height:44px; color:var(--text-muted);">
      ✦ Skip to demo dashboard
    </button>
  </div>

  <!-- Feature strip -->
  <div class="landing-features">
    <div class="landing-feature">
      <div class="landing-feature-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </div>
      Smart reminders
    </div>
    <div class="landing-feature">
      <div class="landing-feature-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      Caregiver alerts
    </div>
    <div class="landing-feature">
      <div class="landing-feature-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      Adherence tracking
    </div>
    <div class="landing-feature">
      <div class="landing-feature-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
      </div>
      ESP32 connected
    </div>
  </div>

</div>
  `;
}

function initLanding() {
  document.getElementById('landing-login-btn').addEventListener('click', () => {
    window.location.hash = '#login';
  });
  document.getElementById('landing-signup-btn').addEventListener('click', () => {
    window.location.hash = '#signup';
  });
  document.getElementById('landing-demo-btn').addEventListener('click', () => {
    /* loginDemo loads mock data and bypasses Firebase auth */
    AppState.loginDemo('patient');
    window.location.hash = '#dashboard';
  });
  /* Theme button in landing nav is wired via the global delegate in theme.js */
  ThemeManager.updateIcons && ThemeManager.init && ThemeManager.apply(ThemeManager.current());
}
