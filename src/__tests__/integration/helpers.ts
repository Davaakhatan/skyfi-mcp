/**
 * Integration test helpers
 * Utilities for setting up and tearing down test data
 */

import { Pool } from 'pg';
import { query } from '@config/database';

let testPool: Pool | null = null;

/**
 * Get a test database connection
 */
export async function getTestDatabase(): Promise<Pool> {
  if (!testPool) {
    testPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'skyfi_mcp_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 5,
    });
  }
  return testPool;
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Create a test user
 */
export async function createTestUser(email?: string): Promise<string> {
  const userEmail = email || `test_${Date.now()}@test.com`;
  const result = await query(
    `INSERT INTO users (email, is_active)
     VALUES ($1, $2)
     RETURNING id`,
    [userEmail, true]
  );
  return result.rows[0].id;
}

/**
 * Delete a test user and all associated data
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await query('DELETE FROM users WHERE id = $1', [userId]);
}

/**
 * Create a test API key
 */
export async function createTestApiKey(
  userId: string,
  expiresInDays = 365
): Promise<{ apiKey: string; apiKeyId: string }> {
  const { apiKeyService } = await import('@services/apiKeyService');
  const { apiKey, apiKeyRecord } = await apiKeyService.createApiKey(userId, expiresInDays);
  return { apiKey, apiKeyId: apiKeyRecord.id };
}

/**
 * Clean up all test data
 */
export async function cleanupAllTestData(): Promise<void> {
  await query('DELETE FROM webhooks');
  await query('DELETE FROM monitoring');
  await query('DELETE FROM searches');
  await query('DELETE FROM orders');
  await query('DELETE FROM credentials');
  await query('DELETE FROM api_keys');
  await query('DELETE FROM users');
}

/**
 * Wait for a specified amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

