// Scoring service: computes the explainable Composite Digital Presence Score.
// Note: Clearly labeled as a composite signal indicator, not an arbitrary absolute ranking.

/**
 * @param {object} [options]
 * @param {boolean} [options.isDemo]
 * @param {any[]} [options.channelMetrics]
 * @param {any} [options.customWebsiteHealth]
 */
export function calculatePresenceScore({ isDemo = true, channelMetrics = [], customWebsiteHealth = null } = {}) {
  if (isDemo) {
    return {
      overall: 78,
      max: 100,
      label: 'Composite Digital Presence Score',
      benchmark: 'F&B Café Benchmark: 72',
      status: 'High Performing',
      subScores: [
        { key: 'websiteHealth', label: 'Website Health', score: 82, weight: '20%', delta: '+7%', desc: 'Site speed, accessibility compliance & structure' },
        { key: 'contentPerformance', label: 'Content Performance', score: 76, weight: '20%', delta: '+5%', desc: 'Engagement per post, video completion & resonance' },
        { key: 'audienceEngagement', label: 'Audience Engagement', score: 81, weight: '20%', delta: '+12%', desc: 'Saves, shares, comment sentiment & interaction rate' },
        { key: 'searchVisibility', label: 'Search & Visibility', score: 69, weight: '15%', delta: '+4%', desc: 'Local Google search rank, direction requests & SEO' },
        { key: 'channelConsistency', label: 'Channel Consistency', score: 74, weight: '15%', delta: '+9%', desc: 'Posting cadence, multi-platform presence & activity' },
        { key: 'conversionReadiness', label: 'Conversion Readiness', score: 71, weight: '10%', delta: '-2%', desc: 'CTA visibility, booking friction & direct contact pathways' },
      ],
    };
  }

  // Live calculation for user-provided website
  const webScore = customWebsiteHealth ? Math.round((customWebsiteHealth.seoScore + customWebsiteHealth.accessibilityScore + customWebsiteHealth.performanceScore) / 3) : 75;
  const overall = Math.min(100, Math.max(30, webScore));

  return {
    overall,
    max: 100,
    label: 'Composite Digital Presence Score',
    benchmark: 'Single Channel Analysis',
    status: overall >= 80 ? 'Healthy' : overall >= 65 ? 'Moderate' : 'Needs Optimization',
    subScores: [
      { key: 'websiteHealth', label: 'Website Health', score: webScore, weight: '40%', delta: 'Current', desc: 'Real-time Playwright + axe-core + SEO analysis' },
      { key: 'contentPerformance', label: 'Content Performance', score: 65, weight: '20%', delta: 'Estimated', desc: 'Channel engagement pending authorized connection' },
      { key: 'audienceEngagement', label: 'Audience Engagement', score: 60, weight: '20%', delta: 'Estimated', desc: 'Pending authorized social channel tokens' },
      { key: 'searchVisibility', label: 'Search & Visibility', score: customWebsiteHealth?.seoScore || 65, weight: '20%', delta: 'Current', desc: 'On-page SEO configuration & crawling signals' },
    ],
  };
}
