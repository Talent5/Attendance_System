/**
 * Test script to verify CORS and logout endpoint functionality
 * Run this to test if the backend is properly configured
 */

const https = require('https');

const BACKEND_URL = 'https://attendance-system-sktv.onrender.com';
const FRONTEND_ORIGIN = 'https://attendance-system-blue.vercel.app';

console.log('🔧 Testing CORS Configuration...\n');

// Test 1: Health Check
function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣ Testing health endpoint...');
    
    const options = {
      hostname: 'attendance-system-sktv.onrender.com',
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   ✅ Status: ${res.statusCode}`);
        console.log(`   ✅ CORS Headers:`);
        console.log(`      - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
        console.log(`      - Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials'] || 'NOT SET'}`);
        console.log(`   ✅ Response: ${data.substring(0, 100)}\n`);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Error: ${error.message}\n`);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('   ❌ Request timed out (backend may be sleeping)\n');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test 2: OPTIONS preflight request for logout
function testLogoutPreflight() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣ Testing OPTIONS preflight for /api/auth/logout...');
    
    const options = {
      hostname: 'attendance-system-sktv.onrender.com',
      path: '/api/auth/logout',
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`   ✅ Status: ${res.statusCode}`);
      console.log(`   ✅ CORS Headers:`);
      console.log(`      - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
      console.log(`      - Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'NOT SET'}`);
      console.log(`      - Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'NOT SET'}`);
      console.log(`      - Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials'] || 'NOT SET'}`);
      console.log(`      - Access-Control-Max-Age: ${res.headers['access-control-max-age'] || 'NOT SET'}\n`);
      
      if (res.statusCode === 204 || res.statusCode === 200) {
        console.log('   ✅ Preflight request successful!\n');
        resolve();
      } else {
        console.log(`   ⚠️ Unexpected status code: ${res.statusCode}\n`);
        resolve();
      }
    });

    req.on('error', (error) => {
      console.error(`   ❌ Error: ${error.message}\n`);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('   ❌ Request timed out (backend may be sleeping)\n');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test 3: POST request to logout (without valid token)
function testLogoutEndpoint() {
  return new Promise((resolve, reject) => {
    console.log('3️⃣ Testing POST to /api/auth/logout (expect 401)...');
    
    const postData = JSON.stringify({ refreshToken: 'dummy-token' });
    
    const options = {
      hostname: 'attendance-system-sktv.onrender.com',
      path: '/api/auth/logout',
      method: 'POST',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer dummy-token'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   ✅ Status: ${res.statusCode} (401 is expected without valid token)`);
        console.log(`   ✅ CORS Headers:`);
        console.log(`      - Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
        console.log(`      - Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials'] || 'NOT SET'}`);
        
        if (data) {
          console.log(`   ✅ Response: ${data.substring(0, 150)}`);
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ Error: ${error.message}\n`);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('   ❌ Request timed out\n');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Run all tests
async function runTests() {
  try {
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log(`Frontend Origin: ${FRONTEND_ORIGIN}`);
    console.log('='.repeat(60) + '\n');
    
    await testHealthEndpoint();
    await testLogoutPreflight();
    await testLogoutEndpoint();
    
    console.log('='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('\n📋 Summary:');
    console.log('   - If all tests passed, CORS is configured correctly');
    console.log('   - If health check failed, backend may be sleeping (wait 30-60s)');
    console.log('   - If OPTIONS failed, check server CORS configuration');
    console.log('   - If POST shows CORS headers, the endpoint is accessible');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check if backend is deployed and running on Render');
    console.log('   2. Verify MONGODB_URI is set in Render environment variables');
    console.log('   3. Backend free tier may be sleeping - first request takes time');
    console.log('   4. Check Render logs for any startup errors');
  }
}

runTests();
