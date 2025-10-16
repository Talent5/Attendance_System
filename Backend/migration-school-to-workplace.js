#!/usr/bin/env node

/**
 * MongoDB Migration Script: School to Workplace Attendance System
 * 
 * This script migrates data from a school-based attendance system to a workplace-based system.
 * It renames collections and updates field names while preserving all data.
 * 
 * IMPORTANT: Always backup your database before running this migration!
 * 
 * Usage: node migration-school-to-workplace.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Migration functions
async function migrateStudentsToEmployees() {
  console.log('\n📝 Migrating students collection to employees...');
  
  const db = mongoose.connection.db;
  
  // Check if students collection exists
  const collections = await db.listCollections({ name: 'students' }).toArray();
  if (collections.length === 0) {
    console.log('ℹ️  Students collection not found, skipping...');
    return;
  }
  
  // Check if employees collection already exists
  const employeeCollections = await db.listCollections({ name: 'employees' }).toArray();
  if (employeeCollections.length > 0) {
    console.log('⚠️  Employees collection already exists, working with existing data...');
    
    // Update field names in existing employees collection
    const result = await db.collection('employees').updateMany(
      {},
      {
        $rename: {
          'studentId': 'employeeId',
          'class': 'department',
          'section': 'position',
          'rollNumber': 'employeeNumber',
          'guardianName': 'emergencyContactName',
          'guardianPhone': 'emergencyContactPhone',
          'guardianEmail': 'emergencyContactEmail',
          'guardianRelation': 'emergencyContactRelation'
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} employee records with new field names`);
    return;
  }
  
  // Drop old indexes from students collection before renaming
  try {
    await db.collection('students').dropIndex('studentId_1');
    console.log('✅ Dropped old studentId index from students collection');
  } catch (error) {
    console.log('ℹ️  No studentId index to drop from students collection');
  }
  
  // Rename collection
  await db.collection('students').rename('employees');
  console.log('✅ Renamed students collection to employees');
  
  // Update field names in employees collection
  const result = await db.collection('employees').updateMany(
    {},
    {
      $rename: {
        'studentId': 'employeeId',
        'class': 'department',
        'section': 'position',
        'rollNumber': 'employeeNumber',
        'guardianName': 'emergencyContactName',
        'guardianPhone': 'emergencyContactPhone',
        'guardianEmail': 'emergencyContactEmail',
        'guardianRelation': 'emergencyContactRelation'
      }
    }
  );
  
  console.log(`✅ Updated ${result.modifiedCount} employee records with new field names`);
}

async function migrateAttendanceRecords() {
  console.log('\n📝 Updating attendance records...');
  
  const db = mongoose.connection.db;
  
  // Check if attendance collection exists
  const collections = await db.listCollections({ name: 'attendances' }).toArray();
  if (collections.length === 0) {
    console.log('ℹ️  Attendances collection not found, skipping...');
    return;
  }
  
  // Update field references in attendance records
  const result = await db.collection('attendances').updateMany(
    {},
    {
      $rename: {
        'studentId': 'employeeId'
      }
    }
  );
  
  console.log(`✅ Updated ${result.modifiedCount} attendance records`);
}

async function migrateNotifications() {
  console.log('\n📝 Updating notifications...');
  
  const db = mongoose.connection.db;
  
  // Check if notifications collection exists
  const collections = await db.listCollections({ name: 'notifications' }).toArray();
  if (collections.length === 0) {
    console.log('ℹ️  Notifications collection not found, skipping...');
    return;
  }
  
  // Update notification content to use workplace terminology
  const result1 = await db.collection('notifications').updateMany(
    { message: { $regex: /student/i } },
    [
      {
        $set: {
          message: {
            $replaceAll: {
              input: '$message',
              find: 'student',
              replacement: 'employee'
            }
          }
        }
      }
    ]
  );
  
  const result2 = await db.collection('notifications').updateMany(
    { message: { $regex: /Student/i } },
    [
      {
        $set: {
          message: {
            $replaceAll: {
              input: '$message',
              find: 'Student',
              replacement: 'Employee'
            }
          }
        }
      }
    ]
  );
  
  // Update guardian references to emergency contact
  const result3 = await db.collection('notifications').updateMany(
    { message: { $regex: /guardian/i } },
    [
      {
        $set: {
          message: {
            $replaceAll: {
              input: '$message',
              find: 'guardian',
              replacement: 'emergency contact'
            }
          }
        }
      }
    ]
  );
  
  console.log(`✅ Updated ${result1.modifiedCount + result2.modifiedCount + result3.modifiedCount} notification messages`);
}

async function migrateUserRoles() {
  console.log('\n📝 Updating user roles...');
  
  const db = mongoose.connection.db;
  
  // Check if users collection exists
  const collections = await db.listCollections({ name: 'users' }).toArray();
  if (collections.length === 0) {
    console.log('ℹ️  Users collection not found, skipping...');
    return;
  }
  
  // Update teacher role to manager
  const result = await db.collection('users').updateMany(
    { role: 'teacher' },
    { $set: { role: 'manager' } }
  );
  
  console.log(`✅ Updated ${result.modifiedCount} user roles from teacher to manager`);
}

async function updateIndexes() {
  console.log('\n📝 Updating database indexes...');
  
  const db = mongoose.connection.db;
  
  try {
    // Drop old studentId indexes if they exist
    try {
      await db.collection('employees').dropIndex('studentId_1');
      console.log('✅ Dropped old studentId index from employees');
    } catch (error) {
      console.log('ℹ️  No old studentId index to drop from employees');
    }
    
    try {
      await db.collection('attendances').dropIndex('studentId_1');
      console.log('✅ Dropped old studentId index from attendances');
    } catch (error) {
      console.log('ℹ️  No old studentId index to drop from attendances');
    }
    
    // Create new indexes for employeeId
    try {
      await db.collection('employees').createIndex({ employeeId: 1 }, { unique: true });
      console.log('✅ Created unique index on employeeId in employees collection');
    } catch (error) {
      if (error.code === 11000) {
        console.log('ℹ️  Unique index on employeeId already exists');
      } else {
        console.log('⚠️  Could not create employeeId index:', error.message);
      }
    }
    
    try {
      await db.collection('attendances').createIndex({ employeeId: 1 });
      console.log('✅ Created index on employeeId in attendances collection');
    } catch (error) {
      console.log('ℹ️  Index on employeeId in attendances may already exist');
    }
    
    // Create compound indexes for better query performance
    try {
      await db.collection('attendances').createIndex({ employeeId: 1, date: 1 });
      console.log('✅ Created compound index on employeeId and date in attendances collection');
    } catch (error) {
      console.log('ℹ️  Compound index may already exist');
    }
    
  } catch (error) {
    console.error('⚠️  Error updating indexes:', error.message);
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting School to Workplace Attendance System Migration');
  console.log('===========================================================');
  
  try {
    await connectDB();
    
    // Run migrations
    await migrateStudentsToEmployees();
    await migrateAttendanceRecords();
    await migrateNotifications();
    await migrateUserRoles();
    await updateIndexes();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Students collection renamed to employees');
    console.log('   • Field names updated (studentId → employeeId, class → department, etc.)');
    console.log('   • Attendance records updated');
    console.log('   • User roles updated (teacher → manager)');
    console.log('   • Database indexes updated');
    console.log('\n⚠️  Important: Update your environment variables:');
    console.log('   • Set COMPANY_NAME in your .env file');
    console.log('   • Update any frontend configurations');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };