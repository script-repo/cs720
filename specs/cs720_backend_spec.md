# Backend/API Spec - CS720

**Project:** CS720  
**Agent:** Eko Logic  
**Created:** 2025-10-04 15:45:00  
**Source:** CyrusStack-CS720-20251004-153500.md

---

## Architecture Overview

### Deployment Model
**Fully Local Architecture** - All services run on SE laptop

```
SE Laptop (localhost)
├── Frontend PWA :3000
│   └── IndexedDB storage
│
├── Local Backend Server :3001 (Fastify/Node.js)
│   ├── REST API endpoints
│   ├── Sync orchestrator
│   ├── OAuth handler
│   ├── Document transformer
│   ├── LLM proxy (external + local fallback)
│   └── In-memory processing
│
├── Local LLM :11434 (Ollama)
│   └── Fallback inference
│
└── External Connections (Direct)
    ├── Salesforce API (OAuth)
    ├── Microsoft Graph API (OneDrive, OAuth)
    ├── OpenAI/Anthropic API (Primary LLM)
    └── Public BI sources
```

### Technology Stack

```json
{
  "runtime": "Node.js 20+",
  "framework": "Fastify 4.x",
  "authentication": "OAuth 2.0 (Salesforce, Microsoft)",
  "documentProcessing": "mammoth.js, pdf-parse, marked",
  "llm": {
    "primary": "OpenAI SDK / Anthropic SDK",
    "fallback": "Ollama (local)"
  },
  "storage": "In-memory + filesystem cache",
  "scheduling": "node-cron (daily sync)",
  "validation": "Zod (schema validation)"
}
```

### Key Principles
1. **All data stays on laptop** - No external database or backend infrastructure
2. **Direct API connections** - Laptop connects directly to Salesforce/OneDrive/LLM
3. **In-memory processing** - Transform data in-memory, stream to frontend
4. **OAuth security** - Tokens stored locally (encrypted)
5. **Graceful degradation** - Works offline with cached data

---

## Data Model & Entities

### Entity Relationship Diagram

```
Account (Salesforce)
  ├─── Documents (OneDrive + Salesforce Notes)
  ├─── Projects (Derived)
  ├─── Priorities (Extracted)
  ├─── Issues/Tickets (Salesforce Cases)
  ├─── Upcoming Dates (Salesforce Opportunities)
  └─── Industry Intelligence (External BI)

ChatMessage
  └─── Account (context)
```

### Core Entities

#### 1. Account (from Salesforce)
**Source:** Salesforce Account object  
**Transformation:** Map Salesforce fields → Frontend Account interface

```typescript
// Backend representation (matches frontend)
interface SalesforceAccountRaw {
  Id: string;
  Name: string;
  Industry: string;
  Owner: { Name: string; Email: string };
  Region__c: string;
  Segment__c: string;
  AnnualRevenue: number;
  NumberOfEmployees: number;
  Website: string;
  BillingStreet: string;
  BillingCity: string;
  BillingState: string;
  BillingPostalCode: string;
  BillingCountry: string;
  SiteCount__c: number;
  CreatedDate: string;
  LastModifiedDate: string;
  // Custom fields
  AccountStatus__c: 'Active' | 'At Risk' | 'Churned';
}

// Transformed to frontend Account type
```

**Backend Processing:**
- Fetch via Salesforce REST API
- Transform field names (snake_case → camelCase)
- Calculate derived fields (status, siteCount)
- Return as JSON to frontend

---

#### 2. Document (from OneDrive + Salesforce)
**Sources:** 
- OneDrive files (DOCX, PDF, TXT, MD)
- Salesforce Notes & Attachments

**Transformation Pipeline:**
```
Raw File (OneDrive/Salesforce)
  ↓
Download content
  ↓
Detect MIME type
  ↓
Convert to Markdown (in-memory)
  ├── DOCX → mammoth.js → Markdown
  ├── PDF → pdf-parse → Text → Markdown
  ├── TXT/MD → Direct
  └── Salesforce Note → HTML → Markdown
  ↓
Extract metadata (author, dates, tags)
  ↓
Classify document type (sales-note, technical-doc, etc.)
  ↓
Return Document object to frontend
```

**Document Classification Logic:**
```typescript
function classifyDocumentType(filename: string, content: string): DocumentType {
  if (/meeting|notes|discussion/i.test(filename)) return 'meeting-notes';
  if (/technical|architecture|deployment/i.test(content)) return 'technical-doc';
  if (/contract|agreement|sow/i.test(filename)) return 'contract';
  if (/sales|opportunity|quote/i.test(content)) return 'sales-note';
  return 'other';
}
```

---

#### 3. Project (Derived from Documents + Salesforce)
**Sources:**
- Salesforce Opportunities (project-like)
- Documents mentioning projects
- Pattern recognition in meeting notes

**Extraction Logic:**
```typescript
// Parse documents for project mentions
const projectPattern = /(?:project|initiative|deployment)\s+(?:named|called)?\s*["']?([A-Z][A-Za-z0-9\s]+)["']?/gi;

// Cross-reference with Salesforce Opportunities
// Enrich with timeline, team, milestones from multiple sources
```

---

#### 4. Priority (Extracted from Documents)
**Sources:**
- Sales notes
- Executive meeting transcripts
- Strategic planning documents

**Extraction Logic:**
```typescript
// NLP-based extraction
const priorityIndicators = [
  /top priority/i,
  /critical need/i,
  /must have/i,
  /executive request/i,
  /strategic initiative/i
];

// Extract context around priority indicators
// Classify importance (high/medium/low)
// Determine timing (this-week/month/quarter)
```

---

#### 5. Customer Issue / Ticket (from Salesforce Cases)
**Source:** Salesforce Case object

**Transformation:**
```typescript
interface SalesforceCaseRaw {
  Id: string;
  CaseNumber: string;
  Subject: string;
  Status: string;
  Priority: string;
  Type: string;
  Description: string;
  CreatedDate: string;
  LastModifiedDate: string;
  // SLA fields
  SLAViolation__c: boolean;
  ResponseDueDate__c: string;
  ResolutionDueDate__c: string;
}

// Transform to CustomerIssue / Ticket
```

---

#### 6. Industry Intelligence (from External BI)
**Sources:**
- News APIs (NewsAPI, Google News)
- Industry reports (web scraping)
- Market data (public APIs)

**Aggregation Logic:**
```typescript
// Fetch from multiple sources
const sources = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/api/...' },
  { name: 'Gartner', url: 'https://gartner.com/...' }
];

// Filter by account industry
// Calculate relevance score
// Deduplicate across sources
```

---

## API Endpoints

### Base URL
`http://localhost:3001/api`

### Authentication
**OAuth 2.0 Tokens** stored locally (encrypted)

```typescript
// Token storage location
~/.cs720/auth/
  ├── salesforce-token.json (encrypted)
  ├── microsoft-token.json (encrypted)
  └── encryption-key (secure key storage)
```

---

### 1. Authentication Endpoints

#### `POST /auth/salesforce/authorize`
**Purpose:** Initiate Salesforce OAuth flow

**Request:**
```json
{
  "redirectUri": "http://localhost:3001/auth/salesforce/callback"
}
```

**Response:**
```json
{
  "authUrl": "https://login.salesforce.com/services/oauth2/authorize?..."
}
```

**Flow:**
1. Backend generates OAuth URL
2. Opens browser to Salesforce login
3. User authenticates
4. Salesforce redirects to callback
5. Backend exchanges code for tokens
6. Stores tokens locally (encrypted)

---

#### `POST /auth/onedrive/authorize`
**Purpose:** Initiate Microsoft Graph OAuth flow

**Request:**
```json
{
  "redirectUri": "http://localhost:3001/auth/onedrive/callback"
}
```

**Response:**
```json
{
  "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?..."
}
```

---

#### `GET /auth/status`
**Purpose:** Check authentication status

**Response:**
```json
{
  "salesforce": {
    "authenticated": true,
    "expiresAt": "2025-10-05T15:00:00Z"
  },
  "onedrive": {
    "authenticated": true,
    "expiresAt": "2025-10-05T16:00:00Z"
  }
}
```

---

### 2. Sync Endpoints

#### `POST /sync/start`
**Purpose:** Initiate manual sync

**Request:**
```json
{
  "type": "manual",
  "scope": {
    "sources": ["salesforce", "onedrive", "bi"],
    "accountIds": ["optional-specific-accounts"]
  }
}
```

**Response:**
```json
{
  "jobId": "sync-20251004-154500",
  "status": "in-progress",
  "startedAt": "2025-10-04T15:45:00Z"
}
```

**Process:**
1. Create sync job
2. For each source:
   - Salesforce: Fetch accounts, cases, opportunities
   - OneDrive: Fetch files, convert to markdown
   - BI: Fetch industry insights
3. Transform data in-memory
4. Stream to frontend via WebSocket (or polling)

---

#### `GET /sync/status/:jobId`
**Purpose:** Get sync job status

**Response:**
```json
{
  "jobId": "sync-20251004-154500",
  "status": "in-progress",
  "progress": {
    "salesforce": { "total": 50, "processed": 30, "failed": 0 },
    "onedrive": { "total": 200, "processed": 150, "failed": 5 },
    "bi": { "total": 10, "processed": 10, "failed": 0 }
  },
  "errors": [
    {
      "source": "onedrive",
      "message": "Failed to convert file: corrupted-doc.docx"
    }
  ]
}
```

---

#### `GET /sync/history`
**Purpose:** Get sync job history

**Response:**
```json
{
  "jobs": [
    {
      "jobId": "sync-20251004-154500",
      "type": "manual",
      "status": "completed",
      "startedAt": "2025-10-04T15:45:00Z",
      "completedAt": "2025-10-04T15:48:30Z",
      "accountsProcessed": 25,
      "documentsProcessed": 180
    }
  ]
}
```

---

### 3. Data Retrieval Endpoints

#### `GET /accounts`
**Purpose:** Get all synced accounts

**Response:**
```json
{
  "accounts": [
    {
      "id": "001Dn00000Example",
      "name": "CloudWorks Inc",
      "industry": "Technology",
      "status": "active",
      "salesforceData": { ... },
      "metadata": {
        "lastViewed": null,
        "isFavorite": false,
        "siteCount": 450
      }
    }
  ]
}
```

---

#### `GET /accounts/:accountId/documents`
**Purpose:** Get documents for an account

**Query Params:**
- `type`: Filter by document type
- `limit`: Max results (default 50)
- `offset`: Pagination

**Response:**
```json
{
  "documents": [
    {
      "id": "doc-123",
      "accountId": "001Dn00000Example",
      "title": "Q3 Executive Meeting Notes",
      "content": "# Q3 Executive Meeting\n\n## Key Decisions...",
      "source": "onedrive",
      "documentType": "meeting-notes",
      "tags": ["executive", "q3", "strategy"],
      "metadata": {
        "author": "John Smith",
        "createdDate": "2025-09-15T10:00:00Z",
        "modifiedDate": "2025-09-15T11:30:00Z"
      }
    }
  ],
  "total": 180,
  "page": 1
}
```

---

#### `GET /accounts/:accountId/dashboard`
**Purpose:** Get all dashboard data for an account (aggregated)

**Response:**
```json
{
  "accountId": "001Dn00000Example",
  "priorities": [ ... ],
  "upcomingDates": [ ... ],
  "projects": [ ... ],
  "customerIssues": [ ... ],
  "tickets": [ ... ],
  "industryIntelligence": [ ... ]
}
```

---

### 4. AI / LLM Endpoints

#### `POST /ai/query`
**Purpose:** Query AI assistant with context

**Request:**
```json
{
  "accountId": "001Dn00000Example",
  "query": "What are the top 3 priorities for this customer?",
  "useLocalOnly": false
}
```

**Response:**
```json
{
  "messageId": "msg-456",
  "role": "assistant",
  "content": "Based on recent documents, the top 3 priorities are:\n1. Cloud storage upsell...",
  "sources": [
    {
      "documentId": "doc-123",
      "title": "Sales Notes - Sept 2025",
      "excerpt": "...discussed cloud storage expansion...",
      "relevanceScore": 0.92
    }
  ],
  "metadata": {
    "model": "gpt-4-turbo",
    "endpoint": "external",
    "tokenCount": 450,
    "responseTime": 1200
  }
}
```

**Processing:**
1. Retrieve context documents from frontend IndexedDB (via request body or local cache)
2. Build prompt with context
3. Try external LLM endpoint (OpenAI/Anthropic)
4. If fails → Fallback to local Ollama
5. Extract sources/citations
6. Return response

---

#### `GET /ai/health`
**Purpose:** Check LLM availability

**Response:**
```json
{
  "external": {
    "available": true,
    "endpoint": "https://api.openai.com/v1/chat/completions",
    "latency": 250
  },
  "local": {
    "available": true,
    "endpoint": "http://localhost:11434/api/generate",
    "model": "llama2",
    "latency": 50
  }
}
```

---

### 5. Business Intelligence Endpoints

#### `GET /bi/insights`
**Purpose:** Fetch industry intelligence

**Query Params:**
- `industry`: Filter by industry
- `limit`: Max results (default 10)

**Response:**
```json
{
  "insights": [
    {
      "id": "bi-789",
      "headline": "Cloud Infrastructure Spending Increases 32% in Q3 2025",
      "summary": "Enterprise cloud adoption accelerates...",
      "source": "TechCrunch",
      "sourceUrl": "https://techcrunch.com/...",
      "publishedAt": "2025-10-01T08:00:00Z",
      "tags": ["cloud", "infrastructure", "enterprise"],
      "impact": "positive",
      "relevanceScore": 85
    }
  ]
}
```

---

### 6. Configuration Endpoints

#### `GET /config/preferences`
**Purpose:** Get user preferences

**Response:**
```json
{
  "theme": "dark",
  "notifications": {
    "desktop": true,
    "syncComplete": true
  },
  "ai": {
    "inferenceEndpoint": "external",
    "autoSuggestions": true,
    "queryHistoryRetention": 60
  },
  "sync": {
    "schedule": "daily",
    "scheduledTime": "06:00"
  }
}
```

---

#### `PUT /config/preferences`
**Purpose:** Update preferences

**Request:**
```json
{
  "ai": {
    "inferenceEndpoint": "local"
  }
}
```

**Response:**
```json
{
  "success": true,
  "preferences": { ... }
}
```

---

## Document Transformation Pipeline

### Conversion Flow

```
┌─────────────────────────────────────────────┐
│ 1. Fetch Documents from Source              │
│    - OneDrive Graph API                     │
│    - Salesforce Notes/Attachments API       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. Detect MIME Type & Select Converter      │
│    - DOCX → mammoth.js                      │
│    - PDF → pdf-parse                        │
│    - HTML → turndown.js                     │
│    - TXT/MD → direct                        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. Convert to Markdown (in-memory)          │
│    - Preserve structure (headings, lists)   │
│    - Clean formatting                       │
│    - Extract tables → markdown tables       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 4. Extract Metadata                         │
│    - Author, dates, file size               │
│    - Tags from content (NLP)                │
│    - Entity extraction (projects, people)   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 5. Classify Document Type                   │
│    - Pattern matching on filename/content   │
│    - ML classification (optional)           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 6. Return to Frontend                       │
│    - Document object with markdown content  │
│    - Stored in frontend IndexedDB           │
└─────────────────────────────────────────────┘
```

### Converter Implementation

```typescript
// services/documentConverter.ts

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import TurndownService from 'turndown';

export async function convertToMarkdown(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  
  switch (true) {
    case mimeType.includes('wordprocessingml'):
    case mimeType.includes('msword'):
      // DOCX to Markdown
      const docResult = await mammoth.convertToMarkdown({ buffer });
      return cleanMarkdown(docResult.value);
    
    case mimeType.includes('pdf'):
      // PDF to Text to Markdown
      const pdfData = await pdfParse(buffer);
      return formatTextAsMarkdown(pdfData.text);
    
    case mimeType.includes('html'):
      // HTML to Markdown
      const turndown = new TurndownService();
      const html = buffer.toString('utf-8');
      return turndown.turndown(html);
    
    case mimeType.includes('text/plain'):
    case mimeType.includes('text/markdown'):
      // Direct text/markdown
      return buffer.toString('utf-8');
    
    default:
      throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
}

function cleanMarkdown(markdown: string): string {
  // Remove excessive whitespace
  let cleaned = markdown.replace(/\n{3,}/g, '\n\n');
  
  // Fix broken lists
  cleaned = cleaned.replace(/^(\s*)-\s+/gm, '- ');
  
  // Ensure proper heading formatting
  cleaned = cleaned.replace(/^(#{1,6})\s*/gm, '$1 ');
  
  return cleaned.trim();
}

function formatTextAsMarkdown(text: string): string {
  // Detect structure and add markdown formatting
  let formatted = text;
  
  // Detect potential headings (ALL CAPS lines)
  formatted = formatted.replace(/^([A-Z][A-Z\s]{5,})$/gm, '## $1');
  
  // Detect bullet points
  formatted = formatted.replace(/^[•·‣]\s+/gm, '- ');
  
  // Preserve paragraphs
  formatted = formatted.replace(/\n\n+/g, '\n\n');
  
  return formatted;
}
```

---

## LLM Integration & Failover

### LLM Proxy Architecture

```typescript
// services/llmService.ts

import { OpenAI } from 'openai';
import axios from 'axios';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const OLLAMA_URL = 'http://localhost:11434/api/generate';

export async function queryLLM(
  prompt: string,
  context: string,
  useLocalOnly: boolean = false
): Promise<LLMResponse> {
  
  const systemPrompt = `You are an AI assistant helping a Sales Engineer understand customer context.
Use the following documents to answer questions accurately and concisely.

${context}

Provide answers with source citations.`;

  // Try external first (unless local-only mode)
  if (!useLocalOnly) {
    try {
      const response = await queryExternalLLM(systemPrompt, prompt);
      return {
        content: response.content,
        sources: extractSources(response.content),
        metadata: {
          model: 'gpt-4-turbo',
          endpoint: 'external',
          tokenCount: response.usage?.total_tokens,
          responseTime: response.responseTime
        }
      };
    } catch (error) {
      console.warn('External LLM failed, falling back to local:', error);
      // Fall through to local
    }
  }
  
  // Fallback to local Ollama
  return await queryLocalLLM(systemPrompt, prompt);
}

async function queryExternalLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  const startTime = Date.now();
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 500,
    timeout: 10000 // 10 second timeout
  });
  
  return {
    content: response.choices[0].message.content,
    usage: response.usage,
    responseTime: Date.now() - startTime
  };
}

async function queryLocalLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<LLMResponse> {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(OLLAMA_URL, {
      model: 'llama2',
      prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
      stream: false
    }, {
      timeout: 30000 // 30 second timeout for local
    });
    
    return {
      content: response.data.response,
      sources: [],
      metadata: {
        model: 'llama2-local',
        endpoint: 'local',
        responseTime: Date.now() - startTime
      }
    };
  } catch (error) {
    throw new Error('Both external and local LLM failed');
  }
}

function extractSources(content: string): Source[] {
  // Parse citations from LLM response
  // Example: [1] Sales Notes - Sept 2025
  const citationRegex = /\[(\d+)\]\s+([^\n]+)/g;
  const sources: Source[] = [];
  
  let match;
  while ((match = citationRegex.exec(content)) !== null) {
    sources.push({
      documentId: '', // Would need to map back
      title: match[2],
      excerpt: '',
      relevanceScore: 0.9
    });
  }
  
  return sources;
}

interface LLMResponse {
  content: string;
  sources: Source[];
  metadata: {
    model: string;
    endpoint: 'external' | 'local';
    tokenCount?: number;
    responseTime: number;
  };
}
```

---

## Sync Orchestration

### Scheduled Sync (Daily)

```typescript
// services/syncOrchestrator.ts

import cron from 'node-cron';
import { syncSalesforceAccounts } from './salesforceSync';
import { syncOneDriveDocuments } from './onedriveSync';
import { syncBusinessIntelligence } from './biSync';

// Schedule daily sync at 6:00 AM
export function initializeDailySync() {
  cron.schedule('0 6 * * *', async () => {
    console.log('Starting scheduled sync at 6:00 AM');
    await executeSync('scheduled');
  });
}

export async function executeSync(
  type: 'manual' | 'scheduled',
  scope?: SyncScope
): Promise<SyncJob> {
  
  const jobId = `sync-${Date.now()}`;
  const job: SyncJob = {
    id: jobId,
    jobType: type,
    status: 'in-progress',
    startedAt: new Date(),
    progress: {
      salesforce: { total: 0, processed: 0, failed: 0, status: 'pending' },
      onedrive: { total: 0, processed: 0, failed: 0, status: 'pending' },
      businessIntelligence: { total: 0, processed: 0, failed: 0, status: 'pending' }
    },
    accountsProcessed: [],
    errors: []
  };
  
  try {
    // 1. Sync Salesforce
    job.progress.salesforce.status = 'in-progress';
    const sfAccounts = await syncSalesforceAccounts(scope?.accountIds);
    job.progress.salesforce = {
      total: sfAccounts.length,
      processed: sfAccounts.length,
      failed: 0,
      status: 'completed'
    };
    job.accountsProcessed = sfAccounts.map(a => a.id);
    
    // 2. Sync OneDrive (for each account)
    job.progress.onedrive.status = 'in-progress';
    let totalDocs = 0;
    for (const account of sfAccounts) {
      try {
        const docs = await syncOneDriveDocuments(account.id);
        totalDocs += docs.length;
        job.progress.onedrive.processed += docs.length;
      } catch (error) {
        job.progress.onedrive.failed += 1;
        job.errors.push({
          source: 'onedrive',
          errorType: 'parse-error',
          message: error.message,
          timestamp: new Date(),
          accountId: account.id
        });
      }
    }
    job.progress.onedrive.total = totalDocs;
    job.progress.onedrive.status = 'completed';
    
    // 3. Sync Business Intelligence
    job.progress.businessIntelligence.status = 'in-progress';
    const insights = await syncBusinessIntelligence();
    job.progress.businessIntelligence = {
      total: insights.length,
      processed: insights.length,
      failed: 0,
      status: 'completed'
    };
    
    // Mark complete
    job.status = 'completed';
    job.completedAt = new Date();
    
  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date();
    job.errors.push({
      source: 'salesforce',
      errorType: 'network-error',
      message: error.message,
      timestamp: new Date()
    });
  }
  
  // Save job to local file system for history
  await saveSyncJob(job);
  
  // Notify frontend via WebSocket or polling
  notifyFrontend('sync-complete', job);
  
  return job;
}

async function saveSyncJob(job: SyncJob): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');
  
  const syncDir = path.join(process.cwd(), '.cs720', 'sync-history');
  await fs.mkdir(syncDir, { recursive: true });
  
  const jobFile = path.join(syncDir, `${job.id}.json`);
  await fs.writeFile(jobFile, JSON.stringify(job, null, 2));
}
```

---

## Authentication & Security

### OAuth Token Management

```typescript
// services/authService.ts

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const AUTH_DIR = path.join(process.cwd(), '.cs720', 'auth');
const ENCRYPTION_KEY = await loadOrCreateEncryptionKey();

export async function saveTokens(
  service: 'salesforce' | 'onedrive',
  tokens: OAuthTokens
): Promise<void> {
  
  await fs.mkdir(AUTH_DIR, { recursive: true });
  
  const encrypted = encrypt(JSON.stringify(tokens));
  const tokenFile = path.join(AUTH_DIR, `${service}-token.json`);
  
  await fs.writeFile(tokenFile, encrypted);
}

export async function loadTokens(
  service: 'salesforce' | 'onedrive'
): Promise<OAuthTokens | null> {
  
  try {
    const tokenFile = path.join(AUTH_DIR, `${service}-token.json`);
    const encrypted = await fs.readFile(tokenFile, 'utf-8');
    const decrypted = decrypt(encrypted);
    
    return JSON.parse(decrypted);
  } catch (error) {
    return null;
  }
}

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

async function loadOrCreateEncryptionKey(): Promise<Buffer> {
  const keyFile = path.join(AUTH_DIR, 'encryption-key');
  
  try {
    return await fs.readFile(keyFile);
  } catch {
    const key = crypto.randomBytes(32);
    await fs.mkdir(AUTH_DIR, { recursive: true });
    await fs.writeFile(keyFile, key);
    return key;
  }
}

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
```

---

## Error Handling & Resilience

### Error Types & Strategies

```typescript
// Error handling matrix

const errorStrategies = {
  'auth-failed': {
    action: 'Prompt user to re-authenticate',
    retry: false
  },
  'quota-exceeded': {
    action: 'Log error, schedule retry for next day',
    retry: true,
    retryDelay: 24 * 60 * 60 * 1000 // 24 hours
  },
  'network-error': {
    action: 'Retry with exponential backoff',
    retry: true,
    maxRetries: 3,
    retryDelay: [1000, 5000, 15000] // 1s, 5s, 15s
  },
  'parse-error': {
    action: 'Log error, skip document, continue sync',
    retry: false
  },
  'timeout': {
    action: 'Retry once, then skip',
    retry: true,
    maxRetries: 1
  }
};

export async function handleSyncError(
  error: SyncError,
  context: { source: string; accountId?: string }
): Promise<void> {
  
  const strategy = errorStrategies[error.errorType];
  
  if (strategy.retry) {
    // Implement retry logic
    await retryWithBackoff(error, strategy);
  } else {
    // Log and continue
    console.error(`Non-retryable error in ${context.source}:`, error);
    // Store in sync job errors array
  }
}
```

---

## Non-Functional Requirements

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time** | <200ms (p95) | All local endpoints |
| **Sync Duration** | <5 min for 50 accounts | Full sync cycle |
| **Document Conversion** | <500ms per document | DOCX/PDF → Markdown |
| **LLM Query** | <2s (external), <5s (local) | End-to-end response |
| **Concurrent Requests** | Support 10 concurrent | Local backend capacity |

### Scalability Considerations

**Current MVP Scope:**
- **Accounts:** 50-100 accounts per SE
- **Documents:** 2,000-5,000 documents total
- **Sync Frequency:** Daily (not real-time)
- **Concurrent Users:** 1 (single SE laptop)

**If scaling needed:**
- Optimize IndexedDB queries (compound indexes)
- Implement pagination for large document sets
- Cache frequently accessed data in-memory
- Consider incremental sync (delta updates only)

### Security Requirements

1. **Token Encryption:** All OAuth tokens encrypted at rest (AES-256)
2. **HTTPS:** Local backend serves over HTTPS (self-signed cert for localhost)
3. **No External Storage:** All data stays on laptop, never sent to external servers
4. **Audit Logging:** Log all data access and sync operations
5. **Token Expiry:** Refresh tokens before expiry, re-auth if expired

### Logging & Monitoring

```typescript
// Logging levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log to file system
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: '.cs720/logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '.cs720/logs/combined.log' 
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('Sync started', { jobId, type: 'manual' });
logger.error('Sync failed', { error: error.message, accountId });
```

---

## Mock API Responses

### Mock Data for Frontend Development

#### Mock Account
```json
{
  "id": "001Dn00000CloudWorks",
  "name": "CloudWorks Inc",
  "industry": "Technology",
  "status": "active",
  "salesforceData": {
    "accountId": "001Dn00000CloudWorks",
    "accountName": "CloudWorks Inc",
    "accountOwner": "Sarah Johnson",
    "region": "North America",
    "segment": "Enterprise",
    "annualRevenue": 50000000,
    "employeeCount": 500,
    "website": "https://cloudworks.example.com",
    "billingAddress": {
      "street": "123 Tech Street",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "country": "USA"
    }
  },
  "metadata": {
    "lastViewed": "2025-10-01T14:30:00Z",
    "isFavorite": true,
    "siteCount": 450
  },
  "createdAt": "2024-01-15T00:00:00Z",
  "updatedAt": "2025-10-04T15:00:00Z"
}
```

#### Mock Document
```json
{
  "id": "doc-abc123",
  "accountId": "001Dn00000CloudWorks",
  "title": "Q3 Executive Meeting Notes - CloudWorks",
  "content": "# Q3 Executive Meeting - CloudWorks\n\n## Date\nSeptember 15, 2025\n\n## Attendees\n- Emily Rodriguez (CTO, CloudWorks)\n- John Smith (SE, Our Company)\n- Sarah Johnson (Account Manager)\n\n## Key Discussion Points\n\n### 1. Cloud Storage Upsell\n- CloudWorks interested in expanding storage by 50TB\n- Budget approved: $125K\n- Timeline: Q4 2025\n- Decision maker: Emily Rodriguez\n\n### 2. Performance Issues\n- Dashboard load times exceeding 30 seconds\n- Impact: 50+ daily users affected\n- Priority: **Critical**\n- Requested resolution by Oct 10\n\n### 3. Security Audit Progress\n- Currently 60% complete\n- On track for Oct 25 deadline\n- No major blockers identified\n\n## Action Items\n- [ ] Provide storage expansion quote by Sept 20\n- [ ] Escalate performance issue to engineering\n- [ ] Schedule security audit review meeting",
  "source": "onedrive",
  "sourceId": "01AZJL5PN6Y2GOVW7725BZO354PWSELRRZ",
  "sourceUrl": "https://onedrive.live.com/...",
  "documentType": "meeting-notes",
  "tags": ["executive", "q3", "cloudworks", "upsell", "performance"],
  "metadata": {
    "author": "John Smith",
    "createdDate": "2025-09-15T10:00:00Z",
    "modifiedDate": "2025-09-15T11:30:00Z",
    "fileSize": 15234
  },
  "createdAt": "2025-09-15T12:00:00Z",
  "updatedAt": "2025-09-15T12:00:00Z"
}
```

#### Mock AI Query Response
```json
{
  "messageId": "msg-xyz789",
  "role": "assistant",
  "content": "Based on recent documents, CloudWorks' top 3 priorities are:\n\n1. **Cloud Storage Upsell** - Expanding storage by 50TB with a $125K budget approved for Q4 2025. Decision maker is Emily Rodriguez (CTO).\n\n2. **Dashboard Performance Issues** - Critical priority to resolve 30+ second load times affecting 50+ daily users. Resolution requested by Oct 10.\n\n3. **Security Audit Completion** - Currently 60% complete, on track for Oct 25 deadline with no major blockers.\n\nAll three items were discussed in the Sept 15 executive meeting with Emily Rodriguez.",
  "sources": [
    {
      "documentId": "doc-abc123",
      "title": "Q3 Executive Meeting Notes - CloudWorks",
      "excerpt": "CloudWorks interested in expanding storage by 50TB, Budget approved: $125K",
      "relevanceScore": 0.95
    }
  ],
  "timestamp": "2025-10-04T15:45:30Z",
  "metadata": {
    "model": "gpt-4-turbo",
    "endpoint": "external",
    "tokenCount": 420,
    "responseTime": 1250
  }
}
```

---

## Deployment & Operations

### Local Backend Setup

```bash
# 1. Install dependencies
npm install

# 2. Create configuration
cp .env.example .env
# Edit .env with API keys

# 3. Initialize local storage
mkdir -p .cs720/{auth,logs,sync-history}

# 4. Start backend server
npm run start
# Runs on http://localhost:3001

# 5. Start Ollama (local LLM)
ollama serve
ollama pull llama2
# Runs on http://localhost:11434
```

### Environment Variables

```bash
# .env file

# Backend Server
PORT=3001
NODE_ENV=development

# Salesforce OAuth
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CLIENT_SECRET=your_client_secret
SALESFORCE_REDIRECT_URI=http://localhost:3001/auth/salesforce/callback

# Microsoft Graph (OneDrive) OAuth
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/onedrive/callback

# OpenAI (External LLM)
OPENAI_API_KEY=sk-your-api-key

# Ollama (Local LLM)
OLLAMA_URL=http://localhost:11434

# Sync Configuration
SYNC_SCHEDULE=0 6 * * *  # Daily at 6:00 AM
SYNC_BATCH_SIZE=50       # Process 50 accounts per batch

# Logging
LOG_LEVEL=info
```

### Health Checks

```bash
# Check backend health
curl http://localhost:3001/health

# Response
{
  "status": "healthy",
  "uptime": 3600,
  "services": {
    "salesforce": "authenticated",
    "onedrive": "authenticated",
    "llm_external": "available",
    "llm_local": "available"
  }
}
```

---

## Integration Checklist

### Frontend → Backend Integration

- [ ] **Authentication Flow**
  - Frontend initiates OAuth via backend endpoints
  - Backend handles token storage securely
  - Frontend receives auth status

- [ ] **Sync Workflow**
  - Frontend triggers manual sync via `POST /sync/start`
  - Backend streams progress updates (WebSocket or polling)
  - Frontend receives transformed data, stores in IndexedDB

- [ ] **AI Queries**
  - Frontend sends query + accountId to `POST /ai/query`
  - Backend retrieves context (or frontend sends context)
  - Backend queries LLM (external → local fallback)
  - Frontend receives response with sources

- [ ] **Data Retrieval**
  - Frontend fetches accounts via `GET /accounts`
  - Frontend fetches documents via `GET /accounts/:id/documents`
  - Frontend stores in IndexedDB for offline access

---

## Decision Log

### Architecture Decisions
- **Fully local backend** ensures all customer data stays on SE laptop (security requirement)
- **Fastify framework** chosen for performance and modern async patterns
- **In-memory transformation** eliminates need for local database (simpler architecture)
- **OAuth token encryption** protects sensitive credentials at rest

### Data Processing Decisions
- **Markdown standardization** enables consistent querying and LLM context building
- **Document classification** via pattern matching (simple, effective for MVP)
- **Batch processing** for sync operations reduces API quota usage

### LLM Decisions
- **External LLM primary** for better accuracy and speed
- **Local Ollama fallback** ensures offline capability
- **Context size limit** (10 documents max) balances relevance with token limits

### Security Decisions
- **No external backend** eliminates cloud data exposure risk
- **Encrypted token storage** protects OAuth credentials
- **Local-only processing** ensures GDPR/compliance by design

---

## Next Steps

**Next Agent:** Kyra Gauge (QA & Validation)  
**Required Fields:** ✅ Endpoints defined, ✅ Entities specified, ✅ Auth/roles documented

---

**Filename:** `EkoLogic-CS720-20251004-154500.md`  
**Upload to:** `/data/outputs/`  
**Commit:** "Add Backend/API Spec for CS720"