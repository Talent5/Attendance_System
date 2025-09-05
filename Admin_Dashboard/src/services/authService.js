import apiClient from './apiClient';

export const authService = {
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.data.success) {
        // Store the token
        localStorage.setItem('token', response.data.data.accessToken);
        
        // Store refresh token if provided
        if (response.data.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
        
        return {
          success: true,
          user: response.data.data.user,
          token: response.data.data.accessToken
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Login failed'
      };
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle other HTTP errors
      if (error.response?.data?.error?.message) {
        return {
          success: false,
          message: error.response.data.error.message
        };
      }
      
      // Handle network errors
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        return {
          success: false,
          message: 'Network error. Please check your internet connection and try again.'
        };
      }
      
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  },

  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.data.user
        };
      }
      
      return {
        success: false,
        message: 'Failed to get user data'
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Failed to get user data'
      };
    }
  },

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.data.accessToken);
        if (response.data.data.refreshToken) {
          localStorage.setItem('refreshToken', response.data.data.refreshToken);
        }
        return response.data.data.accessToken;
      }
      
      throw new Error('Failed to refresh token');
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  },

  async logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await apiClient.put('/auth/profile', profileData);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.data.user,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Profile update failed'
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async changePassword(passwordData) {
    try {
      const response = await apiClient.put('/auth/change-password', passwordData);
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Password change failed'
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  }
};
