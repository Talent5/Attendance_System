const express = require('express');
const router = express.Router();
const absenteeNotificationService = require('../services/absenteeNotificationService');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @route   GET /api/absentee/schedule-info
 * @desc    Get information about the absentee notification schedule
 * @access  Private (Admin only)
 */
router.get('/schedule-info', authenticate, (req, res) => {
  try {
    const scheduleInfo = absenteeNotificationService.getScheduleInfo();
    res.json({
      success: true,
      data: scheduleInfo
    });
  } catch (error) {
    logger.error('Error getting schedule info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedule information'
    });
  }
});

/**
 * @route   POST /api/absentee/manual-check
 * @desc    Manually trigger absentee notification check
 * @access  Private (Admin only)
 */
router.post('/manual-check', authenticate, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    await absenteeNotificationService.manualAbsenteeCheck();
    
    res.json({
      success: true,
      message: 'Manual absentee check completed successfully'
    });
  } catch (error) {
    logger.error('Error in manual absentee check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete manual absentee check'
    });
  }
});

/**
 * @route   GET /api/absentee/absent-students
 * @desc    Get list of absent students for a specific date
 * @access  Private (Admin and Teachers)
 */
router.get('/absent-students', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    let checkDate = new Date();
    
    if (date) {
      checkDate = new Date(date);
      if (isNaN(checkDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format'
        });
      }
    }

    const absentStudents = await absenteeNotificationService.getAbsentStudents(checkDate);
    
    res.json({
      success: true,
      data: {
        date: checkDate.toISOString().split('T')[0],
        absentCount: absentStudents.length,
        students: absentStudents.map(student => ({
          _id: student._id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: student.fullName,
          class: student.class,
          section: student.section,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
          guardianEmail: student.guardianEmail
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting absent students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get absent students list'
    });
  }
});

/**
 * @route   POST /api/absentee/send-notification
 * @desc    Send absentee notification to specific students' guardians
 * @access  Private (Admin only)
 */
router.post('/send-notification', [
  authenticate,
  body('studentIds').isArray().withMessage('Student IDs must be an array'),
  body('studentIds.*').isMongoId().withMessage('Invalid student ID format'),
  body('customMessage').optional().isLength({ max: 500 }).withMessage('Custom message must not exceed 500 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { studentIds, customMessage } = req.body;
    
    // Get students by IDs
    const Student = require('../models/Student');
    const students = await Student.find({ 
      _id: { $in: studentIds },
      isActive: true 
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid students found'
      });
    }

    // Send notifications (if custom message is provided, use bulk notification)
    let results;
    if (customMessage) {
      const notificationService = require('../services/notificationService');
      results = await notificationService.sendBulkNotifications(
        students, 
        customMessage, 
        'Custom School Notification'
      );
    } else {
      results = await absenteeNotificationService.sendAbsenteeNotifications(students);
    }

    res.json({
      success: true,
      message: `Notifications sent to ${students.length} student(s)`,
      data: {
        totalStudents: students.length,
        results: results
      }
    });
  } catch (error) {
    logger.error('Error sending custom notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications'
    });
  }
});

/**
 * @route   GET /api/absentee/statistics
 * @desc    Get absentee statistics for a date range
 * @access  Private (Admin and Teachers)
 */
router.get('/statistics', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const Attendance = require('../models/Attendance');
    const Student = require('../models/Student');
    
    // Get attendance statistics
    const attendanceStats = await Attendance.getAttendanceStats(start, end);
    const totalStudents = await Student.countDocuments({ isActive: true });
    
    // Calculate absentee rates
    const statisticsWithAbsentees = attendanceStats.map(stat => {
      const presentCount = stat.statusCounts.find(s => s.status === 'present')?.count || 0;
      const lateCount = stat.statusCounts.find(s => s.status === 'late')?.count || 0;
      const absentCount = totalStudents - (presentCount + lateCount);
      
      return {
        date: stat._id,
        totalStudents: totalStudents,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        attendanceRate: ((presentCount + lateCount) / totalStudents * 100).toFixed(2),
        absenteeRate: (absentCount / totalStudents * 100).toFixed(2)
      };
    });

    res.json({
      success: true,
      data: {
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        totalStudents: totalStudents,
        statistics: statisticsWithAbsentees
      }
    });
  } catch (error) {
    logger.error('Error getting absentee statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get absentee statistics'
    });
  }
});

/**
 * @route   POST /api/absentee/test-notification
 * @desc    Test the notification system with a sample message
 * @access  Private (Admin only)
 */
router.post('/test-notification', [
  authenticate,
  body('testEmail').isEmail().withMessage('Valid test email is required'),
  body('testPhone').optional().isMobilePhone().withMessage('Valid test phone number required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user has admin privileges
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const { testEmail, testPhone } = req.body;
    const notificationService = require('../services/notificationService');
    
    const testResults = {
      email: null,
      sms: null,
      errors: []
    };

    // Test email
    try {
      const emailResult = await notificationService.sendEmail(
        testEmail,
        '📧 Test: Absentee Notification System',
        'This is a test message from the QR Attendance System absentee notification service. If you receive this, the email notifications are working correctly!'
      );
      testResults.email = { success: true, messageId: emailResult.messageId };
    } catch (error) {
      testResults.errors.push(`Email test failed: ${error.message}`);
    }

    // Test SMS (if phone provided)
    if (testPhone) {
      try {
        const smsResult = await notificationService.sendSMS(
          testPhone,
          'TEST: QR Attendance System - Absentee notifications are working correctly!'
        );
        testResults.sms = { success: true, sid: smsResult.sid };
      } catch (error) {
        testResults.errors.push(`SMS test failed: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Notification test completed',
      data: testResults
    });
  } catch (error) {
    logger.error('Error testing notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test notification system'
    });
  }
});

module.exports = router;
