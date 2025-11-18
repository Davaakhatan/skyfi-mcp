# SkyFi MCP - Complete App Explanation

## 🎯 What is This App?

**SkyFi MCP** is a **Model Context Protocol (MCP) server** that acts as a **bridge between AI agents and SkyFi's geospatial data services**. 

Think of it like this:
- **SkyFi** = A company that provides satellite imagery and geospatial data
- **AI Agents** = Autonomous AI systems (like ChatGPT, Claude, or custom AI assistants)
- **This App** = A translator/bridge that lets AI agents easily access SkyFi's data

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    AI Agents (Clients)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   ADK    │  │ LangChain│  │  AI SDK  │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │   SkyFi MCP Server        │ ← THIS APP
        │  (REST API + SSE)         │
        └─────────────┬─────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
│  PostgreSQL  │ │  Redis │ │  SkyFi API │
│   Database   │ │  Cache │ │  External  │
└──────────────┘ └────────┘ └────────────┘
```

## 🔧 How It Works

### 1. **Core Purpose**
This app provides a RESTful API that AI agents can call to:
- **Search** for available geospatial data (satellite imagery, maps, etc.)
- **Order** geospatial data products
- **Check pricing** before ordering
- **Monitor** specific geographic areas for changes
- **Get real-time updates** via Server-Sent Events (SSE)

### 2. **Main Components**

#### **A. API Server** (`src/server/main.ts`)
- Express.js HTTP server
- Handles incoming requests from AI agents
- Routes requests to appropriate services
- Port: 3000 (default)

#### **B. Services Layer** (`src/services/`)
- **OrderService**: Creates and manages orders
- **SearchService**: Searches geospatial data catalogs
- **PricingService**: Estimates prices and checks feasibility
- **MonitoringService**: Sets up area monitoring
- **NotificationService**: Sends webhook notifications
- **SkyFiClient**: Communicates with SkyFi's external API
- **OpenStreetMapsClient**: Converts addresses to coordinates

#### **C. Database Layer** (`src/repositories/`)
- Stores orders, searches, monitoring configurations
- PostgreSQL database
- Connection pooling for performance

#### **D. Authentication** (`src/auth/`)
- API key management
- Encrypted credential storage
- User authentication

### 3. **API Endpoints**

#### **Health Check** (Public)
```
GET /health
→ Returns: {"status": "healthy", ...}
```

#### **Authentication**
```
POST /v1/auth/api-key
→ Generate API key for client

POST /v1/auth/validate
→ Validate API key
```

#### **Orders**
```
POST /v1/orders
→ Create a new order

GET /v1/orders/:id
→ Get order status

GET /v1/orders
→ List all orders (history)

POST /v1/orders/:id/cancel
→ Cancel an order
```

#### **Search**
```
POST /v1/search
→ Search for geospatial data

POST /v1/search/:id/refine
→ Refine a previous search

GET /v1/search/history
→ Get search history
```

#### **Pricing**
```
POST /v1/pricing/estimate
→ Estimate price for an order

POST /v1/pricing/feasibility
→ Check if order is feasible
```

#### **Monitoring**
```
POST /v1/monitoring/aoi
→ Create Area of Interest (AOI) monitoring

GET /v1/monitoring/:id
→ Get monitoring status

POST /v1/monitoring/:id/activate
→ Activate monitoring
```

#### **Real-time Events** (SSE)
```
GET /v1/events/orders/:id
→ Stream order status updates

GET /v1/events/monitoring/:id
→ Stream monitoring events
```

## 📋 Typical Workflow

### Example: AI Agent Wants Satellite Imagery of New York

1. **AI Agent** → `POST /v1/search`
   ```json
   {
     "location": "New York, NY",
     "dateRange": "2024-01-01 to 2024-01-31",
     "dataType": "satellite_imagery"
   }
   ```

2. **MCP Server** → Converts "New York, NY" to coordinates using OpenStreetMaps
3. **MCP Server** → Calls SkyFi API to search for available data
4. **MCP Server** → Returns search results to AI agent

5. **AI Agent** → `POST /v1/pricing/estimate`
   ```json
   {
     "orderData": { /* selected data product */ }
   }
   ```

6. **MCP Server** → Checks price with SkyFi API
7. **MCP Server** → Returns price estimate

8. **AI Agent** → `POST /v1/orders`
   ```json
   {
     "orderData": { /* confirmed order */ }
   }
   ```

9. **MCP Server** → Creates order with SkyFi
10. **MCP Server** → Stores order in database
11. **MCP Server** → Returns order confirmation

12. **AI Agent** → `GET /v1/events/orders/:id` (SSE)
    - Receives real-time updates as order progresses

## 🚨 Why It Might Not Be Working

### Common Issues:

#### 1. **Missing Environment Variables**
The app needs a `.env` file with:
```env
SKYFI_API_KEY=your-skyfi-api-key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skyfi_mcp
API_KEY_ENCRYPTION_KEY=32-character-encryption-key
JWT_SECRET=your-jwt-secret
```

**Fix**: Create `.env` file in project root (see `ENV_SETUP_GUIDE.md`)

#### 2. **Database Not Running**
The app requires PostgreSQL to be running.

**Fix**: 
```bash
# Using Docker Compose
docker-compose up -d postgres

# Or start PostgreSQL manually
# Then run: npm run db:setup
```

#### 3. **Port Already in Use**
If port 3000 is already taken.

**Fix**:
```bash
npm run kill:port
# Or manually: lsof -ti:3000 | xargs kill -9
```

#### 4. **Missing Dependencies**
**Fix**:
```bash
npm install
```

#### 5. **Database Not Initialized**
**Fix**:
```bash
npm run db:setup
# Or manually: psql -h localhost -U postgres -d skyfi_mcp -f scripts/init-db.sql
```

## 🧪 How to Test It

### 1. Start the Server
```bash
npm run dev
```

### 2. Check Health
```bash
curl http://localhost:3000/health
```

### 3. Generate API Key
```bash
curl -X POST http://localhost:3000/v1/auth/api-key \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "expiresInDays": 365}'
```

### 4. Test Search (with API key from step 3)
```bash
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "location": "New York, NY",
    "dataType": "satellite_imagery"
  }'
```

## 📁 Key Files to Understand

### **Entry Point**
- `src/server/main.ts` - Server startup and configuration

### **API Routes**
- `src/server/routes/orders.routes.ts` - Order endpoints
- `src/server/routes/search.routes.ts` - Search endpoints
- `src/server/routes/pricing.routes.ts` - Pricing endpoints
- `src/server/routes/monitoring.routes.ts` - Monitoring endpoints

### **Business Logic**
- `src/services/orderService.ts` - Order management logic
- `src/services/searchService.ts` - Search logic
- `src/services/skyfiClient.ts` - External SkyFi API client

### **Configuration**
- `src/config/index.ts` - All configuration settings
- `.env` - Environment variables (you need to create this)

### **Database**
- `scripts/init-db.sql` - Database schema
- `src/config/database.ts` - Database connection

## 🎯 What Makes This Special

1. **AI-First Design**: Built specifically for AI agents, not humans
2. **Framework Integrations**: Native support for ADK, LangChain, and AI SDK
3. **Real-time Updates**: Server-Sent Events for live order/monitoring updates
4. **Geocoding**: Automatic conversion of location names to coordinates
5. **Webhook Support**: Can notify external systems of events
6. **Comprehensive Testing**: 141+ tests (89 unit + 52 integration)

## 🔍 Current Status

According to `memory-bank/progress.md`:
- **Overall**: ~65% complete
- **Core Features**: ~85% complete
- **Testing**: 141+ tests passing
- **Demo Agents**: All 3 frameworks complete (ADK, LangChain, AI SDK)

## 🚀 Next Steps to Get It Working

1. **Check if `.env` exists**:
   ```bash
   ls -la .env
   ```

2. **If missing, create it** (see `ENV_SETUP_GUIDE.md`)

3. **Start PostgreSQL**:
   ```bash
   docker-compose up -d postgres
   ```

4. **Initialize database**:
   ```bash
   npm run db:setup
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

6. **Test health endpoint**:
   ```bash
   curl http://localhost:3000/health
   ```

## 📚 Additional Resources

- **Quick Start**: `QUICK_START.md` - 3-step setup guide
- **Environment Setup**: `ENV_SETUP_GUIDE.md` - Detailed .env configuration
- **Architecture**: `docs/architecture.md` - Technical architecture
- **PRD**: `PRD.md` - Product requirements document
- **Troubleshooting**: `demo/ai-sdk-demo/TROUBLESHOOTING.md` - Common issues

## 💡 Summary

**This app is a REST API server that:**
- Receives requests from AI agents
- Translates them to SkyFi's API format
- Stores data in PostgreSQL
- Returns results back to AI agents
- Provides real-time updates via SSE

**It's like a translator/bridge between AI systems and geospatial data services.**

The app is mostly complete but needs:
1. Proper environment configuration (`.env` file)
2. Database setup and running
3. SkyFi API key configured

Once these are set up, it should work!

