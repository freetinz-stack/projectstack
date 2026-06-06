import { checkRateLimit, getClientIp } from './_ratelimit.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: 30 validations per hour per IP (caching in boot.js handles most calls)
  const ip = getClientIp(req);
  const rl = await checkRateLimit('rl:validate', 30, '1 h', ip);
  if (rl.limited) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ valid: false, reason: 'rate_limited' });
  }

  const { license_key, instance_id } = req.body || {};
  if (!license_key || !instance_id) {
    return res.status(400).json({ valid: false, reason: 'missing_params' });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ valid: false, reason: 'server_error' });
  }

  let lsRes, lsData;
  try {
    lsRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ license_key, instance_id }),
    });
    lsData = await lsRes.json();
  } catch (err) {
    // Network failure — tell frontend to allow offline use
    return res.status(502).json({ valid: false, reason: 'network_error' });
  }

  if (!lsRes.ok || !lsData.valid) {
    return res.status(200).json({ valid: false, reason: lsData.error || 'invalid_key' });
  }

  return res.status(200).json({
    valid: true,
    plan: lsData.meta?.variant_name || 'Starter',
    customer_email: lsData.meta?.customer_email,
  });
}
