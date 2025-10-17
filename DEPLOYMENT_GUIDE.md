# Deployment Guide for QR Attendance System

## Backend (Already Deployed)
✅ Backend is deployed at: **https://attendance-system-sktv.onrender.com**

## Frontend Deployment Options

### Option 1: Deploy to Vercel (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to Admin Dashboard**:
   ```bash
   cd Admin_Dashboard
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```
   - Login with your GitHub/GitLab/Bitbucket account
   - Follow the prompts
   - Confirm the project settings
   - The app will be deployed automatically

4. **Set Environment Variables on Vercel**:
   - Go to your project on Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://attendance-system-sktv.onrender.com/api`

5. **Configure CORS on Backend**:
   - Update your backend `.env` file on Render to include:
     ```
     FRONTEND_URL=https://your-app-name.vercel.app
     ```
   - Note: Vercel domains (*.vercel.app) are already whitelisted in the CORS config

### Option 2: Deploy to Netlify

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Build the project**:
   ```bash
   cd Admin_Dashboard
   npm run build
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod
   ```
   - Choose `dist` as your publish directory
   - Follow the prompts

4. **Set Environment Variables on Netlify**:
   - Go to Site settings → Environment variables
   - Add: `VITE_API_URL` = `https://attendance-system-sktv.onrender.com/api`

5. **Create `_redirects` file** in the `public` folder:
   ```
   /*    /index.html   200
   ```

### Option 3: Deploy to GitHub Pages

1. **Install gh-pages**:
   ```bash
   cd Admin_Dashboard
   npm install --save-dev gh-pages
   ```

2. **Update `package.json`**:
   Add these scripts:
   ```json
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Update `vite.config.js`**:
   Add base URL:
   ```javascript
   export default defineConfig({
     base: '/your-repo-name/',
     // ... rest of config
   })
   ```

4. **Deploy**:
   ```bash
   npm run deploy
   ```

## Mobile App Deployment

### Android APK Build

1. **Navigate to mobile app**:
   ```bash
   cd attendance-scanner
   ```

2. **Update configuration** (already done):
   - The `config.js` is now pointing to: `https://attendance-system-sktv.onrender.com`

3. **Build APK** (if using EAS):
   ```bash
   eas build --platform android --profile preview
   ```

4. **Or use local build** (if configured):
   ```bash
   npm run build:android
   ```

### iOS Build (if needed)

1. **Build for iOS**:
   ```bash
   eas build --platform ios --profile preview
   ```

## Post-Deployment Checklist

### Backend Configuration
- [ ] Ensure MongoDB is connected
- [ ] Verify environment variables on Render:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `FRONTEND_URL` (your deployed frontend URL)
  - Email service credentials (if using)
- [ ] Test API endpoints: `https://attendance-system-sktv.onrender.com/health`

### Frontend Configuration
- [ ] `.env` file created with correct API URL
- [ ] Build completes successfully
- [ ] CORS is properly configured
- [ ] Test login functionality
- [ ] Test QR code generation
- [ ] Test attendance recording

### Mobile App Configuration
- [ ] API URL updated in `config.js`
- [ ] QR scanner works
- [ ] Network connectivity test passes
- [ ] Build APK successfully

## Testing Your Deployment

1. **Test Backend**:
   ```bash
   curl https://attendance-system-sktv.onrender.com/health
   ```

2. **Test Frontend** (after deployment):
   - Visit your deployed URL
   - Try logging in
   - Check console for API errors

3. **Test Mobile App**:
   - Install APK on device
   - Test QR scanning
   - Verify attendance submission

## Environment Variables Reference

### Backend (.env on Render)
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
PORT=5000
```

### Frontend (.env)
```env
VITE_API_URL=https://attendance-system-sktv.onrender.com/api
```

### Mobile App (config.js)
```javascript
API_BASE_URL: 'https://attendance-system-sktv.onrender.com'
```

## Troubleshooting

### CORS Issues
- Ensure your frontend URL is added to backend `FRONTEND_URL`
- Check that Vercel domains are whitelisted in `server.js`

### API Connection Failed
- Verify backend is running: check `/health` endpoint
- Check if API URL is correct in `.env`
- Inspect browser console for errors

### Build Errors
- Clear cache: `npm run build -- --force`
- Delete `node_modules` and reinstall
- Check Node.js version compatibility

## Quick Deploy Commands

```bash
# Deploy Frontend to Vercel
cd Admin_Dashboard
npm run build
vercel --prod

# Build Mobile App
cd attendance-scanner
eas build --platform android --profile preview
```

## Support
For issues, check the logs:
- Backend: Render dashboard → Logs
- Frontend: Browser console
- Mobile: React Native debugger

---
**Backend URL**: https://attendance-system-sktv.onrender.com
**API Docs**: https://attendance-system-sktv.onrender.com/health
