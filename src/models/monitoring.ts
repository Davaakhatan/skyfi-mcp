/**
 * Monitoring data models and types
 */

export interface AreaOfInterest {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

export interface MonitoringConfig {
  frequency?: 'hourly' | 'daily' | 'weekly';
  notifyOnChange?: boolean;
  dataTypes?: string[];
  [key: string]: unknown;
}

export interface Monitoring {
  id: string;
  userId: string;
  aoiData: AreaOfInterest;
  webhookUrl?: string;
  status: MonitoringStatus;
  config?: MonitoringConfig;
  createdAt: Date;
  updatedAt: Date;
}

export enum MonitoringStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  PAUSED = 'paused',
}

export interface MonitoringCreateRequest {
  aoiData: AreaOfInterest;
  webhookUrl?: string;
  config?: MonitoringConfig;
}

export interface MonitoringResponse {
  id: string;
  aoiData: AreaOfInterest;
  webhookUrl?: string;
  status: MonitoringStatus;
  config?: MonitoringConfig;
  createdAt: string;
  updatedAt: string;
}

