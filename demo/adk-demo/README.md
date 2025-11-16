# ADK Demo Agent

A complete demonstration of SkyFi MCP integration with ADK (AI Development Kit), showcasing how AI agents can interact with geospatial data services using direct tool execution.

## Features

- **Data Search**: Search SkyFi catalog using natural language
- **Price Estimation**: Get cost estimates before ordering
- **Order Management**: Create and track data orders
- **Feasibility Checking**: Verify if data requests are feasible
- **Monitoring Setup**: Setup area monitoring with notifications
- **Natural Language Interface**: Chat with the agent using plain English
- **Direct Tool Execution**: Execute SkyFi MCP tools directly without a framework

## Prerequisites

- Node.js 18+
- SkyFi MCP API key
- SkyFi MCP server running (local or remote)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
SKYFI_API_KEY=your-skyfi-api-key
SKYFI_BASE_URL=http://localhost:3000/v1  # Optional, defaults to local
```

## Usage

### Basic Usage

```bash
npm start
```

Then interact with the agent:

```
🌍 SkyFi> search for satellite data in San Francisco
🌍 SkyFi> what is the price for satellite imagery of New York?
🌍 SkyFi> order satellite data for Central Park, New York
🌍 SkyFi> check status of order <order-id>
🌍 SkyFi> is satellite data feasible for Tokyo?
🌍 SkyFi> monitor the area around Paris
```

### Programmatic Usage

```typescript
import { createSkyFiADKAgent } from './agent';

const agent = createSkyFiADKAgent({
  skyfiApiKey: process.env.SKYFI_API_KEY!,
  skyfiBaseUrl: process.env.SKYFI_BASE_URL,
});

// List all available tools
const tools = agent.listTools();

// Execute a tool directly
const result = await agent.executeTool('skyfi_search_data', {
  location: 'Tokyo, Japan',
  dataType: 'satellite',
});

console.log(result);
```

## Example Scenarios

### Scenario 1: Data Discovery
```
User: "Find satellite imagery of Paris from the last 6 months"
Agent: [Searches catalog, returns available products]
```

### Scenario 2: Price Estimation
```
User: "How much would it cost to get high-resolution satellite data for London?"
Agent: [Estimates price, provides breakdown]
```

### Scenario 3: Order Placement
```
User: "Order satellite imagery for Central Park, New York"
Agent: [Creates order, provides order ID and status]
```

### Scenario 4: Order Tracking
```
User: "What's the status of my order order-123?"
Agent: [Checks order status, provides current state]
```

### Scenario 5: Feasibility Check
```
User: "Is satellite data available for Tokyo?"
Agent: [Checks feasibility, provides constraints if any]
```

### Scenario 6: Monitoring Setup
```
User: "Monitor the area around Tokyo for new satellite data"
Agent: [Sets up monitoring, configures notifications]
```

## Architecture

```
┌─────────────┐
│   User      │
│   Input     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  ADK Agent  │
│  (Direct)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ SkyFi Tools │────▶│ SkyFi MCP   │
│ (6 tools)   │     │   Server    │
└─────────────┘     └──────────────┘
```

## Tools Available

1. `skyfi_search_data` - Search data catalog
2. `skyfi_create_order` - Create data order
3. `skyfi_get_order_status` - Get order status
4. `skyfi_estimate_price` - Estimate price
5. `skyfi_check_feasibility` - Check feasibility
6. `skyfi_setup_monitoring` - Setup monitoring

## Command Parsing

The demo uses natural language parsing to determine which tool to execute:

- **Search**: Contains "search" or "find" + location
- **Price**: Contains "price", "cost", or "estimate" + location
- **Order**: Contains "order" or "create order" + location
- **Status**: Contains "status" or "check order" + order ID
- **Feasibility**: Contains "feasible" or "feasibility" + location
- **Monitor**: Contains "monitor" or "watch" + location

## Error Handling

The agent handles:
- Invalid API keys
- Network errors
- Invalid location strings
- Order failures
- Rate limiting
- Missing required parameters

## Integration with ADK Frameworks

This demo shows direct tool execution. To integrate with a specific ADK framework:

```typescript
import { getSkyFiTools } from '@integrations/adk';

const tools = getSkyFiTools({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000/v1',
});

// Register tools with your ADK framework
// The exact API depends on your ADK implementation
```

## Next Steps

- Add streaming responses
- Implement conversation memory
- Add webhook handling for monitoring
- Create web UI for interaction
- Integrate with specific ADK frameworks
- Add batch operations support

