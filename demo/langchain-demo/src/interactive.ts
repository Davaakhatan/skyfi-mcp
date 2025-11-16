/**
 * Interactive Demo Interface
 * 
 * Provides a simple command-line interface for interacting with the agent
 */

import * as readline from 'readline';
import type { AgentExecutor } from 'langchain/agents';

/**
 * Run interactive demo
 */
export async function runInteractiveDemo(agent: AgentExecutor) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmedInput = input.trim();

    if (trimmedInput === '' || trimmedInput === 'exit' || trimmedInput === 'quit') {
      console.log('\n👋 Goodbye!');
      rl.close();
      return;
    }

    if (trimmedInput === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    try {
      console.log('\n🤔 Thinking...\n');
      const result = await agent.invoke({
        input: trimmedInput,
      });

      console.log('\n✨ Response:');
      console.log(result.output);
      console.log('\n');
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
      console.log('\n');
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

/**
 * Show help message
 */
function showHelp() {
  console.log('\n📚 Example Queries:');
  console.log('  • "Search for satellite data over San Francisco from January 2024"');
  console.log('  • "What would it cost to get aerial imagery of New York City?"');
  console.log('  • "Order satellite data for Central Park, New York"');
  console.log('  • "Check the status of order order-123"');
  console.log('  • "Is it feasible to get satellite data for Tokyo from last month?"');
  console.log('  • "Monitor the area around London for new satellite data"');
  console.log('\n💡 Tips:');
  console.log('  • You can use location names (e.g., "Paris, France") - they will be geocoded automatically');
  console.log('  • Be specific about dates and data types for better results');
  console.log('  • Type "exit" or "quit" to exit\n');
}

