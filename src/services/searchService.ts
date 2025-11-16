import { searchRepository } from '@repositories/searchRepository';
import { skyfiClient } from './skyfiClient';
import { osmClient } from './openStreetMapsClient';
import { Search, SearchQuery, SearchResponse } from '@models/search';
import { ValidationError } from '@utils/errors';
import { logger } from '@utils/logger';

/**
 * Search Service
 * Business logic for data search and exploration
 */
export class SearchService {
  /**
   * Search data catalog
   */
  async searchData(userId: string, query: SearchQuery): Promise<SearchResponse> {
    try {
      // Validate query
      this.validateSearchQuery(query);

      // Enhance query with OSM geocoding if location string is provided
      const enhancedQuery = await this.enhanceQueryWithOSM(query);

      // Search in SkyFi
      const results = await skyfiClient.searchData(enhancedQuery);

      // Save search to history (with original query for reference)
      await searchRepository.create(userId, query, results, {
        enhancedQuery,
        osmContext: enhancedQuery !== query ? 'geocoded' : undefined,
      });

      return results as SearchResponse;
    } catch (error) {
      logger.error('Failed to search data', { error, userId });
      throw error;
    }
  }

  /**
   * Refine search
   */
  async refineSearch(
    userId: string,
    searchId: string,
    refinements: Partial<SearchQuery>
  ): Promise<SearchResponse> {
    try {
      // Get original search
      const originalSearch = await searchRepository.findById(searchId, userId);

      // Merge refinements with original query
      const refinedQuery = {
        ...(originalSearch.query as SearchQuery),
        ...refinements,
      };

      // Search with refined query
      const results = await skyfiClient.searchData(refinedQuery);

      // Update search with new results
      await searchRepository.create(userId, refinedQuery, results, {
        originalSearchId: searchId,
        refinements,
      });

      return results as SearchResponse;
    } catch (error) {
      logger.error('Failed to refine search', { error, searchId });
      throw error;
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(userId: string, limit = 50, offset = 0): Promise<Search[]> {
    try {
      return await searchRepository.findByUserId(userId, limit, offset);
    } catch (error) {
      logger.error('Failed to get search history', { error, userId });
      throw error;
    }
  }

  /**
   * Get search by ID with context
   */
  async getSearchContext(searchId: string, userId: string): Promise<Search> {
    try {
      return await searchRepository.findById(searchId, userId);
    } catch (error) {
      logger.error('Failed to get search context', { error, searchId });
      throw error;
    }
  }

  /**
   * Enhance query with OSM geocoding if location string is provided
   */
  private async enhanceQueryWithOSM(query: SearchQuery): Promise<SearchQuery> {
    // If query has a location string but no AOI, try to geocode it
    const locationString = (query as any).location || (query as any).address;
    
    if (locationString && !query.aoi) {
      try {
        logger.debug('Geocoding location for search', { location: locationString });
        const geocodeResult = await osmClient.geocode(locationString);
        
        // Extract coordinates from OSM response
        const results = Array.isArray(geocodeResult) ? geocodeResult : [geocodeResult];
        if (results.length > 0 && results[0]) {
          const firstResult = results[0] as any;
          const lat = parseFloat(firstResult.lat);
          const lon = parseFloat(firstResult.lon);
          
          if (!isNaN(lat) && !isNaN(lon)) {
            // Create a bounding box around the point (roughly 1km radius)
            const buffer = 0.01; // ~1km
            const enhancedQuery = {
              ...query,
              aoi: {
                type: 'Polygon',
                coordinates: [[
                  [lon - buffer, lat - buffer],
                  [lon + buffer, lat - buffer],
                  [lon + buffer, lat + buffer],
                  [lon - buffer, lat + buffer],
                  [lon - buffer, lat - buffer],
                ]],
              },
            };
            
            logger.info('Successfully geocoded location for search', {
              location: locationString,
              coordinates: { lat, lon },
            });
            
            return enhancedQuery;
          }
        }
      } catch (error) {
        logger.warn('Failed to geocode location, proceeding without OSM enhancement', {
          error,
          location: locationString,
        });
        // Continue with original query if geocoding fails
      }
    }
    
    return query;
  }

  /**
   * Validate search query
   */
  private validateSearchQuery(query: SearchQuery): void {
    if (!query || typeof query !== 'object') {
      throw new ValidationError('Search query is required');
    }

    // At least one search parameter should be provided
    const hasParams =
      query.dataType ||
      query.aoi ||
      query.areaOfInterest ||
      query.timeRange ||
      query.keywords?.length ||
      (query as any).location ||
      (query as any).address;

    if (!hasParams) {
      throw new ValidationError('Search query must have at least one parameter');
    }
  }
}

export const searchService = new SearchService();

