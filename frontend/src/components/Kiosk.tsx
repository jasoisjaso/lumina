import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/settings.store';
import KioskLayout from './KioskLayout';
import KioskSlideshow from './KioskSlideshow';
import KioskNavigation from './KioskNavigation';
import Calendar from './Calendar';
import PhotoGallery from './PhotoGallery';
import useKioskMode from '../hooks/useKioskMode';

type KioskView = 'calendar' | 'photos' | 'dashboard';

interface KioskProps {
  onError?: (error: string) => void;
}

const Kiosk: React.FC<KioskProps> = ({ onError }) => {
  const navigate = useNavigate();
  const { features } = useSettingsStore();
  const [currentView, setCurrentView] = useState<KioskView>('calendar');
  const [showSlideshow, setShowSlideshow] = useState(false);

  // Initialize kiosk mode with settings
  const { isIdle, isFullscreen, enterFullscreen, wakeLockActive } = useKioskMode({
    autoFullscreen: false, // Can be controlled by settings
    preventSleep: true,
    idleTimeout: 120000, // 2 minutes
    onIdle: () => {
      setShowSlideshow(true);
    },
    onActive: () => {
      setShowSlideshow(false);
    },
  });

  // Exit kiosk mode
  const handleExitKiosk = () => {
    navigate('/');
  };

  // Handle view change
  const handleViewChange = (view: KioskView) => {
    setCurrentView(view);
  };

  // Show fullscreen prompt if not in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      const timer = setTimeout(() => {
        const shouldFullscreen = window.confirm(
          'Do you want to enter fullscreen mode for the best kiosk experience?'
        );
        if (shouldFullscreen) {
          enterFullscreen();
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isFullscreen, enterFullscreen]);

  return (
    <>
      {showSlideshow ? (
        <KioskSlideshow
          onExit={() => setShowSlideshow(false)}
          slideDuration={15}
          enabledSources={['photos', 'calendar', 'weather', 'dashboard']}
        />
      ) : (
        <KioskLayout onExitKiosk={handleExitKiosk}>
          <div className="h-full flex flex-col">
            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              {currentView === 'calendar' && <Calendar onError={onError} />}
              {currentView === 'photos' && features.photoGallery?.enabled && (
                <PhotoGallery onError={onError} />
              )}
              {currentView === 'dashboard' && (
                <div className="h-full flex items-center justify-center bg-slate-100">
                  <div className="text-center text-slate-600">
                    <h2 className="text-4xl font-bold mb-4">Dashboard View</h2>
                    <p className="text-xl">Family information and quick stats</p>
                  </div>
                </div>
              )}
            </div>

            {/* Kiosk Navigation */}
            <KioskNavigation
              currentView={currentView}
              onViewChange={handleViewChange}
              showPhotos={features.photoGallery?.enabled || false}
            />
          </div>

          {/* Status Indicators */}
          <div className="fixed top-4 right-4 flex gap-2">
            {isFullscreen && (
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                Fullscreen
              </div>
            )}
            {wakeLockActive && (
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                Screen Lock
              </div>
            )}
            {isIdle && (
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                Idle
              </div>
            )}
          </div>
        </KioskLayout>
      )}
    </>
  );
};

export default Kiosk;
