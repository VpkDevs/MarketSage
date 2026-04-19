import { computeDHash, hammingDistance, ImageAnalysisEngine } from '../../../src/common/models/scamDetection/imageAnalysis';
import { Storage } from '../../../src/common/utils/storage';

jest.mock('../../../src/common/utils/storage');

// ── Testable subclass that bypasses canvas/Image API ─────────────────────────

class TestableImageAnalysisEngine extends ImageAnalysisEngine {
  private pixelData: Map<string, { data: number[]; width: number; height: number } | null>;

  constructor(pixelData: Map<string, { data: number[]; width: number; height: number } | null> = new Map()) {
    super();
    this.pixelData = pixelData;
  }

  protected override async loadImagePixels(
    url: string
  ): Promise<{ data: number[]; width: number; height: number } | null> {
    return this.pixelData.get(url) ?? null;
  }
}

// Helper: generate a 9×8 uniform grayscale grid
function uniformPixels(value: number): number[] {
  return Array(9 * 8).fill(value);
}

// Helper: generate pixels that produce a known hash (all increasing → all 1-bits)
function ascendingPixels(): number[] {
  const pixels: number[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 9; col++) {
      pixels.push(col * 10); // each column brighter than the last
    }
  }
  return pixels;
}

describe('dHash utilities', () => {
  describe('computeDHash()', () => {
    it('returns a 16-character hex string', () => {
      const hash = computeDHash(uniformPixels(128), 8, 8);
      expect(hash).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
    });

    it('returns the same hash for identical pixel arrays', () => {
      const pixels = ascendingPixels();
      const h1 = computeDHash(pixels, 8, 8);
      const h2 = computeDHash(pixels, 8, 8);
      expect(h1).toBe(h2);
    });

    it('produces all-zero hash for uniform pixels (no differences)', () => {
      // Uniform brightness → no left < right → all 0 bits
      const hash = computeDHash(uniformPixels(100), 8, 8);
      expect(hash).toBe('0000000000000000');
    });

    it('produces a non-zero hash for ascending brightness', () => {
      const hash = computeDHash(ascendingPixels(), 8, 8);
      // All bits should be 1 → ffff...
      expect(hash).toBe('ffffffffffffffff');
    });
  });

  describe('hammingDistance()', () => {
    it('returns 0 for identical hashes', () => {
      const h = 'abcd1234abcd1234';
      expect(hammingDistance(h, h)).toBe(0);
    });

    it('returns 64 for completely opposite hashes', () => {
      expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64);
    });

    it('counts differing bits correctly', () => {
      // 0x0 vs 0x1 → 1 bit difference
      const dist = hammingDistance('0000000000000000', '0000000000000001');
      expect(dist).toBe(1);
    });

    it('throws when hash lengths differ', () => {
      expect(() => hammingDistance('0000', '00000000')).toThrow();
    });
  });
});

describe('ImageAnalysisEngine', () => {
  let engine: TestableImageAnalysisEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    (Storage.getImageHashRegistry as jest.Mock).mockResolvedValue({});
    (Storage.saveImageHashEntry as jest.Mock).mockResolvedValue(undefined);
  });

  describe('analyzeProductImages()', () => {
    it('flags NO_IMAGES when image list is empty', async () => {
      engine = new TestableImageAnalysisEngine();
      const result = await engine.analyzeProductImages([], 'Test Product');

      expect(result.issues.some(i => i.type === 'NO_IMAGES')).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(0.8);
    });

    it('flags INSUFFICIENT_IMAGES for single image', async () => {
      engine = new TestableImageAnalysisEngine(
        new Map([['img1.jpg', null]])  // loadImagePixels returns null
      );
      const result = await engine.analyzeProductImages(['img1.jpg'], 'Test');

      expect(result.issues.some(i => i.type === 'INSUFFICIENT_IMAGES')).toBe(true);
    });

    it('computes and stores a hash for a loadable image', async () => {
      const pixels = ascendingPixels();
      engine = new TestableImageAnalysisEngine(
        new Map([['img1.jpg', { data: pixels, width: 8, height: 8 }]])
      );

      const result = await engine.analyzeProductImages(
        ['img1.jpg', 'img2.jpg'],
        'Test',
        undefined,
        'seller-1',
        'aliexpress'
      );

      expect(result.imageHashes.length).toBeGreaterThan(0);
      expect(result.imageHashes[0]).toHaveLength(16);
    });

    it('flags REUSED_IMAGE when hash already in registry from other sellers', async () => {
      const pixels = ascendingPixels();
      const hash = computeDHash(pixels, 8, 8);

      (Storage.getImageHashRegistry as jest.Mock).mockResolvedValue({
        [hash]: {
          hash,
          sellers: ['other-seller-1', 'other-seller-2'],
          platforms: ['aliexpress'],
          firstSeen: Date.now(),
          occurrences: 3,
        },
      });

      engine = new TestableImageAnalysisEngine(
        new Map([['img1.jpg', { data: pixels, width: 8, height: 8 }]])
      );

      const result = await engine.analyzeProductImages(
        ['img1.jpg', 'img2.jpg'],
        'Test',
        undefined,
        'new-seller',
        'aliexpress'
      );

      expect(result.hashMatches).toBeGreaterThan(0);
      expect(result.reusedImageUrls).toContain('img1.jpg');
      expect(result.issues.some(i => i.type === 'REUSED_IMAGE')).toBe(true);
    });

    it('flags CATEGORY_IMAGE_MISMATCH for high-value electronics with few images', async () => {
      engine = new TestableImageAnalysisEngine(
        new Map([['img1.jpg', null]])
      );

      const result = await engine.analyzeProductImages(
        ['img1.jpg'],
        'Apple MacBook Pro 16 inch',
        undefined,
        'seller-1'
      );

      expect(result.issues.some(i => i.type === 'CATEGORY_IMAGE_MISMATCH')).toBe(true);
    });

    it('returns score 0 and no issues for a clean listing with multiple images', async () => {
      const pixels = uniformPixels(100);
      const map = new Map<string, any>([
        ['img1.jpg', { data: pixels, width: 8, height: 8 }],
        ['img2.jpg', { data: pixels, width: 8, height: 8 }],
        ['img3.jpg', { data: pixels, width: 8, height: 8 }],
      ]);

      engine = new TestableImageAnalysisEngine(map);
      const result = await engine.analyzeProductImages(
        ['img1.jpg', 'img2.jpg', 'img3.jpg'],
        'Generic Widget'
      );

      expect(result.score).toBe(0);
      expect(result.issues.filter(i =>
        ['NO_IMAGES', 'INSUFFICIENT_IMAGES', 'REUSED_IMAGE', 'BRAND_NOT_VISIBLE'].includes(i.type)
      )).toHaveLength(0);
    });
  });
});
