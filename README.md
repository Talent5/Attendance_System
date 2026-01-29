# Attendance System

A comprehensive QR code-based attendance management system built with React, Node.js, Express, MongoDB, and React Native for mobile attendance scanning.

🔗 **Live Demo**: [https://attendance-system-blue.vercel.app](https://attendance-system-blue.vercel.app)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

This attendance system provides a modern solution for tracking employee or student attendance using QR code technology. The system consists of three main components:

1. **Admin Dashboard** - Web-based administration interface for managing users and viewing attendance records
2. **Backend API** - RESTful API server handling authentication, data management, and business logic
3. **Mobile Scanner** - React Native mobile application for scanning QR codes and recording attendance

## ✨ Features

### Admin Dashboard
- 🔐 JWT-based authentication (Admin & Teacher roles)
- 👥 Complete student/employee management (CRUD operations)
- 🆔 ID card generation with QR codes
- 📊 Attendance tracking and filtering
- 📈 Analytics and reporting
- 📤 CSV export functionality
- 📱 Responsive design with TailwindCSS
- 🎨 Modern, intuitive UI

### Backend API
- 🔒 Secure authentication with JWT
- 👤 User management (multiple roles)
- 📝 Attendance record management
- 📧 Email notifications for absentees
- 🔔 Real-time notification system
- 🛡️ Rate limiting and security middleware
- 📊 Database migrations and seeding
- ⚡ Performance optimized with compression

### Mobile Scanner
- 📷 QR code scanning capability
- ✅ Real-time attendance marking
- 📱 Cross-platform (Android/iOS)
- 🚀 Built with Expo for easy deployment
- 💾 Offline capability (coming soon)

## 🏗️ System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Admin Dashboard│◄────────┤   Backend API    │────────►│ Mobile Scanner  │
│   (React.js)    │  HTTPS  │   (Node.js)      │  HTTPS │  (React Native) │
│                 │         │                  │         │                 │
└─────────────────┘         └────────┬─────────┘         └─────────────────┘
                                     │
                                     │
                              ┌──────▼───────┐
                              │   MongoDB    │
                              │   Database   │
                              └──────────────┘
```

## 🛠️ Technology Stack

### Frontend (Admin Dashboard)
- **Framework**: React 19.1.1
- **Build Tool**: Vite
- **Styling**: TailwindCSS 4.1.12
- **Routing**: React Router DOM
- **HTTP Client**: Axios
- **Charts**: Chart.js & react-chartjs-2
- **QR Generation**: qrcode
- **Export**: react-to-print, html2canvas

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS
- **Email**: Nodemailer
- **Logging**: Winston
- **Compression**: compression middleware

### Mobile App
- **Framework**: React Native (Expo)
- **QR Scanning**: expo-camera & expo-barcode-scanner
- **Navigation**: Expo Router

## 📁 Project Structure

```
Attendance_System/
├── Admin_Dashboard/          # React admin web interface
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services
│   │   ├── pages/           # Page components
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── vite.config.js
│
├── Backend/                  # Node.js Express server
│   ├── models/              # Mongoose models
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   ├── scripts/             # Database scripts
│   ├── server.js            # Main server file
│   └── package.json
│
├── attendance-scanner/       # React Native mobile app
│   ├── src/
│   │   ├── screens/         # App screens
│   │   ├── components/      # React Native components
│   │   └── services/        # API services
│   ├── App.js
│   ├── app.json
│   ├── eas.json             # Expo Application Services config
│   └── package.json
│
├── DEPLOYMENT_GUIDE.md       # Deployment instructions
├── CORS_FIX_GUIDE.md        # CORS troubleshooting
├── LOGOUT_CORS_FIX.md       # Logout issues guide
└── RESTART_INSTRUCTIONS.md   # System restart guide
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- MongoDB (local or cloud instance)
- Git
- For mobile app: Expo CLI and Expo Go app

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Talent5/Attendance_System.git
cd Attendance_System
```

#### 2. Backend Setup

```bash
cd Backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm start
```

Required environment variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5174
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
```

#### 3. Admin Dashboard Setup

```bash
cd Admin_Dashboard
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:5174`

**Demo Credentials:**
- Admin: `admin@school.com` / `password`
- Teacher: `teacher@school.com` / `password`

#### 4. Mobile App Setup

```bash
cd attendance-scanner
npm install

# Start Expo development server
npm start

# Or run on specific platform
npm run android  # For Android
npm run ios      # For iOS
```

Scan the QR code with Expo Go app to run on your device.

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Instructions for deploying to production
- [CORS Fix Guide](./CORS_FIX_GUIDE.md) - Troubleshooting CORS issues
- [Logout CORS Fix](./LOGOUT_CORS_FIX.md) - Specific logout endpoint fixes
- [Restart Instructions](./RESTART_INSTRUCTIONS.md) - System restart procedures
- [Absentee Notification Setup](./Backend/ABSENTEE_NOTIFICATION_SETUP.md) - Email notification configuration
- [Admin Dashboard README](./Admin_Dashboard/README.md) - Frontend specific documentation
- [Mobile App Setup](./attendance-scanner/SETUP.md) - Mobile app configuration

## 🌐 Deployment

### Backend (Render)
The backend is deployed on Render. See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

### Frontend (Vercel)
The admin dashboard is deployed on Vercel:
```bash
cd Admin_Dashboard
npm run build
# Deploy to Vercel
```

### Mobile App (Expo)
Build APK/IPA using Expo Application Services:
```bash
cd attendance-scanner
eas build --platform android
eas build --platform ios
```

## 🧪 Testing

### Backend Tests
```bash
cd Backend
npm test                          # Run all tests
node test-connection.js          # Test database connection
node check-system-status.js      # System health check
```

### Frontend Tests
```bash
cd Admin_Dashboard
npm run lint                     # Run ESLint
npm run test                     # Run tests (if configured)
```

## 🔧 Utility Scripts

The backend includes several utility scripts:

- `check-attendance.js` - Verify attendance records
- `check-students.js` - List all students
- `seed.js` - Populate database with sample data
- `migrate-class-to-department.js` - Database migration
- `send-test-email.js` - Test email configuration
- `debug-attendance.js` - Debug attendance issues

Run with:
```bash
cd Backend
node <script-name>.js
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards
- Follow ESLint configuration
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

## 📝 License

This project is open source and available under the MIT License.

## 👥 Author

**Talent5**
- GitHub: [@Talent5](https://github.com/Talent5)

## 🙏 Acknowledgments

- React and React Native communities
- Expo team for excellent mobile development tools
- MongoDB for reliable database solutions
- All contributors and users of this system

## 📞 Support

For issues, questions, or contributions:
- Create an [Issue](https://github.com/Talent5/Attendance_System/issues)
- Submit a [Pull Request](https://github.com/Talent5/Attendance_System/pulls)

---

Made with ❤️ by Talent5