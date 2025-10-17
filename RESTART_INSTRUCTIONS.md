# 🚀 IMPORTANT: Restart Your Dev Server!

## The Issue
Your app is still trying to connect to `http://localhost:5000` because the environment variable wasn't loaded when the dev server started.

## Quick Fix Steps:

### 1. Stop the Current Dev Server
Press `Ctrl + C` in the terminal where the dev server is running

### 2. Restart the Dev Server
```powershell
cd Admin_Dashboard
npm run dev
```

### 3. Verify Configuration
When the server starts, check the browser console. You should see:
```
🔧 API Configuration: {
  VITE_API_URL: "https://attendance-system-sktv.onrender.com/api",
  API_URL: "https://attendance-system-sktv.onrender.com/api",
  mode: "development"
}
```

### 4. Test Login
Try logging in again. The requests should now go to `https://attendance-system-sktv.onrender.com/api/auth/login`

## Alternative: Hard-Code for Testing

If you want to test immediately without restarting, you can temporarily hard-code the URL:

In `Admin_Dashboard/src/services/apiClient.js`, change line 4 to:
```javascript
const API_URL = 'https://attendance-system-sktv.onrender.com/api';
```

But remember to change it back and use the `.env` file for production!

## Environment Variables in Vite

**Important Note**: Vite only reads `.env` files when the dev server starts. Changes to `.env` require a restart!

## Checklist
- [ ] Stop dev server (Ctrl + C)
- [ ] Restart dev server (`npm run dev`)
- [ ] Check console for API URL
- [ ] Try login again
- [ ] Check Network tab - requests should go to Render backend

---

**Your Backend**: https://attendance-system-sktv.onrender.com
**Expected API**: https://attendance-system-sktv.onrender.com/api
