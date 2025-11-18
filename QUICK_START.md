# Quick Start Guide - Testing with SkyFi Demo API Key

## 🎯 Quick Setup (3 Steps)

### Step 1: Configure MCP Server with SkyFi Demo API Key

1. **Go to main project directory:**
   ```bash
   cd /path/to/skyfi-mcp
   ```

2. **Add SkyFi demo API key to `.env` file:**
   ```env
   SKYFI_API_KEY=053eef6dc8b849358eedaacd5bdd1b8d
   ```

3. **Start the MCP server:**
   ```bash
   npm run dev
   ```
   ✅ Server should start on `http://localhost:3000`

### Step 2: Generate API Key for Demo

The demo needs an API key to authenticate with the MCP server. Generate one:

```bash
curl -X POST http://localhost:3000/v1/auth/api-key \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@test.com", "expiresInDays": 365}'
```

**Save the returned API key** (looks like `skf_xxxxx`)

### Step 3: Configure Demo

1. **Go to demo directory:**
   ```bash
   cd demo/ai-sdk-demo
   ```

2. **Update `.env.local` with the generated API key:**
   ```env
   OPENAI_API_KEY=your-openai-api-key
   SKYFI_API_KEY=skf_xxxxx  # The key from Step 2
   SKYFI_BASE_URL=http://localhost:3000/v1
   ```

3. **Restart the demo:**
   ```bash
   npm run dev
   ```

## ✅ Test It!

1. Open `http://localhost:3001` in your browser
2. Try: **"Search for satellite imagery of New York"**

## 📋 Key Locations

| What | Where | Value |
|------|-------|-------|
| SkyFi Demo API Key | Main project `.env` | `053eef6dc8b849358eedaacd5bdd1b8d` |
| MCP Server API Key | Demo `.env.local` | `skf_xxxxx` (generated in Step 2) |
| OpenAI API Key | Demo `.env.local` | Your OpenAI key |

## 🔍 Verify Setup

```bash
# Check MCP server is running
curl http://localhost:3000/health

# Should return: {"status":"healthy",...}
```

## ❓ Troubleshooting

**"500 Internal Server Error"**
- Make sure MCP server is running (`npm run dev` in main directory)
- Check that you used the **generated API key** (not the SkyFi demo key) in demo's `.env.local`

**"Cannot connect to server"**
- Verify MCP server is on port 3000
- Check `SKYFI_BASE_URL` in demo's `.env.local`

For more details, see `demo/ai-sdk-demo/TESTING.md`

