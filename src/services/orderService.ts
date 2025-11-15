import { orderRepository } from '@repositories/orderRepository';
import { skyfiClient } from './skyfiClient';
import { Order, OrderCreateRequest, OrderStatus } from '@models/order';
import { NotFoundError, ValidationError } from '@utils/errors';
import { logger } from '@utils/logger';
import { sseEventEmitter } from '@sse/eventEmitter';

/**
 * Order Service
 * Business logic for order management
 */
export class OrderService {
  /**
   * Create a new order
   */
  async createOrder(userId: string, request: OrderCreateRequest): Promise<Order> {
    try {
      // Validate order data
      this.validateOrderData(request.orderData);

      // Estimate price first
      const priceEstimate = await skyfiClient.estimatePrice(request.orderData);
      const price = (priceEstimate as any)?.estimatedTotal || (priceEstimate as any)?.price;

      // Create order in database
      const order = await orderRepository.create(
        userId,
        request.orderData,
        price
      );

      // Create order in SkyFi (async - don't block)
      this.createSkyFiOrder(order).catch((error) => {
        logger.error('Failed to create SkyFi order', { error, orderId: order.id });
        // Update order status to failed
        orderRepository.update(order.id, { status: OrderStatus.FAILED });
      });

      // Emit SSE event
      sseEventEmitter.emitToUser(userId, 'order:update', {
        orderId: order.id,
        status: order.status,
      });

      return order;
    } catch (error) {
      logger.error('Failed to create order', { error, userId });
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string, userId: string): Promise<Order> {
    try {
      const order = await orderRepository.findById(orderId, userId);
      return order;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get order', { error, orderId });
      throw error;
    }
  }

  /**
   * Get order status
   */
  async getOrderStatus(orderId: string, userId: string): Promise<Order> {
    try {
      const order = await orderRepository.findById(orderId, userId);

      // If order has SkyFi order ID, fetch latest status
      if (order.skyfiOrderId) {
        try {
          const skyfiStatus = await skyfiClient.getOrderStatus(order.skyfiOrderId);
          // Update local order if status changed
          if ((skyfiStatus as any)?.status !== order.status) {
            const updatedOrder = await orderRepository.update(orderId, {
              status: (skyfiStatus as any)?.status as OrderStatus,
            });
            return updatedOrder;
          }
        } catch (error) {
          logger.warn('Failed to fetch SkyFi order status', { error, orderId });
          // Return local order status if SkyFi fetch fails
        }
      }

      return order;
    } catch (error) {
      logger.error('Failed to get order status', { error, orderId });
      throw error;
    }
  }

  /**
   * Get user's order history
   */
  async getOrderHistory(userId: string, limit = 50, offset = 0): Promise<Order[]> {
    try {
      return await orderRepository.findByUserId(userId, limit, offset);
    } catch (error) {
      logger.error('Failed to get order history', { error, userId });
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    try {
      const order = await orderRepository.findById(orderId, userId);

      if (order.status === OrderStatus.COMPLETED) {
        throw new ValidationError('Cannot cancel completed order');
      }

      if (order.status === OrderStatus.CANCELLED) {
        return order;
      }

      const updatedOrder = await orderRepository.update(orderId, {
        status: OrderStatus.CANCELLED,
      });

      // Emit SSE event
      sseEventEmitter.emitToUser(userId, 'order:update', {
        orderId: updatedOrder.id,
        status: updatedOrder.status,
      });

      return updatedOrder;
    } catch (error) {
      logger.error('Failed to cancel order', { error, orderId });
      throw error;
    }
  }

  /**
   * Create order in SkyFi
   */
  private async createSkyFiOrder(order: Order): Promise<void> {
    try {
      const skyfiOrder = await skyfiClient.createOrder(order.orderData);
      const skyfiOrderId = (skyfiOrder as any)?.id || (skyfiOrder as any)?.orderId;

      if (skyfiOrderId) {
        await orderRepository.update(order.id, {
          skyfiOrderId,
          status: OrderStatus.PROCESSING,
        });

        // Emit SSE event
        sseEventEmitter.emitToUser(order.userId, 'order:update', {
          orderId: order.id,
          status: OrderStatus.PROCESSING,
          skyfiOrderId,
        });
      }
    } catch (error) {
      logger.error('Failed to create SkyFi order', { error, orderId: order.id });
      throw error;
    }
  }

  /**
   * Validate order data
   */
  private validateOrderData(orderData: unknown): void {
    if (!orderData || typeof orderData !== 'object') {
      throw new ValidationError('Order data is required');
    }

    const data = orderData as Record<string, unknown>;

    // Basic validation - can be expanded
    if (!data.dataType && !data.areaOfInterest) {
      throw new ValidationError('Order must have dataType or areaOfInterest');
    }
  }
}

export const orderService = new OrderService();

