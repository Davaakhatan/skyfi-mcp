/**
 * ADK Tool Definitions for SkyFi MCP
 * Tool definitions compatible with AI Development Kit (ADK)
 */

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
 * ADK Tool Definition
 */
export interface ADKToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
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
export function createSearchDataTool(config: SkyFiToolConfig): ADKToolDefinition {
  return {
    name: 'skyfi_search_data',
    description: 'Search the SkyFi data catalog for geospatial data products. Supports searching by data type, area of interest (AOI), time range, keywords, or location string (will be geocoded automatically).',
    inputSchema: {
      type: 'object',
      properties: {
        dataType: {
          type: 'string',
          description: 'Type of data to search for (e.g., "satellite", "aerial")',
        },
        location: {
          type: 'string',
          description: 'Location string (e.g., "New York, NY") - will be geocoded to coordinates',
        },
        areaOfInterest: {
          type: 'object',
          description: 'GeoJSON area of interest with type and coordinates',
        },
        timeRange: {
          type: 'object',
          description: 'Time range for data with start and end dates in ISO format',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to search for',
        },
      },
    },
  };
}

/**
 * Tool: Create a data order
 */
export function createOrderDataTool(config: SkyFiToolConfig): ADKToolDefinition {
  return {
    name: 'skyfi_create_order',
    description: 'Create an order for geospatial data. Supports location strings (will be geocoded) or direct area of interest coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        dataType: {
          type: 'string',
          description: 'Type of data to order',
        },
        location: {
          type: 'string',
          description: 'Location string (e.g., "San Francisco, CA") - will be geocoded to coordinates',
        },
        areaOfInterest: {
          type: 'object',
          description: 'GeoJSON area of interest with type and coordinates',
        },
        timeRange: {
          type: 'object',
          description: 'Time range with start and end dates in ISO format',
        },
        resolution: {
          type: 'string',
          description: 'Desired resolution',
        },
        format: {
          type: 'string',
          description: 'Desired data format',
        },
      },
    },
  };
}

/**
 * Tool: Get order status
 */
export function createGetOrderStatusTool(config: SkyFiToolConfig): ADKToolDefinition {
  return {
    name: 'skyfi_get_order_status',
    description: 'Get the current status of a data order by order ID.',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: {
          type: 'string',
          description: 'The order ID to check',
        },
      },
      required: ['orderId'],
    },
  };
}

/**
 * Tool: Estimate price
 */
export function createEstimatePriceTool(config: SkyFiToolConfig): ADKToolDefinition {
  return {
    name: 'skyfi_estimate_price',
    description: 'Estimate the price for a data order before placing it. Supports location strings or direct coordinates.',
    inputSchema: {
      type: 'object',
      properties: {
        dataType: {
          type: 'string',
          description: 'Type of data',
        },
        location: {
          type: 'string',
          description: 'Location string (e.g., "London, UK") - will be geocoded',
        },
        areaOfInterest: {
          type: 'object',
          description: 'GeoJSON area of interest',
        },
        timeRange: {
          type: 'object',
          description: 'Time range with start and end dates in ISO format',
        },
        resolution: {
          type: 'string',
        },
        format: {
          type: 'string',
        },
      },
    },
  };
}

/**
 * Tool: Check feasibility
 */
export function createCheckFeasibilityTool(config: SkyFiToolConfig): ADKToolDefinition {
  return {
    name: 'skyfi_check_feasibility',
    description: 'Check if a data request is feasible before placing an order.',
    inputSchema: {
      type: 'object',
      properties: {
        dataType: {
          type: 'string',
          description: 'Type of data',
        },
        location: {
          type: 'string',
          description: 'Location string - will be geocoded',
        },
        areaOfInterest: {
          type: 'object',
          description: 'GeoJSON area of interest',
        },
        timeRange: {
          type: 'object',
          description: 'Time range with start and end dates in ISO format',
        },
        resolution: {
          type: 'string',
        },
        format: {
          type: 'string',
        },
      },
    },
  };
}

/**
 * Tool: Setup monitoring
 */
export function createSetupMonitoringTool(config: SkyFiToolConfig): ADKToolDefinition {
  return {
    name: 'skyfi_setup_monitoring',
    description: 'Setup monitoring for an area of interest. Will notify when new data becomes available.',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location string (e.g., "Tokyo, Japan") - will be geocoded',
        },
        aoiData: {
          type: 'object',
          description: 'GeoJSON area of interest',
        },
        webhookUrl: {
          type: 'string',
          description: 'Webhook URL to receive notifications',
        },
        frequency: {
          type: 'string',
          enum: ['hourly', 'daily', 'weekly'],
          description: 'Monitoring frequency',
        },
        notifyOnChange: {
          type: 'boolean',
          description: 'Notify when data changes',
        },
      },
    },
  };
}

/**
 * Tool executor - executes ADK tool calls
 */
export async function executeSkyFiTool(
  config: SkyFiToolConfig,
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const client = createSkyFiClient(config);

  switch (toolName) {
    case 'skyfi_search_data':
      return await client.request<FrameworkSearchResponse>('/search', {
        method: 'POST',
        body: JSON.stringify(input),
      });

    case 'skyfi_create_order':
      return await client.request<FrameworkOrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify({ orderData: input }),
      });

    case 'skyfi_get_order_status':
      return await client.request<FrameworkOrderResponse>(`/orders/${input.orderId}`);

    case 'skyfi_estimate_price':
      return await client.request<FrameworkPricingResponse>('/pricing/estimate', {
        method: 'POST',
        body: JSON.stringify(input),
      });

    case 'skyfi_check_feasibility':
      return await client.request<FrameworkFeasibilityResponse>('/pricing/feasibility', {
        method: 'POST',
        body: JSON.stringify(input),
      });

    case 'skyfi_setup_monitoring': {
      const { location, ...rest } = input;
      const requestBody: any = { ...rest };
      if (location) {
        requestBody.location = location;
      }
      return await client.request<FrameworkMonitoringResponse>('/monitoring', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * Get all SkyFi tools for ADK
 */
export function getSkyFiTools(config: SkyFiToolConfig): ADKToolDefinition[] {
  return [
    createSearchDataTool(config),
    createOrderDataTool(config),
    createGetOrderStatusTool(config),
    createEstimatePriceTool(config),
    createCheckFeasibilityTool(config),
    createSetupMonitoringTool(config),
  ];
}

