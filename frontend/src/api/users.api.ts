import apiClient from './axios.config';

/**
 * Users API
 * Handles user management and invitations
 */

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'member';
  color: string | null;
  status: 'active' | 'invited' | 'disabled';
  invitation_sent_at: string | null;
  invitation_accepted_at: string | null;
  invited_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'admin' | 'member';
}

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'member';
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export const usersAPI = {
  /**
   * Get all users in the family
   */
  async getUsers(): Promise<{ users: User[]; count: number }> {
    const response = await apiClient.get<{ users: User[]; count: number }>('/users');
    return response.data;
  },

  /**
   * Create a new user directly with password (no invitation)
   */
  async createUser(data: CreateUserRequest): Promise<{
    message: string;
    user: User;
  }> {
    const response = await apiClient.post<{
      message: string;
      user: User;
    }>('/users', data);
    return response.data;
  },

  /**
   * Invite a new user to the family
   */
  async inviteUser(data: InviteUserRequest): Promise<{
    message: string;
    user: User;
    invitationLink: string;
  }> {
    const response = await apiClient.post<{
      message: string;
      user: User;
      invitationLink: string;
    }>('/users/invite', data);
    return response.data;
  },

  /**
   * Accept an invitation and set password
   */
  async acceptInvitation(data: AcceptInvitationRequest): Promise<{
    message: string;
    user: { id: number; email: string; firstName: string; lastName: string };
  }> {
    const response = await apiClient.post<{
      message: string;
      user: { id: number; email: string; firstName: string; lastName: string };
    }>('/users/accept-invitation', data);
    return response.data;
  },

  /**
   * Update user's role
   */
  async updateRole(userId: number, role: 'admin' | 'member'): Promise<{
    message: string;
    user: User;
  }> {
    const response = await apiClient.put<{ message: string; user: User }>(
      `/users/${userId}/role`,
      { role }
    );
    return response.data;
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/users/${userId}`);
    return response.data;
  },
};

export default usersAPI;
