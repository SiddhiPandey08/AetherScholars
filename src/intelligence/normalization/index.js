// Normalization service: transforms disparate platform metrics into comparable indices.

export function normalizeMetrics(rawChannels) {
  return rawChannels.map((ch) => {
    // Parse reach string or number
    let reachNum = 0;
    if (typeof ch.reach === 'number') reachNum = ch.reach;
    else if (typeof ch.reach === 'string') {
      const match = ch.reach.match(/([\d.]+)\s*k/i);
      if (match) reachNum = parseFloat(match[1]) * 1000;
      else reachNum = parseInt(ch.reach.replace(/[^\d]/g, ''), 10) || 0;
    }

    // Parse engagement rate
    let engRate = 0;
    if (typeof ch.engagementRate === 'number') engRate = ch.engagementRate;
    else if (typeof ch.engagementRate === 'string') {
      const match = ch.engagementRate.match(/([\d.]+)%/);
      if (match) engRate = parseFloat(match[1]);
      else engRate = 2.0;
    }

    // Growth percentage
    let growthRate = 0;
    if (typeof ch.growth === 'string') {
      const match = ch.growth.match(/([+-]?[\d.]+)%/);
      if (match) growthRate = parseFloat(match[1]);
    }

    return {
      ...ch,
      normalizedReach: reachNum,
      normalizedEngagementRate: engRate,
      normalizedGrowthRate: growthRate,
      relativeHealth: Math.min(100, Math.max(0, Math.round(ch.score || 70))),
    };
  });
}
