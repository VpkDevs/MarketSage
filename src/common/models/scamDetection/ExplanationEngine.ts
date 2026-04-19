/**
 * Explanation Engine
 *
 * Generates structured and human-readable explanations for every fraud
 * detection decision so users understand *why* a listing was flagged.
 *
 * Output example (human-readable):
 *   "Flagged due to:
 *    • Price 65% below market average
 *    • Seller account age < 7 days
 *    • Review spike detected in 24-hour window"
 */

import {
  HeuristicResult,
  TriggeredInteractionRule,
  TemporalSignal,
  Explanation,
  SignalExplanation,
  ConfidenceScore,
} from '../../types/scamDetection';

export interface ExplanationInput {
  results: HeuristicResult[];
  triggeredRules: TriggeredInteractionRule[];
  temporalSignals: TemporalSignal[];
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: ConfidenceScore;
}

export class ExplanationEngine {
  /**
   * Generate a full explanation for a fraud detection result.
   */
  generate(input: ExplanationInput): Explanation {
    const topSignals = this.buildTopSignals(input.results);
    const triggeredRuleNames = input.triggeredRules.map(r => r.ruleName);
    const keyAnomalies = this.collectAnomalies(input.results, input.temporalSignals);
    const summary = this.buildSummary(input.riskLevel, input.probability, input.confidence);
    const humanReadable = this.buildHumanReadable(
      input.riskLevel,
      topSignals,
      triggeredRuleNames,
      keyAnomalies,
      input.temporalSignals
    );

    return {
      summary,
      topSignals,
      triggeredRules: triggeredRuleNames,
      keyAnomalies,
      humanReadable,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildTopSignals(results: HeuristicResult[]): SignalExplanation[] {
    const enabled = results.filter(r => r.enabled && r.score > 0);

    // Total weighted score across all enabled signals
    const totalWeightedScore = enabled.reduce(
      (sum, r) => sum + r.score * r.weight,
      0
    );

    const signalExplanations: SignalExplanation[] = enabled.map(r => ({
      signal: r.heuristicId,
      signalName: r.name,
      score: r.score,
      contributionPercent:
        totalWeightedScore > 0
          ? Math.round((r.score * r.weight) / totalWeightedScore * 100)
          : 0,
      topFindings: r.findings.slice(0, 3),
    }));

    // Return top 3 by contribution
    return signalExplanations
      .sort((a, b) => b.contributionPercent - a.contributionPercent)
      .slice(0, 3);
  }

  private collectAnomalies(
    results: HeuristicResult[],
    temporalSignals: TemporalSignal[]
  ): string[] {
    const anomalies: string[] = [];

    // High-score heuristic findings
    for (const r of results) {
      if (r.enabled && r.score >= 0.6) {
        anomalies.push(...r.findings.slice(0, 2));
      }
    }

    // Temporal signals
    for (const signal of temporalSignals) {
      if (signal.severity >= 0.4) {
        anomalies.push(signal.description);
      }
    }

    // Deduplicate
    return [...new Set(anomalies)].slice(0, 8);
  }

  private buildSummary(
    riskLevel: string,
    probability: number,
    confidence: ConfidenceScore
  ): string {
    const pct = Math.round(probability * 100);
    return (
      `${riskLevel} risk (${pct}% probability) with ${confidence.level} confidence. ` +
      `Confidence score: ${Math.round(confidence.score * 100)}%.`
    );
  }

  private buildHumanReadable(
    riskLevel: string,
    topSignals: SignalExplanation[],
    triggeredRuleNames: string[],
    keyAnomalies: string[],
    temporalSignals: TemporalSignal[]
  ): string {
    const lines: string[] = [];

    // Opening
    const opener: Record<string, string> = {
      CRITICAL: '⛔ CRITICAL RISK – This listing has multiple strong fraud indicators.',
      HIGH: '🚨 HIGH RISK – This listing shows significant fraud signals.',
      MEDIUM: '⚠️ MEDIUM RISK – Some suspicious patterns detected.',
      LOW: 'ℹ️ LOW RISK – Minor anomalies noted.',
    };
    lines.push(opener[riskLevel] ?? `Risk level: ${riskLevel}.`);

    if (topSignals.length > 0 || keyAnomalies.length > 0) {
      lines.push('');
      lines.push('Flagged due to:');

      for (const signal of topSignals) {
        lines.push(`• [${signal.signalName}] ${signal.topFindings[0] ?? signal.signal} (${signal.contributionPercent}% of risk)`);
      }

      for (const anomaly of keyAnomalies.slice(0, 3)) {
        if (!topSignals.some(s => s.topFindings.includes(anomaly))) {
          lines.push(`• ${anomaly}`);
        }
      }
    }

    if (temporalSignals.length > 0) {
      lines.push('');
      lines.push('Behavioral changes detected:');
      for (const signal of temporalSignals) {
        lines.push(`• ${signal.description}`);
      }
    }

    if (triggeredRuleNames.length > 0) {
      lines.push('');
      lines.push('Triggered fraud patterns:');
      for (const name of triggeredRuleNames) {
        lines.push(`• ${name}`);
      }
    }

    return lines.join('\n');
  }
}
