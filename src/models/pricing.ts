/**
 * Pricing and feasibility models
 */

export interface PricingEstimate {
  basePrice: number;
  currency: string;
  breakdown?: {
    dataType?: number;
    area?: number;
    resolution?: number;
    timeRange?: number;
    [key: string]: number | undefined;
  };
  estimatedTotal: number;
  validUntil?: string;
}

export interface FeasibilityCheck {
  feasible: boolean;
  reasons?: string[];
  alternatives?: Array<{
    suggestion: string;
    estimatedPrice?: number;
  }>;
  estimatedPrice?: number;
}

export interface PricingRequest {
  dataType?: string;
  areaOfInterest?: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  timeRange?: {
    start: string;
    end: string;
  };
  resolution?: string;
  format?: string;
  [key: string]: unknown;
}

