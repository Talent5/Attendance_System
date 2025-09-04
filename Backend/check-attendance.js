const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const { Attendance } = require('./models');

async function checkAttendanceRecords() {
  try {
    console.log('Checking attendance records in database...');
    
    // Get total count
    const totalCount = await Attendance.countDocuments();
    console.log(`Total attendance records: ${totalCount}`);
    
    // Get today's records
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    const todayCount = await Attendance.countDocuments({
      scanTime: { $gte: startOfDay, $lte: endOfDay }
    });
    console.log(`Today's attendance records: ${todayCount}`);
    
    // Get recent records
    const recentRecords = await Attendance.find()
      .populate('studentId', 'firstName lastName studentId class section')
      .populate('scannedBy', 'name')
      .sort({ scanTime: -1 })
      .limit(5);
    
    console.log('\nRecent attendance records:');
    recentRecords.forEach(record => {
      console.log(`- ${record.student?.firstName || 'Unknown'} ${record.student?.lastName || 'Student'} (${record.student?.studentId || 'N/A'}) - ${record.status} at ${record.scanTime.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('Error checking attendance records:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkAttendanceRecords();
