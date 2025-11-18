import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { getSkyFiFunctions, executeSkyFiFunction } from '../../../../../src/integrations/ai-sdk/index';

// Support both SKYFI_API_KEY and SKYFI_DEMO_API_KEY for flexibility
const skyfiApiKey = process.env.SKYFI_API_KEY || process.env.SKYFI_DEMO_API_KEY || '';
const skyfiBaseUrl = process.env.SKYFI_BASE_URL;
const openaiApiKey = process.env.OPENAI_API_KEY || '';

// Demo mode: only if both API keys are missing
// If OpenAI is available but SkyFi isn't, we can still use AI (but SkyFi tools won't work)
const isDemoMode = !skyfiApiKey && !openaiApiKey;
const hasOpenAI = !!openaiApiKey;
const hasSkyFi = !!skyfiApiKey;

const skyfiConfig = {
  apiKey: skyfiApiKey || 'demo-key',
  baseUrl: skyfiBaseUrl,
};

// Helper function to check if MCP server is available
async function checkMCPServerHealth(baseUrl?: string): Promise<boolean> {
  try {
    const url = baseUrl ? `${baseUrl.replace(/\/v1$/, '')}/health` : 'http://localhost:3000/health';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
    
    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// Get SkyFi functions and convert to AI SDK tools
let tools: Record<string, ReturnType<typeof tool>> = {};
let mcpServerAvailable = false;

// Check MCP server availability if SkyFi key is configured
if (hasSkyFi) {
  // Check server health asynchronously (don't block)
  checkMCPServerHealth(skyfiBaseUrl).then(available => {
    mcpServerAvailable = available;
  }).catch(() => {
    mcpServerAvailable = false;
  });
  
  const functionDefinitions = getSkyFiFunctions(skyfiConfig);
  tools = functionDefinitions.reduce((acc, funcDef) => {
    acc[funcDef.name] = tool({
      description: funcDef.description,
      parameters: funcDef.parameters,
      execute: async (args: Record<string, unknown>) => {
        try {
          // Check server availability before making request
          const serverAvailable = await checkMCPServerHealth(skyfiBaseUrl);
          if (!serverAvailable) {
            return {
              demo: true,
              error: 'MCP_SERVER_UNAVAILABLE',
              message: `⚠️ SkyFi MCP server is not running. Please start it with "npm run dev" in the main project directory.`,
              note: `This would execute "${funcDef.name}" with: ${JSON.stringify(args, null, 2)}`,
            };
          }
          
          const result = await executeSkyFiFunction(skyfiConfig, funcDef.name, args);
          return result;
        } catch (error) {
          // Enhanced error handling
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
            return {
              demo: true,
              error: 'MCP_SERVER_UNAVAILABLE',
              message: `⚠️ Cannot connect to SkyFi MCP server. Please ensure it's running on ${skyfiBaseUrl || 'http://localhost:3000/v1'}`,
              note: `This would execute "${funcDef.name}" with: ${JSON.stringify(args, null, 2)}`,
            };
          }
          return {
            error: errorMessage,
            details: error instanceof Error ? error.stack : String(error),
          };
        }
      },
    });
    return acc;
  }, {} as Record<string, ReturnType<typeof tool>>);
} else if (hasOpenAI) {
  // If OpenAI is available but SkyFi isn't, create demo tools that explain the situation
  const functionDefinitions = getSkyFiFunctions(skyfiConfig);
  tools = functionDefinitions.reduce((acc, funcDef) => {
    acc[funcDef.name] = tool({
      description: funcDef.description,
      parameters: funcDef.parameters,
      execute: async (args: Record<string, unknown>) => {
        return {
          demo: true,
          message: `🎭 SkyFi API key not configured yet. This would execute "${funcDef.name}" with: ${JSON.stringify(args, null, 2)}`,
          note: 'Add SKYFI_API_KEY to .env.local to enable real SkyFi MCP functionality',
        };
      },
    });
    return acc;
  }, {} as Record<string, ReturnType<typeof tool>>);
}

export async function POST(req: Request) {
  try {
    // Demo mode: return simple demo response
    if (isDemoMode) {
      const demoResponse = `I'm running in demo mode! 🎭

To use the full SkyFi MCP features, please set up:
- OPENAI_API_KEY in your .env.local file  
- SKYFI_API_KEY in your .env.local file

For now, I can show you what the interface looks like. Try asking:
- "Search for satellite data over San Francisco"
- "What would it cost to get aerial imagery of New York?"
- "Order satellite data for Central Park"

Once you have the API keys configured, I'll be able to actually search, order, and manage geospatial data through the SkyFi MCP server!`;

      // Return a simple streaming response compatible with AI SDK
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // AI SDK data stream format
          const lines = [
            '0:{"type":"text-delta","textDelta":"' + demoResponse.replace(/"/g, '\\"') + '"}',
            'd:{}',
          ];
          for (const line of lines) {
            controller.enqueue(encoder.encode(line + '\n'));
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Vercel-AI-Data-Stream': 'v1',
        },
      });
    }

    let messages;
    try {
      const body = await req.json();
      messages = body.messages;
      if (!messages || !Array.isArray(messages)) {
        throw new Error('Invalid request: messages must be an array');
      }
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid request body. Expected JSON with messages array.');
    }

    if (!hasOpenAI) {
      throw new Error('OPENAI_API_KEY is required for AI responses');
    }

    const systemMessage = hasSkyFi
      ? `You are a helpful AI assistant specialized in geospatial data services through SkyFi MCP.

You have access to the following SkyFi functions:
- skyfi_search_data: Search the SkyFi data catalog for geospatial data products
- skyfi_create_order: Create an order for geospatial data
- skyfi_get_order_status: Get the current status of a data order
- skyfi_estimate_price: Estimate the price for a data order
- skyfi_check_feasibility: Check if a data request is feasible
- skyfi_setup_monitoring: Setup monitoring for an area of interest

When users ask about locations, you can use location strings (e.g., "New York, NY") which will be automatically geocoded to coordinates.

Always provide clear, helpful responses and explain what actions you're taking.`
      : `You are a helpful AI assistant specialized in geospatial data services through SkyFi MCP.

You have access to SkyFi functions, but the SkyFi API key is not yet configured. When users ask about geospatial data operations, you can explain what would happen, but note that the SkyFi API key needs to be added to .env.local for full functionality.

You can still help users understand:
- How to search for satellite data
- How pricing works for geospatial data
- How to create orders
- How monitoring works

Be helpful and explain that once the SKYFI_API_KEY is configured, you'll be able to perform real operations.`;

    const result = await streamText({
      model: openai('gpt-4o-mini'), // Using gpt-4o-mini for better compatibility
      messages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      maxSteps: 5,
      system: systemMessage,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
