# SEOPilot site — CHANGELOG

## 2026-07-03 — EXP-004b: fix dead "Add to Chrome" CTAs
**Type:** targeted fix, no other content changed.
- Replaced all 5 instances of the `REPLACE_WITH_WEB_STORE_URL_AFTER_APPROVAL` placeholder with the real published store URL:
  `https://chromewebstore.google.com/detail/seopilot/jkgemdmkabllpfkijfbdinfplffpdedp`
- Extension ID (`jkgemdmkabllpfkijfbdinfplffpdedp`) confirmed directly from the Chrome Web Store Developer Dashboard (Status: Published - public). The exact slug+ID pairing was confirmed via a clean 301 redirect from Google's canonical-URL system (`chrome.google.com/webstore/detail/seopilot/<id>` → `chromewebstore.google.com/detail/seopilot/<id>`).
- Note: automated fetch verification of the final page hit a redirect loop (likely a consent/locale bounce specific to this listing) — recommend a quick manual click-through to confirm the install button lands correctly.
- These CTAs had been dead since publish; likely suppressing installs. Fixed alongside the EXP-004 funnel work.

## 2026-07-03 — EXP-004 funnel (Chrome visitors → OperatorOS / ReviewBoost)
**Type:** additive, conservative. No existing content, CTAs, or functionality removed or changed.
- Added a "SEO is just the start" section (`#more-tools`) above the final CTA, using the site's existing `.suite-*` styles.
- Two cards linking to existing offers:
  - **OperatorOS** → live demo (operatoros-demo.netlify.app) + Gumroad ($97).
  - **ReviewBoost Pro** → offer page (reviewboost.html).
- All outbound links carry UTM params for attribution at the destination:
  `?utm_source=seopilot&utm_medium=ext_site&utm_campaign=exp004`
- **Tracking approach (privacy-respecting):** no cookies, no third-party analytics, no PII, no JS added. Attribution done by reading UTM-tagged traffic on destination pages we control (Vercel/Gumroad/Netlify).
