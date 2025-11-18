# Testing Guide for SkyFi MCP Demo

## Understanding the Architecture

The demo has **two layers**:

1. **AI SDK Demo** (Next.js app on port 3001)
   - Connects to the **SkyFi MCP Server**
   - Uses `SKYFI_API_KEY` in `demo/ai-sdk-demo/.env.local` to authenticate with MCP server

2. **SkyFi MCP Server** (Express server on port 3000)
   - Connects to **SkyFi's actual API** (external)
   - Uses `SKYFI_API_KEY` in main project's `.env` to authenticate with SkyFi API

```
┌─────────────┐
│   Browser   │
│  (Demo UI)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  AI SDK     │────▶│ SkyFi MCP    │────▶│  SkyFi API  │
│   Demo      │     │   Server     │     │  (External) │
│ :3001       │     │   :3000      │     │             │
└─────────────┘     └──────────────┘     └─────────────┘
     │                    │
     │                    │
.env.local          .env (main project)
SKYFI_API_KEY       SKYFI_API_KEY
(For MCP auth)      (SkyFi demo key)
```

## Setup Steps

### Step 1: Configure SkyFi MCP Server

1. **Go to main project directory:**
   ```bash
   cd /path/to/skyfi-mcp
   ```

2. **Create/update `.env` file:**
   ```env
   # Your SkyFi demo API key (from SkyFi)
   SKYFI_API_KEY=your-skyfi-demo-api-key-here
   
   # Database (if using Docker, this is auto-configured)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skyfi_mcp
   
   # Other required configs...
   API_KEY_ENCRYPTION_KEY=your-32-char-encryption-key-here
   ```

3. **Start the MCP server:**
   ```bash
   npm run dev
   ```
   Server should start on `http://localhost:3000`

### Step 2: Generate MCP Server API Key (for demo authentication)

The demo needs an API key to authenticate with the MCP server. You have two options:

#### Option A: Generate API Key from MCP Server

```bash
# Generate an API key
curl -X POST http://localhost:3000/v1/auth/api-key \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@test.com", "expiresInDays": 365}'
```

This will return an API key like `skf_xxxxx`. **Save this key!**

#### Option B: Test Without Authentication (if endpoints allow)

Some endpoints might work without authentication. Check the route definitions.

### Step 3: Configure Demo

1. **Go to demo directory:**
   ```bash
   cd demo/ai-sdk-demo
   ```

2. **Update `.env.local`:**
   ```env
   # Required for AI responses
   OPENAI_API_KEY=your-openai-api-key
   
   # API key for MCP server authentication (from Step 2)
   SKYFI_API_KEY=skf_xxxxx  # The key you generated from MCP server
   
   # Point to your MCP server
   SKYFI_BASE_URL=http://localhost:3000/v1
   ```

**Important:** 
- `SKYFI_API_KEY` in demo's `.env.local` = API key for MCP server (generated in Step 2)
- `SKYFI_API_KEY` in main project's `.env` = SkyFi demo API key (from SkyFi)

### Step 4: Start Demo

```bash
cd demo/ai-sdk-demo
npm run dev
```

Demo should start on `http://localhost:3001`

## Testing

### Test 1: Verify MCP Server is Running

```bash
curl http://localhost:3000/health
# Should return: {"status":"ok",...}
```

### Test 2: Verify MCP Server API Key Works

```bash
curl -X POST http://localhost:3000/v1/auth/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer skf_xxxxx" \
  -d '{"apiKey": "skf_xxxxx"}'
```

### Test 3: Test Demo Chat Interface

1. Open `http://localhost:3001` in browser
2. Try these queries:

   **Search:**
   ```
   Search for satellite imagery of New York
   ```

   **Price:**
   ```
   How much would satellite data for Paris cost?
   ```

   **Order:**
   ```
   Order satellite imagery for Central Park, New York
   ```

## Troubleshooting

### "500 Internal Server Error" in Demo

1. **Check MCP server is running:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check MCP server logs** for errors

3. **Verify API keys:**
   - Demo's `.env.local` has `SKYFI_API_KEY` (MCP server API key)
   - Main project's `.env` has `SKYFI_API_KEY` (SkyFi demo API key)

### "Cannot connect to SkyFi MCP server"

1. **Check `SKYFI_BASE_URL`** in demo's `.env.local`
2. **Verify MCP server is running** on port 3000
3. **Check for port conflicts**

### "Invalid API key" errors

- Make sure you're using the **MCP server API key** (generated from `/v1/auth/api-key`) in the demo
- Not the SkyFi demo API key directly

## Quick Reference

| Location | File | Key Name | What It's For |
|----------|------|----------|---------------|
| Main Project | `.env` | `SKYFI_API_KEY` | Connect to SkyFi's external API |
| Demo | `.env.local` | `SKYFI_API_KEY` | Authenticate with MCP server |
| Demo | `.env.local` | `OPENAI_API_KEY` | AI responses from OpenAI |
