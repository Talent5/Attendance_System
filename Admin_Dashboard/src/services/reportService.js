import apiClient from './apiClient';

const reportService = {
  // Get reports stats for dashboard
  getReportsStats: async () => {
    try {
      const [employeesResponse, attendanceStatsResponse, attendanceResponse, usersResponse] = await Promise.all([
        apiClient.get('/employees/stats'),
        apiClient.get('/attendance/stats'),
        apiClient.get('/attendance/today'),
        apiClient.get('/users')
      ]);

      const employeeStats = employeesResponse.data.data;
      const attendanceStats = attendanceStatsResponse.data.data;
      const todayAttendance = attendanceResponse.data.data;
      const users = usersResponse.data.data;

      return {
        totalEmployees: employeeStats.totalActive,
        averageAttendance: attendanceStats.overallAttendanceRate || 0,
        shiftsToday: todayAttendance.summary?.total || 0,
        activeManagers: users.users?.filter(user => user.role === 'manager' && user.isActive).length || 0,
        attendanceData: attendanceStats,
        todayAttendance: todayAttendance
      };
    } catch (error) {
      console.error('Error fetching reports stats:', error);
      throw error;
    }
  },

  // Get attendance trends for charts
  getAttendanceTrends: async (days = 30) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await apiClient.get('/attendance/stats', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('Error fetching attendance trends:', error);
      throw error;
    }
  },

  // Get employee performance data
  getEmployeePerformance: async () => {
    try {
      const response = await apiClient.get('/employees/stats');
      const stats = response.data.data;

      // Calculate performance metrics from attendance data
      const performanceData = stats.byDepartment?.map(departmentData => ({
        department: departmentData._id,
        totalEmployees: departmentData.totalInDepartment,
        activeEmployees: departmentData.totalActiveInDepartment,
        averageAttendance: departmentData.positions.reduce((acc, position) => 
          acc + (position.avgAttendance || 0), 0) / departmentData.positions.length
      })) || [];

      return performanceData;
    } catch (error) {
      console.error('Error fetching employee performance:', error);
      throw error;
    }
  },

  // Get recent reports data
  getRecentReports: async () => {
    try {
      // This would typically come from a reports table in the database
      // For now, we'll simulate recent report data
      const reports = [
        {
          id: 1,
          name: 'Monthly Attendance Report',
          type: 'Attendance',
          generated: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          status: 'Ready',
          downloadUrl: '/api/attendance/export?format=pdf&days=30'
        },
        {
          id: 2,
          name: 'Employee Performance Analysis',
          type: 'Performance',
          generated: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          status: 'Processing',
          downloadUrl: null
        },
        {
          id: 3,
          name: 'Weekly Department Summary',
          type: 'Summary',
          generated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          status: 'Ready',
          downloadUrl: '/api/attendance/export?format=excel&days=7'
        }
      ];

      return reports;
    } catch (error) {
      console.error('Error fetching recent reports:', error);
      throw error;
    }
  },

  // Export attendance report
  exportAttendanceReport: async (format = 'csv', options = {}) => {
    try {
      const params = {
        format,
        ...options
      };

      const response = await apiClient.get('/attendance/export', {
        params,
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Handle file download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return response.data;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  },

  // Generate custom report
  generateReport: async (reportType, filters = {}) => {
    try {
      const response = await apiClient.get('/attendance/reports', {
        params: {
          type: reportType,
          ...filters
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  // Get attendance summary by date range
  getAttendanceSummary: async (startDate, endDate, filters = {}) => {
    try {
      const response = await apiClient.get('/attendance', {
        params: {
          startDate,
          endDate,
          ...filters,
          page: 1,
          limit: 1000
        }
      });

      return response.data.data;
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }
  },

  // Get department-wise attendance statistics
  getDepartmentWiseStats: async () => {
    try {
      const employeesResponse = await apiClient.get('/employees/stats');
      const employeeStats = employeesResponse.data.data;

      // Combine data for department-wise statistics
      const departmentStats = employeeStats.byDepartment?.map(departmentData => ({
        departmentName: departmentData._id,
        totalEmployees: departmentData.totalInDepartment,
        activeEmployees: departmentData.totalActiveInDepartment,
        positions: departmentData.positions,
        averageAttendance: departmentData.positions.reduce((acc, position) => 
          acc + (position.avgAttendance || 0), 0) / departmentData.positions.length
      })) || [];

      return departmentStats;
    } catch (error) {
      console.error('Error fetching department-wise stats:', error);
      throw error;
    }
  }
};

export default reportService;
