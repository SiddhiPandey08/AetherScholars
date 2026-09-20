const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { items: [], decisions: {}, mapping: {}, cfg: {} };

async function api(path, body) {
  const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
const log = (m) => { const el = $('#log'); el.textContent += m + '\n'; el.scrollTop = el.scrollHeight; };
const busy = (on) => { $('#scan').disabled = on; $('#saved').disabled = on || !state.cfg.hasSaved; };
function step(n) {
  document.querySelectorAll('#steps li').forEach((li) => { li.classList.toggle('on', +li.dataset.s <= n); li.toggleAttribute('aria-current', +li.dataset.s === n); });
}
const canFix = (i) => i.fix.supported || state.mapping[i.id]?.status === 'proposed';
const chip = (t, k = '') => `<span class="chip ${k}">${esc(t)}</span>`;

async function loadConfig() {
  state.cfg = await api('/api/config');
  const c = state.cfg;
  $('#status').innerHTML =
    chip(c.llm ? `AI: ${c.model}` : 'AI: rule-only (no AI server set)', c.llm ? 'good' : 'warn') +
    chip(c.hasAuth ? 'Saved login: yes' : 'Saved login: none') +
    chip(c.hasToken ? 'GitHub token: set' : 'GitHub token: not set', c.hasToken ? 'good' : 'warn');
  $('#saved').disabled = !c.hasSaved;
  step(1);
}

function setItems(items) {
  state.items = items; state.decisions = {}; state.mapping = {};
  ['#results', '#project', '#ship'].forEach((s) => ($(s).hidden = false));
  render(); step(2);
  $('#results').scrollIntoView?.({ behavior: 'smooth' });
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
  const d = state.decisions[i.id];
  const fixable = canFix(i);
  const m = state.mapping[i.id];
  const impact = i.impact ? chip(i.impact, i.impact === 'critical' || i.impact === 'serious' ? 'bad' : 'warn') : '';
  const wcag = (i.wcag || []).map((w) => chip(w.toUpperCase())).join(' ');
  const body = fixable
    ? `<div class="diff"><div class="del"><span>Before</span><code>${esc(i.html)}</code></div><div class="add"><span>After</span><code>${esc(i.fix.after)}</code></div></div>
       <p class="note">${i.fix.source === 'ai' ? 'AI-suggested' : 'Rule-based'}${i.fix.needsReview ? ' - please check the wording' : ''}</p>`
    : m?.status === 'proposed'
      ? `<p class="note">Suggested change in your code: ${esc(m.change)} (${m.source === 'ai' ? 'AI-suggested' : 'Rule-based'}${m.needsReview ? ', please check the wording' : ''})</p><code>${esc(i.html)}</code>`
      : `<p class="note">${esc(i.fix.note)} A person needs to fix this one.</p><code>${esc(i.html)}</code>`;
  return `<article class="card" data-id="${i.id}">
    <header><h3>${esc(i.ruleId)}</h3>${impact}${wcag}</header>
    <p class="muted">${esc(i.help || '')}${i.help ? ' - ' : ''}${esc(i.url || '')}</p>
    ${body}${mapText(state.mapping[i.id])}
    <div class="row">
      <button data-a="approved" data-id="${i.id}" aria-pressed="${d === 'approved'}" ${fixable ? '' : 'disabled'}>Approve</button>
      <button class="rej" data-a="rejected" data-id="${i.id}" aria-pressed="${d === 'rejected'}" ${fixable ? '' : 'disabled'}>Reject</button>
    </div></article>`;
}

function render() {
  const total = state.items.length, fixable = state.items.filter(canFix).length;
  const approved = Object.values(state.decisions).filter((d) => d === 'approved').length;
  const tile = (l, n) => `<div class="tile"><b>${n}</b>${l}</div>`;
  $('#summary').innerHTML = tile('Issues found', total) + tile('Auto-fixable', fixable) + tile('Need a person', total - fixable) + tile('Approved', approved);
  const f = $('#filter').value;
  const shown = state.items.filter((i) => f === 'all' || (f === 'fixable') === canFix(i));
  $('#list').innerHTML = shown.length ? shown.map(card).join('') : '<p class="note">Nothing to show. No issues of this kind were found.</p>';
  $('#apply').disabled = !approved;
}

$('#list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  const id = +b.dataset.id;
  state.decisions[id] = state.decisions[id] === b.dataset.a ? undefined : b.dataset.a;
  render();
  document.querySelector(`button[data-id="${id}"][data-a="${b.dataset.a}"]`)?.focus();
});
$('#filter').onchange = render;
$('#approveAll').onclick = () => { state.items.filter(canFix).forEach((i) => (state.decisions[i.id] = 'approved')); render(); };

$('#scan').onclick = () => {
  const urls = $('#urls').value.split(/\s+/).filter(Boolean);
  if (!urls.length) return log('Enter at least one page address.');
  $('#log').textContent = ''; busy(true);
  const es = new EventSource(`/api/scan?urls=${encodeURIComponent(urls.join(','))}&all=${$('#all').checked ? 1 : 0}`);
  es.addEventListener('progress', (e) => log(JSON.parse(e.data).message));
  es.addEventListener('done', (e) => { es.close(); busy(false); log('Done.'); setItems(JSON.parse(e.data).items); });
  es.addEventListener('fail', (e) => { es.close(); busy(false); log('Error: ' + JSON.parse(e.data).message); });
  es.onerror = () => { es.close(); busy(false); };
};
$('#saved').onclick = async () => { try { setItems((await api('/api/saved')).items); } catch (e) { log('Error: ' + e.message); } };

$('#loginBtn').onclick = () => { $('#loginBox').hidden = !$('#loginBox').hidden; };
$('#loginOpen').onclick = async () => {
  try { await api('/api/login/start', { url: $('#loginUrl').value }); $('#loginSave').disabled = false; log('Login window opened. Log in there, then press the save button.'); }
  catch (e) { log('Error: ' + e.message); }
};
$('#loginSave').onclick = async () => {
  try { await api('/api/login/finish', {}); $('#loginSave').disabled = true; log('Login session saved.'); loadConfig(); }
  catch (e) { log('Error: ' + e.message); }
};

$('#map').onclick = async () => {
  try {
    const r = await api('/api/map', { repo: $('#repo').value });
    state.mapping = {}; r.patches.forEach((p, i) => (state.mapping[i] = p));
    const n = (s) => r.patches.filter((p) => p.status === s).length;
    $('#mapSummary').textContent = `${n('proposed')} matched to your code, ${n('not-in-source')} not in your code, ${n('ambiguous')} ambiguous, ${n('covered')} covered by another fix.`;
    render(); step(3);
  } catch (e) { $('#mapSummary').textContent = 'Error: ' + e.message; }
};
$('#apply').onclick = async () => {
  const ids = Object.keys(state.decisions).filter((k) => state.decisions[k] === 'approved').map(Number);
  if (!confirm(`Write fixes for ${ids.length} approved finding(s) into the files in ${$('#repo').value}?`)) return;
  try {
    const r = await api('/api/apply', { repo: $('#repo').value, ids });
    $('#diff').hidden = false; $('#diff').textContent = r.diffs.join('\n') || 'No matching code was changed.';
    $('#mapSummary').textContent = `${r.patches.filter((p) => p.status === 'proposed').length} fix(es) written. Review the changes below, then verify.`;
    step(4);
  } catch (e) { $('#mapSummary').textContent = 'Error: ' + e.message; }
};

$('#verify').onclick = async () => {
  try {
    const r = await api('/api/verify', { urls: $('#vurls').value.split(/\s+/).filter(Boolean), check: $('#check').value, repo: $('#repo').value });
    const t = (l, n) => `<div class="tile"><b>${n}</b>${l}</div>`;
    $('#verifyOut').innerHTML = t('Before', r.before) + t('Resolved', r.resolved) + t('Remaining', r.remaining) + t('New problems', r.introduced) + (r.check ? t('Check', r.check) : '');
  } catch (e) { $('#verifyOut').textContent = 'Error: ' + e.message; }
};
const pr = (dryRun) => api('/api/pr', { repo: $('#repo').value, base: $('#base').value, dryRun });
$('#prPreview').onclick = async () => {
  try { const r = await pr(true); $('#prText').hidden = false; $('#prText').textContent = `${r.title}\n\n${r.body}`; } catch (e) { $('#prLink').textContent = 'Error: ' + e.message; }
};
$('#prOpen').onclick = async () => {
  if (!confirm('Create a branch, push it, and open a pull request?')) return;
  try { const r = await pr(false); $('#prLink').innerHTML = `Pull request opened: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`; } catch (e) { $('#prLink').textContent = 'Error: ' + e.message; }
};

loadConfig();
