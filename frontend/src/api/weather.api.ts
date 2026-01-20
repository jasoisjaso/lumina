import apiClient from './axios.config';

/**
 * Weather API
 * Handles OpenWeatherMap integration for current weather and forecasts
 */

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  sunrise: number;
  sunset: number;
  location: string;
  country: string;
  updatedAt: string;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
}

export interface WeatherForecast {
  location: string;
  country: string;
  days: ForecastDay[];
  updatedAt: string;
}

export interface WeatherStatus {
  enabled: boolean;
  configured: boolean;
  location: string | null;
  units: 'metric' | 'imperial';
}

export const weatherAPI = {
  /**
   * Get current weather for the authenticated user's family
   */
  async getCurrentWeather(): Promise<CurrentWeather> {
    const response = await apiClient.get('/weather/current');
    return response.data.weather;
  },

  /**
   * Get 3-day weather forecast
   */
  async getWeatherForecast(): Promise<WeatherForecast> {
    const response = await apiClient.get('/weather/forecast');
    return response.data.forecast;
  },

  /**
   * Test API connection with provided credentials
   */
  async testApiConnection(apiKey: string, location: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    const response = await apiClient.post('/weather/test', {
      apiKey,
      location,
    });
    return response.data;
  },

  /**
   * Get weather feature status
   */
  async getWeatherStatus(): Promise<WeatherStatus> {
    const response = await apiClient.get('/weather/status');
    return response.data;
  },

  /**
   * Clear weather cache
   */
  async clearCache(): Promise<{ message: string; entriesRemoved: number }> {
    const response = await apiClient.post('/weather/clear-cache');
    return response.data;
  },
};

export default weatherAPI;
