const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const { Student, Attendance } = require('./models');

async function checkStudentData() {
  try {
    console.log('Checking student and attendance data...');
    
    // Get total students
    const totalStudents = await Student.countDocuments();
    console.log(`Total students: ${totalStudents}`);
    
    // Get some students
    const students = await Student.find().limit(5);
    console.log('\nSample students:');
    students.forEach(student => {
      console.log(`- ${student.firstName} ${student.lastName} (${student.studentId}) - Class: ${student.class}, Section: ${student.section}`);
    });
    
    // Check attendance with proper population
    console.log('\nChecking attendance with population...');
    const attendanceRecords = await Attendance.aggregate([
      { $sort: { scanTime: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } }
    ]);
    
    console.log('Recent attendance with populated student data:');
    attendanceRecords.forEach(record => {
      if (record.student) {
        console.log(`- ${record.student.firstName} ${record.student.lastName} (${record.student.studentId}) - ${record.status} at ${new Date(record.scanTime).toLocaleString()}`);
      } else {
        console.log(`- [Student not found for ID: ${record.studentId}] - ${record.status} at ${new Date(record.scanTime).toLocaleString()}`);
      }
    });
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkStudentData();
