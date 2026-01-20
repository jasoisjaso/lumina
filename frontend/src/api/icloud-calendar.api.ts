import apiClient from './axios.config';

/**
 * iCloud Calendar API
 * CalDAV integration for syncing iCloud calendar events
 */

export interface ICloudCalendar {
  name: string;
  url: string;
}

export interface ICloudStatus {
  enabled: boolean;
  configured: boolean;
  appleId: string | null;
  calendarUrl: string | null;
}

export const icloudCalendarAPI = {
  /**
   * Test iCloud CalDAV connection
   */
  async testConnection(appleId: string, appPassword: string): Promise<{
    success: boolean;
    message: string;
    calendarUrl?: string;
  }> {
    const response = await apiClient.post('/icloud-calendar/test', {
      appleId,
      appPassword,
    });
    return response.data;
  },

  /**
   * Discover available calendars
   */
  async discoverCalendars(appleId: string, appPassword: string): Promise<{
    calendars: ICloudCalendar[];
    message: string;
  }> {
    const response = await apiClient.post('/icloud-calendar/discover', {
      appleId,
      appPassword,
    });
    return response.data;
  },

  /**
   * Manually trigger iCloud calendar sync
   */
  async syncCalendar(): Promise<{
    message: string;
    synced: number;
    errors: number;
  }> {
    const response = await apiClient.post('/icloud-calendar/sync');
    return response.data;
  },

  /**
   * Get iCloud calendar status
   */
  async getStatus(): Promise<ICloudStatus> {
    const response = await apiClient.get('/icloud-calendar/status');
    return response.data;
  },

  /**
   * Disconnect iCloud calendar
   */
  async disconnect(): Promise<{ message: string }> {
    const response = await apiClient.delete('/icloud-calendar/disconnect');
    return response.data;
  },
};

export default icloudCalendarAPI;
