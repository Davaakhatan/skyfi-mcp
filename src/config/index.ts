import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: process.env.API_VERSION || 'v1',

  // SkyFi API Configuration
  skyfi: {
    apiUrl: process.env.SKYFI_API_URL || 'https://api.skyfi.com',
    apiKey: process.env.SKYFI_API_KEY || '',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skyfi_mcp',
    // Test database uses port 5433 to avoid conflicts with main postgres instance
    testUrl: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/skyfi_mcp_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'skyfi_mcp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || '',
    apiKeyEncryptionKey: process.env.API_KEY_ENCRYPTION_KEY || '',
    tokenExpiration: process.env.TOKEN_EXPIRATION || '24h',
  },

  // OpenStreetMaps Configuration
  osm: {
    apiUrl: process.env.OSM_API_URL || 'https://nominatim.openstreetmap.org',
    userAgent: process.env.OSM_USER_AGENT || 'SkyFi-MCP/1.0.0',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  // Security
  security: {
    corsOrigin: process.env.CORS_ORIGIN || '*',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },

  // Webhook Configuration
  webhook: {
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || '5000', 10),
    maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
    retryDelayMs: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS || '1000', 10),
  },

  // Monitoring
  monitoring: {
    healthCheckIntervalMs: parseInt(
      process.env.HEALTH_CHECK_INTERVAL_MS || '30000',
      10
    ),
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
  },

  // Feature Flags
  features: {
    enableOAuth: process.env.ENABLE_OAUTH === 'true',
    enableCloudDeployment: process.env.ENABLE_CLOUD_DEPLOYMENT === 'true',
  },
};

// Validate required configuration
if (!config.skyfi.apiKey && config.nodeEnv === 'production') {
  throw new Error('SKYFI_API_KEY is required in production');
}

if (!config.auth.jwtSecret && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET is required in production');
}

if (!config.auth.apiKeyEncryptionKey && config.nodeEnv === 'production') {
  throw new Error('API_KEY_ENCRYPTION_KEY is required in production');
}

