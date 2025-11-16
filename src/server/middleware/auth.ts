import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '@utils/errors';
import { logger } from '@utils/logger';
import { apiKeyService } from '@services/apiKeyService';

/**
 * Extract API key from request headers
 */
const extractApiKey = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and "ApiKey <key>" formats
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;
  if (scheme === 'Bearer' || scheme === 'ApiKey') {
    return token;
  }

  return null;
};

/**
 * Authentication middleware
 * Validates API key from Authorization header
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }

    // Basic format validation
    if (apiKey.length < 10) {
      throw new AuthenticationError('Invalid API key format');
    }

    // Validate API key against database
    const validation = await apiKeyService.validateApiKey(apiKey);
    
    if (!validation) {
      throw new AuthenticationError('Invalid or expired API key');
    }

    // Attach user info to request
    (req as any).apiKey = apiKey;
    (req as any).userId = validation.userId;
    (req as any).apiKeyId = validation.apiKeyId;

    logger.debug('Authentication successful', {
      userId: validation.userId,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      path: req.path,
    });

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      logger.error('Authentication error', { error });
      next(new AuthenticationError('Authentication failed'));
    }
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if API key is present, but doesn't fail if missing
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = extractApiKey(req);

    if (apiKey) {
      // Validate API key against database
      const validation = await apiKeyService.validateApiKey(apiKey);
      
      if (validation) {
        (req as any).apiKey = apiKey;
        (req as any).userId = validation.userId;
        (req as any).apiKeyId = validation.apiKeyId;
      }
    }

    next();
  } catch (error) {
    // Continue even if authentication fails for optional auth
    logger.debug('Optional authentication skipped', { error });
    next();
  }
};

