# SkyFi MCP Server

SkyFi Model Context Protocol (MCP) server for AI agent integration with geospatial data services.

## Overview

SkyFi MCP enables AI agents to seamlessly interact with SkyFi's geospatial data services through a comprehensive RESTful API with Server-Sent Events (SSE) support. The server provides:

- **Order Management**: Create, track, and manage geospatial data orders
- **Data Search**: Iterative search and exploration of geospatial data catalogs
- **Pricing & Feasibility**: Check order feasibility and get pricing estimates
- **Monitoring**: Set up Area of Interest (AOI) monitoring with webhook notifications
- **Framework Integration**: Native support for ADK, LangChain, and AI SDK

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- PostgreSQL 15+ (or use Docker Compose)
- Redis 7+ (or use Docker Compose)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd skyfi-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
   - Set `SKYFI_API_KEY` with your SkyFi API key
   - Configure database and Redis URLs
   - Set security keys (JWT_SECRET, API_KEY_ENCRYPTION_KEY)

5. Start services with Docker Compose:
```bash
docker-compose up -d
```

6. Run database migrations (when available):
```bash
npm run migrate
```

7. Start the development server:
```bash
npm run dev
```

The server will be available at `http://localhost:3000`

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check without building

### Project Structure

```
skyfi-mcp/
├── src/
│   ├── server/          # Server setup and routes
│   ├── services/        # Business logic services
│   ├── repositories/    # Data access layer
│   ├── models/          # Data models and types
│   ├── auth/            # Authentication and credentials
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration
│   └── sse/             # Server-Sent Events
├── docs/                 # Documentation
├── tests/                # Test files
├── scripts/              # Utility scripts
└── docker-compose.yml    # Docker Compose configuration
```

## API Documentation

API documentation is available at `/docs/api` when the server is running.

### Base URL

- Development: `http://localhost:3000/v1`
- Production: `https://api.skyfi-mcp.com/v1`

### Authentication

All API requests require an API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

### Example Request

```bash
curl -X GET http://localhost:3000/v1/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Docker

### Build Image

```bash
docker build -t skyfi-mcp .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e SKYFI_API_KEY=your_key \
  -e DATABASE_URL=postgresql://... \
  skyfi-mcp
```

### Docker Compose

Start all services:

```bash
docker-compose up -d
```

Stop all services:

```bash
docker-compose down
```

View logs:

```bash
docker-compose logs -f mcp-server
```

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `SKYFI_API_KEY` - Your SkyFi API key (required)
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT tokens
- `API_KEY_ENCRYPTION_KEY` - Key for encrypting API keys

## Framework Integration

### ADK

See `docs/integration/adk.md` for ADK integration guide.

### LangChain

See `docs/integration/langchain.md` for LangChain integration guide.

### AI SDK

See `docs/integration/ai-sdk.md` for AI SDK integration guide.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue in the repository or contact support@skyfi.com

## Status

🚧 **In Development** - This project is currently in active development. See the [PRD](./PRD.md) and [Architecture Documentation](./docs/architecture.md) for more details.

---

**Version**: 1.0.0  
**Last Updated**: January 2025

