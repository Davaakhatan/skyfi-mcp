/**
 * LangChain Tools for SkyFi MCP
 * Custom tools that enable LangChain agents to interact with SkyFi services
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { getApiBaseUrl, createAuthHeader, formatError } from '../base/utils';
import type {
  FrameworkOrderResponse,
  FrameworkSearchResponse,
  FrameworkPricingResponse,
  FrameworkFeasibilityResponse,
  FrameworkMonitoringResponse,
} from '../base/types';

/**
 * Base configuration for SkyFi MCP tools
 */
export interface SkyFiToolConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Create a SkyFi MCP client for making API requests
 */
function createSkyFiClient(config: SkyFiToolConfig) {
  const baseUrl = config.baseUrl || getApiBaseUrl();
  
  return {
    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = `${baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...createAuthHeader(config.apiKey),
        ...options.headers,
      };

      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        throw formatError(error);
      }
    },
  };
}

/**
 * Tool: Search SkyFi data catalog
 */
export function createSearchDataTool(config: SkyFiToolConfig) {
  return new DynamicStructuredTool({
    name: 'skyfi_search_data',
    description: 'Search the SkyFi data catalog for geospatial data products. Supports searching by data type, area of interest (AOI), time range, keywords, or location string (will be geocoded automatically).',
    schema: z.object({
      dataType: z.string().optional().describe('Type of data to search for (e.g., "satellite", "aerial")'),
      location: z.string().optional().describe('Location string (e.g., "New York, NY") - will be geocoded to coordinates'),
      areaOfInterest: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.any(),
      }).optional().describe('GeoJSON area of interest'),
      timeRange: z.object({
        start: z.string().describe('Start date in ISO format'),
        end: z.string().describe('End date in ISO format'),
      }).optional(),
      keywords: z.array(z.string()).optional().describe('Keywords to search for'),
    }),
    func: async (input) => {
      const client = createSkyFiClient(config);
      const response = await client.request<FrameworkSearchResponse>('/search', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return JSON.stringify(response);
    },
  });
}

/**
 * Tool: Create a data order
 */
export function createOrderDataTool(config: SkyFiToolConfig) {
  return new DynamicStructuredTool({
    name: 'skyfi_create_order',
    description: 'Create an order for geospatial data. Supports location strings (will be geocoded) or direct area of interest coordinates.',
    schema: z.object({
      dataType: z.string().optional().describe('Type of data to order'),
      location: z.string().optional().describe('Location string (e.g., "San Francisco, CA") - will be geocoded to coordinates'),
      areaOfInterest: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.any(),
      }).optional().describe('GeoJSON area of interest'),
      timeRange: z.object({
        start: z.string().describe('Start date in ISO format'),
        end: z.string().describe('End date in ISO format'),
      }).optional(),
      resolution: z.string().optional().describe('Desired resolution'),
      format: z.string().optional().describe('Desired data format'),
    }),
    func: async (input) => {
      const client = createSkyFiClient(config);
      const response = await client.request<FrameworkOrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify({ orderData: input }),
      });
      return JSON.stringify(response);
    },
  });
}

/**
 * Tool: Get order status
 */
export function createGetOrderStatusTool(config: SkyFiToolConfig) {
  return new DynamicStructuredTool({
    name: 'skyfi_get_order_status',
    description: 'Get the current status of a data order by order ID.',
    schema: z.object({
      orderId: z.string().describe('The order ID to check'),
    }),
    func: async (input) => {
      const client = createSkyFiClient(config);
      const response = await client.request<FrameworkOrderResponse>(`/orders/${input.orderId}`);
      return JSON.stringify(response);
    },
  });
}

/**
 * Tool: Estimate price
 */
export function createEstimatePriceTool(config: SkyFiToolConfig) {
  return new DynamicStructuredTool({
    name: 'skyfi_estimate_price',
    description: 'Estimate the price for a data order before placing it. Supports location strings or direct coordinates.',
    schema: z.object({
      dataType: z.string().optional().describe('Type of data'),
      location: z.string().optional().describe('Location string (e.g., "London, UK") - will be geocoded'),
      areaOfInterest: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.any(),
      }).optional().describe('GeoJSON area of interest'),
      timeRange: z.object({
        start: z.string().describe('Start date in ISO format'),
        end: z.string().describe('End date in ISO format'),
      }).optional(),
      resolution: z.string().optional(),
      format: z.string().optional(),
    }),
    func: async (input) => {
      const client = createSkyFiClient(config);
      const response = await client.request<FrameworkPricingResponse>('/pricing/estimate', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return JSON.stringify(response);
    },
  });
}

/**
 * Tool: Check feasibility
 */
export function createCheckFeasibilityTool(config: SkyFiToolConfig) {
  return new DynamicStructuredTool({
    name: 'skyfi_check_feasibility',
    description: 'Check if a data request is feasible before placing an order.',
    schema: z.object({
      dataType: z.string().optional().describe('Type of data'),
      location: z.string().optional().describe('Location string - will be geocoded'),
      areaOfInterest: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.any(),
      }).optional().describe('GeoJSON area of interest'),
      timeRange: z.object({
        start: z.string().describe('Start date in ISO format'),
        end: z.string().describe('End date in ISO format'),
      }).optional(),
      resolution: z.string().optional(),
      format: z.string().optional(),
    }),
    func: async (input) => {
      const client = createSkyFiClient(config);
      const response = await client.request<FrameworkFeasibilityResponse>('/pricing/feasibility', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return JSON.stringify(response);
    },
  });
}

/**
 * Tool: Setup monitoring
 */
export function createSetupMonitoringTool(config: SkyFiToolConfig) {
  return new DynamicStructuredTool({
    name: 'skyfi_setup_monitoring',
    description: 'Setup monitoring for an area of interest. Will notify when new data becomes available.',
    schema: z.object({
      location: z.string().optional().describe('Location string (e.g., "Tokyo, Japan") - will be geocoded'),
      aoiData: z.object({
        type: z.enum(['Polygon', 'MultiPolygon']),
        coordinates: z.any(),
      }).optional().describe('GeoJSON area of interest'),
      webhookUrl: z.string().url().optional().describe('Webhook URL to receive notifications'),
      frequency: z.enum(['hourly', 'daily', 'weekly']).optional().describe('Monitoring frequency'),
      notifyOnChange: z.boolean().optional().describe('Notify when data changes'),
    }),
    func: async (input) => {
      const client = createSkyFiClient(config);
      const { location, ...rest } = input;
      const requestBody: any = { ...rest };
      
      // If location is provided, it will be geocoded by the server
      if (location) {
        requestBody.location = location;
      }
      
      const response = await client.request<FrameworkMonitoringResponse>('/monitoring', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      return JSON.stringify(response);
    },
  });
}

/**
 * Get all SkyFi tools for LangChain
 */
export function getSkyFiTools(config: SkyFiToolConfig) {
  return [
    createSearchDataTool(config),
    createOrderDataTool(config),
    createGetOrderStatusTool(config),
    createEstimatePriceTool(config),
    createCheckFeasibilityTool(config),
    createSetupMonitoringTool(config),
  ];
}

