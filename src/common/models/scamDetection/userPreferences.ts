import { Storage } from "../../utils/storage";
import { ScamHeuristic, UserScamDetectionPreferences } from "../../types";

// Define all available heuristics with default settings
export const DEFAULT_HEURISTICS: ScamHeuristic[] = [
  {
    id: "price_anomaly",
    name: "Price Anomaly Detection",
    description: "Identifies products with prices significantly lower or higher than market average",
    category: "Pricing",
    enabled: true,
    weight: 0.8,
    configOptions: {
      zScoreThreshold: 2.5, // How many standard deviations from mean to flag
      action: "notify"
    }
  },
  {
    id: "new_seller_large_inventory",
    name: "New Seller with Large Inventory",
    description: "Flags new sellers (< 30 days) with unusually large product catalogs",
    category: "Seller",
    enabled: true,
    weight: 0.7,
    configOptions: {
      maxAccountAgeDays: 30,
      minListingCount: 50,
      action: "warn"
    }
  },
  {
    id: "review_pattern_analysis",
    name: "Suspicious Review Patterns",
    description: "Detects unusual patterns in review timing, ratings, or content",
    category: "Reviews",
    enabled: true,
    weight: 0.75,
    configOptions: {
      velocityThreshold: 20, // Max reviews per day that seems normal
      perfectRatioThreshold: 0.9, // Max ratio of 5-star reviews that seems normal
      action: "highlight"
    }
  },
  {
    id: "image_quality_analysis",
    name: "Image Quality Analysis",
    description: "Checks for poor quality, inconsistent, or manipulated product images",
    category: "Visual",
    enabled: true,
    weight: 0.6,
    configOptions: {
      qualityThreshold: 0.4, // Minimum acceptable image quality score
      action: "notify"
    }
  },
  {
    id: "specification_anomalies",
    name: "Specification Anomalies",
    description: "Identifies products with specifications that are unrealistic for their category or price",
    category: "Product",
    enabled: true,
    weight: 0.7,
    configOptions: {
      zScoreThreshold: 3.0,
      action: "warn"
    }
  },
  {
    id: "cross_platform_verification",
    name: "Cross-Platform Verification",
    description: "Compares product listings across platforms to identify inconsistencies",
    category: "Verification",
    enabled: true,
    weight: 0.65,
    configOptions: {
      minMatchScore: 0.7,
      action: "highlight"
    }
  },
  {
    id: "seller_history_analysis",
    name: "Seller History Analysis",
    description: "Analyzes seller's past behavior, ratings, and customer satisfaction",
    category: "Seller",
    enabled: true,
    weight: 0.75,
    configOptions: {
      minHistoryMonths: 3,
      minTransactionCount: 10,
      action: "warn"
    }
  },
  {
    id: "product_description_analysis",
    name: "Product Description Analysis",
    description: "Checks for inconsistencies between product title, description, and specifications",
    category: "Product",
    enabled: true,
    weight: 0.6,
    configOptions: {
      minDescriptionLength: 50,
      action: "notify"
    }
  }
];

// Define categories for UI organization
export const HEURISTIC_CATEGORIES = [
  { id: "Pricing", name: "Pricing Analysis", icon: "price-tag" },
  { id: "Seller", name: "Seller Verification", icon: "store" },
  { id: "Reviews", name: "Review Analysis", icon: "star" },
  { id: "Visual", name: "Visual Verification", icon: "image" },
  { id: "Product", name: "Product Validation", icon: "box" },
  { id: "Verification", name: "Cross-Verification", icon: "shield-check" }
];

// Interfaces are now imported from ../../types

export class ScamDetectionPreferences {
  private static instance: ScamDetectionPreferences;
  private userPreferences: Map<string, UserScamDetectionPreferences> = new Map();

  private constructor() {}

  static getInstance(): ScamDetectionPreferences {
    if (!ScamDetectionPreferences.instance) {
      ScamDetectionPreferences.instance = new ScamDetectionPreferences();
    }
    return ScamDetectionPreferences.instance;
  }

  async getUserPreferences(userId: string): Promise<UserScamDetectionPreferences> {
    // Return cached preferences if available
    if (this.userPreferences.has(userId)) {
      return this.userPreferences.get(userId)!;
    }

    // Load from storage
    const storedPrefs = await Storage.getUserScamPreferences(userId);

    if (storedPrefs) {
      // Ensure all default heuristics exist (in case we've added new ones)
      this.ensureAllHeuristicsExist(storedPrefs);
      this.userPreferences.set(userId, storedPrefs);
      return storedPrefs;
    }

    // Create default preferences if none exist
    const defaultPrefs: UserScamDetectionPreferences = {
      userId,
      heuristics: [...DEFAULT_HEURISTICS], // Clone default heuristics
      globalThreshold: 70, // Default 70% sensitivity
      lastUpdated: Date.now()
    };

    await this.saveUserPreferences(defaultPrefs);
    return defaultPrefs;
  }

  async saveUserPreferences(preferences: UserScamDetectionPreferences): Promise<void> {
    // Update timestamp
    preferences.lastUpdated = Date.now();

    // Save to cache
    this.userPreferences.set(preferences.userId, preferences);

    // Save to storage
    await Storage.setUserScamPreferences(preferences.userId, preferences);
  }

  async updateHeuristic(
    userId: string,
    heuristicId: string,
    updates: Partial<ScamHeuristic>
  ): Promise<UserScamDetectionPreferences> {
    const prefs = await this.getUserPreferences(userId);

    const heuristicIndex = prefs.heuristics.findIndex(h => h.id === heuristicId);
    if (heuristicIndex === -1) {
      throw new Error(`Heuristic with ID ${heuristicId} not found`);
    }

    // Update the heuristic
    prefs.heuristics[heuristicIndex] = {
      ...prefs.heuristics[heuristicIndex],
      ...updates
    };

    // Save updated preferences
    await this.saveUserPreferences(prefs);
    return prefs;
  }

  async updateGlobalThreshold(
    userId: string,
    threshold: number
  ): Promise<UserScamDetectionPreferences> {
    const prefs = await this.getUserPreferences(userId);

    // Ensure threshold is within valid range
    prefs.globalThreshold = Math.max(0, Math.min(100, threshold));

    // Save updated preferences
    await this.saveUserPreferences(prefs);
    return prefs;
  }

  async resetToDefaults(userId: string): Promise<UserScamDetectionPreferences> {
    const defaultPrefs: UserScamDetectionPreferences = {
      userId,
      heuristics: [...DEFAULT_HEURISTICS], // Clone default heuristics
      globalThreshold: 70,
      lastUpdated: Date.now()
    };

    await this.saveUserPreferences(defaultPrefs);
    return defaultPrefs;
  }

  private ensureAllHeuristicsExist(preferences: UserScamDetectionPreferences): void {
    // Add any missing default heuristics
    for (const defaultHeuristic of DEFAULT_HEURISTICS) {
      const exists = preferences.heuristics.some(h => h.id === defaultHeuristic.id);
      if (!exists) {
        preferences.heuristics.push({...defaultHeuristic});
      }
    }
  }
}
