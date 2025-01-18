import { Storage } from '../../../src/common/utils/storage';
import { Product, Price, Seller, Platform } from '../../../src/common/types';

describe('Storage', () => {
  beforeEach(async () => {
    await Storage.clearAll(); // Clear storage before each test
  });

  describe('Price History Methods', () => {
    it('should save and retrieve price history', async () => {
      const productId = 'product1';
      const price: Price = { current: 10.0, currency: 'USD' }; // Updated to include 'current'
      await Storage.savePriceHistory(productId, price);
      const history = await Storage.getPriceHistory(productId);
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject(price);
    });

    it('should return an empty array if no price history exists', async () => {
      const history = await Storage.getPriceHistory('nonexistentProduct');
      expect(history).toEqual([]);
    });

    it('should clear price history', async () => {
      const productId = 'product1';
      const price: Price = { current: 10.0, currency: 'USD' }; // Updated to include 'current'
      await Storage.savePriceHistory(productId, price);
      await Storage.clearPriceHistory();
      const history = await Storage.getPriceHistory(productId);
      expect(history).toEqual([]);
    });
  });

  describe('Product Cache Methods', () => {
    it('should cache and retrieve a product', async () => {
      const product: Product = {
        id: 'product1',
        title: 'Test Product',
        price: { current: 10.0, currency: 'USD' }, // Updated to include 'current'
        seller: { id: 'seller1', name: 'Test Seller' }, // Added seller details
        platform: Platform.TEMU,
        url: 'http://example.com/product1',
        images: ['image1.jpg'],
      };
      await Storage.cacheProduct(product);
      const cachedProduct = await Storage.getCachedProduct('product1');
      expect(cachedProduct).toMatchObject(product);
    });

    it('should limit cache to the last 100 products', async () => {
      for (let i = 0; i < 105; i++) {
        await Storage.cacheProduct({ 
          id: `product${i}`, 
          title: `Test Product ${i}`, 
          price: { current: 10.0, currency: 'USD' }, // Updated to include 'current'
          seller: { id: `seller${i}`, name: `Test Seller ${i}` }, // Added seller details
          platform: Platform.TEMU,
          url: `http://example.com/product${i}`,
          images: ['image1.jpg'],
        });
      }
      const cache = await Storage.getProductCache();
      expect(Object.keys(cache)).toHaveLength(100);
    });

    it('should return null for a nonexistent cached product', async () => {
      const cachedProduct = await Storage.getCachedProduct('nonexistentProduct');
      expect(cachedProduct).toBeNull();
    });
  });

  describe('Seller Ratings Methods', () => {
    it('should save and retrieve seller ratings', async () => {
      await Storage.saveSellerRating('seller1', 5);
      const rating = await Storage.getSellerRating('seller1');
      expect(rating).toBe(5);
    });

    it('should return null if no ratings exist for a seller', async () => {
      const rating = await Storage.getSellerRating('nonexistentSeller');
      expect(rating).toBeNull();
    });

    it('should calculate average ratings correctly', async () => {
      await Storage.saveSellerRating('seller1', 5);
      await Storage.saveSellerRating('seller1', 3);
      const rating = await Storage.getSellerRating('seller1');
      expect(rating).toBe(4); // Average of 5 and 3
    });
  });

  describe('Utility Methods', () => {
    it('should clear all storage', async () => {
      await Storage.saveSellerRating('seller1', 5);
      await Storage.clearAll();
      const rating = await Storage.getSellerRating('seller1');
      expect(rating).toBeNull();
    });
  });
});
