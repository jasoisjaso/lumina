import React, { useState } from 'react';
import { useFeatures } from '../hooks/useFeatures';
import { FeatureStatus } from '../api/features.api';

type View = 'dashboard' | 'calendar' | 'photos' | 'weather' | 'workflow';

interface MobileNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
  onSettingsClick?: () => void;
  onKioskClick?: () => void;
}

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
}

const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onViewChange,
  onSettingsClick,
  onKioskClick,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { features, loading: featuresLoading } = useFeatures();

  /**
   * Render status badge for a feature
   */
  const renderStatusBadge = (feature: FeatureStatus) => {
    if (!feature.message || feature.message === 'Active' || feature.message === 'Ready') {
      return null;
    }

    let badgeClass = '';
    let badgeText = feature.message;

    switch (feature.message) {
      case 'Broken':
        badgeClass = 'bg-red-100 text-red-700 border-red-200';
        break;
      case 'Setup required':
      case 'Connecting':
        badgeClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
        badgeText = 'Setup';
        break;
      case 'Empty':
      case 'No orders yet':
        badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
        badgeText = 'Empty';
        break;
      case 'Synced':
        badgeClass = 'bg-green-100 text-green-700 border-green-200';
        badgeText = '✓';
        break;
      default:
        badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
    }

    return (
      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded border ${badgeClass}`}>
        {badgeText}
      </span>
    );
  };

  // Define all possible nav items
  const allNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'weather',
      label: 'Weather',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      ),
    },
    {
      id: 'workflow',
      label: 'Workflow',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  // Filter nav items based on feature status
  const navItems = allNavItems.filter((item) => {
    // Always show dashboard and calendar
    if (item.id === 'dashboard' || item.id === 'calendar') {
      return true;
    }

    // Don't filter if features haven't loaded yet (show all by default)
    if (featuresLoading || !features) {
      return true;
    }

    // Filter based on feature status
    switch (item.id) {
      case 'photos':
        return features.photos?.canShow;
      case 'workflow':
        return features.workflow?.canShow;
      case 'weather':
        return features.weather?.canShow;
      default:
        return true;
    }
  });

  const handleNavClick = (viewId: View) => {
    if (viewId === 'dashboard') {
      // Toggle drawer on home icon
      setIsDrawerOpen(!isDrawerOpen);
    } else {
      onViewChange(viewId);
      setIsDrawerOpen(false);
    }
  };

  const handleDrawerItemClick = (action: () => void) => {
    action();
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Slide-up Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-50 md:hidden transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: '70vh',
        }}
      >
        {/* Drawer Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-800">Menu</h2>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(70vh - 100px)' }}>
          <div className="space-y-3">
            {/* Settings */}
            {onSettingsClick && (
              <button
                onClick={() => handleDrawerItemClick(onSettingsClick)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                style={{ minHeight: '56px' }}
              >
                <svg className="w-6 h-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <div className="font-medium text-slate-800">Settings</div>
                  <div className="text-sm text-slate-600">Configure your dashboard</div>
                </div>
              </button>
            )}

            {/* Kiosk Mode */}
            {onKioskClick && (
              <button
                onClick={() => handleDrawerItemClick(onKioskClick)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors text-left"
                style={{ minHeight: '56px' }}
              >
                <svg className="w-6 h-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="font-medium text-indigo-800">Kiosk Mode</div>
                  <div className="text-sm text-indigo-600">
                    Fullscreen slideshow display
                  </div>
                </div>
              </button>
            )}

            {/* Quick Actions */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleDrawerItemClick(() => onViewChange('calendar'))}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                  style={{ minHeight: '80px' }}
                >
                  <svg className="w-8 h-8 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-sm font-medium text-slate-800">Calendar</div>
                </button>
                <button
                  onClick={() => handleDrawerItemClick(() => onViewChange('photos'))}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                  style={{ minHeight: '80px' }}
                >
                  <svg className="w-8 h-8 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-sm font-medium text-slate-800">Photos</div>
                </button>
                <button
                  onClick={() => handleDrawerItemClick(() => onViewChange('workflow'))}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors text-center"
                  style={{ minHeight: '80px' }}
                >
                  <svg className="w-8 h-8 text-indigo-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div className="text-sm font-medium text-slate-800">Workflow</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-30"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        }}
      >
        <div className="flex items-center justify-around px-2 pt-2">
          {navItems.map((item) => {
            const isActive = item.id === currentView || (item.id === 'dashboard' && isDrawerOpen);

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all relative ${
                  isActive
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={{
                  minWidth: '64px',
                  minHeight: '56px',
                }}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={`transition-transform ${isActive ? 'scale-110' : ''} relative`}>
                  {item.icon}
                  {/* Status indicator dot */}
                  {features && item.id !== 'dashboard' && (() => {
                    const featureKey = item.id as 'calendar' | 'photos' | 'workflow' | 'weather';
                    const feature = features[featureKey];
                    if (feature && typeof feature === 'object' && feature.message && feature.message !== 'Active' && feature.message !== 'Ready') {
                      const dotColor = feature.message === 'Broken' ? 'bg-red-500' :
                                     feature.message === 'Setup required' || feature.message === 'Connecting' ? 'bg-yellow-500' :
                                     feature.message === 'Empty' || feature.message === 'No orders yet' ? 'bg-gray-400' :
                                     feature.message === 'Synced' ? 'bg-green-500' : 'bg-blue-500';
                      return (
                        <span className={`absolute top-0 right-0 w-2 h-2 ${dotColor} rounded-full border border-white`} />
                      );
                    }
                    return null;
                  })()}
                </div>
                <span
                  className={`text-xs font-medium mt-1 ${
                    isActive ? 'font-semibold' : ''
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer for fixed bottom nav */}
      <div
        className="md:hidden"
        style={{ height: 'calc(72px + env(safe-area-inset-bottom))' }}
      />
    </>
  );
};

export default MobileNav;
