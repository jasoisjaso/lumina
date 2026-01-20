import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Workflow stages configuration (per family)
  await knex.schema.createTable('order_workflow_stages', (table) => {
    table.increments('id').primary();
    table.integer('family_id').notNullable();
    table.string('name').notNullable();
    table.string('color').defaultTo('#4F46E5');
    table.integer('position').notNullable();
    table.string('wc_status'); // Maps to WooCommerce order status
    table.timestamps(true, true);
    
    table.foreign('family_id').references('families.id').onDelete('CASCADE');
    table.index(['family_id', 'position']);
  });

  // Order workflow tracking
  await knex.schema.createTable('order_workflow', (table) => {
    table.increments('id').primary();
    table.integer('order_id').notNullable(); // References cached WooCommerce orders
    table.integer('stage_id').notNullable();
    table.integer('assigned_to'); // user_id
    table.integer('priority').defaultTo(0); // 0=normal, 1=high, 2=rush
    table.text('notes');
    table.timestamp('last_updated').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    table.foreign('stage_id').references('order_workflow_stages.id').onDelete('CASCADE');
    table.foreign('assigned_to').references('users.id').onDelete('SET NULL');
    table.index(['order_id']);
    table.index(['stage_id']);
    table.index(['assigned_to']);
    table.index(['priority']);
  });

  // Stage change history
  await knex.schema.createTable('order_workflow_history', (table) => {
    table.increments('id').primary();
    table.integer('order_id').notNullable();
    table.integer('from_stage_id');
    table.integer('to_stage_id').notNullable();
    table.integer('changed_by').notNullable();
    table.text('notes');
    table.timestamp('changed_at').defaultTo(knex.fn.now());
    
    table.foreign('from_stage_id').references('order_workflow_stages.id').onDelete('SET NULL');
    table.foreign('to_stage_id').references('order_workflow_stages.id').onDelete('CASCADE');
    table.foreign('changed_by').references('users.id').onDelete('CASCADE');
    table.index(['order_id']);
    table.index(['changed_at']);
  });

  // Insert default workflow stages for existing families
  const families = await knex('families').select('id');
  
  for (const family of families) {
    await knex('order_workflow_stages').insert([
      { family_id: family.id, name: 'Ready to Make', color: '#3B82F6', position: 0, wc_status: 'processing' },
      { family_id: family.id, name: 'Making', color: '#8B5CF6', position: 1, wc_status: 'processing' },
      { family_id: family.id, name: 'Ready to Pack', color: '#10B981', position: 2, wc_status: 'processing' },
      { family_id: family.id, name: 'Packed', color: '#059669', position: 3, wc_status: 'processing' },
      { family_id: family.id, name: 'Ready to Dispatch', color: '#0891B2', position: 4, wc_status: 'processing' },
      { family_id: family.id, name: 'Needs Attention', color: '#EF4444', position: 5, wc_status: null },
    ]);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('order_workflow_history');
  await knex.schema.dropTableIfExists('order_workflow');
  await knex.schema.dropTableIfExists('order_workflow_stages');
}
