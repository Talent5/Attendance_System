# Attendance Scanner Mobile App

A React Native mobile application built with Expo for scanning QR codes to record student attendance.

## Features

- **Teacher Authentication**: Secure login with JWT tokens
- **QR Code Scanning**: Scan student QR codes to record attendance  
- **Real-time Dashboard**: View today's attendance with statistics
- **Offline Token Storage**: Secure token management with AsyncStorage
- **Cross-platform**: Works on both iOS and Android

## Tech Stack

- **React Native** with Expo
- **React Navigation** for screen navigation
- **expo-barcode-scanner** for QR code scanning
- **AsyncStorage** for secure token storage
- **Axios** for API communication
- **Context API** for state management

## Prerequisites

- Node.js (v14 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Backend API running (see Backend folder)

## Installation

1. **Navigate to the project directory:**
   ```bash
   cd \"Mobile Scanner App/attendance-scanner\"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install additional required packages:**
   ```bash
   npm install expo-barcode-scanner @react-navigation/native @react-navigation/stack react-native-screens react-native-safe-area-context react-native-gesture-handler @react-native-async-storage/async-storage axios
   ```

## Configuration

1. **Update Backend URL:**
   - Edit `src/config/config.js`
   - Change `API_BASE_URL` to your backend server URL
   - For local development: `http://YOUR_IP_ADDRESS:5000`
   - For production: `https://your-backend-domain.com`

2. **Camera Permissions:**
   - The app automatically requests camera permissions
   - Permissions are configured in `app.json`

## Running the App

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Run on device/simulator:**
   - **iOS**: `npm run ios` (requires macOS)
   - **Android**: `npm run android`
   - **Expo Go**: Scan QR code with Expo Go app

## App Structure

```
src/
├── config/
│   └── config.js           # App configuration
├── contexts/
│   └── AuthContext.js      # Authentication context
├── screens/
│   ├── LoginScreen.js      # Teacher login
│   ├── DashboardScreen.js  # Main dashboard
│   ├── QRScannerScreen.js  # QR code scanner
│   └── LoadingScreen.js    # Loading screen
└── services/
    ├── AuthService.js      # Authentication API
    └── AttendanceService.js # Attendance API
```

## Usage

1. **Login**: Teachers log in with email/password
2. **Dashboard**: View attendance statistics and today's records
3. **Scan QR**: Tap \"Scan QR Code\" to open scanner
4. **Record Attendance**: Scanner automatically processes QR codes
5. **View Results**: Success/failure alerts with student information

## API Integration

The app connects to the backend API with these endpoints:

- `POST /api/auth/login` - Teacher login
- `POST /api/auth/logout` - Logout
- `POST /api/attendance/scan` - Record attendance
- `GET /api/attendance` - Get attendance records

## QR Code Format

The app expects QR codes containing:
- Student ID directly (e.g., \"STD001\")
- JSON format: `{\"studentId\": \"STD001\"}`

## Development Tips

1. **Network Issues**: 
   - Use your computer's IP address instead of localhost
   - Ensure backend and mobile device are on same network

2. **Camera Testing**:
   - Use physical device for camera testing
   - iOS Simulator doesn't support camera

3. **Debugging**:
   - Use React Native Debugger
   - Check Metro bundler logs
   - Enable network debugging in DevTools

## Building for Production

1. **Build APK (Android):**
   ```bash
   expo build:android
   ```

2. **Build IPA (iOS):**
   ```bash
   expo build:ios
   ```

## Troubleshooting

### Common Issues:

1. **\"Network Error\"**: Check backend URL and connectivity
2. **\"Camera Permission Denied\"**: Enable camera in device settings
3. **\"Invalid QR Code\"**: Ensure QR contains valid student ID
4. **App crashes**: Check Expo logs and ensure all dependencies are installed

### Network Configuration:

If using local backend, update the IP address in `config.js`:
```javascript
API_BASE_URL: 'http://192.168.1.100:5000' // Replace with your IP
```

## License

This project is part of the Attendance Management System.