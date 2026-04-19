import { ConfidenceCalculator } from '../../../src/common/models/scamDetection/ConfidenceCalculator';
import { HeuristicResult } from '../../../src/common/types/scamDetection';

function makeResult(id: string, score: number, enabled = true): HeuristicResult {
  return {
    heuristicId: id,
    name: id,
    score,
    enabled,
    weight: 0.7,
    findings: [],
  };
}

describe('ConfidenceCalculator', () => {
  let calc: ConfidenceCalculator;

  beforeEach(() => {
    calc = new ConfidenceCalculator();
  });

  describe('compute()', () => {
    it('returns high confidence for a data-rich product with consistent signals', () => {
      const result = calc.compute({
        results: [
          makeResult('price_anomaly', 0.8),
          makeResult('seller_history_analysis', 0.75),
          makeResult('review_pattern_analysis', 0.7),
        ],
        hasSellerInfo: true,
        hasDescription: true,
        imageCount: 5,
        hasMarketPrice: true,
        hasTemporalData: true,
        reviewCount: 200,
        sellerRating: 4.2,
      });

      expect(result.level).toBe('high');
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('returns low confidence when most data is missing', () => {
      const result = calc.compute({
        results: [makeResult('price_anomaly', 0.9)],
        hasSellerInfo: false,
        hasDescription: false,
        imageCount: 0,
        hasMarketPrice: false,
        hasTemporalData: false,
        reviewCount: 0,
        sellerRating: undefined,
      });

      expect(result.level).toBe('low');
      expect(result.score).toBeLessThan(0.4);
    });

    it('returns medium confidence for partially available data', () => {
      const result = calc.compute({
        results: [
          makeResult('price_anomaly', 0.8),
          makeResult('review_pattern_analysis', 0.2),  // disagreement
        ],
        hasSellerInfo: true,
        hasDescription: true,
        imageCount: 2,
        hasMarketPrice: false,
        hasTemporalData: false,
        reviewCount: 15,
        sellerRating: 4.0,
      });

      expect(result.level).toBe('medium');
    });

    it('reports correct factor structure', () => {
      const result = calc.compute({
        results: [makeResult('price_anomaly', 0.5)],
        hasSellerInfo: true,
        hasDescription: true,
        imageCount: 3,
        hasMarketPrice: true,
        hasTemporalData: true,
        reviewCount: 50,
        sellerRating: 4.5,
      });

      expect(result.factors).toHaveProperty('dataCompleteness');
      expect(result.factors).toHaveProperty('signalAgreement');
      expect(result.factors).toHaveProperty('historicalDataAvailability');
      expect(result.factors).toHaveProperty('sampleSize');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('data completeness is higher with more fields available', () => {
      const full = calc.compute({
        results: [],
        hasSellerInfo: true,
        hasDescription: true,
        imageCount: 5,
        hasMarketPrice: true,
        hasTemporalData: true,
        reviewCount: 100,
        sellerRating: 4.0,
      });

      const sparse = calc.compute({
        results: [],
        hasSellerInfo: false,
        hasDescription: false,
        imageCount: 0,
        hasMarketPrice: false,
        hasTemporalData: false,
        reviewCount: 0,
        sellerRating: undefined,
      });

      expect(full.factors.dataCompleteness).toBeGreaterThan(
        sparse.factors.dataCompleteness
      );
    });

    it('signal agreement is low when scores vary wildly', () => {
      const varying = calc.compute({
        results: [
          makeResult('price_anomaly', 0.9),
          makeResult('seller_history_analysis', 0.1),
          makeResult('review_pattern_analysis', 0.8),
        ],
        hasSellerInfo: false,
        hasDescription: false,
        imageCount: 0,
        hasMarketPrice: false,
        hasTemporalData: false,
        reviewCount: 0,
      });

      const consistent = calc.compute({
        results: [
          makeResult('price_anomaly', 0.7),
          makeResult('seller_history_analysis', 0.75),
          makeResult('review_pattern_analysis', 0.72),
        ],
        hasSellerInfo: false,
        hasDescription: false,
        imageCount: 0,
        hasMarketPrice: false,
        hasTemporalData: false,
        reviewCount: 0,
      });

      expect(consistent.factors.signalAgreement).toBeGreaterThan(
        varying.factors.signalAgreement
      );
    });
  });
});
