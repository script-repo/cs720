#!/bin/bash

# CS720 Service Verification Script
# Checks that all required services are running and healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "CS720 Service Verification"
echo "========================================"
echo ""

# Track overall status
ALL_HEALTHY=true

# Function to check if a service is running and healthy
check_service() {
  local name=$1
  local url=$2
  local port=$3

  # Check if port is listening
  if ! ss -tlnp 2>/dev/null | grep -q ":${port} " && ! lsof -i :${port} 2>/dev/null | grep -q LISTEN; then
    echo -e "${RED}✗${NC} ${name} - Port ${port} not listening"
    ALL_HEALTHY=false
    return 1
  fi

  # Check health endpoint
  if curl -sf "${url}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} ${name} - Healthy (${url})"
    return 0
  else
    echo -e "${YELLOW}⚠${NC} ${name} - Port listening but health check failed"
    ALL_HEALTHY=false
    return 1
  fi
}

# Check each service
check_service "Frontend     " "http://localhost:3000" "3000"
check_service "Backend API  " "http://localhost:3001/health" "3001"
check_service "CORS Proxy   " "http://localhost:3002/health" "3002"
check_service "AI Service   " "http://localhost:3003/health" "3003"
check_service "Ollama       " "http://localhost:11434/api/tags" "11434"

echo ""
echo "========================================"
if [ "$ALL_HEALTHY" = true ]; then
  echo -e "${GREEN}✓ All services are healthy${NC}"
  echo "========================================"
  exit 0
else
  echo -e "${YELLOW}⚠ Some services are not healthy${NC}"
  echo "========================================"
  echo ""
  echo "To start missing services:"
  echo "  npm run dev              # Start all services"
  echo "  npm run dev:backend      # Start backend only"
  echo "  npm run dev:proxy        # Start proxy only"
  echo "  npm run dev:ai           # Start AI service only"
  echo "  npm run dev:frontend     # Start frontend only"
  echo ""
  exit 1
fi
