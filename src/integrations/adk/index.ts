/**
 * ADK (AI Development Kit) Integration for SkyFi MCP
 * 
 * This module provides ADK-compatible tool definitions that enable AI agents to interact with SkyFi services.
 * 
 * @example
 * ```typescript
 * import { getSkyFiTools } from '@integrations/adk';
 * 
 * const tools = getSkyFiTools({ apiKey: 'your-api-key' });
 * // Use tools with your ADK agent
 * ```
 */

export { getSkyFiTools, createSearchDataTool, createOrderDataTool, createGetOrderStatusTool, createEstimatePriceTool, createCheckFeasibilityTool, createSetupMonitoringTool } from './tools';
export type { SkyFiToolConfig, ADKToolDefinition } from './tools';

