// js/config.local.js
// ⚠️  CREDENTIALS SCRUBBED — replace with your real values before deploying.
//     The values below are placeholders. Real keys were removed from source.
//
// ▶  REQUIRED ACTION: Go to Firebase Console → Project Settings → Your Web App → Config
//    and replace each placeholder below with your actual project values.
//    Then go to Google Cloud Console → APIs & Services → Credentials
//    and replace googleClientId with your OAuth 2.0 Web Client ID.
//
// This file must NEVER be committed with real keys.
// Add it to .gitignore and inject values at deploy time via CI secrets or env vars.
window.__FINCWIN_CONFIG__ = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_PROJECT_ID",
  storageBucket: "REPLACE_WITH_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "REPLACE_WITH_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID",
  googleClientId: "REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com"
};
