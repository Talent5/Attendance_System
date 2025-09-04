const nodemailer = require('nodemailer');
require('dotenv').config();

// Simple email test script
const testEmailConfiguration = async () => {
  console.log('🧪 Testing Email Configuration...\n');
  
  // Display current configuration (without showing password)
  console.log('📧 Email Settings:');
  console.log(`Host: ${process.env.EMAIL_HOST}`);
  console.log(`Port: ${process.env.EMAIL_PORT}`);
  console.log(`User: ${process.env.EMAIL_USER}`);
  console.log(`Password: ${process.env.EMAIL_PASS ? '✅ Set' : '❌ Not Set'}\n`);

  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    debug: true, // Enable debug output
    logger: true // Log information in console
  });

  try {
    // Test 1: Verify SMTP connection
    console.log('🔧 Step 1: Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    // Test 2: Send test email
    console.log('📤 Step 2: Sending test email...');
    const info = await transporter.sendMail({
      from: `"QR Attendance Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: '🧪 Test Email - QR Attendance System',
      text: 'This is a test email from the QR Attendance System. If you receive this, email configuration is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">🎉 Email Test Successful!</h2>
          <p>This is a test email from the QR Attendance System.</p>
          <p><strong>✅ If you receive this email, your configuration is working correctly!</strong></p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Test sent at: ${new Date().toLocaleString()}<br>
            From: QR Attendance System
          </p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📤 Email sent to: ${process.env.EMAIL_USER}`);
    console.log('\n🎉 Email configuration is working! Check your inbox (and spam folder).');

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error(`Error: ${error.message}`);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔑 Authentication Error Solutions:');
      console.log('1. Make sure you\'re using an App Password, not your regular Gmail password');
      console.log('2. Enable 2-Factor Authentication on your Google account');
      console.log('3. Generate a new App Password at: https://myaccount.google.com/apppasswords');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n🌐 Connection Error Solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify EMAIL_HOST and EMAIL_PORT in .env file');
      console.log('3. Check if your firewall/antivirus is blocking the connection');
    }
    
    console.log('\n📖 Setup Guide: Check ABSENTEE_NOTIFICATION_SETUP.md for detailed instructions');
  }
};

// Run the test
testEmailConfiguration().then(() => {
  console.log('\n🏁 Email test completed.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
