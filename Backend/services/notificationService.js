const nodemailer = require('nodemailer');
const twilio = require('twilio');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Initialize email transporter with multiple provider support
    this.emailTransporter = this.createEmailTransporter();

    // Initialize Twilio client
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  /**
   * Create email transporter based on available configuration
   */
  createEmailTransporter() {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      logger.warn('Email credentials not configured');
      return null;
    }

    // Determine email provider and configuration
    if (emailUser.includes('@gmail.com')) {
      // Gmail configuration
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    } else if (emailUser.includes('@outlook.com') || emailUser.includes('@hotmail.com') || emailUser.includes('@live.com')) {
      // Outlook/Hotmail configuration
      return nodemailer.createTransport({
        service: 'hotmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    } else if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
      // Mailtrap for development
      return nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS
        }
      });
    } else if (process.env.SMTP2GO_USER && process.env.SMTP2GO_PASS) {
      // SMTP2GO service
      return nodemailer.createTransport({
        host: 'mail.smtp2go.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP2GO_USER,
          pass: process.env.SMTP2GO_PASS
        }
      });
    } else {
      // Generic SMTP configuration
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });
    }
  }

  /**
   * Send SMS notification
   * @param {string} to - Phone number to send SMS to
   * @param {string} message - Message content
   * @returns {Promise<object>} - Twilio response
   */
  async sendSMS(to, message) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not configured');
      }

      if (!this.fromPhoneNumber) {
        throw new Error('Twilio phone number not configured');
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to: to
      });

      logger.info(`SMS sent successfully to ${to}`, { sid: result.sid });
      return result;
    } catch (error) {
      logger.error(`Failed to send SMS to ${to}:`, error);
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Send email notification
   * @param {string} to - Email address to send to
   * @param {string} subject - Email subject
   * @param {string} text - Email content (plain text)
   * @param {string} html - Email content (HTML)
   * @param {string} type - Email type for styling ('attendance', 'absentee', 'general')
   * @returns {Promise<object>} - Nodemailer response
   */
  async sendEmail(to, subject, text, html = null, type = 'general') {
    try {
      if (!this.emailTransporter) {
        throw new Error('Email transporter not configured - check your email credentials');
      }

      const mailOptions = {
        from: `"QR Attendance System" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text,
        html: html || this.generateEmailHTML(text, type)
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}`, { messageId: result.messageId });
      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Generate HTML content for email
   * @param {string} text - Plain text content
   * @param {string} type - Email type ('attendance', 'absentee', 'general')
   * @returns {string} - HTML content
   */
  generateEmailHTML(text, type = 'general') {
    const getHeaderStyle = (emailType) => {
      switch (emailType) {
        case 'absentee':
          return 'background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);';
        case 'attendance':
          return 'background: linear-gradient(135deg, #00b894 0%, #00a085 100%);';
        default:
          return 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);';
      }
    };

    const getIcon = (emailType) => {
      switch (emailType) {
        case 'absentee':
          return '⚠️';
        case 'attendance':
          return '✅';
        default:
          return '🎓';
      }
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QR Attendance Notification</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .container {
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            ${getHeaderStyle(type)}
            color: white;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 10px;
            display: block;
          }
          .content {
            padding: 30px;
          }
          .message {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${type === 'absentee' ? '#ff6b6b' : type === 'attendance' ? '#00b894' : '#667eea'};
          }
          .timestamp {
            background: #e9ecef;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: 600;
            text-align: center;
          }
          .footer {
            text-align: center;
            padding: 20px;
            background-color: #f8f9fa;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #dee2e6;
          }
          .important {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
          .contact-info {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="icon">${getIcon(type)}</span>
            <h1>QR Attendance System</h1>
          </div>
          <div class="content">
            <div class="message">
              ${text.replace(/\n/g, '<br>')}
            </div>
            <div class="timestamp">
              <strong>📅 Notification sent:</strong> ${new Date().toLocaleString()}
            </div>
            ${type === 'absentee' ? `
              <div class="important">
                <strong>⚠️ Important:</strong> If your child is sick or will be absent, please contact the school office immediately. If your child is on their way to school, you may disregard this message.
              </div>
            ` : ''}
            <div class="contact-info">
              <strong>📞 Need help?</strong> Contact the school administration for any questions or concerns.
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from the QR Attendance System.</p>
            <p>Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} School Administration. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send attendance notification to guardian
   * @param {object} student - Student object
   * @param {object} attendanceRecord - Attendance record
   * @param {string} teacherName - Name of teacher who marked attendance
   * @returns {Promise<object>} - Notification results
   */
  async sendAttendanceNotification(student, attendanceRecord, teacherName) {
    const timestamp = new Date(attendanceRecord.scanTime).toLocaleString();
    const status = attendanceRecord.status === 'present' ? 'arrived' : 'arrived late';
    
    const message = `Hello! Your child ${student.firstName} ${student.lastName} has ${status} at school on ${timestamp}. Marked by: ${teacherName}.`;
    
    const emailSubject = `Attendance Update: ${student.firstName} ${student.lastName}`;
    const emailContent = `
Dear Guardian,

This is to inform you that your child has been marked present at school.

Student Details:
- Name: ${student.firstName} ${student.lastName}
- Student ID: ${student.studentId}
- Class: ${student.class} - ${student.section}
- Status: ${attendanceRecord.status}
- Time: ${timestamp}
- Marked by: ${teacherName}

${attendanceRecord.notes ? `Notes: ${attendanceRecord.notes}` : ''}

Thank you for using our QR Attendance System.

Best regards,
School Administration
    `;

    const results = {
      sms: null,
      email: null,
      errors: []
    };

    // Send SMS
    if (student.guardianPhone) {
      try {
        results.sms = await this.sendSMS(student.guardianPhone, message);
      } catch (error) {
        results.errors.push(`SMS: ${error.message}`);
      }
    }

    // Send Email
    if (student.guardianEmail) {
      try {
        results.email = await this.sendEmail(student.guardianEmail, emailSubject, emailContent);
      } catch (error) {
        results.errors.push(`Email: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Send bulk notifications to multiple guardians
   * @param {Array} students - Array of student objects
   * @param {string} message - Message to send
   * @param {string} subject - Email subject (optional)
   * @returns {Promise<Array>} - Array of notification results
   */
  async sendBulkNotifications(students, message, subject = 'School Notification') {
    const results = [];

    for (const student of students) {
      const result = {
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        sms: null,
        email: null,
        errors: []
      };

      // Send SMS
      if (student.guardianPhone) {
        try {
          result.sms = await this.sendSMS(student.guardianPhone, message);
        } catch (error) {
          result.errors.push(`SMS: ${error.message}`);
        }
      }

      // Send Email
      if (student.guardianEmail) {
        try {
          result.email = await this.sendEmail(student.guardianEmail, subject, message);
        } catch (error) {
          result.errors.push(`Email: ${error.message}`);
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Test notification service configuration
   * @returns {Promise<object>} - Test results
   */
  async testConfiguration() {
    const results = {
      email: false,
      sms: false,
      errors: []
    };

    // Test email configuration
    try {
      if (!this.emailTransporter) {
        results.errors.push('Email: No email transporter configured - check your .env file');
      } else {
        await this.emailTransporter.verify();
        results.email = true;
        logger.info('Email configuration test passed');
      }
    } catch (error) {
      results.errors.push(`Email: ${error.message}`);
      logger.error('Email configuration test failed:', error);
    }

    // Test SMS configuration
    try {
      if (this.twilioClient && this.fromPhoneNumber) {
        // Just check if we can access the account (without sending)
        await this.twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        results.sms = true;
        logger.info('SMS configuration test passed');
      } else {
        results.errors.push('SMS: Twilio not configured');
      }
    } catch (error) {
      results.errors.push(`SMS: ${error.message}`);
      logger.error('SMS configuration test failed:', error);
    }

    return results;
  }
}

module.exports = new NotificationService();
