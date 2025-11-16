import { OrderService } from './orderService';
import { orderRepository } from '@repositories/orderRepository';
import { skyfiClient } from './skyfiClient';
import { sseEventEmitter } from '@sse/eventEmitter';
import { NotFoundError, ValidationError } from '@utils/errors';
import { OrderStatus } from '@models/order';

// Mock dependencies
jest.mock('@repositories/orderRepository');
jest.mock('./skyfiClient');
jest.mock('@sse/eventEmitter');
jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockOrderRepository = orderRepository as jest.Mocked<typeof orderRepository>;
const mockSkyfiClient = skyfiClient as jest.Mocked<typeof skyfiClient>;
const mockSseEventEmitter = sseEventEmitter as jest.Mocked<typeof sseEventEmitter>;

describe('OrderService', () => {
  let orderService: OrderService;

  beforeEach(() => {
    jest.clearAllMocks();
    orderService = new OrderService();
  });

  describe('createOrder', () => {
    const userId = 'user-123';
    const mockOrderData = {
      aoi: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      productType: 'satellite',
    };

    it('should create order successfully', async () => {
      const mockOrder = {
        id: 'order-123',
        userId,
        orderData: mockOrderData,
        price: 100.50,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce({ estimatedTotal: 100.50 });
      mockOrderRepository.create.mockResolvedValueOnce(mockOrder);

      const result = await orderService.createOrder(userId, { orderData: mockOrderData });

      expect(result).toEqual(mockOrder);
      expect(mockSkyfiClient.estimatePrice).toHaveBeenCalledWith(mockOrderData);
      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        userId,
        mockOrderData,
        100.50
      );
      expect(mockSseEventEmitter.emitToUser).toHaveBeenCalledWith(
        userId,
        'order:update',
        expect.objectContaining({ orderId: 'order-123' })
      );
    });

    it('should throw ValidationError for invalid order data', async () => {
      const invalidOrderData = null as any;

      await expect(
        orderService.createOrder(userId, { orderData: invalidOrderData })
      ).rejects.toThrow(ValidationError);
    });

    it('should handle SkyFi order creation failure', async () => {
      const mockOrder = {
        id: 'order-123',
        userId,
        orderData: mockOrderData,
        price: 100.50,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce({ estimatedTotal: 100.50 });
      mockOrderRepository.create.mockResolvedValueOnce(mockOrder);
      mockSkyfiClient.createOrder.mockRejectedValueOnce(new Error('SkyFi API error'));

      // Should not throw - error is handled asynchronously
      const result = await orderService.createOrder(userId, { orderData: mockOrderData });

      expect(result).toEqual(mockOrder);
      // Give async error handling time to execute
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOrderRepository.update).toHaveBeenCalledWith(
        'order-123',
        { status: OrderStatus.FAILED }
      );
    });
  });

  describe('getOrder', () => {
    it('should get order by ID', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userId,
        orderData: {},
        price: 100,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepository.findById.mockResolvedValueOnce(mockOrder);

      const result = await orderService.getOrder(orderId, userId);

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith(orderId, userId);
    });

    it('should throw NotFoundError when order not found', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';

      mockOrderRepository.findById.mockRejectedValueOnce(new NotFoundError('Order'));

      await expect(orderService.getOrder(orderId, userId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getOrderStatus', () => {
    it('should get order status from SkyFi', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userId,
        orderData: {},
        price: 100,
        status: OrderStatus.PENDING,
        skyfiOrderId: 'skyfi-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepository.findById.mockResolvedValueOnce(mockOrder);
      mockSkyfiClient.getOrderStatus.mockResolvedValueOnce({ status: OrderStatus.COMPLETED });

      const result = await orderService.getOrderStatus(orderId, userId);

      expect(mockSkyfiClient.getOrderStatus).toHaveBeenCalledWith('skyfi-123');
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('should return local status if SkyFi fetch fails', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userId,
        orderData: {},
        price: 100,
        status: OrderStatus.PENDING,
        skyfiOrderId: 'skyfi-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepository.findById.mockResolvedValueOnce(mockOrder);
      mockSkyfiClient.getOrderStatus.mockRejectedValueOnce(new Error('SkyFi error'));

      const result = await orderService.getOrderStatus(orderId, userId);

      expect(result.status).toBe(OrderStatus.PENDING);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userId,
        orderData: {},
        price: 100,
        status: OrderStatus.PENDING,
        skyfiOrderId: 'skyfi-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

      mockOrderRepository.findById.mockResolvedValueOnce(mockOrder);
      mockOrderRepository.update.mockResolvedValueOnce(updatedOrder);

      const result = await orderService.cancelOrder(orderId, userId);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockOrderRepository.update).toHaveBeenCalledWith(orderId, {
        status: OrderStatus.CANCELLED,
      });
      expect(mockSseEventEmitter.emitToUser).toHaveBeenCalledWith(
        userId,
        'order:update',
        expect.objectContaining({ orderId, status: OrderStatus.CANCELLED })
      );
    });

    it('should throw NotFoundError when order not found', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';

      mockOrderRepository.findById.mockRejectedValueOnce(new NotFoundError('Order'));

      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when order cannot be cancelled', async () => {
      const userId = 'user-123';
      const orderId = 'order-123';
      const mockOrder = {
        id: orderId,
        userId,
        orderData: {},
        price: 100,
        status: OrderStatus.COMPLETED, // Already completed
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrderRepository.findById.mockResolvedValueOnce(mockOrder);

      await expect(orderService.cancelOrder(orderId, userId)).rejects.toThrow(ValidationError);
    });
  });

  describe('getOrderHistory', () => {
    it('should get user orders', async () => {
      const userId = 'user-123';
      const mockOrders = [
        {
          id: 'order-1',
          userId,
          orderData: {},
          price: 100,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'order-2',
          userId,
          orderData: {},
          price: 200,
          status: OrderStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockOrderRepository.findByUserId.mockResolvedValueOnce(mockOrders);

      const result = await orderService.getOrderHistory(userId, 10, 0);

      expect(result).toEqual(mockOrders);
      expect(mockOrderRepository.findByUserId).toHaveBeenCalledWith(userId, 10, 0);
    });
  });
});

