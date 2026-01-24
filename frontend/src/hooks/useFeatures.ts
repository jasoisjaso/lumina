import { useState, useEffect, useCallback } from 'react';
import { featuresAPI, FeaturesStatusResponse } from '../api/features.api';

// Cache configuration
const CACHE_KEY = 'lumina_features_status';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000; // Auto-refresh every 5 minutes

interface CachedData {
  data: FeaturesStatusResponse;
  timestamp: number;
}

/**
 * Hook to fetch and cache feature status
 * Provides loading/error states and auto-refresh
 */
export const useFeatures = () => {
  const [features, setFeatures] = useState<FeaturesStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load features from cache if valid
   */
  const loadFromCache = useCallback((): FeaturesStatusResponse | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp }: CachedData = JSON.parse(cached);
      const age = Date.now() - timestamp;

      // Return cached data if less than 5 minutes old
      if (age < CACHE_DURATION) {
        return data;
      }

      // Clear expired cache
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Error loading from cache:', err);
      return null;
    }
  }, []);

  /**
   * Save features to cache
   */
  const saveToCache = useCallback((data: FeaturesStatusResponse) => {
    try {
      const cached: CachedData = {
        data,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }, []);

  /**
   * Fetch features from API
   */
  const fetchFeatures = useCallback(async (skipCache = false) => {
    try {
      // Try loading from cache first (unless explicitly skipped)
      if (!skipCache) {
        const cached = loadFromCache();
        if (cached) {
          setFeatures(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      // Fetch from API
      setLoading(true);
      setError(null);
      const data = await featuresAPI.getStatus();

      // Save to cache
      saveToCache(data);

      setFeatures(data);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching features:', err);
      setError(err.message || 'Failed to load feature status');
      setLoading(false);

      // On error, try to use stale cache data as fallback
      const cached = loadFromCache();
      if (cached) {
        setFeatures(cached);
      }
    }
  }, [loadFromCache, saveToCache]);

  /**
   * Force refresh (bypass cache)
   */
  const refresh = useCallback(() => {
    fetchFeatures(true);
  }, [fetchFeatures]);

  /**
   * Initial load and auto-refresh setup
   */
  useEffect(() => {
    // Initial load
    fetchFeatures();

    // Set up auto-refresh interval
    const intervalId = setInterval(() => {
      fetchFeatures(true); // Force refresh after interval
    }, REFRESH_INTERVAL);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [fetchFeatures]);

  return {
    features,
    loading,
    error,
    refresh,
  };
};

export default useFeatures;
