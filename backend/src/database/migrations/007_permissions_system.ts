import { Knex } from 'knex';

/**
 * Permission system for granular access control
 * Supports both role-based and feature-based permissions
 */

export async function up(knex: Knex): Promise<void> {
  // Create permissions table
  await knex.schema.createTable('permissions', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique(); // e.g., 'manage_users', 'manage_orders'
    table.string('category', 30).notNullable(); // e.g., 'users', 'orders', 'settings'
    table.text('description').nullable();
    table.timestamps(true, true);

    table.index('category');
  });

  // Create role_permissions junction table
  await knex.schema.createTable('role_permissions', (table) => {
    table.increments('id').primary();
    table.string('role', 20).notNullable(); // 'admin' or 'member'
    table.integer('permission_id').unsigned().notNullable();
    table.timestamps(true, true);

    table.foreign('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
    table.unique(['role', 'permission_id']);
    table.index('role');
  });

  // Create user_permissions table for custom user permissions
  await knex.schema.createTable('user_permissions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('permission_id').unsigned().notNullable();
    table.boolean('granted').notNullable().defaultTo(true); // true = grant, false = revoke
    table.timestamps(true, true);

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('permission_id').references('id').inTable('permissions').onDelete('CASCADE');
    table.unique(['user_id', 'permission_id']);
    table.index('user_id');
  });

  // Seed default permissions
  const now = new Date();
  const permissions = [
    // User management
    { name: 'view_users', category: 'users', description: 'View family members' },
    { name: 'invite_users', category: 'users', description: 'Invite new family members' },
    { name: 'manage_users', category: 'users', description: 'Edit and remove family members' },
    { name: 'manage_roles', category: 'users', description: 'Change user roles and permissions' },

    // Order management
    { name: 'view_orders', category: 'orders', description: 'View WooCommerce orders' },
    { name: 'manage_orders', category: 'orders', description: 'Update order status' },
    { name: 'sync_orders', category: 'orders', description: 'Trigger order synchronization' },

    // Calendar
    { name: 'view_calendar', category: 'calendar', description: 'View family calendar' },
    { name: 'manage_events', category: 'calendar', description: 'Create and edit calendar events' },
    { name: 'manage_calendar_settings', category: 'calendar', description: 'Configure calendar integrations' },

    // Photos
    { name: 'view_photos', category: 'photos', description: 'View photo gallery' },
    { name: 'upload_photos', category: 'photos', description: 'Upload photos to gallery' },
    { name: 'manage_photos', category: 'photos', description: 'Edit and delete photos' },
    { name: 'manage_albums', category: 'photos', description: 'Create and manage albums' },

    // Settings
    { name: 'view_settings', category: 'settings', description: 'View family settings' },
    { name: 'manage_integrations', category: 'settings', description: 'Configure integrations (WooCommerce, Weather)' },
    { name: 'manage_features', category: 'settings', description: 'Enable/disable features' },
    { name: 'manage_family', category: 'settings', description: 'Edit family details' },
  ];

  const insertedPermissions = await knex('permissions').insert(
    permissions.map(p => ({ ...p, created_at: now, updated_at: now }))
  ).returning('*');

  // Assign all permissions to admin role
  const adminPermissions = insertedPermissions.map(p => ({
    role: 'admin',
    permission_id: p.id,
    created_at: now,
    updated_at: now,
  }));

  await knex('role_permissions').insert(adminPermissions);

  // Assign limited permissions to member role
  const memberPermissionNames = [
    'view_users',
    'view_orders',
    'view_calendar',
    'manage_events',
    'view_photos',
    'upload_photos',
    'view_settings',
  ];

  const memberPermissions = insertedPermissions
    .filter(p => memberPermissionNames.includes(p.name))
    .map(p => ({
      role: 'member',
      permission_id: p.id,
      created_at: now,
      updated_at: now,
    }));

  await knex('role_permissions').insert(memberPermissions);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_permissions');
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('permissions');
}
