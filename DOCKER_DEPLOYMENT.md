# CS720 Docker Compose Deployment Guide

## Quick Start with Docker Compose

This guide shows how to deploy the CS720 stack using the published container images.

### Prerequisites

- Docker Engine 20.10+ and Docker Compose v2+
- At least 8GB of available RAM (for Ollama LLM service)
- 20GB of free disk space (for Ollama models)

### Step 1: Pull and Start All Services

```bash
# Pull the latest images
docker-compose pull

# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

Expected output - all services should show "Up (healthy)":
```
NAME                STATUS          PORTS
cs720-backend       Up (healthy)    0.0.0.0:3001->3001/tcp
cs720-proxy         Up (healthy)    0.0.0.0:3002->3002/tcp
cs720-ollama        Up              0.0.0.0:11434->11434/tcp
cs720-ai-service    Up (healthy)    0.0.0.0:3003->3003/tcp
cs720-frontend      Up (healthy)    0.0.0.0:3000->3000/tcp
cs720-postgres      Up (healthy)    0.0.0.0:5432->5432/tcp
```

### Step 2: Setup Ollama with a Model

The Ollama service needs at least one model downloaded before it can process requests:

```bash
# Run the setup script (downloads llama2 by default)
./scripts/setup-ollama.sh

# Or manually download a specific model
docker exec cs720-ollama ollama pull llama2

# List available models
docker exec cs720-ollama ollama list
```

Popular models:
- **llama2** (default) - Good general-purpose model (~3.8GB)
- **llama2:13b** - Larger, more capable variant (~7.4GB)
- **codellama** - Optimized for code generation (~3.8GB)
- **mistral** - Fast and capable (~4.1GB)
- **phi** - Small and fast (~1.6GB)

### Step 3: Verify All Services

Run health checks on all services:

```bash
# Backend
curl http://localhost:3001/api/health
# Expected: {"success":true,"data":{"status":"healthy",...}}

# Proxy
curl http://localhost:3002/health
# Expected: {"success":true,"data":{"status":"healthy",...}}

# AI Service
curl http://localhost:3003/health
# Expected: {"success":true,"data":{"status":"healthy",...}}

# Frontend
curl http://localhost:3000
# Expected: HTML content (Next.js app)
```

### Step 4: Access the Application

Open your browser and navigate to:

**http://localhost:3000**

## Service Ports

| Service | Port | Health Check |
|---------|------|--------------|
| Frontend | 3000 | `http://localhost:3000` |
| Backend | 3001 | `http://localhost:3001/api/health` |
| Proxy | 3002 | `http://localhost:3002/health` |
| AI Service | 3003 | `http://localhost:3003/health` |
| Ollama | 11434 | `http://localhost:11434/api/tags` |
| PostgreSQL | 5432 | `pg_isready -h localhost -U cs720` |

## Environment Variables

### AI Service Configuration

Edit `docker-compose.yml` to customize the AI service:

```yaml
ai-service:
  environment:
    OLLAMA_URL: http://ollama:11434      # Ollama service URL
    OLLAMA_MODEL: llama2                  # Default model to use
    PROXY_URL: http://proxy:3002          # Proxy service URL
    PREFERRED_BACKEND: ollama             # Primary backend: "ollama" or "proxy"
```

### Backend Configuration

```yaml
backend:
  environment:
    DATABASE_URL: postgresql://cs720:cs720_dev_password@postgres:5432/cs720
    JWT_SECRET: your-secret-key-change-in-production  # CHANGE IN PRODUCTION!
```

## Troubleshooting

### AI Service Crashes or Won't Start

**Symptom:** `cs720-ai-service` shows "Restarting" or "Exited"

**Solution:**
1. Check logs: `docker logs cs720-ai-service`
2. Ensure Ollama is running: `docker ps | grep ollama`
3. Verify Ollama has a model: `docker exec cs720-ollama ollama list`
4. Pull a model if none exist: `docker exec cs720-ollama ollama pull llama2`

### Frontend Shows "Connection Reset by Peer"

**Symptom:** `curl http://localhost:3000` returns connection reset

**Cause:** Frontend depends on AI service being healthy

**Solution:**
1. Fix AI service first (see above)
2. Restart frontend: `docker-compose restart frontend`
3. Check frontend logs: `docker logs cs720-frontend`

### Ollama Out of Memory

**Symptom:** Ollama crashes or is very slow

**Solution:**
1. Use a smaller model like `phi` instead of `llama2:13b`
2. Increase Docker memory limit (Docker Desktop → Settings → Resources)
3. Ensure at least 8GB RAM available for Docker

### Port Conflicts

**Symptom:** "port is already allocated" error

**Solution:**
Edit `docker-compose.yml` to change port mappings:
```yaml
services:
  frontend:
    ports:
      - "8080:3000"  # Change host port (left side) only
```

## Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

## Updating Images

```bash
# Pull latest images
docker-compose pull

# Recreate containers with new images
docker-compose up -d --force-recreate
```

## Production Deployment Notes

For production deployments:

1. **Change default credentials** in `docker-compose.yml`:
   - PostgreSQL password
   - JWT secret
   - Any API keys

2. **Use proper secrets management** (Docker secrets, Kubernetes secrets, etc.)

3. **Configure proper networking** (reverse proxy, TLS/SSL)

4. **Set up monitoring and logging**

5. **Configure resource limits** for each service

6. **Use specific image tags** instead of `:latest` for reproducible deployments

## Architecture Overview

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Frontend   │ :3000 (Next.js)
└──────┬──────┘
       │
       ├──────→ ┌─────────────┐
       │        │   Backend   │ :3001 (Express + PostgreSQL)
       │        └─────────────┘
       │
       └──────→ ┌─────────────┐
                │ AI Service  │ :3003 (LLM Integration)
                └──────┬──────┘
                       │
                       ├──────→ ┌─────────────┐
                       │        │   Ollama    │ :11434 (Local LLM)
                       │        └─────────────┘
                       │
                       └──────→ ┌─────────────┐
                                │    Proxy    │ :3002 (CORS Proxy)
                                └─────────────┘
```

## Support

For issues or questions:
- Check logs: `docker-compose logs <service-name>`
- View running containers: `docker ps`
- Inspect a service: `docker inspect cs720-<service-name>`
