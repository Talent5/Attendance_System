const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

const verifyMigration = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr_attendance_system');
    
    console.log('\n📋 All Employees with Department Field:\n');
    
    const employees = await Employee.find().select('firstName lastName department');
    
    employees.forEach(emp => {
      console.log(`  ✓ ${emp.firstName} ${emp.lastName}: ${emp.department}`);
    });
    
    console.log(`\nTotal: ${employees.length} employees\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifyMigration();
