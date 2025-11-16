/**
 * AI SDK Integration for SkyFi MCP
 * 
 * This module provides AI SDK function definitions that enable AI agents to interact with SkyFi services.
 * 
 * @example
 * ```typescript
 * import { getSkyFiFunctions } from '@integrations/ai-sdk';
 * import { openai } from '@ai-sdk/openai';
 * import { generateText } from 'ai';
 * 
 * const functions = getSkyFiFunctions({ apiKey: 'your-api-key' });
 * 
 * const result = await generateText({
 *   model: openai('gpt-4'),
 *   messages: [{ role: 'user', content: 'Search for satellite data over Tokyo' }],
 *   functions,
 * });
 * ```
 */

export { getSkyFiFunctions, createSearchDataFunction, createOrderDataFunction, createGetOrderStatusFunction, createEstimatePriceFunction, createCheckFeasibilityFunction, createSetupMonitoringFunction } from './functions';
export type { SkyFiFunctionConfig } from './functions';

