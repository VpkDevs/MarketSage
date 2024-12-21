import React from 'react';
import styles from '../../styles/App.module.css';
import { PriceAnalytics } from '../../../background/services/insight/priceAnalyzer';

interface InsightSectionProps {
  isActive: boolean;
}

export const InsightSection: React.FC<InsightSectionProps> = ({ isActive }) => {
  const [analytics, setAnalytics] = React.useState<PriceAnalytics | null>(null);
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

      // Get current tab to analyze
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      // Request analysis from background service
      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_CURRENT_PAGE'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze prices');
      }

      setAnalytics(response.data.pricing);
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
          </div>

          <div className={styles.metricCard}>
            <h3>Value Score</h3>
            <div className={`${styles.score} ${getValueScoreClass(analytics.valueScore)}`}>
              {analytics.valueScore}
              <span className={styles.scoreLabel}>Value Rating</span>
            </div>
          </div>

          <div className={styles.historyCard}>
            <h3>Price History</h3>
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
const getValueScoreClass = (score: number): string => {
  if (score >= 80) return styles.scoreExcellent;
  if (score >= 60) return styles.scoreGood;
  if (score >= 40) return styles.scoreFair;
  return styles.scorePoor;
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
