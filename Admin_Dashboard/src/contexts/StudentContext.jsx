import React, { createContext, useContext, useState } from 'react';

const StudentContext = createContext();

export const useStudents = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudents must be used within a StudentProvider');
  }
  return context;
};

export const StudentProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const addStudent = (student) => {
    setStudents(prev => [...prev, { ...student, id: Date.now() }]);
  };

  const updateStudent = (id, updatedData) => {
    setStudents(prev => prev.map(student => 
      student.id === id ? { ...student, ...updatedData } : student
    ));
  };

  const deleteStudent = (id) => {
    setStudents(prev => prev.filter(student => student.id !== id));
  };

  const getStudent = (id) => {
    return students.find(student => student.id === id);
  };

  const value = {
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    getStudent,
    loading,
    setLoading
  };

  return (
    <StudentContext.Provider value={value}>
      {children}
    </StudentContext.Provider>
  );
};
