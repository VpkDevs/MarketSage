/**
 * Interaction Engine
 *
 * Replaces the linear weighted sum with a non-linear risk model that:
 * - Detects dangerous combinations of signals
 * - Amplifies individual scores when risky combos appear
 * - Produces the set of triggered rules for explainability
 */

import {
  HeuristicResult,
  InteractionRule,
  TriggeredInteractionRule,
  InteractionEngineResult,
} from '../../types/scamDetection';

// ── Built-in rule definitions ─────────────────────────────────────────────────

export const INTERACTION_RULES: InteractionRule[] = [
  {
    id: 'price_seller_combo',
    name: 'Suspicious Price + Unverified Seller',
    description:
      'Price anomaly and weak seller history together strongly indicate fraud.',
    conditions: [
      { heuristicId: 'price_anomaly', minScore: 0.7 },
      { heuristicId: 'seller_history_analysis', minScore: 0.6 },
    ],
    amplificationFactors: {
      price_anomaly: 1.3,
      seller_history_analysis: 1.3,
    },
    severity: 'high',
  },
  {
    id: 'fake_review_seller_combo',
    name: 'Fake Reviews + Risky Seller',
    description:
      'Suspicious review patterns combined with a risky seller profile are a strong fraud indicator.',
    conditions: [
      { heuristicId: 'review_pattern_analysis', minScore: 0.7 },
      { heuristicId: 'seller_history_analysis', minScore: 0.5 },
    ],
    amplificationFactors: {
      review_pattern_analysis: 1.25,
      seller_history_analysis: 1.2,
    },
    severity: 'high',
  },
  {
    id: 'counterfeit_visual_price',
    name: 'Counterfeit Product Indicator',
    description:
      'Extremely low price combined with image quality issues strongly suggests a counterfeit.',
    conditions: [
      { heuristicId: 'price_anomaly', minScore: 0.8 },
      { heuristicId: 'image_quality_analysis', minScore: 0.6 },
    ],
    amplificationFactors: {
      price_anomaly: 1.4,
      image_quality_analysis: 1.3,
    },
    severity: 'critical',
  },
  {
    id: 'full_scam_pattern',
    name: 'Full Scam Pattern',
    description:
      'Multiple high-risk signals firing simultaneously – strong scam indicator.',
    conditions: [
      { heuristicId: 'price_anomaly', minScore: 0.6 },
      { heuristicId: 'seller_history_analysis', minScore: 0.6 },
      { heuristicId: 'review_pattern_analysis', minScore: 0.6 },
    ],
    amplificationFactors: {
      price_anomaly: 1.5,
      seller_history_analysis: 1.5,
      review_pattern_analysis: 1.5,
    },
    severity: 'critical',
  },
  {
    id: 'cross_platform_price_manipulation',
    name: 'Cross-Platform Price Manipulation',
    description:
      'Cross-platform inconsistencies combined with price anomaly indicate deliberate price manipulation.',
    conditions: [
      { heuristicId: 'cross_platform_verification', minScore: 0.5 },
      { heuristicId: 'price_anomaly', minScore: 0.6 },
    ],
    amplificationFactors: {
      cross_platform_verification: 1.3,
      price_anomaly: 1.2,
    },
    severity: 'moderate',
  },
];

// ── Engine ────────────────────────────────────────────────────────────────────

export class InteractionEngine {
  private rules: InteractionRule[];

  constructor(rules: InteractionRule[] = INTERACTION_RULES) {
    this.rules = rules;
  }

  /**
   * Apply interaction rules to the raw heuristic scores.
   *
   * Returns adjusted (amplified) scores and the list of triggered rules.
   * Scores are capped at 1.0 after amplification.
   */
  apply(results: HeuristicResult[]): InteractionEngineResult {
    // Build a quick-lookup map: heuristicId → score (only for enabled heuristics)
    const scoreMap: Record<string, number> = {};
    for (const r of results) {
      if (r.enabled) {
        scoreMap[r.heuristicId] = r.score;
      }
    }

    // Start with a copy of the original scores
    const adjustedScores: Record<string, number> = { ...scoreMap };
    const triggeredRules: TriggeredInteractionRule[] = [];

    for (const rule of this.rules) {
      if (this.ruleMatches(rule, scoreMap)) {
        // Amplify each affected signal
        for (const [heuristicId, factor] of Object.entries(
          rule.amplificationFactors
        )) {
          if (heuristicId in adjustedScores) {
            adjustedScores[heuristicId] = Math.min(
              1.0,
              adjustedScores[heuristicId] * factor
            );
          }
        }

        triggeredRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          description: rule.description,
          severity: rule.severity,
          affectedSignals: Object.keys(rule.amplificationFactors),
        });
      }
    }

    return {
      adjustedScores,
      triggeredRules,
      amplificationApplied: triggeredRules.length > 0,
    };
  }

  /**
   * Compute the final risk probability from (potentially amplified) scores
   * and heuristic weights, applying a non-linear penalty when critical rules fire.
   */
  computeProbability(
    adjustedScores: Record<string, number>,
    results: HeuristicResult[],
    triggeredRules: TriggeredInteractionRule[],
    globalThreshold: number
  ): number {
    const enabled = results.filter(r => r.enabled);
    if (enabled.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const r of enabled) {
      const score = adjustedScores[r.heuristicId] ?? r.score;
      weightedSum += score * r.weight;
      totalWeight += r.weight;
    }

    let probability = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply threshold adjustment
    const thresholdFactor = globalThreshold / 70;
    probability = Math.min(1, probability * thresholdFactor);

    // Non-linear penalty: critical rules push score toward 1.0 faster
    const criticalCount = triggeredRules.filter(r => r.severity === 'critical').length;
    const highCount = triggeredRules.filter(r => r.severity === 'high').length;

    if (criticalCount > 0) {
      probability = Math.min(1, probability + 0.15 * criticalCount);
    } else if (highCount > 0) {
      probability = Math.min(1, probability + 0.08 * highCount);
    }

    return probability;
  }

  private ruleMatches(
    rule: InteractionRule,
    scoreMap: Record<string, number>
  ): boolean {
    return rule.conditions.every(condition => {
      const score = scoreMap[condition.heuristicId] ?? 0;
      return score >= condition.minScore;
    });
  }
}
