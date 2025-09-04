import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useAttendance } from '../contexts/AttendanceContext';
import { useNetwork } from '../contexts/NetworkContext';
import AttendanceService from '../services/AttendanceService';
import NetworkConfigModal from '../components/NetworkConfigModal';
import NetworkStatus from '../components/NetworkStatus';

const DashboardScreen = ({ navigation }) => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [stats, setStats] = useState({
    totalToday: 0,
    presentToday: 0,
    lateToday: 0,
  });
  const [isConnected, setIsConnected] = useState(true);
  
  const { user, logout } = useAuth();
  const { 
    attendanceHistory, 
    todayStats, 
    offlineScans, 
    fetchAttendanceHistory, 
    syncOfflineScans,
    clearOfflineScans,
    successMessage,
    error,
    clearMessages 
  } = useAttendance();
  
  const { 
    isOnline, 
    isServerReachable, 
    connectionType, 
    checkServerConnectivity 
  } = useNetwork();

  // Load today's attendance data
  const loadTodayAttendance = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      // Use network context for connectivity status
      const connected = isOnline;
      setIsConnected(connected);
      
      if (connected) {
        const response = await AttendanceService.getTodayAttendance();
        
        if (response.success) {
          const attendanceData = response.data.attendance || [];
          
          setAttendanceList(attendanceData);
          
          // Use backend summary if available, otherwise calculate locally
          if (response.data.summary) {
            setStats({
              totalToday: response.data.summary.total,
              presentToday: response.data.summary.present,
              lateToday: response.data.summary.late,
            });
          } else {
            // Calculate stats
            const presentCount = attendanceData.filter(a => a.status === 'present').length;
            const lateCount = attendanceData.filter(a => a.status === 'late').length;
            
            const calculatedStats = {
              totalToday: attendanceData.length,
              presentToday: presentCount,
              lateToday: lateCount,
            };
            
            console.log('Calculated stats:', calculatedStats);
            setStats(calculatedStats);
          }
        } else {
          console.error('Server response not successful:', response);
        }
      } else {
        // Use data from attendance context when offline
        setAttendanceList(attendanceHistory);
        setStats(todayStats);
      }
    } catch (error) {
      console.error('Failed to load attendance:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Use offline data if available
      setAttendanceList(attendanceHistory);
      setStats(todayStats);
      setIsConnected(false);
      
      if (showLoading) {
        Alert.alert('Error', 'Failed to load attendance data. Showing offline data.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTodayAttendance();
    }, [])
  );

  // Handle clear offline scans
  const handleClearOfflineScans = () => {
    Alert.alert(
      'Clear Offline Data',
      `This will permanently delete ${offlineScans.length} offline scan(s). This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          style: 'destructive', 
          onPress: async () => {
            const result = await clearOfflineScans();
            if (result.success) {
              Alert.alert('Success', 'Offline data cleared successfully');
            } else {
              Alert.alert('Error', result.error);
            }
          }
        },
      ]
    );
  };

  // Handle sync offline scans
  const handleSyncOfflineScans = async () => {
    if (offlineScans.length === 0) {
      Alert.alert('Info', 'No offline scans to sync.');
      return;
    }
    
    try {
      const result = await syncOfflineScans();
      if (result.success) {
        Alert.alert('Success', result.message);
        // Reload data after successful sync
        loadTodayAttendance();
      } else {
        Alert.alert('Sync Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Sync Error', 'Failed to sync offline scans.');
    }
  };

  // Show success/error messages
  useEffect(() => {
    if (successMessage) {
      // Auto-clear success message after 3 seconds
      const timer = setTimeout(() => {
        clearMessages();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, clearMessages]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearMessages }]);
    }
  }, [error, clearMessages]);

  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadTodayAttendance(false);
  };

  // Navigate to QR Scanner
  const handleScanQR = () => {
    navigation.navigate('QRScanner');
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  // Render attendance item
  const renderAttendanceItem = ({ item }) => {
    // Handle different possible data structures from backend
    const student = item.student || item.studentId || {};
    const scanTime = new Date(item.scanTime);
    const timeString = scanTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const getStatusColor = (status) => {
      switch (status) {
        case 'present':
          return '#27AE60';
        case 'late':
          return '#F39C12';
        case 'absent':
          return '#E74C3C';
        default:
          return '#95A5A6';
      }
    };

    const getStatusText = (status) => {
      return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
      <View style={styles.attendanceItem}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>
            {student.firstName && student.lastName 
              ? `${student.firstName} ${student.lastName}`
              : 'Unknown Student'
            }
          </Text>
          <Text style={styles.studentId}>
            ID: {student.studentId || 'N/A'}
          </Text>
          <Text style={styles.classInfo}>
            {student.class || 'N/A'} - {student.section || 'N/A'}
          </Text>
          {item.location && (
            <Text style={styles.locationInfo}>
              📍 {item.location}
            </Text>
          )}
          {item.minutesLate > 0 && (
            <Text style={styles.lateInfo}>
              ⏰ {item.minutesLate} min late
            </Text>
          )}
        </View>
        <View style={styles.attendanceInfo}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          <Text style={styles.timeText}>{timeString}</Text>
          {item.timeWindow && (
            <Text style={styles.timeWindowText}>
              {item.timeWindow.replace('_', ' ')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Teacher'}</Text>
          {!isOnline && (
            <View style={styles.connectionStatus}>
              <Text style={styles.offlineStatus}>
                {!isConnected ? '📡 No Network' : '🔴 Server Offline'} 
                {connectionType && ` (${connectionType})`}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={checkServerConnectivity}
              >
                <Text style={styles.retryButtonText}>🔄 Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
        {!isOnline && (
          <TouchableOpacity 
            style={styles.configButton} 
            onPress={() => setShowNetworkConfig(true)}
          >
            <Text style={styles.configButtonText}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Network Status Debug Info */}
      <NetworkStatus style={{ marginHorizontal: 20, marginBottom: 12 }} />

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalToday}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#27AE60' }]}>{stats.presentToday}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F39C12' }]}>{stats.lateToday}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
      </View>

      {/* Scan Button */}
      <TouchableOpacity style={styles.scanButton} onPress={handleScanQR}>
        <Text style={styles.scanButtonText}>📱 Scan QR Code</Text>
      </TouchableOpacity>

      {/* Offline Sync Button */}
      {offlineScans.length > 0 && (
        <View style={styles.offlineButtonContainer}>
          <TouchableOpacity style={styles.syncButton} onPress={handleSyncOfflineScans}>
            <Text style={styles.syncButtonText}>
              🔄 Sync {offlineScans.length} Offline Scan{offlineScans.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.clearButton} onPress={handleClearOfflineScans}>
            <Text style={styles.clearButtonText}>
              🗑️ Clear
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.debugButton} onPress={() => setShowDebugInfo(true)}>
            <Text style={styles.debugButtonText}>
              🐛
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Message */}
      {successMessage && (
        <View style={styles.successMessage}>
          <Text style={styles.successText}>{successMessage}</Text>
        </View>
      )}

      {/* Attendance List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Today's Attendance</Text>
          <TouchableOpacity 
            style={styles.debugToggle} 
            onPress={() => setShowDebugInfo(!showDebugInfo)}
          >
            <Text style={styles.debugToggleText}>🐛</Text>
          </TouchableOpacity>
        </View>
        
        {/* Debug Info */}
        {showDebugInfo && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Records: {attendanceList.length}</Text>
            <Text style={styles.debugText}>Connected: {isConnected ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Online: {isOnline ? 'Yes' : 'No'}</Text>
            {attendanceList.length > 0 && (
              <Text style={styles.debugText}>
                Sample: {JSON.stringify(attendanceList[0], null, 2).substring(0, 200)}...
              </Text>
            )}
          </View>
        )}
        
        {attendanceList.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No attendance records for today</Text>
            <Text style={styles.emptyStateSubtext}>Start scanning QR codes to see records here</Text>
          </View>
        ) : (
          <FlatList
            data={attendanceList}
            renderItem={renderAttendanceItem}
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#3498DB']}
              />
            }
          />
        )}
      </View>
      
      <NetworkConfigModal 
        visible={showNetworkConfig} 
        onClose={() => setShowNetworkConfig(false)} 
      />
      
      {/* Debug Modal */}
      {showDebugInfo && (
        <View style={styles.debugModal}>
          <View style={styles.debugContent}>
            <Text style={styles.debugTitle}>Debug: Offline Scans</Text>
            <Text style={styles.debugText}>Count: {offlineScans.length}</Text>
            {offlineScans.slice(0, 2).map((scan, index) => (
              <View key={index} style={styles.debugScan}>
                <Text style={styles.debugScanText}>Scan {index + 1}:</Text>
                <Text style={styles.debugScanData}>{JSON.stringify(scan, null, 2)}</Text>
              </View>
            ))}
            <TouchableOpacity 
              style={styles.debugCloseButton} 
              onPress={() => setShowDebugInfo(false)}
            >
              <Text style={styles.debugCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  welcomeText: {
    fontSize: 16,
    color: '#7F8C8D',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  logoutButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  configButton: {
    backgroundColor: '#95A5A6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  configButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  scanButton: {
    backgroundColor: '#3498DB',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 8,
    paddingTop: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  debugToggle: {
    backgroundColor: '#95A5A6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  debugToggleText: {
    fontSize: 14,
  },
  debugInfo: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#495057',
    marginBottom: 4,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  studentId: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 2,
  },
  classInfo: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 2,
  },
  locationInfo: {
    fontSize: 11,
    color: '#3498DB',
    marginTop: 2,
  },
  lateInfo: {
    fontSize: 11,
    color: '#F39C12',
    marginTop: 2,
    fontWeight: '600',
  },
  attendanceInfo: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  timeWindowText: {
    fontSize: 10,
    color: '#95A5A6',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
  },
  loadingText: {
    color: '#7F8C8D',
    fontSize: 16,
    marginTop: 16,
  },
  offlineStatus: {
    color: '#F39C12',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  syncButton: {
    backgroundColor: '#F39C12',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offlineButtonContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  debugButton: {
    backgroundColor: '#95A5A6',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  debugButtonText: {
    fontSize: 16,
  },
  debugModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    margin: 20,
    maxHeight: '80%',
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 14,
    marginBottom: 10,
  },
  debugScan: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  debugScanText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugScanData: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  debugCloseButton: {
    backgroundColor: '#3498DB',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  debugCloseText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successMessage: {
    backgroundColor: '#2ECC71',
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  successMessage: {
    backgroundColor: '#2ECC71',
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default DashboardScreen;