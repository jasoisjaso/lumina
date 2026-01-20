import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { authAPI } from '../api/auth.api';
import SettingsPanel from './SettingsPanel';
import WeatherWidget from './WeatherWidget';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  sidebar?: React.ReactNode;
  onError?: (error: string) => void;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, sidebar, onError, currentView, onViewChange }) => {
  const { user, refreshToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
      onLogout();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter',system-ui,-apple-system,sans-serif]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Skylight-style Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-full px-3 md:px-6 py-2 md:py-4">
          <div className="flex justify-between items-center gap-2">
            {/* Left: Family Name */}
            <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white text-base md:text-lg font-semibold">
                  {user?.first_name?.charAt(0) || 'L'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base md:text-xl font-semibold text-slate-800 truncate">
                  {user?.first_name}'s Family
                </h1>
                <p className="text-xs md:text-sm text-slate-500 truncate hidden sm:block">{formatDate(currentTime)}</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            {onViewChange && (
              <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => onViewChange('calendar')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'calendar'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Calendar
                </button>
                <button
                  onClick={() => onViewChange('photos')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'photos'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Photos
                </button>
                <button
                  onClick={() => onViewChange('workflow')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentView === 'workflow'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  style={{ minHeight: '40px' }}
                >
                  <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Workflow
                </button>
              </div>
            )}

            {/* Center: Weather Widget */}
            <div className="hidden lg:block">
              <WeatherWidget />
            </div>

            {/* Right: Time + Settings + User */}
            <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
              {/* Mobile Weather */}
              <div className="md:hidden">
                <WeatherWidget />
              </div>

              <div className="text-right hidden lg:block">
                <p className="text-xl md:text-2xl font-medium text-slate-800 tabular-nums">{formatTime(currentTime)}</p>
                <p className="text-xs text-slate-500">Local Time</p>
              </div>

              {/* Settings Button */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Settings"
                  style={{ minHeight: '40px', minWidth: '40px' }}
                >
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6 text-slate-600 hover:text-slate-800"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              )}

              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  {user?.color ? (
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-md"
                      style={{ backgroundColor: user.color }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <span className="text-slate-600 text-sm font-medium">
                        {user?.first_name?.charAt(0)}
                      </span>
                    </div>
                  )}
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/profile');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                      style={{ minHeight: '44px' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      style={{ minHeight: '44px' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="flex max-w-full">
        {/* Main Content Area */}
        <main
          className="flex-1 p-3 md:p-6 overflow-y-auto pb-20 md:pb-6"
          style={{ maxWidth: sidebar ? 'calc(100% - 0px)' : '100%', minHeight: 'calc(100vh - 60px)' }}
        >
          {children}
        </main>

        {/* Right Sidebar - Desktop only */}
        {sidebar && (
          <aside className="hidden lg:block w-[25%] bg-white border-l border-slate-200 p-6 overflow-y-auto sticky top-[73px] h-[calc(100vh-73px)]">
            {sidebar}
          </aside>
        )}
      </div>

      {/* Mobile Navigation */}
      {onViewChange && (
        <MobileNav
          currentView={currentView as 'dashboard' | 'calendar' | 'photos' | 'weather'}
          onViewChange={(view) => onViewChange(view)}
          onSettingsClick={user?.role === 'admin' ? () => setShowSettings(true) : undefined}
          onKioskClick={() => navigate('/kiosk')}
        />
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onError={(error) => {
            setShowSettings(false);
            onError?.(error);
          }}
        />
      )}
    </div>
  );
};

export default Layout;
