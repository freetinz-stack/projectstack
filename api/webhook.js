// api/webhook.js — Lemon Squeezy purchase webhook receiver.
//
// POST /api/webhook
// Called by Lemon Squeezy immediately after every purchase event.
// Verifies the HMAC-SHA256 signature so only genuine LS events are processed.
// On licence_key_created: writes a Firestore licenses/{key} document so the
// account dashboard and key recovery system have a server-side source of truth.
//
// Configure in Lemon Squeezy dashboard → Settings → Webhooks:
//   URL:    https://yourdomain.com/api/webhook
//   Events: order_created, licence_key_created, licence_key_updated
//   Secret: value of LEMON_SQUEEZY_WEBHOOK_SECRET env var

import crypto                            from 'crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';

// Disable Vercel's automatic body parsing — we need the raw bytes to verify HMAC
export const config = { api: { bodyParser: false } };

// ── Firebase Admin singleton ──────────────────────────────────────────────────
function getDb() {
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
  return getFirestore();
}

// ── Read raw body from Node.js request stream ─────────────────────────────────
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end',  () => resolve(data));
    req.on('error', reject);
  });
}

// ── HMAC-SHA256 signature verification ───────────────────────────────────────
function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    // timingSafeEqual prevents timing attacks
    const a = Buffer.from(signatureHeader.toLowerCase(), 'hex');
    const b = Buffer.from(expected.toLowerCase(), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ── Firestore writes ──────────────────────────────────────────────────────────
async function handleLicenceKeyCreated(db, attr) {
  const key = attr.key;
  if (!key) return;

  await db.collection('licenses').doc(key).set({
    plan:            attr.variant_name   || null,
    variantId:       attr.variant_id     || null,
    customerEmail:   attr.user_email     || null,
    customerName:    attr.user_name      || null,
    orderId:         String(attr.order_id || ''),
    activationLimit: attr.activation_limit ?? 1,
    status:          attr.status         || 'active',
    testMode:        attr.test_mode      || false,
    uid:             null,   // filled when user links their account via /api/activate
    createdAt:       Date.now(),
  }, { merge: false });
}

async function handleLicenceKeyUpdated(db, attr) {
  const key = attr.key;
  if (!key) return;
  // Sync status and limit changes (e.g. revocation, upgrade)
  await db.collection('licenses').doc(key).set({
    plan:            attr.variant_name   || null,
    activationLimit: attr.activation_limit ?? 1,
    status:          attr.status         || 'active',
    updatedAt:       Date.now(),
  }, { merge: true });
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // Read raw body before anything else
  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch {
    return res.status(400).json({ error: 'Could not read request body' });
  }

  // Verify Lemon Squeezy signature
  const secret    = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'] || '';
  if (!verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  // Parse JSON payload
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const eventName = payload?.meta?.event_name || '';
  const attr      = payload?.data?.attributes  || {};

  // Route events
  try {
    const db = getDb();
    if (eventName === 'licence_key_created') {
      await handleLicenceKeyCreated(db, attr);
    } else if (eventName === 'licence_key_updated') {
      await handleLicenceKeyUpdated(db, attr);
    }
    // order_created acknowledged but no additional action needed at this time
  } catch (err) {
    // Log but don't return 5xx — Lemon Squeezy retries on non-2xx
    console.error('[webhook] Firestore write failed:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }

  // Always acknowledge quickly so LS doesn't retry
  return res.status(200).json({ received: true, event: eventName });
}
