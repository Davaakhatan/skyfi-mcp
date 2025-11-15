import crypto from 'crypto';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { query } from '@config/database';
import { DatabaseError } from '@utils/errors';
import { Credential } from '@models/user';

/**
 * Credential Manager
 * Handles secure storage and retrieval of credentials (SkyFi API keys, OAuth tokens, etc.)
 */
export class CredentialManager {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits

  /**
   * Get encryption key from config
   */
  private getEncryptionKey(): Buffer {
    const key = config.auth.apiKeyEncryptionKey;
    
    if (!key || key.length < 32) {
      throw new Error('API_KEY_ENCRYPTION_KEY must be at least 32 characters');
    }

    // Use first 32 bytes of the key
    return Buffer.from(key.substring(0, 32), 'utf-8');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine IV, tag, and encrypted data
      const combined = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
      
      return combined;
    } catch (error) {
      logger.error('Failed to encrypt data', { error });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedData.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, tagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt data', { error });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Store credential for a user
   */
  async storeCredential(
    userId: string,
    credentialType: 'skyfi_api_key' | 'oauth_token' | 'custom',
    credentialValue: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    try {
      // Encrypt the credential
      const encrypted = this.encrypt(credentialValue);

      // Store in database
      const result = await query(
        `INSERT INTO credentials (user_id, credential_type, encrypted_value, metadata)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, credential_type) 
         DO UPDATE SET encrypted_value = $3, metadata = $4, updated_at = NOW()
         RETURNING id`,
        [userId, credentialType, encrypted, metadata ? JSON.stringify(metadata) : null]
      );

      logger.info('Credential stored', {
        userId,
        credentialType,
        credentialId: result.rows[0].id,
      });

      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to store credential', { error, userId, credentialType });
      throw new DatabaseError('Failed to store credential', { error });
    }
  }

  /**
   * Retrieve credential for a user
   */
  async getCredential(
    userId: string,
    credentialType: 'skyfi_api_key' | 'oauth_token' | 'custom'
  ): Promise<Credential | null> {
    try {
      const result = await query(
        `SELECT id, encrypted_value, metadata, created_at, updated_at
         FROM credentials
         WHERE user_id = $1 AND credential_type = $2
         LIMIT 1`,
        [userId, credentialType]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Decrypt the credential
      const decrypted = this.decrypt(row.encrypted_value);

      return {
        userId,
        apiKey: decrypted,
        encrypted: true,
      };
    } catch (error) {
      logger.error('Failed to get credential', { error, userId, credentialType });
      throw new DatabaseError('Failed to get credential', { error });
    }
  }

  /**
   * Delete credential for a user
   */
  async deleteCredential(
    userId: string,
    credentialType: 'skyfi_api_key' | 'oauth_token' | 'custom'
  ): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM credentials WHERE user_id = $1 AND credential_type = $2',
        [userId, credentialType]
      );

      if (result.rowCount === 0) {
        logger.warn('Credential not found for deletion', { userId, credentialType });
      } else {
        logger.info('Credential deleted', { userId, credentialType });
      }
    } catch (error) {
      logger.error('Failed to delete credential', { error, userId, credentialType });
      throw new DatabaseError('Failed to delete credential', { error });
    }
  }

  /**
   * List all credentials for a user
   */
  async listCredentials(userId: string): Promise<Array<{ type: string; createdAt: Date; updatedAt: Date }>> {
    try {
      const result = await query(
        `SELECT credential_type, created_at, updated_at
         FROM credentials
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows.map((row) => ({
        type: row.credential_type,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error) {
      logger.error('Failed to list credentials', { error, userId });
      throw new DatabaseError('Failed to list credentials', { error });
    }
  }
}

export const credentialManager = new CredentialManager();

