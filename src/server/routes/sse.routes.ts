import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { sseMiddleware, createSSEConnection } from '../../sse/sseHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * SSE endpoint for order updates
 * GET /v1/events/orders/:orderId
 */
router.get(
  '/orders/:orderId',
  authenticate,
  sseMiddleware,
  (req: Request, res: Response) => {
    const orderId = req.params.orderId;
    const connectionId = `order:${orderId}:${uuidv4()}`;
    
    createSSEConnection(req, res, connectionId);
  }
);

/**
 * SSE endpoint for monitoring updates
 * GET /v1/events/monitoring/:monitoringId
 */
router.get(
  '/monitoring/:monitoringId',
  authenticate,
  sseMiddleware,
  (req: Request, res: Response) => {
    const monitoringId = req.params.monitoringId;
    const connectionId = `monitoring:${monitoringId}:${uuidv4()}`;
    
    createSSEConnection(req, res, connectionId);
  }
);

/**
 * SSE endpoint for general events
 * GET /v1/events
 */
router.get(
  '/',
  authenticate,
  sseMiddleware,
  (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const connectionId = `user:${userId}:${uuidv4()}`;
    
    createSSEConnection(req, res, connectionId);
  }
);

export default router;

