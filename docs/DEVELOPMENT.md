# Development Guide

This guide will help you set up Lumina for local development and contribute to the project.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Contributing](#contributing)

## Development Environment Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Docker** and **Docker Compose** (for Redis)
- **Git**
- Code editor (**VS Code** recommended)

### VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### Initial Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/lumina.git
cd lumina
```

#### 2. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

#### 3. Set Up Environment Variables

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

Edit the `.env` files with your development configuration.

#### 4. Start Redis (Required)

```bash
# Start Redis with Docker
docker compose up redis -d

# Or install Redis locally
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt install redis-server
```

#### 5. Run Database Migrations

```bash
cd backend
npm run migrate:latest
```

### Running in Development Mode

#### Option 1: All Services with Docker

```bash
# Build and start everything
docker compose up --build

# Or in detached mode
docker compose up -d --build
```

#### Option 2: Local Development (Hot Reload)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Redis:**
```bash
docker compose up redis
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Backend Health: http://localhost:3001/health

## Project Structure

```
lumina/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── database/       # Database migrations and knex
│   │   ├── jobs/           # Background jobs (sync)
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript type definitions
│   │   └── server.ts       # Express app entry
│   ├── data/               # SQLite database & uploads
│   ├── Dockerfile          # Production build
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React frontend
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand state management
│   │   ├── App.tsx        # Main app component
│   │   └── index.tsx      # Entry point
│   ├── Dockerfile         # Production build
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                   # Documentation
├── .github/                # GitHub workflows (CI/CD)
├── docker-compose.yml      # Development compose
├── docker-compose.prod.yml # Production compose
└── README.md
```

## Development Workflow

### Creating a New Feature

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Backend Changes**
   - Create/modify routes in `backend/src/routes/`
   - Add business logic in `backend/src/services/`
   - Create database migrations if needed:
     ```bash
     cd backend
     npm run migrate:make your_migration_name
     ```

3. **Frontend Changes**
   - Create components in `frontend/src/components/`
   - Add API calls in `frontend/src/api/`
   - Update stores in `frontend/src/stores/` if needed

4. **Test Your Changes**
   ```bash
   # Backend tests
   cd backend
   npm test

   # Frontend tests
   cd frontend
   npm test
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to GitHub
   - Create PR from your feature branch to main
   - Fill in the PR template
   - Wait for review

### Database Migrations

#### Creating a Migration

```bash
cd backend
npm run migrate:make migration_name
```

This creates a new migration file in `backend/src/database/migrations/`.

#### Migration Structure

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create tables, add columns, etc.
  await knex.schema.createTable('table_name', (table) => {
    table.increments('id').primary();
    table.string('column_name');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Rollback changes
  await knex.schema.dropTableIfExists('table_name');
}
```

#### Running Migrations

```bash
# Run all pending migrations
npm run migrate:latest

# Rollback last migration
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback:all
```

### Adding a New API Endpoint

#### 1. Create Route Handler

`backend/src/routes/feature.routes.ts`:
```typescript
import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import featureService from '../services/feature.service';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = await featureService.getData(req.user!.userId);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### 2. Register Route

`backend/src/server.ts`:
```typescript
import featureRoutes from './routes/feature.routes';

app.use('/api/v1/feature', featureRoutes);
```

#### 3. Create Frontend API Client

`frontend/src/api/feature.api.ts`:
```typescript
import apiClient from './axios.config';

class FeatureAPI {
  async getData() {
    const response = await apiClient.get('/feature');
    return response.data;
  }
}

export default new FeatureAPI();
```

## Code Standards

### TypeScript

- Always use TypeScript
- Define interfaces for all data structures
- Use `strict` mode
- Avoid `any` types when possible

### Naming Conventions

- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase`
- **Types**: `PascalCase`

### Code Style

We use **Prettier** and **ESLint**:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add calendar sharing feature
fix: resolve authentication bug
docs: update README
style: format code
refactor: reorganize services
test: add unit tests for auth
chore: update dependencies
```

### Component Structure

```typescript
import React, { useState, useEffect } from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  const [state, setState] = useState('');

  useEffect(() => {
    // Side effects
  }, []);

  const handleClick = () => {
    // Event handler
    onAction();
  };

  return (
    <div className="container">
      <h1>{title}</h1>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
};

export default MyComponent;
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode (interactive)
npm test
```

### Integration Tests

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration
```

## Debugging

### Backend Debugging

**VS Code launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "preLaunchTask": "npm: dev",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "sourceMaps": true
    }
  ]
}
```

### Frontend Debugging

Use Chrome DevTools:
1. Open http://localhost:3000
2. Press F12
3. Go to Sources tab
4. Set breakpoints in source files

### Database Debugging

```bash
# Connect to SQLite database
sqlite3 backend/data/lumina.db

# Run queries
.tables
.schema users
SELECT * FROM users;
```

## Contributing

### Code Review Process

1. **Self Review**: Review your own PR first
2. **Tests**: Ensure all tests pass
3. **Documentation**: Update docs if needed
4. **CI Checks**: Wait for CI to pass
5. **Request Review**: Tag maintainers
6. **Address Feedback**: Make requested changes
7. **Merge**: Maintainer will merge when approved

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manually tested

## Screenshots
(if applicable)

## Checklist
- [ ] Code follows style guide
- [ ] Self-reviewed code
- [ ] Commented complex code
- [ ] Updated documentation
- [ ] No new warnings
```

### Getting Help

- 💬 [GitHub Discussions](https://github.com/yourusername/lumina/discussions)
- 🐛 [Report Issues](https://github.com/yourusername/lumina/issues)
- 📧 Email: maintainer@example.com

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Knex.js Documentation](http://knexjs.org/)
- [Zustand Guide](https://zustand-demo.pmnd.rs/)

---

Happy coding! 🚀
