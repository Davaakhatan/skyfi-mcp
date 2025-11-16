import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { readRateLimiter } from '../middleware/rateLimit';
import { searchService } from '@services/searchService';
import { SearchQuery } from '@models/search';
import { ValidationError } from '@utils/errors';
import { validateUUID, validatePagination } from '@utils/validation';

const router = Router();

/**
 * Search data catalog
 * POST /v1/search
 */
router.post(
  '/',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const query: SearchQuery = req.body;

      const results = await searchService.searchData(userId, query);

      res.json(results);
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
 * Refine search
 * POST /v1/search/:id/refine
 */
router.post(
  '/:id/refine',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const searchId = req.params.id;
      
      // Validate UUID format
      validateUUID(searchId, 'searchId');
      const refinements: Partial<SearchQuery> = req.body;

      const results = await searchService.refineSearch(
        userId,
        searchId,
        refinements
      );

      res.json(results);
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Get search history
 * GET /v1/search/history
 */
router.get(
  '/history',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const searches = await searchService.getSearchHistory(
        userId,
        limit,
        offset
      );

      res.json({
        searches: searches.map((search) => ({
          id: search.id,
          query: search.query,
          results: search.results,
          context: search.context,
          createdAt: search.createdAt.toISOString(),
        })),
        total: searches.length,
        limit,
        offset,
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Get search context
 * GET /v1/search/:id
 */
router.get(
  '/:id',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const searchId = req.params.id;
      
      // Validate UUID format
      validateUUID(searchId, 'searchId');

      const search = await searchService.getSearchContext(searchId, userId);

      res.json({
        id: search.id,
        query: search.query,
        results: search.results,
        context: search.context,
        createdAt: search.createdAt.toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }
);

export default router;

