/**
 * Base types for framework integrations
 * Common types shared across all framework integrations
 */

import { OrderStatus } from '@models/order';
import { MonitoringStatus } from '@models/monitoring';

/**
 * Base tool/function definition interface
 */
export interface BaseToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Order response for framework integrations
 */
export interface FrameworkOrderResponse {
  id: string;
  skyfiOrderId?: string;
  status: OrderStatus;
  price?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Search response for framework integrations
 */
export interface FrameworkSearchResponse {
  results: unknown[];
  total: number;
  query: unknown;
}

/**
 * Monitoring response for framework integrations
 */
export interface FrameworkMonitoringResponse {
  id: string;
  status: MonitoringStatus;
  aoiData: unknown;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pricing estimate for framework integrations
 */
export interface FrameworkPricingResponse {
  estimatedTotal: number;
  currency: string;
  breakdown?: Record<string, number>;
}

/**
 * Feasibility check for framework integrations
 */
export interface FrameworkFeasibilityResponse {
  feasible: boolean;
  reasons?: string[];
  alternatives?: Array<{
    suggestion: string;
    estimatedPrice?: number;
  }>;
}

/**
 * Error response for framework integrations
 */
export interface FrameworkErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

