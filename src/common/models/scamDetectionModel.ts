import { ScamDetectionPreferences } from "./scamDetection/userPreferences";
import { Product, ScamHeuristic, ScamAnalysisResult, Platform } from "../types";

// Import the detection engines
// Note: These would need to be implemented separately
import { AnomalyDetectionEngine } from "./scamDetection/anomalyDetection";
import { ImageAnalysisEngine } from "./scamDetection/imageAnalysis";
import { SellerAnalysisEngine } from "./scamDetection/sellerAnalysis";
import { CrossPlatformVerifier } from "./scamDetection/crossPlatformVerifier";
import { ReviewAnalyzer } from "./scamDetection/reviewAnalyzer";

// ScamAnalysisResult is now imported from ../types

export class ScamDetectionModel {
  private anomalyDetector: AnomalyDetectionEngine;
  private imageAnalyzer: ImageAnalysisEngine;
  private sellerAnalyzer: SellerAnalysisEngine;
  private crossPlatformVerifier: CrossPlatformVerifier;
  private reviewAnalyzer: ReviewAnalyzer;
  private preferences: ScamDetectionPreferences;

  constructor() {
    this.anomalyDetector = new AnomalyDetectionEngine();
    this.imageAnalyzer = new ImageAnalysisEngine();
    this.sellerAnalyzer = new SellerAnalysisEngine();
    this.crossPlatformVerifier = new CrossPlatformVerifier();
    this.reviewAnalyzer = new ReviewAnalyzer();
    this.preferences = ScamDetectionPreferences.getInstance();
  }

  async analyze(data: {
    title: string;
    description: string;
    price: number;
    marketPrice?: number;
    images?: string[];
    sellerId?: string;
    categoryId?: string;
    userId?: string; // User ID for preferences
  }): Promise<ScamAnalysisResult> {
    // Get user preferences (or default if userId not provided)
    const userId = data.userId || 'default';
    const userPrefs = await this.preferences.getUserPreferences(userId);

    // Prepare product data for analysis
    const product: Product = this.prepareProductData(data);

    // Run all enabled detection engines in parallel
    const detailedResults = await this.runEnabledHeuristics(product, userPrefs.heuristics);

    // Calculate overall probability based on weighted scores
    const { probability, riskFactors } = this.calculateOverallProbability(
      detailedResults,
      userPrefs.globalThreshold
    );

    // Determine overall risk level
    const overallRiskLevel = this.determineRiskLevel(probability);

    return {
      probability,
      riskFactors,
      detailedResults,
      overallRiskLevel
    };
  }

  private prepareProductData(data: any): Product {
    // Convert input data to Product type
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
  ): Promise<{
    heuristicId: string;
    name: string;
    score: number;
    enabled: boolean;
    weight: number;
    findings: string[];
  }[]> {
    const results = [];

    // Run each heuristic if enabled
    for (const heuristic of heuristics) {
      if (heuristic.enabled) {
        const result = await this.runHeuristic(product, heuristic);
        results.push(result);
      } else {
        // Include disabled heuristics with zero score for UI display
        results.push({
          heuristicId: heuristic.id,
          name: heuristic.name,
          score: 0,
          enabled: false,
          weight: heuristic.weight,
          findings: []
        });
      }
    }

    return results;
  }

  private async runHeuristic(
    product: Product,
    heuristic: ScamHeuristic
  ): Promise<{
    heuristicId: string;
    name: string;
    score: number;
    enabled: boolean;
    weight: number;
    findings: string[];
  }> {
    let score = 0;
    let findings: string[] = [];

    // Run the appropriate analysis based on heuristic ID
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
            product.brand
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
      // Add cases for other heuristics
    }

    return {
      heuristicId: heuristic.id,
      name: heuristic.name,
      score,
      enabled: true,
      weight: heuristic.weight,
      findings
    };
  }

  private calculateOverallProbability(
    results: {
      heuristicId: string;
      name: string;
      score: number;
      enabled: boolean;
      weight: number;
      findings: string[];
    }[],
    globalThreshold: number
  ): {
    probability: number;
    riskFactors: string[];
  } {
    // Only consider enabled heuristics
    const enabledResults = results.filter(r => r.enabled);

    if (enabledResults.length === 0) {
      return { probability: 0, riskFactors: [] };
    }

    // Calculate weighted sum
    let weightedSum = 0;
    let totalWeight = 0;

    for (const result of enabledResults) {
      weightedSum += result.score * result.weight;
      totalWeight += result.weight;
    }

    // Normalize to 0-1 scale
    let probability = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Apply global threshold adjustment
    // Higher threshold = more sensitive (lower scores become higher)
    const thresholdFactor = globalThreshold / 70; // 70 is our default
    probability = Math.min(1, probability * thresholdFactor);

    // Collect risk factors from results with significant scores
    const riskFactors = enabledResults
      .filter(r => r.score > 0.5) // Only include significant findings
      .flatMap(r => r.findings);

    return { probability, riskFactors };
  }

  private determineRiskLevel(probability: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (probability < 0.3) return 'LOW';
    if (probability < 0.6) return 'MEDIUM';
    if (probability < 0.8) return 'HIGH';
    return 'CRITICAL';
  }
}
