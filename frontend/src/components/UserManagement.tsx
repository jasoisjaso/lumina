import React, { useState, useEffect } from 'react';
import { usersAPI, User, InviteUserRequest } from '../api/users.api';
import { useAuthStore } from '../stores/auth.store';

interface UserManagementProps {
  onError?: (error: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onError }) => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<InviteUserRequest>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member',
  });

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await usersAPI.getUsers();
      setUsers(response.users);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load users';
      onError?.(errorMessage);
      console.error('Load users error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsInviting(true);
      const response = await usersAPI.inviteUser(formData);

      setInvitationLink(response.invitationLink);
      setFormData({ email: '', firstName: '', lastName: '', role: 'member' });
      setShowInviteForm(false);

      await loadUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to invite user';
      onError?.(errorMessage);
      console.error('Invite user error:', err);
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (userId: number, newRole: 'admin' | 'member') => {
    try {
      await usersAPI.updateRole(userId, newRole);
      await loadUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update user role';
      onError?.(errorMessage);
      console.error('Update role error:', err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return;
    }

    try {
      await usersAPI.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete user';
      onError?.(errorMessage);
      console.error('Delete user error:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Active</span>;
      case 'invited':
        return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">Pending</span>;
      case 'disabled':
        return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">Disabled</span>;
      default:
        return null;
    }
  };

  const activeUsers = users.filter(u => u.status === 'active');
  const pendingInvites = users.filter(u => u.status === 'invited');

  const isAdmin = currentUser?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading family members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Family Members</h3>
          <p className="text-sm text-slate-600">
            Manage your family members and pending invitations
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Invite Member
          </button>
        )}
      </div>

      {/* Invitation Link Display */}
      {invitationLink && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800 mb-2">
                Invitation sent successfully!
              </p>
              <p className="text-xs text-emerald-700 mb-2">
                Share this link with the new member:
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={invitationLink}
                  readOnly
                  className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-lg focus:outline-none font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(invitationLink);
                    alert('Link copied to clipboard!');
                  }}
                  className="px-3 py-2 text-xs font-medium text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={() => setInvitationLink(null)}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && isAdmin && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h4 className="text-md font-semibold text-slate-800 mb-4">Invite New Member</h4>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'member' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isInviting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active Members */}
      <div>
        <h4 className="text-md font-semibold text-slate-800 mb-3">Active Members ({activeUsers.length})</h4>
        <div className="space-y-2">
          {activeUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-700">
                    {user.first_name[0]}{user.last_name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {user.first_name} {user.last_name}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-slate-500">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-600">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {getStatusBadge(user.status)}

                {isAdmin && (
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value as 'admin' | 'member')}
                    disabled={user.id === currentUser?.id}
                    className="px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                )}

                {!isAdmin && (
                  <span className="px-2 py-1 text-xs text-slate-600">
                    {user.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                )}

                {isAdmin && user.id !== currentUser?.id && (
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-slate-800 mb-3">
            Pending Invitations ({pendingInvites.length})
          </h4>
          <div className="space-y-2">
            {pendingInvites.map((user) => (
              <div
                key={user.id}
                className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-slate-600">{user.email}</p>
                    <p className="text-xs text-slate-500">
                      Invited {new Date(user.invitation_sent_at!).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusBadge(user.status)}

                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancel invitation"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Only admins can invite or remove family members.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
