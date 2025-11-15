/**
 * Order data models and types
 */

export interface OrderData {
  dataType?: string;
  areaOfInterest?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  timeRange?: {
    start: string;
    end: string;
  };
  resolution?: string;
  format?: string;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  userId: string;
  skyfiOrderId?: string;
  orderData: OrderData;
  price?: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface OrderCreateRequest {
  orderData: OrderData;
}

export interface OrderResponse {
  id: string;
  skyfiOrderId?: string;
  orderData: OrderData;
  price?: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

