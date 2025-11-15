import { SearchRepository } from './searchRepository';
import { query } from '@config/database';
import { DatabaseError } from '@utils/errors';

// Mock dependencies
jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('SearchRepository', () => {
  let repository: SearchRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SearchRepository();
  });

  describe('create', () => {
    it('should create a new search successfully', async () => {
      const mockQueryData = {
        aoi: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        productType: 'satellite',
      };

      const mockRow = {
        id: 'search-123',
        user_id: 'user-456',
        query: JSON.stringify(mockQueryData),
        results: JSON.stringify({ results: [] }),
        context: JSON.stringify({ context: 'data' }),
        created_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.create(
        'user-456',
        mockQueryData,
        { results: [] },
        { context: 'data' }
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO searches'),
        [
          'user-456',
          JSON.stringify(mockQueryData),
          JSON.stringify({ results: [] }),
          JSON.stringify({ context: 'data' }),
        ]
      );
      expect(result.id).toBe('search-123');
      expect(result.userId).toBe('user-456');
    });

    it('should create search without results and context', async () => {
      const mockRow = {
        id: 'search-123',
        user_id: 'user-456',
        query: JSON.stringify({ test: 'query' }),
        results: null,
        context: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.create('user-456', { test: 'query' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO searches'),
        ['user-456', JSON.stringify({ test: 'query' }), null, null]
      );
      expect(result.results).toBeNull();
      expect(result.context).toBeNull();
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.create('user-456', { test: 'query' })).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('findById', () => {
    it('should find search by ID without userId', async () => {
      const mockRow = {
        id: 'search-123',
        user_id: 'user-456',
        query: JSON.stringify({ test: 'query' }),
        results: JSON.stringify({ results: [] }),
        context: JSON.stringify({ context: 'data' }),
        created_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.findById('search-123');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM searches WHERE id = $1', [
        'search-123',
      ]);
      expect(result.id).toBe('search-123');
    });

    it('should find search by ID with userId', async () => {
      const mockRow = {
        id: 'search-123',
        user_id: 'user-456',
        query: JSON.stringify({ test: 'query' }),
        results: null,
        context: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.findById('search-123', 'user-456');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM searches WHERE id = $1 AND user_id = $2',
        ['search-123', 'user-456']
      );
      expect(result.userId).toBe('user-456');
    });

    it('should throw error when search not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(repository.findById('non-existent')).rejects.toThrow();
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findById('search-123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('findByUserId', () => {
    it('should find searches by user ID', async () => {
      const mockRows = [
        {
          id: 'search-1',
          user_id: 'user-456',
          query: JSON.stringify({ test: 'query1' }),
          results: null,
          context: null,
          created_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'search-2',
          user_id: 'user-456',
          query: JSON.stringify({ test: 'query2' }),
          results: null,
          context: null,
          created_at: new Date('2024-01-14T10:00:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
      } as any);

      const result = await repository.findByUserId('user-456', 50, 0);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM searches'),
        ['user-456', 50, 0]
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('search-1');
      expect(result[1].id).toBe('search-2');
    });

    it('should use default limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await repository.findByUserId('user-456');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM searches'),
        ['user-456', 50, 0]
      );
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findByUserId('user-456')).rejects.toThrow(DatabaseError);
    });
  });
});

