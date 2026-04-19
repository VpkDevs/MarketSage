/**
 * Enhanced Image Analysis Engine
 *
 * Upgrades the basic image-quality check to include:
 *   1. Perceptual difference-hashing (dHash) for near-duplicate detection
 *   2. Image-reuse tracking via the storage image hash registry
 *   3. Mismatch detection (image count vs. category expectations)
 *   4. Stock-image heuristics (too few images for high-value items)
 *
 * dHash algorithm:
 *   - Conceptually resize image to (width+1) × height grid
 *   - Compare adjacent pixel brightnesses left-to-right
 *   - Output a 64-bit hash as a 16-char hex string
 *
 * Because image loading requires a browser Canvas API unavailable in
 * Jest/jsdom, the `loadImagePixels` method is protected and can be overridden
 * in tests to inject synthetic pixel data.
 */

import { ImageIssue } from "../../types";
import { Storage } from "../../utils/storage";

export interface EnhancedImageResult {
  score: number;
  issues: ImageIssue[];
  /** dHash hex strings for each successfully hashed image */
  imageHashes: string[];
  /** URLs whose hash collided with a stored registry entry */
  reusedImageUrls: string[];
  /** Number of registry hash matches found */
  hashMatches: number;
}

// ── dHash implementation ──────────────────────────────────────────────────────

/** ITU-R BT.601 luma coefficients for RGB → grayscale conversion. */
const R_WEIGHT = 0.299;
const G_WEIGHT = 0.587;
const B_WEIGHT = 0.114;

/**
 * Compute the dHash of an image from its grayscale pixel values.
 *
 * @param pixels  Flat array of grayscale values (0–255), row-major.
 *                Expected length: (width + 1) * height
 * @param width   Number of comparison columns (pixel grid width – 1).
 * @param height  Number of rows in the pixel grid.
 * @returns 16-character hex string representing the 64-bit hash.
 */
export function computeDHash(
  pixels: number[],
  width: number,
  height: number
): string {
  let bits = '';
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const left = pixels[row * (width + 1) + col];
      const right = pixels[row * (width + 1) + col + 1];
      bits += left < right ? '1' : '0';
    }
  }

  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex.padStart(16, '0');
}

/**
 * Hamming distance between two dHash hex strings.
 * Returns the number of differing bits (lower = more similar).
 */
export function hammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) {
    throw new Error('Hash lengths must match');
  }
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    const xor = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    distance += (xor >>> 3 & 1) + (xor >>> 2 & 1) + (xor >>> 1 & 1) + (xor & 1);
  }
  return distance;
}

/** Two hashes are considered near-duplicates when Hamming distance ≤ this.
 *  A threshold of 10 bits (out of 64) allows for minor JPEG compression
 *  artefacts and slight resizing while still catching visually identical images.
 */
const NEAR_DUPLICATE_THRESHOLD = 10;

// ── Engine ────────────────────────────────────────────────────────────────────

export class ImageAnalysisEngine {
  /**
   * Analyse product images for quality, reuse, and consistency issues.
   *
   * @param images        Array of image URLs.
   * @param productTitle  Product title (used for mismatch detection).
   * @param claimedBrand  Brand claimed by the listing (optional).
   * @param sellerId      Seller identifier (for registry tracking).
   * @param platform      Platform identifier (for registry tracking).
   */
  async analyzeProductImages(
    images: string[],
    productTitle: string,
    claimedBrand?: string,
    sellerId?: string,
    platform?: string
  ): Promise<EnhancedImageResult> {
    const issues: ImageIssue[] = [];
    const imageHashes: string[] = [];
    const reusedImageUrls: string[] = [];
    let hashMatches = 0;
    let score = 0;

    // ── Quantity check ──────────────────────────────────────────────────────
    if (images.length === 0) {
      score = Math.max(score, 0.8);
      issues.push({
        type: 'NO_IMAGES',
        description: 'Product has no images – high risk indicator',
      });
    } else if (images.length < 2) {
      score = Math.max(score, 0.6);
      issues.push({
        type: 'INSUFFICIENT_IMAGES',
        description: 'Product has too few images for a quality listing',
      });
    }

    // ── Per-image analysis ──────────────────────────────────────────────────
    const registry = await Storage.getImageHashRegistry();

    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      let hash: string | null = null;

      try {
        const pixels = await this.loadImagePixels(url);
        if (pixels) {
          hash = computeDHash(pixels.data, pixels.width, pixels.height);
          imageHashes.push(hash);
        }
      } catch {
        score = Math.max(score, 0.4);
        issues.push({
          type: 'IMAGE_LOAD_FAILURE',
          description: `Image ${i + 1} could not be loaded`,
          imageIndex: i,
        });
      }

      if (hash) {
        // Exact-match reuse check
        if (registry[hash]) {
          const entry = registry[hash];
          if (
            entry.occurrences >= 2 &&
            !entry.sellers.includes(sellerId ?? '')
          ) {
            reusedImageUrls.push(url);
            hashMatches++;
            score = Math.max(score, 0.7);
            issues.push({
              type: 'REUSED_IMAGE',
              description: `Image ${i + 1} detected on ${entry.occurrences} other listings`,
              imageIndex: i,
            });
          }
        } else {
          // Near-duplicate check
          for (const [storedHash, entry] of Object.entries(registry)) {
            if (
              entry.occurrences >= 2 &&
              hammingDistance(hash, storedHash) <= NEAR_DUPLICATE_THRESHOLD
            ) {
              reusedImageUrls.push(url);
              hashMatches++;
              score = Math.max(score, 0.6);
              issues.push({
                type: 'NEAR_DUPLICATE_IMAGE',
                description: `Image ${i + 1} is visually similar to images on other listings`,
                imageIndex: i,
              });
              break;
            }
          }
        }

        // Register / update hash in registry
        const existing = registry[hash];
        if (existing) {
          if (!existing.sellers.includes(sellerId ?? '')) {
            existing.sellers.push(sellerId ?? '');
          }
          if (!existing.platforms.includes(platform ?? '')) {
            existing.platforms.push(platform ?? '');
          }
          existing.occurrences++;
          await Storage.saveImageHashEntry(existing);
        } else {
          await Storage.saveImageHashEntry({
            hash,
            sellers: sellerId ? [sellerId] : [],
            platforms: platform ? [platform] : [],
            firstSeen: Date.now(),
            occurrences: 1,
          });
        }
      }
    }

    // ── Brand visibility check ──────────────────────────────────────────────
    if (claimedBrand && images.length > 0) {
      const brandVisible = await this.checkBrandVisibility(images, claimedBrand);
      if (!brandVisible) {
        score = Math.max(score, 0.8);
        issues.push({
          type: 'BRAND_NOT_VISIBLE',
          description: `Product claims to be "${claimedBrand}" but no brand logo is visible`,
        });
      }
    }

    // ── Category / title mismatch ───────────────────────────────────────────
    const isHighValueElectronics =
      /\b(laptop|phone|camera|gpu|iphone|macbook)\b/i.test(productTitle);
    if (isHighValueElectronics && images.length < 3) {
      score = Math.max(score, 0.5);
      issues.push({
        type: 'CATEGORY_IMAGE_MISMATCH',
        description:
          'High-value electronics listing has fewer images than expected',
      });
    }

    return { score, issues, imageHashes, reusedImageUrls, hashMatches };
  }

  /**
   * Load an image URL and return a 9×8 grid of grayscale pixel values.
   *
   * In a real browser context this uses Image + Canvas.
   * Override in tests to inject synthetic pixel data.
   */
  protected async loadImagePixels(
    url: string
  ): Promise<{ data: number[]; width: number; height: number } | null> {
    const TARGET_W = 9;
    const TARGET_H = 8;

    return new Promise(resolve => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = TARGET_W;
            canvas.height = TARGET_H;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }
            ctx.drawImage(img, 0, 0, TARGET_W, TARGET_H);
            const raw = ctx.getImageData(0, 0, TARGET_W, TARGET_H).data;
            const gray: number[] = [];
            for (let i = 0; i < raw.length; i += 4) {
              gray.push(Math.round(
                R_WEIGHT * raw[i] + G_WEIGHT * raw[i + 1] + B_WEIGHT * raw[i + 2]
              ));
            }
            resolve({ data: gray, width: TARGET_W, height: TARGET_H });
          } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      } catch { resolve(null); }
    });
  }

  /**
   * Brand-logo visibility check.
   * Stub returning true (visible) to avoid false positives.
   * Replace with a real CV model call if available.
   */
  protected async checkBrandVisibility(
    _images: string[],
    _brand: string
  ): Promise<boolean> {
    return true;
  }
}

