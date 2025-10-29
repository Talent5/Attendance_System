import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { employeeService } from '../services/employeeService';

// Compatibility layer
const studentService = {
  getAllStudents: (params) => employeeService.getAllEmployees(params),
};
import { attendanceService } from '../services/attendanceService';
import QRScanner from '../components/QRScanner';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [todaySummary, setTodaySummary] = useState({
    total: 0,
    present: 0,
    late: 0,
    onTime: 0
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch data concurrently
      const [studentsResponse, todayAttendanceResponse] = await Promise.all([
        studentService.getAllStudents({ limit: 1000 }), // Get all students for total count
        attendanceService.getTodayAttendance()
      ]);

      const totalStudents = studentsResponse.length || 0;
      const attendanceData = todayAttendanceResponse.attendance || [];
      const summary = todayAttendanceResponse.summary || {};
      
      // Set today's attendance details
      setTodayAttendance(attendanceData);
      setTodaySummary(summary);
      
      // Calculate stats for the dashboard cards
      const totalScanned = summary.total || attendanceData.length;
      const absentToday = Math.max(0, totalStudents - totalScanned);
      const attendanceRate = totalStudents > 0 ? Math.round((totalScanned / totalStudents) * 100) : 0;

      setStats({
        totalStudents,
        presentToday: totalScanned, // Total who showed up (present + late)
        absentToday,
        attendanceRate
      });
      
      // Set recent activity from today's attendance (last 5 records)
      const recentAttendance = attendanceData
        .slice(0, 5) // Get last 5 records
        .map(record => ({
          id: record._id,
          type: 'attendance',
          message: `${record.employeeId?.firstName || 'Unknown'} ${record.employeeId?.lastName || 'Employee'} checked in`,
          time: new Date(record.scanTime).toLocaleTimeString(),
          status: record.status,
          department: record.employeeId?.department,
          timeWindow: record.timeWindow,
          minutesLate: record.minutesLate
        }));
      
      setRecentActivity(recentAttendance);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default values on error
      setStats({
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        attendanceRate: 0
      });
      setRecentActivity([]);
      setTodayAttendance([]);
      setTodaySummary({ total: 0, present: 0, late: 0, onTime: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleQRScanComplete = (result) => {
    // Refresh dashboard data after successful scan
    if (result.success) {
      // Update stats
      setStats(prev => ({
        ...prev,
        presentToday: prev.presentToday + 1,
        absentToday: Math.max(0, prev.absentToday - 1)
      }));
      
      // Update today's summary
      setTodaySummary(prev => ({
        ...prev,
        total: (prev.total || 0) + 1,
        present: result.attendance.status === 'present' ? (prev.present || 0) + 1 : prev.present,
        late: result.attendance.status === 'late' ? (prev.late || 0) + 1 : prev.late,
        onTime: result.attendance.timeWindow === 'on_time' ? (prev.onTime || 0) + 1 : prev.onTime
      }));
      
      // Add to today's attendance list
      const newAttendanceRecord = {
        ...result.attendance,
        employeeId: result.student
      };
      setTodayAttendance(prev => [newAttendanceRecord, ...prev]);
      
      // Add to recent activity
      const newActivity = {
        id: result.attendance._id,
        type: 'attendance',
        message: `${result.student.firstName} ${result.student.lastName} checked in`,
        time: new Date().toLocaleTimeString(),
        status: result.attendance.status,
        department: result.student.department,
        timeWindow: result.attendance.timeWindow,
        minutesLate: result.attendance.minutesLate
      };
      
      setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);
    }
    
    // Close scanner after 2 seconds to show the result
    setTimeout(() => {
      setShowQRScanner(false);
    }, 2000);
  };

  // Navigation handlers for quick actions
  const handleAddStudent = () => {
    navigate('/students?action=add');
  };

  const handleGenerateReports = () => {
    navigate('/reports');
  };

  const handleManageUsers = () => {
    navigate('/users');
  };

  const handleViewAttendance = () => {
    navigate('/attendance');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const StatCard = ({ title, value, icon, color, trend }) => (
    <div className="bg-white overflow-hidden shadow-lg rounded-xl border-l-4 border-l-blue-500 hover:shadow-xl transition-shadow duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-lg`}>
              {icon}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && (
                <p className="text-xs text-green-600 font-medium">
                  {trend}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-6 py-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                {user?.role === 'admin' ? (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                  </svg>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {user?.role === 'admin' ? 'Admin Dashboard' : 'Manager Dashboard'}
                </h1>
                <p className="text-lg text-blue-100 mt-1">
                  Welcome back, <strong>{user?.name}</strong>
                </p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-blue-100">Today's Date</p>
              <p className="text-lg font-semibold text-white">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <StatCard
          title="Total Employees"
          value={stats.totalStudents}
          trend="All active employees"
          icon={
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
            </svg>
          }
          color="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          trend="Currently checked in"
          icon={
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          }
          color="bg-gradient-to-br from-green-500 to-green-600"
        />
        
        <StatCard
          title="Absent Today"
          value={stats.absentToday}
          trend="Not checked in"
          icon={
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          }
          color="bg-gradient-to-br from-red-500 to-red-600"
        />
        
        <StatCard
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          trend={stats.attendanceRate >= 80 ? "Great job!" : "Needs improvement"}
          icon={
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          }
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
      </div>

      {/* Quick Actions Section */}
      {user?.role === 'admin' && (
        <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
            </svg>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button 
              onClick={handleAddStudent}
              className="flex items-center justify-center px-6 py-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
              Add New Employee
            </button>
            <button 
              onClick={handleGenerateReports}
              className="flex items-center justify-center px-6 py-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2V3a2 2 0 012-2v1a2 2 0 00-2 2v.293l.707.707A1 1 0 0016 7v4a1 1 0 01-.293.707L15 12.414V13a1 1 0 01-1 1H6a1 1 0 01-1-1v-.586L4.293 11.707A1 1 0 014 11V7a1 1 0 01.293-.707L5 5.586V5z" clipRule="evenodd"/>
              </svg>
              Generate Reports
            </button>
            <button 
              onClick={handleManageUsers}
              className="flex items-center justify-center px-6 py-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
              </svg>
              Manage Users
            </button>
          </div>
        </div>
      )}

        {/* Bottom Section - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity Section */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-lg rounded-xl p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  Recent Activity
                </h3>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </button>
              </div>
              
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className={`flex items-center p-4 rounded-xl border-l-4 hover:bg-opacity-80 transition-colors duration-200 ${
                      activity.status === 'present' ? 'bg-green-50 border-green-500' :
                      activity.status === 'late' ? 'bg-orange-50 border-orange-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          activity.status === 'present' ? 'bg-green-500' :
                          activity.status === 'late' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`}>
                          {activity.status === 'late' ? (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {activity.time}
                          </p>
                          {activity.class && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-gray-600 font-medium">{activity.class}</span>
                            </>
                          )}
                          {activity.timeWindow && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className={`text-xs font-medium ${
                                activity.timeWindow === 'on_time' ? 'text-green-600' :
                                activity.timeWindow === 'late' || activity.timeWindow === 'very_late' ? 'text-orange-600' :
                                'text-blue-600'
                              }`}>
                                {activity.timeWindow.replace('_', ' ')}
                              </span>
                            </>
                          )}
                          {activity.minutesLate > 0 && (
                            <>
                              <span className="text-xs text-gray-400">•</span>
                              <span className="text-xs text-orange-600 font-medium">
                                {activity.minutesLate} min late
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                          activity.status === 'present' ? 'bg-green-100 text-green-700' :
                          activity.status === 'late' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {activity.status === 'present' ? 'Present' :
                           activity.status === 'late' ? 'Late' : 'Checked In'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500 text-sm">No recent activity today</p>
                    <p className="text-gray-400 text-xs mt-1">Attendance records will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Today's Summary & Quick Stats */}
          <div className="space-y-6">
            {/* Today's Summary */}
            <div className="bg-white shadow-lg rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                Today's Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Total Scanned</span>
                  <span className="text-lg font-bold text-blue-600">{todaySummary.total || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Present</span>
                  <span className="text-lg font-bold text-green-600">{todaySummary.present || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Late</span>
                  <span className="text-lg font-bold text-orange-600">{todaySummary.late || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">On Time</span>
                  <span className="text-lg font-bold text-green-500">{todaySummary.onTime || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Not Scanned</span>
                  <span className="text-lg font-bold text-red-600">{stats.absentToday}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                  <span className="text-sm font-medium text-gray-600">Attendance Rate</span>
                  <span className="text-lg font-bold text-purple-600">{stats.attendanceRate}%</span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions for Managers */}
            {user?.role !== 'admin' && (
              <div className="bg-white shadow-lg rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  Manager Tools
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowQRScanner(true)}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                    data-tour="scan-qr"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zm2 2V5h1v1h-1zM11 4a1 1 0 100-2 1 1 0 000 2zM11 7a1 1 0 100-2 1 1 0 000 2zM11 10a1 1 0 100-2 1 1 0 000 2zM11 13a1 1 0 100-2 1 1 0 000 2zM11 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    Scan QR Code
                  </button>
                  <button 
                    onClick={handleViewAttendance}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2V3a2 2 0 012-2v1a2 2 0 00-2 2v.293l.707.707A1 1 0 0016 7v4a1 1 0 01-.293.707L15 12.414V13a1 1 0 01-1 1H6a1 1 0 01-1-1v-.586L4.293 11.707A1 1 0 014 11V7a1 1 0 01.293-.707L5 5.586V5z" clipRule="evenodd" />
                    </svg>
                    View Attendance
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Detailed Today's Attendance Section */}
      <div className="p-6 pt-0">
        <div className="bg-white shadow-lg rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2V3a2 2 0 012-2v1a2 2 0 00-2 2v.293l.707.707A1 1 0 0016 7v4a1 1 0 01-.293.707L15 12.414V13a1 1 0 01-1 1H6a1 1 0 01-1-1v-.586L4.293 11.707A1 1 0 014 11V7a1 1 0 01.293-.707L5 5.586V5z" clipRule="evenodd"/>
                </svg>
              </div>
              Today's Attendance Details
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Total Records: {todayAttendance.length}</span>
              <span className="text-gray-400">•</span>
              <span>{new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
          
          {todayAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Late Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {todayAttendance.map((record, index) => (
                    <tr key={record._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {record.employeeId?.firstName?.charAt(0) || '?'}{record.employeeId?.lastName?.charAt(0) || ''}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {record.employeeId?.firstName || 'Unknown'} {record.employeeId?.lastName || 'Employee'}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {record.employeeId?.employeeId || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.employeeId?.department || 'N/A'}</div>
                        <div className="text-sm text-gray-500">Position: {record.employeeId?.position || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'late' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {record.status?.charAt(0).toUpperCase() + record.status?.slice(1) || 'Unknown'}
                        </span>
                        {record.timeWindow && (
                          <div className={`text-xs mt-1 ${
                            record.timeWindow === 'on_time' ? 'text-green-600' :
                            record.timeWindow === 'late' || record.timeWindow === 'very_late' ? 'text-orange-600' :
                            'text-blue-600'
                          }`}>
                            {record.timeWindow.replace('_', ' ')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.scanTime).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.minutesLate > 0 ? (
                          <span className="text-orange-600 font-medium">
                            +{record.minutesLate} min
                          </span>
                        ) : (
                          <span className="text-green-600">On time</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.location || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records today</h3>
              <p className="text-gray-500 mb-4">Start scanning QR codes to see attendance records here</p>
              {user?.role !== 'admin' && (
                <button 
                  onClick={() => setShowQRScanner(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zm2 2V5h1v1h-1zM11 4a1 1 0 100-2 1 1 0 000 2zM11 7a1 1 0 100-2 1 1 0 000 2zM11 10a1 1 0 100-2 1 1 0 000 2zM11 13a1 1 0 100-2 1 1 0 000 2zM11 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Start Scanning
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner 
          onScanComplete={handleQRScanComplete}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
