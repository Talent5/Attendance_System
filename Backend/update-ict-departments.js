/**
 * Script to update existing employees with proper ICT company departments
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Employee = require('./models/Employee');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr_attendance_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ MongoDB connected successfully');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Update employees with ICT company departments
 */
const updateEmployeesWithICTDepartments = async () => {
  try {
    console.log('\n📋 Updating employees with ICT company departments...\n');

    // Define direct updates per employee using MongoDB updateOne
    const employees = [
      { filter: { firstName: 'Alice' }, dept: 'SOFTWARE DEVELOPMENT' },
      { filter: { firstName: 'Bob' }, dept: 'IT OPERATIONS' },
      { filter: { firstName: 'Charlie' }, dept: 'NETWORK SECURITY' },
      { filter: { firstName: 'Diana' }, dept: 'DATABASE ADMINISTRATION' },
      { filter: { firstName: 'Edward' }, dept: 'QUALITY ASSURANCE' },
      { filter: { firstName: 'Belinda' }, dept: 'BUSINESS ANALYSIS' },
      { filter: { firstName: 'Belz' }, dept: 'INFRASTRUCTURE' },
    ];

    console.log(`Updating ${employees.length} employees...\n`);

    for (const emp of employees) {
      const result = await Employee.updateOne(
        emp.filter,
        { $set: { department: emp.dept } }
      );
      
      if (result.modifiedCount > 0) {
        const found = await Employee.findOne(emp.filter);
        console.log(`  ✓ ${found.firstName} ${found.lastName}`);
        console.log(`    → Department: ${emp.dept}`);
      }
    }

    console.log(`\n✅ Successfully updated employees\n`);

    // Show final summary
    console.log('📊 Final Department Distribution:\n');
    const allEmployees = await Employee.find().select('firstName lastName department');
    const departmentCounts = {};
    
    allEmployees.forEach(emp => {
      departmentCounts[emp.department] = (departmentCounts[emp.department] || 0) + 1;
    });

    Object.entries(departmentCounts).sort().forEach(([dept, count]) => {
      console.log(`  • ${dept}: ${count} employee${count > 1 ? 's' : ''}`);
    });

    console.log();

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    console.log('\n🔄 Employee Department Update Script');
    console.log('====================================\n');
    
    await connectDB();
    await updateEmployeesWithICTDepartments();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the update
if (require.main === module) {
  main();
}

module.exports = {
  updateEmployeesWithICTDepartments,
};
