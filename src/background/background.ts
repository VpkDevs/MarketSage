import { serviceManager } from './services/serviceManager';

// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('MarketSage: Extension installed');
    await initializeExtension();
  } else if (details.reason === 'update') {
    console.log('MarketSage: Extension updated');
    await handleUpdate(details.previousVersion);
  }
});

// Listen for tab updates to analyze new pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    handleTabUpdate(tabId, tab.url);
  }
});

// Initialize extension settings and data
async function initializeExtension() {
  try {
    // Set default extension settings
    await chrome.storage.local.set({
      settings: {
        autoAnalyze: true,
        notificationsEnabled: true,
        priceAlerts: true,
        securityAlerts: true
      }
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
async function handleUpdate(previousVersion: string | undefined) {
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
async function handleTabUpdate(tabId: number, url: string) {
  try {
    // Check if URL is from a supported marketplace
    const settings = await chrome.storage.local.get('settings');
    if (!settings.autoAnalyze) return;

    // Get platform detector from service manager
    const platformDetector = await chrome.tabs.sendMessage(tabId, {
      type: 'CHECK_PLATFORM'
    });

    if (platformDetector.isSupported) {
      // Update badge to show analysis is in progress
      await chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
      await chrome.action.setBadgeText({ text: '...' });

      // Analyze the page
      const analysis = await chrome.tabs.sendMessage(tabId, {
        type: 'ANALYZE_CURRENT_PAGE'
      });

      // Update badge based on analysis results
      if (analysis.security.riskScore < 50) {
        await chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
        await chrome.action.setBadgeText({ text: '!' });
      } else {
        await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        await chrome.action.setBadgeText({ text: '✓' });
      }

      // Show notification if there are high-risk warnings
      if (settings.notificationsEnabled && analysis.security.warnings.length > 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: 'MarketSage Security Alert',
          message: analysis.security.warnings[0], // Show the most important warning
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

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward messages to service manager
  serviceManager.handleMessage(message, sender, sendResponse);
  return true; // Keep the message channel open for async response
});

// Handle extension uninstall
chrome.runtime.setUninstallURL('https://marketsage.com/feedback', () => {
  console.log('MarketSage: Extension uninstalled');
});
