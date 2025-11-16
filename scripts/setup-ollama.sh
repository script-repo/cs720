#!/bin/bash
#
# Setup Ollama with a default model for CS720
# Run this after starting the Ollama container
#

set -e

OLLAMA_CONTAINER=${OLLAMA_CONTAINER:-cs720-ollama}
OLLAMA_MODEL=${OLLAMA_MODEL:-llama2}

echo "========================================"
echo "CS720 Ollama Setup"
echo "========================================"
echo ""
echo "Container: $OLLAMA_CONTAINER"
echo "Model: $OLLAMA_MODEL"
echo ""

# Check if Ollama container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${OLLAMA_CONTAINER}$"; then
    echo "ERROR: Ollama container '${OLLAMA_CONTAINER}' is not running"
    echo "Please start it with: docker-compose up -d ollama"
    exit 1
fi

echo "Waiting for Ollama service to be ready..."
max_attempts=30
attempt=0
while ! docker exec "$OLLAMA_CONTAINER" curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "ERROR: Ollama service did not start within expected time"
        exit 1
    fi
    echo "  Waiting... (attempt $attempt/$max_attempts)"
    sleep 2
done

echo "✓ Ollama service is ready"
echo ""

# Check if model is already downloaded
echo "Checking if model '$OLLAMA_MODEL' is already available..."
if docker exec "$OLLAMA_CONTAINER" curl -sf http://localhost:11434/api/tags | grep -q "\"name\":\"$OLLAMA_MODEL\""; then
    echo "✓ Model '$OLLAMA_MODEL' is already downloaded"
else
    echo "Pulling model '$OLLAMA_MODEL'..."
    echo "NOTE: This may take several minutes depending on model size and network speed"
    echo ""
    docker exec "$OLLAMA_CONTAINER" ollama pull "$OLLAMA_MODEL"
    echo ""
    echo "✓ Model '$OLLAMA_MODEL' downloaded successfully"
fi

echo ""
echo "========================================"
echo "Ollama Setup Complete!"
echo "========================================"
echo ""
echo "Available models:"
docker exec "$OLLAMA_CONTAINER" ollama list
echo ""
echo "You can now use the AI service at http://localhost:3003"
echo ""
echo "To pull additional models, run:"
echo "  docker exec $OLLAMA_CONTAINER ollama pull <model-name>"
echo ""
echo "Popular models:"
echo "  - llama2 (default, ~3.8GB)"
echo "  - llama2:13b (larger, more capable, ~7.4GB)"
echo "  - codellama (optimized for code, ~3.8GB)"
echo "  - mistral (fast and capable, ~4.1GB)"
echo "  - phi (small and fast, ~1.6GB)"
echo ""
