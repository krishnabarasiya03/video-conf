export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'student' | 'teacher';
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  courseId: string;
  teacherId: string;
  date: string;
  time: string;
  durationMinutes: number;
  courseName: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface StudentDashboard {
  student: User;
  stats: {
    enrolledCourses: number;
    upcomingClasses: number;
    todayClasses: number;
  };
  enrolledCourses: Course[];
  upcomingClasses: Schedule[];
  todayClasses: Schedule[];
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: 'student' | 'teacher') => Promise<void>;
  signOut: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
}