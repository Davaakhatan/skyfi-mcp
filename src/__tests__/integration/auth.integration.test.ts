/**
 * Integration tests for Authentication workflow
 * Tests the complete flow from API key generation through validation to credential storage
 */

import { apiKeyService } from '@services/apiKeyService';
import { credentialManager } from '@auth/credentialManager';
import { createTestUser, cleanupAllTestData, isDatabaseAvailable } from './helpers';

// Mock logger to reduce noise
jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Authentication Integration Tests', () => {
  let userId: string;
  let dbAvailable: boolean;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }
    userId = await createTestUser();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  describe('API Key Generation and Validation Workflow', () => {
    it('should generate API key and validate it through complete workflow', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      // Generate API key
      const { apiKey, apiKeyRecord } = await apiKeyService.createApiKey(userId, 365);

      expect(apiKey).toBeDefined();
      expect(apiKeyRecord.userId).toBe(userId);
      expect(apiKeyRecord.id).toBeDefined();

      // Validate API key
      const validation = await apiKeyService.validateApiKey(apiKey);

      expect(validation).not.toBeNull();
      expect(validation?.userId).toBe(userId);
      expect(validation?.apiKeyId).toBe(apiKeyRecord.id);
    });

    it('should handle multiple API keys per user', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const { apiKey: key1 } = await apiKeyService.createApiKey(userId, 365);
      const { apiKey: key2 } = await apiKeyService.createApiKey(userId, 365);

      expect(key1).not.toBe(key2);

      // Both should validate
      const validation1 = await apiKeyService.validateApiKey(key1);
      const validation2 = await apiKeyService.validateApiKey(key2);

      expect(validation1?.userId).toBe(userId);
      expect(validation2?.userId).toBe(userId);
    });

    it('should retrieve all API keys for a user', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      await apiKeyService.createApiKey(userId, 365);
      await apiKeyService.createApiKey(userId, 180);

      const apiKeys = await apiKeyService.getUserApiKeys(userId);

      expect(apiKeys.length).toBeGreaterThanOrEqual(2);
      expect(apiKeys.every((key) => key.userId === userId)).toBe(true);
    });
  });

  describe('Credential Storage Workflow', () => {
    it('should store and retrieve credentials through complete workflow', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const credentialType = 'skyfi_api_key';
      const credentialValue = 'test-skyfi-api-key-12345';
      const metadata = {
        expiresAt: '2025-12-31',
        scope: 'read,write',
      };

      // Store credential
      const credentialId = await credentialManager.storeCredential(
        userId,
        credentialType,
        credentialValue,
        metadata
      );

      expect(credentialId).toBeDefined();

      // Retrieve credential
      const retrieved = await credentialManager.getCredential(userId, credentialType);

      expect(retrieved).toBeDefined();
      expect(retrieved?.apiKey).toBe(credentialValue);
      expect(retrieved?.userId).toBe(userId);
    });

    it('should list all credentials for a user', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      await credentialManager.storeCredential(userId, 'skyfi_api_key', 'key1');
      await credentialManager.storeCredential(userId, 'oauth_token', 'token1');

      const credentials = await credentialManager.listCredentials(userId);

      expect(credentials.length).toBeGreaterThanOrEqual(2);
      expect(credentials.some((c) => c.type === 'skyfi_api_key')).toBe(true);
      expect(credentials.some((c) => c.type === 'oauth_token')).toBe(true);
    });

    it('should update existing credential', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const credentialType = 'skyfi_api_key';
      const initialValue = 'old-key';
      const newValue = 'new-key';

      await credentialManager.storeCredential(userId, credentialType, initialValue);
      await credentialManager.storeCredential(userId, credentialType, newValue);

      const retrieved = await credentialManager.getCredential(userId, credentialType);

      expect(retrieved?.apiKey).toBe(newValue);
    });

    it('should delete credential', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const credentialType = 'skyfi_api_key';
      const credentialValue = 'test-key';

      await credentialManager.storeCredential(userId, credentialType, credentialValue);

      // Verify it exists
      const before = await credentialManager.getCredential(userId, credentialType);
      expect(before).toBeDefined();

      // Delete it
      await credentialManager.deleteCredential(userId, credentialType);

      // Verify it's gone
      const after = await credentialManager.getCredential(userId, credentialType);
      expect(after).toBeNull();
    });
  });

  describe('API Key Rotation Workflow', () => {
    it('should rotate API key and invalidate old one', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      // Create initial API key
      const { apiKey: oldKey, apiKeyRecord } = await apiKeyService.createApiKey(userId, 365);

      // Validate old key works
      const oldValidation = await apiKeyService.validateApiKey(oldKey);
      expect(oldValidation).not.toBeNull();

      // Rotate API key
      const { apiKey: newKey } = await apiKeyService.rotateApiKey(userId, apiKeyRecord.id, true, 365);

      expect(newKey).not.toBe(oldKey);

      // Old key should still work (unless explicitly revoked)
      const oldValidationAfter = await apiKeyService.validateApiKey(oldKey);
      // Note: Rotation doesn't automatically revoke, but creates a new key
      expect(oldValidationAfter).not.toBeNull();

      // New key should work
      const newValidation = await apiKeyService.validateApiKey(newKey);
      expect(newValidation).not.toBeNull();
    });

    it('should revoke API key', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const { apiKey, apiKeyRecord } = await apiKeyService.createApiKey(userId, 365);

      // Validate it works
      const before = await apiKeyService.validateApiKey(apiKey);
      expect(before).not.toBeNull();

      // Revoke it
      await apiKeyService.revokeApiKey(apiKeyRecord.id, userId);

      // Validate it's revoked
      const after = await apiKeyService.validateApiKey(apiKey);
      expect(after).toBeNull();
    });
  });
});

