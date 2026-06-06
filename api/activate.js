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

// Links licence key ↔ Firebase UID in Firestore after successful activation.
// Non-fatal — activation still succeeds even if this write fails.
async function linkLicenceToAccount(licenseKey, idToken, planName) {
  try {
    const { auth, db } = getAdmin();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const batch = db.batch();
    // Mark the licence record with the owning UID
    batch.set(db.collection('licenses').doc(licenseKey),
      { uid, plan: planName },
      { merge: true }
    );
    // Store the key on the user record for recovery on new devices
    batch.set(db.collection('users').doc(uid),
      { licenseKey, plan: planName },
      { merge: true }
    );
    await batch.commit();
  } catch {
    // Linking is best-effort — never block activation
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { license_key, instance_name, idToken } = req.body || {};
  if (!license_key || !instance_name) {
    return res.status(400).json({ activated: false, error: 'license_key and instance_name are required' });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ activated: false, error: 'Server configuration error' });
  }

  let lsRes, lsData;
  try {
    lsRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ license_key, instance_name }),
    });
    lsData = await lsRes.json();
  } catch {
    return res.status(502).json({ activated: false, error: 'Could not reach activation server' });
  }

  if (!lsRes.ok || lsData.error) {
    const msg = lsData.error || 'Activation failed';
    if (msg.toLowerCase().includes('already activated')) {
      return res.status(200).json({
        activated: true,
        instance: lsData.instance || {},
        meta: lsData.meta || {},
        already_active: true,
      });
    }
    return res.status(400).json({ activated: false, error: msg });
  }

  const planName = lsData.meta?.variant_name || 'Starter';

  // If caller is signed in, link the key to their Firebase account
  if (idToken) {
    await linkLicenceToAccount(license_key, idToken, planName);
  }

  return res.status(200).json({
    activated: true,
    instance: {
      id: lsData.instance?.id,
      name: lsData.instance?.name,
    },
    meta: {
      variant_name:   planName,
      customer_email: lsData.meta?.customer_email,
      license_key:    license_key,
    },
  });
}
