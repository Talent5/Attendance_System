const express = require('express');
const router = express.Router();
const { Employee } = require('../models');
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
router.use(requireTeacherOrAdmin); // Will be updated to requireManagerOrAdmin

// @route   GET /api/employees
// @desc    Get all employees with pagination and filtering
// @access  Private/Manager/Admin
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      department: departmentName,
      position,
      search,
      isActive,
      sortBy = 'lastName',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};
    
    if (departmentName) query.department = departmentName;
    if (position) query.position = position;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { emergencyContactName: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const [employees, total] = await Promise.all([
      Employee.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Employee.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        employees,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalEmployees: total,
          hasNext: skip + employees.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get students error:', error);
    next(error);
  }
});

// @route   GET /api/employees/stats
// @desc    Get employee statistics
// @access  Private/Manager/Admin
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: {
            department: '$department',
            position: '$position'
          },
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } },
          avgAttendance: { $avg: '$attendanceStats.attendancePercentage' }
        }
      },
      {
        $group: {
          _id: '$_id.department',
          positions: {
            $push: {
              position: '$_id.position',
              count: '$count',
              active: '$active',
              avgAttendance: '$avgAttendance'
            }
          },
          totalInDepartment: { $sum: '$count' },
          totalActiveInDepartment: { $sum: '$active' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalEmployees = await Employee.countDocuments();
    const totalActive = await Employee.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        totalActive,
        totalInactive: totalEmployees - totalActive,
        byDepartment: stats,
        recentHires: await Employee.countDocuments({
          hireDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        })
      }
    });

  } catch (error) {
    logger.error('Get student stats error:', error);
    next(error);
  }
});

// @route   GET /api/employees/departments
// @desc    Get list of all departments and positions
// @access  Private/Manager/Admin
router.get('/departments', async (req, res, next) => {
  try {
    const departments = await Employee.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$department',
          positions: { $addToSet: '$position' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: { departments }
    });

  } catch (error) {
    logger.error('Get departments error:', error);
    next(error);
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee by ID
// @access  Private/Manager/Admin
router.get('/:id', 
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: { message: 'Employee not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: { employee }
      });

    } catch (error) {
      logger.error('Get student error:', error);
      next(error);
    }
  }
);

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private/Manager/Admin
router.post('/',
  validate(schemas.employeeCreate),
  async (req, res, next) => {
    try {
      const employeeData = req.body;

      console.log('Creating new employee');
      console.log('Employee data:', JSON.stringify(employeeData, null, 2));

      // Check if employee ID already exists
      const existingEmployee = await Employee.findOne({ employeeId: employeeData.employeeId });
      if (existingEmployee) {
        return res.status(400).json({
          success: false,
          error: { message: 'Employee ID already exists' }
        });
      }

      // Create employee
      const employee = new Employee(employeeData);
      await employee.save();

      logger.info(`New employee created: ${employee.employeeId} by user: ${req.user.email}`);

      res.status(201).json({
        success: true,
        data: {
          employee,
          message: 'Employee created successfully'
        }
      });

    } catch (error) {
      logger.error('Create employee error:', error);
      next(error);
    }
  }
);

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private/Manager/Admin
router.put('/:id',
  validateObjectId('id'),
  validate(schemas.studentUpdate),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('Updating employee:', id);
      console.log('Update data:', JSON.stringify(updates, null, 2));

      const employee = await Employee.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: { message: 'Employee not found' }
        });
      }

      logger.info(`Employee updated: ${employee.employeeId} by user: ${req.user.email}`, { updates });

      res.status(200).json({
        success: true,
        data: {
          employee,
          message: 'Employee updated successfully'
        }
      });

    } catch (error) {
      logger.error('Update employee error:', error);
      next(error);
    }
  }
);

// @route   DELETE /api/employees/:id
// @desc    Delete employee (soft delete)
// @access  Private/Admin
router.delete('/:id',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: { message: 'Employee not found' }
        });
      }

      // Soft delete - deactivate employee
      employee.isActive = false;
      await employee.save();

      logger.info(`Employee soft deleted: ${employee.employeeId} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: { message: 'Employee deleted successfully' }
      });

    } catch (error) {
      logger.error('Delete employee error:', error);
      next(error);
    }
  }
);

// @route   GET /api/employees/:id/qr
// @desc    Get QR code for employee
// @access  Private/Manager/Admin
router.get('/:id/qr',
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: { message: 'Employee not found' }
        });
      }

      if (!employee.isActive) {
        return res.status(400).json({
          success: false,
          error: { message: 'Cannot generate QR code for inactive employee' }
        });
      }

      // Generate QR code image
      const qrCodeImage = await QRService.generateQRCode(employee.qrCodeData);

      res.status(200).json({
        success: true,
        data: {
          qrCode: employee.qrCode,
          qrCodeData: employee.qrCodeData,
          qrCodeImage,
          employee: employee.getQRData()
        }
      });

    } catch (error) {
      logger.error('Get QR code error:', error);
      next(error);
    }
  }
);

// @route   POST /api/employees/:id/regenerate-qr
// @desc    Regenerate QR code for employee
// @access  Private/Admin
router.post('/:id/regenerate-qr',
  requireAdmin,
  validateObjectId('id'),
  async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.params.id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: { message: 'Employee not found' }
        });
      }

      // Regenerate QR code by triggering pre-save middleware
      employee.qrCode = undefined;
      employee.qrCodeData = undefined;
      await employee.save();

      // Generate new QR code image
      const qrCodeImage = await QRService.generateQRCode(employee.qrCodeData);

      logger.info(`QR code regenerated for employee: ${employee.employeeId} by admin: ${req.user.email}`);

      res.status(200).json({
        success: true,
        data: {
          qrCode: employee.qrCode,
          qrCodeData: employee.qrCodeData,
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

// @route   POST /api/employees/:id/upload-photo
// @desc    Upload profile photo for employee
// @access  Private/Manager/Admin
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

      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: { message: 'Employee not found' }
        });
      }

      // Update employee with photo path
      const photoPath = `profiles/${req.file.filename}`;
      employee.profilePhoto = photoPath;
      await employee.save();

      logger.info(`Profile photo uploaded for employee: ${employee.employeeId}`);

      res.status(200).json({
        success: true,
        data: {
          employee,
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