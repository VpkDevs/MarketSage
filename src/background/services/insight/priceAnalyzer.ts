import { Storage } from '../../../common/utils/storage';
import { Product, Price } from '../../../common/types';

export interface PriceAnalytics {
  currentPrice: number;
  marketAverage: number;
  priceHistory: Array<{
    price: number;
    timestamp: string;
  }>;
  valueScore: number;
  trend: 'rising' | 'falling' | 'stable';
  recommendations: string[];
}

export class PriceAnalyzer {
  private static readonly VALUE_THRESHOLDS = {
    EXCELLENT: 0.8,
    GOOD: 0.6,
    FAIR: 0.4,
    POOR: 0.2
  };

  async analyzePrices(product: Product): Promise<PriceAnalytics> {
    const historicalData = await Storage.getPriceHistory(product.id);
    const marketComparison = await this.getMarketComparison(product);
    
    return {
      anomalyScore: this.calculateAnomalyScore(product.price, historicalData),
      marketPosition: this.calculateMarketPosition(product.price, marketComparison),
      priceHistory: historicalData,
      recommendations: this.generatePriceRecommendations(product, marketComparison)
    };
  }

  private async getPriceHistory(productId: string): Promise<Array<Price & { timestamp: string }>> {
    const history = await Storage.getPriceHistory(productId);
    return history.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  private async getMarketData(product: Product): Promise<Array<Product & { timestamp: string }>> {
    const cache = await Storage.getProductCache();
    return Object.values(cache).filter(p => 
      p.platform === product.platform && 
      this.isSimilarProduct(p, product)
    );
  }

  private async calculateMarketAverage(product: Product): Promise<number> {
    const marketData = await this.getMarketData(product);
    if (marketData.length === 0) return product.price.current;

    const prices = marketData.map(p => p.price.current);
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  private calculateValueScore(
    currentPrice: number,
    marketAverage: number,
    product: Product
  ): number {
    // Base score on price comparison
    let score = marketAverage / currentPrice;

    // Adjust for product quality factors
    if (product.seller.rating) {
      score *= (1 + (product.seller.rating - 3) * 0.1); // Adjust ±10% per rating point from 3
    }

    // Normalize to 0-1 range
    return Math.min(Math.max(score, 0), 1);
  }

  private analyzePriceTrend(
    history: Array<Price & { timestamp: string }>
  ): 'rising' | 'falling' | 'stable' {
    if (history.length < 2) return 'stable';

    const recentPrices = history.slice(-3); // Look at last 3 prices
    const priceChanges = recentPrices.slice(1).map((entry, index) => 
      entry.current - recentPrices[index].current
    );

    const averageChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const changeThreshold = recentPrices[0].current * 0.05; // 5% change threshold

    if (averageChange > changeThreshold) return 'rising';
    if (averageChange < -changeThreshold) return 'falling';
    return 'stable';
  }

  private generateRecommendations(
    currentPrice: number,
    marketAverage: number,
    valueScore: number,
    trend: 'rising' | 'falling' | 'stable'
  ): string[] {
    const recommendations: string[] = [];

    // Value-based recommendations
    if (valueScore > PriceAnalyzer.VALUE_THRESHOLDS.EXCELLENT) {
      recommendations.push('Excellent value - price is significantly below market average');
    } else if (valueScore > PriceAnalyzer.VALUE_THRESHOLDS.GOOD) {
      recommendations.push('Good value - price is below market average');
    } else if (valueScore < PriceAnalyzer.VALUE_THRESHOLDS.POOR) {
      recommendations.push('Consider alternatives - price is significantly above market average');
    }

    // Trend-based recommendations
    switch (trend) {
      case 'rising':
        recommendations.push('Prices are trending upward - consider buying soon');
        break;
      case 'falling':
        recommendations.push('Prices are trending downward - consider waiting for better deals');
        break;
      case 'stable':
        if (currentPrice < marketAverage) {
          recommendations.push('Price is stable and favorable - good time to buy');
        }
        break;
    }

    return recommendations;
  }

  private isSimilarProduct(p1: Product, p2: Product): boolean {
    // Simple similarity check based on title
    const words1 = new Set(p1.title.toLowerCase().split(/\s+/));
    const words2 = new Set(p2.title.toLowerCase().split(/\s+/));
    
    // Calculate Jaccard similarity
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size > 0.3; // 30% similarity threshold
  }
}
