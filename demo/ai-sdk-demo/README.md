# AI SDK Demo Agent

A Next.js-based demonstration of SkyFi MCP integration with Vercel AI SDK, featuring an interactive chat interface for geospatial data services.

## Features

- **Interactive Chat UI**: Web-based interface for natural language interaction
- **Function Calling**: Seamless integration with AI SDK function calling
- **Real-time Responses**: Streaming responses from the AI agent
- **Order Tracking**: View and track data orders in real-time
- **Price Estimation**: Get instant price estimates before ordering

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

**Create `.env.local` file in the `demo/ai-sdk-demo/` directory** (not in the main MCP directory):

```bash
cd demo/ai-sdk-demo
cp .env.local.example .env.local
# Then edit .env.local with your actual API keys
```

Or manually create `demo/ai-sdk-demo/.env.local`:

```env
# Required for AI responses
OPENAI_API_KEY=your-openai-api-key

# Optional - add when SkyFi API key is available
SKYFI_API_KEY=your-skyfi-api-key

# Optional - defaults to http://localhost:3000/v1
SKYFI_BASE_URL=http://localhost:3000/v1
```

**Note:** 
- The `.env.local` file should be in `demo/ai-sdk-demo/` (the Next.js app root)
- `OPENAI_API_KEY` is required for AI responses
- `SKYFI_API_KEY` is optional - demo works with just OpenAI, but SkyFi tools will be in demo mode until you add it

## Usage

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

```bash
npm run build
npm start
```

## Example Interactions

### Data Search
```
User: "Find satellite imagery of Paris from the last 6 months"
Agent: [Searches catalog, displays results]
```

### Price Estimation
```
User: "How much would high-resolution satellite data for London cost?"
Agent: [Estimates price, shows breakdown]
```

### Order Placement
```
User: "Order satellite imagery for Central Park, New York"
Agent: [Creates order, shows order ID and status]
```

## Architecture

```
┌─────────────┐
│   Browser   │
│   (Next.js) │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  AI SDK     │────▶│ SkyFi MCP    │
│  Functions  │     │   Server    │
└─────────────┘     └──────────────┘
```

## API Routes

- `/api/chat` - Main chat endpoint with function calling
- `/api/orders` - Order management endpoints
- `/api/search` - Search functionality

## Functions Available

1. `skyfi_search_data` - Search data catalog
2. `skyfi_create_order` - Create data order
3. `skyfi_get_order_status` - Get order status
4. `skyfi_estimate_price` - Estimate price
5. `skyfi_check_feasibility` - Check feasibility
6. `skyfi_setup_monitoring` - Setup monitoring

## Next Steps

- Add order history view
- Implement webhook handling for monitoring
- Add data visualization
- Create order management dashboard

