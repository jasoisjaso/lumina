import { Knex } from 'knex';

/**
 * Migration: Weather Cache Table
 * Creates weather_cache table for storing OpenWeatherMap API responses
 * with 30-minute cache expiry to stay within free tier limits (1,000 calls/day)
 */

export async function up(knex: Knex): Promise<void> {
  // Create weather_cache table
  await knex.schema.createTable('weather_cache', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable();
    table.string('location_code', 255).notNullable(); // City name or coordinates
    table.json('weather_data').notNullable(); // Cached API response
    table.timestamp('cached_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable(); // Cache expiry (30 min default)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign key
    table
      .foreign('family_id')
      .references('id')
      .inTable('families')
      .onDelete('CASCADE');

    // Indexes for fast lookup
    table.index(['family_id', 'location_code']);
    table.index('expires_at');

    // Unique constraint: one cache entry per family per location
    table.unique(['family_id', 'location_code']);
  });

  console.log('✓ Created weather_cache table');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('weather_cache');
  console.log('✓ Dropped weather_cache table');
}
