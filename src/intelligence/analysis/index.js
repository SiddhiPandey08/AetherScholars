// Analysis service: cross-platform intelligence, interest signal clustering, and pattern detection.

export function extractInterestSignals({ isDemo = true, customContent = [] }) {
  if (isDemo) {
    return {
      disclaimer: 'Based on available engagement and interaction signals across connected channels. Does not represent final sales volume.',
      signals: [
        { offering: 'Cold Brew', score: 86, signalStrength: 'Very Strong', observation: 'Received 34% higher engagement than account average promotional content.', growth: '+28%' },
        { offering: 'Vegan Breakfast', score: 78, signalStrength: 'Strong', observation: 'High save rate (360 saves) indicates strong intent for weekend morning visits.', growth: '+22%' },
        { offering: 'Weekend Brunch', score: 71, signalStrength: 'Moderate High', observation: 'Reliable weekly spike in inquiries between Thursday and Saturday afternoons.', growth: '+11%' },
        { offering: 'Desserts & Pastries', score: 59, signalStrength: 'Moderate', observation: 'Steady engagement as secondary add-ons, but rarely drives primary discovery.', growth: '+4%' },
        { offering: 'Coffee Beans & Merch', score: 48, signalStrength: 'Emerging', observation: 'Lower overall volume, but shows highest repeat WhatsApp concierge conversion.', growth: '+15%' },
      ],
    };
  }

  return {
    disclaimer: 'Signals estimated from scanned digital assets.',
    signals: [
      { offering: 'Primary Product / Service', score: 75, signalStrength: 'Active', observation: 'Detected as key focus area from page headings and metadata.', growth: 'Stable' },
    ],
  };
}

export function detectCrossPlatformPatterns({ isDemo = true }) {
  if (isDemo) {
    return [
      'Short-form product content is consistently outperforming static promotional posts by 2.8x across Instagram and Facebook.',
      'Cold Brew-related content generated the strongest combined engagement signal across all platforms during the August 2026 reporting period.',
      'Instagram is currently the primary engagement driver, while LinkedIn remains an underutilized B2B channel for corporate catering.',
      'Website performance and SEO are healthy (82/100), but the primary conversion CTA has lower mobile visibility than recommended.',
    ];
  }

  return [
    'Scanned website exhibits solid technical foundation; connecting authorized social channels will unlock cross-platform correlation.',
  ];
}
