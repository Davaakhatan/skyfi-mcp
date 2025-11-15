import request from 'supertest';
import app from './main';

describe('Server', () => {
  describe('Health Check', () => {
    it('should return 200 and healthy status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'skyfi-mcp');
    });
  });

  describe('API Root', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/v1');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'SkyFi MCP API');
      expect(response.body).toHaveProperty('version', 'v1');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});

