/**
 * LangChain Integration for SkyFi MCP
 * 
 * This module provides LangChain tools that enable AI agents to interact with SkyFi services.
 * 
 * @example
 * ```typescript
 * import { getSkyFiTools } from '@integrations/langchain';
 * import { ChatOpenAI } from '@langchain/openai';
 * import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
 * 
 * const tools = getSkyFiTools({ apiKey: 'your-api-key' });
 * const llm = new ChatOpenAI({ modelName: 'gpt-4' });
 * const agent = await createOpenAIFunctionsAgent({ llm, tools });
 * const executor = new AgentExecutor({ agent, tools });
 * 
 * const result = await executor.invoke({
 *   input: 'Search for satellite data over New York City'
 * });
 * ```
 */

export { getSkyFiTools, createSearchDataTool, createOrderDataTool, createGetOrderStatusTool, createEstimatePriceTool, createCheckFeasibilityTool, createSetupMonitoringTool } from './tools';
export type { SkyFiToolConfig } from './tools';

