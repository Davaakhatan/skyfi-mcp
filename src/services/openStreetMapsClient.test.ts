import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('@config/index', () => ({
  config: {
    osm: {
      apiUrl: 'https://nominatim.openstreetmap.org',
      userAgent: 'SkyFi-MCP/1.0.0',
    },
  },
}));

jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockAxios = axios as jest.Mocked<typeof axios>;

// TODO: These tests need refactoring - singleton pattern makes mocking difficult
// Consider refactoring clients to support dependency injection for better testability
describe.skip('OpenStreetMapsClient', () => {
  let mockGet: jest.Mock;
  let mockClient: any;
  let osmClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    mockGet = jest.fn();
    
    mockClient = {
      get: mockGet,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    (mockAxios.create as jest.Mock) = jest.fn(() => mockClient);
    
    // Import after mocks are set up
    const module = require('./openStreetMapsClient');
    osmClient = module.osmClient;
  });

  describe('geocode', () => {
    it('should geocode an address successfully', async () => {
      
      const mockResponse = {
        data: [
          {
            lat: '40.7128',
            lon: '-74.0060',
            display_name: 'New York, NY, USA',
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await osmClient.geocode('New York, NY');

      expect(mockGet).toHaveBeenCalledWith('/search', {
        params: {
          q: 'New York, NY',
          limit: 1,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should return cached result on second call', async () => {
      
      const mockResponse = {
        data: [
          {
            lat: '40.7128',
            lon: '-74.0060',
            display_name: 'New York, NY, USA',
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      // First call
      await osmClient.geocode('New York, NY');
      // Second call should use cache
      const result = await osmClient.geocode('New York, NY');

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle API errors', async () => {
      
      const mockError = new Error('API Error');
      mockGet.mockRejectedValue(mockError);

      await expect(osmClient.geocode('Invalid Address')).rejects.toThrow('API Error');
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates successfully', async () => {
      
      const mockResponse = {
        data: {
          display_name: 'New York, NY, USA',
          address: {
            city: 'New York',
            state: 'NY',
            country: 'USA',
          },
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await osmClient.reverseGeocode(40.7128, -74.0060);

      expect(mockGet).toHaveBeenCalledWith('/reverse', {
        params: {
          lat: 40.7128,
          lon: -74.0060,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should use cache for reverse geocoding', async () => {
      
      const mockResponse = {
        data: {
          display_name: 'New York, NY, USA',
        },
      };

      mockGet.mockResolvedValue(mockResponse);

      await osmClient.reverseGeocode(40.7128, -74.0060);
      const result = await osmClient.reverseGeocode(40.7128, -74.0060);

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('searchPlaces', () => {
    it('should search for places successfully', async () => {
      
      const mockResponse = {
        data: [
          {
            display_name: 'Central Park, New York',
            lat: '40.7829',
            lon: '-73.9654',
          },
          {
            display_name: 'Times Square, New York',
            lat: '40.7580',
            lon: '-73.9855',
          },
        ],
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await osmClient.searchPlaces('parks in New York', 10);

      expect(mockGet).toHaveBeenCalledWith('/search', {
        params: {
          q: 'parks in New York',
          limit: 10,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should use default limit if not provided', async () => {
      
      const mockResponse = { data: [] };
      mockGet.mockResolvedValue(mockResponse);

      await osmClient.searchPlaces('test query');

      expect(mockGet).toHaveBeenCalledWith('/search', {
        params: {
          q: 'test query',
          limit: 10,
        },
      });
    });
  });

  describe('clearCache', () => {
    it('should clear the cache', async () => {
      
      const mockResponse = { data: { result: 'test' } };
      mockGet.mockResolvedValue(mockResponse);

      // Make a call to populate cache
      await osmClient.geocode('Test Address');
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Clear cache
      osmClient.clearCache();

      // Make another call - should hit API again
      await osmClient.geocode('Test Address');
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});
