/**
 * Integration tests for Order workflow
 * Tests the complete flow from service through repository to database
 * 
 * TODO: These tests require a test database to be set up.
 * Run with: DB_NAME=skyfi_mcp_test npm test -- --testPathPattern="integration"
 */

import { orderService } from '@services/orderService';
import { orderRepository } from '@repositories/orderRepository';
import { skyfiClient } from '@services/skyfiClient';
import { createTestUser, cleanupAllTestData, isDatabaseAvailable } from './helpers';
import { OrderStatus } from '@models/order';

// Mock SkyFi client
jest.mock('@services/skyfiClient', () => ({
  skyfiClient: {
    createOrder: jest.fn(),
    getOrderStatus: jest.fn(),
    estimatePrice: jest.fn(),
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

// Mock SSE event emitter - must use the same path as the service
jest.mock('@sse/eventEmitter', () => ({
  sseEventEmitter: {
    emitToUser: jest.fn(),
    emit: jest.fn(),
  },
}), { virtual: true });

const mockSkyfiClient = skyfiClient as jest.Mocked<typeof skyfiClient>;

describe('Order Integration Tests', () => {
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

  describe('Order Creation Workflow', () => {
    it('should create an order through service and save to repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const orderData = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      const mockSkyfiResponse = {
        id: 'skyfi-order-123',
        status: 'pending',
        estimatedPrice: 100.50,
      };

      mockSkyfiClient.createOrder.mockResolvedValueOnce(mockSkyfiResponse as any);
      mockSkyfiClient.estimatePrice.mockResolvedValueOnce({
        estimatedTotal: 100.50,
        currency: 'USD',
      } as any);

      // Create order through service
      const order = await orderService.createOrder(userId, { orderData });

      expect(order).toHaveProperty('id');
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.orderData).toEqual(orderData);
      expect(order.userId).toBe(userId);

      // Verify order was saved to database through repository
      const savedOrder = await orderRepository.findById(order.id, userId);
      expect(savedOrder).toBeDefined();
      expect(savedOrder.userId).toBe(userId);
      expect(savedOrder.status).toBe(OrderStatus.PENDING);
    });

    it('should handle order creation with price estimation', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      const orderData = {
        dataType: 'aerial',
        areaOfInterest: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
        },
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce({
        estimatedTotal: 250.75,
        currency: 'USD',
      } as any);

      mockSkyfiClient.createOrder.mockResolvedValueOnce({
        id: 'skyfi-order-456',
        status: 'pending',
        estimatedPrice: 250.75,
      } as any);

      const order = await orderService.createOrder(userId, { orderData });

      expect(order.price).toBe(250.75);
      expect(mockSkyfiClient.estimatePrice).toHaveBeenCalled();

      // Verify price in database
      const dbOrder = await orderRepository.findById(order.id, userId);
      expect(dbOrder.price).toBe(250.75);
    });
  });

  describe('Order Retrieval Workflow', () => {
    it('should retrieve order by ID through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      // Create an order first
      const orderData = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.createOrder.mockResolvedValueOnce({
        id: 'skyfi-order-789',
        status: 'pending',
      } as any);

      const createdOrder = await orderService.createOrder(userId, { orderData });
      const orderId = createdOrder.id;

      // Retrieve the order through service
      const retrievedOrder = await orderService.getOrder(orderId, userId);

      expect(retrievedOrder.id).toBe(orderId);
      expect(retrievedOrder.userId).toBe(userId);

      // Verify repository can also retrieve it
      const dbOrder = await orderRepository.findById(orderId, userId);
      expect(dbOrder.id).toBe(orderId);
    });

    it('should retrieve order history for user', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      // Create multiple orders
      const orderData = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.createOrder.mockResolvedValue({
        id: 'skyfi-order-1',
        status: 'pending',
      } as any);

      await orderService.createOrder(userId, { orderData });
      await orderService.createOrder(userId, { orderData });

      // Get order history through service
      const history = await orderService.getOrderHistory(userId);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.every((order) => order.userId === userId)).toBe(true);
    });
  });

  describe('Order Status Updates', () => {
    it('should update order status through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }
      // Create an order
      const orderData = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon' as const,
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.createOrder.mockResolvedValueOnce({
        id: 'skyfi-order-status',
        status: 'pending',
      } as any);

      const createdOrder = await orderService.createOrder(userId, { orderData });
      const orderId = createdOrder.id;

      // Update order status through repository (service doesn't have updateOrderStatus method)
      const updatedOrder = await orderRepository.update(orderId, {
        status: OrderStatus.PROCESSING,
      });

      expect(updatedOrder.status).toBe(OrderStatus.PROCESSING);

      // Verify in database through repository
      const dbOrder = await orderRepository.findById(orderId, userId);
      expect(dbOrder.status).toBe(OrderStatus.PROCESSING);
    });
  });
});

