import crypto from 'crypto';
import { query } from '@config/database';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { NotFoundError, ValidationError, DatabaseError } from '@utils/errors';
import { ApiKey } from '@models/user';

/**
 * API Key Service
 * Handles API key generation, validation, and rotation
 */
export class ApiKeyService {
  private readonly keyPrefix = 'skf_';
  private readonly keyLength = 32; // Random part length
  private readonly hashAlgorithm = 'sha256';

  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    // Generate random bytes
    const randomBytes = crypto.randomBytes(this.keyLength);
    const randomPart = randomBytes.toString('base64url').substring(0, this.keyLength);
    
    // Combine prefix with random part
    const apiKey = `${this.keyPrefix}${randomPart}`;
    
    return apiKey;
  }

  /**
   * Hash an API key for storage
   */
  hashApiKey(apiKey: string): string {
    const hash = crypto
      .createHash(this.hashAlgorithm)
      .update(apiKey)
      .digest('hex');
    
    return hash;
  }

  /**
   * Verify an API key against a hash
   */
  verifyApiKey(apiKey: string, hash: string): boolean {
    const computedHash = this.hashApiKey(apiKey);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(hash)
    );
  }

  /**
   * Create a new API key for a user
   */
  async createApiKey(
    userId: string,
    expiresInDays?: number
  ): Promise<{ apiKey: string; apiKeyRecord: ApiKey }> {
    try {
      // Generate new API key
      const apiKey = this.generateApiKey();
      const keyHash = this.hashApiKey(apiKey);

      // Calculate expiration date
      let expiresAt: Date | null = null;
      if (expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }

      // Store in database
      const result = await query(
        `INSERT INTO api_keys (user_id, key_hash, expires_at, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, keyHash, expiresAt, true]
      );

      const apiKeyRecord: ApiKey = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        keyHash: result.rows[0].key_hash,
        createdAt: new Date(result.rows[0].created_at),
        expiresAt: result.rows[0].expires_at ? new Date(result.rows[0].expires_at) : undefined,
        isActive: result.rows[0].is_active,
      };

      logger.info('API key created', {
        userId,
        apiKeyId: apiKeyRecord.id,
        expiresAt: apiKeyRecord.expiresAt?.toISOString(),
      });

      return { apiKey, apiKeyRecord };
    } catch (error) {
      logger.error('Failed to create API key', { error, userId });
      throw new DatabaseError('Failed to create API key', { error });
    }
  }

  /**
   * Validate an API key and return user information
   */
  async validateApiKey(apiKey: string): Promise<{ userId: string; apiKeyId: string } | null> {
    try {
      // Get all active API keys for the user (we'll verify the hash)
      // This approach allows us to use timing-safe comparison
      const result = await query(
        `SELECT ak.id, ak.user_id, ak.key_hash, ak.expires_at, ak.is_active, u.is_active as user_active
         FROM api_keys ak
         JOIN users u ON ak.user_id = u.id
         WHERE ak.is_active = true
         AND u.is_active = true
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
        []
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Compute hash of provided API key
      const providedHash = this.hashApiKey(apiKey);

      // Find matching key using timing-safe comparison
      for (const row of result.rows) {
        if (this.verifyApiKey(apiKey, row.key_hash)) {
          // Update last used timestamp (async, don't block)
          this.updateLastUsed(row.id).catch((error) => {
            logger.warn('Failed to update API key last used', { error, apiKeyId: row.id });
          });

          return {
            userId: row.user_id,
            apiKeyId: row.id,
          };
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to validate API key', { error });
      throw new DatabaseError('Failed to validate API key', { error });
    }
  }

  /**
   * Rotate an API key (create new, optionally revoke old)
   */
  async rotateApiKey(
    userId: string,
    oldApiKeyId?: string,
    revokeOld = true,
    expiresInDays?: number
  ): Promise<{ apiKey: string; apiKeyRecord: ApiKey }> {
    try {
      // Create new API key
      const { apiKey, apiKeyRecord } = await this.createApiKey(userId, expiresInDays);

      // Revoke old API key if specified
      if (revokeOld && oldApiKeyId) {
        await this.revokeApiKey(oldApiKeyId, userId);
      }

      logger.info('API key rotated', {
        userId,
        newApiKeyId: apiKeyRecord.id,
        oldApiKeyId,
        revoked: revokeOld,
      });

      return { apiKey, apiKeyRecord };
    } catch (error) {
      logger.error('Failed to rotate API key', { error, userId });
      throw error;
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(apiKeyId: string, userId: string): Promise<void> {
    try {
      const result = await query(
        'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2',
        [apiKeyId, userId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('API key');
      }

      logger.info('API key revoked', { apiKeyId, userId });
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to revoke API key', { error, apiKeyId });
      throw new DatabaseError('Failed to revoke API key', { error });
    }
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const result = await query(
        `SELECT id, user_id, key_hash, created_at, expires_at, is_active, last_used_at
         FROM api_keys
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        keyHash: row.key_hash,
        createdAt: new Date(row.created_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        isActive: row.is_active,
      }));
    } catch (error) {
      logger.error('Failed to get user API keys', { error, userId });
      throw new DatabaseError('Failed to get user API keys', { error });
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    try {
      await query(
        'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
        [apiKeyId]
      );
    } catch (error) {
      // Don't throw - this is a non-critical operation
      logger.debug('Failed to update last used', { error, apiKeyId });
    }
  }

  /**
   * Clean up expired API keys (should be run periodically)
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await query(
        `UPDATE api_keys 
         SET is_active = false 
         WHERE expires_at IS NOT NULL 
         AND expires_at < NOW() 
         AND is_active = true`,
        []
      );

      logger.info('Cleaned up expired API keys', { count: result.rowCount || 0 });
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup expired API keys', { error });
      throw new DatabaseError('Failed to cleanup expired API keys', { error });
    }
  }
}

export const apiKeyService = new ApiKeyService();

