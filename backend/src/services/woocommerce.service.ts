import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import db from '../database/knex';
import { config } from '../config';
import { settingsService } from './settings.service';

/**
 * WooCommerce Sync Service
 * Handles syncing orders from WooCommerce API to local database cache
 */

export interface WooCommerceOrder {
  id: number;
  status: string;
  date_created: string;
  date_modified: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
  }>;
  [key: string]: any; // Allow other WooCommerce fields
}

export interface CachedOrder {
  id: number;
  family_id: number;
  woocommerce_order_id: number;
  status: string;
  date_created: Date;
  date_modified: Date | null;
  customer_name: string;
  total: number;
  raw_data: any;
  synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  ordersCreated: number;
  ordersUpdated: number;
  errors: string[];
}

class WooCommerceService {
  private api: WooCommerceRestApi | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeApi();
  }

  /**
   * Initialize WooCommerce API client
   */
  private initializeApi(): void {
    try {
      const storeUrl = config.woocommerce?.storeUrl || process.env.WC_STORE_URL;
      const consumerKey = config.woocommerce?.consumerKey || process.env.WC_CONSUMER_KEY;
      const consumerSecret = config.woocommerce?.consumerSecret || process.env.WC_CONSUMER_SECRET;

      if (!storeUrl || !consumerKey || !consumerSecret) {
        console.warn('WooCommerce credentials not configured. Sync will be disabled.');
        this.isConfigured = false;
        return;
      }

      this.api = new WooCommerceRestApi({
        url: storeUrl,
        consumerKey: consumerKey,
        consumerSecret: consumerSecret,
        version: 'wc/v3',
        queryStringAuth: true, // Force authentication via query string for HTTPS
      });

      this.isConfigured = true;
      console.log('WooCommerce API client initialized');
    } catch (error) {
      console.error('Failed to initialize WooCommerce API:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Check if WooCommerce is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured && this.api !== null;
  }

  /**
   * Get WooCommerce API client for a specific family
   * Checks family settings first, falls back to environment variables
   */
  private async getApiForFamily(familyId: number): Promise<WooCommerceRestApi | null> {
    try {
      // Check family settings first
      const integrationSettings = await settingsService.getSettings(familyId, 'integrations');
      const wcSettings = integrationSettings?.woocommerce;

      if (wcSettings && wcSettings.enabled && wcSettings.storeUrl && wcSettings.consumerKey && wcSettings.consumerSecret) {
        // Use family-specific credentials from settings
        return new WooCommerceRestApi({
          url: wcSettings.storeUrl,
          consumerKey: wcSettings.consumerKey,
          consumerSecret: wcSettings.consumerSecret,
          version: 'wc/v3',
        });
      }

      // Fall back to global API if configured
      if (this.isAvailable()) {
        return this.api;
      }

      return null;
    } catch (error) {
      console.error('Error getting API for family:', error);
      return null;
    }
  }

  /**
   * Check if WooCommerce is enabled for a family
   */
  async isEnabledForFamily(familyId: number): Promise<boolean> {
    try {
      const integrationSettings = await settingsService.getSettings(familyId, 'integrations');
      return integrationSettings?.woocommerce?.enabled === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetch orders from WooCommerce API
   */
  async fetchOrders(params: any = {}): Promise<WooCommerceOrder[]> {
    if (!this.isAvailable()) {
      throw new Error('WooCommerce API is not configured');
    }

    try {
      const response = await this.api!.get('orders', {
        per_page: 100,
        orderby: 'date',
        order: 'desc',
        ...params,
      });

      return response.data as WooCommerceOrder[];
    } catch (error: any) {
      console.error('Error fetching orders from WooCommerce:', error.response?.data || error.message);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
  }

  /**
   * Fetch a single order from WooCommerce
   */
  async fetchOrder(orderId: number): Promise<WooCommerceOrder> {
    if (!this.isAvailable()) {
      throw new Error('WooCommerce API is not configured');
    }

    try {
      const response = await this.api!.get(`orders/${orderId}`);
      return response.data as WooCommerceOrder;
    } catch (error: any) {
      console.error(`Error fetching order ${orderId}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  /**
   * Update order status in WooCommerce
   */
  async updateOrderStatus(orderId: number, status: string): Promise<WooCommerceOrder> {
    if (!this.isAvailable()) {
      throw new Error('WooCommerce API is not configured');
    }

    try {
      const response = await this.api!.put(`orders/${orderId}`, { status });
      return response.data as WooCommerceOrder;
    } catch (error: any) {
      console.error(`Error updating order ${orderId}:`, error.response?.data || error.message);
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  /**
   * Sync orders for a specific family
   */
  async syncOrdersForFamily(familyId: number, daysBack: number = 30): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      ordersProcessed: 0,
      ordersCreated: 0,
      ordersUpdated: 0,
      errors: [],
    };

    // Check if WooCommerce is enabled for this family
    const isEnabled = await this.isEnabledForFamily(familyId);
    if (!isEnabled) {
      result.success = false;
      result.errors.push('WooCommerce is not enabled for this family');
      return result;
    }

    // Get family-specific API client
    const familyApi = await this.getApiForFamily(familyId);
    if (!familyApi) {
      result.success = false;
      result.errors.push('WooCommerce API is not configured for this family');
      return result;
    }

    try {
      // Calculate date range
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch orders from WooCommerce using family API
      const response = await familyApi.get('orders', {
        after: afterDate.toISOString(),
        per_page: 100,
      });
      const orders = response.data as WooCommerceOrder[];

      console.log(`Fetched ${orders.length} orders from WooCommerce for family ${familyId}`);

      // Process each order
      for (const order of orders) {
        try {
          await this.cacheOrder(familyId, order);
          result.ordersProcessed++;
        } catch (error: any) {
          console.error(`Error processing order ${order.id}:`, error.message);
          result.errors.push(`Order ${order.id}: ${error.message}`);
        }
      }

      // Determine created vs updated
      // (This is a simplified approach; you might want to track this more precisely)
      const existingCount = await db('cached_orders')
        .where({ family_id: familyId })
        .count('id as count')
        .first();

      const existingCountNum = existingCount ? Number(existingCount.count) : 0;
      result.ordersCreated = Math.min(result.ordersProcessed, result.ordersProcessed - existingCountNum);
      result.ordersUpdated = result.ordersProcessed - result.ordersCreated;

      console.log(`Sync complete: ${result.ordersCreated} created, ${result.ordersUpdated} updated`);
    } catch (error: any) {
      console.error('Sync failed:', error.message);
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Cache a single order in the database
   */
  async cacheOrder(familyId: number, order: WooCommerceOrder): Promise<void> {
    const customerName = `${order.billing.first_name} ${order.billing.last_name}`.trim() || 'Guest';

    const orderData = {
      family_id: familyId,
      woocommerce_order_id: order.id,
      status: order.status,
      date_created: new Date(order.date_created),
      date_modified: order.date_modified ? new Date(order.date_modified) : null,
      customer_name: customerName,
      total: parseFloat(order.total),
      raw_data: JSON.stringify(order),
      synced_at: new Date(),
    };

    // Check if order already exists
    const existing = await db('cached_orders')
      .where({ woocommerce_order_id: order.id })
      .first();

    if (existing) {
      // Update existing order
      await db('cached_orders')
        .where({ woocommerce_order_id: order.id })
        .update({
          ...orderData,
          updated_at: new Date(),
        });
    } else {
      // Insert new order
      await db('cached_orders').insert(orderData);
    }
  }

  /**
   * Get cached orders for a family
   */
  async getCachedOrders(
    familyId: number,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      orderBy?: string;
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<CachedOrder[]> {
    const {
      status,
      limit = 50,
      offset = 0,
      orderBy = 'date_created',
      order = 'desc',
    } = options;

    let query = db('cached_orders').where({ family_id: familyId });

    if (status) {
      query = query.where({ status });
    }

    const orders = await query
      .orderBy(orderBy, order)
      .limit(limit)
      .offset(offset);

    return orders.map((order: any) => ({
      ...order,
      raw_data: typeof order.raw_data === 'string' ? JSON.parse(order.raw_data) : order.raw_data,
    }));
  }

  /**
   * Get a single cached order
   */
  async getCachedOrder(familyId: number, orderId: number): Promise<CachedOrder | null> {
    const order = await db('cached_orders')
      .where({ family_id: familyId, id: orderId })
      .first();

    if (!order) {
      return null;
    }

    return {
      ...order,
      raw_data: typeof order.raw_data === 'string' ? JSON.parse(order.raw_data) : order.raw_data,
    };
  }

  /**
   * Get a cached order by WooCommerce order ID
   */
  async getCachedOrderByWooCommerceId(familyId: number, woocommerceOrderId: number): Promise<CachedOrder | null> {
    const order = await db('cached_orders')
      .where({ family_id: familyId, woocommerce_order_id: woocommerceOrderId })
      .first();

    if (!order) {
      return null;
    }

    return {
      ...order,
      raw_data: typeof order.raw_data === 'string' ? JSON.parse(order.raw_data) : order.raw_data,
    };
  }

  /**
   * Update cached order and sync to WooCommerce
   */
  async updateCachedOrderStatus(familyId: number, orderId: number, newStatus: string): Promise<CachedOrder> {
    // Get cached order
    const cachedOrder = await this.getCachedOrder(familyId, orderId);
    if (!cachedOrder) {
      throw new Error('Order not found');
    }

    // Update in WooCommerce if API is available
    if (this.isAvailable()) {
      try {
        await this.updateOrderStatus(cachedOrder.woocommerce_order_id, newStatus);
      } catch (error: any) {
        console.error('Failed to update order in WooCommerce:', error.message);
        throw new Error('Failed to sync status to WooCommerce');
      }
    }

    // Update in local cache
    await db('cached_orders')
      .where({ id: orderId })
      .update({
        status: newStatus,
        date_modified: new Date(),
        updated_at: new Date(),
      });

    // Return updated order
    const updatedOrder = await this.getCachedOrder(familyId, orderId);
    if (!updatedOrder) {
      throw new Error('Failed to retrieve updated order');
    }

    return updatedOrder;
  }

  /**
   * Get order statistics for a family
   */
  async getOrderStats(familyId: number): Promise<any> {
    const stats = await db('cached_orders')
      .where({ family_id: familyId })
      .select(
        db.raw('COUNT(*) as total_orders'),
        db.raw('SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending'),
        db.raw('SUM(CASE WHEN status = "processing" THEN 1 ELSE 0 END) as processing'),
        db.raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed'),
        db.raw('SUM(CASE WHEN status = "cancelled" THEN 1 ELSE 0 END) as cancelled'),
        db.raw('SUM(total) as total_revenue'),
        db.raw('MAX(synced_at) as last_sync')
      )
      .first();

    return stats;
  }

  /**
   * Delete old cached orders (cleanup)
   */
  async cleanupOldOrders(familyId: number, daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await db('cached_orders')
      .where({ family_id: familyId })
      .where('date_created', '<', cutoffDate)
      .delete();

    console.log(`Deleted ${deleted} old orders for family ${familyId}`);
    return deleted;
  }
}

export default new WooCommerceService();
