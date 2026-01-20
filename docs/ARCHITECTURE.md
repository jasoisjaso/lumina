# Architecture Overview

This document provides a comprehensive overview of Lumina's architecture, design decisions, and technical implementation.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Authentication & Authorization](#authentication--authorization)
- [Data Flow](#data-flow)
- [Deployment Architecture](#deployment-architecture)

## System Overview

Lumina is a full-stack web application built with a modern, scalable architecture:

```
┌─────────────────────────────────────────────────────────┐
│                     User Devices                         │
│         (Desktop, Mobile, Tablet, Kiosk Display)        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/HTTP
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   React UI   │  │    Zustand   │  │  API Client  │ │
│  │  Components  │─▶│     Store    │◀─│   (Axios)    │ │
│  └──────────────┘  └──────────────┘  └──────┬───────┘ │
└────────────────────────────────────────────────┼────────┘
                                                 │ REST API
┌────────────────────────────────────────────────┼────────┐
│                    Backend Layer                ▼        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Express    │  │   Services   │  │  Middleware  │ │
│  │    Routes    │─▶│    Layer     │◀─│   (Auth)     │ │
│  └──────────────┘  └──────┬───────┘  └──────────────┘ │
│                            │                             │
│  ┌──────────────┐  ┌──────┴───────┐  ┌──────────────┐ │
│  │  Background  │  │   Database   │  │    Redis     │ │
│  │     Jobs     │─▶│    (Knex)    │  │   (Cache)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────┼────────────────────────────┐
│                    Data Layer           ▼                │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │    SQLite    │  │   File       │  │  External    │ │
│  │   Database   │  │   Storage    │  │    APIs      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│   (Family Data)      (Photos)      (Google, WooCommerce)│
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.x |
| TypeScript | Type Safety | 5.x |
| Zustand | State Management | 4.x |
| Axios | HTTP Client | 1.x |
| Tailwind CSS | Styling | 3.x |
| React Router | Routing | 6.x |

### Backend

| Technology | Purpose | Version |
|------------|---------|---------|
| Node.js | Runtime | 18.x LTS |
| Express | Web Framework | 4.x |
| TypeScript | Type Safety | 5.x |
| Knex.js | Query Builder | 3.x |
| SQLite | Database | 3.x |
| JWT | Authentication | 9.x |
| bcrypt | Password Hashing | 5.x |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| Redis | Session & Cache Store |
| Nginx | Static File Serving |

## Architecture Patterns

### Backend Patterns

#### 1. Service Layer Pattern

Business logic is separated into service classes:

```
Routes (HTTP) → Services (Logic) → Database (Data)
```

**Benefits:**
- Separation of concerns
- Reusable business logic
- Easier testing
- Consistent error handling

**Example:**
```typescript
// Service handles business logic
class UserService {
  async createUser(data: UserData): Promise<User> {
    // Validation
    // Business rules
    // Database operations
    return user;
  }
}

// Route handles HTTP
router.post('/users', async (req, res) => {
  const user = await userService.createUser(req.body);
  res.json({ user });
});
```

#### 2. Singleton Pattern

Services are exported as singletons:

```typescript
class PermissionService {
  // Methods
}

export default new PermissionService();
```

#### 3. Middleware Chain

Express middleware for cross-cutting concerns:

```
Request → authenticate → authorize → route → response
```

### Frontend Patterns

#### 1. Component-Based Architecture

Functional components with hooks:

```typescript
// Presentational Component
const Button: React.FC<Props> = ({ label, onClick }) => (
  <button onClick={onClick}>{label}</button>
);

// Container Component
const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User>();
  // Logic and state
  return <UserProfileView user={user} />;
};
```

#### 2. State Management with Zustand

```typescript
// Define store
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// Use in component
const { user, setUser } = useAuthStore();
```

#### 3. API Client Layer

Centralized API calls:

```typescript
class UsersAPI {
  async getUser(id: number): Promise<User> {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  }
}

export default new UsersAPI();
```

## Database Schema

### Core Tables

#### families
```sql
CREATE TABLE families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  color TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'invited', 'disabled'
  invitation_token TEXT,
  invitation_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);
```

### Permission System

#### permissions
```sql
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### role_permissions (Role-based)
```sql
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL, -- 'admin' or 'member'
  permission_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role, permission_id)
);
```

#### user_permissions (Custom overrides)
```sql
CREATE TABLE user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  granted BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(user_id, permission_id)
);
```

### Settings Tables

#### family_settings (Family-level)
```sql
CREATE TABLE family_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  settings_type TEXT NOT NULL, -- 'integrations', 'features', 'calendar'
  settings_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  UNIQUE(family_id, settings_type)
);
```

#### user_settings (User-level)
```sql
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  settings_type TEXT NOT NULL, -- 'integrations', 'preferences'
  settings_data JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, settings_type)
);
```

### Calendar Tables

#### calendar_events
```sql
CREATE TABLE calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  user_id INTEGER,
  source TEXT NOT NULL, -- 'google', 'icloud', 'manual', 'woocommerce'
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  all_day BOOLEAN DEFAULT 0,
  location TEXT,
  visibility TEXT DEFAULT 'private', -- 'private', 'family', 'shared'
  raw_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### calendar_sharing
```sql
CREATE TABLE calendar_sharing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  shared_with_user_id INTEGER NOT NULL,
  can_view BOOLEAN DEFAULT 1,
  can_edit BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(owner_user_id, shared_with_user_id)
);
```

## API Design

### RESTful Endpoints

#### Authentication
```
POST   /api/v1/auth/login           # Login
POST   /api/v1/auth/logout          # Logout
POST   /api/v1/auth/refresh         # Refresh token
POST   /api/v1/auth/change-password # Change password
```

#### Setup
```
GET    /api/v1/setup/status         # Check if setup needed
POST   /api/v1/setup/initialize     # Complete setup
POST   /api/v1/setup/validate-email # Validate email
```

#### Users
```
GET    /api/v1/users               # List users
POST   /api/v1/users/invite        # Invite user
PUT    /api/v1/users/:id/role      # Update role
DELETE /api/v1/users/:id           # Delete user
```

#### Calendar
```
GET    /api/v1/events              # Get events
POST   /api/v1/events              # Create event
PUT    /api/v1/events/:id          # Update event
DELETE /api/v1/events/:id          # Delete event
```

#### Calendar Sharing
```
GET    /api/v1/calendar-sharing/my-settings    # My sharing settings
GET    /api/v1/calendar-sharing/family-members # Family members list
POST   /api/v1/calendar-sharing/share          # Share calendar
DELETE /api/v1/calendar-sharing/unshare/:id    # Unshare calendar
GET    /api/v1/calendar-sharing/shared-with-me # Calendars shared with me
```

### API Response Format

#### Success Response
```json
{
  "data": {},
  "message": "Success message"
}
```

#### Error Response
```json
{
  "error": "Error Type",
  "message": "Human-readable message",
  "details": "Optional additional details"
}
```

## Authentication & Authorization

### JWT Token Flow

```
1. User logs in with email/password
2. Backend validates credentials
3. Backend generates:
   - Access Token (15min, short-lived)
   - Refresh Token (7 days, long-lived)
4. Tokens stored in frontend (Zustand + localStorage)
5. Access Token sent with every API request
6. When Access Token expires:
   - Frontend automatically uses Refresh Token
   - Gets new Access Token
   - Retries original request
```

### Token Payload

```typescript
interface TokenPayload {
  userId: number;
  email: string;
  familyId: number;
  role: 'admin' | 'member';
}
```

### Permission System

**Two-Level Permission Model:**

1. **Role-Based Permissions** (Default)
   - Admin: All permissions
   - Member: Limited permissions

2. **Custom User Overrides**
   - Grant additional permissions
   - Revoke role permissions
   - Overrides take precedence

**Permission Check Logic:**
```typescript
getUserPermissions(userId) {
  rolePermissions = getRolePermissions(user.role);
  userOverrides = getUserOverrides(userId);

  // Apply overrides
  for (override in userOverrides) {
    if (override.granted) {
      rolePermissions.add(override.permission);
    } else {
      rolePermissions.remove(override.permission);
    }
  }

  return rolePermissions;
}
```

## Data Flow

### Calendar Event Sync

```
External Calendar (Google)
         │
         ▼
   Background Job (Every 5 min)
         │
         ▼
   Calendar Sync Service
         │
         ├─▶ Fetch new events
         ├─▶ Update existing events
         └─▶ Delete removed events
         │
         ▼
    SQLite Database
         │
         ▼
   Frontend (Real-time display)
```

### WooCommerce Order Sync

```
WooCommerce Store
         │
         ▼
   Webhook / Background Job
         │
         ▼
   Orders Sync Service
         │
         ├─▶ Fetch orders
         ├─▶ Transform data
         └─▶ Cache in database
         │
         ▼
   Display on Calendar
```

## Deployment Architecture

### Docker Compose Deployment

```yaml
services:
  frontend:
    - Nginx serving React build
    - Port 3000 (HTTP)

  backend:
    - Node.js Express server
    - Port 3001 (API)

  redis:
    - Cache and session store
    - Port 6379 (Internal)
```

### Data Persistence

```
volumes:
  backend/data/    # SQLite database + uploads
  redis_data/      # Redis persistence
```

### Multi-Platform Support

Docker images are built for:
- `linux/amd64` (Intel/AMD servers)
- `linux/arm64` (Raspberry Pi, Apple Silicon)

### Resource Requirements

**Minimum:**
- 2GB RAM
- 1GB Disk
- 1 CPU Core

**Recommended:**
- 4GB RAM
- 10GB Disk
- 2 CPU Cores

## Design Principles

### 1. Privacy First
- All data stored locally
- No external tracking
- Secure by default

### 2. Family-Centric
- Single family per instance
- Clear admin hierarchy
- Easy user management

### 3. Mobile-First
- Responsive design
- Touch-friendly
- Progressive enhancement

### 4. Developer-Friendly
- Clear separation of concerns
- TypeScript throughout
- Comprehensive documentation

### 5. Self-Hosted
- Easy deployment
- No vendor lock-in
- Full control

## Performance Considerations

### Caching Strategy

1. **Redis Cache**
   - API responses
   - Weather data
   - Session storage

2. **Browser Cache**
   - Static assets
   - API responses (short TTL)

### Database Optimization

- Indexes on frequently queried fields
- Efficient query design with Knex
- Migrations for schema changes

### Bundle Optimization

- Code splitting
- Lazy loading routes
- Tree shaking
- Minification

---

For more technical details, see the [Development Guide](DEVELOPMENT.md).
