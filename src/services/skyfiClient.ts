import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { ExternalServiceError } from '@utils/errors';

/**
 * SkyFi API Client
 * Handles all communication with SkyFi's public API
 */
class SkyFiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = config.skyfi.apiKey;

    if (!this.apiKey) {
      logger.warn('SkyFi API key not configured');
    }

    this.client = axios.create({
      baseURL: config.skyfi.apiUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SkyFi-MCP/1.0.0',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (requestConfig) => {
        // Add API key to requests
        if (this.apiKey) {
          requestConfig.headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        logger.debug('SkyFi API request', {
          method: requestConfig.method,
          url: requestConfig.url,
        });

        return requestConfig;
      },
      (error) => {
        logger.error('SkyFi API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('SkyFi API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('SkyFi API error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });

        // Transform axios errors to our error format
        if (error.response) {
          throw new ExternalServiceError(
            'SkyFi API',
            error.response.data?.message || error.message,
            {
              status: error.response.status,
              data: error.response.data,
            }
          );
        }

        throw new ExternalServiceError('SkyFi API', error.message);
      }
    );
  }

  /**
   * Get data catalog
   */
  async getDataCatalog(filters?: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.get('/catalog', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get data catalog', { error, filters });
      throw error;
    }
  }

  /**
   * Search data
   */
  async searchData(query: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/search', query);
      return response.data;
    } catch (error) {
      logger.error('Failed to search data', { error, query });
      throw error;
    }
  }

  /**
   * Create order
   */
  async createOrder(orderData: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/orders', orderData);
      return response.data;
    } catch (error) {
      logger.error('Failed to create order', { error, orderData });
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string): Promise<unknown> {
    try {
      const response = await this.client.get(`/orders/${orderId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get order status', { error, orderId });
      throw error;
    }
  }

  /**
   * Estimate price
   */
  async estimatePrice(orderData: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/pricing/estimate', orderData);
      return response.data;
    } catch (error) {
      logger.error('Failed to estimate price', { error, orderData });
      throw error;
    }
  }

  /**
   * Check feasibility
   */
  async checkFeasibility(orderData: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/pricing/feasibility', orderData);
      return response.data;
    } catch (error) {
      logger.error('Failed to check feasibility', { error, orderData });
      throw error;
    }
  }

  /**
   * Setup monitoring
   */
  async setupMonitoring(aoiData: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.client.post('/monitoring', aoiData);
      return response.data;
    } catch (error) {
      logger.error('Failed to setup monitoring', { error, aoiData });
      throw error;
    }
  }

  /**
   * Get monitoring status
   */
  async getMonitoringStatus(monitoringId: string): Promise<unknown> {
    try {
      const response = await this.client.get(`/monitoring/${monitoringId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get monitoring status', { error, monitoringId });
      throw error;
    }
  }
}

// Export singleton instance
export const skyfiClient = new SkyFiClient();
export default skyfiClient;

