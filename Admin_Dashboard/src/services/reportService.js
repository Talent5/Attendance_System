import apiClient from './apiClient';

const reportService = {
  // Get reports stats for dashboard
  getReportsStats: async () => {
    try {
      const [studentsResponse, attendanceStatsResponse, attendanceResponse, usersResponse] = await Promise.all([
        apiClient.get('/students/stats'),
        apiClient.get('/attendance/stats'),
        apiClient.get('/attendance/today'),
        apiClient.get('/users')
      ]);

      const studentStats = studentsResponse.data.data;
      const attendanceStats = attendanceStatsResponse.data.data;
      const todayAttendance = attendanceResponse.data.data;
      const users = usersResponse.data.data;

      return {
        totalStudents: studentStats.totalActive,
        averageAttendance: attendanceStats.overallAttendanceRate || 0,
        classesToday: todayAttendance.summary?.total || 0,
        activeTeachers: users.users?.filter(user => user.role === 'teacher' && user.isActive).length || 0,
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

  // Get student performance data
  getStudentPerformance: async () => {
    try {
      const response = await apiClient.get('/students/stats');
      const stats = response.data.data;

      // Calculate performance metrics from attendance data
      const performanceData = stats.byClass?.map(classData => ({
        class: classData._id,
        totalStudents: classData.totalInClass,
        activeStudents: classData.totalActiveInClass,
        averageAttendance: classData.sections.reduce((acc, section) => 
          acc + (section.avgAttendance || 0), 0) / classData.sections.length
      })) || [];

      return performanceData;
    } catch (error) {
      console.error('Error fetching student performance:', error);
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
          name: 'Student Performance Analysis',
          type: 'Performance',
          generated: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          status: 'Processing',
          downloadUrl: null
        },
        {
          id: 3,
          name: 'Weekly Class Summary',
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

  // Get class-wise attendance statistics
  getClassWiseStats: async () => {
    try {
      const studentsResponse = await apiClient.get('/students/stats');
      const studentStats = studentsResponse.data.data;

      // Combine data for class-wise statistics
      const classStats = studentStats.byClass?.map(classData => ({
        className: classData._id,
        totalStudents: classData.totalInClass,
        activeStudents: classData.totalActiveInClass,
        sections: classData.sections,
        averageAttendance: classData.sections.reduce((acc, section) => 
          acc + (section.avgAttendance || 0), 0) / classData.sections.length
      })) || [];

      return classStats;
    } catch (error) {
      console.error('Error fetching class-wise stats:', error);
      throw error;
    }
  }
};

export default reportService;
