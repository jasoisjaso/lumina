import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import db from '../database/knex';
import { config } from '../config';
import { settingsService } from './settings.service';
import workflowService from './workflow.service';

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
  /**
   * Get WooCommerce API client for a specific family
   * Checks family settings and returns a configured client if available.
   */
  private async getApiForFamily(familyId: number): Promise<WooCommerceRestApi | null> {
    try {
      const integrationSettings = await settingsService.getSettings(familyId, 'integrations');
      const wcSettings = integrationSettings?.woocommerce;

      if (wcSettings && wcSettings.enabled && wcSettings.storeUrl && wcSettings.consumerKey && wcSettings.consumerSecret) {
        return new WooCommerceRestApi({
          url: wcSettings.storeUrl,
          consumerKey: wcSettings.consumerKey,
          consumerSecret: wcSettings.consumerSecret,
          version: 'wc/v3',
          queryStringAuth: true,
        });
      }
      return null;
    } catch (error) {
      console.error(`Error getting WooCommerce API client for family ${familyId}:`, error);
      return null;
    }
  }

  /**
   * Check if WooCommerce is properly configured and enabled for a family
   */
  async isAvailableForFamily(familyId: number): Promise<boolean> {
    const api = await this.getApiForFamily(familyId);
    return api !== null;
  }

  /**
   * Fetch orders from WooCommerce API for a specific family
   */
  async fetchOrders(familyId: number, params: any = {}): Promise<WooCommerceOrder[]> {
    const api = await this.getApiForFamily(familyId);
    if (!api) {
      throw new Error('WooCommerce API is not configured for this family');
    }

    try {
      const response = await api.get('orders', {
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
   * Update order status in WooCommerce for a specific family
   */
  async updateOrderStatus(familyId: number, orderId: number, status: string): Promise<WooCommerceOrder> {
    const api = await this.getApiForFamily(familyId);
    if (!api) {
      throw new Error('WooCommerce API is not configured for this family');
    }

    try {
      const response = await api.put(`orders/${orderId}`, { status });
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

    const familyApi = await this.getApiForFamily(familyId);
    if (!familyApi) {
      result.success = false;
      result.errors.push('WooCommerce is not configured for this family.');
      return result;
    }

    try {
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch orders with status=any to get ALL statuses including custom ones from Order Status Manager plugin
      const response = await familyApi.get('orders', {
        after: afterDate.toISOString(),
        per_page: 100,
        status: 'any', // This will include custom statuses from plugins
      });
      const orders = response.data as WooCommerceOrder[];

      console.log(`Fetched ${orders.length} orders from WooCommerce for family ${familyId}`);

      // Extract unique order statuses and their counts
      const statusCounts = new Map<string, number>();
      for (const order of orders) {
        statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);
      }

      const wcStatuses = Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
      }));

      console.log(`Detected WooCommerce statuses:`, wcStatuses);

      // Sync workflow stages from WooCommerce statuses (will create stages for custom statuses)
      try {
        await workflowService.syncWorkflowStagesFromWooCommerce(familyId, wcStatuses);
      } catch (error: any) {
        console.error(`Error syncing workflow stages:`, error.message);
      }

      // Process each order
      for (const order of orders) {
        try {
          const { created, cachedOrderId } = await this.cacheOrder(familyId, order);
          result.ordersProcessed++;
          if (created) {
            result.ordersCreated++;
          } else {
            result.ordersUpdated++;
          }

          // Sync order workflow stage from WooCommerce status (bi-directional sync)
          if (cachedOrderId) {
            try {
              await workflowService.syncOrderStageFromWooCommerce(
                cachedOrderId,
                familyId,
                order.status
              );
            } catch (error: any) {
              console.error(`Error syncing workflow stage for order ${order.id}:`, error.message);
            }
          }
        } catch (error: any) {
          console.error(`Error processing order ${order.id}:`, error.message);
          result.errors.push(`Order ${order.id}: ${error.message}`);
        }
      }

      console.log(`Sync complete for family ${familyId}: ${result.ordersCreated} created, ${result.ordersUpdated} updated`);
    } catch (error: any) {
      console.error(`Sync failed for family ${familyId}:`, error.response?.data || error.message);
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Cache a single order in the database
   */
  async cacheOrder(familyId: number, order: WooCommerceOrder): Promise<{created: boolean; cachedOrderId: number}> {
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

    const existing = await db('cached_orders')
      .where({ family_id: familyId, woocommerce_order_id: order.id })
      .first();

    if (existing) {
      await db('cached_orders')
        .where({ id: existing.id })
        .update({
          ...orderData,
          updated_at: new Date(),
        });
      return { created: false, cachedOrderId: existing.id };
    } else {
      const [newOrderId] = await db('cached_orders').insert(orderData).returning('id');
      const newCachedId = (typeof newOrderId === 'number') ? newOrderId : newOrderId.id;

      // Don't automatically add to workflow here - let syncOrderStageFromWooCommerce handle it
      // This prevents the "No workflow stages configured" error
      console.log(`Cached WooCommerce order ${order.id} (cached ID: ${newCachedId})`);

      return { created: true, cachedOrderId: newCachedId };
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
   * Update cached order and sync to WooCommerce
   */
  async updateCachedOrderStatus(familyId: number, orderId: number, newStatus: string): Promise<CachedOrder> {
    const cachedOrder = await this.getCachedOrder(familyId, orderId);
    if (!cachedOrder) {
      throw new Error('Order not found');
    }

    // Update in WooCommerce
    await this.updateOrderStatus(familyId, cachedOrder.woocommerce_order_id, newStatus);

    // Update in local cache
    await db('cached_orders')
      .where({ id: orderId })
      .update({
        status: newStatus,
        date_modified: new Date(),
        updated_at: new Date(),
      });

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
}

export default new WooCommerceService();
