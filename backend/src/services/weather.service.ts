import axios from 'axios';
import knex from '../database/knex';
import { settingsService } from './settings.service';

/**
 * Weather Service
 * Integrates with OpenWeatherMap API (free tier: 1,000 calls/day)
 * - Checks family_settings.features.weather.enabled before operations
 * - Caches weather data for 30 minutes to minimize API calls
 * - Supports Celsius/Fahrenheit toggle via settings
 * - Gracefully handles API failures with cached data
 */

interface WeatherConfig {
  apiKey: string;
  location: string;
  units: 'metric' | 'imperial'; // metric = Celsius, imperial = Fahrenheit
}

interface CurrentWeather {
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
  updatedAt: Date;
}

interface ForecastDay {
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

interface WeatherForecast {
  location: string;
  country: string;
  days: ForecastDay[];
  updatedAt: Date;
}

interface CachedWeather {
  id: number;
  family_id: number;
  location_code: string;
  weather_data: any;
  cached_at: Date;
  expires_at: Date;
}

class WeatherService {
  private readonly CACHE_DURATION_MINUTES = 30;
  private readonly API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

  /**
   * Check if weather is enabled for a family
   */
  async isEnabledForFamily(familyId: number): Promise<boolean> {
    try {
      const featureSettings = await settingsService.getSettings(familyId, 'features');
      return featureSettings?.weather?.enabled === true;
    } catch (error) {
      console.error('Error checking weather enabled status:', error);
      return false;
    }
  }

  /**
   * Get weather configuration for a family
   */
  async getWeatherConfig(familyId: number): Promise<WeatherConfig | null> {
    try {
      const featureSettings = await settingsService.getSettings(familyId, 'features');
      const weatherSettings = featureSettings?.weather;

      if (!weatherSettings?.enabled || !weatherSettings?.apiKey || !weatherSettings?.location) {
        return null;
      }

      return {
        apiKey: weatherSettings.apiKey,
        location: weatherSettings.location,
        units: weatherSettings.units || 'metric',
      };
    } catch (error) {
      console.error('Error getting weather config:', error);
      return null;
    }
  }

  /**
   * Test OpenWeatherMap API connection with provided credentials
   */
  async testApiConnection(apiKey: string, location: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/weather`, {
        params: {
          q: location,
          appid: apiKey,
          units: 'metric',
        },
        timeout: 5000,
      });

      return {
        success: true,
        message: 'Successfully connected to OpenWeatherMap API',
        data: {
          location: response.data.name,
          country: response.data.sys.country,
          temperature: response.data.main.temp,
          condition: response.data.weather[0].main,
        },
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Please check your OpenWeatherMap API key.',
        };
      } else if (error.response?.status === 404) {
        return {
          success: false,
          message: 'Location not found. Please enter a valid city name.',
        };
      } else {
        return {
          success: false,
          message: `API connection failed: ${error.message}`,
        };
      }
    }
  }

  /**
   * Get current weather for a family
   */
  async getCurrentWeather(familyId: number): Promise<CurrentWeather | null> {
    try {
      // Check if weather is enabled
      const isEnabled = await this.isEnabledForFamily(familyId);
      if (!isEnabled) {
        throw new Error('Weather feature is not enabled for this family');
      }

      // Get weather configuration
      const config = await this.getWeatherConfig(familyId);
      if (!config) {
        throw new Error('Weather configuration not found');
      }

      // Check cache first
      const cachedData = await this.getCachedWeather(familyId, config.location, 'current');
      if (cachedData && !this.isCacheExpired(cachedData)) {
        return this.parseCurrentWeather(cachedData.weather_data, config.location);
      }

      // Fetch from API
      const response = await axios.get(`${this.API_BASE_URL}/weather`, {
        params: {
          q: config.location,
          appid: config.apiKey,
          units: config.units,
        },
        timeout: 5000,
      });

      // Cache the response
      await this.cacheWeatherData(familyId, config.location, 'current', response.data);

      return this.parseCurrentWeather(response.data, config.location);
    } catch (error: any) {
      console.error('Get current weather error:', error);

      // Try to return cached data even if expired
      const config = await this.getWeatherConfig(familyId);
      if (config) {
        const cachedData = await this.getCachedWeather(familyId, config.location, 'current');
        if (cachedData) {
          console.log('Returning expired cached data due to API failure');
          return this.parseCurrentWeather(cachedData.weather_data, config.location);
        }
      }

      throw new Error(`Failed to get current weather: ${error.message}`);
    }
  }

  /**
   * Get weather forecast for a family
   */
  async getWeatherForecast(familyId: number): Promise<WeatherForecast | null> {
    try {
      // Check if weather is enabled
      const isEnabled = await this.isEnabledForFamily(familyId);
      if (!isEnabled) {
        throw new Error('Weather feature is not enabled for this family');
      }

      // Get weather configuration
      const config = await this.getWeatherConfig(familyId);
      if (!config) {
        throw new Error('Weather configuration not found');
      }

      // Check cache first
      const cachedData = await this.getCachedWeather(familyId, config.location, 'forecast');
      if (cachedData && !this.isCacheExpired(cachedData)) {
        return this.parseForecast(cachedData.weather_data, config.location);
      }

      // Fetch from API (24 data points = 3 days with 3-hour intervals)
      const response = await axios.get(`${this.API_BASE_URL}/forecast`, {
        params: {
          q: config.location,
          appid: config.apiKey,
          units: config.units,
          cnt: 24,
        },
        timeout: 5000,
      });

      // Cache the response
      await this.cacheWeatherData(familyId, config.location, 'forecast', response.data);

      return this.parseForecast(response.data, config.location);
    } catch (error: any) {
      console.error('Get weather forecast error:', error);

      // Try to return cached data even if expired
      const config = await this.getWeatherConfig(familyId);
      if (config) {
        const cachedData = await this.getCachedWeather(familyId, config.location, 'forecast');
        if (cachedData) {
          console.log('Returning expired cached forecast data due to API failure');
          return this.parseForecast(cachedData.weather_data, config.location);
        }
      }

      throw new Error(`Failed to get weather forecast: ${error.message}`);
    }
  }

  /**
   * Get cached weather data
   */
  private async getCachedWeather(
    familyId: number,
    location: string,
    type: string
  ): Promise<CachedWeather | null> {
    const locationCode = `${location}-${type}`;
    const cached = await knex('weather_cache')
      .where({ family_id: familyId, location_code: locationCode })
      .first();

    return cached || null;
  }

  /**
   * Cache weather data
   */
  private async cacheWeatherData(
    familyId: number,
    location: string,
    type: string,
    data: any
  ): Promise<void> {
    const locationCode = `${location}-${type}`;
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION_MINUTES * 60 * 1000);

    const existing = await knex('weather_cache')
      .where({ family_id: familyId, location_code: locationCode })
      .first();

    if (existing) {
      await knex('weather_cache')
        .where({ id: existing.id })
        .update({
          weather_data: JSON.stringify(data),
          cached_at: knex.fn.now(),
          expires_at: expiresAt,
          updated_at: knex.fn.now(),
        });
    } else {
      await knex('weather_cache').insert({
        family_id: familyId,
        location_code: locationCode,
        weather_data: JSON.stringify(data),
        cached_at: knex.fn.now(),
        expires_at: expiresAt,
      });
    }
  }

  /**
   * Check if cache is expired
   */
  private isCacheExpired(cachedData: CachedWeather): boolean {
    return new Date(cachedData.expires_at) < new Date();
  }

  /**
   * Parse current weather from API response
   */
  private parseCurrentWeather(data: any, location: string): CurrentWeather {
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed),
      pressure: data.main.pressure,
      visibility: data.visibility,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      location: data.name || location,
      country: data.sys.country,
      updatedAt: new Date(),
    };
  }

  /**
   * Parse forecast from API response
   */
  private parseForecast(data: any, location: string): WeatherForecast {
    // Group forecast data by day
    const dayMap = new Map<string, any[]>();

    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      if (!dayMap.has(date)) {
        dayMap.set(date, []);
      }
      dayMap.get(date)!.push(item);
    });

    // Get next 3 days
    const days: ForecastDay[] = [];
    const sortedDates = Array.from(dayMap.keys()).sort();

    for (let i = 0; i < Math.min(3, sortedDates.length); i++) {
      const date = sortedDates[i];
      const dayData = dayMap.get(date)!;

      // Find max/min temps for the day
      const temps = dayData.map((d) => d.main.temp);
      const tempMax = Math.round(Math.max(...temps));
      const tempMin = Math.round(Math.min(...temps));

      // Use midday data for condition (or first available)
      const middayData = dayData.find((d) => {
        const hour = new Date(d.dt * 1000).getHours();
        return hour === 12;
      }) || dayData[0];

      // Calculate average wind speed
      const avgWindSpeed = Math.round(
        dayData.reduce((sum, d) => sum + d.wind.speed, 0) / dayData.length
      );

      // Calculate average humidity
      const avgHumidity = Math.round(
        dayData.reduce((sum, d) => sum + d.main.humidity, 0) / dayData.length
      );

      // Calculate total precipitation
      const precipitation = dayData.reduce((sum, d) => sum + (d.rain?.['3h'] || 0), 0);

      days.push({
        date,
        tempMax,
        tempMin,
        condition: middayData.weather[0].main,
        description: middayData.weather[0].description,
        icon: middayData.weather[0].icon,
        humidity: avgHumidity,
        windSpeed: avgWindSpeed,
        precipitation: Math.round(precipitation * 10) / 10,
      });
    }

    return {
      location: data.city.name || location,
      country: data.city.country,
      days,
      updatedAt: new Date(),
    };
  }

  /**
   * Clear expired cache entries (cleanup job)
   */
  async clearExpiredCache(): Promise<number> {
    const result = await knex('weather_cache')
      .where('expires_at', '<', knex.fn.now())
      .delete();

    console.log(`Cleared ${result} expired weather cache entries`);
    return result;
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
export default weatherService;
