/**
 * ADK Demo Agent - Main Entry Point
 * 
 * A demonstration of SkyFi MCP integration with ADK (AI Development Kit)
 */

import 'tsconfig-paths/register';
import dotenv from 'dotenv';
import { createSkyFiADKAgent } from './agent.js';
import { runInteractiveDemo } from './interactive.js';

dotenv.config();

async function main() {
  const skyfiApiKey = process.env.SKYFI_API_KEY;
  const skyfiBaseUrl = process.env.SKYFI_BASE_URL;

  const isDemoMode = !skyfiApiKey;

  if (isDemoMode) {
    console.log('🎭 DEMO MODE: Running without API keys\n');
    console.log('To use full functionality, create a .env file with:');
    console.log('  SKYFI_API_KEY=your-skyfi-api-key');
    console.log('  SKYFI_BASE_URL=http://localhost:3000/v1  # Optional\n');
  }

  console.log('🚀 Starting SkyFi MCP ADK Demo Agent\n');
  console.log('Available commands:');
  console.log('  - Type your question and press Enter');
  console.log('  - Type "exit" or "quit" to exit');
  console.log('  - Type "help" for example queries');
  console.log('  - Type "tools" to see all available tools\n');

  try {
    const agent = createSkyFiADKAgent({
      skyfiApiKey: skyfiApiKey || 'demo-key',
      skyfiBaseUrl,
      isDemoMode,
    });

    await runInteractiveDemo(agent);
  } catch (error) {
    console.error('Failed to start agent:', error);
    process.exit(1);
  }
}

main().catch(console.error);

