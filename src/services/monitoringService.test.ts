import { MonitoringService } from './monitoringService';
import { monitoringRepository } from '@repositories/monitoringRepository';
import { skyfiClient } from './skyfiClient';
import { sseEventEmitter } from '@sse/eventEmitter';
import { NotFoundError, ValidationError } from '@utils/errors';
import { MonitoringStatus } from '@models/monitoring';

// Mock dependencies
jest.mock('@repositories/monitoringRepository');
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

const mockMonitoringRepository = monitoringRepository as jest.Mocked<typeof monitoringRepository>;
const mockSkyfiClient = skyfiClient as jest.Mocked<typeof skyfiClient>;
const mockSseEventEmitter = sseEventEmitter as jest.Mocked<typeof sseEventEmitter>;

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();
    monitoringService = new MonitoringService();
  });

  describe('createMonitoring', () => {
    const userId = 'user-123';
    const mockRequest = {
      aoiData: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
      webhookUrl: 'https://example.com/webhook',
    };

    it('should create monitoring successfully', async () => {
      const mockMonitoring = {
        id: 'monitoring-123',
        userId,
        aoiData: mockRequest.aoiData,
        webhookUrl: mockRequest.webhookUrl,
        status: MonitoringStatus.INACTIVE,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMonitoringRepository.create.mockResolvedValueOnce(mockMonitoring);
      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({ id: 'skyfi-123' });

      const result = await monitoringService.createMonitoring(userId, mockRequest);

      expect(result).toEqual(mockMonitoring);
      expect(mockMonitoringRepository.create).toHaveBeenCalledWith(
        userId,
        mockRequest.aoiData,
        mockRequest.webhookUrl,
        undefined
      );
      expect(mockSseEventEmitter.emitToUser).toHaveBeenCalledWith(
        userId,
        'monitoring:update',
        expect.objectContaining({ monitoringId: 'monitoring-123' })
      );
    });

    it('should throw ValidationError for invalid AOI data', async () => {
      const invalidRequest = {
        aoiData: null as any,
      };

      await expect(
        monitoringService.createMonitoring(userId, invalidRequest)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid AOI type', async () => {
      const invalidRequest = {
        aoiData: {
          type: 'Point',
          coordinates: [0, 0],
        },
      };

      await expect(
        monitoringService.createMonitoring(userId, invalidRequest)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid webhook URL', async () => {
      const invalidRequest = {
        aoiData: mockRequest.aoiData,
        webhookUrl: 'not-a-valid-url',
      };

      await expect(
        monitoringService.createMonitoring(userId, invalidRequest)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getMonitoring', () => {
    it('should get monitoring by ID', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';
      const mockMonitoring = {
        id: monitoringId,
        userId,
        aoiData: {},
        webhookUrl: null,
        status: MonitoringStatus.ACTIVE,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMonitoringRepository.findById.mockResolvedValueOnce(mockMonitoring);

      const result = await monitoringService.getMonitoring(monitoringId, userId);

      expect(result).toEqual(mockMonitoring);
      expect(mockMonitoringRepository.findById).toHaveBeenCalledWith(
        monitoringId,
        userId
      );
    });

    it('should throw NotFoundError when monitoring not found', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';

      mockMonitoringRepository.findById.mockRejectedValueOnce(
        new NotFoundError('Monitoring')
      );

      await expect(
        monitoringService.getMonitoring(monitoringId, userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getMonitoringStatus', () => {
    it('should get monitoring status from SkyFi', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';
      const mockMonitoring = {
        id: monitoringId,
        userId,
        aoiData: {},
        webhookUrl: null,
        status: MonitoringStatus.INACTIVE,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedMonitoring = {
        ...mockMonitoring,
        status: MonitoringStatus.ACTIVE,
      };

      mockMonitoringRepository.findById.mockResolvedValueOnce(mockMonitoring);
      mockSkyfiClient.getMonitoringStatus.mockResolvedValueOnce({
        status: MonitoringStatus.ACTIVE,
      });
      mockMonitoringRepository.update.mockResolvedValueOnce(updatedMonitoring);

      const result = await monitoringService.getMonitoringStatus(monitoringId, userId);

      expect(result.status).toBe(MonitoringStatus.ACTIVE);
      expect(mockSkyfiClient.getMonitoringStatus).toHaveBeenCalledWith(monitoringId);
    });

    it('should return local status if SkyFi fetch fails', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';
      const mockMonitoring = {
        id: monitoringId,
        userId,
        aoiData: {},
        webhookUrl: null,
        status: MonitoringStatus.INACTIVE,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMonitoringRepository.findById.mockResolvedValueOnce(mockMonitoring);
      mockSkyfiClient.getMonitoringStatus.mockRejectedValueOnce(
        new Error('SkyFi error')
      );

      const result = await monitoringService.getMonitoringStatus(monitoringId, userId);

      expect(result.status).toBe(MonitoringStatus.INACTIVE);
    });
  });

  describe('activateMonitoring', () => {
    it('should activate monitoring', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';
      const mockMonitoring = {
        id: monitoringId,
        userId,
        aoiData: {},
        webhookUrl: null,
        status: MonitoringStatus.INACTIVE,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const activatedMonitoring = {
        ...mockMonitoring,
        status: MonitoringStatus.ACTIVE,
      };

      mockMonitoringRepository.findById.mockResolvedValueOnce(mockMonitoring);
      mockMonitoringRepository.update.mockResolvedValueOnce(activatedMonitoring);

      const result = await monitoringService.activateMonitoring(monitoringId, userId);

      expect(result.status).toBe(MonitoringStatus.ACTIVE);
      expect(mockMonitoringRepository.update).toHaveBeenCalledWith(monitoringId, {
        status: MonitoringStatus.ACTIVE,
      });
      expect(mockSseEventEmitter.emitToUser).toHaveBeenCalledWith(
        userId,
        'monitoring:update',
        expect.objectContaining({ status: MonitoringStatus.ACTIVE })
      );
    });

    it('should return monitoring if already active', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';
      const mockMonitoring = {
        id: monitoringId,
        userId,
        aoiData: {},
        webhookUrl: null,
        status: MonitoringStatus.ACTIVE,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMonitoringRepository.findById.mockResolvedValueOnce(mockMonitoring);

      const result = await monitoringService.activateMonitoring(monitoringId, userId);

      expect(result.status).toBe(MonitoringStatus.ACTIVE);
      expect(mockMonitoringRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivateMonitoring', () => {
    it('should deactivate monitoring', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';
      const mockMonitoring = {
        id: monitoringId,
        userId,
        aoiData: {},
        webhookUrl: null,
        status: MonitoringStatus.ACTIVE,
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deactivatedMonitoring = {
        ...mockMonitoring,
        status: MonitoringStatus.INACTIVE,
      };

      mockMonitoringRepository.findById.mockResolvedValueOnce(mockMonitoring);
      mockMonitoringRepository.update.mockResolvedValueOnce(deactivatedMonitoring as any);

      const result = await monitoringService.deactivateMonitoring(monitoringId, userId);

      expect(result.status).toBe(MonitoringStatus.INACTIVE);
      expect(mockMonitoringRepository.update).toHaveBeenCalledWith(monitoringId, {
        status: MonitoringStatus.INACTIVE,
      });
    });
  });

  describe('deleteMonitoring', () => {
    it('should delete monitoring successfully', async () => {
      const userId = 'user-123';
      const monitoringId = 'monitoring-123';

      mockMonitoringRepository.delete.mockResolvedValueOnce(undefined);

      await monitoringService.deleteMonitoring(monitoringId, userId);

      expect(mockMonitoringRepository.delete).toHaveBeenCalledWith(monitoringId, userId);
      expect(mockSseEventEmitter.emitToUser).toHaveBeenCalledWith(
        userId,
        'monitoring:update',
        expect.objectContaining({ deleted: true })
      );
    });
  });

  describe('getUserMonitoring', () => {
    it('should get user monitoring configurations', async () => {
      const userId = 'user-123';
      const mockMonitoring = [
        {
          id: 'monitoring-1',
          userId,
          aoiData: {},
          webhookUrl: null,
          status: MonitoringStatus.ACTIVE,
          config: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'monitoring-2',
          userId,
          aoiData: {},
          webhookUrl: null,
          status: MonitoringStatus.INACTIVE,
          config: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockMonitoringRepository.findByUserId.mockResolvedValueOnce(mockMonitoring as any);

      const result = await monitoringService.getUserMonitoring(userId, 10, 0);

      expect(result).toEqual(mockMonitoring);
      expect(mockMonitoringRepository.findByUserId).toHaveBeenCalledWith(userId, 10, 0);
    });
  });
});

