const express = require('express');
const router = express.Router();
const { Attendance, Student } = require('../models');
const QRService = require('../services/qrService');
const AttendanceService = require('../services/attendanceService');
const NotificationService = require('../services/notificationService');
const { 
  authenticate,
  requireTeacherOrAdmin,
  validate,
  schemas,
  validateObjectId
} = require('../middleware');
const logger = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticate);
router.use(requireTeacherOrAdmin);

// @route   POST /api/attendance/scan
// @desc    Record attendance via QR code scan
// @access  Private/Teacher/Admin
router.post('/scan',
  validate(schemas.attendanceScan),
  async (req, res, next) => {
    try {
      const { qrCode, location, notes, geoLocation } = req.body;
      const scannedBy = req.user._id;

      // Parse and validate QR code
      const qrResult = QRService.parseQRCode(qrCode);
      
      if (!qrResult.isValid) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Invalid QR code',
            details: qrResult.error
          }
        });
      }

      // Find student
      const student = await Student.findOne({ 
        studentId: qrResult.studentId,
        isActive: true 
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found or inactive' }
        });
      }

      // Check for duplicate scan today
      const existingAttendance = await AttendanceService.checkDuplicateScan(
        student._id, 
        new Date()
      );

      if (existingAttendance) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Attendance already recorded for today',
            existingRecord: existingAttendance.getSummary()
          }
        });
      }

      // Create attendance record
      const attendanceData = {
        studentId: student._id,
        scannedBy,
        qrCode,
        scanTime: new Date(),
        scanDate: new Date(), // Explicitly set scanDate to today
        location: location || 'Main Campus',
        notes,
        deviceInfo: {
          platform: req.get('x-platform') || 'web',
          userAgent: req.get('user-agent'),
          ipAddress: req.ip
        }
      };

      if (geoLocation) {
        attendanceData.geoLocation = geoLocation;
      }

      const attendance = new Attendance(attendanceData);
      await attendance.save();

      // Update student attendance statistics
      await student.updateAttendanceStats(attendance.status);

      // Send notification to guardian
      try {
        await NotificationService.sendAttendanceNotification(student, attendance);
      } catch (notificationError) {
        logger.warn('Failed to send attendance notification:', notificationError);
      }

      // Populate the response
      await attendance.populate([
        { path: 'studentId', select: 'firstName lastName studentId class section' },
        { path: 'scannedBy', select: 'name email' }
      ]);

      logger.info(`Attendance recorded: ${student.studentId} scanned by ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: {
          attendance,
          student: student.getQRData(),
          message: `Attendance recorded successfully - ${attendance.status}`
        }
      });

    } catch (error) {
      logger.error('Attendance scan error:', error);
      next(error);
    }
  }
);

// @route   GET /api/attendance
// @desc    Get attendance records with filtering and pagination
// @access  Private/Teacher/Admin
router.get('/',
  validate(schemas.attendanceQuery, 'query'),
  async (req, res, next) => {
    try {
      const {
        startDate,
        endDate,
        class: className,
        section,
        status,
        studentId,
        page,
        limit
      } = req.query;

      // Build query
      const query = { isValidScan: true };

      // Date filtering
      if (startDate || endDate) {
        query.scanTime = {};
        if (startDate) {
          // Set to start of day for startDate
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          query.scanTime.$gte = start;
        }
        if (endDate) {
          // Set to end of day for endDate
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          query.scanTime.$lte = end;
        }
      }

      if (status) query.status = status;
      if (studentId) query.studentId = studentId;

      logger.info('Attendance query filters:', { startDate, endDate, className, section, status, studentId });
      logger.info('Built query:', JSON.stringify(query, null, 2));

      // Build aggregation pipeline for class/section filtering
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' }
      ];

      // Add class/section filters
      if (className || section) {
        const studentMatch = {};
        if (className) studentMatch['student.class'] = className;
        if (section) studentMatch['student.section'] = section;
        pipeline.push({ $match: studentMatch });
      }

      // Add pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      pipeline.push(
        { $sort: { scanTime: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      );

      // Add population
      pipeline.push(
        {
          $lookup: {
            from: 'users',
            localField: 'scannedBy',
            foreignField: '_id',
            as: 'scannedBy'
          }
        },
        { $unwind: '$scannedBy' },
        {
          $project: {
            _id: 1,
            scanTime: 1,
            status: 1,
            location: 1,
            timeWindow: 1,
            minutesLate: 1,
            notes: 1,
            'student.firstName': 1,
            'student.lastName': 1,
            'student.studentId': 1,
            'student.class': 1,
            'student.section': 1,
            'scannedBy.name': 1,
            'scannedBy.email': 1
          }
        }
      );

      const [attendance, totalCount] = await Promise.all([
        Attendance.aggregate(pipeline),
        Attendance.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: {
          attendance,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalRecords: totalCount,
            hasNext: skip + attendance.length < totalCount,
            hasPrev: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get attendance error:', error);
      next(error);
    }
  }
);

// @route   GET /api/attendance/stats
// @desc    Get attendance statistics
// @access  Private/Teacher/Admin
router.get('/stats', async (req, res, next) => {
  try {
    const { startDate, endDate, class: className, section } = req.query;

    const stats = await AttendanceService.getAttendanceStatistics({
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date(),
      class: className,
      section
    });

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get attendance stats error:', error);
    next(error);
  }
});

// @route   GET /api/attendance/today
// @desc    Get today's attendance
// @access  Private/Teacher/Admin
router.get('/today', async (req, res, next) => {
  try {
    const { class: className, section } = req.query;

    const todayAttendance = await Attendance.findByDate(new Date())
      .populate('studentId', 'firstName lastName studentId class section profilePhoto')
      .populate('scannedBy', 'name');

    // Filter by class/section if provided
    let filteredAttendance = todayAttendance;
    if (className || section) {
      filteredAttendance = todayAttendance.filter(record => {
        const student = record.studentId;
        return (!className || student.class === className) &&
               (!section || student.section === section);
      });
    }

    // Get summary statistics
    const summary = {
      total: filteredAttendance.length,
      present: filteredAttendance.filter(r => r.status === 'present').length,
      late: filteredAttendance.filter(r => r.status === 'late').length,
      onTime: filteredAttendance.filter(r => r.timeWindow === 'on_time').length
    };

    res.status(200).json({
      success: true,
      data: {
        date: new Date().toDateString(),
        attendance: filteredAttendance,
        summary
      }
    });

  } catch (error) {
    logger.error('Get today attendance error:', error);
    next(error);
  }
});

// @route   GET /api/attendance/student/:studentId
// @desc    Get attendance history for specific student
// @access  Private/Teacher/Admin
router.get('/student/:studentId',
  validateObjectId('studentId'),
  async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const { limit = 50, startDate, endDate } = req.query;

      // Verify student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      // Build query
      const query = { studentId, isValidScan: true };
      if (startDate || endDate) {
        query.scanTime = {};
        if (startDate) query.scanTime.$gte = new Date(startDate);
        if (endDate) query.scanTime.$lte = new Date(endDate);
      }

      const attendance = await Attendance.find(query)
        .populate('scannedBy', 'name')
        .sort({ scanTime: -1 })
        .limit(parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          student: student.getQRData(),
          attendanceStats: student.attendanceStats,
          attendance
        }
      });

    } catch (error) {
      logger.error('Get student attendance error:', error);
      next(error);
    }
  }
);

// @route   GET /api/attendance/reports
// @desc    Generate attendance reports
// @access  Private/Teacher/Admin
router.get('/reports', async (req, res, next) => {
  try {
    const {
      type = 'summary',
      format = 'json',
      startDate,
      endDate,
      class: className,
      section
    } = req.query;

    const reportData = await AttendanceService.generateReport({
      type,
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date(),
      class: className,
      section
    });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.csv');
      return res.send(reportData.csv);
    }

    res.status(200).json({
      success: true,
      data: reportData
    });

  } catch (error) {
    logger.error('Generate attendance report error:', error);
    next(error);
  }
});

// @route   GET /api/attendance/absent-students
// @desc    Get list of students who haven't attended today
// @access  Private/Teacher/Admin
router.get('/absent-students', async (req, res, next) => {
  try {
    const { class: className, section } = req.query;

    const absentStudents = await AttendanceService.getAbsentStudents({
      date: new Date(),
      class: className,
      section
    });

    res.status(200).json({
      success: true,
      data: {
        date: new Date().toDateString(),
        absentStudents,
        count: absentStudents.length
      }
    });

  } catch (error) {
    logger.error('Get absent students error:', error);
    next(error);
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private/Teacher/Admin
router.put('/:id',
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, notes, location } = req.body;

      const attendance = await Attendance.findById(id);
      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: { message: 'Attendance record not found' }
        });
      }

      // Update allowed fields
      if (status && ['present', 'late', 'absent'].includes(status)) {
        attendance.status = status;
      }
      if (notes !== undefined) attendance.notes = notes;
      if (location) attendance.location = location;

      await attendance.save();

      logger.info(`Attendance record updated: ${id} by ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: {
          attendance,
          message: 'Attendance record updated successfully'
        }
      });

    } catch (error) {
      logger.error('Update attendance error:', error);
      next(error);
    }
  }
);

// @route   DELETE /api/attendance/:id
// @desc    Mark attendance as invalid (soft delete)
// @access  Private/Admin
router.delete('/:id',
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const attendance = await Attendance.findById(id);
      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: { message: 'Attendance record not found' }
        });
      }

      // Mark as invalid instead of deleting
      attendance.isValidScan = false;
      attendance.invalidReason = reason || 'deleted_by_admin';
      await attendance.save();

      logger.info(`Attendance record invalidated: ${id} by admin: ${req.user.email}`, { reason });

      res.status(200).json({
        success: true,
        data: { message: 'Attendance record invalidated successfully' }
      });

    } catch (error) {
      logger.error('Delete attendance error:', error);
      next(error);
    }
  }
);

// @route   POST /api/attendance/manual
// @desc    Manually record attendance (without QR scan)
// @access  Private/Teacher/Admin
router.post('/manual', async (req, res, next) => {
  try {
    const { studentId, status, notes, location, scanTime } = req.body;

    if (!studentId || !status) {
      return res.status(400).json({
        success: false,
        error: { message: 'Student ID and status are required' }
      });
    }

    // Verify student exists
    const student = await Student.findById(studentId);
    if (!student || !student.isActive) {
      return res.status(404).json({
        success: false,
        error: { message: 'Student not found or inactive' }
      });
    }

    const attendanceDate = scanTime ? new Date(scanTime) : new Date();

    // Check for duplicate
    const existingAttendance = await AttendanceService.checkDuplicateScan(
      studentId,
      attendanceDate
    );

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: { message: 'Attendance already recorded for this date' }
      });
    }

    // Create manual attendance record
    const attendance = new Attendance({
      studentId,
      scannedBy: req.user._id,
      scanTime: attendanceDate,
      scanDate: new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate()), // Set date part only
      status,
      location: location || 'Manual Entry',
      notes: notes || 'Manually recorded',
      qrCode: 'MANUAL_ENTRY',
      deviceInfo: {
        platform: 'web',
        userAgent: req.get('user-agent'),
        ipAddress: req.ip
      }
    });

    await attendance.save();

    // Update student stats
    await student.updateAttendanceStats(status);

    await attendance.populate([
      { path: 'studentId', select: 'firstName lastName studentId class section' },
      { path: 'scannedBy', select: 'name email' }
    ]);

    logger.info(`Manual attendance recorded: ${student.studentId} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: {
        attendance,
        message: 'Manual attendance recorded successfully'
      }
    });

  } catch (error) {
    logger.error('Manual attendance error:', error);
    next(error);
  }
});

// @route   GET /api/attendance/export
// @desc    Export attendance data
// @access  Private/Teacher/Admin
router.get('/export', async (req, res, next) => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      class: className,
      section
    } = req.query;

    const exportData = await AttendanceService.exportAttendance({
      format,
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date(),
      class: className,
      section
    });

    // Set appropriate headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.csv');
      return res.send(exportData);
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance-export.xlsx');
      return res.send(exportData);
    }

    res.status(200).json({
      success: true,
      data: exportData
    });

  } catch (error) {
    logger.error('Export attendance error:', error);
    next(error);
  }
});

module.exports = router;