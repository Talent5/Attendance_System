import apiClient from './apiClient';

export const userService = {
  async getAllUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters (only if they have values)
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.role) queryParams.append('role', params.role);
      if (params.search) queryParams.append('search', params.search);
      if (params.isActive !== undefined && params.isActive !== '') queryParams.append('isActive', params.isActive);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      // Add cache busting parameter
      queryParams.append('_t', Date.now());
      
      const url = queryParams.toString() ? `/users?${queryParams.toString()}` : '/users';
      console.log('Making request to:', url);
      const response = await apiClient.get(url);
      
      console.log('Raw API response:', response.data);
      
      if (response.data.success) {
        return {
          success: true,
          users: response.data.data.users || [],
          pagination: response.data.data.pagination || {}
        };
      }
      
      return {
        success: false,
        users: [],
        pagination: {},
        message: response.data.error?.message || 'Failed to fetch users'
      };
    } catch (error) {
      console.error('Get users error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch users');
    }
  },

  async getUserStats() {
    try {
      const response = await apiClient.get(`/users/stats?_t=${Date.now()}`);
      
      if (response.data.success) {
        return {
          success: true,
          stats: response.data.data
        };
      }
      
      return {
        success: false,
        stats: {},
        message: response.data.error?.message || 'Failed to fetch user statistics'
      };
    } catch (error) {
      console.error('Get user stats error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch user statistics');
    }
  },

  async getUserById(id) {
    try {
      const response = await apiClient.get(`/users/${id}`);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.data.user
        };
      }
      
      return {
        success: false,
        user: null,
        message: response.data.error?.message || 'User not found'
      };
    } catch (error) {
      console.error('Get user error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch user');
    }
  },

  async createUser(userData) {
    try {
      const response = await apiClient.post('/users', userData);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.data.user,
          message: response.data.data.message || 'User created successfully'
        };
      }
      
      return {
        success: false,
        user: null,
        message: response.data.error?.message || 'Failed to create user'
      };
    } catch (error) {
      console.error('Create user error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to create user');
    }
  },

  async updateUser(id, userData) {
    try {
      const response = await apiClient.put(`/users/${id}`, userData);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.data.user,
          message: response.data.data.message || 'User updated successfully'
        };
      }
      
      return {
        success: false,
        user: null,
        message: response.data.error?.message || 'Failed to update user'
      };
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to update user');
    }
  },

  async deleteUser(id) {
    try {
      const response = await apiClient.delete(`/users/${id}`);
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.data.message || 'User deleted successfully'
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to delete user'
      };
    } catch (error) {
      console.error('Delete user error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to delete user');
    }
  },

  async toggleUserStatus(id) {
    try {
      const response = await apiClient.put(`/users/${id}/toggle-status`);
      
      if (response.data.success) {
        return {
          success: true,
          user: response.data.data.user,
          message: response.data.data.message || 'User status updated successfully'
        };
      }
      
      return {
        success: false,
        user: null,
        message: response.data.error?.message || 'Failed to update user status'
      };
    } catch (error) {
      console.error('Toggle user status error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to toggle user status');
    }
  }
};