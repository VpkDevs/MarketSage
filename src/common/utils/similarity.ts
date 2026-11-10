/**
 * Title-similarity helpers shared by the Insight price analyzer (market
 * average over similar viewed products) and Scout product discovery
 * (recommendations similar to the listing being viewed).
 *
 * The metric is Jaccard similarity over lower-cased title word sets —
 * simple, deterministic, and explainable: two listings are "similar"
 * when their titles share enough vocabulary.
 */

export function tokenizeTitle(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

/** Jaccard similarity of two titles, 0..1. */
export function titleSimilarity(a: string, b: string): number {
  const wordsA = tokenizeTitle(a);
  const wordsB = tokenizeTitle(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/** The similarity bar the price analyzer has always used for "similar". */
export const SIMILARITY_THRESHOLD = 0.3;

export function isSimilarTitle(a: string, b: string, threshold = SIMILARITY_THRESHOLD): boolean {
  return titleSimilarity(a, b) > threshold;
}
