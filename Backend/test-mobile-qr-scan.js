const axios = require('axios');

// Test scanning with the format the mobile app would send
// This mimics what happens when mobile app scans a QR code with missing optional fields

const testScan = async () => {
  try {
    console.log('🔄 Testing mobile app QR scan with incomplete data...\n');

    // This is what Charlie Brown's legacy QR code looks like
    // (missing department - this was causing the 400 error)
    const incompleteQRData = JSON.stringify({
      id: "68b76093e326d38672dd2896",
      name: "Charlie Brown",
      position: "STAFF",
      type: "attendance",
      employeeId: "68b76093e326d38672dd2896"
      // NOTE: department is missing - this was the issue!
    });

    console.log('📱 Sending QR scan from mobile app:');
    console.log('QR Data:', incompleteQRData);
    console.log('');

    const response = await axios.post('http://localhost:5000/api/attendance/scan', {
      qrCode: incompleteQRData,
      location: 'Mobile App',
      notes: ''
    });

    console.log('✅ SUCCESS! Attendance recorded:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.log('❌ ERROR - Server responded with status', error.response.status);
      console.log('Error details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('❌ ERROR:', error.message);
    }
  }
};

testScan();
