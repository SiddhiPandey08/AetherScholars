# ProspectIQ: Agentic Digital Intelligence Platform for Businesses

> *"Your digital presence is generating data every day. ProspectIQ turns that data into decisions."*
> 
> **CONNECT &rarr; COLLECT &rarr; ANALYZE &rarr; REPORT &rarr; IMPROVE &rarr; REPEAT**

ProspectIQ is an Agentic Digital Intelligence PaaS for businesses. Rather than operating in isolated silos across social media, local search, and web pages, a business connects its authorized digital channels to receive a unified, recurring digital intelligence report.

The platform answers 8 core business questions:
1. **What is working?** (High-resonance short-form video, top engagement formats)
2. **What is underperforming?** (Static discount graphics suffering algorithmic decay)
3. **What digital areas need attention?** (High bounce rate on menu pages, mobile CTA placement)
4. **What products/offerings receive strong interest signals?** (Cold Brew +34%, Vegan Breakfast +22%)
5. **Which channels perform better?** (Instagram +18% growth vs. Facebook -11% decline)
6. **What problems exist on the website?** (Real-time Playwright + axe-core accessibility & technical SEO auditing)
7. **What should the business improve first?** (Actionable P1, P2, P3 prioritized initiatives with Problem, Evidence & Action)
8. **How has performance changed?** (Month-over-month trajectory: June 71 &rarr; July 74 &rarr; August 78)

---

## ⚡ Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (offline)
npm test

# 3. Launch local dashboard
npm run dashboard
# Open http://localhost:4173 in your browser
```

---

## ⏱️ 60–90 Second Judging Walkthrough

1. **Launch Dashboard**: Open `http://localhost:4173`.
2. **One-Click Demo Connection**: Click **"Try Demo (UrbanLeaf Café)"**. Notice all 8 authorized digital channels (Website, Instagram, Google Business, YouTube, Facebook, WhatsApp, LinkedIn, X) auto-populate with `✓ Connected` and `✓ Authorized` badges.
3. **Trigger Intelligence Analysis**: Click **"Analyze Digital Presence"**.
4. **Agentic Pipeline Loader**: Watch the 3.5s sequential multi-stage agentic engine execute:
   - *Verifying connections &bull; Ingesting web signals &bull; Analyzing SEO & A11y &bull; Processing engagement &bull; Normalizing interest signals &bull; Synthesizing recommendations.*
5. **Review Composite Score**: Observe the **78 / 100** Composite Presence Score and 6 explainable sub-dimensions:
   - *Website Health (82), Content Performance (76), Audience Engagement (81), Search & Visibility (69), Channel Consistency (74), Conversion Readiness (71).*
6. **Inspect Strategic Insights & Offerings**:
   - Check the **5 Key Insight Cards** (🔥 Strongest Signal, 📈 Growing Channel, ⚠️ Attention Required, 📉 Declining Area, 🎯 Opportunity).
   - Review **"What Is Getting Attention?"** horizontal interest signals for Cold Brew (86), Vegan Breakfast (78), etc.
7. **Examine Prioritized Recommendations**:
   - Review actionable cards structured by **Problem**, **Data Evidence**, **Recommended Action**, and **Expected Impact**.
8. **Inspect Digital Health & Code Auto-Fixer**:
   - Navigate to the **Digital Health & Code** tab to view real-time axe-core and SEO compliance scores.
   - Expand the **Code Auto-Fixer** sub-panel to see deterministic AST patches (Recast + Babel) and PR delivery tools.
9. **Transparency & PaaS Monitoring**:
   - Check **PaaS Monitoring** for the historical trajectory (June 71 &rarr; July 74 &rarr; August 78) and recurring frequency selector.
   - Open **MCP + RAG Transparency** to view the 7-stage architectural data flow.

---

## 🛡️ Data Privacy & Authorization Principle

> *"ProspectIQ analyzes only digital assets and account data explicitly connected and authorized by the business."*

ProspectIQ does not perform unauthorized scraping, password harvesting, or private account intrusion. All telemetry is ingested through authorized business connections and verified web assets.

---

## 🏗️ Architecture & Engine Modules

```
INPUT (Authorized Channels)
  │
  ▼
CONNECTORS (src/intelligence/connectors/)
  │ Validates authorizations (Website, Google, Instagram, WhatsApp, etc.)
  ▼
NORMALIZATION (src/intelligence/normalization/)
  │ Harmonizes disparate telemetry into uniform cross-platform indices
  ▼
SCORING (src/intelligence/scoring/)
  │ Computes Composite Digital Presence Score (78/100) and weighted sub-scores
  ▼
ANALYSIS & CLUSTERING (src/intelligence/analysis/)
  │ Detects cross-platform patterns and extracts product interest signals
  ▼
RAG CONTEXT & REASONING (src/intelligence/rag/)
  │ Transparent multi-stage agentic pipeline simulation
  ▼
EXECUTIVE REPORT (src/intelligence/report/)
  │ Assembles structured intelligence report, P1/P2/P3 actions & historical deltas
```

### Digital Health & Automated AST Fixer Integration
ProspectIQ preserves its automated code-repair engine:
- `src/scan.js`: Headless Playwright Chromium + axe-core WCAG 2.0/2.1/2.2 AA scanner.
- `src/seo.js`: Real-time DOM signal extraction (Title, Meta Description, Viewport, Canonical, Open Graph, Robots, Sitemap).
- `src/mapSource.js`: AST element mapping via `@babel/parser`, `@babel/traverse`, and `recast`.
- `src/fixes.js`: Heuristic label synthesis (icon names, loop indices `i + 1` for pagination dots) and Vision LLM fallbacks.
- `src/verify.js`: Differential before/after violation comparison (`resolved`, `remaining`, `introduced`).
- `src/pr.js`: Automated git branch creation and Octokit GitHub pull request submission.

---

## 🌐 Static Demo Mode (GitHub Pages)

The static demo mode under `docs/` allows sharing a clickable interactive preview on GitHub Pages without requiring a local Node.js runtime:

```bash
# Rebuild the static demo in docs/
npm run build:demo

# Commit and deploy to GitHub Pages (Deploy from branch -> main -> /docs)
```

---

## 🧪 Testing

```bash
npm test
```
Executes:
1. `test/test.js`: Offline end-to-end integration test (JSDOM, axe-core, AST fixer, simulated dashboard smoke test).
2. `test/demo.test.js`: Static demo simulator test.
3. `test/prospectiq.test.js`: Deterministic ProspectIQ scoring, interest signal clustering, connector validation, and report verification.
