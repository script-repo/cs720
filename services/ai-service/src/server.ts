/**
 * CS720 AI Service
 *
 * Standalone service for AI chat capabilities
 * Supports multiple LLM backends: Ollama (local) and OpenAI-compatible (via proxy)
 *
 * Port: 3003 (configurable via PORT env variable)
 */

import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import {
  CORS_CONFIG,
  DEFAULT_PORTS,
  AI_SERVICE_ROUTES,
  ChatMessage,
  LLMBackend,
  LLMConfig,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULTS,
} from '@cs720/shared';
import { OllamaClient } from './clients/ollama';
import { ProxyClient } from './clients/proxy';

const app = express();
const PORT = process.env.PORT || DEFAULT_PORTS.AI_SERVICE;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// Clients
// ============================================================================

const ollamaClient = new OllamaClient(
  process.env.OLLAMA_URL || `http://localhost:${DEFAULT_PORTS.OLLAMA}`
);

const proxyClient = new ProxyClient(
  process.env.PROXY_URL || `http://localhost:${DEFAULT_PORTS.PROXY}`
);

// ============================================================================
// Middleware
// ============================================================================

const ALLOWED_ORIGINS = new Set<string>([...CORS_CONFIG.ALLOWED_ORIGINS]);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: [...CORS_CONFIG.ALLOWED_METHODS],
  allowedHeaders: [...CORS_CONFIG.ALLOWED_HEADERS],
  credentials: true,
  maxAge: CORS_CONFIG.MAX_AGE,
  optionsSuccessStatus: 204,
};

// Allow Chrome Private Network Access preflight
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Types
// ============================================================================

interface QueryRequest {
  messages: ChatMessage[];
  config?: Partial<LLMConfig>;
  stream?: boolean;
}

interface ChatRequest {
  message: string;
  accountId?: string;
  context?: any;
  stream?: boolean;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * Health check
 * GET /health
 */
app.get(AI_SERVICE_ROUTES.HEALTH, async (req: Request, res: Response) => {
  const ollamaHealth = await ollamaClient.checkHealth();
  const proxyHealth = await proxyClient.checkHealth();

  const isHealthy = ollamaHealth.available || proxyHealth.available;

  res.json({
    success: true,
    data: {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'CS720 AI Service',
      version: '1.0.0',
      uptime: process.uptime(),
      backends: {
        ollama: ollamaHealth,
        proxy: proxyHealth,
      },
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Query AI with messages
 * POST /query
 */
app.post(AI_SERVICE_ROUTES.QUERY, async (req: Request, res: Response) => {
  const { messages, config, stream = false } = req.body as QueryRequest;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Messages array is required',
        code: 'VALIDATION_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }

  const llmConfig: LLMConfig = {
    backend: (config?.backend || process.env.PREFERRED_BACKEND || 'ollama') as LLMBackend,
    model: config?.model || process.env.OLLAMA_MODEL || DEFAULTS.LLM_MODEL,
    temperature: config?.temperature || DEFAULTS.LLM_TEMPERATURE,
    maxTokens: config?.maxTokens || DEFAULTS.LLM_MAX_TOKENS,
    systemPrompt: config?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
  };

  console.log(`🤖 Query request - Backend: ${llmConfig.backend}, Model: ${llmConfig.model}`);

  try {
    let response: string;

    // Try primary backend
    if (llmConfig.backend === 'ollama') {
      const ollamaHealth = await ollamaClient.checkHealth();
      if (ollamaHealth.available) {
        response = await ollamaClient.chat(messages, llmConfig, stream);
      } else {
        // Fallback to proxy
        console.log('⚠️  Ollama unavailable, falling back to proxy');
        response = await proxyClient.chat(messages, llmConfig, stream);
      }
    } else {
      const proxyHealth = await proxyClient.checkHealth();
      if (proxyHealth.available) {
        response = await proxyClient.chat(messages, llmConfig, stream);
      } else {
        // Fallback to Ollama
        console.log('⚠️  Proxy unavailable, falling back to Ollama');
        response = await ollamaClient.chat(messages, llmConfig, stream);
      }
    }

    if (stream) {
      // Streaming is handled by the client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(response);
      res.end();
    } else {
      res.json({
        success: true,
        data: {
          answer: response,
          model: llmConfig.model,
          backend: llmConfig.backend,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Query error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'AI query failed',
        code: 'LLM_REQUEST_FAILED',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Simple chat endpoint
 * POST /chat
 */
app.post(AI_SERVICE_ROUTES.CHAT, async (req: Request, res: Response) => {
  const { message, accountId, context, stream = false } = req.body as ChatRequest;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Message is required',
        code: 'VALIDATION_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }

  const messages: ChatMessage[] = [
    {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      accountId,
    },
  ];

  // Add context to the message if provided
  if (context) {
    messages[0].content = `Context: ${JSON.stringify(context, null, 2)}\n\nQuestion: ${message}`;
  }

  const config: LLMConfig = {
    backend: (process.env.PREFERRED_BACKEND || 'ollama') as LLMBackend,
    model: process.env.OLLAMA_MODEL || DEFAULTS.LLM_MODEL,
    temperature: DEFAULTS.LLM_TEMPERATURE,
    maxTokens: DEFAULTS.LLM_MAX_TOKENS,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  };

  try {
    let response: string;

    if (config.backend === 'ollama') {
      response = await ollamaClient.chat(messages, config, stream);
    } else {
      response = await proxyClient.chat(messages, config, stream);
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(response);
      res.end();
    } else {
      res.json({
        success: true,
        data: {
          answer: response,
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Chat failed',
        code: 'LLM_REQUEST_FAILED',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get available models
 * GET /models
 */
app.get(AI_SERVICE_ROUTES.MODELS, async (req: Request, res: Response) => {
  try {
    const models = await ollamaClient.listModels();
    res.json({
      success: true,
      data: models,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Failed to fetch models:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch models',
        code: 'LLM_ERROR',
        details: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Get/Update AI configuration
 * GET/PUT /config
 */
app.get(AI_SERVICE_ROUTES.CONFIG, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      preferredBackend: process.env.PREFERRED_BACKEND || 'ollama',
      ollamaUrl: process.env.OLLAMA_URL || `http://localhost:${DEFAULT_PORTS.OLLAMA}`,
      ollamaModel: process.env.OLLAMA_MODEL || DEFAULTS.LLM_MODEL,
      proxyUrl: process.env.PROXY_URL || `http://localhost:${DEFAULT_PORTS.PROXY}`,
      defaultTemperature: DEFAULTS.LLM_TEMPERATURE,
      defaultMaxTokens: DEFAULTS.LLM_MAX_TOKENS,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
    },
    timestamp: new Date().toISOString(),
  });
});

app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: NODE_ENV === 'development' ? err.message : undefined,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Server Startup
// ============================================================================

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🤖 CS720 AI Service');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`💬 Query: http://localhost:${PORT}${AI_SERVICE_ROUTES.QUERY}`);
  console.log(`🗨️  Chat: http://localhost:${PORT}${AI_SERVICE_ROUTES.CHAT}`);
  console.log(`💚 Health: http://localhost:${PORT}${AI_SERVICE_ROUTES.HEALTH}`);
  console.log(`🔧 Models: http://localhost:${PORT}${AI_SERVICE_ROUTES.MODELS}`);
  console.log(`⚙️  Config: http://localhost:${PORT}${AI_SERVICE_ROUTES.CONFIG}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log('='.repeat(60));
  console.log('');
});

process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  process.exit(0);
});
