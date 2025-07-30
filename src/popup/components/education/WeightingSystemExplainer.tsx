import React from 'react';
import styles from '../../styles/Education.module.css';

const WeightingSystemExplainer: React.FC = () => {
  return (
    <div className={styles.explainerContainer}>
      <h2>Understanding the Scam Detection Weighting System</h2>
      
      <div className={styles.explainerSection}>
        <h3>How Weights Work</h3>
        <p>
          Our scam detection system uses a weighted scoring approach where each detection method 
          contributes differently to the overall risk assessment based on its reliability and importance.
        </p>
        
        <div className={styles.weightExample}>
          <div className={styles.weightBar}>
            <div 
              className={styles.weightFill} 
              style={{ width: '75%' }}
              data-weight="0.75"
            ></div>
          </div>
          <p>
            A weight of 0.75 means this detection method contributes 75% of its maximum possible 
            impact to the overall risk score.
          </p>
        </div>
        
        <p>
          Higher weights (closer to 1.0) give more importance to that detection method, while 
          lower weights (closer to 0.0) reduce its influence on the final risk assessment.
        </p>
      </div>
      
      <div className={styles.explainerSection}>
        <h3>Customizing Your Protection</h3>
        <p>
          You can customize which detection methods are active and how much weight each carries 
          based on your personal experience and risk tolerance.
        </p>
        <ul>
          <li>
            <strong>Toggle methods on/off</strong> - Completely enable or disable specific detection methods
          </li>
          <li>
            <strong>Adjust weights</strong> - Fine-tune how much each method influences the overall score
          </li>
          <li>
            <strong>Customize thresholds</strong> - Set the sensitivity level for individual detection methods
          </li>
          <li>
            <strong>Set actions</strong> - Determine what happens when suspicious activity is detected
          </li>
        </ul>
      </div>
      
      <div className={styles.explainerSection}>
        <h3>How We Calculate the Final Score</h3>
        <p>
          The final risk score is calculated using a weighted average of all enabled detection methods:
        </p>
        <div className={styles.formula}>
          <code>
            Risk Score = (Method1Score × Method1Weight + Method2Score × Method2Weight + ...) ÷ Sum of all weights
          </code>
        </div>
        <p>
          This score is then adjusted based on your global sensitivity setting and mapped to a risk level:
        </p>
        <ul className={styles.riskLevels}>
          <li className={styles.riskLow}>Low Risk (0.0-0.3)</li>
          <li className={styles.riskMedium}>Medium Risk (0.3-0.6)</li>
          <li className={styles.riskHigh}>High Risk (0.6-0.8)</li>
          <li className={styles.riskCritical}>Critical Risk (0.8-1.0)</li>
        </ul>
      </div>
    </div>
  );
};

export default WeightingSystemExplainer;
