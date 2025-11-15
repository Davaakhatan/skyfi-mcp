import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { AppError } from '@utils/errors';

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.security.allowedOrigins,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'skyfi-mcp',
    version: '1.0.0',
  });
});

// API routes (to be implemented)
app.get(`/${config.apiVersion}`, (req: Request, res: Response) => {
  res.json({
    message: 'SkyFi MCP API',
    version: config.apiVersion,
    documentation: '/docs',
  });
});

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      path: req.path,
    },
  });
});

// Error handling middleware
app.use(
  (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Error occurred', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
          details: err.details,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown',
        },
      });
    }

    // Default error response
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: config.nodeEnv === 'production' 
          ? 'Internal server error' 
          : err.message,
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown',
      },
    });
  }
);

// Start server
const startServer = () => {
  app.listen(config.port, () => {
    logger.info(`SkyFi MCP Server started`, {
      port: config.port,
      environment: config.nodeEnv,
      apiVersion: config.apiVersion,
    });
  });
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
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export default app;

