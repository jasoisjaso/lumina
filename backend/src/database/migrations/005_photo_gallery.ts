import { Knex } from 'knex';

/**
 * Photo Gallery Database Schema
 * Designed for local uploads with architecture for future Google Photos/Immich integration
 */

export async function up(knex: Knex): Promise<void> {
  // 1. Albums table - supports multi-source (local, Google Photos, Immich)
  await knex.schema.createTable('albums', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.string('source', 20).notNullable().defaultTo('local'); // 'local' | 'google' | 'immich'
    table.string('external_id', 255).nullable(); // For future Google/Immich album IDs
    table.integer('cover_photo_id').unsigned().nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('family_id').references('id').inTable('families').onDelete('CASCADE');

    // Indexes
    table.index('family_id');
    table.index('source');
    table.index(['family_id', 'source']);
  });

  // 2. Photos table - source-agnostic design
  await knex.schema.createTable('photos', (table) => {
    table.increments('id').primary();
    table.integer('family_id').unsigned().notNullable();
    table.integer('album_id').unsigned().nullable();
    table.string('source', 20).notNullable().defaultTo('local'); // 'local' | 'google' | 'immich'
    table.string('external_id', 255).nullable(); // Future: Google Photos ID, Immich ID
    table.string('filename', 255).notNullable(); // Unique stored filename
    table.string('original_filename', 255).notNullable(); // Original upload name
    table.string('file_path', 500).notNullable(); // Path relative to uploads directory
    table.integer('file_size').notNullable(); // Size in bytes
    table.string('mime_type', 100).notNullable();
    table.integer('width').nullable();
    table.integer('height').nullable();
    table.string('title', 500).nullable();
    table.text('description').nullable();
    table.timestamp('taken_at').nullable(); // From EXIF data
    table.integer('uploaded_by').unsigned().notNullable();
    table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Foreign keys
    table.foreign('family_id').references('id').inTable('families').onDelete('CASCADE');
    table.foreign('album_id').references('id').inTable('albums').onDelete('CASCADE');
    table.foreign('uploaded_by').references('id').inTable('users').onDelete('RESTRICT');

    // Indexes
    table.index('family_id');
    table.index('album_id');
    table.index('source');
    table.index('uploaded_by');
    table.index('uploaded_at');
    table.index(['family_id', 'source']);
    table.index(['family_id', 'album_id']);
  });

  // 3. Add cover_photo_id foreign key to albums (after photos table exists)
  await knex.schema.alterTable('albums', (table) => {
    table.foreign('cover_photo_id').references('id').inTable('photos').onDelete('SET NULL');
  });

  // 4. Photo metadata table for EXIF/tags (future expansion)
  await knex.schema.createTable('photo_metadata', (table) => {
    table.increments('id').primary();
    table.integer('photo_id').unsigned().notNullable();
    table.string('key', 100).notNullable();
    table.text('value').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Foreign key
    table.foreign('photo_id').references('id').inTable('photos').onDelete('CASCADE');

    // Indexes
    table.index('photo_id');
    table.index('key');
    table.index(['photo_id', 'key']);
  });

  console.log('✓ Created photo gallery tables (albums, photos, photo_metadata)');
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse order to respect foreign keys
  await knex.schema.dropTableIfExists('photo_metadata');

  // Remove foreign key before dropping albums
  await knex.schema.alterTable('albums', (table) => {
    table.dropForeign(['cover_photo_id']);
  });

  await knex.schema.dropTableIfExists('photos');
  await knex.schema.dropTableIfExists('albums');

  console.log('✓ Dropped photo gallery tables');
}
