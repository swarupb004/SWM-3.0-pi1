import axios from 'axios';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Attendance,
  Case,
  CaseHistory,
  CaseStats,
  ImportResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<{ message: string; user: User }> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },
};

// Attendance API
export const attendanceApi = {
  checkIn: async (): Promise<{ message: string; attendance: Attendance }> => {
    const response = await api.post('/attendance/check-in');
    return response.data;
  },

  checkOut: async (): Promise<{ message: string; attendance: Attendance }> => {
    const response = await api.post('/attendance/check-out');
    return response.data;
  },

  startBreak: async (): Promise<{ message: string; attendance: Attendance }> => {
    const response = await api.post('/attendance/break-start');
    return response.data;
  },

  endBreak: async (): Promise<{ message: string; attendance: Attendance }> => {
    const response = await api.post('/attendance/break-end');
    return response.data;
  },

  getMyAttendance: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<Attendance[]> => {
    const response = await api.get<Attendance[]>('/attendance/my-attendance', { params });
    return response.data;
  },

  getTodayStatus: async (): Promise<Attendance | null> => {
    const response = await api.get<Attendance | null>('/attendance/today');
    return response.data;
  },

  getTeamAttendance: async (params?: {
    startDate?: string;
    endDate?: string;
    team?: string;
  }): Promise<Attendance[]> => {
    const response = await api.get<Attendance[]>('/attendance/team', { params });
    return response.data;
  },
};

// Cases API
export const casesApi = {
  createCase: async (caseData: Partial<Case>): Promise<Case> => {
    const response = await api.post<Case>('/cases', caseData);
    return response.data;
  },

  getCases: async (params?: {
    status?: string;
    priority?: string;
    assigned_to?: number;
    case_type?: string;
    search?: string;
  }): Promise<Case[]> => {
    const response = await api.get<Case[]>('/cases', { params });
    return response.data;
  },

  getCase: async (id: number): Promise<Case> => {
    const response = await api.get<Case>(`/cases/${id}`);
    return response.data;
  },

  updateCase: async (id: number, caseData: Partial<Case>): Promise<Case> => {
    const response = await api.put<Case>(`/cases/${id}`, caseData);
    return response.data;
  },

  deleteCase: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/cases/${id}`);
    return response.data;
  },

  getCaseHistory: async (id: number): Promise<CaseHistory[]> => {
    const response = await api.get<CaseHistory[]>(`/cases/${id}/history`);
    return response.data;
  },

  getMyCases: async (): Promise<Case[]> => {
    const response = await api.get<Case[]>('/cases/my-cases');
    return response.data;
  },

  getCaseStats: async (): Promise<CaseStats> => {
    const response = await api.get<CaseStats>('/cases/stats');
    return response.data;
  },
};

// Import/Export API
export const importApi = {
  importCases: async (file: File): Promise<{ message: string; results: ImportResult }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/import/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  exportCases: async (params?: {
    status?: string;
    priority?: string;
    assigned_to?: number;
  }): Promise<Blob> => {
    const response = await api.get('/import/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  getTemplate: async (): Promise<Blob> => {
    const response = await api.get('/import/template', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
