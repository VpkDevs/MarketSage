import { ScamDetectionPreferences } from "./scamDetection/userPreferences";
import { Product, ScamHeuristic, ScamAnalysisResult, HeuristicResult, Platform } from "../types";

// Detection engines
import { AnomalyDetectionEngine } from "./scamDetection/anomalyDetection";
import { ImageAnalysisEngine } from "./scamDetection/imageAnalysis";
import { SellerAnalysisEngine } from "./scamDetection/sellerAnalysis";
import { CrossPlatformVerifier } from "./scamDetection/crossPlatformVerifier";
import { ReviewAnalyzer } from "./scamDetection/reviewAnalyzer";

// New engines
import { InteractionEngine } from "./scamDetection/InteractionEngine";
import { TemporalAnalyzer } from "./scamDetection/TemporalAnalyzer";
import { CrossListingEngine } from "./scamDetection/CrossListingEngine";
import { FeedbackEngine } from "./scamDetection/FeedbackEngine";
import { ConfidenceCalculator } from "./scamDetection/ConfidenceCalculator";
import { ExplanationEngine } from "./scamDetection/ExplanationEngine";

export class ScamDetectionModel {
  private anomalyDetector: AnomalyDetectionEngine;
  private imageAnalyzer: ImageAnalysisEngine;
  private sellerAnalyzer: SellerAnalysisEngine;
  private crossPlatformVerifier: CrossPlatformVerifier;
  private reviewAnalyzer: ReviewAnalyzer;
  private preferences: ScamDetectionPreferences;

  // New engines
  private interactionEngine: InteractionEngine;
  private temporalAnalyzer: TemporalAnalyzer;
  private crossListingEngine: CrossListingEngine;
  private feedbackEngine: FeedbackEngine;
  private confidenceCalculator: ConfidenceCalculator;
  private explanationEngine: ExplanationEngine;

  constructor() {
    this.anomalyDetector = new AnomalyDetectionEngine();
    this.imageAnalyzer = new ImageAnalysisEngine();
    this.sellerAnalyzer = new SellerAnalysisEngine();
    this.crossPlatformVerifier = new CrossPlatformVerifier();
    this.reviewAnalyzer = new ReviewAnalyzer();
    this.preferences = ScamDetectionPreferences.getInstance();

    this.interactionEngine = new InteractionEngine();
    this.temporalAnalyzer = new TemporalAnalyzer();
    this.crossListingEngine = new CrossListingEngine();
    this.feedbackEngine = new FeedbackEngine();
    this.confidenceCalculator = new ConfidenceCalculator();
    this.explanationEngine = new ExplanationEngine();
  }

  async analyze(data: {
    title: string;
    description: string;
    price: number;
    marketPrice?: number;
    images?: string[];
    sellerId?: string;
    categoryId?: string;
    userId?: string;
  }): Promise<ScamAnalysisResult> {
    const userId = data.userId || 'default';
    const userPrefs = await this.preferences.getUserPreferences(userId);

    const product: Product = this.prepareProductData(data);

    // ── Step 1: Run base heuristics in parallel ─────────────────────────────
    const baseResults = await this.runEnabledHeuristics(product, userPrefs.heuristics);

    // Apply feedback-adjusted weights to each result
    const adjustedResults = await this.applyFeedbackWeights(baseResults);

    // ── Step 2: Run temporal analysis ──────────────────────────────────────
    const temporalResult = product.seller?.id
      ? await this.temporalAnalyzer.analyze(product.seller.id)
      : { signals: [], riskScore: 0, hasTemporalData: false };

    // ── Step 3: Apply interaction engine (non-linear scoring) ───────────────
    const interactionResult = this.interactionEngine.apply(adjustedResults);

    // ── Step 4: Compute final probability ──────────────────────────────────
    const probability = this.interactionEngine.computeProbability(
      interactionResult.adjustedScores,
      adjustedResults,
      interactionResult.triggeredRules,
      userPrefs.globalThreshold
    );

    // ── Step 5: Determine risk level ────────────────────────────────────────
    const overallRiskLevel = this.determineRiskLevel(probability);

    // ── Step 6: Collect risk factors (human-readable findings) ──────────────
    const riskFactors = adjustedResults
      .filter(r => r.enabled && r.score > 0.5)
      .flatMap(r => r.findings);

    // Add temporal signals to risk factors
    for (const signal of temporalResult.signals) {
      if (signal.severity >= 0.4) {
        riskFactors.push(signal.description);
      }
    }

    // ── Step 7: Confidence score ────────────────────────────────────────────
    const confidence = this.confidenceCalculator.compute({
      results: adjustedResults,
      hasSellerInfo: !!product.seller?.id,
      hasDescription: !!product.description && product.description.length >= 50,
      imageCount: product.images?.length ?? 0,
      hasMarketPrice: !!product.price.market,
      hasTemporalData: temporalResult.hasTemporalData,
      reviewCount: product.reviewCount ?? 0,
      sellerRating: product.seller?.rating,
    });

    // ── Step 8: Explanation ─────────────────────────────────────────────────
    const explanation = this.explanationEngine.generate({
      results: adjustedResults,
      triggeredRules: interactionResult.triggeredRules,
      temporalSignals: temporalResult.signals,
      probability,
      riskLevel: overallRiskLevel,
      confidence,
    });

    // ── Step 9: Generate a feedback ID for linking future feedback ──────────
    const feedbackId = `${product.id}-${Date.now()}`;

    return {
      probability,
      riskFactors,
      detailedResults: adjustedResults,
      overallRiskLevel,
      confidence,
      explanation,
      triggeredRules: interactionResult.triggeredRules,
      temporalSignals: temporalResult.signals,
      feedbackId,
    };
  }

  private prepareProductData(data: any): Product {
    return {
      id: data.id || `product-${Date.now()}`,
      title: data.title,
      description: data.description,
      price: {
        current: data.price,
        original: data.originalPrice,
        market: data.marketPrice,
        currency: data.currency || 'USD'
      },
      images: data.images || [],
      platform: data.platform || Platform.ALIEXPRESS,
      seller: data.sellerId ? { id: data.sellerId } : undefined,
      categoryId: data.categoryId
    } as Product;
  }

  private async runEnabledHeuristics(
    product: Product,
    heuristics: ScamHeuristic[]
  ): Promise<HeuristicResult[]> {
    // Run enabled heuristics in parallel
    const promises = heuristics.map(heuristic => {
      if (heuristic.enabled) {
        return this.runHeuristic(product, heuristic);
      }
      return Promise.resolve({
        heuristicId: heuristic.id,
        name: heuristic.name,
        score: 0,
        enabled: false,
        weight: heuristic.weight,
        findings: [] as string[],
      });
    });

    return Promise.all(promises);
  }

  private async runHeuristic(
    product: Product,
    heuristic: ScamHeuristic
  ): Promise<HeuristicResult> {
    let score = 0;
    let findings: string[] = [];

    switch (heuristic.id) {
      case "price_anomaly": {
        const result = await this.anomalyDetector.detectAnomalies(product);
        score = result.score;
        findings = result.anomalies.map(a => a.description);
        break;
      }
      case "image_quality_analysis": {
        if (product.images && product.images.length > 0) {
          const result = await this.imageAnalyzer.analyzeProductImages(
            product.images,
            product.title,
            product.brand,
            product.seller?.id,
            product.platform
          );
          score = result.score;
          findings = result.issues.map(i => i.description);
        }
        break;
      }
      case "seller_history_analysis": {
        if (product.seller?.id) {
          const result = await this.sellerAnalyzer.analyzeSeller(product.seller.id);
          score = result.score;
          findings = result.reasons;
        }
        break;
      }
      case "review_pattern_analysis": {
        if (product.id) {
          const result = await this.reviewAnalyzer.analyzeReviews(product.id);
          score = result.score;
          findings = result.issues;
        }
        break;
      }
      case "cross_platform_verification": {
        const result = await this.crossPlatformVerifier.verify(product);
        score = result.score;
        findings = result.issues;
        break;
      }
    }

    return {
      heuristicId: heuristic.id,
      name: heuristic.name,
      score,
      enabled: true,
      weight: heuristic.weight,
      findings,
    };
  }

  /**
   * Apply feedback-adjusted weights to each heuristic result.
   * Falls back to the original weight if no feedback weight is stored.
   */
  private async applyFeedbackWeights(
    results: HeuristicResult[]
  ): Promise<HeuristicResult[]> {
    const adjusted = await Promise.all(
      results.map(async r => {
        const adjustedWeight = await this.feedbackEngine.getAdjustedWeight(
          r.heuristicId,
          r.weight
        );
        return { ...r, weight: adjustedWeight };
      })
    );
    return adjusted;
  }

  private determineRiskLevel(probability: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (probability < 0.3) return 'LOW';
    if (probability < 0.6) return 'MEDIUM';
    if (probability < 0.8) return 'HIGH';
    return 'CRITICAL';
  }
}
