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
        'ow.*',
        knex.raw('json_object("id", u.id, "first_name", u.first_name, "last_name", u.last_name, "color", u.color) as assignee'),
        knex.raw('json_object("id", ows.id, "name", ows.name, "color", ows.color, "position", ows.position) as stage'),
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
      return {
        ...order,
        order_data: orderData || null,
        assignee: order.assignee ? JSON.parse(order.assignee) : null,
        stage: JSON.parse(order.stage),
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
}

export default new WorkflowService();
