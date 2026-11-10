import {
  rankScoutCandidates,
  ProductDiscoveryService,
  ScoutCandidate,
  SCOUT_BASIS
} from '../../../src/background/services/scout/productDiscovery';
import { Storage } from '../../../src/common/utils/storage';
import { Platform, Product } from '../../../src/common/types';

const product = (overrides: Partial<Product>): Product => ({
  id: 'p1',
  title: 'Wireless Bluetooth Earbuds',
  price: { current: 20, currency: 'USD' },
  platform: Platform.TEMU,
  ...overrides
});

const candidate = (
  overrides: Partial<Product>,
  history: Array<{ current: number; timestamp: string }> = []
): ScoutCandidate => ({ product: product(overrides), history });

describe('rankScoutCandidates — search mode', () => {
  it('matches viewed products by query words and scores the match', () => {
    const discovery = rankScoutCandidates(
      [
        candidate({ id: 'a', title: 'Wireless Bluetooth Earbuds Pro' }),
        candidate({ id: 'b', title: 'Leather Wallet for Men' })
      ],
      { query: 'wireless earbuds' }
    );

    expect(discovery.mode).toBe('search');
    expect(discovery.totalCandidates).toBe(2);
    expect(discovery.results).toHaveLength(1);
    expect(discovery.results[0].id).toBe('a');
    expect(discovery.results[0].relevanceScore).toBe(100);
    expect(discovery.results[0].relevanceBasis).toBe('search match');
    expect(discovery.basis).toBe(SCOUT_BASIS);
  });

  it('returns nothing when no viewed product matches — never invents results', () => {
    const discovery = rankScoutCandidates(
      [candidate({ id: 'a', title: 'Leather Wallet' })],
      { query: 'espresso machine' }
    );
    expect(discovery.results).toEqual([]);
  });
});

describe('rankScoutCandidates — similar mode', () => {
  it('ranks products similar to the one being viewed and excludes it', () => {
    const context = product({ id: 'ctx', title: 'Wireless Bluetooth Earbuds Case' });
    const discovery = rankScoutCandidates(
      [
        candidate({ id: 'ctx', title: 'Wireless Bluetooth Earbuds Case' }),
        candidate({ id: 'sim', title: 'Wireless Bluetooth Earbuds Pro Edition' }),
        candidate({ id: 'far', title: 'Stainless Steel Water Bottle' })
      ],
      { contextProduct: context }
    );

    expect(discovery.mode).toBe('similar');
    expect(discovery.results.map(r => r.id)).toEqual(['sim']);
    expect(discovery.results[0].relevanceBasis).toBe('similar to what you are viewing');
    expect(discovery.results[0].relevanceScore).toBeGreaterThan(30);
  });
});

describe('rankScoutCandidates — value mode', () => {
  it('ranks a real recorded price drop above an undiscounted product', () => {
    const discovery = rankScoutCandidates([
      candidate({ id: 'plain', title: 'Plain Mug', price: { current: 10, currency: 'USD' } }),
      candidate(
        { id: 'dropped', title: 'Fancy Mug', price: { current: 10, currency: 'USD' } },
        [
          { current: 20, timestamp: '2026-01-01T00:00:00.000Z' },
          { current: 10, timestamp: '2026-01-02T00:00:00.000Z' }
        ]
      )
    ]);

    expect(discovery.mode).toBe('value');
    expect(discovery.results[0].id).toBe('dropped');
    expect(discovery.results[0].priceDropPercent).toBe(50);
    expect(discovery.results[1].priceDropPercent).toBeUndefined();
  });

  it('reports a listed discount from the product’s own original price', () => {
    const discovery = rankScoutCandidates([
      candidate({ id: 'sale', price: { current: 15, original: 30, currency: 'USD' } })
    ]);
    expect(discovery.results[0].discountPercent).toBe(50);
  });

  it('empty history yields an empty, honestly-empty discovery', () => {
    const discovery = rankScoutCandidates([]);
    expect(discovery.results).toEqual([]);
    expect(discovery.totalCandidates).toBe(0);
  });
});

describe('rankScoutCandidates — filters and sorting', () => {
  const pool = [
    candidate({ id: 'cheap', title: 'Cable', price: { current: 5, currency: 'USD' }, platform: Platform.TEMU, rating: 3.5 }),
    candidate({ id: 'mid', title: 'Cable Pro', price: { current: 25, original: 50, currency: 'USD' }, platform: Platform.ALIEXPRESS, rating: 4.8 }),
    candidate({ id: 'dear', title: 'Cable Max', price: { current: 80, currency: 'USD' }, platform: Platform.TEMU, rating: 4.9 })
  ];

  it('applies platform and price filters', () => {
    const discovery = rankScoutCandidates(pool, {
      filters: { platforms: ['temu'], maxPrice: 10 }
    });
    expect(discovery.results.map(r => r.id)).toEqual(['cheap']);
  });

  it('onlyDeals keeps listed discounts and recorded drops only', () => {
    const discovery = rankScoutCandidates(pool, { filters: { onlyDeals: true } });
    expect(discovery.results.map(r => r.id)).toEqual(['mid']);
  });

  it('sorts by price when asked', () => {
    const discovery = rankScoutCandidates(pool, { filters: { sortBy: 'price_low' } });
    expect(discovery.results.map(r => r.id)).toEqual(['cheap', 'mid', 'dear']);
  });

  it('respects maxResults', () => {
    const discovery = rankScoutCandidates(pool, { maxResults: 2 });
    expect(discovery.results).toHaveLength(2);
  });
});

describe('ProductDiscoveryService (storage-backed)', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it('discovers from the real product cache and price history', async () => {
    await Storage.cacheProduct(product({
      id: 'seen-1',
      title: 'Wireless Bluetooth Earbuds',
      price: { current: 18, currency: 'USD' }
    }));
    await Storage.savePriceHistory('seen-1', { current: 30, currency: 'USD' });
    await Storage.savePriceHistory('seen-1', { current: 18, currency: 'USD' });

    const service = new ProductDiscoveryService();
    const discovery = await service.discover({ query: 'earbuds' });

    expect(discovery.totalCandidates).toBe(1);
    expect(discovery.results).toHaveLength(1);
    expect(discovery.results[0].id).toBe('seen-1');
    expect(discovery.results[0].priceDropPercent).toBe(40);
  });

  it('returns empty when nothing has been viewed yet', async () => {
    const service = new ProductDiscoveryService();
    const discovery = await service.discover({});
    expect(discovery.results).toEqual([]);
    expect(discovery.totalCandidates).toBe(0);
  });
});
