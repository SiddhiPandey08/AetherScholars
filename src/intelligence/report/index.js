// Report service: builds the complete executive intelligence report object.

export function buildExecutiveReport({ business, connections, score, normalizedChannels, interestSignals, patterns, pipeline, customFindings = null }) {
  return {
    meta: {
      generatedAt: new Date().toISOString(),
      reportId: `RPT-${business.id || 'DEMO'}-${Date.now().toString(36).toUpperCase()}`,
      version: '1.0.0-prospectiq',
    },
    business: {
      ...business,
      environmentNotice: business.isDemo ? 'DEMO DATA — Simulated business intelligence' : 'LIVE AUDIT — Authorized Channels',
    },
    connections,
    score,
    channels: normalizedChannels,
    contentPerformers: business.contentPerformers || [],
    interestSignals,
    keyInsights: business.keyInsights || [],
    crossPlatformPatterns: patterns,
    websiteHealth: customFindings || business.websiteHealth,
    recommendations: business.recommendations || [],
    historical: business.historical || {
      trend: [{ period: 'Current', score: score.overall }],
      deltas: {},
    },
    pipeline,
    monitoring: {
      currentPeriod: business.reportingPeriod || 'August 2026',
      nextAnalysis: business.nextAnalysis || 'September 2026',
      frequency: business.frequency || 'Monthly',
      options: ['Monthly', 'Quarterly', 'Custom'],
    },
    productStatement: {
      headline: 'Your digital presence is generating data every day. ProspectIQ turns that data into decisions.',
      cycle: 'CONNECT → ANALYZE → UNDERSTAND → IMPROVE → REPEAT',
    },
  };
}
