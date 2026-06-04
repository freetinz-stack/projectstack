// js/config.example.js
// Copy this file to js/config.local.js and fill in your Firebase project values.
// js/config.local.js is gitignored — never commit real API keys.
// Get values from: Firebase Console -> Project Settings -> Your apps -> Web app -> Config.
//
// Deployment (GitHub Actions): the workflow writes js/config.local.js from repo secrets.
// Deployment (Netlify): the build command writes js/config.local.js from env vars.
window.__FINCWIN_CONFIG__ = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  googleClientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID"  // Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client ID (Web application type)
};
