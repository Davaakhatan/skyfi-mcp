# LangChain Demo Agent

A complete demonstration of SkyFi MCP integration with LangChain, showcasing how AI agents can interact with geospatial data services.

## Features

- **Data Search**: Search SkyFi catalog using natural language
- **Price Estimation**: Get cost estimates before ordering
- **Order Management**: Create and track data orders
- **Monitoring**: Setup area monitoring with notifications
- **Natural Language Interface**: Chat with the agent using plain English

## Prerequisites

- Node.js 18+
- OpenAI API key (for GPT-4)
- SkyFi MCP API key
- SkyFi MCP server running (local or remote)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
OPENAI_API_KEY=your-openai-api-key
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
> Search for satellite data over San Francisco from January 2024
> What would it cost to get aerial imagery of New York City?
> Order satellite data for Central Park, New York
> Check the status of order order-123
```

### Programmatic Usage

```typescript
import { createSkyFiAgent } from './agent';

const agent = await createSkyFiAgent({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  skyfiApiKey: process.env.SKYFI_API_KEY!,
});

const result = await agent.invoke({
  input: 'Search for satellite data over Tokyo',
});

console.log(result.output);
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

### Scenario 5: Monitoring Setup
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
│  LangChain  │
│   Agent     │
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

## Error Handling

The agent handles:
- Invalid API keys
- Network errors
- Invalid location strings
- Order failures
- Rate limiting

## Next Steps

- Add streaming responses
- Implement conversation memory
- Add webhook handling for monitoring
- Create web UI for interaction

