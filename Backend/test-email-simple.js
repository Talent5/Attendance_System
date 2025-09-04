require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing Email Configuration...\n');
console.log(`Current EMAIL_USER: ${process.env.EMAIL_USER}`);
console.log(`EMAIL_PASS configured: ${process.env.EMAIL_PASS ? 'Yes' : 'No'}`);
console.log('---\n');

// Test Gmail
async function testGmail() {
  console.log('📧 Testing Gmail...');
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.verify();
    console.log('✅ Gmail configuration is working!');
    
    // Try to send a test email
    console.log('📤 Sending test email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: 'Test Email - QR Attendance System',
      text: 'This is a test email from your QR Attendance System. If you receive this, email configuration is working!',
      html: '<h2>✅ Test Email Success!</h2><p>This is a test email from your QR Attendance System.</p><p>If you receive this, email configuration is working!</p>'
    });
    
    console.log(`📧 Test email sent successfully! Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.log(`❌ Gmail failed: ${error.message}`);
    
    // Provide specific advice based on error
    if (error.message.includes('Invalid login')) {
      console.log('💡 Suggestion: Check if you need to enable "Less secure app access" or use App Password');
    } else if (error.message.includes('Username and Password not accepted')) {
      console.log('💡 Suggestion: Your Gmail account might require App Password instead of regular password');
      console.log('   Visit: https://support.google.com/accounts/answer/185833');
    }
    return false;
  }
}

// Test with generic SMTP
async function testGenericSMTP() {
  console.log('\n📧 Testing Generic SMTP...');
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.verify();
    console.log('✅ Generic SMTP configuration is working!');
    return true;
  } catch (error) {
    console.log(`❌ Generic SMTP failed: ${error.message}`);
    return false;
  }
}

// Run tests
async function runTests() {
  const gmailResult = await testGmail();
  const smtpResult = await testGenericSMTP();
  
  console.log('\n📊 Test Results:');
  console.log(`Gmail: ${gmailResult ? '✅' : '❌'}`);
  console.log(`Generic SMTP: ${smtpResult ? '✅' : '❌'}`);
  
  if (!gmailResult && !smtpResult) {
    console.log('\n🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Make sure EMAIL_USER and EMAIL_PASS are set in your .env file');
    console.log('2. For Gmail:');
    console.log('   - Enable 2-factor authentication');
    console.log('   - Generate an App Password: https://support.google.com/accounts/answer/185833');
    console.log('   - Use the App Password instead of your regular password');
    console.log('3. Alternative: Try creating a new Gmail account specifically for this app');
    console.log('4. Alternative: Use a different email service like Outlook or Mailtrap');
  }
}

runTests().catch(console.error);
