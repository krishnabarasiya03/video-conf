import axios from 'axios';
import { ApiResponse, Course, Schedule, Enrollment, StudentDashboard } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth
  getUserProfile: () => api.get<ApiResponse<any>>('/me'),

  // Courses
  getCourses: () => api.get<ApiResponse<Course[]>>('/courses'),
  createCourse: (data: { name: string; description: string }) =>
    api.post<ApiResponse<Course>>('/courses', data),
  updateCourse: (id: string, data: { name?: string; description?: string }) =>
    api.put<ApiResponse<Course>>(`/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete<ApiResponse<void>>(`/courses/${id}`),

  // Enrollments
  enrollInCourse: (courseId: string) =>
    api.post<ApiResponse<Enrollment>>(`/enrollments/${courseId}/enroll`),
  getEnrollments: () => api.get<ApiResponse<Enrollment[]>>('/enrollments'),
  getCourseEnrollments: (courseId: string) =>
    api.get<ApiResponse<Enrollment[]>>(`/enrollments/${courseId}`),

  // Schedules
  getSchedules: () => api.get<ApiResponse<Schedule[]>>('/schedules'),
  createSchedule: (data: {
    courseId: string;
    date: string;
    time: string;
    durationMinutes: number;
  }) => api.post<ApiResponse<Schedule>>('/schedules', data),
  getScheduleByRoom: (roomId: string) =>
    api.get<ApiResponse<{ schedule: Schedule; participants?: any[] }>>(`/schedules/${roomId}`),

  // Students
  getStudentDashboard: () =>
    api.get<ApiResponse<StudentDashboard>>('/students/me/dashboard'),
  getStudentSchedule: () =>
    api.get<ApiResponse<Schedule[]>>('/students/me/schedule'),
};