import React from 'react';
import styles from '../../styles/App.module.css';
import { PriceAnalytics } from '../../../background/services/insight/priceAnalyzer';
import { PriceInsight } from '../../../background/services/insight/priceInsights';

interface InsightSectionProps {
  isActive: boolean;
}

export const InsightSection: React.FC<InsightSectionProps> = ({ isActive }) => {
  const [analytics, setAnalytics] = React.useState<PriceAnalytics | null>(null);
  const [insights, setInsights] = React.useState<PriceInsight[]>([]);
  const [historyCount, setHistoryCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isActive) {
      fetchPriceAnalytics();
    }
  }, [isActive]);

  const fetchPriceAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // ANALYZE_PRICE_DATA: the background resolves the active tab, has
      // the content script extract the product, and returns the price
      // analytics plus insights computed from the recorded history.
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_PRICE_DATA'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze prices');
      }

      setAnalytics(response.data.pricing);
      setInsights(response.data.insights ?? []);
      setHistoryCount(response.data.historyCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('InsightSection Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className={styles.section}>
      <h2>Price Analytics</h2>
      
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Analyzing price data...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button 
            onClick={fetchPriceAnalytics}
            className={styles.retryButton}
          >
            Retry Analysis
          </button>
        </div>
      )}

      {!loading && !error && analytics && (
        <div className={styles.insightContent}>
          <div className={styles.metricCard}>
            <h3>Current Price</h3>
            <div className={styles.priceDisplay}>
              ${analytics.currentPrice.toFixed(2)}
              {analytics.currentPrice < analytics.marketAverage && (
                <span className={styles.priceBadge}>Below Market Avg</span>
              )}
            </div>
          </div>

          <div className={styles.metricCard}>
            <h3>Market Average</h3>
            <div className={styles.priceDisplay}>
              ${analytics.marketAverage.toFixed(2)}
            </div>
            <p className={styles.metricNote}>
              {analytics.marketSampleSize >= 2
                ? `Average of ${analytics.marketSampleSize} similar products you have viewed`
                : 'Not enough similar products viewed yet — this is just this listing’s own price'}
            </p>
          </div>

          <div className={styles.metricCard}>
            <h3>Value Score</h3>
            <div className={`${styles.score} ${getValueScoreClass(analytics.valueScore)}`}>
              {Math.round(analytics.valueScore * 100)}
              <span className={styles.scoreLabel}>Value Rating / 100</span>
            </div>
          </div>

          {insights.length > 0 && (
            <div className={styles.insightsCard}>
              <h3>Price Insights</h3>
              {insights.map(insight => (
                <div key={insight.id} className={styles.insightItem}>
                  <span className={styles.insightIcon}>{getInsightIcon(insight.type)}</span>
                  <div>
                    <div className={styles.insightTitle}>{insight.title}</div>
                    <p className={styles.insightText}>{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.historyCard}>
            <h3>Price History</h3>
            {historyCount <= 1 ? (
              <p className={styles.metricNote}>
                Only one price recorded for this product so far. Visit this page
                again on another day and MarketSage will start tracking changes.
              </p>
            ) : (
              <p className={styles.metricNote}>
                {historyCount} prices recorded on this device
              </p>
            )}
            <div className={styles.priceHistory}>
              {analytics.priceHistory.map((entry, index) => (
                <div key={index} className={styles.historyItem}>
                  <span className={styles.historyPrice}>
                    ${entry.price.toFixed(2)}
                  </span>
                  <span className={styles.historyDate}>
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.trendCard}>
            <h3>Price Trend</h3>
            <div className={`${styles.trend} ${getTrendClass(analytics.trend)}`}>
              {getTrendIcon(analytics.trend)}
              <span>{formatTrend(analytics.trend)}</span>
            </div>
          </div>

          {analytics.recommendations.length > 0 && (
            <div className={styles.recommendationsCard}>
              <h3>Recommendations</h3>
              <ul className={styles.recommendationsList}>
                {analytics.recommendations.map((recommendation, index) => (
                  <li key={index} className={styles.recommendationItem}>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Utility functions
// The analyzer's value score is 0..1; the display converts it to /100,
// and these bands are on the same 0..1 scale.
const getValueScoreClass = (score: number): string => {
  if (score >= 0.8) return styles.scoreExcellent;
  if (score >= 0.6) return styles.scoreGood;
  if (score >= 0.4) return styles.scoreFair;
  return styles.scorePoor;
};

const getInsightIcon = (type: PriceInsight['type']): string => {
  switch (type) {
    case 'price_drop': return '📉';
    case 'price_increase': return '📈';
    case 'deal_alert': return '🔥';
    case 'market_trend': return '📊';
  }
};

const getTrendClass = (trend: 'rising' | 'falling' | 'stable'): string => {
  switch (trend) {
    case 'rising': return styles.trendRising;
    case 'falling': return styles.trendFalling;
    case 'stable': return styles.trendStable;
  }
};

const getTrendIcon = (trend: 'rising' | 'falling' | 'stable'): string => {
  switch (trend) {
    case 'rising': return '↗️';
    case 'falling': return '↘️';
    case 'stable': return '→';
  }
};

const formatTrend = (trend: 'rising' | 'falling' | 'stable'): string => {
  switch (trend) {
    case 'rising': return 'Price is Rising';
    case 'falling': return 'Price is Falling';
    case 'stable': return 'Price is Stable';
  }
};

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default InsightSection;
