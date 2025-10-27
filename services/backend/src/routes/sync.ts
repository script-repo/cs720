import { FastifyInstance } from 'fastify';
import { SyncJob, SyncStartRequest } from '../types';
import { syncOrchestrator } from '../services/syncOrchestrator';
import { writeDataFile, readDataFile } from '../utils/storage';
import { etlService } from '../services/etlService';
import { initDatabase, checkDatabaseHealth } from '../db/database';
import crypto from 'crypto';

function uuidv4(): string {
  return crypto.randomUUID();
}

let activeSyncJobs: Map<string, SyncJob> = new Map();

export async function syncRoutes(fastify: FastifyInstance) {

  // Initialize database on startup
  initDatabase();

  // ===========================================================================
  // ETL Routes (CSV Data Sync)
  // ===========================================================================

  // Trigger CSV ETL sync
  fastify.post('/etl/trigger', async (request, reply) => {
    try {
      fastify.log.info('ETL sync triggered via API');

      // Run sync asynchronously and return immediately
      const syncPromise = etlService.sync();

      // Handle completion/errors in background
      syncPromise.catch(error => {
        fastify.log.error('ETL sync failed:', error);
      });

      return {
        success: true,
        message: 'ETL sync started',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      fastify.log.error(`Error triggering ETL sync: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to trigger ETL sync',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get ETL sync history
  fastify.get('/etl/history', async (request, reply) => {
    try {
      const { limit = 10 } = request.query as { limit?: number };
      const history = etlService.getSyncHistory(Number(limit));

      return {
        success: true,
        history,
        total: history.length
      };

    } catch (error) {
      fastify.log.error(`Error fetching ETL sync history: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch ETL sync history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get logs for a specific ETL sync
  fastify.get('/etl/logs/:syncId', async (request, reply) => {
    try {
      const { syncId } = request.params as { syncId: string };
      const logs = etlService.getSyncLogs(syncId);

      return {
        success: true,
        syncId,
        logs,
        total: logs.length
      };

    } catch (error) {
      fastify.log.error(`Error fetching ETL sync logs: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch ETL sync logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get database health status
  fastify.get('/db/health', async (request, reply) => {
    try {
      const health = checkDatabaseHealth();

      if (health.healthy) {
        return {
          success: true,
          status: 'healthy',
          message: 'Database is operational'
        };
      } else {
        return reply.status(503).send({
          success: false,
          status: 'unhealthy',
          message: health.message || 'Database health check failed'
        });
      }

    } catch (error) {
      fastify.log.error(`Error checking database health: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to check database health',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get ETL sync statistics
  fastify.get('/etl/stats', async (request, reply) => {
    try {
      const history = etlService.getSyncHistory(1);
      const latestSync = history[0];

      return {
        success: true,
        latestSync: latestSync || null,
        dbHealth: checkDatabaseHealth()
      };

    } catch (error) {
      fastify.log.error(`Error fetching ETL sync stats: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch ETL sync stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===========================================================================
  // Salesforce/OneDrive Sync Routes (existing)
  // ===========================================================================

  // Start a new sync job
  fastify.post('/start', async (request, reply) => {
    try {
      const { type, scope } = request.body as SyncStartRequest;

      // Create new sync job
      const syncJob: SyncJob = {
        id: uuidv4(),
        type,
        status: 'pending',
        startTime: new Date().toISOString(),
        progress: {
          salesforce: { total: 0, processed: 0, status: 'pending' },
          onedrive: { total: 0, processed: 0, status: 'pending' },
          businessIntelligence: { total: 0, processed: 0, status: 'pending' }
        },
        accountsProcessed: [],
        errors: []
      };

      // Store job
      activeSyncJobs.set(syncJob.id, syncJob);

      // Start sync asynchronously
      syncOrchestrator.executeSync(syncJob, scope)
        .then(() => {
          syncJob.status = 'completed';
          syncJob.endTime = new Date().toISOString();
        })
        .catch((error) => {
          syncJob.status = 'failed';
          syncJob.endTime = new Date().toISOString();
          syncJob.errors.push({
            type: 'unknown',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        })
        .finally(() => {
          // Save completed job to history
          saveSyncHistory(syncJob);
        });

      return {
        jobId: syncJob.id,
        status: syncJob.status,
        message: 'Sync job started'
      };

    } catch (error) {
      fastify.log.error(`Error starting sync: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to start sync job' });
    }
  });

  // Get sync job status
  fastify.get('/status/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };

      const job = activeSyncJobs.get(jobId);
      if (!job) {
        // Check sync history
        const history = await readDataFile('sync-history/jobs.json') || [];
        const historicalJob = history.find((j: SyncJob) => j.id === jobId);

        if (!historicalJob) {
          return reply.status(404).send({ error: 'Sync job not found' });
        }

        return historicalJob;
      }

      return job;

    } catch (error) {
      fastify.log.error(`Error getting sync status: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to get sync status' });
    }
  });

  // Get sync job history
  fastify.get('/history', async (request, reply) => {
    try {
      const history = await readDataFile('sync-history/jobs.json') || [];

      // Return last 10 jobs, most recent first
      return {
        jobs: history
          .sort((a: SyncJob, b: SyncJob) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          )
          .slice(0, 10)
      };

    } catch (error) {
      fastify.log.error(`Error getting sync history: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to get sync history' });
    }
  });

  // Cancel a running sync job
  fastify.post('/cancel/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };

      const job = activeSyncJobs.get(jobId);
      if (!job) {
        return reply.status(404).send({ error: 'Sync job not found' });
      }

      if (job.status === 'completed' || job.status === 'failed') {
        return reply.status(400).send({ error: 'Sync job already finished' });
      }

      // Cancel the job
      job.status = 'failed';
      job.endTime = new Date().toISOString();
      job.errors.push({
        type: 'unknown',
        message: 'Job cancelled by user',
        timestamp: new Date().toISOString()
      });

      // TODO: Implement actual cancellation in sync orchestrator
      syncOrchestrator.cancelSync(jobId);

      return {
        success: true,
        message: 'Sync job cancelled'
      };

    } catch (error) {
      fastify.log.error(`Error cancelling sync: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to cancel sync job' });
    }
  });
}

async function saveSyncHistory(job: SyncJob): Promise<void> {
  try {
    const history = await readDataFile('sync-history/jobs.json') || [];
    history.push(job);

    // Keep only last 100 jobs
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }

    await writeDataFile('sync-history/jobs.json', history);
  } catch (error) {
    console.error('Error saving sync history:', error);
  }
}