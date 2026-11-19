import { ServiceManager } from './services/serviceManager';

const SUPPORTED_MARKETPLACE_DOMAINS = ['temu.com', 'aliexpress.com', 'dhgate.com'] as const;

export interface ExtensionSettings {
  autoAnalyze: boolean;
  notificationsEnabled: boolean;
  priceAlerts: boolean;
  securityAlerts: boolean;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  autoAnalyze: true,
  notificationsEnabled: true,
  priceAlerts: true,
  securityAlerts: true
};

// Get the singleton instance (this registers the single runtime.onMessage listener)
const serviceManager = ServiceManager.getInstance();

/**
 * Return true only for HTTP/HTTPS URLs belonging to a supported marketplace
 * domain (exact match or subdomain). Prevents messaging non-marketplace tabs
 * where content.js is not injected.
 */
export function isSupportedMarketplaceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    return SUPPORTED_MARKETPLACE_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

async function readSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.local.get('settings');
  const nested = stored?.settings;
  if (nested && typeof nested === 'object') {
    return { ...DEFAULT_SETTINGS, ...nested };
  }
  return DEFAULT_SETTINGS;
}

// Initialize extension settings and data
export async function initializeExtension(): Promise<void> {
  try {
    // Set default extension settings
    await chrome.storage.local.set({
      settings: { ...DEFAULT_SETTINGS }
    });

    // Clear any existing analysis cache
    await serviceManager.clearAnalysisCache();

    // Set extension badge
    await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    await chrome.action.setBadgeText({ text: 'ON' });

  } catch (error) {
    console.error('MarketSage: Initialization error:', error);
    await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    await chrome.action.setBadgeText({ text: 'ERR' });
  }
}

// Handle extension updates
export async function handleUpdate(previousVersion: string | undefined): Promise<void> {
  try {
    console.log('MarketSage: Updating from version', previousVersion);

    // Clear outdated cache
    await serviceManager.clearAnalysisCache();

    // Update badge
    await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    await chrome.action.setBadgeText({ text: 'ON' });

  } catch (error) {
    console.error('MarketSage: Update error:', error);
    await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    await chrome.action.setBadgeText({ text: 'ERR' });
  }
}

// Handle tab updates
export async function handleTabUpdate(tabId: number, url: string): Promise<void> {
  if (!isSupportedMarketplaceUrl(url)) {
    return;
  }

  try {
    const settings = await readSettings();
    if (!settings.autoAnalyze) return;

    // Ask the injected content script whether this tab is a supported page
    const platformDetector = await chrome.tabs.sendMessage(tabId, {
      type: 'CHECK_PLATFORM'
    });

    if (platformDetector?.isSupported) {
      // Update badge to show analysis is in progress
      await chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
      await chrome.action.setBadgeText({ text: '...' });

      // Analyze the page (content script responds with the standard
      // { success, data } envelope; data.security holds the metrics)
      const analysis = await chrome.tabs.sendMessage(tabId, {
        type: 'ANALYZE_CURRENT_PAGE'
      });
      const security = analysis?.data?.security;
      if (!security) return;

      // Update badge based on analysis results
      if (security.riskScore < 50) {
        await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        await chrome.action.setBadgeText({ text: '!' });
      } else {
        await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        await chrome.action.setBadgeText({ text: '✓' });
      }

      // Show notification if there are high-risk warnings
      if (
        settings.notificationsEnabled &&
        security.warnings.length > 0 &&
        chrome.notifications?.create
      ) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'MarketSage Security Alert',
          message: security.warnings[0], // Show the most important warning
          priority: 2
        });
      }
    }
  } catch (error) {
    console.error('MarketSage: Tab update error:', error);
    await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    await chrome.action.setBadgeText({ text: 'ERR' });
  }
}

// Register MV3 lifecycle listeners when running inside the extension runtime.
// Note: chrome.runtime.onMessage is registered once by ServiceManager.getInstance().
if (typeof chrome !== 'undefined') {
  chrome.runtime?.onInstalled?.addListener(async (details) => {
    if (details.reason === 'install') {
      console.log('MarketSage: Extension installed');
      await initializeExtension();
    } else if (details.reason === 'update') {
      console.log('MarketSage: Extension updated');
      await handleUpdate(details.previousVersion);
    }
  });

  chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      handleTabUpdate(tabId, tab.url);
    }
  });
}
