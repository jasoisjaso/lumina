import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { calendarSyncAPI, SyncStatus } from '../api/calendar-sync.api';

interface GoogleCalendarSetupProps {
  onClose?: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const GoogleCalendarSetup: React.FC<GoogleCalendarSetupProps> = ({
  onClose,
  onSuccess,
  onError,
}) => {
  const [step, setStep] = useState<'intro' | 'connecting' | 'syncing' | 'success'>('intro');
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    // Listen for OAuth callback
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'GOOGLE_CALENDAR_OAUTH') {
        const { code } = event.data;
        if (code) {
          await handleOAuthCallback(code);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await calendarSyncAPI.getGoogleStatus();
      setStatus(response.status);
    } catch (err: any) {
      console.error('Check status error:', err);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setStep('connecting');

      // Get authorization URL
      const response = await calendarSyncAPI.getGoogleAuthUrl();

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        response.authUrl,
        'Google Calendar Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      setAuthWindow(popup);

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          setAuthWindow(null);
          if (step === 'connecting') {
            setStep('intro');
            setIsLoading(false);
            onError?.('Authorization cancelled');
          }
        }
      }, 500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to start authorization';
      onError?.(errorMessage);
      setStep('intro');
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    try {
      setStep('syncing');
      setIsLoading(true);

      // Close auth popup
      if (authWindow) {
        authWindow.close();
      }

      // Complete OAuth and sync
      const response = await calendarSyncAPI.completeGoogleAuth(code);

      setStep('success');
      await checkStatus();

      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to connect Google Calendar';
      onError?.(errorMessage);
      setStep('intro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar?')) {
      return;
    }

    try {
      setIsLoading(true);
      await calendarSyncAPI.disconnectGoogle();
      await checkStatus();
      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to disconnect';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setIsLoading(true);
      await calendarSyncAPI.syncGoogleCalendar();
      await checkStatus();
      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to sync calendar';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Render modal at document root to escape any stacking contexts
  return createPortal(
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center backdrop-blur-sm" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Google Calendar</h2>
              <p className="text-sm text-slate-500">Sync your calendar events</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
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
          )}
        </div>

        {/* Status - Connected */}
        {status?.connected && step === 'intro' && (
          <div className="space-y-6">
            <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-200">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
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
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-emerald-900 mb-1">Connected</h3>
                  <p className="text-sm text-emerald-700">
                    Your Google Calendar is syncing automatically
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Events Synced</p>
                  <p className="text-2xl font-bold text-slate-800">{status.eventCount}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Last Synced</p>
                  <p className="text-sm font-medium text-slate-800">
                    {status.lastSynced
                      ? new Date(status.lastSynced).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSync}
                disabled={isLoading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <svg
                  className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
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
                <span>Sync Now</span>
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="px-4 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Intro Step - Not Connected */}
        {!status?.connected && step === 'intro' && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">What you'll get:</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Automatic Sync</p>
                    <p className="text-xs text-slate-600">
                      Your events sync every 30 minutes automatically
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Unified View</p>
                    <p className="text-xs text-slate-600">
                      See Google events alongside orders in one calendar
                    </p>
                  </div>
                </li>
                <li className="flex items-start space-x-3">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Read-Only Access</p>
                    <p className="text-xs text-slate-600">
                      We only read your calendar, never make changes
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <button
              onClick={handleConnect}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              <span>Connect Google Calendar</span>
            </button>
          </div>
        )}

        {/* Connecting Step */}
        {step === 'connecting' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Waiting for Authorization</h3>
            <p className="text-sm text-slate-600">Please authorize in the popup window</p>
          </div>
        )}

        {/* Syncing Step */}
        {step === 'syncing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-indigo-600 animate-spin"
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
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Syncing Your Calendar</h3>
            <p className="text-sm text-slate-600">This may take a moment...</p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Successfully Connected!</h3>
            <p className="text-sm text-slate-600">Your calendar is now syncing automatically</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default GoogleCalendarSetup;
