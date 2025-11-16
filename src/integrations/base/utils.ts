/**
 * Base utilities for framework integrations
 * Shared helper functions for all framework integrations
 */

/**
 * Get the base URL for SkyFi MCP API
 */
export function getApiBaseUrl(): string {
  // Use environment variables directly to avoid importing config module
  // which may have issues in Next.js environment
  const port = process.env.PORT || process.env.API_PORT || '3000';
  const host = process.env.API_HOST || 'localhost';
  const protocol = process.env.API_PROTOCOL || 'http';
  const apiVersion = process.env.API_VERSION || 'v1';
  return `${protocol}://${host}:${port}/${apiVersion}`;
}

/**
 * Format error for framework consumption
 */
export function formatError(error: unknown): { code: string; message: string; details?: unknown } {
  if (error instanceof Error) {
    return {
      code: error.name || 'UNKNOWN_ERROR',
      message: error.message,
      details: error.stack,
    };
  }
  
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const err = error as { error: { code?: string; message?: string; details?: unknown } };
    return {
      code: err.error.code || 'UNKNOWN_ERROR',
      message: err.error.message || 'An unknown error occurred',
      details: err.error.details,
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
  };
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return apiKey.length >= 10 && (apiKey.startsWith('sk-') || apiKey.startsWith('sk-test-'));
}

/**
 * Create authorization header
 */
export function createAuthHeader(apiKey: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

