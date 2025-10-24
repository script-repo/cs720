// Core data types for CS720 backend

export interface Account {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'at-risk' | 'churned';
  siteCount: number;
  lastModified: string;
  salesforceId: string;
}

export interface Document {
  id: string;
  accountId: string;
  title: string;
  content: string;
  type: 'meeting-notes' | 'technical-doc' | 'sales-note' | 'contract' | 'other';
  source: 'salesforce' | 'onedrive';
  sourceId: string;
  lastModified: string;
  url?: string;
}

export interface Priority {
  id: string;
  accountId: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'completed';
  dueDate?: string;
  extractedFrom: string[]; // Document IDs
}

export interface UpcomingDate {
  id: string;
  accountId: string;
  title: string;
  date: string;
  type: 'renewal' | 'qbr' | 'milestone' | 'meeting' | 'other';
  description?: string;
  salesforceId?: string;
}

export interface Project {
  id: string;
  accountId: string;
  name: string;
  status: 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  progress: number; // 0-100
  startDate: string;
  dueDate?: string;
  teamMembers: string[];
  milestones: Milestone[];
  risks: Risk[];
  notes?: string;
  extractedFrom: string[]; // Document IDs
}

export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  description?: string;
}

export interface Risk {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'mitigated' | 'closed';
  description?: string;
}

export interface CustomerIssue {
  id: string;
  accountId: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdDate: string;
  resolvedDate?: string;
  assignee?: string;
  salesforceId?: string;
}

export interface Ticket {
  id: string;
  accountId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed';
  createdDate: string;
  resolvedDate?: string;
  assignee?: string;
  salesforceId?: string;
}

export interface IndustryIntelligence {
  id: string;
  accountId: string;
  industry: string;
  insights: string[];
  trends: string[];
  lastUpdated: string;
  source: string;
}

export interface ChatMessage {
  id: string;
  accountId: string;
  query: string;
  response: string;
  sources: string[]; // Document IDs that informed the response
  timestamp: string;
  model: string; // 'external' | 'local'
  metadata: {
    responseTime: number;
    confidence?: number;
  };
}

export interface SyncJob {
  id: string;
  type: 'manual' | 'scheduled';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  progress: {
    salesforce: {
      total: number;
      processed: number;
      status: 'pending' | 'in-progress' | 'completed' | 'failed';
    };
    onedrive: {
      total: number;
      processed: number;
      status: 'pending' | 'in-progress' | 'completed' | 'failed';
    };
    businessIntelligence: {
      total: number;
      processed: number;
      status: 'pending' | 'in-progress' | 'completed' | 'failed';
    };
  };
  accountsProcessed: string[];
  errors: SyncError[];
}

export interface SyncError {
  type: 'auth-failed' | 'network-error' | 'parse-error' | 'quota-exceeded' | 'unknown';
  message: string;
  accountId?: string;
  documentId?: string;
  timestamp: string;
}

export interface AuthTokens {
  salesforce?: {
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
    expiresAt: number;
  };
  microsoft?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

export interface UserPreferences {
  sync: {
    frequency: 'manual' | 'daily' | 'hourly';
    accountScope: 'all' | 'selected';
    selectedAccounts?: string[];
  };
  ai: {
    preferredModel: 'ollama' | 'openai';
    maxTokens: number;
    naiBaseUrl?: string;
    naiApiKey?: string;
    naiModel?: string;
    perplexityApiKey?: string;
    perplexityModel?: string;
    systemPrompt?: string;
  };
  ui: {
    theme: 'dark' | 'light';
    sidebarCollapsed: boolean;
  };
}

// API Request/Response types
export interface SyncStartRequest {
  type: 'manual' | 'scheduled';
  scope?: {
    sources?: ('salesforce' | 'onedrive' | 'bi')[];
    accountIds?: string[];
  };
}

export interface AIQueryRequest {
  accountId: string;
  query: string;
  conversationId?: string;
}

export interface AIQueryResponse {
  id: string;
  content: string;
  sources: string[];
  metadata: {
    model: string;
    responseTime: number;
    endpoint: 'external' | 'local';
    confidence?: number;
  };
}

export interface DashboardData {
  accountId: string;
  priorities: Priority[];
  upcomingDates: UpcomingDate[];
  projects: Project[];
  customerIssues: CustomerIssue[];
  tickets: Ticket[];
  industryIntelligence: IndustryIntelligence[];
  lastSyncTime: string;
}