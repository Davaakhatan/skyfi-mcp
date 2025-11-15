import { PricingService } from './pricingService';
import { skyfiClient } from './skyfiClient';
import { ValidationError } from '@utils/errors';
import { PricingRequest } from '@models/pricing';

// Mock dependencies
jest.mock('./skyfiClient');
jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockSkyfiClient = skyfiClient as jest.Mocked<typeof skyfiClient>;

describe('PricingService', () => {
  let pricingService: PricingService;

  beforeEach(() => {
    jest.clearAllMocks();
    pricingService = new PricingService();
  });

  describe('estimatePrice', () => {
    const mockRequest: PricingRequest = {
      areaOfInterest: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      dataType: 'satellite',
    };

    it('should estimate price successfully', async () => {
      const mockEstimate = {
        estimatedTotal: 100.50,
        currency: 'USD',
        breakdown: {
          basePrice: 80.00,
          processingFee: 20.50,
        },
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce(mockEstimate);

      const result = await pricingService.estimatePrice(mockRequest);

      expect(result).toEqual(mockEstimate);
      expect(mockSkyfiClient.estimatePrice).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw ValidationError for invalid request', async () => {
      const invalidRequest = null as any;

      await expect(
        pricingService.estimatePrice(invalidRequest)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for request without parameters', async () => {
      const invalidRequest = {} as any;

      await expect(
        pricingService.estimatePrice(invalidRequest)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('checkFeasibility', () => {
    const mockRequest: PricingRequest = {
      areaOfInterest: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      dataType: 'satellite',
    };

    it('should check feasibility successfully', async () => {
      const mockFeasibility = {
        feasible: true,
        reason: 'Order can be fulfilled',
        estimatedDelivery: '2024-02-01',
      };

      mockSkyfiClient.checkFeasibility.mockResolvedValueOnce(mockFeasibility);

      const result = await pricingService.checkFeasibility(mockRequest);

      expect(result).toEqual(mockFeasibility);
      expect(mockSkyfiClient.checkFeasibility).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw ValidationError for invalid request', async () => {
      const invalidRequest = null as any;

      await expect(
        pricingService.checkFeasibility(invalidRequest)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('comparePricing', () => {
    const mockRequest1: PricingRequest = {
      areaOfInterest: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      dataType: 'satellite',
      timeRange: { start: '2024-01-01', end: '2024-01-31' },
    };

    const mockRequest2: PricingRequest = {
      areaOfInterest: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] },
      dataType: 'aerial',
      timeRange: { start: '2024-02-01', end: '2024-02-28' },
    };

    it('should compare pricing for multiple scenarios', async () => {
      const mockEstimate1 = { estimatedTotal: 100.50, currency: 'USD' };
      const mockEstimate2 = { estimatedTotal: 200.75, currency: 'USD' };

      mockSkyfiClient.estimatePrice
        .mockResolvedValueOnce(mockEstimate1)
        .mockResolvedValueOnce(mockEstimate2);

      const result = await pricingService.comparePricing([mockRequest1, mockRequest2]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockEstimate1);
      expect(result[1]).toEqual(mockEstimate2);
      expect(mockSkyfiClient.estimatePrice).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationError for empty requests array', async () => {
      await expect(
        pricingService.comparePricing([])
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for null requests', async () => {
      await expect(
        pricingService.comparePricing(null as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for more than 10 scenarios', async () => {
      const requests = Array(11).fill({
        areaOfInterest: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        dataType: 'satellite',
      } as PricingRequest);

      await expect(
        pricingService.comparePricing(requests)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate all requests before comparing', async () => {
      const invalidRequest = { invalidField: 'test' } as any;

      await expect(
        pricingService.comparePricing([mockRequest1, invalidRequest])
      ).rejects.toThrow(ValidationError);
    });
  });
});

