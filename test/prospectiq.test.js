// Unit & Integration tests for ProspectIQ Intelligence Engine
import assert from 'node:assert/strict';
import { analyzeBusiness, URBANLEAF_BUSINESS } from '../src/intelligence/index.js';
import { verifyConnections } from '../src/intelligence/connectors/index.js';
import { normalizeMetrics } from '../src/intelligence/normalization/index.js';
import { calculatePresenceScore } from '../src/intelligence/scoring/index.js';
import { extractInterestSignals, detectCrossPlatformPatterns } from '../src/intelligence/analysis/index.js';
import { getPipelineTrace } from '../src/intelligence/rag/index.js';

console.log('--- Testing ProspectIQ Intelligence Engine ---');

// 1. UrbanLeaf Café Demo Business Ingestion & Analysis
const report = await analyzeBusiness({ url: 'https://urbanleaf-demo.example', isDemo: true });

assert.equal(report.business.name, 'UrbanLeaf Café');
assert.equal(report.business.isDemo, true);
assert.equal(report.business.location, 'Bandra West, Mumbai, Maharashtra, India');
assert.equal(report.business.environmentNotice, 'DEMO DATA — Simulated business intelligence');

// 2. Score Verification
assert.equal(report.score.overall, 78);
assert.equal(report.score.max, 100);
assert.equal(report.score.label, 'Composite Digital Presence Score');

const subScores = report.score.subScores;
assert.equal(subScores.length, 6);
const scoreMap = Object.fromEntries(subScores.map((s) => [s.key, s.score]));
assert.equal(scoreMap.websiteHealth, 82);
assert.equal(scoreMap.contentPerformance, 76);
assert.equal(scoreMap.audienceEngagement, 81);
assert.equal(scoreMap.searchVisibility, 69);
assert.equal(scoreMap.channelConsistency, 74);
assert.equal(scoreMap.conversionReadiness, 71);

// 3. Channels Verification
assert.equal(report.channels.length, 8);
const ig = report.channels.find((c) => c.id === 'instagram');
assert.equal(ig.score, 82);
assert.equal(ig.growth, '+18%');
assert.equal(ig.status, 'Strong Growth');

const fb = report.channels.find((c) => c.id === 'facebook');
assert.equal(fb.score, 68);
assert.equal(fb.growth, '-11%');
assert.equal(fb.status, 'Needs Attention');

// 4. Product Interest Signals
assert.ok(report.interestSignals.disclaimer.includes('Does not represent final sales volume'));
const signals = report.interestSignals.signals;
assert.equal(signals.length, 5);
assert.equal(signals[0].offering, 'Cold Brew');
assert.equal(signals[0].score, 86);
assert.equal(signals[1].offering, 'Vegan Breakfast');
assert.equal(signals[1].score, 78);

// 5. Cross-Platform Intelligence
assert.equal(report.crossPlatformPatterns.length, 4);
assert.ok(report.crossPlatformPatterns[0].includes('Short-form'));

// 6. Actionable Prioritized Recommendations
assert.equal(report.recommendations.length, 5);
const p1Recs = report.recommendations.filter((r) => r.priorityLevel === 'high');
assert.equal(p1Recs.length, 2);
for (const r of report.recommendations) {
  assert.ok(r.problem, `Missing problem in ${r.id}`);
  assert.ok(r.evidence, `Missing evidence in ${r.id}`);
  assert.ok(r.action, `Missing action in ${r.id}`);
}

// 7. Historical Performance & Period Comparison
assert.equal(report.historical.trend.length, 3);
assert.equal(report.historical.trend[0].score, 71);
assert.equal(report.historical.trend[1].score, 74);
assert.equal(report.historical.trend[2].score, 78);
assert.equal(report.historical.deltas.overallScore.change, '+6');

// 8. Pipeline Trace (MCP + RAG Transparency)
assert.equal(report.pipeline.steps.length, 7);
assert.equal(report.pipeline.title, 'Prototype Intelligence Pipeline');

// 9. Real URL Fallback & Privacy Authorization Verification
const liveAnalysis = await analyzeBusiness({ url: 'https://myshop.example', channels: {}, isDemo: false });
assert.equal(liveAnalysis.business.isDemo, false);
assert.equal(liveAnalysis.connections.isDemo, false);
const unconnected = liveAnalysis.connections.channels.filter((c) => c.status === 'not_connected');
assert.ok(unconnected.length >= 7);
assert.ok(unconnected[0].note.includes('Authorization required'));

console.log('All ProspectIQ Intelligence Engine tests passed successfully!');
