# Changelog

All notable changes to MarketSage are recorded here. Versions follow
the extension manifest version.

## [1.1.0] — 2026-11-08

The elevation release: every popup tab is now real, the shipped UI is
the honest one, and the project type-checks clean.

### Added

- **Scout is a real feature.** `DISCOVER_PRODUCTS` ranks the products
  MarketSage has recorded in this browser: search by title words,
  "similar to what you are viewing," or best-value ranking from
  recorded price drops, listed discounts, and ratings. Filters
  (marketplace, deals-only, sort), a deals view, and a watchlist that
  keeps the price from when an item was added. Scout is local-history
  only — no catalog, no network calls — and says so in the UI.
- **Insight price insights.** `ANALYZE_PRICE_DATA` returns insights
  computed deterministically from the recorded price history: drops
  and rises since the last visit, strong-deal flags (only when the
  comparison average rests on at least one other viewed product), and
  a trend note once three or more prices exist. No forecasts, no
  competitor data, no invented confidence figures.
- **Plain-language risk explanations in the shipped popup.** The
  Protect tab's "Explain in plain language" uses the existing
  `EXPLAIN_RISK` explainer — AI-written when the user has set their
  own Gemini key (bring-your-own-key, stored locally, sent only to
  Google), built-in deterministic text otherwise, with the source
  labeled either way.
- **`docs/second-generation-layer.md`** documenting the status of the
  unwired second-generation codebase layer.

### Changed

- **The shipped popup is the simple, honest UI.** The previous popup
  was a second UI ("Enhanced") that hid every feature behind a local
  login gate backed by no server, with fake account tiers. That shell
  no longer ships; its genuinely real features were ported into the
  main popup.
- **Popup styling completed.** The stylesheet was missing ~65 classes
  the markup referenced, and `.section { display: none }` hid the main
  sections. All referenced classes are now defined.
- **Insight value score displayed on a /100 scale** (the analyzer's
  0..1 score was previously rendered raw against 80/60/40 bands, so
  every listing scored "poor"), and the market average is labeled
  with the number of viewed products it is averaged from.
- **Second-generation layer formally excluded** from the typecheck
  program (it remains in the repo; delete-or-repair is the owner's
  pending decision). `tsc --noEmit` is clean, down from 122+ errors.
- **Manifest:** removed the unused `scripting` permission. Permissions
  are now storage, activeTab, tabs, notifications.

### Fixed

- **A clean clone now builds.** The extension icons referenced by the
  manifest and the webpack copy step existed nowhere in the repo;
  `npm run build` (and `npm run dev`) now generate them first with
  the repo's own `scripts/generate-icons.js`, and `public/icons/` is
  gitignored as a generated directory.
- The old simple Scout section file was truncated mid-literal; it has
  been rewritten against the real backend.

### Tests

- 134 passing (was 102): new suites cover Scout discovery ranking,
  price-insight rules, the background message handlers end to end, and
  the Scout / Insight / Protect-explainer components.

## [1.0.0] — 2026-10-26

Repair pass: production build restored to green, Jest suite at
102/102, the bring-your-own-key AI scam explainer
(`EXPLAIN_RISK`, deterministic fallback, no bundled key, no silent
fallback), unified-cart storage helpers, and README/docs corrected to
match the code.
