/**
 * User and credential models
 */

export interface User {
  id: string;
  email: string;
  apiKeyHash: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface Credential {
  userId: string;
  apiKey: string;
  encrypted: boolean;
}

