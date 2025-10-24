# CS720 Platform Architecture

**Version:** 2.0 (Modular)
**Last Updated:** October 23, 2025

## Overview

CS720 is now a fully modular microservices platform with clear separation of concerns. Each service can be developed, tested, and deployed independently while maintaining a unified frontend experience.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Port 3000)                     │
│                      Single Unified UI (React PWA)               │
└────────┬─────────────┬────────────────┬─────────────────────────┘
         │             │                │
         ▼             ▼                ▼
┌────────────┐  ┌──────────┐  ┌─────────────┐
│  Backend   │  │  Proxy   │  │ AI Service  │
│ (Port 3001)│  │(Port 3002)│  │ (Port 3003) │
└─────┬──────┘  └─────┬────┘  └──────┬──────┘
      │               │               │
      │               │               ├─────► Ollama (11434)
      │               │               │
      │               └───────────────┴─────► OpenAI Compatible Endpoint APIs (via proxy)
      │
      ├─────► Salesforce API
      ├─────► Microsoft Graph API (OneDrive)
      └─────► Business Intelligence APIs (External Web Search API)
```

## Services

### 1. Frontend (Port 3000)

**Location:** `/frontend`

**Technology:** React 18 + TypeScript + Vite PWA

**Responsibilities:**
- Single unified UI for all features
- Customer dashboard and data visualization
- Settings and configuration UI
- Sync management UI
- AI chat interface (integrated from ai-advisor)
- Offline-first with IndexedDB storage

**Key Features:**
- Progressive Web App (PWA) with service worker
- Offline support via IndexedDB (Dexie)
- State management with Zustand
- Responsive design with TailwindCSS
- Communicates with all backend services

### 2. Backend API Service (Port 3001)

**Location:** `/services/backend`

**Technology:** Node.js 20 + Fastify 4 + TypeScript

**Responsibilities:**
- Core business logic and data orchestration
- OAuth authentication (Salesforce, Microsoft)
- Data synchronization from external sources
- Document processing (PDF, DOCX, Markdown)
- Business intelligence integration
- User preferences and configuration

**API Endpoints:**
- **Auth:** `/api/auth/*` (5 endpoints)
- **Sync:** `/api/sync/*` (4 endpoints)
- **Data:** `/api/accounts/*`, `/api/documents/*`, `/api/search` (5 endpoints)
- **AI:** `/api/ai/*` (4 endpoints)
- **BI:** `/api/bi/*` (3 endpoints)
- **Config:** `/api/config/*` (4 endpoints)

**Total:** 22 REST API endpoints + 1 health check

### 3. CORS Proxy Service (Port 3002)

**Location:** `/services/proxy`

**Technology:** Node.js 20 + Express + TypeScript

**Responsibilities:**
- CORS bypass for OpenAI-compatible APIs
- Request proxying with proper headers
- Streaming response support
- Remote endpoint health checking

**API Endpoints:**
- `POST /proxy` - Forward requests to remote APIs
- `GET /health` - Proxy service health
- `POST /health/remote` - Remote endpoint health check

**Use Cases:**
- Enables browser-based apps to call OpenAI-compatible APIs
- Supports both streaming and non-streaming responses
- Handles authentication headers securely

### 4. AI Service (Port 3003)

**Location:** `/services/ai-service`

**Technology:** Node.js 20 + Express + TypeScript

**Responsibilities:**
- AI chat and query processing
- Multi-backend LLM support (Ollama + OpenAI-compatible)
- Automatic failover between backends
- Health monitoring of LLM services
- Model management

**API Endpoints:**
- `POST /query` - AI query with conversation history
- `POST /chat` - Simple chat endpoint
- `GET /health` - Service and backend health
- `GET /models` - List available models
- `GET /config` - AI configuration

**Supported Backends:**
- **Ollama (local):** Direct connection to local LLM
- **OpenAI-compatible (remote):** Via proxy service

### 5. Shared Library

**Location:** `/shared`

**Technology:** TypeScript

**Purpose:**
- Common types and interfaces used across all services
- Shared constants (ports, routes, error codes)
- Utility functions (API helpers, validation, formatting)
- Ensures type consistency across the platform

**Exports:**
- Types: `Account`, `Document`, `ChatMessage`, `SyncJob`, etc.
- Constants: `DEFAULT_PORTS`, `API_ROUTES`, `ERROR_CODES`
- Utils: `createSuccessResponse`, `buildServiceUrl`, `retry`, etc.

## Service Communication

### Frontend ↔ Backend API

```
HTTP REST API
Frontend (3000) → Backend (3001)/api/*
```

**Authentication:** Session-based (cookies)
**Data Format:** JSON
**CORS:** Enabled for `localhost:3000`

### Frontend ↔ AI Service

```
HTTP REST API
Frontend (3000) → AI Service (3003)/*
```

**Data Format:** JSON
**Streaming:** Supported via Server-Sent Events

### AI Service ↔ LLM Backends

```
AI Service (3003) → Ollama (11434)  [Direct HTTP]
AI Service (3003) → Proxy (3002) → OpenAI API  [Via Proxy]
```

**Failover:** Automatic fallback if primary backend unavailable

### Backend ↔ External APIs

```
Backend (3001) → Salesforce API  [OAuth 2.0]
Backend (3001) → Microsoft Graph  [OAuth 2.0]
Backend (3001) → BI Service       [API Key]
```

## Data Flow

### 1. Data Sync Flow

```
User triggers sync
  ↓
Frontend → Backend /api/sync/start
  ↓
Backend orchestrates:
  ├─→ Salesforce API (accounts, opportunities)
  ├─→ Microsoft Graph (OneDrive documents)
  └─→ BI Service (industry insights)
  ↓
Backend processes and stores locally
  ↓
Backend → Frontend (sync status updates)
  ↓
Frontend stores in IndexedDB
```

### 2. AI Query Flow

```
User asks question
  ↓
Frontend → AI Service /query
  ↓
AI Service checks health:
  ├─→ Ollama available? → Use Ollama
  └─→ Else → Use Proxy → OpenAI API
  ↓
AI Service builds context:
  ├─→ System prompt
  ├─→ Account context (from Backend)
  └─→ Conversation history
  ↓
LLM generates response
  ↓
AI Service → Frontend
  ↓
Frontend displays response
```

### 3. Authentication Flow

```
User clicks "Connect Salesforce"
  ↓
Frontend → Backend /api/auth/salesforce/authorize
  ↓
Backend redirects to Salesforce OAuth
  ↓
User authorizes
  ↓
Salesforce → Backend /api/auth/salesforce/callback
  ↓
Backend stores encrypted tokens
  ↓
Backend → Frontend (auth status)
```

## Configuration

### Environment Variables

Each service has its own `.env` file:

**Backend** (`services/backend/.env`):
```env
PORT=3001
SALESFORCE_CLIENT_ID=...
MICROSOFT_CLIENT_ID=...
OLLAMA_BASE_URL=http://localhost:11434
ENCRYPTION_KEY=...
```

**Proxy** (`services/proxy/.env`):
```env
PORT=3002
ALLOWED_ORIGINS=http://localhost:3000
```

**AI Service** (`services/ai-service/.env`):
```env
PORT=3003
PREFERRED_BACKEND=ollama
OLLAMA_URL=http://localhost:11434
PROXY_URL=http://localhost:3002
OPENAI_ENDPOINT=...
OPENAI_API_KEY=...
```

### Service Discovery

Currently using **hardcoded localhost URLs**. Services are configured via:
- Environment variables (ports, URLs)
- Shared constants in `@cs720/shared` package

**Future:** Consider service discovery (Consul, etcd) for production deployments.

## Development Workflow

### Start All Services

```bash
npm run dev
```

This starts:
- Backend API (port 3001)
- CORS Proxy (port 3002)
- AI Service (port 3003)
- Frontend (port 3000)

Services run concurrently with color-coded output.

### Start Individual Services

```bash
npm run dev:frontend    # Frontend only
npm run dev:backend     # Backend only
npm run dev:proxy       # Proxy only
npm run dev:ai          # AI Service only
```

### Health Check

```bash
npm run health
```

Checks all services and displays status:
- ✓ HEALTHY (with latency)
- ⚠ DEGRADED
- ✗ UNAVAILABLE

## Build & Deployment

### Development Build

```bash
npm run build
```

Builds all services:
1. Shared library (TypeScript compilation)
2. Backend service (TypeScript → JS)
3. Proxy service (TypeScript → JS)
4. AI service (TypeScript → JS)
5. Frontend (React → static files)

### Production Deployment

Each service can be deployed independently:

**Option 1: Single Server**
```bash
npm run start  # Starts all backend services
# Serve frontend/dist via nginx/apache
```

**Option 2: Containerized (Docker)**
```bash
docker-compose up
```

**Option 3: Distributed**
- Deploy each service to separate servers/containers
- Update service URLs in environment variables
- Use reverse proxy (nginx) for routing

## Testing

### Unit Tests

```bash
npm run test           # All services
npm run test:backend   # Backend only
npm run test:frontend  # Frontend only
```

### Integration Tests

```bash
npm run test:integration  # (Future)
```

### End-to-End Tests

```bash
npm run test:e2e  # (Future)
```

## Security

### Authentication
- OAuth 2.0 for external services (Salesforce, Microsoft)
- Tokens encrypted with AES-256
- Stored securely on backend filesystem

### CORS
- Strict origin whitelist in production
- Development mode allows all origins

### API Security
- No external backend infrastructure
- All data stays on local machine
- API endpoints protected by session

### Secrets Management
- Environment variables for sensitive config
- `.env` files excluded from git
- Encryption keys required for token storage

## Monitoring & Observability

### Health Checks

All services expose `/health` endpoints:
```json
{
  "status": "healthy|degraded|unhealthy",
  "uptime": 12345,
  "version": "1.0.0"
}
```

### Logging

- Console logging with timestamps
- Color-coded logs in development
- JSON logs in production (future)

### Metrics (Future)

- Request count, latency
- Error rates
- LLM token usage
- Sync job duration

## Performance

### Frontend
- Code splitting with Vite
- Lazy loading of routes
- Service worker caching
- IndexedDB for offline data

### Backend
- Fastify (high-performance framework)
- Async/await throughout
- Connection pooling for external APIs
- File-based storage (simple, fast)

### AI Service
- Local LLM (Ollama) for low latency
- Streaming responses for better UX
- Automatic failover to remote if local unavailable

## Scalability

### Current Limitations
- Single-user application
- File-based storage
- Single server deployment

### Future Scalability
1. **Database:** Replace file storage with PostgreSQL/MongoDB
2. **Caching:** Add Redis for session/data caching
3. **Load Balancing:** Deploy multiple instances behind load balancer
4. **Message Queue:** Use RabbitMQ/Redis for async jobs
5. **Service Mesh:** Implement Istio for service-to-service communication

## Migration from Monolithic

### Changes Made

1. **Created `/services` directory**
   - Moved `backend/` → `services/backend/`
   - Extracted proxy from `ai-advisor/` → `services/proxy/`
   - Created new `services/ai-service/`

2. **Created `/shared` package**
   - Common types, constants, utilities
   - Used by all services via npm workspace

3. **Updated Frontend**
   - Now communicates with multiple backend services
   - AI chat integrated directly into main UI
   - Service URLs configurable via environment

4. **Root `package.json`**
   - Workspace management
   - Unified scripts (dev, build, test, start)
   - Concurrently for parallel service execution

### Breaking Changes

- Service URLs changed (hardcoded ports)
- AI advisor now embedded in frontend (no standalone port 5173)
- Proxy service now standalone (not bundled with ai-advisor)

## Troubleshooting

### Services Won't Start

1. Check ports are available:
   ```bash
   lsof -i :3000 -i :3001 -i :3002 -i :3003
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Build shared library:
   ```bash
   cd shared && npm run build
   ```

### AI Service Not Working

1. Check Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Check proxy is running:
   ```bash
   curl http://localhost:3002/health
   ```

3. Verify AI service config:
   ```bash
   curl http://localhost:3003/health
   ```

### Sync Failing

1. Check backend logs for OAuth errors
2. Verify API credentials in `services/backend/.env`
3. Test external API connectivity

## Future Enhancements

1. **API Gateway:** Single entry point for all services
2. **GraphQL:** Replace REST with GraphQL for flexible queries
3. **WebSockets:** Real-time sync progress updates
4. **Distributed Tracing:** OpenTelemetry for request tracking
5. **Service Mesh:** Istio for advanced traffic management
6. **Kubernetes:** Container orchestration for production
7. **CI/CD:** Automated testing and deployment pipelines

## License

Internal Use Only - Proprietary

---

**For questions or support, contact the engineering team.**
