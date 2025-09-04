const { Attendance, Student } = require('../models');
const logger = require('../utils/logger');

class AttendanceService {
  /**
   * Check for duplicate attendance scan on the same day
   * @param {string} studentId - Student ObjectId
   * @param {Date} scanDate - Date to check for duplicates
   * @returns {Promise<object|null>} Existing attendance record or null
   */
  static async checkDuplicateScan(studentId, scanDate) {
    try {
      const startOfDay = new Date(scanDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(scanDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAttendance = await Attendance.findOne({
        studentId: studentId,
        scanTime: { $gte: startOfDay, $lte: endOfDay },
        isValidScan: true
      }).populate('studentId', 'firstName lastName studentId class section');

      return existingAttendance;

    } catch (error) {
      logger.error('Check duplicate scan error:', error);
      throw new Error('Failed to check for duplicate attendance');
    }
  }

  /**
   * Validate attendance scan based on time windows and business rules
   * @param {object} scanData - Scan data containing time, location, etc.
   * @returns {object} Validation result
   */
  static validateAttendanceScan(scanData) {
    try {
      const { scanTime, location } = scanData;
      const now = new Date();
      const scanDate = new Date(scanTime);

      const validation = {
        isValid: true,
        warnings: [],
        errors: []
      };

      // Check if scan is in the future
      if (scanDate > now) {
        validation.isValid = false;
        validation.errors.push('Cannot record attendance for future time');
        return validation;
      }

      // Check if scan is too old (more than 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (scanDate < sevenDaysAgo) {
        validation.isValid = false;
        validation.errors.push('Cannot record attendance older than 7 days');
        return validation;
      }

      // Check if scan is on weekend (configurable)
      const isWeekend = scanDate.getDay() === 0 || scanDate.getDay() === 6;
      if (isWeekend && process.env.ALLOW_WEEKEND_ATTENDANCE !== 'true') {
        validation.warnings.push('Attendance recorded on weekend');
      }

      // Check time windows
      const hour = scanDate.getHours();
      const minute = scanDate.getMinutes();
      const totalMinutes = hour * 60 + minute;

      const schoolStartTime = parseInt(process.env.SCHOOL_START_HOUR) || 8; // 8:00 AM
      const schoolEndTime = parseInt(process.env.SCHOOL_END_HOUR) || 16; // 4:00 PM
      
      const startMinutes = schoolStartTime * 60;
      const endMinutes = schoolEndTime * 60;

      if (totalMinutes < startMinutes - 60) { // Before 7:00 AM
        validation.warnings.push('Early arrival recorded');
      } else if (totalMinutes > endMinutes + 60) { // After 5:00 PM
        validation.warnings.push('Late evening scan recorded');
      }

      // Validate location if configured
      const allowedLocations = process.env.ALLOWED_LOCATIONS?.split(',') || [];
      if (allowedLocations.length > 0 && !allowedLocations.includes(location)) {
        validation.warnings.push('Scan from non-standard location');
      }

      return validation;

    } catch (error) {
      logger.error('Attendance validation error:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to system error']
      };
    }
  }

  /**
   * Get attendance statistics for a date range
   * @param {object} filters - Filter options
   * @returns {Promise<object>} Statistics object
   */
  static async getAttendanceStatistics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        class: className,
        section
      } = filters;

      // Build match query
      const matchQuery = {
        scanTime: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        isValidScan: true
      };

      // Aggregation pipeline
      const pipeline = [
        { $match: matchQuery },
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

      // Group by date and status
      pipeline.push(
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$scanDate' } },
              status: '$status'
            },
            count: { $sum: 1 },
            students: { $addToSet: '$studentId' }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            statusCounts: {
              $push: {
                status: '$_id.status',
                count: '$count'
              }
            },
            totalAttendance: { $sum: '$count' },
            uniqueStudents: { $sum: { $size: '$students' } }
          }
        },
        { $sort: { _id: -1 } }
      );

      const dailyStats = await Attendance.aggregate(pipeline);

      // Overall statistics
      const overallPipeline = [
        { $match: matchQuery },
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

      if (className || section) {
        const studentMatch = {};
        if (className) studentMatch['student.class'] = className;
        if (section) studentMatch['student.section'] = section;
        overallPipeline.push({ $match: studentMatch });
      }

      overallPipeline.push(
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      );

      const overallStats = await Attendance.aggregate(overallPipeline);

      // Calculate percentages
      const totalScans = overallStats.reduce((sum, stat) => sum + stat.count, 0);
      const statsWithPercentages = overallStats.map(stat => ({
        status: stat._id,
        count: stat.count,
        percentage: totalScans > 0 ? ((stat.count / totalScans) * 100).toFixed(2) : 0
      }));

      return {
        period: {
          startDate,
          endDate,
          days: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))
        },
        overall: {
          totalScans,
          byStatus: statsWithPercentages
        },
        daily: dailyStats,
        filters: { className, section }
      };

    } catch (error) {
      logger.error('Get attendance statistics error:', error);
      throw new Error('Failed to generate attendance statistics');
    }
  }

  /**
   * Get list of absent students for a specific date
   * @param {object} options - Options including date, class, section
   * @returns {Promise<Array>} Array of absent students
   */
  static async getAbsentStudents(options = {}) {
    try {
      const {
        date = new Date(),
        class: className,
        section
      } = options;

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all students who attended today
      const attendedStudentIds = await Attendance.distinct('studentId', {
        scanTime: { $gte: startOfDay, $lte: endOfDay },
        isValidScan: true
      });

      // Build query for all students
      const studentQuery = { isActive: true };
      if (className) studentQuery.class = className;
      if (section) studentQuery.section = section;

      // Get all students who didn't attend
      const absentStudents = await Student.find({
        ...studentQuery,
        _id: { $nin: attendedStudentIds }
      }).select('firstName lastName studentId class section guardianName guardianPhone');

      return absentStudents;

    } catch (error) {
      logger.error('Get absent students error:', error);
      throw new Error('Failed to get absent students');
    }
  }

  /**
   * Generate attendance reports
   * @param {object} options - Report options
   * @returns {Promise<object>} Report data
   */
  static async generateReport(options = {}) {
    try {
      const {
        type = 'summary',
        startDate,
        endDate,
        class: className,
        section
      } = options;

      switch (type) {
        case 'summary':
          return await this.generateSummaryReport({ startDate, endDate, className, section });
        case 'detailed':
          return await this.generateDetailedReport({ startDate, endDate, className, section });
        case 'student':
          return await this.generateStudentReport({ startDate, endDate, className, section });
        default:
          throw new Error('Invalid report type');
      }

    } catch (error) {
      logger.error('Generate report error:', error);
      throw new Error('Failed to generate attendance report');
    }
  }

  /**
   * Generate summary attendance report
   */
  static async generateSummaryReport(options) {
    const stats = await this.getAttendanceStatistics(options);
    
    return {
      type: 'summary',
      ...stats,
      generatedAt: new Date()
    };
  }

  /**
   * Generate detailed attendance report
   */
  static async generateDetailedReport(options) {
    const { startDate, endDate, className, section } = options;

    const pipeline = [
      {
        $match: {
          scanTime: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          isValidScan: true
        }
      },
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

    if (className || section) {
      const studentMatch = {};
      if (className) studentMatch['student.class'] = className;
      if (section) studentMatch['student.section'] = section;
      pipeline.push({ $match: studentMatch });
    }

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
      { $sort: { scanTime: -1 } }
    );

    const detailedRecords = await Attendance.aggregate(pipeline);

    return {
      type: 'detailed',
      period: { startDate, endDate },
      filters: { className, section },
      records: detailedRecords,
      count: detailedRecords.length,
      generatedAt: new Date()
    };
  }

  /**
   * Generate student-wise attendance report
   */
  static async generateStudentReport(options) {
    const { startDate, endDate, className, section } = options;

    const pipeline = [
      {
        $match: {
          scanTime: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          },
          isValidScan: true
        }
      },
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

    if (className || section) {
      const studentMatch = {};
      if (className) studentMatch['student.class'] = className;
      if (section) studentMatch['student.section'] = section;
      pipeline.push({ $match: studentMatch });
    }

    pipeline.push(
      {
        $group: {
          _id: '$studentId',
          student: { $first: '$student' },
          totalDays: { $sum: 1 },
          presentDays: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          lateDays: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          attendanceRecords: { $push: '$$ROOT' }
        }
      },
      {
        $addFields: {
          attendancePercentage: {
            $multiply: [
              { $divide: ['$presentDays', '$totalDays'] },
              100
            ]
          }
        }
      },
      { $sort: { 'student.lastName': 1, 'student.firstName': 1 } }
    );

    const studentReports = await Attendance.aggregate(pipeline);

    return {
      type: 'student',
      period: { startDate, endDate },
      filters: { className, section },
      students: studentReports,
      count: studentReports.length,
      generatedAt: new Date()
    };
  }

  /**
   * Export attendance data in various formats
   * @param {object} options - Export options
   * @returns {Promise<string|Buffer>} Export data
   */
  static async exportAttendance(options = {}) {
    try {
      const {
        format = 'csv',
        startDate,
        endDate,
        class: className,
        section
      } = options;

      const reportData = await this.generateDetailedReport({
        startDate,
        endDate,
        className,
        section
      });

      if (format === 'csv') {
        return this.convertToCSV(reportData.records);
      } else if (format === 'json') {
        return reportData;
      }

      throw new Error('Unsupported export format');

    } catch (error) {
      logger.error('Export attendance error:', error);
      throw new Error('Failed to export attendance data');
    }
  }

  /**
   * Convert attendance records to CSV format
   * @param {Array} records - Attendance records
   * @returns {string} CSV data
   */
  static convertToCSV(records) {
    if (!records || records.length === 0) {
      return 'No data available';
    }

    const headers = [
      'Date',
      'Time',
      'Student ID',
      'Student Name',
      'Class',
      'Section',
      'Status',
      'Time Window',
      'Minutes Late',
      'Location',
      'Scanned By',
      'Notes'
    ];

    const csvRows = [headers.join(',')];

    records.forEach(record => {
      const row = [
        new Date(record.scanTime).toLocaleDateString(),
        new Date(record.scanTime).toLocaleTimeString(),
        record.student.studentId,
        `"${record.student.firstName} ${record.student.lastName}"`,
        record.student.class,
        record.student.section,
        record.status,
        record.timeWindow,
        record.minutesLate || 0,
        `"${record.location}"`,
        `"${record.scannedBy.name}"`,
        `"${record.notes || ''}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Get attendance insights and analytics
   * @param {object} options - Analysis options
   * @returns {Promise<object>} Insights data
   */
  static async getAttendanceInsights(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = options;

      // Peak attendance times
      const timeAnalysis = await Attendance.aggregate([
        {
          $match: {
            scanTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
            isValidScan: true
          }
        },
        {
          $group: {
            _id: { $hour: '$scanTime' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Attendance trends by day of week
      const dayAnalysis = await Attendance.aggregate([
        {
          $match: {
            scanTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
            isValidScan: true
          }
        },
        {
          $group: {
            _id: { $dayOfWeek: '$scanTime' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      // Late arrival patterns
      const latePatterns = await Attendance.aggregate([
        {
          $match: {
            scanTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
            status: 'late',
            isValidScan: true
          }
        },
        {
          $group: {
            _id: '$studentId',
            lateCount: { $sum: 1 },
            avgMinutesLate: { $avg: '$minutesLate' }
          }
        },
        { $sort: { lateCount: -1 } },
        { $limit: 10 }
      ]);

      return {
        period: { startDate, endDate },
        peakHours: timeAnalysis,
        weekdayPatterns: dayAnalysis,
        lateArrivals: latePatterns,
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Get attendance insights error:', error);
      throw new Error('Failed to generate attendance insights');
    }
  }
}

module.exports = AttendanceService;