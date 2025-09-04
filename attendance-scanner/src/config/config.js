// Configuration file for the mobile app
const config = {
  // Backend API base URL
  // Change this to match your backend server
  API_BASE_URL: __DEV__ 
    ? 'http://192.168.0.49:5000' // Development - backend server running on port 5000
    : 'https://your-production-backend-url.com', // Production
  
  // API timeout in milliseconds
  API_TIMEOUT: 15000,
  
  // App version
  APP_VERSION: '1.0.0',
  
  // Retry configuration
  RETRY_CONFIG: {
    maxRetries: 3,
    retryDelay: 1000,
  },
  
  // Camera settings
  CAMERA_SETTINGS: {
    quality: 0.8,
    allowsEditing: false,
    aspect: [1, 1],
  },
  
  // QR Scanner settings
  QR_SCANNER_SETTINGS: {
    showMarker: true,
    showFrame: true,
    laserColor: '#3498DB',
    frameColor: '#3498DB',
  },
  
  // Offline storage settings
  OFFLINE_STORAGE: {
    maxOfflineScans: 100,
    syncInterval: 30000, // 30 seconds
  },
};

export default config;