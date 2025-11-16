/**
 * AI SDK Functions for SkyFi MCP
 * Function definitions compatible with AI SDK (Vercel AI SDK)
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
 * Base configuration for SkyFi MCP functions
 */
export interface SkyFiFunctionConfig {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Create a SkyFi MCP client for making API requests
 */
function createSkyFiClient(config: SkyFiFunctionConfig) {
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
          const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
          throw new Error(errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json() as T;
      } catch (error) {
        throw formatError(error);
      }
    },
  };
}

/**
 * AI SDK Function Definition Type
 */
export interface AISDKFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Function: Search SkyFi data catalog
 */
export function createSearchDataFunction(_config: SkyFiFunctionConfig): AISDKFunction {
  return {
    name: 'skyfi_search_data',
    description: 'Search the SkyFi data catalog for geospatial data products. Supports searching by data type, area of interest (AOI), time range, keywords, or location string (will be geocoded automatically).',
    parameters: {
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
          description: 'GeoJSON area of interest',
          properties: {
            type: {
              type: 'string',
              enum: ['Polygon', 'MultiPolygon'],
            },
            coordinates: {
              type: 'array',
            },
          },
        },
        timeRange: {
          type: 'object',
          description: 'Time range for data',
          properties: {
            start: { type: 'string', description: 'Start date in ISO format' },
            end: { type: 'string', description: 'End date in ISO format' },
          },
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
 * Function: Create a data order
 */
export function createOrderDataFunction(_config: SkyFiFunctionConfig): AISDKFunction {
  return {
    name: 'skyfi_create_order',
    description: 'Create an order for geospatial data. Supports location strings (will be geocoded) or direct area of interest coordinates.',
    parameters: {
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
          description: 'GeoJSON area of interest',
          properties: {
            type: {
              type: 'string',
              enum: ['Polygon', 'MultiPolygon'],
            },
            coordinates: {
              type: 'array',
            },
          },
        },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date in ISO format' },
            end: { type: 'string', description: 'End date in ISO format' },
          },
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
 * Function: Get order status
 */
export function createGetOrderStatusFunction(_config: SkyFiFunctionConfig): AISDKFunction {
  return {
    name: 'skyfi_get_order_status',
    description: 'Get the current status of a data order by order ID.',
    parameters: {
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
 * Function: Estimate price
 */
export function createEstimatePriceFunction(_config: SkyFiFunctionConfig): AISDKFunction {
  return {
    name: 'skyfi_estimate_price',
    description: 'Estimate the price for a data order before placing it. Supports location strings or direct coordinates.',
    parameters: {
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
          properties: {
            type: {
              type: 'string',
              enum: ['Polygon', 'MultiPolygon'],
            },
            coordinates: {
              type: 'array',
            },
          },
        },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date in ISO format' },
            end: { type: 'string', description: 'End date in ISO format' },
          },
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
 * Function: Check feasibility
 */
export function createCheckFeasibilityFunction(_config: SkyFiFunctionConfig): AISDKFunction {
  return {
    name: 'skyfi_check_feasibility',
    description: 'Check if a data request is feasible before placing an order.',
    parameters: {
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
          properties: {
            type: {
              type: 'string',
              enum: ['Polygon', 'MultiPolygon'],
            },
            coordinates: {
              type: 'array',
            },
          },
        },
        timeRange: {
          type: 'object',
          properties: {
            start: { type: 'string', description: 'Start date in ISO format' },
            end: { type: 'string', description: 'End date in ISO format' },
          },
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
 * Function: Setup monitoring
 */
export function createSetupMonitoringFunction(_config: SkyFiFunctionConfig): AISDKFunction {
  return {
    name: 'skyfi_setup_monitoring',
    description: 'Setup monitoring for an area of interest. Will notify when new data becomes available.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location string (e.g., "Tokyo, Japan") - will be geocoded',
        },
        aoiData: {
          type: 'object',
          description: 'GeoJSON area of interest',
          properties: {
            type: {
              type: 'string',
              enum: ['Polygon', 'MultiPolygon'],
            },
            coordinates: {
              type: 'array',
            },
          },
        },
        webhookUrl: {
          type: 'string',
          format: 'uri',
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
 * Function executor - executes AI SDK function calls
 */
export async function executeSkyFiFunction(
  config: SkyFiFunctionConfig,
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = createSkyFiClient(config);

  switch (functionName) {
    case 'skyfi_search_data':
      return await client.request<FrameworkSearchResponse>('/search', {
        method: 'POST',
        body: JSON.stringify(args),
      });

    case 'skyfi_create_order':
      return await client.request<FrameworkOrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify({ orderData: args }),
      });

    case 'skyfi_get_order_status':
      return await client.request<FrameworkOrderResponse>(`/orders/${args.orderId}`);

    case 'skyfi_estimate_price':
      return await client.request<FrameworkPricingResponse>('/pricing/estimate', {
        method: 'POST',
        body: JSON.stringify(args),
      });

    case 'skyfi_check_feasibility':
      return await client.request<FrameworkFeasibilityResponse>('/pricing/feasibility', {
        method: 'POST',
        body: JSON.stringify(args),
      });

    case 'skyfi_setup_monitoring': {
      const { location, ...rest } = args;
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
      throw new Error(`Unknown function: ${functionName}`);
  }
}

/**
 * Get all SkyFi functions for AI SDK
 */
export function getSkyFiFunctions(config: SkyFiFunctionConfig): AISDKFunction[] {
  return [
    createSearchDataFunction(config),
    createOrderDataFunction(config),
    createGetOrderStatusFunction(config),
    createEstimatePriceFunction(config),
    createCheckFeasibilityFunction(config),
    createSetupMonitoringFunction(config),
  ];
}

