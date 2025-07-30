import { Anomaly, Product } from "../../types";

export class AnomalyDetectionEngine {
  async detectAnomalies(product: Product): Promise<{
    score: number;
    anomalies: Anomaly[];
  }> {
    // This is a mock implementation for testing
    const anomalies: Anomaly[] = [];
    let score = 0;
    
    // Check for price anomalies
    if (product.price && product.price.market) {
      const priceRatio = product.price.current / product.price.market;
      
      if (priceRatio < 0.5) {
        // Price is less than 50% of market price
        score = 0.8;
        anomalies.push({
          type: 'PRICE_ANOMALY',
          severity: 0.8,
          description: `Price is suspiciously low (${Math.round(priceRatio * 100)}% of market price)`
        });
      } else if (priceRatio > 1.5) {
        // Price is more than 150% of market price
        score = 0.6;
        anomalies.push({
          type: 'PRICE_ANOMALY',
          severity: 0.6,
          description: `Price is unusually high (${Math.round(priceRatio * 100)}% of market price)`
        });
      }
    }
    
    // Check for suspicious discounts
    if (product.price && product.price.original && product.price.current) {
      const discountRatio = 1 - (product.price.current / product.price.original);
      
      if (discountRatio > 0.7) {
        // Discount is more than 70%
        score = Math.max(score, 0.7);
        anomalies.push({
          type: 'DISCOUNT_ANOMALY',
          severity: 0.7,
          description: `Unusually high discount (${Math.round(discountRatio * 100)}% off)`
        });
      }
    }
    
    return { score, anomalies };
  }
}
