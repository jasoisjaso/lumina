import db from '../database/knex';

/**
 * User Settings Service
 * Manages user-specific settings and integrations
 *
 * User-level integrations: Google Calendar, iCloud Calendar, Photos
 * These are personal to each user, not shared across the family
 */

export interface UserSettings {
  id?: number;
  user_id: number;
  settings_type: string;
  settings_data: any;
  created_at?: Date;
  updated_at?: Date;
}

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
    weekStartsOn?: number; // 0 = Sunday, 1 = Monday
  };
}

export type UserSettingsType = 'integrations' | 'preferences';

class UserSettingsService {
  /**
   * Get settings for a user by type
   */
  async getSettings(userId: number, settingsType: UserSettingsType): Promise<any> {
    const settings = await db('user_settings')
      .where({
        user_id: userId,
        settings_type: settingsType,
      })
      .first();

    if (settings) {
      // Parse JSON if it's a string
      const settingsData =
        typeof settings.settings_data === 'string'
          ? JSON.parse(settings.settings_data)
          : settings.settings_data;

      return settingsData;
    }

    // Return default settings if not found
    return this.getDefaultSettings(settingsType);
  }

  /**
   * Update settings for a user
   */
  async updateSettings(
    userId: number,
    settingsType: UserSettingsType,
    settingsData: any
  ): Promise<void> {
    const existing = await db('user_settings')
      .where({
        user_id: userId,
        settings_type: settingsType,
      })
      .first();

    const jsonData = JSON.stringify(settingsData);

    if (existing) {
      await db('user_settings')
        .where({ id: existing.id })
        .update({
          settings_data: jsonData,
          updated_at: new Date(),
        });
    } else {
      await db('user_settings').insert({
        user_id: userId,
        settings_type: settingsType,
        settings_data: jsonData,
      });
    }
  }

  /**
   * Get all settings for a user
   */
  async getAllSettings(userId: number): Promise<{
    integrations: UserIntegrationSettings;
    preferences: UserPreferences;
  }> {
    const integrations = await this.getSettings(userId, 'integrations');
    const preferences = await this.getSettings(userId, 'preferences');

    return {
      integrations,
      preferences,
    };
  }

  /**
   * Check if a specific integration is enabled for a user
   */
  async isIntegrationEnabled(
    userId: number,
    integration: keyof UserIntegrationSettings
  ): Promise<boolean> {
    const settings = await this.getSettings(userId, 'integrations');
    return settings[integration]?.enabled === true;
  }

  /**
   * Get integration credentials for a user
   */
  async getIntegrationCredentials(
    userId: number,
    integration: keyof UserIntegrationSettings
  ): Promise<any | null> {
    const settings = await this.getSettings(userId, 'integrations');
    return settings[integration] || null;
  }

  /**
   * Update integration for a user
   */
  async updateIntegration(
    userId: number,
    integration: keyof UserIntegrationSettings,
    integrationData: any
  ): Promise<void> {
    const currentSettings = await this.getSettings(userId, 'integrations');
    const updatedSettings = {
      ...currentSettings,
      [integration]: integrationData,
    };
    await this.updateSettings(userId, 'integrations', updatedSettings);
  }

  /**
   * Get default settings for a type
   */
  private getDefaultSettings(settingsType: UserSettingsType): any {
    switch (settingsType) {
      case 'integrations':
        return {
          googleCalendar: {
            enabled: false,
            connected: false,
          },
          icloudCalendar: {
            enabled: false,
          },
          googlePhotos: {
            enabled: false,
            connected: false,
          },
          icloudPhotos: {
            enabled: false,
          },
        } as UserIntegrationSettings;

      case 'preferences':
        return {
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          notifications: {
            email: true,
            push: false,
            eventReminders: true,
            orderUpdates: true,
          },
          calendar: {
            defaultView: 'month',
            weekStartsOn: 0,
          },
        } as UserPreferences;

      default:
        return {};
    }
  }

  /**
   * Delete all settings for a user
   */
  async deleteAllSettings(userId: number): Promise<void> {
    await db('user_settings').where({ user_id: userId }).delete();
  }

  /**
   * Reset settings to defaults for a user
   */
  async resetSettings(userId: number, settingsType: UserSettingsType): Promise<void> {
    const defaultSettings = this.getDefaultSettings(settingsType);
    await this.updateSettings(userId, settingsType, defaultSettings);
  }
}

export default new UserSettingsService();
