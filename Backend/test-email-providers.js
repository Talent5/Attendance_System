require('dotenv').config();
const nodemailer = require('nodemailer');

// Test different email providers
const testEmailProviders = async () => {
  console.log('🧪 Testing Email Provider Configuration...\n');

  // Option 1: Gmail (if you can get app password)
  const testGmail = async () => {
    console.log('📧 Testing Gmail...');
    try {
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.verify();
      console.log('✅ Gmail configuration is working!');
      return true;
    } catch (error) {
      console.log('❌ Gmail failed:', error.message);
      return false;
    }
  };

  // Option 2: Outlook/Hotmail
  const testOutlook = async () => {
    console.log('📧 Testing Outlook (if you have Outlook email)...');
    try {
      const transporter = nodemailer.createTransporter({
        service: 'hotmail',
        auth: {
          user: process.env.EMAIL_USER, // Your outlook email
          pass: process.env.EMAIL_PASS  // Your outlook password
        }
      });

      await transporter.verify();
      console.log('✅ Outlook configuration is working!');
      return true;
    } catch (error) {
      console.log('❌ Outlook failed:', error.message);
      return false;
    }
  };

  // Option 3: Mailtrap (Development Testing)
  const testMailtrap = async () => {
    console.log('📧 Testing Mailtrap (sign up free at mailtrap.io)...');
    try {
      const transporter = nodemailer.createTransporter({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USER, // Get from mailtrap.io
          pass: process.env.MAILTRAP_PASS  // Get from mailtrap.io
        }
      });

      await transporter.verify();
      console.log('✅ Mailtrap configuration is working!');
      return true;
    } catch (error) {
      console.log('❌ Mailtrap failed:', error.message);
      return false;
    }
  };

  // Option 4: SMTP2GO (Alternative service)
  const testSMTP2GO = async () => {
    console.log('📧 Testing SMTP2GO (free tier available)...');
    try {
      const transporter = nodemailer.createTransporter({
        host: 'mail.smtp2go.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP2GO_USER,
          pass: process.env.SMTP2GO_PASS
        }
      });

      await transporter.verify();
      console.log('✅ SMTP2GO configuration is working!');
      return true;
    } catch (error) {
      console.log('❌ SMTP2GO failed:', error.message);
      return false;
    }
  };

  // Test all providers
  console.log('Current EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS configured:', process.env.EMAIL_PASS ? 'Yes' : 'No');
  console.log('---\n');

  const gmailWorks = await testGmail();
  const outlookWorks = await testOutlook();
  const mailtrapWorks = await testMailtrap();
  const smtp2goWorks = await testSMTP2GO();

  console.log('\n📊 Test Results:');
  console.log('Gmail:', gmailWorks ? '✅' : '❌');
  console.log('Outlook:', outlookWorks ? '✅' : '❌');
  console.log('Mailtrap:', mailtrapWorks ? '✅' : '❌');
  console.log('SMTP2GO:', smtp2goWorks ? '✅' : '❌');

  if (!gmailWorks && !outlookWorks && !mailtrapWorks && !smtp2goWorks) {
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. Try Mailtrap.io for development testing (free)');
    console.log('2. Use Outlook email with regular password');
    console.log('3. Try SMTP2GO service (free tier)');
    console.log('4. For Gmail, you may need to "Use a less secure app" setting');
  }
};

testEmailProviders().catch(console.error);
