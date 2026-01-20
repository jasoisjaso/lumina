import React, { useState, useEffect } from 'react';

interface KioskLayoutProps {
  children: React.ReactNode;
  onExitKiosk?: () => void;
}

const KioskLayout: React.FC<KioskLayoutProps> = ({ children, onExitKiosk }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tapCount, setTapCount] = useState(0);
  const [tapTimer, setTapTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Triple-tap in top-left corner to exit kiosk mode
  const handleCornerTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if tap is in top-left 100x100px area
    if (x <= 100 && y <= 100) {
      setTapCount((prev) => prev + 1);

      // Clear existing timer
      if (tapTimer) {
        clearTimeout(tapTimer);
      }

      // Set new timer to reset tap count
      const newTimer = setTimeout(() => {
        setTapCount(0);
      }, 1000);
      setTapTimer(newTimer);
    }
  };

  useEffect(() => {
    if (tapCount >= 3) {
      onExitKiosk?.();
      setTapCount(0);
    }
  }, [tapCount, onExitKiosk]);

  // Disable right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Disable text selection
  useEffect(() => {
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.body.style.userSelect = 'auto';
      document.body.style.webkitUserSelect = 'auto';
    };
  }, []);

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
    <div
      className="min-h-screen bg-slate-50 flex flex-col overflow-hidden"
      onClick={handleCornerTap}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        KhtmlUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Minimal Top Bar - Just Time and Date */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          {/* Date */}
          <div>
            <p className="text-sm text-slate-500">{formatDate(currentTime)}</p>
          </div>

          {/* Time */}
          <div className="text-right">
            <p className="text-3xl font-medium text-slate-800">{formatTime(currentTime)}</p>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Hidden exit indicator for triple-tap area */}
      {tapCount > 0 && (
        <div className="fixed top-4 left-4 bg-black/50 text-white px-3 py-2 rounded-lg text-sm">
          Tap {3 - tapCount} more time{3 - tapCount !== 1 ? 's' : ''} to exit
        </div>
      )}
    </div>
  );
};

export default KioskLayout;
