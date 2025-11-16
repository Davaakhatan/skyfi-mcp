/**
 * SkyFi MCP LangChain Agent
 * 
 * Creates a LangChain agent with SkyFi MCP tools
 */

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { getSkyFiTools } from '../../src/integrations/langchain/index.js';

export interface SkyFiAgentConfig {
  openaiApiKey: string;
  skyfiApiKey: string;
  skyfiBaseUrl?: string;
  modelName?: string;
  temperature?: number;
  verbose?: boolean;
}

/**
 * Create a SkyFi MCP agent with LangChain
 */
export async function createSkyFiAgent(config: SkyFiAgentConfig) {
  const {
    openaiApiKey,
    skyfiApiKey,
    skyfiBaseUrl,
    modelName = 'gpt-4',
    temperature = 0,
    verbose = true,
  } = config;

  // Get SkyFi tools
  const tools = getSkyFiTools({
    apiKey: skyfiApiKey,
    baseUrl: skyfiBaseUrl,
  });

  console.log(`📦 Loaded ${tools.length} SkyFi MCP tools`);

  // Create LLM
  const llm = new ChatOpenAI({
    openAIApiKey: openaiApiKey,
    modelName,
    temperature,
  });

  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a helpful AI assistant specialized in geospatial data services through SkyFi MCP.

You have access to the following SkyFi tools:
- skyfi_search_data: Search the SkyFi data catalog for geospatial data products
- skyfi_create_order: Create an order for geospatial data
- skyfi_get_order_status: Get the current status of a data order
- skyfi_estimate_price: Estimate the price for a data order
- skyfi_check_feasibility: Check if a data request is feasible
- skyfi_setup_monitoring: Setup monitoring for an area of interest

When users ask about locations, you can use location strings (e.g., "New York, NY") which will be automatically geocoded to coordinates.

Always provide clear, helpful responses and explain what actions you're taking.`,
    ],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);

  // Create agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
  });

  // Create executor
  const executor = new AgentExecutor({
    agent,
    tools,
    verbose,
    maxIterations: 10,
  });

  return executor;
}

