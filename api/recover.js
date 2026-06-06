// api/recover.js — Returns the stored licence key for an authenticated user.
//
// POST /api/recover  { idToken }
// Verifies Firebase ID token → looks up users/{uid}.licenseKey in Firestore →
// returns the key so a new device can auto-activate without the user typing it.
//
// Called by signin.html after sign-in when no fw_license_key is in localStorage.

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth }                       from 'firebase-admin/auth';
import { getFirestore }                  from 'firebase-admin/firestore';

function getAdmin() {
  if (!getApps().length) {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  let uid;
  try {
    const { auth } = getAdmin();
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { db } = getAdmin();
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) {
      return res.status(200).json({ licenseKey: null, plan: null });
    }
    const data = snap.data();
    return res.status(200).json({
      licenseKey: data.licenseKey || null,
      plan:       data.plan       || null,
    });
  } catch {
    return res.status(500).json({ error: 'Could not retrieve licence key' });
  }
}
