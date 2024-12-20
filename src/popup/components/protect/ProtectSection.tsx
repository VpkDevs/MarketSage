import React from 'react';
import styles from '../../styles/App.module.css';

interface SecurityMetrics {
  riskScore: number;
  warnings: string[];
  sellerTrust: number;
}

const initialMetrics: SecurityMetrics = {
  riskScore: 0,
  warnings: [],
  sellerTrust: 0
};

export const ProtectSection: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [metrics, setMetrics] = React.useState<SecurityMetrics>(initialMetrics);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (isActive) {
      // TODO: Fetch security metrics from background service
      setTimeout(() => {
        setMetrics({
          riskScore: 85,
          warnings: ['Verify seller credentials', 'Check return policy'],
          sellerTrust: 75
        });
        setLoading(false);
      }, 1000);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className={styles.section}>
      <h2>Security Dashboard</h2>
      
      {loading ? (
        <div className={styles.loading}>Loading security metrics...</div>
      ) : (
        <div className={styles.protectContent}>
          <div className={styles.metricCard}>
            <h3>Risk Assessment</h3>
            <div className={styles.score}>
              {metrics.riskScore}
              <span className={styles.scoreLabel}>Safety Score</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <h3>Seller Trust</h3>
            <div className={styles.score}>
              {metrics.sellerTrust}
              <span className={styles.scoreLabel}>Trust Score</span>
            </div>
          </div>

          {metrics.warnings.length > 0 && (
            <div className={styles.warningsCard}>
              <h3>Warnings</h3>
              <ul className={styles.warningsList}>
                {metrics.warnings.map((warning, index) => (
                  <li key={index} className={styles.warningItem}>
                    {warning}
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

export default ProtectSection;
