import db from '../database/knex';

/**
 * Calendar Sharing Service
 * Manages calendar visibility and sharing permissions
 */

export interface CalendarSharing {
  id: number;
  owner_user_id: number;
  shared_with_user_id: number;
  can_view: boolean;
  can_edit: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SharingSettings {
  userId: number;
  sharedWith: {
    userId: number;
    userName: string;
    canView: boolean;
    canEdit: boolean;
  }[];
}

class CalendarSharingService {
  /**
   * Get all users with whom a user has shared their calendar
   */
  async getUserSharingSettings(userId: number): Promise<SharingSettings> {
    const sharing = await db('calendar_sharing')
      .join('users', 'calendar_sharing.shared_with_user_id', 'users.id')
      .where('calendar_sharing.owner_user_id', userId)
      .select(
        'users.id as userId',
        'users.first_name',
        'users.last_name',
        'calendar_sharing.can_view as canView',
        'calendar_sharing.can_edit as canEdit'
      );

    return {
      userId,
      sharedWith: sharing.map((s: any) => ({
        userId: s.userId,
        userName: `${s.first_name} ${s.last_name}`,
        canView: s.canView,
        canEdit: s.canEdit,
      })),
    };
  }

  /**
   * Share calendar with specific user
   */
  async shareCalendar(
    ownerUserId: number,
    sharedWithUserId: number,
    canView: boolean = true,
    canEdit: boolean = false
  ): Promise<void> {
    // Check both users are in same family
    const users = await db('users')
      .whereIn('id', [ownerUserId, sharedWithUserId])
      .select('id', 'family_id');

    if (users.length !== 2 || users[0].family_id !== users[1].family_id) {
      throw new Error('Users must be in the same family');
    }

    // Can't share with yourself
    if (ownerUserId === sharedWithUserId) {
      throw new Error('Cannot share calendar with yourself');
    }

    await db('calendar_sharing')
      .insert({
        owner_user_id: ownerUserId,
        shared_with_user_id: sharedWithUserId,
        can_view: canView,
        can_edit: canEdit,
      })
      .onConflict(['owner_user_id', 'shared_with_user_id'])
      .merge({
        can_view: canView,
        can_edit: canEdit,
        updated_at: new Date(),
      });
  }

  /**
   * Unshare calendar with specific user
   */
  async unshareCalendar(ownerUserId: number, sharedWithUserId: number): Promise<void> {
    await db('calendar_sharing')
      .where({
        owner_user_id: ownerUserId,
        shared_with_user_id: sharedWithUserId,
      })
      .delete();
  }

  /**
   * Update sharing permissions
   */
  async updateSharingPermissions(
    ownerUserId: number,
    sharedWithUserId: number,
    canView: boolean,
    canEdit: boolean
  ): Promise<void> {
    const updated = await db('calendar_sharing')
      .where({
        owner_user_id: ownerUserId,
        shared_with_user_id: sharedWithUserId,
      })
      .update({
        can_view: canView,
        can_edit: canEdit,
        updated_at: new Date(),
      });

    if (!updated) {
      throw new Error('Sharing relationship not found');
    }
  }

  /**
   * Get all calendars shared with a user
   */
  async getCalendarsSharedWithUser(userId: number): Promise<any[]> {
    return await db('calendar_sharing')
      .join('users', 'calendar_sharing.owner_user_id', 'users.id')
      .where('calendar_sharing.shared_with_user_id', userId)
      .where('calendar_sharing.can_view', true)
      .select(
        'users.id as ownerId',
        'users.first_name',
        'users.last_name',
        'users.color',
        'calendar_sharing.can_edit as canEdit'
      );
  }

  /**
   * Check if user can view another user's calendar
   */
  async canViewCalendar(viewerId: number, ownerId: number): Promise<boolean> {
    // User can always view their own calendar
    if (viewerId === ownerId) {
      return true;
    }

    // Check if calendar is shared
    const sharing = await db('calendar_sharing')
      .where({
        owner_user_id: ownerId,
        shared_with_user_id: viewerId,
        can_view: true,
      })
      .first();

    return !!sharing;
  }

  /**
   * Check if user can edit another user's calendar
   */
  async canEditCalendar(editorId: number, ownerId: number): Promise<boolean> {
    // User can always edit their own calendar
    if (editorId === ownerId) {
      return true;
    }

    // Check if edit permission is granted
    const sharing = await db('calendar_sharing')
      .where({
        owner_user_id: ownerId,
        shared_with_user_id: editorId,
        can_edit: true,
      })
      .first();

    return !!sharing;
  }

  /**
   * Batch update sharing settings (replace all)
   */
  async updateAllSharingSettings(
    ownerUserId: number,
    sharingSettings: Array<{ userId: number; canView: boolean; canEdit: boolean }>
  ): Promise<void> {
    const trx = await db.transaction();

    try {
      // Delete all existing sharing
      await trx('calendar_sharing')
        .where('owner_user_id', ownerUserId)
        .delete();

      // Insert new sharing settings
      if (sharingSettings.length > 0) {
        await trx('calendar_sharing').insert(
          sharingSettings.map(s => ({
            owner_user_id: ownerUserId,
            shared_with_user_id: s.userId,
            can_view: s.canView,
            can_edit: s.canEdit,
          }))
        );
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
}

export default new CalendarSharingService();
