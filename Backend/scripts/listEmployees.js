#!/usr/bin/env node
// Simple script to list employees from the database
// Usage: node scripts/listEmployees.js [--all] [--limit=N]

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Ensure models can be required correctly (relative to Backend folder)
const Employee = require(path.join(__dirname, '..', 'models', 'Employee'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance';

async function main() {
  const showAll = process.argv.includes('--all');
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const query = showAll ? {} : { isActive: true };
    let q = Employee.find(query).sort({ lastName: 1, firstName: 1 });
    if (limit && Number.isFinite(limit) && limit > 0) q = q.limit(limit);

    const employees = await q.exec();

    if (!employees || employees.length === 0) {
      console.log('No employees found.');
      process.exit(0);
    }

    // Print a compact table: EmployeeId | Full Name | Department | Position | Active
    const rows = employees.map(emp => ({
      employeeId: emp.employeeId,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department || '',
      position: emp.position || '',
      isActive: emp.isActive
    }));

    // Determine column widths
    const cols = ['employeeId', 'name', 'department', 'position', 'isActive'];
    const widths = {};
    cols.forEach(c => {
      widths[c] = Math.max(c.length, ...rows.map(r => String(r[c]).length));
    });

    const pad = (s, w) => String(s).padEnd(w);

    // Header
    const header = cols.map(c => pad(c.toUpperCase(), widths[c])).join('  |  ');
    const separator = cols.map(c => '-'.repeat(widths[c])).join('-+-');
    console.log(header);
    console.log(separator);

    rows.forEach(r => {
      console.log(cols.map(c => pad(r[c], widths[c])).join('  |  '));
    });

    console.log('\nTotal:', employees.length);
    process.exit(0);
  } catch (error) {
    console.error('Error fetching employees:', error.message || error);
    process.exit(1);
  } finally {
    try { await mongoose.connection.close(); } catch (e) {}
  }
}

main();
