import { Knex } from 'knex';

/**
 * User Settings Migration
 * Separates user-level integrations from family-level settings
 *
 * Family-level: Weather, WooCommerce (shared by all)
 * User-level: Google Calendar, iCloud Calendar, Photos (personal)
 */

export async function up(knex: Knex): Promise<void> {
  // Create user_settings table
  await knex.schema.createTable('user_settings', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('settings_type', 50).notNullable(); // 'integrations', 'preferences', etc.
    table.json('settings_data').notNullable(); // JSON configuration data
    table.timestamps(true, true);

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Unique constraint: one settings record per user per type
    table.unique(['user_id', 'settings_type']);

    // Index for faster lookups
    table.index(['user_id', 'settings_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_settings');
}
