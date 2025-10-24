# CS720 AI Service

Standalone AI chat service supporting multiple LLM backends (Ollama and OpenAI-compatible APIs).

## Features

- **Multiple LLM Backends**: Ollama (local) and OpenAI-compatible (via proxy)
- **Automatic Failover**: Falls back to alternate backend if primary is unavailable
- **Streaming Support**: Real-time response streaming
- **Health Monitoring**: Check availability of all backends
- **Configurable**: Flexible configuration via environment variables

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3003
PREFERRED_BACKEND=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
PROXY_URL=http://localhost:3002
OPENAI_ENDPOINT=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
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

### GET /health

Check AI service and backend health.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "CS720 AI Service",
    "version": "1.0.0",
    "uptime": 12345,
    "backends": {
      "ollama": {
        "backend": "ollama",
        "available": true,
        "latency": 50
      },
      "proxy": {
        "backend": "proxy",
        "available": true,
        "latency": 120
      }
    }
  }
}
```

### POST /query

Query AI with a conversation history.

**Request:**
```json
{
  "messages": [
    {
      "id": "1",
      "role": "user",
      "content": "What are the customer's top priorities?",
      "timestamp": "2025-10-23T18:00:00.000Z"
    }
  ],
  "config": {
    "backend": "ollama",
    "model": "llama2",
    "temperature": 0.7,
    "maxTokens": 2048,
    "systemPrompt": "You are an AI assistant..."
  },
  "stream": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Based on the available information...",
    "model": "llama2",
    "backend": "ollama",
    "timestamp": "2025-10-23T18:00:01.000Z"
  }
}
```

### POST /chat

Simple chat endpoint.

**Request:**
```json
{
  "message": "What are the customer's top priorities?",
  "accountId": "acc_123",
  "context": {
    "priorities": [...],
    "documents": [...]
  },
  "stream": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Based on the available information...",
    "timestamp": "2025-10-23T18:00:01.000Z"
  }
}
```

### GET /models

List available Ollama models.

**Response:**
```json
{
  "success": true,
  "data": ["llama2", "gemma3:270m", "mistral"],
  "timestamp": "2025-10-23T18:00:00.000Z"
}
```

### GET /config

Get AI service configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "preferredBackend": "ollama",
    "ollamaUrl": "http://localhost:11434",
    "ollamaModel": "llama2",
    "proxyUrl": "http://localhost:3002",
    "defaultTemperature": 0.7,
    "defaultMaxTokens": 2048
  }
}
```

## Architecture

This service is part of the CS720 modular architecture:

```
Frontend → AI Service (Port 3003) → {
  Ollama (Port 11434) [Local LLM]
  Proxy (Port 3002) → Remote API
}
```

## Dependencies

- **express**: Web framework
- **cors**: CORS middleware
- **@cs720/shared**: Shared types and constants

## License

Internal Use Only - Proprietary
