const axios = require('axios');

// Create axios instance
const client = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000
});

const testAttendancePayload = async () => {
  try {
    console.log('🔍 Checking exact payload of /api/attendance/today...\n');

    // Step 1: Login to get token
    const loginResponse = await client.post('/api/auth/login', {
      email: 'admin@company.com',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.accessToken;
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Step 2: Get today's attendance with detailed logging
    const attendanceResponse = await client.get('/api/attendance/today');
    
    console.log('✅ Got attendance response\n');
    
    if (attendanceResponse.data.data.attendance.length > 0) {
      const firstRecord = attendanceResponse.data.data.attendance[0];
      console.log('First attendance record structure:');
      console.log('================================================');
      console.log(JSON.stringify(firstRecord, null, 2));
      
      console.log('\n\nemployeeId object:');
      console.log('================================================');
      console.log(JSON.stringify(firstRecord.employeeId, null, 2));
      
      console.log('\n\nWhat we expect to display:');
      console.log('================================================');
      if (firstRecord.employeeId) {
        console.log(`Name: ${firstRecord.employeeId.firstName || 'MISSING'} ${firstRecord.employeeId.lastName || 'MISSING'}`);
      } else {
        console.log('ERROR: employeeId is not populated!');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAttendancePayload();
