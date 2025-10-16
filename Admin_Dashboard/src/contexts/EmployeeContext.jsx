import React, { createContext, useContext, useState } from 'react';

const EmployeeContext = createContext();

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployees must be used within an EmployeeProvider');
  }
  return context;
};

export const EmployeeProvider = ({ children }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const addEmployee = (employee) => {
    setEmployees(prev => [...prev, { ...employee, id: Date.now() }]);
  };

  const updateEmployee = (id, updatedData) => {
    setEmployees(prev => prev.map(employee => 
      employee.id === id ? { ...employee, ...updatedData } : employee
    ));
  };

  const deleteEmployee = (id) => {
    setEmployees(prev => prev.filter(employee => employee.id !== id));
  };

  const getEmployee = (id) => {
    return employees.find(employee => employee.id === id);
  };

  const value = {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    loading,
    setLoading
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};
