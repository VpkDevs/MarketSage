import React, { useState } from 'react';
import { ScamDetectionPreferences } from '../../../common/models/scamDetection/userPreferences';
import styles from '../../styles/Settings.module.css';

interface PriceAnomalySettingsProps {
  userId: string;
  heuristic: any; // The price anomaly heuristic from user preferences
  onUpdate: () => void;
}

const PriceAnomalySettings: React.FC<PriceAnomalySettingsProps> = ({ 
  userId, 
  heuristic, 
  onUpdate 
}) => {
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [selectedAction, setSelectedAction] = useState<string>(
    heuristic.configOptions.action || 'notify'
  );
  
  const handleToggle = async (enabled: boolean) => {
    try {
      const prefsManager = ScamDetectionPreferences.getInstance();
      await prefsManager.updateHeuristic(userId, heuristic.id, { enabled });
      onUpdate();
    } catch (error) {
      console.error('Error updating heuristic:', error);
    }
  };
  
  const handleWeightChange = async (weight: number) => {
    try {
      const prefsManager = ScamDetectionPreferences.getInstance();
      await prefsManager.updateHeuristic(userId, heuristic.id, { 
        weight: Math.max(0, Math.min(1, weight)) 
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating weight:', error);
    }
  };
  
  const handleThresholdChange = async (threshold: number) => {
    try {
      const prefsManager = ScamDetectionPreferences.getInstance();
      await prefsManager.updateHeuristic(userId, heuristic.id, { 
        configOptions: {
          ...heuristic.configOptions,
          zScoreThreshold: threshold
        }
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating threshold:', error);
    }
  };
  
  const handleActionChange = async (action: string) => {
    try {
      setSelectedAction(action);
      
      const prefsManager = ScamDetectionPreferences.getInstance();
      await prefsManager.updateHeuristic(userId, heuristic.id, { 
        configOptions: {
          ...heuristic.configOptions,
          action: action
        }
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };
  
  return (
    <div className={styles.heuristicSettingsContainer}>
      <div className={styles.heuristicHeader}>
        <div className={styles.titleRow}>
          <h3>Price Anomaly Detection</h3>
          <button 
            className={styles.infoButton}
            onClick={() => setShowExplanation(!showExplanation)}
          >
            {showExplanation ? 'Hide Info' : 'Learn More'}
          </button>
        </div>
        
        <div className={styles.toggleRow}>
          <label className={styles.switch}>
            <input 
              type="checkbox" 
              checked={heuristic.enabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
          <span>{heuristic.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>
      
      {showExplanation && (
        <div className={styles.explanationBox}>
          <h4>Understanding Standard Deviations in Price Analysis</h4>
          
          <p>
            Standard deviation is a statistical measure that quantifies how spread out a set of values is 
            from their average (mean). In the context of price analysis:
          </p>
          
          <div className={styles.stdDevVisual}>
            <div className={styles.bellCurve}>
              {/* Visual representation of bell curve with standard deviations */}
              <div className={styles.meanLine}></div>
              <div className={styles.stdDev1}></div>
              <div className={styles.stdDev2}></div>
              <div className={styles.stdDev3}></div>
            </div>
            <div className={styles.stdDevLabels}>
              <span>-3σ</span>
              <span>-2σ</span>
              <span>-1σ</span>
              <span>Mean</span>
              <span>+1σ</span>
              <span>+2σ</span>
              <span>+3σ</span>
            </div>
          </div>
          
          <p>
            <strong>How we use it:</strong> We calculate the average price and standard deviation for similar 
            products. If a product's price is more than your chosen number of standard deviations away from 
            the average, it's flagged as potentially suspicious.
          </p>
          
          <ul>
            <li>
              <strong>1 standard deviation:</strong> Covers about 68% of normal prices (more sensitive)
            </li>
            <li>
              <strong>2 standard deviations:</strong> Covers about 95% of normal prices (balanced)
            </li>
            <li>
              <strong>3 standard deviations:</strong> Covers about 99.7% of normal prices (less sensitive)
            </li>
          </ul>
          
          <p>
            <strong>Example:</strong> If similar products have an average price of $50 with a standard 
            deviation of $10, then a product priced at $20 would be 3 standard deviations below average, 
            which is highly unusual and potentially suspicious.
          </p>
        </div>
      )}
      
      {heuristic.enabled && (
        <div className={styles.settingsControls}>
          <div className={styles.settingRow}>
            <label>Importance (Weight):</label>
            <div className={styles.sliderContainer}>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={heuristic.weight}
                onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
              />
              <span>{(heuristic.weight * 100).toFixed(0)}%</span>
            </div>
          </div>
          
          <div className={styles.settingRow}>
            <label>Sensitivity (Standard Deviations):</label>
            <div className={styles.sliderContainer}>
              <input 
                type="range" 
                min="1" 
                max="4" 
                step="0.1"
                value={heuristic.configOptions.zScoreThreshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
              />
              <span>{heuristic.configOptions.zScoreThreshold.toFixed(1)}σ</span>
            </div>
            <div className={styles.sensitivityHint}>
              {heuristic.configOptions.zScoreThreshold <= 1.5 ? 'High Sensitivity' : 
               heuristic.configOptions.zScoreThreshold <= 2.5 ? 'Medium Sensitivity' : 
               'Low Sensitivity'}
            </div>
          </div>
          
          <div className={styles.settingRow}>
            <label>When anomaly detected:</label>
            <div className={styles.actionSelector}>
              <select 
                value={selectedAction}
                onChange={(e) => handleActionChange(e.target.value)}
              >
                <option value="notify">Show notification</option>
                <option value="warn">Display warning banner</option>
                <option value="highlight">Highlight with caution icon</option>
                <option value="hide">Hide listing automatically</option>
              </select>
            </div>
          </div>
          
          <div className={styles.actionPreview}>
            <h4>Action Preview:</h4>
            {selectedAction === 'notify' && (
              <div className={styles.notificationPreview}>
                <div className={styles.notificationIcon}>⚠️</div>
                <div className={styles.notificationContent}>
                  <div className={styles.notificationTitle}>Price Anomaly Detected</div>
                  <div className={styles.notificationBody}>
                    This item's price is significantly lower than similar products.
                    Average market price: $XX.XX
                  </div>
                </div>
              </div>
            )}
            
            {selectedAction === 'warn' && (
              <div className={styles.warningBannerPreview}>
                <span>⚠️</span> This product's price is unusually low compared to similar items.
                <button className={styles.learnMoreButton}>Learn Why</button>
              </div>
            )}
            
            {selectedAction === 'highlight' && (
              <div className={styles.highlightPreview}>
                <div className={styles.productCardPreview}>
                  <div className={styles.productImagePlaceholder}></div>
                  <div className={styles.productInfo}>
                    <div className={styles.productTitle}>Product Name</div>
                    <div className={styles.productPrice}>
                      $XX.XX <span className={styles.cautionIcon}>⚠️</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedAction === 'hide' && (
              <div className={styles.hidePreview}>
                <div className={styles.hiddenMessage}>
                  A listing was hidden due to suspicious pricing.
                  <button className={styles.showAnywayButton}>Show Anyway</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceAnomalySettings;
