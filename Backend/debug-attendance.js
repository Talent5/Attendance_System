const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const { Attendance, Employee } = require('./models');

async function debugAttendanceData() {
  try {
    console.log('=== Debugging Attendance Data ===\n');
    
    // Get total counts
    const totalAttendance = await Attendance.countDocuments();
    const totalStudents = await Student.countDocuments();
    
    console.log(`Total attendance records: ${totalAttendance}`);
    console.log(`Total students: ${totalStudents}\n`);
    
    // Get today's records with proper population
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    console.log(`Checking attendance for: ${today.toDateString()}`);
    console.log(`Start of day: ${startOfDay}`);
    console.log(`End of day: ${endOfDay}\n`);
    
    const todayAttendance = await Attendance.find({
      scanTime: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('studentId', 'firstName lastName studentId class section')
    .populate('scannedBy', 'name');
    
    console.log(`Today's attendance records: ${todayAttendance.length}`);
    
    if (todayAttendance.length > 0) {
      console.log('\n=== Today\'s Records ===');
      todayAttendance.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  ID: ${record._id}`);
        console.log(`  Student: ${record.studentId?.firstName || 'N/A'} ${record.studentId?.lastName || 'N/A'}`);
        console.log(`  Student ID: ${record.studentId?.studentId || 'N/A'}`);
        console.log(`  Class: ${record.studentId?.class || 'N/A'}`);
        console.log(`  Section: ${record.studentId?.section || 'N/A'}`);
        console.log(`  Status: ${record.status}`);
        console.log(`  Time: ${record.scanTime.toLocaleString()}`);
        console.log(`  Location: ${record.location}`);
        console.log(`  Time Window: ${record.timeWindow}`);
        console.log(`  Minutes Late: ${record.minutesLate}`);
        console.log(`  Scanned By: ${record.scannedBy?.name || 'N/A'}`);
        console.log(`  Raw Data:`, JSON.stringify(record.toJSON(), null, 2));
      });
    }
    
    // Test the today endpoint format
    console.log('\n=== Testing Today API Format ===');
    const todayApiData = await Attendance.findByDate(new Date())
      .populate('studentId', 'firstName lastName studentId class section profilePhoto')
      .populate('scannedBy', 'name');
    
    console.log(`API format records: ${todayApiData.length}`);
    
    if (todayApiData.length > 0) {
      console.log('\nAPI Format Sample:');
      console.log(JSON.stringify(todayApiData[0].toJSON(), null, 2));
    }
    
    // Get summary statistics
    const summary = {
      total: todayAttendance.length,
      present: todayAttendance.filter(r => r.status === 'present').length,
      late: todayAttendance.filter(r => r.status === 'late').length,
      onTime: todayAttendance.filter(r => r.timeWindow === 'on_time').length
    };
    
    console.log('\n=== Summary Statistics ===');
    console.log(JSON.stringify(summary, null, 2));
    
    // Check some recent attendance (past few days)
    const recentAttendance = await Attendance.find({
      scanTime: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    })
    .populate('studentId', 'firstName lastName studentId class section')
    .populate('scannedBy', 'name')
    .sort({ scanTime: -1 });
    
    console.log(`\n=== Recent Attendance (last 3 days): ${recentAttendance.length} records ===`);
    
    recentAttendance.forEach((record, index) => {
      if (index < 5) { // Show first 5
        console.log(`${record.scanTime.toLocaleDateString()} - ${record.studentId?.firstName || 'Unknown'} ${record.studentId?.lastName || 'Student'} (${record.studentId?.studentId || 'N/A'}) - ${record.status}`);
      }
    });
    
  } catch (error) {
    console.error('Error debugging attendance data:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugAttendanceData();
