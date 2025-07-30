import { ErrorHandler, ErrorSeverity, ErrorCategory, AppError } from '../../../src/common/errors/ErrorHandler';

// Mock console.error to prevent test output pollution
console.error = jest.fn();

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Reset the singleton instance between tests
    // @ts-ignore - Accessing private property for testing
    ErrorHandler['instance'] = undefined;
    jest.clearAllMocks();
  });

  it('should create a singleton instance', () => {
    const handler1 = ErrorHandler.getInstance();
    const handler2 = ErrorHandler.getInstance();
    expect(handler1).toBe(handler2);
  });

  it('should handle standard errors', () => {
    const handler = ErrorHandler.getInstance();
    const error = new Error('Test error');
    
    handler.handleError(error);
    
    expect(console.error).toHaveBeenCalled();
  });

  it('should handle AppErrors with proper categorization', () => {
    const handler = ErrorHandler.getInstance();
    const error = new AppError(
      'Test app error',
      'TEST_ERROR',
      ErrorSeverity.HIGH,
      ErrorCategory.NETWORK,
      { additionalInfo: 'test' }
    );
    
    handler.handleError(error);
    
    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[HIGH][NETWORK][TEST_ERROR]'),
      expect.objectContaining({
        context: expect.objectContaining({ additionalInfo: 'test' })
      })
    );
  });

  it('should create and handle errors with the error method', () => {
    const handler = ErrorHandler.getInstance();
    
    handler.error(
      'Test error method',
      'ERROR_METHOD_TEST',
      ErrorSeverity.MEDIUM,
      ErrorCategory.UI,
      { source: 'test' }
    );
    
    expect(console.error).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[MEDIUM][UI][ERROR_METHOD_TEST]'),
      expect.objectContaining({
        context: expect.objectContaining({ source: 'test' })
      })
    );
  });

  it('should track error metrics', () => {
    const handler = ErrorHandler.getInstance();
    
    // Create multiple errors with the same code
    handler.error('Error 1', 'DUPLICATE_CODE', ErrorSeverity.LOW, ErrorCategory.VALIDATION);
    handler.error('Error 2', 'DUPLICATE_CODE', ErrorSeverity.LOW, ErrorCategory.VALIDATION);
    handler.error('Error 3', 'UNIQUE_CODE', ErrorSeverity.LOW, ErrorCategory.VALIDATION);
    
    const metrics = handler.getErrorMetrics();
    
    expect(metrics.get('DUPLICATE_CODE')).toBe(2);
    expect(metrics.get('UNIQUE_CODE')).toBe(1);
  });

  it('should handle reporter failures gracefully', () => {
    const handler = ErrorHandler.getInstance();
    
    // Add a reporter that throws an error
    handler.addReporter({
      report: () => {
        throw new Error('Reporter failure');
      }
    });
    
    // This should not throw
    expect(() => {
      handler.error('Test error', 'TEST_CODE', ErrorSeverity.LOW, ErrorCategory.UNKNOWN);
    }).not.toThrow();
    
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Error in error reporter:'),
      expect.any(Error)
    );
  });
});