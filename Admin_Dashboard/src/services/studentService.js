import apiClient from './apiClient';

export const studentService = {
  async getAllStudents(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add query parameters
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.class) queryParams.append('class', params.class);
      if (params.section) queryParams.append('section', params.section);
      if (params.search) queryParams.append('search', params.search);
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
      
      const url = queryParams.toString() ? `/students?${queryParams.toString()}` : '/students';
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        return response.data.data.students || [];
      }
      
      return [];
    } catch (error) {
      console.error('Get students error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch students');
    }
  },

  async getStudentById(id) {
    try {
      const response = await apiClient.get(`/students/${id}`);
      
      if (response.data.success) {
        return response.data.data.student;
      }
      
      throw new Error('Student not found');
    } catch (error) {
      console.error('Get student error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch student');
    }
  },

  async createStudent(studentData) {
    try {
      const response = await apiClient.post('/students', studentData);
      
      if (response.data.success) {
        return {
          success: true,
          student: response.data.data.student,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to create student'
      };
    } catch (error) {
      console.error('Create student error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async updateStudent(id, studentData) {
    try {
      const response = await apiClient.put(`/students/${id}`, studentData);
      
      if (response.data.success) {
        return {
          success: true,
          student: response.data.data.student,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to update student'
      };
    } catch (error) {
      console.error('Update student error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async deleteStudent(id) {
    try {
      const response = await apiClient.delete(`/students/${id}`);
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to delete student'
      };
    } catch (error) {
      console.error('Delete student error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async getStudentStats() {
    try {
      const response = await apiClient.get('/students/stats');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return {
        totalStudents: 0,
        totalActive: 0,
        totalInactive: 0,
        byClass: [],
        recentEnrollments: 0
      };
    } catch (error) {
      console.error('Get student stats error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch student statistics');
    }
  },

  async getClasses() {
    try {
      const response = await apiClient.get('/students/classes');
      
      if (response.data.success) {
        return response.data.data.classes;
      }
      
      return [];
    } catch (error) {
      console.error('Get classes error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch classes');
    }
  },

  async searchStudents(query, filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.class) params.append('class', filters.class);
      if (filters.section) params.append('section', filters.section);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await apiClient.get(`/students/search?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data.students;
      }
      
      return [];
    } catch (error) {
      console.error('Search students error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to search students');
    }
  },

  async getStudentQRCode(id) {
    try {
      const response = await apiClient.get(`/students/${id}/qr`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Failed to get QR code');
    } catch (error) {
      console.error('Get QR code error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to get QR code');
    }
  },

  async regenerateQRCode(id) {
    try {
      const response = await apiClient.post(`/students/${id}/regenerate-qr`);
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.data.message
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

  async uploadStudentPhoto(id, photoFile) {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      
      const response = await apiClient.post(`/students/${id}/upload-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        return {
          success: true,
          student: response.data.data.student,
          photoUrl: response.data.data.photoUrl,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Failed to upload photo'
      };
    } catch (error) {
      console.error('Upload photo error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async bulkImportStudents(studentsData) {
    try {
      const response = await apiClient.post('/students/bulk-import', {
        students: studentsData
      });
      
      if (response.data.success) {
        return {
          success: true,
          results: response.data.data.results,
          summary: response.data.data.summary
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Bulk import failed'
      };
    } catch (error) {
      console.error('Bulk import error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  }
};
