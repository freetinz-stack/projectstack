// api/orders.js — Returns billing history for the authenticated user.
//
// POST /api/orders  { idToken }
// Verifies Firebase ID token → looks up customer email in Firestore →
// fetches matching orders from Lemon Squeezy → returns normalised list.

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'idToken is required' });

  // Verify Firebase token
  let uid, customerEmail;
  try {
    const { auth, db } = getAdmin();
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;

    // Get customer email — prefer Firestore record (may differ from Auth email)
    const snap = await db.collection('users').doc(uid).get();
    customerEmail = snap.exists ? (snap.data().email || decoded.email) : decoded.email;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (!customerEmail) {
    return res.status(200).json({ orders: [] });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

  // Fetch orders from Lemon Squeezy filtered by email
  let lsData;
  try {
    const url = `https://api.lemonsqueezy.com/v1/orders?filter[user_email]=${encodeURIComponent(customerEmail)}&page[size]=25`;
    const lsRes = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });
    if (!lsRes.ok) throw new Error('Lemon Squeezy error');
    lsData = await lsRes.json();
  } catch {
    return res.status(502).json({ error: 'Could not fetch billing history' });
  }

  const orders = (lsData.data || []).map(o => ({
    id:          o.id,
    date:        o.attributes?.created_at,
    description: o.attributes?.first_order_item?.product_name || 'FincWin',
    amount:      o.attributes?.total,         // in cents
    currency:    o.attributes?.currency || 'USD',
    status:      o.attributes?.status || 'paid',
    receiptUrl:  o.attributes?.urls?.receipt || null,
  }));

  return res.status(200).json({ orders });
}
