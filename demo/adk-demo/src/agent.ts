/**
 * SkyFi MCP ADK Agent
 * 
 * Creates an ADK-compatible agent with SkyFi MCP tools
 */

import { getSkyFiTools, executeSkyFiTool, SkyFiToolConfig } from '../../../src/integrations/adk/index.js';

export interface SkyFiADKAgentConfig {
  skyfiApiKey: string;
  skyfiBaseUrl?: string;
  isDemoMode?: boolean;
}

/**
 * Create a SkyFi MCP agent with ADK tools
 */
export function createSkyFiADKAgent(config: SkyFiADKAgentConfig) {
  const {
    skyfiApiKey,
    skyfiBaseUrl,
    isDemoMode = false,
  } = config;

  const toolConfig: SkyFiToolConfig = {
    apiKey: skyfiApiKey,
    baseUrl: skyfiBaseUrl,
  };

  // Get SkyFi tools
  const tools = getSkyFiTools(toolConfig);

  console.log(`📦 Loaded ${tools.length} SkyFi MCP tools:`);
  tools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`);
  });

  return {
    tools,
    isDemoMode,
    executeTool: async (toolName: string, input: Record<string, unknown>) => {
      if (isDemoMode) {
        // Return demo response
        return {
          demo: true,
          message: `🎭 Demo Mode: This would execute "${toolName}" with input: ${JSON.stringify(input, null, 2)}`,
          note: 'Set SKYFI_API_KEY in .env file to use real API calls',
        };
      }
      return executeSkyFiTool(toolConfig, toolName, input);
    },
    getTool: (toolName: string) => {
      return tools.find(t => t.name === toolName);
    },
    listTools: () => {
      return tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
    },
  };
}

export type SkyFiADKAgent = ReturnType<typeof createSkyFiADKAgent>;

