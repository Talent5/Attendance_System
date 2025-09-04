// Demo authentication service for testing without backend
const DEMO_USERS = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@school.com',
    role: 'admin'
  },
  {
    id: '2',
    name: 'Teacher John',
    email: 'teacher@school.com',
    role: 'teacher'
  }
];

const DEMO_STUDENTS = [
  {
    _id: '1',
    name: 'John Doe',
    email: 'john@student.com',
    studentId: 'ST001',
    grade: '10',
    phone: '+1234567890',
    address: '123 Main St'
  },
  {
    _id: '2',
    name: 'Jane Smith',
    email: 'jane@student.com',
    studentId: 'ST002',
    grade: '11',
    phone: '+1234567891',
    address: '456 Oak Ave'
  },
  {
    _id: '3',
    name: 'Bob Johnson',
    email: 'bob@student.com',
    studentId: 'ST003',
    grade: '12',
    phone: '+1234567892',
    address: '789 Pine St'
  }
];

const DEMO_ATTENDANCE = [
  {
    _id: '1',
    studentId: '1',
    timestamp: new Date().toISOString(),
    student: DEMO_STUDENTS[0]
  },
  {
    _id: '2',
    studentId: '2',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    student: DEMO_STUDENTS[1]
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

export const demoStudentService = {
  async getAllStudents() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...DEMO_STUDENTS];
  },

  async createStudent(studentData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newStudent = {
      ...studentData,
      _id: (DEMO_STUDENTS.length + 1).toString()
    };
    DEMO_STUDENTS.push(newStudent);
    return newStudent;
  },

  async updateStudent(id, studentData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = DEMO_STUDENTS.findIndex(s => s._id === id);
    if (index !== -1) {
      DEMO_STUDENTS[index] = { ...DEMO_STUDENTS[index], ...studentData };
      return DEMO_STUDENTS[index];
    }
    throw new Error('Student not found');
  },

  async deleteStudent(id) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = DEMO_STUDENTS.findIndex(s => s._id === id);
    if (index !== -1) {
      DEMO_STUDENTS.splice(index, 1);
      return { success: true };
    }
    throw new Error('Student not found');
  }
};

export const demoAttendanceService = {
  async getAttendance(filters = {}) {
    await new Promise(resolve => setTimeout(resolve, 500));
    let filtered = [...DEMO_ATTENDANCE];
    
    if (filters.studentId) {
      filtered = filtered.filter(a => a.studentId === filters.studentId);
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(a => new Date(a.timestamp) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(a => new Date(a.timestamp) <= new Date(filters.endDate));
    }
    
    return filtered;
  },

  async markAttendance(studentId) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const student = DEMO_STUDENTS.find(s => s._id === studentId);
    const newRecord = {
      _id: (DEMO_ATTENDANCE.length + 1).toString(),
      studentId,
      timestamp: new Date().toISOString(),
      student
    };
    DEMO_ATTENDANCE.push(newRecord);
    return newRecord;
  }
};
