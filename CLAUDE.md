# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumina is a privacy-focused family dashboard built with React (frontend) and Node.js (backend), designed for self-hosting with Docker. It integrates calendar syncing (Google Calendar, iCloud), WooCommerce order management with a kanban-style workflow board, photo gallery, weather widgets, and user management with granular permissions.

**Key Design Principles:**
- Privacy-first: All data stays on user's server
- Family-oriented: Multi-user with role-based permissions
- Self-contained: SQLite database, no external database server required
- Production-ready: WooCommerce integration with bi-directional sync

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Zustand (state) + TailwindCSS + React Router
- **Backend**: Node.js + Express + TypeScript + Knex.js (migrations)
- **Database**: SQLite (file-based at `/app/data/lumina.db`)
- **Cache**: Redis (for sessions and API caching)
- **Containerization**: Docker + Docker Compose

### Project Structure
```
lumina/
├── backend/
│   ├── src/
│   │   ├── config/          # App configuration
│   │   ├── database/        # Knex config, migrations
│   │   ├── jobs/            # Background jobs (sync-orders, sync-calendars)
│   │   ├── middleware/      # Express middleware (auth, permissions)
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (auth, woocommerce, workflow, etc.)
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Express server entry point
│   ├── knexfile.ts          # Knex CLI configuration
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/             # API client functions (axios wrappers)
│   │   ├── components/      # React components
│   │   │   ├── admin/       # Admin-only components (ServerStats, ErrorLogViewer)
│   │   │   └── workflow/    # Workflow board components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # Zustand stores (auth, settings)
│   │   ├── App.tsx          # Main app with routing
│   │   └── index.tsx
│   └── package.json
│
├── data/                    # SQLite database and logs (Docker volume)
├── docker-compose.yml       # Development/local compose file
└── docker-compose.prod.yml  # Production compose file
```

### Authentication & Authorization
- **Authentication**: JWT-based with access tokens (15min) and refresh tokens (7 days)
- **Middleware**: `authenticate`, `requireAdmin`, `requirePermission`, `requireAllPermissions`
- **Roles**: `admin`, `member` (stored in users table)
- **Permissions**: Granular permissions system (e.g., `view_calendar`, `manage_orders`, `manage_users`)
- **AuthRequest**: Extended Express Request type with `user` object attached by auth middleware

### Key Services
- **auth.service.ts**: User authentication, JWT token generation/verification
- **woocommerce.service.ts**: WooCommerce REST API integration, order syncing
- **workflow.service.ts**: Order workflow/kanban board logic, stage management
- **google-calendar.service.ts**: Google Calendar OAuth + sync
- **permission.service.ts**: Permission checking and management
- **settings.service.ts**: Family and system settings

### Background Jobs
- **sync-orders.job.ts**: Polls WooCommerce every 30 minutes, syncs order updates
- **sync-calendars.job.ts**: Syncs Google Calendar events periodically
- Both jobs start automatically on server startup in `server.ts`

### Database Migrations
- Migrations stored in `backend/src/database/migrations/`
- Run automatically on server startup via `runMigrations()` in `server.ts`
- Create new migrations: `npm run migrate:make <name>` (in backend/)

### Error Logging
- Backend overrides `console.error` and `console.warn` in `server.ts`
- Logs written to `/app/data/backend.log` (Docker volume)
- Accessible via admin API endpoint `/api/v1/settings/admin/error-logs`

## Common Development Commands

### Development Setup
```bash
# 1. Start Redis
docker compose up redis -d

# 2. Backend (Terminal 1)
cd backend
npm install
npm run migrate:latest    # Run migrations
npm run dev              # Start dev server with hot reload

# 3. Frontend (Terminal 2)
cd frontend
npm install
npm start                # Start React dev server (port 3000)
```

### Database Migrations
```bash
cd backend

# Create new migration
npm run migrate:make add_new_feature

# Run all pending migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback

# List migration status
npm run migrate:list

# Direct knex access
npm run knex -- <command>
```

### Building & Testing
```bash
# Build backend
cd backend
npm run build            # Compiles TypeScript to dist/

# Build frontend
cd frontend
npm run build            # Creates optimized production build

# Run tests
npm test                 # Run tests (both backend/frontend)

# Lint/format
npm run lint
npm run format
```

### Docker Commands
```bash
# Start all services (dev)
docker compose up -d

# Start all services (production)
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs --tail=50 backend

# Restart service
docker compose restart backend

# Rebuild after code changes
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

### Debugging
```bash
# Check backend health
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/db/health

# Connect to SQLite database
sqlite3 backend/data/lumina.db
# In sqlite3:
.tables                    # List tables
.schema users             # Show table schema
SELECT * FROM users;      # Query data

# Check Redis
docker compose exec redis redis-cli
# In redis-cli:
KEYS *                    # List all keys
GET <key>                 # Get value

# View backend logs with filtering
docker compose logs backend | grep -E "error|workflow|WooCommerce"

# Check WooCommerce sync status
docker compose logs backend | grep "Detected WooCommerce statuses"

# Trigger immediate sync (restart backend)
docker compose restart backend
```

### WooCommerce Integration
```bash
# Debug customization extraction
cd backend
npm run debug:sync

# Backfill customization data for existing orders
npm run backfill:customizations

# Test WooCommerce connection (check logs after restart)
docker compose restart backend
docker compose logs -f backend | grep "WooCommerce"
```

## Important Implementation Details

### WooCommerce Workflow Board
- **Bi-directional sync**: Changes in Lumina update WooCommerce; WooCommerce changes sync to Lumina every 30min
- **Custom order statuses**: Automatically detects custom statuses from WooCommerce Order Status Manager plugin
- **Product customization**: Extracts customization details from order meta (`_billing_*` fields)
  - Customization stored as JSON in `order_workflow.customization_details` column
  - Displayed on order cards: "Large Board • Ballerina • Strawberry Milkshake • 2 Names"
- **Advanced filtering**: Filter by date range, board style, font, color using indexed JSON queries
- **Column visibility**: Per-user settings stored in `user_workflow_settings` table
- **Drag-and-drop**: Uses `@dnd-kit` library, calls `updateOrderStageWithWooCommerceSync()` on drop

### Setup Wizard
- First-time setup at `/setup` route (public, no auth)
- 5-step wizard: Welcome → Create Family → Create Admin → Integrations → Review
- Creates first family and admin user via `/api/v1/setup/*` endpoints
- Backend checks setup status on startup via `setup.routes.ts`

### Calendar Integration
- **Google Calendar**: OAuth flow via `google-calendar.service.ts`, stores tokens in DB
- **iCloud Calendar**: CalDAV protocol, credentials stored encrypted
- **Calendar sharing**: Per-user settings control visibility of personal events to other family members
- Events stored in `events` table, synced periodically by `sync-calendars.job.ts`

### Permission System
- **Role-based**: `admin` vs `member` roles
- **Granular permissions**: Fine-grained permissions (e.g., `view_orders`, `edit_settings`)
- **Permission inheritance**: Admins have all permissions automatically
- **Middleware**: Use `requirePermission('permission_name')` on routes

### Admin Dashboard
- **Location**: Settings Panel → Admin Tab (only visible to admins)
- **Server Stats**: Uptime, memory, database size, order count
- **Error Logs**: View recent errors/warnings from `/app/data/backend.log`
- **Endpoints**: Both protected with `requireAdmin` middleware
  - `GET /api/v1/settings/admin/server-stats`
  - `GET /api/v1/settings/admin/error-logs`

### Frontend State Management
- **Zustand stores**: Lightweight state management (auth, settings)
- **auth.store.ts**: Authentication state, token management
- **settings.store.ts**: Family settings, user preferences
- **No Redux**: Keep it simple with Zustand

### API Client Pattern
- All API calls in `frontend/src/api/*.api.ts` files
- Use axios with interceptors for auth headers
- Error handling centralized in API clients
- Example: `settingsAPI.getServerStats()`, `authAPI.login()`

### Styling
- **TailwindCSS**: Utility-first CSS framework
- **Mobile-first**: Responsive design with mobile navigation
- **Theme**: Professional blue/indigo color scheme ("Skylight" aesthetic)
- **Components**: Custom components in `frontend/src/components/`

## Testing Guidance

### Manual Testing Checklist
1. **Setup Wizard**: Test first-time setup flow at http://localhost:3000/setup
2. **Authentication**: Test login/logout, token refresh
3. **Workflow Board**:
   - Verify orders load correctly
   - Test drag-and-drop between stages
   - Test filtering (date, customization fields)
   - Test column visibility toggles
   - Verify WooCommerce sync after drag
4. **Calendar**: Test event creation, sync with Google Calendar
5. **Admin Dashboard**: Test server stats, error log viewer
6. **Permissions**: Test permission-based access control

### Integration Testing
```bash
# Run full auth flow test
./test-auth-flow.sh

# Build and test script
./build-and-test.sh

# Reset database for clean testing
./reset-database.sh
```

### Verifying WooCommerce Sync
See `TESTING_GUIDE.md` for detailed WooCommerce sync testing procedures.

## Key Files to Know

### Backend Entry Points
- `backend/src/server.ts` - Express server, middleware setup, job initialization
- `backend/src/routes/*.routes.ts` - API route definitions
- `backend/knexfile.ts` - Database configuration for migrations

### Frontend Entry Points
- `frontend/src/App.tsx` - Main app component, routing
- `frontend/src/components/Layout.tsx` - Main layout wrapper
- `frontend/src/components/SettingsPanel.tsx` - Settings UI (includes admin tab)
- `frontend/src/components/workflow/WorkflowBoard.tsx` - Kanban board

### Configuration
- `backend/.env` - Backend environment variables (JWT secret, Redis host, database path)
- `frontend/.env` - Frontend environment variables (API URL)
- `docker-compose.yml` - Development Docker setup
- `docker-compose.prod.yml` - Production Docker setup

### Critical Database Tables
- `users` - User accounts (email, password, role)
- `families` - Family groups
- `permissions` - Permission definitions
- `user_permissions` - User-permission assignments
- `orders` - WooCommerce orders cache
- `order_workflow` - Workflow stage assignments for orders
- `order_workflow_stages` - Workflow stage definitions (Processing, Design, etc.)
- `events` - Calendar events
- `calendar_integrations` - Google Calendar OAuth tokens

## Common Pitfalls

1. **Database migrations**: Always run `npm run migrate:latest` after pulling new code
2. **WooCommerce API**: Custom statuses require `status=any` parameter in API calls
3. **Auth middleware order**: Always use `authenticate` before `requireAdmin` or `requirePermission`
4. **JWT tokens**: Access tokens expire in 15min; handle refresh token logic
5. **Docker volumes**: Data persists in `backend/data/` directory (mounted volume)
6. **SQLite locking**: Avoid concurrent writes; use transactions for bulk operations
7. **React lazy loading**: Components are lazy-loaded; ensure Suspense boundaries exist
8. **Background jobs**: Jobs run automatically on server start; graceful shutdown on SIGTERM/SIGINT

## Conventions

### Commit Messages
Follow Conventional Commits format:
- `feat: add user profile page`
- `fix: resolve timezone bug in calendar`
- `docs: update deployment guide`
- `refactor: simplify permission check logic`

### Code Style
- **TypeScript**: Use strict typing, avoid `any` (use `unknown` if necessary)
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Error handling**: Always use try-catch in async routes, return proper HTTP status codes
- **API responses**: Consistent format: `{ data: {...} }` for success, `{ error: string, message: string }` for errors

### Security Best Practices
- Never commit `.env` files (use `.env.example` templates)
- Always use parameterized queries (Knex.js does this by default)
- Validate user input in route handlers
- Use `requireAdmin` or `requirePermission` middleware for protected routes
- Hash passwords with bcrypt (10 rounds)
- Store sensitive data (OAuth tokens) encrypted in database
- Never commit/push the CLAUDE.md

## Documentation References

- **README.md**: User-facing documentation, quick start guide
- **CONTRIBUTING.md**: Development setup, coding standards, PR guidelines
- **TESTING_GUIDE.md**: WooCommerce bi-directional sync testing procedures
- **ADMIN_FEATURES.md**: Admin dashboard implementation details
- **PRODUCT_CUSTOMIZATION_FEATURES.md**: Order customization feature documentation
- **IMPLEMENTATION_SUMMARY.md**: High-level implementation summary
- **docs/**: Additional deployment and troubleshooting guides
