#!/usr/bin/env node

/**
 * Quick Network Connectivity Test
 * Run this to verify your backend is accessible from your development environment
 */

const http = require('http');
const os = require('os');

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ interface: name, ip: iface.address });
      }
    }
  }
  return ips;
}

console.log('\n🔍 Local IP Addresses Found:\n');
const ips = getLocalIPs();
ips.forEach(({ interface, ip }) => {
  console.log(`   ${interface}: ${ip}`);
});

console.log('\n📱 Update your mobile app config to use one of these IPs');
console.log('   File: attendance-scanner/src/config/config.js');
console.log('   Line: API_BASE_URL: \'http://YOUR_IP_HERE:5000\'\n');

// Test connectivity to backend
console.log('🧪 Testing Backend Connectivity...\n');

const backendUrl = 'http://192.168.0.49:5000/health';
console.log(`   Testing: ${backendUrl}`);

http.get(backendUrl, (res) => {
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log(`\n✅ Backend is REACHABLE!\n`);
      console.log('   Response:');
      try {
        const json = JSON.parse(data);
        console.log('   ' + JSON.stringify(json, null, 2).split('\n').join('\n   '));
      } catch (e) {
        console.log('   ' + data);
      }
    } else {
      console.log(`\n⚠️  Backend responded with status ${res.statusCode}\n`);
      console.log('   Response:', data);
    }
  });
}).on('error', (err) => {
  console.log(`\n❌ Backend is NOT reachable!\n`);
  console.log('   Error:', err.message);
  console.log('\n   Possible causes:');
  console.log('   1. Backend is not running (npm start in Backend folder)');
  console.log('   2. IP address is incorrect');
  console.log('   3. Firewall is blocking port 5000');
  console.log('   4. Device is not on the same network\n');
});
