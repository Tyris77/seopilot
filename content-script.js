/**
 * SEOPilot — content-script.js
 * Runs on every page, responds to audit requests from popup.
 */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SP_PING') { sendResponse({ ok: true }); return; }
  if (msg.type === 'SP_AUDIT') {
    try {
      sendResponse({ ok: true, ...runAudit() });
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }
});

function runAudit() {
  const url   = window.location.href;
  const domain = window.location.hostname;
  const title  = document.title || '';

  const metaDesc = getMeta('description');
  const metaRobots = getMeta('robots');
  const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
  const ogTitle   = getMeta('og:title', 'property');
  const ogDesc    = getMeta('og:description', 'property');
  const ogImage   = getMeta('og:image', 'property');
  const twitterCard = getMeta('twitter:card', 'name');

  const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim()).filter(Boolean);
  const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim()).filter(Boolean);
  const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.innerText.trim()).filter(Boolean);

  const allImgs     = Array.from(document.querySelectorAll('img'));
  const imgsNoAlt   = allImgs.filter(i => !i.alt || i.alt.trim() === '').length;
  const totalImgs   = allImgs.length;

  const allLinks     = Array.from(document.querySelectorAll('a[href]'));
  const internalLinks = allLinks.filter(a => {
    try { return new URL(a.href).hostname === domain; } catch { return false; }
  }).length;
  const externalLinks = allLinks.filter(a => {
    try { return new URL(a.href).hostname !== domain && a.href.startsWith('http'); } catch { return false; }
  }).length;
  const nofollowLinks = allLinks.filter(a => (a.rel || '').includes('nofollow')).length;

  const wordCount = (document.body?.innerText || '').split(/\s+/).filter(Boolean).length;
  const hasViewport = !!document.querySelector('meta[name="viewport"]');
  const hasHttps    = window.location.protocol === 'https:';
  const schemaTypes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map(s => { try { const j = JSON.parse(s.textContent); return j['@type'] || ''; } catch { return ''; } })
    .filter(Boolean);

  const issues   = [];
  const warnings = [];
  const passes   = [];

  if (!title)                       issues.push('Missing page title');
  else if (title.length < 30)       warnings.push('Title too short (' + title.length + ' chars, aim 50–60)');
  else if (title.length > 60)       warnings.push('Title too long (' + title.length + ' chars, aim 50–60)');
  else                               passes.push('Title length is good');

  if (!metaDesc)                    issues.push('Missing meta description');
  else if (metaDesc.length < 120)   warnings.push('Meta description short (' + metaDesc.length + ' chars, aim 120–160)');
  else if (metaDesc.length > 160)   warnings.push('Meta description too long (' + metaDesc.length + ' chars)');
  else                               passes.push('Meta description length is good');

  if (h1s.length === 0)             issues.push('No H1 tag found');
  else if (h1s.length > 1)         warnings.push('Multiple H1 tags (' + h1s.length + ') — use only one');
  else                               passes.push('Single H1 tag found');

  if (!canonical)                   warnings.push('No canonical URL set');
  else                               passes.push('Canonical URL present');

  if (!hasHttps)                    issues.push('Not served over HTTPS');
  else                               passes.push('HTTPS enabled');

  if (!hasViewport)                  issues.push('Missing viewport meta tag (not mobile-friendly)');
  else                               passes.push('Mobile viewport meta tag found');

  if (imgsNoAlt > 0)                warnings.push(imgsNoAlt + ' image' + (imgsNoAlt > 1 ? 's' : '') + ' missing alt text');
  else if (totalImgs > 0)           passes.push('All images have alt text');

  if (!ogTitle && !ogDesc)          warnings.push('No Open Graph tags (affects social sharing)');
  else                               passes.push('Open Graph tags present');

  if (schemaTypes.length === 0)     warnings.push('No structured data / schema markup found');
  else                               passes.push('Schema markup found: ' + schemaTypes.join(', '));

  if (wordCount < 300)              warnings.push('Low word count (' + wordCount + ' words, aim 300+)');
  else          content-script.js                     passes.push('Good content length (' + wordCount + ' words)');

  if (metaRobots && (metaRobots.includes('noindex') || metaRobots.includes('nofollow'))) {
    issues.push('Robots meta blocks crawling: "' + metaRobots + '"');
  }

  const total = issues.length + warnings.length + passes.length;
  const score = total > 0 ? Math.round((passes.length / total) * 100) : 0;

  return {
    url, domain, title,
    metaDesc, canonical, ogTitle, ogDesc, ogImage, twitterCard,
    h1s, h2s: h2s.slice(0, 5), h3s: h3s.slice(0, 5),
    totalImgs, imgsNoAlt,
    internalLinks, externalLinks, nofollowLinks,
    wordCount, hasViewport, hasHttps,
    schemaTypes,
    issues, warnings, passes,
    score,
    auditedAt: new Date().toISOString()
  };
}

function getMeta(name, attr = 'name') {
  return document.querySelector('meta[' + attr + '="' + name + '"]')?.content || '';
}
