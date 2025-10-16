const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]+$/, 'Employee ID can only contain letters and numbers']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid phone number']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    uppercase: true
  },
  position: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'STAFF'
  },
  employeeNumber: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    lowercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'USA'
    }
  },
  emergencyContactName: {
    type: String,
    required: [true, 'Emergency contact name is required'],
    trim: true,
    maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
  },
  emergencyContactPhone: {
    type: String,
    required: [true, 'Emergency contact phone is required'],
    trim: true,
    match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid emergency contact phone number']
  },
  emergencyContactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid emergency contact email address'
    ]
  },
  emergencyContactRelation: {
    type: String,
    enum: ['spouse', 'parent', 'sibling', 'relative', 'friend', 'other'],
    default: 'spouse'
  },
  qrCode: {
    type: String,
    unique: true,
    sparse: true // Allows unique constraint without requiring the field to be present initially
  },
  qrCodeData: {
    type: String, // JSON string containing encrypted student data
    default: null
  },
  profilePhoto: {
    type: String, // File path to profile photo
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  hireDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  terminationDate: {
    type: Date
  },
  secondaryEmergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  workInfo: {
    manager: String,
    startTime: String,
    endTime: String,
    workSchedule: [String], // ['Monday', 'Tuesday', etc.]
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time'
    },
    salary: Number,
    benefits: [String]
  },
  attendanceStats: {
    totalDays: {
      type: Number,
      default: 0
    },
    presentDays: {
      type: Number,
      default: 0
    },
    absentDays: {
      type: Number,
      default: 0
    },
    lateDays: {
      type: Number,
      default: 0
    },
    attendancePercentage: {
      type: Number,
      default: 0
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ department: 1, position: 1 });
employeeSchema.index({ isActive: 1 });
employeeSchema.index({ hireDate: 1 });
employeeSchema.index({ emergencyContactPhone: 1 });
employeeSchema.index({ qrCode: 1 });

// Compound index for department and position queries
employeeSchema.index({ department: 1, position: 1, isActive: 1 });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name (Last, First)
employeeSchema.virtual('displayName').get(function() {
  return `${this.lastName}, ${this.firstName}`;
});

// Virtual for age calculation
employeeSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for department position display
employeeSchema.virtual('departmentPosition').get(function() {
  return `${this.department}-${this.position}`;
});

// Pre-save middleware to generate QR code data
employeeSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('employeeId') || this.isModified('firstName') || this.isModified('lastName')) {
    try {
      // Generate unique QR code
      this.qrCode = `QR-${this.employeeId}-${Date.now()}`;
      
      // Create QR code data (encrypted employee information)
      const qrData = {
        employeeId: this.employeeId,
        name: this.fullName,
        department: this.department,
        position: this.position,
        hireDate: this.hireDate,
        timestamp: Date.now()
      };
      
      this.qrCodeData = JSON.stringify(qrData);
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware to update attendance percentage
employeeSchema.pre('save', function(next) {
  if (this.attendanceStats.totalDays > 0) {
    this.attendanceStats.attendancePercentage = 
      (this.attendanceStats.presentDays / this.attendanceStats.totalDays) * 100;
  }
  next();
});

// Static method to find by department
employeeSchema.statics.findByDepartment = function(departmentName, position = null) {
  const query = { department: departmentName, isActive: true };
  if (position) query.position = position;
  return this.find(query).sort({ lastName: 1, firstName: 1 });
};

// Static method to find active employees
employeeSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ lastName: 1, firstName: 1 });
};

// Static method to search employees
employeeSchema.statics.searchEmployees = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    isActive: true,
    $or: [
      { firstName: regex },
      { lastName: regex },
      { employeeId: regex },
      { emergencyContactName: regex }
    ]
  }).sort({ lastName: 1, firstName: 1 });
};

// Instance method to update attendance stats
employeeSchema.methods.updateAttendanceStats = async function(attendanceType) {
  this.attendanceStats.totalDays += 1;
  
  switch (attendanceType) {
    case 'present':
      this.attendanceStats.presentDays += 1;
      break;
    case 'late':
      this.attendanceStats.lateDays += 1;
      this.attendanceStats.presentDays += 1; // Late is considered present
      break;
    case 'absent':
      this.attendanceStats.absentDays += 1;
      break;
  }
  
  return this.save();
};

// Instance method to get safe employee data for QR code
employeeSchema.methods.getQRData = function() {
  return {
    employeeId: this.employeeId,
    name: this.fullName,
    department: this.department,
    position: this.position,
    qrCode: this.qrCode
  };
};

// Instance method to get contact information
employeeSchema.methods.getContactInfo = function() {
  return {
    employeeName: this.fullName,
    emergencyContactName: this.emergencyContactName,
    emergencyContactPhone: this.emergencyContactPhone,
    emergencyContactEmail: this.emergencyContactEmail,
    secondaryEmergencyContact: this.secondaryEmergencyContact
  };
};

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;