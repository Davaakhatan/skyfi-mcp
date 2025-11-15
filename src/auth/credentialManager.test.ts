import { credentialManager } from './credentialManager';
import { query } from '@config/database';
import { DatabaseError } from '@utils/errors';

// Mock database
jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

// Mock config
jest.mock('@config/index', () => ({
  config: {
    auth: {
      apiKeyEncryptionKey: 'test-encryption-key-must-be-32-chars-minimum',
    },
  },
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('CredentialManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive-api-key-12345';
      
      const encrypted = credentialManager.encrypt(originalData);
      const decrypted = credentialManager.decrypt(encrypted);
      
      expect(encrypted).not.toBe(originalData);
      expect(encrypted).toContain(':'); // IV:tag:encrypted format
      expect(decrypted).toBe(originalData);
    });

    it('should produce different encrypted values for same input', () => {
      const data = 'same-data';
      
      const encrypted1 = credentialManager.encrypt(data);
      const encrypted2 = credentialManager.encrypt(data);
      
      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to same value
      expect(credentialManager.decrypt(encrypted1)).toBe(data);
      expect(credentialManager.decrypt(encrypted2)).toBe(data);
    });

    it('should throw error when decrypting invalid data', () => {
      expect(() => {
        credentialManager.decrypt('invalid-format');
      }).toThrow('Invalid encrypted data format');
    });
  });

  describe('storeCredential', () => {
    it('should store credential successfully', async () => {
      const userId = 'user-123';
      const credentialType = 'skyfi_api_key';
      const credentialValue = 'skyfi-key-12345';
      const metadata = { source: 'manual' };

      const mockResult = {
        rows: [{ id: 'cred-123' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      const credentialId = await credentialManager.storeCredential(
        userId,
        credentialType,
        credentialValue,
        metadata
      );

      expect(credentialId).toBe('cred-123');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO credentials'),
        expect.arrayContaining([
          userId,
          credentialType,
          expect.any(String), // encrypted value
          expect.any(String), // metadata JSON
        ])
      );
    });

    it('should update existing credential on conflict', async () => {
      const userId = 'user-123';
      const credentialType = 'skyfi_api_key';
      const credentialValue = 'new-key-12345';

      const mockResult = {
        rows: [{ id: 'cred-123' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      await credentialManager.storeCredential(
        userId,
        credentialType,
        credentialValue
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });

    it('should throw DatabaseError on database failure', async () => {
      const userId = 'user-123';
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        credentialManager.storeCredential(
          userId,
          'skyfi_api_key',
          'key-123'
        )
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('getCredential', () => {
    it('should retrieve and decrypt credential', async () => {
      const userId = 'user-123';
      const credentialType = 'skyfi_api_key';
      const originalValue = 'skyfi-key-12345';
      const encrypted = credentialManager.encrypt(originalValue);

      const mockResult = {
        rows: [{
          id: 'cred-123',
          encrypted_value: encrypted,
          metadata: JSON.stringify({ source: 'manual' }),
          created_at: new Date(),
          updated_at: new Date(),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      const credential = await credentialManager.getCredential(userId, credentialType);

      expect(credential).not.toBeNull();
      expect(credential?.apiKey).toBe(originalValue);
      expect(credential?.encrypted).toBe(true);
      expect(credential?.userId).toBe(userId);
    });

    it('should return null when credential not found', async () => {
      const userId = 'user-123';
      mockQuery.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const credential = await credentialManager.getCredential(
        userId,
        'skyfi_api_key'
      );

      expect(credential).toBeNull();
    });
  });

  describe('deleteCredential', () => {
    it('should delete credential successfully', async () => {
      const userId = 'user-123';
      const credentialType = 'skyfi_api_key';

      mockQuery.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as any);

      await credentialManager.deleteCredential(userId, credentialType);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM credentials'),
        [userId, credentialType]
      );
    });

    it('should not throw when credential not found', async () => {
      const userId = 'user-123';
      mockQuery.mockResolvedValueOnce({ 
        rows: [],
        rowCount: 0,
        command: 'DELETE',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        credentialManager.deleteCredential(userId, 'skyfi_api_key')
      ).resolves.not.toThrow();
    });
  });

  describe('listCredentials', () => {
    it('should list all credentials for user', async () => {
      const userId = 'user-123';
      const mockResult = {
        rows: [
          {
            credential_type: 'skyfi_api_key',
            created_at: new Date('2024-01-01'),
            updated_at: new Date('2024-01-01'),
          },
          {
            credential_type: 'oauth_token',
            created_at: new Date('2024-01-02'),
            updated_at: new Date('2024-01-02'),
          },
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };

      mockQuery.mockResolvedValueOnce(mockResult as any);

      const credentials = await credentialManager.listCredentials(userId);

      expect(credentials).toHaveLength(2);
      expect(credentials[0].type).toBe('skyfi_api_key');
      expect(credentials[1].type).toBe('oauth_token');
    });
  });
});

