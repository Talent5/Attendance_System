const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Storage configuration for profile photos
const profilePhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'profiles');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `profile-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Storage configuration for ID card photos
const idCardPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', 'id-cards');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const studentId = req.body.studentId || req.params.studentId || 'unknown';
    const uniqueSuffix = Date.now();
    const extension = path.extname(file.originalname);
    const filename = `id-card-${studentId}-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, and GIF files are allowed.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// Multer configurations
const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1
  }
});

const idCardPhotoUpload = multer({
  storage: idCardPhotoStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 1
  }
});

// Memory storage for temporary file processing
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: 1
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 5MB.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Only one file is allowed.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in the request.';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long.';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long.';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields.';
        break;
      default:
        message = error.message;
    }

    logger.warn(`File upload error: ${message}`, {
      code: error.code,
      field: error.field,
      method: req.method,
      url: req.url
    });

    return res.status(400).json({
      success: false,
      error: { message }
    });
  }

  if (error && error.code === 'INVALID_FILE_TYPE') {
    logger.warn(`Invalid file type uploaded`, {
      method: req.method,
      url: req.url,
      originalName: req.file?.originalname,
      mimetype: req.file?.mimetype
    });

    return res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }

  next(error);
};

// Cleanup uploaded file helper
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Failed to cleanup file ${filePath}:`, error);
  }
};

// Middleware to clean up files on error
const cleanupOnError = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // If there's an error and a file was uploaded, clean it up
    if (req.file && (!data.success || data.error)) {
      cleanupFile(req.file.path);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// File validation middleware
const validateImage = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Additional validation can be added here
  // For example, checking image dimensions, file integrity, etc.
  
  // Basic image validation
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    cleanupFile(req.file.path);
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid image format. Only JPEG, PNG, and GIF are allowed.' }
    });
  }

  // Check if file is actually an image by reading its header
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const fileExtension = path.extname(req.file.originalname).toLowerCase();
  
  if (!imageExtensions.includes(fileExtension)) {
    cleanupFile(req.file.path);
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid file extension. Only image files are allowed.' }
    });
  }

  logger.info(`Image uploaded successfully: ${req.file.filename}`, {
    size: req.file.size,
    mimetype: req.file.mimetype,
    originalName: req.file.originalname
  });

  next();
};

// Get file URL helper
const getFileUrl = (req, filename) => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/uploads/${filename}`;
};

module.exports = {
  profilePhotoUpload,
  idCardPhotoUpload,
  memoryUpload,
  handleUploadError,
  cleanupFile,
  cleanupOnError,
  validateImage,
  getFileUrl,
  ensureDirectoryExists
};