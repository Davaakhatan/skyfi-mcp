import { MonitoringRepository } from './monitoringRepository';
import { query } from '@config/database';
import { MonitoringStatus } from '@models/monitoring';
import { NotFoundError, DatabaseError } from '@utils/errors';

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

describe('MonitoringRepository', () => {
  let repository: MonitoringRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MonitoringRepository();
  });

  describe('create', () => {
    it('should create a new monitoring configuration successfully', async () => {
      const mockAoiData = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      const mockRow = {
        id: 'monitoring-123',
        user_id: 'user-456',
        aoi_data: JSON.stringify(mockAoiData),
        webhook_url: 'https://example.com/webhook',
        status: MonitoringStatus.INACTIVE,
        config: JSON.stringify({ frequency: 'daily' }),
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.create(
        'user-456',
        mockAoiData,
        'https://example.com/webhook',
        { frequency: 'daily' }
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO monitoring'),
        [
          'user-456',
          JSON.stringify(mockAoiData),
          'https://example.com/webhook',
          MonitoringStatus.INACTIVE,
          JSON.stringify({ frequency: 'daily' }),
        ]
      );
      expect(result.id).toBe('monitoring-123');
      expect(result.userId).toBe('user-456');
      expect(result.status).toBe(MonitoringStatus.INACTIVE);
    });

    it('should create monitoring without webhook and config', async () => {
      const mockRow = {
        id: 'monitoring-123',
        user_id: 'user-456',
        aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
        webhook_url: null,
        status: MonitoringStatus.INACTIVE,
        config: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.create('user-456', { type: 'Polygon', coordinates: [] });

      expect(result.webhookUrl).toBeNull();
      expect(result.config).toBeNull();
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        repository.create('user-456', { type: 'Polygon', coordinates: [] })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('findById', () => {
    it('should find monitoring by ID without userId', async () => {
      const mockRow = {
        id: 'monitoring-123',
        user_id: 'user-456',
        aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
        webhook_url: 'https://example.com/webhook',
        status: MonitoringStatus.ACTIVE,
        config: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.findById('monitoring-123');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM monitoring WHERE id = $1', [
        'monitoring-123',
      ]);
      expect(result.id).toBe('monitoring-123');
      expect(result.status).toBe(MonitoringStatus.ACTIVE);
    });

    it('should find monitoring by ID with userId', async () => {
      const mockRow = {
        id: 'monitoring-123',
        user_id: 'user-456',
        aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
        webhook_url: null,
        status: MonitoringStatus.INACTIVE,
        config: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.findById('monitoring-123', 'user-456');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM monitoring WHERE id = $1 AND user_id = $2',
        ['monitoring-123', 'user-456']
      );
      expect(result.userId).toBe('user-456');
    });

    it('should throw NotFoundError when monitoring not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(repository.findById('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findById('monitoring-123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    it('should update monitoring status', async () => {
      const mockRow = {
        id: 'monitoring-123',
        user_id: 'user-456',
        aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
        webhook_url: 'https://example.com/webhook',
        status: MonitoringStatus.ACTIVE,
        config: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T12:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.update('monitoring-123', {
        status: MonitoringStatus.ACTIVE,
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE monitoring SET status = $1'),
        [MonitoringStatus.ACTIVE, 'monitoring-123']
      );
      expect(result.status).toBe(MonitoringStatus.ACTIVE);
    });

    it('should update multiple fields', async () => {
      const mockRow = {
        id: 'monitoring-123',
        user_id: 'user-456',
        aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
        webhook_url: 'https://new-webhook.com',
        status: MonitoringStatus.ACTIVE,
        config: JSON.stringify({ frequency: 'hourly' }),
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T12:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const updates = {
        status: MonitoringStatus.ACTIVE,
        webhookUrl: 'https://new-webhook.com',
        config: { frequency: 'hourly' as const },
        aoiData: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      };

      const result = await repository.update('monitoring-123', updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE monitoring SET'),
        expect.arrayContaining([
          MonitoringStatus.ACTIVE,
          'https://new-webhook.com',
          expect.any(String),
          expect.any(String),
          'monitoring-123',
        ])
      );
      expect(result.status).toBe(MonitoringStatus.ACTIVE);
    });

    it('should return existing monitoring if no updates provided', async () => {
      const mockRow = {
        id: 'monitoring-123',
        user_id: 'user-456',
        aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
        webhook_url: null,
        status: MonitoringStatus.INACTIVE,
        config: null,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      await repository.update('monitoring-123', {});

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM monitoring WHERE id = $1', [
        'monitoring-123',
      ]);
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(
        repository.update('monitoring-123', { status: MonitoringStatus.ACTIVE })
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe('findByUserId', () => {
    it('should find monitoring configurations by user ID', async () => {
      const mockRows = [
        {
          id: 'monitoring-1',
          user_id: 'user-456',
          aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
          webhook_url: null,
          status: MonitoringStatus.ACTIVE,
          config: null,
          created_at: new Date('2024-01-15T10:00:00Z'),
          updated_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'monitoring-2',
          user_id: 'user-456',
          aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
          webhook_url: 'https://example.com/webhook',
          status: MonitoringStatus.INACTIVE,
          config: null,
          created_at: new Date('2024-01-14T10:00:00Z'),
          updated_at: new Date('2024-01-14T10:00:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
      } as any);

      const result = await repository.findByUserId('user-456', 50, 0);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM monitoring'),
        ['user-456', 50, 0]
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('monitoring-1');
      expect(result[1].id).toBe('monitoring-2');
    });

    it('should use default limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await repository.findByUserId('user-456');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM monitoring'),
        ['user-456', 50, 0]
      );
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findByUserId('user-456')).rejects.toThrow(DatabaseError);
    });
  });

  describe('findActive', () => {
    it('should find all active monitoring configurations', async () => {
      const mockRows = [
        {
          id: 'monitoring-1',
          user_id: 'user-456',
          aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
          webhook_url: 'https://example.com/webhook',
          status: MonitoringStatus.ACTIVE,
          config: null,
          created_at: new Date('2024-01-15T10:00:00Z'),
          updated_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'monitoring-2',
          user_id: 'user-789',
          aoi_data: JSON.stringify({ type: 'Polygon', coordinates: [] }),
          webhook_url: null,
          status: MonitoringStatus.ACTIVE,
          config: null,
          created_at: new Date('2024-01-14T10:00:00Z'),
          updated_at: new Date('2024-01-14T10:00:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
      } as any);

      const result = await repository.findActive();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM monitoring'),
        [MonitoringStatus.ACTIVE]
      );
      expect(result).toHaveLength(2);
      expect(result.every((m) => m.status === MonitoringStatus.ACTIVE)).toBe(true);
    });

    it('should return empty array when no active monitoring found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findActive();

      expect(result).toHaveLength(0);
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findActive()).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('should delete monitoring successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      await repository.delete('monitoring-123', 'user-456');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM monitoring WHERE id = $1 AND user_id = $2',
        ['monitoring-123', 'user-456']
      );
    });

    it('should throw NotFoundError when monitoring not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(repository.delete('non-existent', 'user-456')).rejects.toThrow(NotFoundError);
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.delete('monitoring-123', 'user-456')).rejects.toThrow(
        DatabaseError
      );
    });
  });
});

