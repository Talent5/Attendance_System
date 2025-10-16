const cron = require('node-cron');
const Employee = require('../models/Employee');
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
   * Check for absent employees and send notifications to emergency contacts
   */
  async checkAndNotifyAbsentees() {
    try {
      logger.info('Starting absentee notification check...');
      
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all active employees
      const allEmployees = await Employee.find({ isActive: true });
      logger.info(`Found ${allEmployees.length} active employees`);

      // Get employees who have already marked attendance today
      const presentEmployees = await Attendance.find({
        scanTime: { $gte: startOfDay, $lte: endOfDay },
        isValidScan: true
      }).distinct('employeeId');

      // Find absent employees (those who haven't marked attendance)
      const absentEmployeeIds = allEmployees
        .filter(employee => !presentEmployees.some(presentId => presentId.equals(employee._id)))
        .map(employee => employee._id);

      if (absentEmployeeIds.length === 0) {
        logger.info('No absent employees found - all employees have marked attendance');
        return;
      }

      const absentEmployees = await Employee.find({ _id: { $in: absentEmployeeIds } });
      logger.info(`Found ${absentEmployees.length} absent employees`);

      // Send notifications to emergency contacts
      const notificationResults = await this.sendAbsenteeNotifications(absentEmployees);
      
      // Log the results
      this.logNotificationResults(notificationResults);

    } catch (error) {
      logger.error('Error in absentee notification check:', error);
    }
  }

  /**
   * Send absentee notifications to emergency contacts
   * @param {Array} absentEmployees - Array of absent employee objects
   * @returns {Promise<Array>} - Array of notification results
   */
  async sendAbsenteeNotifications(absentEmployees) {
    const results = [];
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();

    for (const employee of absentEmployees) {
      const result = {
        employeeId: employee._id,
        employeeName: employee.fullName,
        emergencyContactEmail: employee.emergencyContactEmail,
        emergencyContactPhone: employee.emergencyContactPhone,
        emailSent: false,
        smsSent: false,
        errors: []
      };

      try {
        // Prepare notification content
        const emailSubject = `⚠️ Attendance Alert: ${employee.firstName} ${employee.lastName} - Absent Today`;
        
        const emailContent = `
Dear ${employee.emergencyContactName},

This is an automated notification to inform you that ${employee.firstName} ${employee.lastName} has not yet arrived at work today.

Employee Details:
📋 Name: ${employee.firstName} ${employee.lastName}
🆔 Employee ID: ${employee.employeeId}
� Department: ${employee.department}${employee.position ? ` - Position: ${employee.position}` : ''}
📅 Date: ${currentDate}
⏰ Notification Time: ${currentTime}

⚠️ IMPORTANT: ${employee.firstName} has not been marked present as of 9:30 AM today.

If the employee is sick or will be absent for any reason, please contact HR immediately.

If the employee is on their way to work, please disregard this message.

For any questions or concerns, please contact the HR department.

Secondary Emergency Contact: ${employee.secondaryEmergencyContact?.name ? `${employee.secondaryEmergencyContact.name} - ${employee.secondaryEmergencyContact.phone}` : 'Contact HR office'}

Thank you for your attention to this matter.

Best regards,
HR Department
QR Attendance System

---
This is an automated message. Please do not reply to this email.
        `;

        const smsMessage = `ALERT: ${employee.firstName} ${employee.lastName} (ID: ${employee.employeeId}) has not arrived at work as of 9:30 AM today (${currentDate}). Please contact HR if employee is sick or will be absent. - HR Department`;

        // Send email notification
        if (employee.emergencyContactEmail) {
          try {
            await notificationService.sendEmail(
              employee.emergencyContactEmail,
              emailSubject,
              emailContent,
              null,
              'absentee'
            );
            result.emailSent = true;
            logger.info(`Absentee email sent to emergency contact of ${employee.fullName}`);
          } catch (error) {
            result.errors.push(`Email failed: ${error.message}`);
            logger.error(`Failed to send absentee email for ${employee.fullName}:`, error);
          }
        } else {
          result.errors.push('No emergency contact email provided');
        }

        // Send SMS notification
        if (employee.emergencyContactPhone) {
          try {
            await notificationService.sendSMS(employee.emergencyContactPhone, smsMessage);
            result.smsSent = true;
            logger.info(`Absentee SMS sent to emergency contact of ${employee.fullName}`);
          } catch (error) {
            result.errors.push(`SMS failed: ${error.message}`);
            logger.error(`Failed to send absentee SMS for ${employee.fullName}:`, error);
          }
        } else {
          result.errors.push('No emergency contact phone provided');
        }

        // Create a record of the absence notification
        await this.createAbsenceRecord(employee);

      } catch (error) {
        result.errors.push(`General error: ${error.message}`);
        logger.error(`Error processing absentee notification for ${employee.fullName}:`, error);
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Create an absence record for tracking
   * @param {Object} employee - Employee object
   */
  async createAbsenceRecord(employee) {
    try {
      const today = new Date();
      const scanDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Check if an absence record already exists for today
      const existingRecord = await Attendance.findOne({
        employeeId: employee._id,
        scanDate: scanDate
      });

      if (!existingRecord) {
        // Create an absence record
        const absenceRecord = new Attendance({
          employeeId: employee._id,
          scannedBy: null, // System generated
          scanTime: new Date(),
          scanDate: scanDate,
          status: 'absent',
          location: 'System Generated',
          qrCode: 'ABSENCE_NOTIFICATION',
          isValidScan: false,
          invalidReason: 'absent',
          notes: 'Automatically marked absent - Emergency contact notified at 9:30 AM',
          notificationSent: true,
          notificationDetails: {
            sentAt: new Date(),
            method: 'multiple',
            status: 'sent'
          }
        });

        await absenceRecord.save();
        
        // Update employee attendance stats
        await employee.updateAttendanceStats('absent');
        
        logger.info(`Absence record created for ${employee.fullName}`);
      }
    } catch (error) {
      logger.error(`Failed to create absence record for ${employee.fullName}:`, error);
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
        logger.warn(`Notification issues for ${result.employeeName}:`, result.errors);
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
   * Check if an employee should be considered absent at current time
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
   * Get absent employees for a specific date
   * @param {Date} date - Date to check (defaults to today)
   * @returns {Promise<Array>} - Array of absent employees
   */
  async getAbsentEmployees(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all active employees
    const allEmployees = await Employee.find({ isActive: true });

    // Get employees who have already marked attendance for the date
    const presentEmployees = await Attendance.find({
      scanTime: { $gte: startOfDay, $lte: endOfDay },
      isValidScan: true
    }).distinct('employeeId');

    // Return absent employees
    return allEmployees.filter(employee => 
      !presentEmployees.some(presentId => presentId.equals(employee._id))
    );
  }
}

module.exports = new AbsenteeNotificationService();
