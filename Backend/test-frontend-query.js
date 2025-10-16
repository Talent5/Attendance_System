const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const { Attendance } = require('./models');

async function testFrontendQuery() {
  try {
    // Simulate the exact query the frontend sends
    const startDate = '2025-09-03';
    const endDate = '2025-09-03';
    
    console.log('Testing frontend query with dates:', { startDate, endDate });
    
    // Build query exactly like the backend route does now
    const query = { isValidScan: true };
    
    if (startDate || endDate) {
      query.scanTime = {};
      if (startDate) {
        // Set to start of day for startDate
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.scanTime.$gte = start;
      }
      if (endDate) {
        // Set to end of day for endDate
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.scanTime.$lte = end;
      }
    }
    
    console.log('Built query:', JSON.stringify(query, null, 2));
    
    // Test the aggregation pipeline like the backend route
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'employees',
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
      { $skip: 0 }, // page 1
      { $limit: 20 }
    ];
    
    const results = await Attendance.aggregate(pipeline);
    console.log('Results count:', results.length);
    
    if (results.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(results[0], null, 2));
      
      console.log('\nAll results summary:');
      results.forEach((record, index) => {
        console.log(`${index + 1}. ${record.student.firstName} ${record.student.lastName} (${record.student.studentId}) - ${record.status} at ${new Date(record.scanTime).toLocaleString()}`);
      });
    }
    
    // Count total for pagination
    const totalCount = await Attendance.countDocuments(query);
    console.log('\nTotal count for pagination:', totalCount);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testFrontendQuery();
