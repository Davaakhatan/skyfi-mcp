import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { defaultRateLimiter, readRateLimiter } from '../middleware/rateLimit';
import { monitoringService } from '@services/monitoringService';
import { MonitoringCreateRequest } from '@models/monitoring';
import { ValidationError } from '@utils/errors';
import { validateUUID, validatePagination } from '@utils/validation';

const router = Router();

/**
 * Create monitoring configuration
 * POST /v1/monitoring
 */
router.post(
  '/',
  authenticate,
  defaultRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const request: MonitoringCreateRequest = req.body;

      const monitoring = await monitoringService.createMonitoring(
        userId,
        request
      );

      res.status(201).json({
        id: monitoring.id,
        aoiData: monitoring.aoiData,
        webhookUrl: monitoring.webhookUrl,
        status: monitoring.status,
        config: monitoring.config,
        createdAt: monitoring.createdAt.toISOString(),
        updatedAt: monitoring.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }
      throw error;
    }
  }
);

/**
 * Get monitoring by ID
 * GET /v1/monitoring/:id
 */
router.get(
  '/:id',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const monitoringId = req.params.id;
      
      // Validate UUID format
      validateUUID(monitoringId, 'monitoringId');

      const monitoring = await monitoringService.getMonitoring(
        monitoringId,
        userId
      );

      res.json({
        id: monitoring.id,
        aoiData: monitoring.aoiData,
        webhookUrl: monitoring.webhookUrl,
        status: monitoring.status,
        config: monitoring.config,
        createdAt: monitoring.createdAt.toISOString(),
        updatedAt: monitoring.updatedAt.toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Get monitoring status
 * GET /v1/monitoring/:id/status
 */
router.get(
  '/:id/status',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const monitoringId = req.params.id;
      
      // Validate UUID format
      validateUUID(monitoringId, 'monitoringId');

      const monitoring = await monitoringService.getMonitoringStatus(
        monitoringId,
        userId
      );

      res.json({
        id: monitoring.id,
        status: monitoring.status,
        updatedAt: monitoring.updatedAt.toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Update monitoring
 * PUT /v1/monitoring/:id
 */
router.put(
  '/:id',
  authenticate,
  defaultRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const monitoringId = req.params.id;
      
      // Validate UUID format
      validateUUID(monitoringId, 'monitoringId');
      const updates: Partial<MonitoringCreateRequest> = req.body;

      const monitoring = await monitoringService.updateMonitoring(
        monitoringId,
        userId,
        updates
      );

      res.json({
        id: monitoring.id,
        aoiData: monitoring.aoiData,
        webhookUrl: monitoring.webhookUrl,
        status: monitoring.status,
        config: monitoring.config,
        updatedAt: monitoring.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }
      throw error;
    }
  }
);

/**
 * Activate monitoring
 * POST /v1/monitoring/:id/activate
 */
router.post(
  '/:id/activate',
  authenticate,
  defaultRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const monitoringId = req.params.id;
      
      // Validate UUID format
      validateUUID(monitoringId, 'monitoringId');

      const monitoring = await monitoringService.activateMonitoring(
        monitoringId,
        userId
      );

      res.json({
        id: monitoring.id,
        status: monitoring.status,
        message: 'Monitoring activated',
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Deactivate monitoring
 * POST /v1/monitoring/:id/deactivate
 */
router.post(
  '/:id/deactivate',
  authenticate,
  defaultRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const monitoringId = req.params.id;
      
      // Validate UUID format
      validateUUID(monitoringId, 'monitoringId');

      const monitoring = await monitoringService.deactivateMonitoring(
        monitoringId,
        userId
      );

      res.json({
        id: monitoring.id,
        status: monitoring.status,
        message: 'Monitoring deactivated',
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Delete monitoring
 * DELETE /v1/monitoring/:id
 */
router.delete(
  '/:id',
  authenticate,
  defaultRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const monitoringId = req.params.id;
      
      // Validate UUID format
      validateUUID(monitoringId, 'monitoringId');

      await monitoringService.deleteMonitoring(monitoringId, userId);

      res.json({
        message: 'Monitoring deleted successfully',
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Get user's monitoring configurations
 * GET /v1/monitoring
 */
router.get(
  '/',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Validate pagination parameters
      validatePagination(limit, offset);

      const monitoring = await monitoringService.getUserMonitoring(
        userId,
        limit,
        offset
      );

      res.json({
        monitoring: monitoring.map((m) => ({
          id: m.id,
          aoiData: m.aoiData,
          webhookUrl: m.webhookUrl,
          status: m.status,
          config: m.config,
          createdAt: m.createdAt.toISOString(),
          updatedAt: m.updatedAt.toISOString(),
        })),
        total: monitoring.length,
        limit,
        offset,
      });
    } catch (error) {
      throw error;
    }
  }
);

export default router;

