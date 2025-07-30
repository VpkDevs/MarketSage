/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validation rules for different data types
 */
export class Validator {
  /**
   * Validate a string against common requirements
   */
  static validateString(value: unknown, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    label?: string;
  } = {}): ValidationResult {
    const errors: string[] = [];
    const label = options.label || 'String';

    // Check type
    if (typeof value !== 'string') {
      errors.push(`${label} must be a string`);
      return { isValid: false, errors };
    }

    // Check required
    if (options.required && value.trim() === '') {
      errors.push(`${label} is required`);
    }

    // Check min length
    if (options.minLength !== undefined && value.length < options.minLength) {
      errors.push(`${label} must be at least ${options.minLength} characters`);
    }

    // Check max length
    if (options.maxLength !== undefined && value.length > options.maxLength) {
      errors.push(`${label} must not exceed ${options.maxLength} characters`);
    }

    // Check pattern
    if (options.pattern && !options.pattern.test(value)) {
      errors.push(`${label} format is invalid`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a number against common requirements
   */
  static validateNumber(value: unknown, options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    label?: string;
  } = {}): ValidationResult {
    const errors: string[] = [];
    const label = options.label || 'Number';

    // Check type
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`${label} must be a valid number`);
      return { isValid: false, errors };
    }

    // Check required
    if (options.required && value === 0 && options.min !== 0) {
      errors.push(`${label} is required`);
    }

    // Check min
    if (options.min !== undefined && value < options.min) {
      errors.push(`${label} must be at least ${options.min}`);
    }

    // Check max
    if (options.max !== undefined && value > options.max) {
      errors.push(`${label} must not exceed ${options.max}`);
    }

    // Check integer
    if (options.integer && !Number.isInteger(value)) {
      errors.push(`${label} must be an integer`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a URL string
   */
  static validateUrl(value: unknown, options: {
    required?: boolean;
    allowedDomains?: string[];
    label?: string;
  } = {}): ValidationResult {
    const errors: string[] = [];
    const label = options.label || 'URL';

    // First validate as string
    const stringResult = this.validateString(value, {
      required: options.required,
      label
    });
    
    if (!stringResult.isValid) {
      return stringResult;
    }

    // Check URL format
    try {
      const url = new URL(value as string);
      
      // Check allowed domains if specified
      if (options.allowedDomains && options.allowedDomains.length > 0) {
        const domain = url.hostname;
        const isAllowed = options.allowedDomains.some(allowedDomain => 
          domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
        );
        
        if (!isAllowed) {
          errors.push(`${label} domain is not allowed`);
        }
      }
    } catch (e) {
      errors.push(`${label} must be a valid URL`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize a string to prevent XSS attacks
   */
  static sanitizeString(value: string): string {
    if (typeof value !== 'string') {
      return '';
    }
    
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Validate an object against a schema
   */
  static validateObject(value: unknown, schema: Record<string, (val: unknown) => ValidationResult>): ValidationResult {
    const errors: string[] = [];

    // Check if value is an object
    if (typeof value !== 'object' || value === null) {
      return {
        isValid: false,
        errors: ['Value must be an object']
      };
    }

    // Validate each field against schema
    for (const [field, validator] of Object.entries(schema)) {
      const fieldValue = (value as Record<string, unknown>)[field];
      const fieldResult = validator(fieldValue);
      
      if (!fieldResult.isValid) {
        errors.push(...fieldResult.errors.map(err => `${field}: ${err}`));
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}