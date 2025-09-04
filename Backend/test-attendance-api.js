const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const { Attendance } = require('./models');

async function testAttendanceAPI() {
  try {
    // Test what the attendance route returns for today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    console.log('Testing attendance API query for today:', today.toISOString().split('T')[0]);
    console.log('Start of day:', startOfDay);
    console.log('End of day:', endOfDay);
    
    // Simulate the actual API query with filters like the frontend sends
    const query = { 
      isValidScan: true,
      scanTime: { $gte: startOfDay, $lte: endOfDay }
    };
    
    console.log('Query:', JSON.stringify(query, null, 2));
    
    // Test without population first
    const rawResults = await Attendance.find(query).sort({ scanTime: -1 }).limit(20);
    console.log('\nRaw results count:', rawResults.length);
    
    if (rawResults.length > 0) {
      console.log('Raw first record studentId:', rawResults[0].studentId);
      console.log('Raw first record status:', rawResults[0].status);
      console.log('Raw first record scanTime:', rawResults[0].scanTime);
    }
    
    // Test with population (like the API does)
    const populatedResults = await Attendance.find(query)
      .populate('studentId', 'firstName lastName studentId class section')
      .populate('scannedBy', 'name')
      .sort({ scanTime: -1 })
      .limit(20);
      
    console.log('\nPopulated results count:', populatedResults.length);
    
    if (populatedResults.length > 0) {
      console.log('Populated first record:');
      const record = populatedResults[0].toJSON();
      console.log('- Student Name:', record.studentId?.firstName, record.studentId?.lastName);
      console.log('- Student ID:', record.studentId?.studentId);
      console.log('- Class:', record.studentId?.class);
      console.log('- Status:', record.status);
      console.log('- Time:', record.scanTime);
      console.log('- Location:', record.location);
      console.log('- Time Window:', record.timeWindow);
      console.log('- Minutes Late:', record.minutesLate);
    }
    
    // Test the exact query the frontend would make with aggregation
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'users',
          localField: 'scannedBy',
          foreignField: '_id',
          as: 'scannedBy'
        }
      },
      { $unwind: '$scannedBy' },
      {
        $project: {
          _id: 1,
          scanTime: 1,
          status: 1,
          location: 1,
          timeWindow: 1,
          minutesLate: 1,
          notes: 1,
          'student.firstName': 1,
          'student.lastName': 1,
          'student.studentId': 1,
          'student.class': 1,
          'student.section': 1,
          'scannedBy.name': 1,
          'scannedBy.email': 1
        }
      },
      { $sort: { scanTime: -1 } },
      { $limit: 20 }
    ];
    
    const aggregatedResults = await Attendance.aggregate(pipeline);
    console.log('\nAggregated results count:', aggregatedResults.length);
    
    if (aggregatedResults.length > 0) {
      console.log('Aggregated first record:');
      console.log(JSON.stringify(aggregatedResults[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testAttendanceAPI();
