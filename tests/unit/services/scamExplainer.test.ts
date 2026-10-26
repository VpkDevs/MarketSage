import {
  buildFallbackExplanation,
  explainScamSignals,
  getStoredGeminiApiKey,
  signalsFromAnalysis,
  ScamSignals
} from '../../../src/background/services/protect/scamExplainer';
import { Product, Platform } from '../../../src/common/types';

const riskySignals: ScamSignals = {
  productTitle: 'Designer Handbag - 90% Off!!!',
  platform: 'temu',
  price: 9.99,
  marketPrice: 95.0,
  sellerTrust: 50,
  warnings: [
    'Price is suspiciously low compared to history',
    'New seller with no rating history'
  ]
};

describe('buildFallbackExplanation', () => {
  it('explains each warning in plain language', () => {
    const result = buildFallbackExplanation(riskySignals);

    expect(result.source).toBe('fallback');
    expect(result.summary).toContain('2 things');
    // Price warning gets the scam-hook gloss, not just the raw warning
    expect(result.points[0]).toContain('most common hook');
    // Seller warning gets the track-record gloss
    expect(result.points[1]).toContain('no track record');
  });

  it('adds a price-context point when the price is far below market', () => {
    const result = buildFallbackExplanation(riskySignals);
    expect(result.points.some(p => p.includes('11%') && p.includes('$9.99'))).toBe(true);
  });

  it('mentions seller trust', () => {
    const result = buildFallbackExplanation(riskySignals);
    expect(result.points.some(p => p.includes('Seller trust is middling (50/100)'))).toBe(true);
  });

  it('is reassuring but not absolute when there are no warnings', () => {
    const result = buildFallbackExplanation({
      sellerTrust: 90,
      warnings: []
    });
    expect(result.summary).toContain('no scam signals');
    expect(result.summary).toContain('not a guarantee');
    expect(result.points.some(p => p.includes('Seller trust is high (90/100)'))).toBe(true);
  });

  it('passes through warnings it has no gloss for', () => {
    const result = buildFallbackExplanation({
      sellerTrust: 0,
      warnings: ['Some brand-new detector warning']
    });
    expect(result.points).toContain('Some brand-new detector warning');
  });
});

describe('explainScamSignals', () => {
  it('returns the fallback without calling fetch when no key is provided', async () => {
    const fetchFn = jest.fn();
    const result = await explainScamSignals(riskySignals, { fetchFn });
    expect(result.source).toBe('fallback');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns the fallback when the key is blank', async () => {
    const fetchFn = jest.fn();
    const result = await explainScamSignals(riskySignals, { apiKey: '   ', fetchFn });
    expect(result.source).toBe('fallback');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('uses Gemini when a key is provided and parses the reply', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'This listing shows two classic scam signals.\n- The price is far below market value.\n- The seller has no history.'
                }
              ]
            }
          }
        ]
      })
    });

    const result = await explainScamSignals(riskySignals, {
      apiKey: 'test-key-123',
      fetchFn
    });

    expect(result.source).toBe('ai');
    expect(result.summary).toBe('This listing shows two classic scam signals.');
    expect(result.points).toEqual([
      'The price is far below market value.',
      'The seller has no history.'
    ]);

    // The request goes to Google's Gemini API with the user's key in the
    // header (not the URL), and the prompt carries the actual signals.
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('gemini-2.0-flash');
    expect(url).not.toContain('test-key-123');
    expect(init.headers['x-goog-api-key']).toBe('test-key-123');
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toContain('Price is suspiciously low');
  });

  it('falls back when the API returns an error status', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: false, status: 400 });
    const result = await explainScamSignals(riskySignals, {
      apiKey: 'bad-key',
      fetchFn
    });
    expect(result.source).toBe('fallback');
    expect(result.summary).toContain('2 things');
  });

  it('falls back when the network call throws', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('offline'));
    const result = await explainScamSignals(riskySignals, {
      apiKey: 'test-key',
      fetchFn
    });
    expect(result.source).toBe('fallback');
  });

  it('falls back when the API reply has no text', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] })
    });
    const result = await explainScamSignals(riskySignals, {
      apiKey: 'test-key',
      fetchFn
    });
    expect(result.source).toBe('fallback');
  });
});

describe('getStoredGeminiApiKey', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it('returns undefined when no key is stored', async () => {
    await expect(getStoredGeminiApiKey()).resolves.toBeUndefined();
  });

  it('returns the stored key, trimmed', async () => {
    await chrome.storage.local.set({
      marketsage_ai_settings: { geminiApiKey: '  my-key  ' }
    });
    await expect(getStoredGeminiApiKey()).resolves.toBe('my-key');
  });

  it('treats a blank stored key as no key', async () => {
    await chrome.storage.local.set({
      marketsage_ai_settings: { geminiApiKey: '   ' }
    });
    await expect(getStoredGeminiApiKey()).resolves.toBeUndefined();
  });
});

describe('signalsFromAnalysis', () => {
  it('maps a product and its metrics into the signal bundle', () => {
    const product: Product = {
      id: 'p1',
      title: 'Test Item',
      price: { current: 12.5, market: 40, currency: 'USD' },
      platform: Platform.TEMU
    };
    const signals = signalsFromAnalysis(product, {
      riskScore: 40,
      sellerTrust: 75,
      warnings: ['Price is suspiciously low compared to history']
    });
    expect(signals).toEqual({
      productTitle: 'Test Item',
      platform: 'temu',
      price: 12.5,
      marketPrice: 40,
      sellerTrust: 75,
      warnings: ['Price is suspiciously low compared to history']
    });
  });
});
