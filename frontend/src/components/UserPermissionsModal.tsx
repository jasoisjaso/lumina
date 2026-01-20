import React, { useState, useEffect } from 'react';
import { User } from '../api/users.api';

/**
 * User Permissions Modal
 * Allows admins to view and manage granular permissions for users
 */

interface Permission {
  name: string;
  category: string;
  description: string;
  fromRole: boolean; // Whether this permission comes from the user's role
  granted: boolean; // Current state (role-based + overrides)
  customOverride: boolean | null; // null = no override, true = granted override, false = revoked override
}

interface UserPermissionsModalProps {
  user: User;
  onClose: () => void;
  onSave: (userId: number, permissions: { name: string; granted: boolean }[]) => Promise<void>;
}

export const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({ user, onClose, onSave }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock permissions data - In real implementation, this would come from API
  const allPermissions: Permission[] = [
    // Users category
    { name: 'view_users', category: 'users', description: 'View family members', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },
    { name: 'invite_users', category: 'users', description: 'Invite new family members', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },
    { name: 'manage_users', category: 'users', description: 'Edit or remove family members', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },
    { name: 'manage_roles', category: 'users', description: 'Change user roles', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },

    // Orders category
    { name: 'view_orders', category: 'orders', description: 'View WooCommerce orders', fromRole: true, granted: true, customOverride: null },
    { name: 'manage_orders', category: 'orders', description: 'Update order statuses', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },

    // Calendar category
    { name: 'view_calendar', category: 'calendar', description: 'View family calendar', fromRole: true, granted: true, customOverride: null },
    { name: 'manage_events', category: 'calendar', description: 'Create and edit calendar events', fromRole: true, granted: true, customOverride: null },
    { name: 'delete_events', category: 'calendar', description: 'Delete calendar events', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },

    // Photos category
    { name: 'view_photos', category: 'photos', description: 'View photo gallery', fromRole: true, granted: true, customOverride: null },
    { name: 'upload_photos', category: 'photos', description: 'Upload photos to gallery', fromRole: true, granted: true, customOverride: null },
    { name: 'manage_photos', category: 'photos', description: 'Edit or delete any photos', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },
    { name: 'manage_albums', category: 'photos', description: 'Create and manage photo albums', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },

    // Settings category
    { name: 'view_settings', category: 'settings', description: 'View family settings', fromRole: true, granted: true, customOverride: null },
    { name: 'manage_integrations', category: 'settings', description: 'Configure integrations', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },
    { name: 'manage_features', category: 'settings', description: 'Enable/disable features', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },
    { name: 'manage_settings', category: 'settings', description: 'Modify family settings', fromRole: user.role === 'admin', granted: user.role === 'admin', customOverride: null },
  ];

  useEffect(() => {
    // In real implementation, fetch user's actual permissions from API
    setPermissions(allPermissions);
    setLoading(false);
  }, [user.id]);

  const handleTogglePermission = (permissionName: string) => {
    setPermissions(prev =>
      prev.map(p => {
        if (p.name !== permissionName) return p;

        // If currently granted from role, create a revoke override
        if (p.fromRole && p.customOverride === null) {
          return { ...p, customOverride: false, granted: false };
        }
        // If currently revoked by override, remove override (revert to role default)
        if (p.fromRole && p.customOverride === false) {
          return { ...p, customOverride: null, granted: true };
        }
        // If not from role and no override, create grant override
        if (!p.fromRole && p.customOverride === null) {
          return { ...p, customOverride: true, granted: true };
        }
        // If granted by override, remove override
        if (!p.fromRole && p.customOverride === true) {
          return { ...p, customOverride: null, granted: false };
        }
        return p;
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Send only permissions with custom overrides
      const overrides = permissions
        .filter(p => p.customOverride !== null)
        .map(p => ({ name: p.name, granted: p.granted }));

      await onSave(user.id, overrides);
      onClose();
    } catch (error) {
      console.error('Save permissions error:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredPermissions = searchQuery
    ? permissions.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : permissions;

  const categories = Array.from(new Set(filteredPermissions.map(p => p.category)));

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Manage Permissions</h2>
              <p className="text-sm text-slate-600 mt-1">
                {user.first_name} {user.last_name} ({user.role})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {filteredPermissions
                      .filter((p) => p.category === category)
                      .map((permission) => (
                        <div
                          key={permission.name}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900">
                                {permission.description}
                              </p>
                              {permission.fromRole && permission.customOverride === null && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded">
                                  From Role
                                </span>
                              )}
                              {permission.customOverride !== null && (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                  permission.customOverride
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {permission.customOverride ? 'Custom Grant' : 'Custom Revoke'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">{permission.name}</p>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={permission.granted}
                              onChange={() => handleTogglePermission(permission.name)}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              permission.granted ? 'bg-indigo-500' : 'bg-slate-300'
                            }`}>
                              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform transform ${
                                permission.granted ? 'translate-x-6' : 'translate-x-0.5'
                              } mt-0.5`}></div>
                            </div>
                          </label>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex-shrink-0 bg-slate-50">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-slate-600">
              Custom overrides will take precedence over role-based permissions
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2.5 text-slate-700 font-medium hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPermissionsModal;
