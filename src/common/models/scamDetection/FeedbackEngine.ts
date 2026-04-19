/**
 * Feedback Engine
 *
 * Ingests user feedback and uses it to nudge heuristic weights over time.
 *
 * Feedback types:
 *   confirmed_scam   – user confirmed the listing is a scam
 *   confirmed_safe   – user confirmed the listing is safe
 *   false_positive   – system flagged as risky, user says it's safe
 *   false_negative   – system said safe, user says it was a scam
 *
 * Weight update rule (conservative Bayesian-style nudge):
 *   false_positive → reduce weights of top-contributing signals by NUDGE_DOWN
 *   false_negative → increase weights of signals that had low scores by NUDGE_UP
 *   confirmed_scam  (when score was low) → increase signal weights by NUDGE_UP
 *   confirmed_safe  (when score was high) → decrease signal weights by NUDGE_DOWN
 *
 * Weights are clamped to [MIN_WEIGHT, MAX_WEIGHT] at all times.
 */

import { Storage } from '../../utils/storage';
import {
  FeedbackEntry,
  FeedbackType,
  FeedbackWeightAdjustment,
} from '../../types/scamDetection';

/**
 * Conservative nudge applied to a heuristic weight per feedback batch.
 * Small increments prevent overfitting to individual user signals while
 * still allowing the system to adapt over time.
 */
const NUDGE_UP = 0.02;
const NUDGE_DOWN = 0.02;

/**
 * Weight bounds ensure no heuristic becomes completely ignored (< 0.1)
 * or dominates all others at maximum trust (> 1.0).
 */
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 1.0;

/** How many feedback entries to aggregate before adjusting weights. */
const BATCH_SIZE = 5;

export class FeedbackEngine {
  /**
   * Record a user feedback event and trigger a weight update when enough
   * feedback has accumulated.
   *
   * @param productId          ID of the product being reviewed.
   * @param feedbackType       Type of feedback.
   * @param originalProbability  The risk probability that was shown to the user.
   * @param originalRiskLevel  The risk level that was shown to the user.
   * @param topSignals         heuristicIds with the highest scores in that analysis.
   * @param userId             Anonymous user identifier.
   * @param platform           Source platform.
   * @param sellerId           Seller identifier (optional).
   * @param notes              Optional free-text notes.
   *
   * @returns The feedback entry that was stored and any weight adjustments made.
   */
  async submitFeedback(params: {
    productId: string;
    feedbackType: FeedbackType;
    originalProbability: number;
    originalRiskLevel: string;
    topSignals: string[];
    userId: string;
    platform: string;
    sellerId?: string;
    notes?: string;
  }): Promise<{
    entry: FeedbackEntry;
    weightAdjustments: FeedbackWeightAdjustment[];
  }> {
    const entry: FeedbackEntry = {
      id: `feedback-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      productId: params.productId,
      sellerId: params.sellerId,
      platform: params.platform,
      feedbackType: params.feedbackType,
      originalProbability: params.originalProbability,
      originalRiskLevel: params.originalRiskLevel,
      topSignals: params.topSignals,
      userId: params.userId,
      timestamp: Date.now(),
      notes: params.notes,
    };

    await Storage.saveFeedbackEntry(entry);

    // Check if we have enough entries to trigger a batch weight update
    const allEntries = await Storage.getFeedbackEntries();
    const weightAdjustments = await this.maybeUpdateWeights(allEntries);

    return { entry, weightAdjustments };
  }

  /**
   * Return the current feedback-adjusted weight for a heuristic,
   * falling back to the default weight if no feedback weight is stored.
   */
  async getAdjustedWeight(
    heuristicId: string,
    defaultWeight: number
  ): Promise<number> {
    const weights = await Storage.getFeedbackWeights();
    return weights[heuristicId] ?? defaultWeight;
  }

  /**
   * Return all stored feedback-adjusted weights.
   */
  async getAllAdjustedWeights(): Promise<Record<string, number>> {
    return Storage.getFeedbackWeights();
  }

  /**
   * Reset all feedback-adjusted weights (e.g., when the user resets settings).
   */
  async resetWeights(): Promise<void> {
    await Storage.saveFeedbackWeights({});
  }

  // ── Internal weight-update logic ────────────────────────────────────────────

  private async maybeUpdateWeights(
    entries: FeedbackEntry[]
  ): Promise<FeedbackWeightAdjustment[]> {
    // Only update when we have accumulated a full batch
    if (entries.length % BATCH_SIZE !== 0) return [];

    const weights = await Storage.getFeedbackWeights();
    const adjustments: FeedbackWeightAdjustment[] = [];

    // Process the most recent BATCH_SIZE entries
    const batch = entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, BATCH_SIZE);

    for (const entry of batch) {
      const signalAdjustments = this.computeAdjustmentsForEntry(
        entry,
        weights
      );
      for (const adj of signalAdjustments) {
        weights[adj.heuristicId] = adj.newWeight;
        adjustments.push(adj);
      }
    }

    await Storage.saveFeedbackWeights(weights);
    return adjustments;
  }

  private computeAdjustmentsForEntry(
    entry: FeedbackEntry,
    currentWeights: Record<string, number>
  ): FeedbackWeightAdjustment[] {
    const adjustments: FeedbackWeightAdjustment[] = [];

    const adjust = (
      heuristicId: string,
      delta: number,
      reason: string
    ): void => {
      // Use the stored feedback weight, or assume 0.5 as base if unknown
      const old = currentWeights[heuristicId] ?? 0.5;
      const updated = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, old + delta));
      if (updated !== old) {
        adjustments.push({
          heuristicId,
          oldWeight: old,
          newWeight: updated,
          reason,
        });
        currentWeights[heuristicId] = updated;
      }
    };

    switch (entry.feedbackType) {
      case 'false_positive':
        // We over-flagged → reduce the contributing signal weights
        for (const signal of entry.topSignals) {
          adjust(signal, -NUDGE_DOWN, `false_positive feedback on ${entry.productId}`);
        }
        break;

      case 'false_negative':
        // We under-flagged → increase signal weights
        for (const signal of entry.topSignals) {
          adjust(signal, +NUDGE_UP, `false_negative feedback on ${entry.productId}`);
        }
        break;

      case 'confirmed_scam':
        // Confirmed scam: if score was originally low, bump signals up
        if (entry.originalProbability < 0.5) {
          for (const signal of entry.topSignals) {
            adjust(signal, +NUDGE_UP, `confirmed_scam (low-score) on ${entry.productId}`);
          }
        }
        break;

      case 'confirmed_safe':
        // Confirmed safe: if score was originally high, nudge signals down
        if (entry.originalProbability > 0.5) {
          for (const signal of entry.topSignals) {
            adjust(signal, -NUDGE_DOWN, `confirmed_safe (high-score) on ${entry.productId}`);
          }
        }
        break;
    }

    return adjustments;
  }
}
