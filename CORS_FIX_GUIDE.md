# CORS Fix Guide

## Problem
The frontend at `https://attendance-system-blue.vercel.app` is getting CORS errors when trying to connect to the backend at `https://attendance-system-sktv.onrender.com`.

## Error Messages
```
CORS Missing Allow Origin
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource
Status code: 503
```

## Solution Applied

### 1. Updated Backend CORS Configuration
The `Backend/server.js` file has been updated with:
- More permissive CORS settings
- Explicit OPTIONS request handling
- Support for all necessary HTTP methods
- Request logging for debugging

### 2. What Was Changed
```javascript
// Added to CORS options:
- methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
- allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
- exposedHeaders: ['Content-Range', 'X-Content-Range']
- maxAge: 600

// Added explicit OPTIONS handler:
app.options('*', cors(corsOptions));

// Added request logging:
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  next();
});
```

## Deployment Steps

### Option 1: Deploy to Render (Recommended)

1. **Commit the changes:**
   ```bash
   cd Backend
   git add server.js
   git commit -m "Fix CORS configuration for Vercel frontend"
   git push origin main
   ```

2. **Trigger Render deployment:**
   - Go to https://dashboard.render.com
   - Find your "attendance-system-sktv" service
   - Click "Manual Deploy" → "Deploy latest commit"
   - Wait for deployment to complete (usually 2-5 minutes)

3. **Verify deployment:**
   - Check the logs in Render dashboard
   - Look for "MongoDB connected successfully" message
   - Test the health endpoint: https://attendance-system-sktv.onrender.com/health

### Option 2: Set Environment Variables (If needed)

In Render dashboard:
1. Go to your service settings
2. Navigate to "Environment" tab
3. Add/Update these variables:
   ```
   FRONTEND_URL=https://attendance-system-blue.vercel.app
   NODE_ENV=production
   ```
4. Save changes (this will trigger a redeploy)

### Option 3: Test Locally First

1. **Test CORS configuration locally:**
   ```bash
   cd Backend
   node test-cors.js
   ```

2. **Start local server:**
   ```bash
   npm start
   ```

3. **In another terminal, test:**
   ```bash
   curl -X OPTIONS http://localhost:5000/api/auth/login \
     -H "Origin: https://attendance-system-blue.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -v
   ```

## Troubleshooting

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
