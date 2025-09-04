const express = require('express');
const router = express.Router();
const { Student } = require('../models');
const QRService = require('../services/qrService');
const { 
  authenticate,
  requireTeacherOrAdmin,
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
router.use(requireTeacherOrAdmin);

// @route   GET /api/students
// @desc    Get all students with pagination and filtering
// @access  Private/Teacher/Admin
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      class: className,
      section,
      search,
      isActive,
      sortBy = 'lastName',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};
    
    if (className) query.class = className;
    if (section) query.section = section;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { guardianName: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [students, total] = await Promise.all([
      Student.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalStudents: total,
          hasNext: skip + students.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get students error:', error);
    next(error);
  }
});

// @route   GET /api/students/stats
// @desc    Get student statistics
// @access  Private/Teacher/Admin
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Student.aggregate([
      {
        $group: {
          _id: {
            class: '$class',
            section: '$section'
          },
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          avgAttendance: { $avg: '$attendanceStats.attendancePercentage' }
        }
      },
      {
        $group: {
          _id: '$_id.class',
          sections: {
            $push: {
              section: '$_id.section',
              count: '$count',
              active: '$active',
              avgAttendance: '$avgAttendance'
            }
          },
          totalInClass: { $sum: '$count' },
          totalActiveInClass: { $sum: '$active' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalStudents = await Student.countDocuments();
    const totalActive = await Student.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        totalActive,
        totalInactive: totalStudents - totalActive,
        byClass: stats,
        recentEnrollments: await Student.countDocuments({
          enrollmentDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      }
    });

  } catch (error) {
    logger.error('Get student stats error:', error);
    next(error);
  }
});

// @route   GET /api/students/classes
// @desc    Get list of all classes and sections
// @access  Private/Teacher/Admin
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await Student.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$class',
          sections: { $addToSet: '$section' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { classes }
    });

  } catch (error) {
    logger.error('Get classes error:', error);
    next(error);
  }
});

// @route   GET /api/students/:id
// @desc    Get single student by ID
// @access  Private/Teacher/Admin
router.get('/:id', 
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const student = await Student.findById(req.params.id);

      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: { student }
      });

    } catch (error) {
      logger.error('Get student error:', error);
      next(error);
    }
  }
);

// @route   POST /api/students
// @desc    Create new student
// @access  Private/Teacher/Admin
router.post('/',
  validate(schemas.studentCreate),
  async (req, res, next) => {
    try {
      const studentData = req.body;

      console.log('Creating new student');
      console.log('Student data:', JSON.stringify(studentData, null, 2));

      // Check if student ID already exists
      const existingStudent = await Student.findOne({ studentId: studentData.studentId });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          error: { message: 'Student ID already exists' }
        });
      }

      // Create student
      const student = new Student(studentData);
      await student.save();

      logger.info(`New student created: ${student.studentId} by user: ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: {
          student,
          message: 'Student created successfully'
        }
      });

    } catch (error) {
      logger.error('Create student error:', error);
      next(error);
    }
  }
);

// @route   PUT /api/students/:id
// @desc    Update student
// @access  Private/Teacher/Admin
router.put('/:id',
  validateObjectId('id'),
  validate(schemas.studentUpdate),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('Updating student:', id);
      console.log('Update data:', JSON.stringify(updates, null, 2));

      const student = await Student.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      logger.info(`Student updated: ${student.studentId} by user: ${req.user.email}`, { updates });

      res.status(200).json({
        success: true,
        data: {
          student,
          message: 'Student updated successfully'
        }
      });

    } catch (error) {
      logger.error('Update student error:', error);
      next(error);
    }
  }
);

// @route   DELETE /api/students/:id
// @desc    Delete student (soft delete)
// @access  Private/Admin
router.delete('/:id',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      // Soft delete - deactivate student
      student.isActive = false;
      await student.save();

      logger.info(`Student soft deleted: ${student.studentId} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: { message: 'Student deleted successfully' }
      });

    } catch (error) {
      logger.error('Delete student error:', error);
      next(error);
    }
  }
);

// @route   GET /api/students/:id/qr
// @desc    Get QR code for student
// @access  Private/Teacher/Admin
router.get('/:id/qr',
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const student = await Student.findById(req.params.id);

      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      if (!student.isActive) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot generate QR code for inactive student' }
        });
      }

      // Generate QR code image
      const qrCodeImage = await QRService.generateQRCode(student.qrCodeData);

      res.status(200).json({
        success: true,
        data: {
          qrCode: student.qrCode,
          qrCodeData: student.qrCodeData,
          qrCodeImage,
          student: student.getQRData()
        }
      });

    } catch (error) {
      logger.error('Get QR code error:', error);
      next(error);
    }
  }
);

// @route   POST /api/students/:id/regenerate-qr
// @desc    Regenerate QR code for student
// @access  Private/Admin
router.post('/:id/regenerate-qr',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const student = await Student.findById(req.params.id);

      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      // Regenerate QR code by triggering pre-save middleware
      student.qrCode = undefined;
      student.qrCodeData = undefined;
      await student.save();

      // Generate new QR code image
      const qrCodeImage = await QRService.generateQRCode(student.qrCodeData);

      logger.info(`QR code regenerated for student: ${student.studentId} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: {
          qrCode: student.qrCode,
          qrCodeData: student.qrCodeData,
          qrCodeImage,
          message: 'QR code regenerated successfully'
        }
      });

    } catch (error) {
      logger.error('Regenerate QR code error:', error);
      next(error);
    }
  }
);

// @route   POST /api/students/:id/upload-photo
// @desc    Upload profile photo for student
// @access  Private/Teacher/Admin
router.post('/:id/upload-photo',
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

      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      // Update student with photo path
      const photoPath = `profiles/${req.file.filename}`;
      student.profilePhoto = photoPath;
      await student.save();

      logger.info(`Profile photo uploaded for student: ${student.studentId}`);

      res.status(200).json({
        success: true,
        data: {
          student,
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

// @route   GET /api/students/search
// @desc    Search students
// @access  Private/Teacher/Admin
router.get('/search',
  async (req, res, next) => {
    try {
      const { q, class: className, section, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'Search query must be at least 2 characters' }
        });
      }

      const query = {
        isActive: true,
        $or: [
          { firstName: { $regex: q, $options: 'i' } },
          { lastName: { $regex: q, $options: 'i' } },
          { studentId: { $regex: q, $options: 'i' } },
          { guardianName: { $regex: q, $options: 'i' } }
        ]
      };

      if (className) query.class = className;
      if (section) query.section = section;

      const students = await Student.find(query)
        .select('firstName lastName studentId class section profilePhoto')
        .limit(parseInt(limit))
        .sort({ lastName: 1, firstName: 1 });

      res.status(200).json({
        success: true,
        data: { students }
      });

    } catch (error) {
      logger.error('Search students error:', error);
      next(error);
    }
  }
);

// @route   GET /api/students/class/:className
// @desc    Get students by class
// @access  Private/Teacher/Admin
router.get('/class/:className', async (req, res, next) => {
  try {
    const { className } = req.params;
    const { section } = req.query;

    const students = await Student.findByClass(className, section);

    res.status(200).json({
      success: true,
      data: { students }
    });

  } catch (error) {
    logger.error('Get students by class error:', error);
    next(error);
  }
});

// @route   PUT /api/students/:id/toggle-status
// @desc    Toggle student active status
// @access  Private/Admin
router.put('/:id/toggle-status',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      // Toggle status
      student.isActive = !student.isActive;
      await student.save();

      logger.info(`Student status toggled: ${student.studentId} (${student.isActive ? 'activated' : 'deactivated'}) by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: {
          student,
          message: `Student ${student.isActive ? 'activated' : 'deactivated'} successfully`
        }
      });

    } catch (error) {
      logger.error('Toggle student status error:', error);
      next(error);
    }
  }
);

// @route   GET /api/students/:id/attendance-summary
// @desc    Get attendance summary for student
// @access  Private/Teacher/Admin
router.get('/:id/attendance-summary',
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const student = await Student.findById(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          error: { message: 'Student not found' }
        });
      }

      // Get attendance records for the student
      const { Attendance } = require('../models');
      
      const query = { studentId: id };
      if (startDate || endDate) {
        query.scanTime = {};
        if (startDate) query.scanTime.$gte = new Date(startDate);
        if (endDate) query.scanTime.$lte = new Date(endDate);
      }

      const attendanceRecords = await Attendance.find(query)
        .sort({ scanTime: -1 })
        .limit(100)
        .populate('scannedBy', 'name');

      const summary = {
        student: student.getQRData(),
        attendanceStats: student.attendanceStats,
        recentAttendance: attendanceRecords
      };

      res.status(200).json({
        success: true,
        data: summary
      });

    } catch (error) {
      logger.error('Get attendance summary error:', error);
      next(error);
    }
  }
);

// @route   POST /api/students/bulk-import
// @desc    Bulk import students from CSV/Excel
// @access  Private/Admin
router.post('/bulk-import',
  requireAdmin,
  async (req, res, next) => {
    try {
      const { students } = req.body;

      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: 'Students array is required' }
        });
      }

      const results = {
        success: [],
        errors: [],
        duplicates: []
      };

      for (let i = 0; i < students.length; i++) {
        try {
          const studentData = students[i];
          
          // Validate required fields
          const { error } = schemas.studentCreate.validate(studentData);
          if (error) {
            results.errors.push({
              row: i + 1,
              studentId: studentData.studentId,
              error: error.details.map(d => d.message).join(', ')
            });
            continue;
          }

          // Check for duplicate
          const existing = await Student.findOne({ studentId: studentData.studentId });
          if (existing) {
            results.duplicates.push({
              row: i + 1,
              studentId: studentData.studentId,
              error: 'Student ID already exists'
            });
            continue;
          }

          // Create student
          const student = new Student(studentData);
          await student.save();
          
          results.success.push({
            row: i + 1,
            studentId: student.studentId,
            name: student.fullName
          });

        } catch (error) {
          results.errors.push({
            row: i + 1,
            studentId: students[i]?.studentId || 'Unknown',
            error: error.message
          });
        }
      }

      logger.info(`Bulk import completed by admin: ${req.user.email}`, {
        total: students.length,
        success: results.success.length,
        errors: results.errors.length,
        duplicates: results.duplicates.length
      });

      res.status(200).json({
        success: true,
        data: {
          results,
          summary: {
            total: students.length,
            imported: results.success.length,
            errors: results.errors.length,
            duplicates: results.duplicates.length
          }
        }
      });

    } catch (error) {
      logger.error('Bulk import error:', error);
      next(error);
    }
  }
);

module.exports = router;