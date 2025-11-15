import { skyfiClient } from './skyfiClient';
import { PricingEstimate, FeasibilityCheck, PricingRequest } from '@models/pricing';
import { ValidationError } from '@utils/errors';
import { logger } from '@utils/logger';

/**
 * Pricing Service
 * Business logic for pricing and feasibility checking
 */
export class PricingService {
  /**
   * Estimate price for an order
   */
  async estimatePrice(request: PricingRequest): Promise<PricingEstimate> {
    try {
      this.validatePricingRequest(request);

      const estimate = await skyfiClient.estimatePrice(request);

      return estimate as PricingEstimate;
    } catch (error) {
      logger.error('Failed to estimate price', { error, request });
      throw error;
    }
  }

  /**
   * Check order feasibility
   */
  async checkFeasibility(request: PricingRequest): Promise<FeasibilityCheck> {
    try {
      this.validatePricingRequest(request);

      const feasibility = await skyfiClient.checkFeasibility(request);

      return feasibility as FeasibilityCheck;
    } catch (error) {
      logger.error('Failed to check feasibility', { error, request });
      throw error;
    }
  }

  /**
   * Compare pricing for multiple scenarios
   */
  async comparePricing(requests: PricingRequest[]): Promise<PricingEstimate[]> {
    try {
      if (!requests || requests.length === 0) {
        throw new ValidationError('At least one pricing request is required');
      }

      if (requests.length > 10) {
        throw new ValidationError('Maximum 10 scenarios can be compared');
      }

      // Validate all requests
      requests.forEach((req) => this.validatePricingRequest(req));

      // Get estimates for all scenarios
      const estimates = await Promise.all(
        requests.map((req) => skyfiClient.estimatePrice(req))
      );

      return estimates as PricingEstimate[];
    } catch (error) {
      logger.error('Failed to compare pricing', { error });
      throw error;
    }
  }

  /**
   * Validate pricing request
   */
  private validatePricingRequest(request: PricingRequest): void {
    if (!request || typeof request !== 'object') {
      throw new ValidationError('Pricing request is required');
    }

    // At least one parameter should be provided
    const hasParams =
      request.dataType ||
      request.areaOfInterest ||
      request.timeRange ||
      request.resolution;

    if (!hasParams) {
      throw new ValidationError(
        'Pricing request must have at least one parameter'
      );
    }
  }
}

export const pricingService = new PricingService();

