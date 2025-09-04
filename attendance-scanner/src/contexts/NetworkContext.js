import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AttendanceService from '../services/AttendanceService';
import AuthService from '../services/AuthService';

const NetworkContext = createContext();

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [lastChecked, setLastChecked] = useState(null);

  // Check server connectivity
  const checkServerConnectivity = async () => {
    try {
      console.log('Checking server connectivity...');
      const serverReachable = await AttendanceService.checkConnectivity();
      console.log('Server reachable:', serverReachable);
      setIsServerReachable(serverReachable);
      setLastChecked(new Date());
      return serverReachable;
    } catch (error) {
      console.error('Server connectivity check failed:', error);
      setIsServerReachable(false);
      setLastChecked(new Date());
      return false;
    }
  };

  // Check overall connectivity (network + server)
  const checkFullConnectivity = async () => {
    if (!isConnected) {
      setIsServerReachable(false);
      return false;
    }
    return await checkServerConnectivity();
  };

  // Subscribe to network state changes
  useEffect(() => {
    // Load custom API URL if saved
    const loadCustomUrl = async () => {
      try {
        const customUrl = await AsyncStorage.getItem('custom_api_url');
        if (customUrl) {
          console.log('Loading custom API URL:', customUrl);
          AttendanceService.updateBaseURL(customUrl);
          AuthService.updateBaseURL(customUrl);
        }
      } catch (error) {
        console.error('Failed to load custom URL:', error);
      }
    };
    
    loadCustomUrl();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network state changed:', state);
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
      
      // Check server connectivity when network state changes
      if (state.isConnected) {
        setTimeout(() => {
          checkServerConnectivity();
        }, 1000); // Small delay to ensure network is fully ready
      } else {
        setIsServerReachable(false);
      }
    });

    // Initial connectivity check
    NetInfo.fetch().then(state => {
      console.log('Initial network state:', state);
      setIsConnected(state.isConnected);
      setConnectionType(state.type);
      
      if (state.isConnected) {
        checkServerConnectivity();
      }
    });

    return () => unsubscribe();
  }, []);

  // Periodic server connectivity check
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        checkServerConnectivity();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  const contextValue = {
    isConnected,
    isServerReachable,
    isOnline: isConnected && isServerReachable,
    connectionType,
    lastChecked,
    checkServerConnectivity,
    checkFullConnectivity,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export default NetworkContext;