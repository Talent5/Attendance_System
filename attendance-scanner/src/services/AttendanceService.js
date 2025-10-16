import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config/config';

// Base URL for the backend API
const BASE_URL = config.API_BASE_URL;

// Log configuration on module load
console.log('🔧 AttendanceService initialized');
console.log(`📱 Environment: ${config.ENV_MODE}`);
console.log(`🌐 API Base URL: ${BASE_URL}`);

class AttendanceService {
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
  }

  // Scan QR code and record attendance
  async scanQRCode(qrCode, location = 'Mobile App', notes = '') {
    try {
      const response = await this.api.post('/api/attendance/scan', {
        qrCode,
        location,
        notes,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Mark attendance (for offline sync)
  async markAttendance(attendanceData) {
    try {
      // Format the data according to backend API expectations
      const formattedData = {
        qrCode: attendanceData.qrData || attendanceData.qrCode,
        location: attendanceData.location || 'Mobile App',
        notes: attendanceData.notes || ''
      };
      
      console.log('Sending attendance data to backend:', formattedData);
      
      // Validate QR code format before sending
      if (!formattedData.qrCode) {
        throw new Error('QR code data is missing');
      }

      // Try to parse QR code to validate format
      try {
        const qrData = JSON.parse(formattedData.qrCode);
        console.log('QR code validation - Employee ID:', qrData.employeeId || qrData.studentId || qrData.id);
        console.log('QR code validation - Type:', qrData.type || 'standard');
      } catch (parseError) {
        console.warn('QR code parsing validation failed:', parseError.message);
        // Continue anyway as backend will handle validation
      }
      
      const response = await this.api.post('/api/attendance/scan', formattedData);
      
      console.log('Attendance marked successfully:', response.data);
      return response.data;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        requestData: {
          qrCodeLength: (attendanceData.qrData || attendanceData.qrCode)?.length,
          location: attendanceData.location,
          notes: attendanceData.notes
        }
      };
      
      console.error('Mark attendance error:', errorDetails);
      
      // Provide more specific error messages
      if (error.response?.status === 400 && error.response?.data?.error?.details?.includes('QR code integrity')) {
        throw new Error('QR code is invalid or corrupted. Please try scanning again.');
      } else if (error.response?.status === 404) {
        throw new Error('Employee not found. Please verify the QR code is valid.');
      } else if (error.response?.status === 400 && error.response?.data?.error?.message?.includes('already recorded')) {
        throw new Error('Attendance has already been recorded for this employee today.');
      }
      
      throw error;
    }
  }

  // Bulk mark attendance for offline sync
  async bulkMarkAttendance(attendanceArray) {
    try {
      const results = [];
      const errors = [];
      
      console.log(`Syncing ${attendanceArray.length} offline attendance records...`);
      
      // Process each attendance record individually
      for (const attendance of attendanceArray) {
        try {
          console.log(`Syncing attendance record:`, {
            id: attendance.id,
            employeeId: attendance.employeeId || attendance.studentId,
            qrData: attendance.qrData?.substring(0, 50) + '...' // Log partial QR data for debugging
          });
          
          const response = await this.markAttendance(attendance);
          if (response.success) {
            results.push(response.data.attendance);
            console.log(`Successfully synced attendance ${attendance.id}`);
          } else {
            console.error(`Failed to sync attendance ${attendance.id}:`, response.error);
            errors.push({ id: attendance.id, error: response.error });
          }
        } catch (error) {
          const errorDetails = {
            id: attendance.id,
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            requestData: {
              qrCode: (attendance.qrData || attendance.qrCode)?.substring(0, 50) + '...',
              location: attendance.location,
              notes: attendance.notes
            }
          };
          
          console.error('Failed to sync attendance:', attendance.id, errorDetails);
          errors.push({ id: attendance.id, error: error.message, details: errorDetails });
        }
      }
      
      console.log(`Sync completed: ${results.length} successful, ${errors.length} failed`);
      
      return {
        success: true,
        data: {
          attendance: results,
          errors: errors
        }
      };
    } catch (error) {
      console.error('Bulk sync error:', error);
      throw error;
    }
  }

  // Get today's attendance records
  async getTodayAttendance() {
    try {
      const response = await this.api.get('/api/attendance/today');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get attendance history with filters  
  async getAttendanceHistory(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        department: departmentName,
        section,
        status,
        page = 1,
        limit = 20,
      } = filters;

      const params = {
        page,
        limit,
      };

      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (departmentName) params.department = departmentName;
      if (section) params.section = section;
      if (status) params.status = status;

      const response = await this.api.get('/api/attendance', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get attendance statistics
  async getAttendanceStats(filters = {}) {
    try {
      const response = await this.api.get('/api/attendance/stats', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get employee information by employee ID (with backward compatibility for student IDs)
  async getEmployeeInfo(employeeId) {
    try {
      // Try employee endpoint first
      const response = await this.api.get(`/api/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      // Fallback to employees endpoint for backward compatibility
      try {
        const response = await this.api.get(`/api/employees/${employeeId}`);
        return response.data;
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  // Legacy method for backward compatibility
  async getStudentInfo(studentId) {
    return this.getEmployeeInfo(studentId);
  }

  // Check network connectivity
  async checkConnectivity() {
    try {
      const response = await this.api.get('/health', { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      console.log('Connectivity check failed:', error.message);
      return false;
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

export default new AttendanceService();