# The second-generation layer — status and disposition

**Status: present in the repo, formally excluded from the build and the
typecheck program, decision pending.**

MarketSage contains a second, more ambitious generation of the codebase
that was written alongside the shipping extension but never wired into
it:

- `src/core/` — a dependency-injection container, an auth provider with
  account tiers, AI/analytics/cache/monitoring/social subsystems
- `src/services/` — a checkout service layer
- `src/service-worker.ts` — an alternate service worker entry
- `src/popup/components/EnhancedApp.tsx`, `src/popup/components/enhanced/`,
  and the `Enhanced*Section.tsx` popup components — a second popup UI
- A set of unwired experimental background modules:
  `src/background/services/{cache,integration,models,monitoring}`,
  `src/background/services/protect/aiDetector.ts`,
  `src/background/services/protect/smartRiskAssessment.ts`,
  `src/common/utils/MemoryManager.ts`, `src/config/AppConfig.ts`

## Why it is excluded (verified 2026-11-08, v1.1.0 elevation pass)

- **Nothing in the shipping extension imports it.** The webpack build
  never bundled it; the live popup, background worker, and content
  script do not reference it.
- **Its auth gate cannot work.** `EnhancedAuthProvider` logs in against
  a backend that does not exist in this repo, and the "Enhanced" popup
  hid every feature behind that login.
- **Parts of it presented fabricated data as real.** The Enhanced Scout
  section fell back to hardcoded demo products, and the Enhanced Insight
  section invented competitor prices, price history, and a "92%"
  confidence figure. That is incompatible with how MarketSage is
  positioned — every number it shows must come from data it actually
  recorded — so its real features (the risk explainer, the Gemini-key
  settings) were ported into the shipping popup instead, and the
  fabricated paths were retired with it.
- **It did not type-check.** It accounted for the bulk of the project's
  122+ `tsc` errors.

## How the exclusion works

- `tsconfig.json` `exclude` lists the paths above (plus
  `tests/setup/mocks/types.ts`, a test-mock declaration file with a
  known conflict that Jest's per-file compilation is unaffected by).
  With the exclusion, `npx tsc --noEmit` is clean for everything that
  ships.
- Webpack never included these files, so the built extension is
  unchanged by the exclusion.
- **No file was deleted.** Git history and the working tree both keep
  the layer intact.

## The pending decision

Whether this layer is eventually **deleted** or **repaired into a real
v2** is the project owner's call, deliberately not made by the
elevation pass. If it is repaired, the entry criteria should be: a real
backend or an honest local-only design, no fabricated data anywhere,
and a clean typecheck with the exclusions removed.
