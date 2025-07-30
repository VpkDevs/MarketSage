// Types for the scam detection system

export interface ScamHeuristic {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  weight: number; // 0-1 scale
  configOptions: Record<string, any>; // Specific options for this heuristic
}

export interface UserScamDetectionPreferences {
  userId: string;
  heuristics: ScamHeuristic[];
  globalThreshold: number; // 0-100 scale, overall sensitivity
  lastUpdated: number; // timestamp
}

export interface ScamAnalysisResult {
  probability: number; // 0-1 scale
  riskFactors: string[];
  detailedResults: {
    heuristicId: string;
    name: string;
    score: number;
    enabled: boolean;
    weight: number;
    findings: string[];
  }[];
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface StatisticalDistribution {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  q1: number; // 25th percentile
  q3: number; // 75th percentile
}

export interface SpecRange {
  min: number;
  max: number;
  mean: number;
  stdDev: number;
}

export interface CategoryStatisticalModel {
  categoryId: string;
  priceStats: StatisticalDistribution;
  ratingStats: StatisticalDistribution;
  reviewCountStats: StatisticalDistribution;
  correlations: {
    priceRating: number;
    // Add more correlations as needed
  };
  specRanges: Record<string, SpecRange>;
}

export interface Anomaly {
  type: string;
  severity: number; // 0-1 scale
  description: string;
}

export interface ImageIssue {
  type: string;
  description: string;
  imageIndex?: number;
}

// Unified client types
export interface CartItem {
  productId: string;
  platform: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  url: string;
  addedAt: number;
}

export interface ProductFilters {
  minPrice?: number;
  maxPrice?: number;
  categories?: string[];
  sortBy?: 'price' | 'rating' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface BrowseResult {
  products: any[]; // Product with scam analysis and display flags
  totalFound: number;
  filtered: number;
  platforms: {
    platform: string;
    count: number;
  }[];
}

export interface PlatformCheckout {
  platform: string;
  items: CartItem[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  checkoutUrl: string;
  error?: string;
}

export interface CheckoutSession {
  sessionId: string;
  platforms: PlatformCheckout[];
  startedAt: number;
  completedAt?: number;
  status: 'started' | 'in-progress' | 'completed' | 'failed';
}
