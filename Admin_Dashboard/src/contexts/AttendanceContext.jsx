import React, { createContext, useContext, useState } from 'react';

const AttendanceContext = createContext();

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};

export const AttendanceProvider = ({ children }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const markAttendance = (studentId, status, date = new Date()) => {
    const record = {
      id: Date.now(),
      studentId,
      status, // 'present', 'absent', 'late'
      date: date.toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };
    
    setAttendanceRecords(prev => [...prev, record]);
    return record;
  };

  const getAttendanceByDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendanceRecords.filter(record => record.date === dateStr);
  };

  const getStudentAttendance = (studentId) => {
    return attendanceRecords.filter(record => record.studentId === studentId);
  };

  const updateAttendance = (recordId, newStatus) => {
    setAttendanceRecords(prev => prev.map(record =>
      record.id === recordId ? { ...record, status: newStatus } : record
    ));
  };

  const deleteAttendance = (recordId) => {
    setAttendanceRecords(prev => prev.filter(record => record.id !== recordId));
  };

  const value = {
    attendanceRecords,
    markAttendance,
    getAttendanceByDate,
    getStudentAttendance,
    updateAttendance,
    deleteAttendance,
    loading,
    setLoading
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
};
