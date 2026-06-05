export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { license_key, instance_id } = req.body || {};
  if (!license_key || !instance_id) {
    return res.status(400).json({ deactivated: false, error: 'license_key and instance_id are required' });
  }

  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ deactivated: false, error: 'Server configuration error' });
  }

  let lsRes, lsData;
  try {
    lsRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/deactivate', {
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
    return res.status(502).json({ deactivated: false, error: 'Could not reach server' });
  }

  if (!lsRes.ok || lsData.error) {
    return res.status(400).json({ deactivated: false, error: lsData.error || 'Deactivation failed' });
  }

  return res.status(200).json({ deactivated: true });
}
