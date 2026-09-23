// RAG & Agentic Pipeline Service: provides pipeline transparency and reasoning trace visualization.
// Label: Prototype Intelligence Pipeline

export function getPipelineTrace({ isDemo = true, channelCount = 8 }) {
  return {
    title: 'Prototype Intelligence Pipeline',
    status: 'Verified & Computed',
    channelsAudited: channelCount,
    executionTimeMs: 3820,
    steps: [
      {
        id: 'sources',
        step: 'Authorized Sources',
        badge: 'Input',
        desc: 'Securely connects authorized tokens and data feeds across Website, Google Business, Instagram, YouTube, etc.',
        detail: 'No unauthorized scraping. Ingestion restricted strictly to authenticated channels.',
      },
      {
        id: 'orchestration',
        step: 'MCP Tool Orchestration',
        badge: 'Orchestration',
        desc: 'Dispatches specialized tool workers for web DOM extraction, engagement telemetry, and local search signals.',
        detail: 'Playwright headless browser for web assets; channel adapters for social telemetry.',
      },
      {
        id: 'normalization',
        step: 'Data Normalization',
        badge: 'Transform',
        desc: 'Transforms platform-specific metrics (likes, saves, views, footfall actions) into standard cross-channel units.',
        detail: 'Computes normalized engagement rates and reach percentiles across disparate platform APIs.',
      },
      {
        id: 'evidence',
        step: 'Evidence Extraction',
        badge: 'Analytics',
        desc: 'Isolates statistical anomalies and momentum signals (+34% Cold Brew interest, -11% Facebook engagement decay).',
        detail: 'Detects divergence between social interest and website booking conversions.',
      },
      {
        id: 'rag',
        step: 'RAG Context Retrieval',
        badge: 'Context',
        desc: 'Fetches historical benchmarks (July 2026: 74) and F&B hospitality performance heuristics.',
        detail: 'Contextualizes performance against industry-specific seasonal trends (Mumbai monsoon dining).',
      },
      {
        id: 'reasoning',
        step: 'AI Reasoning',
        badge: 'Inference',
        desc: 'Synthesizes multi-channel observations into root-cause problem statements and prioritized actions.',
        detail: 'Formulates P1, P2, and P3 actionable initiatives categorized by impact and operational feasibility.',
      },
      {
        id: 'report',
        step: 'Actionable Intelligence',
        badge: 'Delivery',
        desc: 'Generates the unified executive report with explainable presence scores and high-yield recommendations.',
        detail: 'Formatted for recurring PaaS delivery (monthly / quarterly / custom).',
      },
    ],
  };
}
