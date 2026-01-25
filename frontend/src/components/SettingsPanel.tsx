import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settings.store';
import { settingsAPI } from '../api/settings.api';
import { weatherAPI } from '../api/weather.api';
import { icloudCalendarAPI } from '../api/icloud-calendar.api';
import { ordersAPI } from '../api/orders.api';
import UserManagement from './UserManagement';
import ServerStats from './admin/ServerStats';
import ErrorLogViewer from './admin/ErrorLogViewer';
import CalendarSharingSettings from './CalendarSharingSettings';
import GoogleCalendarSetup from './GoogleCalendarSetup';
import { useAuthStore } from '../stores/auth.store';
import usersAPI from '../api/users.api';
import userSettingsAPI from '../api/user-settings.api';

interface SettingsPanelProps {
  onClose: () => void;
  onError?: (error: string) => void;
}

type TabType = 'profile' | 'integrations' | 'features' | 'calendar' | 'members' | 'admin';

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, onError }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; ordersProcessed?: number } | null>(null);

  const { integrations, features, calendar, updateIntegrations, updateFeatures, updateCalendar } =
    useSettingsStore();

  // Local state for form inputs
  const [wcEnabled, setWcEnabled] = useState(integrations.woocommerce?.enabled || false);
  const [wcStoreUrl, setWcStoreUrl] = useState(integrations.woocommerce?.storeUrl || '');
  const [wcConsumerKey, setWcConsumerKey] = useState(integrations.woocommerce?.consumerKey || '');
  const [wcConsumerSecret, setWcConsumerSecret] = useState(
    integrations.woocommerce?.consumerSecret || ''
  );

  const [choresEnabled, setChoresEnabled] = useState(features.chores?.enabled || false);

  // Weather Widget settings
  const [weatherEnabled, setWeatherEnabled] = useState(features.weather?.enabled || false);
  const [weatherApiKey, setWeatherApiKey] = useState(features.weather?.apiKey || '');
  const [weatherLocation, setWeatherLocation] = useState(features.weather?.location || '');
  const [weatherUnits, setWeatherUnits] = useState<'metric' | 'imperial'>(
    features.weather?.units || 'metric'
  );
  const [showApiKey, setShowApiKey] = useState(false);

  // Google Calendar settings
  const [gcEnabled, setGcEnabled] = useState(integrations.googleCalendar?.enabled || false);

  // iCloud Calendar settings
  const [icEnabled, setIcEnabled] = useState(integrations.icloudCalendar?.enabled || false);
  const [icAppleId, setIcAppleId] = useState(integrations.icloudCalendar?.appleId || '');
  const [icAppPassword, setIcAppPassword] = useState(integrations.icloudCalendar?.appPassword || '');
  const [icCalendarUrl, setIcCalendarUrl] = useState(integrations.icloudCalendar?.calendarUrl || '');
  const [showIcPassword, setShowIcPassword] = useState(false);

  // Photo Gallery settings
  const [photoGalleryEnabled, setPhotoGalleryEnabled] = useState(features.photoGallery?.enabled || false);

  useEffect(() => {
    // Update local state when store changes
    setWcEnabled(integrations.woocommerce?.enabled || false);
    setWcStoreUrl(integrations.woocommerce?.storeUrl || '');
    setWcConsumerKey(integrations.woocommerce?.consumerKey || '');
    setWcConsumerSecret(integrations.woocommerce?.consumerSecret || '');
    setChoresEnabled(features.chores?.enabled || false);
    setWeatherEnabled(features.weather?.enabled || false);
    setWeatherApiKey(features.weather?.apiKey || '');
    setWeatherLocation(features.weather?.location || '');
    setWeatherUnits(features.weather?.units || 'metric');
    setGcEnabled(integrations.googleCalendar?.enabled || false);
    setIcEnabled(integrations.icloudCalendar?.enabled || false);
    setIcAppleId(integrations.icloudCalendar?.appleId || '');
    setIcAppPassword(integrations.icloudCalendar?.appPassword || '');
    setIcCalendarUrl(integrations.icloudCalendar?.calendarUrl || '');
    setPhotoGalleryEnabled(features.photoGallery?.enabled || false);
  }, [integrations, features]);

  const handleSaveIntegrations = async () => {
    try {
      setIsSaving(true);
      setTestResult(null);

      const updatedIntegrations = {
        ...integrations,
        woocommerce: {
          enabled: wcEnabled,
          storeUrl: wcStoreUrl,
          consumerKey: wcConsumerKey,
          consumerSecret: wcConsumerSecret,
        },
        googleCalendar: {
          enabled: gcEnabled,
          connected: integrations.googleCalendar?.connected || false,
        },
        icloudCalendar: {
          enabled: icEnabled,
          appleId: icAppleId,
          appPassword: icAppPassword,
          calendarUrl: icCalendarUrl,
        },
      };

      await updateIntegrations(updatedIntegrations);

      // Clear feature status cache so it refreshes on reload
      sessionStorage.removeItem('lumina_features_status');

      // Reload page to refresh settings
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      onError?.(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWooCommerce = async () => {
    if (!wcStoreUrl || !wcConsumerKey || !wcConsumerSecret) {
      setTestResult({
        success: false,
        message: 'Please fill in all WooCommerce fields',
      });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);

      const result = await settingsAPI.testIntegration('woocommerce', {
        storeUrl: wcStoreUrl,
        consumerKey: wcConsumerKey,
        consumerSecret: wcConsumerSecret,
      });

      setTestResult(result);

      // Auto-enable WooCommerce on successful connection
      if (result.success) {
        setWcEnabled(true);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);

      const response = await ordersAPI.syncOrders(30);

      setSyncResult({
        success: true,
        message: `Successfully synced ${response.result.ordersProcessed} orders (${response.result.ordersCreated} new, ${response.result.ordersUpdated} updated)`,
        ordersProcessed: response.result.ordersProcessed,
      });
    } catch (error: any) {
      setSyncResult({
        success: false,
        message: error.response?.data?.message || 'Sync failed',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestWeather = async () => {
    if (!weatherApiKey || !weatherLocation) {
      setTestResult({
        success: false,
        message: 'Please fill in API Key and Location fields',
      });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);

      const result = await weatherAPI.testApiConnection(weatherApiKey, weatherLocation);

      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestICloud = async () => {
    if (!icAppleId || !icAppPassword) {
      setTestResult({
        success: false,
        message: 'Please fill in Apple ID and App-Specific Password',
      });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);

      const result = await icloudCalendarAPI.testConnection(icAppleId, icAppPassword);

      // Auto-fill calendar URL if discovered
      if (result.success && result.calendarUrl) {
        setIcCalendarUrl(result.calendarUrl);
      }

      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveFeatures = async () => {
    try {
      setIsSaving(true);

      const updatedFeatures = {
        ...features,
        chores: {
          ...features.chores,
          enabled: choresEnabled,
        },
        weather: {
          enabled: weatherEnabled,
          apiKey: weatherApiKey,
          location: weatherLocation,
          units: weatherUnits,
        },
        photoGallery: {
          ...features.photoGallery,
          enabled: photoGalleryEnabled,
        },
      };

      await updateFeatures(updatedFeatures);

      // Clear feature status cache so it refreshes on reload
      sessionStorage.removeItem('lumina_features_status');

      // Reload page to refresh weather widget and other feature-dependent components
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      onError?.(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'My Profile', icon: '👤' },
    { id: 'integrations' as TabType, label: 'Integrations', icon: '🔌' },
    { id: 'features' as TabType, label: 'Features', icon: '✨' },
    { id: 'calendar' as TabType, label: 'Calendar', icon: '📅' },
    { id: 'members' as TabType, label: 'Family Members', icon: '👥' },
    { id: 'admin' as TabType, label: 'Admin', icon: '⚙️' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-end sm:items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl sm:mx-4 max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Settings</h2>
              <p className="text-sm text-slate-500">Configure your dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-slate-100"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 overflow-x-auto bg-white relative z-10 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative z-0">
          {/* Profile Tab */}
          {activeTab === 'profile' && <ProfileTabContent onError={onError} />}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              {/* WooCommerce Integration */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        WooCommerce Order Dashboard
                      </h3>
                      <p className="text-sm text-slate-600">Sync and manage your store orders</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wcEnabled}
                      onChange={(e) => setWcEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {wcEnabled && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Store URL *
                      </label>
                      <input
                        type="url"
                        value={wcStoreUrl}
                        onChange={(e) => setWcStoreUrl(e.target.value)}
                        placeholder="https://your-store.com"
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Consumer Key *
                      </label>
                      <input
                        type="text"
                        value={wcConsumerKey}
                        onChange={(e) => setWcConsumerKey(e.target.value)}
                        placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Consumer Secret *
                      </label>
                      <input
                        type="password"
                        value={wcConsumerSecret}
                        onChange={(e) => setWcConsumerSecret(e.target.value)}
                        placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
                      />
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <svg
                        className="w-5 h-5 text-blue-600 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">How to get API credentials:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-700">
                          <li>Go to WooCommerce → Settings → Advanced → REST API</li>
                          <li>Click "Add key" and select Read/Write permissions</li>
                          <li>Copy the Consumer Key and Consumer Secret</li>
                        </ol>
                      </div>
                    </div>

                    {testResult && (
                      <div
                        className={`p-4 rounded-lg border ${
                          testResult.success
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {testResult.success ? (
                            <svg
                              className="w-5 h-5 text-emerald-600"
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
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                          <p
                            className={`text-sm font-medium ${
                              testResult.success ? 'text-emerald-800' : 'text-red-800'
                            }`}
                          >
                            {testResult.message}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleTestWooCommerce}
                      disabled={isTesting}
                      className="w-full py-2 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isTesting ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>

                    {/* Sync Now button - only show if WooCommerce is enabled and connected */}
                    {wcEnabled && testResult?.success && (
                      <>
                        {syncResult && (
                          <div
                            className={`p-4 rounded-lg border ${
                              syncResult.success
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              {syncResult.success ? (
                                <svg
                                  className="w-5 h-5 text-emerald-600"
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
                              ) : (
                                <svg
                                  className="w-5 h-5 text-red-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              )}
                              <p
                                className={`text-sm font-medium ${
                                  syncResult.success ? 'text-emerald-800' : 'text-red-800'
                                }`}
                              >
                                {syncResult.message}
                              </p>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={handleSyncNow}
                          disabled={isSyncing}
                          className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          {isSyncing ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              <span>Syncing Orders...</span>
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              <span>Sync Orders Now</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-start space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <svg
                            className="w-5 h-5 text-indigo-600 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="text-sm text-indigo-800">
                            <p className="font-medium">Automatic Sync</p>
                            <p className="text-indigo-700">
                              Orders are automatically synced every 30 minutes. Use "Sync Orders Now" to manually trigger a sync of the last 30 days of orders.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              {/* Chores System */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Chores System</h3>
                      <p className="text-sm text-slate-600">
                        Gamified task management for your family
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={choresEnabled}
                      onChange={(e) => setChoresEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <svg
                    className="w-5 h-5 text-amber-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Coming Soon</p>
                    <p className="text-amber-700">
                      Full chores widget implementation is planned for the next release
                    </p>
                  </div>
                </div>
              </div>

              {/* Weather Widget */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-sky-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Weather Widget</h3>
                      <p className="text-sm text-slate-600">
                        Display current weather in your dashboard header
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weatherEnabled}
                      onChange={(e) => setWeatherEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {weatherEnabled && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        OpenWeatherMap API Key *
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={weatherApiKey}
                          onChange={(e) => setWeatherApiKey(e.target.value)}
                          placeholder="Enter your API key"
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showApiKey ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Location *
                      </label>
                      <input
                        type="text"
                        value={weatherLocation}
                        onChange={(e) => setWeatherLocation(e.target.value)}
                        placeholder="e.g., San Francisco or London,GB"
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Temperature Units
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            value="metric"
                            checked={weatherUnits === 'metric'}
                            onChange={(e) => setWeatherUnits(e.target.value as 'metric' | 'imperial')}
                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-slate-700">Celsius (°C)</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            value="imperial"
                            checked={weatherUnits === 'imperial'}
                            onChange={(e) => setWeatherUnits(e.target.value as 'metric' | 'imperial')}
                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-slate-700">Fahrenheit (°F)</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <svg
                        className="w-5 h-5 text-blue-600 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">How to get your API key:</p>
                        <ol className="list-decimal list-inside space-y-1 text-blue-700">
                          <li>
                            Go to{' '}
                            <a
                              href="https://openweathermap.org/api"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-blue-900"
                            >
                              openweathermap.org/api
                            </a>
                          </li>
                          <li>Sign up for a free account (1,000 calls/day)</li>
                          <li>Generate an API key in your account dashboard</li>
                          <li>Copy and paste the key above</li>
                        </ol>
                      </div>
                    </div>

                    {testResult && (
                      <div
                        className={`p-4 rounded-lg border ${
                          testResult.success
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {testResult.success ? (
                            <svg
                              className="w-5 h-5 text-emerald-600"
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
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                testResult.success ? 'text-emerald-800' : 'text-red-800'
                              }`}
                            >
                              {testResult.message}
                            </p>
                            {testResult.success && testResult.data && (
                              <p className="text-xs text-emerald-700 mt-1">
                                {testResult.data.location}, {testResult.data.country} -{' '}
                                {testResult.data.temperature}°{weatherUnits === 'metric' ? 'C' : 'F'}{' '}
                                ({testResult.data.condition})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleTestWeather}
                      disabled={isTesting}
                      className="w-full py-2 px-4 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isTesting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Photo Gallery */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-pink-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Photo Gallery</h3>
                      <p className="text-sm text-slate-600">
                        Upload and manage family photos locally
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={photoGalleryEnabled}
                      onChange={(e) => setPhotoGalleryEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {photoGalleryEnabled && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <svg
                        className="w-5 h-5 text-green-600 mt-0.5"
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
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">Photo Gallery Features:</p>
                        <ul className="list-disc list-inside space-y-1 text-green-700">
                          <li>Upload photos (JPEG, PNG, GIF, WebP)</li>
                          <li>Automatic thumbnail and medium-size generation</li>
                          <li>Organize photos into albums</li>
                          <li>Photo rotation and metadata editing</li>
                          <li>Maximum upload size: 10MB per photo</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <svg
                        className="w-5 h-5 text-blue-600 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium">Local Storage</p>
                        <p className="text-blue-700">
                          Photos are stored locally on your device. Future updates will support Google Photos and Immich integration.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              {/* Google Calendar Integration */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Calendar Sync</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Connect your Google Calendar to display events alongside orders
                </p>
                <p className="text-xs text-slate-500 mb-6">
                  Note: Google Calendar sync is managed per-user via the sidebar. Each family member
                  can connect their own Google account. The toggle below controls whether Google
                  Calendar events are displayed on the calendar.
                </p>

                <div className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">Show Google Calendar Events</p>
                        <p className="text-xs text-slate-600">Display synced Google Calendar events</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gcEnabled}
                        onChange={(e) => setGcEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {gcEnabled && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-800">
                        ℹ️ To connect your Google Calendar, click the Google Calendar button in the sidebar
                        on the main calendar view.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* iCloud Calendar Integration */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">iCloud Calendar</h3>
                      <p className="text-sm text-slate-600">Sync events from your iCloud calendar</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={icEnabled}
                      onChange={(e) => setIcEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {icEnabled && (
                  <div className="space-y-4 mt-4 pt-4 border-t border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Apple ID *
                      </label>
                      <input
                        type="email"
                        value={icAppleId}
                        onChange={(e) => setIcAppleId(e.target.value)}
                        placeholder="your@icloud.com"
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        App-Specific Password *
                      </label>
                      <div className="relative">
                        <input
                          type={showIcPassword ? 'text' : 'password'}
                          value={icAppPassword}
                          onChange={(e) => setIcAppPassword(e.target.value)}
                          placeholder="xxxx-xxxx-xxxx-xxxx"
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowIcPassword(!showIcPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showIcPassword ? (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <svg
                        className="w-5 h-5 text-purple-600 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="text-sm text-purple-800">
                        <p className="font-medium mb-1">How to create an App-Specific Password:</p>
                        <ol className="list-decimal list-inside space-y-1 text-purple-700">
                          <li>Go to appleid.apple.com and sign in</li>
                          <li>Navigate to Security → App-Specific Passwords</li>
                          <li>Click "Generate Password" and give it a name (e.g., "Lumina")</li>
                          <li>Copy the generated password and paste it above</li>
                        </ol>
                      </div>
                    </div>

                    {testResult && (
                      <div
                        className={`p-4 rounded-lg border ${
                          testResult.success
                            ? 'bg-emerald-50 border-emerald-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {testResult.success ? (
                            <svg
                              className="w-5 h-5 text-emerald-600"
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
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                          <p
                            className={`text-sm font-medium ${
                              testResult.success ? 'text-emerald-800' : 'text-red-800'
                            }`}
                          >
                            {testResult.message}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleTestICloud}
                      disabled={isTesting}
                      className="w-full py-2 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {isTesting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          <span>Connect to iCloud</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Calendar Preferences Placeholder */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Calendar Preferences
                </h3>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-blue-800">
                    Calendar customization options coming soon
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Family Members Tab */}
          {activeTab === 'members' && (
            <UserManagement onError={onError} />
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">⚙️</span>
                  <h3 className="text-xl font-semibold text-gray-900">Admin Dashboard</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Monitor server health and system logs. Admin access required.
                </p>
              </div>

              {/* Server Stats */}
              <ServerStats />

              {/* Error Logs */}
              <ErrorLogViewer />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {activeTab === 'profile' || activeTab === 'members' || activeTab === 'admin' ? 'Close' : 'Cancel'}
            </button>
            {activeTab !== 'profile' && activeTab !== 'members' && activeTab !== 'admin' && (
              <button
                onClick={
                  activeTab === 'integrations'
                    ? handleSaveIntegrations
                    : activeTab === 'features'
                    ? handleSaveFeatures
                    : activeTab === 'calendar'
                    ? handleSaveIntegrations
                    : () => {}
                }
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Content Component with Sub-tabs
const ProfileTabContent: React.FC<{ onError?: (error: string) => void }> = ({ onError }) => {
  type ProfileSubTab = 'account' | 'my-integrations' | 'sharing' | 'preferences';
  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('account');

  const subTabs = [
    { id: 'account' as ProfileSubTab, label: 'Account', icon: '👤' },
    { id: 'my-integrations' as ProfileSubTab, label: 'My Integrations', icon: '🔗' },
    { id: 'sharing' as ProfileSubTab, label: 'Sharing', icon: '🔄' },
    { id: 'preferences' as ProfileSubTab, label: 'Preferences', icon: '⚙️' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex border-b border-slate-200 -mx-6 px-6 overflow-x-auto">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <span className="mr-1.5">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'account' && <AccountTabContent />}
      {activeSubTab === 'my-integrations' && <MyIntegrationsTabContent />}
      {activeSubTab === 'sharing' && <CalendarSharingSettings />}
      {activeSubTab === 'preferences' && <PreferencesTabContent />}
    </div>
  );
};

// Account Tab Content
const AccountTabContent: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuthStore();

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
    <div className="space-y-8">
      {/* Profile Information */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h3>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter first name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
        {passwordMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            passwordMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {passwordMessage.text}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
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

// My Integrations Tab Content
const MyIntegrationsTabContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Google Calendar</h3>
        <GoogleCalendarSetup />
      </div>

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

// Preferences Tab Content
const PreferencesTabContent: React.FC = () => {
  const [timezone, setTimezone] = useState('UTC');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [canViewOrders, setCanViewOrders] = useState(false);
  const [canManageOrders, setCanManageOrders] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { user } = useAuthStore();

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const prefsData = await userSettingsAPI.getPreferences();
      setTimezone(prefsData.timezone || 'UTC');
      setEmailNotifications(prefsData.notifications?.email ?? true);
      setPushNotifications(prefsData.notifications?.push ?? false);

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
    <div className="space-y-8">
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* General Preferences */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">General Preferences</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
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
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Notifications</h3>
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

      {/* Feature Permissions */}
      <div className="pt-8 border-t border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Feature Access</h3>
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

export default SettingsPanel;
