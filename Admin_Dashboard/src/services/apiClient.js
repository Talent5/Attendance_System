import axios from 'axios';

// Production backend URL
const API_URL = import.meta.env.VITE_API_URL || 'https://attendance-system-sktv.onrender.com/api';

// Debug logging
console.log('🔧 API Configuration:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_URL: API_URL,
  mode: import.meta.env.MODE
});

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  withCredentials: true // Enable credentials for CORS
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Log request for debugging
  console.log('🚀 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    hasAuth: !!config.headers.Authorization
  });
  
  return config;
}, (error) => {
  console.error('❌ Request interceptor error:', error);
  return Promise.reject(error);
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  (error) => {
    // Log error details for debugging
    console.error('❌ API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      isNetworkError: error.code === 'ERR_NETWORK' || !error.response,
      isCorsError: error.message?.includes('CORS') || error.code === 'ERR_NETWORK'
    });
    
    // Handle auth errors
    if (error.response?.status === 401) {
      // Don't redirect on login page or logout requests
      const isLoginPage = window.location.pathname.includes('/login');
      const isLogoutRequest = error.config?.url?.includes('/logout');
      
      if (!isLoginPage && !isLogoutRequest) {
        console.warn('🔐 Unauthorized - redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    // Handle network/CORS errors more gracefully
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('🌐 Network/CORS error detected - backend may be unavailable or sleeping');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
