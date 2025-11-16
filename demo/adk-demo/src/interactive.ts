/**
 * Interactive CLI for ADK Demo
 */

import * as readline from 'readline';
import type { SkyFiADKAgent } from './agent.js';

/**
 * Parse user input and determine which tool to use
 */
function parseCommand(input: string): { tool: string; args: Record<string, unknown> } | null {
  const lowerInput = input.toLowerCase().trim();

  // Search commands
  if (lowerInput.includes('search') || lowerInput.includes('find')) {
    const locationMatch = input.match(/(?:search|find).*?(?:for|of|over|in)?\s+([^,]+(?:,\s*[^,]+)*)/i);
    const dataTypeMatch = input.match(/(satellite|aerial|imagery|data)/i);
    
    return {
      tool: 'skyfi_search_data',
      args: {
        location: locationMatch ? locationMatch[1].trim() : undefined,
        dataType: dataTypeMatch ? dataTypeMatch[1].toLowerCase() : undefined,
      },
    };
  }

  // Price estimation commands
  if (lowerInput.includes('price') || lowerInput.includes('cost') || lowerInput.includes('estimate')) {
    const locationMatch = input.match(/(?:price|cost|estimate).*?(?:for|of|over|in)?\s+([^,]+(?:,\s*[^,]+)*)/i);
    const dataTypeMatch = input.match(/(satellite|aerial|imagery|data)/i);
    
    return {
      tool: 'skyfi_estimate_price',
      args: {
        location: locationMatch ? locationMatch[1].trim() : undefined,
        dataType: dataTypeMatch ? dataTypeMatch[1].toLowerCase() : 'satellite',
      },
    };
  }

  // Order commands
  if (lowerInput.includes('order') || lowerInput.includes('create order')) {
    const locationMatch = input.match(/(?:order|create).*?(?:for|of|over|in)?\s+([^,]+(?:,\s*[^,]+)*)/i);
    const dataTypeMatch = input.match(/(satellite|aerial|imagery|data)/i);
    
    return {
      tool: 'skyfi_create_order',
      args: {
        location: locationMatch ? locationMatch[1].trim() : undefined,
        dataType: dataTypeMatch ? dataTypeMatch[1].toLowerCase() : 'satellite',
      },
    };
  }

  // Status commands
  if (lowerInput.includes('status') || lowerInput.includes('check order')) {
    const orderIdMatch = input.match(/(?:order|id)[\s:]+([a-f0-9-]+)/i);
    
    if (orderIdMatch) {
      return {
        tool: 'skyfi_get_order_status',
        args: {
          orderId: orderIdMatch[1],
        },
      };
    }
  }

  // Feasibility commands
  if (lowerInput.includes('feasible') || lowerInput.includes('feasibility')) {
    const locationMatch = input.match(/(?:feasible|feasibility).*?(?:for|of|over|in)?\s+([^,]+(?:,\s*[^,]+)*)/i);
    const dataTypeMatch = input.match(/(satellite|aerial|imagery|data)/i);
    
    return {
      tool: 'skyfi_check_feasibility',
      args: {
        location: locationMatch ? locationMatch[1].trim() : undefined,
        dataType: dataTypeMatch ? dataTypeMatch[1].toLowerCase() : 'satellite',
      },
    };
  }

  // Monitoring commands
  if (lowerInput.includes('monitor') || lowerInput.includes('watch')) {
    const locationMatch = input.match(/(?:monitor|watch).*?(?:for|of|over|in)?\s+([^,]+(?:,\s*[^,]+)*)/i);
    
    return {
      tool: 'skyfi_setup_monitoring',
      args: {
        location: locationMatch ? locationMatch[1].trim() : undefined,
        frequency: 'daily',
      },
    };
  }

  return null;
}

/**
 * Show help message
 */
function showHelp() {
  console.log('\n📚 Available Commands:');
  console.log('  Search: "search for satellite data in San Francisco"');
  console.log('  Price: "what is the price for satellite imagery of New York?"');
  console.log('  Order: "order satellite data for Central Park, New York"');
  console.log('  Status: "check status of order <order-id>"');
  console.log('  Feasibility: "is satellite data feasible for Tokyo?"');
  console.log('  Monitor: "monitor the area around Paris"');
  console.log('  Help: "help" - show this message');
  console.log('  Exit: "exit" or "quit" - exit the demo\n');
}

/**
 * Run interactive demo
 */
export async function runInteractiveDemo(agent: SkyFiADKAgent) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🌍 SkyFi> ',
  });

  rl.prompt();

  rl.on('line', async (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    if (trimmed === 'exit' || trimmed === 'quit') {
      console.log('\n👋 Goodbye!');
      rl.close();
      return;
    }

    if (trimmed === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    if (trimmed === 'tools') {
      console.log('\n🔧 Available Tools:');
      agent.listTools().forEach(tool => {
        console.log(`\n  ${tool.name}`);
        console.log(`    Description: ${tool.description}`);
        console.log(`    Required: ${tool.inputSchema.required?.join(', ') || 'none'}`);
      });
      console.log();
      rl.prompt();
      return;
    }

    try {
      const command = parseCommand(trimmed);

      if (!command) {
        console.log('❌ Could not parse command. Try "help" for examples.');
        rl.prompt();
        return;
      }

      console.log(`\n🔧 Executing: ${command.tool}`);
      console.log(`📝 Input: ${JSON.stringify(command.args, null, 2)}\n`);

      const result = await agent.executeTool(command.tool, command.args);

      console.log('✅ Result:');
      if (agent.isDemoMode && typeof result === 'object' && 'demo' in result) {
        console.log(result.message);
        if ('note' in result) {
          console.log(`\n💡 ${result.note}`);
        }
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
      console.log();
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      console.log();
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}

