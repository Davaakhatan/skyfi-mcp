import { query } from '@config/database';
import { Search } from '@models/search';
import { DatabaseError } from '@utils/errors';
import { logger } from '@utils/logger';

/**
 * Search Repository
 * Data access layer for search history
 */
export class SearchRepository {
  /**
   * Create a new search
   */
  async create(userId: string, query: unknown, results?: unknown, context?: unknown): Promise<Search> {
    try {
      const result = await query(
        `INSERT INTO searches (user_id, query, results, context)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          userId,
          JSON.stringify(query),
          results ? JSON.stringify(results) : null,
          context ? JSON.stringify(context) : null,
        ]
      );

      return this.mapRowToSearch(result.rows[0]);
    } catch (error) {
      logger.error('Failed to create search', { error, userId });
      throw new DatabaseError('Failed to create search', { error });
    }
  }

  /**
   * Get search by ID
   */
  async findById(id: string, userId?: string): Promise<Search> {
    try {
      let result;
      if (userId) {
        result = await query(
          'SELECT * FROM searches WHERE id = $1 AND user_id = $2',
          [id, userId]
        );
      } else {
        result = await query('SELECT * FROM searches WHERE id = $1', [id]);
      }

      if (result.rows.length === 0) {
        throw new Error('Search not found');
      }

      return this.mapRowToSearch(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find search', { error, id });
      throw new DatabaseError('Failed to find search', { error });
    }
  }

  /**
   * Get search history by user ID
   */
  async findByUserId(userId: string, limit = 50, offset = 0): Promise<Search[]> {
    try {
      const result = await query(
        `SELECT * FROM searches 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows.map((row) => this.mapRowToSearch(row));
    } catch (error) {
      logger.error('Failed to find searches by user', { error, userId });
      throw new DatabaseError('Failed to find searches', { error });
    }
  }

  /**
   * Map database row to Search model
   */
  private mapRowToSearch(row: any): Search {
    return {
      id: row.id,
      userId: row.user_id,
      query: row.query,
      results: row.results,
      context: row.context,
      createdAt: new Date(row.created_at),
    };
  }
}

export const searchRepository = new SearchRepository();

