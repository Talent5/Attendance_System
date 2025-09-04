const cron = require('node-cron');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class AbsenteeNotificationService {
  constructor() {
    this.scheduledJobs = new Map();
    this.notificationCutoffTime = '09:30'; // 9:30 AM
  }

  /**
   * Initialize the absentee notification scheduler
   */
  init() {
    // Schedule to run at 9:30 AM every weekday (Monday to Friday)
    const cronExpression = '30 9 * * 1-5'; // 9:30 AM, Monday to Friday
    
    const job = cron.schedule(cronExpression, async () => {
      await this.checkAndNotifyAbsentees();
    }, {
      scheduled: true,
      timezone: process.env.TIMEZONE || 'America/New_York'
    });

    this.scheduledJobs.set('absentee-check', job);
    logger.info('Absentee notification scheduler initialized - will run at 9:30 AM on weekdays');
  }

  /**
   * Check for absent students and send notifications to guardians
   */
  async checkAndNotifyAbsentees() {
    try {
      logger.info('Starting absentee notification check...');
      
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all active students
      const allStudents = await Student.find({ isActive: true });
      logger.info(`Found ${allStudents.length} active students`);

      // Get students who have already marked attendance today
      const presentStudents = await Attendance.find({
        scanTime: { $gte: startOfDay, $lte: endOfDay },
        isValidScan: true
      }).distinct('studentId');

      // Find absent students (those who haven't marked attendance)
      const absentStudentIds = allStudents
        .filter(student => !presentStudents.some(presentId => presentId.equals(student._id)))
        .map(student => student._id);

      if (absentStudentIds.length === 0) {
        logger.info('No absent students found - all students have marked attendance');
        return;
      }

      const absentStudents = await Student.find({ _id: { $in: absentStudentIds } });
      logger.info(`Found ${absentStudents.length} absent students`);

      // Send notifications to guardians
      const notificationResults = await this.sendAbsenteeNotifications(absentStudents);
      
      // Log the results
      this.logNotificationResults(notificationResults);

    } catch (error) {
      logger.error('Error in absentee notification check:', error);
    }
  }

  /**
   * Send absentee notifications to guardians
   * @param {Array} absentStudents - Array of absent student objects
   * @returns {Promise<Array>} - Array of notification results
   */
  async sendAbsenteeNotifications(absentStudents) {
    const results = [];
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();

    for (const student of absentStudents) {
      const result = {
        studentId: student._id,
        studentName: student.fullName,
        guardianEmail: student.guardianEmail,
        guardianPhone: student.guardianPhone,
        emailSent: false,
        smsSent: false,
        errors: []
      };

      try {
        // Prepare notification content
        const emailSubject = `⚠️ Attendance Alert: ${student.firstName} ${student.lastName} - Absent Today`;
        
        const emailContent = `
Dear ${student.guardianName},

This is an automated notification to inform you that your child has not yet arrived at school today.

Student Details:
📋 Name: ${student.firstName} ${student.lastName}
🆔 Student ID: ${student.studentId}
🎓 Class: ${student.class}${student.section ? ` - Section ${student.section}` : ''}
📅 Date: ${currentDate}
⏰ Notification Time: ${currentTime}

⚠️ IMPORTANT: Your child has not been marked present as of 9:30 AM today.

If your child is sick or will be absent for any reason, please contact the school office immediately.

If your child is on their way to school, please disregard this message.

For any questions or concerns, please contact the school administration.

Emergency Contact: ${student.emergencyContact?.name ? `${student.emergencyContact.name} - ${student.emergencyContact.phone}` : 'Contact school office'}

Thank you for your attention to this matter.

Best regards,
School Administration
QR Attendance System

---
This is an automated message. Please do not reply to this email.
        `;

        const smsMessage = `ALERT: ${student.firstName} ${student.lastName} (ID: ${student.studentId}) has not arrived at school as of 9:30 AM today (${currentDate}). Please contact school if child is sick or will be absent. - School Administration`;

        // Send email notification
        if (student.guardianEmail) {
          try {
            await notificationService.sendEmail(
              student.guardianEmail,
              emailSubject,
              emailContent,
              null,
              'absentee'
            );
            result.emailSent = true;
            logger.info(`Absentee email sent to guardian of ${student.fullName}`);
          } catch (error) {
            result.errors.push(`Email failed: ${error.message}`);
            logger.error(`Failed to send absentee email for ${student.fullName}:`, error);
          }
        } else {
          result.errors.push('No guardian email provided');
        }

        // Send SMS notification
        if (student.guardianPhone) {
          try {
            await notificationService.sendSMS(student.guardianPhone, smsMessage);
            result.smsSent = true;
            logger.info(`Absentee SMS sent to guardian of ${student.fullName}`);
          } catch (error) {
            result.errors.push(`SMS failed: ${error.message}`);
            logger.error(`Failed to send absentee SMS for ${student.fullName}:`, error);
          }
        } else {
          result.errors.push('No guardian phone provided');
        }

        // Create a record of the absence notification
        await this.createAbsenceRecord(student);

      } catch (error) {
        result.errors.push(`General error: ${error.message}`);
        logger.error(`Error processing absentee notification for ${student.fullName}:`, error);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Create an absence record for tracking
   * @param {Object} student - Student object
   */
  async createAbsenceRecord(student) {
    try {
      const today = new Date();
      const scanDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Check if an absence record already exists for today
      const existingRecord = await Attendance.findOne({
        studentId: student._id,
        scanDate: scanDate
      });

      if (!existingRecord) {
        // Create an absence record
        const absenceRecord = new Attendance({
          studentId: student._id,
          scannedBy: null, // System generated
          scanTime: new Date(),
          scanDate: scanDate,
          status: 'absent',
          location: 'System Generated',
          qrCode: 'ABSENCE_NOTIFICATION',
          isValidScan: false,
          invalidReason: 'absent',
          notes: 'Automatically marked absent - Guardian notified at 9:30 AM',
          notificationSent: true,
          notificationDetails: {
            sentAt: new Date(),
            method: 'multiple',
            status: 'sent'
          }
        });

        await absenceRecord.save();
        
        // Update student attendance stats
        await student.updateAttendanceStats('absent');
        
        logger.info(`Absence record created for ${student.fullName}`);
      }
    } catch (error) {
      logger.error(`Failed to create absence record for ${student.fullName}:`, error);
    }
  }

  /**
   * Log notification results
   * @param {Array} results - Array of notification results
   */
  logNotificationResults(results) {
    const summary = {
      total: results.length,
      emailsSent: results.filter(r => r.emailSent).length,
      smsSent: results.filter(r => r.smsSent).length,
      errors: results.filter(r => r.errors.length > 0).length
    };

    logger.info('Absentee notification summary:', summary);

    // Log individual errors
    results.forEach(result => {
      if (result.errors.length > 0) {
        logger.warn(`Notification issues for ${result.studentName}:`, result.errors);
      }
    });
  }

  /**
   * Manually trigger absentee check (for testing or manual runs)
   */
  async manualAbsenteeCheck() {
    logger.info('Manual absentee check triggered');
    await this.checkAndNotifyAbsentees();
  }

  /**
   * Get notification schedule info
   */
  getScheduleInfo() {
    return {
      cutoffTime: this.notificationCutoffTime,
      cronExpression: '30 9 * * 1-5',
      description: 'Runs at 9:30 AM on weekdays (Monday to Friday)',
      timezone: process.env.TIMEZONE || 'America/New_York',
      activeJobs: Array.from(this.scheduledJobs.keys())
    };
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduler() {
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    });
    this.scheduledJobs.clear();
  }

  /**
   * Check if a student should be considered absent at current time
   * @param {Date} currentTime - Current time to check against
   * @returns {boolean} - Whether notifications should be sent
   */
  shouldSendNotification(currentTime = new Date()) {
    const cutoffHour = 9;
    const cutoffMinute = 30;
    
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    // Only send notifications after 9:30 AM
    return (currentHour > cutoffHour) || (currentHour === cutoffHour && currentMinute >= cutoffMinute);
  }

  /**
   * Get absent students for a specific date
   * @param {Date} date - Date to check (defaults to today)
   * @returns {Promise<Array>} - Array of absent students
   */
  async getAbsentStudents(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all active students
    const allStudents = await Student.find({ isActive: true });

    // Get students who have already marked attendance for the date
    const presentStudents = await Attendance.find({
      scanTime: { $gte: startOfDay, $lte: endOfDay },
      isValidScan: true
    }).distinct('studentId');

    // Return absent students
    return allStudents.filter(student => 
      !presentStudents.some(presentId => presentId.equals(student._id))
    );
  }
}

module.exports = new AbsenteeNotificationService();
