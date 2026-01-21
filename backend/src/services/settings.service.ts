import knex from '../database/knex';

/**
 * Settings Service
 * Manages family-specific configuration settings
 */

export interface FamilySettings {
  id?: number;
  family_id: number;
  settings_type: string;
  settings_data: any;
  created_at?: Date;
  updated_at?: Date;
}

// Type definitions for different settings types
// Family-level integrations (shared across all family members)
export interface IntegrationSettings {
  woocommerce?: {
    enabled: boolean;
    storeUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    lastSync?: string;
  };
  weather?: {
    enabled: boolean;
    apiKey?: string;
    location?: string;
    units?: 'metric' | 'imperial';
    lastUpdate?: string;
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
  };
  photos?: {
    enabled: boolean;
    source?: string; // 'google', 'icloud', 'local'
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
  startDayOfWeek?: number; // 0 = Sunday, 1 = Monday
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

class SettingsService {
  /**
   * Get settings for a family by type
   */
  async getSettings(familyId: number, settingsType: SettingsType): Promise<any> {
    const settings = await knex('family_settings')
      .where({
        family_id: familyId,
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

    return null;
  }

  /**
   * Update settings for a family
   */
  async updateSettings(
    familyId: number,
    settingsType: SettingsType,
    settingsData: any
  ): Promise<void> {
    const existing = await knex('family_settings')
      .where({
        family_id: familyId,
        settings_type: settingsType,
      })
      .first();

    const jsonData = JSON.stringify(settingsData);

    if (existing) {
      await knex('family_settings')
        .where({ id: existing.id })
        .update({
          settings_data: jsonData,
          updated_at: knex.fn.now(),
        });
    } else {
      await knex('family_settings').insert({
        family_id: familyId,
        settings_type: settingsType,
        settings_data: jsonData,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }

  /**
   * Get all settings for a family
   */
  async getAllSettings(familyId: number): Promise<{
    integrations: IntegrationSettings;
    features: FeatureSettings;
    calendar: CalendarSettings;
  }> {
    const integrations = await this.getSettings(familyId, 'integrations');
    const features = await this.getSettings(familyId, 'features');
    const calendar = await this.getSettings(familyId, 'calendar');

    return {
      integrations,
      features,
      calendar,
    };
  }

  /**
   * Check if a specific integration is enabled
   */
  async isIntegrationEnabled(
    familyId: number,
    integration: keyof IntegrationSettings
  ): Promise<boolean> {
    const settings = await this.getSettings(familyId, 'integrations');
    return settings[integration]?.enabled === true;
  }

  /**
   * Check if a specific feature is enabled
   */
  async isFeatureEnabled(
    familyId: number,
    feature: keyof FeatureSettings
  ): Promise<boolean> {
    const settings = await this.getSettings(familyId, 'features');
    return settings[feature]?.enabled === true;
  }

  /**
   * Get integration credentials
   */
  async getIntegrationCredentials(
    familyId: number,
    integration: keyof IntegrationSettings
  ): Promise<any | null> {
    const settings = await this.getSettings(familyId, 'integrations');
    return settings[integration] || null;
  }

  /**
   * Get default settings for a type
   */
  private getDefaultSettings(settingsType: SettingsType): any {
    switch (settingsType) {
      case 'integrations':
        return {
          woocommerce: {
            enabled: false,
            storeUrl: '',
            consumerKey: '',
            consumerSecret: '',
          },
          weather: {
            enabled: false,
            apiKey: '',
            location: '',
            units: 'metric',
          },
        } as IntegrationSettings;

      case 'features':
        return {
          chores: {
            enabled: false,
            showLeaderboard: true,
            requirePhotos: false,
            streakReminders: true,
            weeklyGoal: 20,
            pointsMultiplier: 1.0,
          },
          weather: {
            enabled: false,
            apiKey: '',
            location: '',
            units: 'metric', // 'metric' for Celsius, 'imperial' for Fahrenheit
          },
          photos: {
            enabled: false,
            source: 'local',
          },
          photoGallery: {
            enabled: false,
            storage: {
              maxUploadMb: 10,
              allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            },
            features: {
              autoRotate: true,
              generateThumbnails: true,
            },
          },
          kioskMode: {
            enabled: false,
            pin: '',
            slideshow: {
              sources: ['photos', 'calendar', 'weather', 'dashboard'],
              idleTimeout: 2, // minutes
              slideDuration: 15, // seconds
            },
            display: {
              autoFullscreen: false,
              preventSleep: true,
            },
          },
        } as FeatureSettings;

      case 'calendar':
        return {
          defaultView: 'month',
          startDayOfWeek: 0,
          showWeather: true,
          showOrders: true,
          eventColors: {
            family: '#4F46E5',
            personal: '#8B5CF6',
            work: '#0891B2',
            orders: '#10B981',
          },
        } as CalendarSettings;

      default:
        return {};
    }
  }

  /**
   * Delete all settings for a family
   */
  async deleteAllSettings(familyId: number): Promise<void> {
    await knex('family_settings').where({ family_id: familyId }).delete();
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(familyId: number, settingsType: SettingsType): Promise<void> {
    const defaultSettings = this.getDefaultSettings(settingsType);
    await this.updateSettings(familyId, settingsType, defaultSettings);
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
export default settingsService;
