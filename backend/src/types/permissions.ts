/**
 * Permission System Types
 * Provides type-safe permission checking throughout the application
 */

export enum PermissionName {
  // User management
  VIEW_USERS = 'view_users',
  INVITE_USERS = 'invite_users',
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',

  // Order management
  VIEW_ORDERS = 'view_orders',
  MANAGE_ORDERS = 'manage_orders',
  SYNC_ORDERS = 'sync_orders',

  // Calendar
  VIEW_CALENDAR = 'view_calendar',
  MANAGE_EVENTS = 'manage_events',
  MANAGE_CALENDAR_SETTINGS = 'manage_calendar_settings',

  // Photos
  VIEW_PHOTOS = 'view_photos',
  UPLOAD_PHOTOS = 'upload_photos',
  MANAGE_PHOTOS = 'manage_photos',
  MANAGE_ALBUMS = 'manage_albums',

  // Settings
  VIEW_SETTINGS = 'view_settings',
  MANAGE_INTEGRATIONS = 'manage_integrations',
  MANAGE_FEATURES = 'manage_features',
  MANAGE_FAMILY = 'manage_family',
}

export enum PermissionCategory {
  USERS = 'users',
  ORDERS = 'orders',
  CALENDAR = 'calendar',
  PHOTOS = 'photos',
  SETTINGS = 'settings',
}

export interface Permission {
  id: number;
  name: PermissionName;
  category: PermissionCategory;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  granted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RolePermission {
  id: number;
  role: 'admin' | 'member';
  permission_id: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Permission groups for easier management
 */
export const PermissionGroups = {
  USER_MANAGEMENT: [
    PermissionName.VIEW_USERS,
    PermissionName.INVITE_USERS,
    PermissionName.MANAGE_USERS,
    PermissionName.MANAGE_ROLES,
  ],
  ORDER_MANAGEMENT: [
    PermissionName.VIEW_ORDERS,
    PermissionName.MANAGE_ORDERS,
    PermissionName.SYNC_ORDERS,
  ],
  CALENDAR_MANAGEMENT: [
    PermissionName.VIEW_CALENDAR,
    PermissionName.MANAGE_EVENTS,
    PermissionName.MANAGE_CALENDAR_SETTINGS,
  ],
  PHOTO_MANAGEMENT: [
    PermissionName.VIEW_PHOTOS,
    PermissionName.UPLOAD_PHOTOS,
    PermissionName.MANAGE_PHOTOS,
    PermissionName.MANAGE_ALBUMS,
  ],
  SETTINGS_MANAGEMENT: [
    PermissionName.VIEW_SETTINGS,
    PermissionName.MANAGE_INTEGRATIONS,
    PermissionName.MANAGE_FEATURES,
    PermissionName.MANAGE_FAMILY,
  ],
} as const;

/**
 * Default permissions by role
 */
export const DefaultRolePermissions: Record<'admin' | 'member', PermissionName[]> = {
  admin: Object.values(PermissionName),
  member: [
    PermissionName.VIEW_USERS,
    PermissionName.VIEW_ORDERS,
    PermissionName.VIEW_CALENDAR,
    PermissionName.MANAGE_EVENTS,
    PermissionName.VIEW_PHOTOS,
    PermissionName.UPLOAD_PHOTOS,
    PermissionName.VIEW_SETTINGS,
  ],
};
