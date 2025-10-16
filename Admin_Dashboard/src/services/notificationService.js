import apiClient from './apiClient';

export const notificationService = {
  async getAllNotifications(params = {}) {
    try {
      const queryParams = new URLSearchParams();

      // Add query parameters
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.type) queryParams.append('type', params.type);
      if (params.status) queryParams.append('status', params.status);
      if (params.employeeId) queryParams.append('employeeId', params.employeeId);

      const url = queryParams.toString() ? `/notifications?${queryParams.toString()}` : '/notifications';
      const response = await apiClient.get(url);

      return {
        notifications: response.data.notifications || [],
        pagination: response.data.pagination || {}
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch notifications');
    }
  },

  async getNotificationById(id) {
    try {
      const response = await apiClient.get(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get notification error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch notification');
    }
  },

  async sendNotification(notificationData) {
    try {
      const response = await apiClient.post('/notifications/send', notificationData);
      return response.data;
    } catch (error) {
      console.error('Send notification error:', error);
      throw new Error(error.response?.data?.error || 'Failed to send notification');
    }
  },

  async sendBulkNotifications(notificationData) {
    try {
      const response = await apiClient.post('/notifications/bulk-send', notificationData);
      return response.data;
    } catch (error) {
      console.error('Send bulk notifications error:', error);
      throw new Error(error.response?.data?.error || 'Failed to send bulk notifications');
    }
  },

  async updateNotificationStatus(id, status) {
    try {
      const response = await apiClient.put(`/notifications/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update notification status error:', error);
      throw new Error(error.response?.data?.error || 'Failed to update notification status');
    }
  },

  async deleteNotification(id) {
    try {
      const response = await apiClient.delete(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw new Error(error.response?.data?.error || 'Failed to delete notification');
    }
  },

  async getNotificationStats() {
    try {
      const response = await apiClient.get('/notifications/stats/summary');
      return response.data;
    } catch (error) {
      console.error('Get notification stats error:', error);
      throw new Error(error.response?.data || 'Failed to fetch notification statistics');
    }
  }
};
