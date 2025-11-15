import { query } from '@config/database';
import { Monitoring, MonitoringStatus } from '@models/monitoring';
import { NotFoundError, DatabaseError } from '@utils/errors';
import { logger } from '@utils/logger';

/**
 * Monitoring Repository
 * Data access layer for monitoring configurations
 */
export class MonitoringRepository {
  /**
   * Create a new monitoring configuration
   */
  async create(
    userId: string,
    aoiData: unknown,
    webhookUrl?: string,
    config?: unknown
  ): Promise<Monitoring> {
    try {
      const result = await query(
        `INSERT INTO monitoring (user_id, aoi_data, webhook_url, status, config)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          JSON.stringify(aoiData),
          webhookUrl || null,
          MonitoringStatus.INACTIVE,
          config ? JSON.stringify(config) : null,
        ]
      );

      return this.mapRowToMonitoring(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create monitoring', { error, userId });
      throw new DatabaseError('Failed to create monitoring', { error });
    }
  }

  /**
   * Get monitoring by ID
   */
  async findById(id: string, userId?: string): Promise<Monitoring> {
    try {
      let result;
      if (userId) {
        result = await query(
          'SELECT * FROM monitoring WHERE id = $1 AND user_id = $2',
          [id, userId]
        );
      } else {
        result = await query('SELECT * FROM monitoring WHERE id = $1', [id]);
      }

      if (result.rows.length === 0) {
        throw new NotFoundError('Monitoring');
      }

      return this.mapRowToMonitoring(result.rows[0]);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to find monitoring', { error, id });
      throw new DatabaseError('Failed to find monitoring', { error });
    }
  }

  /**
   * Update monitoring
   */
  async update(id: string, updates: Partial<Monitoring>): Promise<Monitoring> {
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.status) {
        fields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.webhookUrl !== undefined) {
        fields.push(`webhook_url = $${paramIndex++}`);
        values.push(updates.webhookUrl || null);
      }
      if (updates.config) {
        fields.push(`config = $${paramIndex++}`);
        values.push(JSON.stringify(updates.config));
      }
      if (updates.aoiData) {
        fields.push(`aoi_data = $${paramIndex++}`);
        values.push(JSON.stringify(updates.aoiData));
      }

      if (fields.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const result = await query(
        `UPDATE monitoring SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      return this.mapRowToMonitoring(result.rows[0]);
    } catch (error) {
      logger.error('Failed to update monitoring', { error, id });
      throw new DatabaseError('Failed to update monitoring', { error });
    }
  }

  /**
   * Get monitoring configurations by user ID
   */
  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<Monitoring[]> {
    try {
      const result = await query(
        `SELECT * FROM monitoring 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows.map((row) => this.mapRowToMonitoring(row));
    } catch (error) {
      logger.error('Failed to find monitoring by user', { error, userId });
      throw new DatabaseError('Failed to find monitoring', { error });
    }
  }

  /**
   * Get active monitoring configurations
   */
  async findActive(): Promise<Monitoring[]> {
    try {
      const result = await query(
        `SELECT * FROM monitoring 
         WHERE status = $1 
         ORDER BY created_at DESC`,
        [MonitoringStatus.ACTIVE]
      );

      return result.rows.map((row) => this.mapRowToMonitoring(row));
    } catch (error) {
      logger.error('Failed to find active monitoring', { error });
      throw new DatabaseError('Failed to find active monitoring', { error });
    }
  }

  /**
   * Delete monitoring
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const result = await query(
        'DELETE FROM monitoring WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (result.rowCount === 0) {
        throw new NotFoundError('Monitoring');
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to delete monitoring', { error, id });
      throw new DatabaseError('Failed to delete monitoring', { error });
    }
  }

  /**
   * Map database row to Monitoring model
   */
  private mapRowToMonitoring(row: any): Monitoring {
    return {
      id: row.id,
      userId: row.user_id,
      aoiData: row.aoi_data,
      webhookUrl: row.webhook_url,
      status: row.status as MonitoringStatus,
      config: row.config,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const monitoringRepository = new MonitoringRepository();

