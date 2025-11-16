/**
 * LangChain Demo Agent - Main Entry Point
 * 
 * A demonstration of SkyFi MCP integration with LangChain
 */

import dotenv from 'dotenv';
import { createSkyFiAgent } from './agent.js';
import { runInteractiveDemo } from './interactive.js';

dotenv.config();

async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const skyfiApiKey = process.env.SKYFI_API_KEY;
  const skyfiBaseUrl = process.env.SKYFI_BASE_URL;

  if (!openaiApiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!skyfiApiKey) {
    console.error('Error: SKYFI_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('🚀 Starting SkyFi MCP LangChain Demo Agent\n');
  console.log('Available commands:');
  console.log('  - Type your question and press Enter');
  console.log('  - Type "exit" or "quit" to exit');
  console.log('  - Type "help" for example queries\n');

  try {
    const agent = await createSkyFiAgent({
      openaiApiKey,
      skyfiApiKey,
      skyfiBaseUrl,
    });

    await runInteractiveDemo(agent);
  } catch (error) {
    console.error('Failed to start agent:', error);
    process.exit(1);
  }
}

main().catch(console.error);

