# Quick Setup Guide

## 🚀 Getting Started

1. **Start the Backend Server:**
   ```bash
   cd Backend
   npm start
   ```

2. **Configure Mobile App:**
   - Edit `src/config/config.js`
   - Replace `localhost` with your computer's IP address
   - Example: `http://192.168.1.100:5000`

3. **Run Mobile App:**
   ```bash
   cd \"Mobile Scanner App/attendance-scanner\"
   npm start
   ```

4. **Test on Device:**
   - Install Expo Go app from App Store/Play Store
   - Scan QR code from terminal
   - Or run `npm run android` / `npm run ios`

## 📱 App Flow

1. **Teacher Login** → Enter email/password
2. **Dashboard** → View stats, tap \"Scan QR Code\"
3. **Scanner** → Point camera at student QR code
4. **Result** → See success/failure message
5. **Dashboard** → Updated attendance list

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Network Error | Check backend URL in config.js |
| Camera Permission | Enable in device settings |
| Login Failed | Verify teacher account in backend |
| QR Scan Failed | Ensure QR contains valid student ID |

## 📝 Test Credentials

Use existing teacher accounts from your backend database.

## 🎯 Features Implemented

✅ JWT Authentication with secure storage  
✅ QR Code scanning with expo-barcode-scanner  
✅ Real-time attendance dashboard  
✅ Error handling and user feedback  
✅ Cross-platform compatibility  
✅ Automatic token refresh  
✅ Clean, functional UI

Ready to scan! 📸