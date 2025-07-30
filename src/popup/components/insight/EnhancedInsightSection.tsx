import React, { useState, useEffect } from 'react';
import { EnhancedAuthProvider } from '../../../core/auth/EnhancedAuthProvider';
import { 
  Card, 
  Button, 
  Badge, 
  Progress, 
  Alert, 
  Loading,
  Modal,
  Tabs
} from '../enhanced/EnhancedUI';
import styles from '../../styles/EnhancedUI.module.css';

interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  securityLevel: 'basic' | 'enhanced' | 'premium';
}

interface EnhancedInsightSectionProps {
  isActive: boolean;
  authProvider: EnhancedAuthProvider;
  user: User | null;
  onNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

interface PriceData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: Date;
}

interface MarketInsight {
  id: string;
  type: 'price_drop' | 'price_increase' | 'deal_alert' | 'market_trend';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  timestamp: Date;
}

interface CompetitorData {
  store: string;
  price: number;
  shipping: number;
  total: number;
  rating: number;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  url: string;
}

interface AnalyticsData {
  priceHistory: Array<{ date: Date; price: number }>;
  insights: MarketInsight[];
  competitors: CompetitorData[];
  recommendations: string[];
}

const EnhancedInsightSection: React.FC<EnhancedInsightSectionProps> = ({ 
  isActive, 
  authProvider, 
  user, 
  onNotification 
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState<'overview' | 'trends' | 'competitors'>('overview');

  useEffect(() => {
    if (isActive && user) {
      fetchPriceAnalytics();
    }
  }, [isActive, user]);

  const fetchPriceAnalytics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Log analytics event
      await authProvider.logSecurityEvent('price_analysis_initiated', {
        timestamp: new Date(),
        userId: user.id
      });

      // Get current tab to analyze
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) throw new Error('No active tab found');

      // Enhanced analysis based on user tier
      const analysisDepth = user.securityLevel === 'premium' ? 'comprehensive' : 
                           user.securityLevel === 'enhanced' ? 'detailed' : 'basic';

      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_PRICE_DATA',
        options: {
          url: tab.url,
          depth: analysisDepth,
          includeCompetitors: user.securityLevel !== 'basic',
          includeTrends: user.securityLevel === 'premium'
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze price data');
      }

      // Mock data for demonstration
      const mockCurrentPrice: PriceData = {
        current: 299.99,
        previous: 349.99,
        change: -50.00,
        changePercent: -14.29,
        currency: 'USD',
        lastUpdated: new Date()
      };

      const mockAnalytics: AnalyticsData = {
        priceHistory: [
          { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), price: 379.99 },
          { date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), price: 349.99 },
          { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), price: 329.99 },
          { date: new Date(), price: 299.99 }
        ],
        insights: [
          {
            id: '1',
            type: 'price_drop',
            title: 'Significant Price Drop Detected',
            description: 'Price has dropped 14.29% in the last 24 hours. This is a good buying opportunity.',
            confidence: 92,
            impact: 'high',
            timestamp: new Date()
          },
          {
            id: '2',
            type: 'market_trend',
            title: 'Seasonal Trend Alert',
            description: 'Historical data shows prices typically rise by 20% next month.',
            confidence: 78,
            impact: 'medium',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        ],
        competitors: [
          {
            store: 'Amazon',
            price: 309.99,
            shipping: 0,
            total: 309.99,
            rating: 4.5,
            availability: 'in_stock',
            url: 'https://amazon.com/product'
          },
          {
            store: 'Best Buy',
            price: 299.99,
            shipping: 9.99,
            total: 309.98,
            rating: 4.2,
            availability: 'low_stock',
            url: 'https://bestbuy.com/product'
          }
        ],
        recommendations: [
          'Current price is 21% below 30-day average',
          'Best time to buy based on historical trends',
          'Consider purchasing before next price increase cycle'
        ]
      };

      setCurrentPrice(mockCurrentPrice);
      setAnalytics(mockAnalytics);

      // Log successful analysis
      await authProvider.logSecurityEvent('price_analysis_completed', {
        timestamp: new Date(),
        userId: user.id,
        priceChange: mockCurrentPrice.changePercent,
        insightsFound: mockAnalytics.insights.length
      });

      onNotification('success', 'Price analysis completed successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Enhanced InsightSection Error:', err);
      
      if (user) {
        await authProvider.logSecurityEvent('price_analysis_failed', {
          timestamp: new Date(),
          userId: user.id,
          error: errorMessage
        });
      }
      
      onNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPriceChangeColor = (change: number): 'success' | 'danger' => {
    return change < 0 ? 'success' : 'danger';
  };

  const getInsightIcon = (type: string): string => {
    switch (type) {
      case 'price_drop': return '📉';
      case 'price_increase': return '📈';
      case 'deal_alert': return '🔥';
      case 'market_trend': return '📊';
      default: return '💡';
    }
  };

  const getAvailabilityColor = (availability: string): 'success' | 'warning' | 'danger' => {
    switch (availability) {
      case 'in_stock': return 'success';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'danger';
      default: return 'warning';
    }
  };

  const insightTabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'trends' as const, label: 'Trends', badge: user?.securityLevel === 'premium' ? 'Pro' : undefined },
    { id: 'competitors' as const, label: 'Competitors', badge: user?.securityLevel !== 'basic' ? undefined : 'Premium' }
  ];

  if (!isActive) return null;

  if (!user) {
    return (
      <div className={styles.section}>
        <Alert type="info" title="Authentication Required">
          Please log in to access price insights and analytics.
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Market Insights</h2>
        <div className={styles.headerActions}>
          <Badge variant="primary">
            {user.securityLevel.toUpperCase()}
          </Badge>
          <Button
            variant="secondary"
            size="small"
            onClick={fetchPriceAnalytics}
            disabled={loading}
            aria-label="Refresh analysis"
          >
            🔄
          </Button>
          {user.securityLevel === 'premium' && (
            <Button
              variant="ghost"
              size="small"
              onClick={() => setShowDetailedAnalysis(true)}
              aria-label="Detailed analysis"
            >
              📊
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <Card variant="outline">
          <div className={styles.loadingContainer}>
            <Loading variant="spinner" size="medium" />
            <p>Analyzing market data...</p>
          </div>
        </Card>
      )}

      {error && (
        <Alert 
          type="error" 
          title="Analysis Failed"
          action={
            <Button size="small" onClick={fetchPriceAnalytics}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && currentPrice && analytics && (
        <div className={styles.insightContent}>
          {/* Current Price Card */}
          <Card variant="elevated" className={styles.priceCard}>
            <div className={styles.priceHeader}>
              <h3>Current Price</h3>
              <Badge variant="primary" size="small">Live</Badge>
            </div>
            <div className={styles.priceDisplay}>
              <span className={styles.currentPrice}>
                {currentPrice.currency} {currentPrice.current.toFixed(2)}
              </span>
              <div className={styles.priceChange}>
                <Badge 
                  variant={getPriceChangeColor(currentPrice.change)}
                  size="small"
                >
                  {currentPrice.change >= 0 ? '+' : ''}{currentPrice.change.toFixed(2)} 
                  ({currentPrice.changePercent.toFixed(1)}%)
                </Badge>
              </div>
            </div>
            <div className={styles.priceFooter}>
              <span>Last updated: {currentPrice.lastUpdated.toLocaleTimeString()}</span>
            </div>
          </Card>

          {/* Insights Overview */}
          <Card variant="outline">
            <div className={styles.cardHeader}>
              <h3>Key Insights</h3>
              <Badge variant="success">{analytics.insights.length}</Badge>
            </div>
            <div className={styles.insightsList}>
              {analytics.insights.map((insight) => (
                <div key={insight.id} className={styles.insightItem}>
                  <div className={styles.insightIcon}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className={styles.insightContent}>
                    <h4>{insight.title}</h4>
                    <p>{insight.description}</p>
                    <div className={styles.insightMeta}>
                      <Badge variant="secondary" size="small">
                        {insight.confidence}% confidence
                      </Badge>
                      <span className={styles.insightTime}>
                        {insight.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Navigation Tabs */}
          <Tabs
            items={insightTabs}
            activeTab={activeInsightTab}
            onTabChange={setActiveInsightTab}
            variant="underline"
          />

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeInsightTab === 'overview' && (
              <Card variant="outline">
                <h3>Recommendations</h3>
                <div className={styles.recommendationsList}>
                  {analytics.recommendations.map((rec, index) => (
                    <div key={index} className={styles.recommendationItem}>
                      <span className={styles.recommendationIcon}>💡</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeInsightTab === 'trends' && user.securityLevel === 'premium' && (
              <Card variant="outline">
                <h3>Price Trends</h3>
                <div className={styles.trendsContainer}>
                  <div className={styles.priceHistory}>
                    {analytics.priceHistory.map((point, index) => (
                      <div key={index} className={styles.historyPoint}>
                        <span className={styles.historyDate}>
                          {point.date.toLocaleDateString()}
                        </span>
                        <span className={styles.historyPrice}>
                          ${point.price.toFixed(2)}
                        </span>
                        <Progress 
                          value={(point.price / Math.max(...analytics.priceHistory.map(p => p.price))) * 100}
                          max={100}
                          variant="primary"
                          size="small"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {activeInsightTab === 'trends' && user.securityLevel !== 'premium' && (
              <Card variant="outline">
                <div className={styles.upgradePrompt}>
                  <h3>Premium Feature</h3>
                  <p>Upgrade to Premium to access detailed price trends and historical analysis.</p>
                  <Button variant="primary" size="small">
                    Upgrade Now
                  </Button>
                </div>
              </Card>
            )}

            {activeInsightTab === 'competitors' && user.securityLevel !== 'basic' && (
              <Card variant="outline">
                <h3>Competitor Pricing</h3>
                <div className={styles.competitorsList}>
                  {analytics.competitors.map((competitor, index) => (
                    <div key={index} className={styles.competitorItem}>
                      <div className={styles.competitorInfo}>
                        <h4>{competitor.store}</h4>
                        <div className={styles.competitorMeta}>
                          <span>⭐ {competitor.rating}</span>
                          <Badge 
                            variant={getAvailabilityColor(competitor.availability)}
                            size="small"
                          >
                            {competitor.availability.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className={styles.competitorPricing}>
                        <span className={styles.competitorPrice}>
                          ${competitor.price.toFixed(2)}
                        </span>
                        <span className={styles.competitorShipping}>
                          +${competitor.shipping.toFixed(2)} shipping
                        </span>
                        <span className={styles.competitorTotal}>
                          Total: ${competitor.total.toFixed(2)}
                        </span>
                      </div>
                      <Button 
                        variant="link" 
                        size="small"
                        onClick={() => window.open(competitor.url, '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {activeInsightTab === 'competitors' && user.securityLevel === 'basic' && (
              <Card variant="outline">
                <div className={styles.upgradePrompt}>
                  <h3>Enhanced Feature</h3>
                  <p>Upgrade to Enhanced or Premium to compare prices across multiple retailers.</p>
                  <Button variant="primary" size="small">
                    Upgrade Now
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <Card variant="outline">
            <h3>Quick Actions</h3>
            <div className={styles.quickActions}>
              <Button variant="success" size="small" fullWidth>
                💰 Set Price Alert
              </Button>
              <Button variant="primary" size="small" fullWidth>
                📊 Export Analysis
              </Button>
              {user.securityLevel === 'premium' && (
                <Button variant="secondary" size="small" fullWidth>
                  🔔 Smart Notifications
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Detailed Analysis Modal */}
      {showDetailedAnalysis && user.securityLevel === 'premium' && analytics && (
        <DetailedAnalysisModal
          analytics={analytics}
          currentPrice={currentPrice}
          onClose={() => setShowDetailedAnalysis(false)}
        />
      )}
    </div>
  );
};

// Detailed Analysis Modal Component
interface DetailedAnalysisModalProps {
  analytics: AnalyticsData;
  currentPrice: PriceData | null;
  onClose: () => void;
}

const DetailedAnalysisModal: React.FC<DetailedAnalysisModalProps> = ({
  analytics,
  currentPrice,
  onClose
}) => {
  return (
    <Modal
      title="Detailed Market Analysis"
      isOpen={true}
      onClose={onClose}
      size="large"
    >
      <div className={styles.detailedAnalysisContent}>
        {currentPrice && (
          <Card variant="outline">
            <h3>Price Analysis Summary</h3>
            <div className={styles.analysisGrid}>
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Current Price</span>
                <span className={styles.analysisValue}>
                  {currentPrice.currency} {currentPrice.current.toFixed(2)}
                </span>
              </div>
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>24h Change</span>
                <span className={`${styles.analysisValue} ${currentPrice.change < 0 ? styles.positive : styles.negative}`}>
                  {currentPrice.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>30-day Low</span>
                <span className={styles.analysisValue}>
                  ${Math.min(...analytics.priceHistory.map(p => p.price)).toFixed(2)}
                </span>
              </div>
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>30-day High</span>
                <span className={styles.analysisValue}>
                  ${Math.max(...analytics.priceHistory.map(p => p.price)).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        )}

        <Card variant="outline">
          <h3>Market Intelligence</h3>
          <div className={styles.intelligenceList}>
            {analytics.insights.map((insight) => (
              <Alert 
                key={insight.id}
                type={insight.impact === 'high' ? 'warning' : 'info'}
                title={insight.title}
              >
                <p>{insight.description}</p>
                <div className={styles.insightDetails}>
                  <Badge variant="secondary" size="small">
                    {insight.confidence}% confidence
                  </Badge>
                  <Badge 
                    variant={insight.impact === 'high' ? 'danger' : insight.impact === 'medium' ? 'warning' : 'success'}
                    size="small"
                  >
                    {insight.impact} impact
                  </Badge>
                </div>
              </Alert>
            ))}
          </div>
        </Card>

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary">
            Export Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EnhancedInsightSection;
