/**
 * Search data models and types
 */

export interface SearchQuery {
  dataType?: string;
  areaOfInterest?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  timeRange?: {
    start: string;
    end: string;
  };
  resolution?: string;
  format?: string;
  keywords?: string[];
  [key: string]: unknown;
}

export interface SearchResult {
  id: string;
  dataType: string;
  areaOfInterest: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  timeRange: {
    start: string;
    end: string;
  };
  resolution?: string;
  format?: string;
  metadata: Record<string, unknown>;
  previewUrl?: string;
  price?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface Search {
  id: string;
  userId: string;
  query: SearchQuery;
  results?: SearchResponse;
  context?: Record<string, unknown>;
  createdAt: Date;
}

