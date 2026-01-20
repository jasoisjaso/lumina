import { create } from 'zustand';
import {
  settingsAPI,
  IntegrationSettings,
  FeatureSettings,
  CalendarSettings,
} from '../api/settings.api';

/**
 * Settings Store
 * Global state management for family settings
 */

interface SettingsStore {
  integrations: IntegrationSettings;
  features: FeatureSettings;
  calendar: CalendarSettings;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  loadSettings: () => Promise<void>;
  updateIntegrations: (integrations: IntegrationSettings) => Promise<void>;
  updateFeatures: (features: FeatureSettings) => Promise<void>;
  updateCalendar: (calendar: CalendarSettings) => Promise<void>;
  resetSettings: (type: 'integrations' | 'features' | 'calendar') => Promise<void>;
  setError: (error: string | null) => void;
}

const initialState = {
  integrations: {
    woocommerce: {
      enabled: false,
      storeUrl: '',
      consumerKey: '',
      consumerSecret: '',
    },
    googleCalendar: {
      enabled: false,
      connected: false,
    },
    icloudCalendar: {
      enabled: false,
      appleId: '',
      appPassword: '',
      calendarUrl: '',
    },
  },
  features: {
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
      units: 'metric' as 'metric',
    },
    photos: {
      enabled: false,
      source: 'local',
    },
  },
  calendar: {
    defaultView: 'month' as 'month',
    startDayOfWeek: 0,
    showWeather: true,
    showOrders: true,
    eventColors: {
      family: '#4F46E5',
      personal: '#8B5CF6',
      work: '#0891B2',
      orders: '#10B981',
    },
  },
  isLoading: false,
  isInitialized: false,
  error: null,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...initialState,

  loadSettings: async () => {
    try {
      set({ isLoading: true, error: null });

      const allSettings = await settingsAPI.getAllSettings();

      set({
        integrations: allSettings.integrations,
        features: allSettings.features,
        calendar: allSettings.calendar,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      set({
        error: error.response?.data?.message || 'Failed to load settings',
        isLoading: false,
      });
    }
  },

  updateIntegrations: async (integrations: IntegrationSettings) => {
    try {
      set({ isLoading: true, error: null });

      await settingsAPI.updateSettings('integrations', integrations);

      set({
        integrations,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to update integrations:', error);
      set({
        error: error.response?.data?.message || 'Failed to update integrations',
        isLoading: false,
      });
      throw error;
    }
  },

  updateFeatures: async (features: FeatureSettings) => {
    try {
      set({ isLoading: true, error: null });

      await settingsAPI.updateSettings('features', features);

      set({
        features,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to update features:', error);
      set({
        error: error.response?.data?.message || 'Failed to update features',
        isLoading: false,
      });
      throw error;
    }
  },

  updateCalendar: async (calendar: CalendarSettings) => {
    try {
      set({ isLoading: true, error: null });

      await settingsAPI.updateSettings('calendar', calendar);

      set({
        calendar,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to update calendar settings:', error);
      set({
        error: error.response?.data?.message || 'Failed to update calendar settings',
        isLoading: false,
      });
      throw error;
    }
  },

  resetSettings: async (type: 'integrations' | 'features' | 'calendar') => {
    try {
      set({ isLoading: true, error: null });

      const resetData = await settingsAPI.resetSettings(type);

      set((state) => ({
        [type]: resetData,
        isLoading: false,
      }));
    } catch (error: any) {
      console.error(`Failed to reset ${type} settings:`, error);
      set({
        error: error.response?.data?.message || `Failed to reset ${type} settings`,
        isLoading: false,
      });
      throw error;
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
