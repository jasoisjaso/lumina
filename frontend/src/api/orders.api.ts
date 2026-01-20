import apiClient from './axios.config';

/**
 * Orders API
 * Handles WooCommerce order operations
 */

export interface Order {
  id: number;
  family_id: number;
  woocommerce_order_id: number;
  status: string;
  date_created: string;
  date_modified: string | null;
  customer_name: string;
  total: number;
  raw_data: any;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrdersParams {
  status?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}

export interface OrderStats {
  total_orders: number;
  pending: number | null;
  processing: number | null;
  completed: number | null;
  cancelled: number | null;
  total_revenue: number | null;
  last_sync: string | null;
}

export interface SyncResult {
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  errors: string[];
}

export interface SyncStatus {
  running: boolean;
  syncing: boolean;
  intervalMinutes: number;
}

export const ordersAPI = {
  /**
   * Get list of orders
   */
  async getOrders(params?: OrdersParams): Promise<{ orders: Order[]; count: number }> {
    const response = await apiClient.get<{ orders: Order[]; count: number }>('/orders', {
      params,
    });
    return response.data;
  },

  /**
   * Get order statistics
   */
  async getStats(): Promise<{ stats: OrderStats }> {
    const response = await apiClient.get<{ stats: OrderStats }>('/orders/stats');
    return response.data;
  },

  /**
   * Get order by ID
   */
  async getOrder(id: number): Promise<{ order: Order }> {
    const response = await apiClient.get<{ order: Order }>(`/orders/${id}`);
    return response.data;
  },

  /**
   * Update order status
   */
  async updateStatus(id: number, status: string): Promise<{ message: string; order: Order }> {
    const response = await apiClient.put<{ message: string; order: Order }>(
      `/orders/${id}/status`,
      { status }
    );
    return response.data;
  },

  /**
   * Trigger manual sync
   */
  async syncOrders(daysBack?: number): Promise<{ message: string; result: SyncResult }> {
    const response = await apiClient.post<{ message: string; result: SyncResult }>(
      '/orders/sync',
      { daysBack }
    );
    return response.data;
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ syncJob: SyncStatus; woocommerceConfigured: boolean }> {
    const response = await apiClient.get<{
      syncJob: SyncStatus;
      woocommerceConfigured: boolean;
    }>('/orders/sync/status');
    return response.data;
  },
};

export default ordersAPI;
