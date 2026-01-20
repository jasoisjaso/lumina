# Contributing to Lumina

Thank you for your interest in contributing to Lumina! This document will help you get started.

## 🎯 How Can I Contribute?

There are many ways to contribute to Lumina:

### 1. Report Bugs

Found a bug? Please [create an issue](https://github.com/jasoisjaso/lumina/issues/new) with:

- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (OS, Docker version, browser)
- **Screenshots** if applicable
- **Logs** from `docker compose logs`

### 2. Suggest Features

Have an idea? We'd love to hear it! [Open a discussion](https://github.com/jasoisjaso/lumina/discussions) or create a feature request issue with:

- **Use case** - Why is this feature needed?
- **Proposed solution** - How should it work?
- **Alternatives** - What other solutions did you consider?

### 3. Improve Documentation

Documentation improvements are always welcome:

- Fix typos or unclear instructions
- Add examples or tutorials
- Translate documentation
- Improve code comments

### 4. Submit Code

Ready to code? Great! Please follow the process below.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- Docker & Docker Compose
- Git

### Setup Development Environment

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/lumina.git
cd lumina

# 3. Add upstream remote
git remote add upstream https://github.com/jasoisjaso/lumina.git

# 4. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 5. Set up environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 6. Start Redis
docker compose up redis -d

# 7. Run migrations
cd backend
npm run migrate:latest

# 8. Start development servers
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 📝 Development Workflow

### 1. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

Follow our code standards:

- **TypeScript**: Use strict typing, avoid `any`
- **Naming**: camelCase for variables, PascalCase for components
- **Formatting**: Run `npm run format` before committing
- **Linting**: Run `npm run lint` and fix any issues

### 3. Write Tests

- Add tests for new features
- Ensure existing tests pass: `npm test`
- Aim for good test coverage

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Good commit messages:
git commit -m "feat: add calendar export functionality"
git commit -m "fix: resolve timezone bug in event display"
git commit -m "docs: update deployment guide for Raspberry Pi"
git commit -m "refactor: simplify permission check logic"

# Bad commit messages:
git commit -m "updates"
git commit -m "fixed stuff"
git commit -m "WIP"
```

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Go to GitHub and create a Pull Request
```

## 🔍 Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guide
- [ ] All tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with main branch

### PR Description Template

```markdown
## Description
Brief description of what this PR does and why.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran to verify your changes.

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
```

### Review Process

1. **Automated Checks**: CI will run tests and builds
2. **Code Review**: Maintainers will review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, a maintainer will merge

## 🏗️ Project Structure

```
lumina/
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── database/    # Knex migrations
│   │   ├── jobs/        # Background jobs
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── types/       # TypeScript types
│   └── tests/           # Backend tests
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── api/        # API client functions
│   │   ├── components/ # React components
│   │   ├── stores/     # Zustand stores
│   │   └── types/      # TypeScript types
│   └── tests/          # Frontend tests
│
└── docs/               # Documentation
```

## 🎨 Code Style Guidelines

### TypeScript

```typescript
// ✅ Good
interface User {
  id: number;
  email: string;
  firstName: string;
}

async function getUserById(id: number): Promise<User> {
  // Implementation
}

// ❌ Bad
function getUserById(id: any): any {
  // Implementation
}
```

### React Components

```typescript
// ✅ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  );
};

// ❌ Bad
export const Button = (props: any) => {
  return <button onClick={props.onClick}>{props.label}</button>
}
```

### API Routes

```typescript
// ✅ Good
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = await service.getData(req.user!.userId);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
});

// ❌ Bad
router.get('/', (req, res) => {
  service.getData().then(data => res.json(data));
});
```

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- users.test.ts
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

## 🐛 Debugging

### Backend

```bash
# Enable debug logging
# Edit backend/.env:
NODE_ENV=development
LOG_LEVEL=debug

# View logs
docker logs -f lumina-backend
```

### Frontend

```bash
# Enable React DevTools
# Open browser DevTools (F12)
# React tab will show component tree
```

### Database

```bash
# Connect to SQLite database
sqlite3 backend/data/lumina.db

# Useful commands:
.tables                 # List all tables
.schema users          # Show table schema
SELECT * FROM users;   # Query data
```

## 📚 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Knex.js Documentation](http://knexjs.org/)
- [Docker Documentation](https://docs.docker.com/)

## ❓ Questions?

- **General Questions**: [GitHub Discussions](https://github.com/jasoisjaso/lumina/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/jasoisjaso/lumina/issues)
- **Security Issues**: Email security@example.com

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

Thank you for making Lumina better! 🎉

## 📄 License

By contributing to Lumina, you agree that your contributions will be licensed under the MIT License.
