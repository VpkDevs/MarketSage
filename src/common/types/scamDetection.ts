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

export interface HeuristicResult {
  heuristicId: string;
  name: string;
  score: number;
  enabled: boolean;
  weight: number;
  findings: string[];
}

export interface ScamAnalysisResult {
  probability: number; // 0-1 scale
  riskFactors: string[];
  detailedResults: HeuristicResult[];
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  // Enhanced fields (optional for backward compatibility)
  confidence?: ConfidenceScore;
  explanation?: Explanation;
  triggeredRules?: TriggeredInteractionRule[];
  temporalSignals?: TemporalSignal[];
  feedbackId?: string;
}

// ── Interaction Engine ────────────────────────────────────────────────────────

export interface RuleCondition {
  heuristicId: string;
  minScore: number;
}

export interface InteractionRule {
  id: string;
  name: string;
  description: string;
  conditions: RuleCondition[];
  /** amplification factor per heuristic id (1.0 = no change) */
  amplificationFactors: Record<string, number>;
  severity: 'moderate' | 'high' | 'critical';
}

export interface TriggeredInteractionRule {
  ruleId: string;
  ruleName: string;
  description: string;
  severity: 'moderate' | 'high' | 'critical';
  affectedSignals: string[];
}

export interface InteractionEngineResult {
  adjustedScores: Record<string, number>;
  triggeredRules: TriggeredInteractionRule[];
  amplificationApplied: boolean;
}

// ── Temporal Analyzer ────────────────────────────────────────────────────────

export interface SellerSnapshot {
  timestamp: number;
  rating: number;
  reviewCount: number;
  listingCount: number;
  riskScore: number;
}

export interface TemporalSellerData {
  sellerId: string;
  snapshots: SellerSnapshot[];
  lastUpdated: number;
}

export interface TemporalSignal {
  type: 'rating_drop' | 'review_spike' | 'listing_spike' | 'risk_trend_up' | 'sudden_change';
  severity: number; // 0-1
  description: string;
  windowDays: number;
  changePercent: number;
}

export interface TemporalAnalysisResult {
  signals: TemporalSignal[];
  riskScore: number; // 0-1 additional risk from temporal signals
  hasTemporalData: boolean;
}

// ── Cross-Listing Engine ──────────────────────────────────────────────────────

export interface PriceRange {
  min: number;
  max: number;
}

export interface ProductFingerprint {
  productId: string;
  platform: string;
  titleTokens: string[];
  titleHash: string;
  priceRange: PriceRange;
  imageCount: number;
  categoryId?: string;
  imageHashes: string[];
  timestamp: number;
}

export interface CrossListingRiskSignal {
  type: 'price_variance' | 'image_reuse' | 'title_clone' | 'review_duplication';
  severity: number; // 0-1
  description: string;
}

export interface CrossListingMatch {
  fingerprint: ProductFingerprint;
  similarity: number; // 0-1
  priceVariancePercent: number;
  riskSignals: CrossListingRiskSignal[];
}

export interface CrossListingResult {
  matches: CrossListingMatch[];
  riskScore: number; // 0-1
  issues: string[];
}

// ── Image Analysis (Enhanced) ─────────────────────────────────────────────────

export interface ImageHash {
  url: string;
  hash: string; // hex dHash
  timestamp: number;
}

export interface ImageHashEntry {
  hash: string;
  sellers: string[];
  platforms: string[];
  firstSeen: number;
  occurrences: number;
}

export interface EnhancedImageAnalysisResult {
  score: number;
  issues: ImageIssue[];
  reusedImages: string[]; // URLs detected as reused
  hashMatches: number;
}

// ── Feedback Engine ───────────────────────────────────────────────────────────

export type FeedbackType =
  | 'confirmed_scam'
  | 'confirmed_safe'
  | 'false_positive'
  | 'false_negative';

export interface FeedbackEntry {
  id: string;
  productId: string;
  sellerId?: string;
  platform: string;
  feedbackType: FeedbackType;
  originalProbability: number;
  originalRiskLevel: string;
  topSignals: string[]; // heuristicIds that had the highest scores
  userId: string;
  timestamp: number;
  notes?: string;
}

export interface FeedbackWeightAdjustment {
  heuristicId: string;
  oldWeight: number;
  newWeight: number;
  reason: string;
}

// ── Confidence Calculator ─────────────────────────────────────────────────────

export interface ConfidenceFactors {
  dataCompleteness: number; // 0-1
  signalAgreement: number;  // 0-1 (low variance = high agreement)
  historicalDataAvailability: number; // 0-1
  sampleSize: number; // 0-1 (review/rating count adequacy)
}

export interface ConfidenceScore {
  level: 'high' | 'medium' | 'low';
  score: number; // 0-1
  factors: ConfidenceFactors;
}

// ── Explanation Engine ────────────────────────────────────────────────────────

export interface SignalExplanation {
  signal: string; // heuristicId
  signalName: string;
  score: number;
  contributionPercent: number; // 0-100, % of total risk this signal explains
  topFindings: string[];
}

export interface Explanation {
  summary: string;
  topSignals: SignalExplanation[];
  triggeredRules: string[];
  keyAnomalies: string[];
  humanReadable: string;
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
