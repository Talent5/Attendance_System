const mongoose = require('mongoose');
const Employee = require('./models/Employee');
require('dotenv').config();

const checkEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr_attendance_system');
    
    console.log('Fetching all employees...\n');
    
    const employees = await Employee.find().select('_id name firstName lastName employeeId department position isActive');
    
    console.log('EMPLOYEES IN DATABASE:');
    console.log('='.repeat(80));
    
    employees.forEach((emp, index) => {
      console.log(`${index + 1}. _id: ${emp._id}`);
      console.log(`   firstName: ${emp.firstName || 'UNDEFINED'}`);
      console.log(`   lastName: ${emp.lastName || 'UNDEFINED'}`);
      console.log(`   employeeId: ${emp.employeeId || 'UNDEFINED'}`);
      console.log(`   department: ${emp.department || 'UNDEFINED'}`);
      console.log(`   position: ${emp.position}`);
      console.log(`   isActive: ${emp.isActive}`);
      console.log('');
    });
    
    // Find Charlie Brown specifically
    const charlie = employees.find(e => e.name === 'Charlie Brown');
    if (charlie) {
      console.log('✅ Found Charlie Brown:');
      console.log(`   _id: ${charlie._id}`);
      console.log(`   employeeId: ${charlie.employeeId || 'NOT SET'}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

checkEmployees();
