# Accessibility Auto-Patcher (prototype, slice 1)

Scan a live page with axe-core, map each problem back to the JSX that produced it, and propose a minimal fix as a reviewable diff. Nothing is written unless you pass `--write`.

## Setup
```bash
npm install
npx playwright install chromium
cp .env.example .env      # optional: point at your college's Qwen-VL endpoint
```

## Dashboard (recommended)
```bash
npm install && npx playwright install chromium
npm run dashboard        # then open http://localhost:4173
```
1. **Scan** any public page (also government sites; read-only). Optional login for private pages.
2. **Review** findings with before/after HTML, AI or rule badge, Approve / Reject.
3. **Your code** (optional): point at your project folder to match findings to the exact file and line, then apply approved fixes.
4. **Verify and pull request**: re-scan your local app, then preview or open the PR (needs `GITHUB_TOKEN`).

The dashboard only listens on your own computer (127.0.0.1). "Load last saved scan" works offline, which makes a good demo backup.

## SEO checks
Tick **SEO** in the dashboard, or use `node src/scan.js <url> --seo` (both) or `--seo-only`. Checks: page title, meta description (missing or wrong length), h1, mobile viewport, canonical link, social sharing tags, noindex, HTTPS, vague link text, structured data, robots.txt, sitemap.xml.
Fixes for missing title, description, viewport, canonical and sharing tags can be written into a Next.js **pages-router** page inside `<Head>` from `next/head` (route `/about` -> `src/pages/about.jsx`). Other checks show advice for a person. Suggestions use the AI model when configured, otherwise simple rules.

## Share a demo with your team (GitHub Pages)
GitHub Pages only serves static files, so the real tool (which needs Node, a browser and your files) cannot run there. Instead `docs/` is a clickable **demo mode** with sample data.
1. `npm run build:demo` (rebuilds `docs/` after any UI change), commit and push.
2. GitHub repo > Settings > Pages > Deploy from a branch > `main` and folder `/docs`.
3. Open `https://<your-username>.github.io/<repo-name>/`.
Never commit `.env`, `auth.json` or a GitHub token. Do not expose the real dashboard publicly: it can write files and push code.

## Command line (same engine)
```bash
npm test                                                   # offline test: no browser, no network
node src/login.js https://<your-app>/login                 # once: log in with a TEST account -> auth.json
node src/scan.js <url1> <url2> ...                         # -> violations.json (read-only)
node src/run.js --repo "<path>/frontend" --from violations.json          # dry run -> out/patches.diff
node src/run.js --repo "<path>/frontend" --from violations.json --write  # apply to files
node src/verify.js --before violations.json --repo "<path>/frontend" --check "npm run lint" http://localhost:3000/<page>
node src/pr.js --repo "<path>/frontend" --dry-run          # preview the PR text
node src/pr.js --repo "<path>/frontend" --base main        # needs GITHUB_TOKEN; opens the PR
```
Keep `auth.json` and your token private (never commit them). Verify against a local dev server (`npm run dev`) so the patched code is what gets scanned.

Statuses in the report: `proposed`, `covered` (same element as an earlier fix), `ambiguous` (several equally likely matches), `not-in-source` (nothing in your code matches; probably a third-party or runtime-generated element), `skipped`.  
Each mapped finding now includes `mapping.confidence` (0-1), `mapping.classification` (`HIGH`/`MEDIUM`/`LOW`), a deterministic root-cause explanation (for supported accessibility rules), and a safe fix status (`FIXED`/`REVIEW REQUIRED`/`UNRESOLVED`).

## Pipeline
1. `scan.js`: Playwright + axe-core (rules: image-alt, button-name, link-name, label). Read-only.
2. `mapSource.js`: finds the JSX element by tag, id/name/type, class, src, text. Confidence high / medium / low; ambiguous matches are reported, never auto-patched.
3. `fixes.js`: rules first (icon name, href, title, field name), AI only for wording. Every fix is labelled `rule` or `ai`; `needsReview` marks weaker guesses.
4. `llm.js`: any OpenAI-compatible endpoint (Qwen-VL). Images are sent as data URLs. Responses are cached in `.cache/` so a slow server cannot break a demo.
5. `run.js`: writes `out/report.json` and `out/patches.diff`. `--write` is still explicit; low-confidence mappings are never auto-written, and medium-confidence mappings require explicit review flow.
6. `verify.js`: compares before/after with regression detection and writes structured verification data (`before`, `after`, `resolved`, `introduced`, `remaining`, rule-level regressions).

## Not built yet
Colour contrast fixes (needs CSS resolution), clickable-div fixes, TypeScript (.tsx) projects, SEO fixes for the Next.js app router.
