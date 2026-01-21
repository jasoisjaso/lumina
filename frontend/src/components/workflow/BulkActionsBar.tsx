import React, { useState } from 'react';
import { WorkflowStage } from '../../api/workflow.api';

interface BulkActionsBarProps {
  selectedCount: number;
  stages: WorkflowStage[];
  onBulkUpdate: (updates: any) => void;
  onClearSelection: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  stages,
  onBulkUpdate,
  onClearSelection,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMoveTo = (stageId: number) => {
    onBulkUpdate({ stage_id: stageId });
    setIsOpen(false);
  };

  const handleSetPriority = (priority: number) => {
    onBulkUpdate({ priority });
  };

  return (
    <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-4">
        <span className="font-medium">{selectedCount} orders selected</span>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 flex items-center"
          >
            Move to...
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-10 py-2">
              {stages
                .filter((stage) => !stage.is_hidden)
                .map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleMoveTo(stage.id)}
                  className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <span
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handleSetPriority(0)}
            className="px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-sm"
          >
            Normal
          </button>
          <button
            onClick={() => handleSetPriority(1)}
            className="px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-sm"
          >
            ⚡ High
          </button>
          <button
            onClick={() => handleSetPriority(2)}
            className="px-3 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 text-sm"
          >
            🔥 Rush
          </button>
        </div>
      </div>

      <button
        onClick={onClearSelection}
        className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30"
      >
        Clear Selection
      </button>
    </div>
  );
};

export default BulkActionsBar;
