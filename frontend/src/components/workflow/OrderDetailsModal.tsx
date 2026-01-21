import React, { useState, useEffect } from 'react';
import { OrderWorkflow, WorkflowStage } from '../../api/workflow.api';
import workflowAPI from '../../api/workflow.api';

interface OrderDetailsModalProps {
  order: OrderWorkflow;
  stages: WorkflowStage[];
  onClose: () => void;
  onUpdate: (orderId: number, updates: any) => Promise<void>;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  stages,
  onClose,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState(order.notes || '');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingSaving, setTrackingSaving] = useState(false);

  useEffect(() => {
    loadHistory();
    loadExistingTracking();
  }, [order.id]);

  const loadExistingTracking = () => {
    const orderData = order.order_data;
    const rawData = orderData?.raw_data ? JSON.parse(orderData.raw_data) : {};
    const metaData = rawData.meta_data || [];

    const trackingMeta = metaData.find((m: any) => m.key === '_tracking_number');
    if (trackingMeta) {
      setTrackingNumber(trackingMeta.value);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await workflowAPI.getOrderHistory(order.order_id);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const handleStageChange = async (stageId: number) => {
    setLoading(true);
    try {
      await onUpdate(order.id, { stage_id: stageId });
      onClose();
    } catch (err) {
      alert('Failed to update stage');
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = async (priority: number) => {
    setLoading(true);
    try {
      await onUpdate(order.id, { priority });
    } catch (err) {
      alert('Failed to update priority');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setLoading(true);
    try {
      await onUpdate(order.id, { notes });
      alert('Notes saved successfully');
    } catch (err) {
      alert('Failed to save notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTracking = async () => {
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    setTrackingSaving(true);
    try {
      await workflowAPI.updateOrderTracking(order.id, trackingNumber.trim(), 'Australia Post');
      alert('Tracking number saved successfully! WooCommerce will send a completion email with tracking info.');
    } catch (err) {
      alert('Failed to save tracking number');
    } finally {
      setTrackingSaving(false);
    }
  };

  const orderData = order.order_data;
  const rawData = orderData?.raw_data ? JSON.parse(orderData.raw_data) : {};
  const lineItems = rawData.line_items || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Order #{orderData?.woocommerce_order_id || order.order_id}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {orderData?.customer_name || 'Unknown Customer'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Current Stage */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Stage</h3>
                <div className="space-y-2">
                  {stages
                    .filter((stage) => !stage.is_hidden)
                    .map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      disabled={loading || stage.id === order.stage_id}
                      className={`w-full px-4 py-2 rounded-lg text-left flex items-center ${
                        stage.id === order.stage_id
                          ? 'bg-indigo-100 text-indigo-900 font-medium'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                      {stage.id === order.stage_id && (
                        <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Priority</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePriorityChange(0)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg ${
                      order.priority === 0
                        ? 'bg-gray-200 text-gray-900 font-medium'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => handlePriorityChange(1)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg ${
                      order.priority === 1
                        ? 'bg-yellow-100 text-yellow-900 font-medium'
                        : 'bg-gray-50 text-gray-700 hover:bg-yellow-50'
                    }`}
                  >
                    ⚡ High
                  </button>
                  <button
                    onClick={() => handlePriorityChange(2)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg ${
                      order.priority === 2
                        ? 'bg-red-100 text-red-900 font-medium'
                        : 'bg-gray-50 text-gray-700 hover:bg-red-50'
                    }`}
                  >
                    🔥 Rush
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Internal Notes</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={4}
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={loading}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save Notes
                </button>
              </div>

              {/* Australia Post Tracking (only for Completed orders) */}
              {order.stage.wc_status === 'completed' && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Australia Post Tracking
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSaveTracking}
                      disabled={trackingSaving || !trackingNumber.trim()}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {trackingSaving ? 'Saving...' : 'Save Tracking'}
                    </button>
                    {trackingNumber && (
                      <a
                        href={`https://auspost.com.au/mypost/track/#/details/${trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-sm text-indigo-600 hover:text-indigo-800 underline"
                      >
                        Track on Australia Post →
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Saving will update WooCommerce and trigger completion email with tracking info.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Order Details */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Order Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{orderData?.status}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">${parseFloat(orderData?.total || '0').toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">
                      {new Date(orderData?.date_created).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                  {lineItems.map((item: any) => (
                    <div key={item.id} className="p-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900">{item.name}</span>
                        <span className="text-sm text-gray-600">x{item.quantity}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ${parseFloat(item.total).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* History */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">History</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                  {history.map((entry, idx) => (
                    <div key={idx} className="text-sm">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600">
                          Moved to <span className="font-medium">{entry.to_stage_name}</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6 mt-1">
                        {new Date(entry.changed_at).toLocaleString()} by {entry.changed_by_name}
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <p className="text-sm text-gray-500">No history yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
