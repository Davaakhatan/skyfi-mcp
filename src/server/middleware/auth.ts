import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '@utils/errors';
import { logger } from '@utils/logger';

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
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }

    // TODO: Validate API key against database
    // For now, we'll do basic validation
    if (apiKey.length < 10) {
      throw new AuthenticationError('Invalid API key format');
    }

    // Attach API key to request for use in controllers
    (req as any).apiKey = apiKey;
    (req as any).userId = 'user-id-placeholder'; // TODO: Get from database

    logger.debug('Authentication successful', {
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
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = extractApiKey(req);

    if (apiKey) {
      // TODO: Validate API key against database
      (req as any).apiKey = apiKey;
      (req as any).userId = 'user-id-placeholder'; // TODO: Get from database
    }

    next();
  } catch (error) {
    // Continue even if authentication fails for optional auth
    logger.debug('Optional authentication skipped', { error });
    next();
  }
};

