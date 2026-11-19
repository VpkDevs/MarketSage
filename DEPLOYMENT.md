# MarketSage Deployment Guide (Chrome Web Store & Edge Add-ons)

This guide covers building, verifying, packaging, and submitting **MarketSage** (Manifest V3, v1.1.0) to the **Chrome Web Store** and **Microsoft Edge Add-ons**.

---

## 1. Stack & Prerequisites

| Component | Details |
|---|---|
| Platform | Chromium Manifest V3 Browser Extension (Chrome `>=102`, Microsoft Edge `>=102`) |
| Bundler | Webpack 5 (`webpack.config.js`, zero source maps in production, single-file MV3 bundles) |
| Frontend UI | React 18 + TypeScript 5 (`src/popup/`) |
| Background Worker | MV3 Service Worker (`src/background/background.ts` + `ServiceManager`) |
| Content Script | DOM extraction on Temu, AliExpress, DHgate (`src/content/index.ts`) |
| Optional AI | Bring-Your-Own-Key (BYOK) Google Gemini API (`gemini-2.0-flash` via `https://generativelanguage.googleapis.com/`) |
| Runtime | **Node.js >= 18.0.0** (CI runs Node 20) |
| Backend Server | **None** — all state lives in `chrome.storage.local` |

---

## 2. Environment Variables

The shipped Chrome/Edge extension requires **zero `.env` variables** at build time or runtime. All variables referenced anywhere in the repository are documented in [`.env.example`](.env.example):

| Variable | Required? | Scope | Notes |
|---|---|---|---|
| `NODE_ENV` | No | Build / test (`src/common/errors/ErrorHandler.ts`) | Automatically set by Webpack (`production` / `development`) and Jest (`test`). |
| `API_BASE_URL` | No | Excluded second-gen layer (`src/config/AppConfig.ts`) | **Not bundled** into the shipped extension. Leave empty. |
| *(User Gemini API Key)* | Optional (BYOK) | Runtime (`chrome.storage.local`) | Entered by the end user in Popup → ⚙️ Settings. Stored locally under `marketsage_ai_settings`. Never bundled and never read from `.env`. |

---

## 3. Local Verification & Release Packaging

Run the full verification gate on a clean checkout:

```bash
npm install
npm run lint          # ESLint across src/ (0 errors expected)
npm run typecheck     # Strict TypeScript check (`tsc --noEmit`)
npm test -- --ci      # Full Jest suite (unit, integration, UI, e2e, manifest/dist audit)
npm run package       # Clean production build + MV3 dist/ integrity audit + deterministic ZIP
```

### What `npm run package` produces & verifies

1. Runs `npm run build` (`scripts/verify-build.js` → `scripts/generate-icons.js` → production Webpack build into `dist/`).
2. Runs `scripts/audit-dist.js` against `dist/` and fails fast if:
   - `dist/manifest.json` is not valid MV3 or its version diverges from `package.json`
   - Any referenced file (`background.service_worker`, `action.default_popup`, `action.default_icon`, `icons`, `content_scripts`, `options_page`, `web_accessible_resources`) is missing or empty
   - Any PNG icon fails PNG magic-byte or declared pixel-dimension checks (`16x16`, `48x48`, `128x128`)
   - `popup.html` contains inline `<script>` tags or broken script references (MV3 CSP check)
   - Any forbidden file leaks into `dist/` (`.env*`, `.map`, `.ts`/`.tsx`, `.DS_Store`, `Thumbs.db`, `.pem`/`.key`)
   - `generativelanguage.googleapis.com` host permission is not strictly `https://`
3. Produces deterministic, cross-platform upload artifacts in `release/` (gitignored):
   - `release/marketsage-v1.1.0.zip` — ready to upload directly to Chrome Web Store and Edge Add-ons
   - `release/marketsage-v1.1.0.zip.sha256` — SHA-256 verification checksum

---

## 4. Load Unpacked Smoke Test (Local Chrome & Edge)

Before uploading to either store, verify the unpacked `dist/` folder directly in a Chromium browser:

### Google Chrome
1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the `dist/` directory
4. Confirm:
   - Extension loads with zero errors in the Extensions card ("Errors" button should not appear)
   - Toolbar icon displays the green **`ON`** badge
   - Open a non-marketplace tab (e.g., `https://example.com`) and verify the badge does **not** turn red `ERR`
   - Open a product page on **Temu**, **AliExpress**, or **DHgate**, click the MarketSage icon, and verify:
     - **Protect** tab displays Safety Score, Seller Trust, warnings, and **"Explain in plain language"** (returns built-in explanation with no key, or AI explanation when a valid Gemini key is saved in ⚙️ Settings; invalid key shows explicit `BYOK_INVALID_KEY` coded fallback)
     - **Insight** tab displays current price, sample-size-labeled market average, Value Rating `/100`, and recorded price history
     - **Scout** tab searches/ranks locally viewed products and persists items to the Watchlist

### Microsoft Edge
1. Navigate to `edge://extensions`
2. Enable **Developer mode** (left sidebar)
3. Click **Load unpacked** and select `dist/`
4. Run the same smoke checklist above.

---

## 5. Chrome Web Store Submission Steps

1. Register / sign in to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (one-time $5 developer registration fee if not already paid).
2. Click **New Item** → Upload `release/marketsage-v1.1.0.zip`.
3. Fill out **Store Listing**:
   - **Title:** `MarketSage`
   - **Summary (<=132 chars):** matches `manifest.json` description (`Your Intelligent Marketplace Guide - Smart shopping assistant for Chinese marketplaces`)
   - **Category:** Shopping
   - **Store Icon:** `128x128` PNG (`public/icons/icon128.png` after build, or higher-polish branding icon)
   - **Screenshots:** Upload at least 1 screenshot (`1280x800` or `640x400`, PNG/JPEG) showing Protect, Insight, and Scout popups
   - **Small Promo Tile (recommended):** `440x280` PNG
4. Fill out **Privacy Practices** (see Section 7 below for exact truthful disclosures & justifications) and link the public Privacy Policy URL (e.g., `https://github.com/VpkDevs/MarketSage/blob/main/PRIVACY.md`).
5. Click **Save Draft** → **Submit for Review**.

---

## 6. Microsoft Edge Add-ons Submission Steps

Edge accepts the **exact same MV3 `.zip`** (`release/marketsage-v1.1.0.zip`):

1. Register / sign in to [Microsoft Partner Center — Edge Program](https://partner.microsoft.com/dashboard/microsoftedge) (free developer registration).
2. Click **New extension** → Upload `release/marketsage-v1.1.0.zip`.
3. Provide the store listing metadata, screenshots (`1280x800`), store logo (`300x300` PNG required by Edge), and Privacy Policy URL (`PRIVACY.md`).
4. Paste the permission justifications from Section 7 into **Notes for certification** to speed up review.
5. Submit for certification.

---

## 7. Store Review: Permissions & Privacy Disclosures

Use these exact, truthful justifications on the Chrome Web Store **Privacy Practices** tab and Edge certification notes:

### Single Purpose Statement
> Analyze product listings on Temu, AliExpress, and DHgate for deterministic scam signals, track local price history, and search previously viewed listings locally in the user's browser.

### Permission Justifications

| Permission | Exact Code Usage & Justification |
|---|---|
| `storage` | Stores recently analyzed product snapshots (max 100), per-product price history, seller rating aggregates, Scout watchlist, user settings, and the user's optional BYOK Gemini API key in `chrome.storage.local`. |
| `activeTab` | Queries the currently active tab when the user clicks the extension popup to inspect the open product listing. |
| `tabs` | Listens for page load completion (`chrome.tabs.onUpdated`) strictly filtered to `temu.com`, `aliexpress.com`, and `dhgate.com` hostnames to refresh the toolbar risk badge, and queries the active tab from the popup. |
| `notifications` | Raises optional local desktop notifications (`chrome.notifications.create`) when security warnings are detected on a supported marketplace page and notifications are enabled. |
| Host: `*://*.temu.com/*`, `*://*.aliexpress.com/*`, `*://*.dhgate.com/*` | Injects `content.js` to extract product title, price, seller, and image fields from product pages on the three supported marketplaces. |
| Host: `https://generativelanguage.googleapis.com/*` | Used **only** when the user explicitly clicks "Explain in plain language" AND has entered their own Google Gemini API key in Settings. Sends only the extracted listing signals (title, price, seller trust score, warnings) over HTTPS with `x-goog-api-key`. Zero requests occur without a user-provided key. |

### Remote Code Declaration
- **Are you using remote code?** **No.** All JavaScript and CSS are bundled inside the submitted `.zip`. No external scripts, `eval()`, or dynamic remote code loading exist in the extension.

### Data Usage Disclosures
- **Data collected/transmitted by developer:** None. No MarketSage server, no telemetry, no analytics.
- **Optional user-initiated external call:** Listing signals are sent to `https://generativelanguage.googleapis.com/` *only* when the user opts into BYOK Gemini explanations with their own key.
- **Certifications:** Data is not sold to third parties, not used for unrelated purposes, and not used for creditworthiness/lending.

---

## 8. Honest Readiness & Remaining Owner Steps

### Current Feature Reality (No Theater)
- **Protect tab:** Functional end-to-end (DOM extraction → deterministic weighted scoring → optional BYOK Gemini plain-language explanation with explicit coded errors: `BYOK_KEY_MISSING`, `BYOK_INVALID_KEY`, `BYOK_RATE_LIMITED`, `BYOK_API_ERROR`, `BYOK_NETWORK_ERROR`, `BYOK_EMPTY_RESPONSE`; zero house API key).
- **Insight tab:** Functional over **local recorded history** (`ANALYZE_PRICE_DATA`). Market average is honestly labeled with how many similar *viewed* products it rests on. It does not query external historical price databases or live competitor feeds.
- **Scout tab:** Functional over **local browser history** (`DISCOVER_PRODUCTS`) — search, similar-to-current, best-value ranking, filters, deals tab, and watchlist. It does not search live Temu/AliExpress/DHgate catalogs. A unified-cart storage helper exists in `src/common/utils/storage.ts`, with no popup UI yet.
- **Excluded second-generation layer:** `src/core/`, `src/services/`, `Enhanced*` popup components, and `_merged_from_market-sage2/` remain preserved in the repository and are **not bundled** into `dist/` or `release/marketsage-v1.1.0.zip` (see [`docs/second-generation-layer.md`](docs/second-generation-layer.md)).
- **Monetization:** Not wired. MarketSage currently ships as a free, local-first BYOK extension.

### Remaining Owner Steps (Requires Vince's Action)
1. **Live Marketplace DOM Spot-Check:** Test `dist/` unpacked on live product pages on `temu.com`, `aliexpress.com`, and `dhgate.com`. Marketplace frontends rotate CSS class names frequently — verify/update selectors in `src/content/services/platformDetector.ts` and `productExtractor.ts` before store submission if any site's DOM layout changed.
2. **Store Accounts & Fees:** Register / sign into Chrome Web Store Developer Console ($5 one-time fee) and Microsoft Edge Partner Center (free).
3. **Store Graphic Assets:** Capture real popup screenshots (`1280x800`), optional Chrome small promo tile (`440x280`), and Edge store logo (`300x300` PNG).
4. **Public Privacy Policy URL:** Link `https://github.com/VpkDevs/MarketSage/blob/main/PRIVACY.md` (or host on GitHub Pages) in both store dashboards.
5. **Upload Release Bundle:** Run `npm run package` locally (or download `marketsage-release-zip` from GitHub Actions CI) and upload `release/marketsage-v1.1.0.zip`.
6. **Optional Future Decisions (Not Blocking Store Launch):**
   - Decide whether to keep, archive, or remove the excluded second-generation layer (`docs/second-generation-layer.md`) and `_merged_from_market-sage2/`.
   - Optional monetization bolt-on (e.g., ExtensionPay / Stripe / Ko-fi license key check for Pro features) if targeting recurring revenue.
