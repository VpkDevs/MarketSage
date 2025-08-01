import { Storage } from "../../../common/utils/storage";
import { Product } from "../../../common/types";
import { ScamDetectionModel } from "../../../common/models/scamDetectionModel";

export interface SecurityMetrics {
  riskScore: number;
  warnings: string[];
  sellerTrust: number;
}

export class SecurityAnalyzer {
  private static readonly RISK_WEIGHTS = {
    SELLER_HISTORY: 0.4,
    PRICE_ANOMALY: 0.3,
    LISTING_QUALITY: 0.3,
    TEXT_SCAM_KEYWORDS: 0.3,
  };

  private static readonly SCAM_KEYWORDS = [
    "scam",
    "fraud",
    "fake",
    "offer",
    "money",
    "guarantee",
    "win",
    "prize",
    "urgent",
    "risk",
  ];

  private scamDetector: ScamDetectionModel;

  constructor() {
    this.scamDetector = new ScamDetectionModel();
  }

  async analyzeProduct(product: Product): Promise<SecurityMetrics> {
    const [scamAnalysis, sellerTrust, priceRisk] = await Promise.all([
      this.scamDetector.analyze({
        title: product.title,
        description: product.description,
        price: product.price.current,
        marketPrice: product.price.market
      }),
      this.calculateSellerTrust(product.seller.id),
      this.analyzePriceRisk(product)
    ]);

    const riskScore = this.calculateOverallRisk(
      scamAnalysis.probability,
      sellerTrust,
      priceRisk
    );

    return {
      riskScore: Math.round(riskScore * 100),
      warnings: [...scamAnalysis.riskFactors],
      sellerTrust: Math.round(sellerTrust * 100)
    };
  }

  private async calculateSellerTrust(sellerId: string): Promise<number> {
    const rating = await Storage.getSellerRating(sellerId);
    if (!rating) return 0.5; // Default trust score for new sellers

    // Convert rating to 0-1 scale and weight recent ratings more heavily
    return Math.min(Math.max(rating / 5, 0), 1);
  }

  private async analyzePriceRisk(product: Product): Promise<number> {
    const priceHistory = await Storage.getPriceHistory(product.id);
    const cache = await Storage.getProductCache();

    // Check for price anomalies
    if (priceHistory.length > 0) {
      const prices = priceHistory.map((p) => p.current);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const stdDev = Math.sqrt(
        prices.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / prices.length
      );

      // Calculate z-score of current price
      const zScore = Math.abs((product.price.current - avg) / (stdDev || 1));
      return Math.min(zScore / 3, 1); // Normalize to 0-1, where 1 is high risk
    }

    return 0.5; // Default risk for new products
  }

  private async analyzeListingQuality(product: Product): Promise<number> {
    let riskFactors = 0;
    let totalFactors = 5; // Increased total factors to include text scam keywords

    // Check for complete product information
    if (!product.description || product.description.length < 50) riskFactors++;
    if (!product.images || product.images.length === 0) riskFactors++;
    if (!product.title || product.title.length < 10) riskFactors++;

    // Check for suspicious patterns in text
    const suspiciousPatterns = [
      /too good to be true/i,
      /limited time only/i,
      /act now/i,
      /clearance sale/i,
    ];

    const text = `${product.title} ${product.description}`.toLowerCase();
    if (suspiciousPatterns.some((pattern) => pattern.test(text))) riskFactors++;

    let textScamKeywordsRisk = this.analyzeTextForScamKeywords(text);

    return (riskFactors + textScamKeywordsRisk) / totalFactors;
  }

  private analyzeTextForScamKeywords(text: string): number {
    let scamKeywordRiskFactor = 0;
    const scamKeywordMatches = SecurityAnalyzer.SCAM_KEYWORDS.filter(
      (keyword) => text.includes(keyword)
    ).length;
    scamKeywordRiskFactor = Math.min(
      1,
      scamKeywordMatches / SecurityAnalyzer.SCAM_KEYWORDS.length
    );
    return scamKeywordRiskFactor;
  }

  private calculateOverallRisk(
    sellerRisk: number,
    priceRisk: number,
    listingRisk: number
  ): number {
    return (
      (1 - sellerRisk) * SecurityAnalyzer.RISK_WEIGHTS.SELLER_HISTORY +
      priceRisk * SecurityAnalyzer.RISK_WEIGHTS.PRICE_ANOMALY +
      listingRisk * SecurityAnalyzer.RISK_WEIGHTS.LISTING_QUALITY
    );
  }

  private async generateWarnings(product: Product): Promise<string[]> {
    const warnings: string[] = [];

    // Seller warnings
    const sellerRating = await Storage.getSellerRating(product.seller.id);
    if (!sellerRating) {
      warnings.push("New seller with no rating history");
    } else if (sellerRating < 4.0) {
      warnings.push("Seller has below average ratings");
    }

    // Price warnings
    const priceHistory = await Storage.getPriceHistory(product.id);
    if (priceHistory.length > 0) {
      const avgPrice =
        priceHistory.reduce((sum, p) => sum + p.current, 0) /
        priceHistory.length;
      if (product.price.current < avgPrice * 0.5) {
        warnings.push("Price is suspiciously low compared to history");
      }
    }

    // Listing quality warnings
    if (!product.description || product.description.length < 50) {
      warnings.push("Limited product description");
    }
    if (!product.images || product.images.length === 0) {
      warnings.push("No product images available");
    }

    return warnings;
  }
}
