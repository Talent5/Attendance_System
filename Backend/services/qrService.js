const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

class QRService {
  /**
   * Generate QR code image from data
   * @param {string} data - Data to encode in QR code
   * @param {object} options - QR code generation options
   * @returns {Promise<string>} Base64 encoded QR code image
   */
  static async generateQRCode(data, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      };

      const qrOptions = { ...defaultOptions, ...options };

      // Generate QR code as base64 string
      const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
      
      // Return just the base64 part (remove data:image/png;base64, prefix)
      return qrCodeDataURL.split(',')[1];

    } catch (error) {
      logger.error('QR code generation failed:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code as buffer
   * @param {string} data - Data to encode in QR code
   * @param {object} options - QR code generation options
   * @returns {Promise<Buffer>} QR code image buffer
   */
  static async generateQRCodeBuffer(data, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      };

      const qrOptions = { ...defaultOptions, ...options };
      
      return await QRCode.toBuffer(data, qrOptions);

    } catch (error) {
      logger.error('QR code buffer generation failed:', error);
      throw new Error('Failed to generate QR code buffer');
    }
  }

  /**
   * Generate QR code for employee ID card
   * @param {object} employeeData - Employee data object
   * @returns {Promise<object>} QR code data and image
   */
  static async generateEmployeeQRCode(employeeData) {
    try {
      // Create QR data with security features
      const qrData = {
        id: employeeData.employeeId,
        name: employeeData.fullName,
        department: employeeData.department,
        position: employeeData.position,
        company: process.env.COMPANY_NAME || 'QR Attendance Company',
        issued: new Date().toISOString(),
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        version: '1.0'
      };

      // Add security hash
      const securityHash = this.generateSecurityHash(qrData);
      qrData.hash = securityHash;

      // Convert to JSON string
      const qrString = JSON.stringify(qrData);

      // Generate QR code image
      const qrCodeImage = await this.generateQRCode(qrString, {
        width: 200,
        margin: 2
      });

      return {
        qrCode: `QR-${employeeData.employeeId}-${Date.now()}`,
        qrCodeData: qrString,
        qrCodeImage,
        securityHash
      };

    } catch (error) {
      logger.error('Employee QR code generation failed:', error);
      throw new Error('Failed to generate employee QR code');
    }
  }

  /**
   * Generate security hash for QR data
   * @param {object} data - Data to hash
   * @returns {string} Security hash
   */
  static generateSecurityHash(data) {
    const secret = process.env.QR_SECRET || 'default-qr-secret';
    const dataString = JSON.stringify(data);
    
    return crypto
      .createHmac('sha256', secret)
      .update(dataString)
      .digest('hex')
      .substring(0, 16); // Use first 16 characters
  }

  /**
   * Verify QR code data integrity
   * @param {object} qrData - Parsed QR data
   * @returns {boolean} True if valid
   */
  static verifyQRCodeIntegrity(qrData) {
    try {
      if (!qrData || typeof qrData !== 'object') {
        return false;
      }

      // Check if this is a legacy QR code format (without hash)
      // This is for backward compatibility with older mobile apps
      const isLegacyStudentFormat = qrData.type === 'attendance' && qrData.studentId && qrData.name;
      const isLegacyEmployeeFormat = qrData.type === 'attendance' && qrData.employeeId && qrData.name;
      
      if (isLegacyStudentFormat) {
        // For legacy student format, just verify required fields exist
        const requiredFields = ['studentId', 'name', 'class', 'section'];
        for (const field of requiredFields) {
          if (!qrData[field]) {
            logger.warn(`Legacy student QR code missing required field: ${field}`, qrData);
            return false;
          }
        }
        logger.info('Legacy student QR code format validated successfully', { 
          studentId: qrData.studentId, 
          type: qrData.type 
        });
        return true;
      }
      
      if (isLegacyEmployeeFormat) {
        // For legacy employee format, verify minimal required fields
        // Note: Some QR codes may not include department/position yet - these are optional during transition
        const requiredFields = ['employeeId', 'name'];
        const missingRequired = [];
        
        for (const field of requiredFields) {
          if (!qrData[field]) {
            missingRequired.push(field);
          }
        }
        
        if (missingRequired.length > 0) {
          logger.warn(`Legacy employee QR code missing required field(s): ${missingRequired.join(', ')}`, qrData);
          return false;
        }
        
        // Warn but don't fail if optional fields are missing
        if (!qrData.department) {
          logger.warn('Legacy employee QR code missing optional field: department', { 
            employeeId: qrData.employeeId,
            name: qrData.name
          });
        }
        if (!qrData.position) {
          logger.warn('Legacy employee QR code missing optional field: position', { 
            employeeId: qrData.employeeId,
            name: qrData.name
          });
        }
        
        logger.info('Legacy employee QR code format validated successfully', { 
          employeeId: qrData.employeeId, 
          type: qrData.type 
        });
        return true;
      }

      // For newer QR codes with hash
      const { hash, ...dataWithoutHash } = qrData;
      
      if (!hash) {
        // If no hash and not legacy format, check if it's a simple QR code
        const hasBasicStudentFields = qrData.id && qrData.name && qrData.class && qrData.section;
        const hasBasicEmployeeFields = qrData.id && qrData.name && qrData.department && qrData.position;
        
        if (hasBasicStudentFields) {
          logger.info('Basic student QR code format detected', { 
            studentId: qrData.id || qrData.studentId 
          });
          return true;
        }
        
        if (hasBasicEmployeeFields) {
          logger.info('Basic employee QR code format detected', { 
            employeeId: qrData.id || qrData.employeeId 
          });
          return true;
        }
        logger.warn('QR code missing security hash and not recognized format', qrData);
        return false;
      }

      const expectedHash = this.generateSecurityHash(dataWithoutHash);
      const isValid = hash === expectedHash;
      
      if (!isValid) {
        logger.warn('QR code hash verification failed', { 
          expectedHash: expectedHash.substring(0, 8) + '...', 
          receivedHash: hash.substring(0, 8) + '...' 
        });
      }
      
      return isValid;

    } catch (error) {
      logger.error('QR code verification failed:', error);
      return false;
    }
  }

  /**
   * Parse and validate QR code data
   * @param {string} qrString - QR code string data
   * @returns {object} Parsed and validated QR data
   */
  static parseQRCode(qrString) {
    try {
      if (!qrString || typeof qrString !== 'string') {
        throw new Error('QR code data is empty or invalid');
      }

      // Parse JSON
      let qrData;
      try {
        qrData = JSON.parse(qrString);
      } catch (parseError) {
        logger.error('QR code JSON parsing failed:', parseError.message);
        throw new Error('QR code contains invalid JSON data');
      }

      // Log QR data for debugging (without sensitive info)
      logger.debug('Parsing QR code:', { 
        type: qrData.type, 
        studentId: qrData.studentId || qrData.id,
        employeeId: qrData.employeeId || qrData.id,
        hasHash: !!qrData.hash 
      });

      // Verify integrity
      if (!this.verifyQRCodeIntegrity(qrData)) {
        throw new Error('QR code integrity check failed');
      }

      // Check expiration (only for newer QR codes with expiration)
      if (qrData.expires && new Date(qrData.expires) < new Date()) {
        throw new Error('QR code has expired');
      }

      // Validate required fields based on QR code type
      let personId, personName, departmentOrClass, positionOrSection;
      let isEmployee = false;
      
      // Handle legacy student format (from mobile app)
      if (qrData.type === 'attendance' && qrData.studentId) {
        personId = qrData.studentId;
        personName = qrData.name;
        departmentOrClass = qrData.class;
        positionOrSection = qrData.section;
        
        logger.info('Legacy student attendance QR code processed', { studentId: personId, studentName: personName });
      } 
      // Handle legacy employee format (from mobile app)
      else if (qrData.type === 'attendance' && qrData.employeeId) {
        personId = qrData.employeeId;
        personName = qrData.name;
        departmentOrClass = qrData.department || 'Unknown Department'; // Use default if missing
        positionOrSection = qrData.position || 'Unknown Position'; // Use default if missing
        isEmployee = true;
        
        logger.info('Legacy employee attendance QR code processed', { employeeId: personId, employeeName: personName });
      }
      // Handle standard format (from admin dashboard)
      else if (qrData.id) {
        personId = qrData.id;
        personName = qrData.name;
        
        // Check if it's employee or student based on fields present
        if (qrData.department && qrData.position) {
          departmentOrClass = qrData.department;
          positionOrSection = qrData.position;
          isEmployee = true;
          logger.info('Standard employee QR code processed', { employeeId: personId, employeeName: personName });
        } else if (qrData.class && qrData.section) {
          departmentOrClass = qrData.class;
          positionOrSection = qrData.section;
          logger.info('Standard student QR code processed', { studentId: personId, studentName: personName });
        } else {
          throw new Error('QR code missing required department/class and position/section fields');
        }
      } else {
        throw new Error('QR code missing required identification fields');
      }

      // Final validation of extracted data
      if (!personId || !personName) {
        const missingFields = [];
        if (!personId) missingFields.push(isEmployee ? 'employeeId' : 'studentId');
        if (!personName) missingFields.push('name');
        
        throw new Error(`QR code missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Note: departmentOrClass and positionOrSection will have defaults if not provided
      // so we don't fail if they're missing

      const result = {
        isValid: true,
        data: qrData,
        isEmployee: isEmployee
      };
      
      if (isEmployee) {
        result.employeeId = personId;
        result.employeeName = personName;
        result.department = departmentOrClass;
        result.position = positionOrSection;
      } else {
        result.studentId = personId;
        result.studentName = personName;
        result.class = departmentOrClass;
        result.section = positionOrSection;
      }
      
      return result;

    } catch (error) {
      logger.error('QR code parsing failed:', error.message, { qrString: qrString?.substring(0, 100) });
      return {
        isValid: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Generate QR code for attendance verification
   * @param {object} attendanceData - Attendance data
   * @returns {Promise<string>} QR code image
   */
  static async generateAttendanceQRCode(attendanceData) {
    try {
      const qrData = {
        type: 'attendance',
        attendanceId: attendanceData._id,
        studentId: attendanceData.studentId,
        scanTime: attendanceData.scanTime,
        status: attendanceData.status,
        location: attendanceData.location,
        verified: true,
        timestamp: new Date().toISOString()
      };

      // Add security hash
      qrData.hash = this.generateSecurityHash(qrData);

      const qrString = JSON.stringify(qrData);
      return await this.generateQRCode(qrString, {
        width: 150,
        margin: 1
      });

    } catch (error) {
      logger.error('Attendance QR code generation failed:', error);
      throw new Error('Failed to generate attendance QR code');
    }
  }

  /**
   * Generate QR code for ID card printing
   * @param {object} studentData - Student data
   * @param {object} options - Printing options
   * @returns {Promise<object>} QR code data for printing
   */
  static async generatePrintableQRCode(studentData, options = {}) {
    try {
      const printOptions = {
        width: options.size || 150,
        margin: options.margin || 1,
        errorCorrectionLevel: 'H', // High error correction for printing
        ...options
      };

      // Generate student QR code
      const studentQR = await this.generateStudentQRCode(studentData);

      // Generate printable QR image
      const printableQR = await this.generateQRCode(
        studentQR.qrCodeData,
        printOptions
      );

      return {
        qrCode: studentQR.qrCode,
        qrCodeData: studentQR.qrCodeData,
        printableImage: printableQR,
        studentInfo: {
          name: studentData.fullName,
          studentId: studentData.studentId,
          class: studentData.classSection,
          photo: studentData.profilePhoto
        },
        printSettings: printOptions
      };

    } catch (error) {
      logger.error('Printable QR code generation failed:', error);
      throw new Error('Failed to generate printable QR code');
    }
  }

  /**
   * Validate QR code format and structure
   * @param {string} qrString - QR code string
   * @returns {object} Validation result
   */
  static validateQRFormat(qrString) {
    try {
      if (!qrString || typeof qrString !== 'string') {
        return {
          isValid: false,
          error: 'Invalid QR code format'
        };
      }

      // Try to parse as JSON
      let qrData;
      try {
        qrData = JSON.parse(qrString);
      } catch (parseError) {
        return {
          isValid: false,
          error: 'QR code is not valid JSON'
        };
      }

      // Check for required structure
      if (!qrData.id) {
        return {
          isValid: false,
          error: 'QR code missing student ID'
        };
      }

      // Check version compatibility
      const supportedVersions = ['1.0'];
      if (qrData.version && !supportedVersions.includes(qrData.version)) {
        return {
          isValid: false,
          error: 'Unsupported QR code version'
        };
      }

      return {
        isValid: true,
        version: qrData.version || '1.0',
        type: qrData.type || 'student'
      };

    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate batch QR codes for multiple students
   * @param {Array} students - Array of student data
   * @returns {Promise<Array>} Array of QR code results
   */
  static async generateBatchQRCodes(students) {
    try {
      const results = [];

      for (const student of students) {
        try {
          const qrResult = await this.generateStudentQRCode(student);
          results.push({
            studentId: student.studentId,
            success: true,
            qrCode: qrResult
          });
        } catch (error) {
          results.push({
            studentId: student.studentId,
            success: false,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      logger.error('Batch QR code generation failed:', error);
      throw new Error('Failed to generate batch QR codes');
    }
  }

  /**
   * Get QR code statistics
   * @returns {object} QR code usage statistics
   */
  static async getQRStatistics() {
    try {
      const { Student, Attendance } = require('../models');

      const stats = {
        totalQRCodes: await Student.countDocuments({ qrCode: { $exists: true } }),
        activeQRCodes: await Student.countDocuments({ 
          qrCode: { $exists: true }, 
          isActive: true 
        }),
        totalScans: await Attendance.countDocuments(),
        scansToday: await Attendance.countDocuments({
          scanTime: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }),
        lastGenerated: await Student.findOne(
          { qrCode: { $exists: true } },
          {},
          { sort: { updatedAt: -1 } }
        )
      };

      return stats;

    } catch (error) {
      logger.error('Failed to get QR statistics:', error);
      throw new Error('Failed to retrieve QR statistics');
    }
  }
}

module.exports = QRService;