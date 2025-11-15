# Development Guide: SkyFi MCP

**Last Updated**: January 2025

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Common Tasks](#common-tasks)
5. [Troubleshooting](#troubleshooting)
6. [Best Practices](#best-practices)

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (for local services)
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Davaakhatan/skyfi-mcp.git
   cd skyfi-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start services with Docker**
   ```bash
   docker-compose up -d
   ```

5. **Setup database**
   ```bash
   npm run db:setup
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

---

## Development Environment

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Type check without building |
| `npm run db:setup` | Setup database schema |
| `npm run db:init` | Initialize database manually |
| `npm run kill:port` | Kill process on port 3000 |

### Environment Variables

Key environment variables (see `.env.example` for full list):

- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port (default: 3000)
- `SKYFI_API_KEY` - SkyFi API key (required)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `API_KEY_ENCRYPTION_KEY` - Key for encrypting API keys

---

## Project Structure

```
skyfi-mcp/
├── src/
│   ├── __tests__/          # Test setup and utilities
│   ├── config/             # Configuration files
│   │   ├── index.ts        # Main config
│   │   └── database.ts     # Database connection
│   ├── server/             # Server code
│   │   ├── main.ts         # Server entry point
│   │   ├── middleware/     # Express middleware
│   │   │   ├── auth.ts     # Authentication
│   │   │   ├── rateLimit.ts # Rate limiting
│   │   │   └── errorHandler.ts # Error handling
│   │   └── routes/         # API routes
│   │       ├── index.ts    # Root routes
│   │       └── auth.routes.ts # Auth routes
│   ├── services/           # Business logic (to be implemented)
│   ├── repositories/       # Data access layer (to be implemented)
│   ├── models/             # Data models (to be implemented)
│   ├── auth/               # Authentication services (to be implemented)
│   ├── utils/              # Utility functions
│   │   ├── errors.ts       # Custom error classes
│   │   └── logger.ts       # Logging utility
│   └── sse/                # Server-Sent Events (to be implemented)
├── docs/                   # Documentation
├── scripts/                # Utility scripts
│   ├── init-db.sql         # Database schema
│   └── setup-db.sh        # Database setup script
├── memory-bank/            # Project memory bank
├── tasks/                  # Task lists
├── docker-compose.yml      # Docker services
├── Dockerfile              # Container definition
└── package.json            # Dependencies
```

---

## Common Tasks

### Running the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

### Running Tests

**All tests**:
```bash
npm test
```

**Watch mode**:
```bash
npm run test:watch
```

**With coverage**:
```bash
npm run test:coverage
```

### Database Operations

**Setup database**:
```bash
npm run db:setup
```

**Manual initialization**:
```bash
npm run db:init
```

**Connect to database**:
```bash
docker-compose exec postgres psql -U postgres -d skyfi_mcp
```

### Code Quality

**Lint code**:
```bash
npm run lint
```

**Fix linting issues**:
```bash
npm run lint:fix
```

**Format code**:
```bash
npm run format
```

**Type check**:
```bash
npm run type-check
```

### Port Management

**Kill process on port 3000**:
```bash
npm run kill:port
```

**Or manually**:
```bash
lsof -ti:3000 | xargs kill -9
```

---

## Troubleshooting

### Database Connection Issues

**Problem**: Database connection fails on startup

**Solution**: 
- Ensure PostgreSQL is running: `docker-compose ps`
- Check database exists: `npm run db:setup`
- Verify connection string in `.env`

**Error**: `database "skyfi_mcp" does not exist`

**Solution**: Run `npm run db:setup` to create the database

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::3000`

**Solution**: 
```bash
npm run kill:port
# Or manually:
lsof -ti:3000 | xargs kill -9
```

### TypeScript Errors

**Problem**: Type errors in IDE

**Solution**:
```bash
npm run type-check
npm run build
```

### Module Resolution Issues

**Problem**: Cannot find module '@config/index'

**Solution**: 
- Ensure `tsconfig.json` paths are correct
- Restart TypeScript server in IDE
- Run `npm run build` to verify

---

## Best Practices

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier (configured)
- Write self-documenting code
- Add JSDoc comments for public APIs

### Testing

- Write tests for all new features
- Aim for 80%+ code coverage
- Test edge cases and error scenarios
- Use descriptive test names

### Git Workflow

- Create feature branches: `git checkout -b feature/feature-name`
- Write clear commit messages
- Push frequently to avoid conflicts
- Use conventional commits format

### Error Handling

- Use custom error classes from `@utils/errors`
- Provide helpful error messages
- Log errors with context
- Never expose sensitive information

### Security

- Never commit `.env` file
- Use environment variables for secrets
- Validate all user input
- Use parameterized queries for database

### Performance

- Use connection pooling for database
- Implement caching where appropriate
- Monitor response times
- Optimize database queries

---

## API Development

### Adding New Routes

1. Create route file in `src/server/routes/`
2. Import and use in `src/server/main.ts`
3. Add authentication if needed
4. Add rate limiting
5. Write tests

### Adding Middleware

1. Create middleware in `src/server/middleware/`
2. Export middleware function
3. Use in route or app-level
4. Write tests

### Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {},
    "timestamp": "2025-01-15T10:30:00Z",
    "request_id": "req_1234567890"
  }
}
```

---

## Next Steps

- [ ] Implement SSE (Server-Sent Events) handler
- [ ] Create SkyFi API client
- [ ] Implement service layer (orders, search, pricing)
- [ ] Add repository layer for data access
- [ ] Create data models
- [ ] Implement credential management
- [ ] Add comprehensive API documentation

---

**Questions?** Open an issue on GitHub or check the [Architecture Documentation](./architecture.md)

