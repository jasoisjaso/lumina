import apiClient from './axios.config';

/**
 * Calendar Sharing API
 * Manages calendar visibility and sharing permissions
 */

export interface FamilyMember {
  id: number;
  name: string;
  email: string;
  color: string;
}

export interface SharingSettings {
  userId: number;
  sharedWith: Array<{
    userId: number;
    userName: string;
    canView: boolean;
    canEdit: boolean;
  }>;
}

export interface SharedCalendar {
  ownerId: number;
  ownerName: string;
  color: string;
  canEdit: boolean;
}

class CalendarSharingAPI {
  /**
   * Get current user's sharing settings
   */
  async getMySettings(): Promise<SharingSettings> {
    const response = await apiClient.get('/calendar-sharing/my-settings');
    return response.data.settings;
  }

  /**
   * Get list of family members for sharing UI
   */
  async getFamilyMembers(): Promise<FamilyMember[]> {
    const response = await apiClient.get('/calendar-sharing/family-members');
    return response.data.members;
  }

  /**
   * Share calendar with a specific user
   */
  async shareCalendar(userId: number, canView: boolean = true, canEdit: boolean = false): Promise<void> {
    await apiClient.post('/calendar-sharing/share', {
      userId,
      canView,
      canEdit,
    });
  }

  /**
   * Unshare calendar with a specific user
   */
  async unshareCalendar(userId: number): Promise<void> {
    await apiClient.delete(`/calendar-sharing/unshare/${userId}`);
  }

  /**
   * Batch update all sharing settings
   */
  async updateAllSettings(sharingSettings: Array<{ userId: number; canView: boolean; canEdit: boolean }>): Promise<void> {
    await apiClient.put('/calendar-sharing/settings', {
      sharingSettings,
    });
  }

  /**
   * Get calendars shared with current user
   */
  async getSharedWithMe(): Promise<SharedCalendar[]> {
    const response = await apiClient.get('/calendar-sharing/shared-with-me');
    return response.data.calendars;
  }
}

export default new CalendarSharingAPI();
