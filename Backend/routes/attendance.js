const express = require('express');
const router = express.Router();
const { Attendance, Employee } = require('../models');
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

      // Find person (employee or student for backward compatibility)
      let person;
      if (qrResult.isEmployee) {
        // Try to find by employeeId first, then by MongoDB _id as fallback
        person = await Employee.findOne({ 
          employeeId: qrResult.employeeId,
          isActive: true 
        });
        
        // If not found by employeeId, try MongoDB _id (for backward compatibility)
        if (!person && qrResult.employeeId) {
          try {
            person = await Employee.findOne({
              _id: qrResult.employeeId,
              isActive: true
            });
          } catch (err) {
            // Invalid MongoDB _id format, continue
          }
        }
        
        if (!person) {
          return res.status(404).json({
            success: false,
            error: { message: 'Employee not found or inactive' }
          });
        }
      } else {
        // Backward compatibility for student QR codes
        person = await Employee.findOne({ 
          employeeId: qrResult.studentId, // Try to find employee with student ID format
          isActive: true 
        });
        
        // Try MongoDB _id as fallback
        if (!person && qrResult.studentId) {
          try {
            person = await Employee.findOne({
              _id: qrResult.studentId,
              isActive: true
            });
          } catch (err) {
            // Invalid MongoDB _id format, continue
          }
        }
        
        if (!person) {
          return res.status(404).json({
            success: false,
            error: { message: 'Person not found or inactive' }
          });
        }
      }

      // Check for duplicate scan today
      const existingAttendance = await AttendanceService.checkDuplicateScan(
        person._id, 
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
        employeeId: person._id,
        scannedBy,
        qrCode,
        scanTime: new Date(),
        scanDate: new Date(), // Explicitly set scanDate to today
        location: location || 'Main Office',
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

      // Update person attendance statistics (skip if employee record is incomplete)
      try {
        await person.updateAttendanceStats(attendance.status);
      } catch (statsError) {
        logger.warn(`Failed to update attendance stats for ${person._id}:`, statsError.message);
        // Continue anyway - the attendance record is still created successfully
      }

      // Send notification to emergency contact
      try {
        await NotificationService.sendAttendanceNotification(person, attendance);
      } catch (notificationError) {
        logger.warn('Failed to send attendance notification:', notificationError);
      }

      // Populate the response
      await attendance.populate([
        { path: 'employeeId', select: 'firstName lastName employeeId department position' },
        { path: 'scannedBy', select: 'name email' }
      ]);

      logger.info(`Attendance recorded: ${person.employeeId} scanned by ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: {
          attendance,
          employee: person.getQRData(),
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
      if (studentId) query.employeeId = studentId;

      logger.info('Attendance query filters:', { startDate, endDate, className, section, status, employeeId: studentId });
      logger.info('Built query:', JSON.stringify(query, null, 2));

      // Build aggregation pipeline for employee filtering
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'employee'
          }
        },
        { $unwind: '$employee' }
      ];

      // Add department/position filters
      if (className || section) {
        const employeeMatch = {};
        if (className) employeeMatch['employee.department'] = className;
        if (section) employeeMatch['employee.position'] = section;
        pipeline.push({ $match: employeeMatch });
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
            'employee.firstName': 1,
            'employee.lastName': 1,
            'employee.employeeId': 1,
            'employee.department': 1,
            'employee.position': 1,
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
      .populate('employeeId', 'firstName lastName employeeId department position profilePhoto')
      .populate('scannedBy', 'name');

    // Filter by class/section if provided
    let filteredAttendance = todayAttendance;
    if (className || section) {
      filteredAttendance = todayAttendance.filter(record => {
        const employee = record.employeeId;
        return (!className || employee.department === className) &&
               (!section || employee.position === section);
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
// @desc    Get attendance history for specific employee (backward compatible with studentId parameter)
// @access  Private/Teacher/Admin
router.get('/student/:studentId',
  validateObjectId('studentId'),
  async (req, res, next) => {
    try {
      const { studentId } = req.params;
      const { startDate, endDate, limit = 20 } = req.query;

      const student = await Employee.findById(studentId);

      if (!student || !student.isActive) {
        return res.status(404).json({
          success: false,
          error: { message: 'Employee not found or inactive' }
        });
      }

      const query = { employeeId: studentId, isValidScan: true };
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
          employee: student.getQRData ? student.getQRData() : { name: student.fullName, employeeId: student.employeeId },
          attendanceStats: student.attendanceStats || {},
          attendance
        }
      });

    } catch (error) {
      logger.error('Get employee attendance error:', error);
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
// @desc    Manually record attendance (without QR scan) - backward compatible with studentId
// @access  Private/Teacher/Admin
router.post('/manual', async (req, res, next) => {
  try {
    const { studentId, employeeId, status, notes, location, scanTime } = req.body;

    // Accept both studentId (backward compat) and employeeId
    const targetId = employeeId || studentId;

    if (!targetId || !status) {
      return res.status(400).json({
        success: false,
        error: { message: 'Employee ID and status are required' }
      });
    }

    // Verify employee exists
    const employee = await Employee.findById(targetId);
    if (!employee || !employee.isActive) {
      return res.status(404).json({
        success: false,
        error: { message: 'Employee not found or inactive' }
      });
    }

    const attendanceDate = scanTime ? new Date(scanTime) : new Date();

    // Check for duplicate
    const existingAttendance = await AttendanceService.checkDuplicateScan(
      targetId,
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
      employeeId: targetId,
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

    // Update employee stats (with error handling)
    try {
      await employee.updateAttendanceStats(status);
    } catch (statsError) {
      logger.warn(`Failed to update attendance stats: ${statsError.message}`);
      // Continue - attendance still recorded
    }

    await attendance.populate([
      { path: 'employeeId', select: 'firstName lastName employeeId department position' },
      { path: 'scannedBy', select: 'name email' }
    ]);

    logger.info(`Manual attendance recorded: ${employee.employeeId || employee._id} by ${req.user.email}`);

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