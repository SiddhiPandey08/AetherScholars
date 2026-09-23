// Connectors service: manages authorized channel verification and ingestion adapters.
// Privacy rule: ProspectIQ analyzes only digital assets and account data explicitly connected and authorized by the business.

export const SUPPORTED_CHANNELS = [
  { id: 'website', name: 'Website', type: 'web', required: true, placeholder: 'https://urbanleaf-demo.example' },
  { id: 'instagram', name: 'Instagram', type: 'social', placeholder: '@urbanleaf.cafe' },
  { id: 'google_business', name: 'Google Business', type: 'local', placeholder: 'UrbanLeaf Café — Mumbai' },
  { id: 'youtube', name: 'YouTube', type: 'video', placeholder: 'UrbanLeaf Café' },
  { id: 'facebook', name: 'Facebook', type: 'social', placeholder: 'UrbanLeaf Café' },
  { id: 'whatsapp', name: 'WhatsApp Business', type: 'messaging', placeholder: '+91 98200 XXXXX' },
  { id: 'linkedin', name: 'LinkedIn', type: 'professional', placeholder: 'UrbanLeaf Hospitality' },
  { id: 'twitter', name: 'X / Twitter', type: 'social', placeholder: '@UrbanLeafCafe' },
];

export function verifyConnections({ url, channels = {}, isDemo = false }) {
  const verified = [];
  const u = (url || '').trim().toLowerCase();
  const isDemoUrl = isDemo || u.includes('urbanleaf') || u.includes('demo.example');

  for (const def of SUPPORTED_CHANNELS) {
    if (def.id === 'website') {
      verified.push({
        id: 'website',
        name: 'Website',
        value: url || 'https://urbanleaf-demo.example',
        status: url ? 'connected' : 'missing',
        authorized: Boolean(url),
        isDemo: isDemoUrl,
      });
      continue;
    }

    const val = channels[def.id];
    if (isDemoUrl) {
      verified.push({
        id: def.id,
        name: def.name,
        value: val || def.placeholder,
        status: 'connected',
        authorized: true,
        isDemo: true,
      });
    } else if (val && String(val).trim()) {
      verified.push({
        id: def.id,
        name: def.name,
        value: String(val).trim(),
        status: 'connected',
        authorized: true,
        isDemo: false,
      });
    } else {
      verified.push({
        id: def.id,
        name: def.name,
        value: '',
        status: 'not_connected',
        authorized: false,
        isDemo: false,
        note: 'Not connected (Authorization required)',
      });
    }
  }

  return {
    isDemo: isDemoUrl,
    authorizationNotice: 'ProspectIQ analyzes only digital assets and account data explicitly connected and authorized by the business.',
    connectedCount: verified.filter((c) => c.status === 'connected').length,
    totalCount: verified.length,
    channels: verified,
  };
}
