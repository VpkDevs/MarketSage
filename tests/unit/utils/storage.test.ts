import { Storage } from '../../../src/common/utils/storage';
import { Product, Platform, Price } from '../../../src/common/types';

describe('Storage', () => {
  const mockPrice: Price = {
    current: 99.99,
    currency: 'USD',
    original: 129.99,
    discount: 23
  };

  const mockProduct: Product = {
    id: 'test-product-1',
    title: 'Test Product',
    description: 'A test product description',
    price: mockPrice,
    images: ['image1.jpg', 'image2.jpg'],
    seller: {
      id: 'seller-1',
      name: 'Test Seller',
      rating: 4.5
    },
    platform: Platform.TEMU,
    url: 'https://example.com/product/1'
  };

  beforeEach(async () => {
    await Storage.clearAll();
  });

  describe('Price History', () => {
    it('should save and retrieve price history', async () => {
      await Storage.savePriceHistory(mockProduct.id, mockPrice);
      const history = await Storage.getPriceHistory(mockProduct.id);
      
      expect(history).toHaveLength(1);
      expect(history[0].current).toBe(mockPrice.current);
      expect(history[0].currency).toBe(mockPrice.currency);
      expect(history[0].timestamp).toBeDefined();
    });

    it('should append new prices to history', async () => {
      const newPrice: Price = { ...mockPrice, current: 89.99 };
      
      await Storage.savePriceHistory(mockProduct.id, mockPrice);
      await Storage.savePriceHistory(mockProduct.id, newPrice);
      
      const history = await Storage.getPriceHistory(mockProduct.id);
      expect(history).toHaveLength(2);
      expect(history[1].current).toBe(newPrice.current);
    });
  });

  describe('Product Cache', () => {
    it('should cache and retrieve products', async () => {
      await Storage.cacheProduct(mockProduct);
      const cached = await Storage.getCachedProduct(mockProduct.id);
      
      expect(cached).toBeDefined();
      expect(cached?.id).toBe(mockProduct.id);
      expect(cached?.title).toBe(mockProduct.title);
      expect(cached?.timestamp).toBeDefined();
    });

    it('should handle non-existent products', async () => {
      const cached = await Storage.getCachedProduct('non-existent');
      expect(cached).toBeNull();
    });

    it('should limit cache size to 100 products', async () => {
      // Create and cache 110 products
      for (let i = 0; i < 110; i++) {
        const product: Product = {
          ...mockProduct,
          id: `product-${i}`,
          title: `Product ${i}`
        };
        await Storage.cacheProduct(product);
      }

      const cache = await Storage.getProductCache();
      expect(Object.keys(cache).length).toBeLessThanOrEqual(100);
    });
  });

  describe('Seller Ratings', () => {
    it('should save and retrieve seller ratings', async () => {
      await Storage.saveSellerRating('seller-1', 4.5);
      const rating = await Storage.getSellerRating('seller-1');
      
      expect(rating).toBe(4.5);
    });

    it('should calculate average rating', async () => {
      await Storage.saveSellerRating('seller-1', 4.0);
      await Storage.saveSellerRating('seller-1', 5.0);
      await Storage.saveSellerRating('seller-1', 3.0);
      
      const rating = await Storage.getSellerRating('seller-1');
      expect(rating).toBe(4.0);
    });

    it('should handle non-existent seller ratings', async () => {
      const rating = await Storage.getSellerRating('non-existent');
      expect(rating).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    it('should clear all storage', async () => {
      await Storage.cacheProduct(mockProduct);
      await Storage.saveSellerRating('seller-1', 4.5);
      
      await Storage.clearAll();
      
      const cache = await Storage.getProductCache();
      const ratings = await Storage.getSellerRatings();
      
      expect(Object.keys(cache)).toHaveLength(0);
      expect(Object.keys(ratings)).toHaveLength(0);
    });

    it('should clear only price history', async () => {
      await Storage.savePriceHistory(mockProduct.id, mockPrice);
      await Storage.cacheProduct(mockProduct);
      
      await Storage.clearPriceHistory();
      
      const history = await Storage.getPriceHistory(mockProduct.id);
      const cached = await Storage.getCachedProduct(mockProduct.id);
      
      expect(history).toHaveLength(0);
      expect(cached).toBeDefined();
    });
  });
});
