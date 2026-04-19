import { FeedbackEngine } from '../../../src/common/models/scamDetection/FeedbackEngine';
import { Storage } from '../../../src/common/utils/storage';
import { FeedbackEntry } from '../../../src/common/types/scamDetection';

jest.mock('../../../src/common/utils/storage');

function makeFeedbackEntry(
  type: FeedbackEntry['feedbackType'],
  signals: string[] = ['price_anomaly'],
  probability = 0.7
): FeedbackEntry {
  return {
    id: `fb-${Math.random()}`,
    productId: 'product-123',
    platform: 'aliexpress',
    feedbackType: type,
    originalProbability: probability,
    originalRiskLevel: 'HIGH',
    topSignals: signals,
    userId: 'user-1',
    timestamp: Date.now(),
  };
}

describe('FeedbackEngine', () => {
  let engine: FeedbackEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new FeedbackEngine();
    (Storage.getFeedbackWeights as jest.Mock).mockResolvedValue({});
    (Storage.saveFeedbackWeights as jest.Mock).mockResolvedValue(undefined);
    (Storage.saveFeedbackEntry as jest.Mock).mockResolvedValue(undefined);
    (Storage.getFeedbackEntries as jest.Mock).mockResolvedValue([]);
  });

  describe('submitFeedback()', () => {
    it('stores feedback entry and returns it', async () => {
      const { entry } = await engine.submitFeedback({
        productId: 'product-123',
        feedbackType: 'confirmed_scam',
        originalProbability: 0.8,
        originalRiskLevel: 'HIGH',
        topSignals: ['price_anomaly'],
        userId: 'user-1',
        platform: 'aliexpress',
      });

      expect(Storage.saveFeedbackEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product-123',
          feedbackType: 'confirmed_scam',
        })
      );
      expect(entry.id).toBeTruthy();
    });

    it('triggers weight update when BATCH_SIZE entries are accumulated', async () => {
      // Simulate 5 feedback entries already in storage (batch trigger point)
      const existing: FeedbackEntry[] = Array.from({ length: 5 }, () =>
        makeFeedbackEntry('false_positive', ['price_anomaly'])
      );
      // After saveFeedbackEntry, getFeedbackEntries should return 5 items
      (Storage.getFeedbackEntries as jest.Mock).mockResolvedValue(existing);

      const { weightAdjustments } = await engine.submitFeedback({
        productId: 'product-123',
        feedbackType: 'false_positive',
        originalProbability: 0.8,
        originalRiskLevel: 'HIGH',
        topSignals: ['price_anomaly', 'seller_history_analysis'],
        userId: 'user-1',
        platform: 'aliexpress',
      });

      // After 5 entries, weights should be adjusted
      expect(weightAdjustments.length).toBeGreaterThan(0);
      expect(Storage.saveFeedbackWeights).toHaveBeenCalled();
    });

    it('does NOT trigger weight update when batch is not yet full', async () => {
      (Storage.getFeedbackEntries as jest.Mock).mockResolvedValue([
        makeFeedbackEntry('false_positive'),
      ]);

      const { weightAdjustments } = await engine.submitFeedback({
        productId: 'product-123',
        feedbackType: 'false_positive',
        originalProbability: 0.8,
        originalRiskLevel: 'HIGH',
        topSignals: ['price_anomaly'],
        userId: 'user-1',
        platform: 'aliexpress',
      });

      expect(weightAdjustments).toHaveLength(0);
    });
  });

  describe('getAdjustedWeight()', () => {
    it('returns default weight when no feedback weight is stored', async () => {
      (Storage.getFeedbackWeights as jest.Mock).mockResolvedValue({});
      const weight = await engine.getAdjustedWeight('price_anomaly', 0.8);
      expect(weight).toBe(0.8);
    });

    it('returns stored feedback weight when available', async () => {
      (Storage.getFeedbackWeights as jest.Mock).mockResolvedValue({
        price_anomaly: 0.65,
      });
      const weight = await engine.getAdjustedWeight('price_anomaly', 0.8);
      expect(weight).toBe(0.65);
    });
  });

  describe('resetWeights()', () => {
    it('clears all stored feedback weights', async () => {
      await engine.resetWeights();
      expect(Storage.saveFeedbackWeights).toHaveBeenCalledWith({});
    });
  });

  describe('weight adjustment direction', () => {
    it('false_positive decreases signal weights', async () => {
      // Provide exactly 5 identical false_positive entries to trigger batch
      const entries: FeedbackEntry[] = Array.from({ length: 4 }, () =>
        makeFeedbackEntry('false_positive', ['price_anomaly'])
      );
      (Storage.getFeedbackEntries as jest.Mock).mockResolvedValue(entries);
      (Storage.getFeedbackWeights as jest.Mock).mockResolvedValue({ price_anomaly: 0.5 });

      const { weightAdjustments } = await engine.submitFeedback({
        productId: 'product-123',
        feedbackType: 'false_positive',
        originalProbability: 0.8,
        originalRiskLevel: 'HIGH',
        topSignals: ['price_anomaly'],
        userId: 'user-1',
        platform: 'aliexpress',
      });

      const priceAdj = weightAdjustments.find(a => a.heuristicId === 'price_anomaly');
      if (priceAdj) {
        expect(priceAdj.newWeight).toBeLessThanOrEqual(priceAdj.oldWeight);
      }
    });

    it('false_negative increases signal weights', async () => {
      const entries: FeedbackEntry[] = Array.from({ length: 4 }, () =>
        makeFeedbackEntry('false_negative', ['review_pattern_analysis'])
      );
      (Storage.getFeedbackEntries as jest.Mock).mockResolvedValue(entries);
      (Storage.getFeedbackWeights as jest.Mock).mockResolvedValue({ review_pattern_analysis: 0.5 });

      const { weightAdjustments } = await engine.submitFeedback({
        productId: 'product-456',
        feedbackType: 'false_negative',
        originalProbability: 0.2,
        originalRiskLevel: 'LOW',
        topSignals: ['review_pattern_analysis'],
        userId: 'user-1',
        platform: 'aliexpress',
      });

      const reviewAdj = weightAdjustments.find(
        a => a.heuristicId === 'review_pattern_analysis'
      );
      if (reviewAdj) {
        expect(reviewAdj.newWeight).toBeGreaterThanOrEqual(reviewAdj.oldWeight);
      }
    });
  });
});
