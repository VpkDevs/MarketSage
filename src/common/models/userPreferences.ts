/**
 * Per-user display preferences for scam-detection results: what the UI
 * should do with a product at each risk level (hide it, warn, highlight,
 * or leave it), and whether risky products are hidden completely.
 *
 * Persisted per user in chrome.storage.local. Defaults match the fallbacks
 * UnifiedBrowserManager applies when a preference is unset.
 */
export interface ScamDisplayPreferences {
  criticalAction: 'hide' | 'warn' | 'highlight' | 'none';
  highAction: 'hide' | 'warn' | 'highlight' | 'none';
  mediumAction: 'hide' | 'warn' | 'highlight' | 'none';
  lowAction: 'hide' | 'warn' | 'highlight' | 'none';
  hideProductsCompletely: boolean;
}

export const DEFAULT_SCAM_DISPLAY_PREFERENCES: ScamDisplayPreferences = {
  criticalAction: 'hide',
  highAction: 'warn',
  mediumAction: 'highlight',
  lowAction: 'none',
  hideProductsCompletely: false
};

const STORAGE_KEY_PREFIX = 'scam_display_preferences_';

export class UserPreferences {
  private static instance: UserPreferences;

  private constructor() {}

  static getInstance(): UserPreferences {
    if (!UserPreferences.instance) {
      UserPreferences.instance = new UserPreferences();
    }
    return UserPreferences.instance;
  }

  async getScamDetectionPreferences(userId: string): Promise<ScamDisplayPreferences> {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    try {
      const result = await chrome.storage.local.get(key);
      const stored = result[key] as Partial<ScamDisplayPreferences> | undefined;
      return { ...DEFAULT_SCAM_DISPLAY_PREFERENCES, ...(stored ?? {}) };
    } catch {
      return { ...DEFAULT_SCAM_DISPLAY_PREFERENCES };
    }
  }

  async setScamDetectionPreferences(
    userId: string,
    preferences: Partial<ScamDisplayPreferences>
  ): Promise<void> {
    const current = await this.getScamDetectionPreferences(userId);
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    await chrome.storage.local.set({ [key]: { ...current, ...preferences } });
  }
}
