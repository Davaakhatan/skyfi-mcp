import { Pool, PoolConfig } from 'pg';
import { config } from './index';
import { logger } from '@utils/logger';
import { DatabaseError } from '@utils/errors';

/**
 * Database connection pool configuration
 */
const poolConfig: PoolConfig = {
  connectionString: config.database.url,
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients to maintain
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  statement_timeout: 30000, // 30 second query timeout
  query_timeout: 30000, // 30 second query timeout
};

/**
 * Create PostgreSQL connection pool
 */
export const pool = new Pool(poolConfig);

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection successful', {
      timestamp: result.rows[0].now,
    });
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    throw new DatabaseError('Failed to connect to database', { error });
  }
};

/**
 * Execute a query
 */
export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Database query executed', {
      duration: `${duration}ms`,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    logger.error('Database query failed', { error, text });
    throw new DatabaseError('Database query failed', { error, text });
  }
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

/**
 * Graceful shutdown
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool', { error });
  }
};

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err });
});

// Don't test connection on module load - let the server handle it

