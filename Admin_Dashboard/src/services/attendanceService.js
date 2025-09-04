import apiClient from './apiClient';

export const attendanceService = {
  async getAttendance(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add query parameters
      if (filters.studentId) params.append('studentId', filters.studentId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.class) params.append('class', filters.class);
      if (filters.section) params.append('section', filters.section);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const url = params.toString() ? `/attendance?${params.toString()}` : '/attendance';
      
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        const result = {
          attendance: response.data.data.attendance || [],
          pagination: response.data.data.pagination || null
        };
        return result;
      }
      
      console.warn('API call successful but response.success is false:', response.data);
      return {
        attendance: [],
        pagination: null
      };
    } catch (error) {
      console.error('Get attendance error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error config:', error.config);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch attendance data');
    }
  },

  async getTodayAttendance(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.class) params.append('class', filters.class);
      if (filters.section) params.append('section', filters.section);
      
      const url = params.toString() ? `/attendance/today?${params.toString()}` : '/attendance/today';
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        return {
          attendance: response.data.data.attendance || [],
          summary: response.data.data.summary || {},
          date: response.data.data.date
        };
      }
      
      return {
        attendance: [],
        summary: { total: 0, present: 0, late: 0, onTime: 0 },
        date: new Date().toDateString()
      };
    } catch (error) {
      console.error('Get today attendance error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch today\'s attendance');
    }
  },

  async getAttendanceStats(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.class) params.append('class', filters.class);
      if (filters.section) params.append('section', filters.section);
      
      const url = params.toString() ? `/attendance/stats?${params.toString()}` : '/attendance/stats';
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      return {
        totalDays: 0,
        totalAttendance: 0,
        presentCount: 0,
        lateCount: 0,
        attendanceRate: 0
      };
    } catch (error) {
      console.error('Get attendance stats error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch attendance statistics');
    }
  },

  async getStudentAttendance(studentId, filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      const url = params.toString() 
        ? `/attendance/student/${studentId}?${params.toString()}` 
        : `/attendance/student/${studentId}`;
      
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        return {
          student: response.data.data.student,
          attendanceStats: response.data.data.attendanceStats,
          attendance: response.data.data.attendance || []
        };
      }
      
      throw new Error('Student attendance not found');
    } catch (error) {
      console.error('Get student attendance error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch student attendance');
    }
  },

  async scanAttendance(qrCode, additionalData = {}) {
    try {
      const scanData = {
        qrCode,
        ...additionalData
      };
      
      const response = await apiClient.post('/attendance/scan', scanData);
      
      if (response.data.success) {
        return {
          success: true,
          attendance: response.data.data.attendance,
          student: response.data.data.student,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Attendance scan failed'
      };
    } catch (error) {
      console.error('Scan attendance error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error during scan'
      };
    }
  },

  async recordManualAttendance(attendanceData) {
    try {
      const response = await apiClient.post('/attendance/manual', attendanceData);
      
      if (response.data.success) {
        return {
          success: true,
          attendance: response.data.data.attendance,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Manual attendance recording failed'
      };
    } catch (error) {
      console.error('Record manual attendance error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async updateAttendance(attendanceId, updates) {
    try {
      const response = await apiClient.put(`/attendance/${attendanceId}`, updates);
      
      if (response.data.success) {
        return {
          success: true,
          attendance: response.data.data.attendance,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Attendance update failed'
      };
    } catch (error) {
      console.error('Update attendance error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async deleteAttendance(attendanceId, reason) {
    try {
      const response = await apiClient.delete(`/attendance/${attendanceId}`, {
        data: { reason }
      });
      
      if (response.data.success) {
        return {
          success: true,
          message: response.data.data.message
        };
      }
      
      return {
        success: false,
        message: response.data.error?.message || 'Attendance deletion failed'
      };
    } catch (error) {
      console.error('Delete attendance error:', error);
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Network error'
      };
    }
  },

  async getAbsentStudents(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.class) params.append('class', filters.class);
      if (filters.section) params.append('section', filters.section);
      
      const url = params.toString() 
        ? `/attendance/absent-students?${params.toString()}` 
        : '/attendance/absent-students';
      
      const response = await apiClient.get(url);
      
      if (response.data.success) {
        return {
          absentStudents: response.data.data.absentStudents || [],
          count: response.data.data.count || 0,
          date: response.data.data.date
        };
      }
      
      return {
        absentStudents: [],
        count: 0,
        date: new Date().toDateString()
      };
    } catch (error) {
      console.error('Get absent students error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch absent students');
    }
  },

  async generateReport(reportParams) {
    try {
      const params = new URLSearchParams();
      
      if (reportParams.type) params.append('type', reportParams.type);
      if (reportParams.format) params.append('format', reportParams.format);
      if (reportParams.startDate) params.append('startDate', reportParams.startDate);
      if (reportParams.endDate) params.append('endDate', reportParams.endDate);
      if (reportParams.class) params.append('class', reportParams.class);
      if (reportParams.section) params.append('section', reportParams.section);
      
      const response = await apiClient.get(`/attendance/reports?${params.toString()}`);
      
      if (reportParams.format === 'csv') {
        return response.data; // Raw CSV data
      }
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Report generation failed');
    } catch (error) {
      console.error('Generate report error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to generate report');
    }
  },

  async exportAttendance(exportParams) {
    try {
      const params = new URLSearchParams();
      
      if (exportParams.format) params.append('format', exportParams.format);
      if (exportParams.startDate) params.append('startDate', exportParams.startDate);
      if (exportParams.endDate) params.append('endDate', exportParams.endDate);
      if (exportParams.class) params.append('class', exportParams.class);
      if (exportParams.section) params.append('section', exportParams.section);
      
      const response = await apiClient.get(`/attendance/export?${params.toString()}`, {
        responseType: exportParams.format === 'csv' || exportParams.format === 'excel' ? 'blob' : 'json'
      });
      
      if (exportParams.format === 'csv' || exportParams.format === 'excel') {
        return response.data; // Blob data for download
      }
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error('Export failed');
    } catch (error) {
      console.error('Export attendance error:', error);
      throw new Error(error.response?.data?.error?.message || 'Failed to export attendance data');
    }
  },

  // Legacy method for backwards compatibility
  async markAttendance(studentId) {
    console.warn('markAttendance is deprecated, use scanAttendance instead');
    return this.recordManualAttendance({
      studentId,
      status: 'present',
      notes: 'Marked via legacy method'
    });
  }
};
