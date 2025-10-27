#!/usr/bin/env node

/**
 * CS720 Platform Health Check
 * Checks the health of all services
 */

const SERVICES = {
  frontend: { name: 'Frontend', url: 'http://localhost:3000/health' },
  backend: { name: 'Backend API', url: 'http://localhost:3001/health' },
  proxy: { name: 'CORS Proxy', url: 'http://localhost:3002/health' },
  aiService: { name: 'AI Service', url: 'http://localhost:3003/health' },
  ollama: { name: 'Ollama', url: 'http://localhost:11434/api/tags' },
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function checkService(name, url) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timeout);
    const latency = Date.now() - startTime;

    if (response.ok) {
      console.log(`${colors.green}✓${colors.reset} ${name.padEnd(20)} ${colors.cyan}HEALTHY${colors.reset} (${latency}ms)`);
      return { status: 'healthy', latency };
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${name.padEnd(20)} ${colors.yellow}DEGRADED${colors.reset} (HTTP ${response.status})`);
      return { status: 'degraded', latency };
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`${colors.red}✗${colors.reset} ${name.padEnd(20)} ${colors.red}TIMEOUT${colors.reset}`);
      return { status: 'timeout' };
    } else {
      console.log(`${colors.red}✗${colors.reset} ${name.padEnd(20)} ${colors.red}UNAVAILABLE${colors.reset}`);
      return { status: 'unavailable' };
    }
  }
}

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log(`${colors.blue}CS720 Platform Health Check${colors.reset}`);
  console.log('='.repeat(60));
  console.log('');

  const results = {};

  for (const [key, service] of Object.entries(SERVICES)) {
    results[key] = await checkService(service.name, service.url);
  }

  console.log('');
  console.log('='.repeat(60));

  const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
  const totalCount = Object.keys(results).length;

  if (healthyCount === totalCount) {
    console.log(`${colors.green}✓ All services are healthy (${healthyCount}/${totalCount})${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}⚠ Some services are unavailable (${healthyCount}/${totalCount} healthy)${colors.reset}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`${colors.red}Error running health check:${colors.reset}`, error);
  process.exit(1);
});
