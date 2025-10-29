/**
 * Shared constants for CS720 platform
 */

// ============================================================================
// Service Configuration
// ============================================================================

export const DEFAULT_PORTS = {
  FRONTEND: 3000,
  BACKEND: 3001,
  PROXY: 3002,
  AI_SERVICE: 3003,
  OLLAMA: 11434,
} as const;

export const SERVICE_NAMES = {
  FRONTEND: 'CS720 Frontend',
  BACKEND: 'CS720 Backend API',
  PROXY: 'CS720 CORS Proxy',
  AI_SERVICE: 'CS720 AI Service',
} as const;

export const API_VERSION = 'v1';

// ============================================================================
// API Endpoints
// ============================================================================

export const API_ROUTES = {
  // Health
  HEALTH: '/health',

  // Auth
  AUTH_STATUS: '/api/auth/status',
  AUTH_SALESFORCE: '/api/auth/salesforce/authorize',
  AUTH_SALESFORCE_CALLBACK: '/api/auth/salesforce/callback',
  AUTH_ONEDRIVE: '/api/auth/onedrive/authorize',
  AUTH_ONEDRIVE_CALLBACK: '/api/auth/onedrive/callback',

  // Sync
  SYNC_START: '/api/sync/start',
  SYNC_STATUS: '/api/sync/status/:jobId',
  SYNC_HISTORY: '/api/sync/history',
  SYNC_CANCEL: '/api/sync/cancel/:jobId',

  // Data
  ACCOUNTS: '/api/accounts',
  ACCOUNT_DOCUMENTS: '/api/accounts/:accountId/documents',
  ACCOUNT_DASHBOARD: '/api/accounts/:accountId/dashboard',
  DOCUMENT: '/api/documents/:documentId',
  SEARCH: '/api/search',

  // AI
  AI_QUERY: '/api/ai/query',
  AI_CHAT: '/api/ai/chat/:accountId',
  AI_HEALTH: '/api/ai/health',

  // BI
  BI_INSIGHTS: '/api/bi/insights',
  BI_INDUSTRIES: '/api/bi/industries',
  BI_REFRESH: '/api/bi/insights/refresh',

  // Config
  CONFIG_PREFERENCES: '/api/config/preferences',
  CONFIG_STATUS: '/api/config/status',
  CONFIG_RESET: '/api/config/preferences/reset',
} as const;

// ============================================================================
// Proxy Endpoints
// ============================================================================

export const PROXY_ROUTES = {
  PROXY: '/proxy',
  HEALTH: '/health',
  HEALTH_REMOTE: '/health/remote',
} as const;

// ============================================================================
// AI Service Endpoints
// ============================================================================

export const AI_SERVICE_ROUTES = {
  HEALTH: '/health',
  QUERY: '/query',
  CHAT: '/chat',
  CHAT_HISTORY: '/chat/:accountId',
  MODELS: '/models',
  CONFIG: '/config',
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULTS = {
  // LLM
  LLM_BACKEND: 'ollama' as const,
  LLM_MODEL: 'gemma3:4b-it-qat',
  LLM_TEMPERATURE: 0.7,
  LLM_MAX_TOKENS: 2048,

  // Sync
  SYNC_FREQUENCY: 'manual' as const,
  MAX_CHAT_HISTORY: 100,

  // UI
  THEME: 'dark' as const,
  DEFAULT_VIEW: 'dashboard' as const,

  // Search
  SEARCH_LIMIT: 20,
  MAX_DOCUMENTS_CONTEXT: 5,

  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 seconds
  HEALTH_CHECK_TIMEOUT: 5000, // 5 seconds
  HEALTH_CHECK_INTERVAL: 10000, // 10 seconds
} as const;

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',

  // Auth
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Sync
  SYNC_FAILED: 'SYNC_FAILED',
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',
  SYNC_CANCELLED: 'SYNC_CANCELLED',

  // LLM
  LLM_UNAVAILABLE: 'LLM_UNAVAILABLE',
  LLM_REQUEST_FAILED: 'LLM_REQUEST_FAILED',
  LLM_TIMEOUT: 'LLM_TIMEOUT',

  // Proxy
  PROXY_ERROR: 'PROXY_ERROR',
  PROXY_TIMEOUT: 'PROXY_TIMEOUT',

  // Service
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  SERVICE_TIMEOUT: 'SERVICE_TIMEOUT',
} as const;

// ============================================================================
// Status Messages
// ============================================================================

export const STATUS_MESSAGES = {
  SYNC_STARTED: 'Sync job started successfully',
  SYNC_COMPLETED: 'Sync job completed successfully',
  SYNC_FAILED: 'Sync job failed',
  SYNC_CANCELLED: 'Sync job cancelled',

  AUTH_SUCCESS: 'Authentication successful',
  AUTH_FAILED: 'Authentication failed',

  LLM_HEALTHY: 'LLM service is healthy',
  LLM_UNHEALTHY: 'LLM service is unavailable',

  SERVICE_HEALTHY: 'Service is healthy',
  SERVICE_UNHEALTHY: 'Service is unhealthy',
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  // Auth
  AUTH_TOKENS: 'cs720_auth_tokens',
  AUTH_STATUS: 'cs720_auth_status',

  // User Preferences
  USER_PREFERENCES: 'cs720_user_preferences',
  THEME: 'cs720_theme',

  // LLM Config
  LLM_BACKEND: 'cs720_llm_backend',
  LLM_MODEL: 'cs720_llm_model',
  OLLAMA_URL: 'cs720_ollama_url',
  OPENAI_ENDPOINT: 'cs720_openai_endpoint',
  OPENAI_API_KEY: 'cs720_openai_api_key',
  SYSTEM_PROMPT: 'cs720_system_prompt',

  // Cache
  ACCOUNTS_CACHE: 'cs720_accounts_cache',
  LAST_SYNC: 'cs720_last_sync',
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  OFFLINE_MODE: true,
  AI_ASSISTANT: true,
  BUSINESS_INTELLIGENCE: true,
  DOCUMENT_PROCESSING: true,
  WEB_SEARCH: false, // Not implemented in MVP
  REAL_TIME_SYNC: false, // Not implemented in MVP
  COLLABORATION: false, // Not implemented in MVP
} as const;

// ============================================================================
// System Prompts
// ============================================================================

export const DEFAULT_SYSTEM_PROMPT = `You are an AI assistant for CS720, a customer intelligence platform designed for Sales Engineers.

Your role is to help Sales Engineers quickly understand customer context by analyzing their:
- Account information
- Documents and files
- Current priorities
- Upcoming dates and deadlines
- Active projects
- Customer issues and tickets
- Industry insights

When answering questions:
1. Be concise and focused on the most relevant information
2. Cite specific documents or data sources when possible
3. Prioritize recent information over older data
4. If information is missing or unclear, acknowledge this
5. Use professional, technical language appropriate for Sales Engineers

Always aim to help the Sales Engineer understand the customer's top priorities, current challenges, and upcoming important dates.`;

// ============================================================================
// Document Types
// ============================================================================

export const DOCUMENT_TYPES = {
  PDF: 'pdf',
  DOCX: 'docx',
  TXT: 'txt',
  MARKDOWN: 'markdown',
  OTHER: 'other',
} as const;

export const DOCUMENT_TYPE_LABELS = {
  pdf: 'PDF Document',
  docx: 'Word Document',
  txt: 'Text File',
  markdown: 'Markdown File',
  other: 'Other',
} as const;

// ============================================================================
// CORS Configuration
// ============================================================================

export const CORS_CONFIG = {
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://10.42.156.59:3000',
    'http://10.42.156.59:5173',
  ],
  ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  ALLOWED_HEADERS: ['Content-Type', 'Authorization', 'Access-Control-Request-Private-Network'],
  MAX_AGE: 86400, // 24 hours
} as const;
