// Common types used throughout the application
export * from './types/scamDetection';

export enum Platform {
  ALIEXPRESS = 'aliexpress',
  TEMU = 'temu',
  DHGATE = 'dhgate'
}

export interface Price {
  current: number;
  original?: number;
  currency: string;
  discount?: number; // Percentage discount
  market?: number; // Average market price for similar products
}

export interface Seller {
  id: string;
  name?: string;
  rating?: number;
  reviewCount?: number;
  joinDate?: Date;
  responseRate?: number;
  disputeRate?: number;
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: Price;
  images?: string[];
  url?: string;
  platform: Platform;
  seller?: Seller;
  rating?: number;
  reviewCount?: number;
  categoryId?: string;
  brand?: string;
  specifications?: Record<string, string | number>;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  level: number;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  preferences?: Record<string, any>;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  text?: string;
  date: Date;
  helpful?: number;
  verified?: boolean;
}

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  categories?: string[];
  sortBy?: 'price' | 'rating' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}
