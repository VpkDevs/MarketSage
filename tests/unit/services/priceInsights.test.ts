import { buildPriceInsights } from '../../../src/background/services/insight/priceInsights';
import { PriceAnalytics } from '../../../src/background/services/insight/priceAnalyzer';
import { Platform, Product } from '../../../src/common/types';

const product: Product = {
  id: 'p1',
  title: 'Test Product',
  price: { current: 80, currency: 'USD' },
  platform: Platform.TEMU
};

const analytics = (overrides: Partial<PriceAnalytics> = {}): PriceAnalytics => ({
  currentPrice: 80,
  marketAverage: 100,
  marketSampleSize: 4,
  priceHistory: [],
  valueScore: 0.5,
  trend: 'stable',
  recommendations: [],
  ...overrides
});

const history = (prices: number[]) =>
  prices.map((price, i) => ({
    price,
    timestamp: new Date(2026, 0, i + 1).toISOString()
  }));

describe('buildPriceInsights', () => {
  it('flags a real drop vs. the previous recorded price', () => {
    const insights = buildPriceInsights(product, analytics(), history([100, 80]));
    const drop = insights.find(i => i.type === 'price_drop');
    expect(drop).toBeDefined();
    expect(drop!.description).toContain('$100.00');
    expect(drop!.description).toContain('$80.00');
    expect(drop!.description).toContain('20.0%');
    expect(drop!.impact).toBe('high');
  });

  it('flags a real increase vs. the previous recorded price', () => {
    const insights = buildPriceInsights(
      product,
      analytics({ currentPrice: 110 }),
      history([100, 110])
    );
    const increase = insights.find(i => i.type === 'price_increase');
    expect(increase).toBeDefined();
    expect(increase!.description).toContain('10.0%');
  });

  it('stays silent on small moves below the 5% threshold', () => {
    const insights = buildPriceInsights(
      product,
      analytics({ currentPrice: 97 }),
      history([100, 97])
    );
    expect(insights.find(i => i.type === 'price_drop')).toBeUndefined();
    expect(insights.find(i => i.type === 'price_increase')).toBeUndefined();
  });

  it('issues a deal alert only when other viewed products back the average', () => {
    const withPeers = buildPriceInsights(
      product,
      analytics({ valueScore: 0.9, marketSampleSize: 3 }),
      history([80])
    );
    expect(withPeers.find(i => i.type === 'deal_alert')).toBeDefined();

    const alone = buildPriceInsights(
      product,
      analytics({ valueScore: 0.9, marketSampleSize: 1 }),
      history([80])
    );
    expect(alone.find(i => i.type === 'deal_alert')).toBeUndefined();
  });

  it('describes a trend only with at least 3 recorded prices, as past-only', () => {
    const insights = buildPriceInsights(
      product,
      analytics({ trend: 'falling' }),
      history([100, 90, 80])
    );
    const trend = insights.find(i => i.type === 'market_trend');
    expect(trend).toBeDefined();
    expect(trend!.description).toContain('not a forecast');

    const tooShort = buildPriceInsights(
      product,
      analytics({ trend: 'falling' }),
      history([100, 80])
    );
    expect(tooShort.find(i => i.type === 'market_trend')).toBeUndefined();
  });

  it('produces nothing from a single observation and middling value', () => {
    expect(buildPriceInsights(product, analytics(), history([80]))).toEqual([]);
    expect(buildPriceInsights(product, analytics(), [])).toEqual([]);
  });
});
