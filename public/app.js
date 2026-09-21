const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { items: [], decisions: {}, mapping: {}, cfg: {}, tab: 'all', cats: [] };

const NAMES = {
  'image-alt': 'Image without a description', 'button-name': 'Button without a name', 'link-name': 'Link without a name',
  label: 'Form field without a label', 'color-contrast': 'Text is hard to read (low contrast)', 'heading-order': 'Heading levels skip a step',
  'seo-title-missing': 'Missing page title', 'seo-title-length': 'Page title is too short or long', 'seo-description-missing': 'Missing meta description',
  'seo-description-length': 'Meta description is too short or long', 'seo-h1-missing': 'Missing main heading (h1)', 'seo-h1-multiple': 'More than one h1 heading',
  'seo-viewport-missing': 'Missing mobile viewport tag', 'seo-canonical-missing': 'Missing canonical link', 'seo-open-graph-missing': 'Missing social sharing tags',
  'seo-noindex': 'Page is hidden from search engines', 'seo-not-https': 'Page is not served over HTTPS', 'seo-generic-link-text': 'Vague link text',
  'seo-structured-data-missing': 'No structured data', 'seo-robots-txt-missing': 'Missing robots.txt', 'seo-sitemap-missing': 'Missing sitemap.xml',
};
const ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const WEIGHT = { critical: 12, serious: 8, moderate: 4, minor: 2 };
const CAT = { accessibility: 'Accessibility', seo: 'SEO' };
const catOf = (i) => i.category || 'accessibility';

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
const log = (m) => { const el = $('#log'); el.textContent += m + '\n'; el.scrollTop = el.scrollHeight; };
function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4000);
}
const setBusy = (btn, on) => { btn.classList.toggle('loading', on); btn.disabled = on; };
function step(n) {
  document.querySelectorAll('#steps li').forEach((li) => { li.classList.toggle('on', +li.dataset.s <= n); li.toggleAttribute('aria-current', +li.dataset.s === n); });
}
const chip = (t, k = '') => `<span class="chip ${k}">${esc(t)}</span>`;
const canFix = (i) => i.fix.supported || state.mapping[i.id]?.status === 'proposed';
const wcagLabel = (w) => { const m = /^wcag(\d)(\d)(\d+)$/.exec(w); return m ? `WCAG ${m[1]}.${m[2]}.${m[3]}` : null; };

// ---- theme ----
function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
try { applyTheme(localStorage.getItem('theme')); } catch { /* storage unavailable */ }
$('#theme').onclick = () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('theme', next); } catch { /* ignore */ }
};

async function loadConfig() {
  state.cfg = await api('/api/config');
  const c = state.cfg;
  $('#status').innerHTML =
    chip(c.llm ? `AI: ${c.model}` : 'AI: rule-only', c.llm ? 'good' : 'warn') +
    chip(c.hasAuth ? 'Saved login' : 'No saved login') +
    chip(c.hasToken ? 'GitHub token set' : 'No GitHub token', c.hasToken ? 'good' : 'warn');
  $('#saved').disabled = !c.hasSaved;
  step(1);
}

function setItems(items, categories) {
  state.items = items; state.decisions = {}; state.mapping = {}; state.tab = 'all';
  state.cats = categories?.length ? categories : [...new Set(items.map(catOf))];
  if (!state.cats.length) state.cats = ['accessibility'];
  ['#results', '#project', '#ship'].forEach((s) => ($(s).hidden = false));
  render(); step(2);
  $('#results').scrollIntoView?.({ behavior: 'smooth' });
}

const scoreOf = (list) => Math.max(0, 100 - list.reduce((s, i) => s + (WEIGHT[i.impact] || 4), 0));

function renderScores() {
  $('#scores').innerHTML = state.cats.map((c) => {
    const list = state.items.filter((i) => catOf(i) === c), s = scoreOf(list);
    const k = s >= 90 ? '' : s >= 60 ? 'warn' : 'bad';
    return `<div class="score"><div class="ring ${k}" style="--p:${s}"><span>${s}</span></div>
      <div><b>${CAT[c] || c} health</b><small>${list.length} issue${list.length === 1 ? '' : 's'}. An estimate: starts at 100, loses points by severity.</small></div></div>`;
  }).join('');
}

function mapText(m) {
  if (!m) return '';
  const t = {
    proposed: `Your code: ${m.file}:${m.line} (${m.confidence} confidence)`,
    'not-in-source': 'Not found in your code. It is probably a third-party or generated element.',
    ambiguous: 'Several places in your code could match, so it was left alone.',
    covered: 'Covered by another fix to the same element.',
    skipped: `Skipped: ${m.reason}`,
  }[m.status] || m.status;
  return `<p class="map">${esc(t)}</p>`;
}

function card(i) {
  const d = state.decisions[i.id], m = state.mapping[i.id], fixable = canFix(i);
  const cat = catOf(i);
  const wcag = (i.wcag || []).map(wcagLabel).filter(Boolean).slice(0, 2).map((w) => chip(w)).join('');
  const sev = i.impact || 'moderate';
  const src = i.fix.source === 'ai' ? 'AI-suggested' : 'Rule-based';
  let body;
  if (i.fix.supported) {
    body = `<div class="diff"><div class="del"><span class="tag">Before</span><code>${esc(i.html)}</code></div>
      <div class="add"><span class="tag">${i.fix.kind === 'file' ? 'New file' : 'After'}</span><code>${esc(i.fix.after)}</code>
      <button type="button" class="copy" data-copy="${i.id}">Copy</button></div></div>
      <p class="note">${src}${i.fix.needsReview ? ' - please check the wording' : ''}</p>`;
  } else if (m?.status === 'proposed') {
    body = `<p class="note">Suggested change in your code: ${esc(m.change)} (${m.source === 'ai' ? 'AI-suggested' : 'Rule-based'}${m.needsReview ? ', please check the wording' : ''})</p><code>${esc(i.html)}</code>`;
  } else {
    body = `<p class="note">${esc(i.fix.note)} A person needs to fix this one.</p><code>${esc(i.html)}</code>`;
  }
  return `<article class="card sev-${esc(sev)}" data-id="${i.id}">
    <header><h3>${esc(NAMES[i.ruleId] || i.help || i.ruleId)}</h3>${chip(sev, sev === 'critical' || sev === 'serious' ? 'bad' : sev === 'moderate' ? 'warn' : 'info')}${chip(CAT[cat] || cat)}${wcag}<span class="rule">${esc(i.ruleId)}</span></header>
    <p class="muted">${esc(i.help || '')}${i.help ? ' - ' : ''}${esc(i.url || '')}</p>
    ${body}${mapText(m)}
    <div class="row">
      <button type="button" data-a="approved" data-id="${i.id}" aria-pressed="${d === 'approved'}" ${fixable ? '' : 'disabled'}>Approve</button>
      <button type="button" class="secondary" data-a="rejected" data-id="${i.id}" aria-pressed="${d === 'rejected'}" ${fixable ? '' : 'disabled'}>Reject</button>
    </div></article>`;
}

function render() {
  const items = state.items, total = items.length, fixable = items.filter(canFix).length;
  const approved = Object.values(state.decisions).filter((d) => d === 'approved').length;
  const tile = (l, n) => `<div class="tile"><b>${n}</b>${l}</div>`;
  renderScores();
  $('#summary').innerHTML = tile('Issues found', total) + tile('Auto-fixable', fixable) + tile('Need a person', total - fixable) + tile('Approved', approved);
  const present = [...new Set(items.map(catOf))];
  $('#tabs').innerHTML = present.length > 1
    ? ['all', ...present].map((c) => `<button type="button" data-tab="${c}" aria-pressed="${state.tab === c}">${c === 'all' ? 'All' : CAT[c] || c} (${c === 'all' ? total : items.filter((i) => catOf(i) === c).length})</button>`).join('')
    : '';
  const f = $('#filter').value;
  const shown = items.filter((i) => (state.tab === 'all' || catOf(i) === state.tab) && (f === 'all' || (f === 'fixable') === canFix(i)))
    .sort((a, b) => (ORDER[a.impact] ?? 4) - (ORDER[b.impact] ?? 4) || a.id - b.id);
  $('#list').innerHTML = shown.length ? shown.map(card).join('') : `<div class="empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l3 3 5-6"/></svg>
    <p><b>Nothing to show here.</b><br>${total ? 'Try a different filter.' : 'No issues were found in the checks you ran.'}</p></div>`;
  $('#apply').disabled = !approved;
}

$('#list').addEventListener('click', async (e) => {
  const cp = e.target.closest('button[data-copy]');
  if (cp) {
    try { await navigator.clipboard.writeText(state.items[+cp.dataset.copy].fix.after); toast('Copied to clipboard'); } catch { toast('Could not copy. Select the text and copy it by hand.', 'bad'); }
    return;
  }
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const id = +b.dataset.id;
  state.decisions[id] = state.decisions[id] === b.dataset.a ? undefined : b.dataset.a;
  render();
  document.querySelector(`button[data-id="${id}"][data-a="${b.dataset.a}"]`)?.focus();
});
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button[data-tab]'); if (b) { state.tab = b.dataset.tab; render(); } });
$('#filter').onchange = render;
$('#approveAll').onclick = () => {
  state.items.filter((i) => canFix(i) && (state.tab === 'all' || catOf(i) === state.tab)).forEach((i) => (state.decisions[i.id] = 'approved'));
  render();
};

// ---- step 1: scan ----
$('#scan').onclick = () => {
  const urls = $('#urls').value.split(/\s+/).filter(Boolean);
  const a11y = $('#chkA11y').checked, seo = $('#chkSeo').checked;
  if (!urls.length) return toast('Enter at least one page address.', 'bad');
  if (!a11y && !seo) return toast('Choose at least one thing to check.', 'bad');
  $('#log').textContent = ''; setBusy($('#scan'), true); $('#bar').hidden = false;
  const end = () => { setBusy($('#scan'), false); $('#bar').hidden = true; };
  const es = new EventSource(`/api/scan?urls=${encodeURIComponent(urls.join(','))}&all=${$('#all').checked ? 1 : 0}&a11y=${a11y ? 1 : 0}&seo=${seo ? 1 : 0}`);
  es.addEventListener('progress', (e) => log(JSON.parse(e.data).message));
  es.addEventListener('done', (e) => {
    es.close(); end();
    const d = JSON.parse(e.data); log('Done.'); setItems(d.items, d.categories);
    toast(d.items.length ? `${d.items.length} issue${d.items.length === 1 ? '' : 's'} found` : 'No issues found');
  });
  es.addEventListener('fail', (e) => { es.close(); end(); log('Error: ' + JSON.parse(e.data).message); toast('Scan failed. See the log for details.', 'bad'); });
  es.onerror = () => { es.close(); end(); };
};
$('#saved').onclick = async () => {
  try { const d = await api('/api/saved'); setItems(d.items, d.categories); } catch (e) { toast('Error: ' + e.message, 'bad'); }
};
$('#loginBtn').onclick = () => { $('#loginBox').hidden = !$('#loginBox').hidden; };
$('#loginOpen').onclick = async () => {
  try { await api('/api/login/start', { url: $('#loginUrl').value }); $('#loginSave').disabled = false; toast('Login window opened. Log in there, then press save.'); }
  catch (e) { toast('Error: ' + e.message, 'bad'); }
};
$('#loginSave').onclick = async () => {
  try { await api('/api/login/finish', {}); $('#loginSave').disabled = true; toast('Login session saved'); loadConfig(); }
  catch (e) { toast('Error: ' + e.message, 'bad'); }
};

// ---- step 3: your code ----
function renderDiff(text) {
  return text.split('\n').map((l) => {
    const k = l.startsWith('+') && !l.startsWith('+++') ? 'a' : l.startsWith('-') && !l.startsWith('---') ? 'd' : l.startsWith('@@') ? 'h' : '';
    return k ? `<span class="${k}">${esc(l)}</span>` : esc(l);
  }).join('\n');
}
$('#map').onclick = async () => {
  setBusy($('#map'), true);
  try {
    const r = await api('/api/map', { repo: $('#repo').value });
    state.mapping = {}; r.patches.forEach((p, i) => (state.mapping[i] = p));
    const n = (s) => r.patches.filter((p) => p.status === s).length;
    $('#mapSummary').textContent = `${n('proposed')} matched to your code, ${n('not-in-source')} not in your code, ${n('ambiguous')} ambiguous, ${n('covered')} covered by another fix.`;
    render(); step(3);
  } catch (e) { $('#mapSummary').textContent = 'Error: ' + e.message; toast('Could not read your project folder.', 'bad'); }
  setBusy($('#map'), false);
};
$('#apply').onclick = async () => {
  const ids = Object.keys(state.decisions).filter((k) => state.decisions[k] === 'approved').map(Number);
  if (!confirm(`Write fixes for ${ids.length} approved finding(s) into the files in ${$('#repo').value}?`)) return;
  setBusy($('#apply'), true);
  try {
    const r = await api('/api/apply', { repo: $('#repo').value, ids });
    $('#diff').hidden = false; $('#diff').innerHTML = renderDiff(r.diffs.join('\n') || 'No matching code was changed.');
    $('#mapSummary').textContent = `${r.patches.filter((p) => p.status === 'proposed').length} fix(es) written. Review the changes below, then verify.`;
    step(4); toast('Fixes written to your files');
  } catch (e) { $('#mapSummary').textContent = 'Error: ' + e.message; toast('Could not apply the fixes.', 'bad'); }
  setBusy($('#apply'), false);
  $('#apply').disabled = false;
};

// ---- step 4: verify + pull request ----
$('#verify').onclick = async () => {
  setBusy($('#verify'), true);
  try {
    const r = await api('/api/verify', { urls: $('#vurls').value.split(/\s+/).filter(Boolean), check: $('#check').value, repo: $('#repo').value });
    const t = (l, n) => `<div class="tile"><b>${n}</b>${l}</div>`;
    $('#verifyOut').innerHTML = t('Before', r.before) + t('Resolved', r.resolved) + t('Remaining', r.remaining) + t('New problems', r.introduced) + (r.check ? t('Check', r.check) : '');
  } catch (e) { $('#verifyOut').textContent = 'Error: ' + e.message; }
  setBusy($('#verify'), false);
};
const pr = (dryRun) => api('/api/pr', { repo: $('#repo').value, base: $('#base').value, dryRun });
$('#prPreview').onclick = async () => {
  try { const r = await pr(true); $('#prText').hidden = false; $('#prText').textContent = `${r.title}\n\n${r.body}`; } catch (e) { $('#prLink').textContent = 'Error: ' + e.message; }
};
$('#prOpen').onclick = async () => {
  if (!confirm('Create a branch, push it, and open a pull request?')) return;
  setBusy($('#prOpen'), true);
  try { const r = await pr(false); $('#prLink').innerHTML = `Pull request opened: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`; toast('Pull request opened'); }
  catch (e) { $('#prLink').textContent = 'Error: ' + e.message; toast('Could not open the pull request.', 'bad'); }
  setBusy($('#prOpen'), false);
};

loadConfig();
