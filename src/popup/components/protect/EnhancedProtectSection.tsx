import React, { useState, useEffect } from 'react';
import { EnhancedAuthProvider } from '../../../core/auth/EnhancedAuthProvider';
import { SecurityMetrics } from '../../../background/services/protect/securityAnalyzer';
import { 
  Card, 
  Button, 
  Badge, 
  Progress, 
  Alert, 
  Loading,
  Modal,
  Toggle
} from '../enhanced/EnhancedUI';
import styles from '../../styles/EnhancedUI.module.css';

interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  securityLevel: 'basic' | 'enhanced' | 'premium';
}

interface EnhancedProtectSectionProps {
  isActive: boolean;
  authProvider: EnhancedAuthProvider;
  user: User | null;
  onNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

interface SecuritySettings {
  realTimeScanning: boolean;
  advancedThreatDetection: boolean;
  automaticBlocking: boolean;
  detailedReports: boolean;
}

interface ThreatDetails {
  id: string;
  type: 'phishing' | 'malware' | 'suspicious' | 'scam';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  blockedUrl?: string;
  timestamp: Date;
}

const EnhancedProtectSection: React.FC<EnhancedProtectSectionProps> = ({ 
  isActive, 
  authProvider, 
  user, 
  onNotification 
}) => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ summary: string; points: string[]; source: 'ai' | 'fallback' } | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showThreatDetails, setShowThreatDetails] = useState(false);
  const [threatHistory, setThreatHistory] = useState<ThreatDetails[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    realTimeScanning: true,
    advancedThreatDetection: user?.securityLevel !== 'basic',
    automaticBlocking: true,
    detailedReports: user?.securityLevel === 'premium'
  });

  useEffect(() => {
    if (isActive && user) {
      fetchSecurityMetrics();
      loadThreatHistory();
    }
  }, [isActive, user]);

  const fetchSecurityMetrics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Log security event
      await authProvider.recordActivityEvent('security_scan_initiated', {
        timestamp: new Date(),
        userId: user.id
      });

      // Get current tab to analyze
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      // Enhanced analysis based on user security level
      const analysisLevel = user.securityLevel === 'premium' ? 'comprehensive' : 
                           user.securityLevel === 'enhanced' ? 'advanced' : 'basic';

      const response = await chrome.runtime.sendMessage({
        type: 'ANALYZE_CURRENT_PAGE',
        options: {
          level: analysisLevel,
          realTimeScanning: securitySettings.realTimeScanning,
          advancedThreatDetection: securitySettings.advancedThreatDetection
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze page');
      }

      setMetrics(response.data.security);
      setProductId(response.data.product?.id ?? null);
      setExplanation(null);
      
      // Log successful analysis
      await authProvider.recordActivityEvent('security_scan_completed', {
        timestamp: new Date(),
        userId: user.id,
        riskScore: response.data.security.riskScore,
        threatsFound: response.data.security.warnings.length
      });

      if (response.data.security.warnings.length > 0) {
        onNotification('warning', `${response.data.security.warnings.length} security concern(s) detected`);
      } else {
        onNotification('success', 'No security threats detected');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Enhanced ProtectSection Error:', err);
      
      // Log error event
      if (user) {
        await authProvider.recordActivityEvent('security_scan_failed', {
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

  // Ask the background to explain the current rating in plain language.
  // With the user's own Gemini key (Settings) the explanation is written
  // by AI; without one it is the built-in template — either way the
  // response says which via `source`.
  const fetchExplanation = async () => {
    if (!productId) return;
    try {
      setExplaining(true);
      const response = await chrome.runtime.sendMessage({
        type: 'EXPLAIN_RISK',
        productId
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to explain rating');
      }
      setExplanation(response.data);
    } catch (err) {
      onNotification('error', 'Could not generate an explanation');
    } finally {
      setExplaining(false);
    }
  };

  const loadThreatHistory = async () => {
    if (!user || user.securityLevel === 'basic') return;

    try {
      // Mock threat history - in real implementation, this would come from the auth provider
      const mockHistory: ThreatDetails[] = [
        {
          id: '1',
          type: 'phishing',
          severity: 'high',
          description: 'Suspicious login page detected',
          recommendation: 'Avoid entering credentials on this page',
          blockedUrl: 'https://fake-bank-login.com',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: '2',
          type: 'scam',
          severity: 'medium',
          description: 'Potentially fraudulent e-commerce site',
          recommendation: 'Verify seller credentials before purchasing',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      ];
      
      setThreatHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load threat history:', error);
    }
  };

  const handleSecuritySettingsUpdate = async (newSettings: SecuritySettings) => {
    try {
      setSecuritySettings(newSettings);
      
      // Save settings via auth provider, mapped onto its UserPreferences
      // shape (which has no securitySettings group): real-time scanning is
      // the marketplace auto-analyze toggle and automatic blocking is
      // hide-high-risk. The tier-derived toggles (advancedThreatDetection,
      // detailedReports) follow the user's security level and stay
      // session-local.
      const current = authProvider.getCurrentUser()?.preferences;
      await authProvider.updateUserPreferences({
        marketplace: {
          defaultRiskTolerance: current?.marketplace.defaultRiskTolerance ?? 'medium',
          autoAnalyze: newSettings.realTimeScanning,
          hideHighRisk: newSettings.automaticBlocking
        }
      });
      
      onNotification('success', 'Security settings updated');
      
      // Re-analyze with new settings
      if (metrics) {
        fetchSecurityMetrics();
      }
    } catch (error) {
      onNotification('error', 'Failed to update security settings');
    }
  };

  const getRiskScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getThreatSeverityColor = (severity: string): 'success' | 'warning' | 'error' => {
    switch (severity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high':
      case 'critical': return 'error';
      default: return 'warning';
    }
  };

  if (!isActive) return null;

  if (!user) {
    return (
      <div className={styles.section}>
        <Alert variant="info" title="Authentication Required">
          Please log in to access security protection features.
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Security Dashboard</h2>
        <div className={styles.headerActions}>
          <Badge variant={getRiskScoreColor(metrics?.riskScore || 0)}>
            {user.securityLevel.toUpperCase()}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
            aria-label="Security settings"
          >
            ⚙️
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchSecurityMetrics}
            disabled={loading}
            aria-label="Refresh analysis"
          >
            🔄
          </Button>
        </div>
      </div>

      {loading && (
        <Card variant="outlined">
          <div className={styles.loadingContainer}>
            <Loading variant="spinner" size="md" />
            <p>Analyzing security metrics...</p>
          </div>
        </Card>
      )}

      {error && (
        <Alert 
          variant="error" 
          title="Analysis Failed"
          actions={
            <Button size="sm" onClick={fetchSecurityMetrics}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && metrics && (
        <div className={styles.protectContent}>
          {/* Main Security Metrics */}
          <div className={styles.metricsGrid}>
            <Card variant="elevated" className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <h3>Risk Assessment</h3>
                {user.securityLevel === 'premium' && (
                  <Badge variant="success" size="sm">AI Enhanced</Badge>
                )}
              </div>
              <div className={styles.scoreContainer}>
                <div className={`${styles.scoreCircle} ${styles[getRiskScoreColor(metrics.riskScore)]}`}>
                  <span className={styles.scoreValue}>{metrics.riskScore}</span>
                  <span className={styles.scoreMax}>/100</span>
                </div>
                <Progress 
                  value={metrics.riskScore} 
                  max={100} 
                  variant={getRiskScoreColor(metrics.riskScore)}
                  showLabel
                />
              </div>
            </Card>

            <Card variant="elevated" className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <h3>Seller Trust</h3>
                <Badge variant="primary" size="sm">Verified</Badge>
              </div>
              <div className={styles.scoreContainer}>
                <div className={`${styles.scoreCircle} ${styles[getRiskScoreColor(metrics.sellerTrust)]}`}>
                  <span className={styles.scoreValue}>{metrics.sellerTrust}</span>
                  <span className={styles.scoreMax}>/100</span>
                </div>
                <Progress 
                  value={metrics.sellerTrust} 
                  max={100} 
                  variant={getRiskScoreColor(metrics.sellerTrust)}
                  showLabel
                />
              </div>
            </Card>
          </div>

          {/* Plain-language explanation of the rating */}
          <Card variant="outlined" className={styles.explanationCard}>
            <div className={styles.cardHeader}>
              <h3>Why this rating?</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchExplanation}
                disabled={!productId || explaining}
                loading={explaining}
              >
                Explain in plain language
              </Button>
            </div>
            {explanation && (
              <div className={styles.explanationContent}>
                <p>{explanation.summary}</p>
                <ul>
                  {explanation.points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
                <p className={styles.explanationSource}>
                  {explanation.source === 'ai'
                    ? 'Written by AI using your own Gemini key, from the signals above.'
                    : 'Built-in explanation from the signals above. Add your own Gemini key in Settings to have AI write it instead.'}
                </p>
              </div>
            )}
          </Card>

          {/* Security Alerts */}
          {metrics.warnings.length > 0 ? (
            <Card variant="filled" className={styles.alertsCard}>
              <div className={styles.cardHeader}>
                <h3>Security Alerts</h3>
                <Badge variant="error">{metrics.warnings.length}</Badge>
              </div>
              <div className={styles.alertsList}>
                {metrics.warnings.map((warning, index) => (
                  <Alert 
                    key={index}
                    variant="warning"
                    title="Security Concern"
                    className={styles.alertItem}
                  >
                    {warning}
                  </Alert>
                ))}
              </div>
            </Card>
          ) : (
            <Card variant="filled" className={styles.safeCard}>
              <div className={styles.safeContent}>
                <span className={styles.safeIcon}>🛡️</span>
                <div>
                  <h3>All Clear</h3>
                  <p>No security concerns detected on this page</p>
                </div>
              </div>
            </Card>
          )}

          {/* Threat History (Premium/Enhanced users only) */}
          {user.securityLevel !== 'basic' && threatHistory.length > 0 && (
            <Card variant="outlined">
              <div className={styles.cardHeader}>
                <h3>Recent Threats Blocked</h3>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setShowThreatDetails(true)}
                >
                  View All
                </Button>
              </div>
              <div className={styles.threatList}>
                {threatHistory.slice(0, 3).map((threat) => (
                  <div key={threat.id} className={styles.threatItem}>
                    <Badge 
                      variant={getThreatSeverityColor(threat.severity)}
                      size="sm"
                    >
                      {threat.type}
                    </Badge>
                    <span className={styles.threatDescription}>
                      {threat.description}
                    </span>
                    <span className={styles.threatTime}>
                      {threat.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Premium Features */}
          {user.securityLevel === 'premium' && (
            <Card variant="filled" className={styles.premiumCard}>
              <h3>Premium Security Features</h3>
              <div className={styles.featureGrid}>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>🤖</span>
                  <span>AI Threat Detection</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>🔒</span>
                  <span>Real-time Protection</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
                <div className={styles.feature}>
                  <span className={styles.featureIcon}>📊</span>
                  <span>Detailed Reports</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Security Settings Modal */}
      {showSettings && (
        <SecuritySettingsModal
          settings={securitySettings}
          userLevel={user.securityLevel}
          onSave={handleSecuritySettingsUpdate}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Threat Details Modal */}
      {showThreatDetails && (
        <ThreatDetailsModal
          threats={threatHistory}
          onClose={() => setShowThreatDetails(false)}
        />
      )}
    </div>
  );
};

// Security Settings Modal Component
interface SecuritySettingsModalProps {
  settings: SecuritySettings;
  userLevel: string;
  onSave: (settings: SecuritySettings) => void;
  onClose: () => void;
}

const SecuritySettingsModal: React.FC<SecuritySettingsModalProps> = ({
  settings,
  userLevel,
  onSave,
  onClose
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <Modal
      title="Security Settings"
      isOpen={true}
      onClose={onClose}
      size="md"
    >
      <div className={styles.settingsContent}>
        <Card variant="outlined">
          <h3>Protection Settings</h3>
          <div className={styles.settingsGrid}>
            <div className={styles.settingItem}>
              <div>
                <span>Real-time Scanning</span>
                <p>Continuously monitor for threats</p>
              </div>
              <Toggle
                checked={localSettings.realTimeScanning}
                onChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  realTimeScanning: checked
                }))}
              />
            </div>

            <div className={styles.settingItem}>
              <div>
                <span>Advanced Threat Detection</span>
                <p>AI-powered threat analysis</p>
                {userLevel === 'basic' && (
                  <Badge variant="warning" size="sm">Premium Feature</Badge>
                )}
              </div>
              <Toggle
                checked={localSettings.advancedThreatDetection}
                onChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  advancedThreatDetection: checked
                }))}
                disabled={userLevel === 'basic'}
              />
            </div>

            <div className={styles.settingItem}>
              <div>
                <span>Automatic Blocking</span>
                <p>Block dangerous sites automatically</p>
              </div>
              <Toggle
                checked={localSettings.automaticBlocking}
                onChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  automaticBlocking: checked
                }))}
              />
            </div>

            <div className={styles.settingItem}>
              <div>
                <span>Detailed Reports</span>
                <p>Comprehensive security analytics</p>
                {userLevel !== 'premium' && (
                  <Badge variant="warning" size="sm">Premium Only</Badge>
                )}
              </div>
              <Toggle
                checked={localSettings.detailedReports}
                onChange={(checked) => setLocalSettings(prev => ({
                  ...prev,
                  detailedReports: checked
                }))}
                disabled={userLevel !== 'premium'}
              />
            </div>
          </div>
        </Card>

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Threat Details Modal Component
interface ThreatDetailsModalProps {
  threats: ThreatDetails[];
  onClose: () => void;
}

const ThreatDetailsModal: React.FC<ThreatDetailsModalProps> = ({
  threats,
  onClose
}) => {
  return (
    <Modal
      title="Threat History"
      isOpen={true}
      onClose={onClose}
      size="lg"
    >
      <div className={styles.threatDetailsContent}>
        {threats.map((threat) => (
          <Card key={threat.id} variant="outlined" className={styles.threatDetailCard}>
            <div className={styles.threatDetailHeader}>
              <div>
                <Badge variant={getThreatSeverityColor(threat.severity)}>
                  {threat.type}
                </Badge>
                <span className={styles.threatSeverity}>
                  {threat.severity.toUpperCase()}
                </span>
              </div>
              <span className={styles.threatTimestamp}>
                {threat.timestamp.toLocaleString()}
              </span>
            </div>
            
            <div className={styles.threatDetailBody}>
              <h4>{threat.description}</h4>
              <p>{threat.recommendation}</p>
              {threat.blockedUrl && (
                <div className={styles.blockedUrl}>
                  <strong>Blocked URL:</strong> {threat.blockedUrl}
                </div>
              )}
            </div>
          </Card>
        ))}
        
        {threats.length === 0 && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🛡️</span>
            <h3>No Threats Detected</h3>
            <p>Your browsing has been secure!</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

const getThreatSeverityColor = (severity: string): 'success' | 'warning' | 'error' => {
  switch (severity) {
    case 'low': return 'success';
    case 'medium': return 'warning';
    case 'high':
    case 'critical': return 'error';
    default: return 'warning';
  }
};

export default EnhancedProtectSection;
