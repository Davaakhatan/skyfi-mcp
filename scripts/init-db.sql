-- SkyFi MCP Database Initialization Script
-- Run this script to create the database and initial schema

-- Create database if it doesn't exist
-- Note: This must be run as a superuser or database owner
-- CREATE DATABASE skyfi_mcp;

-- Connect to the database
\c skyfi_mcp;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skyfi_order_id VARCHAR(255),
  order_data JSONB NOT NULL,
  price DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Searches table
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query JSONB NOT NULL,
  results JSONB,
  context JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monitoring table
CREATE TABLE IF NOT EXISTS monitoring (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  aoi_data JSONB NOT NULL,
  webhook_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'inactive',
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  monitoring_id UUID REFERENCES monitoring(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created_at ON searches(created_at);
CREATE INDEX IF NOT EXISTS idx_monitoring_user_id ON monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_status ON monitoring(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_monitoring_id ON webhooks(monitoring_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON webhooks(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monitoring_updated_at BEFORE UPDATE ON monitoring
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

