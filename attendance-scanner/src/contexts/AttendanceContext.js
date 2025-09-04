import React, { createContext, useContext, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AttendanceService from '../services/AttendanceService';

const AttendanceContext = createContext();

// Attendance actions
const AttendanceActions = {
  LOADING: 'LOADING',
  SCAN_SUCCESS: 'SCAN_SUCCESS',
  SCAN_FAILURE: 'SCAN_FAILURE',
  FETCH_HISTORY_SUCCESS: 'FETCH_HISTORY_SUCCESS',
  FETCH_HISTORY_FAILURE: 'FETCH_HISTORY_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  OFFLINE_SCAN: 'OFFLINE_SCAN',
  SYNC_SUCCESS: 'SYNC_SUCCESS',
  SYNC_FAILURE: 'SYNC_FAILURE',
};

// Initial state
const initialState = {
  isLoading: false,
  attendanceHistory: [],
  offlineScans: [],
  todayStats: {
    scanned: 0,
    present: 0,
    late: 0,
  },
  error: null,
  successMessage: null,
  isOnline: true,
};

// Attendance reducer
const attendanceReducer = (state, action) => {
  switch (action.type) {
    case AttendanceActions.LOADING:
      return {
        ...state,
        isLoading: action.payload,
        error: null,
      };
    case AttendanceActions.SCAN_SUCCESS:
      return {
        ...state,
        isLoading: false,
        attendanceHistory: [action.payload.record, ...state.attendanceHistory],
        todayStats: {
          ...state.todayStats,
          scanned: state.todayStats.scanned + 1,
          [action.payload.record.status]: state.todayStats[action.payload.record.status] + 1,
        },
        successMessage: action.payload.message,
        error: null,
      };
    case AttendanceActions.SCAN_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
        successMessage: null,
      };
    case AttendanceActions.FETCH_HISTORY_SUCCESS:
      return {
        ...state,
        isLoading: false,
        attendanceHistory: action.payload.history,
        todayStats: action.payload.stats,
        error: null,
      };
    case AttendanceActions.FETCH_HISTORY_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };
    case AttendanceActions.OFFLINE_SCAN:
      return {
        ...state,
        offlineScans: [...state.offlineScans, action.payload.scan],
        todayStats: {
          ...state.todayStats,
          scanned: state.todayStats.scanned + 1,
        },
        successMessage: 'Attendance saved offline. Will sync when online.',
      };
    case AttendanceActions.SYNC_SUCCESS:
      return {
        ...state,
        offlineScans: [],
        attendanceHistory: [...action.payload.syncedRecords, ...state.attendanceHistory],
        successMessage: `${action.payload.syncedRecords.length} offline scans synced successfully.`,
      };
    case AttendanceActions.SYNC_FAILURE:
      return {
        ...state,
        error: action.payload.error,
      };
    case AttendanceActions.CLEAR_ERROR:
      return {
        ...state,
        error: null,
        successMessage: null,
      };
    default:
      return state;
  }
};

export const AttendanceProvider = ({ children }) => {
  const [state, dispatch] = useReducer(attendanceReducer, initialState);

  // Load offline scans from storage
  React.useEffect(() => {
    const loadOfflineScans = async () => {
      try {
        const offlineData = await AsyncStorage.getItem('offlineScans');
        if (offlineData) {
          const scans = JSON.parse(offlineData);
          scans.forEach(scan => {
            dispatch({
              type: AttendanceActions.OFFLINE_SCAN,
              payload: { scan },
            });
          });
        }
      } catch (error) {
        console.error('Failed to load offline scans:', error);
      }
    };

    loadOfflineScans();
  }, []);

  // Save offline scans to storage
  React.useEffect(() => {
    const saveOfflineScans = async () => {
      try {
        await AsyncStorage.setItem('offlineScans', JSON.stringify(state.offlineScans));
      } catch (error) {
        console.error('Failed to save offline scans:', error);
      }
    };

    if (state.offlineScans.length > 0) {
      saveOfflineScans();
    }
  }, [state.offlineScans]);

  // Scan QR code and mark attendance
  const scanAttendance = async (qrData, location = 'School') => {
    dispatch({ type: AttendanceActions.LOADING, payload: true });

    try {
      // Parse QR data
      let studentData;
      try {
        studentData = JSON.parse(qrData);
      } catch (parseError) {
        // If QR data is not JSON, assume it's a student ID
        studentData = { studentId: qrData, name: 'Unknown Student' };
      }
      
      const attendanceData = {
        studentId: studentData.studentId,
        qrData: qrData,
        location: location,
        scanTime: new Date().toISOString(),
        notes: '',
      };

      // Try online first
      try {
        const response = await AttendanceService.markAttendance(attendanceData);
        
        if (response.success) {
          dispatch({
            type: AttendanceActions.SCAN_SUCCESS,
            payload: {
              record: response.data.attendance,
              message: response.data.message,
            },
          });
          return { success: true, message: response.data.message };
        } else {
          throw new Error(response.error?.message || 'Failed to mark attendance');
        }
      } catch (networkError) {
        // Check if this is a real network error or a server validation error
        const isNetworkError = !networkError.response || 
                              networkError.code === 'NETWORK_ERROR' ||
                              networkError.code === 'ECONNREFUSED' ||
                              networkError.code === 'ETIMEDOUT' ||
                              networkError.message?.includes('Network Error') ||
                              networkError.message?.includes('timeout');
        
        // If it's a server validation error (status 400, 422, etc.), don't save offline
        if (!isNetworkError && networkError.response) {
          const status = networkError.response.status;
          if (status >= 400 && status < 500) {
            // This is a validation error, not a network error
            const errorMessage = networkError.response.data?.error?.message || 
                               networkError.response.data?.message || 
                               `Server error (${status}): ${networkError.message}`;
            
            return { success: false, error: errorMessage };
          }
        }
        
        // If online fails due to network issues, save offline
        console.log('Network error detected, saving offline. Error details:', {
          message: networkError.message,
          code: networkError.code,
          status: networkError.response?.status,
          isNetworkError,
          response: networkError.response?.data
        });
        
        const offlineScan = {
          id: Date.now().toString(),
          studentId: studentData.studentId,
          studentName: studentData.name || `Student ${studentData.studentId}`,
          qrData: qrData, // Keep the original QR data
          location: location,
          notes: '',
          scanTime: new Date().toISOString(),
          status: 'offline',
          timestamp: Date.now(),
        };

        dispatch({
          type: AttendanceActions.OFFLINE_SCAN,
          payload: { scan: offlineScan },
        });
        
        return { 
          success: true, 
          message: 'Connection unavailable. Attendance saved offline and will sync automatically when connection is restored.' 
        };
      }
    } catch (error) {
      dispatch({
        type: AttendanceActions.SCAN_FAILURE,
        payload: { error: error.message || 'Invalid QR code format' },
      });
      return { success: false, error: error.message || 'Invalid QR code format' };
    }
  };

  // Fetch attendance history
  const fetchAttendanceHistory = useCallback(async (filters = {}) => {
    dispatch({ type: AttendanceActions.LOADING, payload: true });

    try {
      const response = await AttendanceService.getAttendanceHistory(filters);
      
      if (response.success) {
        dispatch({
          type: AttendanceActions.FETCH_HISTORY_SUCCESS,
          payload: {
            history: response.data.attendance,
            stats: response.data.stats,
          },
        });
      } else {
        throw new Error(response.error?.message || 'Failed to fetch history');
      }
    } catch (error) {
      dispatch({
        type: AttendanceActions.FETCH_HISTORY_FAILURE,
        payload: { error: error.message || 'Network error' },
      });
    }
  }, []);

  // Sync offline scans
  const syncOfflineScans = async () => {
    if (state.offlineScans.length === 0) {
      return { success: true, message: 'No offline scans to sync' };
    }

    dispatch({ type: AttendanceActions.LOADING, payload: true });

    try {
      // Check connectivity first
      const isConnected = await AttendanceService.checkConnectivity();
      
      if (!isConnected) {
        throw new Error('No internet connection available');
      }

      const response = await AttendanceService.bulkMarkAttendance(state.offlineScans);
      
      if (response.success) {
        const successCount = response.data.attendance.length;
        const errorCount = response.data.errors?.length || 0;
        
        dispatch({
          type: AttendanceActions.SYNC_SUCCESS,
          payload: { syncedRecords: response.data.attendance },
        });
        
        // Clear offline storage
        await AsyncStorage.removeItem('offlineScans');
        
        let message = `${successCount} scans synced successfully`;
        if (errorCount > 0) {
          message += `, ${errorCount} failed`;
        }
        
        return { success: true, message };
      } else {
        throw new Error(response.error?.message || 'Sync failed');
      }
    } catch (error) {
      dispatch({
        type: AttendanceActions.SYNC_FAILURE,
        payload: { error: error.message || 'Sync failed' },
      });
      return { success: false, error: error.message || 'Sync failed' };
    }
  };

  // Clear offline scans (useful for clearing corrupted data)
  const clearOfflineScans = async () => {
    try {
      await AsyncStorage.removeItem('offlineScans');
      dispatch({
        type: AttendanceActions.SYNC_SUCCESS,
        payload: { syncedRecords: [] },
      });
      console.log('Offline scans cleared successfully');
      return { success: true, message: 'Offline data cleared successfully' };
    } catch (error) {
      console.error('Failed to clear offline scans:', error);
      return { success: false, error: 'Failed to clear offline data' };
    }
  };

  // Clear error messages
  const clearMessages = () => {
    dispatch({ type: AttendanceActions.CLEAR_ERROR });
  };

  // Auto-sync functionality
  React.useEffect(() => {
    let syncInterval;
    
    const autoSync = async () => {
      if (state.offlineScans.length > 0) {
        try {
          const isConnected = await AttendanceService.checkConnectivity();
          if (isConnected) {
            console.log('Auto-syncing offline scans...');
            const result = await syncOfflineScans();
            console.log('Auto-sync result:', result);
          } else {
            console.log('Auto-sync skipped: no server connection');
          }
        } catch (error) {
          console.log('Auto-sync failed:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
        }
      }
    };

    // Start auto-sync if there are offline scans
    if (state.offlineScans.length > 0) {
      syncInterval = setInterval(autoSync, 30000); // Try to sync every 30 seconds
    }

    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [state.offlineScans.length]);

  const contextValue = {
    ...state,
    scanAttendance,
    fetchAttendanceHistory,
    syncOfflineScans,
    clearOfflineScans,
    clearMessages,
  };

  return (
    <AttendanceContext.Provider value={contextValue}>
      {children}
    </AttendanceContext.Provider>
  );
};

// Custom hook to use attendance context
export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

export default AttendanceContext;
