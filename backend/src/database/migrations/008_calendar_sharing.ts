import { Knex } from 'knex';

/**
 * Calendar Sharing System
 * Users control who can see their calendar events
 */

export async function up(knex: Knex): Promise<void> {
  // Create calendar_sharing table
  await knex.schema.createTable('calendar_sharing', (table) => {
    table.increments('id').primary();
    table.integer('owner_user_id').unsigned().notNullable(); // User who owns the calendar
    table.integer('shared_with_user_id').unsigned().notNullable(); // User who can view
    table.boolean('can_view').notNullable().defaultTo(true);
    table.boolean('can_edit').notNullable().defaultTo(false);
    table.timestamps(true, true);

    // Foreign keys
    table.foreign('owner_user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('shared_with_user_id').references('id').inTable('users').onDelete('CASCADE');

    // Unique constraint: one sharing record per user pair
    table.unique(['owner_user_id', 'shared_with_user_id']);

    // Indexes
    table.index('owner_user_id');
    table.index('shared_with_user_id');
  });

  // Add visibility field to calendar_events
  await knex.schema.alterTable('calendar_events', (table) => {
    table.string('visibility', 20).notNullable().defaultTo('private'); // 'private', 'family', 'shared'
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('calendar_events', (table) => {
    table.dropColumn('visibility');
  });

  await knex.schema.dropTableIfExists('calendar_sharing');
}
