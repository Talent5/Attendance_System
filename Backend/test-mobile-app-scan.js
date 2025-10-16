const axios = require('axios');

// Create axios instance
const client = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 5000
});

const testMobileAppScanning = async () => {
  try {
    console.log('🔄 Testing mobile app QR scanning workflow...\n');

    // Step 1: Login to get token (use admin credentials)
    console.log('📝 Step 1: Authenticating...');
    const loginResponse = await client.post('/api/auth/login', {
      email: 'admin@company.com',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Authentication successful');
    console.log('Token:', token.substring(0, 20) + '...');

    // Set token in headers for subsequent requests
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Step 2: Test scanning with incomplete QR data (missing department)
    console.log('\n📱 Step 2: Scanning QR code (incomplete format - missing department)...');
    
    // Use the MongoDB _id from the database (68b76093e326d38672dd2896 - Charlie Brown)
    const incompleteQRData = JSON.stringify({
      id: "68b76093e326d38672dd2896",
      name: "Charlie Brown",
      position: "STAFF",
      type: "attendance",
      employeeId: "68b76093e326d38672dd2896"
      // NOTE: department is missing - this was causing the 400 error
    });

    console.log('QR Payload:', incompleteQRData);
    
    try {
      const scanResponse = await client.post('/api/attendance/scan', {
        qrCode: incompleteQRData,
        location: 'Mobile App',
        notes: 'Test scan with incomplete QR data'
      });

      console.log('✅ SUCCESS! Attendance recorded');
      console.log('Response:', JSON.stringify(scanResponse.data, null, 2));
    } catch (scanError) {
      console.log('❌ Scan failed:');
      if (scanError.response) {
        console.log('Status:', scanError.response.status);
        console.log('Error:', JSON.stringify(scanError.response.data, null, 2));
      } else {
        console.log('Error:', scanError.message);
      }
    }

    // Step 3: Test with complete QR data
    console.log('\n📱 Step 3: Scanning QR code (complete format with department)...');
    
    const completeQRData = JSON.stringify({
      id: "68b76093e326d38672dd2896",
      name: "Charlie Brown",
      department: "Operations",
      position: "STAFF",
      type: "attendance",
      employeeId: "68b76093e326d38672dd2896"
    });

    console.log('QR Payload:', completeQRData);
    
    try {
      const scanResponse2 = await client.post('/api/attendance/scan', {
        qrCode: completeQRData,
        location: 'Mobile App',
        notes: 'Test scan with complete QR data'
      });

      console.log('✅ SUCCESS! Attendance recorded');
      console.log('Response:', JSON.stringify(scanResponse2.data, null, 2));
    } catch (scanError2) {
      console.log('❌ Scan failed:');
      if (scanError2.response) {
        console.log('Status:', scanError2.response.status);
        console.log('Error:', JSON.stringify(scanError2.response.data, null, 2));
      } else {
        console.log('Error:', scanError2.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
};

testMobileAppScanning();
