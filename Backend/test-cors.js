const axios = require('axios');

// Test CORS configuration
const testCORS = async () => {
  console.log('\n🔍 Testing CORS Configuration...\n');

  const backends = [
    'http://localhost:5000',
    'https://attendance-system-sktv.onrender.com'
  ];

  const frontendOrigin = 'https://attendance-system-blue.vercel.app';

  for (const backend of backends) {
    console.log(`\n📡 Testing: ${backend}`);
    
    try {
      // Test OPTIONS (preflight)
      console.log('  Testing OPTIONS request...');
      const optionsResponse = await axios.options(`${backend}/api/auth/login`, {
        headers: {
          'Origin': frontendOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        timeout: 5000
      });
      
      console.log('  ✅ OPTIONS request successful');
      console.log('  CORS Headers:', {
        'Access-Control-Allow-Origin': optionsResponse.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': optionsResponse.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': optionsResponse.headers['access-control-allow-headers']
      });

      // Test GET (health check)
      console.log('  Testing GET request...');
      const getResponse = await axios.get(`${backend}/health`, {
        headers: {
          'Origin': frontendOrigin
        },
        timeout: 5000
      });
      
      console.log('  ✅ GET request successful');
      console.log('  Response:', getResponse.data);
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('  ❌ Connection refused - Server not running');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('  ❌ Connection timeout - Server unreachable');
      } else if (error.response) {
        console.log(`  ⚠️  Server responded with status: ${error.response.status}`);
        console.log('  Response:', error.response.data);
        console.log('  CORS Headers:', {
          'Access-Control-Allow-Origin': error.response.headers['access-control-allow-origin'],
          'Access-Control-Allow-Methods': error.response.headers['access-control-allow-methods']
        });
      } else {
        console.log('  ❌ Error:', error.message);
      }
    }
  }
  
  console.log('\n✨ CORS test complete!\n');
};

testCORS();
