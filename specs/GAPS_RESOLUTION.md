# CS720 - Gap Resolution Guide

**3 High-Priority Gaps + Implementation Code**

---

## Overview

The Evelyn Compass iteration report identified **3 high-priority gaps** that must be resolved before v1 launch. This guide provides detailed implementation code for each gap.

**Estimated Resolution Time:** 3 days total

---

## Gap #1: Account Subset Selection Logic

### Problem
**Status:** ⚠️ Requires Product Decision  
**Priority:** HIGH  
**Impact:** Backend doesn't know which accounts to sync first  
**Effort:** 1 day

### Current State
- Frontend spec says "subset of accounts synced initially"
- Backend has no criteria for which accounts to prioritize
- Could sync wrong accounts, causing user confusion

### Resolution Options

#### Option A: User Manual Selection (Simple)
User explicitly selects accounts in Settings

**Pros:** Full user control, simple to implement  
**Cons:** Requires user effort upfront

#### Option B: Intelligent Prioritization (Recommended) ✅
Auto-sync favorites + recently viewed + high-priority accounts

**Pros:** Zero user effort, smart defaults  
**Cons:** Slightly more complex logic

#### Option C: Sync All (Naive)
Sync all accounts, paginate display

**Pros:** Simplest implementation  
**Cons:** Slow initial sync (5-10 min for 500 accounts)

### Recommended Implementation (Option B)

#### Backend: Sync Service
```typescript
// backend/src/services/accountPrioritization.ts

interface AccountPriority {
  accountId: string;
  score: number;
  reasons: string[];
}

export async function prioritizeAccounts(
  allAccounts: SalesforceAccount[]
): Promise<string[]> {
  
  const priorities: AccountPriority[] = allAccounts.map(account => {
    let score = 0;
    const reasons: string[] = [];
    
    // Factor 1: Account status (active = higher priority)
    if (account.AccountStatus__c === 'Active') {
      score += 10;
      reasons.push('active');
    } else if (account.AccountStatus__c === 'At Risk') {
      score += 15; // At-risk accounts need MORE attention
      reasons.push('at-risk');
    }
    
    // Factor 2: Recent activity (Salesforce LastModifiedDate)
    const daysSinceUpdate = daysSince(account.LastModifiedDate);
    if (daysSinceUpdate < 7) {
      score += 8;
      reasons.push('recently-updated');
    } else if (daysSinceUpdate < 30) {
      score += 5;
    }
    
    // Factor 3: Size/importance (site count)
    if (account.SiteCount__c > 300) {
      score += 7;
      reasons.push('large-enterprise');
    } else if (account.SiteCount__c > 100) {
      score += 4;
    }
    
    // Factor 4: Upcoming renewal/QBR (check Opportunities)
    if (hasUpcomingRenewal(account, 30)) { // Within 30 days
      score += 12;
      reasons.push('renewal-soon');
    }
    
    return {
      accountId: account.Id,
      score,
      reasons
    };
  });
  
  // Sort by score (descending), take top 25 for initial sync
  const topAccounts = priorities
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map(p => p.accountId);
  
  console.log('Prioritized accounts:', priorities.slice(0, 25));
  
  return topAccounts;
}

function daysSince(date: string): number {
  const then = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function hasUpcomingRenewal(account: SalesforceAccount, days: number): boolean {
  // Check if account has opportunities closing within X days
  // (Implement based on your Salesforce data model)
  return false; // Placeholder
}
```

#### Backend: Update Sync Orchestrator
```typescript
// backend/src/services/syncOrchestrator.ts

import { prioritizeAccounts } from './accountPrioritization';

export async function executeSync(
  type: 'manual' | 'scheduled',
  scope?: SyncScope
): Promise<SyncJob> {
  
  // Fetch all accounts from Salesforce
  const allAccounts = await fetchSalesforceAccounts();
  
  // Determine which accounts to sync
  let accountsToSync: string[];
  
  if (scope?.accountIds) {
    // Manual selection (if user specified)
    accountsToSync = scope.accountIds;
  } else {
    // Intelligent prioritization (default)
    accountsToSync = await prioritizeAccounts(allAccounts);
  }
  
  console.log(`Syncing ${accountsToSync.length} prioritized accounts`);
  
  // Continue with sync...
  for (const accountId of accountsToSync) {
    await syncAccount(accountId);
  }
}
```

#### Frontend: Settings UI (Optional Override)
```typescript
// frontend/src/pages/Settings.tsx

function SyncScopeSettings() {
  const { preferences, updatePreferences } = usePreferencesStore();
  const { accounts } = useAccountStore();
  
  const [syncMode, setSyncMode] = useState<'auto' | 'manual'>(
    preferences.sync.accountScope === 'all' ? 'auto' : 'manual'
  );
  
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    preferences.sync.selectedAccounts || []
  );
  
  const handleSave = async () => {
    await updatePreferences({
      sync: {
        ...preferences.sync,
        accountScope: syncMode === 'auto' ? 'all' : 'selected',
        selectedAccounts: syncMode === 'manual' ? selectedAccounts : undefined
      }
    });
  };
  
  return (
    <Card>
      <h3>Sync Scope</h3>
      
      <RadioGroup value={syncMode} onChange={setSyncMode}>
        <Radio value="auto">
          <strong>Intelligent (Recommended)</strong>
          <p>Auto-sync top 25 accounts (active, at-risk, recent activity)</p>
        </Radio>
        
        <Radio value="manual">
          <strong>Manual Selection</strong>
          <p>Choose specific accounts to sync</p>
        </Radio>
      </RadioGroup>
      
      {syncMode === 'manual' && (
        <AccountChecklist
          accounts={accounts}
          selected={selectedAccounts}
          onChange={setSelectedAccounts}
        />
      )}
      
      <Button onClick={handleSave}>Save Preferences</Button>
    </Card>
  );
}
```

### Action Items
- [ ] Product Owner: Approve Option B (intelligent prioritization)
- [ ] Backend: Implement `accountPrioritization.ts`
- [ ] Backend: Update sync orchestrator
- [ ] Frontend: Add Settings UI (optional manual override)
- [ ] Test: Verify top 25 accounts sync correctly

---

## Gap #2: Sync Progress Update Mechanism

### Problem
**Status:** ⚠️ Requires Technical Implementation  
**Priority:** HIGH  
**Impact:** Frontend can't show real-time sync progress  
**Effort:** 2 days

### Current State
- Frontend expects real-time progress updates
- Backend has no mechanism to push updates
- Poor UX during sync (user sees static spinner)

### Resolution: Server-Sent Events (SSE)

**Why SSE?**
- ✅ Simple one-way communication (server → client)
- ✅ Built-in reconnection logic
- ✅ Lower overhead than WebSocket
- ✅ Perfect for progress updates

### Implementation

#### Backend: SSE Endpoint
```typescript
// backend/src/routes/sync.ts

import { FastifyInstance } from 'fastify';

export async function syncRoutes(fastify: FastifyInstance) {
  
  // SSE endpoint for real-time progress
  fastify.get('/sync/progress/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });
    
    // Send initial connection
    reply.raw.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);
    
    // Poll sync job status and stream updates
    const interval = setInterval(async () => {
      const job = await getSyncJob(jobId);
      
      if (!job) {
        clearInterval(interval);
        reply.raw.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
        reply.raw.end();
        return;
      }
      
      // Send progress update
      const update = {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: getCurrentStep(job),
        accountsProcessed: job.accountsProcessed.length,
        errors: job.errors
      };
      
      reply.raw.write(`data: ${JSON.stringify(update)}\n\n`);
      
      // Close connection when complete
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
        reply.raw.end();
      }
    }, 1000); // Update every second
    
    // Clean up on client disconnect
    request.raw.on('close', () => {
      clearInterval(interval);
    });
  });
}

function getCurrentStep(job: SyncJob): string {
  if (job.progress.salesforce.status === 'in-progress') return 'Syncing Salesforce...';
  if (job.progress.onedrive.status === 'in-progress') return 'Syncing OneDrive...';
  if (job.progress.businessIntelligence.status === 'in-progress') return 'Fetching BI data...';
  return 'Initializing...';
}
```

#### Frontend: SSE Client
```typescript
// frontend/src/services/syncProgressService.ts

export function subscribeSyncProgress(
  jobId: string,
  onUpdate: (progress: SyncProgress) => void,
  onComplete: () => void,
  onError: (error: string) => void
) {
  const eventSource = new EventSource(`http://localhost:3001/api/sync/progress/${jobId}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.error) {
      onError(data.error);
      eventSource.close();
      return;
    }
    
    if (data.status === 'connected') {
      console.log('SSE connected');
      return;
    }
    
    // Update progress
    onUpdate(data);
    
    // Close on completion
    if (data.status === 'completed' || data.status === 'failed') {
      onComplete();
      eventSource.close();
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    onError('Connection lost');
    eventSource.close();
  };
  
  // Return cleanup function
  return () => eventSource.close();
}
```

#### Frontend: Zustand Store Integration
```typescript
// frontend/src/store/syncStore.ts

import { subscribeSyncProgress } from '../services/syncProgressService';

interface SyncStore {
  currentJob: SyncJob | null;
  syncProgress: SyncProgress | null;
  
  startSync: (type: 'manual' | 'scheduled') => Promise<void>;
  subscribeSyncUpdates: (jobId: string) => () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  currentJob: null,
  syncProgress: null,
  
  startSync: async (type) => {
    // Start sync job
    const response = await fetch('/api/sync/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    
    const job = await response.json();
    set({ currentJob: job });
    
    // Subscribe to progress updates
    get().subscribeSyncUpdates(job.jobId);
  },
  
  subscribeSyncUpdates: (jobId: string) => {
    const cleanup = subscribeSyncProgress(
      jobId,
      // onUpdate
      (progress) => {
        set({ syncProgress: progress });
      },
      // onComplete
      () => {
        set({ currentJob: null, syncProgress: null });
        showToast({ message: 'Sync complete!', variant: 'success' });
      },
      // onError
      (error) => {
        showToast({ message: `Sync error: ${error}`, variant: 'error' });
        set({ currentJob: null, syncProgress: null });
      }
    );
    
    return cleanup;
  }
}));
```

#### Frontend: UI Component
```tsx
// frontend/src/components/SyncProgress.tsx

export function SyncProgress() {
  const { currentJob, syncProgress } = useSyncStore();
  
  if (!currentJob || !syncProgress) return null;
  
  const overallProgress = calculateOverallProgress(syncProgress.progress);
  
  return (
    <Card className="sync-progress">
      <h3>Syncing Data...</h3>
      
      <ProgressBar value={overallProgress} showLabel />
      
      <div className="current-step">
        {syncProgress.currentStep}
      </div>
      
      <div className="details">
        <DetailRow
          label="Salesforce"
          progress={syncProgress.progress.salesforce}
        />
        <DetailRow
          label="OneDrive"
          progress={syncProgress.progress.onedrive}
        />
        <DetailRow
          label="Business Intelligence"
          progress={syncProgress.progress.businessIntelligence}
        />
      </div>
      
      {syncProgress.errors.length > 0 && (
        <div className="errors">
          <p>⚠️ {syncProgress.errors.length} errors occurred</p>
        </div>
      )}
    </Card>
  );
}

function calculateOverallProgress(progress: SyncJob['progress']): number {
  const sf = progress.salesforce.processed / progress.salesforce.total || 0;
  const od = progress.onedrive.processed / progress.onedrive.total || 0;
  const bi = progress.businessIntelligence.processed / progress.businessIntelligence.total || 0;
  
  return Math.round(((sf + od + bi) / 3) * 100);
}
```

### Action Items
- [ ] Backend: Add SSE endpoint `/sync/progress/:jobId`
- [ ] Frontend: Implement SSE client service
- [ ] Frontend: Update sync store with SSE integration
- [ ] Frontend: Add SyncProgress UI component
- [ ] Test: Verify real-time updates during sync

---

## Gap #3: IndexedDB Quota Management

### Problem
**Status:** ⚠️ Requires Implementation  
**Priority:** HIGH  
**Impact:** App breaks silently when storage quota exceeded  
**Effort:** 1 day

### Current State
- No monitoring of IndexedDB storage usage
- App crashes or fails silently when quota hit
- Data loss possible if quota exceeded mid-sync
- Unpredictable at scale (500+ accounts)

### Resolution: Quota Monitoring + User Controls

### Implementation

#### Frontend: Quota Monitoring Utility
```typescript
// frontend/src/utils/storageQuota.ts

export interface StorageQuota {
  usage: number;
  quota: number;
  percentUsed: number;
  available: number;
}

export async function checkStorageQuota(): Promise<StorageQuota | null> {
  if (!navigator.storage?.estimate) {
    console.warn('Storage API not available');
    return null;
  }
  
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
  const available = quota - usage;
  
  return {
    usage,
    quota,
    percentUsed,
    available
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export async function checkAndWarnQuota(): Promise<void> {
  const quota = await checkStorageQuota();
  
  if (!quota) return;
  
  // Warning at 80%
  if (quota.percentUsed > 80 && quota.percentUsed < 95) {
    showToast({
      message: `Storage ${Math.round(quota.percentUsed)}% full. Consider deleting old data.`,
      variant: 'warning',
      duration: 5000,
      action: {
        label: 'Manage Storage',
        onClick: () => window.location.hash = '/settings'
      }
    });
  }
  
  // Critical at 95%
  if (quota.percentUsed >= 95) {
    showToast({
      message: 'Storage critically full! Delete data to continue syncing.',
      variant: 'error',
      duration: 10000,
      action: {
        label: 'Free Up Space',
        onClick: () => window.location.hash = '/settings'
      }
    });
  }
}

// Monitor quota periodically
export function startQuotaMonitoring(intervalMs: number = 60000) {
  checkAndWarnQuota(); // Check immediately
  
  const interval = setInterval(checkAndWarnQuota, intervalMs);
  
  return () => clearInterval(interval);
}
```

#### Frontend: Storage Management UI
```tsx
// frontend/src/components/StorageManagement.tsx

import { checkStorageQuota, formatBytes } from '../utils/storageQuota';
import { db } from '../db/schema';

export function StorageManagement() {
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [accountStats, setAccountStats] = useState<AccountStorageStats[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadStorageInfo();
  }, []);
  
  async function loadStorageInfo() {
    const quotaInfo = await checkStorageQuota();
    setQuota(quotaInfo);
    
    // Calculate storage per account
    const accounts = await db.accounts.toArray();
    const stats = await Promise.all(
      accounts.map(async (account) => {
        const docCount = await db.documents
          .where('accountId')
          .equals(account.id)
          .count();
        
        const docs = await db.documents
          .where('accountId')
          .equals(account.id)
          .toArray();
        
        const sizeEstimate = docs.reduce((sum, doc) => 
          sum + (doc.content?.length || 0), 0
        );
        
        return {
          accountId: account.id,
          accountName: account.name,
          documentCount: docCount,
          estimatedSize: sizeEstimate
        };
      })
    );
    
    setAccountStats(stats.sort((a, b) => b.estimatedSize - a.estimatedSize));
  }
  
  async function deleteAccount(accountId: string) {
    if (!confirm('Delete all data for this account?')) return;
    
    setLoading(true);
    
    // Delete all related data
    await db.transaction('rw', [
      db.accounts,
      db.documents,
      db.priorities,
      db.upcomingDates,
      db.projects,
      db.customerIssues,
      db.tickets,
      db.chatMessages
    ], async () => {
      await db.accounts.delete(accountId);
      await db.documents.where('accountId').equals(accountId).delete();
      await db.priorities.where('accountId').equals(accountId).delete();
      await db.upcomingDates.where('accountId').equals(accountId).delete();
      await db.projects.where('accountId').equals(accountId).delete();
      await db.customerIssues.where('accountId').equals(accountId).delete();
      await db.tickets.where('accountId').equals(accountId).delete();
      await db.chatMessages.where('accountId').equals(accountId).delete();
    });
    
    await loadStorageInfo();
    setLoading(false);
    
    showToast({
      message: 'Account data deleted successfully',
      variant: 'success'
    });
  }
  
  async function clearOldChatHistory() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deleted = await db.chatMessages
      .where('timestamp')
      .below(thirtyDaysAgo)
      .delete();
    
    await loadStorageInfo();
    
    showToast({
      message: `Deleted ${deleted} old chat messages`,
      variant: 'success'
    });
  }
  
  if (!quota) return <div>Loading storage info...</div>;
  
  return (
    <div className="storage-management">
      <h2>Storage Management</h2>
      
      <Card>
        <h3>Storage Usage</h3>
        <ProgressBar
          value={quota.percentUsed}
          color={quota.percentUsed > 80 ? 'error' : 'primary'}
          showLabel
        />
        <p className="storage-stats">
          {formatBytes(quota.usage)} / {formatBytes(quota.quota)} used
          <br />
          {formatBytes(quota.available)} available
        </p>
      </Card>
      
      <Card>
        <h3>Storage by Account</h3>
        <table className="storage-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Documents</th>
              <th>Est. Size</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {accountStats.map(stat => (
              <tr key={stat.accountId}>
                <td>{stat.accountName}</td>
                <td>{stat.documentCount}</td>
                <td>{formatBytes(stat.estimatedSize)}</td>
                <td>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteAccount(stat.accountId)}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      
      <Card>
        <h3>Quick Actions</h3>
        <Button onClick={clearOldChatHistory} disabled={loading}>
          Clear Chat History (>30 days)
        </Button>
      </Card>
    </div>
  );
}

interface AccountStorageStats {
  accountId: string;
  accountName: string;
  documentCount: number;
  estimatedSize: number;
}
```

#### Frontend: App-Level Integration
```typescript
// frontend/src/App.tsx

import { startQuotaMonitoring, checkAndWarnQuota } from './utils/storageQuota';

export function App() {
  useEffect(() => {
    // Start monitoring quota every minute
    const cleanup = startQuotaMonitoring(60000);
    
    return cleanup;
  }, []);
  
  // Also check before sync
  const { startSync } = useSyncStore();
  
  const handleSync = async () => {
    const quota = await checkStorageQuota();
    
    if (quota && quota.percentUsed > 95) {
      showToast({
        message: 'Storage critically full. Free up space before syncing.',
        variant: 'error'
      });
      return;
    }
    
    await startSync('manual');
  };
  
  // ... rest of app
}
```

### Action Items
- [ ] Frontend: Implement quota monitoring utility
- [ ] Frontend: Add StorageManagement component to Settings
- [ ] Frontend: Integrate quota checking before sync
- [ ] Frontend: Add periodic monitoring (every 60s)
- [ ] Test: Verify warnings at 80% and 95% thresholds
- [ ] Test: Verify deletion clears space correctly

---

## Summary

### Resolution Timeline

**Day 1:** Gap #1 (Account Subset Logic)
- [ ] Morning: Product decision (Option B recommended)
- [ ] Afternoon: Implement prioritization algorithm
- [ ] EOD: Update sync orchestrator + Settings UI

**Day 2-3:** Gap #2 (Sync Progress SSE)
- [ ] Day 2 AM: Implement SSE backend endpoint
- [ ] Day 2 PM: Implement SSE frontend client
- [ ] Day 3 AM: Update Zustand store + UI component
- [ ] Day 3 PM: Integration testing

**Day 3:** Gap #3 (Quota Management)
- [ ] Morning: Implement quota monitoring utility
- [ ] Afternoon: Build StorageManagement UI
- [ ] EOD: Integrate into app, test warnings

### Testing Checklist

After resolution:
- [ ] Gap #1: Verify top 25 accounts sync automatically
- [ ] Gap #1: Verify manual selection override works
- [ ] Gap #2: Verify real-time progress updates during sync
- [ ] Gap #2: Verify SSE reconnection on network interruption
- [ ] Gap #3: Verify warnings at 80% and 95% storage
- [ ] Gap #3: Verify account deletion frees space
- [ ] Gap #3: Verify sync blocked at 95% usage

### Updated Artifacts

After implementing these gaps, update:
- [ ] `06_FrontendArchitecture.md` - Add quota management section
- [ ] `07_BackendAPISpec.md` - Add SSE endpoint documentation
- [ ] `08_TestPlan.md` - Add gap-specific test cases
- [ ] `09_IterationReport.md` - Mark gaps as resolved

---

**All gaps are solvable with clear implementation paths. Let's ship CS720!** 🚀
