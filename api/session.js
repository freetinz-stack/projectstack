// api/session.js — Issues or clears the HttpOnly __session cookie.
//
// POST /api/session  { idToken }  → verifies Firebase ID token via Admin SDK,
//                                   sets a 14-day HttpOnly Secure cookie.
// DELETE /api/session              → clears the cookie (sign-out).
//
// The cookie is read by middleware.js (Vercel Edge) to gate /app and /account
// before any client-side JS runs.

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth }                       from 'firebase-admin/auth';

// ── Firebase Admin singleton ──────────────────────────────────────────────────
function getAdminAuth() {
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
  return getAuth();
}

// ── Cookie helpers ────────────────────────────────────────────────────────────
const COOKIE_NAME    = '__session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

function buildSetCookie(value, maxAge) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
  ];
  // Add Secure flag on production (Vercel sets NODE_ENV=production)
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Sign-out: clear the cookie
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', buildSetCookie('', 0));
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  // Verify the Firebase ID token
  let decoded;
  try {
    const adminAuth = getAdminAuth();
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Issue the HttpOnly session cookie
  res.setHeader('Set-Cookie', buildSetCookie(idToken, COOKIE_MAX_AGE));
  return res.status(200).json({ ok: true, uid: decoded.uid });
}
