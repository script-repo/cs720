import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

// Import routes
import { authRoutes } from './routes/auth';
import { syncRoutes } from './routes/sync';
import { dataRoutes } from './routes/data';
import { aiRoutes } from './routes/ai';
import { biRoutes } from './routes/bi';
import { configRoutes } from './routes/config';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn'
  }
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  });

  // Multipart for file uploads
  await fastify.register(multipart);

  // Static files (for serving frontend if needed)
  await fastify.register(staticFiles, {
    root: path.join(__dirname, '../public'),
    prefix: '/public/'
  });
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  });

  // API routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(syncRoutes, { prefix: '/api/sync' });
  await fastify.register(dataRoutes, { prefix: '/api' });
  await fastify.register(aiRoutes, { prefix: '/api/ai' });
  await fastify.register(biRoutes, { prefix: '/api/bi' });
  await fastify.register(configRoutes, { prefix: '/api/config' });
}

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    const host = process.env.HOST || 'localhost';
    const port = parseInt(process.env.PORT || '3001');

    await fastify.listen({ host, port });

    console.log(`🚀 CS720 Backend server running on http://${host}:${port}`);
    console.log(`📊 Health check: http://${host}:${port}/health`);
    console.log(`🔑 Auth endpoints: http://${host}:${port}/api/auth/*`);
    console.log(`🔄 Sync endpoints: http://${host}:${port}/api/sync/*`);
    console.log(`🤖 AI endpoints: http://${host}:${port}/api/ai/*`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down CS720 Backend server...');
  await fastify.close();
  process.exit(0);
});

start();