const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Employee = require('./models/Employee');
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

// Test users data - includes admins, managers, supervisors, and HR staff
const testUsers = [
  // Admin users
  {
    name: 'Admin User',
    email: 'admin@company.com',
    password: 'Admin@123',
    role: 'admin',
    isActive: true,
    department: 'Administration',
    phoneNumber: '+1-555-0101',
  },
  {
    name: 'System Administrator',
    email: 'sysadmin@company.com',
    password: 'SysAdmin@123',
    role: 'admin',
    isActive: true,
    department: 'Administration',
    phoneNumber: '+1-555-0102',
  },
  {
    name: 'Takunda Mundwa',
    email: 'takunda@company.com',
    password: 'Takunda@123',
    role: 'admin',
    isActive: true,
    department: 'Administration',
    phoneNumber: '+1-555-0103',
  },
  // Manager users
  {
    name: 'John Manager',
    email: 'manager@company.com',
    password: 'Manager@123',
    role: 'manager',
    isActive: true,
    department: 'Operations',
    phoneNumber: '+1-555-0201',
  },
  {
    name: 'Sarah Manager',
    email: 'sarah.manager@company.com',
    password: 'Sarah@123',
    role: 'manager',
    isActive: true,
    department: 'Operations',
    phoneNumber: '+1-555-0202',
  },
  // Supervisor users
  {
    name: 'Alex Supervisor',
    email: 'supervisor@company.com',
    password: 'Supervisor@123',
    role: 'supervisor',
    isActive: true,
    department: 'Supervision',
    phoneNumber: '+1-555-0301',
  },
  {
    name: 'Emma Supervisor',
    email: 'emma.supervisor@company.com',
    password: 'Emma@123',
    role: 'supervisor',
    isActive: true,
    department: 'Supervision',
    phoneNumber: '+1-555-0302',
  },
  // HR users
  {
    name: 'HR Officer',
    email: 'hr@company.com',
    password: 'HR@123',
    role: 'hr',
    isActive: true,
    department: 'Human Resources',
    phoneNumber: '+1-555-0401',
  },
  {
    name: 'Rachel HR',
    email: 'rachel.hr@company.com',
    password: 'Rachel@123',
    role: 'hr',
    isActive: true,
    department: 'Human Resources',
    phoneNumber: '+1-555-0402',
  },
];

// Test students data
const testStudents = [
  {
    employeeId: 'EMP001',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@company.com',
    phoneNumber: '+1234567890',
    department: 'SOFTWARE DEVELOPMENT',
    position: 'SENIOR DEVELOPER',
    emergencyContactName: 'Robert Johnson',
    emergencyContactPhone: '+1234567891',
    emergencyContactEmail: 'robert.johnson@email.com',
    isActive: true,
    hireDate: new Date('2024-09-01'),
  },
  {
    employeeId: 'EMP002',
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob.smith@company.com',
    phoneNumber: '+1234567892',
    department: 'IT OPERATIONS',
    position: 'SYSTEM ADMINISTRATOR',
    emergencyContactName: 'Mary Smith',
    emergencyContactPhone: '+1234567893',
    emergencyContactEmail: 'mary.smith@email.com',
    isActive: true,
    hireDate: new Date('2024-09-01'),
  },
  {
    employeeId: 'EMP003',
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@company.com',
    phoneNumber: '+1234567894',
    department: 'NETWORK SECURITY',
    position: 'SECURITY ANALYST',
    emergencyContactName: 'David Brown',
    emergencyContactPhone: '+1234567895',
    emergencyContactEmail: 'david.brown@email.com',
    isActive: true,
    hireDate: new Date('2024-09-01'),
  },
  {
    employeeId: 'EMP004',
    firstName: 'Diana',
    lastName: 'Wilson',
    email: 'diana.wilson@company.com',
    phoneNumber: '+1234567896',
    department: 'DATABASE ADMINISTRATION',
    position: 'DATABASE ADMINISTRATOR',
    emergencyContactName: 'Sarah Wilson',
    emergencyContactPhone: '+1234567897',
    emergencyContactEmail: 'sarah.wilson@email.com',
    isActive: true,
    hireDate: new Date('2024-09-01'),
  },
  {
    employeeId: 'EMP005',
    firstName: 'Edward',
    lastName: 'Davis',
    email: 'edward.davis@company.com',
    phoneNumber: '+1234567898',
    department: 'QUALITY ASSURANCE',
    position: 'QA ENGINEER',
    emergencyContactName: 'Jennifer Davis',
    emergencyContactPhone: '+1234567899',
    emergencyContactEmail: 'jennifer.davis@email.com',
    isActive: true,
    hireDate: new Date('2024-09-01'),
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
    console.log('Seeding employees...');
    
    // Clear existing employees
    await Employee.deleteMany({});
    
    // Create employees one by one to ensure pre-save middleware runs
    const createdEmployees = [];
    for (const employeeData of testStudents) {
      const employee = new Employee(employeeData);
      const savedEmployee = await employee.save();
      createdEmployees.push(savedEmployee);
      console.log(`✓ Created employee: ${savedEmployee.firstName} ${savedEmployee.lastName} (QR: ${savedEmployee.qrCode})`);
    }
    
    console.log(`✓ Created ${createdEmployees.length} employees with auto-generated QR codes`);
    
    return createdEmployees;
  } catch (error) {
    console.error('Error seeding employees:', error);
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

// Main seed function - focused on admin/user seeding
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    
    const users = await seedUsers();
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Users Created: ${users.length}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('\n👑 ADMIN USERS:');
    console.log('  1. admin@company.com / Admin@123');
    console.log('  2. sysadmin@company.com / SysAdmin@123');
    console.log('  3. takunda@company.com / Takunda@123');
    console.log('\n📊 MANAGER USERS:');
    console.log('  1. manager@company.com / Manager@123');
    console.log('  2. sarah.manager@company.com / Sarah@123');
    console.log('\n👔 SUPERVISOR USERS:');
    console.log('  1. supervisor@company.com / Supervisor@123');
    console.log('  2. emma.supervisor@company.com / Emma@123');
    console.log('\n👨‍💼 HR USERS:');
    console.log('  1. hr@company.com / HR@123');
    console.log('  2. rachel.hr@company.com / Rachel@123');
    
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
};
