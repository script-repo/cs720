# CS720 - Customer Intelligence Platform

**Version:** 1.0.0  
**Status:** ✅ Ready for Implementation  
**Last Updated:** October 4, 2025

## Overview

CS720 is a local-first Progressive Web App (PWA) that helps Sales Engineers understand customer context in under 5 minutes during account transitions. It aggregates Salesforce + OneDrive data, provides AI-powered insights, and works offline.

## Quick Stats

- **9 Specialized Agents:** Complete pipeline from problem to solution
- **200+ Pages:** Comprehensive specifications
- **95% Alignment:** Problem → Charter → Flows → Specs
- **3 Gaps Identified:** All manageable, 3-day resolution
- **7 Week Timeline:** To alpha launch

## MVP Features

1. **Customer Profile Dashboard** - Aggregated view of all customer data
2. **Natural Language Query Interface** - AI-powered instant answers
3. **Business Intelligence Integration** - External industry insights

## Success Metrics

- ✅ <5 minutes to answer "What are this customer's top 3 priorities?"
- ✅ ≥80% AI query accuracy
- ✅ Works offline with local LLM fallback

## Architecture

**Frontend:**
- React 18 + Vite 5 + TypeScript
- Progressive Web App (PWA)
- IndexedDB (Dexie) for local storage
- Zustand for state management

**Backend:**
- Node.js 20 + Fastify 4
- Runs locally on SE laptop (localhost:3001)
- OAuth 2.0 (Salesforce, Microsoft)
- Hybrid LLM (OpenAI + Ollama fallback)

**Security:**
- All data stays on laptop
- OAuth tokens encrypted (AES-256)
- No external backend infrastructure

## Folder Structure

```
/cs720/
├── README.md                        # This file
├── ARCHITECTURE.md                  # Detailed architecture documentation
├── /specs/                          # All specification artifacts
│   ├── 01_ProblemOverview.md
│   ├── 02_ProductCharter.md
│   ├── 03_UserJourneyMap.md
│   ├── 04_WireframeBlueprint.md
│   ├── 05_DesignSystemSpec.md
│   ├── 06_FrontendArchitecture.md
│   ├── 07_BackendAPISpec.md
│   ├── 08_TestPlan.md
│   ├── 09_IterationReport.md
│   └── CompletePackage.md           # Master export
├── /shared/                         # Shared types and utilities ✅ NEW
│   ├── src/
│   │   ├── types.ts                 # Common TypeScript types
│   │   ├── constants.ts             # Shared constants
│   │   └── utils.ts                 # Utility functions
│   └── package.json
├── /services/                       # Modular backend services ✅ NEW
│   ├── /backend/                    # Core API (Port 3001) ✅ Moved
│   ├── /proxy/                      # CORS Proxy (Port 3002) ✅ NEW
│   └── /ai-service/                 # AI Chat Service (Port 3003) ✅ NEW
├── /frontend/                       # React PWA (Port 3000) ✅ Implemented
├── /scripts/                        # Utility scripts ✅ NEW
└── package.json                     # Workspace root
```

## Getting Started

### Prerequisites
- Node.js 20+
- Salesforce sandbox account
- OneDrive test tenant
- Ollama (for local LLM)

### Installation

```bash
# Install Ollama
brew install ollama  # macOS
# or download from https://ollama.ai

# Pull local LLM model
ollama serve
ollama pull llama2
```

### Development Setup

> **Windows Users:** If you're on Windows with OneDrive, see [WINDOWS_SETUP.md](./WINDOWS_SETUP.md) for step-by-step instructions to avoid npm/OneDrive conflicts.

```bash
# Clone repository
git clone <repo-url>
cd cs720

# Install all dependencies
# Linux/Mac: npm run install:all
# Windows: See WINDOWS_SETUP.md for manual installation

# Setup environment files
cp services/backend/.env.example services/backend/.env
cp services/proxy/.env.example services/proxy/.env
cp services/ai-service/.env.example services/ai-service/.env
# Edit .env files with your credentials (see SETUP.md)

# Build shared library (required before starting services)
npm run build:shared

# Run all services in development mode
npm run dev          # Starts all services concurrently
# - Backend API: http://localhost:3001
# - CORS Proxy: http://localhost:3002
# - AI Service: http://localhost:3003
# - Frontend: http://localhost:3000

# Or run individual services
npm run dev:frontend    # Frontend only
npm run dev:backend     # Backend only
npm run dev:proxy       # Proxy only
npm run dev:ai          # AI service only

# Check service health
npm run health

# Optional: Local AI (recommended)
ollama serve         # Start Ollama service
ollama pull gemma3:4b-it-qat   # Download AI model
```

## Setup & Documentation

**🚀 Quick Start:** See [SETUP.md](./SETUP.md) for detailed setup instructions
**📋 Checklist:** Use [CHECKLIST.md](./CHECKLIST.md) to track your progress
**🔧 Verification:** Run `node test-setup.js` to verify your setup

All specifications are in the `/specs` folder:

1. **Problem Overview** - Validated problem definition
2. **Product Charter** - MVP scope and constraints
3. **User Journey Map** - 2 complete user flows
4. **Wireframe Blueprint** - 4 screens, interaction specs
5. **Design System Spec** - 12 components, tokens, a11y
6. **Frontend Architecture** - PWA, TypeScript, IndexedDB
7. **Backend/API Spec** - Local server, 22 endpoints
8. **Test Plan** - Comprehensive QA strategy
9. **Iteration Report** - Alignment review, gaps, roadmap

📄 **Master Export:** See `specs/CompletePackage.md` for the comprehensive bundle

## Implementation Roadmap

### Week 4: Gap Resolution (5 days)
- [ ] Define account subset selection logic
- [ ] Implement sync progress SSE
- [ ] Add IndexedDB quota management
- [ ] Enhance test coverage

### Week 5-6: Implementation (10 days)
- [x] Build frontend PWA
- [x] Build local backend server
- [ ] Integrate & test

### Week 7: Alpha Launch (5 days)
- [ ] QA validation
- [ ] Deploy to 5 SE laptops
- [ ] Measure success metrics

## Known Gaps (3 High-Priority)

1. **Account Subset Selection Logic** - Product decision needed (1 day)
2. **Sync Progress Mechanism** - Implement SSE (2 days)
3. **IndexedDB Quota Management** - Add monitoring (1 day)

See `specs/09_IterationReport.md` for detailed gap resolution strategies.

## Tech Stack

**Frontend:**
```json
{
  "framework": "React 18",
  "buildTool": "Vite 5",
  "language": "TypeScript 5",
  "state": "Zustand",
  "storage": "Dexie (IndexedDB)",
  "styling": "Tailwind CSS + CSS Modules",
  "pwa": "vite-plugin-pwa"
}
```

**Backend:**
```json
{
  "runtime": "Node.js 20",
  "framework": "Fastify 4",
  "auth": "OAuth 2.0",
  "llm": "OpenAI + Ollama",
  "docs": "mammoth, pdf-parse",
  "schedule": "node-cron"
}
```

## API Endpoints (22 total)

**Base URL:** `http://localhost:3001`

### Server Health
- `GET /health` - Server health check

**API Base:** `/api`

### Authentication (5 endpoints)
- `GET /auth/status` - Check authentication status for both providers
- `POST /auth/salesforce/authorize` - Initiate Salesforce OAuth flow
- `GET /auth/salesforce/callback` - Handle Salesforce OAuth callback
- `POST /auth/onedrive/authorize` - Initiate Microsoft/OneDrive OAuth flow
- `GET /auth/onedrive/callback` - Handle Microsoft OAuth callback

### Sync (4 endpoints)
- `POST /sync/start` - Start new sync job
- `GET /sync/status/:jobId` - Get sync job status
- `GET /sync/history` - Get sync job history
- `POST /sync/cancel/:jobId` - Cancel running sync job

### Data (5 endpoints)
- `GET /accounts` - Get all synced accounts
- `GET /accounts/:accountId/documents` - Get documents for specific account
- `GET /accounts/:accountId/dashboard` - Get dashboard data for account
- `GET /documents/:documentId` - Get specific document's full content
- `GET /search` - Search across all documents

### AI (4 endpoints)
- `POST /ai/query` - Query AI assistant with natural language
- `GET /ai/chat/:accountId` - Get chat history for an account
- `GET /ai/health` - Check AI/LLM health and availability
- `DELETE /ai/chat/:accountId` - Clear chat history for an account

### Business Intelligence (3 endpoints)
- `GET /bi/insights` - Get industry insights
- `GET /bi/industries` - Get all available industries with insights
- `POST /bi/insights/refresh` - Refresh insights for specific industry

### Config (4 endpoints)
- `GET /config/preferences` - Get user preferences
- `PUT /config/preferences` - Update user preferences
- `POST /config/preferences/reset` - Reset preferences to defaults
- `GET /config/status` - Get application status and configuration

## Success Criteria

**Pre-Launch Checklist:**
- [ ] <5 min context time (≥80% tests)
- [ ] AI accuracy ≥80%
- [ ] Sync success rate ≥95%
- [ ] Zero P0 bugs
- [ ] Offline mode works
- [ ] OAuth tokens encrypted

## v2 Roadmap (8 Enhancements)

1. Deployment Topology Visualization
2. Handoff Checklist Generator
3. Context Timeline View
4. Real-Time Sync (hourly)
5. Multi-User Collaboration
6. Advanced Analytics
7. Mobile Native App
8. Email Integration

## Support

**Documentation:** See `/specs` folder  
**Issues:** Track in GitHub Issues  
**Questions:** Contact engineering team

## License

Internal Use Only - Proprietary

---

**Status:** Modular architecture implemented, ready for testing 🚀

## Modular Architecture Complete ✅

The CS720 platform has been refactored into a fully modular microservices architecture:

### Services
- **Backend API Service** (Port 3001) - 22 REST endpoints, OAuth, sync orchestration
- **CORS Proxy Service** (Port 3002) - OpenAI-compatible API proxy
- **AI Service** (Port 3003) - Multi-backend LLM support with auto-failover
- **Frontend** (Port 3000) - Unified React PWA with all features integrated

### Shared Infrastructure
- **@cs720/shared** - Common types, constants, and utilities used across all services
- **npm Workspaces** - Unified dependency management and build orchestration
- **TypeScript** - Complete type safety across all services

### Key Benefits
✅ **Independent Services** - Each service can be developed, tested, and deployed separately
✅ **Unified UI** - Single frontend provides consistent user experience
✅ **Type Safety** - Shared types ensure consistency across service boundaries
✅ **Scalability** - Services can be scaled independently based on load
✅ **Maintainability** - Clear separation of concerns makes code easier to maintain

### Next Steps
1. Install dependencies: `npm run install:all`
2. Build shared library: `npm run build:shared`
3. Configure environment files (see SETUP.md)
4. Start all services: `npm run dev`
5. Check health: `npm run health`
6. Set up OAuth credentials for Salesforce/OneDrive
7. Configure Ollama for local AI
8. Deploy to SE laptops for alpha testing

### Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture documentation
- **[SETUP.md](./SETUP.md)** - Setup instructions
- **[CHECKLIST.md](./CHECKLIST.md)** - Implementation checklist
