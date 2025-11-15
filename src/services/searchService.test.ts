import { SearchService } from './searchService';
import { searchRepository } from '@repositories/searchRepository';
import { skyfiClient } from './skyfiClient';
import { NotFoundError, ValidationError } from '@utils/errors';
import { SearchQuery } from '@models/search';

// Mock dependencies
jest.mock('@repositories/searchRepository');
jest.mock('./skyfiClient');
jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockSearchRepository = searchRepository as jest.Mocked<typeof searchRepository>;
const mockSkyfiClient = skyfiClient as jest.Mocked<typeof skyfiClient>;

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService = new SearchService();
  });

  describe('searchData', () => {
    const userId = 'user-123';
    const mockQuery: SearchQuery = {
      aoi: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      productType: 'satellite',
    };

    it('should search data successfully', async () => {
      const mockResults = {
        results: [
          { 
            id: 'result-1', 
            dataType: 'satellite',
            areaOfInterest: mockQuery.aoi,
            timeRange: { start: '2024-01-01', end: '2024-01-31' },
            metadata: { name: 'Product 1' },
          },
          { 
            id: 'result-2',
            dataType: 'satellite',
            areaOfInterest: mockQuery.aoi,
            timeRange: { start: '2024-01-01', end: '2024-01-31' },
            metadata: { name: 'Product 2' },
          },
        ],
        total: 2,
      };

      mockSkyfiClient.searchData.mockResolvedValueOnce(mockResults);
      mockSearchRepository.create.mockResolvedValueOnce({
        id: 'search-123',
        userId,
        query: mockQuery,
        results: mockResults,
        context: undefined,
        createdAt: new Date(),
      });

      const result = await searchService.searchData(userId, mockQuery);

      expect(result).toEqual(mockResults);
      expect(mockSkyfiClient.searchData).toHaveBeenCalledWith(mockQuery);
      expect(mockSearchRepository.create).toHaveBeenCalledWith(
        userId,
        mockQuery,
        mockResults
      );
    });

    it('should throw ValidationError for invalid query', async () => {
      const invalidQuery = null as any;

      await expect(
        searchService.searchData(userId, invalidQuery)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for query without AOI', async () => {
      const invalidQuery = {
        productType: 'satellite',
      } as any;

      await expect(
        searchService.searchData(userId, invalidQuery)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('refineSearch', () => {
    const userId = 'user-123';
    const searchId = 'search-123';
    const originalQuery: SearchQuery = {
      aoi: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      productType: 'satellite',
    };

    it('should refine search successfully', async () => {
      const refinements: Partial<SearchQuery> = {
        productType: 'aerial',
      };

      const refinedQuery = { ...originalQuery, ...refinements };
      const mockResults = {
        results: [{
          id: 'result-1',
          dataType: 'aerial',
          areaOfInterest: refinedQuery.aoi!,
          timeRange: { start: '2024-01-01', end: '2024-01-31' },
          metadata: {},
        }],
        total: 1,
      };

      mockSearchRepository.findById.mockResolvedValueOnce({
        id: searchId,
        userId,
        query: originalQuery,
        results: undefined,
        context: undefined,
        createdAt: new Date(),
      });

      mockSkyfiClient.searchData.mockResolvedValueOnce(mockResults);
      mockSearchRepository.create.mockResolvedValueOnce({
        id: 'search-456',
        userId,
        query: refinedQuery,
        results: mockResults,
        context: { originalSearchId: searchId, refinements },
        createdAt: new Date(),
      });

      const result = await searchService.refineSearch(userId, searchId, refinements);

      expect(result).toEqual(mockResults);
      expect(mockSkyfiClient.searchData).toHaveBeenCalledWith(refinedQuery);
      expect(mockSearchRepository.create).toHaveBeenCalledWith(
        userId,
        refinedQuery,
        mockResults,
        expect.objectContaining({ originalSearchId: searchId })
      );
    });

    it('should throw NotFoundError when search not found', async () => {
      const refinements: Partial<SearchQuery> = { productType: 'aerial' };

      mockSearchRepository.findById.mockRejectedValueOnce(new NotFoundError('Search'));

      await expect(
        searchService.refineSearch(userId, searchId, refinements)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSearchHistory', () => {
    it('should get search history', async () => {
      const userId = 'user-123';
      const mockSearches = [
        {
          id: 'search-1',
          userId,
          query: { aoi: {}, productType: 'satellite' },
          results: undefined,
          context: undefined,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'search-2',
          userId,
          query: { aoi: {}, productType: 'aerial' },
          results: undefined,
          context: undefined,
          createdAt: new Date('2024-01-02'),
        },
      ];

      mockSearchRepository.findByUserId.mockResolvedValueOnce(mockSearches);

      const result = await searchService.getSearchHistory(userId, 10, 0);

      expect(result).toEqual(mockSearches);
      expect(mockSearchRepository.findByUserId).toHaveBeenCalledWith(userId, 10, 0);
    });

    it('should use default limit and offset', async () => {
      const userId = 'user-123';
      mockSearchRepository.findByUserId.mockResolvedValueOnce([]);

      await searchService.getSearchHistory(userId);

      expect(mockSearchRepository.findByUserId).toHaveBeenCalledWith(userId, 50, 0);
    });
  });

  describe('getSearchContext', () => {
    it('should get search with context', async () => {
      const userId = 'user-123';
      const searchId = 'search-123';
      const mockSearch = {
        id: searchId,
        userId,
        query: { aoi: {}, productType: 'satellite' },
        results: { results: [], total: 0 },
        context: { originalSearchId: 'search-456' },
        createdAt: new Date(),
      };

      mockSearchRepository.findById.mockResolvedValueOnce(mockSearch);

      const result = await searchService.getSearchContext(searchId, userId);

      expect(result).toEqual(mockSearch);
      expect(mockSearchRepository.findById).toHaveBeenCalledWith(searchId, userId);
    });

    it('should throw NotFoundError when search not found', async () => {
      const userId = 'user-123';
      const searchId = 'search-123';

      mockSearchRepository.findById.mockRejectedValueOnce(new NotFoundError('Search'));

      await expect(
        searchService.getSearchContext(searchId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});

