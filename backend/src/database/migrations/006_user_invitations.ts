import { Knex } from 'knex';

/**
 * Add user invitation fields to users table
 * Enables inviting new family members with token-based activation
 */

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    // Invitation fields
    table.string('invitation_token', 64).nullable().unique();
    table.timestamp('invitation_sent_at').nullable();
    table.timestamp('invitation_accepted_at').nullable();
    table.string('status', 20).notNullable().defaultTo('active'); // 'active', 'invited', 'disabled'
    table.integer('invited_by').unsigned().nullable(); // User ID who sent the invitation (enforced in app logic)

    // Index for faster invitation lookups
    table.index('invitation_token');
    table.index('status');
  });

  // Note: password_hash will need to be checked as nullable in application logic for invited users
  // Note: invited_by foreign key constraint is not added to avoid SQLite ALTER TABLE limitations
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('invitation_token');
    table.dropColumn('invitation_sent_at');
    table.dropColumn('invitation_accepted_at');
    table.dropColumn('status');
    table.dropColumn('invited_by');
  });
}
