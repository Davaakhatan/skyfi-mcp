# Testing Instructions for AI SDK Demo

## Quick Test Steps

### 1. Check if servers are running

```bash
# Check MCP server (should be on port 3000)
curl http://localhost:3000/health

# Check demo server (should be on port 3001)
curl http://localhost:3001
```

### 2. Start the servers (if not running)

**Terminal 1 - MCP Server:**
```bash
cd /path/to/skyfi-mcp
npm run dev
```

**Terminal 2 - Demo Server:**
```bash
cd /path/to/skyfi-mcp/demo/ai-sdk-demo
npm run dev
```

### 3. Test the API directly

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

You should see a streaming response.

### 4. Test in browser

1. Open browser: `http://localhost:3001`
2. Type a message in the chat box
3. Click "Send"
4. You should see a response from the AI

## Current Status

✅ **Working:**
- Basic chat functionality (without tools)
- API endpoint responds
- OpenAI API integration

❌ **Not Working:**
- Tool/function calling (schema serialization issue)
- SkyFi MCP integration (blocked by tool issue)

## Troubleshooting

### "NetworkError" or "Failed to fetch"
- Check if demo server is running: `lsof -ti:3001`
- Check server logs: `tail -f /tmp/ai-sdk-demo.log`

### "500 Internal Server Error"
- Check if OpenAI API key is set: `cat demo/ai-sdk-demo/.env.local | grep OPENAI`
- Check server logs for errors

### "MCP server not running"
- Start MCP server: `cd /path/to/skyfi-mcp && npm run dev`
- Check if it's on port 3000: `curl http://localhost:3000/health`

### No response in browser
- Open browser console (F12)
- Check for errors in Console tab
- Check Network tab for failed requests

## Next Steps

Once basic chat is working, we'll fix the tool schema issue to enable full SkyFi MCP functionality.

