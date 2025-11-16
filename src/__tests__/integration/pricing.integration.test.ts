/**
 * Integration tests for Pricing workflow
 * Tests the complete flow from service through SkyFi client
 */

import { pricingService } from '@services/pricingService';
import { skyfiClient } from '@services/skyfiClient';
import { PricingRequest } from '@models/pricing';

// Mock SkyFi client
jest.mock('@services/skyfiClient', () => ({
  skyfiClient: {
    estimatePrice: jest.fn(),
    checkFeasibility: jest.fn(),
  },
}));

// Mock logger to reduce noise
jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockSkyfiClient = skyfiClient as jest.Mocked<typeof skyfiClient>;

describe('Pricing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Price Estimation Workflow', () => {
    it('should estimate price through service and SkyFi client', async () => {
      const pricingRequest: PricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        } as any,
        resolution: 'high',
      };

      const mockEstimate = {
        estimatedTotal: 150.75,
        currency: 'USD',
        breakdown: {
          dataCost: 100.0,
          processingCost: 50.75,
        },
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce(mockEstimate as any);

      // Estimate through service
      const estimate = await pricingService.estimatePrice(pricingRequest);

      expect(estimate).toBeDefined();
      expect(estimate.estimatedTotal).toBe(150.75);
      expect(estimate.currency).toBe('USD');
      expect(mockSkyfiClient.estimatePrice).toHaveBeenCalledWith(pricingRequest);
    });

    it('should handle price estimation with time range', async () => {
      const pricingRequest: PricingRequest = {
        dataType: 'aerial',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
        } as any,
        timeRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      };

      const mockEstimate = {
        estimatedTotal: 500.0,
        currency: 'USD',
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce(mockEstimate as any);

      const estimate = await pricingService.estimatePrice(pricingRequest);

      expect(estimate.estimatedTotal).toBe(500.0);
      expect(mockSkyfiClient.estimatePrice).toHaveBeenCalledWith(pricingRequest);
    });
  });

  describe('Feasibility Checking Workflow', () => {
    it('should check feasibility through service and SkyFi client', async () => {
      const pricingRequest: PricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      const mockFeasibility = {
        feasible: true,
        reasons: ['Data available for requested area and time'],
        estimatedPrice: 150.75,
      };

      mockSkyfiClient.checkFeasibility.mockResolvedValueOnce(mockFeasibility as any);

      // Check feasibility through service
      const feasibility = await pricingService.checkFeasibility(pricingRequest);

      expect(feasibility).toBeDefined();
      expect(feasibility.feasible).toBe(true);
      expect(feasibility.reasons).toBeDefined();
      expect(feasibility.estimatedPrice).toBe(150.75);
      expect(mockSkyfiClient.checkFeasibility).toHaveBeenCalledWith(pricingRequest);
    });

    it('should handle infeasible requests', async () => {
      const pricingRequest: PricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        timeRange: {
          start: '2020-01-01',
          end: '2020-12-31',
        },
      };

      const mockFeasibility = {
        feasible: false,
        reasons: ['No data available for requested time range'],
        alternatives: [
          {
            suggestion: 'Try a different time range',
            estimatedPrice: 200.0,
          },
        ],
      };

      mockSkyfiClient.checkFeasibility.mockResolvedValueOnce(mockFeasibility as any);

      const feasibility = await pricingService.checkFeasibility(pricingRequest);

      expect(feasibility.feasible).toBe(false);
      expect(feasibility.reasons).toBeDefined();
      expect(feasibility.reasons?.[0]).toContain('No data available');
      expect(feasibility.alternatives).toBeDefined();
    });
  });

  describe('Price Comparison Workflow', () => {
    it('should compare pricing for multiple scenarios', async () => {
      const request1: PricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        } as any,
        resolution: 'high',
      };

      const request2: PricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        } as any,
        resolution: 'medium',
      };

      const mockEstimate1 = {
        estimatedTotal: 200.0,
        currency: 'USD',
      };

      const mockEstimate2 = {
        estimatedTotal: 150.0,
        currency: 'USD',
      };

      mockSkyfiClient.estimatePrice
        .mockResolvedValueOnce(mockEstimate1 as any)
        .mockResolvedValueOnce(mockEstimate2 as any);

      // Compare pricing through service
      const estimates = await pricingService.comparePricing([request1, request2]);

      expect(Array.isArray(estimates)).toBe(true);
      expect(estimates.length).toBe(2);
      expect(estimates[0].estimatedTotal).toBe(200.0);
      expect(estimates[1].estimatedTotal).toBe(150.0);
      expect(mockSkyfiClient.estimatePrice).toHaveBeenCalledTimes(2);
    });

    it('should handle single scenario comparison', async () => {
      const request: PricingRequest = {
        dataType: 'aerial',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        } as any,
      };

      const mockEstimate = {
        estimatedTotal: 100.0,
        currency: 'USD',
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce(mockEstimate as any);

      const estimates = await pricingService.comparePricing([request]);

      expect(estimates.length).toBe(1);
      expect(estimates[0].estimatedTotal).toBe(100.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle SkyFi client errors gracefully', async () => {
      const pricingRequest: PricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        } as any,
      };

      mockSkyfiClient.estimatePrice.mockRejectedValueOnce(
        new Error('SkyFi API error')
      );

      await expect(pricingService.estimatePrice(pricingRequest)).rejects.toThrow();
    });

    it('should validate pricing request before calling SkyFi', async () => {
      const invalidRequest = {} as PricingRequest;

      await expect(pricingService.estimatePrice(invalidRequest)).rejects.toThrow();
      expect(mockSkyfiClient.estimatePrice).not.toHaveBeenCalled();
    });
  });
});

