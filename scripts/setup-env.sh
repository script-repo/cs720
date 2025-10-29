#!/bin/bash

# CS720 Environment Setup Script
# Ensures all required .env files exist before starting services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "CS720 Environment Setup"
echo "========================================"
echo ""

# Track if any files were created
FILES_CREATED=false

# Function to check and create .env file
setup_env() {
  local service=$1
  local path="services/${service}"

  if [ ! -f "${path}/.env" ]; then
    if [ -f "${path}/.env.example" ]; then
      echo -e "${YELLOW}⚠${NC} Creating ${path}/.env from example..."
      cp "${path}/.env.example" "${path}/.env"
      echo -e "${GREEN}✓${NC} Created ${path}/.env"
      FILES_CREATED=true
    else
      echo -e "${RED}✗${NC} Missing ${path}/.env.example - cannot create .env"
      return 1
    fi
  else
    echo -e "${GREEN}✓${NC} ${path}/.env exists"
  fi
}

# Check each service
setup_env "backend"
setup_env "proxy"
setup_env "ai-service"

echo ""
echo "========================================"
if [ "$FILES_CREATED" = true ]; then
  echo -e "${BLUE}ℹ${NC} Environment files created"
  echo ""
  echo "Please review and update the .env files with your configuration:"
  echo "  services/backend/.env"
  echo "  services/proxy/.env"
  echo "  services/ai-service/.env"
  echo ""
  echo "Key settings to verify:"
  echo "  • Ollama model name (check with: curl http://localhost:11434/api/tags)"
  echo "  • API endpoints and ports"
  echo "  • API keys (if using OpenAI or other services)"
else
  echo -e "${GREEN}✓ All environment files exist${NC}"
fi
echo "========================================"
echo ""

exit 0
