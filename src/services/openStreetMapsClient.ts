import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { ExternalServiceError } from '@utils/errors';

/**
 * OpenStreetMaps API Client
 * Handles geocoding, reverse geocoding, and place search
 */
class OpenStreetMapsClient {
  private client: AxiosInstance;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.client = axios.create({
      baseURL: config.osm.apiUrl,
      timeout: 10000, // 10 seconds
      headers: {
        'User-Agent': config.osm.userAgent,
      },
      params: {
        format: 'json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (requestConfig) => {
        logger.debug('OpenStreetMaps API request', {
          method: requestConfig.method,
          url: requestConfig.url,
        });
        return requestConfig;
      },
      (error) => {
        logger.error('OpenStreetMaps API request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('OpenStreetMaps API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('OpenStreetMaps API error', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });

        if (error.response) {
          throw new ExternalServiceError(
            'OpenStreetMaps',
            error.response.data?.message || error.message,
            {
              status: error.response.status,
              data: error.response.data,
            }
          );
        }

        throw new ExternalServiceError('OpenStreetMaps', error.message);
      }
    );
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address: string): Promise<unknown> {
    try {
      const cacheKey = `geocode:${address}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await this.client.get('/search', {
        params: {
          q: address,
          limit: 1,
        },
      });

      const data = response.data;
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Failed to geocode address', { error, address });
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<unknown> {
    try {
      const cacheKey = `reverse:${lat},${lon}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await this.client.get('/reverse', {
        params: {
          lat,
          lon,
        },
      });

      const data = response.data;
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Failed to reverse geocode', { error, lat, lon });
      throw error;
    }
  }

  /**
   * Search for places
   */
  async searchPlaces(query: string, limit = 10): Promise<unknown> {
    try {
      const cacheKey = `places:${query}:${limit}`;
      const cached = this.getCached(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await this.client.get('/search', {
        params: {
          q: query,
          limit,
        },
      });

      const data = response.data;
      this.setCached(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Failed to search places', { error, query });
      throw error;
    }
  }

  /**
   * Get cached data
   */
  private getCached(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Set cached data
   */
  private setCached(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up old cache entries if cache gets too large
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.cacheTTL) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const osmClient = new OpenStreetMapsClient();
export default osmClient;

