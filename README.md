# MarketSage

**Your intelligent marketplace guide** — a Chrome extension (Manifest V3) that helps you shop Chinese marketplaces safely. MarketSage analyzes product pages on **Temu, AliExpress, and DHgate** for scam signals and pricing games, and explains what it finds in plain language.

Current version: **1.1.0** — see [CHANGELOG.md](CHANGELOG.md) for what changed.

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

- Market average from similar products you have viewed — always labeled with how many products that average rests on (with only one, the UI says so instead of dressing up a single price as a "market")
- A **value score** shown out of 100 (price vs. market, adjusted for seller rating)
- Price **trend** (rising / falling / stable)
- Buy/wait **recommendations** based on value and trend
- **Price insights** computed from the recorded history: drops and rises since your last visit, strong-deal flags (only when the comparison average rests on at least one other viewed product), and a trend note once three or more prices exist. These are arithmetic on prices MarketSage actually recorded — no forecasts and no competitor data

### 🔍 Scout — discovery across what you've already viewed

Scout searches and ranks the products MarketSage has recorded in **your browser** as you browsed Temu, AliExpress, and DHgate:

- **Search** your viewed products by title words
- **Similar** — products resembling the one you're viewing, by title overlap
- **Best value** — ranked by recorded price drops, listed discounts, and ratings
- Filters (marketplace, deals-only, sort), a deals view, and a **watchlist** that keeps each item with the price it had when you added it

Scout is deliberately local: it has no catalog and makes no network requests, so it can only surface products you have actually opened — and the UI says exactly that. (A unified-cart storage layer also exists for grouping products across marketplaces; it has no UI yet.)

### 🤖 AI explanations (bring-your-own-key)

Raw signals are terse. Protect's **"Explain in plain language"** button turns them into a short, readable explanation of *why* a listing looks risky.

- **With your own Google Gemini API key** (entered in the popup's ⚙️ settings panel): the signals are sent to Gemini (`gemini-2.0-flash` by default), which writes the explanation using only those signals.
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
npm run build          # production build into dist/
npm test               # full jest suite
npm run test:unit      # unit tests only
npm run test:ui        # popup component tests
npm run test:e2e       # end-to-end user scenarios
npm run verify         # project sanity checks (scripts/verify-build.js)
node scripts/generate-icons.js   # regenerate the extension icons (build/dev run this automatically)
```

## Architecture

| Piece | Where | Role |
|---|---|---|
| Popup UI | `src/popup/` | React app with Protect / Insight / Scout sections — no account, no login; it opens straight into the tools |
| Content script | `src/content/` | Runs on marketplace pages: platform detection + product extraction from the DOM |
| Background worker | `src/background/` | `ServiceManager` message hub; `SecurityAnalyzer`, `PriceAnalyzer` + price insights, `ProductDiscoveryService` (Scout), and the AI explainer |
| Detection model | `src/common/models/` | `ScamDetectionModel` + per-signal engines, user preference handling |
| Storage | `src/common/utils/storage.ts` | All persistence in `chrome.storage.local` (price history, product cache, seller ratings, carts, Scout watchlist, prefs) |
| Second-gen layer | `src/core/`, `src/services/`, Enhanced UI | Unwired experimental codebase, excluded from build/typecheck — see `docs/second-generation-layer.md` |

Message flows: analysis — popup → background `ANALYZE_CURRENT_PAGE` → background asks the active tab's content script to `EXTRACT_PRODUCT` → background analyzes, caches the product and its price, and returns `{ product, security, pricing }`. Price data — popup → `ANALYZE_PRICE_DATA` → same analysis plus insights from the recorded history. Scout — popup → `DISCOVER_PRODUCTS` → ranking over the local product cache/history (no network). Explanations — popup → `EXPLAIN_RISK` (by product id) → explainer.

## Privacy

Everything is local by default: extracted products, price history, and preferences never leave the browser. The single exception is the optional AI explanation — when *you* press the button *and* have saved your own Gemini key, the listing's signals (title, price, warnings, seller trust) are sent to Google's Gemini API. There is no MarketSage server and no analytics.

## Known limitations (honest list)

- **Scout only knows what you've viewed.** Discovery runs over the products recorded in this browser; it is not connected to live marketplace catalogs or APIs, so it cannot find a product you haven't opened. Price history and insights likewise only accumulate from pages you visit while the extension is installed.
- Three preference heuristics are defined but have no engine yet (`new_seller_large_inventory`, `specification_anomalies`, `product_description_analysis`). The model correctly treats them as *not assessed* instead of silently scoring them zero.
- The second-generation layer (`src/core/`, `src/services/`, the Enhanced UI, and several unwired experimental services) is formally excluded from the build and typecheck; whether it is deleted or repaired into a real v2 is the owner's pending decision — see `docs/second-generation-layer.md`.
- The risk-score blend in `SecurityAnalyzer` is pinned by tests but its argument order deserves a second look.
- A stray 0-byte `README` file sits beside this `README.md`; removing it is pending the owner's call.

## License

Private project — all rights reserved.
