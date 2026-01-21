import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import workflowService from '../services/workflow.service';
import wooCommerceService from '../services/woocommerce.service';

const router = Router();

/**
 * GET /api/v1/workflow/board
 * Get full workflow board with all stages and orders
 * Supports filtering via query params: board_style, font, board_color, date_from, date_to
 */
router.get('/board', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    // Extract filter parameters from query
    const filters: any = {};
    if (req.query.board_style) filters.board_style = String(req.query.board_style);
    if (req.query.font) filters.font = String(req.query.font);
    if (req.query.board_color) filters.board_color = String(req.query.board_color);
    if (req.query.date_from) filters.date_from = String(req.query.date_from);
    if (req.query.date_to) filters.date_to = String(req.query.date_to);

    const board = await workflowService.getBoardWithFilters(familyId, filters);

    res.json({ data: board });
  } catch (error: any) {
    console.error('Get workflow board error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load workflow board',
    });
  }
});

/**
 * GET /api/v1/workflow/stages
 * Get workflow stages for family
 */
router.get('/stages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;
    const stages = await workflowService.getStages(familyId);
    
    res.json({ data: stages });
  } catch (error: any) {
    console.error('Get workflow stages error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load workflow stages',
    });
  }
});

/**
 * GET /api/v1/workflow/filters/options
 * Get unique filter options for customization fields
 * Returns lists of available board styles, fonts, and colors for filter dropdowns
 */
router.get('/filters/options', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;
    const options = await workflowService.getFilterOptions(familyId);

    res.json({ data: options });
  } catch (error: any) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load filter options',
    });
  }
});

/**
 * PUT /api/v1/workflow/stages/:id/visibility
 * Toggle stage visibility (show/hide columns)
 */
router.put('/stages/:id/visibility', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stageId = parseInt(req.params.id);
    const { is_hidden } = req.body;

    if (typeof is_hidden !== 'boolean') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'is_hidden boolean value is required',
      });
    }

    await workflowService.updateStageVisibility(stageId, is_hidden);

    res.json({
      message: `Stage visibility updated to ${is_hidden ? 'hidden' : 'visible'}`,
    });
  } catch (error: any) {
    console.error('Update stage visibility error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update stage visibility',
    });
  }
});

/**
 * PUT /api/v1/workflow/stages
 * Update workflow stages configuration
 * Requires admin or manage_woocommerce permission
 */
router.put('/stages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;
    const { stages } = req.body;

    if (!stages || !Array.isArray(stages)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Stages array is required',
      });
    }

    const updatedStages = await workflowService.updateStages(familyId, stages);
    
    res.json({
      data: updatedStages,
      message: 'Workflow stages updated successfully',
    });
  } catch (error: any) {
    console.error('Update workflow stages error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update workflow stages',
    });
  }
});

/**
 * PUT /api/v1/workflow/orders/:id
 * Update order workflow (stage, priority, assignment)
 */
router.put('/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user!.userId;
    const familyId = req.user!.familyId;
    const { stage_id, assigned_to, priority, notes } = req.body;

    // If stage is being updated, use bi-directional sync method
    if (stage_id !== undefined) {
      await workflowService.updateOrderStageWithWooCommerceSync(
        orderId,
        stage_id,
        userId,
        wooCommerceService
      );

      // Update other fields if provided
      if (assigned_to !== undefined || priority !== undefined || notes !== undefined) {
        const otherUpdates: any = {};
        if (assigned_to !== undefined) otherUpdates.assigned_to = assigned_to;
        if (priority !== undefined) otherUpdates.priority = priority;
        if (notes !== undefined) otherUpdates.notes = notes;

        await workflowService.updateOrder(orderId, otherUpdates, userId);
      }
    } else {
      // No stage change, just update other fields
      const updates: any = {};
      if (assigned_to !== undefined) updates.assigned_to = assigned_to;
      if (priority !== undefined) updates.priority = priority;
      if (notes !== undefined) updates.notes = notes;

      await workflowService.updateOrder(orderId, updates, userId);
    }

    res.json({ message: 'Order updated successfully' });
  } catch (error: any) {
    console.error('Update order workflow error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to update order',
    });
  }
});

/**
 * POST /api/v1/workflow/bulk-update
 * Bulk update multiple orders
 */
router.post('/bulk-update', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const familyId = req.user!.familyId;
    const { order_ids, stage_id, assigned_to, priority } = req.body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'order_ids array is required',
      });
    }

    // If stage is being updated, sync each order with WooCommerce
    if (stage_id !== undefined) {
      for (const orderId of order_ids) {
        try {
          await workflowService.updateOrderStageWithWooCommerceSync(
            orderId,
            stage_id,
            userId,
            wooCommerceService
          );
        } catch (error: any) {
          console.error(`Error updating order ${orderId}:`, error.message);
        }
      }

      // Update other fields if provided
      if (assigned_to !== undefined || priority !== undefined) {
        await workflowService.bulkUpdate(
          {
            order_ids,
            assigned_to,
            priority,
          },
          userId
        );
      }
    } else {
      // No stage change, just update other fields
      await workflowService.bulkUpdate(
        {
          order_ids,
          assigned_to,
          priority,
        },
        userId
      );
    }

    res.json({ message: `${order_ids.length} orders updated successfully` });
  } catch (error: any) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to bulk update orders',
    });
  }
});

/**
 * GET /api/v1/workflow/orders/:id/history
 * Get order workflow history
 */
router.get('/orders/:id/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const history = await workflowService.getOrderHistory(orderId);
    
    res.json({ data: history });
  } catch (error: any) {
    console.error('Get order history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load order history',
    });
  }
});

/**
 * GET /api/v1/workflow/stats
 * Get workflow statistics
 */
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;
    const stats = await workflowService.getStats(familyId);
    
    res.json({ data: stats });
  } catch (error: any) {
    console.error('Get workflow stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load workflow statistics',
    });
  }
});

/**
 * GET /api/v1/workflow/overdue
 * Get overdue orders (in stage > 24 hours)
 */
router.get('/overdue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;
    const overdueOrders = await workflowService.getOverdueOrders(familyId);

    res.json({ data: overdueOrders });
  } catch (error: any) {
    console.error('Get overdue orders error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load overdue orders',
    });
  }
});

/**
 * PUT /api/v1/workflow/orders/:id/tracking
 * Update order tracking information (Australia Post)
 */
router.put('/orders/:id/tracking', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const orderId = parseInt(req.params.id);
    const familyId = req.user!.familyId;
    const { tracking_number, provider } = req.body;

    if (!tracking_number) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'tracking_number is required',
      });
    }

    await wooCommerceService.updateOrderTracking(
      familyId,
      orderId,
      tracking_number,
      provider || 'Australia Post'
    );

    res.json({ message: 'Tracking information updated successfully' });
  } catch (error: any) {
    console.error('Update tracking error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to update tracking information',
    });
  }
});

export default router;
