# Mobile App Network Error Fix

## Problem
The mobile app was showing "network error" despite the backend running locally at `192.168.0.49:5000`.

## Root Cause
The `__DEV__` global variable in the config file was not reliably detecting the development environment in Expo, causing the app to use the production URL instead of the local development URL.

## Solution Applied ✅

### Changes Made:
1. **Updated `attendance-scanner/src/config/config.js`**
   - Removed unreliable `__DEV__` global variable
   - Added more robust environment detection using `process.env.NODE_ENV`
   - Added debug logging to show the environment and API base URL

2. **Added Logging to Services**
   - `AuthService.js` now logs the environment and API URL on initialization
   - `AttendanceService.js` now logs the environment and API URL on initialization

## Steps to Verify the Fix:

### 1. **Check Console Logs**
When you start the app or reload it (press `R` in Expo CLI), look for messages like:
```
🔧 AuthService initialized
📱 Environment: DEVELOPMENT
🌐 API Base URL: http://192.168.0.49:5000
```

Or:
```
🔧 AttendanceService initialized
📱 Environment: PRODUCTION
🌐 API Base URL: https://attendance-system-sktv.onrender.com
```

### 2. **Verify Backend is Running**
Make sure your backend is running:
```bash
cd Backend
npm start
```

You should see:
```
Server running on port 5000
```

### 3. **Make Sure Mobile Device Can Reach Backend**
The IP address `192.168.0.49` must be:
- On the same network as your mobile device
- Correct for your machine

**To find your correct IP:**

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your network adapter.

**Mac/Linux:**
```bash
ifconfig
```

### 4. **Update IP if Needed**
If your machine's IP is different, update it in:
- File: `attendance-scanner/src/config/config.js`
- Line: `API_BASE_URL: IS_DEV ? 'http://YOUR_IP_HERE:5000' : ...`

### 5. **If Still Getting Network Error**
Try these additional steps:

#### a) Test Connectivity from Device
In your mobile app's console, you should see server connectivity checks:
```
Checking server connectivity...
Server reachable: true
```

#### b) Check Firewall
Make sure port 5000 is open on your machine:
- Windows Defender Firewall might be blocking it
- Add an exception for Node.js or port 5000

#### c) Backend CORS Configuration
Verify the backend's CORS settings in `Backend/server.js` are correct:
```javascript
// CORS allows:
// - Requests with no origin (mobile apps)
// - localhost
// - *.vercel.app domains
```

#### d) Test Direct API Call
From your mobile app, try calling:
```
http://192.168.0.49:5000/health
```

You should get:
```json
{
  "status": "OK",
  "timestamp": "2025-10-16T...",
  "uptime": ...
}
```

### 6. **Restart Everything**
Sometimes you need a fresh start:
```bash
# Stop backend
Ctrl + C

# Stop mobile app
R (in Expo CLI)

# Restart backend
npm start

# Reload mobile app
R (in Expo CLI)
```

## Alternative: Use Environment Variables

If you want to make it even easier to switch between dev and prod, you can create a `.env` file in the mobile app:

**File: `attendance-scanner/.env`**
```
EXPO_PUBLIC_ENV=development
```

Then restart your app and it will use development mode.

## Debugging Command

Add this to your mobile app code temporarily to manually check the config:
```javascript
import config from './src/config/config';
console.log('Current Config:', {
  isDev: config.IS_DEV,
  envMode: config.ENV_MODE,
  apiUrl: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
});
```

## Need More Help?

If you're still getting errors:
1. Share the console logs from the mobile app
2. Check if the backend is actually running (`npm start` in Backend folder)
3. Verify your IP address is correct
4. Check if both devices are on the same WiFi network
5. Make sure there's no VPN interfering with local network access
