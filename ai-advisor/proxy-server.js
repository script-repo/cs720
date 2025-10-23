/**
 * CORS Proxy Server for OpenAI-compatible APIs
 *
 * This simple proxy server forwards requests from the browser to OpenAI-compatible
 * endpoints, bypassing CORS restrictions.
 *
 * Usage: node proxy-server.js
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS for all origins (restrict this in production)
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Proxy endpoint
app.post('/proxy', async (req, res) => {
  const { endpoint, apiKey, body } = req.body;

  if (!endpoint || !apiKey || !body) {
    return res.status(400).json({
      error: 'Missing required fields: endpoint, apiKey, or body'
    });
  }

  console.log(`Proxying request to: ${endpoint}/chat/completions`);
  console.log(`Model: ${body.model}`);
  console.log(`Stream: ${body.stream}`);

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${errorText}`);
      return res.status(response.status).json({
        error: `API returned status ${response.status}`,
        details: errorText
      });
    }

    // Check if streaming
    if (body.stream) {
      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Pipe the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            res.end();
            break;
          }

          // Decode and forward the chunk
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.end();
      }
    } else {
      // Non-streaming response
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy server error',
      message: error.message
    });
  }
});

// Health check endpoint (for proxy server itself)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Proxy server is running' });
});

// Remote endpoint health check
app.post('/health/remote', async (req, res) => {
  const { endpoint, apiKey, model } = req.body;

  if (!endpoint || !apiKey) {
    return res.status(400).json({
      error: 'Missing required fields: endpoint or apiKey'
    });
  }

  try {
    // Try /models first (some endpoints support this)
    let response = await fetch(`${endpoint}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(3000)
    });

    // If /models works, endpoint is available
    if (response.ok) {
      console.log('Remote endpoint health check: /models endpoint OK');
      return res.json({ status: 'available', message: 'Remote endpoint is reachable' });
    }

    // If /models failed, try a minimal chat completion request
    console.log('/models endpoint not supported, trying chat completion...');
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
        stream: false
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      console.log('Remote endpoint health check: chat/completions endpoint OK');
      res.json({ status: 'available', message: 'Remote endpoint is reachable' });
    } else {
      const errorText = await response.text();
      console.log(`Remote endpoint health check failed: ${response.status} - ${errorText}`);
      res.json({ status: 'unavailable', message: `Endpoint returned status ${response.status}` });
    }
  } catch (error) {
    console.log(`Remote endpoint health check error: ${error.message}`);
    res.json({ status: 'unavailable', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxy endpoint: http://localhost:${PORT}/proxy`);
  console.log(`💚 Health check: http://localhost:${PORT}/health\n`);
});
