import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../api/settings.api';

interface ErrorLogsData {
  logs: string[];
  count: number;
  totalLines?: number;
  message?: string;
  error?: string;
  lastUpdated: string;
}

export const ErrorLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsAPI.getErrorLogs();
      setLogs(response);
    } catch (err: any) {
      console.error('Failed to load error logs:', err);
      setError(err.message || 'Failed to load error logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleCopy = () => {
    if (logs && logs.logs.length > 0) {
      navigator.clipboard.writeText(logs.logs.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getLogClass = (log: string): string => {
    if (log.includes('ERROR') || log.includes('error:')) {
      return 'bg-red-50 border-l-4 border-red-500 text-red-900';
    }
    if (log.includes('WARN')) {
      return 'bg-yellow-50 border-l-4 border-yellow-500 text-yellow-900';
    }
    return 'bg-gray-50 border-l-4 border-gray-500 text-gray-900';
  };

  if (loading && !logs) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
        <button
          onClick={loadLogs}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!logs) return null;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Errors & Warnings
              {logs.count > 0 && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {logs.count}
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {logs.message || `Showing ${logs.count} error/warning logs from the last ${logs.totalLines} lines`}
            </p>
            <p className="text-xs text-gray-400">
              Last updated: {new Date(logs.lastUpdated).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {logs.logs.length > 0 && (
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            )}
            <button
              onClick={loadLogs}
              disabled={loading}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Log Content */}
      <div className="p-6">
        {logs.error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">⚠️ {logs.error}</p>
          </div>
        )}

        {logs.logs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No errors found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {logs.message || 'Your server is running smoothly!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.logs.map((log, index) => (
              <div
                key={index}
                className={`${getLogClass(log)} p-3 rounded text-xs font-mono whitespace-pre-wrap break-all`}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorLogViewer;
