const mongoose = require('mongoose');
const { Attendance, Employee } = require('./models');

// Test attendance creation
async function testAttendanceCreation() {
  try {
    console.log('Testing attendance creation...');
    
    // Create a test attendance record
    const testAttendance = new Attendance({
      employeeId: new mongoose.Types.ObjectId(), // Fake employee ID for testing
      scannedBy: new mongoose.Types.ObjectId(), // Fake user ID for testing
      scanTime: new Date(),
      location: 'Mobile App',
      qrCode: '{"employeeId":"EMP005","type":"attendance","name":"Test Employee","department":"IT","position":"STAFF"}',
      notes: 'Test scan'
    });

    console.log('Before save:');
    console.log('- scanTime:', testAttendance.scanTime);
    console.log('- scanDate:', testAttendance.scanDate);
    
    // Validate without saving
    const validationError = testAttendance.validateSync();
    if (validationError) {
      console.log('Validation errors:');
      Object.keys(validationError.errors).forEach(key => {
        console.log(`- ${key}: ${validationError.errors[key].message}`);
      });
      return false;
    }
    
    console.log('✓ Validation passed');
    
    // Test the pre-save middleware by calling it manually
    await new Promise((resolve, reject) => {
      testAttendance.schema.pre('save').call(testAttendance, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    
    console.log('After pre-save middleware:');
    console.log('- scanTime:', testAttendance.scanTime);
    console.log('- scanDate:', testAttendance.scanDate);
    console.log('- timeWindow:', testAttendance.timeWindow);
    console.log('- status:', testAttendance.status);
    
    console.log('✓ Attendance creation test passed');
    return true;
    
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  }
}

// Run the test
testAttendanceCreation().then(() => {
  console.log('Test completed');
}).catch(console.error);
