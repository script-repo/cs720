# CS720 CORS Proxy Service

Standalone CORS proxy server that forwards requests from the browser to OpenAI-compatible endpoints, bypassing CORS restrictions.

## Features

- **CORS Bypass**: Enables browser-based applications to communicate with OpenAI-compatible APIs
- **Streaming Support**: Handles both streaming and non-streaming responses
- **Health Checks**: Monitor both proxy server and remote endpoint health
- **Request Logging**: Detailed logging for debugging
- **Error Handling**: Comprehensive error handling with detailed error messages

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3002
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## API Endpoints

### POST /proxy

Forward requests to OpenAI-compatible endpoints.

**Request:**
```json
{
  "endpoint": "https://api.openai.com/v1",
  "apiKey": "your-api-key",
  "body": {
    "model": "gpt-4",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ],
    "stream": true,
    "temperature": 0.7,
    "max_tokens": 2048
  }
}
```

**Response:**
- Streaming: Server-sent events (text/event-stream)
- Non-streaming: JSON response

### GET /health

Check proxy server health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "CS720 CORS Proxy",
    "version": "1.0.0",
    "uptime": 12345,
    "timestamp": "2025-10-23T18:00:00.000Z"
  }
}
```

### POST /health/remote

Check remote endpoint health.

**Request:**
```json
{
  "endpoint": "https://api.openai.com/v1",
  "apiKey": "your-api-key",
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "available",
    "message": "Remote endpoint is reachable",
    "latency": 123
  }
}
```

## Architecture

This service is part of the CS720 modular architecture:

```
Browser → Proxy (Port 3002) → Remote API
```

## Dependencies

- **express**: Web framework
- **cors**: CORS middleware
- **@cs720/shared**: Shared types and constants

## License

Internal Use Only - Proprietary
