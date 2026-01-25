import React, { useState, useEffect } from 'react';
import CalendarSharingSettings from './CalendarSharingSettings';
import GoogleCalendarSetup from './GoogleCalendarSetup';
import { useAuthStore } from '../stores/auth.store';
import usersAPI from '../api/users.api';
import userSettingsAPI from '../api/user-settings.api';

/**
 * User Profile Component
 * Comprehensive user profile area with tabs for Account, Integrations, Sharing, and Preferences
 */

type ProfileTab = 'account' | 'integrations' | 'sharing' | 'preferences';

export const UserProfile: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('account');

  const tabs = [
    { id: 'account' as ProfileTab, label: 'My Account', icon: 'user' },
    { id: 'integrations' as ProfileTab, label: 'My Integrations', icon: 'link' },
    { id: 'sharing' as ProfileTab, label: 'Calendar Sharing', icon: 'share' },
    { id: 'preferences' as ProfileTab, label: 'Preferences', icon: 'settings' },
  ];

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'user':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'link':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case 'share':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountTab />;
      case 'integrations':
        return <IntegrationsTab />;
      case 'sharing':
        return <CalendarSharingSettings />;
      case 'preferences':
        return <PreferencesTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-2 text-slate-600">Manage your account settings, integrations, and preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {renderIcon(tab.icon)}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Account Tab Component
const AccountTab: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Add loading and message states
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get current user from auth store
  const { user } = useAuthStore();

  // Load user data on mount
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      await usersAPI.updateProfile(user.id, {
        firstName,
        lastName,
        email,
      });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    // Frontend validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      await usersAPI.changePassword(user.id, {
        currentPassword,
        newPassword,
      });

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to change password'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Information */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Profile Information</h2>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter last name"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={loading}
            className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Change Password */}
      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Change Password</h2>

        {/* Password Success/Error Message */}
        {passwordMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            passwordMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {passwordMessage.text}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter new password"
            />
            <p className="mt-1 text-sm text-slate-600">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>
          <button
            onClick={handleChangePassword}
            disabled={passwordLoading}
            className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Integrations Tab Component
const IntegrationsTab: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">My Integrations</h2>
        <p className="text-slate-600">
          Connect your personal accounts to sync calendars, photos, and more.
        </p>
      </div>

      {/* Google Calendar Integration */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Google Calendar</h3>
        <GoogleCalendarSetup />
      </div>

      {/* iCloud Calendar - Coming Soon */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 opacity-60">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">iCloud Calendar</h3>
            <p className="text-sm text-slate-600 mt-1">Sync your iCloud calendar events</p>
          </div>
          <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-full">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Photo Sync - Coming Soon */}
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 opacity-60">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Photo Sync</h3>
            <p className="text-sm text-slate-600 mt-1">Automatically sync photos from Google Photos or iCloud</p>
          </div>
          <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-full">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
};

// Preferences Tab Component
const PreferencesTab: React.FC = () => {
  const [timezone, setTimezone] = useState('UTC');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);

  // Add permission state
  const [canViewOrders, setCanViewOrders] = useState(false);
  const [canManageOrders, setCanManageOrders] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuthStore();

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load user settings
      const prefsData = await userSettingsAPI.getPreferences();

      setTimezone(prefsData.timezone || 'UTC');
      setEmailNotifications(prefsData.notifications?.email ?? true);
      setPushNotifications(prefsData.notifications?.push ?? false);

      // Load user permissions
      const permissionsResponse = await usersAPI.getUserPermissions(user.id);
      const userPermissions = permissionsResponse.permissions;

      setCanViewOrders(userPermissions.includes('view_orders'));
      setCanManageOrders(userPermissions.includes('manage_orders'));
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // Save user settings (preferences)
      await userSettingsAPI.updatePreferences({
        timezone,
        notifications: {
          email: emailNotifications,
          push: pushNotifications,
        },
      });

      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save preferences'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Success/Error Message */}
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* General Preferences */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">General Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Australia/Sydney">Sydney</option>
              <option value="Australia/Melbourne">Melbourne</option>
              <option value="Australia/Brisbane">Brisbane</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Notifications</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <p className="font-medium text-slate-900">Email Notifications</p>
              <p className="text-sm text-slate-600">Receive email updates about events and orders</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(e) => setEmailNotifications(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-indigo-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform transform ${emailNotifications ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <p className="font-medium text-slate-900">Push Notifications</p>
              <p className="text-sm text-slate-600">Receive push notifications on your devices</p>
            </div>
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(e) => setPushNotifications(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-indigo-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform transform ${pushNotifications ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
            </div>
          </label>
        </div>
      </div>

      {/* Feature Permissions - READ ONLY for non-admins */}
      <div className="pt-8 border-t border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Feature Access</h2>
        <p className="text-sm text-slate-600 mb-4">
          Your current access permissions. Contact an admin to request changes.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">WooCommerce Workflow Access</p>
              <p className="text-sm text-slate-600">
                {canManageOrders
                  ? 'You can view and edit orders'
                  : canViewOrders
                    ? 'You can view orders (read-only)'
                    : 'You cannot access the workflow board'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  canManageOrders
                    ? 'bg-green-100 text-green-800'
                    : canViewOrders
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {canManageOrders ? 'Full Access' : canViewOrders ? 'View Only' : 'No Access'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSavePreferences}
        disabled={saving}
        className="px-4 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
};

export default UserProfile;
