import { monitoringRepository } from '@repositories/monitoringRepository';
import { skyfiClient } from './skyfiClient';
import {
  Monitoring,
  MonitoringCreateRequest,
  MonitoringStatus,
} from '@models/monitoring';
import { NotFoundError, ValidationError } from '@utils/errors';
import { logger } from '@utils/logger';
import { sseEventEmitter } from '@sse/eventEmitter';

/**
 * Monitoring Service
 * Business logic for AOI monitoring and webhook management
 */
export class MonitoringService {
  /**
   * Create a new monitoring configuration
   */
  async createMonitoring(
    userId: string,
    request: MonitoringCreateRequest
  ): Promise<Monitoring> {
    try {
      // Validate AOI data
      this.validateAOIData(request.aoiData);

      // Validate webhook URL if provided
      if (request.webhookUrl) {
        this.validateWebhookUrl(request.webhookUrl);
      }

      // Create monitoring in database
      const monitoring = await monitoringRepository.create(
        userId,
        request.aoiData,
        request.webhookUrl,
        request.config
      );

      // Setup monitoring in SkyFi (async - don't block)
      this.setupSkyFiMonitoring(monitoring).catch((error) => {
        logger.error('Failed to setup SkyFi monitoring', {
          error,
          monitoringId: monitoring.id,
        });
      });

      // Emit SSE event
      sseEventEmitter.emitToUser(userId, 'monitoring:update', {
        monitoringId: monitoring.id,
        status: monitoring.status,
      });

      return monitoring;
    } catch (error) {
      logger.error('Failed to create monitoring', { error, userId });
      throw error;
    }
  }

  /**
   * Get monitoring by ID
   */
  async getMonitoring(
    monitoringId: string,
    userId: string
  ): Promise<Monitoring> {
    try {
      const monitoring = await monitoringRepository.findById(
        monitoringId,
        userId
      );
      return monitoring;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Failed to get monitoring', { error, monitoringId });
      throw error;
    }
  }

  /**
   * Get monitoring status
   */
  async getMonitoringStatus(
    monitoringId: string,
    userId: string
  ): Promise<Monitoring> {
    try {
      const monitoring = await monitoringRepository.findById(
        monitoringId,
        userId
      );

      // Fetch latest status from SkyFi
      try {
        const skyfiStatus = await skyfiClient.getMonitoringStatus(monitoringId);
        // Update local monitoring if status changed
        if ((skyfiStatus as any)?.status !== monitoring.status) {
          const updatedMonitoring = await monitoringRepository.update(
            monitoringId,
            {
              status: (skyfiStatus as any)?.status as MonitoringStatus,
            }
          );
          return updatedMonitoring;
        }
      } catch (error) {
        logger.warn('Failed to fetch SkyFi monitoring status', {
          error,
          monitoringId,
        });
        // Return local monitoring status if SkyFi fetch fails
      }

      return monitoring;
    } catch (error) {
      logger.error('Failed to get monitoring status', { error, monitoringId });
      throw error;
    }
  }

  /**
   * Update monitoring configuration
   */
  async updateMonitoring(
    monitoringId: string,
    userId: string,
    updates: Partial<MonitoringCreateRequest>
  ): Promise<Monitoring> {
    try {
      const monitoring = await monitoringRepository.findById(
        monitoringId,
        userId
      );

      // Validate updates
      if (updates.aoiData) {
        this.validateAOIData(updates.aoiData);
      }
      if (updates.webhookUrl) {
        this.validateWebhookUrl(updates.webhookUrl);
      }

      // Update in database
      const updatedMonitoring = await monitoringRepository.update(
        monitoringId,
        {
          aoiData: updates.aoiData,
          webhookUrl: updates.webhookUrl,
          config: updates.config,
        }
      );

      // Emit SSE event
      sseEventEmitter.emitToUser(userId, 'monitoring:update', {
        monitoringId: updatedMonitoring.id,
        status: updatedMonitoring.status,
      });

      return updatedMonitoring;
    } catch (error) {
      logger.error('Failed to update monitoring', { error, monitoringId });
      throw error;
    }
  }

  /**
   * Activate monitoring
   */
  async activateMonitoring(
    monitoringId: string,
    userId: string
  ): Promise<Monitoring> {
    try {
      const monitoring = await monitoringRepository.findById(
        monitoringId,
        userId
      );

      if (monitoring.status === MonitoringStatus.ACTIVE) {
        return monitoring;
      }

      const updatedMonitoring = await monitoringRepository.update(
        monitoringId,
        {
          status: MonitoringStatus.ACTIVE,
        }
      );

      // Emit SSE event
      sseEventEmitter.emitToUser(userId, 'monitoring:update', {
        monitoringId: updatedMonitoring.id,
        status: updatedMonitoring.status,
      });

      return updatedMonitoring;
    } catch (error) {
      logger.error('Failed to activate monitoring', { error, monitoringId });
      throw error;
    }
  }

  /**
   * Deactivate monitoring
   */
  async deactivateMonitoring(
    monitoringId: string,
    userId: string
  ): Promise<Monitoring> {
    try {
      const monitoring = await monitoringRepository.findById(
        monitoringId,
        userId
      );

      if (monitoring.status === MonitoringStatus.INACTIVE) {
        return monitoring;
      }

      const updatedMonitoring = await monitoringRepository.update(
        monitoringId,
        {
          status: MonitoringStatus.INACTIVE,
        }
      );

      // Emit SSE event
      sseEventEmitter.emitToUser(userId, 'monitoring:update', {
        monitoringId: updatedMonitoring.id,
        status: updatedMonitoring.status,
      });

      return updatedMonitoring;
    } catch (error) {
      logger.error('Failed to deactivate monitoring', { error, monitoringId });
      throw error;
    }
  }

  /**
   * Delete monitoring
   */
  async deleteMonitoring(monitoringId: string, userId: string): Promise<void> {
    try {
      await monitoringRepository.delete(monitoringId, userId);

      // Emit SSE event
      sseEventEmitter.emitToUser(userId, 'monitoring:update', {
        monitoringId,
        deleted: true,
      });
    } catch (error) {
      logger.error('Failed to delete monitoring', { error, monitoringId });
      throw error;
    }
  }

  /**
   * Get user's monitoring configurations
   */
  async getUserMonitoring(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<Monitoring[]> {
    try {
      return await monitoringRepository.findByUserId(userId, limit, offset);
    } catch (error) {
      logger.error('Failed to get user monitoring', { error, userId });
      throw error;
    }
  }

  /**
   * Setup monitoring in SkyFi
   */
  private async setupSkyFiMonitoring(monitoring: Monitoring): Promise<void> {
    try {
      const skyfiMonitoring = await skyfiClient.setupMonitoring({
        aoiData: monitoring.aoiData,
        webhookUrl: monitoring.webhookUrl,
        config: monitoring.config,
      });

      // Update monitoring with SkyFi ID if returned
      if ((skyfiMonitoring as any)?.id) {
        await monitoringRepository.update(monitoring.id, {
          status: MonitoringStatus.ACTIVE,
        });

        // Emit SSE event
        sseEventEmitter.emitToUser(monitoring.userId, 'monitoring:update', {
          monitoringId: monitoring.id,
          status: MonitoringStatus.ACTIVE,
        });
      }
    } catch (error) {
      logger.error('Failed to setup SkyFi monitoring', {
        error,
        monitoringId: monitoring.id,
      });
      throw error;
    }
  }

  /**
   * Validate AOI data
   */
  private validateAOIData(aoiData: unknown): void {
    if (!aoiData || typeof aoiData !== 'object') {
      throw new ValidationError('AOI data is required');
    }

    const aoi = aoiData as Record<string, unknown>;

    if (aoi.type !== 'Polygon' && aoi.type !== 'MultiPolygon') {
      throw new ValidationError(
        'AOI type must be Polygon or MultiPolygon'
      );
    }

    if (!Array.isArray(aoi.coordinates)) {
      throw new ValidationError('AOI coordinates are required');
    }
  }

  /**
   * Validate webhook URL
   */
  private validateWebhookUrl(url: string): void {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
        throw new ValidationError('Webhook URL must use http or https');
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid webhook URL format');
    }
  }
}

export const monitoringService = new MonitoringService();

