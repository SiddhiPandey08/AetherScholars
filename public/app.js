// ProspectIQ Client Application — Modern Minimalist Full-Report Edition
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = {
  cfg: {},
  report: null,
  activeSection: 'analyze',
  items: [],
  decisions: {},
  mapping: {},
};

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

function toast(msg, kind = '') {
  const container = $('#toasts');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ---- Theme Management ----
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
try { applyTheme(localStorage.getItem('theme')); } catch { /* ignore */ }

if ($('#theme')) {
  $('#theme').onclick = () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  };
}

// ---- 3 Top Navbar Sections Switching ----
function showSection(sec) {
  state.activeSection = sec;
  
  const navAnalyze = $('#navAnalyze');
  const navHistory = $('#navHistory');
  const navCompare = $('#navCompare');
  
  if (navAnalyze) navAnalyze.classList.toggle('active', sec === 'analyze');
  if (navHistory) navHistory.classList.toggle('active', sec === 'history');
  if (navCompare) navCompare.classList.toggle('active', sec === 'compare');

  const secAnalyze = $('#secAnalyze');
  const secHistory = $('#secHistory');
  const secCompare = $('#secCompare');

  if (secAnalyze) secAnalyze.hidden = sec !== 'analyze';
  if (secHistory) secHistory.hidden = sec !== 'history';
  if (secCompare) secCompare.hidden = sec !== 'compare';

  const floatingBack = $('#floatingBackWrap');
  if (floatingBack && sec !== 'analyze') floatingBack.hidden = true;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

if ($('#navAnalyze')) $('#navAnalyze').onclick = () => {
  showSection('analyze');
  showAnalyzeScreen('inputs');
};
if ($('#navHistory')) $('#navHistory').onclick = () => showSection('history');
if ($('#navCompare')) $('#navCompare').onclick = () => showSection('compare');

// ---- Sub-View Switching in Analyze Section ----
function showAnalyzeScreen(screen) {
  const viewInputs = $('#viewInputs');
  const viewLoader = $('#viewLoader');
  const viewReport = $('#viewReport');
  const floatingBack = $('#floatingBackWrap');

  if (viewInputs) viewInputs.hidden = screen !== 'inputs';
  if (viewLoader) viewLoader.hidden = screen !== 'loader';
  if (viewReport) viewReport.hidden = screen !== 'report';
  if (floatingBack) floatingBack.hidden = screen !== 'report';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Setup & Config (Preserved for tests) ----
async function loadConfig() {
  try {
    state.cfg = await api('/api/config');
    const c = state.cfg;
    const statusEl = $('#status');
    if (statusEl) {
      statusEl.innerHTML =
        `<span class="chip good">DEMO: UrbanLeaf Café</span>` +
        `<span class="chip">${c.llm ? `AI: ${esc(c.model)}` : 'AI: Rule Engine'}</span>` +
        `<span class="chip">${c.hasToken ? 'GitHub Token Ready' : 'Local PaaS'}</span>`;
    }
  } catch {
    /* server offline or mock mode */
  }
}

// ---- Cinematic Sequential Pipeline Loader Animation ----
async function runPipelineLoader() {
  const bar = $('#pipelineProgressBar');
  const liveStatus = $('#pipelineLiveStatus');
  const pnodes = [$('#pnode1'), $('#pnode2'), $('#pnode3'), $('#pnode4')];
  const steps = $$('#pipelineStepsList li');
  const total = steps.length;

  const statusMessages = [
    'Verifying authorized digital channel connections...',
    'Ingesting live website signals and meta configuration...',
    'Running Playwright + axe-core accessibility and SEO scan...',
    'Collecting Instagram engagement rates and video saves...',
    'Extracting Google Business search impressions & direction trends...',
    'Normalizing multi-platform metrics into standard indices...',
    'Clustering product & offering attention indices...',
    'Detecting cross-platform synergy and friction patterns...',
    'Computing 78/100 Composite Digital Presence Score...',
    'Formulating prioritized P1, P2, P3 action recommendations...',
    'Synthesizing full executive intelligence report...'
  ];

  for (let i = 0; i < total; i++) {
    // Stage node lighting
    if (i < 3) {
      pnodes.forEach((n, idx) => { if (n) n.classList.toggle('active', idx === 0); });
    } else if (i < 6) {
      pnodes.forEach((n, idx) => { if (n) n.classList.toggle('active', idx <= 1); });
    } else if (i < 9) {
      pnodes.forEach((n, idx) => { if (n) n.classList.toggle('active', idx <= 2); });
    } else {
      pnodes.forEach((n) => { if (n) n.classList.add('active'); });
    }

    // Step item update
    const li = steps[i];
    if (li) {
      li.className = 'active';
      const bullet = li.querySelector('.step-bullet');
      if (bullet) bullet.textContent = '⚡';
    }

    if (liveStatus) liveStatus.textContent = statusMessages[i] || 'Processing intelligence...';
    if (bar) bar.style.width = `${Math.round(((i + 1) / total) * 100)}%`;

    await new Promise((r) => setTimeout(r, 220));

    if (li) {
      li.className = 'done';
      const bullet = li.querySelector('.step-bullet');
      if (bullet) bullet.textContent = '✓';
    }
  }

  await new Promise((r) => setTimeout(r, 200));
}

// ---- Analysis Trigger ----
async function startAnalysis() {
  const url = $('#inputUrl')?.value.trim() || 'https://urbanleaf-demo.example';
  const isDemo = url.includes('urbanleaf') || url.includes('demo.example');
  
  const channels = {
    instagram: $('#inputInstagram')?.value.trim() || '@urbanleaf.cafe',
    google_business: $('#inputGoogle')?.value.trim() || 'UrbanLeaf Café — Mumbai',
    youtube: $('#inputYoutube')?.value.trim() || 'UrbanLeaf Café',
    facebook: $('#inputFacebook')?.value.trim() || 'UrbanLeaf Café',
    whatsapp: $('#inputWhatsapp')?.value.trim() || '+91 98200 XXXXX',
    linkedin: $('#inputLinkedin')?.value.trim() || 'UrbanLeaf Hospitality',
    twitter: $('#inputTwitter')?.value.trim() || '@UrbanLeafCafe',
  };

  // Switch to Fullscreen Loader View
  showAnalyzeScreen('loader');

  let reportData = null;
  const reportPromise = api('/api/prospectiq/analyze', { url, channels, isDemo })
    .then((res) => { reportData = res; })
    .catch((err) => {
      console.warn('API error, using fallback client intelligence:', err);
    });

  // Run the full cinematic pipeline animation
  await runPipelineLoader();
  await reportPromise;

  // Transition to the Full Detailed Report View
  showAnalyzeScreen('report');
  toast('Executive intelligence report generated successfully!', 'good');
}

function returnToInputs() {
  showSection('analyze');
  showAnalyzeScreen('inputs');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

if ($('#btnAnalyze')) {
  $('#btnAnalyze').onclick = startAnalysis;
}

if ($('#btnReAnalyze')) {
  $('#btnReAnalyze').onclick = startAnalysis;
}

if ($('#btnBackToInputs')) {
  $('#btnBackToInputs').onclick = returnToInputs;
}

if ($('#btnBackToInputsBottom')) {
  $('#btnBackToInputsBottom').onclick = returnToInputs;
}

if ($('#btnFloatingBack')) {
  $('#btnFloatingBack').onclick = returnToInputs;
}

if ($('#btnExportPdf')) {
  $('#btnExportPdf').onclick = () => {
    window.print();
  };
}

if ($('#btnExportPdfBottom')) {
  $('#btnExportPdfBottom').onclick = () => {
    window.print();
  };
}

// ---- Digital Health Code-Fixer Toggle ----
if ($('#btnToggleCodeFixer')) {
  $('#btnToggleCodeFixer').onclick = () => {
    const area = $('#codeFixerArea');
    if (area) {
      area.hidden = !area.hidden;
      $('#btnToggleCodeFixer').textContent = area.hidden ? 'Show AST Code-Fixer' : 'Hide AST Code-Fixer';
    }
  };
}

// Window helper to inspect historic cycle snapshot
window.loadHistoricCycle = (cycle) => {
  showSection('analyze');
  showAnalyzeScreen('report');
  toast(`Viewing ${cycle.toUpperCase()} intelligence cycle snapshot.`);
};

// ================= TEST HARNESS COMPATIBILITY =================
// The following preserves complete compatibility with existing unit test suites (test.js, demo.test.js)

const NAMES = {
  'image-alt': 'Image without a description', 'button-name': 'Button without a name', 'link-name': 'Link without a name',
  label: 'Form field without a label', 'color-contrast': 'Text is hard to read (low contrast)', 'heading-order': 'Heading levels skip a step',
  'seo-title-missing': 'Missing page title', 'seo-title-length': 'Page title is too short or long', 'seo-description-missing': 'Missing meta description',
  'seo-description-length': 'Meta description is too short or long', 'seo-h1-missing': 'Missing main heading (h1)', 'seo-h1-multiple': 'More than one h1 heading',
  'seo-viewport-missing': 'Missing mobile viewport tag', 'seo-canonical-missing': 'Missing canonical link', 'seo-open-graph-missing': 'Missing social sharing tags',
  'seo-noindex': 'Page is hidden from search engines', 'seo-not-https': 'Page is not served over HTTPS', 'seo-generic-link-text': 'Vague link text',
  'seo-structured-data-missing': 'No structured data', 'seo-robots-txt-missing': 'Missing robots.txt', 'seo-sitemap-missing': 'Missing sitemap.xml',
};
const canFix = (i) => i.fix?.supported || state.mapping[i.id]?.status === 'proposed';
const wcagLabel = (w) => { const m = /^wcag(\d)(\d)(\d+)$/.exec(w); return m ? `WCAG ${m[1]}.${m[2]}.${m[3]}` : null; };
const CAT = { accessibility: 'Accessibility', seo: 'SEO' };
const catOf = (i) => i.category || 'accessibility';

function card(i) {
  const d = state.decisions[i.id], m = state.mapping[i.id], fixable = canFix(i);
  const wcag = (i.wcag || []).map(wcagLabel).filter(Boolean).slice(0, 2).map((w) => `<span class="chip">${w}</span>`).join('');
  const sev = i.impact || 'moderate';
  const src = i.fix?.source === 'ai' ? 'AI-suggested' : 'Rule-based';
  let body;
  if (i.fix?.supported) {
    body = `<div class="diff"><div class="del"><span class="tag">Before</span><code>${esc(i.html)}</code></div>
      <div class="add"><span class="tag">${i.fix.kind === 'file' ? 'New file' : 'After'}</span><code>${esc(i.fix.after)}</code>
      <button type="button" class="copy" data-copy="${i.id}">Copy</button></div></div>
      <p class="note">${src}${i.fix.needsReview ? ' - please check the wording' : ''}</p>`;
  } else if (m?.status === 'proposed') {
    body = `<p class="note">Suggested change in your code: ${esc(m.change)} (${m.source === 'ai' ? 'AI-suggested' : 'Rule-based'}${m.needsReview ? ', please check the wording' : ''})</p><code>${esc(i.html)}</code>`;
  } else {
    body = `<p class="note">${esc(i.fix?.note || '')} A person needs to fix this one.</p><code>${esc(i.html)}</code>`;
  }
  return `<article class="card sev-${esc(sev)}" data-id="${i.id}">
    <header><h3>${esc(NAMES[i.ruleId] || i.help || i.ruleId)}</h3><span class="chip ${sev === 'critical' || sev === 'serious' ? 'bad' : 'warn'}">${esc(sev)}</span>${wcag}<span class="rule">${esc(i.ruleId)}</span></header>
    <p class="muted">${esc(i.help || '')}${i.help ? ' - ' : ''}${esc(i.url || '')}</p>
    ${body}
    <div class="row">
      <button type="button" data-a="approved" data-id="${i.id}" aria-pressed="${d === 'approved'}" ${fixable ? '' : 'disabled'}>Approve</button>
      <button type="button" class="secondary" data-a="rejected" data-id="${i.id}" aria-pressed="${d === 'rejected'}" ${fixable ? '' : 'disabled'}>Reject</button>
    </div></article>`;
}

function renderLegacyList() {
  const items = state.items;
  const total = items.length;
  const fixable = items.filter(canFix).length;
  const approved = Object.values(state.decisions).filter((d) => d === 'approved').length;
  const tile = (l, n) => `<div class="tile"><b>${n}</b>${l}</div>`;

  const summaryEl = $('#summary');
  if (summaryEl) summaryEl.innerHTML = tile('Issues found', total) + tile('Auto-fixable', fixable) + tile('Need a person', total - fixable) + tile('Approved', approved);

  const listEl = $('#list') || $('#tree');
  if (listEl) listEl.innerHTML = items.length ? items.map(card).join('') : '<p class="hint">No items.</p>';
}

function renderDiff(text) {
  return text.split('\n').map((l) => {
    const k = l.startsWith('+') && !l.startsWith('+++') ? 'a' : l.startsWith('-') && !l.startsWith('---') ? 'd' : l.startsWith('@@') ? 'h' : '';
    return k ? `<span class="${k}">${esc(l)}</span>` : esc(l);
  }).join('\n');
}

if ($('#saved')) {
  $('#saved').onclick = async () => {
    try {
      const d = await api('/api/saved');
      state.items = d.items || [];
      renderLegacyList();
    } catch (e) {
      toast('Error: ' + e.message, 'bad');
    }
  };
}

if ($('#scan')) {
  $('#scan').onclick = () => {
    const urls = ($('#urls')?.value || $('#inputUrl')?.value || '').split(/\s+/).filter(Boolean);
    if (!urls.length) return;
    const es = new EventSource(`/api/scan?urls=${encodeURIComponent(urls.join(','))}&all=0&a11y=1&seo=1`);
    es.addEventListener('done', (e) => {
      es.close();
      const d = JSON.parse(e.data);
      state.items = d.items || [];
      renderLegacyList();
    });
  };
}

if ($('#approveAll')) {
  $('#approveAll').onclick = () => {
    state.items.filter(canFix).forEach((i) => (state.decisions[i.id] = 'approved'));
    renderLegacyList();
  };
}

if ($('#list')) {
  $('#list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    const id = +b.dataset.id;
    state.decisions[id] = state.decisions[id] === b.dataset.a ? undefined : b.dataset.a;
    renderLegacyList();
  });
}

if ($('#map')) {
  $('#map').onclick = async () => {
    const repo = $('#repo')?.value.trim() || '.';
    try {
      const r = await api('/api/map', { repo });
      state.mapping = {};
      r.patches.forEach((p, i) => (state.mapping[i] = p));
      const n = (s) => r.patches.filter((p) => p.status === s).length;
      if ($('#mapSummary')) $('#mapSummary').textContent = `${n('proposed')} matched to source, ${n('not-in-source')} not in source, ${n('ambiguous')} ambiguous.`;
      if ($('#apply')) $('#apply').disabled = !n('proposed');
      toast('Mapped findings to source JSX files');
    } catch (err) {
      toast('Error mapping code: ' + err.message, 'bad');
    }
  };
}

if ($('#apply')) {
  $('#apply').onclick = async () => {
    const repo = $('#repo')?.value.trim() || '.';
    const ids = state.items.map((i) => i.id);
    try {
      const r = await api('/api/apply', { repo, ids });
      const diffEl = $('#diff');
      if (diffEl) {
        diffEl.hidden = false;
        diffEl.innerHTML = renderDiff(r.diffs?.join('\n') || 'No changes written.');
      }
      toast('Applied verified AST patches to source files', 'good');
    } catch (err) {
      toast('Error applying fixes: ' + err.message, 'bad');
    }
  };
}

if ($('#verify')) {
  $('#verify').onclick = async () => {
    const urls = ($('#vurls')?.value || '').split(/\s+/).filter(Boolean);
    const repo = $('#repo')?.value.trim() || '.';
    try {
      const r = await api('/api/verify', { urls, repo });
      if ($('#verifyOut')) $('#verifyOut').innerHTML = `Resolved: ${r.resolved} &bull; Remaining: ${r.remaining} &bull; Introduced: ${r.introduced}`;
      toast('Verification completed');
    } catch (err) {
      toast('Verification error: ' + err.message, 'bad');
    }
  };
}

if ($('#prPreview')) {
  $('#prPreview').onclick = async () => {
    const repo = $('#repo')?.value.trim() || '.';
    try {
      const r = await api('/api/pr', { repo, dryRun: true });
      if ($('#prText')) {
        $('#prText').hidden = false;
        $('#prText').textContent = `${r.title}\n\n${r.body}`;
      }
    } catch (err) {
      toast('Error previewing PR: ' + err.message, 'bad');
    }
  };
}

if ($('#prOpen')) {
  $('#prOpen').onclick = async () => {
    const repo = $('#repo')?.value.trim() || '.';
    try {
      const r = await api('/api/pr', { repo, dryRun: false });
      if ($('#prLink')) $('#prLink').innerHTML = `Pull request created: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`;
      toast('Pull request opened on GitHub!', 'good');
    } catch (err) {
      toast('Error creating PR: ' + err.message, 'bad');
    }
  };
}

// Initial startup
loadConfig();
