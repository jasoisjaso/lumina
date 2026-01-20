import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { OrderWorkflow } from '../../api/workflow.api';

interface OrderCardProps {
  order: OrderWorkflow;
  onClick: () => void;
  onSelect?: (selected: boolean) => void;
  isSelected?: boolean;
  isDragging?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onClick,
  onSelect,
  isSelected = false,
  isDragging = false,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: order.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const priorityConfig = {
    0: { label: '', color: '', icon: '' },
    1: { label: 'High', color: 'border-yellow-400 bg-yellow-50', icon: '⚡' },
    2: { label: 'Rush', color: 'border-red-500 bg-red-50', icon: '🔥' },
  };

  const priority = priorityConfig[order.priority as 0 | 1 | 2] || priorityConfig[0];

  const formatTimeInStage = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const orderData = order.order_data;
  const customerName = orderData?.customer_name || 'Unknown Customer';
  const orderNumber = orderData?.woocommerce_order_id || order.order_id;
  const total = orderData?.total || '0.00';
  const lineItems = orderData?.raw_data ? JSON.parse(orderData.raw_data).line_items : [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-move border-2 ${
        priority.color || 'border-transparent'
      } ${isSelected ? 'ring-2 ring-indigo-500' : ''} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="p-4" onClick={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.card-content')) {
          onClick();
        }
      }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 card-content">
            <div className="flex items-center space-x-2">
              {priority.icon && (
                <span className="text-lg">{priority.icon}</span>
              )}
              <h4 className="font-semibold text-gray-900 text-sm">
                #{orderNumber}
              </h4>
            </div>
            <p className="text-xs text-gray-600 mt-1">{customerName}</p>
          </div>
          
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(e.target.checked);
              }}
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
          )}
        </div>

        {/* Items */}
        <div className="mb-3 card-content">
          <p className="text-xs text-gray-500 mb-1">Items:</p>
          <div className="space-y-0.5">
            {lineItems.slice(0, 2).map((item: any, idx: number) => (
              <p key={idx} className="text-xs text-gray-700 truncate">
                {item.quantity}x {item.name}
              </p>
            ))}
            {lineItems.length > 2 && (
              <p className="text-xs text-gray-500">
                +{lineItems.length - 2} more items
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 card-content">
          <span className="text-sm font-semibold text-gray-900">
            ${parseFloat(total).toFixed(2)}
          </span>
          
          <div className="flex items-center space-x-2">
            {order.assignee && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: order.assignee.color }}
                title={`${order.assignee.first_name} ${order.assignee.last_name}`}
              >
                {order.assignee.first_name[0]}{order.assignee.last_name[0]}
              </div>
            )}
            
            <span className="text-xs text-gray-500">
              {formatTimeInStage(order.time_in_stage)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
