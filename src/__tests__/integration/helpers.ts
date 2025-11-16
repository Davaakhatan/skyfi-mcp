/**
 * Integration test helpers
 * Utilities for setting up and tearing down test data
 */

import { Pool } from 'pg';
import { query } from '@config/database';
import { config } from '@config/index';

let testPool: Pool | null = null;

/**
 * Get a test database connection
 * Uses TEST_DATABASE_URL or port 5433 to avoid conflicts with main postgres
 */
export async function getTestDatabase(): Promise<Pool> {
  if (!testPool) {
    // Use test database URL if available, otherwise use port 5433
    const testDbUrl = config.database.testUrl;
    if (testDbUrl) {
      testPool = new Pool({
        connectionString: testDbUrl,
        max: 5,
      });
    } else {
      testPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.TEST_DB_PORT || '5433', 10), // Use 5433 for tests
        database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'skyfi_mcp_test',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: 5,
      });
    }
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
 * Check if database is available for testing
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
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
  try {
    // Use try-catch to handle cases where database might not be available
    await query('DELETE FROM webhooks').catch(() => {});
    await query('DELETE FROM monitoring').catch(() => {});
    await query('DELETE FROM searches').catch(() => {});
    await query('DELETE FROM orders').catch(() => {});
    await query('DELETE FROM credentials').catch(() => {});
    await query('DELETE FROM api_keys').catch(() => {});
    await query('DELETE FROM users').catch(() => {});
  } catch (error) {
    // Silently fail if database is not available (for CI/CD environments)
    // In actual test runs, database should be available
  }
}

/**
 * Wait for a specified amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

