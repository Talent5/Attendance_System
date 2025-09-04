const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]+$/, 'Student ID can only contain letters and numbers']
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
  class: {
    type: String,
    required: [true, 'Class is required'],
    trim: true,
    uppercase: true
  },
  section: {
    type: String,
    trim: true,
    uppercase: true,
    default: 'A'
  },
  rollNumber: {
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
  guardianName: {
    type: String,
    required: [true, 'Guardian name is required'],
    trim: true,
    maxlength: [100, 'Guardian name cannot exceed 100 characters']
  },
  guardianPhone: {
    type: String,
    required: [true, 'Guardian phone is required'],
    trim: true,
    match: [/^[\d\s\-\+\(\)]+$/, 'Please provide a valid guardian phone number']
  },
  guardianEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid guardian email address'
    ]
  },
  guardianRelation: {
    type: String,
    enum: ['parent', 'guardian', 'relative', 'other'],
    default: 'parent'
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
  enrollmentDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  graduationDate: {
    type: Date
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },
  medicalInfo: {
    allergies: [String],
    medications: [String],
    conditions: [String],
    bloodType: String,
    doctorName: String,
    doctorPhone: String
  },
  academicInfo: {
    previousSchool: String,
    transferDate: Date,
    gpa: Number,
    specialNeeds: String
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
studentSchema.index({ studentId: 1 });
studentSchema.index({ class: 1, section: 1 });
studentSchema.index({ isActive: 1 });
studentSchema.index({ enrollmentDate: 1 });
studentSchema.index({ guardianPhone: 1 });
studentSchema.index({ qrCode: 1 });

// Compound index for class and section queries
studentSchema.index({ class: 1, section: 1, isActive: 1 });

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name (Last, First)
studentSchema.virtual('displayName').get(function() {
  return `${this.lastName}, ${this.firstName}`;
});

// Virtual for age calculation
studentSchema.virtual('age').get(function() {
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

// Virtual for class section display
studentSchema.virtual('classSection').get(function() {
  return `${this.class}-${this.section}`;
});

// Pre-save middleware to generate QR code data
studentSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('studentId') || this.isModified('firstName') || this.isModified('lastName')) {
    try {
      // Generate unique QR code
      this.qrCode = `QR-${this.studentId}-${Date.now()}`;
      
      // Create QR code data (encrypted student information)
      const qrData = {
        studentId: this.studentId,
        name: this.fullName,
        class: this.class,
        section: this.section,
        enrollmentDate: this.enrollmentDate,
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
studentSchema.pre('save', function(next) {
  if (this.attendanceStats.totalDays > 0) {
    this.attendanceStats.attendancePercentage = 
      (this.attendanceStats.presentDays / this.attendanceStats.totalDays) * 100;
  }
  next();
});

// Static method to find by class
studentSchema.statics.findByClass = function(className, section = null) {
  const query = { class: className, isActive: true };
  if (section) query.section = section;
  return this.find(query).sort({ lastName: 1, firstName: 1 });
};

// Static method to find active students
studentSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ lastName: 1, firstName: 1 });
};

// Static method to search students
studentSchema.statics.searchStudents = function(searchTerm) {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    isActive: true,
    $or: [
      { firstName: regex },
      { lastName: regex },
      { studentId: regex },
      { guardianName: regex }
    ]
  }).sort({ lastName: 1, firstName: 1 });
};

// Instance method to update attendance stats
studentSchema.methods.updateAttendanceStats = async function(attendanceType) {
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

// Instance method to get safe student data for QR code
studentSchema.methods.getQRData = function() {
  return {
    studentId: this.studentId,
    name: this.fullName,
    class: this.class,
    section: this.section,
    qrCode: this.qrCode
  };
};

// Instance method to get contact information
studentSchema.methods.getContactInfo = function() {
  return {
    studentName: this.fullName,
    guardianName: this.guardianName,
    guardianPhone: this.guardianPhone,
    guardianEmail: this.guardianEmail,
    emergencyContact: this.emergencyContact
  };
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;