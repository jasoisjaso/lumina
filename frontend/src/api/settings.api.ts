import apiClient from './axios.config';

/**
 * Settings API
 * Handles family configuration settings
 */

export interface IntegrationSettings {
  woocommerce?: {
    enabled: boolean;
    storeUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    lastSync?: string;
  };
  googleCalendar?: {
    enabled: boolean;
    connected: boolean;
  };
  icloudCalendar?: {
    enabled: boolean;
    appleId?: string;
    appPassword?: string;
    calendarUrl?: string;
  };
}

export interface FeatureSettings {
  chores?: {
    enabled: boolean;
    showLeaderboard?: boolean;
    requirePhotos?: boolean;
    streakReminders?: boolean;
    weeklyGoal?: number;
    pointsMultiplier?: number;
  };
  weather?: {
    enabled: boolean;
    apiKey?: string;
    location?: string;
    units?: 'metric' | 'imperial';
  };
  photos?: {
    enabled: boolean;
    source?: string;
  };
  photoGallery?: {
    enabled: boolean;
    storage?: {
      maxUploadMb?: number;
      allowedTypes?: string[];
    };
    features?: {
      autoRotate?: boolean;
      generateThumbnails?: boolean;
    };
  };
  kioskMode?: {
    enabled: boolean;
    pin?: string;
    slideshow?: {
      sources?: ('photos' | 'calendar' | 'weather' | 'dashboard')[];
      idleTimeout?: number; // minutes
      slideDuration?: number; // seconds
    };
    display?: {
      autoFullscreen?: boolean;
      preventSleep?: boolean;
    };
  };
}

export interface CalendarSettings {
  defaultView?: 'month' | 'week' | 'day';
  startDayOfWeek?: number;
  showWeather?: boolean;
  showOrders?: boolean;
  eventColors?: {
    family: string;
    personal: string;
    work: string;
    orders: string;
  };
}

export type SettingsType = 'integrations' | 'features' | 'calendar';

export const settingsAPI = {
  /**
   * Get settings by type
   */
  async getSettings(type: SettingsType): Promise<any> {
    const response = await apiClient.get(`/settings/${type}`);
    return response.data.settings;
  },

  /**
   * Update settings by type
   */
  async updateSettings(type: SettingsType, settings: any): Promise<any> {
    const response = await apiClient.put(`/settings/${type}`, { settings });
    return response.data.settings;
  },

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<{
    integrations: IntegrationSettings;
    features: FeatureSettings;
    calendar: CalendarSettings;
  }> {
    const response = await apiClient.get('/settings');
    return response.data.settings;
  },

  /**
   * Reset settings to defaults
   */
  async resetSettings(type: SettingsType): Promise<any> {
    const response = await apiClient.post(`/settings/${type}/reset`);
    return response.data.settings;
  },

  /**
   * Test integration connection
   */
  async testIntegration(
    integration: string,
    credentials: any
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/settings/integrations/${integration}/test`, {
      credentials,
    });
    return response.data;
  },

  /**
   * Get server statistics (admin only)
   */
  async getServerStats(): Promise<any> {
    const response = await apiClient.get('/settings/admin/server-stats');
    return response.data;
  },

  /**
   * Get error logs (admin only)
   */
  async getErrorLogs(): Promise<any> {
    const response = await apiClient.get('/settings/admin/error-logs');
    return response.data;
  },
};

export default settingsAPI;
