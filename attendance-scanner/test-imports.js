// Test script to verify all imports work correctly
try {
  console.log('Testing imports...');
  
  // Test config import
  const config = require('./src/config/config.js');
  console.log('✓ Config imported successfully');
  console.log('  API Base URL:', config.default.API_BASE_URL);
  
  console.log('\n✅ All imports successful!');
  console.log('\nNext steps:');
  console.log('1. Start backend server: cd Backend && npm start');
  console.log('2. Update config.js with correct backend IP/URL');
  console.log('3. Run expo: npm start');
  console.log('4. Test on device with Expo Go app');
  
} catch (error) {
  console.error('❌ Import error:', error.message);
  process.exit(1);
}