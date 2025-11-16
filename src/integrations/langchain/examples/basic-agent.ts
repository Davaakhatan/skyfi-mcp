/**
 * Basic LangChain Agent Example
 * 
 * This example shows how to create a simple LangChain agent that can interact with SkyFi MCP.
 * 
 * Prerequisites:
 * - Install required packages: npm install @langchain/core @langchain/openai langchain zod
 * - Set OPENAI_API_KEY environment variable
 * - Have a SkyFi MCP API key
 */

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { getSkyFiTools } from '../index';

/**
 * Create and run a basic SkyFi agent
 */
export async function createBasicSkyFiAgent(apiKey: string) {
  // Get SkyFi tools
  const tools = getSkyFiTools({ apiKey });

  // Create LLM
  const llm = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
  });

  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant that can search and order geospatial data from SkyFi. Use the available tools to help users find and order the data they need.'],
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
    verbose: true,
  });

  return executor;
}

/**
 * Example usage
 */
export async function example() {
  const executor = await createBasicSkyFiAgent('your-skyfi-api-key');

  // Example 1: Search for data
  const searchResult = await executor.invoke({
    input: 'Search for satellite data over San Francisco from January 2024',
  });
  console.log('Search Result:', searchResult);

  // Example 2: Estimate price
  const priceResult = await executor.invoke({
    input: 'What would it cost to get satellite imagery of New York City?',
  });
  console.log('Price Estimate:', priceResult);

  // Example 3: Create order
  const orderResult = await executor.invoke({
    input: 'Order satellite data for Central Park, New York',
  });
  console.log('Order Result:', orderResult);
}

