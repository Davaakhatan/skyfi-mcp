# Framework Integrations

This directory contains framework-specific integration modules for SkyFi MCP, enabling AI agents to interact with SkyFi services through their preferred frameworks.

## Supported Frameworks

### 1. ADK (AI Development Kit)
- Native SDK with TypeScript types
- Tool definitions for AI agents
- Example implementations

### 2. LangChain
- Custom tools for LangChain agents
- Chain composition examples
- Integration patterns

### 3. AI SDK
- Plugin architecture
- Function calling support
- Streaming support

## Structure

```
integrations/
├── README.md              # This file
├── base/                  # Base integration utilities
│   ├── types.ts          # Common types
│   └── utils.ts          # Shared utilities
├── adk/                   # ADK integration
│   ├── index.ts          # Main export
│   ├── tools.ts          # Tool definitions
│   └── examples/         # Example implementations
├── langchain/             # LangChain integration
│   ├── index.ts          # Main export
│   ├── tools.ts          # Custom tools
│   └── examples/         # Example chains
└── ai-sdk/               # AI SDK integration
    ├── index.ts          # Main export
    ├── plugin.ts         # Plugin definition
    └── examples/         # Example usage
```

## Usage

Each framework integration provides:
- Type-safe access to SkyFi MCP API
- Framework-specific tool/function definitions
- Example code and documentation
- Type definitions for TypeScript

## Contributing

When adding a new framework integration:
1. Create a new directory under `integrations/`
2. Follow the existing pattern for tool/function definitions
3. Include comprehensive examples
4. Update this README

