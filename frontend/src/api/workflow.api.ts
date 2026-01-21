import apiClient from './axios.config';

export interface WorkflowStage {
  id: number;
  family_id: number;
  name: string;
  color: string;
  position: number;
  wc_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWorkflow {
  id: number;
  order_id: number;
  stage_id: number;
  assigned_to: number | null;
  priority: number; // 0=normal, 1=high, 2=rush
  notes: string | null;
  last_updated: string;
  order_data: any;
  assignee: {
    id: number;
    first_name: string;
    last_name: string;
    color: string;
  } | null;
  stage: WorkflowStage;
  time_in_stage: number; // Minutes
}

export interface WorkflowBoard {
  stages: WorkflowStage[];
  orders: OrderWorkflow[];
}

export interface BulkUpdateRequest {
  order_ids: number[];
  stage_id?: number;
  assigned_to?: number | null;
  priority?: number;
}

export interface WorkflowStats {
  stages: Array<{
    stage_id: number;
    stage_name: string;
    total_orders: number;
    rush_orders: number;
  }>;
  total_orders: number;
  unassigned_orders: number;
}

export interface FilterOptions {
  board_styles: string[];
  fonts: string[];
  board_colors: string[];
}

export interface ActiveFilters {
  board_style?: string;
  font?: string;
  board_color?: string;
  date_from?: string;
  date_to?: string;
}

class WorkflowAPI {
  /**
   * Get full workflow board with optional filters
   */
  async getBoard(filters?: ActiveFilters): Promise<WorkflowBoard> {
    const params = new URLSearchParams();
    if (filters?.board_style) params.append('board_style', filters.board_style);
    if (filters?.font) params.append('font', filters.font);
    if (filters?.board_color) params.append('board_color', filters.board_color);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const queryString = params.toString();
    const url = queryString ? `/workflow/board?${queryString}` : '/workflow/board';

    const response = await apiClient.get(url);
    return response.data.data;
  }

  /**
   * Get filter options for customization fields
   */
  async getFilterOptions(): Promise<FilterOptions> {
    const response = await apiClient.get('/workflow/filters/options');
    return response.data.data;
  }

  /**
   * Update stage visibility
   */
  async updateStageVisibility(stageId: number, isHidden: boolean): Promise<void> {
    await apiClient.put(`/workflow/stages/${stageId}/visibility`, { is_hidden: isHidden });
  }

  /**
   * Get workflow stages
   */
  async getStages(): Promise<WorkflowStage[]> {
    const response = await apiClient.get('/workflow/stages');
    return response.data.data;
  }

  /**
   * Update workflow stages configuration
   */
  async updateStages(stages: Partial<WorkflowStage>[]): Promise<WorkflowStage[]> {
    const response = await apiClient.put('/workflow/stages', { stages });
    return response.data.data;
  }

  /**
   * Update order (stage, priority, assignment)
   */
  async updateOrder(orderId: number, updates: {
    stage_id?: number;
    assigned_to?: number | null;
    priority?: number;
    notes?: string;
  }): Promise<void> {
    await apiClient.put(`/workflow/orders/${orderId}`, updates);
  }

  /**
   * Bulk update multiple orders
   */
  async bulkUpdate(request: BulkUpdateRequest): Promise<void> {
    await apiClient.post('/workflow/bulk-update', request);
  }

  /**
   * Get order history
   */
  async getOrderHistory(orderId: number): Promise<any[]> {
    const response = await apiClient.get(`/workflow/orders/${orderId}/history`);
    return response.data.data;
  }

  /**
   * Get workflow statistics
   */
  async getStats(): Promise<WorkflowStats> {
    const response = await apiClient.get('/workflow/stats');
    return response.data.data;
  }

  /**
   * Get overdue orders
   */
  async getOverdueOrders(): Promise<OrderWorkflow[]> {
    const response = await apiClient.get('/workflow/overdue');
    return response.data.data;
  }

  /**
   * Update order tracking information
   */
  async updateOrderTracking(
    orderId: number,
    trackingNumber: string,
    provider: string = 'Australia Post'
  ): Promise<void> {
    await apiClient.put(`/workflow/orders/${orderId}/tracking`, {
      tracking_number: trackingNumber,
      provider,
    });
  }
}

export default new WorkflowAPI();
