import apiClient from './apiClient';

export const employeeService = {
  async getAllEmployees(params = {}) {
    try {
      const response = await apiClient.get('/employees', { params });
      return response.data.data.employees || response.data.data || [];
    } catch (error) {
      console.error('Get employees error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch employees');
    }
  },

  async getEmployeeById(id) {
    try {
      const response = await apiClient.get(`/employees/${id}`);
      if (response.data.success) {
        return response.data.data.employee;
      }
      return null;
    } catch (error) {
      console.error('Get employee error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch employee');
    }
  },

  async createEmployee(employeeData) {
    try {
      const response = await apiClient.post('/employees', employeeData);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data.employee,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to create employee'
      };
    } catch (error) {
      console.error('Create employee error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async updateEmployee(id, employeeData) {
    try {
      const response = await apiClient.put(`/employees/${id}`, employeeData);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data.employee,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to update employee'
      };
    } catch (error) {
      console.error('Update employee error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async deleteEmployee(id) {
    try {
      const response = await apiClient.delete(`/employees/${id}`);
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to delete employee'
      };
    } catch (error) {
      console.error('Delete employee error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async getEmployeeStats() {
    try {
      const response = await apiClient.get('/employees/stats');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return {
        totalEmployees: 0,
        totalActive: 0,
        totalInactive: 0,
        byDepartment: [],
        recentHires: 0
      };
    } catch (error) {
      console.error('Get employee stats error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch employee statistics');
    }
  },

  async getDepartments() {
    try {
      const response = await apiClient.get('/employees/departments');
      
      if (response.data.success) {
        return response.data.data.departments;
      }
      
      return [];
    } catch (error) {
      console.error('Get departments error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch departments');
    }
  },

  async searchEmployees(query, filters = {}) {
    try {
      const params = {
        search: query,
        ...filters
      };
      
      const response = await apiClient.get('/employees', { params });
      return response.data.data.employees || [];
    } catch (error) {
      console.error('Search employees error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to search employees');
    }
  },

  async getEmployeeQRCode(id) {
    try {
      const response = await apiClient.get(`/employees/${id}/qr`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Get employee QR code error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get employee QR code');
    }
  },

  async regenerateQRCode(id) {
    try {
      const response = await apiClient.post(`/employees/${id}/regenerate-qr`);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'QR code regenerated successfully'
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to regenerate QR code'
      };
    } catch (error) {
      console.error('Regenerate QR code error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async uploadEmployeePhoto(id, photoFile) {
    try {
      const formData = new FormData();
      formData.append('profilePhoto', photoFile);
      
      const response = await apiClient.post(`/employees/${id}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Photo uploaded successfully'
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to upload photo'
      };
    } catch (error) {
      console.error('Upload employee photo error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async bulkImportEmployees(employeesData) {
    try {
      const response = await apiClient.post('/employees/bulk-import', {
        employees: employeesData
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: 'Employees imported successfully'
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to import employees'
      };
    } catch (error) {
      console.error('Bulk import employees error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  }
};
