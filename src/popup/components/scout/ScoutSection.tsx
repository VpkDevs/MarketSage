import React from 'react';
import styles from '../../styles/App.module.css';
import {
  ScoutDiscovery,
  ScoutResult
} from '../../../background/services/scout/productDiscovery';

interface ScoutSectionProps {
  isActive: boolean;
}

type ScoutTab = 'results' | 'deals' | 'watchlist';
type SortBy = 'relevance' | 'price_low' | 'price_high' | 'rating' | 'discount';

interface WatchlistItem extends ScoutResult {
  addedAt: string;
  priceWhenAdded: number;
}

const WATCHLIST_KEY = 'scout_watchlist';

const MODE_LABELS: Record<ScoutDiscovery['mode'], string> = {
  search: 'Search results from your viewed products',
  similar: 'Similar to the product you are viewing',
  value: 'Best value from your viewed products'
};

/**
 * Scout — discovery over the products MarketSage has already seen in
 * this browser (extracted on Temu / AliExpress / DHgate product pages
 * and kept in local storage). The background DISCOVER_PRODUCTS handler
 * ranks that local history; Scout has no catalog and makes no network
 * requests, so an empty history honestly produces an empty Scout.
 */
export const ScoutSection: React.FC<ScoutSectionProps> = ({ isActive }) => {
  const [discovery, setDiscovery] = React.useState<ScoutDiscovery | null>(null);
  const [watchlist, setWatchlist] = React.useState<WatchlistItem[]>([]);
  const [tab, setTab] = React.useState<ScoutTab>('results');
  const [query, setQuery] = React.useState('');
  const [platform, setPlatform] = React.useState('all');
  const [onlyDeals, setOnlyDeals] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortBy>('relevance');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const discover = React.useCallback(async (searchQuery?: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await chrome.runtime.sendMessage({
        type: 'DISCOVER_PRODUCTS',
        options: {
          query: searchQuery?.trim() ? searchQuery.trim() : undefined,
          filters: {
            platforms: platform === 'all' ? undefined : [platform],
            onlyDeals,
            sortBy
          },
          maxResults: 20
        }
      });
      if (!response.success) {
        throw new Error(response.error || 'Product discovery failed');
      }
      setDiscovery(response.data as ScoutDiscovery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [platform, onlyDeals, sortBy]);

  const loadWatchlist = React.useCallback(async () => {
    try {
      const result = await chrome.storage.local.get(WATCHLIST_KEY);
      setWatchlist(Array.isArray(result[WATCHLIST_KEY]) ? result[WATCHLIST_KEY] : []);
    } catch {
      setWatchlist([]);
    }
  }, []);

  React.useEffect(() => {
    if (isActive) {
      discover();
      loadWatchlist();
    }
    // Initial load only; filter changes re-run via the Apply button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const toggleWatch = async (result: ScoutResult) => {
    const exists = watchlist.some(item => item.id === result.id);
    const next = exists
      ? watchlist.filter(item => item.id !== result.id)
      : [
          ...watchlist,
          { ...result, addedAt: new Date().toISOString(), priceWhenAdded: result.price }
        ];
    setWatchlist(next);
    await chrome.storage.local.set({ [WATCHLIST_KEY]: next });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTab('results');
    discover(query);
  };

  if (!isActive) return null;

  const deals = (discovery?.results ?? []).filter(
    r => (r.discountPercent ?? 0) > 0 || (r.priceDropPercent ?? 0) >= 5
  );

  return (
    <div className={styles.section}>
      <h2>Product Scout</h2>
      <p className={styles.basisNote}>
        {discovery?.basis ??
          'From products MarketSage has seen in your browser on supported marketplaces — stored only on this device.'}
      </p>

      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search products you have viewed…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search your viewed products"
        />
        <button type="submit" className={styles.searchButton} disabled={loading}>
          Search
        </button>
      </form>

      <div className={styles.filterRow}>
        <label className={styles.filterLabel}>
          Marketplace
          <select
            className={styles.filterSelect}
            value={platform}
            onChange={e => setPlatform(e.target.value)}
          >
            <option value="all">All</option>
            <option value="temu">Temu</option>
            <option value="aliexpress">AliExpress</option>
            <option value="dhgate">DHgate</option>
          </select>
        </label>
        <label className={styles.filterLabel}>
          Sort
          <select
            className={styles.filterSelect}
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
          >
            <option value="relevance">Relevance</option>
            <option value="price_low">Price: low to high</option>
            <option value="price_high">Price: high to low</option>
            <option value="rating">Rating</option>
            <option value="discount">Biggest discount</option>
          </select>
        </label>
        <label className={styles.filterLabel}>
          <input
            type="checkbox"
            checked={onlyDeals}
            onChange={e => setOnlyDeals(e.target.checked)}
          />
          Deals only
        </label>
        <button
          className={styles.secondaryButton}
          onClick={() => discover(query)}
          disabled={loading}
        >
          Apply
        </button>
      </div>

      <div className={styles.nav}>
        <button
          className={`${styles.tab} ${tab === 'results' ? styles.tabActive : ''}`}
          onClick={() => setTab('results')}
        >
          Results{discovery ? ` (${discovery.results.length})` : ''}
        </button>
        <button
          className={`${styles.tab} ${tab === 'deals' ? styles.tabActive : ''}`}
          onClick={() => setTab('deals')}
        >
          Deals ({deals.length})
        </button>
        <button
          className={`${styles.tab} ${tab === 'watchlist' ? styles.tabActive : ''}`}
          onClick={() => setTab('watchlist')}
        >
          Watchlist ({watchlist.length})
        </button>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Searching your viewed products…</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => discover(query)} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && tab !== 'watchlist' && discovery && (
        <>
          <p className={styles.modeNote}>
            {MODE_LABELS[discovery.mode]} · drawn from {discovery.totalCandidates}{' '}
            viewed product{discovery.totalCandidates === 1 ? '' : 's'}
          </p>
          {(tab === 'results' ? discovery.results : deals).length === 0 ? (
            <div className={styles.emptyState}>
              {discovery.totalCandidates === 0 ? (
                <p>
                  Scout has nothing to work with yet. Open a few product pages on
                  Temu, AliExpress or DHgate first — MarketSage remembers what you
                  view (on this device only), and Scout searches that history.
                </p>
              ) : (
                <p>
                  Nothing matches. Try a different search, or browse more product
                  pages to grow the history Scout draws from.
                </p>
              )}
            </div>
          ) : (
            (tab === 'results' ? discovery.results : deals).map(result => (
              <ResultCard
                key={result.id}
                result={result}
                watched={watchlist.some(item => item.id === result.id)}
                onToggleWatch={toggleWatch}
              />
            ))
          )}
        </>
      )}

      {!loading && tab === 'watchlist' && (
        <>
          {watchlist.length === 0 ? (
            <div className={styles.emptyState}>
              <p>
                Your watchlist is empty. Tap “Watch” on any Scout result to keep it
                here with the price it had when you added it.
              </p>
            </div>
          ) : (
            watchlist.map(item => (
              <div key={item.id} className={styles.resultCard}>
                <div className={styles.resultTitle}>{item.title}</div>
                <div className={styles.resultMeta}>
                  <span className={styles.platformBadge}>{item.platform}</span>
                  <span className={styles.watchlistNote}>
                    ${item.priceWhenAdded.toFixed(2)} when added ·{' '}
                    {new Date(item.addedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.resultActions}>
                  {item.url && (
                    <button
                      className={styles.viewButton}
                      onClick={() => window.open(item.url, '_blank')}
                    >
                      View product
                    </button>
                  )}
                  <button
                    className={styles.watchButton}
                    onClick={() => toggleWatch(item)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};

const ResultCard: React.FC<{
  result: ScoutResult;
  watched: boolean;
  onToggleWatch: (result: ScoutResult) => void;
}> = ({ result, watched, onToggleWatch }) => (
  <div className={styles.resultCard}>
    <div className={styles.resultTitle}>{result.title}</div>
    <div className={styles.resultMeta}>
      <span className={styles.platformBadge}>{result.platform}</span>
      {typeof result.rating === 'number' && (
        <span className={styles.ratingText}>
          ★ {result.rating.toFixed(1)}
          {typeof result.reviewCount === 'number' && ` (${result.reviewCount})`}
        </span>
      )}
      <span className={styles.relevanceChip}>
        {result.relevanceScore}% · {result.relevanceBasis}
      </span>
    </div>
    <div className={styles.resultPriceRow}>
      <span className={styles.resultPrice}>${result.price.toFixed(2)}</span>
      {result.originalPrice && result.originalPrice > result.price && (
        <span className={styles.originalPrice}>${result.originalPrice.toFixed(2)}</span>
      )}
      {result.discountPercent && (
        <span className={styles.discountBadge}>-{result.discountPercent}%</span>
      )}
    </div>
    {typeof result.priceDropPercent === 'number' && result.priceDropPercent > 0 && (
      <p className={styles.dropNote}>
        ↓ {result.priceDropPercent}% since MarketSage first recorded this price
      </p>
    )}
    {typeof result.priceDropPercent === 'number' && result.priceDropPercent < 0 && (
      <p className={styles.riseNote}>
        ↑ {Math.abs(result.priceDropPercent)}% since MarketSage first recorded this price
      </p>
    )}
    <div className={styles.resultActions}>
      {result.url && (
        <button
          className={styles.viewButton}
          onClick={() => window.open(result.url, '_blank')}
        >
          View product
        </button>
      )}
      <button
        className={`${styles.watchButton} ${watched ? styles.watchButtonActive : ''}`}
        onClick={() => onToggleWatch(result)}
      >
        {watched ? '👁 Watching' : '👁 Watch'}
      </button>
    </div>
  </div>
);

export default ScoutSection;
