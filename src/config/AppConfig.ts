export class AppConfig {
  private static instance: AppConfig;
  private config: Record<string, any>;

  private constructor() {
    this.config = {
      security: {
        maxLoginAttempts: 3,
        sessionTimeout: 3600,
        passwordRequirements: {
          minLength: 12,
          requireSpecialChar: true,
          requireNumber: true,
          requireUppercase: true
        }
      },
      cache: {
        ttl: {
          product: 24 * 60 * 60 * 1000,
          seller: 7 * 24 * 60 * 60 * 1000,
          priceHistory: 30 * 24 * 60 * 60 * 1000
        },
        maxSize: 1000
      },
      api: {
        baseUrl: process.env.API_BASE_URL,
        timeout: 5000,
        retryAttempts: 3,
        rateLimits: {
          default: 60,
          search: 30,
          analysis: 20
        }
      },
      monitoring: {
        performanceThresholds: {
          warning: 1000,
          critical: 3000
        },
        errorThresholds: {
          maxErrorRate: 0.05
        }
      }
    };
  }

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  get<T>(path: string): T {
    return path.split('.').reduce((obj, key) => obj[key], this.config);
  }
}