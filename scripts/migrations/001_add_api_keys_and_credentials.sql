-- Migration: Add API Keys and Credentials tables
-- Description: Support for multiple API keys per user and secure credential storage
-- Date: January 2025

-- API Keys table (supports multiple keys per user)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credentials table (for storing encrypted SkyFi API keys, OAuth tokens, etc.)
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_type VARCHAR(50) NOT NULL,
  encrypted_value TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, credential_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(credential_type);

-- Create trigger for api_keys updated_at
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for credentials updated_at
CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing api_key_hash from users table to api_keys table (if any exist)
-- This is a one-time migration for existing data
DO $$
DECLARE
  user_record RECORD;
  new_key_id UUID;
BEGIN
  FOR user_record IN 
    SELECT id, api_key_hash 
    FROM users 
    WHERE api_key_hash IS NOT NULL 
    AND api_key_hash != ''
  LOOP
    -- Generate a new UUID for the API key
    new_key_id := uuid_generate_v4();
    
    -- Insert into api_keys table
    INSERT INTO api_keys (id, user_id, key_hash, is_active, created_at, updated_at)
    VALUES (new_key_id, user_record.id, user_record.api_key_hash, true, NOW(), NOW())
    ON CONFLICT (key_hash) DO NOTHING;
  END LOOP;
END $$;

-- Note: We keep api_key_hash in users table for backward compatibility
-- but new API keys should be created in the api_keys table

