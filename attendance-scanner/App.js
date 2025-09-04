import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet, View } from 'react-native';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import LoadingScreen from './src/screens/LoadingScreen';

// Import context providers
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AttendanceProvider } from './src/contexts/AttendanceContext';
import { NetworkProvider } from './src/contexts/NetworkContext';

const Stack = createStackNavigator();

// Auth Navigator - for unauthenticated users
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

// App Navigator - for authenticated users
const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#3498DB',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{
          headerShown: false, // Dashboard has its own header
        }}
      />
      <Stack.Screen 
        name="QRScanner" 
        component={QRScannerScreen}
        options={{
          title: 'QR Scanner',
          headerShown: false, // Scanner has its own header
        }}
      />
    </Stack.Navigator>
  );
};

// Main App Navigator
const AppContent = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
};

export default function App() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <AttendanceProvider>
          <NavigationContainer>
            <View style={styles.container}>
              <AppContent />
              <StatusBar style="light" />
            </View>
          </NavigationContainer>
        </AttendanceProvider>
      </AuthProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});