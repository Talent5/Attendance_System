import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import { AttendanceProvider } from './contexts/AttendanceContext';
import { OnboardingProvider } from './contexts/OnboardingContext';
import ProtectedRoute from './components/ProtectedRoute';
import LayoutWithSidebar from './components/Layout/LayoutWithSidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import IDCardGenerator from './pages/IDCardGenerator';
import Users from './pages/Users';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';
import AbsenteeManagement from './pages/AbsenteeManagement';
import { Toaster } from 'react-hot-toast';
import './App.css'

function App() {
  return (
    <AuthProvider>
      <EmployeeProvider>
        <AttendanceProvider>
          <OnboardingProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                
                {/* Protected Routes with Sidebar Layout */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <LayoutWithSidebar>
                      <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/employees" element={<Employees />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/absentee" element={<AbsenteeManagement />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/id-cards" element={<IDCardGenerator />} />
                        <Route path="/analytics" element={<Reports />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/profile" element={<ProfileSettings />} />
                      </Routes>
                    </LayoutWithSidebar>
                  </ProtectedRoute>
                } />
              </Routes>
            </Router>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </OnboardingProvider>
        </AttendanceProvider>
      </EmployeeProvider>
    </AuthProvider>
  )
}

export default App
