const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

class AuthService {
  // Generate JWT token
  static generateToken(payload, expiresIn = null) {
    const secret = process.env.JWT_SECRET;
    const expiry = expiresIn || process.env.JWT_EXPIRE || '7d';
    
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    try {
      return jwt.sign(payload, secret, { 
        expiresIn: expiry,
        issuer: 'qr-attendance-system',
        audience: 'qr-attendance-users'
      });
    } catch (error) {
      logger.error('Token generation failed:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  // Generate refresh token
  static generateRefreshToken(payload) {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    const expiry = process.env.JWT_REFRESH_EXPIRE || '30d';
    
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined in environment variables');
    }

    try {
      return jwt.sign(payload, secret, { 
        expiresIn: expiry,
        issuer: 'qr-attendance-system',
        audience: 'qr-attendance-refresh'
      });
    } catch (error) {
      logger.error('Refresh token generation failed:', error);
      throw new Error('Failed to generate refresh token');
    }
  }

  // Verify JWT token
  static verifyToken(token, isRefreshToken = false) {
    const secret = isRefreshToken 
      ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET)
      : process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT secret is not defined');
    }

    try {
      return jwt.verify(token, secret, {
        issuer: 'qr-attendance-system',
        audience: isRefreshToken ? 'qr-attendance-refresh' : 'qr-attendance-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else {
        logger.error('Token verification failed:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  // Generate password reset token
  static generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Hash password reset token
  static hashPasswordResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Generate secure random string
  static generateSecureRandom(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Create token payload
  static createTokenPayload(user) {
    return {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      iat: Math.floor(Date.now() / 1000)
    };
  }

  // Create authentication response
  static createAuthResponse(user, includeRefreshToken = true) {
    const tokenPayload = this.createTokenPayload(user);
    const accessToken = this.generateToken(tokenPayload);
    
    const response = {
      success: true,
      data: {
        user: user.toSafeObject(),
        accessToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    };

    if (includeRefreshToken) {
      const refreshToken = this.generateRefreshToken({ id: user._id });
      response.data.refreshToken = refreshToken;
    }

    return response;
  }

  // Validate password strength
  static validatePasswordStrength(password) {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }

    // Optional: Require special characters for stronger security
    if (process.env.REQUIRE_SPECIAL_CHARS === 'true' && !hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if user has permission
  static checkPermission(userRole, requiredRoles) {
    if (!Array.isArray(requiredRoles)) {
      requiredRoles = [requiredRoles];
    }

    // Admin has access to everything
    if (userRole === 'admin') {
      return true;
    }

    return requiredRoles.includes(userRole);
  }

  // Role hierarchy check
  static hasHigherRole(userRole, targetRole) {
    const roleHierarchy = {
      'admin': 3,
      'teacher': 2,
      'student': 1
    };

    return (roleHierarchy[userRole] || 0) > (roleHierarchy[targetRole] || 0);
  }

  // Generate API key (for mobile apps)
  static generateApiKey(userId, deviceId = null) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const data = `${userId}-${deviceId || 'web'}-${timestamp}-${random}`;
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Session management helpers
  static createSessionData(user, deviceInfo = {}) {
    return {
      userId: user._id,
      email: user.email,
      role: user.role,
      loginTime: new Date(),
      deviceInfo: {
        userAgent: deviceInfo.userAgent || 'Unknown',
        ip: deviceInfo.ip || 'Unknown',
        platform: deviceInfo.platform || 'Unknown'
      },
      isActive: true
    };
  }

  // Token blacklist helpers (for logout functionality)
  static generateTokenId(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Rate limiting helpers
  static createRateLimitKey(ip, endpoint = 'auth') {
    return `rate_limit:${endpoint}:${ip}`;
  }

  // Login attempt tracking
  static createLoginAttemptKey(email) {
    return `login_attempts:${email.toLowerCase()}`;
  }

  // Account lockout helpers
  static createAccountLockKey(email) {
    return `account_lock:${email.toLowerCase()}`;
  }

  // Two-factor authentication helpers
  static generate2FASecret() {
    return crypto.randomBytes(32).toString('base32');
  }

  static generate2FAToken() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Email verification helpers
  static generateEmailVerificationToken(email) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const data = `${email}-${timestamp}-${random}`;
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Mobile device registration
  static generateDeviceToken(userId, deviceId, fcmToken = null) {
    const data = {
      userId,
      deviceId,
      fcmToken,
      timestamp: Date.now(),
      random: crypto.randomBytes(8).toString('hex')
    };

    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  // Audit logging helpers
  static logAuthEvent(eventType, user, deviceInfo = {}, success = true, error = null) {
    const logData = {
      eventType,
      userId: user?._id || null,
      email: user?.email || null,
      role: user?.role || null,
      success,
      timestamp: new Date(),
      deviceInfo,
      error: error?.message || null
    };

    if (success) {
      logger.info(`Auth event: ${eventType}`, logData);
    } else {
      logger.warn(`Auth event failed: ${eventType}`, logData);
    }

    return logData;
  }
}

module.exports = AuthService;