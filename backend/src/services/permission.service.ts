import db from '../database/knex';
import { PermissionName, Permission, UserPermission } from '../types/permissions';

/**
 * Permission Service
 * Handles permission checking and management
 */
class PermissionService {
  /**
   * Get all permissions for a user (role-based + custom)
   */
  async getUserPermissions(userId: number): Promise<PermissionName[]> {
    try {
      // Get user's role
      const user = await db('users')
        .where({ id: userId })
        .select('role')
        .first();

      if (!user) {
        return [];
      }

      // Get role-based permissions
      const rolePermissions = await db('permissions')
        .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
        .where('role_permissions.role', user.role)
        .select('permissions.name');

      const rolePermissionNames = new Set(rolePermissions.map((p: any) => p.name as PermissionName));

      // Get user-specific permission overrides
      const userPermissions = await db('user_permissions')
        .join('permissions', 'permissions.id', 'user_permissions.permission_id')
        .where('user_permissions.user_id', userId)
        .select('permissions.name', 'user_permissions.granted');

      // Apply user-specific overrides
      userPermissions.forEach((up: any) => {
        if (up.granted) {
          rolePermissionNames.add(up.name as PermissionName);
        } else {
          rolePermissionNames.delete(up.name as PermissionName);
        }
      });

      return Array.from(rolePermissionNames) as PermissionName[];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: number, permission: PermissionName): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: number, permissions: PermissionName[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(p => userPermissions.includes(p));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: number, permissions: PermissionName[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(p => userPermissions.includes(p));
  }

  /**
   * Grant a permission to a user (override role default)
   */
  async grantPermission(userId: number, permissionName: PermissionName): Promise<void> {
    const permission = await db('permissions')
      .where({ name: permissionName })
      .first();

    if (!permission) {
      throw new Error(`Permission ${permissionName} not found`);
    }

    await db('user_permissions')
      .insert({
        user_id: userId,
        permission_id: permission.id,
        granted: true,
      })
      .onConflict(['user_id', 'permission_id'])
      .merge({ granted: true, updated_at: new Date() });
  }

  /**
   * Revoke a permission from a user (override role default)
   */
  async revokePermission(userId: number, permissionName: PermissionName): Promise<void> {
    const permission = await db('permissions')
      .where({ name: permissionName })
      .first();

    if (!permission) {
      throw new Error(`Permission ${permissionName} not found`);
    }

    await db('user_permissions')
      .insert({
        user_id: userId,
        permission_id: permission.id,
        granted: false,
      })
      .onConflict(['user_id', 'permission_id'])
      .merge({ granted: false, updated_at: new Date() });
  }

  /**
   * Remove all custom permissions for a user (revert to role defaults)
   */
  async clearUserPermissions(userId: number): Promise<void> {
    await db('user_permissions')
      .where({ user_id: userId })
      .delete();
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return await db('permissions')
      .select('*')
      .orderBy('category', 'asc')
      .orderBy('name', 'asc');
  }

  /**
   * Get permissions by category
   */
  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    return await db('permissions')
      .where({ category })
      .select('*')
      .orderBy('name', 'asc');
  }

  /**
   * Get user's custom permission overrides
   */
  async getUserCustomPermissions(userId: number): Promise<UserPermission[]> {
    return await db('user_permissions')
      .where({ user_id: userId })
      .select('*');
  }
}

export default new PermissionService();
