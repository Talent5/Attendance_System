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
   * Generate QR code for student ID card
   * @param {object} studentData - Student data object
   * @returns {Promise<object>} QR code data and image
   */
  static async generateStudentQRCode(studentData) {
    try {
      // Create QR data with security features
      const qrData = {
        id: studentData.studentId,
        name: studentData.fullName,
        class: studentData.class,
        section: studentData.section,
        school: process.env.SCHOOL_NAME || 'QR Attendance School',
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
        qrCode: `QR-${studentData.studentId}-${Date.now()}`,
        qrCodeData: qrString,
        qrCodeImage,
        securityHash
      };

    } catch (error) {
      logger.error('Student QR code generation failed:', error);
      throw new Error('Failed to generate student QR code');
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
      const isLegacyFormat = qrData.type === 'attendance' && qrData.studentId && qrData.name;
      
      if (isLegacyFormat) {
        // For legacy format, just verify required fields exist
        const requiredFields = ['studentId', 'name', 'class', 'section'];
        for (const field of requiredFields) {
          if (!qrData[field]) {
            logger.warn(`Legacy QR code missing required field: ${field}`, qrData);
            return false;
          }
        }
        logger.info('Legacy QR code format validated successfully', { 
          studentId: qrData.studentId, 
          type: qrData.type 
        });
        return true;
      }

      // For newer QR codes with hash
      const { hash, ...dataWithoutHash } = qrData;
      
      if (!hash) {
        // If no hash and not legacy format, check if it's a simple student QR code
        const hasBasicStudentFields = qrData.id && qrData.name && qrData.class && qrData.section;
        if (hasBasicStudentFields) {
          logger.info('Basic student QR code format detected', { 
            studentId: qrData.id || qrData.studentId 
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
      let studentId, studentName, classValue, section;
      
      // Handle legacy format (from mobile app)
      if (qrData.type === 'attendance' && qrData.studentId) {
        studentId = qrData.studentId;
        studentName = qrData.name;
        classValue = qrData.class;
        section = qrData.section;
        
        logger.info('Legacy attendance QR code processed', { studentId, studentName });
      } else if (qrData.id) {
        // Handle standard format (from admin dashboard)
        studentId = qrData.id;
        studentName = qrData.name;
        classValue = qrData.class;
        section = qrData.section;
        
        logger.info('Standard QR code processed', { studentId, studentName });
      } else {
        throw new Error('QR code missing required student identification fields');
      }

      // Final validation of extracted data
      if (!studentId || !studentName || !classValue || !section) {
        const missingFields = [];
        if (!studentId) missingFields.push('studentId');
        if (!studentName) missingFields.push('name');
        if (!classValue) missingFields.push('class');
        if (!section) missingFields.push('section');
        
        throw new Error(`QR code missing required fields: ${missingFields.join(', ')}`);
      }

      return {
        isValid: true,
        data: qrData,
        studentId: studentId,
        studentName: studentName,
        class: classValue,
        section: section
      };

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