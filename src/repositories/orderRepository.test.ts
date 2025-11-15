import { OrderRepository } from './orderRepository';
import { query } from '@config/database';
import { OrderStatus } from '@models/order';
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

describe('OrderRepository', () => {
  let repository: OrderRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new OrderRepository();
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const mockOrderData = {
        aoi: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        productType: 'satellite',
      };

      const mockRow = {
        id: 'order-123',
        user_id: 'user-456',
        skyfi_order_id: null,
        order_data: JSON.stringify(mockOrderData),
        price: '100.50',
        status: OrderStatus.PENDING,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.create('user-456', mockOrderData, 100.50);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO orders'),
        ['user-456', JSON.stringify(mockOrderData), 100.50, OrderStatus.PENDING]
      );
      expect(result.id).toBe('order-123');
      expect(result.userId).toBe('user-456');
      expect(result.price).toBe(100.50);
      expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('should create order without price', async () => {
      const mockRow = {
        id: 'order-123',
        user_id: 'user-456',
        skyfi_order_id: null,
        order_data: JSON.stringify({ test: 'data' }),
        price: null,
        status: OrderStatus.PENDING,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.create('user-456', { test: 'data' });

      expect(result.price).toBeUndefined();
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.create('user-456', { test: 'data' })).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('findById', () => {
    it('should find order by ID without userId', async () => {
      const mockRow = {
        id: 'order-123',
        user_id: 'user-456',
        skyfi_order_id: 'skyfi-789',
        order_data: JSON.stringify({ test: 'data' }),
        price: '100.50',
        status: OrderStatus.COMPLETED,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T11:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.findById('order-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE id = $1',
        ['order-123']
      );
      expect(result.id).toBe('order-123');
      expect(result.skyfiOrderId).toBe('skyfi-789');
    });

    it('should find order by ID with userId', async () => {
      const mockRow = {
        id: 'order-123',
        user_id: 'user-456',
        skyfi_order_id: null,
        order_data: JSON.stringify({ test: 'data' }),
        price: null,
        status: OrderStatus.PENDING,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.findById('order-123', 'user-456');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
        ['order-123', 'user-456']
      );
      expect(result.userId).toBe('user-456');
    });

    it('should throw NotFoundError when order not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await expect(repository.findById('non-existent')).rejects.toThrow(NotFoundError);
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.findById('order-123')).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    it('should update order status', async () => {
      const mockRow = {
        id: 'order-123',
        user_id: 'user-456',
        skyfi_order_id: null,
        order_data: JSON.stringify({ test: 'data' }),
        price: '100.50',
        status: OrderStatus.COMPLETED,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T12:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const result = await repository.update('order-123', { status: OrderStatus.COMPLETED });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders SET status = $1'),
        [OrderStatus.COMPLETED, 'order-123']
      );
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should update multiple fields', async () => {
      const mockRow = {
        id: 'order-123',
        user_id: 'user-456',
        skyfi_order_id: 'skyfi-789',
        order_data: JSON.stringify({ updated: 'data' }),
        price: '150.75',
        status: OrderStatus.PROCESSING,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T12:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      const updates = {
        status: OrderStatus.PROCESSING,
        price: 150.75,
        skyfiOrderId: 'skyfi-789',
        orderData: { updated: 'data' },
      };

      const result = await repository.update('order-123', updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders SET'),
        expect.arrayContaining([OrderStatus.PROCESSING, 150.75, 'skyfi-789', expect.any(String), 'order-123'])
      );
      expect(result.status).toBe(OrderStatus.PROCESSING);
      expect(result.price).toBe(150.75);
    });

    it('should return existing order if no updates provided', async () => {
      const mockRow = {
        id: 'order-123',
        user_id: 'user-456',
        skyfi_order_id: null,
        order_data: JSON.stringify({ test: 'data' }),
        price: '100.50',
        status: OrderStatus.PENDING,
        created_at: new Date('2024-01-15T10:00:00Z'),
        updated_at: new Date('2024-01-15T10:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockRow],
        rowCount: 1,
      } as any);

      await repository.update('order-123', {});

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM orders WHERE id = $1',
        ['order-123']
      );
    });

    it('should throw DatabaseError on database failure', async () => {
      const dbError = new Error('Database error');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.update('order-123', { status: OrderStatus.COMPLETED })).rejects.toThrow(
        DatabaseError
      );
    });
  });

  describe('findByUserId', () => {
    it('should find orders by user ID', async () => {
      const mockRows = [
        {
          id: 'order-1',
          user_id: 'user-456',
          skyfi_order_id: null,
          order_data: JSON.stringify({ test: 'data1' }),
          price: '100.50',
          status: OrderStatus.PENDING,
          created_at: new Date('2024-01-15T10:00:00Z'),
          updated_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: 'order-2',
          user_id: 'user-456',
          skyfi_order_id: null,
          order_data: JSON.stringify({ test: 'data2' }),
          price: '200.75',
          status: OrderStatus.COMPLETED,
          created_at: new Date('2024-01-14T10:00:00Z'),
          updated_at: new Date('2024-01-14T11:00:00Z'),
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockRows,
        rowCount: 2,
      } as any);

      const result = await repository.findByUserId('user-456', 50, 0);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM orders'),
        ['user-456', 50, 0]
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('order-1');
      expect(result[1].id).toBe('order-2');
    });

    it('should use default limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      await repository.findByUserId('user-456');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM orders'),
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

