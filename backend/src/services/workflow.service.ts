import knex from '../database/knex';

interface WorkflowStage {
  id: number;
  family_id: number;
  name: string;
  color: string;
  position: number;
  wc_status: string | null;
  created_at: Date;
  updated_at: Date;
}

interface OrderWorkflow {
  id: number;
  order_id: number;
  stage_id: number;
  assigned_to: number | null;
  priority: number;
  notes: string | null;
  last_updated: Date;
}

interface WorkflowOrder extends OrderWorkflow {
  order_data: any;
  assignee: any;
  stage: WorkflowStage;
  time_in_stage: number; // Minutes
}

interface BulkUpdateRequest {
  order_ids: number[];
  stage_id?: number;
  assigned_to?: number | null;
  priority?: number;
}

class WorkflowService {
  /**
   * Get all workflow stages for a family
   */
  async getStages(familyId: number): Promise<WorkflowStage[]> {
    return knex('order_workflow_stages')
      .where({ family_id: familyId })
      .orderBy('position', 'asc');
  }

  /**
   * Create or update workflow stages
   */
  async updateStages(familyId: number, stages: Partial<WorkflowStage>[]): Promise<WorkflowStage[]> {
    await knex.transaction(async (trx) => {
      // Delete existing stages
      await trx('order_workflow_stages').where({ family_id: familyId }).delete();

      // Insert new stages
      await trx('order_workflow_stages').insert(
        stages.map((stage, index) => ({
          family_id: familyId,
          name: stage.name,
          color: stage.color || '#4F46E5',
          position: index,
          wc_status: stage.wc_status,
        }))
      );
    });

    return this.getStages(familyId);
  }

  /**
   * Get full workflow board with orders
   */
  async getBoard(familyId: number): Promise<{ stages: WorkflowStage[]; orders: WorkflowOrder[] }> {
    const stages = await this.getStages(familyId);

    // Get all orders with workflow tracking
    const orders = await knex('order_workflow as ow')
      .join('order_workflow_stages as ows', 'ow.stage_id', 'ows.id')
      .leftJoin('users as u', 'ow.assigned_to', 'u.id')
      .where('ows.family_id', familyId)
      .select(
        'ow.id as workflow_id',
        'ow.order_id',
        'ow.stage_id',
        'ow.assigned_to',
        'ow.priority',
        'ow.notes',
        'ow.last_updated',
        'ow.created_at as workflow_created_at',
        'ow.updated_at as workflow_updated_at',
        'u.id as user_id',
        'u.first_name',
        'u.last_name',
        'u.color as user_color',
        'ows.id as stage_id_full',
        'ows.name as stage_name',
        'ows.color as stage_color',
        'ows.position as stage_position',
        'ows.wc_status',
        knex.raw('ROUND((julianday("now") - julianday(ow.last_updated)) * 1440) as time_in_stage')
      );

    // Get order data from cache (assuming orders are cached from WooCommerce)
    const orderIds = orders.map((o: any) => o.order_id);
    const cachedOrders = await knex('cached_orders')
      .whereIn('id', orderIds)
      .select('*');

    // Map cached order data to workflow orders
    const ordersWithData = orders.map((order: any) => {
      const orderData = cachedOrders.find((co: any) => co.id === order.order_id);

      // Construct assignee object from flat columns
      const assignee = order.user_id ? {
        id: order.user_id,
        first_name: order.first_name,
        last_name: order.last_name,
        color: order.user_color
      } : null;

      // Construct stage object from flat columns (cast as any for compatibility)
      const stage: any = {
        id: order.stage_id_full,
        name: order.stage_name,
        color: order.stage_color,
        position: order.stage_position,
        wc_status: order.wc_status
      };

      return {
        id: order.workflow_id,
        order_id: order.order_id,
        stage_id: order.stage_id,
        assigned_to: order.assigned_to,
        priority: order.priority,
        notes: order.notes,
        last_updated: order.last_updated,
        created_at: order.workflow_created_at,
        updated_at: order.workflow_updated_at,
        order_data: orderData || null,
        assignee,
        stage,
        time_in_stage: order.time_in_stage
      };
    });

    return {
      stages,
      orders: ordersWithData,
    };
  }

  /**
   * Update order workflow (stage, priority, assignment)
   */
  async updateOrder(
    orderId: number,
    updates: {
      stage_id?: number;
      assigned_to?: number | null;
      priority?: number;
      notes?: string;
    },
    changedBy: number
  ): Promise<void> {
    await knex.transaction(async (trx) => {
      // Get current workflow state
      const current = await trx('order_workflow').where({ order_id: orderId }).first();

      if (!current) {
        throw new Error('Order not found in workflow');
      }

      // Update workflow
      await trx('order_workflow')
        .where({ order_id: orderId })
        .update({
          ...updates,
          last_updated: knex.fn.now(),
        });

      // If stage changed, record history
      if (updates.stage_id && updates.stage_id !== current.stage_id) {
        await trx('order_workflow_history').insert({
          order_id: orderId,
          from_stage_id: current.stage_id,
          to_stage_id: updates.stage_id,
          changed_by: changedBy,
          notes: updates.notes || null,
        });
      }
    });
  }

  /**
   * Add new order to workflow (when WooCommerce order syncs)
   */
  async addOrder(orderId: number, familyId: number): Promise<void> {
    // Check if order already in workflow
    const existing = await knex('order_workflow').where({ order_id: orderId }).first();
    if (existing) return;

    // Get first stage for family
    const firstStage = await knex('order_workflow_stages')
      .where({ family_id: familyId })
      .orderBy('position', 'asc')
      .first();

    if (!firstStage) {
      throw new Error('No workflow stages configured for family');
    }

    // Add to workflow
    await knex('order_workflow').insert({
      order_id: orderId,
      stage_id: firstStage.id,
      priority: 0,
    });
  }

  /**
   * Bulk update orders
   */
  async bulkUpdate(request: BulkUpdateRequest, changedBy: number): Promise<void> {
    await knex.transaction(async (trx) => {
      for (const orderId of request.order_ids) {
        const updates: any = {};
        
        if (request.stage_id !== undefined) updates.stage_id = request.stage_id;
        if (request.assigned_to !== undefined) updates.assigned_to = request.assigned_to;
        if (request.priority !== undefined) updates.priority = request.priority;

        // Get current state
        const current = await trx('order_workflow').where({ order_id: orderId }).first();
        
        if (!current) continue;

        // Update workflow
        await trx('order_workflow')
          .where({ order_id: orderId })
          .update({
            ...updates,
            last_updated: knex.fn.now(),
          });

        // Record history if stage changed
        if (request.stage_id && request.stage_id !== current.stage_id) {
          await trx('order_workflow_history').insert({
            order_id: orderId,
            from_stage_id: current.stage_id,
            to_stage_id: request.stage_id,
            changed_by: changedBy,
            notes: 'Bulk update',
          });
        }
      }
    });
  }

  /**
   * Get order history
   */
  async getOrderHistory(orderId: number): Promise<any[]> {
    return knex('order_workflow_history as owh')
      .leftJoin('order_workflow_stages as from_stage', 'owh.from_stage_id', 'from_stage.id')
      .join('order_workflow_stages as to_stage', 'owh.to_stage_id', 'to_stage.id')
      .join('users as u', 'owh.changed_by', 'u.id')
      .where('owh.order_id', orderId)
      .orderBy('owh.changed_at', 'desc')
      .select(
        'owh.*',
        'from_stage.name as from_stage_name',
        'to_stage.name as to_stage_name',
        knex.raw('u.first_name || " " || u.last_name as changed_by_name')
      );
  }

  /**
   * Get workflow statistics
   */
  async getStats(familyId: number): Promise<any> {
    const stages = await this.getStages(familyId);

    const stats = await Promise.all(
      stages.map(async (stage) => {
        const count = await knex('order_workflow')
          .where({ stage_id: stage.id })
          .count('* as count')
          .first();

        const rushCount = await knex('order_workflow')
          .where({ stage_id: stage.id, priority: 2 })
          .count('* as count')
          .first();

        return {
          stage_id: stage.id,
          stage_name: stage.name,
          total_orders: count?.count || 0,
          rush_orders: rushCount?.count || 0,
        };
      })
    );

    // Overall stats
    const totalOrders = await knex('order_workflow as ow')
      .join('order_workflow_stages as ows', 'ow.stage_id', 'ows.id')
      .where('ows.family_id', familyId)
      .count('* as count')
      .first();

    const unassignedOrders = await knex('order_workflow as ow')
      .join('order_workflow_stages as ows', 'ow.stage_id', 'ows.id')
      .where('ows.family_id', familyId)
      .whereNull('ow.assigned_to')
      .count('* as count')
      .first();

    return {
      stages: stats,
      total_orders: totalOrders?.count || 0,
      unassigned_orders: unassignedOrders?.count || 0,
    };
  }

  /**
   * Get overdue orders (in stage > 24 hours)
   */
  async getOverdueOrders(familyId: number): Promise<WorkflowOrder[]> {
    const orders = await knex('order_workflow as ow')
      .join('order_workflow_stages as ows', 'ow.stage_id', 'ows.id')
      .where('ows.family_id', familyId)
      .where(knex.raw('julianday("now") - julianday(ow.last_updated) > 1')) // > 24 hours
      .select('ow.*');

    return orders;
  }

  /**
   * Sync workflow stages from WooCommerce order statuses
   * Detects custom statuses from Order Status Manager plugin
   */
  async syncWorkflowStagesFromWooCommerce(
    familyId: number,
    wcStatuses: Array<{ status: string; count: number }>
  ): Promise<void> {
    console.log(`Syncing workflow stages for family ${familyId} from WooCommerce statuses:`, wcStatuses);

    // Define status colors and display names
    const statusConfig: Record<string, { name: string; color: string; position: number }> = {
      'pending': { name: 'Pending Payment', color: '#F59E0B', position: 0 },
      'processing': { name: 'Processing', color: '#3B82F6', position: 1 },
      'on-hold': { name: 'On Hold', color: '#6B7280', position: 2 },
      'completed': { name: 'Completed', color: '#10B981', position: 10 },
      'cancelled': { name: 'Cancelled', color: '#6B7280', position: 11 },
      'refunded': { name: 'Refunded', color: '#EF4444', position: 12 },
      'failed': { name: 'Failed', color: '#DC2626', position: 13 },
      // Custom statuses from Order Status Manager plugin
      'design': { name: 'Design', color: '#8B5CF6', position: 3 },
      'draft': { name: 'Draft', color: '#A78BFA', position: 4 },
    };

    // Get existing stages for this family
    const existingStages = await this.getStages(familyId);
    const existingWcStatuses = new Set(existingStages.map(s => s.wc_status).filter(Boolean));

    // Create stages for new WooCommerce statuses
    const newStages: Array<{ family_id: number; name: string; color: string; position: number; wc_status: string }> = [];

    for (const { status } of wcStatuses) {
      if (!existingWcStatuses.has(status)) {
        const config = statusConfig[status] || {
          name: status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' '),
          color: '#6366F1',
          position: Object.keys(statusConfig).length + newStages.length,
        };

        newStages.push({
          family_id: familyId,
          name: config.name,
          color: config.color,
          position: config.position,
          wc_status: status,
        });

        console.log(`Creating new workflow stage: ${config.name} (${status})`);
      }
    }

    // Insert new stages
    if (newStages.length > 0) {
      await knex('order_workflow_stages').insert(newStages);
      console.log(`Created ${newStages.length} new workflow stages`);
    }
  }

  /**
   * Update order workflow stage and sync to WooCommerce
   * This is called when user drags an order to a new stage in the UI
   */
  async updateOrderStageWithWooCommerceSync(
    orderId: number,
    stageId: number,
    changedBy: number,
    wooCommerceService?: any
  ): Promise<void> {
    // Get the new stage details
    const newStage = await knex('order_workflow_stages').where({ id: stageId }).first();

    if (!newStage) {
      throw new Error('Stage not found');
    }

    // Get the cached order to find WooCommerce order ID
    const cachedOrder = await knex('cached_orders').where({ id: orderId }).first();

    if (!cachedOrder) {
      throw new Error('Order not found');
    }

    // Update local workflow first
    await this.updateOrder(orderId, { stage_id: stageId }, changedBy);

    // If this stage maps to a WooCommerce status, update WooCommerce
    if (newStage.wc_status && wooCommerceService) {
      try {
        console.log(`Syncing order ${cachedOrder.wc_order_id} status to WooCommerce: ${newStage.wc_status}`);

        await wooCommerceService.updateOrderStatus(
          cachedOrder.family_id,
          cachedOrder.wc_order_id,
          newStage.wc_status
        );

        console.log(`Successfully synced order ${cachedOrder.wc_order_id} to WooCommerce`);
      } catch (error) {
        console.error(`Failed to sync order status to WooCommerce:`, error);
        // Don't throw - we still want the local update to persist
      }
    }
  }

  /**
   * Sync order workflow stage from WooCommerce status
   * This is called during WooCommerce sync to update Lumina when status changes in WooCommerce
   */
  async syncOrderStageFromWooCommerce(
    orderId: number,
    familyId: number,
    wcStatus: string
  ): Promise<void> {
    // Get or create workflow entry
    let workflowEntry = await knex('order_workflow').where({ order_id: orderId }).first();

    // Find the stage that matches this WooCommerce status
    const matchingStage = await knex('order_workflow_stages')
      .where({ family_id: familyId, wc_status: wcStatus })
      .first();

    if (!matchingStage) {
      // No matching stage, use first stage as fallback
      const firstStage = await knex('order_workflow_stages')
        .where({ family_id: familyId })
        .orderBy('position', 'asc')
        .first();

      if (!firstStage) {
        console.error(`No workflow stages exist for family ${familyId}`);
        return;
      }

      if (!workflowEntry) {
        // Create new workflow entry
        await knex('order_workflow').insert({
          order_id: orderId,
          stage_id: firstStage.id,
          priority: 0,
        });
      }
      return;
    }

    if (!workflowEntry) {
      // Create new workflow entry with the matching stage
      await knex('order_workflow').insert({
        order_id: orderId,
        stage_id: matchingStage.id,
        priority: 0,
      });
    } else if (workflowEntry.stage_id !== matchingStage.id) {
      // Update stage if it changed
      await knex('order_workflow')
        .where({ order_id: orderId })
        .update({
          stage_id: matchingStage.id,
          last_updated: knex.fn.now(),
        });

      // Record history
      await knex('order_workflow_history').insert({
        order_id: orderId,
        from_stage_id: workflowEntry.stage_id,
        to_stage_id: matchingStage.id,
        changed_by: 1, // System user
        notes: 'Synced from WooCommerce',
      });

      console.log(`Updated order ${orderId} workflow stage from WooCommerce: ${wcStatus}`);
    }
  }

  /**
   * Get stage by WooCommerce status
   */
  async getStageByWcStatus(familyId: number, wcStatus: string): Promise<WorkflowStage | null> {
    const stage = await knex('order_workflow_stages')
      .where({ family_id: familyId, wc_status: wcStatus })
      .first();

    return stage || null;
  }
}

export default new WorkflowService();
