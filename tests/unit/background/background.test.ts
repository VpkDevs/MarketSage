import {
  handleTabUpdate,
  isSupportedMarketplaceUrl
} from '../../../src/background/background';

describe('background — URL filtering & tab update handling', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await chrome.storage.local.clear();
  });

  describe('isSupportedMarketplaceUrl', () => {
    it('accepts supported Temu, AliExpress, and DHgate HTTP/HTTPS URLs', () => {
      expect(isSupportedMarketplaceUrl('https://www.temu.com/goods.html?id=1')).toBe(true);
      expect(isSupportedMarketplaceUrl('https://temu.com/item')).toBe(true);
      expect(isSupportedMarketplaceUrl('https://www.aliexpress.com/item/123.html')).toBe(true);
      expect(isSupportedMarketplaceUrl('https://m.dhgate.com/product/abc')).toBe(true);
    });

    it('rejects non-marketplace, spoofed, and browser-internal URLs', () => {
      expect(isSupportedMarketplaceUrl('https://google.com')).toBe(false);
      expect(isSupportedMarketplaceUrl('https://eviltemu.com/item')).toBe(false);
      expect(isSupportedMarketplaceUrl('https://temu.com.attacker.org/item')).toBe(false);
      expect(isSupportedMarketplaceUrl('chrome://extensions/')).toBe(false);
      expect(isSupportedMarketplaceUrl('javascript:alert(1)')).toBe(false);
      expect(isSupportedMarketplaceUrl('not a url')).toBe(false);
    });
  });

  describe('handleTabUpdate', () => {
    it('ignores non-marketplace URLs without messaging the tab or setting ERR badge', async () => {
      await chrome.storage.local.set({
        settings: {
          autoAnalyze: true,
          notificationsEnabled: true,
          priceAlerts: true,
          securityAlerts: true
        }
      });

      await handleTabUpdate(1, 'https://example.com/article');

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
      expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
    });

    it('reads nested settings.autoAnalyze and updates badge on supported marketplace pages', async () => {
      await chrome.storage.local.set({
        settings: {
          autoAnalyze: true,
          notificationsEnabled: false,
          priceAlerts: true,
          securityAlerts: true
        }
      });

      (chrome.tabs.sendMessage as jest.Mock)
        .mockResolvedValueOnce({ isSupported: true, platform: 'temu' })
        .mockResolvedValueOnce({
          success: true,
          data: {
            security: {
              riskScore: 35,
              sellerTrust: 40,
              warnings: ['Price is suspiciously low compared to history']
            }
          }
        });

      await handleTabUpdate(42, 'https://www.temu.com/product-123');

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, { type: 'CHECK_PLATFORM' });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(42, { type: 'ANALYZE_CURRENT_PAGE' });
      expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '!' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenLastCalledWith({ color: '#F44336' });
    });

    it('skips analysis when settings.autoAnalyze is explicitly false', async () => {
      await chrome.storage.local.set({
        settings: {
          autoAnalyze: false,
          notificationsEnabled: true,
          priceAlerts: true,
          securityAlerts: true
        }
      });

      await handleTabUpdate(7, 'https://www.aliexpress.com/item/123.html');

      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });
});
