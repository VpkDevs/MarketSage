import React from 'react';
import styles from '../../styles/App.module.css';
import { SecurityMetrics } from '../../../background/services/protect/securityAnalyzer';

interface ProtectSectionProps {
  isActive: boolean;
}

export const ProtectSection: React.FC<ProtectSectionProps> = ({ isActive }) => {
  const [metrics, setMetrics] = React.useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isActive) {
      fetchSecurityMetrics();
    }
  }, [isActive]);

  const fetchSecurityMetrics = async () => {
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
        throw new Error(response.error || 'Failed to analyze page');
      }

      setMetrics(response.data.security);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('ProtectSection Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isActive) return null;

  return (
    <div className={styles.section}>
      <h2>Security Dashboard</h2>
      
      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Analyzing security metrics...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button 
            onClick={fetchSecurityMetrics}
            className={styles.retryButton}
          >
            Retry Analysis
          </button>
        </div>
      )}

      {!loading && !error && metrics && (
        <div className={styles.protectContent}>
          <div className={styles.metricCard}>
            <h3>Risk Assessment</h3>
            <div className={`${styles.score} ${getRiskScoreClass(metrics.riskScore)}`}>
              {metrics.riskScore}
              <span className={styles.scoreLabel}>Safety Score</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <h3>Seller Trust</h3>
            <div className={`${styles.score} ${getTrustScoreClass(metrics.sellerTrust)}`}>
              {metrics.sellerTrust}
              <span className={styles.scoreLabel}>Trust Score</span>
            </div>
          </div>

          {metrics.warnings.length > 0 && (
            <div className={styles.warningsCard}>
              <h3>Security Alerts</h3>
              <ul className={styles.warningsList}>
                {metrics.warnings.map((warning, index) => (
                  <li key={index} className={styles.warningItem}>
                    <span className={styles.warningIcon}>⚠️</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {metrics.warnings.length === 0 && (
            <div className={styles.safeCard}>
              <span className={styles.safeIcon}>✓</span>
              <p>No security concerns detected</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Utility functions for styling
const getRiskScoreClass = (score: number): string => {
  if (score >= 80) return styles.scoreExcellent;
  if (score >= 60) return styles.scoreGood;
  if (score >= 40) return styles.scoreFair;
  return styles.scorePoor;
};

const getTrustScoreClass = (score: number): string => {
  if (score >= 80) return styles.scoreExcellent;
  if (score >= 60) return styles.scoreGood;
  if (score >= 40) return styles.scoreFair;
  return styles.scorePoor;
};

export default ProtectSection;
