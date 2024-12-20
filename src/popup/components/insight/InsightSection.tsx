import React from 'react';
import styles from '../../styles/App.module.css';

interface PriceAnalytics {
  currentPrice: number;
  marketAverage: number;
  priceHistory: number[];
  valueScore: number;
}

const initialAnalytics: PriceAnalytics = {
  currentPrice: 0,
  marketAverage: 0,
  priceHistory: [],
  valueScore: 0
};

export const InsightSection: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [analytics, setAnalytics] = React.useState<PriceAnalytics>(initialAnalytics);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (isActive) {
      // TODO: Fetch price analytics from background service
      setTimeout(() => {
        setAnalytics({
          currentPrice: 29.99,
          marketAverage: 34.99,
          priceHistory: [32.99, 31.99, 29.99],
          valueScore: 85
        });
        setLoading(false);
      }, 1000);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className={styles.section}>
      <h2>Price Analytics</h2>
      
      {loading ? (
        <div className={styles.loading}>Loading price analytics...</div>
      ) : (
        <div className={styles.insightContent}>
          <div className={styles.metricCard}>
            <h3>Current Price</h3>
            <div className={styles.priceDisplay}>
              ${analytics.currentPrice}
              {analytics.currentPrice < analytics.marketAverage && (
                <span className={styles.priceBadge}>Below Market Avg</span>
              )}
            </div>
          </div>

          <div className={styles.metricCard}>
            <h3>Market Average</h3>
            <div className={styles.priceDisplay}>
              ${analytics.marketAverage}
            </div>
          </div>

          <div className={styles.metricCard}>
            <h3>Value Score</h3>
            <div className={styles.score}>
              {analytics.valueScore}
              <span className={styles.scoreLabel}>Value Rating</span>
            </div>
          </div>

          <div className={styles.historyCard}>
            <h3>Price History</h3>
            <div className={styles.priceHistory}>
              {analytics.priceHistory.map((price, index) => (
                <div key={index} className={styles.historyItem}>
                  ${price}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightSection;
