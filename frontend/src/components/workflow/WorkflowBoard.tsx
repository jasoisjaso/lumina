import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import workflowAPI, { WorkflowBoard as WorkflowBoardType, OrderWorkflow } from '../../api/workflow.api';
import WorkflowColumn from './WorkflowColumn';
import OrderCard from './OrderCard';
import OrderDetailsModal from './OrderDetailsModal';
import BulkActionsBar from './BulkActionsBar';
import FilterBar, { FilterOptions, ActiveFilters } from './FilterBar';

const WorkflowBoard: React.FC = () => {
  const [board, setBoard] = useState<WorkflowBoardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrder, setActiveOrder] = useState<OrderWorkflow | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [detailsOrder, setDetailsOrder] = useState<OrderWorkflow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    board_styles: [],
    fonts: [],
    board_colors: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadBoard();
    loadFilterOptions();
    // Refresh every 2 minutes
    const interval = setInterval(loadBoard, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadBoard();
  }, [activeFilters]);

  const loadBoard = async () => {
    try {
      const data = await workflowAPI.getBoard(activeFilters);
      setBoard(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load workflow board:', err);
      setError('Failed to load workflow board. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const options = await workflowAPI.getFilterOptions();
      setFilterOptions(options);
    } catch (err: any) {
      console.error('Failed to load filter options:', err);
      // Don't show error to user, filters just won't populate
    }
  };

  const handleFiltersChange = (filters: ActiveFilters) => {
    setActiveFilters(filters);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = board?.orders.find((o) => o.id === active.id);
    setActiveOrder(order || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !board) {
      setActiveOrder(null);
      return;
    }

    const orderId = active.id as number;
    const newStageId = over.id as number;

    // Find the order and check if stage changed
    const order = board.orders.find((o) => o.id === orderId);
    if (!order || order.stage_id === newStageId) {
      setActiveOrder(null);
      return;
    }

    try {
      // Optimistic update
      const updatedOrders = board.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              stage_id: newStageId,
              stage: board.stages.find((s) => s.id === newStageId)!,
              last_updated: new Date().toISOString(),
            }
          : o
      );

      setBoard({ ...board, orders: updatedOrders });

      // Update on server
      await workflowAPI.updateOrder(orderId, { stage_id: newStageId });
    } catch (err: any) {
      console.error('Failed to update order:', err);
      // Revert on error
      loadBoard();
    } finally {
      setActiveOrder(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Visual feedback during drag
  };

  const handleOrderClick = (order: OrderWorkflow) => {
    setDetailsOrder(order);
  };

  const handleOrderUpdate = async (orderId: number, updates: any) => {
    try {
      await workflowAPI.updateOrder(orderId, updates);
      await loadBoard();
    } catch (err: any) {
      console.error('Failed to update order:', err);
      throw err;
    }
  };

  const handleSelectOrder = (orderId: number, selected: boolean) => {
    setSelectedOrderIds((prev) =>
      selected ? [...prev, orderId] : prev.filter((id) => id !== orderId)
    );
  };

  const handleBulkUpdate = async (updates: any) => {
    try {
      await workflowAPI.bulkUpdate({
        order_ids: selectedOrderIds,
        ...updates,
      });
      setSelectedOrderIds([]);
      await loadBoard();
    } catch (err: any) {
      console.error('Failed to bulk update:', err);
      alert('Failed to update orders. Please try again.');
    }
  };

  const handleToggleVisibility = async (stageId: number) => {
    try {
      await workflowAPI.updateStageVisibility(stageId, true);
      await loadBoard();
    } catch (err: any) {
      console.error('Failed to hide column:', err);
      alert('Failed to hide column. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-600 mb-4">{error || 'Failed to load workflow board'}</p>
        <button
          onClick={loadBoard}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Workflow Board</h1>
            <p className="text-sm text-gray-600 mt-1">
              {board.orders.length} active orders
            </p>
          </div>
          <button
            onClick={loadBoard}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 pt-4">
        <FilterBar
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.length > 0 && (
        <BulkActionsBar
          selectedCount={selectedOrderIds.length}
          stages={board.stages}
          onBulkUpdate={handleBulkUpdate}
          onClearSelection={() => setSelectedOrderIds([])}
        />
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex space-x-4 h-full min-w-min">
            {board.stages.map((stage) => (
              <WorkflowColumn
                key={stage.id}
                stage={stage}
                orders={board.orders.filter((o) => o.stage_id === stage.id)}
                onOrderClick={handleOrderClick}
                onSelectOrder={handleSelectOrder}
                selectedOrderIds={selectedOrderIds}
                onToggleVisibility={handleToggleVisibility}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOrder && (
              <div className="opacity-80 scale-105 rotate-3">
                <OrderCard order={activeOrder} onClick={() => {}} isDragging />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Order Details Modal */}
      {detailsOrder && (
        <OrderDetailsModal
          order={detailsOrder}
          stages={board.stages}
          onClose={() => setDetailsOrder(null)}
          onUpdate={handleOrderUpdate}
        />
      )}
    </div>
  );
};

export default WorkflowBoard;
