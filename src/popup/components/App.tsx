import React from 'react';
import styles from '../styles/App.module.css';
import { ProtectSection } from './protect/ProtectSection';
import { InsightSection } from './insight/InsightSection';
import { ScoutSection } from './scout/ScoutSection';
import { AI_SETTINGS_KEY } from '../../background/services/protect/scamExplainer';

type ActiveTab = 'protect' | 'insight' | 'scout';

const TABS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'protect', label: '🛡️ Protect' },
  { id: 'insight', label: '💡 Insight' },
  { id: 'scout', label: '🔍 Scout' }
];

/**
 * The MarketSage popup: three working sections over the background
 * ServiceManager — Protect (scam signals on the current page), Insight
 * (price analytics from the recorded history) and Scout (discovery over
 * products already viewed). No account or login: every feature runs
 * locally, and the only optional credential is the user's own Gemini
 * key for AI-written explanations (see AiSettings below).
 */
const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('protect');
  const [showSettings, setShowSettings] = React.useState(false);
  const version = React.useMemo(() => {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return '';
    }
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.logoTitle}>MarketSage</h1>
          {version && <span className={styles.versionBadge}>v{version}</span>}
          <button
            className={styles.settingsButton}
            onClick={() => setShowSettings(prev => !prev)}
            aria-label="Settings"
            title="Settings"
          >
            ⚙️
          </button>
        </div>
        <nav className={styles.nav}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {showSettings && <AiSettings onClose={() => setShowSettings(false)} />}

      <main className={styles.content}>
        <ProtectSection isActive={activeTab === 'protect'} />
        <InsightSection isActive={activeTab === 'insight'} />
        <ScoutSection isActive={activeTab === 'scout'} />
      </main>
    </div>
  );
};

/**
 * Bring-your-own-key settings for AI explanations. The key is stored in
 * extension storage under the same key the background explainer reads
 * (AI_SETTINGS_KEY in services/protect/scamExplainer) and is only ever
 * sent to Google's Gemini API, only when the user asks for an
 * explanation. Without a key, explanations use the built-in writer.
 */
const AiSettings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [keyInput, setKeyInput] = React.useState('');
  const [hasKey, setHasKey] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    chrome.storage.local.get(AI_SETTINGS_KEY).then(result => {
      const key = result[AI_SETTINGS_KEY]?.geminiApiKey;
      setHasKey(typeof key === 'string' && key.trim().length > 0);
    });
  }, []);

  const save = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    await chrome.storage.local.set({
      [AI_SETTINGS_KEY]: { geminiApiKey: trimmed }
    });
    setKeyInput('');
    setHasKey(true);
    setStatus('Saved. Explanations will be written with your key.');
  };

  const remove = async () => {
    await chrome.storage.local.set({
      [AI_SETTINGS_KEY]: { geminiApiKey: '' }
    });
    setHasKey(false);
    setStatus('Key removed. Explanations will use the built-in writer.');
  };

  return (
    <div className={styles.settingsPanel}>
      <h3>AI explanations (optional)</h3>
      <p className={styles.settingsText}>
        Protect can explain scam signals in plain language. Add your own Google
        Gemini API key to have the explanation written by AI; without one, a
        built-in explanation is used instead. The key stays in this browser's
        extension storage and is sent only to Google's Gemini API, only when
        you press the explain button.
      </p>
      {hasKey && <p className={styles.settingsText}>A key is currently saved.</p>}
      <input
        type="password"
        className={styles.keyInput}
        placeholder="Paste your Gemini API key"
        value={keyInput}
        onChange={e => setKeyInput(e.target.value)}
        aria-label="Gemini API key"
      />
      <div className={styles.settingsActions}>
        <button className={styles.primaryButton} onClick={save} disabled={!keyInput.trim()}>
          Save key
        </button>
        {hasKey && (
          <button className={styles.secondaryButton} onClick={remove}>
            Remove key
          </button>
        )}
        <button className={styles.secondaryButton} onClick={onClose}>
          Close
        </button>
      </div>
      {status && <p className={styles.settingsText}>{status}</p>}
    </div>
  );
};

export default App;
