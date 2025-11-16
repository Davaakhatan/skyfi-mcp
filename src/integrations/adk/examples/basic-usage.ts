/**
 * Basic ADK Usage Example
 * 
 * This example shows how to use SkyFi MCP tools with ADK (AI Development Kit).
 * 
 * Prerequisites:
 * - Have a SkyFi MCP API key
 * - Set up your ADK agent
 */

import { getSkyFiTools, executeSkyFiTool, SkyFiToolConfig } from '../index';

/**
 * Example: Get tools and execute them
 */
export async function example() {
  const config: SkyFiToolConfig = {
    apiKey: 'your-skyfi-api-key',
  };

  // Get all available tools
  const tools = getSkyFiTools(config);
  // Available tools: search, order, status, pricing, feasibility, monitoring

  // Example 1: Search for data
  const searchResult = await executeSkyFiTool(
    config,
    'skyfi_search_data',
    {
      location: 'San Francisco, CA',
      dataType: 'satellite',
    }
  );
  // Search result contains geospatial data matching the query

  // Example 2: Estimate price
  const priceResult = await executeSkyFiTool(
    config,
    'skyfi_estimate_price',
    {
      location: 'New York, NY',
      dataType: 'satellite',
    }
  );
  // Price estimate contains cost breakdown

  // Example 3: Create order
  const orderResult = await executeSkyFiTool(
    config,
    'skyfi_create_order',
    {
      location: 'Central Park, New York',
      dataType: 'satellite',
    }
  );
  // Order result contains order ID and status
}

/**
 * Example: Integrate with ADK agent
 * 
 * This is a conceptual example - actual implementation depends on your ADK setup
 */
export function adkIntegrationExample() {
  const config: SkyFiToolConfig = {
    apiKey: 'your-skyfi-api-key',
  };

  const tools = getSkyFiTools(config);

  // Register tools with your ADK agent
  // The exact API depends on your ADK implementation
  // Example:
  // const agent = new ADKAgent({
  //   tools: tools.map(tool => ({
  //     name: tool.name,
  //     description: tool.description,
  //     inputSchema: tool.inputSchema,
  //     execute: async (input) => executeSkyFiTool(config, tool.name, input),
  //   })),
  // });

  return {
    tools,
    executeTool: (toolName: string, input: Record<string, unknown>) =>
      executeSkyFiTool(config, toolName, input),
  };
}

