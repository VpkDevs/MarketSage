/**
 * Insight price alerts — deterministic, from real recorded data.
 *
 * Each insight is computed from the product's own recorded price
 * history and the PriceAnalyzer output for the current page:
 *
 * - price_drop / price_increase: the current price vs. the previous
 *   recorded price for this same product, when it moved at least 5%.
 * - deal_alert: the value score is in the analyzer's "excellent" band
 *   AND the market average behind it rests on at least one other viewed
 *   product (a one-item "market" proves nothing, so no alert is made).
 * - market_trend: the analyzer's trend over the recorded history, when
 *   at least 3 observations exist.
 *
 * Nothing here is estimated, predicted, or fetched: no seasonal
 * forecasts, no competitor prices, no confidence percentages. If the
 * recorded data does not support an insight, none is produced.
 */
import { Product } from '../../../common/types';
import { PriceAnalytics } from './priceAnalyzer';

export interface PriceInsight {
  id: string;
  type: 'price_drop' | 'price_increase' | 'deal_alert' | 'market_trend';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  /** ISO timestamp of the moment the insight was computed. */
  timestamp: string;
}

export const PRICE_MOVE_THRESHOLD_PERCENT = 5;

interface HistoryPoint {
  price: number;
  timestamp: string;
}

export function buildPriceInsights(
  product: Product,
  analytics: PriceAnalytics,
  history: HistoryPoint[],
  now: Date = new Date()
): PriceInsight[] {
  const insights: PriceInsight[] = [];
  const timestamp = now.toISOString();
  const current = analytics.currentPrice;

  // --- Move vs. the previous recorded price for this product ----------
  if (history.length >= 2) {
    const previous = history[history.length - 2].price;
    if (previous > 0) {
      const changePercent = ((current - previous) / previous) * 100;
      if (changePercent <= -PRICE_MOVE_THRESHOLD_PERCENT) {
        insights.push({
          id: 'price_drop',
          type: 'price_drop',
          title: 'Price drop since your last visit',
          description:
            `This listing was $${previous.toFixed(2)} the last time MarketSage recorded it ` +
            `and is $${current.toFixed(2)} now — a drop of ${Math.abs(changePercent).toFixed(1)}%.`,
          impact: changePercent <= -15 ? 'high' : 'medium',
          timestamp
        });
      } else if (changePercent >= PRICE_MOVE_THRESHOLD_PERCENT) {
        insights.push({
          id: 'price_increase',
          type: 'price_increase',
          title: 'Price increase since your last visit',
          description:
            `This listing was $${previous.toFixed(2)} the last time MarketSage recorded it ` +
            `and is $${current.toFixed(2)} now — an increase of ${changePercent.toFixed(1)}%.`,
          impact: changePercent >= 15 ? 'high' : 'medium',
          timestamp
        });
      }
    }
  }

  // --- Strong value vs. similar viewed products -----------------------
  // marketSampleSize includes the product itself when cached, so >= 2
  // means at least one *other* viewed product backs the average.
  if (analytics.valueScore >= 0.8 && analytics.marketSampleSize >= 2) {
    insights.push({
      id: 'deal_alert',
      type: 'deal_alert',
      title: 'Strong value vs. similar listings you have viewed',
      description:
        `At $${current.toFixed(2)}, this listing sits well below the $${analytics.marketAverage.toFixed(2)} ` +
        `average of ${analytics.marketSampleSize} similar products MarketSage has seen in your browsing.`,
      impact: 'medium',
      timestamp
    });
  }

  // --- Trend over the recorded history --------------------------------
  if (history.length >= 3 && analytics.trend !== 'stable') {
    const first = history[0].price;
    insights.push({
      id: 'market_trend',
      type: 'market_trend',
      title: analytics.trend === 'falling' ? 'Recorded prices are trending down' : 'Recorded prices are trending up',
      description:
        `Across the ${history.length} prices MarketSage has recorded for this product ` +
        `(from $${first.toFixed(2)} to $${current.toFixed(2)}), the direction is ${analytics.trend}. ` +
        `This describes the past only — it is not a forecast.`,
      impact: 'low',
      timestamp
    });
  }

  return insights;
}
