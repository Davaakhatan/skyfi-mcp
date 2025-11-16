# SkyFi MCP Demo Agent

This directory contains demo agents that showcase SkyFi MCP capabilities across different AI frameworks.

## Available Demos

### 1. LangChain Demo Agent
A complete LangChain agent that demonstrates:
- Data search and exploration
- Price estimation
- Order creation and tracking
- Monitoring setup

**Location**: `langchain-demo/`

### 2. AI SDK Demo Agent
A Next.js-based demo using Vercel AI SDK that shows:
- Function calling with SkyFi MCP
- Interactive chat interface
- Real-time order status updates

**Location**: `ai-sdk-demo/`

### 3. ADK Demo Agent
A basic ADK integration example showing:
- Tool registration
- Tool execution
- Error handling

**Location**: `adk-demo/`

## Quick Start

### Prerequisites
- Node.js 18+ installed
- SkyFi MCP server running (or API key for remote server)
- Framework-specific dependencies (see individual demo READMEs)

### Running a Demo

1. Navigate to the demo directory:
   ```bash
   cd demo/langchain-demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Run the demo:
   ```bash
   npm start
   ```

## Demo Scenarios

Each demo includes example scenarios:

1. **Data Discovery**: Search for satellite imagery over a specific location
2. **Price Estimation**: Get cost estimates before ordering
3. **Order Placement**: Create and track data orders
4. **Monitoring Setup**: Configure area monitoring with webhooks

## Contributing

When adding a new demo:
1. Create a new directory under `demo/`
2. Include a README with setup instructions
3. Add example scenarios
4. Update this README

