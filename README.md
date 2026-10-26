# MarketSage

**Your intelligent marketplace guide** — a Chrome extension (Manifest V3) that helps you shop Chinese marketplaces safely. MarketSage analyzes product pages on **Temu, AliExpress, and DHgate** for scam signals and pricing games, and explains what it finds in plain language.

## What it does

### 🛡️ Protect — scam detection on the page you're viewing

Open a product page on a supported marketplace and MarketSage extracts the listing (title, price, images, seller) and scores it with a weighted detection model. Implemented detection engines cover:

- **Price anomalies** — the listed price vs. market price and the item's own price history
- **Seller history** — seller rating and track record
- **Review patterns** — bursts of similar/identical reviews and other manipulation signs
- **Image quality** — missing, stock, or inconsistent product imagery
- **Cross-platform verification** — the same product checked across marketplaces

Signals roll up into a risk score, a seller-trust score (0–100), and concrete warnings (e.g. *"Price is suspiciously low compared to history"*, *"New seller with no rating history"*). What the app does with each risk level — hide, warn, highlight, or ignore — is configurable per user.

The background worker also watches tab loads: on a supported product page it updates the toolbar badge and can raise a notification when warnings are found.

### 💡 Insight — price analytics

For each analyzed product, MarketSage keeps a **price history** (stored locally) and computes:

- Market average from similar cached products
- A **value score** (price vs. market, adjusted for seller rating)
- Price **trend** (rising / falling / stable)
- Buy/wait **recommendations** based on value and trend

### 🔍 Scout — cross-platform cart

A unified cart and checkout-session manager lets products from different marketplaces be grouped into a single checkout session, with scam filtering applied to search results according to your preferences. (See *Known limitations* — live product discovery is not wired to real marketplace APIs yet.)

### 🤖 AI explanations (new, bring-your-own-key)

Raw signals are terse. Protect's **"Explain in plain language"** button turns them into a short, readable explanation of *why* a listing looks risky.

- **With your own Google Gemini API key** (entered in Settings → *AI Explanations*): the signals are sent to Gemini (`gemini-2.0-flash` by default), which writes the explanation using only those signals.
- **Without a key** — the default — you still get an explanation: a built-in template written from the same signals. If the API call fails for any reason, the extension falls back to the built-in text automatically.

Your key is stored only in your browser's extension storage and is sent only to `generativelanguage.googleapis.com`. No key is bundled with the extension, and no explanation request is made at all until you ask for one.

## Install (load the built extension)

```bash
npm install
npm run build        # produces dist/
```

Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

The toolbar badge turns **ON** when the extension initializes. Open any Temu, AliExpress, or DHgate product page and click the MarketSage icon.

## Development

```bash
npm run dev            # webpack watch build (development mode)
npm run build          # production build into dist/ (runs npm run verify first)
npm test               # full jest suite
npm run test:unit      # unit tests only
npm run test:ui        # popup component tests
npm run test:e2e       # end-to-end user scenarios
npm run verify         # project sanity checks (scripts/verify-build.js)
node scripts/generate-icons.js   # regenerate the extension icons
```

## Architecture

| Piece | Where | Role |
|---|---|---|
| Popup UI | `src/popup/` | React app with Protect / Insight / Scout sections and a shared component library |
| Content script | `src/content/` | Runs on marketplace pages: platform detection + product extraction from the DOM |
| Background worker | `src/background/` | `ServiceManager` message hub; `SecurityAnalyzer`, `PriceAnalyzer`, and the AI explainer |
| Detection model | `src/common/models/` | `ScamDetectionModel` + per-signal engines, user preference handling |
| Storage | `src/common/utils/storage.ts` | All persistence in `chrome.storage.local` (price history, product cache, seller ratings, carts, prefs) |
| Auth | `src/core/auth/` | Local account/session management used by the popup |

Message flow for an analysis: popup → background `ANALYZE_CURRENT_PAGE` → background asks the active tab's content script to `EXTRACT_PRODUCT` → background analyzes, caches the product and its price, and returns `{ product, security, pricing }`. Explanations: popup → background `EXPLAIN_RISK` (by product id) → explainer.

## Privacy

Everything is local by default: extracted products, price history, and preferences never leave the browser. The single exception is the optional AI explanation — when *you* press the button *and* have saved your own Gemini key, the listing's signals (title, price, warnings, seller trust) are sent to Google's Gemini API. There is no MarketSage server and no analytics.

## Known limitations (honest list)

- **Scout discovery is a shell**: the unified cart/checkout code is real, but live product search across marketplaces is a placeholder (`fetchFromPlatform` returns nothing yet), and two Enhanced-section actions (`DISCOVER_PRODUCTS`, `ANALYZE_PRICE_DATA`) have no backend implementation yet.
- Three preference heuristics are defined but have no engine yet (`new_seller_large_inventory`, `specification_anomalies`, `product_description_analysis`). The model now correctly treats them as *not assessed* instead of silently scoring them zero.
- The Enhanced popup's variant styling is partially unstyled: the component library composes BEM-style class names that the stylesheet (camelCase) doesn't define.
- `src/core/` and `src/service-worker.ts` contain an abandoned second-generation layer that nothing imports; the production build type-checks only the bundled graph.
- Accounts are local-only (no server sync), and the risk-score blend in `SecurityAnalyzer` is pinned by tests but its argument order deserves a second look.

## License

Private project — all rights reserved.
