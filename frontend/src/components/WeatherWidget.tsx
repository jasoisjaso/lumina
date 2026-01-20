import React, { useState, useEffect } from 'react';
import { weatherAPI, CurrentWeather } from '../api/weather.api';
import { useSettingsStore } from '../stores/settings.store';

/**
 * Weather Widget
 * Displays current weather in the header
 * - Fetches from backend every 30 minutes (matching cache duration)
 * - Only displays if weather is enabled in settings
 * - Supports Celsius/Fahrenheit based on settings
 */

const WeatherWidget: React.FC = () => {
  const { features } = useSettingsStore();
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEnabled = features?.weather?.enabled || false;
  const units = features?.weather?.units || 'metric';

  useEffect(() => {
    if (!isEnabled) {
      setWeather(null);
      setIsLoading(false);
      return;
    }

    loadWeather();

    // Refresh every 30 minutes (matching cache duration)
    const interval = setInterval(() => {
      loadWeather();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  const loadWeather = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await weatherAPI.getCurrentWeather();
      setWeather(data);
    } catch (err: any) {
      console.error('Load weather error:', err);
      setError(err.response?.data?.message || 'Failed to load weather');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if weather is not enabled
  if (!isEnabled) {
    return null;
  }

  // Loading state
  if (isLoading && !weather) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-lg">
        <div className="w-5 h-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
        <span className="text-sm text-slate-600">Loading weather...</span>
      </div>
    );
  }

  // Error state
  if (error && !weather) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-sm text-red-700">Weather unavailable</span>
      </div>
    );
  }

  // No weather data
  if (!weather) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 md:space-x-2 px-2 md:px-4 py-1.5 md:py-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer select-none" style={{ minHeight: '44px' }}>
      {/* Weather Icon */}
      <div className="flex-shrink-0">
        <img
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
          alt={weather.description}
          className="w-8 h-8 md:w-10 md:h-10"
        />
      </div>

      {/* Temperature and Condition */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-baseline space-x-0.5 md:space-x-1">
          <span className="text-base md:text-lg font-semibold text-slate-800 tabular-nums">
            {weather.temperature}°
          </span>
          <span className="text-xs text-slate-500 uppercase">
            {units === 'metric' ? 'C' : 'F'}
          </span>
        </div>
        <span className="text-xs text-slate-600 capitalize leading-tight truncate hidden sm:block">
          {weather.condition}
        </span>
      </div>

      {/* Location - Desktop only */}
      <div className="hidden lg:flex flex-col border-l border-slate-300 pl-2 min-w-0">
        <span className="text-xs font-medium text-slate-700 truncate">{weather.location}</span>
        <span className="text-xs text-slate-500 truncate">
          Feels like {weather.feelsLike}°
        </span>
      </div>
    </div>
  );
};

export default WeatherWidget;
