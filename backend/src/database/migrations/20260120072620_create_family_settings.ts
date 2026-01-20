import type { Knex } from "knex";

/**
 * Migration: Create family_settings table
 * Stores configurable settings for each family (integrations, features, etc.)
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('family_settings', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable();
    table.string('settings_type', 50).notNullable(); // 'integrations', 'features', 'calendar', etc.
    table.json('settings_data').notNullable(); // JSON configuration data
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('family_id').references('id').inTable('families').onDelete('CASCADE');

    // Unique constraint: one settings record per family per type
    table.unique(['family_id', 'settings_type']);

    // Index for faster lookups
    table.index(['family_id', 'settings_type']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('family_settings');
}

