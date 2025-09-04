import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';

const AuthContext = createContext();

// Auth actions
const AuthActions = {
  LOADING: 'LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  RESTORE_TOKEN: 'RESTORE_TOKEN',
};

// Initial state
const initialState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  token: null,
  error: null,
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AuthActions.LOADING:
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case AuthActions.LOGIN_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case AuthActions.LOGIN_FAILURE:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload.error,
      };
    case AuthActions.LOGOUT:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null,
      };
    case AuthActions.RESTORE_TOKEN:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: !!action.payload.token,
        user: action.payload.user,
        token: action.payload.token,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore authentication state on app start
  useEffect(() => {
    const restoreToken = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (token && user) {
          // Try to validate token with backend, but don't fail if server is unreachable
          try {
            const isValid = await AuthService.validateToken(token);
            if (isValid) {
              dispatch({
                type: AuthActions.RESTORE_TOKEN,
                payload: { token, user },
              });
              return;
            }
          } catch (networkError) {
            console.log('Token validation failed due to network, using cached credentials:', networkError.message);
            // If network is down, trust the stored token temporarily
            dispatch({
              type: AuthActions.RESTORE_TOKEN,
              payload: { token, user },
            });
            return;
          }
        }
        
        // Clear invalid data
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        dispatch({
          type: AuthActions.RESTORE_TOKEN,
          payload: { token: null, user: null },
        });
      } catch (error) {
        console.error('Token restoration failed:', error);
        dispatch({
          type: AuthActions.RESTORE_TOKEN,
          payload: { token: null, user: null },
        });
      }
    };

    restoreToken();
  }, []);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: AuthActions.LOADING });

    try {
      const response = await AuthService.login(email, password);
      
      if (response.success) {
        const { accessToken, refreshToken, user } = response.data;
        
        // Store tokens and user data
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', refreshToken],
          ['user', JSON.stringify(user)],
        ]);

        dispatch({
          type: AuthActions.LOGIN_SUCCESS,
          payload: {
            token: accessToken,
            user,
          },
        });

        return { success: true };
      } else {
        dispatch({
          type: AuthActions.LOGIN_FAILURE,
          payload: { error: response.error?.message || 'Login failed' },
        });
        return { success: false, error: response.error?.message || 'Login failed' };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Network error';
      dispatch({
        type: AuthActions.LOGIN_FAILURE,
        payload: { error: errorMessage },
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
      dispatch({ type: AuthActions.LOGOUT });
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({
      type: AuthActions.LOGIN_FAILURE,
      payload: { error: null },
    });
  };

  const contextValue = {
    ...state,
    login,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;