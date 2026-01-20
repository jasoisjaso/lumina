import { Knex } from 'knex';

/**
 * Migration for refresh tokens table
 * Stores JWT refresh tokens for secure token renewal
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.text('token').notNullable(); // The refresh token itself
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.boolean('revoked').notNullable().defaultTo(false);
    table.timestamp('revoked_at').nullable();

    // Foreign key constraint
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');

    // Indexes
    table.index('user_id');
    table.index('token');
    table.index('expires_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('refresh_tokens');
}
