import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { getSkyFiFunctions, executeSkyFiFunction } from '../../../../../src/integrations/ai-sdk/index';

const skyfiApiKey = process.env.SKYFI_API_KEY || '';
const skyfiBaseUrl = process.env.SKYFI_BASE_URL;
const openaiApiKey = process.env.OPENAI_API_KEY || '';

// Demo mode: allow UI to work without API keys (will show demo messages)
const isDemoMode = !skyfiApiKey || !openaiApiKey;

const skyfiConfig = {
  apiKey: skyfiApiKey || 'demo-key',
  baseUrl: skyfiBaseUrl,
};

// Get SkyFi functions and convert to AI SDK tools
let tools: Record<string, ReturnType<typeof tool>> = {};

if (!isDemoMode) {
  const functionDefinitions = getSkyFiFunctions(skyfiConfig);
  tools = functionDefinitions.reduce((acc, funcDef) => {
    acc[funcDef.name] = tool({
      description: funcDef.description,
      parameters: funcDef.parameters,
      execute: async (args: Record<string, unknown>) => {
        try {
          const result = await executeSkyFiFunction(skyfiConfig, funcDef.name, args);
          return result;
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
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

    const { messages } = await req.json();

    const result = await streamText({
      model: openai('gpt-4'),
      messages,
      tools,
      maxSteps: 5,
      system: `You are a helpful AI assistant specialized in geospatial data services through SkyFi MCP.

You have access to the following SkyFi functions:
- skyfi_search_data: Search the SkyFi data catalog for geospatial data products
- skyfi_create_order: Create an order for geospatial data
- skyfi_get_order_status: Get the current status of a data order
- skyfi_estimate_price: Estimate the price for a data order
- skyfi_check_feasibility: Check if a data request is feasible
- skyfi_setup_monitoring: Setup monitoring for an area of interest

When users ask about locations, you can use location strings (e.g., "New York, NY") which will be automatically geocoded to coordinates.

Always provide clear, helpful responses and explain what actions you're taking.`,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
