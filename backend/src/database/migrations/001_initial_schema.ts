import { Knex } from 'knex';

/**
 * Initial database schema for Lumina Phase 1
 * Creates core tables: families, users, cached_orders, calendar_events, calendar_sync_tokens
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Families table - Core family/group unit
  await knex.schema.createTable('families', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.timestamps(true, true); // created_at, updated_at
  });

  // 2. Users table - User accounts with family association
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('role', 50).notNullable().defaultTo('member'); // 'admin' or 'member'
    table.string('color', 7).nullable(); // Hex color for calendar events (e.g., '#FF5733')
    table.timestamps(true, true);

    // Foreign key constraint
    table.foreign('family_id').references('id').inTable('families').onDelete('CASCADE');

    // Indexes
    table.index('family_id');
    table.index('email');
  });

  // 3. Cached Orders table - WooCommerce order cache
  await knex.schema.createTable('cached_orders', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable();
    table.integer('woocommerce_order_id').notNullable().unique(); // WooCommerce order ID
    table.string('status', 50).notNullable(); // e.g., 'pending', 'processing', 'completed'
    table.timestamp('date_created').notNullable();
    table.timestamp('date_modified').nullable();
    table.string('customer_name', 255).nullable();
    table.decimal('total', 10, 2).nullable(); // Order total
    table.json('raw_data').notNullable(); // Full WooCommerce order object
    table.timestamp('synced_at').notNullable(); // Last sync time
    table.timestamps(true, true);

    // Foreign key constraint
    table.foreign('family_id').references('id').inTable('families').onDelete('CASCADE');

    // Indexes
    table.index('family_id');
    table.index('woocommerce_order_id');
    table.index('status');
    table.index('date_created');
  });

  // 4. Calendar Events table - Events from all sources
  await knex.schema.createTable('calendar_events', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable();
    table.integer('user_id').unsigned().nullable(); // Nullable for family-wide events
    table.string('source', 20).notNullable(); // 'google', 'icloud', 'manual'
    table.string('external_id', 255).nullable(); // Google/iCloud event ID
    table.string('title', 500).notNullable();
    table.text('description').nullable();
    table.timestamp('start_time').notNullable();
    table.timestamp('end_time').notNullable();
    table.boolean('all_day').notNullable().defaultTo(false);
    table.string('location', 500).nullable();
    table.json('raw_data').nullable(); // Full event data from external source
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('family_id').references('id').inTable('families').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('family_id');
    table.index('user_id');
    table.index('source');
    table.index('start_time');
    table.index(['family_id', 'start_time']); // Composite index for common queries
    table.unique(['source', 'external_id'], { predicate: knex.whereNotNull('external_id') }); // Unique external IDs per source
  });

  // 5. Calendar Sync Tokens table - OAuth2/CalDAV tokens
  await knex.schema.createTable('calendar_sync_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('provider', 20).notNullable(); // 'google', 'icloud'
    table.text('access_token').notNullable();
    table.text('refresh_token').nullable(); // Some providers don't use refresh tokens
    table.timestamp('token_expiry').nullable();
    table.string('calendar_id', 255).nullable(); // Specific calendar ID from provider
    table.string('sync_token', 500).nullable(); // For incremental sync
    table.timestamps(true, true);

    // Foreign key constraint
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Unique constraint: one token set per user per provider
    table.unique(['user_id', 'provider']);

    // Indexes
    table.index('user_id');
    table.index('provider');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  await knex.schema.dropTableIfExists('calendar_sync_tokens');
  await knex.schema.dropTableIfExists('calendar_events');
  await knex.schema.dropTableIfExists('cached_orders');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('families');
}
