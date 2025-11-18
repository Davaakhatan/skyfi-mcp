# Known Issues - AI SDK Demo

## Schema Serialization Issue with AI SDK v5

**Status**: 🔴 Active Issue  
**Priority**: High  
**Affected**: All SkyFi MCP tools

### Problem

When attempting to use SkyFi MCP tools with AI SDK v5, we encounter the following error:

```
Invalid schema for function 'skyfi_search_data': schema must be a JSON Schema of 'type: "object"', got 'type: "None"'.
```

### Root Cause

AI SDK v5's `tool()` function has a limitation when serializing Zod schemas where all fields are optional. The schema gets serialized as `type: "None"` instead of `type: "object"`, causing the tool creation to fail.

### Attempted Solutions

We've tried multiple approaches:
1. ✅ Using `z.any()` for complex GeoJSON objects
2. ✅ Using `z.union([z.any(), z.undefined()])`
3. ✅ Using `z.object({}).passthrough()`
4. ✅ Removing `areaOfInterest` from schemas
5. ✅ Using JSON schema directly from `getSkyFiFunctions()`
6. ✅ Adding additional fields to schemas

None of these approaches have resolved the issue.

### Current Workaround

**Option 1: Tools Disabled (Current State)**
- Tools are currently disabled in `app/api/chat/route.ts`
- Basic chat functionality works without tools
- Users can still interact with the AI, but SkyFi MCP functions are not available

**Option 2: Use ADK or LangChain Demos**
- The ADK and LangChain integrations work correctly
- These frameworks don't have the same schema serialization issues
- See `demo/adk-demo/` and `demo/langchain-demo/` for working examples

### Recommended Solutions

1. **Wait for AI SDK v5 Fix**: This appears to be a bug in AI SDK v5's schema serialization. Monitor the [AI SDK GitHub repository](https://github.com/vercel/ai) for updates.

2. **Downgrade to AI SDK v3**: AI SDK v3 had different schema handling that might work better. However, this would require significant code changes.

3. **Use Function Calling Instead of Tools**: AI SDK v5 supports function calling with a different API that might not have this limitation.

4. **Create Minimal Schemas**: Ensure every schema has at least one required field, even if it's just a placeholder.

### Testing

To test if the issue is resolved:
1. Enable tools in `app/api/chat/route.ts` by uncommenting `const tools = createSkyFiTools();`
2. Restart the Next.js dev server
3. Try asking: "What tools do you have?"
4. Check the browser console and server logs for errors

### Related Issues

- [AI SDK v5 Tool Schema Serialization](https://github.com/vercel/ai/issues) - Search for similar issues
- [Zod Schema with All Optional Fields](https://github.com/colinhacks/zod/issues) - Related Zod serialization issues

### Next Steps

1. Monitor AI SDK v5 releases for schema serialization fixes
2. Consider creating a minimal reproduction case to report to the AI SDK team
3. Explore alternative approaches to tool definition in AI SDK v5

