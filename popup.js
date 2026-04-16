/**
 * SEOPilot — popup.js
 */

const els = {
  badgePro:        document.getElementById('badgePro'),
  badgeFree:       document.getElementById('badgeFree'),
  statusBanner:    document.getElementById('statusBanner'),
  statusText:      document.getElementById('statusText'),
  usageSection:    document.getElementById('usageSection'),
  usageCount:      document.getElementById('usageCount'),
  usageBar:        document.getElementById('usageBar'),
  actionsSection:  document.getElementById('actionsSection'),
  btnAudit:        document.getElementById('btnAudit'),
  btnExport:       document.getElementById('btnExport'),
  progressSection: document.getElementById('progressSection'),
  progressText:    document.getElementById('progressText'),
  resultsSection:  document.getElementById('resultsSection'),
  scoreCanvas:     document.getElementById('scoreCanvas'),
  scoreNum:        document.getElementById('scoreNum'),
  scoreLabel:      document.getElementById('scoreLabel'),
  siteInfo:        document.getElementById('siteInfo'),
  issueCount:      document.getElementById('issueCount'),
  warnCount:       document.getElementById('warnCount'),
  passCount:       document.getElementById('passCount'),
  issuesList:      document.getElementById('issuesList'),
  warningsList:    document.getElementById('warningsList'),
  passesList:      document.getElementById('passesList'),
  metaTitle:       document.getElementById('metaTitle'),
  metaDesc:        document.getElementById('metaDesc'),
  metaH1:          document.getElementById('metaH1'),
  metaWords:       document.getElementById('metaWords'),
  metaImgs:        document.getElementById('metaImgs'),
  metaIntLinks:    document.getElementById('metaIntLinks'),
  metaExtLinks:    document.getElementById('metaExtLinks'),
  upgradeSection:  document.getElementById('upgradeSection'),
  licenseInput:    document.getElementById('licenseInput'),
  btnActivate:     document.getElementById('btnActivate'),
  licenseMsg:      document.getElementById('licenseMsg'),
  proSection:      document.getElementById('proSection'),
  proKeyDisplay:   document.getElementById('proKeyDisplay'),
  btnDeactivate:   document.getElementById('btnDeactivate'),
};

let state = { isPro: false, usedToday: 0, remaining: 10, dailyLimit: 10, results: null };

(async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const blocked = !tab || /^chrome:|^chrome-extension:|chrome\.google\.com\/webstore/.test(tab.url || '');

  const status = await sendToSW({ type: 'SP_GET_STATUS' });
  if (status) Object.assign(state, status);

  renderHeader();
  renderUsage();
  renderUpgrade();

  if (blocked) {
    setStatus('error', '⚠ Cannot audit Chrome system pages');
    els.actionsSection.style.display = '';
    els.btnAudit.disabled = true;
  } else {
    setStatus('ready', `✓ Ready — ${tab.hostname || new URL(tab.url).hostname}`);
    els.actionsSection.style.display = '';
    els.btnAudit.disabled = !state.isPro && state.remaining <= 0;
    if (state.isPro) {
      els.btnExport.style.display = '';
      els.btnExport.disabled = false;
      els.btnExport.querySelector('.sp-pro-tag').style.display = 'none';
    }
  }

  wireEvents(tab);
  wireTabs();
})();

function renderHeader() {
  els.badgePro.style.display  = state.isPro ? '' : 'none';
  els.badgeFree.style.display = state.isPro ? 'none' : '';
}

function renderUsage() {
  if (state.isPro) { els.usageSection.style.display = 'none'; return; }
  els.usageSection.style.display = '';
  els.usageCount.textContent = `${state.usedToday} / ${state.dailyLimit}`;
  const pct = Math.min(100, (state.usedToday / state.dailyLimit) * 100);
  els.usageBar.style.width = pct + '%';
  if (pct >= 100) els.usageBar.style.background = '#ef4444';
}

function renderUpgrade() {
  els.upgradeSection.style.display = state.isPro ? 'none' : '';
  els.proSection.style.display = state.isPro ? '' : 'none';
  if (state.isPro && state.licenseKey) els.proKeyDisplay.textContent = state.licenseKey;
}

function renderResults(data) {
  state.results = data;
  els.resultsSection.style.display = '';

  // Score ring
  drawScoreRing(data.score);
  els.scoreNum.textContent = data.score;
  els.scoreLabel.textContent = scoreLabel(data.score);
  els.siteInfo.textContent = data.domain;

  // Counts
  els.issueCount.textContent = data.issues.length;
  els.warnCount.textContent  = data.warnings.length;
  els.passCount.textContent  = data.passes.length;

  // Lists
  renderList(els.issuesList,   data.issues,   '🔴');
  renderList(els.warningsList, data.warnings, '🟡');
  renderList(els.passesList,   data.passes,   '🟢');

  // Meta panel
  els.metaTitle.textContent    = data.title || '—';
  els.metaDesc.textContent     = data.metaDesc || '—';
  els.metaH1.textContent       = data.h1s[0] || '—';
  els.metaWords.textContent    = data.wordCount;
  els.metaImgs.textContent     = `${data.totalImgs} total, ${data.imgsNoAlt} missing alt`;
  els.metaIntLinks.textContent = data.internalLinks;
  els.metaExtLinks.textContent = data.externalLinks;
}

function renderList(container, items, icon) {
  container.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'sp-check-item';
    empty.style.color = 'var(--muted)';
    empty.textContent = 'None';
    container.appendChild(empty);
    return;
  }
  items.forEach(text => {
    const row = document.createElement('div');
    row.className = 'sp-check-item';
    row.innerHTML = `<span class="sp-check-icon">${icon}</span><span>${text}</span>`;
    container.appendChild(row);
  });
}

function drawScoreRing(score) {
  const canvas = els.scoreCanvas;
  const ctx = canvas.getContext('2d');
  const cx = 36, cy = 36, r = 30, lw = 6;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  ctx.clearRect(0, 0, 72, 72);
  // Track
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#253525'; ctx.lineWidth = lw; ctx.stroke();
  // Fill
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + (Math.PI * 2 * score / 100);
  ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.lineCap = 'round'; ctx.stroke();
}

function scoreLabel(score) {
  if (score >= 80) return '✓ Good SEO';
  if (score >= 60) return '⚠ Needs work';
  if (score >= 40) return '⚠ Poor SEO';
  return '✗ Critical issues';
}

function wireTabs() {
  document.querySelectorAll('.sp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.sp-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sp-tab-panel').forEach(p => p.style.display = 'none');
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).style.display = '';
    });
  });
}

function wireEvents(tab) {
  els.btnAudit.addEventListener('click', () => runAudit(tab));
  els.btnActivate.addEventListener('click', activateLicense);
  els.licenseInput.addEventListener('keydown', e => { if (e.key === 'Enter') activateLicense(); });
  els.btnDeactivate.addEventListener('click', deactivateLicense);

  els.btnExport.addEventListener('click', () => {
    if (!state.isPro || !state.results) return;
    exportReport(state.results);
  });
}

async function runAudit(tab) {
  if (!tab) return;
  if (!state.isPro && state.remaining <= 0) {
    setStatus('error', '⚠ Daily limit reached. Upgrade to Pro.');
    return;
  }

  els.actionsSection.style.display = 'none';
  els.resultsSection.style.display = 'none';
  els.progressSection.style.display = '';
  els.progressText.textContent = 'Auditing page…';

  try {
    // Inject content script if not already there
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-script.js'] }).catch(() => {});
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'SP_AUDIT' });
    if (!response?.ok) throw new Error(response?.error || 'Audit failed.');

    if (!state.isPro) {
      await sendToSW({ type: 'SP_INCREMENT', count: 1 });
      state.usedToday++;
      state.remaining = Math.max(0, state.dailyLimit - state.usedToday);
    }

    els.progressSection.style.display = 'none';
    els.actionsSection.style.display = '';
    renderUsage();
    renderResults(response);
    const totalIssues = response.issues.length;
    setStatus(totalIssues > 0 ? 'error' : 'ready',
      totalIssues > 0
        ? `⚠ ${totalIssues} issue${totalIssues > 1 ? 's' : ''} found on ${response.domain}`
        : `✓ Audit complete — ${response.domain}`
    );
  } catch (err) {
    els.progressSection.style.display = 'none';
    els.actionsSection.style.display = '';
    setStatus('error', `⚠ ${err.message}`);
  }
}

function exportReport(data) {
  const lines = [
    `SEOPilot Report — ${data.domain}`,
    `Audited: ${new Date(data.auditedAt).toLocaleString()}`,
    `URL: ${data.url}`,
    `Score: ${data.score}/100`,
    '',
    '=== ISSUES ===',
    ...data.issues.map(i => `[!] ${i}`),
    '',
    '=== WARNINGS ===',
    ...data.warnings.map(w => `[~] ${w}`),
    '',
    '=== PASSES ===',
    ...data.passes.map(p => `[✓] ${p}`),
    '',
    '=== PAGE DATA ===',
    `Title: ${data.title}`,
    `Meta Description: ${data.metaDesc}`,
    `H1: ${data.h1s[0] || 'None'}`,
    `Word Count: ${data.wordCount}`,
    `Images: ${data.totalImgs} (${data.imgsNoAlt} missing alt)`,
    `Internal Links: ${data.internalLinks}`,
    `External Links: ${data.externalLinks}`,
    `Canonical: ${data.canonical || 'None'}`,
    `Schema Types: ${data.schemaTypes.join(', ') || 'None'}`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `seopilot-${data.domain}-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

async function activateLicense() {
  const key = els.licenseInput.value.trim();
  if (!key) return;
  els.btnActivate.disabled = true;
  els.btnActivate.textContent = '…';
  const result = await sendToSW({ type: 'SP_ACTIVATE_LICENSE', key });
  els.btnActivate.disabled = false;
  els.btnActivate.textContent = 'Activate';
  if (result?.ok) {
    showLicenseMsg('ok', '✓ Pro activated!');
    state.isPro = true; state.licenseKey = result.key; state.remaining = Infinity;
    setTimeout(() => { renderHeader(); renderUsage(); renderUpgrade(); els.btnExport.style.display = ''; els.btnAudit.disabled = false; }, 1200);
  } else {
    showLicenseMsg('error', result?.error || 'Invalid key.');
  }
}

async function deactivateLicense() {
  await sendToSW({ type: 'SP_REMOVE_LICENSE' });
  state.isPro = false; state.licenseKey = null;
  state.remaining = Math.max(0, state.dailyLimit - state.usedToday);
  renderHeader(); renderUsage(); renderUpgrade();
}

function setStatus(type, text) {
  els.statusBanner.className = `sp-status sp-status--${type}`;
  els.statusText.textContent = text;
}

function showLicenseMsg(type, text) {
  els.licenseMsg.style.display = '';
  els.licenseMsg.className = `sp-license-msg sp-license-msg--${type}`;
  els.licenseMsg.textContent = text;
}

async function sendToSW(msg) {
  try { return await chrome.runtime.sendMessage(msg); }
  catch (e) { return null; }
}
