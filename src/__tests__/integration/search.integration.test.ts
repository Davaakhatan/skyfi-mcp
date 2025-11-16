/**
 * Integration tests for Search workflow
 * Tests the complete flow from service through repository to database
 */

import { searchService } from '@services/searchService';
import { searchRepository } from '@repositories/searchRepository';
import { skyfiClient } from '@services/skyfiClient';
import { createTestUser, cleanupAllTestData, isDatabaseAvailable } from './helpers';
import { SearchQuery } from '@models/search';

// Mock SkyFi client
jest.mock('@services/skyfiClient', () => ({
  skyfiClient: {
    searchData: jest.fn(),
    getDataCatalog: jest.fn(),
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

describe('Search Integration Tests', () => {
  let userId: string;
  let dbAvailable: boolean;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }
    userId = await createTestUser();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  describe('Search Creation Workflow', () => {
    it('should create a search through service and save to repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const searchQuery: SearchQuery = {
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        productType: 'satellite',
      };

      const mockSearchResults = {
        results: [
          {
            id: 'result-1',
            name: 'Satellite Image 1',
            coverage: '2024-01-15',
          },
          {
            id: 'result-2',
            name: 'Satellite Image 2',
            coverage: '2024-01-16',
          },
        ],
        total: 2,
      };

      mockSkyfiClient.searchData.mockResolvedValueOnce(mockSearchResults as any);

      // Search through service
      const results = await searchService.searchData(userId, searchQuery);

      expect(results).toBeDefined();
      expect(mockSkyfiClient.searchData).toHaveBeenCalledWith(searchQuery);

      // Verify search was saved to database through repository
      const searchHistory = await searchRepository.findByUserId(userId);
      expect(searchHistory.length).toBeGreaterThan(0);
      const savedSearch = searchHistory[0];
      expect(savedSearch.userId).toBe(userId);
      expect(savedSearch.query).toBeDefined();
    });

    it('should save search results to repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const searchQuery: SearchQuery = {
        dataType: 'aerial',
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
        },
      };

      const mockResults = {
        results: [{ id: 'aerial-1', name: 'Aerial Photo' }],
        total: 1,
      };

      mockSkyfiClient.searchData.mockResolvedValueOnce(mockResults as any);

      await searchService.searchData(userId, searchQuery);

      // Verify results were saved
      const searchHistory = await searchRepository.findByUserId(userId);
      const savedSearch = searchHistory[0];
      expect(savedSearch.results).toBeDefined();
    });
  });

  describe('Search History Workflow', () => {
    it('should retrieve search history through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      // Create multiple searches
      const searchQuery1: SearchQuery = {
        dataType: 'satellite',
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      const searchQuery2: SearchQuery = {
        dataType: 'aerial',
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
        },
      };

      mockSkyfiClient.searchData.mockResolvedValue({
        results: [],
        total: 0,
      } as any);

      await searchService.searchData(userId, searchQuery1);
      await searchService.searchData(userId, searchQuery2);

      // Get search history through service
      const history = await searchService.getSearchHistory(userId);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.every((search) => search.userId === userId)).toBe(true);

      // Verify through repository
      const repoHistory = await searchRepository.findByUserId(userId);
      expect(repoHistory.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve search by ID through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const searchQuery: SearchQuery = {
        dataType: 'satellite',
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.searchData.mockResolvedValueOnce({
        results: [],
        total: 0,
      } as any);

      await searchService.searchData(userId, searchQuery);

      // Get the search ID from history
      const history = await searchRepository.findByUserId(userId);
      const searchId = history[0].id;

      // Retrieve through repository
      const retrievedSearch = await searchRepository.findById(searchId, userId);

      expect(retrievedSearch.id).toBe(searchId);
      expect(retrievedSearch.userId).toBe(userId);
    });
  });

  describe('Search Refinement Workflow', () => {
    it('should refine search and update history', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const initialQuery: SearchQuery = {
        dataType: 'satellite',
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.searchData.mockResolvedValueOnce({
        results: [],
        total: 0,
      } as any);

      await searchService.searchData(userId, initialQuery);

      // Get the initial search ID first
      const initialHistory = await searchRepository.findByUserId(userId);
      const initialSearchId = initialHistory[0].id;

      mockSkyfiClient.searchData.mockResolvedValueOnce({
        results: [{ id: 'refined-1', name: 'Refined Result' }],
        total: 1,
      } as any);
      
      // Refine search with the initial search ID
      await searchService.refineSearch(userId, initialSearchId, {
        resolution: 'high',
        timeRange: {
          start: '2024-01-01',
          end: '2024-01-31',
        },
      });

      // Verify both searches are in history
      const history = await searchRepository.findByUserId(userId);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });
  });
});

