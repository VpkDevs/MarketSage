/**
 * Real-time Marketplace Monitoring Dashboard
 * Provides comprehensive monitoring and analytics for marketplace activities
 */

import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../../common/errors/ErrorHandler';
import { Storage } from '../../common/utils/storage';
import { Service } from '../di/ServiceContainer';
import { AsyncErrorHandler } from '../../common/utils/decorators';
import { Product, Platform } from '../../common/types';
import { Observable, BehaviorSubject, interval, fromEvent } from 'rxjs';
import { map, filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface DashboardMetrics {
  overview: OverviewMetrics;
  security: SecurityMetrics;
  pricing: PricingMetrics;
  performance: PerformanceMetrics;
  trends: TrendMetrics;
  alerts: AlertMetrics;
}

export interface OverviewMetrics {
  totalProducts: number;
  totalSellers: number;
  activeUsers: number;
  transactionVolume: number;
  avgRiskScore: number;
  systemHealth: 'good' | 'warning' | 'critical';
}

export interface SecurityMetrics {
  threatsDetected: number;
  threatsBlocked: number;
  riskDistribution: RiskDistribution;
  topThreats: ThreatSummary[];
  securityScore: number;
  incidentTrends: DataPoint[];
}

export interface PricingMetrics {
  avgPriceChange: number;
  priceVolatility: number;
  suspiciousPricing: number;
  marketTrends: MarketTrend[];
  priceAlerts: number;
  savingsOpportunities: SavingsOpportunity[];
}

export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  cacheHitRate: number;
  resourceUtilization: ResourceUtilization;
}

export interface TrendMetrics {
  popularCategories: CategoryTrend[];
  searchTrends: SearchTrend[];
  seasonalPatterns: SeasonalPattern[];
  userBehavior: UserBehaviorTrend[];
  marketShare: MarketShareData[];
}

export interface AlertMetrics {
  criticalAlerts: Alert[];
  warningAlerts: Alert[];
  totalAlerts: number;
  resolvedAlerts: number;
  avgResolutionTime: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface ThreatSummary {
  type: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface DataPoint {
  timestamp: number;
  value: number;
  metadata?: any;
}

export interface MarketTrend {
  category: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  volume: number;
}

export interface SavingsOpportunity {
  productId: string;
  potential: number;
  category: string;
  confidence: number;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

export interface CategoryTrend {
  category: string;
  growth: number;
  volume: number;
  rank: number;
}

export interface SearchTrend {
  term: string;
  frequency: number;
  growth: number;
  related: string[];
}

export interface SeasonalPattern {
  pattern: string;
  strength: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  forecast: DataPoint[];
}

export interface UserBehaviorTrend {
  behavior: string;
  frequency: number;
  change: number;
  segment: string;
}

export interface MarketShareData {
  platform: Platform;
  share: number;
  change: number;
  volume: number;
}

export interface Alert {
  id: string;
  type: 'security' | 'performance' | 'pricing' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: number;
  status: 'open' | 'investigating' | 'resolved';
  affectedSystems: string[];
  resolutionSteps?: string[];
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'map' | 'alert';
  title: string;
  data: any;
  config: WidgetConfig;
  lastUpdated: number;
}

export interface WidgetConfig {
  refreshInterval: number;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  filters?: any;
  customization?: any;
}

export interface MonitoringEvent {
  type: string;
  source: string;
  data: any;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

@Service('MarketplaceMonitoringDashboard')
export class MarketplaceMonitoringDashboard {
  private metricsSubject = new BehaviorSubject<DashboardMetrics | null>(null);
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  private eventsSubject = new BehaviorSubject<MonitoringEvent[]>([]);
  
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly ALERT_THRESHOLD = {
    responseTime: 3000,
    errorRate: 0.05,
    securityScore: 70,
    threatCount: 10
  };
  
  private widgets: Map<string, DashboardWidget> = new Map();
  private monitoringActive = false;
  
  constructor() {
    this.initializeWidgets();
    this.startRealTimeMonitoring();
  }

  /**
   * Get real-time metrics observable
   */
  getMetricsStream(): Observable<DashboardMetrics | null> {
    return this.metricsSubject.asObservable();
  }

  /**
   * Get real-time alerts observable
   */
  getAlertsStream(): Observable<Alert[]> {
    return this.alertsSubject.asObservable();
  }

  /**
   * Get real-time events observable
   */
  getEventsStream(): Observable<MonitoringEvent[]> {
    return this.eventsSubject.asObservable();
  }

  /**
   * Start real-time monitoring
   */
  @AsyncErrorHandler()
  async startRealTimeMonitoring(): Promise<void> {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    
    // Set up periodic metric updates
    interval(this.UPDATE_INTERVAL).subscribe(async () => {
      if (this.monitoringActive) {
        try {
          const metrics = await this.collectMetrics();
          this.metricsSubject.next(metrics);
          
          // Check for alerts
          const alerts = await this.checkForAlerts(metrics);
          if (alerts.length > 0) {
            this.alertsSubject.next([...this.alertsSubject.value, ...alerts]);
          }
        } catch (error) {
          ErrorHandler.getInstance().error(
            'Failed to update dashboard metrics',
            'DASHBOARD_UPDATE_ERROR',
            ErrorSeverity.MEDIUM,
            ErrorCategory.ANALYSIS,
            { error }
          );
        }
      }
    });

    // Set up event monitoring
    this.setupEventMonitoring();
    
    console.log('Real-time monitoring started');
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    this.monitoringActive = false;
    console.log('Real-time monitoring stopped');
  }

  /**
   * Get current dashboard metrics
   */
  @AsyncErrorHandler()
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.collectMetrics();
  }

  /**
   * Get historical data for a specific metric
   */
  @AsyncErrorHandler()
  async getHistoricalData(
    metric: string,
    timeRange: { start: number; end: number },
    granularity: 'minute' | 'hour' | 'day' = 'hour'
  ): Promise<DataPoint[]> {
    return Storage.getHistoricalMetric(metric, timeRange, granularity);
  }

  /**
   * Create custom dashboard widget
   */
  @AsyncErrorHandler()
  async createWidget(config: Omit<DashboardWidget, 'id' | 'lastUpdated'>): Promise<string> {
    const widgetId = this.generateWidgetId();
    const widget: DashboardWidget = {
      id: widgetId,
      ...config,
      lastUpdated: Date.now()
    };
    
    this.widgets.set(widgetId, widget);
    await Storage.saveWidget(widget);
    
    return widgetId;
  }

  /**
   * Update widget configuration
   */
  @AsyncErrorHandler()
  async updateWidget(widgetId: string, updates: Partial<DashboardWidget>): Promise<void> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }
    
    const updatedWidget = { ...widget, ...updates, lastUpdated: Date.now() };
    this.widgets.set(widgetId, updatedWidget);
    await Storage.saveWidget(updatedWidget);
  }

  /**
   * Delete dashboard widget
   */
  @AsyncErrorHandler()
  async deleteWidget(widgetId: string): Promise<void> {
    this.widgets.delete(widgetId);
    await Storage.deleteWidget(widgetId);
  }

  /**
   * Get all dashboard widgets
   */
  getWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Create alert based on conditions
   */
  @AsyncErrorHandler()
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const alertId = this.generateAlertId();
    const newAlert: Alert = {
      id: alertId,
      timestamp: Date.now(),
      status: 'open',
      ...alert
    };
    
    const currentAlerts = this.alertsSubject.value;
    this.alertsSubject.next([...currentAlerts, newAlert]);
    
    await Storage.saveAlert(newAlert);
    await this.notifyAlert(newAlert);
    
    return alertId;
  }

  /**
   * Update alert status
   */
  @AsyncErrorHandler()
  async updateAlertStatus(alertId: string, status: Alert['status'], resolutionSteps?: string[]): Promise<void> {
    const alerts = this.alertsSubject.value;
    const alertIndex = alerts.findIndex(a => a.id === alertId);
    
    if (alertIndex === -1) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    const updatedAlert = {
      ...alerts[alertIndex],
      status,
      resolutionSteps
    };
    
    alerts[alertIndex] = updatedAlert;
    this.alertsSubject.next([...alerts]);
    
    await Storage.updateAlert(updatedAlert);
  }

  /**
   * Collect all dashboard metrics
   */
  private async collectMetrics(): Promise<DashboardMetrics> {
    const [
      overview,
      security,
      pricing,
      performance,
      trends,
      alerts
    ] = await Promise.all([
      this.collectOverviewMetrics(),
      this.collectSecurityMetrics(),
      this.collectPricingMetrics(),
      this.collectPerformanceMetrics(),
      this.collectTrendMetrics(),
      this.collectAlertMetrics()
    ]);

    return {
      overview,
      security,
      pricing,
      performance,
      trends,
      alerts
    };
  }

  /**
   * Collect overview metrics
   */
  private async collectOverviewMetrics(): Promise<OverviewMetrics> {
    const [
      totalProducts,
      totalSellers,
      activeUsers,
      transactionVolume,
      avgRiskScore
    ] = await Promise.all([
      Storage.getTotalProducts(),
      Storage.getTotalSellers(),
      Storage.getActiveUsers(),
      Storage.getTransactionVolume(),
      Storage.getAverageRiskScore()
    ]);

    const systemHealth = this.calculateSystemHealth({
      avgRiskScore,
      errorRate: await this.getErrorRate(),
      responseTime: await this.getResponseTime()
    });

    return {
      totalProducts,
      totalSellers,
      activeUsers,
      transactionVolume,
      avgRiskScore,
      systemHealth
    };
  }

  /**
   * Collect security metrics
   */
  private async collectSecurityMetrics(): Promise<SecurityMetrics> {
    const [
      threatsDetected,
      threatsBlocked,
      riskDistribution,
      topThreats,
      incidentTrends
    ] = await Promise.all([
      Storage.getThreatsDetected(),
      Storage.getThreatsBlocked(),
      Storage.getRiskDistribution(),
      Storage.getTopThreats(),
      Storage.getIncidentTrends()
    ]);

    const securityScore = this.calculateSecurityScore({
      threatsDetected,
      threatsBlocked,
      riskDistribution
    });

    return {
      threatsDetected,
      threatsBlocked,
      riskDistribution,
      topThreats,
      securityScore,
      incidentTrends
    };
  }

  /**
   * Collect pricing metrics
   */
  private async collectPricingMetrics(): Promise<PricingMetrics> {
    const [
      avgPriceChange,
      priceVolatility,
      suspiciousPricing,
      marketTrends,
      priceAlerts,
      savingsOpportunities
    ] = await Promise.all([
      Storage.getAveragePriceChange(),
      Storage.getPriceVolatility(),
      Storage.getSuspiciousPricingCount(),
      Storage.getMarketTrends(),
      Storage.getPriceAlerts(),
      Storage.getSavingsOpportunities()
    ]);

    return {
      avgPriceChange,
      priceVolatility,
      suspiciousPricing,
      marketTrends,
      priceAlerts,
      savingsOpportunities
    };
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const [
      responseTime,
      throughput,
      errorRate,
      uptime,
      cacheHitRate,
      resourceUtilization
    ] = await Promise.all([
      this.getResponseTime(),
      this.getThroughput(),
      this.getErrorRate(),
      this.getUptime(),
      this.getCacheHitRate(),
      this.getResourceUtilization()
    ]);

    return {
      responseTime,
      throughput,
      errorRate,
      uptime,
      cacheHitRate,
      resourceUtilization
    };
  }

  /**
   * Collect trend metrics
   */
  private async collectTrendMetrics(): Promise<TrendMetrics> {
    const [
      popularCategories,
      searchTrends,
      seasonalPatterns,
      userBehavior,
      marketShare
    ] = await Promise.all([
      Storage.getPopularCategories(),
      Storage.getSearchTrends(),
      Storage.getSeasonalPatterns(),
      Storage.getUserBehaviorTrends(),
      Storage.getMarketShare()
    ]);

    return {
      popularCategories,
      searchTrends,
      seasonalPatterns,
      userBehavior,
      marketShare
    };
  }

  /**
   * Collect alert metrics
   */
  private async collectAlertMetrics(): Promise<AlertMetrics> {
    const allAlerts = this.alertsSubject.value;
    const criticalAlerts = allAlerts.filter(a => a.severity === 'critical' && a.status === 'open');
    const warningAlerts = allAlerts.filter(a => a.severity === 'medium' && a.status === 'open');
    const resolvedAlerts = allAlerts.filter(a => a.status === 'resolved');
    
    const avgResolutionTime = await Storage.getAverageResolutionTime();

    return {
      criticalAlerts,
      warningAlerts,
      totalAlerts: allAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      avgResolutionTime
    };
  }

  /**
   * Check for alerts based on current metrics
   */
  private async checkForAlerts(metrics: DashboardMetrics): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Performance alerts
    if (metrics.performance.responseTime > this.ALERT_THRESHOLD.responseTime) {
      alerts.push(await this.createPerformanceAlert('High Response Time', metrics.performance.responseTime));
    }

    if (metrics.performance.errorRate > this.ALERT_THRESHOLD.errorRate) {
      alerts.push(await this.createPerformanceAlert('High Error Rate', metrics.performance.errorRate));
    }

    // Security alerts
    if (metrics.security.securityScore < this.ALERT_THRESHOLD.securityScore) {
      alerts.push(await this.createSecurityAlert('Low Security Score', metrics.security.securityScore));
    }

    if (metrics.security.threatsDetected > this.ALERT_THRESHOLD.threatCount) {
      alerts.push(await this.createSecurityAlert('High Threat Activity', metrics.security.threatsDetected));
    }

    return alerts;
  }

  /**
   * Setup event monitoring
   */
  private setupEventMonitoring(): void {
    // Monitor Chrome extension events
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message) => {
        this.addEvent({
          type: 'extension_message',
          source: 'chrome_extension',
          data: message,
          timestamp: Date.now(),
          severity: 'info'
        });
      });
    }

    // Monitor window events
    if (typeof window !== 'undefined') {
      fromEvent(window, 'error').subscribe((error) => {
        this.addEvent({
          type: 'javascript_error',
          source: 'window',
          data: error,
          timestamp: Date.now(),
          severity: 'error'
        });
      });
    }
  }

  /**
   * Add monitoring event
   */
  private addEvent(event: MonitoringEvent): void {
    const events = this.eventsSubject.value;
    const updatedEvents = [event, ...events].slice(0, 1000); // Keep last 1000 events
    this.eventsSubject.next(updatedEvents);
  }

  /**
   * Initialize default widgets
   */
  private initializeWidgets(): void {
    // Add default widgets
    const defaultWidgets = [
      {
        id: 'overview',
        type: 'metric' as const,
        title: 'System Overview',
        data: {},
        config: {
          refreshInterval: 30000,
          size: 'large' as const,
          position: { x: 0, y: 0 }
        },
        lastUpdated: Date.now()
      },
      {
        id: 'security_chart',
        type: 'chart' as const,
        title: 'Security Threats',
        data: {},
        config: {
          refreshInterval: 60000,
          size: 'medium' as const,
          position: { x: 1, y: 0 }
        },
        lastUpdated: Date.now()
      }
    ];

    defaultWidgets.forEach(widget => {
      this.widgets.set(widget.id, widget);
    });
  }

  // Helper methods
  private calculateSystemHealth(metrics: { avgRiskScore: number; errorRate: number; responseTime: number }): 'good' | 'warning' | 'critical' {
    if (metrics.avgRiskScore > 80 || metrics.errorRate > 0.1 || metrics.responseTime > 5000) {
      return 'critical';
    }
    if (metrics.avgRiskScore > 60 || metrics.errorRate > 0.05 || metrics.responseTime > 3000) {
      return 'warning';
    }
    return 'good';
  }

  private calculateSecurityScore(metrics: { threatsDetected: number; threatsBlocked: number; riskDistribution: RiskDistribution }): number {
    const blockRate = metrics.threatsDetected > 0 ? metrics.threatsBlocked / metrics.threatsDetected : 1;
    const riskWeight = (metrics.riskDistribution.low * 1 + metrics.riskDistribution.medium * 2 + 
                      metrics.riskDistribution.high * 3 + metrics.riskDistribution.critical * 4) / 10;
    
    return Math.max(0, Math.min(100, (blockRate * 100) - riskWeight));
  }

  private async getResponseTime(): Promise<number> {
    return Storage.getMetric('response_time') || 1000;
  }

  private async getThroughput(): Promise<number> {
    return Storage.getMetric('throughput') || 100;
  }

  private async getErrorRate(): Promise<number> {
    return Storage.getMetric('error_rate') || 0.01;
  }

  private async getUptime(): Promise<number> {
    return Storage.getMetric('uptime') || 99.9;
  }

  private async getCacheHitRate(): Promise<number> {
    return Storage.getMetric('cache_hit_rate') || 85;
  }

  private async getResourceUtilization(): Promise<ResourceUtilization> {
    return {
      cpu: await Storage.getMetric('cpu_usage') || 45,
      memory: await Storage.getMetric('memory_usage') || 60,
      storage: await Storage.getMetric('storage_usage') || 30,
      network: await Storage.getMetric('network_usage') || 25
    };
  }

  private async createPerformanceAlert(title: string, value: number): Promise<Alert> {
    return {
      id: this.generateAlertId(),
      type: 'performance',
      severity: value > this.ALERT_THRESHOLD.responseTime * 2 ? 'critical' : 'medium',
      title,
      description: `Performance threshold exceeded: ${value}`,
      timestamp: Date.now(),
      status: 'open',
      affectedSystems: ['monitoring', 'performance']
    };
  }

  private async createSecurityAlert(title: string, value: number): Promise<Alert> {
    return {
      id: this.generateAlertId(),
      type: 'security',
      severity: 'high',
      title,
      description: `Security concern detected: ${value}`,
      timestamp: Date.now(),
      status: 'open',
      affectedSystems: ['security', 'threat_detection']
    };
  }

  private async notifyAlert(alert: Alert): Promise<void> {
    // Implementation for alert notifications
    console.warn(`Alert: ${alert.title} - ${alert.description}`);
  }

  private generateWidgetId(): string {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
