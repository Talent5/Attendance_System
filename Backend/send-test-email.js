require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendTestEmail() {
  console.log('📧 Sending test email to talentmundwa5@gmail.com...\n');
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    console.log('🔧 Verifying email configuration...');
    await transporter.verify();
    console.log('✅ Email configuration verified!\n');

    // Send test email
    console.log('📤 Sending email...');
    const result = await transporter.sendMail({
      from: `"QR Attendance System" <${process.env.EMAIL_USER}>`,
      to: 'talentmundwa5@gmail.com',
      subject: '🎯 Test Email - QR Attendance System',
      text: 'Hello! This is a test email from your QR Attendance System. If you receive this, the email configuration is working perfectly!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
          <div style="background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🎯 Test Email Success!</h1>
            </div>
            <div style="padding: 30px;">
              <h2 style="color: #333;">Email Configuration Working! ✅</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555;">
                Congratulations! Your QR Attendance System email configuration is working perfectly.
              </p>
              <div style="background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>📊 Test Details:</strong><br>
                • From: ${process.env.EMAIL_USER}<br>
                • To: talentmundwa5@gmail.com<br>
                • Service: Gmail SMTP<br>
                • Time: ${new Date().toLocaleString()}
              </div>
              <p style="color: #666;">
                Your automated absentee notification system is now ready to send emails to guardians!
              </p>
            </div>
            <div style="text-align: center; padding: 20px; background-color: #f8f9fa; font-size: 12px; color: #666;">
              <p>This is a test message from the QR Attendance System</p>
            </div>
          </div>
        </div>
      `
    });

    console.log('🎉 Email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Sent to: talentmundwa5@gmail.com`);
    console.log('\n✅ Email configuration is working perfectly!');
    console.log('🚀 Your absentee notification system is ready to go!');
    
  } catch (error) {
    console.log(`❌ Failed to send email: ${error.message}`);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Make sure 2-factor authentication is enabled on your Gmail account');
      console.log('2. The password should be an App Password, not your regular Gmail password');
      console.log('3. Generate App Password: https://support.google.com/accounts/answer/185833');
    }
  }
}

sendTestEmail();
