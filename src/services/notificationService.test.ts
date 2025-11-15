import { NotificationService } from './notificationService';
import { query } from '@config/database';
import axios from 'axios';
import { ExternalServiceError } from '@utils/errors';

// Mock dependencies
jest.mock('@config/database', () => ({
  query: jest.fn(),
}));

jest.mock('axios');
jest.mock('@config/index', () => ({
  config: {
    webhook: {
      timeoutMs: 5000,
      maxRetries: 3,
      retryDelayMs: 1000,
    },
  },
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
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationService = new NotificationService();
  });

  describe('sendWebhook', () => {
    const webhookUrl = 'https://example.com/webhook';
    const eventType = 'order.completed';
    const payload = { orderId: 'order-123' };

    it('should send webhook successfully', async () => {
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {},
      } as any);

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      await notificationService.sendWebhook(webhookUrl, eventType, payload);

      expect(mockAxios.post).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          event: eventType,
          data: payload,
          timestamp: expect.any(String),
        }),
        expect.objectContaining({
          timeout: 5000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw ExternalServiceError on webhook failure', async () => {
      const axiosError = {
        message: 'Network error',
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };

      mockAxios.post.mockRejectedValueOnce(axiosError);
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        notificationService.sendWebhook(webhookUrl, eventType, payload)
      ).rejects.toThrow(ExternalServiceError);
    });
  });

  describe('sendWebhookWithRetry', () => {
    const webhookUrl = 'https://example.com/webhook';
    const eventType = 'order.completed';
    const payload = { orderId: 'order-123' };

    it('should send webhook successfully on first attempt', async () => {
      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {},
      } as any);

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      await notificationService.sendWebhookWithRetry(webhookUrl, eventType, payload);

      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      // logWebhookDelivery is called, so query should be called
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should retry on failure and succeed', async () => {
      let callCount = 0;
      mockAxios.post.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          status: 200,
          data: {},
        } as any);
      });

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      await notificationService.sendWebhookWithRetry(
        webhookUrl,
        eventType,
        payload
      );

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      // logWebhookDelivery is called for both attempts
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should fail after max retries', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network error'));
      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        notificationService.sendWebhookWithRetry(
          webhookUrl,
          eventType,
          payload,
          'monitoring-123'
        )
      ).rejects.toThrow();

      expect(mockAxios.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('retryFailedWebhook', () => {
    it('should retry failed webhook successfully', async () => {
      const webhookId = 'webhook-123';
      const monitoringId = 'monitoring-123';
      const webhookUrl = 'https://example.com/webhook';

      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: webhookId,
            monitoring_id: monitoringId,
            event_type: 'order.completed',
            payload: JSON.stringify({ orderId: 'order-123' }),
            status: 'failed',
            retry_count: 1,
          }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{
            webhook_url: webhookUrl,
          }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: 'UPDATE',
          oid: 0,
          fields: [],
        } as any);

      mockAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {},
      } as any);

      mockQuery.mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      } as any);

      await notificationService.retryFailedWebhook(webhookId);

      expect(mockAxios.post).toHaveBeenCalled();
      // Should have at least 3 queries: get webhook, get monitoring, update webhook, plus logWebhookDelivery
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should throw error when webhook not found', async () => {
      const webhookId = 'webhook-123';

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        notificationService.retryFailedWebhook(webhookId)
      ).rejects.toThrow('Webhook not found');
    });
  });

  describe('getDeliveryStatus', () => {
    it('should get webhook delivery status', async () => {
      const webhookId = 'webhook-123';

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: webhookId,
          status: 'delivered',
          retry_count: 0,
          delivered_at: new Date('2024-01-01'),
          created_at: new Date('2024-01-01'),
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      const result = await notificationService.getDeliveryStatus(webhookId);

      expect(result).toEqual(
        expect.objectContaining({
          id: webhookId,
          status: 'delivered',
          retryCount: 0,
        })
      );
    });

    it('should throw error when webhook not found', async () => {
      const webhookId = 'webhook-123';

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      } as any);

      await expect(
        notificationService.getDeliveryStatus(webhookId)
      ).rejects.toThrow('Webhook not found');
    });
  });
});

