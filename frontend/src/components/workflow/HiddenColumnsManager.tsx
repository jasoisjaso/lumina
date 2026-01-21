import React, { useState, useRef, useEffect } from 'react';
import { EyeSlashIcon, EyeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { WorkflowStage } from '../../api/workflow.api';

interface HiddenColumnsManagerProps {
  stages: WorkflowStage[];
  onShowColumn: (stageId: number) => void;
  onShowAll: () => void;
}

const HiddenColumnsManager: React.FC<HiddenColumnsManagerProps> = ({
  stages,
  onShowColumn,
  onShowAll,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hiddenStages = stages.filter((stage) => stage.is_hidden);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if no hidden stages
  if (hiddenStages.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors text-amber-800"
      >
        <EyeSlashIcon className="h-4 w-4" />
        <span className="text-sm font-medium">
          Hidden: {hiddenStages.length}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700">Hidden Columns</h4>
            <p className="text-xs text-gray-500 mt-1">
              Click to restore a hidden column
            </p>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {hiddenStages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  onShowColumn(stage.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm text-gray-700 flex-1">{stage.name}</span>
                <EyeIcon className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>

          {hiddenStages.length > 1 && (
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => {
                  onShowAll();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors font-medium"
              >
                Show all columns
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HiddenColumnsManager;
