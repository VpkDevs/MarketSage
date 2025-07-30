import { AuthProvider } from '../auth/AuthProvider';
import { AdaptiveRateLimiter } from '../../background/services/network/rateLimiter';
import { InputValidator } from '../validation/InputValidator';
import { ErrorHandler, CustomError } from '../error/ErrorHandler';
import { Metrics } from '../monitoring/Metrics';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ExtendedRequest extends Request {
  ip?: string;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private readonly authProvider: AuthProvider;
  private readonly rateLimiter: AdaptiveRateLimiter;
  private readonly metrics: Metrics;

  private constructor() {
    this.authProvider = new AuthProvider();
    this.rateLimiter = new AdaptiveRateLimiter();
    this.metrics = new Metrics();
  }

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  async validateRequest(req: ExtendedRequest): Promise<ValidationResult> {
    const startTime = performance.now();
    try {
      // Perform security checks in parallel
      const [
        authResult,
        rateLimit,
        inputValidation,
        csrfCheck
      ] = await Promise.all([
        this.authProvider.validateToken(req.headers.get('authorization') || ''),
        this.rateLimiter.shouldAllow(req.ip || ''),
        this.validateInput(req.body),
        this.validateCSRFToken(req.headers.get('csrf-token') || '')
      ]);

      // Aggregate results
      return {
        isValid: authResult.isValid && 
                 rateLimit && 
                 inputValidation.isValid && 
                 csrfCheck.isValid,
        errors: [
          ...authResult.errors,
          ...(rateLimit ? [] : ['Rate limit exceeded']),
          ...inputValidation.errors,
          ...csrfCheck.errors
        ]
      };
    } catch (error) {
      const customError = error instanceof Error ? 
        new CustomError(error.message, 'SECURITY_VALIDATION_ERROR', 'HIGH', { context: 'security_validation' }) : 
        new CustomError('Unknown error occurred', 'SECURITY_VALIDATION_ERROR', 'HIGH', { context: 'security_validation' });
      
      await ErrorHandler.handle(customError);
      throw customError;
    } finally {
      this.metrics.track('security_validation', startTime);
    }
  }

  private async validateInput(data: any): Promise<ValidationResult> {
    const validator = new InputValidator();
    return await validator.validate(data);
  }

  private async validateCSRFToken(token: string): Promise<ValidationResult> {
    return await this.authProvider.validateCSRFToken(token);
  }
}


