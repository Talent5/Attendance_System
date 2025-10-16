import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config/config';

// Base URL for the backend API
const BASE_URL = config.API_BASE_URL;

// Log configuration on module load
console.log('🔧 AuthService initialized');
console.log(`📱 Environment: ${config.ENV_MODE}`);
console.log(`🌐 API Base URL: ${BASE_URL}`);

class AuthService {
  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: config.API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              if (response.success) {
                const { accessToken } = response.data;
                await AsyncStorage.setItem('accessToken', accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return this.api(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            // You might want to emit an event here to trigger logout in the app
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Login method
  async login(email, password) {
    try {
      const response = await this.api.post('/api/auth/login', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Logout method
  async logout(refreshToken) {
    try {
      const response = await this.api.post('/api/auth/logout', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      // Even if logout fails on server, we should clear local tokens
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Refresh token method
  async refreshToken(refreshToken) {
    try {
      const response = await this.api.post('/api/auth/refresh', {
        refreshToken,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Validate token method
  async validateToken(token) {
    try {
      const response = await this.api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  // Get current user profile
  async getCurrentUser() {
    try {
      const response = await this.api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Update base URL if needed
  updateBaseURL(newBaseURL) {
    this.api.defaults.baseURL = newBaseURL;
  }
  
  // Get current base URL
  getBaseURL() {
    return this.api.defaults.baseURL;
  }
}

export default new AuthService();