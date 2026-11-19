# MarketSage Privacy Policy

**Effective Date:** 2026-11-19  
**Extension Version:** 1.1.0  
**Applies to:** MarketSage browser extension for Google Chrome and Microsoft Edge (Manifest V3)

## Summary

MarketSage is designed to run **locally in your browser**. There is **no MarketSage backend server**, no user account system, no analytics, no advertising SDK, and no third-party tracking.

## What Data MarketSage Reads and Stores Locally

When you visit a product page on **Temu**, **AliExpress**, or **DHgate**, MarketSage extracts public listing information from the page DOM (product title, price, seller name/rating, description, and product images) in order to score scam signals and track price changes over time.

The following data is stored **only on your device** in `chrome.storage.local`:

- Recently analyzed product listings (capped at the last 100 viewed products)
- Recorded price history for listings you have visited
- Aggregated seller rating snapshots from listings you have viewed
- Your Scout watchlist items and alert/detection preferences
- Your optional **Google Gemini API key** (only if you choose to enter one in Settings)

You can clear all stored extension data at any time by removing the extension or clearing extension storage in your browser.

## Optional Bring-Your-Own-Key (BYOK) AI Explanations

MarketSage includes an optional **"Explain in plain language"** button in the Protect tab:

- **Default (no API key configured):** No network request is made. MarketSage generates a deterministic plain-language explanation locally on your device.
- **When you configure your own Google Gemini API key:** No request is sent automatically. Only when you explicitly click **"Explain in plain language"**, MarketSage sends the current listing's extracted signals (product title, marketplace, price, seller trust score, and detected warning strings) directly to Google's Gemini API (`https://generativelanguage.googleapis.com/`) using your own API key in the `x-goog-api-key` header.
- Your Gemini API key is never transmitted anywhere other than `https://generativelanguage.googleapis.com/`. Usage of the Gemini API is governed by Google's Gemini API Terms of Service and Privacy Policy.

## Data We Do Not Collect or Share

- We do **not** collect personally identifiable information (name, email, address, payment details).
- We do **not** track your browsing history outside supported marketplace product pages.
- We do **not** sell, rent, or transfer user data to third parties.
- We do **not** operate any remote logging, telemetry, or analytics service.

## Permissions Used

| Permission | Purpose |
|---|---|
| `storage` | Persist local product cache, price history, Scout watchlist, preferences, and optional BYOK Gemini key in `chrome.storage.local`. |
| `activeTab` | Inspect the active marketplace tab when you click the extension popup. |
| `tabs` | Detect navigation completion on supported marketplace URLs (`temu.com`, `aliexpress.com`, `dhgate.com`) to update the toolbar risk badge and query the active tab from the popup. |
| `notifications` | Show optional local browser alerts when high-risk scam warnings are detected on a supported product page. |
| Host permissions: `temu.com`, `aliexpress.com`, `dhgate.com` | Inject the content script to read public product listing details on supported marketplaces. |
| Host permission: `https://generativelanguage.googleapis.com/*` | Send user-initiated BYOK explanation requests directly to Google's Gemini API when the user provides their own API key. |

## Contact

For privacy questions or issues, open an issue in the repository:  
https://github.com/VpkDevs/MarketSage/issues
