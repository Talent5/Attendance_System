// Demo authentication service for testing without backend
const DEMO_USERS = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Manager John',
    email: 'manager@company.com',
    role: 'manager'
  }
];

const DEMO_EMPLOYEES = [
  {
    _id: '1',
    name: 'John Doe',
    email: 'john@company.com',
    employeeId: 'EMP001',
    department: 'Engineering',
    phone: '+1234567890',
    address: '123 Main St'
  },
  {
    _id: '2',
    name: 'Jane Smith',
    email: 'jane@company.com',
    employeeId: 'EMP002',
    department: 'Marketing',
    phone: '+1234567891',
    address: '456 Oak Ave'
  },
  {
    _id: '3',
    name: 'Bob Johnson',
    email: 'bob@company.com',
    employeeId: 'EMP003',
    department: 'Sales',
    phone: '+1234567892',
    address: '789 Pine St'
  }
];

const DEMO_ATTENDANCE = [
  {
    _id: '1',
    employeeId: '1',
    timestamp: new Date().toISOString(),
    employee: DEMO_EMPLOYEES[0]
  },
  {
    _id: '2',
    employeeId: '2',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    employee: DEMO_EMPLOYEES[1]
  }
];

export const demoAuthService = {
  async login(credentials) {
    console.log('Demo Login attempt:', credentials);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = DEMO_USERS.find(u => u.email === credentials.email);
    console.log('Found user:', user);
    
    if (user && credentials.password === 'password') {
      console.log('Login successful for:', user.email);
      return {
        user,
        token: 'demo-jwt-token'
      };
    } else {
      console.log('Login failed - Invalid credentials');
      throw new Error('Invalid email or password');
    }
  },

  async getCurrentUser() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return DEMO_USERS[0]; // Return admin user by default
  }
};

export const demoEmployeeService = {
  async getAllEmployees() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...DEMO_EMPLOYEES];
  },

  async createEmployee(employeeData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newEmployee = {
      ...employeeData,
      _id: (DEMO_EMPLOYEES.length + 1).toString()
    };
    DEMO_EMPLOYEES.push(newEmployee);
    return newEmployee;
  },

  async updateEmployee(id, employeeData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = DEMO_EMPLOYEES.findIndex(s => s._id === id);
    if (index !== -1) {
      DEMO_EMPLOYEES[index] = { ...DEMO_EMPLOYEES[index], ...employeeData };
      return DEMO_EMPLOYEES[index];
    }
    throw new Error('employee not found');
  },

  async deleteEmployee(id) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = DEMO_EMPLOYEES.findIndex(s => s._id === id);
    if (index !== -1) {
      DEMO_EMPLOYEES.splice(index, 1);
      return { success: true };
    }
    throw new Error('employee not found');
  }
};

export const demoAttendanceService = {
  async getAttendance(filters = {}) {
    await new Promise(resolve => setTimeout(resolve, 500));
    let filtered = [...DEMO_ATTENDANCE];
    
    if (filters.employeeId) {
      filtered = filtered.filter(a => a.employeeId === filters.employeeId);
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(a => new Date(a.timestamp) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(a => new Date(a.timestamp) <= new Date(filters.endDate));
    }
    
    return filtered;
  },

  async markAttendance(employeeId) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const employee = DEMO_EMPLOYEES.find(s => s._id === employeeId);
    const newRecord = {
      _id: (DEMO_ATTENDANCE.length + 1).toString(),
      employeeId,
      timestamp: new Date().toISOString(),
      employee
    };
    DEMO_ATTENDANCE.push(newRecord);
    return newRecord;
  }
};
