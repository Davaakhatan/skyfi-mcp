# Troubleshooting 500 Internal Server Error

## Quick Fix

The 500 error is likely because the **SkyFi MCP server is not running**. 

### Option 1: Start the MCP Server (Recommended)

1. **Open a new terminal** and go to the main project:
   ```bash
   cd /path/to/skyfi-mcp
   ```

2. **Add SkyFi API key to main project's `.env`:**
   ```env
   SKYFI_API_KEY=053eef6dc8b849358eedaacd5bdd1b8d
   ```

3. **Start the MCP server:**
   ```bash
   npm run dev
   ```
   ✅ Server should start on `http://localhost:3000`

4. **Verify it's running:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"healthy",...}`

5. **Now try the demo again** - it should work!

### Option 2: Test Without MCP Server (Demo Mode)

If you want to test the UI without the MCP server:

1. **Remove or comment out** `SKYFI_DEMO_API_KEY` from `demo/ai-sdk-demo/.env.local`:
   ```env
   OPENAI_API_KEY=your-openai-key
   # SKYFI_DEMO_API_KEY=053eef6dc8b849358eedaacd5bdd1b8d  # Commented out
   SKYFI_BASE_URL=http://localhost:3000/v1
   ```

2. **Restart the demo:**
   ```bash
   cd demo/ai-sdk-demo
   npm run dev
   ```

3. The demo will work with OpenAI only, showing demo messages for SkyFi functions.

## Understanding the Error

When you have `SKYFI_DEMO_API_KEY` set in the demo's `.env.local`:
- The demo tries to connect to the MCP server at `http://localhost:3000/v1`
- If the MCP server isn't running, requests fail with connection errors
- The updated code now catches these errors and shows helpful messages

## Check Server Logs

To see the actual error:

1. **Check the terminal** where `npm run dev` is running for the demo
2. Look for error messages starting with `Chat API error:`
3. The error details will show what went wrong

## Common Issues

### "Cannot connect to SkyFi MCP server"
- **Fix:** Start the MCP server (see Option 1 above)

### "MCP_SERVER_UNAVAILABLE"
- **Fix:** The MCP server is not running or not accessible
- **Check:** `curl http://localhost:3000/health`

### "OPENAI_API_KEY is required"
- **Fix:** Add your OpenAI API key to `demo/ai-sdk-demo/.env.local`

### Port conflicts
- **Fix:** Make sure port 3000 is available for the MCP server
- **Check:** `lsof -ti:3000` to see what's using the port

## Still Having Issues?

1. **Check both servers are running:**
   - MCP server: `http://localhost:3000/health`
   - Demo: `http://localhost:3001`

2. **Verify environment variables:**
   ```bash
   # In demo directory
   cd demo/ai-sdk-demo
   cat .env.local | grep -v "^#" | grep -v "^$"
   ```

3. **Check browser console** for client-side errors

4. **Check server logs** in the terminal running `npm run dev`

