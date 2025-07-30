/**
 * Enhanced Analytics Service
 * Provides comprehensive user behavior tracking and insights
 */

import { Service, AsyncErrorHandler } from '../di/decorators';

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export interface UserBehavior {
  sessionId: string;
  userId?: string;
  events: AnalyticsEvent[];
  startTime: Date;
  lastActivity: Date;
  pageViews: string[];
  interactions: number;
}

export interface AnalyticsInsights {
  topCategories: Array<{ category: string; count: number }>;
  userJourney: string[];
  engagementScore: number;
  riskPreferences: {
    acceptsHighRisk: boolean;
    prefersSafeDeals: boolean;
    averageRiskTolerance: number;
  };
  shoppingPatterns: {
    averageSessionTime: number;
    productsViewedPerSession: number;
    conversionRate: number;
  };
}

@Service('AnalyticsService')
export class AnalyticsService {
  private currentSession: UserBehavior | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private readonly STORAGE_KEY = 'analytics_data';
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.initializeSession();
    this.setupPeriodicFlush();
  }

  /**
   * Initialize a new analytics session
   */
  @AsyncErrorHandler()
  private async initializeSession(): Promise<void> {
    const sessionId = this.generateSessionId();
    this.currentSession = {
      sessionId,
      events: [],
      startTime: new Date(),
      lastActivity: new Date(),
      pageViews: [],
      interactions: 0
    };

    await this.trackEvent({
      category: 'session',
      action: 'start',
      custom_parameters: {
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }
    });
  }

  /**
   * Track an analytics event
   */
  @AsyncErrorHandler()
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.currentSession) {
      await this.initializeSession();
    }

    const enrichedEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.currentSession!.sessionId
    };

    this.currentSession!.events.push(enrichedEvent);
    this.currentSession!.lastActivity = new Date();
    this.currentSession!.interactions++;

    this.eventQueue.push(enrichedEvent);

    // Auto-flush if queue gets too large
    if (this.eventQueue.length >= 50) {
      await this.flushEvents();
    }
  }

  /**
   * Track page view
   */
  @AsyncErrorHandler()
  async trackPageView(url: string, title?: string): Promise<void> {
    if (this.currentSession) {
      this.currentSession.pageViews.push(url);
    }

    await this.trackEvent({
      category: 'page',
      action: 'view',
      label: url,
      custom_parameters: { title }
    });
  }

  /**
   * Track user interaction with MarketSage features
   */
  @AsyncErrorHandler()
  async trackFeatureUsage(feature: 'protect' | 'insight' | 'scout', action: string, context?: any): Promise<void> {
    await this.trackEvent({
      category: `feature_${feature}`,
      action,
      custom_parameters: context
    });
  }

  /**
   * Track security decisions
   */
  @AsyncErrorHandler()
  async trackSecurityDecision(decision: 'proceed' | 'abort', riskLevel: number, context: any): Promise<void> {
    await this.trackEvent({
      category: 'security',
      action: decision,
      value: riskLevel,
      custom_parameters: context
    });
  }

  /**
   * Track price comparison behavior
   */
  @AsyncErrorHandler()
  async trackPriceComparison(productId: string, platforms: string[], selectedPlatform?: string): Promise<void> {
    await this.trackEvent({
      category: 'price_comparison',
      action: 'compare',
      label: productId,
      custom_parameters: {
        platforms,
        selectedPlatform,
        platformCount: platforms.length
      }
    });
  }

  /**
   * Get analytics insights for the current user
   */
  @AsyncErrorHandler({ topCategories: [], userJourney: [], engagementScore: 0, riskPreferences: { acceptsHighRisk: false, prefersSafeDeals: true, averageRiskTolerance: 0.3 }, shoppingPatterns: { averageSessionTime: 0, productsViewedPerSession: 0, conversionRate: 0 } })
  async getInsights(): Promise<AnalyticsInsights> {
    const data = await this.getStoredData();
    
    return {
      topCategories: this.calculateTopCategories(data),
      userJourney: this.extractUserJourney(data),
      engagementScore: this.calculateEngagementScore(data),
      riskPreferences: this.analyzeRiskPreferences(data),
      shoppingPatterns: this.analyzeShoppingPatterns(data)
    };
  }

  /**
   * Flush events to storage
   */
  @AsyncErrorHandler()
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    try {
      const existingData = await this.getStoredData();
      const updatedData = [...existingData, ...this.eventQueue];
      
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: updatedData
      });

      this.eventQueue = [];
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
    }
  }

  /**
   * Get stored analytics data
   */
  private async getStoredData(): Promise<AnalyticsEvent[]> {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || [];
    } catch (error) {
      console.error('Failed to get stored analytics data:', error);
      return [];
    }
  }

  /**
   * Calculate top event categories
   */
  private calculateTopCategories(events: AnalyticsEvent[]): Array<{ category: string; count: number }> {
    const categoryCount = new Map<string, number>();
    
    events.forEach(event => {
      const count = categoryCount.get(event.category) || 0;
      categoryCount.set(event.category, count + 1);
    });

    return Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Extract user journey from events
   */
  private extractUserJourney(events: AnalyticsEvent[]): string[] {
    return events
      .filter(event => event.category === 'page' && event.action === 'view')
      .map(event => event.label || '')
      .filter(Boolean);
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;

    const interactionEvents = events.filter(e => 
      !['page', 'session'].includes(e.category)
    );

    const sessionEvents = events.filter(e => e.category === 'session');
    const sessions = sessionEvents.length / 2; // start/end pairs

    if (sessions === 0) return 0;

    return Math.min(100, (interactionEvents.length / sessions) * 10);
  }

  /**
   * Analyze user risk preferences
   */
  private analyzeRiskPreferences(events: AnalyticsEvent[]): AnalyticsInsights['riskPreferences'] {
    const securityEvents = events.filter(e => e.category === 'security');
    
    if (securityEvents.length === 0) {
      return {
        acceptsHighRisk: false,
        prefersSafeDeals: true,
        averageRiskTolerance: 0.3
      };
    }

    const proceedCount = securityEvents.filter(e => e.action === 'proceed').length;
    const abortCount = securityEvents.filter(e => e.action === 'abort').length;
    
    const totalRisk = securityEvents.reduce((sum, e) => sum + (e.value || 0), 0);
    const averageRiskTolerance = totalRisk / securityEvents.length;

    return {
      acceptsHighRisk: proceedCount > abortCount,
      prefersSafeDeals: abortCount >= proceedCount,
      averageRiskTolerance: averageRiskTolerance / 100 // normalize to 0-1
    };
  }

  /**
   * Analyze shopping patterns
   */
  private analyzeShoppingPatterns(events: AnalyticsEvent[]): AnalyticsInsights['shoppingPatterns'] {
    const sessionStarts = events.filter(e => e.category === 'session' && e.action === 'start');
    const pageViews = events.filter(e => e.category === 'page' && e.action === 'view');
    const purchases = events.filter(e => e.category === 'purchase');

    const sessionCount = sessionStarts.length;
    if (sessionCount === 0) {
      return {
        averageSessionTime: 0,
        productsViewedPerSession: 0,
        conversionRate: 0
      };
    }

    return {
      averageSessionTime: this.calculateAverageSessionTime(events),
      productsViewedPerSession: pageViews.length / sessionCount,
      conversionRate: purchases.length / sessionCount
    };
  }

  /**
   * Calculate average session time
   */
  private calculateAverageSessionTime(events: AnalyticsEvent[]): number {
    // This would require more sophisticated session tracking
    // For now, return a placeholder
    return 0;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup periodic event flushing
   */
  private setupPeriodicFlush(): void {
    setInterval(async () => {
      await this.flushEvents();
    }, 30000); // Flush every 30 seconds
  }

  /**
   * End current session
   */
  @AsyncErrorHandler()
  async endSession(): Promise<void> {
    if (this.currentSession) {
      await this.trackEvent({
        category: 'session',
        action: 'end',
        custom_parameters: {
          duration: Date.now() - this.currentSession.startTime.getTime(),
          interactions: this.currentSession.interactions,
          pageViews: this.currentSession.pageViews.length
        }
      });

      await this.flushEvents();
      this.currentSession = null;
    }
  }
}
