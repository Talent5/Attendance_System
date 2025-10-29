# CORS Fix Guide

## Problem
The frontend at `https://attendance-system-blue.vercel.app` is getting CORS errors when trying to connect to the backend at `https://attendance-system-sktv.onrender.com`, especially during logout operations.

## Common Error Messages
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource
CORS request did not succeed
Status code: (null)
CORS Missing Allow Origin
Status code: 503
```

## Root Causes
1. **Render Free Tier Sleep Mode**: Backend sleeps after 15 minutes of inactivity
2. **Initial Wake-up Delay**: First request after sleep takes 30-60 seconds
3. **Missing CORS Headers**: Preflight OPTIONS requests failing
4. **Network Timeouts**: Frontend timing out before backend wakes up

## Solution Applied

### 1. Enhanced Backend CORS Configuration
Updated `Backend/server.js` with:
- Longer preflight cache (24 hours instead of 10 minutes)
- Explicit OPTIONS success status code (204)
- Additional allowed headers including 'Accept' and 'Origin'
- Better logging for debugging

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin && origin.includes('localhost')) return callback(null, true);
    if (origin && origin.endsWith('.vercel.app')) return callback(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all origins (can be restricted later)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};
```

### 2. Improved Frontend Logout Handling
Updated `Admin_Dashboard/src/services/authService.js` to:
- Add 5-second timeout for logout requests
- Gracefully handle CORS/network errors
- Always clear local storage regardless of backend response
- Better error logging

```javascript
async logout() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    if (refreshToken) {
      try {
        await apiClient.post('/auth/logout', 
          { refreshToken },
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
      } catch (logoutError) {
        clearTimeout(timeoutId);
        console.warn('Backend logout failed (this is okay):', logoutError);
      }
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // ALWAYS clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}
```

### 3. Enhanced API Client
Updated `Admin_Dashboard/src/services/apiClient.js` with:
- 30-second timeout for all requests
- `withCredentials: true` for CORS
- Better error logging and handling
- Special handling for logout requests in auth errors

## Deployment Steps

### 1. Deploy Backend Changes

```powershell
# Navigate to project root
cd "c:\Users\Takunda Mundwa\Desktop\Attendance_QR_System"

# Stage changes
git add Backend/server.js

# Commit
git commit -m "fix: Enhance CORS configuration for better reliability and logout handling"

# Push to trigger Render deployment
git push origin main
```

### 2. Deploy Frontend Changes

```powershell
# Stage frontend changes
git add Admin_Dashboard/src/services/apiClient.js Admin_Dashboard/src/services/authService.js

# Commit
git commit -m "fix: Improve logout error handling and CORS reliability"

# Push to trigger Vercel deployment
git push origin main
```

### 3. Verify Deployment

**Test Backend:**
```powershell
# Run the CORS test script
node test-logout-cors.js
```

**Test in Browser:**
1. Open DevTools (F12)
2. Go to Console tab
3. Paste and run:
```javascript
fetch('https://attendance-system-sktv.onrender.com/health', {
  headers: { 'Origin': 'https://attendance-system-blue.vercel.app' }
})
.then(r => r.json())
.then(d => console.log('✅ Backend is awake:', d))
.catch(e => console.error('❌ Backend error:', e));
```

## Testing

### If CORS errors persist:

1. **Check Render logs:**
   - Go to Render dashboard
   - Open your service
   - Check "Logs" tab for errors

2. **Verify backend is running:**
   - Visit: https://attendance-system-sktv.onrender.com/health
   - Should return: `{"status":"OK","timestamp":"...","uptime":...}`

3. **Check for 503 errors:**
   - 503 means service unavailable
   - Backend might be sleeping (free tier)
   - First request after sleep takes 30-60 seconds to wake up
   - Try refreshing the page after 1 minute

4. **Clear browser cache:**
   - Press F12 to open DevTools
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

5. **Check Network tab:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try to login
   - Look at the OPTIONS and POST requests
   - Check response headers for CORS headers

### Expected CORS Headers:
```
Access-Control-Allow-Origin: https://attendance-system-blue.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Allow-Credentials: true
```

## Quick Fix for Free Tier Sleep Issue

If using Render free tier, the service sleeps after 15 minutes of inactivity:

1. **Keep it awake with a cron job:**
   - Use a service like cron-job.org
   - Ping your health endpoint every 10 minutes:
     ```
     https://attendance-system-sktv.onrender.com/health
     ```

2. **Or upgrade to paid tier:**
   - Render paid tier doesn't sleep
   - Costs $7/month for starter instance

## Testing After Deployment

1. **Test from browser console:**
   ```javascript
   fetch('https://attendance-system-sktv.onrender.com/health', {
     headers: {
       'Origin': 'https://attendance-system-blue.vercel.app'
     }
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error);
   ```

2. **Test login:**
   - Go to: https://attendance-system-blue.vercel.app/login
   - Open DevTools (F12) → Network tab
   - Try to login
   - Check for successful OPTIONS request (204 status)
   - Check for POST request to /api/auth/login

## Contact Support

If issues persist:
- Check Render status: https://status.render.com
- Review backend logs in Render dashboard
- Test with Postman/curl to isolate frontend vs backend issues

---

**Last Updated:** October 29, 2025
**Changes Made:** Updated CORS configuration to allow Vercel frontend
