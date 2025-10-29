const Joi = require('joi');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Generic validation middleware using Joi
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { 
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message.replace(/"/g, ''))
        .join(', ');

      logger.warn(`Validation error: ${errorMessage}`, {
        method: req.method,
        url: req.url,
        data: req[property]
      });

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errorMessage,
          fields: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message.replace(/"/g, '')
          }))
        }
      });
    }

    // Update request with validated data (removes unknown fields)
    req[property] = error ? req[property] : Joi.attempt(req[property], schema);
    next();
  };
};

// Express-validator error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    logger.warn(`Express validation error:`, {
      method: req.method,
      url: req.url,
      errors: errorDetails
    });

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errorDetails.map(e => e.message).join(', '),
        fields: errorDetails
      }
    });
  }

  next();
};

// Validation schemas
const schemas = {
  // User validation schemas
  userRegister: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(6)
      .max(100)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required'
      }),
    role: Joi.string()
      .valid('admin', 'manager', 'supervisor', 'hr')
      .default('manager'),
    phoneNumber: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional()
      .allow('')
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    department: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow(''),
    isActive: Joi.boolean()
      .default(true)
      .optional()
  }),

  userLogin: Joi.object({
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  userUpdate: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional(),
    phoneNumber: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional()
      .allow(''),
    department: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow(''),
    isActive: Joi.boolean()
      .optional()
  }),

  // Student validation schemas
  studentCreate: Joi.object({
    studentId: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^[A-Z0-9]+$/)
      .min(3)
      .max(20)
      .required()
      .messages({
        'string.pattern.base': 'Student ID can only contain letters and numbers',
        'any.required': 'Student ID is required'
      }),
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'First name is required'
      }),
    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Last name is required'
      }),
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    phoneNumber: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional()
      .allow(''),
    class: Joi.string()
      .trim()
      .uppercase()
      .required()
      .messages({
        'any.required': 'Class is required'
      }),
    section: Joi.string()
      .trim()
      .uppercase()
      .default('A'),
    rollNumber: Joi.string()
      .trim()
      .optional()
      .allow(''),
    dateOfBirth: Joi.date()
      .max('now')
      .optional(),
    gender: Joi.string()
      .valid('male', 'female', 'other')
      .lowercase()
      .optional(),
    guardianName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'any.required': 'Guardian name is required'
      }),
    guardianPhone: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid guardian phone number',
        'any.required': 'Guardian phone is required'
      }),
    guardianEmail: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    guardianRelation: Joi.string()
      .valid('parent', 'guardian', 'relative', 'other')
      .default('parent'),
    address: Joi.object({
      street: Joi.string().trim().optional().allow(''),
      city: Joi.string().trim().optional().allow(''),
      state: Joi.string().trim().optional().allow(''),
      zipCode: Joi.string().trim().optional().allow(''),
      country: Joi.string().trim().default('USA')
    }).optional(),
    notes: Joi.string()
      .max(500)
      .optional()
      .allow('')
  }),

  studentUpdate: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    phoneNumber: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional()
      .allow(''),
    class: Joi.string()
      .trim()
      .uppercase()
      .optional(),
    section: Joi.string()
      .trim()
      .uppercase()
      .optional(),
    rollNumber: Joi.string()
      .trim()
      .optional()
      .allow(''),
    dateOfBirth: Joi.date()
      .max('now')
      .optional(),
    gender: Joi.string()
      .valid('male', 'female', 'other')
      .lowercase()
      .optional(),
    guardianName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),
    guardianPhone: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional(),
    guardianEmail: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    guardianRelation: Joi.string()
      .valid('parent', 'guardian', 'relative', 'other')
      .optional(),
    address: Joi.object({
      street: Joi.string().trim().optional().allow(''),
      city: Joi.string().trim().optional().allow(''),
      state: Joi.string().trim().optional().allow(''),
      zipCode: Joi.string().trim().optional().allow(''),
      country: Joi.string().trim().default('USA')
    }).optional(),
    isActive: Joi.boolean()
      .optional(),
    notes: Joi.string()
      .max(500)
      .optional()
      .allow('')
  }),

  // Employee validation schemas
  employeeCreate: Joi.object({
    employeeId: Joi.string()
      .trim()
      .uppercase()
      .pattern(/^[A-Z0-9]+$/)
      .min(3)
      .max(20)
      .required()
      .messages({
        'string.pattern.base': 'Employee ID can only contain letters and numbers',
        'any.required': 'Employee ID is required'
      }),
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'First name is required'
      }),
    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .required()
      .messages({
        'any.required': 'Last name is required'
      }),
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    phoneNumber: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional()
      .allow(''),
    department: Joi.string()
      .trim()
      .uppercase()
      .required()
      .messages({
        'any.required': 'Department is required'
      }),
    position: Joi.string()
      .trim()
      .uppercase()
      .default('STAFF'),
    employeeNumber: Joi.string()
      .trim()
      .optional()
      .allow(''),
    dateOfBirth: Joi.date()
      .max('now')
      .optional(),
    gender: Joi.string()
      .valid('male', 'female', 'other')
      .lowercase()
      .optional(),
    emergencyContactName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'any.required': 'Emergency contact name is required'
      }),
    emergencyContactPhone: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Please provide a valid emergency contact phone number',
        'any.required': 'Emergency contact phone is required'
      }),
    emergencyContactEmail: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    emergencyContactRelation: Joi.string()
      .valid('spouse', 'parent', 'sibling', 'relative', 'friend', 'other')
      .default('spouse'),
    address: Joi.object({
      street: Joi.string().trim().optional().allow(''),
      city: Joi.string().trim().optional().allow(''),
      state: Joi.string().trim().optional().allow(''),
      zipCode: Joi.string().trim().optional().allow(''),
      country: Joi.string().trim().default('USA')
    }).optional(),
    notes: Joi.string()
      .max(500)
      .optional()
      .allow('')
  }),

  employeeUpdate: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .optional(),
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    phoneNumber: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional()
      .allow(''),
    department: Joi.string()
      .trim()
      .uppercase()
      .optional(),
    position: Joi.string()
      .trim()
      .uppercase()
      .optional(),
    employeeNumber: Joi.string()
      .trim()
      .optional()
      .allow(''),
    dateOfBirth: Joi.date()
      .max('now')
      .optional(),
    gender: Joi.string()
      .valid('male', 'female', 'other')
      .lowercase()
      .optional(),
    emergencyContactName: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .optional(),
    emergencyContactPhone: Joi.string()
      .pattern(/^[\d\s\-\+\(\)]+$/)
      .optional(),
    emergencyContactEmail: Joi.string()
      .email()
      .trim()
      .lowercase()
      .optional()
      .allow(''),
    emergencyContactRelation: Joi.string()
      .valid('spouse', 'parent', 'sibling', 'relative', 'friend', 'other')
      .optional(),
    address: Joi.object({
      street: Joi.string().trim().optional().allow(''),
      city: Joi.string().trim().optional().allow(''),
      state: Joi.string().trim().optional().allow(''),
      zipCode: Joi.string().trim().optional().allow(''),
      country: Joi.string().trim().default('USA')
    }).optional(),
    isActive: Joi.boolean()
      .optional(),
    notes: Joi.string()
      .max(500)
      .optional()
      .allow('')
  }),

  // Attendance validation schemas
  attendanceScan: Joi.object({
    qrCode: Joi.string()
      .required()
      .messages({
        'any.required': 'QR code is required'
      }),
    location: Joi.string()
      .trim()
      .default('Main Campus'),
    notes: Joi.string()
      .max(200)
      .optional()
      .allow(''),
    geoLocation: Joi.object({
      latitude: Joi.number()
        .min(-90)
        .max(90)
        .optional(),
      longitude: Joi.number()
        .min(-180)
        .max(180)
        .optional(),
      accuracy: Joi.number()
        .positive()
        .optional(),
      timestamp: Joi.date()
        .optional()
    }).optional()
  }),

  // Query parameter validation schemas
  attendanceQuery: Joi.object({
    startDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    ).optional(),
    endDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
    ).optional(),
    class: Joi.string()
      .trim()
      .optional(),
    section: Joi.string()
      .trim()
      .optional(),
    status: Joi.string()
      .valid('present', 'late', 'absent')
      .optional(),
    studentId: Joi.string()
      .optional(),
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(20)
  }),

  // Notification validation schemas
  notificationSend: Joi.object({
    studentIds: Joi.array()
      .items(Joi.string().required())
      .min(1)
      .required(),
    message: Joi.string()
      .trim()
      .min(10)
      .max(500)
      .required(),
    subject: Joi.string()
      .trim()
      .max(100)
      .optional(),
    type: Joi.string()
      .valid('attendance', 'alert', 'reminder', 'announcement', 'emergency')
      .default('alert'),
    priority: Joi.string()
      .valid('low', 'normal', 'high', 'urgent')
      .default('normal'),
    channels: Joi.object({
      sms: Joi.boolean().default(true),
      email: Joi.boolean().default(false),
      push: Joi.boolean().default(false)
    }).optional()
  })
};

// Common ID validation
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: { message: `Invalid ${paramName} format` }
      });
    }
    next();
  };
};

// File upload validation
const validateFileUpload = (allowedTypes = ['image/jpeg', 'image/png'], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    // Check file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: { 
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
        }
      });
    }

    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: { 
          message: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` 
        }
      });
    }

    next();
  };
};

module.exports = {
  validate,
  handleValidationErrors,
  schemas,
  validateObjectId,
  validateFileUpload
};