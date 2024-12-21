import { ProductExtractor } from '../../../src/content/services/productExtractor';
import { Platform, Product } from '../../../src/common/types';

describe('ProductExtractor', () => {
  let extractor: ProductExtractor;
  let mockHtml: string;

  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = new URL('https://www.temu.com/product-123') as any;

    // Setup mock HTML
    mockHtml = `
      <div>
        <meta property="product:id" content="123456" />
        <h1 class="product-title">Test Product</h1>
        <div class="product-price">$29.99</div>
        <div class="original-price">$39.99</div>
        <div class="product-description">Product description text</div>
        <div class="seller-name">Test Seller</div>
        <div class="seller-rating">4.5</div>
        <div class="product-gallery">
          <img src="image1.jpg" alt="Product Image 1" />
          <img src="image2.jpg" alt="Product Image 2" />
        </div>
        <a href="/store/12345">Visit Store</a>
      </div>
    `;

    document.body.innerHTML = mockHtml;
    extractor = new ProductExtractor();
  });

  describe('extract', () => {
    it('should extract complete product information', async () => {
      const product = await extractor.extract();

      expect(product).toBeDefined();
      expect(product.id).toBe('123456');
      expect(product.title).toBeTruthy();
      expect(product.price).toBeDefined();
      expect(product.price.current).toBeGreaterThan(0);
      expect(product.images.length).toBeGreaterThan(0);
      expect(product.seller).toBeDefined();
      expect(product.platform).toBe(Platform.TEMU);
      expect(product.url).toBe('https://www.temu.com/product-123');
    });

    it('should handle missing product information gracefully', async () => {
      document.body.innerHTML = '<div></div>';
      const product = await extractor.extract();

      expect(product).toBeDefined();
      expect(product.id).toBe('unknown');
      expect(product.title).toBe('');
      expect(product.price.current).toBe(0);
      expect(product.images).toEqual([]);
      expect(product.seller.name).toBe('Unknown Seller');
    });

    it('should throw error for unsupported platforms', async () => {
      window.location = new URL('https://www.unsupported.com/product') as any;
      extractor = new ProductExtractor();

      await expect(extractor.extract()).rejects.toThrow('Unsupported platform');
    });
  });

  describe('extractProductId', () => {
    it('should extract ID from meta tag', async () => {
      const product = await extractor.extract();
      expect(product.id).toBe('123456');
    });

    it('should extract ID from URL parameters', async () => {
      document.body.innerHTML = '<div></div>'; // Remove meta tag
      window.location = new URL('https://www.temu.com/product?id=789') as any;
      const product = await extractor.extract();
      expect(product.id).toBe('789');
    });

    it('should extract ID from pathname', async () => {
      document.body.innerHTML = '<div></div>'; // Remove meta tag
      window.location = new URL('https://www.temu.com/product/abc123') as any;
      const product = await extractor.extract();
      expect(product.id).toBe('abc123');
    });
  });

  describe('extractSeller', () => {
    it('should extract seller information', async () => {
      const product = await extractor.extract();
      
      expect(product.seller).toBeDefined();
      expect(product.seller.name).toBe('Test Seller');
      expect(product.seller.rating).toBe(4.5);
    });

    it('should extract seller ID from store link', async () => {
      const product = await extractor.extract();
      expect(product.seller.id).toBe('12345');
    });
  });

  describe('extractImages', () => {
    it('should extract unique image URLs', async () => {
      const product = await extractor.extract();
      
      expect(product.images).toHaveLength(2);
      expect(product.images).toContain('image1.jpg');
      expect(product.images).toContain('image2.jpg');
    });

    it('should filter out placeholder images', async () => {
      document.body.innerHTML = `
        <div class="product-gallery">
          <img src="image1.jpg" />
          <img src="placeholder.jpg" />
          <img src="" />
        </div>
      `;

      const product = await extractor.extract();
      expect(product.images).toHaveLength(1);
      expect(product.images[0]).toBe('image1.jpg');
    });
  });
});
