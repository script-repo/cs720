/**
 * CS720 CORS Proxy Server
 *
 * Standalone service that forwards requests from the browser to OpenAI-compatible
 * endpoints, bypassing CORS restrictions.
 *
 * Port: 3002 (configurable via PORT env variable)
 */

import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import { CORS_CONFIG, DEFAULT_PORTS, PROXY_ROUTES } from '@cs720/shared';

const app = express();
const PORT = process.env.PORT || DEFAULT_PORTS.PROXY;
const NODE_ENV = process.env.NODE_ENV || 'development';

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

function createTimeoutSignal(timeoutMs: number) {
  if (typeof AbortController === 'function') {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      cancel: () => clearTimeout(timeout),
    };
  }

  return {
    signal: undefined,
    cancel: () => {},
  };
}

// Allow private network requests (Chrome Private Network Access)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  next();
});

// Enable CORS (including preflight)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Types
// ============================================================================

interface ProxyRequestBody {
  endpoint: string;
  apiKey: string;
  body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    [key: string]: unknown;
  };
}

interface HealthCheckRequestBody {
  endpoint: string;
  apiKey: string;
  model?: string;
}

// ============================================================================
// Routes
// ============================================================================

/**
 * Main proxy endpoint
 * POST /proxy
 */
app.post(PROXY_ROUTES.PROXY, async (req: Request, res: Response) => {
  const { endpoint, apiKey, body } = req.body as ProxyRequestBody;

  // Validation
  if (!endpoint || !apiKey || !body) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Missing required fields: endpoint, apiKey, or body',
        code: 'VALIDATION_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }

  console.log(`📡 Proxying request to: ${endpoint}/chat/completions`);
  console.log(`🤖 Model: ${body.model}`);
  console.log(`🌊 Stream: ${body.stream || false}`);

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`📥 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${errorText}`);
      return res.status(response.status).json({
        success: false,
        error: {
          message: `API returned status ${response.status}`,
          code: 'PROXY_ERROR',
          details: errorText,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Handle streaming response
    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();

      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            res.end();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (streamError) {
        console.error('❌ Streaming error:', streamError);
        res.end();
      }
    } else {
      // Handle non-streaming response
      const data = await response.json();
      res.json(data);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Proxy error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Proxy server error',
        code: 'PROXY_ERROR',
        details: errorMessage,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Proxy server health check
 * GET /health
 */
app.get(PROXY_ROUTES.HEALTH, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'CS720 CORS Proxy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * Remote endpoint health check
 * POST /health/remote
 */
app.post(PROXY_ROUTES.HEALTH_REMOTE, async (req: Request, res: Response) => {
  const { endpoint, apiKey, model } = req.body as HealthCheckRequestBody;

  if (!endpoint || !apiKey) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Missing required fields: endpoint or apiKey',
        code: 'VALIDATION_ERROR',
      },
      timestamp: new Date().toISOString(),
    });
  }

  console.log(`🔍 Checking health of remote endpoint: ${endpoint}`);

  const startTime = Date.now();

  try {
    // Always test actual chat completion with the configured model
    // This ensures we catch model-specific errors like NAI-10021
    console.log(`🔍 Testing chat completion with model: ${model || 'gpt-3.5-turbo'}`);
    const timeout = createTimeoutSignal(5000);
    let response;
    try {
      response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
          stream: false,
        }),
        signal: timeout.signal,
      });
    } finally {
      timeout.cancel();
    }

    const latency = Date.now() - startTime;

    if (response.ok) {
      console.log(`✅ Remote endpoint healthy (via chat completion) - ${latency}ms`);
      return res.json({
        success: true,
        data: {
          status: 'available',
          message: 'Remote endpoint is reachable',
          latency,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      const errorText = await response.text();
      console.log(`❌ Remote endpoint unhealthy: ${response.status} - ${errorText}`);

      // Check if this is a NAI-10021 error (endpoint available but not responding correctly)
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = null;
      }

      const isNAIError = errorDetails && errorDetails.errCode === 'NAI-10021';

      return res.json({
        success: true,
        data: {
          status: isNAIError ? 'degraded' : 'unavailable',
          message: isNAIError
            ? `NAI endpoint available but not responding correctly: ${errorDetails.errMsg || 'Failed to process chat completion request'}`
            : `Endpoint returned status ${response.status}`,
          errorCode: isNAIError ? errorDetails.errCode : undefined,
          errorDetails: isNAIError ? errorDetails.errMsg : undefined,
          latency,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: unknown) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log(`❌ Remote endpoint error: ${errorMessage}`);
    return res.json({
      success: true,
      data: {
        status: 'unavailable',
        message: errorMessage,
        latency,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
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

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: unknown) => {
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
  console.log('🚀 CS720 CORS Proxy Server');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`📡 Proxy: http://localhost:${PORT}${PROXY_ROUTES.PROXY}`);
  console.log(`💚 Health: http://localhost:${PORT}${PROXY_ROUTES.HEALTH}`);
  console.log(`🔍 Remote Health: http://localhost:${PORT}${PROXY_ROUTES.HEALTH_REMOTE}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log('='.repeat(60));
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  process.exit(0);
});
