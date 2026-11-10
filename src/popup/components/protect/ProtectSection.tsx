import React from 'react';
import styles from '../../styles/App.module.css';
import { SecurityMetrics } from '../../../background/services/protect/securityAnalyzer';
import { ScamExplanation } from '../../../background/services/protect/scamExplainer';

interface ProtectSectionProps {
  isActive: boolean;
}

export const ProtectSection: React.FC<ProtectSectionProps> = ({ isActive }) => {
  const [metrics, setMetrics] = React.useState<SecurityMetrics | null>(null);
  const [productId, setProductId] = React.useState<string | null>(null);
  const [explanation, setExplanation] = React.useState<ScamExplanation | null>(null);
  const [explaining, setExplaining] = React.useState(false);
  const [explainError, setExplainError] = React.useState<string | null>(null);
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
      setProductId(response.data.product?.id ?? null);
      setExplanation(null);
      setExplainError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('ProtectSection Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const explainRisk = async () => {
    if (!productId) return;
    try {
      setExplaining(true);
      setExplainError(null);
      const response = await chrome.runtime.sendMessage({
        type: 'EXPLAIN_RISK',
        productId
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to explain this listing');
      }
      setExplanation(response.data as ScamExplanation);
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setExplaining(false);
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

          <div className={styles.explanationCard}>
            <h3>Why this score?</h3>
            {!explanation && (
              <button
                className={styles.explainButton}
                onClick={explainRisk}
                disabled={explaining || !productId}
              >
                {explaining ? 'Writing explanation…' : 'Explain in plain language'}
              </button>
            )}
            {explainError && <p className={styles.errorText}>{explainError}</p>}
            {explanation && (
              <>
                <p className={styles.explanationSummary}>{explanation.summary}</p>
                <ul className={styles.explanationList}>
                  {explanation.points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
                <span className={styles.explanationSource}>
                  {explanation.source === 'ai'
                    ? 'Written by AI using your Gemini key'
                    : 'Built-in explanation (no AI key set)'}
                </span>
              </>
            )}
          </div>
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
