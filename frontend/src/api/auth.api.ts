import apiClient from './axios.config';
import { User, AuthTokens } from '../stores/auth.store';

/**
 * Authentication API
 * Handles user authentication operations
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  family_id: number;
  role?: 'admin' | 'member';
  color?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export const authAPI = {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', userData);
    return response.data;
  },

  /**
   * Get current user profile
   */
  async getProfile(): Promise<{ user: User }> {
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data;
  },

  /**
   * Update current user profile
   */
  async updateProfile(updates: Partial<User>): Promise<{ message: string; user: User }> {
    const response = await apiClient.put<{ message: string; user: User }>('/auth/me', updates);
    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/logout', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>('/auth/logout-all');
    return response.data;
  },
};

export default authAPI;
