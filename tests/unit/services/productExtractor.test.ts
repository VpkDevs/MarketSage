import { ProductExtractor } from '../../../src/content/services/productExtractor';
import { Platform } from '../../../src/common/types';

describe('ProductExtractor', () => {
  let productExtractor: ProductExtractor;

  beforeEach(() => {
    document.body.innerHTML = '';
    productExtractor = new ProductExtractor();
  });

  describe('TEMU platform', () => {
    beforeEach(() => {
      productExtractor.setPlatform(Platform.TEMU);
      document.body.innerHTML = `
        <div>
          <h1 class="product-title">Test TEMU Product</h1>
          <div class="product-description">A great product description</div>
          <div class="price-current">$99.99</div>
          <div class="price-original">$129.99</div>
          <div class="gallery-image">
            <img src="image1.jpg" alt="Product Image 1">
            <img src="image2.jpg" alt="Product Image 2">
          </div>
          <div class="seller-name">TEMU Seller</div>
          <div class="seller-rating">4.5</div>
        </div>
      `;
      // Mock URL for product ID extraction
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://temu.com/product/123',
          pathname: '/product/123'
        },
        writable: true
      });
    });

    it('should extract complete product information', async () => {
      const product = await productExtractor.extract();
      
      expect(product).toEqual({
        id: '123',
        title: 'Test TEMU Product',
        description: 'A great product description',
        price: {
          current: 99.99,
          currency: 'USD',
          original: 129.99,
          discount: 23
        },
        images: ['image1.jpg', 'image2.jpg'],
        seller: {
          id: expect.any(String),
          name: 'TEMU Seller',
          rating: 4.5
        },
        platform: Platform.TEMU,
        url: 'https://temu.com/product/123'
      });
    });
  });

  describe('AliExpress platform', () => {
    beforeEach(() => {
      productExtractor.setPlatform(Platform.ALIEXPRESS);
      document.body.innerHTML = `
        <div>
          <h1 class="product-title-text">Test AliExpress Product</h1>
          <div class="product-description">Amazing product details</div>
          <div class="product-price-value">€89.99</div>
          <div class="product-price-original">€119.99</div>
          <div class="magnifier-image">
            <img src="image1.jpg" alt="Product Image 1">
            <img src="image2.jpg" alt="Product Image 2">
          </div>
          <div class="shop-name">AliExpress Shop</div>
          <div class="shop-rate-score">4.8</div>
        </div>
      `;
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://aliexpress.com/item/456',
          pathname: '/item/456'
        },
        writable: true
      });
    });

    it('should extract complete product information', async () => {
      const product = await productExtractor.extract();
      
      expect(product).toEqual({
        id: '456',
        title: 'Test AliExpress Product',
        description: 'Amazing product details',
        price: {
          current: 89.99,
          currency: 'EUR',
          original: 119.99,
          discount: 25
        },
        images: ['image1.jpg', 'image2.jpg'],
        seller: {
          id: expect.any(String),
          name: 'AliExpress Shop',
          rating: 4.8
        },
        platform: Platform.ALIEXPRESS,
        url: 'https://aliexpress.com/item/456'
      });
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      productExtractor.setPlatform(Platform.TEMU);
    });

    it('should handle missing elements', async () => {
      document.body.innerHTML = '<div></div>';
      const product = await productExtractor.extract();
      
      expect(product).toEqual({
        id: 'unknown',
        title: '',
        description: '',
        price: {
          current: 0,
          currency: 'USD',
          original: undefined,
          discount: undefined
        },
        images: [],
        seller: {
          id: 'unknown',
          name: 'Unknown Seller',
          rating: undefined
        },
        platform: Platform.TEMU,
        url: expect.any(String)
      });
    });

    it('should handle malformed data', async () => {
      document.body.innerHTML = `
        <div>
          <h1 class="product-title">   Messy   Title   </h1>
          <div class="product-description">
            
            Messy Description
            
          </div>
          <div class="price-current">Invalid Price</div>
          <div class="seller-rating">Invalid Rating</div>
        </div>
      `;
      
      const product = await productExtractor.extract();
      
      expect(product.title).toBe('Messy Title');
      expect(product.description).toBe('Messy Description');
      expect(product.price.current).toBe(0);
      expect(product.seller.rating).toBeUndefined();
    });

    it('should handle missing images', async () => {
      document.body.innerHTML = `
        <div>
          <div class="gallery-image">
            <img src="" alt="Empty Source">
            <img src="placeholder.jpg" alt="Placeholder">
          </div>
        </div>
      `;
      
      const product = await productExtractor.extract();
      expect(product.images).toEqual([]);
    });
  });

  describe('Product ID extraction', () => {
    beforeEach(() => {
      productExtractor.setPlatform(Platform.TEMU);
    });

    it('should extract ID from URL parameters', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/product?id=123',
          search: '?id=123'
        },
        writable: true
      });
      
      const product = await productExtractor.extract();
      expect(product.id).toBe('123');
    });

    it('should extract ID from meta tag', async () => {
      document.body.innerHTML = `
        <meta property="product:id" content="456">
      `;
      
      const product = await productExtractor.extract();
      expect(product.id).toBe('456');
    });

    it('should fallback to URL path when no other ID is available', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/product/789',
          pathname: '/product/789'
        },
        writable: true
      });
      
      const product = await productExtractor.extract();
      expect(product.id).toBe('789');
    });
  });
});
