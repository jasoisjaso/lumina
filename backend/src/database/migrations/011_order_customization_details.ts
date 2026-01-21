import { Knex } from 'knex';

/**
 * Migration: Add customization_details JSON column to cached_orders
 * Purpose: Store extracted product customization data (board style, font, colors, names)
 * for fast filtering and display on workflow cards
 */

export async function up(knex: Knex): Promise<void> {
  // Add customization_details JSON column to cached_orders
  await knex.schema.alterTable('cached_orders', (table) => {
    table.text('customization_details').nullable();
    // Using TEXT instead of JSON type for better SQLite compatibility
    // Will store JSON.stringify() data
  });

  console.log('✓ Added customization_details column to cached_orders');

  // Add is_hidden column to order_workflow_stages for column visibility toggle
  await knex.schema.alterTable('order_workflow_stages', (table) => {
    table.boolean('is_hidden').defaultTo(false);
  });

  console.log('✓ Added is_hidden column to order_workflow_stages');

  // Create indexes for JSON queries (SQLite 3.38+ supports json_extract indexes)
  // These indexes significantly speed up filtering by customization fields
  try {
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_customization_board_style
      ON cached_orders(json_extract(customization_details, '$.board_style'))
      WHERE customization_details IS NOT NULL
    `);
    console.log('✓ Created index on board_style');

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_customization_font
      ON cached_orders(json_extract(customization_details, '$.font'))
      WHERE customization_details IS NOT NULL
    `);
    console.log('✓ Created index on font');

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_customization_color
      ON cached_orders(json_extract(customization_details, '$.board_color'))
      WHERE customization_details IS NOT NULL
    `);
    console.log('✓ Created index on board_color');
  } catch (error) {
    console.warn('⚠ JSON indexes not created (SQLite version may not support json_extract indexes)');
    console.warn('  Filtering will still work, just slightly slower');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes
  try {
    await knex.raw('DROP INDEX IF EXISTS idx_customization_board_style');
    await knex.raw('DROP INDEX IF EXISTS idx_customization_font');
    await knex.raw('DROP INDEX IF EXISTS idx_customization_color');
  } catch (error) {
    // Ignore errors if indexes don't exist
  }

  // Remove columns
  await knex.schema.alterTable('cached_orders', (table) => {
    table.dropColumn('customization_details');
  });

  await knex.schema.alterTable('order_workflow_stages', (table) => {
    table.dropColumn('is_hidden');
  });
}
