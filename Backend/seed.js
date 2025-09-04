const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr_attendance_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test users data
const testUsers = [
  {
    name: 'Admin User',
    email: 'admin@school.com',
    password: 'admin123',
    role: 'admin',
    isActive: true,
  },
  {
    name: 'John Teacher',
    email: 'teacher@school.com',
    password: 'teacher123',
    role: 'teacher',
    isActive: true,
  },
  {
    name: 'Jane Educator',
    email: 'jane@school.com',
    password: 'teacher123',
    role: 'teacher',
    isActive: true,
  },
];

// Test students data
const testStudents = [
  {
    studentId: 'STU001',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@student.school.com',
    phoneNumber: '+1234567890',
    class: 'Grade 10',
    section: 'A',
    guardianName: 'Robert Johnson',
    guardianPhone: '+1234567891',
    guardianEmail: 'robert.johnson@email.com',
    isActive: true,
    enrollmentDate: new Date('2024-09-01'),
  },
  {
    studentId: 'STU002',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob.smith@student.school.com',
    phoneNumber: '+1234567892',
    class: 'Grade 10',
    section: 'A',
    guardianName: 'Mary Smith',
    guardianPhone: '+1234567893',
    guardianEmail: 'mary.smith@email.com',
    isActive: true,
    enrollmentDate: new Date('2024-09-01'),
  },
  {
    studentId: 'STU003',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@student.school.com',
    phoneNumber: '+1234567894',
    class: 'Grade 10',
    section: 'B',
    guardianName: 'David Brown',
    guardianPhone: '+1234567895',
    guardianEmail: 'david.brown@email.com',
    isActive: true,
    enrollmentDate: new Date('2024-09-01'),
  },
  {
    studentId: 'STU004',
    firstName: 'Diana',
    lastName: 'Wilson',
    email: 'diana.wilson@student.school.com',
    phoneNumber: '+1234567896',
    class: 'Grade 11',
    section: 'A',
    guardianName: 'Sarah Wilson',
    guardianPhone: '+1234567897',
    guardianEmail: 'sarah.wilson@email.com',
    isActive: true,
    enrollmentDate: new Date('2024-09-01'),
  },
  {
    studentId: 'STU005',
    firstName: 'Edward',
    lastName: 'Davis',
    email: 'edward.davis@student.school.com',
    phoneNumber: '+1234567898',
    class: 'Grade 11',
    section: 'A',
    guardianName: 'Jennifer Davis',
    guardianPhone: '+1234567899',
    guardianEmail: 'jennifer.davis@email.com',
    isActive: true,
    enrollmentDate: new Date('2024-09-01'),
  },
];

// Function to hash passwords
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Function to seed users
const seedUsers = async () => {
  try {
    console.log('Seeding users...');
    
    // Clear existing users
    await User.deleteMany({});
    
    // Hash passwords and create users
    const usersWithHashedPasswords = await Promise.all(
      testUsers.map(async (user) => ({
        ...user,
        password: await hashPassword(user.password),
      }))
    );
    
    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log(`✓ Created ${createdUsers.length} users`);
    
    return createdUsers;
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
};

// Function to seed students
const seedStudents = async () => {
  try {
    console.log('Seeding students...');
    
    // Clear existing students
    await Student.deleteMany({});
    
    // Create students one by one to ensure pre-save middleware runs
    const createdStudents = [];
    for (const studentData of testStudents) {
      const student = new Student(studentData);
      const savedStudent = await student.save();
      createdStudents.push(savedStudent);
      console.log(`✓ Created student: ${savedStudent.firstName} ${savedStudent.lastName} (QR: ${savedStudent.qrCode})`);
    }
    
    console.log(`✓ Created ${createdStudents.length} students with auto-generated QR codes`);
    
    return createdStudents;
  } catch (error) {
    console.error('Error seeding students:', error);
    throw error;
  }
};

// Function to seed sample attendance records
const seedAttendance = async (students, users) => {
  try {
    console.log('Seeding attendance records...');
    
    // Clear existing attendance
    await Attendance.deleteMany({});
    
    const teacher = users.find(user => user.role === 'teacher');
    if (!teacher) {
      console.log('No teacher found, skipping attendance records');
      return [];
    }
    
    const attendanceRecords = [];
    const today = new Date();
    
    // Create attendance for the last 5 days
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Set scan date (date only, no time)
      const scanDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Random attendance for each student
      for (const student of students) {
        // 80% chance of attendance
        if (Math.random() > 0.2) {
          const scanTime = new Date(date);
          // Random time between 8:00 AM and 9:30 AM
          scanTime.setHours(8 + Math.floor(Math.random() * 1.5));
          scanTime.setMinutes(Math.floor(Math.random() * 60));
          
          // Determine status based on time
          const status = scanTime.getHours() >= 9 ? 'late' : 'present';
          
          attendanceRecords.push({
            studentId: student._id,
            scannedBy: teacher._id,
            scanTime: scanTime,
            scanDate: scanDate,
            qrCode: student.qrCode, // Use the student's QR code
            location: 'Main Gate',
            status: status,
            notes: status === 'late' ? 'Arrived after 9:00 AM' : '',
          });
        }
      }
    }
    
    const createdRecords = await Attendance.insertMany(attendanceRecords);
    console.log(`✓ Created ${createdRecords.length} attendance records`);
    
    return createdRecords;
  } catch (error) {
    console.error('Error seeding attendance:', error);
    throw error;
  }
};

// Function to seed notifications
const seedNotifications = async (students, attendance) => {
  try {
    console.log('Seeding notifications...');
    
    // Clear existing notifications
    await Notification.deleteMany({});
    
    const notifications = [];
    
    // Create notifications for some attendance records
    for (let i = 0; i < Math.min(5, attendance.length); i++) {
      const attendanceRecord = attendance[i];
      const student = students.find(s => s._id.toString() === attendanceRecord.studentId.toString());
      
      if (student) {
        notifications.push({
          studentId: student._id,
          attendanceId: attendanceRecord._id,
          guardianPhone: student.guardianPhone,
          guardianEmail: student.guardianEmail,
          guardianName: student.guardianName,
          message: `Hello ${student.guardianName}! Your child ${student.firstName} ${student.lastName} has arrived at school today at ${attendanceRecord.scanTime.toLocaleTimeString()}.`,
          subject: `Attendance Update - ${student.firstName} ${student.lastName}`,
          type: 'attendance',
          priority: attendanceRecord.status === 'late' ? 'high' : 'normal',
          channels: {
            sms: {
              enabled: true,
              status: 'sent'
            },
            email: {
              enabled: !!student.guardianEmail,
              status: student.guardianEmail ? 'sent' : 'pending'
            }
          },
          overallStatus: 'sent',
          metadata: {
            studentName: `${student.firstName} ${student.lastName}`,
            className: `${student.class}-${student.section}`,
            attendanceTime: attendanceRecord.scanTime,
            attendanceStatus: attendanceRecord.status,
            schoolName: 'Sample School'
          }
        });
      }
    }
    
    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`✓ Created ${createdNotifications.length} notifications`);
    
    return createdNotifications;
  } catch (error) {
    console.error('Error seeding notifications:', error);
    throw error;
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    const users = await seedUsers();
    const students = await seedStudents();
    const attendance = await seedAttendance(students, users);
    const notifications = await seedNotifications(students, attendance);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Users: ${users.length}`);
    console.log(`- Students: ${students.length}`);
    console.log(`- Attendance Records: ${attendance.length}`);
    console.log(`- Notifications: ${notifications.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('Admin: admin@school.com / admin123');
    console.log('Teacher: teacher@school.com / teacher123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = {
  seedDatabase,
  seedUsers,
  seedStudents,
  seedAttendance,
  seedNotifications,
};
