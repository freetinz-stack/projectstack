export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { license_key, instance_name } = req.body || {};
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
  } catch (err) {
    return res.status(502).json({ activated: false, error: 'Could not reach activation server' });
  }

  if (!lsRes.ok || lsData.error) {
    const msg = lsData.error || 'Activation failed';
    // Treat "already activated on this instance" as success
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

  return res.status(200).json({
    activated: true,
    instance: {
      id: lsData.instance?.id,
      name: lsData.instance?.name,
    },
    meta: {
      variant_name: lsData.meta?.variant_name,
      customer_email: lsData.meta?.customer_email,
      license_key: license_key,
    },
  });
}
