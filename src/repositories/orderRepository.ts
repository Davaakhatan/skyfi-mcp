import { query } from '@config/database';
import { Order, OrderStatus } from '@models/order';
import { NotFoundError, DatabaseError } from '@utils/errors';
import { logger } from '@utils/logger';

/**
 * Order Repository
 * Data access layer for orders
 */
export class OrderRepository {
  /**
   * Create a new order
   */
  async create(userId: string, orderData: unknown, price?: number): Promise<Order> {
    try {
      const result = await query(
        `INSERT INTO orders (user_id, order_data, price, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, JSON.stringify(orderData), price, OrderStatus.PENDING]
      );

      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create order', { error, userId });
      throw new DatabaseError('Failed to create order', { error });
    }
  }

  /**
   * Get order by ID
   */
  async findById(id: string, userId?: string): Promise<Order> {
    try {
      let result;
      if (userId) {
        result = await query(
          'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
          [id, userId]
        );
      } else {
        result = await query('SELECT * FROM orders WHERE id = $1', [id]);
      }

      if (result.rows.length === 0) {
        throw new NotFoundError('Order');
      }

      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to find order', { error, id });
      throw new DatabaseError('Failed to find order', { error });
    }
  }

  /**
   * Update order
   */
  async update(id: string, updates: Partial<Order>): Promise<Order> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.status) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.price !== undefined) {
        fields.push(`price = $${paramIndex++}`);
        values.push(updates.price);
      }
      if (updates.skyfiOrderId) {
        fields.push(`skyfi_order_id = $${paramIndex++}`);
        values.push(updates.skyfiOrderId);
      }
      if (updates.orderData) {
        fields.push(`order_data = $${paramIndex++}`);
        values.push(JSON.stringify(updates.orderData));
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const result = await query(
        `UPDATE orders SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update order', { error, id });
      throw new DatabaseError('Failed to update order', { error });
    }
  }

  /**
   * Get orders by user ID
   */
  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Order[]> {
    try {
      const result = await query(
        `SELECT * FROM orders 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows.map((row) => this.mapRowToOrder(row));
    } catch (error) {
      logger.error('Failed to find orders by user', { error, userId });
      throw new DatabaseError('Failed to find orders', { error });
    }
  }

  /**
   * Map database row to Order model
   */
  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      userId: row.user_id,
      skyfiOrderId: row.skyfi_order_id,
      orderData: row.order_data,
      price: row.price ? parseFloat(row.price) : undefined,
      status: row.status as OrderStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const orderRepository = new OrderRepository();

