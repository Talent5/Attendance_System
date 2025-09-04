import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetwork } from '../contexts/NetworkContext';
import config from '../config/config';

const NetworkStatus = ({ style }) => {
  const { 
    isConnected, 
    isServerReachable, 
    isOnline, 
    connectionType, 
    lastChecked,
    checkServerConnectivity 
  } = useNetwork();

  const getStatusIcon = () => {
    if (isOnline) return '🟢';
    if (isConnected && !isServerReachable) return '🟡';
    return '🔴';
  };

  const getStatusText = () => {
    if (isOnline) return 'Online';
    if (isConnected && !isServerReachable) return 'Server Offline';
    return 'No Network';
  };

  const getStatusColor = () => {
    if (isOnline) return '#27AE60';
    if (isConnected && !isServerReachable) return '#F39C12';
    return '#E74C3C';
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.statusContainer}
        onPress={checkServerConnectivity}
      >
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          <Text style={styles.detailText}>
            {connectionType} • {config.API_BASE_URL}
          </Text>
          {lastChecked && (
            <Text style={styles.timeText}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 10,
    color: '#BDC3C7',
  },
});

export default NetworkStatus;