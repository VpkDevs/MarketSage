/**
 * Temporal Analyzer
 *
 * Tracks seller behavior over time and detects sudden changes using
 * rolling windows. Works entirely with local chrome.storage data, so it
 * builds up accuracy as the user browses over time.
 *
 * Detects:
 *   - Rating drops   (7-day window)
 *   - Review spikes  (24-hour window)
 *   - Listing spikes (7-day window)
 *   - Increasing risk-score trend (30-day window)
 */

import { Storage } from '../../utils/storage';
import {
  SellerSnapshot,
  TemporalSellerData,
  TemporalSignal,
  TemporalAnalysisResult,
} from '../../types/scamDetection';

const MS_PER_DAY = 86_400_000;

export class TemporalAnalyzer {
  // Thresholds for anomaly detection
  private static readonly RATING_DROP_THRESHOLD = 0.3;      // 0.3 stars in 7d
  private static readonly REVIEW_SPIKE_MULTIPLIER = 2.0;    // 2× in 24h
  private static readonly LISTING_SPIKE_MULTIPLIER = 3.0;   // 3× in 7d
  private static readonly RISK_TREND_THRESHOLD = 0.2;       // +0.2 risk over 30d

  /**
   * Record a new snapshot of the seller's current state.
   * Call this each time a listing for the seller is analysed.
   */
  async recordSnapshot(
    sellerId: string,
    snapshot: Omit<SellerSnapshot, 'timestamp'>
  ): Promise<void> {
    const now = Date.now();
    const existing = await Storage.getTemporalSellerData(sellerId);

    const newSnapshot: SellerSnapshot = { ...snapshot, timestamp: now };

    if (existing) {
      existing.snapshots.push(newSnapshot);
      // Keep at most 90 days of snapshots (cap at ~180 entries for performance)
      const cutoff = now - 90 * MS_PER_DAY;
      existing.snapshots = existing.snapshots
        .filter(s => s.timestamp >= cutoff)
        .slice(-180);
      existing.lastUpdated = now;
      await Storage.saveTemporalSellerData(existing);
    } else {
      await Storage.saveTemporalSellerData({
        sellerId,
        snapshots: [newSnapshot],
        lastUpdated: now,
      });
    }
  }

  /**
   * Analyse the stored history for the seller and return any detected signals.
   */
  async analyze(sellerId: string): Promise<TemporalAnalysisResult> {
    const data = await Storage.getTemporalSellerData(sellerId);

    if (!data || data.snapshots.length < 2) {
      return { signals: [], riskScore: 0, hasTemporalData: !!data };
    }

    const signals: TemporalSignal[] = [];
    const now = Date.now();

    // Sort ascending
    const sorted = [...data.snapshots].sort((a, b) => a.timestamp - b.timestamp);
    const latest = sorted[sorted.length - 1];

    // ── 24-hour review spike ─────────────────────────────────────────────────
    const day1Cutoff = now - MS_PER_DAY;
    const before24h = sorted.filter(s => s.timestamp < day1Cutoff);
    if (before24h.length > 0) {
      const prevReviewCount = before24h[before24h.length - 1].reviewCount;
      if (
        prevReviewCount > 0 &&
        latest.reviewCount >= prevReviewCount * TemporalAnalyzer.REVIEW_SPIKE_MULTIPLIER
      ) {
        const changePercent =
          ((latest.reviewCount - prevReviewCount) / prevReviewCount) * 100;
        signals.push({
          type: 'review_spike',
          severity: Math.min(1.0, changePercent / 200),
          description: `Review count jumped ${changePercent.toFixed(0)}% in the last 24 hours`,
          windowDays: 1,
          changePercent,
        });
      }
    }

    // ── 7-day rating drop ────────────────────────────────────────────────────
    const day7Cutoff = now - 7 * MS_PER_DAY;
    const before7d = sorted.filter(s => s.timestamp < day7Cutoff);
    if (before7d.length > 0) {
      const prevRating = before7d[before7d.length - 1].rating;
      const ratingDrop = prevRating - latest.rating;
      if (ratingDrop >= TemporalAnalyzer.RATING_DROP_THRESHOLD) {
        const changePercent = (ratingDrop / prevRating) * 100;
        signals.push({
          type: 'rating_drop',
          severity: Math.min(1.0, ratingDrop / 1.5),
          description: `Seller rating dropped ${ratingDrop.toFixed(2)} stars in the last 7 days`,
          windowDays: 7,
          changePercent,
        });
      }
    }

    // ── 7-day listing spike ──────────────────────────────────────────────────
    const before7dListing = sorted.filter(s => s.timestamp < day7Cutoff);
    if (before7dListing.length > 0) {
      const prevListings = before7dListing[before7dListing.length - 1].listingCount;
      if (
        prevListings > 0 &&
        latest.listingCount >= prevListings * TemporalAnalyzer.LISTING_SPIKE_MULTIPLIER
      ) {
        const changePercent =
          ((latest.listingCount - prevListings) / prevListings) * 100;
        signals.push({
          type: 'listing_spike',
          severity: Math.min(1.0, changePercent / 300),
          description: `Listing count jumped ${changePercent.toFixed(0)}% in the last 7 days`,
          windowDays: 7,
          changePercent,
        });
      }
    }

    // ── 30-day risk score trend ──────────────────────────────────────────────
    const day30Cutoff = now - 30 * MS_PER_DAY;
    const last30d = sorted.filter(s => s.timestamp >= day30Cutoff);
    if (last30d.length >= 3) {
      const avgEarlyRisk =
        last30d
          .slice(0, Math.ceil(last30d.length / 2))
          .reduce((s, x) => s + x.riskScore, 0) /
        Math.ceil(last30d.length / 2);
      const avgLateRisk =
        last30d
          .slice(Math.ceil(last30d.length / 2))
          .reduce((s, x) => s + x.riskScore, 0) /
        Math.floor(last30d.length / 2);
      const riskIncrease = avgLateRisk - avgEarlyRisk;

      if (riskIncrease >= TemporalAnalyzer.RISK_TREND_THRESHOLD) {
        const changePercent =
          avgEarlyRisk > 0 ? (riskIncrease / avgEarlyRisk) * 100 : 100;
        signals.push({
          type: 'risk_trend_up',
          severity: Math.min(1.0, riskIncrease / 0.5),
          description: `Seller risk score has been consistently increasing over the past 30 days`,
          windowDays: 30,
          changePercent,
        });
      }
    }

    // Aggregate risk from temporal signals
    const riskScore =
      signals.length === 0
        ? 0
        : Math.min(
            1.0,
            signals.reduce((sum, s) => sum + s.severity, 0) / signals.length
          );

    return { signals, riskScore, hasTemporalData: true };
  }

  /** Build a TemporalSellerData object from raw snapshots (for testing). */
  static buildTemporalData(
    sellerId: string,
    snapshots: SellerSnapshot[]
  ): TemporalSellerData {
    return { sellerId, snapshots, lastUpdated: Date.now() };
  }
}
