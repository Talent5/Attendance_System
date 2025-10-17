// Quick test to verify backend connectivity
const API_URL = 'https://attendance-system-sktv.onrender.com';

async function testBackend() {
  console.log('🔍 Testing Backend Connection...\n');
  console.log(`Backend URL: ${API_URL}`);
  console.log('─'.repeat(50));

  try {
    // Test health endpoint
    console.log('\n1️⃣ Testing /health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);

    // Test API base
    console.log('\n2️⃣ Testing /api endpoint...');
    const apiResponse = await fetch(`${API_URL}/api`);
    console.log('Response Status:', apiResponse.status);
    
    if (apiResponse.status === 404) {
      console.log('✅ API endpoint responding (404 expected for base route)');
    }

    console.log('\n✨ Backend is accessible and responding!');
    console.log('\n📝 Next Steps:');
    console.log('1. Deploy your Admin Dashboard to Vercel/Netlify');
    console.log('2. Update FRONTEND_URL in Render environment variables');
    console.log('3. Build and distribute mobile app APK');
    
  } catch (error) {
    console.error('\n❌ Error connecting to backend:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if backend is running on Render');
    console.log('2. Verify the URL is correct');
    console.log('3. Check your internet connection');
  }
}

testBackend();
