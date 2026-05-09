import api from './api';
import { LoginDto, RegisterDto, AuthResponse } from '../types/auth';

export const authService = {
  async login(dto: LoginDto): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/auth/login', dto);
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Set cookie for middleware
      document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
    }
    return data;
  },

  async register(dto: RegisterDto): Promise<any> {
    const { data } = await api.post('/auth/register', dto);
    return data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  },

  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    }
    return null;
  },
};
