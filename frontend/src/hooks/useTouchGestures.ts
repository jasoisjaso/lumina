import { useEffect, useRef, useCallback, useState } from 'react';

export interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: (scale: number) => void;
  onPinchOut?: (scale: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onPullToRefresh?: () => void | Promise<void>;
  swipeThreshold?: number; // Minimum distance for swipe (default: 50px)
  longPressDelay?: number; // Delay for long press (default: 500ms)
  pullToRefreshThreshold?: number; // Distance to trigger refresh (default: 80px)
  enabled?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export const useTouchGestures = <T extends HTMLElement>(
  options: TouchGestureOptions = {}
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchIn,
    onPinchOut,
    onLongPress,
    onPullToRefresh,
    swipeThreshold = 50,
    longPressDelay = 500,
    pullToRefreshThreshold = 80,
    enabled = true,
  } = options;

  const elementRef = useRef<T>(null);
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchStartDistanceRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPullingRef = useRef<boolean>(false);

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      // Handle multi-touch for pinch
      if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        touchStartDistanceRef.current = distance;
      }

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (touchStartRef.current) {
            onLongPress(touchStartRef.current.x, touchStartRef.current.y);
          }
        }, longPressDelay);
      }

      // Check if at top of scroll for pull-to-refresh
      if (onPullToRefresh && elementRef.current) {
        const scrollTop =
          elementRef.current.scrollTop || window.pageYOffset || document.documentElement.scrollTop;
        isPullingRef.current = scrollTop === 0;
      }
    },
    [enabled, onLongPress, onPullToRefresh, longPressDelay]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      clearLongPressTimer();

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Handle pinch zoom
      if (e.touches.length === 2 && touchStartDistanceRef.current !== null) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        );
        const scale = distance / touchStartDistanceRef.current;

        if (scale > 1.1 && onPinchOut) {
          onPinchOut(scale);
        } else if (scale < 0.9 && onPinchIn) {
          onPinchIn(scale);
        }
      }

      // Handle pull-to-refresh
      if (isPullingRef.current && onPullToRefresh && deltaY > 0) {
        e.preventDefault();
        const pull = Math.min(deltaY, pullToRefreshThreshold * 1.5);
        setPullDistance(pull);

        if (pull >= pullToRefreshThreshold) {
          // Visual feedback for ready-to-refresh state
          if (elementRef.current) {
            elementRef.current.style.transform = `translateY(${pullToRefreshThreshold}px)`;
          }
        }
      }
    },
    [
      enabled,
      clearLongPressTimer,
      onPinchIn,
      onPinchOut,
      onPullToRefresh,
      pullToRefreshThreshold,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      clearLongPressTimer();

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Only trigger swipes for fast gestures (< 300ms)
      const isQuickGesture = deltaTime < 300;

      // Determine swipe direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > swipeThreshold && isQuickGesture) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
          }
        }
      } else {
        // Vertical swipe
        if (Math.abs(deltaY) > swipeThreshold && isQuickGesture) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
          }
        }
      }

      // Handle pull-to-refresh release
      if (isPullingRef.current && onPullToRefresh && pullDistance >= pullToRefreshThreshold) {
        setIsPullRefreshing(true);
        Promise.resolve(onPullToRefresh()).finally(() => {
          setIsPullRefreshing(false);
          setPullDistance(0);
          if (elementRef.current) {
            elementRef.current.style.transform = '';
          }
        });
      } else {
        setPullDistance(0);
        if (elementRef.current) {
          elementRef.current.style.transform = '';
        }
      }

      // Reset state
      touchStartRef.current = null;
      touchStartDistanceRef.current = null;
      isPullingRef.current = false;
    },
    [
      enabled,
      clearLongPressTimer,
      swipeThreshold,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onPullToRefresh,
      pullDistance,
      pullToRefreshThreshold,
    ]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      clearLongPressTimer();
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, clearLongPressTimer]);

  return {
    ref: elementRef,
    isPullRefreshing,
    pullDistance,
    pullProgress: Math.min((pullDistance / pullToRefreshThreshold) * 100, 100),
  };
};

// Utility hook for swipe navigation between views
export const useSwipeNavigation = <T extends HTMLElement = HTMLElement>(
  currentIndex: number,
  maxIndex: number,
  onChange: (index: number) => void
) => {
  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < maxIndex) {
      onChange(currentIndex + 1);
    }
  }, [currentIndex, maxIndex, onChange]);

  const handleSwipeRight = useCallback(() => {
    if (currentIndex > 0) {
      onChange(currentIndex - 1);
    }
  }, [currentIndex, onChange]);

  return useTouchGestures<T>({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });
};

// Utility hook for pull-to-refresh
export const usePullToRefresh = <T extends HTMLElement = HTMLElement>(
  onRefresh: () => void | Promise<void>
) => {
  return useTouchGestures<T>({
    onPullToRefresh: onRefresh,
  });
};
