const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required']
  },
  scannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Scanner user ID is required']
  },
  scanTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  scanDate: {
    type: Date,
    required: false  // Will be set automatically by pre-save middleware
  },
  status: {
    type: String,
    enum: ['present', 'late', 'absent'],
    default: 'present',
    required: true
  },
  location: {
    type: String,
    trim: true,
    default: 'Main Office'
  },
  deviceInfo: {
    platform: String,
    userAgent: String,
    ipAddress: String
  },
  geoLocation: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    accuracy: Number,
    timestamp: Date
  },
  qrCode: {
    type: String,
    required: true
  },
  isValidScan: {
    type: Boolean,
    default: true
  },
  invalidReason: {
    type: String,
    enum: ['duplicate', 'expired', 'invalid_qr', 'wrong_location', 'outside_hours'],
    required: function() {
      return !this.isValidScan;
    }
  },
  timeWindow: {
    type: String,
    enum: ['early', 'on_time', 'late', 'very_late'],
    default: 'on_time'
  },
  minutesLate: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    maxlength: [200, 'Notes cannot exceed 200 characters'],
    trim: true
  },
  workSession: {
    meetingTitle: String,
    supervisor: String,
    sessionType: String,
    startTime: Date,
    endTime: Date
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationDetails: {
    sentAt: Date,
    method: {
      type: String,
      enum: ['sms', 'email', 'push', 'multiple']
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending']
    },
    errorMessage: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
attendanceSchema.index({ employeeId: 1, scanDate: 1 });
attendanceSchema.index({ scannedBy: 1 });
attendanceSchema.index({ scanTime: 1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ isValidScan: 1 });
attendanceSchema.index({ scanDate: 1, status: 1 });

// Compound index for attendance queries
attendanceSchema.index({ employeeId: 1, scanDate: 1, status: 1 });
attendanceSchema.index({ scanDate: 1, location: 1 });

// Unique compound index to prevent duplicate scans per day
attendanceSchema.index({ employeeId: 1, scanDate: 1 }, { unique: true });

// Pre-save middleware to set scan date and determine time window
attendanceSchema.pre('save', function(next) {
  // Always set scan date (date only, no time) from scanTime
  const scanDate = new Date(this.scanTime);
  this.scanDate = new Date(scanDate.getFullYear(), scanDate.getMonth(), scanDate.getDate());
  
  // Determine time window and minutes late
  const scanHour = this.scanTime.getHours();
  const scanMinute = this.scanTime.getMinutes();
  const totalMinutes = scanHour * 60 + scanMinute;
  
  // Work starts at 9:00 AM (540 minutes from midnight)
  const workStartTime = 9 * 60; // 9:00 AM
  const lateThreshold = workStartTime + 15; // 9:15 AM
  const veryLateThreshold = workStartTime + 30; // 9:30 AM
  
  if (totalMinutes < workStartTime - 30) {
    this.timeWindow = 'early';
  } else if (totalMinutes <= workStartTime + 5) {
    this.timeWindow = 'on_time';
  } else if (totalMinutes <= lateThreshold) {
    this.timeWindow = 'late';
    this.minutesLate = totalMinutes - workStartTime;
    this.status = 'late';
  } else {
    this.timeWindow = 'very_late';
    this.minutesLate = totalMinutes - workStartTime;
    this.status = 'late';
  }
  
  next();
});

// Virtual for formatted scan time
attendanceSchema.virtual('formattedScanTime').get(function() {
  return this.scanTime.toLocaleString();
});

// Virtual for formatted scan date
attendanceSchema.virtual('formattedScanDate').get(function() {
  return this.scanDate.toLocaleDateString();
});

// Virtual for time since scan
attendanceSchema.virtual('timeSinceScan').get(function() {
  const now = new Date();
  const diffMs = now - this.scanTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays} day(s) ago`;
  if (diffHours > 0) return `${diffHours} hour(s) ago`;
  if (diffMins > 0) return `${diffMins} minute(s) ago`;
  return 'Just now';
});

// Static method to get attendance for a specific date
attendanceSchema.statics.findByDate = function(date, status = null) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const query = {
    scanTime: { $gte: startOfDay, $lte: endOfDay }
  };
  
  if (status) query.status = status;
  
  return this.find(query)
    .populate('employeeId', 'firstName lastName employeeId department position')
    .populate('scannedBy', 'name email')
    .sort({ scanTime: -1 });
};

// Static method to get attendance statistics for a date range
attendanceSchema.statics.getAttendanceStats = async function(startDate, endDate, filters = {}) {
  const matchQuery = {
    scanTime: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    isValidScan: true
  };
  
  // Add filters
  if (filters.department) matchQuery['employeeDetails.department'] = filters.department;
  if (filters.position) matchQuery['employeeDetails.position'] = filters.position;
  if (filters.status) matchQuery.status = filters.status;
  
  const pipeline = [
    {
      $lookup: {
        from: 'employees',
        localField: 'employeeId',
        foreignField: '_id',
        as: 'employeeDetails'
      }
    },
    { $unwind: '$employeeDetails' },
    { $match: matchQuery },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$scanDate' } },
          status: '$status'
        },
        count: { $sum: 1 },
        employees: { $addToSet: '$employeeId' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        statusCounts: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalEmployees: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to check for duplicate scan
attendanceSchema.statics.checkDuplicateScan = async function(employeeId, scanDate) {
  const startOfDay = new Date(scanDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(scanDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const existingAttendance = await this.findOne({
    employeeId: employeeId,
    scanTime: { $gte: startOfDay, $lte: endOfDay },
    isValidScan: true
  });
  
  return existingAttendance;
};

// Static method to get employee attendance history
attendanceSchema.statics.getEmployeeHistory = function(employeeId, limit = 50) {
  return this.find({ employeeId, isValidScan: true })
    .populate('scannedBy', 'name')
    .sort({ scanTime: -1 })
    .limit(limit);
};

// Static method to get supervisor scan history
attendanceSchema.statics.getSupervisorHistory = function(supervisorId, limit = 100) {
  return this.find({ scannedBy: supervisorId, isValidScan: true })
    .populate('employeeId', 'firstName lastName employeeId department position')
    .sort({ scanTime: -1 })
    .limit(limit);
};

// Instance method to mark notification as sent
attendanceSchema.methods.markNotificationSent = function(method, status, errorMessage = null) {
  this.notificationSent = status === 'sent';
  this.notificationDetails = {
    sentAt: new Date(),
    method: method,
    status: status,
    errorMessage: errorMessage
  };
  return this.save();
};

// Instance method to get attendance summary
attendanceSchema.methods.getSummary = function() {
  return {
    employee: this.employeeId,
    scanTime: this.scanTime,
    status: this.status,
    timeWindow: this.timeWindow,
    minutesLate: this.minutesLate,
    location: this.location,
    scannedBy: this.scannedBy
  };
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;