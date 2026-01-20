# Docker Build Fix - Complete Solution ✅ WORKING

## Status: ✅ RESOLVED - VERIFIED WORKING

All issues have been fixed. Backend container is running stably with all health checks passing.

### Verification Results
```bash
$ curl http://localhost:3001/health
{"status":"healthy","timestamp":"2026-01-20T04:24:29.465Z"}

$ curl http://localhost:3001/api/v1/health
{"status":"healthy","service":"api"}

$ curl http://localhost:3001/api/v1/db/health
{"status":"healthy","database":"connected"}

$ docker compose ps
NAME              STATUS
lumina-backend    Up (healthy)  ← NO MORE RESTARTS!
lumina-frontend   Up
lumina-redis      Up
```

## Problem Summary
TypeScript was compiling `src/server.ts` to `dist/src/server.js` instead of `dist/server.js` due to incorrect `rootDir` configuration in `tsconfig.json`.

## Root Causes
1. `tsconfig.json` had `"rootDir": "."` which preserved the full directory structure
2. `src/database/knex.ts` imported `knexfile.ts` from outside the src/ directory
3. Missing database config file in Docker container
4. Permissions issue with volume-mounted data directory

## What Was Fixed

### 1. tsconfig.json ✅
Changed `rootDir` from `"."` to `"./src"` so files compile to the correct location:
```json
{
  "compilerOptions": {
    "rootDir": "./src",  // Changed from "."
    "outDir": "./dist",
    // ... other options
  }
}
```

### 2. Created src/database/config.ts ✅
**NEW FILE:** Moved database configuration inside src/ directory to avoid TypeScript rootDir violations:
```typescript
// backend/src/database/config.ts
export const knexConfig: Knex.Config = {
  client: 'sqlite3',
  connection: { filename: databasePath },
  migrations: { directory: './src/database/migrations' },
  pool: { afterCreate: (conn, cb) => conn.run('PRAGMA foreign_keys = ON', cb) },
  useNullAsDefault: true,
};
```

### 3. Updated src/database/knex.ts ✅
Changed import from `../../knexfile` to `./config`:
```typescript
import { knexConfig } from './config';  // Local import
const db = knex(knexConfig);
```

### 4. Updated knexfile.ts ✅
Simplified to re-export the config for CLI usage:
```typescript
import { knexConfig } from './src/database/config';
export default knexConfig;
```

### 5. Dockerfile ✅
- Fixed file copying to include entire src/database directory
- Added proper build verification
- Fixed user permissions

### 6. Permissions ✅
Set correct permissions on data directory:
```bash
chmod 777 backend/data
```

## Complete File List

All files are now correctly configured:

```
backend/
├── src/
│   ├── server.ts              ✓ Main server file
│   ├── config/
│   │   └── index.ts           ✓ Configuration
│   └── database/
│       ├── knex.ts            ✓ Database connection
│       └── migrations/
│           └── 001_initial_schema.ts
├── knexfile.ts                ✓ Knex CLI config
├── tsconfig.json              ✓ FIXED - correct rootDir
├── tsconfig.knex.json         ✓ NEW - for knexfile compilation
├── package.json               ✓ Updated scripts
├── Dockerfile                 ✓ FIXED - better verification
└── test-build.sh              ✓ NEW - local build testing
```

## Exact Commands to Run

### Option 1: Automated Build & Test (Recommended)

```bash
# Make the script executable
chmod +x build-and-test.sh

# Run the complete build and test
./build-and-test.sh
```

This script will:
1. Clean up old containers
2. Build fresh images
3. Start all services
4. Run migrations
5. Test all health endpoints

### Option 2: Manual Step-by-Step

```bash
# 1. Clean up existing containers and images
docker compose down -v
docker rmi lumina-backend lumina-frontend 2>/dev/null || true

# 2. Create data directory
mkdir -p backend/data
chmod 777 backend/data

# 3. Build and start services
docker compose build --no-cache
docker compose up -d

# 4. Check container status
docker compose ps

# 5. View backend logs
docker compose logs -f backend

# 6. Run database migrations
docker compose exec backend npm run migrate:latest

# 7. Test the health endpoint
curl http://localhost:3001/health
```

### Option 3: Test Local Build First

```bash
# Test TypeScript compilation without Docker
cd backend
chmod +x test-build.sh
./test-build.sh
```

## Verification Steps

After running the build, verify:

1. **Container is running:**
   ```bash
   docker compose ps
   # backend should show "Up" status
   ```

2. **Health endpoint works:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"healthy","timestamp":"..."}
   ```

3. **API health works:**
   ```bash
   curl http://localhost:3001/api/v1/health
   # Should return: {"status":"healthy","service":"api"}
   ```

4. **Database health works:**
   ```bash
   curl http://localhost:3001/api/v1/db/health
   # Should return: {"status":"healthy","database":"connected"}
   ```

5. **Check the compiled file exists:**
   ```bash
   docker compose exec backend ls -la /app/dist/
   # Should show server.js, config/, database/
   ```

## Troubleshooting

### If backend container keeps restarting:

```bash
# Check detailed logs
docker compose logs backend

# Verify the dist directory contents
docker compose exec backend ls -la /app/dist/

# Ensure migrations ran successfully
docker compose exec backend npm run migrate:latest
```

### If health checks fail:

```bash
# Check if the server is listening
docker compose exec backend netstat -tlnp | grep 3001

# Check Redis connection
docker compose exec backend node -e "require('redis').createClient({url:'redis://redis:6379'}).connect().then(() => console.log('Redis OK'))"
```

### If database errors occur:

```bash
# Check database file exists
docker compose exec backend ls -la /app/data/

# Run migrations manually
docker compose exec backend npm run migrate:latest

# Check migration status
docker compose exec backend npm run migrate:list
```

## Expected Output

When everything works correctly:

```
$ curl http://localhost:3001/health
{"status":"healthy","timestamp":"2026-01-20T..."}

$ curl http://localhost:3001/api/v1/health
{"status":"healthy","service":"api"}

$ curl http://localhost:3001/api/v1/db/health
{"status":"healthy","database":"connected"}
```

## Services Access

- **Backend API:** http://localhost:3001
- **Frontend:** http://localhost:3000
- **Redis:** Internal only (redis:6379)

## Next Steps

After successful build:

1. Continue with **Task 1.2: Authentication Service** (backend/src/services/auth.service.ts)
2. Create auth routes (backend/src/routes/auth.routes.ts)
3. Implement JWT middleware
4. Add user registration and login endpoints
