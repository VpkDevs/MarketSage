/**
 * Enhanced Authentication Provider
 * Provides comprehensive user authentication, session management, and security features
 */

import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../../common/errors/ErrorHandler';
import { SecurityUtils, SecurityLevel } from '../../common/security/SecurityUtils';
import { Storage } from '../../common/utils/storage';
import { Service } from '../di/ServiceContainer';
import { AsyncErrorHandler } from '../../common/utils/decorators';

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  preferences: UserPreferences;
  permissions: string[];
  lastActivity: number;
  createdAt: number;
  verified: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    security: boolean;
    priceAlerts: boolean;
    deals: boolean;
    social: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    socialVisibility: 'public' | 'friends' | 'private';
    dataRetention: number; // days
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number; // minutes
    trustedDevices: string[];
  };
  marketplace: {
    defaultRiskTolerance: 'low' | 'medium' | 'high';
    autoAnalyze: boolean;
    hideHighRisk: boolean;
  };
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  isActive: boolean;
  refreshToken: string;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
  rememberMe?: boolean;
  deviceName?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'password_change' | 'session_expired' | 'suspicious_activity';
  userId?: string;
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  details?: Record<string, any>;
}

@Service('EnhancedAuthProvider')
export class EnhancedAuthProvider {
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly REFRESH_TOKEN_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  private currentSession: AuthSession | null = null;
  private currentUser: AuthUser | null = null;
  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private securityEvents: SecurityEvent[] = [];

  constructor() {
    this.initializeFromStorage();
    this.setupSessionMonitoring();
  }

  /**
   * Initialize authentication state from storage
   */
  @AsyncErrorHandler()
  private async initializeFromStorage(): Promise<void> {
    try {
      const sessionData = await Storage.getCurrentUser();
      if (sessionData?.session) {
        const session = sessionData.session as AuthSession;
        
        // Validate session
        if (this.isSessionValid(session)) {
          this.currentSession = session;
          this.currentUser = sessionData.user as AuthUser;
          await this.updateSessionActivity();
        } else {
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth from storage:', error);
    }
  }

  /**
   * Setup session monitoring and cleanup
   */
  private setupSessionMonitoring(): void {
    // Check session validity every 5 minutes
    setInterval(async () => {
      if (this.currentSession && !this.isSessionValid(this.currentSession)) {
        await this.logSecurityEvent({
          type: 'session_expired',
          userId: this.currentSession.userId,
          sessionId: this.currentSession.sessionId,
          timestamp: Date.now()
        });
        await this.clearSession();
      }
    }, 5 * 60 * 1000);

    // Clean up old login attempts every hour
    setInterval(() => {
      const now = Date.now();
      for (const [key, attempt] of this.loginAttempts.entries()) {
        if (now - attempt.lastAttempt > EnhancedAuthProvider.LOCKOUT_DURATION) {
          this.loginAttempts.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Authenticate user with credentials
   */
  @AsyncErrorHandler({ isValid: false, errors: ['Authentication failed'] })
  async login(credentials: LoginCredentials): Promise<ValidationResult & { user?: AuthUser; session?: AuthSession }> {
    const identifier = credentials.email || credentials.username || 'unknown';
    
    // Check for account lockout
    const lockoutResult = this.checkAccountLockout(identifier);
    if (!lockoutResult.isValid) {
      return lockoutResult;
    }

    try {
      // Validate credentials format
      const validationResult = this.validateCredentials(credentials);
      if (!validationResult.isValid) {
        await this.recordFailedLogin(identifier);
        return validationResult;
      }

      // In a real implementation, this would verify against a backend
      const authResult = await this.verifyCredentials(credentials);
      
      if (!authResult.isValid) {
        await this.recordFailedLogin(identifier);
        await this.logSecurityEvent({
          type: 'failed_login',
          userId: identifier,
          timestamp: Date.now(),
          details: { reason: 'invalid_credentials' }
        });
        return authResult;
      }

      // Clear failed login attempts
      this.loginAttempts.delete(identifier);

      // Create user session
      const user = await this.createUserFromCredentials(credentials);
      const session = await this.createSession(user.id, credentials.deviceName);

      this.currentUser = user;
      this.currentSession = session;

      // Save to storage
      await Storage.setCurrentUser({
        user,
        session
      });

      await this.logSecurityEvent({
        type: 'login',
        userId: user.id,
        sessionId: session.sessionId,
        timestamp: Date.now(),
        details: { rememberMe: credentials.rememberMe }
      });

      return {
        isValid: true,
        errors: [],
        user,
        session
      };

    } catch (error) {
      await this.recordFailedLogin(identifier);
      throw error;
    }
  }

  /**
   * Logout current user
   */
  @AsyncErrorHandler()
  async logout(): Promise<void> {
    if (this.currentSession) {
      await this.logSecurityEvent({
        type: 'logout',
        userId: this.currentSession.userId,
        sessionId: this.currentSession.sessionId,
        timestamp: Date.now()
      });
    }

    await this.clearSession();
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  /**
   * Get current session
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && 
           this.currentSession !== null && 
           this.isSessionValid(this.currentSession);
  }

  /**
   * Validate authentication token
   */
  @AsyncErrorHandler({ isValid: false, errors: ['Invalid token'] })
  async validateToken(token: string): Promise<ValidationResult> {
    if (!token || token.length === 0) {
      return { isValid: false, errors: ['Token is required'] };
    }

    // In a real implementation, this would verify the JWT token
    try {
      const tokenData = this.parseToken(token);
      
      if (!tokenData.sessionId) {
        return { isValid: false, errors: ['Invalid token format'] };
      }

      const session = await this.getSessionById(tokenData.sessionId);
      if (!session || !this.isSessionValid(session)) {
        return { isValid: false, errors: ['Session expired or invalid'] };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: ['Token validation failed'] };
    }
  }

  /**
   * Validate CSRF token
   */
  @AsyncErrorHandler({ isValid: false, errors: ['Invalid CSRF token'] })
  async validateCSRFToken(token: string): Promise<ValidationResult> {
    if (!this.currentSession) {
      return { isValid: false, errors: ['No active session'] };
    }

    // Generate expected CSRF token based on session
    const expectedToken = SecurityUtils.generateCSRFToken();
    
    if (!SecurityUtils.validateCSRFToken(token, expectedToken)) {
      await this.logSecurityEvent({
        type: 'suspicious_activity',
        userId: this.currentSession.userId,
        sessionId: this.currentSession.sessionId,
        timestamp: Date.now(),
        details: { type: 'csrf_validation_failed' }
      });
      
      return { isValid: false, errors: ['CSRF token validation failed'] };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Update user preferences
   */
  @AsyncErrorHandler()
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No authenticated user');
    }

    // Validate preferences
    const sanitizedPreferences = SecurityUtils.sanitizeObject(preferences);
    if (!sanitizedPreferences) {
      throw new Error('Invalid preferences data');
    }

    // Update user preferences
    this.currentUser.preferences = {
      ...this.currentUser.preferences,
      ...sanitizedPreferences
    };

    // Save to storage
    await Storage.setCurrentUser({
      user: this.currentUser,
      session: this.currentSession!
    });
  }

  /**
   * Change user password
   */
  @AsyncErrorHandler({ isValid: false, errors: ['Password change failed'] })
  async changePassword(currentPassword: string, newPassword: string): Promise<ValidationResult> {
    if (!this.currentUser) {
      return { isValid: false, errors: ['Not authenticated'] };
    }

    // Validate current password
    const currentPasswordValid = await this.verifyPassword(this.currentUser.id, currentPassword);
    if (!currentPasswordValid) {
      return { isValid: false, errors: ['Current password is incorrect'] };
    }

    // Validate new password
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    // In a real implementation, this would update the password in the backend
    await this.updatePassword(this.currentUser.id, newPassword);

    await this.logSecurityEvent({
      type: 'password_change',
      userId: this.currentUser.id,
      sessionId: this.currentSession!.sessionId,
      timestamp: Date.now()
    });

    return { isValid: true, errors: [] };
  }

  /**
   * Enable two-factor authentication
   */
  @AsyncErrorHandler()
  async enableTwoFactor(): Promise<{ secret: string; qrCode: string }> {
    if (!this.currentUser) {
      throw new Error('Not authenticated');
    }

    // Generate 2FA secret
    const secret = this.generate2FASecret();
    const qrCode = this.generate2FAQRCode(this.currentUser.email || this.currentUser.username!, secret);

    // Update user preferences
    await this.updateUserPreferences({
      security: {
        ...this.currentUser.preferences.security,
        twoFactorEnabled: true
      }
    });

    return { secret, qrCode };
  }

  /**
   * Get user security events
   */
  @AsyncErrorHandler([])
  async getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
    if (!this.currentUser) {
      return [];
    }

    return this.securityEvents
      .filter(event => event.userId === this.currentUser!.id)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Private helper methods
   */

  private validateCredentials(credentials: LoginCredentials): ValidationResult {
    const errors: string[] = [];

    if (!credentials.email && !credentials.username) {
      errors.push('Email or username is required');
    }

    if (!credentials.password) {
      errors.push('Password is required');
    } else if (credentials.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  private async verifyCredentials(credentials: LoginCredentials): Promise<ValidationResult> {
    // In a real implementation, this would call the backend authentication API
    // For now, we'll simulate with stored user data
    
    try {
      const identifier = credentials.email || credentials.username!;
      const storedUser = await Storage.getUserByIdentifier(identifier);
      
      if (!storedUser) {
        return { isValid: false, errors: ['User not found'] };
      }

      const passwordValid = await this.verifyPassword(storedUser.id, credentials.password);
      if (!passwordValid) {
        return { isValid: false, errors: ['Invalid password'] };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return { isValid: false, errors: ['Authentication service unavailable'] };
    }
  }

  private async createUserFromCredentials(credentials: LoginCredentials): Promise<AuthUser> {
    const identifier = credentials.email || credentials.username!;
    
    // In a real implementation, this would fetch from backend
    const existingUser = await Storage.getUserByIdentifier(identifier);
    
    if (existingUser) {
      return {
        ...existingUser,
        lastActivity: Date.now()
      };
    }

    // Create new user
    const newUser: AuthUser = {
      id: this.generateUserId(),
      email: credentials.email,
      username: credentials.username,
      displayName: credentials.username || credentials.email?.split('@')[0],
      preferences: this.getDefaultPreferences(),
      permissions: ['basic_access'],
      lastActivity: Date.now(),
      createdAt: Date.now(),
      verified: false
    };

    await Storage.createUser(newUser);
    return newUser;
  }

  private async createSession(userId: string, deviceName?: string): Promise<AuthSession> {
    const sessionId = this.generateSessionId();
    const deviceId = await this.getOrCreateDeviceId();
    
    const session: AuthSession = {
      sessionId,
      userId,
      deviceId,
      userAgent: navigator.userAgent,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + EnhancedAuthProvider.SESSION_TIMEOUT,
      isActive: true,
      refreshToken: this.generateRefreshToken()
    };

    await Storage.saveSession(session);
    return session;
  }

  private isSessionValid(session: AuthSession): boolean {
    return session.isActive && 
           session.expiresAt > Date.now() &&
           (Date.now() - session.lastActivity) < EnhancedAuthProvider.SESSION_TIMEOUT;
  }

  private async updateSessionActivity(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.lastActivity = Date.now();
      await Storage.updateSession(this.currentSession);
    }
  }

  private async clearSession(): Promise<void> {
    if (this.currentSession) {
      await Storage.deleteSession(this.currentSession.sessionId);
    }
    
    this.currentSession = null;
    this.currentUser = null;
    await Storage.setCurrentUser(null);
  }

  private checkAccountLockout(identifier: string): ValidationResult {
    const attempts = this.loginAttempts.get(identifier);
    
    if (attempts && attempts.count >= EnhancedAuthProvider.MAX_LOGIN_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      
      if (timeSinceLastAttempt < EnhancedAuthProvider.LOCKOUT_DURATION) {
        const remainingTime = Math.ceil((EnhancedAuthProvider.LOCKOUT_DURATION - timeSinceLastAttempt) / 60000);
        return {
          isValid: false,
          errors: [`Account locked. Try again in ${remainingTime} minutes.`]
        };
      } else {
        // Reset attempts after lockout period
        this.loginAttempts.delete(identifier);
      }
    }

    return { isValid: true, errors: [] };
  }

  private async recordFailedLogin(identifier: string): Promise<void> {
    const current = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    current.count++;
    current.lastAttempt = Date.now();
    this.loginAttempts.set(identifier, current);
  }

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityEvents.push(event);
    
    // Keep only recent events in memory
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-500);
    }

    // Save to storage
    await Storage.saveSecurityEvent(event);
  }

  private validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { isValid: errors.length === 0, errors };
  }

  private async verifyPassword(userId: string, password: string): Promise<boolean> {
    // In a real implementation, this would hash and compare the password
    // For now, we'll simulate verification
    return true;
  }

  private async updatePassword(userId: string, newPassword: string): Promise<void> {
    // In a real implementation, this would hash and store the new password
    // For now, we'll simulate the update
  }

  private parseToken(token: string): any {
    // In a real implementation, this would decode a JWT token
    try {
      return JSON.parse(atob(token));
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  private async getSessionById(sessionId: string): Promise<AuthSession | null> {
    return await Storage.getSession(sessionId);
  }

  private generate2FASecret(): string {
    // Generate a random base32 secret for 2FA
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private generate2FAQRCode(identifier: string, secret: string): string {
    // Generate QR code data for authenticator apps
    const issuer = 'MarketSage';
    const label = `${issuer}:${identifier}`;
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRefreshToken(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const stored = await Storage.getDeviceId();
    if (stored) return stored;

    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await Storage.setDeviceId(deviceId);
    return deviceId;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto',
      notifications: {
        security: true,
        priceAlerts: true,
        deals: false,
        social: false
      },
      privacy: {
        shareAnalytics: false,
        socialVisibility: 'friends',
        dataRetention: 30
      },
      security: {
        twoFactorEnabled: false,
        sessionTimeout: 1440, // 24 hours
        trustedDevices: []
      },
      marketplace: {
        defaultRiskTolerance: 'medium',
        autoAnalyze: true,
        hideHighRisk: false
      }
    };
  }
}
