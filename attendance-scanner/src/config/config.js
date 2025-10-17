// Configuration file for the mobile app
import Constants from 'expo-constants';

// Determine environment more reliably
const IS_DEV = process.env.NODE_ENV === 'development' || process.env.EXPO_PUBLIC_ENV === 'development';

const config = {
  // Backend API base URL
  // Change this to match your backend server
  API_BASE_URL: 'https://attendance-system-sktv.onrender.com', // Production backend
  
  // Environment info (for debugging)
  IS_DEV,
  ENV_MODE: IS_DEV ? 'DEVELOPMENT' : 'PRODUCTION',
  
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