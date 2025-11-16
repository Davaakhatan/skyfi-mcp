import { Router, Request, Response } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { authRateLimiter, defaultRateLimiter } from '../middleware/rateLimit';
import { apiKeyService } from '@services/apiKeyService';
import { credentialManager } from '@auth/credentialManager';
import { ValidationError, NotFoundError } from '@utils/errors';
import { query } from '@config/database';
import { validateEmail, validateExpirationDays, validateUUID } from '@utils/validation';

const router = Router();

/**
 * Generate API Key
 * POST /v1/auth/api-key
 */
router.post(
  '/api-key',
  authRateLimiter,
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      
      // If no user ID, create a new user first
      let finalUserId = userId;
      if (!finalUserId) {
        // Create anonymous user (in production, you'd want proper user creation)
        const email = req.body.email || `user_${Date.now()}@skyfi-mcp.local`;
        if (email && email !== `user_${Date.now()}@skyfi-mcp.local`) {
          validateEmail(email);
        }
        const userResult = await query(
          `INSERT INTO users (email, api_key_hash, is_active)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [email, '', true]
        );
        finalUserId = userResult.rows[0].id;
      }

      // Parse and validate expiration days from request (default: 365 days)
      const expiresInDays = req.body.expiresInDays 
        ? validateExpirationDays(req.body.expiresInDays)
        : 365;

      // Generate API key
      const { apiKey, apiKeyRecord } = await apiKeyService.createApiKey(
        finalUserId,
        expiresInDays
      );

      res.status(201).json({
        message: 'API key generated',
        apiKey, // Only returned once - user must save it
        apiKeyId: apiKeyRecord.id,
        expiresAt: apiKeyRecord.expiresAt?.toISOString() || null,
        createdAt: apiKeyRecord.createdAt.toISOString(),
        warning: 'Save this API key now. It will not be shown again.',
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
 * Validate API Key
 * POST /v1/auth/validate
 */
router.post(
  '/validate',
  authRateLimiter,
  authenticate,
  async (req: Request, res: Response) => {
    res.json({
      valid: true,
      userId: (req as any).userId,
      apiKeyId: (req as any).apiKeyId,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Rotate API Key
 * POST /v1/auth/rotate
 */
router.post(
  '/rotate',
  defaultRateLimiter,
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const apiKeyId = (req as any).apiKeyId;
      const revokeOld = req.body.revokeOld !== false; // Default: true
      const expiresInDays = req.body.expiresInDays 
        ? parseInt(req.body.expiresInDays, 10) 
        : 365;

      if (expiresInDays && (expiresInDays < 1 || expiresInDays > 3650)) {
        throw new ValidationError('expiresInDays must be between 1 and 3650');
      }

      // Rotate API key
      const { apiKey, apiKeyRecord } = await apiKeyService.rotateApiKey(
        userId,
        apiKeyId,
        revokeOld,
        expiresInDays
      );

      res.json({
        message: 'API key rotated',
        apiKey, // Only returned once
        apiKeyId: apiKeyRecord.id,
        expiresAt: apiKeyRecord.expiresAt?.toISOString() || null,
        oldApiKeyRevoked: revokeOld,
        warning: 'Save this API key now. It will not be shown again.',
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
 * List API Keys
 * GET /v1/auth/api-keys
 */
router.get(
  '/api-keys',
  defaultRateLimiter,
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const apiKeys = await apiKeyService.getUserApiKeys(userId);

      res.json({
        apiKeys: apiKeys.map((key) => ({
          id: key.id,
          createdAt: key.createdAt.toISOString(),
          expiresAt: key.expiresAt?.toISOString() || null,
          isActive: key.isActive,
        })),
        total: apiKeys.length,
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Revoke API Key
 * DELETE /v1/auth/api-keys/:id
 */
router.delete(
  '/api-keys/:id',
  defaultRateLimiter,
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const apiKeyId = req.params.id;

      // Validate UUID format
      validateUUID(apiKeyId, 'apiKeyId');

      await apiKeyService.revokeApiKey(apiKeyId, userId);

      res.json({
        message: 'API key revoked successfully',
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
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
 * Store SkyFi API Key (credential)
 * POST /v1/auth/credentials/skyfi
 */
router.post(
  '/credentials/skyfi',
  defaultRateLimiter,
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const skyfiApiKey = req.body.apiKey;

      if (!skyfiApiKey || typeof skyfiApiKey !== 'string') {
        throw new ValidationError('SkyFi API key is required');
      }

      const credentialId = await credentialManager.storeCredential(
        userId,
        'skyfi_api_key',
        skyfiApiKey,
        req.body.metadata
      );

      res.status(201).json({
        message: 'SkyFi API key stored securely',
        credentialId,
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
 * List Credentials
 * GET /v1/auth/credentials
 */
router.get(
  '/credentials',
  defaultRateLimiter,
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const credentials = await credentialManager.listCredentials(userId);

      res.json({
        credentials: credentials.map((cred) => ({
          type: cred.type,
          createdAt: cred.createdAt.toISOString(),
          updatedAt: cred.updatedAt.toISOString(),
        })),
        total: credentials.length,
      });
    } catch (error) {
      throw error;
    }
  }
);

export default router;

