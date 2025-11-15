import { Router, Request, Response } from 'express';
import { config } from '@config/index';
import { authenticate } from '../middleware/auth';
import { defaultRateLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * API Root endpoint
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'SkyFi MCP API',
    version: config.apiVersion,
    documentation: '/docs',
    endpoints: {
      health: '/health',
      auth: `/${config.apiVersion}/auth`,
      orders: `/${config.apiVersion}/orders`,
      search: `/${config.apiVersion}/search`,
      pricing: `/${config.apiVersion}/pricing`,
      monitoring: `/${config.apiVersion}/monitoring`,
    },
  });
});

/**
 * Health check endpoint (public)
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'skyfi-mcp',
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

/**
 * Protected test endpoint
 */
router.get('/test', authenticate, defaultRateLimiter, (req: Request, res: Response) => {
  res.json({
    message: 'Authentication successful',
    userId: (req as any).userId,
    timestamp: new Date().toISOString(),
  });
});

export default router;

