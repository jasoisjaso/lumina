import { useEffect, useState, useCallback } from 'react';

interface KioskModeOptions {
  autoFullscreen?: boolean;
  preventSleep?: boolean;
  idleTimeout?: number; // milliseconds
  onIdle?: () => void;
  onActive?: () => void;
}

interface KioskModeState {
  isFullscreen: boolean;
  isIdle: boolean;
  wakeLockActive: boolean;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
}

export const useKioskMode = (options: KioskModeOptions = {}): KioskModeState => {
  const {
    autoFullscreen = false,
    preventSleep = true,
    idleTimeout = 120000, // 2 minutes default
    onIdle,
    onActive,
  } = options;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);

  // Request wake lock to prevent sleep
  const requestWakeLock = useCallback(async () => {
    if (!preventSleep || !('wakeLock' in navigator)) {
      return;
    }

    try {
      const lock = await (navigator as any).wakeLock.request('screen');
      setWakeLock(lock);
      setWakeLockActive(true);
      console.log('Wake Lock activated');

      lock.addEventListener('release', () => {
        console.log('Wake Lock released');
        setWakeLockActive(false);
      });
    } catch (err) {
      console.error('Wake Lock error:', err);
    }
  }, [preventSleep]);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        setWakeLockActive(false);
      } catch (err) {
        console.error('Wake Lock release error:', err);
      }
    }
  }, [wakeLock]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error('Fullscreen request error:', err);
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error('Fullscreen exit error:', err);
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;

      setIsFullscreen(!!isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Auto-fullscreen on mount
  useEffect(() => {
    if (autoFullscreen) {
      enterFullscreen();
    }
  }, [autoFullscreen, enterFullscreen]);

  // Request wake lock on mount
  useEffect(() => {
    if (preventSleep) {
      requestWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [preventSleep, requestWakeLock, releaseWakeLock]);

  // Re-request wake lock when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && preventSleep && !wakeLockActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [preventSleep, wakeLockActive, requestWakeLock]);

  // Idle detection
  const resetIdleTimer = useCallback(() => {
    if (isIdle) {
      setIsIdle(false);
      onActive?.();
    }

    if (idleTimer) {
      clearTimeout(idleTimer);
    }

    const newTimer = setTimeout(() => {
      setIsIdle(true);
      onIdle?.();
    }, idleTimeout);

    setIdleTimer(newTimer);
  }, [isIdle, idleTimer, idleTimeout, onIdle, onActive]);

  // Set up idle detection
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    // Initialize idle timer
    resetIdleTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetIdleTimer, true);
      });

      if (idleTimer) {
        clearTimeout(idleTimer);
      }
    };
  }, [resetIdleTimer, idleTimer]);

  return {
    isFullscreen,
    isIdle,
    wakeLockActive,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
};

export default useKioskMode;
