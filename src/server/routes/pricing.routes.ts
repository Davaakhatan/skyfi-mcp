import { Router, Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth';
import { readRateLimiter } from '../middleware/rateLimit';
import { pricingService } from '@services/pricingService';
import { PricingRequest } from '@models/pricing';
import { ValidationError } from '@utils/errors';

const router = Router();

/**
 * Estimate price
 * POST /v1/pricing/estimate
 */
router.post(
  '/estimate',
  optionalAuth,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const request: PricingRequest = req.body;

      const estimate = await pricingService.estimatePrice(request);

      res.json(estimate);
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
 * Check feasibility
 * POST /v1/pricing/feasibility
 */
router.post(
  '/feasibility',
  optionalAuth,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const request: PricingRequest = req.body;

      const feasibility = await pricingService.checkFeasibility(request);

      res.json(feasibility);
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
 * Compare pricing
 * POST /v1/pricing/compare
 */
router.post(
  '/compare',
  optionalAuth,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const requests: PricingRequest[] = req.body.requests || req.body;

      if (!Array.isArray(requests)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Requests must be an array',
          },
        });
        return;
      }

      const estimates = await pricingService.comparePricing(requests);

      res.json({
        estimates,
        count: estimates.length,
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

export default router;

