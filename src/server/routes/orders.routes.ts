import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { defaultRateLimiter, readRateLimiter } from '../middleware/rateLimit';
import { orderService } from '@services/orderService';
import { OrderCreateRequest } from '@models/order';
import { ValidationError } from '@utils/errors';
import { validateUUID, validatePagination } from '@utils/validation';

const router = Router();

/**
 * Create order
 * POST /v1/orders
 */
router.post(
  '/',
  authenticate,
  defaultRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const orderRequest: OrderCreateRequest = req.body;

      const order = await orderService.createOrder(userId, orderRequest);

      res.status(201).json({
        id: order.id,
        skyfiOrderId: order.skyfiOrderId,
        orderData: order.orderData,
        price: order.price,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
        });
        return;
      }
      throw error;
    }
  }
);

/**
 * Get order by ID
 * GET /v1/orders/:id
 */
router.get(
  '/:id',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const orderId = req.params.id;
      
      // Validate UUID format
      validateUUID(orderId, 'orderId');

      const order = await orderService.getOrder(orderId, userId);

      res.json({
        id: order.id,
        skyfiOrderId: order.skyfiOrderId,
        orderData: order.orderData,
        price: order.price,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Get order status
 * GET /v1/orders/:id/status
 */
router.get(
  '/:id/status',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const orderId = req.params.id;
      
      // Validate UUID format
      validateUUID(orderId, 'orderId');

      const order = await orderService.getOrderStatus(orderId, userId);

      res.json({
        id: order.id,
        status: order.status,
        skyfiOrderId: order.skyfiOrderId,
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Get order history
 * GET /v1/orders
 */
router.get(
  '/',
  authenticate,
  readRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      
      // Validate pagination parameters
      const { limit, offset } = validatePagination(req.query.limit, req.query.offset);

      const orders = await orderService.getOrderHistory(userId, limit, offset);

      res.json({
        orders: orders.map((order) => ({
          id: order.id,
          skyfiOrderId: order.skyfiOrderId,
          orderData: order.orderData,
          price: order.price,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
        })),
        total: orders.length,
        limit,
        offset,
      });
    } catch (error) {
      throw error;
    }
  }
);

/**
 * Cancel order
 * POST /v1/orders/:id/cancel
 */
router.post(
  '/:id/cancel',
  authenticate,
  defaultRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const orderId = req.params.id;
      
      // Validate UUID format
      validateUUID(orderId, 'orderId');

      const order = await orderService.cancelOrder(orderId, userId);

      res.json({
        id: order.id,
        status: order.status,
        message: 'Order cancelled successfully',
      });
    } catch (error) {
      throw error;
    }
  }
);

export default router;

