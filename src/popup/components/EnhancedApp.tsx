import React, { useState, useEffect } from 'react';
import { EnhancedAuthProvider } from '../../core/auth/EnhancedAuthProvider';
import { 
  Button, 
  Card, 
  Tabs, 
  Alert, 
  Loading,
  Modal,
  Input,
  Badge
} from './enhanced/EnhancedUI';
import styles from '../styles/EnhancedUI.module.css';
import { ActiveTab } from '../types';
import EnhancedProtectSection from './protect/EnhancedProtectSection';
import EnhancedInsightSection from './insight/EnhancedInsightSection';
import EnhancedScoutSection from './scout/EnhancedScoutSection';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isVerified: boolean;
  securityLevel: 'basic' | 'enhanced' | 'premium';
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showLogin: boolean;
  showSettings: boolean;
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

const EnhancedApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('protect');
  const [authProvider] = useState(() => new EnhancedAuthProvider());
  const [state, setState] = useState<AppState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    showLogin: false,
    showSettings: false,
    notifications: []
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Check if user is already authenticated
      const isAuth = await authProvider.validateCurrentSession();
      
      if (isAuth) {
        const userProfile = await authProvider.getUserProfile();
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: userProfile as User,
          isLoading: false
        }));
        
        addNotification('success', 'Welcome back! Session restored successfully.');
      } else {
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          showLogin: true,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('App initialization error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        showLogin: true
      }));
      addNotification('error', 'Failed to initialize app. Please try again.');
    }
  };

  const addNotification = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const notification = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date()
    };
    
    setState(prev => ({
      ...prev,
      notifications: [...prev.notifications, notification]
    }));

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notification.id)
      }));
    }, 5000);
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const result = await authProvider.login(email, password);
      
      if (result.success) {
        const userProfile = await authProvider.getUserProfile();
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: userProfile as User,
          showLogin: false,
          isLoading: false
        }));
        
        addNotification('success', 'Successfully logged in!');
      } else {
        addNotification('error', result.error || 'Login failed');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Login error:', error);
      addNotification('error', 'An error occurred during login');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLogout = async () => {
    try {
      await authProvider.logout();
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        showLogin: true,
        showSettings: false
      }));
      addNotification('info', 'Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      addNotification('error', 'Error during logout');
    }
  };

  const getSecurityBadgeColor = (level: string) => {
    switch (level) {
      case 'premium': return 'success';
      case 'enhanced': return 'warning';
      default: return 'secondary';
    }
  };

  const tabItems = [
    { 
      id: 'protect' as ActiveTab, 
      label: 'Protect', 
      badge: state.user?.securityLevel === 'premium' ? 'Pro' : undefined 
    },
    { 
      id: 'insight' as ActiveTab, 
      label: 'Insight', 
      badge: undefined 
    },
    { 
      id: 'scout' as ActiveTab, 
      label: 'Scout', 
      badge: 'New' 
    }
  ];

  if (state.isLoading) {
    return (
      <div className={styles.appContainer}>
        <div className={styles.loadingContainer}>
          <Loading variant="spinner" size="large" />
          <p className={styles.loadingText}>Initializing MarketSage...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      {/* Notifications */}
      <div className={styles.notificationContainer}>
        {state.notifications.map(notification => (
          <Alert 
            key={notification.id}
            type={notification.type}
            title={notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
            closable
            onClose={() => 
              setState(prev => ({
                ...prev,
                notifications: prev.notifications.filter(n => n.id !== notification.id)
              }))
            }
          >
            {notification.message}
          </Alert>
        ))}
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <h1>MarketSage</h1>
            <Badge variant="primary" size="small">v2.0</Badge>
          </div>
          
          {state.isAuthenticated && state.user && (
            <div className={styles.userSection}>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{state.user.name}</span>
                <Badge 
                  variant={getSecurityBadgeColor(state.user.securityLevel)}
                  size="small"
                >
                  {state.user.securityLevel}
                </Badge>
              </div>
              <div className={styles.userActions}>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setState(prev => ({ ...prev, showSettings: true }))}
                  aria-label="User settings"
                >
                  ⚙️
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  🚪
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {state.isAuthenticated ? (
          <>
            {/* Navigation Tabs */}
            <Tabs
              items={tabItems}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="pills"
            />

            {/* Tab Content */}
            <div className={styles.tabContent}>
              <EnhancedProtectSection 
                isActive={activeTab === 'protect'} 
                authProvider={authProvider}
                user={state.user}
                onNotification={addNotification}
              />
              <EnhancedInsightSection 
                isActive={activeTab === 'insight'} 
                authProvider={authProvider}
                user={state.user}
                onNotification={addNotification}
              />
              <EnhancedScoutSection 
                isActive={activeTab === 'scout'} 
                authProvider={authProvider}
                user={state.user}
                onNotification={addNotification}
              />
            </div>
          </>
        ) : (
          <LoginCard 
            onLogin={handleLogin} 
            isLoading={state.isLoading}
            onNotification={addNotification}
          />
        )}
      </main>

      {/* Settings Modal */}
      {state.showSettings && state.user && (
        <SettingsModal
          user={state.user}
          authProvider={authProvider}
          onClose={() => setState(prev => ({ ...prev, showSettings: false }))}
          onNotification={addNotification}
        />
      )}
    </div>
  );
};

// Login Card Component
interface LoginCardProps {
  onLogin: (email: string, password: string) => void;
  isLoading: boolean;
  onNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

const LoginCard: React.FC<LoginCardProps> = ({ onLogin, isLoading, onNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      onNotification('error', 'Please enter both email and password');
      return;
    }
    
    onLogin(email, password);
  };

  return (
    <Card variant="elevated" className={styles.loginCard}>
      <div className={styles.loginHeader}>
        <h2>Welcome to MarketSage</h2>
        <p>Sign in to access advanced protection features</p>
      </div>
      
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          icon="👤"
          required
        />
        
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          icon="🔒"
          action={{
            icon: showPassword ? '👁️' : '👁️‍🗨️',
            onClick: () => setShowPassword(!showPassword),
            'aria-label': showPassword ? 'Hide password' : 'Show password'
          }}
          required
        />
        
        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          disabled={isLoading || !email || !password}
          loading={isLoading}
        >
          Sign In
        </Button>
      </form>
      
      <div className={styles.loginFooter}>
        <Button variant="link" size="small">
          Forgot password?
        </Button>
        <Button variant="link" size="small">
          Create account
        </Button>
      </div>
    </Card>
  );
};

// Settings Modal Component
interface SettingsModalProps {
  user: User;
  authProvider: EnhancedAuthProvider;
  onClose: () => void;
  onNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  user, 
  authProvider, 
  onClose, 
  onNotification 
}) => {
  const [preferences, setPreferences] = useState({
    enableNotifications: true,
    autoAnalysis: true,
    securityLevel: user.securityLevel,
    dataCollection: false
  });

  const handleSaveSettings = async () => {
    try {
      await authProvider.updateUserPreferences(preferences);
      onNotification('success', 'Settings saved successfully');
      onClose();
    } catch (error) {
      onNotification('error', 'Failed to save settings');
    }
  };

  return (
    <Modal
      title="User Settings"
      isOpen={true}
      onClose={onClose}
      size="medium"
    >
      <div className={styles.settingsContent}>
        <Card variant="outline">
          <h3>Account Information</h3>
          <div className={styles.accountInfo}>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p>
              <strong>Status:</strong> 
              <Badge 
                variant={user.isVerified ? 'success' : 'warning'}
                size="small"
              >
                {user.isVerified ? 'Verified' : 'Unverified'}
              </Badge>
            </p>
          </div>
        </Card>
        
        <Card variant="outline">
          <h3>Privacy & Security</h3>
          <div className={styles.settingsGrid}>
            <label className={styles.settingItem}>
              <span>Enable notifications</span>
              <input
                type="checkbox"
                checked={preferences.enableNotifications}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  enableNotifications: e.target.checked
                }))}
              />
            </label>
            
            <label className={styles.settingItem}>
              <span>Auto-analysis</span>
              <input
                type="checkbox"
                checked={preferences.autoAnalysis}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  autoAnalysis: e.target.checked
                }))}
              />
            </label>
            
            <label className={styles.settingItem}>
              <span>Allow data collection</span>
              <input
                type="checkbox"
                checked={preferences.dataCollection}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  dataCollection: e.target.checked
                }))}
              />
            </label>
          </div>
        </Card>
        
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveSettings}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EnhancedApp;
