import { apiKeyService } from './apiKeyService';
import { query } from '@config/database';
import { NotFoundError, DatabaseError } from '@utils/errors';

// Mock database
jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('ApiKeyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate an API key with correct prefix', () => {
      const apiKey = apiKeyService.generateApiKey();
      
      expect(apiKey).toMatch(/^skf_/);
      expect(apiKey.length).toBeGreaterThan(10);
    });

    it('should generate unique API keys', () => {
      const key1 = apiKeyService.generateApiKey();
      const key2 = apiKeyService.generateApiKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('should generate consistent hash for same key', () => {
      const apiKey = 'skf_test123456789';
      const hash1 = apiKeyService.hashApiKey(apiKey);
      const hash2 = apiKeyService.hashApiKey(apiKey);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string
    });

    it('should generate different hashes for different keys', () => {
      const hash1 = apiKeyService.hashApiKey('skf_key1');
      const hash2 = apiKeyService.hashApiKey('skf_key2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyApiKey', () => {
    it('should verify correct API key', () => {
      const apiKey = 'skf_test123456789';
      const hash = apiKeyService.hashApiKey(apiKey);
      
      const isValid = apiKeyService.verifyApiKey(apiKey, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect API key', () => {
      const apiKey = 'skf_test123456789';
      const wrongKey = 'skf_wrong12345678';
      const hash = apiKeyService.hashApiKey(apiKey);
      
      const isValid = apiKeyService.verifyApiKey(wrongKey, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('createApiKey', () => {
    it('should create an API key successfully', async () => {
      const userId = 'user-123';
      const mockResult = {
        rows: [{
          id: 'key-123',
          user_id: userId,
          key_hash: 'hashed-key',
          created_at: new Date(),
          expires_at: null,
          is_active: true,
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      const result = await apiKeyService.createApiKey(userId);

      expect(result.apiKey).toMatch(/^skf_/);
      expect(result.apiKeyRecord.userId).toBe(userId);
      expect(result.apiKeyRecord.isActive).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_keys'),
        expect.arrayContaining([userId, expect.any(String), null, true])
      );
    });

    it('should create API key with expiration', async () => {
      const userId = 'user-123';
      const expiresInDays = 30;
      const mockResult = {
        rows: [{
          id: 'key-123',
          user_id: userId,
          key_hash: 'hashed-key',
          created_at: new Date(),
          expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
          is_active: true,
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      const result = await apiKeyService.createApiKey(userId, expiresInDays);

      expect(result.apiKeyRecord.expiresAt).toBeDefined();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_keys'),
        expect.arrayContaining([userId, expect.any(String), expect.any(Date), true])
      );
    });

    it('should throw DatabaseError on database failure', async () => {
      const userId = 'user-123';
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(apiKeyService.createApiKey(userId)).rejects.toThrow(DatabaseError);
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', async () => {
      const apiKey = apiKeyService.generateApiKey();
      const keyHash = apiKeyService.hashApiKey(apiKey);
      const userId = 'user-123';
      const apiKeyId = 'key-123';

      const mockResult = {
        rows: [{
          id: apiKeyId,
          user_id: userId,
          key_hash: keyHash,
          expires_at: null,
          is_active: true,
          user_active: true,
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      const updateResult = {
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      };

      mockQuery
        .mockResolvedValueOnce(mockResult as any) // validateApiKey query
        .mockResolvedValueOnce(updateResult as any); // updateLastUsed query

      const result = await apiKeyService.validateApiKey(apiKey);

      expect(result).toEqual({
        userId,
        apiKeyId,
      });
    });

    it('should return null for invalid API key', async () => {
      const apiKey = 'skf_invalid123456';
      mockQuery.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await apiKeyService.validateApiKey(apiKey);

      expect(result).toBeNull();
    });

    it('should return null for expired API key', async () => {
      const apiKey = apiKeyService.generateApiKey();

      // Expired keys are filtered in SQL, so no rows should be returned
      const mockResult = {
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      const result = await apiKeyService.validateApiKey(apiKey);

      // Should return null because expired keys are filtered in SQL
      expect(result).toBeNull();
    });

    it('should throw DatabaseError on database failure', async () => {
      const apiKey = 'skf_test123456789';
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(apiKeyService.validateApiKey(apiKey)).rejects.toThrow(DatabaseError);
    });
  });

  describe('rotateApiKey', () => {
    it('should rotate API key and revoke old one', async () => {
      const userId = 'user-123';
      const oldApiKeyId = 'key-123';
      const newApiKeyId = 'key-456';

      const createResult = {
        rows: [{
          id: newApiKeyId,
          user_id: userId,
          key_hash: 'new-hash',
          created_at: new Date(),
          expires_at: null,
          is_active: true,
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };

      const revokeResult = {
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      };

      mockQuery
        .mockResolvedValueOnce(createResult as any) // createApiKey
        .mockResolvedValueOnce(revokeResult as any); // revokeApiKey

      const result = await apiKeyService.rotateApiKey(userId, oldApiKeyId, true);

      expect(result.apiKey).toMatch(/^skf_/);
      expect(result.apiKeyRecord.id).toBe(newApiKeyId);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should rotate API key without revoking old one', async () => {
      const userId = 'user-123';
      const oldApiKeyId = 'key-123';

      const createResult = {
        rows: [{
          id: 'key-456',
          user_id: userId,
          key_hash: 'new-hash',
          created_at: new Date(),
          expires_at: null,
          is_active: true,
        }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(createResult as any);

      const result = await apiKeyService.rotateApiKey(userId, oldApiKeyId, false);

      expect(result.apiKey).toMatch(/^skf_/);
      expect(mockQuery).toHaveBeenCalledTimes(1); // Only create, no revoke
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key successfully', async () => {
      const apiKeyId = 'key-123';
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await apiKeyService.revokeApiKey(apiKeyId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE api_keys SET is_active = false'),
        [apiKeyId, userId]
      );
    });

    it('should throw NotFoundError when API key not found', async () => {
      const apiKeyId = 'key-123';
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      await expect(apiKeyService.revokeApiKey(apiKeyId, userId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUserApiKeys', () => {
    it('should return user API keys', async () => {
      const userId = 'user-123';
      const mockResult = {
        rows: [
          {
            id: 'key-1',
            user_id: userId,
            key_hash: 'hash1',
            created_at: new Date('2024-01-01'),
            expires_at: null,
            is_active: true,
            last_used_at: null,
          },
          {
            id: 'key-2',
            user_id: userId,
            key_hash: 'hash2',
            created_at: new Date('2024-01-02'),
            expires_at: new Date('2025-01-02'),
            is_active: false,
            last_used_at: new Date('2024-01-15'),
          },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      const result = await apiKeyService.getUserApiKeys(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('key-1');
      expect(result[0].isActive).toBe(true);
      expect(result[1].id).toBe('key-2');
      expect(result[1].isActive).toBe(false);
      expect(result[1].expiresAt).toBeDefined();
    });
  });

  describe('cleanupExpiredKeys', () => {
    it('should cleanup expired keys', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 5,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      } as any);

      const count = await apiKeyService.cleanupExpiredKeys();

      expect(count).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE api_keys'),
        []
      );
    });
  });
});

