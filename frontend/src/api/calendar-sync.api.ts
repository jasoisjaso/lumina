import apiClient from './axios.config';

/**
 * Calendar Sync API
 * Handles Google Calendar OAuth and sync operations
 */

export interface SyncResult {
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
}

export interface SyncStatus {
  connected: boolean;
  lastSynced: string | null;
  eventCount: number;
}

export interface CalendarSyncStatus {
  google: SyncStatus;
}

export const calendarSyncAPI = {
  /**
   * Get Google Calendar OAuth authorization URL
   */
  async getGoogleAuthUrl(): Promise<{ authUrl: string; message: string }> {
    const response = await apiClient.get<{ authUrl: string; message: string }>(
      '/calendar-sync/google/auth-url'
    );
    return response.data;
  },

  /**
   * Complete OAuth flow - exchange code for tokens
   */
  async completeGoogleAuth(code: string): Promise<{ message: string; syncResult: SyncResult }> {
    const response = await apiClient.post<{ message: string; syncResult: SyncResult }>(
      '/calendar-sync/google/callback',
      { code }
    );
    return response.data;
  },

  /**
   * Manually trigger Google Calendar sync
   */
  async syncGoogleCalendar(): Promise<{ message: string; result: SyncResult }> {
    const response = await apiClient.post<{ message: string; result: SyncResult }>(
      '/calendar-sync/google/sync'
    );
    return response.data;
  },

  /**
   * Get Google Calendar sync status
   */
  async getGoogleStatus(): Promise<{ status: SyncStatus }> {
    const response = await apiClient.get<{ status: SyncStatus }>(
      '/calendar-sync/google/status'
    );
    return response.data;
  },

  /**
   * Disconnect Google Calendar
   */
  async disconnectGoogle(): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      '/calendar-sync/google/disconnect'
    );
    return response.data;
  },

  /**
   * Get overall sync status for all providers
   */
  async getSyncStatus(): Promise<{ providers: CalendarSyncStatus }> {
    const response = await apiClient.get<{ providers: CalendarSyncStatus }>(
      '/calendar-sync/status'
    );
    return response.data;
  },
};

export default calendarSyncAPI;
