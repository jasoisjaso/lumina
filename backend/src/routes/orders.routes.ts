import { Router, Response } from 'express';
import woocommerceService from '../services/woocommerce.service';
import { authenticate, AuthRequest, requireFamilyAccess } from '../middleware/auth.middleware';
import { syncOrdersJob } from '../jobs/sync-orders.job';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/orders
 * List cached orders for the authenticated user's family
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { status, limit, offset, orderBy, order } = req.query;

    const orders = await woocommerceService.getCachedOrders(req.user.familyId, {
      status: status as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      orderBy: orderBy as string | undefined,
      order: order as 'asc' | 'desc' | undefined,
    });

    res.status(200).json({
      orders,
      count: orders.length,
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch orders',
    });
  }
});

/**
 * GET /api/v1/orders/stats
 * Get order statistics for the authenticated user's family
 */
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const stats = await woocommerceService.getOrderStats(req.user.familyId);

    res.status(200).json({ stats });
  } catch (error: any) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch order statistics',
    });
  }
});

/**
 * GET /api/v1/orders/:id
 * Get a specific cached order by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const orderId = parseInt(req.params.id);
    if (isNaN(orderId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid order ID' });
      return;
    }

    const order = await woocommerceService.getCachedOrder(req.user.familyId, orderId);

    if (!order) {
      res.status(404).json({ error: 'Not Found', message: 'Order not found' });
      return;
    }

    res.status(200).json({ order });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch order',
    });
  }
});

/**
 * PUT /api/v1/orders/:id/status
 * Update order status (syncs to WooCommerce)
 */
router.put('/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const orderId = parseInt(req.params.id);
    const { status } = req.body;

    if (isNaN(orderId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid order ID' });
      return;
    }

    if (!status) {
      res.status(400).json({ error: 'Validation Error', message: 'Status is required' });
      return;
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Validation Error',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const updatedOrder = await woocommerceService.updateCachedOrderStatus(
      req.user.familyId,
      orderId,
      status
    );

    res.status(200).json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: error.message || 'Failed to update order status',
    });
  }
});

/**
 * POST /api/v1/orders/sync
 * Trigger a manual sync of orders from WooCommerce
 */
router.post('/sync', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Check if WooCommerce is available
    if (!woocommerceService.isAvailable()) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'WooCommerce API is not configured',
      });
      return;
    }

    // Trigger sync for the user's family
    const daysBack = req.body.daysBack ? parseInt(req.body.daysBack) : 30;

    const result = await woocommerceService.syncOrdersForFamily(req.user.familyId, daysBack);

    if (result.success) {
      res.status(200).json({
        message: 'Sync completed successfully',
        result: {
          ordersProcessed: result.ordersProcessed,
          ordersCreated: result.ordersCreated,
          ordersUpdated: result.ordersUpdated,
          errors: result.errors,
        },
      });
    } else {
      res.status(500).json({
        error: 'Sync Failed',
        message: 'Failed to sync orders from WooCommerce',
        errors: result.errors,
      });
    }
  } catch (error: any) {
    console.error('Error triggering sync:', error);
    res.status(500).json({
      error: 'Sync Failed',
      message: error.message || 'Failed to trigger sync',
    });
  }
});

/**
 * POST /api/v1/orders/sync/all
 * Trigger a full sync for all families (admin only)
 */
router.post('/sync/all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Only admins can trigger full sync
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
      return;
    }

    // Check if sync is already running
    const jobStatus = syncOrdersJob.getStatus();
    if (jobStatus.syncing) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Sync is already in progress',
      });
      return;
    }

    // Trigger sync
    syncOrdersJob.triggerSync().catch((error) => {
      console.error('Background sync error:', error);
    });

    res.status(202).json({
      message: 'Full sync triggered for all families',
      note: 'Sync is running in the background',
    });
  } catch (error: any) {
    console.error('Error triggering full sync:', error);
    res.status(500).json({
      error: 'Sync Failed',
      message: error.message || 'Failed to trigger full sync',
    });
  }
});

/**
 * GET /api/v1/orders/sync/status
 * Get sync job status
 */
router.get('/sync/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const status = syncOrdersJob.getStatus();

    res.status(200).json({
      syncJob: status,
      woocommerceConfigured: woocommerceService.isAvailable(),
    });
  } catch (error: any) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to get sync status',
    });
  }
});

export default router;
