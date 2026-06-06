// js/app-check-init.js — Firebase App Check initializer (Phase 5).
//
// Protects all Firebase SDK calls (Firestore reads/writes, Auth operations)
// by requiring a valid reCAPTCHA v3 token from the browser. Bots and scripts
// that call Firebase directly without going through the real app are rejected.
//
// ── PREREQUISITE: vendor file ─────────────────────────────────────────────────
// This module imports from js/vendor/firebase/firebase-app-check.js which must
// be downloaded manually (network access is restricted in this environment):
//
//   curl https://www.gstatic.com/firebasejs/12.13.0/firebase-app-check.js \
//        -o js/vendor/firebase/firebase-app-check.js
//
// ── PREREQUISITE: reCAPTCHA site key ─────────────────────────────────────────
// Add to js/config.local.js:
//   recaptchaSiteKey: "YOUR_RECAPTCHA_V3_SITE_KEY"
// Get from: Google Cloud Console → APIs & Services → Credentials → reCAPTCHA keys
//
// ── PREREQUISITE: Firebase Console ───────────────────────────────────────────
// Firebase Console → App Check → Apps → Register your web app → reCAPTCHA v3
// Then → Firestore → Enforce → Auth → Enforce
//
// ── Usage ────────────────────────────────────────────────────────────────────
// Call initAppCheck(app) immediately after initializeApp().
// If the vendor file or site key is missing, fails silently — the app still
// works, just without App Check protection (acceptable for local dev).

export async function initAppCheck(firebaseApp) {
  const siteKey = window.__FINCWIN_CONFIG__?.recaptchaSiteKey;
  if (!siteKey) {
    // Not configured — skip silently in local dev
    return;
  }

  try {
    const { initializeAppCheck, ReCaptchaV3Provider } =
      await import('./vendor/firebase/firebase-app-check.js');

    initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
      // Auto-refresh tokens before they expire so long-running sessions
      // don't get blocked mid-use
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // Vendor file missing or reCAPTCHA failed — log once, continue without protection
    console.warn('[AppCheck] Skipped:', err.message);
  }
}
