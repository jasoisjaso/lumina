import React, { useState, useEffect } from 'react';
import { weatherAPI, CurrentWeather, WeatherForecast } from '../api/weather.api';
import { useSettingsStore } from '../stores/settings.store';

/**
 * Weather Widget
 * Displays current weather or 3-day forecast in the header
 * - Toggle between current and forecast views
 * - Fetches from backend every 30 minutes (matching cache duration)
 * - Only displays if weather is enabled in settings
 * - Supports Celsius/Fahrenheit based on settings
 */

type WeatherView = 'current' | 'forecast';

const WeatherWidget: React.FC = () => {
  const { features } = useSettingsStore();
  const [view, setView] = useState<WeatherView>('current');
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isEnabled = features?.weather?.enabled || false;
  const units = features?.weather?.units || 'metric';

  useEffect(() => {
    if (!isEnabled) {
      setWeather(null);
      setForecast(null);
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

      // Load both current and forecast
      const [currentData, forecastData] = await Promise.all([
        weatherAPI.getCurrentWeather().catch(e => null),
        weatherAPI.getWeatherForecast().catch(e => null)
      ]);

      if (currentData) setWeather(currentData);
      if (forecastData) setForecast(forecastData);

      // If both failed, show error
      if (!currentData && !forecastData) {
        setError('Weather data unavailable');
      }
    } catch (err: any) {
      console.error('Load weather error:', err);
      setError(err.response?.data?.message || 'Failed to load weather');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleView = () => {
    setView(view === 'current' ? 'forecast' : 'current');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
  };

  // Don't render if weather is not enabled
  if (!isEnabled) {
    return null;
  }

  // Loading state
  if (isLoading && !weather && !forecast) {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-lg">
        <div className="w-5 h-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"></div>
        <span className="text-sm text-slate-600">Loading weather...</span>
      </div>
    );
  }

  // Error state
  if (error && !weather && !forecast) {
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

  // Current Weather View
  if (view === 'current' && weather) {
    return (
      <div
        onClick={toggleView}
        className="flex items-center space-x-2 md:space-x-3 px-3 md:px-5 py-2 md:py-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer select-none"
        style={{ minHeight: '64px' }}
        title="Click to see 3-day forecast"
      >
        {/* Weather Icon - Bigger */}
        <div className="flex-shrink-0">
          <img
            src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt={weather.description}
            className="w-14 h-14 md:w-16 md:h-16 drop-shadow-lg"
          />
        </div>

        {/* Temperature and Condition - Bigger & Bolder */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl md:text-3xl font-bold text-slate-900 tabular-nums">
              {weather.temperature}°
            </span>
            <span className="text-sm md:text-base text-slate-600 font-medium uppercase">
              {units === 'metric' ? 'C' : 'F'}
            </span>
          </div>
          <span className="text-sm md:text-base text-slate-700 capitalize font-medium leading-tight truncate">
            {weather.condition}
          </span>
        </div>

        {/* Location - Desktop only */}
        <div className="hidden lg:flex flex-col border-l-2 border-blue-300 pl-3 min-w-0">
          <span className="text-sm font-semibold text-slate-800 truncate">{weather.location}</span>
          <span className="text-sm text-slate-600 truncate">
            Feels like {weather.feelsLike}°
          </span>
        </div>

        {/* Toggle indicator */}
        <div className="flex-shrink-0 ml-1">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    );
  }

  // Forecast View
  if (view === 'forecast' && forecast) {
    return (
      <div
        onClick={toggleView}
        className="flex items-center space-x-2 md:space-x-4 px-3 md:px-5 py-2 md:py-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer select-none"
        style={{ minHeight: '64px' }}
        title="Click to see current weather"
      >
        {/* 3-Day Forecast - Bigger */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {forecast.days.slice(0, 3).map((day, index) => (
            <div key={index} className="flex flex-col items-center">
              <span className="text-xs md:text-sm text-slate-700 font-semibold mb-1">{formatDate(day.date)}</span>
              <img
                src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                alt={day.description}
                className="w-10 h-10 md:w-12 md:h-12 drop-shadow-lg"
              />
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-sm md:text-base font-bold text-slate-900 tabular-nums">
                  {day.tempMax}°
                </span>
                <span className="text-xs md:text-sm text-slate-600 font-medium tabular-nums">
                  {day.tempMin}°
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Location - Desktop only */}
        <div className="hidden lg:flex flex-col border-l-2 border-blue-300 pl-3 min-w-0">
          <span className="text-sm font-semibold text-slate-800 truncate">{forecast.location}</span>
          <span className="text-sm text-slate-600 truncate">
            3-day forecast
          </span>
        </div>

        {/* Toggle indicator */}
        <div className="flex-shrink-0 ml-1">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return null;
};

export default WeatherWidget;
