'use strict';
// Initializes Firebase once and exports auth + db for use across pages.
// Reads config from window.__FINCWIN_CONFIG__ (set by js/config.local.js).
// Import this module on any page that needs Firebase Auth or Firestore.

import { initAppCheck } from './app-check-init.js';

let _app = null;
let _auth = null;
let _db = null;
let _authHelpers = null;
let _ready = null;

async function _init() {
  if (_db) return { auth: _auth, db: _db, helpers: _authHelpers };

  const cfg = window.__FINCWIN_CONFIG__;
  if (!cfg || cfg.apiKey.startsWith('REPLACE_')) {
    throw new Error('Firebase config missing. Fill in js/config.local.js with your project values.');
  }

  const [
    { initializeApp },
    { getAuth, onAuthStateChanged, signInWithEmailAndPassword,
      createUserWithEmailAndPassword, sendPasswordResetEmail,
      updateEmail, updatePassword, deleteUser, signOut },
    { getFirestore, doc, getDoc, setDoc, deleteDoc }
  ] = await Promise.all([
    import('./vendor/firebase/firebase-app.js'),
    import('./vendor/firebase/firebase-auth.js'),
    import('./vendor/firebase/firebase-firestore.js')
  ]);

  _app  = initializeApp(cfg);

  // App Check must be initialized immediately after initializeApp and before
  // any Firestore or Auth calls — tokens are attached automatically thereafter
  await initAppCheck(_app);

  _auth = getAuth(_app);
  _db   = getFirestore(_app);
  _authHelpers = {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateEmail,
    updatePassword,
    deleteUser,
    signOut,
    doc, getDoc, setDoc, deleteDoc
  };

  return { auth: _auth, db: _db, helpers: _authHelpers };
}

// Returns a promise that resolves to { auth, db, helpers }.
// Multiple callers share the same singleton — safe to call in parallel.
export async function getFirebase() {
  if (!_ready) _ready = _init();
  return _ready;
}

// Convenience: resolves to the currently signed-in Firebase user, or null.
export async function currentUser() {
  const { auth, helpers } = await getFirebase();
  return new Promise(resolve => {
    const unsub = helpers.onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    });
  });
}

// Redirects to /signin if no Firebase session exists.
// Call at the top of any protected page's script.
export async function requireAuth(redirectTo = '/signin') {
  const user = await currentUser();
  if (!user) {
    window.location.replace(redirectTo);
    return null;
  }
  return user;
}
