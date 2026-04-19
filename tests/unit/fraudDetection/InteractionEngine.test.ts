import { InteractionEngine, INTERACTION_RULES } from '../../../src/common/models/scamDetection/InteractionEngine';
import { HeuristicResult } from '../../../src/common/types/scamDetection';

function makeResult(
  id: string,
  score: number,
  weight = 0.7,
  enabled = true
): HeuristicResult {
  return {
    heuristicId: id,
    name: id,
    score,
    enabled,
    weight,
    findings: [`${id} finding`],
  };
}

describe('InteractionEngine', () => {
  let engine: InteractionEngine;

  beforeEach(() => {
    engine = new InteractionEngine();
  });

  describe('apply()', () => {
    it('returns original scores when no rules are triggered', () => {
      const results = [
        makeResult('price_anomaly', 0.2),
        makeResult('seller_history_analysis', 0.1),
      ];
      const { adjustedScores, triggeredRules, amplificationApplied } =
        engine.apply(results);

      expect(amplificationApplied).toBe(false);
      expect(triggeredRules).toHaveLength(0);
      expect(adjustedScores['price_anomaly']).toBe(0.2);
    });

    it('triggers price_seller_combo rule and amplifies both signals', () => {
      const results = [
        makeResult('price_anomaly', 0.75),           // >= 0.7 ✓
        makeResult('seller_history_analysis', 0.65), // >= 0.6 ✓
      ];
      const { adjustedScores, triggeredRules } = engine.apply(results);

      expect(triggeredRules.some(r => r.ruleId === 'price_seller_combo')).toBe(true);
      // Both scores should be amplified by 1.3×
      expect(adjustedScores['price_anomaly']).toBeCloseTo(0.75 * 1.3);
      expect(adjustedScores['seller_history_analysis']).toBeCloseTo(0.65 * 1.3);
    });

    it('triggers counterfeit_visual_price rule and amplifies signals', () => {
      const results = [
        makeResult('price_anomaly', 0.85),       // >= 0.8 ✓
        makeResult('image_quality_analysis', 0.7), // >= 0.6 ✓
      ];
      const { adjustedScores, triggeredRules } = engine.apply(results);

      expect(triggeredRules.some(r => r.ruleId === 'counterfeit_visual_price')).toBe(true);
      // Score is amplified but capped at 1.0
      expect(adjustedScores['price_anomaly']).toBeLessThanOrEqual(1.0);
      expect(adjustedScores['price_anomaly']).toBeGreaterThan(0.85);
    });

    it('caps amplified scores at 1.0', () => {
      const results = [
        makeResult('price_anomaly', 0.95),           // 0.95 * 1.4 > 1.0
        makeResult('image_quality_analysis', 0.95),
      ];
      const { adjustedScores } = engine.apply(results);

      expect(adjustedScores['price_anomaly']).toBeLessThanOrEqual(1.0);
    });

    it('ignores disabled heuristics', () => {
      const results = [
        makeResult('price_anomaly', 0.9, 0.8, false), // disabled
        makeResult('seller_history_analysis', 0.8),
      ];
      const { triggeredRules } = engine.apply(results);

      // price_seller_combo should NOT trigger because price_anomaly is disabled
      expect(triggeredRules.some(r => r.ruleId === 'price_seller_combo')).toBe(false);
    });

    it('triggers full_scam_pattern when three signals all exceed threshold', () => {
      const results = [
        makeResult('price_anomaly', 0.7),
        makeResult('seller_history_analysis', 0.7),
        makeResult('review_pattern_analysis', 0.7),
      ];
      const { triggeredRules } = engine.apply(results);

      expect(triggeredRules.some(r => r.ruleId === 'full_scam_pattern')).toBe(true);
    });
  });

  describe('computeProbability()', () => {
    it('applies non-linear penalty for critical rules', () => {
      const results = [makeResult('price_anomaly', 0.9, 1.0)];
      const adjustedScores = { price_anomaly: 0.9 };
      const criticalRule = {
        ruleId: 'counterfeit_visual_price',
        ruleName: 'Counterfeit Indicator',
        description: 'test',
        severity: 'critical' as const,
        affectedSignals: ['price_anomaly'],
      };

      const withCritical = engine.computeProbability(
        adjustedScores,
        results,
        [criticalRule],
        70
      );
      const withoutRules = engine.computeProbability(
        adjustedScores,
        results,
        [],
        70
      );

      expect(withCritical).toBeGreaterThan(withoutRules);
    });

    it('returns 0 when no enabled results', () => {
      const results = [makeResult('price_anomaly', 0.9, 1.0, false)];
      const prob = engine.computeProbability({}, results, [], 70);
      expect(prob).toBe(0);
    });

    it('respects globalThreshold scaling', () => {
      const results = [makeResult('price_anomaly', 0.5, 1.0)];
      const scores = { price_anomaly: 0.5 };

      const low = engine.computeProbability(scores, results, [], 35); // half threshold
      const high = engine.computeProbability(scores, results, [], 140); // 2× threshold

      expect(high).toBeGreaterThan(low);
    });
  });

  describe('INTERACTION_RULES', () => {
    it('has at least 4 built-in rules', () => {
      expect(INTERACTION_RULES.length).toBeGreaterThanOrEqual(4);
    });

    it('every rule has valid structure', () => {
      for (const rule of INTERACTION_RULES) {
        expect(rule.id).toBeTruthy();
        expect(rule.conditions.length).toBeGreaterThan(0);
        expect(Object.keys(rule.amplificationFactors).length).toBeGreaterThan(0);
        expect(['moderate', 'high', 'critical']).toContain(rule.severity);
      }
    });
  });
});
