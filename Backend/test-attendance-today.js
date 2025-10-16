const axios = require('axios');

// Create axios instance
const client = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 10000
});

const testGetTodayAttendance = async () => {
  try {
    console.log('🔄 Testing GET /api/attendance/today endpoint...\n');

    // Step 1: Login to get token
    console.log('📝 Step 1: Authenticating...');
    const loginResponse = await client.post('/api/auth/login', {
      email: 'admin@company.com',
      password: 'Admin@123'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Authentication successful\n');

    // Set token in headers
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Step 2: Get today's attendance
    console.log('📊 Step 2: Fetching today\'s attendance...');
    
    try {
      const attendanceResponse = await client.get('/api/attendance/today');
      
      console.log('✅ SUCCESS! Today\'s attendance retrieved');
      console.log('Response:', JSON.stringify(attendanceResponse.data, null, 2));
    } catch (attendanceError) {
      console.log('❌ Attendance endpoint failed:');
      if (attendanceError.response) {
        console.log('Status:', attendanceError.response.status);
        console.log('Error:', JSON.stringify(attendanceError.response.data, null, 2));
      } else {
        console.log('Error:', attendanceError.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testGetTodayAttendance();
