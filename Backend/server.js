const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const absenteeNotificationRoutes = require('./routes/absenteeNotifications');

const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const absenteeNotificationService = require('./services/absenteeNotificationService');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration - Enhanced for better reliability
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (origin && origin.includes('localhost')) return callback(null, true);

    // Allow ALL Vercel domains (*.vercel.app)
    if (origin && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow specific frontend URL from environment
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    // Allow other origins with a warning (for development/testing)
    logger.warn(`CORS: Allowing origin: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours - increase to reduce preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/absentee', absenteeNotificationRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qr-attendance', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  
  // Initialize absentee notification service
  absenteeNotificationService.init();
  
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Absentee notification service initialized');
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  absenteeNotificationService.stopScheduler();
  mongoose.connection.close().then(() => {
    logger.info('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  absenteeNotificationService.stopScheduler();
  mongoose.connection.close().then(() => {
    logger.info('MongoDB connection closed.');
    process.exit(0);
  });
});

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;