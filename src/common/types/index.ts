// Platform Types
export enum Platform {
  TEMU = 'temu',
  ALIEXPRESS = 'aliexpress',
  DHGATE = 'dhgate',
  UNKNOWN = 'unknown'
}

// Product Types
export interface Price {
  current: number;
  original?: number;
  currency: string;
  discount?: number;
}

export interface Seller {
  id: string;
  name: string;
  rating?: number;
  totalSales?: number;
  joinDate?: Date;
  positiveRating?: number;
}

export interface Product {
  id: string;
  title: string;
  price: Price;
  seller: Seller;
  platform: Platform;
  url: string;
  images: string[];
  description?: string;
  specifications?: Record<string, string>;
  shipping?: {
    cost: number;
    method: string;
    estimatedDays: number;
  };
  analysis?: ProductAnalysis;
}

// Analysis Types
export enum RiskLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  SAFE = 'safe'
}

export interface Warning {
  type: string;
  message: string;
  severity: RiskLevel;
  details?: Record<string, any>;
}

export interface PriceAnalysis {
  marketComparison: {
    averagePrice: number;
    deviation: number;
    isSignificantlyLower: boolean;
  };
  historicalData: {
    lowestPrice: number;
    highestPrice: number;
    priceHistory: Array<{
      price: number;
      date: Date;
    }>;
  };
  warnings: Warning[];
}

export interface SellerAnalysis {
  trustScore: number;
  riskLevel: RiskLevel;
  warnings: Warning[];
  metrics: {
    accountAge: number;
    totalSales: number;
    positiveRating: number;
    responseRate?: number;
    disputeRate?: number;
  };
}

export interface ProductAnalysis {
  riskScore: number;
  riskLevel: RiskLevel;
  warnings: Warning[];
  priceAnalysis: PriceAnalysis;
  sellerAnalysis: SellerAnalysis;
  timestamp: Date;
}

// State Types
export interface AppState {
  products: {
    items: Product[];
    loading: boolean;
    error: string | null;
  };
  analysis: {
    current: ProductAnalysis | null;
    loading: boolean;
    error: string | null;
  };
  ui: {
    activeTab: string;
    settings: {
      riskThreshold: RiskLevel;
      notifications: boolean;
      autoAnalyze: boolean;
    };
  };
}

// Platform Configuration
export interface PlatformConfig {
  name: Platform;
  baseUrl: string;
  selectors: {
    price: string;
    title: string;
    seller: string;
    shipping: string;
    description: string;
    specifications: string;
  };
  apiEndpoints?: {
    search?: string;
    product?: string;
    seller?: string;
  };
}

// Service Response Types
export interface AnalysisResponse {
  success: boolean;
  data?: ProductAnalysis;
  error?: string;
}

export interface SearchResponse {
  success: boolean;
  data?: {
    products: Product[];
    totalResults: number;
    page: number;
    totalPages: number;
  };
  error?: string;
}
