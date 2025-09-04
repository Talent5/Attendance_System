const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');
const Student = require('../models/Student');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// @route   GET /api/notifications
// @desc    Get all notifications (paginated)
// @access  Private (Admin/Teacher)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.studentId) filter.studentId = req.query.studentId;

    const notifications = await Notification.find(filter)
      .populate('studentId', 'firstName lastName studentId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error while fetching notifications' });
  }
});

// @route   POST /api/notifications/send
// @desc    Send notification to guardian
// @access  Private (Admin/Teacher)
router.post('/send', 
  authenticate,
  [
    body('studentId').isMongoId().withMessage('Valid student ID is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['attendance', 'alert', 'general']).withMessage('Valid notification type is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { studentId, message, type } = req.body;

      // Get student details
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Create notification record
      const notification = new Notification({
        studentId,
        guardianPhone: student.guardianPhone,
        guardianEmail: student.guardianEmail,
        message,
        type,
        status: 'pending'
      });

      await notification.save();

      // Send SMS notification
      try {
        if (student.guardianPhone) {
          await notificationService.sendSMS(student.guardianPhone, message);
          notification.status = 'sent';
          logger.info(`SMS sent to ${student.guardianPhone} for student ${student.firstName} ${student.lastName}`);
        }
      } catch (smsError) {
        logger.error('SMS sending failed:', smsError);
        notification.status = 'failed';
      }

      // Send email notification
      try {
        if (student.guardianEmail) {
          await notificationService.sendEmail(
            student.guardianEmail,
            `Notification: ${student.firstName} ${student.lastName}`,
            message
          );
          logger.info(`Email sent to ${student.guardianEmail} for student ${student.firstName} ${student.lastName}`);
        }
      } catch (emailError) {
        logger.error('Email sending failed:', emailError);
        if (notification.status !== 'failed') {
          notification.status = 'partial';
        }
      }

      notification.sentAt = new Date();
      await notification.save();

      await notification.populate('studentId', 'firstName lastName studentId');
      
      res.status(201).json({ 
        message: 'Notification sent successfully',
        notification 
      });
    } catch (error) {
      logger.error('Error sending notification:', error);
      res.status(500).json({ error: 'Server error while sending notification' });
    }
  }
);

// @route   POST /api/notifications/bulk-send
// @desc    Send bulk notifications to multiple guardians
// @access  Private (Admin only)
router.post('/bulk-send',
  authenticate,
  [
    body('studentIds').isArray().withMessage('Student IDs array is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['attendance', 'alert', 'general']).withMessage('Valid notification type is required')
  ],
  async (req, res) => {
    try {
      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { studentIds, message, type } = req.body;

      // Get all students
      const students = await Student.find({ _id: { $in: studentIds } });
      if (students.length === 0) {
        return res.status(404).json({ error: 'No students found' });
      }

      const results = [];

      // Send notifications to each student's guardian
      for (const student of students) {
        try {
          const notification = new Notification({
            studentId: student._id,
            guardianPhone: student.guardianPhone,
            guardianEmail: student.guardianEmail,
            message,
            type,
            status: 'pending'
          });

          await notification.save();

          // Send SMS
          if (student.guardianPhone) {
            try {
              await notificationService.sendSMS(student.guardianPhone, message);
              notification.status = 'sent';
            } catch (smsError) {
              logger.error(`SMS failed for ${student.guardianPhone}:`, smsError);
              notification.status = 'failed';
            }
          }

          // Send Email
          if (student.guardianEmail) {
            try {
              await notificationService.sendEmail(
                student.guardianEmail,
                `Notification: ${student.firstName} ${student.lastName}`,
                message
              );
            } catch (emailError) {
              logger.error(`Email failed for ${student.guardianEmail}:`, emailError);
              if (notification.status !== 'failed') {
                notification.status = 'partial';
              }
            }
          }

          notification.sentAt = new Date();
          await notification.save();

          results.push({
            studentId: student._id,
            studentName: `${student.firstName} ${student.lastName}`,
            status: notification.status
          });

        } catch (error) {
          logger.error(`Notification failed for student ${student._id}:`, error);
          results.push({
            studentId: student._id,
            studentName: `${student.firstName} ${student.lastName}`,
            status: 'failed',
            error: error.message
          });
        }
      }

      res.json({
        message: 'Bulk notifications processed',
        results,
        summary: {
          total: results.length,
          sent: results.filter(r => r.status === 'sent').length,
          failed: results.filter(r => r.status === 'failed').length,
          partial: results.filter(r => r.status === 'partial').length
        }
      });

    } catch (error) {
      logger.error('Error sending bulk notifications:', error);
      res.status(500).json({ error: 'Server error while sending bulk notifications' });
    }
  }
);

// @route   GET /api/notifications/:id
// @desc    Get notification by ID
// @access  Private (Admin/Teacher)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)
      .populate('studentId', 'firstName lastName studentId guardianName');

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
// @access  Private (Admin only)
router.put('/:id/status',
  authenticate,
  [
    body('status').isIn(['pending', 'sent', 'failed', 'partial']).withMessage('Valid status is required')
  ],
  async (req, res) => {
    try {
      // Check admin role
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const notification = await Notification.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      ).populate('studentId', 'firstName lastName studentId');

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      logger.error('Error updating notification status:', error);
      res.status(500).json({ error: 'Server error while updating notification' });
    }
  }
);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private (Admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const notification = await Notification.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Server error while deleting notification' });
  }
});

// @route   GET /api/notifications/stats/summary
// @desc    Get notification statistics
// @access  Private (Admin/Teacher)
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
