import { Storage } from '../../../common/utils/storage';
import { Product, Price } from '../../../common/types';
import { isSimilarTitle } from '../../../common/utils/similarity';

export interface PriceAnalytics {
  currentPrice: number;
  marketAverage: number;
  /**
   * How many similar viewed products the market average is computed
   * from (including the product itself when it is in the cache).
   * 0 or 1 means there is no real comparison set yet — callers must not
   * present the "market average" as a market measurement in that case.
   */
  marketSampleSize: number;
  priceHistory: Array<{
    price: number;
    timestamp: string;
  }>;
  /** 0..1 — higher means better value vs. the comparison set. */
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
    // Compose the declared PriceAnalytics shape from this class's
    // existing building blocks (this method previously called four
    // helper methods that never existed on the class).
    const history = await this.getPriceHistory(product.id);
    const marketData = await this.getMarketData(product);
    const marketAverage = marketData.length === 0
      ? product.price.current
      : marketData.reduce((sum, p) => sum + p.price.current, 0) / marketData.length;
    const valueScore = this.calculateValueScore(product.price.current, marketAverage, product);
    const trend = this.analyzePriceTrend(history);

    return {
      currentPrice: product.price.current,
      marketAverage,
      marketSampleSize: marketData.length,
      priceHistory: history.map(entry => ({
        price: entry.current,
        timestamp: entry.timestamp
      })),
      valueScore,
      trend,
      recommendations: this.generateRecommendations(
        product.price.current,
        marketAverage,
        valueScore,
        trend
      )
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

  private calculateValueScore(
    currentPrice: number,
    marketAverage: number,
    product: Product
  ): number {
    // Base score on price comparison
    let score = marketAverage / currentPrice;

    // Adjust for product quality factors
    if (product.seller?.rating) {
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
    // Shared title-similarity helper (see common/utils/similarity):
    // Jaccard similarity over title words, 30% threshold — the same
    // rule this class has always applied, now shared with Scout.
    return isSimilarTitle(p1.title, p2.title);
  }
}
