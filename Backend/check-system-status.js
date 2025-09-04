require('dotenv').config();
const axios = require('axios');

async function checkSystemStatus() {
  console.log('🔍 Checking QR Attendance System Status...\n');

  const baseURL = 'http://localhost:5000/api';
  const testResults = {
    backend: false,
    auth: false,
    students: false,
    attendance: false,
    absenteeRoutes: false,
    emailConfig: false
  };

  try {
    // Check if backend is running
    console.log('📡 Testing backend connection...');
    const healthCheck = await axios.get(`${baseURL}/../health`, { timeout: 5000 });
    testResults.backend = true;
    console.log('✅ Backend is running');

    // Check auth endpoint
    console.log('🔐 Testing auth endpoint...');
    try {
      await axios.post(`${baseURL}/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 401)) {
        testResults.auth = true;
        console.log('✅ Auth endpoint is responding');
      }
    }

    // Check students endpoint (should require auth)
    console.log('👥 Testing students endpoint...');
    try {
      await axios.get(`${baseURL}/students`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        testResults.students = true;
        console.log('✅ Students endpoint is protected (good!)');
      }
    }

    // Check attendance endpoint
    console.log('📊 Testing attendance endpoint...');
    try {
      await axios.get(`${baseURL}/attendance`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        testResults.attendance = true;
        console.log('✅ Attendance endpoint is protected (good!)');
      }
    }

    // Check absentee notifications endpoint
    console.log('⚠️ Testing absentee notifications endpoint...');
    try {
      await axios.get(`${baseURL}/absentee/schedule-info`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        testResults.absenteeRoutes = true;
        console.log('✅ Absentee notifications endpoint is available and protected');
      } else {
        console.log(`⚠️ Absentee endpoint response: ${error.response?.status || error.message}`);
      }
    }

    // Check email configuration through test notification
    console.log('📧 Testing email configuration...');
    try {
      await axios.post(`${baseURL}/absentee/test-notification`, {
        email: 'test@example.com',
        phone: '+1234567890'
      });
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 400)) {
        testResults.emailConfig = true;
        console.log('✅ Email configuration endpoint is available');
      } else {
        console.log(`⚠️ Email config endpoint response: ${error.response?.status || error.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ Backend connection failed: ${error.message}`);
  }

  console.log('\n📊 SYSTEM STATUS SUMMARY:');
  console.log('========================');
  console.log(`Backend Server: ${testResults.backend ? '✅ Running' : '❌ Not Running'}`);
  console.log(`Auth System: ${testResults.auth ? '✅ Working' : '❌ Not Working'}`);
  console.log(`Students API: ${testResults.students ? '✅ Working' : '❌ Not Working'}`);
  console.log(`Attendance API: ${testResults.attendance ? '✅ Working' : '❌ Not Working'}`);
  console.log(`Absentee Alerts: ${testResults.absenteeRoutes ? '✅ Working' : '❌ Not Working'}`);
  console.log(`Email Config: ${testResults.emailConfig ? '✅ Available' : '❌ Not Available'}`);

  const allWorking = Object.values(testResults).every(status => status);
  
  if (allWorking) {
    console.log('\n🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('🚀 Your QR Attendance System with Absentee Notifications is ready!');
    console.log('\n📱 Frontend: http://localhost:3000');
    console.log('🔧 Backend: http://localhost:5000');
    console.log('\n⏰ Automated notifications will run daily at 9:30 AM (weekdays)');
  } else {
    console.log('\n⚠️ Some systems need attention. Check the individual status above.');
  }
}

checkSystemStatus().catch(console.error);
