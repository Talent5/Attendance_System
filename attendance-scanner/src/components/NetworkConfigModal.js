import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import config from '../config/config';
import AttendanceService from '../services/AttendanceService';
import AuthService from '../services/AuthService';

const NetworkConfigModal = ({ visible, onClose }) => {
  const [baseUrl, setBaseUrl] = useState(config.API_BASE_URL);
  const [isLoading, setIsLoading] = useState(false);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      // Temporarily update the services with new URL
      AttendanceService.updateBaseURL(baseUrl);
      AuthService.updateBaseURL(baseUrl);
      
      // Test connectivity
      const isConnected = await AttendanceService.checkConnectivity();
      
      if (isConnected) {
        Alert.alert('Success', 'Connection to server successful!');
        // Save the working URL
        await AsyncStorage.setItem('custom_api_url', baseUrl);
      } else {
        Alert.alert('Connection Failed', 'Could not connect to the server at this URL.');
      }
    } catch (error) {
      Alert.alert('Error', `Connection test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = async () => {
    const defaultUrl = config.API_BASE_URL;
    setBaseUrl(defaultUrl);
    
    // Update services
    AttendanceService.updateBaseURL(defaultUrl);
    AuthService.updateBaseURL(defaultUrl);
    
    // Remove custom URL
    await AsyncStorage.removeItem('custom_api_url');
    
    Alert.alert('Reset', 'URL reset to default configuration.');
  };

  const getNetworkInfo = () => {
    const url = new URL(baseUrl);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    };
  };

  const networkInfo = getNetworkInfo();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Network Configuration</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Server URL:</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder="http://192.168.1.100:5000"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Connection Details:</Text>
            <Text style={styles.infoText}>Protocol: {networkInfo.protocol}</Text>
            <Text style={styles.infoText}>Host: {networkInfo.hostname}</Text>
            <Text style={styles.infoText}>Port: {networkInfo.port}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={testConnection}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Testing...' : 'Test Connection'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={resetToDefault}
            >
              <Text style={styles.buttonText}>Reset to Default</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.helpContainer}>
            <Text style={styles.helpTitle}>Help:</Text>
            <Text style={styles.helpText}>
              • Make sure your backend server is running{'\n'}
              • Use your computer's IP address, not localhost{'\n'}
              • Check that the port number is correct{'\n'}
              • Ensure your phone and computer are on the same network
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#3498DB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2C3E50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2C3E50',
  },
  infoText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 5,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#27AE60',
  },
  resetButton: {
    backgroundColor: '#E74C3C',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2C3E50',
  },
  helpText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
});

export default NetworkConfigModal;