const express = require('express');
const router = express.Router();
const { User } = require('../models');
const AuthService = require('../services/authService');
const { 
  authenticate,
  requireAdmin,
  validate,
  schemas,
  validateObjectId,
  profilePhotoUpload,
  handleUploadError,
  validateImage
} = require('../middleware');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      role, 
      search, 
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('GET /api/users - Query params:', req.query);
    console.log('Filters:', { role, search, isActive, page, limit, sortBy, sortOrder });

    // Build query
    const query = {};
    
    if (role) query.role = role;
    if (isActive !== undefined && isActive !== '') query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('MongoDB query:', JSON.stringify(query));

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    console.log('Pagination:', { skip, limit: parseInt(limit), sort });

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshTokens')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    console.log('Query results:', { usersFound: users.length, total });
    console.log('Sample user:', users[0] ? { name: users[0].name, email: users[0].email } : 'No users');

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get users error:', error);
    next(error);
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private/Admin
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          inactive: { $sum: { $cond: ['$isActive', 0, 1] } }
        }
      }
    ]);

    const totalUsers = await User.countDocuments();
    const totalActive = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalActive,
        totalInactive: totalUsers - totalActive,
        byRole: stats,
        recentRegistrations: await User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      }
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    next(error);
  }
});

// @route   GET /api/users/:id
// @desc    Get single user by ID
// @access  Private/Admin
router.get('/:id', 
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id).select('-password -refreshTokens');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: { user }
      });

    } catch (error) {
      logger.error('Get user error:', error);
      next(error);
    }
  }
);

// @route   POST /api/users
// @desc    Create new user (admin only)
// @access  Private/Admin
router.post('/',
  requireAdmin,
  validate(schemas.userRegister),
  async (req, res, next) => {
    try {
      const { name, email, password, role, phoneNumber, department, isActive } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: { message: 'User with this email already exists' }
        });
      }

      // Validate password strength
      const passwordValidation = AuthService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Password does not meet requirements',
            details: passwordValidation.errors
          }
        });
      }

      // Create user
      const user = new User({
        name,
        email,
        password,
        role,
        phoneNumber,
        department,
        isActive: isActive !== undefined ? isActive : true
      });

      await user.save();

      logger.info(`New user created: ${email} by admin: ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: {
          user: user.toSafeObject(),
          message: 'User created successfully'
        }
      });

    } catch (error) {
      logger.error('Create user error:', error);
      next(error);
    }
  }
);

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put('/:id',
  requireAdmin,
  validateObjectId('id'),
  validate(schemas.userUpdate),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Prevent admin from updating their own role or status
      const targetUser = await User.findById(id);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      if (targetUser._id.toString() === req.user._id.toString()) {
        delete updates.role;
        delete updates.isActive;
      }

      // If email is being updated, check for duplicates
      if (updates.email) {
        const existingUser = await User.findOne({ 
          email: updates.email,
          _id: { $ne: id }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            error: { message: 'Email already exists' }
          });
        }
      }

      const user = await User.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');

      logger.info(`User updated: ${user.email} by admin: ${req.user.email}`, { updates });

      res.status(200).json({
        success: true,
        data: {
          user,
          message: 'User updated successfully'
        }
      });

    } catch (error) {
      logger.error('Update user error:', error);
      next(error);
    }
  }
);

// @route   PUT /api/users/:id/password
// @desc    Reset user password (admin only)
// @access  Private/Admin
router.put('/:id/password',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          error: { message: 'New password is required' }
        });
      }

      // Validate password strength
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

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Clear all refresh tokens to force re-login
      await user.clearRefreshTokens();

      logger.info(`Password reset for user: ${user.email} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: { message: 'Password reset successfully. User must log in again.' }
      });

    } catch (error) {
      logger.error('Password reset error:', error);
      next(error);
    }
  }
);

// @route   PUT /api/users/:id/toggle-status
// @desc    Toggle user active status (admin only)
// @access  Private/Admin
router.put('/:id/toggle-status',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      // Prevent admin from deactivating themselves
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot change your own status' }
        });
      }

      // Toggle status
      user.isActive = !user.isActive;
      await user.save();

      // If deactivating, clear all refresh tokens
      if (!user.isActive) {
        await user.clearRefreshTokens();
      }

      logger.info(`User status toggled: ${user.email} (${user.isActive ? 'activated' : 'deactivated'}) by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: {
          user: user.toSafeObject(),
          message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
        }
      });

    } catch (error) {
      logger.error('Toggle user status error:', error);
      next(error);
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      // Prevent admin from deleting themselves
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot delete your own account' }
        });
      }

      // Soft delete - just deactivate
      user.isActive = false;
      user.email = `deleted_${Date.now()}_${user.email}`;
      await user.save();

      logger.info(`User soft deleted: ${user.email} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: { message: 'User deleted successfully' }
      });

    } catch (error) {
      logger.error('Delete user error:', error);
      next(error);
    }
  }
);

// @route   POST /api/users/:id/upload-photo
// @desc    Upload profile photo for user
// @access  Private/Admin
router.post('/:id/upload-photo',
  requireAdmin,
  validateObjectId('id'),
  profilePhotoUpload.single('photo'),
  handleUploadError,
  validateImage,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No photo file provided' }
        });
      }

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }

      // Update user with photo path
      const photoPath = `profiles/${req.file.filename}`;
      user.profileImage = photoPath;
      await user.save();

      logger.info(`Profile photo uploaded for user: ${user.email}`);

      res.status(200).json({
        success: true,
        data: {
          user: user.toSafeObject(),
          photoUrl: `/uploads/${photoPath}`,
          message: 'Profile photo uploaded successfully'
        }
      });

    } catch (error) {
      logger.error('Photo upload error:', error);
      next(error);
    }
  }
);

// @route   GET /api/users/search
// @desc    Search users by various criteria
// @access  Private/Admin
router.get('/search',
  requireAdmin,
  async (req, res, next) => {
    try {
      const { q, role, department, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'Search query must be at least 2 characters' }
        });
      }

      const query = {
        $and: [
          {
            $or: [
              { name: { $regex: q, $options: 'i' } },
              { email: { $regex: q, $options: 'i' } },
              { department: { $regex: q, $options: 'i' } }
            ]
          }
        ]
      };

      if (role) query.$and.push({ role });
      if (department) query.$and.push({ department });

      const users = await User.find(query)
        .select('name email role department isActive')
        .limit(parseInt(limit))
        .sort({ name: 1 });

      res.status(200).json({
        success: true,
        data: { users }
      });

    } catch (error) {
      logger.error('Search users error:', error);
      next(error);
    }
  }
);

module.exports = router;