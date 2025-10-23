# CS720 Complete Specification Package
## Customer Intelligence Platform for Sales Engineers

**Version:** 1.0.0  
**Date:** October 4, 2025  
**Status:** ✅ Ready for Implementation (after gap resolution)  
**Pipeline:** 9 Agents Complete

---

## 📋 Executive Summary

**Product:** CS720 - Customer Intelligence Platform  
**Problem:** Sales Engineers lose critical customer context during account transitions due to scattered information across systems, resulting in hours of manual work to ramp up on new accounts.

**Solution:** Local-first Progressive Web App (PWA) that aggregates Salesforce + OneDrive data, provides AI-powered natural language insights, and enables <5 minute customer context understanding.

**MVP Features (3):**
1. Customer Profile Dashboard - Aggregated view of all customer data
2. Natural Language Query Interface - Ask questions, get instant AI-powered answers
3. Business Intelligence Integration - External industry insights for strategic context

**Success Metrics:**
- <5 minutes to answer "What are this customer's top 3 priorities?"
- ≥80% AI query accuracy
- Works offline with local LLM fallback

**Timeline:** 7 weeks to alpha launch (3 weeks spec → 1 week gap resolution → 3 weeks implementation)

**Readiness:** 85% (3 high-priority gaps identified, 3-day resolution time)

---

## 📚 Complete Artifact Collection

### 1. Problem Discovery - Callie Quest
**File:** `CallieQuest-CS720-20251004-144500.md`  
**Purpose:** Validated problem definition and user research

**Key Outputs:**
- Core Problem: Account transitions lose critical context (hours → minutes goal)
- Primary Users: Sales Engineers
- Scale: 400-500 enterprise sites per SE
- Pain Points: Scattered info, manual handoffs, institutional knowledge loss
- How Might We: "Give SEs instant, comprehensive customer visibility during transitions"

**Page Count:** ~8 pages

---

### 2. Product Charter - Mara Focus
**File:** `MaraFocus-CS720-20251004-145200.md`  
**Purpose:** MVP scope definition and constraints

**Key Outputs:**
- Goal: Fast handoff tool (hours → minutes)
- MVP Features: Dashboard + NL Query + BI Integration (3 features)
- Platform: Local web app, daily sync, Salesforce + OneDrive
- Constraints: Markdown data format, subset sync, external+local LLM
- Out of Scope: 6 features deferred to v2
- Success Metrics: <5 min context, 80% query accuracy

**Page Count:** ~10 pages

---

### 3. User Journey Mapping - Lyra Path
**File:** `LyraPath-CS720-20251004-150500.md`  
**Purpose:** User flow definition with emotional context

**Key Outputs:**
- Flow A: Account Transition Onboarding (8 stages, Overwhelmed → Confident)
- Flow B: Pre-Meeting Preparation (7 stages, Urgent → Confident)
- Edge Cases: 8 scenarios (sync failure, AI timeout, missing data, etc.)
- Emotional Arc: Validates <5 min confidence building
- Decision Log: Flow prioritization rationale

**Page Count:** ~18 pages

---

### 4. Wireframe Blueprint - Naya Wire
**File:** `NayaWire-CS720-20251004-151500.md`  
**Purpose:** Structural wireframes and interaction specs

**Key Outputs:**
- 4 Core Screens: Main Dashboard, Detail Modals, Initial Load, Settings
- Persistent UI: Sidebar (280px), AI Panel (380px), Global Header, Footer
- 6 Dashboard Cards: Priorities, Dates, Projects, Issues, Tickets, BI
- Interaction Patterns: Click-to-modal, keyboard shortcuts, delta indicators
- States: Loading, Empty, Error, Stale Data
- Accessibility: Keyboard nav, screen reader support, WCAG AA

**Page Count:** ~22 pages

---

### 5. Design System Spec - Aria Patterns
**File:** `AriaPatterns-CS720-20251004-152200.md`  
**Purpose:** Tokens, components, and accessibility contracts

**Key Outputs:**
- Tokens: Typography (Inter, 5-level scale), Colors (purple-blue gradient #7C3AED → #6366F1), Spacing (4-48px), Motion (150/300/500ms)
- 12 Components: Button, Card, Badge, Input, Modal, Avatar, Progress, Tooltip, Skeleton, Toast, Sidebar, ChatMessage
- Each Component: Props, States, A11y contracts, CSS examples
- Dark Theme: Optimized for extended use
- Accessibility: WCAG AA, keyboard nav, screen reader, reduced motion

**Page Count:** ~28 pages

---

### 6. Frontend Architecture - Cyrus Stack
**File:** `CyrusStack-CS720-20251004-153500.md`  
**Purpose:** Technical architecture and implementation spec

**Key Outputs:**
- Tech Stack: React 18 + Vite 5 + TypeScript, PWA, Zustand, Dexie (IndexedDB)
- Routes: 4 routes (hash-based for offline)
- Component Tree: Full hierarchy for each route
- TypeScript Interfaces: 20+ types (Account, Document, Project, ChatMessage, SyncJob, etc.)
- Data Architecture: IndexedDB (all persistent), localStorage (transient UI only)
- Integration Points: Salesforce, OneDrive, OpenAI/Ollama, BI APIs
- Performance: Code splitting, virtual scrolling, debounced search

**Page Count:** ~32 pages

---

### 7. Backend/API Spec - Eko Logic
**File:** `EkoLogic-CS720-20251004-154500.md`  
**Purpose:** Local backend server and API definition

**Key Outputs:**
- Architecture: Local Fastify server (localhost:3001), fully local (no cloud)
- 15 API Endpoints: Auth (3), Sync (3), Data (3), AI (2), BI (1), Config (2), Health (1)
- Document Pipeline: OneDrive/Salesforce → Download → Convert to Markdown (mammoth/pdf-parse) → IndexedDB
- LLM Proxy: External (OpenAI) primary, Local (Ollama) fallback
- Sync Orchestrator: Daily cron (6am) + manual trigger
- OAuth Security: Tokens encrypted (AES-256), local storage
- Mock Responses: Complete examples for frontend dev

**Page Count:** ~30 pages

---

### 8. Test Plan & Quality Report - Kyra Gauge
**File:** `KyraGauge-CS720-20251004-155500.md`  
**Purpose:** Comprehensive test plan and QA strategy

**Key Outputs:**
- Strategy: 80% Manual, 20% Automated (pragmatic for MVP)
- Test Environment: Single laptop, test Salesforce org, OneDrive tenant
- 10 User Stories: With acceptance criteria
- Test Matrix: Happy paths (3), Edge cases (5), Negative tests (4)
- Top 5 Priority Scenarios: Account Transition <5min, AI 80% accuracy, Sync success, Offline mode, OAuth security
- Automated Suite: API tests (Jest), Smoke tests (bash)
- Quality Gates: Zero P0 bugs, 80% success metrics met

**Page Count:** ~24 pages

---

### 9. Iteration Report - Evelyn Compass
**File:** `EvelynCompass-CS720-20251004-160500.md`  
**Purpose:** Alignment review and next-cycle planning

**Key Outputs:**
- Alignment Assessment: 95% overall (Problem → Charter → Flows → Specs)
- 8 Major Strengths: Clear problem, smart scope, cohesive design, pragmatic architecture
- 3 High-Priority Gaps: Account subset logic, sync progress mechanism, quota management
- 2 Medium-Priority Gaps: "New" badge style, markdown conversion tests
- 8 v2 Enhancements: Topology viz, handoff checklist, timeline, real-time sync, collaboration, analytics, mobile, email
- Technical Debt: LOW (intentional MVP trade-offs)
- Risk Analysis: MEDIUM-LOW (manageable)
- Recommendation: GO for implementation after 3-day gap resolution

**Page Count:** ~28 pages

---

## 📊 Quick Reference Guide

### Tech Stack Summary

**Frontend:**
```
Framework: React 18 + Vite 5
Language: TypeScript 5
Architecture: Progressive Web App (PWA)
Routing: react-router-dom (hash-based)
State: Zustand
Storage: Dexie (IndexedDB wrapper)
Styling: CSS Modules + Tailwind CSS
```

**Backend:**
```
Runtime: Node.js 20+
Framework: Fastify 4
Location: Local (localhost:3001)
Auth: OAuth 2.0 (Salesforce, Microsoft)
Document Processing: mammoth, pdf-parse, marked
LLM: OpenAI SDK (external) + Ollama (local fallback)
Scheduling: node-cron
```

**Infrastructure:**
```
Deployment: SE Laptop (fully local)
Database: IndexedDB (browser native)
Sync: Daily (6am) + manual trigger
Offline: Full PWA support with Service Worker
Security: AES-256 token encryption, local-only storage
```

---

### API Endpoint Quick Reference

**Base URL:** `http://localhost:3001/api`

#### Authentication
- `POST /auth/salesforce/authorize` - Initiate Salesforce OAuth
- `POST /auth/onedrive/authorize` - Initiate OneDrive OAuth
- `GET /auth/status` - Check auth status

#### Sync
- `POST /sync/start` - Initiate manual sync
- `GET /sync/status/:jobId` - Get sync progress
- `GET /sync/history` - Get sync job history

#### Data Retrieval
- `GET /accounts` - Get all synced accounts
- `GET /accounts/:id/documents` - Get account documents
- `GET /accounts/:id/dashboard` - Get all dashboard data

#### AI/LLM
- `POST /ai/query` - Query AI assistant
- `GET /ai/health` - Check LLM availability

#### Business Intelligence
- `GET /bi/insights` - Fetch industry intelligence

#### Configuration
- `GET /config/preferences` - Get user preferences
- `PUT /config/preferences` - Update preferences

---

### Data Model Quick Reference

**Core Entities:**
```typescript
Account (Salesforce)
  ├── Documents (OneDrive + Salesforce)
  ├── Projects (Derived from docs)
  ├── Priorities (Extracted from docs)
  ├── Issues/Tickets (Salesforce Cases)
  ├── Upcoming Dates (Salesforce Opportunities)
  └── Industry Intelligence (External BI)

ChatMessage
  └── Account (context)

SyncJob
  └── Progress (Salesforce, OneDrive, BI)
```

**Storage Strategy:**
- **IndexedDB (Dexie):** All persistent data (accounts, documents, chat, sync metadata)
- **LocalStorage:** Transient UI only (sidebar state, theme)
- **Service Worker Cache:** Static assets (cache-first strategy)

---

### Component Library Quick Reference

**12 Core Components:**
1. **Button** - 5 variants (primary, secondary, tertiary, danger, ghost)
2. **Card** - Dashboard container with elevation
3. **Badge** - Status indicators (status, opportunity, severity)
4. **Input** - Text, search, textarea variants
5. **Modal** - Overlay with focus trap
6. **Avatar** - User representation (xs/sm/md/lg)
7. **Progress Bar** - Determinate/indeterminate
8. **Tooltip** - Contextual help
9. **Skeleton Loader** - Loading placeholders
10. **Toast Notification** - Feedback messages
11. **Sidebar** - Account navigation
12. **Chat Message** - AI conversation

**Design Tokens:**
- **Colors:** Purple-blue gradient (#7C3AED → #6366F1), dark theme
- **Typography:** Inter font, 5-level scale (32/24/18/14/12px)
- **Spacing:** 4/8/16/24/32/48px scale
- **Motion:** 150ms (fast), 300ms (normal), 500ms (slow)

---

## 🚧 Known Gaps & Resolutions

### High Priority (Must Resolve Before v1)

#### Gap 1: Account Subset Selection Logic
**Status:** ⚠️ Requires Product Decision  
**Impact:** Backend doesn't know which accounts to sync first  
**Resolution Options:**
- Option A: User selects in Settings (manual control)
- Option B: Sync "favorites" or "recently viewed" first (intelligent)
- Option C: Sync all accounts, paginate display (simple)

**Recommended:** Option B (intelligent prioritization)  
**Owner:** Product + Backend  
**Effort:** 1 day

---

#### Gap 2: Sync Progress Update Mechanism
**Status:** ⚠️ Requires Technical Decision  
**Impact:** Frontend can't show real-time progress  
**Resolution Options:**
- Option A: Server-Sent Events (SSE) - Simple, one-way
- Option B: WebSocket - Bidirectional, complex
- Option C: HTTP Polling - Inefficient

**Recommended:** Option A (SSE for sync progress)  
**Owner:** Backend + Frontend  
**Effort:** 2 days

**Implementation:**
```javascript
// Backend: Add SSE endpoint
app.get('/sync/progress/:jobId', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send progress updates
  const interval = setInterval(() => {
    const progress = getSyncProgress(req.params.jobId);
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
    
    if (progress.status === 'completed') {
      clearInterval(interval);
      res.end();
    }
  }, 1000);
});

// Frontend: Subscribe to SSE
const eventSource = new EventSource(`/sync/progress/${jobId}`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  updateSyncStore(progress);
};
```

---

#### Gap 3: IndexedDB Quota Management
**Status:** ⚠️ Requires Implementation  
**Impact:** App breaks when storage quota exceeded  
**Resolution:**

**Implementation:**
```javascript
// Monitor quota
async function checkStorageQuota() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const percentUsed = (estimate.usage / estimate.quota) * 100;
    
    if (percentUsed > 80) {
      showToast({
        message: 'Storage almost full (80%). Delete old data?',
        variant: 'warning',
        action: {
          label: 'Manage Storage',
          onClick: () => navigate('/settings')
        }
      });
    }
    
    if (percentUsed > 95) {
      // Critical: Prevent new syncs
      throw new Error('Storage quota exceeded. Delete data to continue.');
    }
  }
}

// Add to Settings UI
function StorageManagement() {
  const [usage, setUsage] = useState({ used: 0, total: 0 });
  
  useEffect(() => {
    navigator.storage.estimate().then(({ usage, quota }) => {
      setUsage({ used: usage, total: quota });
    });
  }, []);
  
  return (
    <div>
      <ProgressBar value={(usage.used / usage.total) * 100} />
      <p>{formatBytes(usage.used)} / {formatBytes(usage.total)} used</p>
      <Button onClick={cleanupOldData}>Delete Old Data</Button>
    </div>
  );
}
```

**Owner:** Frontend  
**Effort:** 1 day

---

### Medium Priority (Nice to Have)

#### Gap 4: "New" Badge Visual Style
**Status:** ⚠️ Requires Design Spec  
**Resolution:**
```css
.badge-new {
  position: absolute;
  top: 8px;
  right: 8px;
  background: linear-gradient(135deg, #7C3AED, #6366F1);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
```

**Owner:** Design System  
**Effort:** 0.5 days

---

#### Gap 5: Markdown Conversion Edge Cases
**Status:** ⚠️ Requires Test Coverage  
**Resolution:** Add tests for:
- Complex PDF tables → Markdown tables
- DOCX embedded images → Markdown image links
- Nested lists in HTML → Markdown lists
- Special characters (emoji, symbols) preservation

**Owner:** QA + Backend  
**Effort:** 1 day

---

## 🛠️ Implementation Roadmap

### Week 4: Gap Resolution (5 days)
**Goal:** Resolve all high-priority gaps

**Day 1:**
- [ ] Product decision: Account subset logic (Option B - intelligent)
- [ ] Update backend sync service with prioritization logic
- [ ] Update frontend Settings UI for manual override

**Day 2:**
- [ ] Implement SSE endpoint for sync progress (backend)
- [ ] Implement SSE client in frontend (Zustand store integration)
- [ ] Test real-time progress updates

**Day 3:**
- [ ] Add IndexedDB quota monitoring (frontend)
- [ ] Implement storage management UI in Settings
- [ ] Add cleanup utilities (delete old accounts/docs)

**Day 4:**
- [ ] Add markdown conversion edge case tests
- [ ] Define "New" badge visual style
- [ ] Update Design System spec

**Day 5:**
- [ ] Re-run alignment review
- [ ] Update all affected artifacts
- [ ] Final QA sign-off on gap resolutions

---

### Week 5: Frontend Implementation (5 days)

**Day 1: Project Setup**
- [ ] Initialize React + Vite project
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up PWA (vite-plugin-pwa)
- [ ] Configure Tailwind CSS

**Day 2: Core Infrastructure**
- [ ] Set up react-router-dom (hash routing)
- [ ] Initialize Zustand stores (5 stores)
- [ ] Set up Dexie database schema
- [ ] Implement authentication flow

**Day 3: Dashboard & Components**
- [ ] Build Sidebar (account list)
- [ ] Build AI Panel (chat interface)
- [ ] Build 6 Dashboard Cards
- [ ] Build Modal system

**Day 4: Data Integration**
- [ ] Connect to backend APIs
- [ ] Implement data sync flow
- [ ] Implement AI query integration
- [ ] Add error handling

**Day 5: Polish & Testing**
- [ ] Add loading/empty/error states
- [ ] Implement keyboard shortcuts
- [ ] Add accessibility features
- [ ] Manual testing

---

### Week 6: Backend Implementation (5 days)

**Day 1: Project Setup**
- [ ] Initialize Fastify project
- [ ] Set up TypeScript, ESLint
- [ ] Configure OAuth (Salesforce, Microsoft)
- [ ] Set up local file storage (.cs720 directory)

**Day 2: Authentication & Sync**
- [ ] Implement OAuth flows
- [ ] Build token encryption/storage
- [ ] Implement sync orchestrator
- [ ] Set up cron scheduling

**Day 3: Data Pipeline**
- [ ] Implement Salesforce sync service
- [ ] Implement OneDrive sync service
- [ ] Build document transformation pipeline
- [ ] Implement BI aggregation

**Day 4: LLM Integration**
- [ ] Build LLM proxy service
- [ ] Implement external LLM (OpenAI)
- [ ] Implement local LLM fallback (Ollama)
- [ ] Add source citation extraction

**Day 5: Integration & Testing**
- [ ] Connect frontend ↔ backend
- [ ] Test full sync flow
- [ ] Test AI queries end-to-end
- [ ] Run automated API tests

---

### Week 7: QA & Alpha Launch (5 days)

**Day 1: Manual Testing**
- [ ] Execute all happy path tests
- [ ] Execute edge case tests
- [ ] Execute negative tests
- [ ] Verify Top 5 priority scenarios

**Day 2: Automated Testing**
- [ ] Run full automated test suite
- [ ] Fix critical bugs (P0)
- [ ] Fix high-priority bugs (P1)

**Day 3: Performance & Security**
- [ ] Load test (500 accounts, 5000 docs)
- [ ] Security audit (token encryption, HTTPS)
- [ ] Accessibility audit (WCAG AA)
- [ ] Measure success metrics (<5 min, 80% accuracy)

**Day 4: Alpha Deployment**
- [ ] Deploy to 5 SE laptops
- [ ] Provide training/onboarding
- [ ] Set up feedback collection

**Day 5: Monitoring & Feedback**
- [ ] Monitor alpha usage
- [ ] Collect feedback
- [ ] Measure success metrics
- [ ] Go/No-Go decision for beta

---

## 📁 File Structure for Implementation

```
/cs720-project/
├── README.md                          # Project overview
├── .gitignore
├── package.json
│
├── /specs/                            # All specification artifacts
│   ├── 01_CallieQuest_ProblemOverview.md
│   ├── 02_MaraFocus_ProductCharter.md
│   ├── 03_LyraPath_UserJourneyMap.md
│   ├── 04_NayaWire_WireframeBlueprint.md
│   ├── 05_AriaPatterns_DesignSystemSpec.md
│   ├── 06_CyrusStack_FrontendArchitecture.md
│   ├── 07_EkoLogic_BackendAPISpec.md
│   ├── 08_KyraGauge_TestPlan.md
│   ├── 09_EvelynCompass_IterationReport.md
│   └── CS720_CompletePackage.md      # This file
│
├── /frontend/                         # React PWA
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── /src/
│   │   ├── /components/
│   │   │   ├── /atoms/
│   │   │   ├── /molecules/
│   │   │   ├── /organisms/
│   │   │   └── /layouts/
│   │   ├── /pages/
│   │   ├── /store/
│   │   ├── /db/
│   │   ├── /services/
│   │   ├── /hooks/
│   │   ├── /utils/
│   │   ├── /types/
│   │   └── /workers/
│   └── /public/
│
├── /backend/                          # Fastify API
│   ├── package.json
│   ├── tsconfig.json
│   ├── /src/
│   │   ├── /routes/
│   │   ├── /services/
│   │   ├── /utils/
│   │   ├── /types/
│   │   └── server.ts
│   └── /.cs720/                       # Local storage
│       ├── /auth/                     # Encrypted tokens
│       ├── /logs/
│       └── /sync-history/
│
├── /tests/                            # Test suites
│   ├── /unit/
│   ├── /integration/
│   ├── /e2e/
│   └── /manual/                       # Test scripts
│
└── /docs/                             # Additional documentation
    ├── setup-guide.md
    ├── deployment.md
    └── troubleshooting.md
```

---

## 🎯 Success Criteria Validation

### Pre-Launch Checklist

**Product Validation:**
- [ ] <5 min context time achieved (≥80% of tests)
- [ ] AI query accuracy ≥80%
- [ ] All 3 MVP features working
- [ ] Both user flows tested and validated

**Technical Validation:**
- [ ] PWA installable on desktop
- [ ] Works offline with local LLM
- [ ] Sync completes in <5 min (25 accounts)
- [ ] OAuth flows secure (tokens encrypted)
- [ ] IndexedDB quota managed

**Quality Validation:**
- [ ] Zero P0 (Critical) bugs
- [ ] ≤5 P1 (High) bugs
- [ ] All Top 5 priority scenarios pass
- [ ] Automated test suite passes (20%)
- [ ] Manual test matrix complete (80%)

**Security Validation:**
- [ ] OAuth tokens encrypted (AES-256)
- [ ] No data sent to external servers
- [ ] HTTPS on local endpoints
- [ ] Audit logging functional

**UX Validation:**
- [ ] WCAG AA compliance
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Dark theme consistent

---

## 📊 Metrics Dashboard

### Alpha Phase Metrics (Week 7)

**Usage Metrics:**
- Daily Active Users (DAU)
- Accounts viewed per day
- AI queries per session
- Sync frequency (manual vs. scheduled)

**Performance Metrics:**
- Average time to context (target: <5 min)
- AI response time (target: <5s external, <10s local)
- Dashboard load time (target: <3s)
- Sync duration (target: <5 min for 25 accounts)

**Quality Metrics:**
- AI query accuracy (target: ≥80%)
- Sync success rate (target: ≥95%)
- Error rate (target: <1%)
- Crash-free sessions (target: >99%)

**User Satisfaction:**
- Net Promoter Score (NPS)
- Qualitative feedback themes
- Feature usage distribution
- Pain points identified

---

## 🔄 v2 Roadmap (Post-MVP)

### Enhancements (8 planned)

1. **Deployment Topology Visualization**
   - Visual map of 400-500 sites
   - Infrastructure diagram
   - Site health indicators

2. **Handoff Checklist Generator**
   - Automated transition checklist
   - Track handoff completion
   - Email digest for stakeholders

3. **Context Timeline View**
   - Chronological project history
   - Event stream (meetings, milestones, issues)
   - Filterable by type/date

4. **Real-Time Sync**
   - Hourly updates (vs. daily)
   - Delta sync (only changed data)
   - Push notifications for critical updates

5. **Multi-User Collaboration**
   - Team insights sharing
   - Collaborative notes
   - Activity feed

6. **Advanced Analytics**
   - Churn risk prediction
   - Upsell opportunity detection
   - Trend analysis

7. **Mobile Native App**
   - iOS/Android apps
   - Push notifications
   - Optimized mobile UX

8. **Email Integration**
   - Sync email threads
   - Extract insights from conversations
   - Link emails to projects

### Technical Debt Resolution

1. **Increase Test Automation**
   - 80/20 → 50/50 split
   - Add E2E Playwright suite
   - CI/CD integration

2. **Performance Optimization**
   - Caching for document transformation
   - Optimize IndexedDB queries
   - Virtual scrolling for all lists

3. **Enhanced Security**
   - 2FA for OAuth
   - Biometric authentication (desktop)
   - Advanced encryption options

---

## 📞 Support & Resources

### Key Contacts

**Product Team:**
- Product Owner: [Name] - product@cs720.example.com
- UX Designer: [Name] - design@cs720.example.com

**Engineering Team:**
- Tech Lead: [Name] - tech@cs720.example.com
- Frontend Lead: [Name] - frontend@cs720.example.com
- Backend Lead: [Name] - backend@cs720.example.com

**QA Team:**
- QA Lead: [Name] - qa@cs720.example.com

### Documentation Links

- Salesforce API Docs: https://developer.salesforce.com/docs/apis
- Microsoft Graph Docs: https://docs.microsoft.com/en-us/graph/
- OpenAI API Docs: https://platform.openai.com/docs
- Ollama Docs: https://github.com/ollama/ollama
- React PWA Guide: https://create-react-app.dev/docs/making-a-progressive-web-app/
- Dexie.js Docs: https://dexie.org/

### Development Setup

**Prerequisites:**
```bash
# Node.js 20+
node --version

# Install Ollama (local LLM)
# macOS
brew install ollama
ollama serve
ollama pull llama2

# Windows
# Download from https://ollama.ai
```

**Clone & Install:**
```bash
# Clone repository
git clone https://github.com/your-org/cs720.git
cd cs720

# Install frontend
cd frontend
npm install

# Install backend
cd ../backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

**Run Development:**
```bash
# Terminal 1: Backend
cd backend
npm run dev
# Runs on http://localhost:3001

# Terminal 2: Frontend
cd frontend
npm run dev
# Runs on http://localhost:3000

# Terminal 3: Ollama (if not running)
ollama serve
```

---

## ✅ Sign-Off & Approvals

**Specification Review:**
- [ ] Product Owner approval
- [ ] Tech Lead approval
- [ ] UX Designer approval
- [ ] QA Lead approval

**Gap Resolution:**
- [ ] Gap #1 resolved (Account subset logic)
- [ ] Gap #2 resolved (Sync progress SSE)
- [ ] Gap #3 resolved (Quota management)
- [ ] Gap #4 resolved ("New" badge style)
- [ ] Gap #5 resolved (Markdown tests)

**Ready for Implementation:**
- [ ] All artifacts reviewed
- [ ] All gaps resolved
- [ ] Test environment set up
- [ ] Development team onboarded
- [ ] Sprint backlog created

**Sign-off Date:** __________________

**Approved By:**
- Product Owner: __________________ Date: __________
- Tech Lead: __________________ Date: __________
- QA Lead: __________________ Date: __________

---

## 📄 Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-04 | Vibe Engineering Team | Initial complete specification package |

**Distribution List:**
- Product Team
- Engineering Team
- QA Team
- Executive Stakeholders

**Confidentiality:** Internal Use Only

---

## 🚀 Final Notes

**This specification package represents 9 agents of work, covering:**
- Problem discovery & validation
- MVP scoping & constraints
- User journey mapping (2 flows)
- Wireframe blueprints (4 screens)
- Complete design system (12 components)
- Frontend architecture (PWA, IndexedDB, Zustand)
- Backend architecture (local Fastify, OAuth, sync)
- Comprehensive test plan (80/20 manual/auto)
- Alignment review & iteration roadmap

**Total Specification Pages:** ~200 pages  
**Estimated Implementation Time:** 3-4 weeks (after gap resolution)  
**Estimated Alpha Launch:** Week 7  

**The foundation is solid. The gaps are manageable. The team is ready.**

**Let's build CS720.** 🎉

---

*End of Complete Specification Package*