/**
 * Migration script to convert "class" field to "department" field in Employee collection
 * This script updates all existing employee records to use the standardized "department" field
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
 * Migrate class field to department
 * This function looks for any remaining records with "class" field and converts them to "department"
 */
const migrateClassToDepartment = async () => {
  try {
    console.log('\n📋 Starting migration: Converting "class" to "department" field...\n');

    // Use direct database update to bypass validation
    const result = await Employee.collection.updateMany(
      { class: { $exists: true } },
      [
        {
          $set: {
            department: {
              $cond: {
                if: { $eq: ['$class', null] },
                then: 'UNASSIGNED',
                else: { $toUpper: '$class' }
              }
            }
          }
        },
        { $unset: 'class' }
      ]
    );
    
    console.log(`✓ Updated ${result.modifiedCount} documents`);

    if (result.modifiedCount > 0) {
      console.log('Successfully converted "class" to "department"');
      
      // Show examples
      const examples = await Employee.find({ department: { $exists: true } }).limit(3);
      if (examples.length > 0) {
        console.log('\nExample records updated:');
        for (const emp of examples) {
          console.log(`  - ${emp.firstName} ${emp.lastName}: ${emp.department}`);
        }
      }
    }

    // Verify all employees now have department field
    const employeesWithoutDepartment = await Employee.countDocuments({ department: { $exists: false } });
    
    if (employeesWithoutDepartment === 0) {
      console.log('\n✓ All employees have "department" field');
    } else {
      console.log(`\n⚠ Warning: ${employeesWithoutDepartment} employees still missing "department" field`);
    }

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    console.log('\n🔄 Employee Migration Script');
    console.log('===========================\n');
    
    await connectDB();
    await migrateClassToDepartment();
    
    // Show summary
    const totalEmployees = await Employee.countDocuments();
    const employeesWithDepartment = await Employee.countDocuments({ department: { $exists: true } });
    
    console.log('📊 Migration Summary:');
    console.log(`   - Total Employees: ${totalEmployees}`);
    console.log(`   - Employees with Department: ${employeesWithDepartment}`);
    console.log(`   - Employees without Department: ${totalEmployees - employeesWithDepartment}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
};

// Run the migration
if (require.main === module) {
  main();
}

module.exports = {
  migrateClassToDepartment,
};
