import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { WorkflowStage, OrderWorkflow } from '../../api/workflow.api';
import OrderCard from './OrderCard';

interface WorkflowColumnProps {
  stage: WorkflowStage;
  orders: OrderWorkflow[];
  onOrderClick: (order: OrderWorkflow) => void;
  onSelectOrder: (orderId: number, selected: boolean) => void;
  selectedOrderIds: number[];
  onToggleVisibility?: (stageId: number) => void;
}

const WorkflowColumn: React.FC<WorkflowColumnProps> = ({
  stage,
  orders,
  onOrderClick,
  onSelectOrder,
  selectedOrderIds,
  onToggleVisibility,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  // Sort orders: rush first, then by time in stage
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return b.time_in_stage - a.time_in_stage; // Longer time first
  });

  const rushCount = orders.filter((o) => o.priority === 2).length;

  return (
    <div className="flex flex-col w-80 flex-shrink-0">
      {/* Column Header */}
      <div
        className="px-4 py-3 rounded-t-lg"
        style={{ backgroundColor: stage.color }}
      >
        <div className="flex items-center justify-between text-white">
          <h3 className="font-semibold">{stage.name}</h3>
          <div className="flex items-center space-x-2">
            {rushCount > 0 && (
              <span className="px-2 py-0.5 bg-white bg-opacity-30 rounded text-xs font-medium">
                🔥 {rushCount}
              </span>
            )}
            <span className="px-2 py-0.5 bg-white bg-opacity-30 rounded text-xs font-medium">
              {orders.length}
            </span>
            {onToggleVisibility && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(stage.id);
                }}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                title="Hide this column"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div
        ref={setNodeRef}
        className={`flex-1 bg-gray-100 rounded-b-lg p-3 space-y-3 overflow-y-auto min-h-[200px] transition-colors ${
          isOver ? 'bg-gray-200 ring-2 ring-indigo-400' : ''
        }`}
      >
        {sortedOrders.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm">No orders</p>
          </div>
        )}
        
        {sortedOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onClick={() => onOrderClick(order)}
            onSelect={(selected) => onSelectOrder(order.id, selected)}
            isSelected={selectedOrderIds.includes(order.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkflowColumn;
