import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';

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

interface FilterBarProps {
  filterOptions: FilterOptions;
  activeFilters: ActiveFilters;
  onFiltersChange: (filters: ActiveFilters) => void;
  className?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filterOptions,
  activeFilters,
  onFiltersChange,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<ActiveFilters>(activeFilters);

  // Update local filters when active filters change from parent
  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  // Count active filters
  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key as keyof ActiveFilters]
  ).length;

  const handleFilterChange = (filterKey: keyof ActiveFilters, value: string) => {
    const newFilters = {
      ...localFilters,
      [filterKey]: value || undefined,
    };

    // Remove empty values
    if (!value) {
      delete newFilters[filterKey];
    }

    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    setLocalFilters({});
    onFiltersChange({});
  };

  // Quick date presets
  const getDatePreset = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const applyDatePreset = (days: number) => {
    const newFilters = {
      ...localFilters,
      date_from: getDatePreset(days),
      date_to: new Date().toISOString().split('T')[0],
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className={`bg-white rounded-xl shadow-md border border-slate-200 ${className}`}>
      {/* Header - Always Visible */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <FunnelIcon className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="text-xs text-slate-600 hover:text-indigo-600 font-medium transition-colors"
            >
              Clear All
            </button>
          )}
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Filter Controls - Expandable */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Board Style Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-700 mb-1.5">
                Board Style
              </label>
              <select
                value={localFilters.board_style || ''}
                onChange={(e) => handleFilterChange('board_style', e.target.value)}
                className="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Styles</option>
                {filterOptions.board_styles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-700 mb-1.5">
                Font
              </label>
              <select
                value={localFilters.font || ''}
                onChange={(e) => handleFilterChange('font', e.target.value)}
                className="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Fonts</option>
                {filterOptions.fonts.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Board Color Filter */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-700 mb-1.5">
                Board Color
              </label>
              <select
                value={localFilters.board_color || ''}
                onChange={(e) => handleFilterChange('board_color', e.target.value)}
                className="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              >
                <option value="">All Colors</option>
                {filterOptions.board_colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Quick Presets */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-slate-700 mb-1.5">
                Date Range
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() => applyDatePreset(7)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    localFilters.date_from === getDatePreset(7)
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  7 days
                </button>
                <button
                  onClick={() => applyDatePreset(30)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    localFilters.date_from === getDatePreset(30)
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  30 days
                </button>
              </div>
            </div>
          </div>

          {/* Custom Date Range (Optional) */}
          {(localFilters.date_from || localFilters.date_to) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-700 mb-1.5">
                  From Date
                </label>
                <input
                  type="date"
                  value={localFilters.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-700 mb-1.5">
                  To Date
                </label>
                <input
                  type="date"
                  value={localFilters.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="block w-full rounded-lg border-slate-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                {localFilters.board_style && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    Style: {localFilters.board_style}
                    <button
                      onClick={() => handleFilterChange('board_style', '')}
                      className="ml-1.5 inline-flex items-center justify-center"
                    >
                      <XMarkIcon className="h-3.5 w-3.5 hover:text-indigo-900" />
                    </button>
                  </span>
                )}

                {localFilters.font && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    Font: {localFilters.font}
                    <button
                      onClick={() => handleFilterChange('font', '')}
                      className="ml-1.5 inline-flex items-center justify-center"
                    >
                      <XMarkIcon className="h-3.5 w-3.5 hover:text-indigo-900" />
                    </button>
                  </span>
                )}

                {localFilters.board_color && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    Color: {localFilters.board_color}
                    <button
                      onClick={() => handleFilterChange('board_color', '')}
                      className="ml-1.5 inline-flex items-center justify-center"
                    >
                      <XMarkIcon className="h-3.5 w-3.5 hover:text-indigo-900" />
                    </button>
                  </span>
                )}

                {(localFilters.date_from || localFilters.date_to) && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    Date: {localFilters.date_from} to {localFilters.date_to}
                    <button
                      onClick={() => {
                        handleFilterChange('date_from', '');
                        handleFilterChange('date_to', '');
                      }}
                      className="ml-1.5 inline-flex items-center justify-center"
                    >
                      <XMarkIcon className="h-3.5 w-3.5 hover:text-indigo-900" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
