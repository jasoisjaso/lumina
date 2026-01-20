import React from 'react';

interface KioskNavigationProps {
  currentView: 'calendar' | 'photos' | 'dashboard';
  onViewChange: (view: 'calendar' | 'photos' | 'dashboard') => void;
  showPhotos?: boolean;
}

const KioskNavigation: React.FC<KioskNavigationProps> = ({
  currentView,
  onViewChange,
  showPhotos = true,
}) => {
  const navItems = [
    {
      id: 'calendar' as const,
      label: 'Calendar',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    ...(showPhotos
      ? [
          {
            id: 'photos' as const,
            label: 'Photos',
            icon: (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ),
          },
        ]
      : []),
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bg-white border-t border-slate-200 flex-shrink-0">
      <div className="flex justify-around items-center px-4 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`flex flex-col items-center justify-center px-6 py-4 rounded-xl transition-all min-w-[120px] min-h-[80px] ${
              currentView === item.id
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
            }`}
            style={{
              // Large touch target - minimum 44x44px for accessibility
              minHeight: '80px',
              minWidth: '120px',
            }}
          >
            <div className="mb-2">{item.icon}</div>
            <span className="text-lg font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default KioskNavigation;
