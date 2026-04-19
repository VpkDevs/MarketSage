/**
 * Confidence Calculator
 *
 * For every analysis result, computes a structured confidence score that
 * reflects how much trust to place in the risk assessment.
 *
 * Confidence is penalised when:
 *   - Key product fields are missing (description, images, seller info, etc.)
 *   - Heuristic scores are wildly inconsistent with each other (high variance)
 *   - No historical data is available for comparison
 *   - There are too few reviews or ratings to be meaningful
 */

import {
  HeuristicResult,
  ConfidenceScore,
  ConfidenceFactors,
} from '../../types/scamDetection';

export interface ConfidenceInput {
  /** All heuristic results (enabled and disabled). */
  results: HeuristicResult[];
  /** Is seller information available? */
  hasSellerInfo: boolean;
  /** Is product description available? */
  hasDescription: boolean;
  /** Number of product images available. */
  imageCount: number;
  /** Is market / historical price data available? */
  hasMarketPrice: boolean;
  /** Is temporal / historical seller data available? */
  hasTemporalData: boolean;
  /** Total number of reviews (0 = unknown). */
  reviewCount: number;
  /** Seller rating (undefined = unknown). */
  sellerRating?: number;
}

export class ConfidenceCalculator {
  /**
   * Weighting of each factor in the overall confidence score.
   *
   * dataCompleteness weighs most heavily because missing product data is the
   * single biggest source of false readings.  signalAgreement is next because
   * inconsistent signals imply ambiguity.  Historical data and sample size are
   * secondary enrichment signals.
   */
  private static readonly FACTOR_WEIGHTS = {
    dataCompleteness: 0.35,
    signalAgreement: 0.30,
    historicalDataAvailability: 0.20,
    sampleSize: 0.15,
  } as const;

  /**
   * Compute the confidence score for a given analysis.
   */
  compute(input: ConfidenceInput): ConfidenceScore {
    const factors: ConfidenceFactors = {
      dataCompleteness: this.computeDataCompleteness(input),
      signalAgreement: this.computeSignalAgreement(input.results),
      historicalDataAvailability: this.computeHistoricalDataScore(input),
      sampleSize: this.computeSampleSizeScore(input),
    };

    const w = ConfidenceCalculator.FACTOR_WEIGHTS;
    const score =
      factors.dataCompleteness * w.dataCompleteness +
      factors.signalAgreement * w.signalAgreement +
      factors.historicalDataAvailability * w.historicalDataAvailability +
      factors.sampleSize * w.sampleSize;

    const level: ConfidenceScore['level'] =
      score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';

    return { level, score: Math.round(score * 100) / 100, factors };
  }

  // ── Sub-scores ──────────────────────────────────────────────────────────────

  private computeDataCompleteness(input: ConfidenceInput): number {
    const checks: boolean[] = [
      input.hasSellerInfo,
      input.hasDescription,
      input.imageCount > 0,
      input.imageCount >= 2,
      input.hasMarketPrice,
      input.sellerRating !== undefined,
    ];
    const passed = checks.filter(Boolean).length;
    return passed / checks.length;
  }

  private computeSignalAgreement(results: HeuristicResult[]): number {
    const enabled = results.filter(r => r.enabled && r.score > 0);
    if (enabled.length < 2) {
      // Only one or zero active signals → moderate agreement by default
      return 0.6;
    }

    const scores = enabled.map(r => r.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Low stdDev → high agreement (scores cluster together)
    // We normalise: stdDev of 0.5 → agreement of 0; stdDev of 0 → agreement of 1
    return Math.max(0, 1 - stdDev / 0.5);
  }

  private computeHistoricalDataScore(input: ConfidenceInput): number {
    let score = 0;
    if (input.hasMarketPrice) score += 0.5;
    if (input.hasTemporalData) score += 0.5;
    return score;
  }

  private computeSampleSizeScore(input: ConfidenceInput): number {
    // Diminishing returns: 50+ reviews gives full score
    const reviewScore = Math.min(1.0, input.reviewCount / 50);

    // Rating presence
    const ratingScore = input.sellerRating !== undefined ? 1.0 : 0.0;

    return reviewScore * 0.6 + ratingScore * 0.4;
  }
}
