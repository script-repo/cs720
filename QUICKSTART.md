# CS720 Quick Start Guide

**Get from specs to running code in 7 weeks**

---

## 🎯 Week-by-Week Roadmap

### Week 4: Gap Resolution (5 days) ⚠️ CRITICAL
**Goal:** Fix 3 high-priority gaps before implementation

#### Day 1: Product Decision - Account Subset Logic
**Gap:** Backend doesn't know which accounts to sync first  
**Decision Needed:** How to select accounts for initial sync?

**Options:**
- ✅ **Recommended:** Intelligent prioritization (favorites + recent)
- Option B: Manual selection in Settings
- Option C: Sync all (slower)

**Action Items:**
- [ ] Product Owner decides selection strategy
- [ ] Update `07_BackendAPISpec.md` with logic
- [ ] Update `06_FrontendArchitecture.md` Settings UI

---

#### Day 2-3: Technical Implementation - Sync Progress SSE
**Gap:** No real-time sync progress updates

**Solution:** Implement Server-Sent Events

```javascript
// Backend: Add SSE endpoint
app.get('/api/sync/progress/:jobId', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
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
const eventSource = new EventSource(`/api/sync/progress/${jobId}`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  useSyncStore.getState().updateProgress(progress);
};
```

**Action Items:**
- [ ] Add SSE endpoint to backend
- [ ] Update frontend sync store
- [ ] Test real-time updates

---

#### Day 3: IndexedDB Quota Management
**Gap:** No handling for storage quota exceeded

**Solution:** Monitor quota and warn user

```javascript
// Add to frontend utils
async function checkStorageQuota() {
  if (navigator.storage?.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    const percentUsed = (usage / quota) * 100;
    
    if (percentUsed > 80) {
      showToast({
        message: `Storage ${percentUsed.toFixed(0)}% full. Consider cleanup.`,
        variant: 'warning',
        action: {
          label: 'Manage Storage',
          onClick: () => navigate('/settings')
        }
      });
    }
    
    return { usage, quota, percentUsed };
  }
}

// Add to Settings page
function StorageManagement() {
  const [quota, setQuota] = useState({ used: 0, total: 0 });
  
  useEffect(() => {
    checkStorageQuota().then(setQuota);
  }, []);
  
  return (
    <Card>
      <h3>Storage Usage</h3>
      <ProgressBar value={quota.percentUsed} />
      <p>{formatBytes(quota.used)} / {formatBytes(quota.total)}</p>
      <Button onClick={cleanupOldData}>Delete Old Data</Button>
    </Card>
  );
}
```

**Action Items:**
- [ ] Add quota monitoring utility
- [ ] Add Storage Management to Settings
- [ ] Implement cleanup function

---

#### Day 4-5: Test Coverage Enhancement
**Remaining Gaps:**
- [ ] Add markdown conversion tests (complex tables, images)
- [ ] Define "New" badge visual style
- [ ] Update affected specs

---

### Week 5: Frontend Implementation (5 days)

#### Day 1: Project Setup
```bash
# Initialize React + Vite project
npm create vite@latest frontend -- --template react-ts
cd frontend

# Install dependencies
npm install react-router-dom zustand dexie
npm install -D tailwindcss postcss autoprefixer
npm install vite-plugin-pwa workbox-window

# Configure Tailwind
npx tailwindcss init -p

# Set up PWA
# (Add vite-plugin-pwa to vite.config.ts)
```

**Action Items:**
- [ ] Initialize project
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Set up Tailwind CSS
- [ ] Configure PWA plugin

---

#### Day 2: Core Infrastructure
**Create:**
- [ ] Route configuration (hash-based)
- [ ] Zustand stores (5 stores: account, sync, chat, dashboard, UI)
- [ ] Dexie database schema
- [ ] Auth service skeleton

**Files to create:**
```
/src
  /store
    accountStore.ts
    syncStore.ts
    chatStore.ts
    dashboardStore.ts
    uiStore.ts
  /db
    schema.ts
  /services
    authService.ts
    apiClient.ts
```

---

#### Day 3: UI Components
**Build from Design System (12 components):**
- [ ] Button (5 variants)
- [ ] Card
- [ ] Badge
- [ ] Input (text, search, textarea)
- [ ] Modal
- [ ] Avatar
- [ ] ProgressBar
- [ ] Tooltip
- [ ] Skeleton
- [ ] Toast
- [ ] Sidebar
- [ ] ChatMessage

**Files to create:**
```
/src/components
  /atoms
    Button.tsx
    Badge.tsx
    Input.tsx
    Avatar.tsx
  /molecules
    Card.tsx
    ProgressBar.tsx
    Tooltip.tsx
    ChatMessage.tsx
  /organisms
    Sidebar.tsx
    Modal.tsx
    Toast.tsx
```

---

#### Day 4: Pages & Integration
**Create 4 screens:**
- [ ] InitialLoad.tsx (welcome screen)
- [ ] Dashboard.tsx (main screen with 6 cards)
- [ ] Settings.tsx (3 tabs: Data Sources, Sync, Preferences)
- [ ] Modal overlays (ProjectDetail, TicketDetail, etc.)

**Connect to backend:**
- [ ] API client setup
- [ ] Auth flow (OAuth)
- [ ] Data fetching hooks
- [ ] Error handling

---

#### Day 5: Testing & Polish
- [ ] Manual testing (80% of test plan)
- [ ] Fix bugs
- [ ] Add loading states
- [ ] Implement keyboard shortcuts
- [ ] Accessibility check

---

### Week 6: Backend Implementation (5 days)

#### Day 1: Project Setup
```bash
# Initialize Fastify project in monorepo structure
cd services/backend
npm init -y
npm install fastify @fastify/cors @fastify/oauth2
npm install dotenv winston
npm install -D typescript @types/node tsx

# Install document processors
npm install mammoth pdf-parse marked turndown

# Install LLM SDKs
npm install openai axios

# Set up TypeScript
npx tsc --init
```

**Action Items:**
- [ ] Initialize project
- [ ] Configure TypeScript
- [ ] Set up environment variables (.env)
- [ ] Create folder structure

---

#### Day 2: Auth & Storage
**Implement:**
- [ ] OAuth flows (Salesforce, Microsoft)
- [ ] Token encryption (AES-256)
- [ ] Local file storage (.cs720 directory)
- [ ] Token refresh logic

**Files to create:**
```
/src
  /services
    authService.ts
    tokenManager.ts
    encryptionService.ts
  /routes
    auth.ts
```

---

#### Day 3: Sync & Data Pipeline
**Implement:**
- [ ] Sync orchestrator
- [ ] Salesforce sync service
- [ ] OneDrive sync service
- [ ] Document transformation (DOCX/PDF → Markdown)
- [ ] Cron scheduling (daily 6am)

**Files to create:**
```
/src
  /services
    syncOrchestrator.ts
    salesforceSync.ts
    onedriveSync.ts
    documentConverter.ts
  /routes
    sync.ts
    data.ts
```

---

#### Day 4: LLM & BI Integration
**Implement:**
- [ ] LLM proxy service
- [ ] External LLM (OpenAI)
- [ ] Local LLM fallback (Ollama)
- [ ] Source citation extraction
- [ ] BI aggregation service

**Files to create:**
```
/src
  /services
    llmService.ts
    biService.ts
  /routes
    ai.ts
    bi.ts
```

---

#### Day 5: Integration & Testing
- [ ] Connect all services
- [ ] Test OAuth flows
- [ ] Test sync end-to-end
- [ ] Test LLM queries
- [ ] Run automated API tests (20%)

---

### Week 7: QA & Alpha Launch (5 days)

#### Day 1: Manual Testing
**Execute test plan:**
- [ ] Account Transition flow (10 steps)
- [ ] Pre-Meeting Prep flow (8 steps)
- [ ] Manual Sync flow (8 steps)
- [ ] All edge cases (5 scenarios)
- [ ] All negative tests (4 scenarios)

**Measure success metrics:**
- [ ] <5 min context time (test with 10 accounts)
- [ ] AI accuracy ≥80% (20 queries)

---

#### Day 2: Bug Fixes
**Priority order:**
- [ ] Fix all P0 (Critical) bugs
- [ ] Fix all P1 (High) bugs
- [ ] Document P2/P3 bugs for v2

**Quality gates:**
- [ ] Zero P0 bugs
- [ ] ≤5 P1 bugs
- [ ] Success metrics met

---

#### Day 3: Performance & Security Audit
**Performance:**
- [ ] Load test (500 accounts, 5000 docs)
- [ ] Dashboard <3s load time
- [ ] AI query <5s response
- [ ] Sync <5 min (25 accounts)

**Security:**
- [ ] Token encryption verified
- [ ] HTTPS on localhost
- [ ] No data leaks
- [ ] Audit logging works

**Accessibility:**
- [ ] WCAG AA compliance check
- [ ] Keyboard navigation
- [ ] Screen reader test

---

#### Day 4: Alpha Deployment
**Deploy to 5 SE laptops:**

```bash
# Package frontend
cd frontend
npm run build

# Package backend
cd ../backend
npm run build

# Create installer script
# (Copy frontend build + backend + setup instructions)
```

**Setup on each laptop:**
1. Install Node.js 20+
2. Install Ollama + pull llama2
3. Copy application files
4. Configure OAuth (Salesforce + OneDrive)
5. Run initial sync
6. Training session (30 min)

---

#### Day 5: Monitoring & Feedback
**Track metrics:**
- [ ] Usage analytics (queries/day, syncs/day)
- [ ] Performance metrics (response times)
- [ ] Error rates
- [ ] User feedback

**Collect feedback:**
- [ ] Daily check-ins with 5 SEs
- [ ] Bug reports
- [ ] Feature requests
- [ ] UX pain points

**Go/No-Go Decision:**
- [ ] Success metrics met?
- [ ] Users satisfied?
- [ ] Ready for beta (25 SEs)?

---

## 🔧 Essential Commands

### Frontend
```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run preview          # Preview production build
npm run test             # Run tests

# Linting
npm run lint             # ESLint check
npm run format           # Prettier format
```

### Backend
```bash
# Development
npm run dev              # Start dev server (localhost:3001)
npm run build            # Compile TypeScript
npm start                # Run production build

# Testing
npm run test             # Run automated tests
npm run test:api         # API endpoint tests
```

### Ollama (Local LLM)
```bash
ollama serve             # Start Ollama server
ollama pull llama2       # Download llama2 model
ollama list              # List installed models
ollama run llama2        # Test model
```

---

## 📋 Pre-Implementation Checklist

### Environment Setup
- [ ] Node.js 20+ installed
- [ ] Git configured
- [ ] VS Code (or preferred editor)
- [ ] Ollama installed
- [ ] Salesforce sandbox account
- [ ] OneDrive test tenant

### API Keys Required
- [ ] Salesforce OAuth credentials
- [ ] Microsoft OAuth credentials
- [ ] OpenAI API key (optional, for external LLM)

### Documentation Review
- [ ] Read `specs/02_ProductCharter.md` (MVP scope)
- [ ] Read `specs/06_FrontendArchitecture.md` (frontend specs)
- [ ] Read `specs/07_BackendAPISpec.md` (backend specs)
- [ ] Review `specs/INDEX.md` (all artifacts)

---

## 🎯 Success Criteria

**Must Pass Before Alpha:**
- ✅ <5 min context time (≥80% of tests)
- ✅ AI accuracy ≥80%
- ✅ Sync success rate ≥95%
- ✅ Zero P0 bugs
- ✅ Offline mode works
- ✅ OAuth tokens encrypted

**Alpha Success Indicators:**
- ✅ 5 SEs actively using daily
- ✅ Positive feedback (NPS >7)
- ✅ Core workflows validated
- ✅ Ready for beta expansion

---

## 📞 Support

**Technical Issues:** See `specs/07_BackendAPISpec.md` for troubleshooting  
**Questions:** Review `specs/INDEX.md` for relevant artifact  
**Bugs:** Create GitHub issue with reproduction steps

---

**Let's build CS720!** 🚀
