import { searchRepository } from '@repositories/searchRepository';
import { skyfiClient } from './skyfiClient';
import { Search, SearchQuery, SearchResponse } from '@models/search';
import { NotFoundError, ValidationError } from '@utils/errors';
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

      // Search in SkyFi
      const results = await skyfiClient.searchData(query);

      // Save search to history
      await searchRepository.create(userId, query, results);

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
   * Validate search query
   */
  private validateSearchQuery(query: SearchQuery): void {
    if (!query || typeof query !== 'object') {
      throw new ValidationError('Search query is required');
    }

    // At least one search parameter should be provided
    const hasParams =
      query.dataType ||
      query.areaOfInterest ||
      query.timeRange ||
      query.keywords?.length;

    if (!hasParams) {
      throw new ValidationError('Search query must have at least one parameter');
    }
  }
}

export const searchService = new SearchService();

