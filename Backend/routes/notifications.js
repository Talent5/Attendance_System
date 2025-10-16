const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// @route   GET /api/notifications
// @desc    Get all notifications with filtering and pagination
// @access  Private (Admin/Manager)
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      employeeId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (employeeId) filter.employeeId = employeeId;
    if (search) {
      filter.$or = [
        { message: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const notifications = await Notification.find(filter)
      .populate('employeeId', 'firstName lastName employeeId department position')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error while fetching notifications' });
  }
});

// @route   POST /api/notifications/send
// @desc    Send notification to individual employee
// @access  Private (Admin/Manager)
router.post('/send',
  authenticate,
  [
    body('employeeId').isMongoId().withMessage('Valid employee ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['sms', 'email', 'both']).withMessage('Type must be sms, email, or both'),
    body('subject').optional().isString().withMessage('Subject must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { employeeId, message, type, subject } = req.body;

      // Check if employee exists
      const employee = await Employee.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // Create notification record
      const notification = new Notification({
        employeeId,
        message,
        type,
        subject: subject || `Notification for ${employee.firstName} ${employee.lastName}`,
        status: 'pending',
        createdBy: req.user.id
      });

      await notification.save();

      // Send notification based on type
      let result = { success: false, details: {} };

      if (type === 'email' || type === 'both') {
        try {
          if (employee.email) {
            await notificationService.sendEmail(
              employee.email,
              notification.subject,
              message
            );
            result.details.email = { success: true, recipient: employee.email };
          } else {
            result.details.email = { success: false, error: 'Employee has no email address' };
          }
        } catch (emailError) {
          logger.error('Email sending failed:', emailError);
          result.details.email = { success: false, error: emailError.message };
        }
      }

      if (type === 'sms' || type === 'both') {
        try {
          if (employee.phoneNumber) {
            await notificationService.sendSMS(employee.phoneNumber, message);
            result.details.sms = { success: true, recipient: employee.phoneNumber };
          } else {
            result.details.sms = { success: false, error: 'Employee has no phone number' };
          }
        } catch (smsError) {
          logger.error('SMS sending failed:', smsError);
          result.details.sms = { success: false, error: smsError.message };
        }
      }

      // Update notification status based on results
      const emailSuccess = !result.details.email || result.details.email.success;
      const smsSuccess = !result.details.sms || result.details.sms.success;
      
      if (emailSuccess && smsSuccess) {
        notification.status = 'sent';
        result.success = true;
      } else if (result.details.email?.success || result.details.sms?.success) {
        notification.status = 'partial';
        result.success = true;
      } else {
        notification.status = 'failed';
        result.success = false;
      }

      await notification.save();

      res.json({
        message: result.success ? 'Notification sent successfully' : 'Notification failed to send',
        notification,
        result
      });

    } catch (error) {
      logger.error('Error sending notification:', error);
      res.status(500).json({ error: 'Server error while sending notification' });
    }
  }
);

// @route   POST /api/notifications/bulk-send
// @desc    Send bulk notifications to multiple employees
// @access  Private (Admin/Manager)
router.post('/bulk-send',
  authenticate,
  [
    body('employeeIds').isArray({ min: 1 }).withMessage('At least one employee ID is required'),
    body('employeeIds.*').isMongoId().withMessage('All employee IDs must be valid'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['sms', 'email', 'both']).withMessage('Type must be sms, email, or both'),
    body('subject').optional().isString().withMessage('Subject must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { employeeIds, message, type, subject } = req.body;

      // Validate employees exist
      const employees = await Employee.find({ _id: { $in: employeeIds } });
      if (employees.length !== employeeIds.length) {
        return res.status(404).json({ error: 'One or more employees not found' });
      }

      const results = [];
      const notifications = [];

      // Process each employee
      for (const employee of employees) {
        try {
          // Create notification record
          const notification = new Notification({
            employeeId: employee._id,
            message,
            type,
            subject: subject || `Bulk Notification for ${employee.firstName} ${employee.lastName}`,
            status: 'pending',
            createdBy: req.user.id
          });

          const result = { 
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            success: false,
            details: {}
          };

          // Send email if required
          if (type === 'email' || type === 'both') {
            try {
              if (employee.email) {
                await notificationService.sendEmail(
                  employee.email,
                  notification.subject,
                  message
                );
                result.details.email = { success: true, recipient: employee.email };
              } else {
                result.details.email = { success: false, error: 'Employee has no email address' };
              }
            } catch (emailError) {
              logger.error(`Email failed for employee ${employee.employeeId}:`, emailError);
              result.details.email = { success: false, error: emailError.message };
            }
          }

          // Send SMS if required
          if (type === 'sms' || type === 'both') {
            try {
              if (employee.phoneNumber) {
                await notificationService.sendSMS(employee.phoneNumber, message);
                result.details.sms = { success: true, recipient: employee.phoneNumber };
              } else {
                result.details.sms = { success: false, error: 'Employee has no phone number' };
              }
            } catch (smsError) {
              logger.error(`SMS failed for employee ${employee.employeeId}:`, smsError);
              result.details.sms = { success: false, error: smsError.message };
            }
          }

          // Determine overall success
          const emailSuccess = !result.details.email || result.details.email.success;
          const smsSuccess = !result.details.sms || result.details.sms.success;
          
          if (emailSuccess && smsSuccess) {
            notification.status = 'sent';
            result.success = true;
          } else if (result.details.email?.success || result.details.sms?.success) {
            notification.status = 'partial';
            result.success = true;
          } else {
            notification.status = 'failed';
            result.success = false;
          }

          await notification.save();
          notifications.push(notification);
          results.push(result);

        } catch (error) {
          logger.error(`Error processing notification for employee ${employee.employeeId}:`, error);
          results.push({
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;

      res.json({
        message: `Bulk notification completed: ${successCount}/${totalCount} successful`,
        results,
        summary: {
          total: totalCount,
          successful: successCount,
          failed: totalCount - successCount
        }
      });

    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      res.status(500).json({ error: 'Server error while sending bulk notifications' });
    }
  }
);

// @route   GET /api/notifications/:id
// @desc    Get specific notification by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('employeeId', 'firstName lastName employeeId department position email phoneNumber');

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    logger.error('Error fetching notification:', error);
    res.status(500).json({ error: 'Server error while fetching notification' });
  }
});

// @route   PUT /api/notifications/:id/status
// @desc    Update notification status
// @access  Private (Admin/Manager)
router.put('/:id/status',
  authenticate,
  [
    body('status').isIn(['pending', 'sent', 'failed', 'read']).withMessage('Invalid status value')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { 
          status: req.body.status,
          updatedAt: new Date()
        },
        { new: true }
      ).populate('employeeId', 'firstName lastName employeeId department position');

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      logger.error('Error updating notification status:', error);
      res.status(500).json({ error: 'Server error while updating notification status' });
    }
  }
);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private (Admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Only admin can delete notifications
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Server error while deleting notification' });
  }
});

// @route   GET /api/notifications/stats/summary
// @desc    Get notification statistics
// @access  Private (Admin/Manager)
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    const typeStats = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalNotifications = await Notification.countDocuments();
    const todayNotifications = await Notification.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    res.json({
      total: totalNotifications,
      today: todayNotifications,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      byType: typeStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    logger.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Server error while fetching notification statistics' });
  }
});

module.exports = router;
