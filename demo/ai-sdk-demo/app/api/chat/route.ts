import { openai } from '@ai-sdk/openai';
import { streamText, tool, pipeTextStreamToResponse } from 'ai';
import { z } from 'zod';
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

// Direct Zod schema definitions for SkyFi functions
// Simplified schemas to ensure proper serialization for AI SDK v5
const skyFiSchemas = {
  searchData: z.object({
    dataType: z.string().optional().describe('Type of data to search for (e.g., "satellite", "aerial")'),
    location: z.string().optional().describe('Location string (e.g., "New York, NY") - will be geocoded to coordinates'),
    areaOfInterest: z.any().optional().describe('GeoJSON area of interest as object'),
    timeRange: z.object({
      start: z.string().describe('Start date in ISO format'),
      end: z.string().describe('End date in ISO format'),
    }).optional().describe('Time range for data'),
    keywords: z.array(z.string()).optional().describe('Keywords to search for'),
  }),
  
  createOrder: z.object({
    dataType: z.string().describe('Type of data to order (e.g., "satellite", "aerial")'),
    location: z.string().optional().describe('Location string (e.g., "New York, NY") - will be geocoded to coordinates'),
    areaOfInterest: z.any().optional().describe('GeoJSON area of interest as object'),
    timeRange: z.object({
      start: z.string().describe('Start date in ISO format'),
      end: z.string().describe('End date in ISO format'),
    }).optional().describe('Time range for data'),
    resolution: z.string().optional().describe('Desired resolution'),
    format: z.string().optional().describe('Desired output format'),
  }),
  
  getOrderStatus: z.object({
    orderId: z.string().describe('The order ID to check status for'),
  }),
  
  estimatePrice: z.object({
    dataType: z.string().describe('Type of data to estimate price for'),
    location: z.string().optional().describe('Location string (e.g., "New York, NY") - will be geocoded to coordinates'),
    areaOfInterest: z.any().optional().describe('GeoJSON area of interest as object'),
    timeRange: z.object({
      start: z.string().describe('Start date in ISO format'),
      end: z.string().describe('End date in ISO format'),
    }).optional().describe('Time range for data'),
    resolution: z.string().optional().describe('Desired resolution'),
  }),
  
  checkFeasibility: z.object({
    dataType: z.string().describe('Type of data to check feasibility for'),
    location: z.string().optional().describe('Location string (e.g., "New York, NY") - will be geocoded to coordinates'),
    areaOfInterest: z.any().optional().describe('GeoJSON area of interest as object'),
    timeRange: z.object({
      start: z.string().describe('Start date in ISO format'),
      end: z.string().describe('End date in ISO format'),
    }).optional().describe('Time range for data'),
  }),
  
  setupMonitoring: z.object({
    location: z.string().optional().describe('Location string (e.g., "New York, NY") - will be geocoded to coordinates'),
    areaOfInterest: z.any().optional().describe('GeoJSON area of interest as object'),
    aoiData: z.any().optional().describe('GeoJSON area of interest as object (alternative name)'),
    frequency: z.enum(['hourly', 'daily', 'weekly']).optional().describe('Monitoring frequency'),
    webhookUrl: z.string().url().optional().describe('Webhook URL for notifications'),
    dataTypes: z.array(z.string()).optional().describe('Types of data to monitor'),
  }),
};

// Map function names to their Zod schemas
const schemaMap: Record<string, z.ZodObject<any>> = {
  skyfi_search_data: skyFiSchemas.searchData,
  skyfi_create_order: skyFiSchemas.createOrder,
  skyfi_get_order_status: skyFiSchemas.getOrderStatus,
  skyfi_estimate_price: skyFiSchemas.estimatePrice,
  skyfi_check_feasibility: skyFiSchemas.checkFeasibility,
  skyfi_setup_monitoring: skyFiSchemas.setupMonitoring,
};

// Helper function to create SkyFi tools (called at request time, not module load time)
function createSkyFiTools(): Record<string, ReturnType<typeof tool>> {
  const tools: Record<string, ReturnType<typeof tool>> = {};
  
  if (hasSkyFi) {
    try {
      const functionDefinitions = getSkyFiFunctions(skyfiConfig);
      for (const funcDef of functionDefinitions) {
        const zodSchema = schemaMap[funcDef.name];
        if (!zodSchema) {
          console.warn(`No schema found for ${funcDef.name}, skipping`);
          continue;
        }
        
        // Try to create the tool, catch any schema errors
        try {
          tools[funcDef.name] = tool({
            description: funcDef.description,
            parameters: zodSchema,
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
        } catch (schemaError) {
          console.error(`Failed to create tool ${funcDef.name} due to schema error:`, schemaError);
          // Skip this tool but continue with others
          continue;
        }
      }
    } catch (error) {
      console.error('Failed to create SkyFi tools:', error);
      // Return empty tools if there's an error
    }
  } else if (hasOpenAI) {
    // If OpenAI is available but SkyFi isn't, create demo tools that explain the situation
    try {
      const functionDefinitions = getSkyFiFunctions(skyfiConfig);
      for (const funcDef of functionDefinitions) {
        const zodSchema = schemaMap[funcDef.name] || z.object({});
        tools[funcDef.name] = tool({
          description: funcDef.description,
          parameters: zodSchema,
          execute: async (args: Record<string, unknown>) => {
            return {
              demo: true,
              message: `🎭 SkyFi API key not configured yet. This would execute "${funcDef.name}" with: ${JSON.stringify(args, null, 2)}`,
              note: 'Add SKYFI_API_KEY to .env.local to enable real SkyFi MCP functionality',
            };
          },
        });
      }
    } catch (error) {
      console.error('Failed to create demo tools:', error);
    }
  }
  
  return tools;
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
      return new Response(
        JSON.stringify({
          error: 'OPENAI_API_KEY is required for AI responses',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
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

    // TEMPORARILY DISABLED: Tools have schema serialization issues
    // TODO: Fix Zod schema serialization for AI SDK v5
    // For now, disable tools so basic chat works
    const tools = undefined; // createSkyFiTools();

    const result = await streamText({
      model: openai('gpt-4o-mini'), // Using gpt-4o-mini for better compatibility
      messages,
      tools: tools, // Disabled for now
      maxSteps: 5,
      system: systemMessage,
    });

    // @ai-sdk/react v2 with ai v5.x
    // Return textStream directly - AI SDK v5 handles the formatting
    // Convert AsyncIterableStream to ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use textStream directly - it's already formatted correctly
          for await (const chunk of result.textStream) {
            // textStream yields plain strings, format as data stream
            const dataLine = `0:{"type":"text-delta","textDelta":${JSON.stringify(chunk)}}\n`;
            controller.enqueue(encoder.encode(dataLine));
          }
          // Done marker
          controller.enqueue(encoder.encode('d:{}\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    });
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
