/**
 * Cross-Listing Engine
 *
 * Identifies the same (or very similar) product appearing across multiple
 * listings/platforms and flags suspicious patterns such as:
 *
 *   - Extreme price variance for the same product across platforms
 *   - Reused images across unrelated sellers
 *   - Near-identical product titles from different sellers
 *
 * Product identity uses a lightweight fingerprinting approach based on
 * normalised title tokens (Jaccard similarity) so no external embeddings
 * or ML models are required.
 */

import { Storage } from '../../utils/storage';
import {
  ProductFingerprint,
  CrossListingResult,
  CrossListingMatch,
  CrossListingRiskSignal,
  PriceRange,
} from '../../types/scamDetection';
import { Product } from '../../types';

// ── Similarity helpers ────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'for', 'of', 'to', 'in', 'is', 'it',
  'with', 'free', 'new', 'hot', 'top', 'best', 'sale', 'lot', 'item',
]);

function tokenise(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Simple deterministic hash of a string (djb2).
 * Used to create a quick fingerprint of the normalised title.
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(16);
}

/**
 * Jaccard similarity between two token arrays.
 * Returns 0.0–1.0 where 1.0 = identical sets.
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1.0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  setA.forEach(t => { if (setB.has(t)) intersection++; });
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class CrossListingEngine {
  /** Minimum title similarity to consider two listings the same product. */
  private static readonly TITLE_MATCH_THRESHOLD = 0.6;

  /** Price variance above which we flag cross-platform manipulation (%). */
  private static readonly PRICE_VARIANCE_THRESHOLD = 60;

  /** Number of times an image hash must appear before flagging reuse. */
  private static readonly IMAGE_REUSE_MIN_OCCURRENCES = 2;

  /**
   * Fingerprint a product and persist it for future cross-listing analysis.
   */
  async registerProduct(product: Product): Promise<ProductFingerprint> {
    const tokens = tokenise(product.title);
    const fingerprint: ProductFingerprint = {
      productId: product.id,
      platform: product.platform,
      titleTokens: tokens,
      titleHash: simpleHash(tokens.sort().join(' ')),
      priceRange: {
        min: product.price.current,
        max: product.price.current,
      },
      imageCount: product.images?.length ?? 0,
      categoryId: product.categoryId,
      imageHashes: [], // populated separately by ImageAnalysisEngine if available
      timestamp: Date.now(),
    };

    await Storage.saveCrossListingFingerprint(fingerprint);
    return fingerprint;
  }

  /**
   * Analyse a product against all stored fingerprints and return risk signals.
   */
  async analyze(product: Product): Promise<CrossListingResult> {
    const tokens = tokenise(product.title);
    const currentPrice = product.price.current;

    const allFingerprints = await Storage.getCrossListingFingerprints();

    // Exclude the product itself from matching
    const candidates = allFingerprints.filter(
      fp => !(fp.productId === product.id && fp.platform === product.platform)
    );

    const matches: CrossListingMatch[] = [];

    for (const fp of candidates) {
      const similarity = jaccardSimilarity(tokens, fp.titleTokens);
      if (similarity < CrossListingEngine.TITLE_MATCH_THRESHOLD) continue;

      const riskSignals: CrossListingRiskSignal[] = [];

      // Price variance check
      const midPrice = (fp.priceRange.min + fp.priceRange.max) / 2;
      const variancePct =
        midPrice > 0
          ? (Math.abs(currentPrice - midPrice) / midPrice) * 100
          : 0;

      if (variancePct > CrossListingEngine.PRICE_VARIANCE_THRESHOLD) {
        riskSignals.push({
          type: 'price_variance',
          severity: Math.min(1.0, variancePct / 200),
          description: `Price is ${variancePct.toFixed(0)}% different from same product on ${fp.platform}`,
        });
      }

      // Title clone check (very high similarity, different seller/platform)
      if (similarity > 0.9 && fp.platform !== product.platform) {
        riskSignals.push({
          type: 'title_clone',
          severity: 0.5,
          description: `Near-identical listing found on ${fp.platform}`,
        });
      }

      if (riskSignals.length > 0) {
        matches.push({
          fingerprint: fp,
          similarity,
          priceVariancePercent: variancePct,
          riskSignals,
        });
      }
    }

    // Image reuse check via registry
    const imageReuseSignals = await this.checkImageReuse(product);

    // Aggregate
    const allSignals = matches.flatMap(m => m.riskSignals).concat(imageReuseSignals);
    const issues = allSignals.map(s => s.description);

    const riskScore =
      allSignals.length === 0
        ? 0
        : Math.min(
            1.0,
            allSignals.reduce((s, x) => s + x.severity, 0) / allSignals.length
          );

    return { matches, riskScore, issues };
  }

  /**
   * Check whether any of the product's image hashes appear across multiple
   * sellers / products (indicating stock-image reuse or outright theft).
   */
  private async checkImageReuse(product: Product): Promise<CrossListingRiskSignal[]> {
    if (!product.images || product.images.length === 0) return [];

    const registry = await Storage.getImageHashRegistry();
    const signals: CrossListingRiskSignal[] = [];

    for (const hash of Object.keys(registry)) {
      const entry = registry[hash];
      if (
        entry.occurrences >= CrossListingEngine.IMAGE_REUSE_MIN_OCCURRENCES &&
        !entry.sellers.includes(product.seller?.id ?? '')
      ) {
        signals.push({
          type: 'image_reuse',
          severity: Math.min(1.0, entry.occurrences / 10),
          description: `Product image appears on ${entry.occurrences} other listings across ${entry.platforms.length} platform(s)`,
        });
      }
    }

    return signals;
  }

  /** Exposed for use by ImageAnalysisEngine when a hash is computed. */
  async registerImageHash(
    hash: string,
    sellerId: string,
    platform: string
  ): Promise<void> {
    const registry = await Storage.getImageHashRegistry();
    const existing = registry[hash];

    if (existing) {
      if (!existing.sellers.includes(sellerId)) {
        existing.sellers.push(sellerId);
      }
      if (!existing.platforms.includes(platform)) {
        existing.platforms.push(platform);
      }
      existing.occurrences++;
      await Storage.saveImageHashEntry(existing);
    } else {
      await Storage.saveImageHashEntry({
        hash,
        sellers: sellerId ? [sellerId] : [],
        platforms: [platform],
        firstSeen: Date.now(),
        occurrences: 1,
      });
    }
  }

  /**
   * Compute the Jaccard similarity between two title strings.
   * Exposed for testing.
   */
  static computeTitleSimilarity(titleA: string, titleB: string): number {
    return jaccardSimilarity(tokenise(titleA), tokenise(titleB));
  }
}
