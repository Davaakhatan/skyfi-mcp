import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { AppError } from '@utils/errors';
import { requestIdMiddleware, errorHandler, notFoundHandler } from './middleware/errorHandler';
import { defaultRateLimiter } from './middleware/rateLimit';
import apiRoutes from './routes/index';
import authRoutes from './routes/auth.routes';
import sseRoutes from './routes/sse.routes';
import { testConnection, closePool } from '@config/database';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.security.allowedOrigins,
    credentials: true,
  })
);

// Request ID middleware (must be early in the chain)
app.use(requestIdMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    requestId: req.headers['x-request-id'],
  });
  next();
});

// Apply default rate limiting to all routes
app.use(defaultRateLimiter);

// Health check endpoint (public, no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'skyfi-mcp',
    version: '1.0.0',
  });
});

// API routes
app.use(`/${config.apiVersion}`, apiRoutes);
app.use(`/${config.apiVersion}/auth`, authRoutes);
app.use(`/${config.apiVersion}/events`, sseRoutes);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection (non-blocking)
    if (config.nodeEnv !== 'test') {
      testConnection().catch((error) => {
        logger.warn('Database connection test failed - server will start anyway', {
          error: error.message,
          hint: 'Make sure PostgreSQL is running and database exists',
        });
      });
    }

    const server = app.listen(config.port, () => {
      logger.info(`SkyFi MCP Server started`, {
        port: config.port,
        environment: config.nodeEnv,
        apiVersion: config.apiVersion,
      });
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`, {
          port: config.port,
          hint: 'Another process is using this port. Kill it with: lsof -ti:3000 | xargs kill -9',
        });
      } else {
        logger.error('Server error', { error: error.message });
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  try {
    await closePool();
    logger.info('Server shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start the server
if (require.main === module) {
  startServer();
}

export default app;

