const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const { Attendance } = require('./models');

async function testAttendanceCreation() {
  try {
    console.log('Testing attendance creation with database...');
    
    // Create a test attendance record
    const testAttendance = new Attendance({
      studentId: new mongoose.Types.ObjectId(), // Fake student ID for testing
      scannedBy: new mongoose.Types.ObjectId(), // Fake user ID for testing
      scanTime: new Date(),
      location: 'Mobile App',
      qrCode: '{"studentId":"STU005","type":"attendance","name":"Test Student","class":"GRADE 11","section":"A"}',
      notes: 'Test scan'
    });

    console.log('Before save:');
    console.log('- scanTime:', testAttendance.scanTime);
    console.log('- scanDate:', testAttendance.scanDate);
    
    // Validate the model
    await testAttendance.validate();
    console.log('✓ Validation passed');
    
    console.log('After validation:');
    console.log('- scanTime:', testAttendance.scanTime);
    console.log('- scanDate:', testAttendance.scanDate);
    
    console.log('✓ Attendance model validation test passed');
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.log(`- ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testAttendanceCreation();
