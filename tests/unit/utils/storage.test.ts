import { Storage } from '../../../src/common/utils/storage';
import { createMockProduct } from '../../setup/utils/testUtils';
import { Platform } from '../../../src/common/types';

describe('Storage', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    jest.clearAllMocks();
  });

  describe('cacheProduct', () => {
    it('should store product in local storage', async () => {
      // Arrange
      const mockProduct = createMockProduct({
        id: 'test-product',
        title: 'Test Product',
        price: { current: 29.99, original: 39.99, currency: 'USD' },
        seller: { id: 'test-seller', name: 'Test Seller', rating: 4.5, totalSales: 1000 },
        platform: Platform.TEMU,
        url: 'https://www.temu.com/test-product',
        images: ['image1.jpg', 'image2.jpg']
      });

      // Mock chrome.storage.local.set to resolve successfully
      (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
        if (callback) callback();
        return Promise.resolve();
      });

      // Act
      await Storage.cacheProduct(mockProduct);

      // Assert
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [`product:${mockProduct.id}`]: mockProduct
        }),
        expect.any(Function)
      );
    });

    it('should handle storage errors', async () => {
      // Arrange
      const mockProduct = createMockProduct({
        id: 'test-product',
        title: 'Test Product'
      });

      // Mock chrome.storage.local.set to reject
      const mockError = new Error('Storage error');
      (chrome.storage.local.set as jest.Mock).mockImplementation(() => {
        return Promise.reject(mockError);
      });

      // Act & Assert
      await expect(Storage.cacheProduct(mockProduct)).rejects.toThrow('Storage error');
    });
  });

  describe('getCachedProduct', () => {
    it('should retrieve product from local storage', async () => {
      // Arrange
      const mockProduct = createMockProduct({
        id: 'test-product',
        title: 'Test Product'
      });

      // Mock chrome.storage.local.get to return the product
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, callback) => {
        const result = {
          [`product:${mockProduct.id}`]: mockProduct
        };
        if (callback) callback(result);
        return Promise.resolve(result);
      });

      // Act
      const result = await Storage.getCachedProduct(mockProduct.id);

      // Assert
      expect(result).toEqual(mockProduct);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        `product:${mockProduct.id}`,
        expect.any(Function)
      );
    });

    it('should return null for non-existent product', async () => {
      // Arrange
      const productId = 'non-existent';

      // Mock chrome.storage.local.get to return empty result
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, callback) => {
        if (callback) callback({});
        return Promise.resolve({});
      });

      // Act
      const result = await Storage.getCachedProduct(productId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should clear all stored data', async () => {
      // Mock chrome.storage.local.clear to resolve successfully
      (chrome.storage.local.clear as jest.Mock).mockImplementation((callback) => {
        if (callback) callback();
        return Promise.resolve();
      });

      // Act
      await Storage.clearAll();

      // Assert
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      // Mock chrome.storage.local.clear to reject
      const mockError = new Error('Clear error');
      (chrome.storage.local.clear as jest.Mock).mockImplementation(() => {
        return Promise.reject(mockError);
      });

      // Act & Assert
      await expect(Storage.clearAll()).rejects.toThrow('Clear error');
    });
  });
});
