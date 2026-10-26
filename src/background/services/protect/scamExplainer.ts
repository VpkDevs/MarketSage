/**
 * Scam-signal explainer (Protect).
 *
 * MarketSage's scam detection is deterministic: SecurityAnalyzer and the
 * ScamDetectionModel produce concrete signals (warnings, risk factors,
 * seller trust). Those signals are accurate but terse — a shopper sees
 * "Price is suspiciously low compared to history" without context.
 *
 * This module turns the signals into a short plain-language explanation:
 *
 * - WITH a Gemini API key (the user's own key, stored in extension
 *   settings — bring-your-own-key): the signals are sent to Gemini,
 *   which writes the explanation. The model is instructed to use only
 *   the supplied signals and not to invent facts.
 * - WITHOUT a key (the default), or if the API call fails for any
 *   reason: a deterministic template explanation built from the same
 *   signals. The feature degrades gracefully and never throws.
 *
 * No key is bundled with the extension and no request is made anywhere
 * except generativelanguage.googleapis.com, only when the user has
 * supplied their own key.
 */
import { Product } from '../../../common/types';
import { SecurityMetrics } from './securityAnalyzer';

export interface ScamSignals {
  productTitle?: string;
  platform?: string;
  price?: number;
  marketPrice?: number;
  sellerTrust: number; // 0-100, higher = more trusted
  warnings: string[];
}

export interface ScamExplanation {
  summary: string;
  points: string[];
  /** 'ai' when written by Gemini, 'fallback' for the built-in template. */
  source: 'ai' | 'fallback';
}

export const AI_SETTINGS_KEY = 'marketsage_ai_settings';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export interface ExplainOptions {
  apiKey?: string;
  model?: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchFn?: typeof fetch;
}

/** Build the signal bundle the explainer narrates. */
export function signalsFromAnalysis(product: Product, metrics: SecurityMetrics): ScamSignals {
  return {
    productTitle: product.title,
    platform: product.platform,
    price: product.price?.current,
    marketPrice: product.price?.market,
    sellerTrust: metrics.sellerTrust,
    warnings: metrics.warnings
  };
}

/**
 * Read the user's own Gemini API key from extension settings.
 * Returns undefined when none is stored (the normal, fully supported
 * no-key state).
 */
export async function getStoredGeminiApiKey(): Promise<string | undefined> {
  try {
    const result = await chrome.storage.local.get(AI_SETTINGS_KEY);
    const key = result[AI_SETTINGS_KEY]?.geminiApiKey;
    return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;
  } catch {
    return undefined;
  }
}

/** Plain-language gloss for the deterministic warnings the analyzers emit. */
const WARNING_GLOSSES: Array<[RegExp, string]> = [
  [/suspiciously low/i, 'The price is far below what this kind of item normally sells for. Unrealistically low prices are the most common hook in marketplace scams — the item may never ship, or may be a counterfeit.'],
  [/new seller|no rating history/i, 'The seller has no rating history in MarketSage yet. New sellers are not automatically dishonest, but there is no track record to check them against.'],
  [/below average ratings/i, 'The seller\u2019s ratings are below average, which can point to poor-quality goods, slow shipping, or unresolved buyer problems.'],
  [/limited product description|short description/i, 'The listing says very little about the product. Vague listings make it hard to know exactly what you would receive, and are common with drop-shipped or misrepresented items.'],
  [/no product images/i, 'The listing has no product images, so there is no way to judge the item\u2019s condition or authenticity before paying.'],
  [/review/i, 'The review pattern looks abnormal (for example, bursts of similar or identical reviews), which can indicate bought or fabricated reviews.'],
  [/keyword|prohibited/i, 'The listing text contains wording associated with known scam or prohibited-item patterns.'],
  [/price.*(spike|drop|change)/i, 'The price has changed sharply in a short period, which can be a sign of a hijacked or manipulated listing.']
];

function glossWarning(warning: string): string {
  for (const [pattern, gloss] of WARNING_GLOSSES) {
    if (pattern.test(warning)) return gloss;
  }
  return warning;
}

function sellerPoint(sellerTrust: number): string | null {
  if (sellerTrust >= 80) {
    return `Seller trust is high (${sellerTrust}/100) based on the seller's rating history.`;
  }
  if (sellerTrust >= 50) {
    return `Seller trust is middling (${sellerTrust}/100) — some history exists, but it is not strong.`;
  }
  if (sellerTrust > 0) {
    return `Seller trust is low (${sellerTrust}/100), which adds to the concern from the other signals.`;
  }
  return null;
}

/**
 * Deterministic explanation built from the signals alone. This is the
 * no-key experience and the fallback for any AI failure.
 */
export function buildFallbackExplanation(signals: ScamSignals): ScamExplanation {
  const points: string[] = signals.warnings.map(glossWarning);
  const seller = sellerPoint(signals.sellerTrust);
  if (seller) points.push(seller);

  if (typeof signals.price === 'number' && typeof signals.marketPrice === 'number' && signals.marketPrice > 0) {
    const pct = Math.round((signals.price / signals.marketPrice) * 100);
    if (pct < 70) {
      points.push(`It is listed at about ${pct}% of the typical market price ($${signals.price.toFixed(2)} vs about $${signals.marketPrice.toFixed(2)}).`);
    }
  }

  let summary: string;
  if (signals.warnings.length === 0) {
    summary = 'MarketSage found no scam signals on this listing. That is reassuring, but not a guarantee — check the seller and the returns policy before paying.';
  } else if (signals.warnings.length === 1) {
    summary = 'MarketSage flagged one thing to look at before buying this item:';
  } else {
    summary = `MarketSage flagged ${signals.warnings.length} things to look at before buying this item:`;
  }

  return { summary, points, source: 'fallback' };
}

function buildPrompt(signals: ScamSignals): string {
  const lines: string[] = [
    'You explain marketplace scam-detection signals to a non-technical shopper.',
    'Use ONLY the signals below. Do not invent facts, prices, or seller details that are not given.',
    'Write in plain, calm language. First line: a one-sentence summary. Then 2-4 short bullet lines, each starting with "- ", each explaining one signal and why it matters.',
    '',
    'Signals:',
    `- Seller trust score (0-100, higher is more trusted): ${signals.sellerTrust}`
  ];
  if (signals.productTitle) lines.push(`- Product: ${signals.productTitle}`);
  if (signals.platform) lines.push(`- Marketplace: ${signals.platform}`);
  if (typeof signals.price === 'number') lines.push(`- Listed price: $${signals.price.toFixed(2)}`);
  if (typeof signals.marketPrice === 'number') lines.push(`- Typical market price: $${signals.marketPrice.toFixed(2)}`);
  if (signals.warnings.length > 0) {
    lines.push('- Warnings detected:');
    for (const w of signals.warnings) lines.push(`  - ${w}`);
  } else {
    lines.push('- Warnings detected: none');
  }
  return lines.join('\n');
}

function parseAiText(text: string): ScamExplanation | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const summary = lines[0].replace(/^[-*]\s*/, '');
  const points = lines.slice(1).map(l => l.replace(/^[-*]\s*/, ''));
  return { summary, points: points.length > 0 ? points : [summary], source: 'ai' };
}

/**
 * Explain the given scam signals. Uses Gemini when a key is provided;
 * falls back to the built-in template explanation when there is no key
 * or the API call fails. Never throws.
 */
export async function explainScamSignals(
  signals: ScamSignals,
  options: ExplainOptions = {}
): Promise<ScamExplanation> {
  const fallback = buildFallbackExplanation(signals);
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    return fallback;
  }

  const fetchFn = options.fetchFn ?? fetch;
  const model = options.model ?? DEFAULT_GEMINI_MODEL;

  try {
    const response = await fetchFn(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(signals) }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 }
        })
      }
    );

    if (!response.ok) {
      return fallback;
    }

    const data: any = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text)
      .filter(Boolean)
      .join('\n');

    if (!text) {
      return fallback;
    }

    return parseAiText(text) ?? fallback;
  } catch {
    return fallback;
  }
}
