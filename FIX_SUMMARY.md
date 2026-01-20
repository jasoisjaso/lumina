# Docker Build Fix - SUCCESS ✓

## Problem Resolved
The backend container was failing with `Cannot find module '/app/dist/server.js'` because TypeScript was compiling files to the wrong location.

## Root Causes Fixed

### 1. TypeScript Configuration Issue
**Problem:** `tsconfig.json` had `"rootDir": "."` which caused:
- `src/server.ts` → `dist/src/server.js` ❌
- Instead of: `src/server.ts` → `dist/server.js` ✓

**Solution:** Changed `rootDir` to `"./src"` in backend/tsconfig.json:1

### 2. Module Import Issue
**Problem:** `src/database/knex.ts` was importing `knexfile.ts` from outside the `src/` directory, violating TypeScript's rootDir constraint.

**Solution:** Created `src/database/config.ts` with the database configuration, and updated imports:
- backend/src/database/config.ts:1 (new file with config)
- backend/src/database/knex.ts:2 (imports from local config)
- backend/knexfile.ts:7 (re-exports for CLI usage)

### 3. Missing Files in Docker
**Problem:** `src/database/config.ts` wasn't copied to the container.

**Solution:** Updated Dockerfile to copy entire database directory:
- backend/Dockerfile:27-28

### 4. Permissions Issue
**Problem:** Container user `nodejs` (uid 1001) couldn't write to volume-mounted data directory.

**Solution:** Set proper permissions on host directory:
```bash
chmod 777 backend/data
```

## Verification Results

All systems are now **HEALTHY** and running correctly:

```bash
$ curl http://localhost:3001/health
{"status":"healthy","timestamp":"2026-01-20T04:24:29.465Z"}

$ curl http://localhost:3001/api/v1/health
{"status":"healthy","service":"api"}

$ curl http://localhost:3001/api/v1/db/health
{"status":"healthy","database":"connected"}

$ docker compose ps
NAME              STATUS
lumina-backend    Up (healthy)
lumina-frontend   Up
lumina-redis      Up
```

## Files Modified

1. **backend/tsconfig.json** - Fixed rootDir
2. **backend/src/database/config.ts** - NEW: Database configuration
3. **backend/src/database/knex.ts** - Updated import path
4. **backend/knexfile.ts** - Simplified to re-export config
5. **backend/Dockerfile** - Fixed file copying and permissions
6. **backend/tsconfig.knex.json** - NEW: Config for knexfile compilation

## Commands to Run

### Quick Start (Recommended)
```bash
cd /home/hcfdc/Desktop/Lumina
chmod +x build-and-test.sh
./build-and-test.sh
```

### Manual Commands
```bash
# Clean and rebuild
docker compose down -v
docker compose build --no-cache
docker compose up -d

# Fix permissions (if needed)
chmod 777 backend/data

# Run migrations
docker compose exec backend npm run migrate:latest

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/db/health
```

## Current Status

✅ Backend container running stably (no restarts)
✅ TypeScript compiles correctly (dist/server.js exists)
✅ Server listens on port 3001
✅ Health endpoint returns healthy
✅ API health endpoint works
✅ Database connection established
✅ Migrations completed successfully
✅ Redis connection working
✅ Frontend container running

## Access Points

- **Backend API:** http://localhost:3001
- **Frontend UI:** http://localhost:3000
- **Redis:** Internal (redis:6379)

## Database

- **Type:** SQLite
- **Location (container):** /app/data/lumina.db
- **Location (host):** ./backend/data/lumina.db
- **Tables:** families, users, cached_orders, calendar_events, calendar_sync_tokens
- **Migrations:** ✅ All applied

## Next Steps for Development

You can now proceed with **Phase 1, Task 1.2: Authentication Service**:

1. Create `backend/src/services/auth.service.ts`
2. Implement JWT token generation/validation
3. Create auth routes (`backend/src/routes/auth.routes.ts`)
4. Add authentication middleware
5. Implement user registration and login endpoints

The database schema is ready with the `users` table including:
- email, password_hash, first_name, last_name
- family_id foreign key
- role (admin/member)
- color for calendar events

## Useful Development Commands

```bash
# View logs
docker compose logs -f backend

# Run migrations
docker compose exec backend npm run migrate:latest

# Check migration status
docker compose exec backend npm run migrate:list

# Access backend shell
docker compose exec backend sh

# Restart backend
docker compose restart backend

# Rebuild backend only
docker compose build backend --no-cache && docker compose up -d backend
```

## Troubleshooting Reference

If backend restarts again:
1. Check logs: `docker compose logs backend`
2. Verify dist/server.js exists: `docker compose exec backend ls -la /app/dist/`
3. Check permissions: `docker compose exec backend ls -la /app/data/`
4. Re-run migrations: `docker compose exec backend npm run migrate:latest`

All issues have been resolved and the system is fully operational! 🎉
