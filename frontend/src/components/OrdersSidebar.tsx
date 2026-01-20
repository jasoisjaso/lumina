import React, { useState, useEffect } from 'react';
import { ordersAPI, Order, OrderStats } from '../api/orders.api';
import { calendarSyncAPI, SyncStatus } from '../api/calendar-sync.api';
import { useSettingsStore } from '../stores/settings.store';
import GoogleCalendarSetup from './GoogleCalendarSetup';

interface OrdersSidebarProps {
  onOrderClick?: (order: Order) => void;
  onError?: (error: string) => void;
}

const OrdersSidebar: React.FC<OrdersSidebarProps> = ({ onOrderClick, onError }) => {
  const { integrations, isInitialized } = useSettingsStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<SyncStatus | null>(null);

  // Check if WooCommerce is enabled
  const isWooCommerceEnabled = integrations?.woocommerce?.enabled || false;

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const response = await ordersAPI.getOrders({
        orderBy: 'date_created',
        order: 'desc',
        limit: 20,
      });
      setOrders(response.orders);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load orders';
      onError?.(errorMessage);
      console.error('Load orders error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await ordersAPI.getStats();
      setStats(response.stats);
    } catch (err: any) {
      console.error('Load stats error:', err);
    }
  };

  const loadGoogleStatus = async () => {
    try {
      const response = await calendarSyncAPI.getGoogleStatus();
      setGoogleStatus(response.status);
    } catch (err: any) {
      console.error('Load Google status error:', err);
    }
  };

  useEffect(() => {
    // Only load orders if WooCommerce is enabled
    if (isInitialized && isWooCommerceEnabled) {
      loadOrders();
      loadStats();
    }
    loadGoogleStatus();
  }, [isInitialized, isWooCommerceEnabled]);

  // If WooCommerce is not enabled, show minimal sidebar with Calendar Sync and Quick Add button
  if (!isWooCommerceEnabled) {
    return (
      <div className="h-full flex flex-col space-y-6">
        {/* WooCommerce Setup Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
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
            <div>
              <h3 className="text-sm font-medium text-amber-800">WooCommerce Not Connected</h3>
              <p className="text-xs text-amber-700 mt-1">
                Enable WooCommerce in Settings to view and manage your store orders here.
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Sync Section */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
            Calendar Sync
          </h3>
          <button
            onClick={() => setShowGoogleSetup(true)}
            className={`w-full p-4 rounded-xl border transition-all ${
              googleStatus?.connected
                ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  googleStatus?.connected ? 'bg-emerald-100' : 'bg-blue-100'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-800">Google Calendar</p>
                <p className="text-xs text-slate-600">
                  {googleStatus?.connected
                    ? `${googleStatus.eventCount} events synced`
                    : 'Not connected'}
                </p>
              </div>
              {googleStatus?.connected ? (
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Quick Add Button */}
        <button
          onClick={() => onError?.('Quick Add Event feature coming soon! For now, you can create events in Google Calendar and they will sync automatically.')}
          className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
        >
          + Quick Add Event
        </button>

        {/* Google Calendar Setup Modal */}
        {showGoogleSetup && (
          <GoogleCalendarSetup
            onClose={() => setShowGoogleSetup(false)}
            onSuccess={() => {
              setShowGoogleSetup(false);
              loadGoogleStatus();
            }}
            onError={(error) => {
              onError?.(error);
            }}
          />
        )}
      </div>
    );
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await ordersAPI.syncOrders();
      await loadOrders();
      await loadStats();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to sync orders';
      onError?.(errorMessage);
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'processing':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'pending':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⟳';
      case 'pending':
        return '○';
      case 'cancelled':
      case 'failed':
        return '✕';
      default:
        return '•';
    }
  };

  const getTodayOrders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter((order) => {
      const orderDate = new Date(order.date_created);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    });
  };

  const todayOrders = getTodayOrders();

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Orders</h2>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          title="Sync with WooCommerce"
        >
          <svg
            className={`w-5 h-5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`}
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
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.total_orders}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Revenue</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">
              ${(stats.total_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pending || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Processing</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.processing || 0}</p>
          </div>
        </div>
      )}

      {/* Calendar Sync Section */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Calendar Sync
        </h3>
        <button
          onClick={() => setShowGoogleSetup(true)}
          className={`w-full p-4 rounded-xl border transition-all ${
            googleStatus?.connected
              ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                googleStatus?.connected ? 'bg-emerald-100' : 'bg-blue-100'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-800">Google Calendar</p>
              <p className="text-xs text-slate-600">
                {googleStatus?.connected
                  ? `${googleStatus.eventCount} events synced`
                  : 'Not connected'}
              </p>
            </div>
            {googleStatus?.connected ? (
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </button>
      </div>

      {/* Today's Orders Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Today's Orders
          </h3>
          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
            {todayOrders.length}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-100 rounded-lg h-24 animate-pulse" />
            ))}
          </div>
        ) : todayOrders.length === 0 ? (
          <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
            <svg
              className="w-12 h-12 text-slate-300 mx-auto mb-2"
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
            <p className="text-sm text-slate-500">No orders today</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => onOrderClick?.(order)}
                className="bg-white rounded-lg p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium text-emerald-600">
                        🛒 Order #{order.woocommerce_order_id}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {order.customer_name}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusIcon(order.status)} {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-900">
                    ${order.total.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(order.date_created).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Orders Section */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          Recent Orders
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-100 rounded-lg h-16 animate-pulse" />
            ))}
          </div>
        ) : orders.filter((o) => !todayOrders.includes(o)).length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-slate-400">No recent orders</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders
              .filter((o) => !todayOrders.includes(o))
              .slice(0, 10)
              .map((order) => (
                <div
                  key={order.id}
                  onClick={() => onOrderClick?.(order)}
                  className="bg-white rounded-lg p-3 border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">
                      #{order.woocommerce_order_id}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-xs font-medium rounded ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusIcon(order.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 truncate mb-1">{order.customer_name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      ${order.total.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(order.date_created).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      <button
        onClick={() => onError?.('Quick Add Event feature coming soon! For now, you can create events in Google Calendar and they will sync automatically.')}
        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
      >
        + Quick Add Event
      </button>

      {/* Google Calendar Setup Modal */}
      {showGoogleSetup && (
        <GoogleCalendarSetup
          onClose={() => setShowGoogleSetup(false)}
          onSuccess={() => {
            setShowGoogleSetup(false);
            loadGoogleStatus();
          }}
          onError={(error) => {
            onError?.(error);
          }}
        />
      )}
    </div>
  );
};

export default OrdersSidebar;
