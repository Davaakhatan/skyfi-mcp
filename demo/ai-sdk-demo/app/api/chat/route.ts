import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { getSkyFiFunctions, executeSkyFiFunction } from '../../../../../src/integrations/ai-sdk/index';

const skyfiApiKey = process.env.SKYFI_API_KEY || '';
const skyfiBaseUrl = process.env.SKYFI_BASE_URL;

if (!skyfiApiKey) {
  throw new Error('SKYFI_API_KEY environment variable is required');
}

const skyfiConfig = {
  apiKey: skyfiApiKey,
  baseUrl: skyfiBaseUrl,
};

// Get SkyFi functions and convert to AI SDK tools
const functionDefinitions = getSkyFiFunctions(skyfiConfig);
const tools = functionDefinitions.reduce((acc, funcDef) => {
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

export async function POST(req: Request) {
  try {
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
