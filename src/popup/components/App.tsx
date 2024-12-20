import React, { useState } from 'react';
import styles from '../styles/App.module.css';
import { ActiveTab } from '../types';
import ProtectSection from './protect/ProtectSection';
import InsightSection from './insight/InsightSection';

// Tab Component
const Tab: React.FC<{ 
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button 
    className={`${styles.tab} ${active ? styles.tabActive : ''}`}
    onClick={onClick}
  >
    {label}
  </button>
);

// Scout Section Component
const ScoutSection: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <div className={`${styles.section} ${isActive ? styles.sectionActive : ''}`}>
    <h2>Discovery Tools</h2>
    <div className={styles.scoutContent}>
      {/* Product recommendations will go here */}
      <p>Recommendations: Searching...</p>
    </div>
  </div>
);

// Main App Component
const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('protect');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Tab 
            label="Protect" 
            active={activeTab === 'protect'} 
            onClick={() => setActiveTab('protect')}
          />
          <Tab 
            label="Insight" 
            active={activeTab === 'insight'} 
            onClick={() => setActiveTab('insight')}
          />
          <Tab 
            label="Scout" 
            active={activeTab === 'scout'} 
            onClick={() => setActiveTab('scout')}
          />
        </nav>
      </header>

      <main className={styles.content}>
        <ProtectSection isActive={activeTab === 'protect'} />
        <InsightSection isActive={activeTab === 'insight'} />
        <ScoutSection isActive={activeTab === 'scout'} />
      </main>
    </div>
  );
};

export default App;
