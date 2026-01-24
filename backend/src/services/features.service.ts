import knex from '../database/knex';
import fs from 'fs';
import path from 'path';

export interface FeatureStatus {
  enabled: boolean;
  working: boolean;
  configured: boolean;
  canShow: boolean;
  message?: string;
  details?: any;
}

export interface FeaturesStatusResponse {
  calendar: FeatureStatus;
  photos: FeatureStatus;
  workflow: FeatureStatus;
  weather: FeatureStatus;
  timestamp: string;
}

/**
 * Features Service
 * Determines which features are enabled, configured, and working
 */
export class FeaturesService {
  /**
   * Check if WooCommerce is configured and working
   */
  private async checkWooCommerceStatus(familyId: number): Promise<FeatureStatus> {
    try {
      // Get WooCommerce settings from database
      const settings = await knex('family_settings')
        .where({ family_id: familyId, settings_type: 'integrations' })
        .first();

      if (!settings) {
        return {
          enabled: false,
          working: false,
          configured: false,
          canShow: false,
          message: 'Not configured',
        };
      }

      const integrations = JSON.parse(settings.settings_data);
      const wc = integrations?.woocommerce;

      if (!wc || !wc.enabled) {
        return {
          enabled: false,
          working: false,
          configured: false,
          canShow: false,
          message: 'Disabled',
        };
      }

      // Check if all required credentials exist
      const isConfigured = !!(
        wc.storeUrl &&
        wc.consumerKey &&
        wc.consumerSecret
      );

      if (!isConfigured) {
        return {
          enabled: true,
          working: false,
          configured: false,
          canShow: false,
          message: 'Setup required',
        };
      }

      // Check if there are any orders in the database (indicates sync is working)
      const orderCount = await knex('cached_orders')
        .where({ family_id: familyId })
        .count('* as count')
        .first();

      const hasOrders = !!(orderCount && Number(orderCount.count) > 0);

      return {
        enabled: true,
        working: hasOrders,
        configured: true,
        canShow: true,
        message: hasOrders ? 'Active' : 'No orders yet',
        details: {
          orderCount: orderCount ? Number(orderCount.count) : 0,
        },
      };
    } catch (error) {
      console.error('Error checking WooCommerce status:', error);
      return {
        enabled: false,
        working: false,
        configured: false,
        canShow: false,
        message: 'Error',
      };
    }
  }

  /**
   * Check if photo gallery is enabled
   * Simplified: Just enabled or disabled, no "broken" status
   */
  private async checkPhotoGalleryStatus(familyId: number): Promise<FeatureStatus> {
    try {
      // Get photo gallery settings
      const settings = await knex('family_settings')
        .where({ family_id: familyId, settings_type: 'features' })
        .first();

      if (!settings) {
        return {
          enabled: false,
          working: false,
          configured: false,
          canShow: false,
          message: 'Disabled',
        };
      }

      const features = JSON.parse(settings.settings_data);
      const photoGallery = features?.photoGallery;

      // Simple: enabled or not
      if (!photoGallery || !photoGallery.enabled) {
        return {
          enabled: false,
          working: false,
          configured: false,
          canShow: false,
          message: 'Disabled',
        };
      }

      // Check if there are any photos in the database
      const photoCount = await knex('photos')
        .where({ family_id: familyId })
        .count('* as count')
        .first();

      const hasPhotos = !!(photoCount && Number(photoCount.count) > 0);

      return {
        enabled: true,
        working: true,
        configured: true,
        canShow: true,
        message: hasPhotos ? 'Active' : 'Empty',
        details: {
          photoCount: photoCount ? Number(photoCount.count) : 0,
        },
      };
    } catch (error) {
      console.error('Error checking photo gallery status:', error);
      // On error, just hide it (don't show as broken)
      return {
        enabled: false,
        working: false,
        configured: false,
        canShow: false,
        message: 'Disabled',
      };
    }
  }

  /**
   * Check if weather is configured
   */
  private async checkWeatherStatus(familyId: number): Promise<FeatureStatus> {
    try {
      // Get weather settings
      const settings = await knex('family_settings')
        .where({ family_id: familyId, settings_type: 'features' })
        .first();

      if (!settings) {
        return {
          enabled: false,
          working: false,
          configured: false,
          canShow: false,
          message: 'Not configured',
        };
      }

      const features = JSON.parse(settings.settings_data);
      const weather = features?.weather;

      if (!weather || !weather.enabled) {
        return {
          enabled: false,
          working: false,
          configured: false,
          canShow: false,
          message: 'Disabled',
        };
      }

      // Check if API key is configured
      const isConfigured = !!(weather.apiKey && weather.location);

      if (!isConfigured) {
        return {
          enabled: true,
          working: false,
          configured: false,
          canShow: false,
          message: 'Setup required',
        };
      }

      // Check if there's cached weather data (indicates API is working)
      const cachedWeather = await knex('weather_cache')
        .where({ family_id: familyId })
        .orderBy('updated_at', 'desc')
        .first();

      const hasRecentData = cachedWeather &&
        new Date(cachedWeather.updated_at).getTime() > Date.now() - 24 * 60 * 60 * 1000;

      return {
        enabled: true,
        working: hasRecentData,
        configured: true,
        canShow: true,
        message: hasRecentData ? 'Active' : 'Connecting',
      };
    } catch (error) {
      console.error('Error checking weather status:', error);
      return {
        enabled: false,
        working: false,
        configured: false,
        canShow: false,
        message: 'Error',
      };
    }
  }

  /**
   * Check if calendar is working (Google or iCloud)
   */
  private async checkCalendarStatus(familyId: number): Promise<FeatureStatus> {
    try {
      // Calendar is a core feature, always show
      // But check if any integrations are configured

      const settings = await knex('family_settings')
        .where({ family_id: familyId, settings_type: 'integrations' })
        .first();

      if (!settings) {
        return {
          enabled: true, // Always enabled (core feature)
          working: true, // Works even without integrations
          configured: true,
          canShow: true,
          message: 'Active',
          details: {
            googleCalendar: false,
            icloudCalendar: false,
          },
        };
      }

      const integrations = JSON.parse(settings.settings_data);
      const googleCalendar = integrations?.googleCalendar;
      const icloudCalendar = integrations?.icloudCalendar;

      const hasGoogle = googleCalendar?.enabled && googleCalendar?.connected;
      const hasIcloud = icloudCalendar?.enabled;

      // Check if there are any events
      const eventCount = await knex('calendar_events')
        .where({ family_id: familyId })
        .count('* as count')
        .first();

      const hasEvents = eventCount && Number(eventCount.count) > 0;

      return {
        enabled: true,
        working: true,
        configured: true,
        canShow: true, // Always show calendar
        message: hasGoogle || hasIcloud ? 'Synced' : hasEvents ? 'Active' : 'Ready',
        details: {
          googleCalendar: hasGoogle,
          icloudCalendar: hasIcloud,
          eventCount: eventCount ? Number(eventCount.count) : 0,
        },
      };
    } catch (error) {
      console.error('Error checking calendar status:', error);
      // Even if there's an error, show calendar (it's a core feature)
      return {
        enabled: true,
        working: true,
        configured: true,
        canShow: true,
        message: 'Active',
      };
    }
  }

  /**
   * Get status of all features for a family
   */
  async getFeaturesStatus(familyId: number): Promise<FeaturesStatusResponse> {
    const [calendar, photos, workflow, weather] = await Promise.all([
      this.checkCalendarStatus(familyId),
      this.checkPhotoGalleryStatus(familyId),
      this.checkWooCommerceStatus(familyId),
      this.checkWeatherStatus(familyId),
    ]);

    return {
      calendar,
      photos,
      workflow,
      weather,
      timestamp: new Date().toISOString(),
    };
  }
}

export const featuresService = new FeaturesService();
export default featuresService;
