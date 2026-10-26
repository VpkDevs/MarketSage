/**
 * Content script entry point (injected into Temu / AliExpress / DHgate
 * pages per the manifest's content_scripts).
 *
 * It owns everything that needs the page DOM: platform detection and
 * product extraction. Analysis itself runs in the background service
 * worker (ServiceManager + analyzers), which has no DOM access.
 *
 * Message protocol:
 * - { type: 'CHECK_PLATFORM' }        (from background, tabs.sendMessage)
 *     -> { isSupported, platform }
 * - { type: 'EXTRACT_PRODUCT' }       (from background ServiceManager)
 *     -> { success, data?: Product, error? }
 * - { type: 'ANALYZE_CURRENT_PAGE' }  (from background, tabs.sendMessage)
 *     -> { success, data?: { product, security, pricing }, error? }
 *        The product is extracted here, then forwarded to the background
 *        as ANALYZE_PRODUCT for analysis; background.ts reads
 *        data.security.riskScore / warnings off the response.
 */
import { PlatformDetector } from './services/platformDetector';
import { ProductExtractor } from './services/productExtractor';
import { Product } from '../common/types';

const platformDetector = new PlatformDetector();
const productExtractor = new ProductExtractor();

async function extractProduct(): Promise<Product> {
  return productExtractor.extract();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      switch (message?.type) {
        case 'CHECK_PLATFORM':
          sendResponse({
            isSupported: platformDetector.isSupported(),
            platform: platformDetector.getCurrentPlatform()
          });
          break;

        case 'EXTRACT_PRODUCT': {
          const product = await extractProduct();
          sendResponse({ success: true, data: product });
          break;
        }

        case 'ANALYZE_CURRENT_PAGE': {
          const product = await extractProduct();
          const response = await chrome.runtime.sendMessage({
            type: 'ANALYZE_PRODUCT',
            product
          });
          sendResponse(response);
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown request type' });
      }
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })();

  return true; // Keep the message channel open for the async response
});
