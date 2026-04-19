import { TemporalAnalyzer } from '../../../src/common/models/scamDetection/TemporalAnalyzer';
import { Storage } from '../../../src/common/utils/storage';
import { SellerSnapshot, TemporalSellerData } from '../../../src/common/types/scamDetection';

jest.mock('../../../src/common/utils/storage');

const MS_PER_DAY = 86_400_000;

function makeSnapshot(daysAgo: number, overrides: Partial<SellerSnapshot> = {}): SellerSnapshot {
  return {
    timestamp: Date.now() - daysAgo * MS_PER_DAY,
    rating: 4.5,
    reviewCount: 100,
    listingCount: 50,
    riskScore: 0.2,
    ...overrides,
  };
}

describe('TemporalAnalyzer', () => {
  let analyzer: TemporalAnalyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    analyzer = new TemporalAnalyzer();
  });

  describe('analyze()', () => {
    it('returns no signals when no data exists', async () => {
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(null);

      const result = await analyzer.analyze('seller-123');

      expect(result.hasTemporalData).toBe(false);
      expect(result.signals).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });

    it('returns no signals when only one snapshot exists', async () => {
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue({
        sellerId: 'seller-123',
        snapshots: [makeSnapshot(0)],
        lastUpdated: Date.now(),
      });

      const result = await analyzer.analyze('seller-123');

      expect(result.signals).toHaveLength(0);
    });

    it('detects a review spike in the last 24 hours', async () => {
      const data: TemporalSellerData = {
        sellerId: 'seller-123',
        snapshots: [
          makeSnapshot(2, { reviewCount: 50 }),   // 2 days ago: 50 reviews
          makeSnapshot(0, { reviewCount: 150 }),  // now: 150 reviews (3× spike)
        ],
        lastUpdated: Date.now(),
      };
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(data);

      const result = await analyzer.analyze('seller-123');

      const spikeSignal = result.signals.find(s => s.type === 'review_spike');
      expect(spikeSignal).toBeDefined();
      expect(spikeSignal!.severity).toBeGreaterThan(0);
    });

    it('detects a rating drop over 7 days', async () => {
      const data: TemporalSellerData = {
        sellerId: 'seller-123',
        snapshots: [
          makeSnapshot(10, { rating: 4.8 }),  // 10 days ago: 4.8 stars
          makeSnapshot(0, { rating: 4.0 }),   // now: 4.0 stars (−0.8 drop)
        ],
        lastUpdated: Date.now(),
      };
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(data);

      const result = await analyzer.analyze('seller-123');

      const dropSignal = result.signals.find(s => s.type === 'rating_drop');
      expect(dropSignal).toBeDefined();
    });

    it('detects a listing spike over 7 days', async () => {
      const data: TemporalSellerData = {
        sellerId: 'seller-123',
        snapshots: [
          makeSnapshot(10, { listingCount: 20 }),  // 10 days ago: 20 listings
          makeSnapshot(0, { listingCount: 80 }),   // now: 80 (4× spike)
        ],
        lastUpdated: Date.now(),
      };
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(data);

      const result = await analyzer.analyze('seller-123');

      const spikeSignal = result.signals.find(s => s.type === 'listing_spike');
      expect(spikeSignal).toBeDefined();
    });

    it('detects an increasing risk-score trend over 30 days', async () => {
      const snapshots: SellerSnapshot[] = [];
      // Early half: low risk
      for (let i = 29; i >= 15; i--) {
        snapshots.push(makeSnapshot(i, { riskScore: 0.1 }));
      }
      // Late half: high risk
      for (let i = 14; i >= 0; i--) {
        snapshots.push(makeSnapshot(i, { riskScore: 0.5 }));
      }

      const data: TemporalSellerData = {
        sellerId: 'seller-123',
        snapshots,
        lastUpdated: Date.now(),
      };
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(data);

      const result = await analyzer.analyze('seller-123');

      const trendSignal = result.signals.find(s => s.type === 'risk_trend_up');
      expect(trendSignal).toBeDefined();
    });

    it('does not flag a stable seller', async () => {
      const data: TemporalSellerData = {
        sellerId: 'seller-stable',
        snapshots: [
          makeSnapshot(10, { rating: 4.5, reviewCount: 100, listingCount: 50, riskScore: 0.1 }),
          makeSnapshot(5,  { rating: 4.5, reviewCount: 102, listingCount: 51, riskScore: 0.1 }),
          makeSnapshot(0,  { rating: 4.6, reviewCount: 105, listingCount: 52, riskScore: 0.1 }),
        ],
        lastUpdated: Date.now(),
      };
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(data);

      const result = await analyzer.analyze('seller-stable');

      expect(result.signals).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });
  });

  describe('recordSnapshot()', () => {
    it('creates a new TemporalSellerData entry when none exists', async () => {
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(null);
      (Storage.saveTemporalSellerData as jest.Mock).mockResolvedValue(undefined);

      await analyzer.recordSnapshot('seller-new', {
        rating: 4.5,
        reviewCount: 10,
        listingCount: 5,
        riskScore: 0.2,
      });

      expect(Storage.saveTemporalSellerData).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: 'seller-new',
          snapshots: expect.arrayContaining([
            expect.objectContaining({ rating: 4.5, reviewCount: 10 }),
          ]),
        })
      );
    });

    it('appends a snapshot to existing data', async () => {
      const existing: TemporalSellerData = {
        sellerId: 'seller-123',
        snapshots: [makeSnapshot(5)],
        lastUpdated: Date.now() - 5 * MS_PER_DAY,
      };
      (Storage.getTemporalSellerData as jest.Mock).mockResolvedValue(existing);
      (Storage.saveTemporalSellerData as jest.Mock).mockResolvedValue(undefined);

      await analyzer.recordSnapshot('seller-123', {
        rating: 4.0,
        reviewCount: 200,
        listingCount: 100,
        riskScore: 0.4,
      });

      const saved = (Storage.saveTemporalSellerData as jest.Mock).mock.calls[0][0];
      expect(saved.snapshots).toHaveLength(2);
    });
  });
});
