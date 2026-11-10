/**
 * Scout product discovery.
 *
 * Scout answers three questions from data MarketSage already has on the
 * user's own device — the products it extracted and cached while the
 * user browsed Temu, AliExpress and DHgate (see Storage.getProductCache)
 * plus the per-product price history recorded on each visit:
 *
 * - "What have I looked at that matches this search?"   (search mode)
 * - "What have I looked at that is similar to this?"    (similar mode,
 *   when the user is standing on a product page)
 * - "What is worth a second look?"                      (value mode:
 *   ranked by real price drops, listed discounts, and ratings)
 *
 * There is deliberately NO live marketplace search here: MarketSage has
 * no catalog, no marketplace API keys, and makes no network requests
 * for Scout. Every result is a product the user actually viewed, and
 * every number shown (discount, price drop) is computed from that
 * product's own extracted price and its recorded history. When the
 * local history is empty, Scout returns an empty result and the UI
 * says so — it never fills the gap with invented products.
 */
import { Storage } from '../../../common/utils/storage';
import { Product } from '../../../common/types';
import { titleSimilarity, tokenizeTitle, SIMILARITY_THRESHOLD } from '../../../common/utils/similarity';

export const SCOUT_BASIS =
  'From products MarketSage has seen in your browser on supported marketplaces — stored only on this device. Scout has no live catalog and makes no network requests.';

export interface ScoutFilters {
  /** Platform names to include (e.g. ['temu', 'aliexpress']); empty = all. */
  platforms?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onlyDeals?: boolean;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'discount';
}

export interface ScoutOptions {
  query?: string;
  /** The product the user is currently viewing, when known. */
  contextProduct?: Product | null;
  filters?: ScoutFilters;
  maxResults?: number;
}

export interface ScoutResult {
  id: string;
  title: string;
  platform: string;
  price: number;
  originalPrice?: number;
  currency: string;
  /** Listed discount vs. the listing's own original price, %. */
  discountPercent?: number;
  /**
   * Change vs. the first price MarketSage recorded for this product, %.
   * Negative means the price has risen. Only present when the product
   * has been seen at least twice.
   */
  priceDropPercent?: number;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  url?: string;
  sellerName?: string;
  /** 0..100, meaning depends on `relevanceBasis`. */
  relevanceScore: number;
  relevanceBasis: 'search match' | 'similar to what you are viewing' | 'deal strength';
}

export interface ScoutDiscovery {
  results: ScoutResult[];
  /** How many viewed products Scout considered before filtering. */
  totalCandidates: number;
  mode: 'search' | 'similar' | 'value';
  basis: string;
}

export interface ScoutCandidate {
  product: Product;
  history: Array<{ current: number; timestamp: string }>;
}

const DEFAULT_MAX_RESULTS = 10;
const MAX_RESULTS_CAP = 50;

function discountPercent(product: Product): number | undefined {
  const { current, original, discount } = product.price;
  if (typeof discount === 'number' && discount > 0) return Math.round(discount);
  if (typeof original === 'number' && original > current && current > 0) {
    return Math.round(((original - current) / original) * 100);
  }
  return undefined;
}

function priceDropPercent(candidate: ScoutCandidate): number | undefined {
  const { history, product } = candidate;
  if (history.length < 2) return undefined;
  const earliest = history[0].current;
  if (!(earliest > 0)) return undefined;
  return Math.round(((earliest - product.price.current) / earliest) * 1000) / 10;
}

function dealStrength(candidate: ScoutCandidate): number {
  const discount = discountPercent(candidate.product) ?? 0;
  const drop = Math.max(0, priceDropPercent(candidate) ?? 0);
  const rating = candidate.product.rating ? (candidate.product.rating / 5) * 100 : 0;
  return Math.round(0.45 * drop + 0.35 * discount + 0.2 * rating);
}

function applyFilters(candidates: ScoutCandidate[], filters: ScoutFilters): ScoutCandidate[] {
  return candidates.filter(({ product }) => {
    if (filters.platforms && filters.platforms.length > 0 &&
        !filters.platforms.includes(String(product.platform))) {
      return false;
    }
    if (typeof filters.minPrice === 'number' && product.price.current < filters.minPrice) return false;
    if (typeof filters.maxPrice === 'number' && product.price.current > filters.maxPrice) return false;
    if (typeof filters.minRating === 'number' && (product.rating ?? 0) < filters.minRating) return false;
    if (filters.onlyDeals) {
      const discount = discountPercent(product) ?? 0;
      return discount > 0;
    }
    return true;
  });
}

function toResult(
  candidate: ScoutCandidate,
  relevanceScore: number,
  relevanceBasis: ScoutResult['relevanceBasis']
): ScoutResult {
  const { product } = candidate;
  return {
    id: product.id,
    title: product.title,
    platform: String(product.platform),
    price: product.price.current,
    originalPrice: product.price.original,
    currency: product.price.currency || 'USD',
    discountPercent: discountPercent(product),
    priceDropPercent: priceDropPercent(candidate),
    rating: product.rating,
    reviewCount: product.reviewCount,
    imageUrl: product.images?.[0],
    url: product.url,
    sellerName: product.seller?.name,
    relevanceScore,
    relevanceBasis
  };
}

function sortResults(results: ScoutResult[], sortBy: ScoutFilters['sortBy']): ScoutResult[] {
  const byRelevance = (a: ScoutResult, b: ScoutResult) => b.relevanceScore - a.relevanceScore;
  switch (sortBy) {
    case 'price_low':
      return [...results].sort((a, b) => a.price - b.price || byRelevance(a, b));
    case 'price_high':
      return [...results].sort((a, b) => b.price - a.price || byRelevance(a, b));
    case 'rating':
      return [...results].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || byRelevance(a, b));
    case 'discount':
      return [...results].sort((a, b) =>
        Math.max(b.discountPercent ?? 0, Math.max(0, b.priceDropPercent ?? 0)) -
        Math.max(a.discountPercent ?? 0, Math.max(0, a.priceDropPercent ?? 0)) ||
        byRelevance(a, b));
    case 'relevance':
    default:
      return [...results].sort(byRelevance);
  }
}

/**
 * Pure ranking core — exported for tests. Takes the candidate products
 * (with their recorded price histories) and the discovery options, and
 * returns honestly-labeled results. No storage, no network.
 */
export function rankScoutCandidates(
  candidates: ScoutCandidate[],
  options: ScoutOptions = {}
): ScoutDiscovery {
  const filters = options.filters ?? {};
  const maxResults = Math.min(
    Math.max(options.maxResults ?? DEFAULT_MAX_RESULTS, 1),
    MAX_RESULTS_CAP
  );
  const pool = applyFilters(candidates, filters);
  const query = options.query?.trim();

  let mode: ScoutDiscovery['mode'];
  let results: ScoutResult[];

  if (query) {
    mode = 'search';
    const queryTokens = tokenizeTitle(query);
    results = pool
      .map(candidate => {
        const titleTokens = tokenizeTitle(candidate.product.title);
        let matched = 0;
        for (const token of queryTokens) {
          if (titleTokens.has(token)) matched++;
        }
        return { candidate, matched };
      })
      .filter(({ matched }) => matched > 0)
      .map(({ candidate, matched }) =>
        toResult(candidate, Math.round((matched / queryTokens.size) * 100), 'search match'));
  } else if (options.contextProduct) {
    mode = 'similar';
    const context = options.contextProduct;
    results = pool
      .filter(candidate => candidate.product.id !== context.id)
      .map(candidate => ({
        candidate,
        similarity: titleSimilarity(candidate.product.title, context.title)
      }))
      .filter(({ similarity }) => similarity > SIMILARITY_THRESHOLD)
      .map(({ candidate, similarity }) =>
        toResult(candidate, Math.round(similarity * 100), 'similar to what you are viewing'));
  } else {
    mode = 'value';
    results = pool.map(candidate =>
      toResult(candidate, dealStrength(candidate), 'deal strength'));
  }

  // "Deals only" also counts a real recorded price drop, which the
  // product-level filter above cannot see (it needs the history).
  if (filters.onlyDeals) {
    results = results.filter(r =>
      (r.discountPercent ?? 0) > 0 || (r.priceDropPercent ?? 0) >= 5);
  }

  return {
    results: sortResults(results, filters.sortBy).slice(0, maxResults),
    totalCandidates: candidates.length,
    mode,
    basis: SCOUT_BASIS
  };
}

export class ProductDiscoveryService {
  /** Discover from the device's local product cache + price history. */
  async discover(options: ScoutOptions = {}): Promise<ScoutDiscovery> {
    const cache = await Storage.getProductCache();
    const products = Object.values(cache) as Product[];

    const candidates: ScoutCandidate[] = await Promise.all(
      products.map(async product => ({
        product,
        history: (await Storage.getPriceHistory(product.id))
          .map(entry => ({ current: entry.current, timestamp: entry.timestamp }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      }))
    );

    return rankScoutCandidates(candidates, options);
  }
}
