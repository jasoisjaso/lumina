import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../api/settings.api';

interface ServerStatsData {
  uptime: {
    seconds: number;
    formatted: string;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    size: string;
    orders: number;
  };
  system: {
    platform: string;
    nodeVersion: string;
    cpus: number;
  };
  timestamp: string;
}

export const ServerStats: React.FC = () => {
  const [stats, setStats] = useState<ServerStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsAPI.getServerStats();
      setStats(response);
    } catch (err: any) {
      console.error('Failed to load server stats:', err);
      setError(err.message || 'Failed to load server stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading && !stats) {
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
          onClick={loadStats}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Server Status</h3>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {new Date(stats.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Uptime */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-2">⏱️</span>
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase">Uptime</p>
                  <p className="text-lg font-bold text-blue-900 mt-0.5">
                    {stats.uptime.formatted}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-2">💾</span>
                <div>
                  <p className="text-xs font-medium text-purple-600 uppercase">Memory</p>
                  <p className="text-lg font-bold text-purple-900 mt-0.5">
                    {stats.memory.used} MB
                  </p>
                  <p className="text-xs text-purple-600">
                    {stats.memory.percentage}% of {stats.memory.total} MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-2">🗄️</span>
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase">Database</p>
                  <p className="text-lg font-bold text-green-900 mt-0.5">
                    {stats.database.size}
                  </p>
                  <p className="text-xs text-green-600">
                    {stats.database.orders.toLocaleString()} orders
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-2xl mr-2">🖥️</span>
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase">System</p>
                  <p className="text-lg font-bold text-amber-900 mt-0.5">
                    {stats.system.cpus} CPUs
                  </p>
                  <p className="text-xs text-amber-600">
                    {stats.system.platform} • {stats.system.nodeVersion}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerStats;
