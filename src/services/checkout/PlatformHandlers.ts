// Custom error types for better error handling
class CartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CartValidationError';
  }
}

class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutError';
  }
}

// Enhanced CartItem interface with validation
interface CartItem {
  id: string;
  quantity: number;
  variant?: string;
  seller?: string;
  price?: number;
}

// Define the PlatformHandler interface
interface PlatformHandler {
  validateItems(items: CartItem[]): void;
  prepareCheckout(items: CartItem[]): Promise<string>;
}

// Abstract base class to reduce code duplication
abstract class BasePlatformHandler implements PlatformHandler {
  protected abstract readonly BASE_URL: string;
  protected abstract readonly MAX_ITEMS_PER_REQUEST: number;
  protected readonly MAX_QUANTITY_PER_ITEM = 999;
  protected readonly RETRY_ATTEMPTS = 3;
  protected readonly RETRY_DELAY = 1000;
  protected readonly URL_MAX_LENGTH = 2048;

  validateItems(items: CartItem[]): void {
    if (!items?.length) {
      throw new CartValidationError('No items provided for checkout');
    }

    items.forEach((item, index) => {
      if (!item.id?.trim()) {
        throw new CartValidationError(`Item at index ${index} has invalid ID`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new CartValidationError(`Item ${item.id} has invalid quantity`);
      }
      if (item.quantity > this.MAX_QUANTITY_PER_ITEM) {
        throw new CartValidationError(
          `Item ${item.id} exceeds maximum quantity of ${this.MAX_QUANTITY_PER_ITEM}`
        );
      }
      if (item.price !== undefined && (isNaN(item.price) || item.price < 0)) {
        throw new CartValidationError(`Item ${item.id} has invalid price`);
      }
    });
  }

  protected async validateQueryParams(params: URLSearchParams): Promise<void> {
    const url = `${this.BASE_URL}?${params.toString()}`;
    if (url.length > this.URL_MAX_LENGTH) {
      throw new CheckoutError(
        `Cart data exceeds maximum URL length. Try reducing the number of items.`
      );
    }
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected handleTruncation(items: CartItem[]): CartItem[] {
    const truncatedItems = items.length > this.MAX_ITEMS_PER_REQUEST
      ? items.slice(0, this.MAX_ITEMS_PER_REQUEST)
      : items;

    if (truncatedItems.length < items.length) {
      console.warn(`Truncated ${items.length - truncatedItems.length} items from cart`);
    }

    return truncatedItems;
  }

  abstract prepareCheckout(items: CartItem[]): Promise<string>;
}

class TemuHandler extends BasePlatformHandler {
  protected readonly BASE_URL = 'https://www.temu.com/cart/bulk-add';
  protected readonly MAX_ITEMS_PER_REQUEST = 100;

  async prepareCheckout(items: CartItem[]): Promise<string> {
    try {
      this.validateItems(items);
      const truncatedItems = this.handleTruncation(items);

      for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
        try {
          const queryParams = new URLSearchParams();
          truncatedItems.forEach(item => {
            queryParams.append('id', item.id);
            queryParams.append('qty', item.quantity.toString());
            if (item.variant) queryParams.append('var', item.variant);
          });

          await this.validateQueryParams(queryParams);
          return `${this.BASE_URL}?${queryParams.toString()}`;
        } catch (error) {
          if (attempt === this.RETRY_ATTEMPTS) throw error;
          await this.delay(this.RETRY_DELAY * Math.pow(2, attempt - 1));
        }
      }

      throw new CheckoutError('Failed to prepare checkout URL after all retry attempts');
    } catch (error) {
      if (error instanceof CartValidationError || error instanceof CheckoutError) {
        throw error;
      }
      console.error('TemuHandler checkout error:', error);
      throw new CheckoutError('Failed to prepare Temu checkout URL');
    }
  }
}

class AliExpressHandler extends BasePlatformHandler {
  protected readonly BASE_URL = 'https://cart.aliexpress.com/add_cart_items';
  protected readonly MAX_ITEMS_PER_REQUEST = 50;

  async prepareCheckout(items: CartItem[]): Promise<string> {
    try {
      this.validateItems(items);
      const truncatedItems = this.handleTruncation(items);

      for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
        try {
          const queryParams = new URLSearchParams();
          truncatedItems.forEach(item => {
            queryParams.append('sku', item.id);
            queryParams.append('quantity', item.quantity.toString());
            if (item.variant) queryParams.append('variant', item.variant);
            if (item.seller) queryParams.append('seller', item.seller);
            if (item.price !== undefined) {
              queryParams.append('price', item.price.toString());
            }
          });

          await this.validateQueryParams(queryParams);
          return `${this.BASE_URL}?${queryParams.toString()}`;
        } catch (error) {
          if (attempt === this.RETRY_ATTEMPTS) throw error;
          await this.delay(this.RETRY_DELAY * Math.pow(2, attempt - 1));
        }
      }

      throw new CheckoutError('Failed to prepare checkout URL after all retry attempts');
    } catch (error) {
      if (error instanceof CartValidationError || error instanceof CheckoutError) {
        throw error;
      }
      console.error('AliExpressHandler checkout error:', error);
      throw new CheckoutError('Failed to prepare AliExpress checkout URL');
    }
  }
}

class DHGateHandler extends BasePlatformHandler {
  protected readonly BASE_URL = 'https://www.dhgate.com/cart.do';
  protected readonly MAX_ITEMS_PER_REQUEST = 30;
  private readonly ACTION = 'add';

  async prepareCheckout(items: CartItem[]): Promise<string> {
    try {
      this.validateItems(items);
      const truncatedItems = this.handleTruncation(items);

      for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('act', this.ACTION);
          
          truncatedItems.forEach(item => {
            queryParams.append('pid', item.id);
            queryParams.append('qty', item.quantity.toString());
            if (item.variant) queryParams.append('var', item.variant);
            if (item.seller) queryParams.append('seller', item.seller);
            if (item.price !== undefined) {
              queryParams.append('price', item.price.toString());
            }
          });

          await this.validateQueryParams(queryParams);
          return `${this.BASE_URL}?${queryParams.toString()}`;
        } catch (error) {
          if (attempt === this.RETRY_ATTEMPTS) throw error;
          await this.delay(this.RETRY_DELAY * Math.pow(2, attempt - 1));
        }
      }

      throw new CheckoutError('Failed to prepare checkout URL after all retry attempts');
    } catch (error) {
      if (error instanceof CartValidationError || error instanceof CheckoutError) {
        throw error;
      }
      console.error('DHGateHandler checkout error:', error);
      throw new CheckoutError('Failed to prepare DHGate checkout URL');
    }
  }
}

export {
  CartItem,
  PlatformHandler,
  TemuHandler,
  AliExpressHandler,
  DHGateHandler,
  CartValidationError,
  CheckoutError
};

