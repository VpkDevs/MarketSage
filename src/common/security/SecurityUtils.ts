import { Validator } from '../utils/validation';
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../errors/ErrorHandler';

/**
 * Security level for different operations
 */
export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Utilities for handling security concerns
 */
export class SecurityUtils {
  private static errorHandler = ErrorHandler.getInstance();

  /**
   * Sanitize a string to prevent XSS attacks
   * @param input The string to sanitize
   * @returns Sanitized string
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    return Validator.sanitizeString(input);
  }

  /**
   * Sanitize an object by sanitizing all string properties
   * @param obj The object to sanitize
   * @returns A new object with sanitized string properties
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
      return {} as T;
    }

    const result = { ...obj };

    for (const key in result) {
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        const value = result[key];
        
        if (typeof value === 'string') {
          result[key] = this.sanitizeInput(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.sanitizeObject(value);
        } else if (Array.isArray(value)) {
          result[key] = value.map(item => 
            typeof item === 'string' 
              ? this.sanitizeInput(item) 
              : (typeof item === 'object' ? this.sanitizeObject(item) : item)
          );
        }
      }
    }

    return result;
  }

  /**
   * Validate and sanitize data according to security requirements
   * @param data The data to validate and sanitize
   * @param validator A validation function
   * @param securityLevel The security level for this operation
   * @returns The sanitized data if valid, or null if invalid
   */
  static validateAndSanitize<T extends Record<string, any>>(
    data: T,
    validator: (data: T) => boolean,
    securityLevel: SecurityLevel = SecurityLevel.MEDIUM
  ): T | null {
    try {
      // First validate the data
      const isValid = validator(data);
      
      if (!isValid) {
        this.errorHandler.error(
          'Data validation failed',
          'SECURITY_VALIDATION_FAILED',
          this.mapSecurityLevelToSeverity(securityLevel),
          ErrorCategory.SECURITY,
          { dataType: typeof data }
        );
        return null;
      }
      
      // Then sanitize it
      return this.sanitizeObject(data);
    } catch (error) {
      this.errorHandler.error(
        'Error during data validation and sanitization',
        'SECURITY_SANITIZATION_ERROR',
        this.mapSecurityLevelToSeverity(securityLevel),
        ErrorCategory.SECURITY,
        { error, dataType: typeof data }
      );
      return null;
    }
  }

  /**
   * Check if a URL is allowed based on security rules
   * @param url The URL to check
   * @param allowedDomains List of allowed domains
   * @returns True if the URL is allowed
   */
  static isUrlAllowed(url: string, allowedDomains: string[]): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return allowedDomains.some(domain => 
        hostname === domain.toLowerCase() || 
        hostname.endsWith(`.${domain.toLowerCase()}`)
      );
    } catch (error) {
      this.errorHandler.error(
        'Invalid URL in security check',
        'SECURITY_INVALID_URL',
        ErrorSeverity.MEDIUM,
        ErrorCategory.SECURITY,
        { url, error }
      );
      return false;
    }
  }

  /**
   * Generate a secure token for CSRF protection
   * @returns A secure random token
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate a CSRF token
   * @param token The token to validate
   * @param expectedToken The expected token value
   * @returns True if the token is valid
   */
  static validateCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) {
      return false;
    }
    
    // Use constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(token, expectedToken);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   * @param a First string
   * @param b Second string
   * @returns True if strings are equal
   */
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Map security level to error severity
   * @param level Security level
   * @returns Corresponding error severity
   */
  private static mapSecurityLevelToSeverity(level: SecurityLevel): ErrorSeverity {
    switch (level) {
      case SecurityLevel.LOW:
        return ErrorSeverity.LOW;
      case SecurityLevel.MEDIUM:
        return ErrorSeverity.MEDIUM;
      case SecurityLevel.HIGH:
        return ErrorSeverity.HIGH;
      case SecurityLevel.CRITICAL:
        return ErrorSeverity.CRITICAL;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }
}