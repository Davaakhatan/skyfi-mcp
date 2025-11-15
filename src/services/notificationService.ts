import axios, { AxiosError } from 'axios';
import { config } from '@config/index';
import { logger } from '@utils/logger';
import { query } from '@config/database';
import { ExternalServiceError } from '@utils/errors';

/**
 * Notification Service
 * Handles webhook delivery and retry logic
 */
export class NotificationService {
  /**
   * Send webhook notification
   */
  async sendWebhook(
    webhookUrl: string,
    eventType: string,
    payload: unknown
  ): Promise<void> {
    try {
      const response = await axios.post(
        webhookUrl,
        {
          event: eventType,
          data: payload,
          timestamp: new Date().toISOString(),
        },
        {
          timeout: config.webhook.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SkyFi-MCP/1.0.0',
          },
        }
      );

      // Log successful delivery
      await this.logWebhookDelivery(webhookUrl, eventType, payload, 'delivered');

      logger.info('Webhook delivered successfully', {
        webhookUrl,
        eventType,
        status: response.status,
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Webhook delivery failed', {
        error: axiosError.message,
        webhookUrl,
        eventType,
      });

      // Log failed delivery
      await this.logWebhookDelivery(
        webhookUrl,
        eventType,
        payload,
        'failed',
        axiosError.message
      );

      throw new ExternalServiceError(
        'Webhook',
        `Failed to deliver webhook: ${axiosError.message}`,
        {
          webhookUrl,
          eventType,
        }
      );
    }
  }

  /**
   * Send webhook with retry logic
   */
  async sendWebhookWithRetry(
    webhookUrl: string,
    eventType: string,
    payload: unknown,
    monitoringId?: string
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.webhook.maxRetries; attempt++) {
      try {
        await this.sendWebhook(webhookUrl, eventType, payload);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        logger.warn('Webhook retry attempt', {
          attempt,
          maxRetries: config.webhook.maxRetries,
          webhookUrl,
          eventType,
        });

        if (attempt < config.webhook.maxRetries) {
          // Wait before retry with exponential backoff
          const delay = config.webhook.retryDelayMs * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed - log to database for manual retry
    if (monitoringId) {
      await this.createWebhookRecord(monitoringId, eventType, payload, 'failed');
    }

    throw lastError || new Error('Webhook delivery failed after retries');
  }

  /**
   * Retry failed webhook
   */
  async retryFailedWebhook(webhookId: string): Promise<void> {
    try {
      const result = await query(
        'SELECT * FROM webhooks WHERE id = $1',
        [webhookId]
      );

      if (result.rows.length === 0) {
        throw new Error('Webhook not found');
      }

      const webhook = result.rows[0];
      const monitoring = await query(
        'SELECT webhook_url FROM monitoring WHERE id = $1',
        [webhook.monitoring_id]
      );

      if (monitoring.rows.length === 0 || !monitoring.rows[0].webhook_url) {
        throw new Error('Monitoring or webhook URL not found');
      }

      await this.sendWebhookWithRetry(
        monitoring.rows[0].webhook_url,
        webhook.event_type,
        webhook.payload,
        webhook.monitoring_id
      );

      // Update webhook status
      await query(
        'UPDATE webhooks SET status = $1, delivered_at = $2 WHERE id = $3',
        ['delivered', new Date(), webhookId]
      );
    } catch (error) {
      logger.error('Failed to retry webhook', { error, webhookId });
      throw error;
    }
  }

  /**
   * Get webhook delivery status
   */
  async getDeliveryStatus(webhookId: string): Promise<unknown> {
    try {
      const result = await query(
        'SELECT * FROM webhooks WHERE id = $1',
        [webhookId]
      );

      if (result.rows.length === 0) {
        throw new Error('Webhook not found');
      }

      return {
        id: result.rows[0].id,
        status: result.rows[0].status,
        retryCount: result.rows[0].retry_count,
        deliveredAt: result.rows[0].delivered_at,
        createdAt: result.rows[0].created_at,
      };
    } catch (error) {
      logger.error('Failed to get webhook status', { error, webhookId });
      throw error;
    }
  }

  /**
   * Log webhook delivery
   */
  private async logWebhookDelivery(
    _webhookUrl: string,
    eventType: string,
    payload: unknown,
    status: string,
    _error?: string
  ): Promise<void> {
    try {
      // Extract monitoring ID from webhook URL if possible
      // This is a simplified version - in production, you'd track this better
      await query(
        `INSERT INTO webhooks (monitoring_id, event_type, payload, status, retry_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [null, eventType, JSON.stringify(payload), status, 0]
      );
    } catch (err) {
      logger.error('Failed to log webhook delivery', { error: err });
      // Don't throw - logging failure shouldn't break webhook delivery
    }
  }

  /**
   * Create webhook record
   */
  private async createWebhookRecord(
    monitoringId: string,
    eventType: string,
    payload: unknown,
    status: string
  ): Promise<string> {
    try {
      const result = await query(
        `INSERT INTO webhooks (monitoring_id, event_type, payload, status, retry_count)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [monitoringId, eventType, JSON.stringify(payload), status, 0]
      );

      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to create webhook record', { error });
      throw error;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const notificationService = new NotificationService();

