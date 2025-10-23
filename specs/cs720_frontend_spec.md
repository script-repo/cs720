# Frontend Architecture Spec - CS720

**Project:** CS720  
**Agent:** Cyrus Stack  
**Created:** 2025-10-04 15:35:00  
**Source:** AriaPatterns-CS720-20251004-152200.md, NayaWire-CS720-20251004-151500.md

---

## Tech Stack

### Core Framework
```json
{
  "framework": "React 18.3+",
  "buildTool": "Vite 5.0+",
  "appType": "Progressive Web App (PWA)",
  "language": "TypeScript 5.0+"
}
```

### Key Dependencies
```json
{
  "routing": "react-router-dom 6.x (hash routing)",
  "stateManagement": "zustand 4.x",
  "dataStorage": "dexie 3.x (IndexedDB wrapper)",
  "styling": "CSS Modules + Tailwind CSS 3.x",
  "ui": "Custom components (from design system)",
  "ai": "OpenAI SDK / Custom LLM integration",
  "pwa": "vite-plugin-pwa 0.17+"
}
```

### Development Tools
```json
{
  "linting": "ESLint + TypeScript ESLint",
  "formatting": "Prettier",
  "testing": "Vitest + React Testing Library",
  "e2e": "Playwright (optional)"
}
```

---

## Architecture Overview

### Application Type
**Progressive Web App (PWA)** - Installable, offline-first, local data storage

### Architecture Pattern
**Local-First SPA with Background Sync**
- Data stored locally in IndexedDB (Dexie.js)
- Daily background sync with Salesforce + OneDrive
- Service Worker for offline functionality
- External LLM inference with local fallback

### Folder Structure
```
/src
├── /components          # Reusable UI components
│   ├── /atoms          # Button, Badge, Input, Avatar
│   ├── /molecules      # Card, ChatMessage, ProgressBar
│   ├── /organisms      # Sidebar, Modal, Dashboard
│   └── /layouts        # AppLayout, EmptyLayout
├── /pages              # Route-level components
│   ├── Dashboard.tsx
│   ├── Settings.tsx
│   └── InitialLoad.tsx
├── /store              # Zustand stores
│   ├── accountStore.ts
│   ├── syncStore.ts
│   ├── chatStore.ts
│   └── uiStore.ts
├── /db                 # Dexie database schemas
│   ├── schema.ts
│   └── migrations.ts
├── /services           # Business logic
│   ├── syncService.ts
│   ├── aiService.ts
│   ├── salesforceService.ts
│   └── onedriveService.ts
├── /hooks              # Custom React hooks
│   ├── useAccount.ts
│   ├── useSync.ts
│   └── useAIQuery.ts
├── /utils              # Helper functions
│   ├── markdown.ts
│   ├── dateFormat.ts
│   └── validators.ts
├── /types              # TypeScript definitions
│   └── index.ts
├── /workers            # Service Worker
│   └── sw.ts
├── App.tsx             # Root component
├── main.tsx            # Entry point
└── vite-env.d.ts       # Vite types
```

---

## Route Table

### Hash-based Routing (`react-router-dom`)

| Route | Component | Description | Auth Required |
|-------|-----------|-------------|---------------|
| `/#/` | `InitialLoad` | Welcome/onboarding, account selection | No |
| `/#/dashboard` | `Dashboard` | Main dashboard with 6 cards + AI panel | Yes* |
| `/#/dashboard/:accountId` | `Dashboard` | Dashboard for specific account | Yes* |
| `/#/settings` | `Settings` | Data sources, sync, preferences | Yes* |

**Note:** *Auth = Account selected (not traditional login)*

### Route Guards
```typescript
// Pseudo-logic
if (no account selected && route !== '/') {
  redirect to '/'
}

if (account selected && route === '/') {
  redirect to '/dashboard'
}
```

### Modal Routes (State-based, not URL)
Modals don't change URL, managed via UI state:
- Project Detail Modal
- Ticket Detail Modal
- Priority Detail Modal
- Industry Intelligence Modal

---

## Component Tree

### Route: `/#/` (Initial Load)

```
InitialLoad
├── AppLayout
│   ├── GlobalHeader
│   │   ├── Logo
│   │   └── SyncStatus (hidden until account selected)
│   └── WelcomeContent
│       ├── WelcomeLogo
│       ├── WelcomeMessage
│       ├── AccountSelector (dropdown or empty state)
│       │   └── Button (Sync Accounts)
│       └── OnboardingCarousel (first-time users)
│           ├── TipCard (Tip 1: NL queries)
│           ├── TipCard (Tip 2: Detail modals)
│           └── TipCard (Tip 3: Force sync)
└── AIPanel (greeting mode)
    ├── GreetingMessage
    └── ExampleQueries (clickable chips)
```

---

### Route: `/#/dashboard` (Main Dashboard)

```
Dashboard
├── AppLayout
│   ├── GlobalHeader
│   │   ├── Logo
│   │   ├── UserAvatar
│   │   ├── SettingsIcon (→ /settings)
│   │   └── SyncStatus
│   ├── Sidebar (280px)
│   │   ├── SidebarHeader ("Customer Accounts")
│   │   ├── SearchInput (filter accounts)
│   │   └── AccountList
│   │       └── AccountItem[] (map)
│   │           ├── AccountName
│   │           ├── StatusBadge
│   │           └── StarIcon (favorite)
│   ├── DashboardContent (center)
│   │   ├── DashboardHeader
│   │   │   ├── AccountTitle
│   │   │   └── LastViewedBadge (Flow B only)
│   │   └── CardGrid (6 cards, 2x3)
│   │       ├── KeyPrioritiesCard
│   │       │   ├── CardHeader
│   │       │   └── PriorityList
│   │       │       └── PriorityItem[] (clickable)
│   │       ├── UpcomingDatesCard
│   │       │   └── DateItem[]
│   │       ├── InFlightProjectsCard
│   │       │   └── ProjectItem[] (clickable)
│   │       │       ├── ProjectName
│   │       │       ├── StatusBadge
│   │       │       └── ProgressBar
│   │       ├── CustomerSatIssuesCard
│   │       │   └── IssueItem[] (clickable)
│   │       │       ├── IssueTitle
│   │       │       ├── SeverityBadge
│   │       │       └── SLATimer
│   │       ├── OpenTicketsCard
│   │       │   └── TicketItem[] (clickable)
│   │       └── IndustryIntelligenceCard
│   │           └── InsightItem[] (clickable)
│   ├── AIPanel (380px)
│   │   ├── PanelHeader ("AI Assistant")
│   │   ├── ChatHistory (scrollable)
│   │   │   └── ChatMessage[] (map)
│   │   │       ├── UserMessage
│   │   │       └── AssistantMessage
│   │   │           └── SourceCitations (optional)
│   │   └── ChatInput
│   │       ├── Textarea
│   │       ├── SendButton
│   │       └── SuggestionChips (auto-complete)
│   └── Footer
│       ├── SyncStatusText ("Last synced: 2h ago")
│       ├── SyncButton ("Sync Now")
│       └── HelpLink
└── ModalPortal (conditional render)
    ├── ProjectDetailModal
    │   ├── ModalHeader (title + close)
    │   ├── ModalBody (2-column grid)
    │   │   ├── LeftColumn
    │   │   │   ├── ProjectDetails
    │   │   │   ├── Description
    │   │   │   └── MilestoneList
    │   │   └── RightColumn
    │   │       ├── ProgressChart
    │   │       ├── TeamMembers (AvatarGroup)
    │   │       ├── RiskList
    │   │       └── NotesSection
    │   └── ModalFooter (optional actions)
    ├── TicketDetailModal
    ├── PriorityDetailModal
    └── IndustryIntelligenceModal
```

---

### Route: `/#/settings` (Settings)

```
Settings
├── AppLayout
│   ├── GlobalHeader (same)
│   ├── SettingsContent (full width)
│   │   ├── BackButton (→ /dashboard)
│   │   ├── SettingsHeader ("Settings")
│   │   ├── TabNavigation
│   │   │   ├── Tab ("Data Sources")
│   │   │   ├── Tab ("Sync")
│   │   │   └── Tab ("Preferences")
│   │   └── TabContent (conditional)
│   │       ├── DataSourcesTab
│   │       │   ├── SalesforceConnection
│   │       │   │   ├── StatusIndicator
│   │       │   │   ├── AccountCount
│   │       │   │   └── ConfigButton
│   │       │   ├── OneDriveConnection
│   │       │   │   └── (similar structure)
│   │       │   └── BISourcesConfig
│   │       │       └── SourceToggle[]
│   │       ├── SyncTab
│   │       │   ├── SyncSchedule (dropdown)
│   │       │   ├── SyncScope (checklist)
│   │       │   ├── ForceSyncButton
│   │       │   ├── SyncProgress (when active)
│   │       │   └── SyncHistoryLog
│   │       └── PreferencesTab
│   │           ├── ThemeToggle
│   │           ├── NotificationSettings
│   │           ├── AISettings
│   │           │   ├── InferenceEndpoint (radio)
│   │           │   └── QueryHistoryRetention
│   │           └── DashboardDefaults
│   └── Footer (same)
```

---

## TypeScript Interfaces

### Core Data Models

```typescript
// ===== ACCOUNT =====
interface Account {
  id: string; // Salesforce Account ID
  name: string;
  industry: string;
  status: 'active' | 'at-risk' | 'churned';
  salesforceData: SalesforceAccount;
  metadata: {
    lastViewed: Date | null;
    isFavorite: boolean;
    siteCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface SalesforceAccount {
  accountId: string;
  accountName: string;
  accountOwner: string;
  region: string;
  segment: string;
  annualRevenue: number;
  employeeCount: number;
  website: string;
  billingAddress: Address;
  // ... additional Salesforce fields
}

interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ===== DOCUMENT =====
interface Document {
  id: string; // ULID or UUID
  accountId: string; // FK to Account
  title: string;
  content: string; // Markdown content
  source: 'salesforce' | 'onedrive';
  sourceId: string; // Original file/note ID
  sourceUrl?: string;
  documentType: 'sales-note' | 'technical-doc' | 'meeting-notes' | 'contract' | 'other';
  tags: string[];
  metadata: {
    author?: string;
    createdDate: Date;
    modifiedDate: Date;
    fileSize?: number;
  };
  embedding?: number[]; // Optional: Vector embedding for semantic search
  createdAt: Date;
  updatedAt: Date;
}

// ===== DASHBOARD DATA =====
interface Priority {
  id: string;
  accountId: string;
  text: string;
  source: string; // "Sales notes", "Executive meeting"
  sourceDocumentIds: string[];
  importance: 'high' | 'medium' | 'low';
  timing: 'this-week' | 'this-month' | 'this-quarter';
  category: 'upsell' | 'retention' | 'technical' | 'strategic';
  createdAt: Date;
}

interface UpcomingDate {
  id: string;
  accountId: string;
  eventType: 'renewal' | 'qbr' | 'eol' | 'milestone' | 'other';
  title: string;
  date: Date;
  daysUntil: number;
  severity: 'urgent' | 'soon' | 'normal';
  description?: string;
  relatedDocuments: string[];
}

interface Project {
  id: string;
  accountId: string;
  name: string;
  status: 'on-track' | 'at-risk' | 'blocked' | 'completed';
  progress: number; // 0-100
  startDate: Date;
  dueDate: Date;
  lead: string;
  teamMembers: TeamMember[];
  budget?: number;
  description: string;
  milestones: Milestone[];
  risks: Risk[];
  notes: string;
  relatedDocuments: string[];
}

interface Milestone {
  id: string;
  name: string;
  dueDate: Date;
  completed: boolean;
  completedDate?: Date;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  email?: string;
}

interface Risk {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigation?: string;
}

interface CustomerIssue {
  id: string;
  accountId: string;
  ticketId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'performance' | 'bug' | 'security' | 'feature' | 'other';
  status: 'open' | 'in-progress' | 'escalated' | 'resolved';
  reportedBy: string;
  reportedAt: Date;
  sla: {
    responseDeadline: Date;
    resolutionDeadline: Date;
    breachRisk: boolean;
  };
  affectedUsers?: number;
  description: string;
  relatedDocuments: string[];
}

interface Ticket {
  id: string;
  accountId: string;
  ticketNumber: string;
  title: string;
  status: 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'bug' | 'feature' | 'performance' | 'security' | 'question';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  description: string;
}

interface IndustryIntelligence {
  id: string;
  headline: string;
  summary: string;
  source: string; // "TechCrunch", "Gartner"
  sourceUrl: string;
  publishedAt: Date;
  tags: string[];
  impact: 'positive' | 'neutral' | 'negative';
  relevanceScore: number; // 0-100, how relevant to customer
  relatedAccountIds: string[];
  retrievedAt: Date;
}

// ===== AI CHAT =====
interface ChatMessage {
  id: string;
  accountId: string; // Context: which account this query is about
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[]; // Citations for assistant responses
  timestamp: Date;
  metadata?: {
    model?: string; // "gpt-4" or "local-llama"
    tokenCount?: number;
    responseTime?: number; // ms
  };
}

interface Source {
  documentId: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
}

// ===== SYNC =====
interface SyncJob {
  id: string;
  jobType: 'scheduled' | 'manual';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  progress: {
    salesforce: SyncProgress;
    onedrive: SyncProgress;
    businessIntelligence: SyncProgress;
  };
  accountsProcessed: string[];
  errors: SyncError[];
  metadata: {
    triggeredBy: 'user' | 'schedule' | 'service-worker';
  };
}

interface SyncProgress {
  total: number;
  processed: number;
  failed: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

interface SyncError {
  source: 'salesforce' | 'onedrive' | 'bi';
  errorType: 'auth-failed' | 'quota-exceeded' | 'network-error' | 'parse-error';
  message: string;
  timestamp: Date;
  accountId?: string;
}

interface SyncMetadata {
  lastSyncTime: Date | null;
  nextScheduledSync: Date | null;
  syncStatus: 'synced' | 'stale' | 'syncing' | 'error';
  staleSince?: Date;
}

// ===== USER PREFERENCES =====
interface UserPreferences {
  id: string; // Single row: 'user-preferences'
  theme: 'dark' | 'light';
  notifications: {
    desktop: boolean;
    syncComplete: boolean;
  };
  ai: {
    inferenceEndpoint: 'external' | 'local';
    autoSuggestions: boolean;
    queryHistoryRetention: 30 | 60 | 90; // days
  };
  dashboard: {
    defaultAccount?: string;
    cardOrder: string[]; // Array of card IDs for custom ordering
  };
  sync: {
    schedule: 'daily' | 'manual';
    scheduledTime?: string; // "06:00" format
    accountScope: 'all' | 'selected';
    selectedAccounts?: string[];
  };
  updatedAt: Date;
}
```

---

### UI State Types

```typescript
// ===== MODAL TYPES =====
type ModalType = 
  | 'project-detail' 
  | 'ticket-detail' 
  | 'priority-detail' 
  | 'industry-intelligence';

interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  data: Project | Ticket | Priority | IndustryIntelligence | null;
}

// ===== DASHBOARD CARD TYPES =====
type CardType = 
  | 'key-priorities' 
  | 'upcoming-dates' 
  | 'in-flight-projects' 
  | 'customer-sat-issues' 
  | 'open-tickets' 
  | 'industry-intelligence';

interface CardState {
  type: CardType;
  loading: boolean;
  error: string | null;
  data: any; // Specific to card type
  isEmpty: boolean;
}

// ===== TOAST NOTIFICATION =====
interface ToastNotification {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ===== SIDEBAR UI =====
interface SidebarState {
  isCollapsed: boolean; // Stored in localStorage (transient)
  searchQuery: string;
  filteredAccounts: Account[];
}
```

---

## Zustand Store Architecture

### Store Structure

```typescript
// ===== ACCOUNT STORE =====
interface AccountStore {
  // State
  accounts: Account[];
  activeAccountId: string | null;
  loading: boolean;
  error: string | null;
  
  // Computed
  activeAccount: Account | null;
  favoriteAccounts: Account[];
  
  // Actions
  setActiveAccount: (accountId: string) => void;
  toggleFavorite: (accountId: string) => void;
  updateLastViewed: (accountId: string) => void;
  loadAccounts: () => Promise<void>;
}

// ===== SYNC STORE =====
interface SyncStore {
  // State
  syncMetadata: SyncMetadata;
  currentJob: SyncJob | null;
  syncHistory: SyncJob[];
  
  // Actions
  startSync: (type: 'manual' | 'scheduled') => Promise<void>;
  cancelSync: () => void;
  updateSyncProgress: (progress: Partial<SyncJob>) => void;
  loadSyncHistory: () => Promise<void>;
}

// ===== CHAT STORE =====
interface ChatStore {
  // State
  messages: ChatMessage[];
  loading: boolean;
  currentQuery: string;
  
  // Actions
  sendMessage: (content: string, accountId: string) => Promise<void>;
  clearHistory: (accountId?: string) => void;
  loadHistory: (accountId: string) => Promise<void>;
}

// ===== DASHBOARD STORE =====
interface DashboardStore {
  // State (one per card type)
  priorities: Priority[];
  upcomingDates: UpcomingDate[];
  projects: Project[];
  customerIssues: CustomerIssue[];
  tickets: Ticket[];
  industryIntelligence: IndustryIntelligence[];
  
  // Loading states
  loading: Record<CardType, boolean>;
  errors: Record<CardType, string | null>;
  
  // Actions
  loadCardData: (accountId: string, cardType: CardType) => Promise<void>;
  refreshAllCards: (accountId: string) => Promise<void>;
}

// ===== UI STORE =====
interface UIStore {
  // State
  modal: ModalState;
  toasts: ToastNotification[];
  sidebar: SidebarState;
  
  // Actions
  openModal: (type: ModalType, data: any) => void;
  closeModal: () => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  dismissToast: (id: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

// ===== PREFERENCES STORE =====
interface PreferencesStore {
  preferences: UserPreferences;
  
  // Actions
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  loadPreferences: () => Promise<void>;
}
```

### Store Implementation Example

```typescript
// accountStore.ts
import create from 'zustand';
import { db } from '../db/schema';

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: [],
  activeAccountId: null,
  loading: false,
  error: null,
  
  get activeAccount() {
    const { accounts, activeAccountId } = get();
    return accounts.find(a => a.id === activeAccountId) || null;
  },
  
  get favoriteAccounts() {
    return get().accounts.filter(a => a.metadata.isFavorite);
  },
  
  setActiveAccount: (accountId: string) => {
    set({ activeAccountId: accountId });
    localStorage.setItem('activeAccountId', accountId); // Transient UI chrome
    get().updateLastViewed(accountId);
  },
  
  toggleFavorite: async (accountId: string) => {
    const account = get().accounts.find(a => a.id === accountId);
    if (!account) return;
    
    const updated = {
      ...account,
      metadata: {
        ...account.metadata,
        isFavorite: !account.metadata.isFavorite
      }
    };
    
    await db.accounts.update(accountId, updated);
    set(state => ({
      accounts: state.accounts.map(a => a.id === accountId ? updated : a)
    }));
  },
  
  updateLastViewed: async (accountId: string) => {
    const now = new Date();
    await db.accounts.update(accountId, {
      'metadata.lastViewed': now
    });
    
    set(state => ({
      accounts: state.accounts.map(a => 
        a.id === accountId 
          ? { ...a, metadata: { ...a.metadata, lastViewed: now } }
          : a
      )
    }));
  },
  
  loadAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await db.accounts.toArray();
      set({ accounts, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  }
}));
```

---

## Dexie Database Schema

### Database Definition

```typescript
// db/schema.ts
import Dexie, { Table } from 'dexie';

class CS720Database extends Dexie {
  accounts!: Table<Account, string>;
  documents!: Table<Document, string>;
  priorities!: Table<Priority, string>;
  upcomingDates!: Table<UpcomingDate, string>;
  projects!: Table<Project, string>;
  customerIssues!: Table<CustomerIssue, string>;
  tickets!: Table<Ticket, string>;
  industryIntelligence!: Table<IndustryIntelligence, string>;
  chatMessages!: Table<ChatMessage, string>;
  syncJobs!: Table<SyncJob, string>;
  syncMetadata!: Table<SyncMetadata, string>;
  userPreferences!: Table<UserPreferences, string>;

  constructor() {
    super('CS720DB');
    
    this.version(1).stores({
      // Accounts
      accounts: 'id, name, status, *metadata.isFavorite, updatedAt',
      
      // Documents - full-text search via compound index
      documents: 'id, accountId, source, documentType, [accountId+documentType], *tags, updatedAt',
      
      // Dashboard data
      priorities: 'id, accountId, importance, [accountId+importance]',
      upcomingDates: 'id, accountId, date, eventType, [accountId+date]',
      projects: 'id, accountId, status, [accountId+status], dueDate',
      customerIssues: 'id, accountId, severity, status, [accountId+severity], reportedAt',
      tickets: 'id, accountId, status, priority, [accountId+status]',
      industryIntelligence: 'id, publishedAt, relevanceScore, *tags, *relatedAccountIds',
      
      // Chat
      chatMessages: 'id, accountId, timestamp, [accountId+timestamp]',
      
      // Sync
      syncJobs: 'id, status, startedAt',
      syncMetadata: 'id', // Single row
      
      // Preferences
      userPreferences: 'id' // Single row: 'user-preferences'
    });
  }
}

export const db = new CS720Database();
```

### Data Persistence Strategy

**IndexedDB (Dexie) - All Persistent Data:**
```typescript
// Write pattern
await db.accounts.put(account); // Upsert
await db.documents.bulkPut(documents); // Batch insert

// Read pattern
const account = await db.accounts.get(accountId);
const accountDocs = await db.documents
  .where('accountId')
  .equals(accountId)
  .toArray();

// Complex queries
const criticalIssues = await db.customerIssues
  .where('[accountId+severity]')
  .equals([accountId, 'critical'])
  .toArray();

// Full-text search (basic - using tags)
const searchResults = await db.documents
  .where('tags')
  .anyOf(['cloud', 'migration'])
  .toArray();
```

**LocalStorage - Transient UI Chrome Only:**
```typescript
// Sidebar collapse state
localStorage.setItem('sidebarCollapsed', 'true');

// Active account (restore on reload)
localStorage.setItem('activeAccountId', accountId);

// Theme preference (if not in IndexedDB)
localStorage.setItem('theme', 'dark');
```

**Service Worker Cache - Static Assets:**
```typescript
// sw.ts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('cs720-static-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/index.js',
        '/assets/index.css',
        '/logo.svg'
      ]);
    })
  );
});

// Cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

---

## Service Worker Strategy

### PWA Configuration (vite-plugin-pwa)

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'CS720 - Customer Intelligence',
        short_name: 'CS720',
        description: 'Customer intelligence platform for Sales Engineers',
        theme_color: '#7C3AED',
        background_color: '#0F0F0F',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.salesforce\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'salesforce-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/graph\.microsoft\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'onedrive-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      }
    })
  ]
};
```

### Background Sync

```typescript
// workers/sw.ts (custom service worker)

// Register background sync for data sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(performDataSync());
  }
});

async function performDataSync() {
  // Trigger sync service
  const syncService = await import('../services/syncService');
  return syncService.executeSync('scheduled');
}

// Register sync from client
// In syncService.ts
export async function scheduleDailySync() {
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-data');
  }
}
```

---

## Integration Points

### External Services

#### 1. Salesforce Integration
```typescript
// services/salesforceService.ts
import { db } from '../db/schema';

export async function syncSalesforceAccounts(): Promise<void> {
  try {
    // Fetch from Salesforce API (details in Backend Spec)
    const response = await fetch('/api/salesforce/accounts', {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    
    const salesforceAccounts = await response.json();
    
    // Transform to Account schema
    const accounts: Account[] = salesforceAccounts.map(transformSalesforceAccount);
    
    // Bulk insert to IndexedDB
    await db.accounts.bulkPut(accounts);
    
    // Update sync metadata
    await updateSyncMetadata('salesforce', 'completed');
  } catch (error) {
    await updateSyncMetadata('salesforce', 'failed', error.message);
    throw error;
  }
}

function transformSalesforceAccount(sfAccount: any): Account {
  return {
    id: sfAccount.Id,
    name: sfAccount.Name,
    industry: sfAccount.Industry,
    status: determineStatus(sfAccount),
    salesforceData: {
      accountId: sfAccount.Id,
      accountName: sfAccount.Name,
      accountOwner: sfAccount.Owner.Name,
      region: sfAccount.Region__c,
      segment: sfAccount.Segment__c,
      annualRevenue: sfAccount.AnnualRevenue,
      employeeCount: sfAccount.NumberOfEmployees,
      website: sfAccount.Website,
      billingAddress: {
        street: sfAccount.BillingStreet,
        city: sfAccount.BillingCity,
        state: sfAccount.BillingState,
        postalCode: sfAccount.BillingPostalCode,
        country: sfAccount.BillingCountry
      }
    },
    metadata: {
      lastViewed: null,
      isFavorite: false,
      siteCount: sfAccount.SiteCount__c || 0
    },
    createdAt: new Date(sfAccount.CreatedDate),
    updatedAt: new Date(sfAccount.LastModifiedDate)
  };
}
```

#### 2. OneDrive Integration
```typescript
// services/onedriveService.ts
import { marked } from 'marked'; // Markdown parser

export async function syncOneDriveDocuments(accountId: string): Promise<void> {
  try {
    // Fetch files from OneDrive API
    const response = await fetch(`/api/onedrive/files?accountId=${accountId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    
    const files = await response.json();
    
    // Download and convert to markdown
    const documents: Document[] = [];
    
    for (const file of files) {
      const content = await downloadFile(file.downloadUrl);
      const markdown = await convertToMarkdown(content, file.mimeType);
      
      documents.push({
        id: generateId(),
        accountId,
        title: file.name,
        content: markdown,
        source: 'onedrive',
        sourceId: file.id,
        sourceUrl: file.webUrl,
        documentType: classifyDocumentType(file.name),
        tags: extractTags(markdown),
        metadata: {
          author: file.createdBy.user.displayName,
          createdDate: new Date(file.createdDateTime),
          modifiedDate: new Date(file.lastModifiedDateTime),
          fileSize: file.size
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    await db.documents.bulkPut(documents);
    await updateSyncMetadata('onedrive', 'completed');
  } catch (error) {
    await updateSyncMetadata('onedrive', 'failed', error.message);
    throw error;
  }
}

async function convertToMarkdown(content: string, mimeType: string): Promise<string> {
  // Clean and normalize to markdown
  if (mimeType.includes('text/plain')) {
    return content;
  } else if (mimeType.includes('application/vnd.openxmlformats')) {
    // Use mammoth.js or similar for DOCX -> Markdown
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToMarkdown({ buffer: content });
    return result.value;
  }
  // Add more converters as needed
  return content;
}
```

#### 3. AI Service (LLM Integration)
```typescript
// services/aiService.ts
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // PWA context
});

export async function queryAI(
  prompt: string, 
  accountId: string,
  useLocal: boolean = false
): Promise<ChatMessage> {
  
  // Retrieve context documents from IndexedDB
  const documents = await db.documents
    .where('accountId')
    .equals(accountId)
    .limit(10) // Top 10 relevant docs
    .toArray();
  
  const context = documents.map(d => d.content).join('\n\n');
  
  const systemPrompt = `You are an AI assistant helping a Sales Engineer understand customer context. 
Use the following customer documents to answer questions:

${context}

Provide concise, accurate answers with source citations.`;

  try {
    if (useLocal) {
      // Fallback to local LLM (e.g., via Ollama or local endpoint)
      return await queryLocalLLM(prompt, context);
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    const assistantMessage: ChatMessage = {
      id: generateId(),
      accountId,
      role: 'assistant',
      content: response.choices[0].message.content || '',
      sources: extractSources(documents, response.choices[0].message.content || ''),
      timestamp: new Date(),
      metadata: {
        model: 'gpt-4-turbo',
        tokenCount: response.usage?.total_tokens,
        responseTime: Date.now() - startTime
      }
    };
    
    // Save to IndexedDB
    await db.chatMessages.add(assistantMessage);
    
    return assistantMessage;
  } catch (error) {
    // Auto-fallback to local LLM
    console.error('External LLM failed, falling back to local:', error);
    return await queryLocalLLM(prompt, context);
  }
}

async function queryLocalLLM(prompt: string, context: string): Promise<ChatMessage> {
  // Implementation for local LLM (e.g., Ollama)
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama2',
      prompt: `Context: ${context}\n\nQuestion: ${prompt}`,
      stream: false
    })
  });
  
  const data = await response.json();
  
  return {
    id: generateId(),
    accountId: '',
    role: 'assistant',
    content: data.response,
    timestamp: new Date(),
    metadata: {
      model: 'llama2-local'
    }
  };
}
```

#### 4. Business Intelligence Service
```typescript
// services/biService.ts

export async function fetchIndustryIntelligence(
  accountIndustry: string
): Promise<IndustryIntelligence[]> {
  
  try {
    // Fetch from BI aggregator API (details in Backend Spec)
    const response = await fetch(`/api/bi/insights?industry=${accountIndustry}&limit=5`);
    const insights = await response.json();
    
    const intelligence: IndustryIntelligence[] = insights.map((insight: any) => ({
      id: generateId(),
      headline: insight.title,
      summary: insight.summary,
      source: insight.source,
      sourceUrl: insight.url,
      publishedAt: new Date(insight.publishedDate),
      tags: insight.tags || [],
      impact: determineImpact(insight),
      relevanceScore: calculateRelevance(insight, accountIndustry),
      relatedAccountIds: [], // Populated later
      retrievedAt: new Date()
    }));
    
    await db.industryIntelligence.bulkPut(intelligence);
    return intelligence;
  } catch (error) {
    console.error('BI fetch failed:', error);
    return [];
  }
}
```

---

## Custom Hooks

### useAccount Hook
```typescript
// hooks/useAccount.ts
import { useAccountStore } from '../store/accountStore';
import { useDashboardStore } from '../store/dashboardStore';

export function useAccount(accountId?: string) {
  const { 
    accounts, 
    activeAccountId, 
    activeAccount,
    setActiveAccount,
    updateLastViewed 
  } = useAccountStore();
  
  const { refreshAllCards } = useDashboardStore();
  
  const selectAccount = async (id: string) => {
    setActiveAccount(id);
    await refreshAllCards(id);
  };
  
  const account = accountId 
    ? accounts.find(a => a.id === accountId)
    : activeAccount;
  
  return {
    account,
    accounts,
    activeAccountId,
    selectAccount,
    updateLastViewed
  };
}
```

### useSync Hook
```typescript
// hooks/useSync.ts
import { useSyncStore } from '../store/syncStore';
import { syncSalesforceAccounts } from '../services/salesforceService';
import { syncOneDriveDocuments } from '../services/onedriveService';

export function useSync() {
  const { 
    syncMetadata, 
    currentJob, 
    startSync 
  } = useSyncStore();
  
  const performSync = async () => {
    await startSync('manual');
    // Sync service orchestrates Salesforce + OneDrive + BI
  };
  
  const isSyncing = currentJob?.status === 'in-progress';
  const isStale = syncMetadata.syncStatus === 'stale';
  const lastSyncTime = syncMetadata.lastSyncTime;
  
  return {
    performSync,
    isSyncing,
    isStale,
    lastSyncTime,
    currentJob
  };
}
```

### useAIQuery Hook
```typescript
// hooks/useAIQuery.ts
import { useChatStore } from '../store/chatStore';
import { usePreferencesStore } from '../store/preferencesStore';
import { queryAI } from '../services/aiService';

export function useAIQuery(accountId: string) {
  const { messages, sendMessage, loading } = useChatStore();
  const { preferences } = usePreferencesStore();
  
  const ask = async (question: string) => {
    const useLocal = preferences.ai.inferenceEndpoint === 'local';
    await sendMessage(question, accountId);
  };
  
  const accountMessages = messages.filter(m => m.accountId === accountId);
  
  return {
    ask,
    messages: accountMessages,
    loading
  };
}
```

---

## Data Flow Diagrams

### Initial Load Flow
```
User opens app
  ↓
Check localStorage for activeAccountId
  ↓
  ├─ Found → Load from IndexedDB → Render Dashboard
  └─ Not found → Show InitialLoad screen
       ↓
       User selects account OR triggers sync
         ↓
         Load account data from IndexedDB
           ↓
           Render Dashboard
```

### Dashboard Data Flow
```
User selects account
  ↓
accountStore.setActiveAccount(id)
  ↓
  ├─ Update activeAccountId in Zustand
  ├─ Save to localStorage (transient)
  └─ Trigger dashboardStore.refreshAllCards(id)
       ↓
       For each card type (6 cards):
         ↓
         Query IndexedDB for card data
           ↓
           Update card state in dashboardStore
             ↓
             Re-render card components
```

### AI Query Flow
```
User types query in AI Assistant
  ↓
chatStore.sendMessage(query, accountId)
  ↓
  ├─ Add user message to IndexedDB
  ├─ Update UI with user message
  └─ Call aiService.queryAI()
       ↓
       Fetch context documents from IndexedDB
         ↓
         Send to external LLM (or local fallback)
           ↓
           Receive response with sources
             ↓
             Save assistant message to IndexedDB
               ↓
               Update UI with assistant message + citations
```

### Sync Flow
```
User clicks "Sync Now" OR scheduled time triggers
  ↓
syncStore.startSync('manual' | 'scheduled')
  ↓
Create SyncJob in IndexedDB
  ↓
Service Worker Background Sync (if available)
  ↓
  ├─ Salesforce sync
  │    ↓
  │    Fetch accounts → Transform → Save to IndexedDB
  │
  ├─ OneDrive sync
  │    ↓
  │    Fetch files → Convert to markdown → Save to IndexedDB
  │
  └─ BI sync
       ↓
       Fetch industry insights → Save to IndexedDB
         ↓
         Update SyncJob status to 'completed'
           ↓
           Update syncMetadata with timestamp
             ↓
             Show toast notification "Sync complete"
               ↓
               Refresh dashboard if account selected
```

---

## Performance Optimizations

### Code Splitting
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// Lazy load modals (only when opened)
const ProjectDetailModal = lazy(() => import('./components/modals/ProjectDetailModal'));
```

### IndexedDB Query Optimization
```typescript
// Use compound indexes for common queries
await db.customerIssues
  .where('[accountId+severity]')
  .equals([accountId, 'critical'])
  .toArray();

// Limit results for performance
await db.documents
  .where('accountId')
  .equals(accountId)
  .limit(20)
  .toArray();

// Use cursor for pagination
let cursor = await db.chatMessages
  .where('accountId')
  .equals(accountId)
  .reverse()
  .offset(page * 20)
  .limit(20)
  .toArray();
```

### Virtual Scrolling
```typescript
// For long lists (account sidebar, chat history)
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={accounts}
  itemContent={(index, account) => <AccountItem account={account} />}
  style={{ height: '100%' }}
/>
```

### Debounced Search
```typescript
// Debounce search input to reduce IndexedDB queries
const debouncedSearch = useMemo(
  () => debounce(async (query: string) => {
    const results = await db.accounts
      .filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
      .toArray();
    setSidebarState({ filteredAccounts: results });
  }, 300),
  []
);
```

---

## Error Handling

### Global Error Boundary
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error tracking service
    console.error('App error:', error, errorInfo);
    
    // Show user-friendly error UI
    this.setState({ hasError: true, error });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback 
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      );
    }
    return this.props.children;
  }
}
```

### Service Error Handling
```typescript
// Graceful degradation pattern
try {
  return await externalLLM(query);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Fall back to local LLM
    return await localLLM(query);
  } else if (error.code === 'NETWORK_ERROR') {
    // Use cached response if available
    return await getCachedResponse(query) || fallbackResponse;
  }
  throw error; // Re-throw if unhandled
}
```

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// __tests__/accountStore.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useAccountStore } from '../store/accountStore';

describe('AccountStore', () => {
  it('should set active account', () => {
    const { result } = renderHook(() => useAccountStore());
    
    act(() => {
      result.current.setActiveAccount('acc-123');
    });
    
    expect(result.current.activeAccountId).toBe('acc-123');
  });
});
```

### Component Tests
```typescript
// __tests__/Dashboard.test.tsx
import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

describe('Dashboard', () => {
  it('renders 6 dashboard cards', () => {
    render(<Dashboard />);
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });
});
```

### Integration Tests (Playwright)
```typescript
// e2e/account-transition.spec.ts
test('Account transition flow', async ({ page }) => {
  await page.goto('/#/');
  
  // Select account
  await page.click('text=CloudWorks');
  await expect(page).toHaveURL('/#/dashboard');
  
  // Verify dashboard loads
  await expect(page.locator('.card-header')).toHaveCount(6);
  
  // Query AI
  await page.fill('[placeholder="Ask me anything"]', 'What are top priorities?');
  await page.click('button[aria-label="Send"]');
  
  // Verify response
  await expect(page.locator('.chat-message.assistant')).toBeVisible();
});
```

---

## Build & Deployment

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'store': ['zustand'],
          'db': ['dexie'],
          'ai': ['openai']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'dexie']
  }
});
```

### Deployment Strategy
1. **Build PWA**: `npm run build`
2. **Generate service worker**: Auto via vite-plugin-pwa
3. **Deploy to static host**: Netlify, Vercel, or internal CDN
4. **Update strategy**: Users get new version on next app launch
5. **Offline-first**: App works fully offline after first load

---

## Decision Log

### Framework Decisions
- **PWA with React + Vite** chosen for local-first, installable desktop experience
- **Hash routing** for offline compatibility without server config
- **Zustand** for lightweight state management with persistence

### Data Architecture Decisions
- **IndexedDB via Dexie.js** as single source of truth for all persistent data
- **LocalStorage** relegated to transient UI chrome only
- **Compound indexes** for efficient querying (accountId + severity, etc.)

### Integration Decisions
- **External LLM primary, local fallback** balances performance with reliability
- **Daily background sync** via Service Worker for automated data refresh
- **Markdown standardization** for consistent document querying

### Performance Decisions
- **Code splitting** by route and modal for faster initial load
- **Virtual scrolling** for long lists (accounts, chat history)
- **Debounced search** to reduce IndexedDB query load

---

## Next Steps

**Next Agent:** Eko Logic (Backend & API)  
**Required Fields:** ✅ Routes defined, ✅ Types/interfaces complete, ✅ Integration points identified

---

**Filename:** `CyrusStack-CS720-20251004-153500.md`  
**Upload to:** `/data/outputs/`  
**Commit:** "Add Frontend Architecture Spec for CS720"