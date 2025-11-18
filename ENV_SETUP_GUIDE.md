# Complete .env Files Setup Guide

This guide shows you **exactly where** to create `.env` files in the SkyFi MCP project.

## 📁 Project Structure

```
skyfi-mcp/
├── .env                    ← MAIN PROJECT (Required)
├── demo/
│   ├── ai-sdk-demo/
│   │   └── .env.local     ← AI SDK DEMO (Required)
│   ├── adk-demo/
│   │   └── .env           ← ADK DEMO (Optional)
│   └── langchain-demo/
│       └── .env            ← LANGCHAIN DEMO (Optional)
```

---

## 1️⃣ Main Project `.env` File

**Location:** `/skyfi-mcp/.env` (project root)

**Purpose:** Configuration for the SkyFi MCP server

**Required Variables:**

```env
# ============================================
# SkyFi MCP Server Configuration
# ============================================

# SkyFi API Key (from SkyFi - your demo key)
SKYFI_API_KEY=053eef6dc8b849358eedaacd5bdd1b8d

# Server Configuration
PORT=3000
NODE_ENV=development
API_VERSION=v1

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/skyfi_mcp
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skyfi_mcp
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Configuration (optional, for caching)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Security Keys (REQUIRED - generate secure random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
API_KEY_ENCRYPTION_KEY=your-32-character-encryption-key-here

# OpenStreetMaps Configuration (optional)
OSM_API_URL=https://nominatim.openstreetmap.org
OSM_USER_AGENT=SkyFi-MCP/1.0.0

# CORS Configuration
CORS_ORIGIN=http://localhost:3001
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**How to Create:**
```bash
cd /path/to/skyfi-mcp
touch .env
# Then copy the variables above and fill in your values
```

**Important Notes:**
- `SKYFI_API_KEY` = Your SkyFi demo API key (from SkyFi)
- `API_KEY_ENCRYPTION_KEY` = Must be exactly 32 characters (for AES-256)
- `JWT_SECRET` = Should be a long random string (minimum 32 characters)

**Generate Secure Keys:**
```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate API_KEY_ENCRYPTION_KEY (must be 32 chars)
openssl rand -base64 24 | head -c 32
```

---

## 2️⃣ AI SDK Demo `.env.local` File

**Location:** `/skyfi-mcp/demo/ai-sdk-demo/.env.local`

**Purpose:** Configuration for the Next.js AI SDK demo application

**Required Variables:**

```env
# ============================================
# AI SDK Demo Configuration
# ============================================

# OpenAI API Key (REQUIRED for AI responses)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# SkyFi MCP Server API Key (REQUIRED - generated from MCP server)
# This is NOT the SkyFi demo key - it's an API key generated from the MCP server
# Generate it by calling: POST http://localhost:3000/v1/auth/api-key
SKYFI_API_KEY=skf_xxxxx

# OR use SKYFI_DEMO_API_KEY (alternative name, same purpose)
# SKYFI_DEMO_API_KEY=skf_xxxxx

# SkyFi MCP Server Base URL
SKYFI_BASE_URL=http://localhost:3000/v1
```

**How to Create:**
```bash
cd /path/to/skyfi-mcp/demo/ai-sdk-demo
touch .env.local
# Then copy the variables above and fill in your values
```

**Important Notes:**
- `OPENAI_API_KEY` = Your OpenAI API key (required)
- `SKYFI_API_KEY` = API key generated from the MCP server (NOT the SkyFi demo key)
- To generate MCP server API key:
  ```bash
  curl -X POST http://localhost:3000/v1/auth/api-key \
    -H "Content-Type: application/json" \
    -d '{"email": "demo@test.com", "expiresInDays": 365}'
  ```

---

## 3️⃣ ADK Demo `.env` File

**Location:** `/skyfi-mcp/demo/adk-demo/.env`

**Purpose:** Configuration for the ADK demo agent

**Required Variables:**

```env
# ============================================
# ADK Demo Configuration
# ============================================

# SkyFi MCP Server API Key (generated from MCP server)
SKYFI_API_KEY=skf_xxxxx

# SkyFi MCP Server Base URL (optional)
SKYFI_BASE_URL=http://localhost:3000/v1
```

**How to Create:**
```bash
cd /path/to/skyfi-mcp/demo/adk-demo
touch .env
# Then copy the variables above and fill in your values
```

**Note:** This demo can run in demo mode without the API key, but full functionality requires it.

---

## 4️⃣ LangChain Demo `.env` File

**Location:** `/skyfi-mcp/demo/langchain-demo/.env`

**Purpose:** Configuration for the LangChain demo agent

**Required Variables:**

```env
# ============================================
# LangChain Demo Configuration
# ============================================

# OpenAI API Key (required for LangChain agent)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# SkyFi MCP Server API Key (generated from MCP server)
SKYFI_API_KEY=skf_xxxxx

# SkyFi MCP Server Base URL (optional)
SKYFI_BASE_URL=http://localhost:3000/v1
```

**How to Create:**
```bash
cd /path/to/skyfi-mcp/demo/langchain-demo
touch .env
# Then copy the variables above and fill in your values
```

---

## 🔑 Understanding API Keys

### Two Different Types of API Keys:

1. **SkyFi Demo API Key** (`053eef6dc8b849358eedaacd5bdd1b8d`)
   - Goes in: **Main project `.env`** as `SKYFI_API_KEY`
   - Purpose: Allows MCP server to connect to SkyFi's external API
   - Source: Provided by SkyFi

2. **MCP Server API Key** (`skf_xxxxx`)
   - Goes in: **Demo `.env.local` or `.env`** files
   - Purpose: Authenticates demo apps with the MCP server
   - Source: Generated from MCP server endpoint

### Flow:
```
SkyFi Demo API Key → MCP Server → SkyFi External API
MCP Server API Key → Demo Apps → MCP Server
```

---

## ✅ Quick Setup Checklist

### Step 1: Main Project
- [ ] Create `.env` in project root
- [ ] Add `SKYFI_API_KEY` (SkyFi demo key)
- [ ] Add `API_KEY_ENCRYPTION_KEY` (32 chars)
- [ ] Add `JWT_SECRET` (32+ chars)
- [ ] Configure database URL

### Step 2: Start MCP Server
- [ ] Run `npm run dev` in main project
- [ ] Verify server is running: `curl http://localhost:3000/health`
- [ ] Generate MCP server API key:
  ```bash
  curl -X POST http://localhost:3000/v1/auth/api-key \
    -H "Content-Type: application/json" \
    -d '{"email": "demo@test.com", "expiresInDays": 365}'
  ```
- [ ] Save the returned `skf_xxxxx` key

### Step 3: AI SDK Demo
- [ ] Create `.env.local` in `demo/ai-sdk-demo/`
- [ ] Add `OPENAI_API_KEY`
- [ ] Add `SKYFI_API_KEY` (the `skf_xxxxx` from Step 2)
- [ ] Add `SKYFI_BASE_URL=http://localhost:3000/v1`

### Step 4: Test
- [ ] Start MCP server: `npm run dev` (in main project)
- [ ] Start AI SDK demo: `cd demo/ai-sdk-demo && npm run dev`
- [ ] Open `http://localhost:3001` in browser

---

## 🚨 Common Mistakes

### ❌ Wrong: Putting SkyFi demo key in demo `.env.local`
```env
# WRONG - This is the SkyFi demo key, not the MCP server key
SKYFI_API_KEY=053eef6dc8b849358eedaacd5bdd1b8d
```

### ✅ Correct: Using generated MCP server key in demo `.env.local`
```env
# CORRECT - This is generated from the MCP server
SKYFI_API_KEY=skf_abc123xyz789...
```

### ❌ Wrong: Missing encryption key
```env
# WRONG - Too short
API_KEY_ENCRYPTION_KEY=short
```

### ✅ Correct: 32-character encryption key
```env
# CORRECT - Exactly 32 characters
API_KEY_ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456
```

---

## 📝 Environment Variable Reference

### Main Project (`.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|--------------|
| `SKYFI_API_KEY` | ✅ Yes | - | SkyFi demo API key |
| `API_KEY_ENCRYPTION_KEY` | ✅ Yes | - | 32-char encryption key |
| `JWT_SECRET` | ✅ Yes | - | JWT signing secret |
| `DATABASE_URL` | ⚠️ Recommended | `postgresql://...` | PostgreSQL connection |
| `PORT` | ❌ No | `3000` | Server port |
| `NODE_ENV` | ❌ No | `development` | Environment |

### AI SDK Demo (`.env.local`)
| Variable | Required | Default | Description |
|----------|----------|---------|--------------|
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API key |
| `SKYFI_API_KEY` | ⚠️ For full features | - | MCP server API key |
| `SKYFI_BASE_URL` | ❌ No | `http://localhost:3000/v1` | MCP server URL |

### ADK Demo (`.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|--------------|
| `SKYFI_API_KEY` | ⚠️ For full features | - | MCP server API key |
| `SKYFI_BASE_URL` | ❌ No | `http://localhost:3000/v1` | MCP server URL |

### LangChain Demo (`.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|--------------|
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API key |
| `SKYFI_API_KEY` | ⚠️ For full features | - | MCP server API key |
| `SKYFI_BASE_URL` | ❌ No | `http://localhost:3000/v1` | MCP server URL |

---

## 🔍 Verify Your Setup

### Check Main Project `.env`
```bash
cd /path/to/skyfi-mcp
cat .env | grep -E "SKYFI_API_KEY|API_KEY_ENCRYPTION_KEY|JWT_SECRET"
```

### Check AI SDK Demo `.env.local`
```bash
cd /path/to/skyfi-mcp/demo/ai-sdk-demo
cat .env.local | grep -E "OPENAI_API_KEY|SKYFI_API_KEY"
```

### Test MCP Server
```bash
curl http://localhost:3000/health
# Should return: {"status":"healthy",...}
```

### Test MCP Server API Key
```bash
curl -X POST http://localhost:3000/v1/auth/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer skf_xxxxx" \
  -d '{"apiKey": "skf_xxxxx"}'
```

---

## 📚 Additional Resources

- **Main README**: `README.md` - Project overview
- **Quick Start**: `QUICK_START.md` - 3-step setup guide
- **AI SDK Testing**: `demo/ai-sdk-demo/TESTING.md` - Detailed testing guide
- **Troubleshooting**: `demo/ai-sdk-demo/TROUBLESHOOTING.md` - Common issues

---

## 🆘 Need Help?

If you're still having issues:

1. Check that all `.env` files are in the correct locations
2. Verify API keys are correct (SkyFi key vs MCP server key)
3. Ensure MCP server is running before starting demos
4. Check server logs for detailed error messages
5. Review `TROUBLESHOOTING.md` for common solutions

