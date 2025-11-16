/**
 * Validation utilities for production-ready input validation
 */

import { ValidationError } from './errors';

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate UUID format
 */
export function validateUUID(id: string, fieldName: string = 'id'): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError(`${fieldName} is required`);
  }
  if (!UUID_REGEX.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(limit?: unknown, offset?: unknown): { limit: number; offset: number } {
  const parsedLimit = limit !== undefined ? parseInt(String(limit), 10) : 50;
  const parsedOffset = offset !== undefined ? parseInt(String(offset), 10) : 0;

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  if (isNaN(parsedOffset) || parsedOffset < 0) {
    throw new ValidationError('Offset must be a non-negative number');
  }

  return { limit: parsedLimit, offset: parsedOffset };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, fieldName: string = 'url'): void {
  try {
    new URL(url);
  } catch {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

/**
 * Validate expiration days
 */
export function validateExpirationDays(days: unknown): number {
  const parsed = typeof days === 'number' ? days : parseInt(String(days), 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 3650) {
    throw new ValidationError('Expiration days must be between 1 and 3650');
  }
  return parsed;
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  // Remove null bytes and trim
  let sanitized = input.replace(/\0/g, '').trim();
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
}

