/**
 * Error severity levels for the application
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Error categories to classify different types of errors
 */
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  SECURITY = 'SECURITY',
  STORAGE = 'STORAGE',
  UI = 'UI',
  ANALYSIS = 'ANALYSIS',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Custom error class with additional metadata
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: ErrorSeverity,
    public category: ErrorCategory,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    // Ensure prototype chain works correctly in ES5
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Interface for error reporting services
 */
interface ErrorReporter {
  report(error: Error | AppError, context?: Record<string, any>): void;
}

/**
 * Console-based error reporter for development
 */
class ConsoleErrorReporter implements ErrorReporter {
  report(error: Error | AppError, context?: Record<string, any>): void {
    if (error instanceof AppError) {
      console.error(
        `[${error.severity}][${error.category}][${error.code}] ${error.message}`,
        { context: error.context, additionalContext: context }
      );
    } else {
      console.error(`[${ErrorSeverity.UNKNOWN}][${ErrorCategory.UNKNOWN}] ${error.message}`, {
        error,
        additionalContext: context
      });
    }
  }
}

/**
 * Central error handler for the application
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private reporters: ErrorReporter[] = [];
  private errorMetrics: Map<string, number> = new Map();

  private constructor() {
    // Add default console reporter in development
    if (process.env.NODE_ENV !== 'production') {
      this.reporters.push(new ConsoleErrorReporter());
    }
    
    // In production, we would add a proper error reporting service
    // this.reporters.push(new AnalyticsErrorReporter());
  }

  /**
   * Get the singleton instance of ErrorHandler
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Add an error reporter
   */
  addReporter(reporter: ErrorReporter): void {
    this.reporters.push(reporter);
  }

  /**
   * Handle an error by reporting it to all registered reporters
   */
  handleError(error: Error | AppError, context?: Record<string, any>): void {
    // Update error metrics
    this.updateErrorMetrics(error);
    
    // Report to all reporters
    for (const reporter of this.reporters) {
      try {
        reporter.report(error, context);
      } catch (reportingError) {
        console.error('Error in error reporter:', reportingError);
      }
    }

    // For critical errors, take remediation action
    if (error instanceof AppError && error.severity === ErrorSeverity.CRITICAL) {
      this.takeRemediationAction(error);
    }
  }

  /**
   * Create and handle an AppError
   */
  error(
    message: string,
    code: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context?: Record<string, any>
  ): void {
    const error = new AppError(message, code, severity, category, context);
    this.handleError(error);
  }

  /**
   * Update error metrics for monitoring
   */
  private updateErrorMetrics(error: Error | AppError): void {
    const code = error instanceof AppError ? error.code : 'UNKNOWN';
    const currentCount = this.errorMetrics.get(code) || 0;
    this.errorMetrics.set(code, currentCount + 1);
  }

  /**
   * Take remediation action for critical errors
   */
  private takeRemediationAction(error: AppError): void {
    // Implement recovery strategies based on error type
    switch (error.category) {
      case ErrorCategory.NETWORK:
        // Retry failed requests or switch to offline mode
        break;
      case ErrorCategory.STORAGE:
        // Attempt to reset corrupted state
        try {
          const stateManager = require('../state/StateManager').StateManager.getInstance();
          stateManager.resetState();
        } catch (resetError) {
          console.error('Failed to reset state:', resetError);
        }
        break;
      case ErrorCategory.SECURITY:
        // Log out user or restrict sensitive operations
        break;
      default:
        // Default recovery strategy
        break;
    }
  }

  /**
   * Get error metrics for monitoring
   */
  getErrorMetrics(): Map<string, number> {
    return new Map(this.errorMetrics);
  }
}

/**
 * Helper function to get the ErrorHandler instance
 */
export function getErrorHandler(): ErrorHandler {
  return ErrorHandler.getInstance();
}