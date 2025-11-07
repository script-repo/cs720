// Frontend types for CS720 - mirrors backend types with client-specific additions

export interface Account {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'at-risk' | 'churned';
  siteCount: number;
  lastModified: string;
  salesforceId: string;
  lastSyncTime?: string;
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
  summary?: string;
  keywords?: string[];
  mentions?: string[];
  readingTime?: number;
}

export interface Priority {
  id: string;
  accountId: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'completed';
  dueDate?: string;
  extractedFrom: string[];
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
  progress: number;
  startDate: string;
  dueDate?: string;
  teamMembers: string[];
  milestones: Milestone[];
  risks: Risk[];
  notes?: string;
  extractedFrom: string[];
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
  sources: string[];
  timestamp: string;
  model: string;
  metadata: {
    responseTime: number;
    confidence?: number;
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  command: string; // e.g., "/company-overview"
  prompt: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncJob {
  id: string;
  type: 'manual' | 'scheduled';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  progress: {
    salesforce: SyncProgress;
    onedrive: SyncProgress;
    businessIntelligence: SyncProgress;
  };
  accountsProcessed: string[];
  errors: SyncError[];
}

export interface SyncProgress {
  total: number;
  processed: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
}

export interface SyncError {
  type: 'auth-failed' | 'network-error' | 'parse-error' | 'quota-exceeded' | 'unknown';
  message: string;
  accountId?: string;
  documentId?: string;
  timestamp: string;
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
  stats?: {
    clusters: number;
    nodes: number;
    vms: number;
    storageContainers: number;
    cases: number;
    licenses: number;
  };
  clusters?: Cluster[];
  utilization?: unknown[];
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

// UI-specific types
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface AppState {
  isOnline: boolean;
  currentAccount: Account | null;
  sidebarCollapsed: boolean;
  showMobileMenu: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Search types
export interface SearchResult {
  id: string;
  accountId: string;
  title: string;
  type: string;
  source: string;
  snippet: string;
  lastModified: string;
  relevance: number;
}

export interface SearchQuery {
  query: string;
  accountId?: string;
  type?: string;
  limit?: number;
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

// Component prop types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children: React.ReactNode;
}

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  error?: string;
}

export interface BadgeProps {
  variant: 'status' | 'priority' | 'severity' | 'type';
  value: string;
  size?: 'sm' | 'md';
  className?: string;
}