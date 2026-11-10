import { ServiceManager } from '../../../src/background/services/serviceManager';
import { Storage } from '../../../src/common/utils/storage';
import { Platform, Product } from '../../../src/common/types';

const viewedProduct: Product = {
  id: 'ctx-1',
  title: 'Wireless Bluetooth Earbuds',
  price: { current: 25, original: 40, currency: 'USD' },
  platform: Platform.TEMU,
  seller: { id: 's1', name: 'Audio Store', rating: 4.6 },
  rating: 4.4,
  reviewCount: 120
};

const otherProduct: Product = {
  id: 'other-1',
  title: 'Wireless Bluetooth Earbuds Pro',
  price: { current: 30, currency: 'USD' },
  platform: Platform.ALIEXPRESS,
  rating: 4.2
};

describe('ServiceManager — Scout & Insight message handlers', () => {
  const manager = ServiceManager.getInstance();

  const callHandler = async (request: any): Promise<any> => {
    let response: any;
    await manager.handleMessage(request, {} as chrome.runtime.MessageSender, (r: any) => {
      response = r;
    });
    return response;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await chrome.storage.local.clear();
    (chrome.tabs.query as jest.Mock).mockResolvedValue([{ id: 7 }]);
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValue({
      success: true,
      data: viewedProduct
    });
  });

  it('DISCOVER_PRODUCTS answers from the local cache (no unknown-type error)', async () => {
    await Storage.cacheProduct(otherProduct);

    const response = await callHandler({
      type: 'DISCOVER_PRODUCTS',
      options: { query: 'earbuds' }
    });

    expect(response.success).toBe(true);
    expect(response.data.totalCandidates).toBe(1);
    expect(response.data.results.map((r: any) => r.id)).toEqual(['other-1']);
  });

  it('DISCOVER_PRODUCTS uses the active tab product as similarity context', async () => {
    await Storage.cacheProduct(otherProduct);

    const response = await callHandler({ type: 'DISCOVER_PRODUCTS', options: {} });

    expect(response.success).toBe(true);
    expect(response.data.mode).toBe('similar');
    expect(response.data.results.map((r: any) => r.id)).toEqual(['other-1']);
  });

  it('ANALYZE_PRICE_DATA returns pricing plus insights for the current page', async () => {
    const response = await callHandler({ type: 'ANALYZE_PRICE_DATA' });

    expect(response.success).toBe(true);
    expect(response.data.product.id).toBe('ctx-1');
    expect(response.data.pricing.currentPrice).toBe(25);
    expect(typeof response.data.pricing.marketSampleSize).toBe('number');
    expect(Array.isArray(response.data.insights)).toBe(true);
    expect(response.data.historyCount).toBeGreaterThanOrEqual(1);
  });

  it('ANALYZE_PRICE_DATA detects a drop on a repeat visit', async () => {
    await callHandler({ type: 'ANALYZE_PRICE_DATA' });

    // Same listing, cheaper on the next visit.
    (chrome.tabs.sendMessage as jest.Mock).mockResolvedValue({
      success: true,
      data: { ...viewedProduct, price: { current: 20, currency: 'USD' } }
    });
    const second = await callHandler({ type: 'ANALYZE_PRICE_DATA' });

    expect(second.success).toBe(true);
    expect(second.data.insights.some((i: any) => i.type === 'price_drop')).toBe(true);
  });
});
