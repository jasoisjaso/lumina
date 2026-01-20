# Database Setup Guide

This directory contains the Knex.js database configuration and migrations for Lumina.

## Quick Start

### First-Time Setup

1. **Create the data directory** (for local development):
   ```bash
   mkdir -p backend/data
   ```

2. **Run migrations** to create all tables:
   ```bash
   cd backend
   npm run migrate:latest
   ```

### Using Docker

When running with Docker Compose, the database is automatically created in the volume-mounted `backend/data/` directory.

To run migrations in Docker:
```bash
docker-compose exec backend npm run migrate:latest
```

## Available Commands

From the `backend/` directory:

- `npm run migrate:latest` - Run all pending migrations
- `npm run migrate:rollback` - Rollback the last batch of migrations
- `npm run migrate:status` - Check which migrations have been run
- `npm run migrate:make <name>` - Create a new migration file

## Database Schema

### Phase 1 Tables (Current)

1. **families** - Core family/group unit
2. **users** - User accounts with family association and roles
3. **cached_orders** - WooCommerce order cache for fast access
4. **calendar_events** - Events from Google/iCloud/manual sources
5. **calendar_sync_tokens** - OAuth2/CalDAV credentials per user

## Configuration

The database path is automatically determined:
- **Docker**: `/app/data/lumina.sqlite`
- **Local dev**: `./backend/data/lumina.sqlite`

Override with the `DB_PATH` environment variable if needed.

## Foreign Keys

SQLite foreign key constraints are **enabled** by default. This ensures referential integrity:
- Deleting a family cascades to all related users, orders, and events
- Deleting a user cascades to their calendar events and sync tokens
