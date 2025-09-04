const express = require('express');
const router = express.Router();
const { User } = require('../models');
const AuthService = require('../services/authService');
const { 
  validate, 
  schemas, 
  authRateLimit,
  authenticate 
} = require('../middleware');
const logger = require('../utils/logger');

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', 
  authRateLimit,
  validate(schemas.userLogin),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const deviceInfo = {
        userAgent: req.get('user-agent'),
        ip: req.ip,
        platform: req.get('x-platform') || 'web'
      };

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        AuthService.logAuthEvent('login_failed', { email }, deviceInfo, false, new Error('User not found'));
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' }
        });
      }

      // Check if user is active
      if (!user.isActive) {
        AuthService.logAuthEvent('login_failed', user, deviceInfo, false, new Error('Account deactivated'));
        return res.status(401).json({
          success: false,
          error: { message: 'Account is deactivated. Please contact administrator.' }
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        AuthService.logAuthEvent('login_failed', user, deviceInfo, false, new Error('Invalid password'));
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid email or password' }
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const authResponse = AuthService.createAuthResponse(user, true);

      // Add refresh token to user's stored tokens
      await user.addRefreshToken(authResponse.data.refreshToken);

      // Log successful login
      AuthService.logAuthEvent('login_success', user, deviceInfo, true);

      res.status(200).json(authResponse);

    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }
);

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Refresh token is required' }
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = AuthService.verifyToken(refreshToken, true);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid or expired refresh token' }
      });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not found or inactive' }
      });
    }

    // Check if refresh token exists in user's stored tokens
    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid refresh token' }
      });
    }

    // Generate new access token
    const tokenPayload = AuthService.createTokenPayload(user);
    const newAccessToken = AuthService.generateToken(tokenPayload);

    // Optionally rotate refresh token
    const shouldRotateRefreshToken = process.env.ROTATE_REFRESH_TOKENS === 'true';
    let newRefreshToken = refreshToken;

    if (shouldRotateRefreshToken) {
      // Remove old refresh token
      await user.removeRefreshToken(refreshToken);
      
      // Generate new refresh token
      newRefreshToken = AuthService.generateRefreshToken({ id: user._id });
      await user.addRefreshToken(newRefreshToken);
    }

    const response = {
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_EXPIRE || '7d',
        user: user.toSafeObject()
      }
    };

    logger.info(`Token refreshed for user: ${user.email}`);

    res.status(200).json(response);

  } catch (error) {
    logger.error('Token refresh error:', error);
    next(error);
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate tokens
// @access  Private
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    // Remove specific refresh token if provided
    if (refreshToken) {
      await user.removeRefreshToken(refreshToken);
    } else {
      // Remove all refresh tokens (logout from all devices)
      await user.clearRefreshTokens();
    }

    AuthService.logAuthEvent('logout', user, {
      userAgent: req.get('user-agent'),
      ip: req.ip
    }, true);

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' }
    });

  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    // Clear all refresh tokens
    await user.clearRefreshTokens();

    AuthService.logAuthEvent('logout_all', user, {
      userAgent: req.get('user-agent'),
      ip: req.ip
    }, true);

    res.status(200).json({
      success: true,
      data: { message: 'Logged out from all devices successfully' }
    });

  } catch (error) {
    logger.error('Logout all error:', error);
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user.toSafeObject() }
  });
});

// @route   PUT /api/auth/profile
// @desc    Update current user profile
// @access  Private
router.put('/profile', 
  authenticate,
  validate(schemas.userUpdate),
  async (req, res, next) => {
    try {
      const user = req.user;
      const allowedUpdates = ['name', 'phoneNumber', 'department'];
      
      // Only allow certain fields to be updated
      const updates = {};
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      // Update user
      Object.assign(user, updates);
      await user.save();

      logger.info(`Profile updated for user: ${user.email}`, { updates });

      res.status(200).json({
        success: true,
        data: { 
          user: user.toSafeObject(),
          message: 'Profile updated successfully'
        }
      });

    } catch (error) {
      logger.error('Profile update error:', error);
      next(error);
    }
  }
);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', 
  authenticate,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: { message: 'Current password and new password are required' }
        });
      }

      // Validate new password strength
      const passwordValidation = AuthService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Password does not meet requirements',
            details: passwordValidation.errors
          }
        });
      }

      const user = await User.findById(req.user._id).select('+password');

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: { message: 'Current password is incorrect' }
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens to force re-login
      await user.clearRefreshTokens();

      AuthService.logAuthEvent('password_changed', user, {
        userAgent: req.get('user-agent'),
        ip: req.ip
      }, true);

      res.status(200).json({
        success: true,
        data: { message: 'Password changed successfully. Please log in again.' }
      });

    } catch (error) {
      logger.error('Password change error:', error);
      next(error);
    }
  }
);

// @route   GET /api/auth/sessions
// @desc    Get active sessions (refresh tokens)
// @access  Private
router.get('/sessions', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id);
  
  const sessions = user.refreshTokens.map(token => ({
    id: token._id,
    createdAt: token.createdAt,
    isCurrentSession: false // This would require tracking current session
  }));

  res.status(200).json({
    success: true,
    data: { sessions }
  });
});

// @route   DELETE /api/auth/sessions/:sessionId
// @desc    Revoke specific session
// @access  Private
router.delete('/sessions/:sessionId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { sessionId } = req.params;

    // Find and remove the specific refresh token
    const tokenIndex = user.refreshTokens.findIndex(
      token => token._id.toString() === sessionId
    );

    if (tokenIndex === -1) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session not found' }
      });
    }

    user.refreshTokens.splice(tokenIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: 'Session revoked successfully' }
    });

  } catch (error) {
    logger.error('Session revoke error:', error);
    next(error);
  }
});

// @route   POST /api/auth/validate-token
// @desc    Validate token (for mobile apps)
// @access  Public
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token is required' }
      });
    }

    const decoded = AuthService.verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token or user inactive' }
      });
    }

    res.status(200).json({
      success: true,
      data: { 
        valid: true,
        user: user.toSafeObject()
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      data: { valid: false },
      error: { message: 'Invalid token' }
    });
  }
});

module.exports = router;