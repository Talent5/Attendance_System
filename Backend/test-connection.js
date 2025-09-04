const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    console.log('🔗 Testing MongoDB Atlas connection...');
    console.log('Connection URI:', process.env.MONGODB_URI?.replace(/\/\/.*:.*@/, '//***:***@'));
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      serverSelectionTimeoutMS: 30000,
    });
    
    console.log('✅ MongoDB Atlas connection successful!');
    
    // Test basic operations
    const testCollection = mongoose.connection.db.collection('test');
    await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
    console.log('✅ Database write test successful!');
    
    await testCollection.deleteOne({ test: 'connection' });
    console.log('✅ Database delete test successful!');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ MongoDB Atlas connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('IP')) {
      console.log('\n🛠️  SOLUTION:');
      console.log('1. Go to https://cloud.mongodb.com');
      console.log('2. Navigate to your cluster');
      console.log('3. Click "Network Access" in the left sidebar');
      console.log('4. Click "Add IP Address"');
      console.log('5. Either:');
      console.log('   - Click "Add Current IP Address" to whitelist your current IP');
      console.log('   - Or add "0.0.0.0/0" to allow access from anywhere (less secure)');
      console.log('6. Click "Confirm"');
      console.log('7. Wait for the changes to apply (usually 1-2 minutes)');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n🔐 AUTHENTICATION ISSUE:');
      console.log('1. Verify your username and password in the connection string');
      console.log('2. Make sure the user has the correct permissions');
      console.log('3. Check if the user exists in Database Access section');
    }
    
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed.');
    }
    process.exit();
  }
};

testConnection();
