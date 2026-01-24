import { Knex } from 'knex';

/**
 * Migration: Add Performance Indexes
 * 
 * Adds composite and single-column indexes to optimize common query patterns:
 * - Composite index on (stage_id, priority) for workflow stats queries
 * - Index on last_updated for overdue order queries
 * - Composite index on (family_id, status) for cached orders filtering
 * - Composite index on (family_id, date_created) for date range queries
 * 
 * These indexes improve query performance without changing application behavior.
 */
export async function up(knex: Knex): Promise<void> {
  // Add composite index for workflow stats queries (getStats, filtering by stage and priority)
  await knex.schema.alterTable('order_workflow', (table) => {
    table.index(['stage_id', 'priority'], 'idx_order_workflow_stage_priority');
  });

  // Add index on last_updated for overdue queries (julianday calculations)
  await knex.schema.alterTable('order_workflow', (table) => {
    table.index(['last_updated'], 'idx_order_workflow_last_updated');
  });

  // Add composite index on cached_orders for common filtering patterns
  await knex.schema.alterTable('cached_orders', (table) => {
    table.index(['family_id', 'status'], 'idx_cached_orders_family_status');
  });

  // Add composite index for date range queries
  await knex.schema.alterTable('cached_orders', (table) => {
    table.index(['family_id', 'date_created'], 'idx_cached_orders_family_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes in reverse order
  await knex.schema.alterTable('cached_orders', (table) => {
    table.dropIndex(['family_id', 'date_created'], 'idx_cached_orders_family_date');
  });

  await knex.schema.alterTable('cached_orders', (table) => {
    table.dropIndex(['family_id', 'status'], 'idx_cached_orders_family_status');
  });

  await knex.schema.alterTable('order_workflow', (table) => {
    table.dropIndex(['last_updated'], 'idx_order_workflow_last_updated');
  });

  await knex.schema.alterTable('order_workflow', (table) => {
    table.dropIndex(['stage_id', 'priority'], 'idx_order_workflow_stage_priority');
  });
}

