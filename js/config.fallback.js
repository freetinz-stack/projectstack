// js/config.fallback.js
// Ensures window.__FINCWIN_CONFIG__ is defined as null when config.local.js is absent.
// Loaded immediately after config.local.js in index.html (see script load order).
// Must be a separate file (not an inline <script>) to comply with the Content-Security-Policy
// which has script-src 'self' with no 'unsafe-inline'.
window.__FINCWIN_CONFIG__ = window.__FINCWIN_CONFIG__ || null;
