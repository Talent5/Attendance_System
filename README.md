# QR Code Attendance Management System

A comprehensive school attendance management system built with modern web technologies. The system consists of three main components: a React.js Admin Dashboard, a React Native Mobile Scanner App, and a Node.js/Express.js Backend API.

## 🏗️ System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │    │                     │
│   Admin Dashboard   │◄──►│    Backend API      │◄──►│  Mobile Scanner     │
│    (React.js)       │    │   (Node.js/Express) │    │  (React Native)     │
│                     │    │                     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
           │                         │                          │
           │                         │                          │
           ▼                         ▼                          ▼
    Web Browsers                MongoDB Atlas              Mobile Devices
                                   Database                 (iOS/Android)
```

## 📱 Project Components

### 1. Admin Dashboard (`/Admin_Dashboard`)
A responsive web application for school administrators and teachers to manage students and attendance records.

**Key Features:**
- Student management (CRUD operations)
- ID card generation with QR codes
- Attendance tracking and reporting
- User management with role-based access
- Real-time attendance dashboard
- CSV export functionality
- Absentee notifications management

**Technology Stack:**
- **Frontend:** React 19.1.1 + Vite
- **Styling:** TailwindCSS 4.1.12
- **Routing:** React Router DOM 7.8.2
- **HTTP Client:** Axios 1.11.0
- **Charts:** Chart.js + React-Chartjs-2
- **QR Generation:** qrcode 1.5.4
- **Notifications:** React Hot Toast
- **Print Support:** React-to-Print + HTML2Canvas

### 2. Mobile Scanner App (`/attendance-scanner`)
A cross-platform mobile application for teachers to scan student QR codes and record attendance.

**Key Features:**
- QR code scanning with camera
- Teacher authentication
- Real-time attendance dashboard
- Offline support with sync capability
- Network status monitoring
- Attendance history viewing

**Technology Stack:**
- **Framework:** React Native + Expo
- **Navigation:** React Navigation 6.x
- **Camera:** Expo Camera + Expo AV
- **Storage:** AsyncStorage
- **HTTP Client:** Axios
- **State Management:** React Context API
- **Network:** @react-native-community/netinfo

### 3. Backend API (`/Backend`)
A RESTful API server handling all business logic, authentication, and data management.

**Key Features:**
- JWT-based authentication
- Student and user management
- QR code generation and validation
- Attendance tracking with duplicate prevention
- Automated email notifications
- Role-based access control
- Comprehensive logging
- Rate limiting and security middleware

**Technology Stack:**
- **Runtime:** Node.js
- **Framework:** Express.js 4.18.2
- **Database:** MongoDB with Mongoose 7.5.0
- **Authentication:** JWT + bcryptjs
- **Email:** Nodemailer 6.9.4
- **Security:** Helmet, CORS, Express Rate Limit
- **Validation:** Joi + Express Validator
- **Logging:** Winston 3.10.0
- **File Upload:** Multer
- **Scheduling:** Node-cron

## 🗄️ Database Schema

### Student Model
```javascript
{
  studentId: String (unique, required),
  firstName: String (required),
  lastName: String (required),
  email: String,
  class: String (required),
  section: String,
  dateOfBirth: Date,
  guardianName: String (required),
  guardianPhone: String (required),
  guardianEmail: String,
  profilePhoto: String,
  qrCode: String (unique),
  qrCodeData: String,
  enrollmentDate: Date,
  isActive: Boolean,
  attendanceStats: {
    totalDays: Number,
    presentDays: Number,
    absentDays: Number,
    lateDays: Number,
    attendancePercentage: Number
  }
}
```

### Attendance Model
```javascript
{
  studentId: ObjectId (ref: Student),
  scannedBy: ObjectId (ref: User),
  scanTime: Date,
  scanDate: Date,
  status: Enum ['present', 'late', 'absent'],
  location: String,
  qrCode: String,
  timeWindow: Enum ['on_time', 'late', 'very_late'],
  minutesLate: Number,
  geoLocation: {
    latitude: Number,
    longitude: Number
  },
  deviceInfo: {
    platform: String,
    userAgent: String,
    ipAddress: String
  },
  isValidScan: Boolean,
  invalidReason: String,
  notes: String
}
```

### User Model
```javascript
{
  name: String (required),
  email: String (unique, required),
  password: String (hashed),
  role: Enum ['admin', 'teacher', 'staff'],
  isActive: Boolean,
  lastLogin: Date,
  loginAttempts: Number,
  lockUntil: Date
}
```

### Notification Model
```javascript
{
  studentId: ObjectId (ref: Student),
  attendanceId: ObjectId (ref: Attendance),
  guardianPhone: String,
  guardianEmail: String,
  guardianName: String,
  message: String,
  subject: String,
  type: Enum ['attendance', 'absence', 'general'],
  priority: Enum ['low', 'normal', 'high', 'urgent'],
  channels: {
    sms: { enabled: Boolean, status: String },
    email: { enabled: Boolean, status: String },
    push: { enabled: Boolean, status: String }
  },
  overallStatus: Enum ['pending', 'sent', 'delivered', 'failed', 'partial'],
  scheduledFor: Date,
  sentAt: Date,
  retryCount: Number
}
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ 
- MongoDB Atlas account or local MongoDB
- Expo CLI (for mobile app)
- Git

### 1. Backend Setup

```bash
cd Backend
npm install
```

Create `.env` file:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Security
BCRYPT_ROUNDS=12
```

Start the server:
```bash
npm run dev
```

### 2. Admin Dashboard Setup

```bash
cd Admin_Dashboard
npm install
npm run dev
```

Access at: `http://localhost:5173`

**Demo Credentials:**
- Admin: `admin@school.com` / `password`
- Teacher: `teacher@school.com` / `password`

### 3. Mobile Scanner Setup

```bash
cd attendance-scanner
npm install
```

Update backend URL in `src/config/config.js`:
```javascript
export const API_BASE_URL = 'http://YOUR_COMPUTER_IP:5000';
```

Start the app:
```bash
npm start
```

## 📋 Features Overview

### Admin Dashboard Features
- ✅ **Student Management:** Add, edit, delete, and search students
- ✅ **ID Card Generation:** Generate printable ID cards with QR codes
- ✅ **Attendance Tracking:** View real-time attendance with filters
- ✅ **Reporting:** Generate attendance reports with charts
- ✅ **User Management:** Manage admin and teacher accounts
- ✅ **QR Scanner:** Manual QR code scanning for attendance
- ✅ **Absentee Management:** Automated absence notifications
- ✅ **Export Data:** CSV export for attendance records
- ✅ **Dashboard Analytics:** Visual attendance statistics

### Mobile Scanner Features
- ✅ **QR Code Scanning:** Fast camera-based QR scanning
- ✅ **Teacher Login:** Secure authentication for teachers
- ✅ **Real-time Dashboard:** View today's attendance instantly
- ✅ **Offline Support:** Store scans offline and sync later
- ✅ **Network Monitoring:** Automatic network status detection
- ✅ **Attendance History:** View past attendance records
- ✅ **Push Notifications:** Real-time scan confirmations

### Backend API Features
- ✅ **RESTful API:** Complete CRUD operations
- ✅ **JWT Authentication:** Secure token-based auth
- ✅ **Role-based Access:** Admin, teacher, staff permissions
- ✅ **QR Code System:** Generation and validation
- ✅ **Attendance Logic:** Duplicate prevention, time windows
- ✅ **Email Notifications:** Automated parent notifications
- ✅ **Data Validation:** Comprehensive input validation
- ✅ **Error Handling:** Structured error responses
- ✅ **Logging System:** Comprehensive request/error logging
- ✅ **Security Middleware:** Rate limiting, CORS, helmet

## 🔧 QR Code System

### QR Code Format
```json
{
  "studentId": "STD001",
  "name": "John Doe",
  "class": "10",
  "section": "A",
  "school": "QR Attendance School",
  "issued": "2024-01-01T00:00:00.000Z",
  "expires": "2025-01-01T00:00:00.000Z",
  "version": "1.0",
  "hash": "security_hash_string"
}
```

### Security Features
- Encrypted QR data with hash validation
- Expiration date checking
- Duplicate scan prevention (one scan per day)
- Time window calculation (on-time, late, very late)
- Device and location tracking

## 📊 Attendance Logic

### Time Windows
- **On Time:** Before 8:30 AM
- **Late:** 8:30 AM - 9:00 AM (0-30 minutes late)
- **Very Late:** After 9:00 AM (30+ minutes late)

### Status Calculation
- **Present:** Successfully scanned on time
- **Late:** Scanned after 8:30 AM
- **Absent:** No scan recorded for the day

### Duplicate Prevention
- One attendance record per student per day
- Backend validation prevents multiple scans
- Mobile app shows appropriate error messages

## 📧 Notification System

### Email Notifications
- **Attendance Confirmation:** Sent when student arrives
- **Late Arrival:** Sent when student is late
- **Absence Alert:** Sent when student is absent
- **Daily Summary:** Optional daily attendance report

### Notification Channels
- **Email:** Via Nodemailer + Gmail SMTP
- **SMS:** Via Twilio (configured but optional)
- **Push:** Mobile app notifications

### Automation
- Scheduled checks for absent students
- Retry logic for failed notifications
- Template-based message generation

## 🔐 Security Features

### Authentication & Authorization
- JWT tokens with refresh mechanism
- Password hashing with bcryptjs
- Role-based access control (Admin, Teacher, Staff)
- Session management with logout

### API Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- SQL injection prevention via Mongoose

### Data Protection
- Environment variables for sensitive data
- Encrypted QR code data
- Secure file upload handling
- Input length limits and validation

## 📱 Mobile App Architecture

### State Management
```javascript
// AuthContext - User authentication state
// AttendanceContext - Attendance data management
// NetworkContext - Network connectivity status
```

### Navigation Structure
```
AuthNavigator (Unauthenticated)
├── LoginScreen

MainNavigator (Authenticated)
├── DashboardScreen
├── QRScannerScreen
└── LoadingScreen
```

### Offline Support
- AsyncStorage for token persistence
- Offline attendance queue
- Automatic sync when network returns
- Network status monitoring

## 📈 Performance Optimizations

### Database
- MongoDB indexes for faster queries
- Aggregation pipelines for reports
- Connection pooling
- Query optimization

### Frontend
- React.memo for component optimization
- Lazy loading for routes
- Image optimization
- Bundle size optimization with Vite

### Mobile
- Image caching
- Efficient re-renders with Context
- Background task handling
- Memory management

## 🧪 Testing

### Backend Testing Commands
```bash
# Test database connection
npm run test-db

# Test attendance API
node test-attendance.js

# Test email system
node test-email.js

# Check system status
node check-system-status.js
```

### Demo Data
```bash
# Seed database with sample data
npm run seed
```

## 📦 Deployment

### Backend Deployment (Railway/Heroku)
1. Set environment variables
2. Configure MongoDB Atlas
3. Deploy from Git repository
4. Update CORS origins

### Frontend Deployment (Vercel/Netlify)
1. Build the project: `npm run build`
2. Deploy `dist` folder
3. Update API endpoints

### Mobile App Deployment
```bash
# Android APK
expo build:android

# iOS IPA
expo build:ios

# App Store/Play Store
expo submit
```

## 🔧 Configuration

### Environment Variables (Backend)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email
EMAIL_PASS=your_password
FRONTEND_URL=https://your-frontend.com
```

### Config Files
- **Backend:** `.env` file
- **Frontend:** Service configuration in `src/services/`
- **Mobile:** `src/config/config.js`

## 🐛 Troubleshooting

### Common Issues

#### Backend Connection Issues
```bash
# Check MongoDB connection
node test-connection.js

# Verify environment variables
echo $MONGODB_URI
```

#### Mobile App Issues
- Ensure backend URL uses computer IP, not localhost
- Check camera permissions on device
- Verify network connectivity

#### QR Code Scanning Issues
- Ensure QR codes contain valid JSON
- Check lighting conditions
- Verify camera focus

## 📄 API Documentation

### Authentication Endpoints
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
```

### Student Endpoints
```
GET    /api/students
POST   /api/students
GET    /api/students/:id
PUT    /api/students/:id
DELETE /api/students/:id
```

### Attendance Endpoints
```
POST /api/attendance/scan
GET  /api/attendance
GET  /api/attendance/reports
POST /api/attendance/manual
```

### User Endpoints
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Takunda Mundwa**
- Email: chrismundwa5@gmail.com
- Database: MongoDB Atlas (talentmundwa)

## 🙏 Acknowledgments

- React and React Native communities
- Expo team for excellent mobile development tools
- MongoDB for reliable database services
- All open-source contributors

## 📞 Support

For support and questions:
1. Check the troubleshooting section
2. Review the documentation
3. Contact the development team
4. Create an issue in the repository

---

**Built with ❤️ for modern education management**
