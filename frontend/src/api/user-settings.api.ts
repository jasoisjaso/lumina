import apiClient from './axios.config';

/**
 * User Settings API
 * Manages user-specific settings and integrations
 */

// User-level integrations (personal to each user)
export interface UserIntegrationSettings {
  googleCalendar?: {
    enabled: boolean;
    connected: boolean;
    accessToken?: string;
    refreshToken?: string;
    calendarId?: string;
    lastSync?: string;
  };
  icloudCalendar?: {
    enabled: boolean;
    appleId?: string;
    appPassword?: string;
    calendarUrl?: string;
    lastSync?: string;
  };
  googlePhotos?: {
    enabled: boolean;
    connected: boolean;
    accessToken?: string;
    refreshToken?: string;
    albumId?: string;
    lastSync?: string;
  };
  icloudPhotos?: {
    enabled: boolean;
    appleId?: string;
    appPassword?: string;
    albumUrl?: string;
    lastSync?: string;
  };
}

// User preferences
export interface UserPreferences {
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  notifications?: {
    email?: boolean;
    push?: boolean;
    eventReminders?: boolean;
    orderUpdates?: boolean;
  };
  calendar?: {
    defaultView?: 'month' | 'week' | 'day';
    weekStartsOn?: number;
  };
}

class UserSettingsAPI {
  /**
   * Get all user settings
   */
  async getAllSettings(): Promise<{
    integrations: UserIntegrationSettings;
    preferences: UserPreferences;
  }> {
    const response = await apiClient.get('/user-settings');
    return response.data.settings;
  }

  /**
   * Get integrations settings
   */
  async getIntegrations(): Promise<UserIntegrationSettings> {
    const response = await apiClient.get('/user-settings/integrations');
    return response.data.settings;
  }

  /**
   * Get preferences settings
   */
  async getPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get('/user-settings/preferences');
    return response.data.settings;
  }

  /**
   * Update integrations settings
   */
  async updateIntegrations(settings: UserIntegrationSettings): Promise<void> {
    await apiClient.put('/user-settings/integrations', { settings });
  }

  /**
   * Update preferences settings
   */
  async updatePreferences(settings: UserPreferences): Promise<void> {
    await apiClient.put('/user-settings/preferences', { settings });
  }

  /**
   * Update specific integration
   */
  async updateIntegration(
    integration: 'googleCalendar' | 'icloudCalendar' | 'googlePhotos' | 'icloudPhotos',
    data: any
  ): Promise<void> {
    await apiClient.put(`/user-settings/integrations/${integration}`, data);
  }

  /**
   * Reset integrations to defaults
   */
  async resetIntegrations(): Promise<void> {
    await apiClient.post('/user-settings/reset/integrations');
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    await apiClient.post('/user-settings/reset/preferences');
  }
}

export default new UserSettingsAPI();
