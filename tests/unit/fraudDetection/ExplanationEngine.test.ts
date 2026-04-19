import { ExplanationEngine } from '../../../src/common/models/scamDetection/ExplanationEngine';
import { HeuristicResult, TriggeredInteractionRule, TemporalSignal, ConfidenceScore } from '../../../src/common/types/scamDetection';

const CONFIDENCE: ConfidenceScore = {
  level: 'high',
  score: 0.8,
  factors: {
    dataCompleteness: 0.9,
    signalAgreement: 0.8,
    historicalDataAvailability: 0.7,
    sampleSize: 0.6,
  },
};

function makeResult(
  id: string,
  name: string,
  score: number,
  findings: string[] = [],
  enabled = true
): HeuristicResult {
  return { heuristicId: id, name, score, enabled, weight: 0.7, findings };
}

describe('ExplanationEngine', () => {
  let engine: ExplanationEngine;

  beforeEach(() => {
    engine = new ExplanationEngine();
  });

  describe('generate()', () => {
    it('returns a valid explanation structure', () => {
      const explanation = engine.generate({
        results: [
          makeResult('price_anomaly', 'Price Anomaly', 0.9, ['Price is 65% below market average']),
          makeResult('seller_history_analysis', 'Seller History', 0.7, ['New account (5 days)']),
        ],
        triggeredRules: [],
        temporalSignals: [],
        probability: 0.82,
        riskLevel: 'HIGH',
        confidence: CONFIDENCE,
      });

      expect(explanation).toHaveProperty('summary');
      expect(explanation).toHaveProperty('topSignals');
      expect(explanation).toHaveProperty('triggeredRules');
      expect(explanation).toHaveProperty('keyAnomalies');
      expect(explanation).toHaveProperty('humanReadable');
    });

    it('includes top contributing signals sorted by contribution', () => {
      const explanation = engine.generate({
        results: [
          makeResult('price_anomaly', 'Price Anomaly', 0.95, ['Very low price'], true),
          makeResult('seller_history_analysis', 'Seller History', 0.3, [], true),
          makeResult('review_pattern_analysis', 'Reviews', 0.1, [], true),
        ],
        triggeredRules: [],
        temporalSignals: [],
        probability: 0.7,
        riskLevel: 'HIGH',
        confidence: CONFIDENCE,
      });

      expect(explanation.topSignals.length).toBeGreaterThan(0);
      expect(explanation.topSignals[0].signal).toBe('price_anomaly');
    });

    it('includes triggered rule names in explanation', () => {
      const rule: TriggeredInteractionRule = {
        ruleId: 'price_seller_combo',
        ruleName: 'Suspicious Price + Unverified Seller',
        description: 'test',
        severity: 'high',
        affectedSignals: ['price_anomaly'],
      };

      const explanation = engine.generate({
        results: [makeResult('price_anomaly', 'Price Anomaly', 0.8, ['Low price'])],
        triggeredRules: [rule],
        temporalSignals: [],
        probability: 0.75,
        riskLevel: 'HIGH',
        confidence: CONFIDENCE,
      });

      expect(explanation.triggeredRules).toContain('Suspicious Price + Unverified Seller');
      expect(explanation.humanReadable).toContain('Suspicious Price + Unverified Seller');
    });

    it('includes temporal signals in the human-readable output', () => {
      const signal: TemporalSignal = {
        type: 'review_spike',
        severity: 0.8,
        description: 'Review count jumped 200% in the last 24 hours',
        windowDays: 1,
        changePercent: 200,
      };

      const explanation = engine.generate({
        results: [],
        triggeredRules: [],
        temporalSignals: [signal],
        probability: 0.5,
        riskLevel: 'MEDIUM',
        confidence: CONFIDENCE,
      });

      expect(explanation.humanReadable).toContain('Review count jumped 200%');
    });

    it('uses appropriate CRITICAL opener for critical risk', () => {
      const explanation = engine.generate({
        results: [makeResult('price_anomaly', 'Price Anomaly', 0.95, ['test'])],
        triggeredRules: [],
        temporalSignals: [],
        probability: 0.95,
        riskLevel: 'CRITICAL',
        confidence: CONFIDENCE,
      });

      expect(explanation.humanReadable).toContain('CRITICAL RISK');
    });

    it('summary contains risk level and probability', () => {
      const explanation = engine.generate({
        results: [],
        triggeredRules: [],
        temporalSignals: [],
        probability: 0.4,
        riskLevel: 'MEDIUM',
        confidence: CONFIDENCE,
      });

      expect(explanation.summary).toContain('MEDIUM');
      expect(explanation.summary).toContain('40%');
    });

    it('collects key anomalies from high-scoring heuristics', () => {
      const explanation = engine.generate({
        results: [
          makeResult('price_anomaly', 'Price', 0.9, ['Price is 80% below market']),
          makeResult('review_pattern_analysis', 'Reviews', 0.7, ['Fake reviews detected']),
          makeResult('seller_history_analysis', 'Seller', 0.2, ['Normal seller']),
        ],
        triggeredRules: [],
        temporalSignals: [],
        probability: 0.75,
        riskLevel: 'HIGH',
        confidence: CONFIDENCE,
      });

      expect(explanation.keyAnomalies).toContain('Price is 80% below market');
      expect(explanation.keyAnomalies).toContain('Fake reviews detected');
      expect(explanation.keyAnomalies).not.toContain('Normal seller');
    });
  });
});
