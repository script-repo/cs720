/**
 * Shared types for CS720 platform
 * Used across all services (frontend, backend, ai-service, proxy)
 */

// ============================================================================
// Service Configuration
// ============================================================================

export interface ServiceConfig {
  name: string;
  port: number;
  host: string;
  version: string;
}

export interface ServicesConfig {
  frontend: ServiceConfig;
  backend: ServiceConfig;
  proxy: ServiceConfig;
  aiService: ServiceConfig;
}

// ============================================================================
// Account & Customer Data
// ============================================================================

export interface Account {
  id: string;
  name: string;
  industry?: string;
  salesforceId?: string;
  lastSyncDate?: string;
  status?: 'active' | 'inactive' | 'archived';
  owner?: string;
  revenue?: number;
  employees?: number;
}

export interface Document {
  id: string;
  accountId: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'markdown' | 'other';
  source: 'salesforce' | 'onedrive' | 'manual';
  sourceId?: string;
  content?: string;
  summary?: string;
  uploadDate: string;
  lastModified?: string;
  size?: number;
  url?: string;
}

export interface Priority {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  status?: 'open' | 'in_progress' | 'completed';
  createdDate: string;
}

export interface UpcomingDate {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  date: string;
  type: 'meeting' | 'deadline' | 'renewal' | 'milestone' | 'other';
  createdDate: string;
}

export interface Project {
  id: string;
  accountId: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  progress?: number;
  createdDate: string;
}

export interface CustomerIssue {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reportedDate: string;
  resolvedDate?: string;
}

export interface Ticket {
  id: string;
  accountId: string;
  ticketNumber: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  createdDate: string;
  resolvedDate?: string;
  assignee?: string;
}

// ============================================================================
// Dashboard Data
// ============================================================================

export interface DashboardData {
  account: Account;
  priorities: Priority[];
  upcomingDates: UpcomingDate[];
  projects: Project[];
  customerIssues: CustomerIssue[];
  tickets: Ticket[];
  documents: Document[];
  insights?: BusinessIntelligence[];
}

// ============================================================================
// Business Intelligence
// ============================================================================

export interface BusinessIntelligence {
  id: string;
  industry: string;
  title: string;
  summary: string;
  source: string;
  publishedDate: string;
  url?: string;
  relevanceScore?: number;
}

// ============================================================================
// Sync & Data Synchronization
// ============================================================================

export type SyncStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface SyncJob {
  id: string;
  status: SyncStatus;
  startTime: string;
  endTime?: string;
  progress: number;
  totalSteps: number;
  currentStep: number;
  currentStepName?: string;
  errors?: SyncError[];
  results?: SyncResults;
}

export interface SyncError {
  step: string;
  message: string;
  timestamp: string;
  details?: any;
}

export interface SyncResults {
  accountsProcessed: number;
  documentsProcessed: number;
  salesforceRecords?: number;
  onedriveFiles?: number;
  biInsights?: number;
  errors: number;
}

export interface SyncProgress {
  jobId: string;
  status: SyncStatus;
  progress: number;
  message: string;
  step?: string;
}

// ============================================================================
// Authentication
// ============================================================================

export interface AuthStatus {
  salesforce: {
    connected: boolean;
    email?: string;
    instanceUrl?: string;
    lastSync?: string;
  };
  microsoft: {
    connected: boolean;
    email?: string;
    lastSync?: string;
  };
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

// ============================================================================
// AI & Chat
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  accountId?: string;
}

export interface ChatHistory {
  accountId: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

export interface AIQueryRequest {
  query: string;
  accountId?: string;
  context?: {
    includeDocuments?: boolean;
    includePriorities?: boolean;
    includeProjects?: boolean;
    maxDocuments?: number;
  };
  chatHistory?: ChatMessage[];
}

export interface AIQueryResponse {
  answer: string;
  sources?: string[];
  confidence?: number;
  timestamp: string;
  model?: string;
  tokensUsed?: number;
}

export type LLMBackend = 'ollama' | 'openai' | 'proxy';

export interface LLMConfig {
  backend: LLMBackend;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMHealthStatus {
  backend: LLMBackend;
  available: boolean;
  latency?: number;
  model?: string;
  error?: string;
}

// ============================================================================
// Proxy Service
// ============================================================================

export interface ProxyRequest {
  endpoint: string;
  apiKey: string;
  body: {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
  };
}

export interface ProxyHealthCheck {
  endpoint: string;
  apiKey: string;
  model?: string;
}

export interface ProxyHealthResponse {
  status: 'available' | 'unavailable';
  message: string;
  latency?: number;
}

// ============================================================================
// User Preferences & Configuration
// ============================================================================

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  defaultView?: 'dashboard' | 'accounts' | 'sync';
  syncFrequency?: 'manual' | 'hourly' | 'daily' | 'weekly';
  notifications?: {
    syncComplete?: boolean;
    syncErrors?: boolean;
    newInsights?: boolean;
  };
  ai?: {
    preferredBackend?: LLMBackend;
    defaultModel?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface AppConfig {
  services: ServicesConfig;
  features?: {
    offlineMode?: boolean;
    aiAssistant?: boolean;
    businessIntelligence?: boolean;
    documentProcessing?: boolean;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  timestamp: string;
}

// ============================================================================
// Search
// ============================================================================

export interface SearchQuery {
  query: string;
  accountId?: string;
  documentTypes?: Document['type'][];
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export interface SearchResult {
  documentId: string;
  accountId: string;
  documentName: string;
  snippet: string;
  relevance: number;
  highlights?: string[];
}

// ============================================================================
// Error Types
// ============================================================================

export interface ServiceError {
  service: 'frontend' | 'backend' | 'proxy' | 'ai-service';
  code: string;
  message: string;
  timestamp: string;
  details?: any;
  stack?: string;
}

// ============================================================================
// Health & Status
// ============================================================================

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  timestamp: string;
  checks?: {
    database?: boolean;
    llm?: boolean;
    externalApis?: boolean;
  };
}

export interface SystemStatus {
  services: {
    frontend: ServiceHealth;
    backend: ServiceHealth;
    proxy: ServiceHealth;
    aiService: ServiceHealth;
  };
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}
