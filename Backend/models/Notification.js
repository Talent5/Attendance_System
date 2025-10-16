const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required']
  },
  attendanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: function() {
      return this.type === 'attendance';
    }
  },
  emergencyContactPhone: {
    type: String,
    required: [true, 'Emergency contact phone is required'],
    trim: true
  },
  emergencyContactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  emergencyContactName: {
    type: String,
    required: [true, 'Emergency contact name is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [100, 'Subject cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['attendance', 'alert', 'reminder', 'announcement', 'emergency'],
    default: 'attendance',
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  channels: {
    sms: {
      enabled: {
        type: Boolean,
        default: true
      },
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'delivered'],
        default: 'pending'
      },
      sentAt: Date,
      deliveredAt: Date,
      messageId: String,
      errorMessage: String,
      cost: Number
    },
    email: {
      enabled: {
        type: Boolean,
        default: false
      },
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'delivered', 'opened'],
        default: 'pending'
      },
      sentAt: Date,
      deliveredAt: Date,
      openedAt: Date,
      messageId: String,
      errorMessage: String
    },
    push: {
      enabled: {
        type: Boolean,
        default: false
      },
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'delivered'],
        default: 'pending'
      },
      sentAt: Date,
      deliveredAt: Date,
      messageId: String,
      errorMessage: String
    }
  },
  overallStatus: {
    type: String,
    enum: ['pending', 'partial', 'sent', 'failed'],
    default: 'pending'
  },
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  templateUsed: {
    type: String,
    trim: true
  },
  metadata: {
    employeeName: String,
    departmentName: String,
    attendanceTime: Date,
    attendanceStatus: String,
    companyName: String,
    customData: mongoose.Schema.Types.Mixed
  },
  readStatus: {
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: Date,
    readBy: String
  },
  responseData: {
    hasResponse: {
      type: Boolean,
      default: false
    },
    responseText: String,
    responseAt: Date,
    responseMethod: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
notificationSchema.index({ employeeId: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ overallStatus: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ createdAt: -1 });

// Compound indexes
notificationSchema.index({ employeeId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ overallStatus: 1, scheduledFor: 1 });
notificationSchema.index({ emergencyContactPhone: 1, createdAt: -1 });

// Pre-save middleware to update overall status
notificationSchema.pre('save', function(next) {
  const channels = this.channels;
  const enabledChannels = [];
  const statuses = [];
  
  // Check which channels are enabled and their statuses
  if (channels.sms.enabled) {
    enabledChannels.push('sms');
    statuses.push(channels.sms.status);
  }
  if (channels.email.enabled) {
    enabledChannels.push('email');
    statuses.push(channels.email.status);
  }
  if (channels.push.enabled) {
    enabledChannels.push('push');
    statuses.push(channels.push.status);
  }
  
  // Determine overall status
  if (statuses.every(status => status === 'sent' || status === 'delivered')) {
    this.overallStatus = 'sent';
  } else if (statuses.every(status => status === 'failed')) {
    this.overallStatus = 'failed';
  } else if (statuses.some(status => status === 'sent' || status === 'delivered')) {
    this.overallStatus = 'partial';
  } else {
    this.overallStatus = 'pending';
  }
  
  next();
});

// Virtual for enabled channels count
notificationSchema.virtual('enabledChannelsCount').get(function() {
  let count = 0;
  if (this.channels.sms.enabled) count++;
  if (this.channels.email.enabled) count++;
  if (this.channels.push.enabled) count++;
  return count;
});

// Virtual for successful delivery count
notificationSchema.virtual('successfulDeliveries').get(function() {
  let count = 0;
  if (this.channels.sms.enabled && (this.channels.sms.status === 'sent' || this.channels.sms.status === 'delivered')) count++;
  if (this.channels.email.enabled && (this.channels.email.status === 'sent' || this.channels.email.status === 'delivered')) count++;
  if (this.channels.push.enabled && (this.channels.push.status === 'sent' || this.channels.push.status === 'delivered')) count++;
  return count;
});

// Virtual for delivery rate
notificationSchema.virtual('deliveryRate').get(function() {
  const enabled = this.enabledChannelsCount;
  const successful = this.successfulDeliveries;
  return enabled > 0 ? (successful / enabled) * 100 : 0;
});

// Virtual for formatted scheduled time
notificationSchema.virtual('formattedScheduledTime').get(function() {
  return this.scheduledFor.toLocaleString();
});

// Static method to create attendance notification
notificationSchema.statics.createAttendanceNotification = async function(employeeData, attendanceData, options = {}) {
  const notification = new this({
    employeeId: employeeData._id,
    attendanceId: attendanceData._id,
    emergencyContactPhone: employeeData.emergencyContactPhone,
    emergencyContactEmail: employeeData.emergencyContactEmail,
    emergencyContactName: employeeData.emergencyContactName,
    type: 'attendance',
    priority: attendanceData.status === 'late' ? 'high' : 'normal',
    channels: {
      sms: {
        enabled: options.enableSMS !== false
      },
      email: {
        enabled: options.enableEmail === true && employeeData.emergencyContactEmail
      }
    },
    metadata: {
      employeeName: employeeData.fullName,
      departmentName: employeeData.departmentPosition,
      attendanceTime: attendanceData.scanTime,
      attendanceStatus: attendanceData.status,
      companyName: options.companyName || 'Company'
    }
  });
  
  // Generate message based on template
  notification.message = notification.generateAttendanceMessage();
  notification.subject = `Attendance Update - ${employeeData.fullName}`;
  
  return notification.save();
};

// Instance method to generate attendance message
notificationSchema.methods.generateAttendanceMessage = function() {
  const { employeeName, attendanceTime, attendanceStatus, companyName } = this.metadata;
  const time = new Date(attendanceTime).toLocaleTimeString();
  const date = new Date(attendanceTime).toLocaleDateString();
  
  let statusText = '';
  switch (attendanceStatus) {
    case 'present':
      statusText = 'has arrived at work';
      break;
    case 'late':
      statusText = 'arrived late at work';
      break;
    case 'absent':
      statusText = 'is marked absent';
      break;
    default:
      statusText = 'attendance recorded';
  }
  
  return `Dear ${this.emergencyContactName}, ${employeeName} ${statusText} on ${date} at ${time}. - ${companyName}`;
};

// Instance method to update channel status
notificationSchema.methods.updateChannelStatus = function(channel, status, details = {}) {
  if (!this.channels[channel]) {
    throw new Error(`Invalid channel: ${channel}`);
  }
  
  this.channels[channel].status = status;
  
  if (details.sentAt) this.channels[channel].sentAt = details.sentAt;
  if (details.deliveredAt) this.channels[channel].deliveredAt = details.deliveredAt;
  if (details.messageId) this.channels[channel].messageId = details.messageId;
  if (details.errorMessage) this.channels[channel].errorMessage = details.errorMessage;
  if (details.cost) this.channels[channel].cost = details.cost;
  
  // Update overall status
  this.save();
  
  return this;
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function(readBy = 'system') {
  this.readStatus.isRead = true;
  this.readStatus.readAt = new Date();
  this.readStatus.readBy = readBy;
  return this.save();
};

// Instance method to add response
notificationSchema.methods.addResponse = function(responseText, method = 'sms') {
  this.responseData.hasResponse = true;
  this.responseData.responseText = responseText;
  this.responseData.responseAt = new Date();
  this.responseData.responseMethod = method;
  return this.save();
};

// Static method to get pending notifications
notificationSchema.statics.getPendingNotifications = function(limit = 50) {
  return this.find({
    overallStatus: { $in: ['pending', 'partial'] },
    scheduledFor: { $lte: new Date() },
    retryCount: { $lt: 3 }
  })
  .populate('studentId', 'firstName lastName studentId class section')
  .sort({ priority: -1, scheduledFor: 1 })
  .limit(limit);
};

// Static method to get notification stats
notificationSchema.statics.getNotificationStats = async function(startDate, endDate) {
  const matchQuery = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  const pipeline = [
    { $match: matchQuery },
    {
      $group: {
        _id: {
          type: '$type',
          status: '$overallStatus'
        },
        count: { $sum: 1 },
        totalCost: { $sum: '$channels.sms.cost' }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        statusCounts: {
          $push: {
            status: '$_id.status',
            count: '$count',
            cost: '$totalCost'
          }
        },
        totalNotifications: { $sum: '$count' },
        totalCost: { $sum: '$totalCost' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to cleanup old notifications
notificationSchema.statics.cleanupOldNotifications = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    overallStatus: { $in: ['sent', 'failed'] }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;