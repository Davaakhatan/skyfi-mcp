/**
 * End-to-end API endpoint integration tests
 * Tests complete HTTP request/response flows through Express routes
 */

import request from 'supertest';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '@config/index';
import { requestIdMiddleware, errorHandler, notFoundHandler } from '../../server/middleware/errorHandler';
import { defaultRateLimiter } from '../../server/middleware/rateLimit';
import apiRoutes from '../../server/routes/index';
import authRoutes from '../../server/routes/auth.routes';
import ordersRoutes from '../../server/routes/orders.routes';
import searchRoutes from '../../server/routes/search.routes';
import pricingRoutes from '../../server/routes/pricing.routes';
import monitoringRoutes from '../../server/routes/monitoring.routes';
import { createTestUser, cleanupAllTestData, isDatabaseAvailable, createTestApiKey } from './helpers';
import { skyfiClient } from '@services/skyfiClient';

// Mock SkyFi client
jest.mock('@services/skyfiClient', () => ({
  skyfiClient: {
    createOrder: jest.fn(),
    getOrderStatus: jest.fn(),
    estimatePrice: jest.fn(),
    checkFeasibility: jest.fn(),
    searchData: jest.fn(),
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

/**
 * Create Express app for testing
 */
function createTestApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: config.security.allowedOrigins,
      credentials: true,
    })
  );

  // Request ID middleware
  app.use(requestIdMiddleware);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Apply default rate limiting
  app.use(defaultRateLimiter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'skyfi-mcp',
      version: '1.0.0',
    });
  });

  // API routes
  app.use(`/${config.apiVersion}`, apiRoutes);
  app.use(`/${config.apiVersion}/auth`, authRoutes);
  app.use(`/${config.apiVersion}/orders`, ordersRoutes);
  app.use(`/${config.apiVersion}/search`, searchRoutes);
  app.use(`/${config.apiVersion}/pricing`, pricingRoutes);
  app.use(`/${config.apiVersion}/monitoring`, monitoringRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

describe('API Endpoint Integration Tests', () => {
  let app: Express;
  let userId: string;
  let apiKey: string;
  let dbAvailable: boolean;

  beforeAll(async () => {
    dbAvailable = await isDatabaseAvailable();
    if (dbAvailable) {
      await cleanupAllTestData();
    }
  });

  beforeEach(async () => {
    app = createTestApp();
    jest.clearAllMocks();

    if (dbAvailable) {
      userId = await createTestUser();
      const { apiKey: key } = await createTestApiKey(userId);
      apiKey = key;
    }
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

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('skyfi-mcp');
    });
  });

  describe('API Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app).get(`/${config.apiVersion}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('SkyFi MCP API');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('Authentication Endpoints', () => {
    it('should generate API key', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const response = await request(app)
        .post(`/${config.apiVersion}/auth/api-key`)
        .send({
          expiresInDays: 365,
        });

      expect(response.status).toBe(201);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.message).toBe('API key generated');
    });

    it('should reject invalid expiration days', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const response = await request(app)
        .post(`/${config.apiVersion}/auth/api-key`)
        .send({
          expiresInDays: 5000, // Invalid: > 3650
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Order Endpoints', () => {
    it('should create an order', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const orderData = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.createOrder.mockResolvedValueOnce({
        id: 'skyfi-order-123',
        status: 'pending',
        estimatedPrice: 100.50,
      } as any);

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce({
        estimatedTotal: 100.50,
        currency: 'USD',
      } as any);

      const response = await request(app)
        .post(`/${config.apiVersion}/orders`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ orderData });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('pending');
      expect(response.body.orderData).toEqual(orderData);
    });

    it('should get order by ID', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Create order first
      const orderData = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.createOrder.mockResolvedValueOnce({
        id: 'skyfi-order-456',
        status: 'pending',
      } as any);

      const createResponse = await request(app)
        .post(`/${config.apiVersion}/orders`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ orderData });

      const orderId = createResponse.body.id;

      // Get order
      const response = await request(app)
        .get(`/${config.apiVersion}/orders/${orderId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(orderId);
    });

    it('should get order history', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const orderData = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.createOrder.mockResolvedValue({
        id: 'skyfi-order',
        status: 'pending',
      } as any);

      // Create multiple orders
      await request(app)
        .post(`/${config.apiVersion}/orders`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ orderData });

      await request(app)
        .post(`/${config.apiVersion}/orders`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ orderData });

      // Get history
      const response = await request(app)
        .get(`/${config.apiVersion}/orders`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.orders).toBeDefined();
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeGreaterThanOrEqual(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/${config.apiVersion}/orders`)
        .send({
          orderData: {
            dataType: 'satellite',
          },
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Search Endpoints', () => {
    it('should search data catalog', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const searchQuery = {
        dataType: 'satellite',
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.searchData.mockResolvedValueOnce({
        results: [
          { id: 'result-1', name: 'Satellite Image 1' },
          { id: 'result-2', name: 'Satellite Image 2' },
        ],
        total: 2,
      } as any);

      const response = await request(app)
        .post(`/${config.apiVersion}/search`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(searchQuery);

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    it('should get search history', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const searchQuery = {
        dataType: 'satellite',
        aoi: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
      };

      mockSkyfiClient.searchData.mockResolvedValue({
        results: [],
        total: 0,
      } as any);

      // Create searches
      await request(app)
        .post(`/${config.apiVersion}/search`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send(searchQuery);

      // Get history
      const response = await request(app)
        .get(`/${config.apiVersion}/search/history`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.searches).toBeDefined();
      expect(Array.isArray(response.body.searches)).toBe(true);
    });
  });

  describe('Pricing Endpoints', () => {
    it('should estimate price', async () => {
      const pricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        } as any,
      };

      mockSkyfiClient.estimatePrice.mockResolvedValueOnce({
        estimatedTotal: 150.75,
        currency: 'USD',
      } as any);

      const response = await request(app)
        .post(`/${config.apiVersion}/pricing/estimate`)
        .send(pricingRequest);

      expect(response.status).toBe(200);
      expect(response.body.estimatedTotal).toBe(150.75);
      expect(response.body.currency).toBe('USD');
    });

    it('should check feasibility', async () => {
      const pricingRequest = {
        dataType: 'satellite',
        areaOfInterest: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        } as any,
      };

      mockSkyfiClient.checkFeasibility.mockResolvedValueOnce({
        feasible: true,
        reasons: ['Data available'],
        estimatedPrice: 150.75,
      } as any);

      const response = await request(app)
        .post(`/${config.apiVersion}/pricing/feasibility`)
        .send(pricingRequest);

      expect(response.status).toBe(200);
      expect(response.body.feasible).toBe(true);
    });
  });

  describe('Monitoring Endpoints', () => {
    it('should create monitoring configuration', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-123',
        status: 'active',
      } as any);

      const response = await request(app)
        .post(`/${config.apiVersion}/monitoring`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({
          aoiData,
          webhookUrl: 'https://example.com/webhook',
          config: {
            frequency: 'daily',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.status).toBe('inactive');
    });

    it('should get monitoring by ID', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-456',
        status: 'active',
      } as any);

      // Create monitoring first
      const createResponse = await request(app)
        .post(`/${config.apiVersion}/monitoring`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ aoiData });

      const monitoringId = createResponse.body.id;

      // Get monitoring
      const response = await request(app)
        .get(`/${config.apiVersion}/monitoring/${monitoringId}`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(monitoringId);
    });

    it('should activate monitoring', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const aoiData = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };

      mockSkyfiClient.setupMonitoring.mockResolvedValueOnce({
        id: 'skyfi-monitoring-activate',
        status: 'active',
      } as any);

      // Create monitoring
      const createResponse = await request(app)
        .post(`/${config.apiVersion}/monitoring`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ aoiData });

      const monitoringId = createResponse.body.id;

      // Activate
      const response = await request(app)
        .post(`/${config.apiVersion}/monitoring/${monitoringId}/activate`)
        .set('Authorization', `Bearer ${apiKey}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('active');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get(`/${config.apiVersion}/unknown`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid request body', async () => {
      if (!dbAvailable) {
        console.log('Skipping test: Database not available');
        return;
      }

      const response = await request(app)
        .post(`/${config.apiVersion}/orders`)
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
    });
  });
});

