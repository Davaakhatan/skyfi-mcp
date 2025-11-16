/**
 * Integration tests for Monitoring workflow
 * Tests the complete flow from service through repository to database
 */

import { monitoringService } from '@services/monitoringService';
import { monitoringRepository } from '@repositories/monitoringRepository';
import { skyfiClient } from '@services/skyfiClient';
import { createTestUser, cleanupAllTestData, isDatabaseAvailable } from './helpers';
import { MonitoringStatus } from '@models/monitoring';

// Mock SkyFi client
jest.mock('@services/skyfiClient', () => ({
  skyfiClient: {
    setupMonitoring: jest.fn(),
    getMonitoringStatus: jest.fn(),
  },
}));

// Mock logger to reduce noise
jest.mock('@utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock SSE event emitter
jest.mock('@sse/eventEmitter', () => ({
  sseEventEmitter: {
    emitToUser: jest.fn(),
    emit: jest.fn(),
  },
}), { virtual: true });

const mockSkyfiClient = skyfiClient as jest.Mocked<typeof skyfiClient>;

describe('Monitoring Integration Tests', () => {
  let userId: string;
  let dbAvailable: boolean;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) {
      return;
    }
    userId = await createTestUser();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  describe('Monitoring Creation Workflow', () => {
    it('should create monitoring through service and save to repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      const webhookUrl = 'https://example.com/webhook';
      const config = {
        frequency: 'daily' as const,
        notifyOnChange: true,
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-123',
        status: 'active',
      } as any);

      // Create monitoring through service
      const monitoring = await monitoringService.createMonitoring(userId, {
        aoiData,
        webhookUrl,
        config,
      });

      expect(monitoring).toBeDefined();
      expect(monitoring.userId).toBe(userId);
      expect(monitoring.aoiData).toEqual(aoiData);
      expect(monitoring.webhookUrl).toBe(webhookUrl);
      expect(monitoring.status).toBe(MonitoringStatus.INACTIVE);

      // Verify monitoring was saved to database through repository
      const savedMonitoring = await monitoringRepository.findById(monitoring.id, userId);
      expect(savedMonitoring).toBeDefined();
      expect(savedMonitoring.userId).toBe(userId);
      expect(savedMonitoring.status).toBe(MonitoringStatus.INACTIVE);
    });

    it('should create monitoring without webhook URL', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-456',
        status: 'active',
      } as any);

      const monitoring = await monitoringService.createMonitoring(userId, {
        aoiData,
      });

      expect(monitoring.webhookUrl).toBeUndefined();

      // Verify in database
      const savedMonitoring = await monitoringRepository.findById(monitoring.id, userId);
      expect(savedMonitoring.webhookUrl).toBeNull();
    });
  });

  describe('Monitoring Retrieval Workflow', () => {
    it('should retrieve monitoring by ID through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-789',
        status: 'active',
      } as any);

      const createdMonitoring = await monitoringService.createMonitoring(userId, {
        aoiData,
      });
      const monitoringId = createdMonitoring.id;

      // Retrieve through service
      const retrievedMonitoring = await monitoringService.getMonitoring(monitoringId, userId);

      expect(retrievedMonitoring.id).toBe(monitoringId);
      expect(retrievedMonitoring.userId).toBe(userId);

      // Verify repository can also retrieve it
      const dbMonitoring = await monitoringRepository.findById(monitoringId, userId);
      expect(dbMonitoring.id).toBe(monitoringId);
    });

    it('should retrieve all monitoring for a user', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData1 = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      const aoiData2 = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValue({
        id: 'skyfi-monitoring',
        status: 'active',
      } as any);

      await monitoringService.createMonitoring(userId, { aoiData: aoiData1 });
      await monitoringService.createMonitoring(userId, { aoiData: aoiData2 });

      // Get all monitoring through service
      const allMonitoring = await monitoringService.getUserMonitoring(userId);

      expect(Array.isArray(allMonitoring)).toBe(true);
      expect(allMonitoring.length).toBeGreaterThanOrEqual(2);
      expect(allMonitoring.every((m) => m.userId === userId)).toBe(true);

      // Verify through repository
      const repoMonitoring = await monitoringRepository.findByUserId(userId);
      expect(repoMonitoring.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Monitoring Status Updates', () => {
    it('should activate monitoring through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-activate',
        status: 'active',
      } as any);

      const createdMonitoring = await monitoringService.createMonitoring(userId, {
        aoiData,
      });
      const monitoringId = createdMonitoring.id;

      // Activate through service
      const activatedMonitoring = await monitoringService.activateMonitoring(
        monitoringId,
        userId
      );

      expect(activatedMonitoring.status).toBe(MonitoringStatus.ACTIVE);

      // Verify in database
      const dbMonitoring = await monitoringRepository.findById(monitoringId, userId);
      expect(dbMonitoring.status).toBe(MonitoringStatus.ACTIVE);
    });

    it('should deactivate monitoring through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-deactivate',
        status: 'active',
      } as any);

      const createdMonitoring = await monitoringService.createMonitoring(userId, {
        aoiData,
      });
      const monitoringId = createdMonitoring.id;

      // Activate first
      await monitoringService.activateMonitoring(monitoringId, userId);

      // Deactivate through service
      const deactivatedMonitoring = await monitoringService.deactivateMonitoring(
        monitoringId,
        userId
      );

      expect(deactivatedMonitoring.status).toBe(MonitoringStatus.INACTIVE);

      // Verify in database
      const dbMonitoring = await monitoringRepository.findById(monitoringId, userId);
      expect(dbMonitoring.status).toBe(MonitoringStatus.INACTIVE);
    });
  });

  describe('Monitoring Update Workflow', () => {
    it('should update monitoring through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      const newAoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-update',
        status: 'active',
      } as any);

      const createdMonitoring = await monitoringService.createMonitoring(userId, {
        aoiData,
      });
      const monitoringId = createdMonitoring.id;

      // Update through service
      const updatedMonitoring = await monitoringService.updateMonitoring(monitoringId, userId, {
        aoiData: newAoiData,
        config: {
          frequency: 'weekly' as const,
        },
      });

      expect(updatedMonitoring.aoiData).toEqual(newAoiData);
      expect(updatedMonitoring.config?.frequency).toBe('weekly');

      // Verify in database
      const dbMonitoring = await monitoringRepository.findById(monitoringId, userId);
      expect(dbMonitoring.aoiData).toEqual(newAoiData);
    });
  });

  describe('Monitoring Deletion Workflow', () => {
    it('should delete monitoring through service and repository', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon' as const,
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-delete',
        status: 'active',
      } as any);

      const createdMonitoring = await monitoringService.createMonitoring(userId, {
        aoiData,
      });
      const monitoringId = createdMonitoring.id;

      // Verify it exists
      const before = await monitoringRepository.findById(monitoringId, userId);
      expect(before).toBeDefined();

      // Delete through service
      await monitoringService.deleteMonitoring(monitoringId, userId);

      // Verify it's gone
      await expect(
        monitoringRepository.findById(monitoringId, userId)
      ).rejects.toThrow();
    });
  });
});

