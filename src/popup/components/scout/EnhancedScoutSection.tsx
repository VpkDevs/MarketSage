import React, { useState, useEffect } from 'react';
import { EnhancedAuthProvider } from '../../../core/auth/EnhancedAuthProvider';
import { 
  Card, 
  Button, 
  Badge, 
  Progress, 
  Alert, 
  Loading,
  Modal,
  Input,
  Tabs
} from '../enhanced/EnhancedUI';
import styles from '../../styles/EnhancedUI.module.css';

interface User {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  securityLevel: 'basic' | 'enhanced' | 'premium';
}

interface EnhancedScoutSectionProps {
  isActive: boolean;
  authProvider: EnhancedAuthProvider;
  user: User | null;
  onNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
}

interface ProductRecommendation {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  productUrl: string;
  store: string;
  category: string;
  features: string[];
  discount?: number;
  dealEndTime?: Date;
  availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  shippingCost: number;
  estimatedDelivery: string;
  isSponsoredDeal: boolean;
  similarityScore: number;
}

interface SearchFilters {
  category: string;
  priceMin: number;
  priceMax: number;
  rating: number;
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'discount';
  stores: string[];
  onlyDeals: boolean;
  inStockOnly: boolean;
}

interface ScoutData {
  recommendations: ProductRecommendation[];
  searchQuery: string;
  totalResults: number;
  searchTime: number;
  filters: SearchFilters;
}

const EnhancedScoutSection: React.FC<EnhancedScoutSectionProps> = ({ 
  isActive, 
  authProvider, 
  user, 
  onNotification 
}) => {
  const [scoutData, setScoutData] = useState<ScoutData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeScoutTab, setActiveScoutTab] = useState<'recommendations' | 'deals' | 'watchlist'>('recommendations');
  const [watchlist, setWatchlist] = useState<ProductRecommendation[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    priceMin: 0,
    priceMax: 10000,
    rating: 0,
    sortBy: 'relevance',
    stores: [],
    onlyDeals: false,
    inStockOnly: true
  });

  useEffect(() => {
    if (isActive && user) {
      fetchRecommendations();
      loadWatchlist();
    }
  }, [isActive, user]);

  const fetchRecommendations = async (query?: string) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      // Log discovery event
      await authProvider.logSecurityEvent('product_discovery_initiated', {
        timestamp: new Date(),
        userId: user.id,
        searchQuery: query || 'auto'
      });

      // Get current tab to analyze for context
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) throw new Error('No active tab found');

      // Enhanced recommendations based on user tier
      const recommendationLevel = user.securityLevel === 'premium' ? 'ai_powered' : 
                                 user.securityLevel === 'enhanced' ? 'advanced' : 'basic';

      const response = await chrome.runtime.sendMessage({
        type: 'DISCOVER_PRODUCTS',
        options: {
          url: tab.url,
          query: query || undefined,
          level: recommendationLevel,
          filters: filters,
          maxResults: user.securityLevel === 'premium' ? 20 : user.securityLevel === 'enhanced' ? 12 : 6
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to discover products');
      }

      // Mock recommendations for demonstration
      const mockRecommendations: ProductRecommendation[] = [
        {
          id: '1',
          name: 'Professional Wireless Headphones',
          brand: 'AudioTech',
          price: 149.99,
          originalPrice: 199.99,
          rating: 4.7,
          reviewCount: 2847,
          imageUrl: '/images/headphones.jpg',
          productUrl: 'https://example.com/headphones',
          store: 'TechMart',
          category: 'Electronics',
          features: ['Noise Cancellation', 'Wireless', '30hr Battery'],
          discount: 25,
          dealEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          availability: 'in_stock',
          shippingCost: 0,
          estimatedDelivery: '2-3 days',
          isSponsoredDeal: false,
          similarityScore: 95
        },
        {
          id: '2',
          name: 'Smart Fitness Watch',
          brand: 'FitProTech',
          price: 299.99,
          rating: 4.5,
          reviewCount: 1234,
          imageUrl: '/images/smartwatch.jpg',
          productUrl: 'https://example.com/smartwatch',
          store: 'HealthGear',
          category: 'Wearables',
          features: ['Heart Rate Monitor', 'GPS', 'Water Resistant'],
          availability: 'low_stock',
          shippingCost: 9.99,
          estimatedDelivery: '3-5 days',
          isSponsoredDeal: true,
          similarityScore: 87
        },
        {
          id: '3',
          name: 'Ergonomic Office Chair',
          brand: 'ComfortPro',
          price: 449.99,
          originalPrice: 599.99,
          rating: 4.8,
          reviewCount: 567,
          imageUrl: '/images/chair.jpg',
          productUrl: 'https://example.com/chair',
          store: 'OfficeDepot',
          category: 'Furniture',
          features: ['Lumbar Support', 'Adjustable Height', 'Breathable Mesh'],
          discount: 25,
          availability: 'in_stock',
          shippingCost: 29.99,
          estimatedDelivery: '5-7 days',
          isSponsoredDeal: false,
          similarityScore: 82
        }
      ];

      const mockScoutData: ScoutData = {
        recommendations: mockRecommendations,
        searchQuery: query || 'auto-discovered',
        totalResults: mockRecommendations.length,
        searchTime: 0.45,
        filters: filters
      };

      setScoutData(mockScoutData);

      // Log successful discovery
      await authProvider.logSecurityEvent('product_discovery_completed', {
        timestamp: new Date(),
        userId: user.id,
        resultsFound: mockRecommendations.length,
        searchTime: 0.45
      });

      onNotification('success', `Found ${mockRecommendations.length} relevant products`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Enhanced ScoutSection Error:', err);
      
      if (user) {
        await authProvider.logSecurityEvent('product_discovery_failed', {
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

  const loadWatchlist = async () => {
    try {
      // In a real implementation, this would load from user preferences
      const savedWatchlist = JSON.parse(localStorage.getItem('marketSage_watchlist') || '[]');
      setWatchlist(savedWatchlist);
    } catch (error) {
      console.error('Failed to load watchlist:', error);
    }
  };

  const addToWatchlist = async (product: ProductRecommendation) => {
    try {
      const isAlreadyInWatchlist = watchlist.some(item => item.id === product.id);
      
      if (isAlreadyInWatchlist) {
        onNotification('info', 'Product is already in your watchlist');
        return;
      }

      const updatedWatchlist = [...watchlist, product];
      setWatchlist(updatedWatchlist);
      localStorage.setItem('marketSage_watchlist', JSON.stringify(updatedWatchlist));
      
      onNotification('success', 'Added to watchlist');
      
      if (user) {
        await authProvider.logSecurityEvent('product_watchlist_added', {
          timestamp: new Date(),
          userId: user.id,
          productId: product.id,
          productName: product.name
        });
      }
    } catch (error) {
      onNotification('error', 'Failed to add to watchlist');
    }
  };

  const removeFromWatchlist = async (productId: string) => {
    try {
      const updatedWatchlist = watchlist.filter(item => item.id !== productId);
      setWatchlist(updatedWatchlist);
      localStorage.setItem('marketSage_watchlist', JSON.stringify(updatedWatchlist));
      
      onNotification('success', 'Removed from watchlist');
      
      if (user) {
        await authProvider.logSecurityEvent('product_watchlist_removed', {
          timestamp: new Date(),
          userId: user.id,
          productId: productId
        });
      }
    } catch (error) {
      onNotification('error', 'Failed to remove from watchlist');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchRecommendations(searchQuery.trim());
    }
  };

  const getAvailabilityColor = (availability: string): 'success' | 'warning' | 'danger' => {
    switch (availability) {
      case 'in_stock': return 'success';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'danger';
      default: return 'warning';
    }
  };

  const getRatingStars = (rating: number): string => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 !== 0 ? '☆' : '');
  };

  const scoutTabs = [
    { id: 'recommendations' as const, label: 'Recommendations' },
    { id: 'deals' as const, label: 'Deals', badge: user?.securityLevel === 'premium' ? 'Live' : undefined },
    { id: 'watchlist' as const, label: 'Watchlist', badge: watchlist.length > 0 ? watchlist.length.toString() : undefined }
  ];

  if (!isActive) return null;

  if (!user) {
    return (
      <div className={styles.section}>
        <Alert type="info" title="Authentication Required">
          Please log in to access product discovery and recommendations.
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2>Product Scout</h2>
        <div className={styles.headerActions}>
          <Badge variant="primary">
            {user.securityLevel.toUpperCase()}
          </Badge>
          <Button
            variant="ghost"
            size="small"
            onClick={() => setShowFilters(true)}
            aria-label="Search filters"
          >
            🔍
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => fetchRecommendations()}
            disabled={loading}
            aria-label="Refresh recommendations"
          >
            🔄
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card variant="outline" className={styles.searchCard}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <Input
            type="text"
            placeholder="Search for products, brands, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
            icon="🔍"
            action={{
              icon: '🎯',
              onClick: () => fetchRecommendations(),
              'aria-label': 'Auto-discover products'
            }}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !searchQuery.trim()}
          >
            Search
          </Button>
        </form>
      </Card>

      {loading && (
        <Card variant="outline">
          <div className={styles.loadingContainer}>
            <Loading variant="dots" size="medium" />
            <p>Discovering products...</p>
          </div>
        </Card>
      )}

      {error && (
        <Alert 
          type="error" 
          title="Discovery Failed"
          action={
            <Button size="small" onClick={() => fetchRecommendations()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && scoutData && (
        <>
          {/* Results Summary */}
          <Card variant="outline" className={styles.resultsSummary}>
            <div className={styles.summaryContent}>
              <span>Found <strong>{scoutData.totalResults}</strong> products for "{scoutData.searchQuery}"</span>
              <span>Search completed in {scoutData.searchTime}s</span>
            </div>
          </Card>

          {/* Navigation Tabs */}
          <Tabs
            items={scoutTabs}
            activeTab={activeScoutTab}
            onTabChange={setActiveScoutTab}
            variant="pills"
          />

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeScoutTab === 'recommendations' && (
              <div className={styles.recommendationsGrid}>
                {scoutData.recommendations.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToWatchlist={addToWatchlist}
                    isInWatchlist={watchlist.some(item => item.id === product.id)}
                    userLevel={user.securityLevel}
                  />
                ))}
              </div>
            )}

            {activeScoutTab === 'deals' && (
              <div className={styles.dealsGrid}>
                {scoutData.recommendations
                  .filter(product => product.discount && product.discount > 0)
                  .map((product) => (
                    <DealCard
                      key={product.id}
                      product={product}
                      onAddToWatchlist={addToWatchlist}
                      isInWatchlist={watchlist.some(item => item.id === product.id)}
                    />
                  ))}
                {scoutData.recommendations.filter(p => p.discount && p.discount > 0).length === 0 && (
                  <Card variant="outline">
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>💸</span>
                      <h3>No Active Deals</h3>
                      <p>Check back later for the latest deals and discounts.</p>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeScoutTab === 'watchlist' && (
              <div className={styles.watchlistGrid}>
                {watchlist.map((product) => (
                  <WatchlistCard
                    key={product.id}
                    product={product}
                    onRemoveFromWatchlist={removeFromWatchlist}
                  />
                ))}
                {watchlist.length === 0 && (
                  <Card variant="outline">
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>👁️</span>
                      <h3>Empty Watchlist</h3>
                      <p>Add products to your watchlist to track prices and get notifications.</p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Filters Modal */}
      {showFilters && (
        <FiltersModal
          filters={filters}
          onSave={(newFilters) => {
            setFilters(newFilters);
            setShowFilters(false);
            if (scoutData) {
              fetchRecommendations(scoutData.searchQuery);
            }
          }}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
};

// Product Card Component
interface ProductCardProps {
  product: ProductRecommendation;
  onAddToWatchlist: (product: ProductRecommendation) => void;
  isInWatchlist: boolean;
  userLevel: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToWatchlist, 
  isInWatchlist, 
  userLevel 
}) => {
  return (
    <Card variant="elevated" className={styles.productCard}>
      {product.isSponsoredDeal && (
        <Badge variant="warning" size="small" className={styles.sponsoredBadge}>
          Sponsored
        </Badge>
      )}
      
      <div className={styles.productImage}>
        <img src={product.imageUrl} alt={product.name} />
        {product.discount && (
          <Badge variant="danger" className={styles.discountBadge}>
            -{product.discount}%
          </Badge>
        )}
      </div>
      
      <div className={styles.productInfo}>
        <h4 className={styles.productName}>{product.name}</h4>
        <span className={styles.productBrand}>{product.brand}</span>
        
        <div className={styles.productRating}>
          <span>{getRatingStars(product.rating)}</span>
          <span className={styles.reviewCount}>({product.reviewCount})</span>
        </div>
        
        <div className={styles.productPrice}>
          <span className={styles.currentPrice}>${product.price.toFixed(2)}</span>
          {product.originalPrice && (
            <span className={styles.originalPrice}>${product.originalPrice.toFixed(2)}</span>
          )}
        </div>
        
        <div className={styles.productMeta}>
          <Badge 
            variant={getAvailabilityColor(product.availability)}
            size="small"
          >
            {product.availability.replace('_', ' ')}
          </Badge>
          <span className={styles.store}>{product.store}</span>
        </div>
        
        {userLevel === 'premium' && (
          <div className={styles.aiInsights}>
            <Badge variant="primary" size="small">
              {product.similarityScore}% match
            </Badge>
          </div>
        )}
        
        <div className={styles.productActions}>
          <Button 
            variant="primary" 
            size="small"
            onClick={() => window.open(product.productUrl, '_blank')}
          >
            View Product
          </Button>
          <Button
            variant={isInWatchlist ? "secondary" : "ghost"}
            size="small"
            onClick={() => onAddToWatchlist(product)}
            disabled={isInWatchlist}
          >
            {isInWatchlist ? '👁️' : '👁️‍🗨️'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Deal Card Component
interface DealCardProps {
  product: ProductRecommendation;
  onAddToWatchlist: (product: ProductRecommendation) => void;
  isInWatchlist: boolean;
}

const DealCard: React.FC<DealCardProps> = ({ product, onAddToWatchlist, isInWatchlist }) => {
  const timeLeft = product.dealEndTime ? 
    Math.max(0, product.dealEndTime.getTime() - Date.now()) : 0;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

  return (
    <Card variant="danger" className={styles.dealCard}>
      <div className={styles.dealHeader}>
        <Badge variant="danger">🔥 {product.discount}% OFF</Badge>
        {product.dealEndTime && (
          <span className={styles.dealTimer}>
            ⏰ {hoursLeft}h left
          </span>
        )}
      </div>
      
      <div className={styles.dealContent}>
        <h4>{product.name}</h4>
        <div className={styles.dealPricing}>
          <span className={styles.dealPrice}>${product.price.toFixed(2)}</span>
          <span className={styles.dealOriginalPrice}>${product.originalPrice?.toFixed(2)}</span>
          <span className={styles.dealSavings}>
            Save ${((product.originalPrice || 0) - product.price).toFixed(2)}
          </span>
        </div>
        
        <div className={styles.dealActions}>
          <Button variant="danger" size="small" fullWidth>
            Grab Deal
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => onAddToWatchlist(product)}
            disabled={isInWatchlist}
          >
            {isInWatchlist ? '👁️' : '👁️‍🗨️'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Watchlist Card Component
interface WatchlistCardProps {
  product: ProductRecommendation;
  onRemoveFromWatchlist: (productId: string) => void;
}

const WatchlistCard: React.FC<WatchlistCardProps> = ({ product, onRemoveFromWatchlist }) => {
  return (
    <Card variant="outline" className={styles.watchlistCard}>
      <div className={styles.watchlistContent}>
        <div className={styles.watchlistInfo}>
          <h4>{product.name}</h4>
          <span className={styles.watchlistBrand}>{product.brand}</span>
          <span className={styles.watchlistPrice}>${product.price.toFixed(2)}</span>
        </div>
        
        <div className={styles.watchlistActions}>
          <Button 
            variant="primary" 
            size="small"
            onClick={() => window.open(product.productUrl, '_blank')}
          >
            View
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={() => onRemoveFromWatchlist(product.id)}
          >
            ❌
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Filters Modal Component
interface FiltersModalProps {
  filters: SearchFilters;
  onSave: (filters: SearchFilters) => void;
  onClose: () => void;
}

const FiltersModal: React.FC<FiltersModalProps> = ({ filters, onSave, onClose }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleSave = () => {
    onSave(localFilters);
  };

  return (
    <Modal
      title="Search Filters"
      isOpen={true}
      onClose={onClose}
      size="medium"
    >
      <div className={styles.filtersContent}>
        <Card variant="outline">
          <h3>Price Range</h3>
          <div className={styles.priceRange}>
            <Input
              type="number"
              placeholder="Min price"
              value={localFilters.priceMin.toString()}
              onChange={(e) => setLocalFilters(prev => ({
                ...prev,
                priceMin: parseFloat(e.target.value) || 0
              }))}
            />
            <Input
              type="number"
              placeholder="Max price"
              value={localFilters.priceMax.toString()}
              onChange={(e) => setLocalFilters(prev => ({
                ...prev,
                priceMax: parseFloat(e.target.value) || 10000
              }))}
            />
          </div>
        </Card>

        <Card variant="outline">
          <h3>Options</h3>
          <div className={styles.filterOptions}>
            <label className={styles.filterOption}>
              <input
                type="checkbox"
                checked={localFilters.onlyDeals}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  onlyDeals: e.target.checked
                }))}
              />
              <span>Show only deals</span>
            </label>
            
            <label className={styles.filterOption}>
              <input
                type="checkbox"
                checked={localFilters.inStockOnly}
                onChange={(e) => setLocalFilters(prev => ({
                  ...prev,
                  inStockOnly: e.target.checked
                }))}
              />
              <span>In stock only</span>
            </label>
          </div>
        </Card>

        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Apply Filters
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const getAvailabilityColor = (availability: string): 'success' | 'warning' | 'danger' => {
  switch (availability) {
    case 'in_stock': return 'success';
    case 'low_stock': return 'warning';
    case 'out_of_stock': return 'danger';
    default: return 'warning';
  }
};

const getRatingStars = (rating: number): string => {
  return '⭐'.repeat(Math.floor(rating)) + (rating % 1 !== 0 ? '☆' : '');
};

export default EnhancedScoutSection;
