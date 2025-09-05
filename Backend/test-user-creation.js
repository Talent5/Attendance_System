const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'Admin123!'
};

let authToken = '';

// Test cases
const testCases = [
  {
    name: 'Valid user creation',
    userData: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'ValidPass123!',
      role: 'teacher',
      phoneNumber: '+1234567890',
      department: 'Computer Science',
      isActive: true
    },
    expectedStatus: 201,
    shouldPass: true
  },
  {
    name: 'Invalid password (no uppercase)',
    userData: {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      password: 'invalidpass123',
      role: 'teacher'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Invalid password (no lowercase)',
    userData: {
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com',
      password: 'INVALIDPASS123',
      role: 'teacher'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Invalid password (no numbers)',
    userData: {
      name: 'Alice Brown',
      email: 'alice.brown@example.com',
      password: 'InvalidPass',
      role: 'teacher'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Password too short',
    userData: {
      name: 'Tom Green',
      email: 'tom.green@example.com',
      password: 'Abc1',
      role: 'teacher'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Missing required fields',
    userData: {
      password: 'ValidPass123!'
    },
    expectedStatus: 400,
    shouldPass: false
  },
  {
    name: 'Invalid email format',
    userData: {
      name: 'Invalid User',
      email: 'invalid-email',
      password: 'ValidPass123!',
      role: 'teacher'
    },
    expectedStatus: 400,
    shouldPass: false
  }
];

async function loginAsAdmin() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ Admin login successful');
      return true;
    } else {
      console.error('❌ Admin login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Admin login error:', error.response?.data || error.message);
    return false;
  }
}

async function testUserCreation(testCase) {
  try {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('📤 Request data:', JSON.stringify(testCase.userData, null, 2));
    
    const response = await axios.post(
      `${BASE_URL}/users`,
      testCase.userData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`📥 Response status: ${response.status}`);
    console.log('📥 Response data:', JSON.stringify(response.data, null, 2));
    
    if (testCase.shouldPass) {
      if (response.status === testCase.expectedStatus && response.data.success) {
        console.log('✅ Test PASSED - User created successfully');
        return { success: true, message: 'Test passed' };
      } else {
        console.log('❌ Test FAILED - Expected success but got failure');
        return { success: false, message: 'Expected success but got failure' };
      }
    } else {
      console.log('❌ Test FAILED - Expected validation error but request succeeded');
      return { success: false, message: 'Expected validation error but request succeeded' };
    }
    
  } catch (error) {
    console.log(`📥 Response status: ${error.response?.status || 'No response'}`);
    console.log('📥 Error response:', JSON.stringify(error.response?.data, null, 2));
    
    if (!testCase.shouldPass) {
      if (error.response?.status === testCase.expectedStatus) {
        console.log('✅ Test PASSED - Validation error caught as expected');
        return { success: true, message: 'Validation error caught as expected' };
      } else {
        console.log(`❌ Test FAILED - Expected status ${testCase.expectedStatus} but got ${error.response?.status}`);
        return { success: false, message: `Wrong status code: expected ${testCase.expectedStatus}, got ${error.response?.status}` };
      }
    } else {
      console.log('❌ Test FAILED - Expected success but got error');
      return { success: false, message: 'Expected success but got error: ' + (error.response?.data?.error?.message || error.message) };
    }
  }
}

async function cleanup() {
  try {
    console.log('\n🧹 Cleaning up test users...');
    
    // Get all users
    const response = await axios.get(`${BASE_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      }
    });
    
    if (response.data.success) {
      const testEmails = [
        'john.doe@example.com',
        'jane.smith@example.com',
        'bob.wilson@example.com',
        'alice.brown@example.com',
        'tom.green@example.com'
      ];
      
      for (const user of response.data.data.users) {
        if (testEmails.includes(user.email)) {
          try {
            await axios.delete(`${BASE_URL}/users/${user._id}`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
              }
            });
            console.log(`🗑️  Deleted user: ${user.email}`);
          } catch (deleteError) {
            console.log(`⚠️  Could not delete user ${user.email}:`, deleteError.response?.data?.error?.message || deleteError.message);
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️  Cleanup error:', error.response?.data?.error?.message || error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting user creation validation tests...\n');
  
  // Login as admin first
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without admin authentication');
    return;
  }
  
  // Run all test cases
  const results = [];
  for (const testCase of testCases) {
    const result = await testUserCreation(testCase);
    results.push({
      name: testCase.name,
      ...result
    });
  }
  
  // Cleanup
  await cleanup();
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => r.success === false).length;
  
  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}: ${result.message}`);
  });
  
  console.log(`\n📈 Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! User creation validation is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the validation logic.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
