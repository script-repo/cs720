import { FastifyInstance } from 'fastify';
import { getDatabase } from '../db/database';

interface CaseDetails {
  caseNumber: string;
  accountId: string;
  clusterId?: string | null;
  status: string;
  severity: string;
  product: string;
  openedDate: string | null;
  closedDate: string | null;
  createdAt: string;
  clusterName?: string | null;
  [key: string]: unknown;
}

export async function accountRoutes(fastify: FastifyInstance) {

  // Get all accounts
  fastify.get('/', async (request, reply) => {
    try {
      const db = getDatabase();

      const accounts = db.prepare(`
        SELECT
          account_name_normalized as id,
          account_name_display as name,
          created_at as createdAt,
          updated_at as updatedAt
        FROM accounts
        ORDER BY account_name_display
      `).all();

      return {
        success: true,
        accounts
      };

    } catch (error) {
      fastify.log.error(`Error fetching accounts: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch accounts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get account details with statistics
  fastify.get('/:accountId', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };
      const db = getDatabase();

      // Get account info
      const account = db.prepare(`
        SELECT
          account_name_normalized as id,
          account_name_display as name,
          created_at as createdAt,
          updated_at as updatedAt
        FROM accounts
        WHERE account_name_normalized = ?
      `).get(accountId);

      if (!account) {
        return reply.status(404).send({
          success: false,
          error: 'Account not found'
        });
      }

      // Get statistics
      const stats = {
        clusters: db.prepare('SELECT COUNT(*) as count FROM clusters WHERE account_name_normalized = ?').get(accountId) as { count: number } | undefined,
        nodes: db.prepare('SELECT COUNT(*) as count FROM nodes WHERE cluster_uuid IN (SELECT cluster_uuid FROM clusters WHERE account_name_normalized = ?)').get(accountId) as { count: number } | undefined,
        vms: db.prepare('SELECT COUNT(*) as count FROM vms WHERE cluster_uuid IN (SELECT cluster_uuid FROM clusters WHERE account_name_normalized = ?)').get(accountId) as { count: number } | undefined,
        storageContainers: db.prepare('SELECT COUNT(*) as count FROM storage_containers WHERE cluster_uuid IN (SELECT cluster_uuid FROM clusters WHERE account_name_normalized = ?)').get(accountId) as { count: number } | undefined,
        cases: db.prepare('SELECT COUNT(*) as count FROM cases WHERE account_name_normalized = ?').get(accountId) as { count: number } | undefined,
        licenses: db.prepare('SELECT COUNT(*) as count FROM licenses WHERE account_name_normalized = ?').get(accountId) as { count: number } | undefined,
      };

      return {
        success: true,
        account: {
          ...account,
          stats: {
            clusters: stats.clusters?.count || 0,
            nodes: stats.nodes?.count || 0,
            vms: stats.vms?.count || 0,
            storageContainers: stats.storageContainers?.count || 0,
            cases: stats.cases?.count || 0,
            licenses: stats.licenses?.count || 0,
          }
        }
      };

    } catch (error) {
      fastify.log.error(`Error fetching account details: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch account details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get account statistics
  fastify.get('/:accountId/stats', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };
      const db = getDatabase();

      // Get statistics
      const stats = {
        clusters: db.prepare('SELECT COUNT(*) as count FROM clusters WHERE account_name_normalized = ?').get(accountId) as { count: number } | undefined,
        nodes: db.prepare('SELECT COUNT(*) as count FROM nodes WHERE cluster_uuid IN (SELECT cluster_uuid FROM clusters WHERE account_name_normalized = ?)').get(accountId) as { count: number } | undefined,
        vms: db.prepare('SELECT COUNT(*) as count FROM vms WHERE cluster_uuid IN (SELECT cluster_uuid FROM clusters WHERE account_name_normalized = ?)').get(accountId) as { count: number } | undefined,
        storageContainers: db.prepare('SELECT COUNT(*) as count FROM storage_containers WHERE cluster_uuid IN (SELECT cluster_uuid FROM clusters WHERE account_name_normalized = ?)').get(accountId) as { count: number } | undefined,
        cases: db.prepare('SELECT COUNT(*) as count FROM cases WHERE account_name_normalized = ?').get(accountId) as { count: number } | undefined,
        licenses: db.prepare('SELECT COUNT(*) as count FROM licenses WHERE account_name_normalized = ?').get(accountId) as { count: number } | undefined,
      };

      return {
        success: true,
        stats: {
          clusters: stats.clusters?.count || 0,
          nodes: stats.nodes?.count || 0,
          vms: stats.vms?.count || 0,
          storageContainers: stats.storageContainers?.count || 0,
          cases: stats.cases?.count || 0,
          licenses: stats.licenses?.count || 0,
        }
      };

    } catch (error) {
      fastify.log.error(`Error fetching account stats: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch account stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get clusters for an account
  fastify.get('/:accountId/clusters', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };
      const db = getDatabase();

      const clusters = db.prepare(`
        SELECT
          cluster_uuid as id,
          cluster_name as name,
          sw_version as version,
          site,
          license_state as licenseState,
          created_at as createdAt
        FROM clusters
        WHERE account_name_normalized = ?
        ORDER BY cluster_name
      `).all(accountId);

      return {
        success: true,
        clusters
      };

    } catch (error) {
      fastify.log.error(`Error fetching clusters: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch clusters',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get cases for an account
  fastify.get('/:accountId/cases', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };
      const { limit = 100 } = request.query as { limit?: number };
      const db = getDatabase();

      const cases = db.prepare(`
        SELECT
          case_number as caseNumber,
          status,
          severity,
          product,
          opened as createdDate,
          closed as closedDate
        FROM cases
        WHERE account_name_normalized = ?
        ORDER BY opened DESC
        LIMIT ?
      `).all(accountId, Number(limit));

      return {
        success: true,
        cases
      };

    } catch (error) {
      fastify.log.error(`Error fetching cases: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch cases',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get detailed cluster information
  fastify.get('/:accountId/clusters/:clusterId/details', async (request, reply) => {
    try {
      const { accountId, clusterId } = request.params as { accountId: string; clusterId: string };
      const db = getDatabase();

      // Get cluster info
      const cluster = db.prepare(`
        SELECT
          cluster_uuid as id,
          cluster_name as name,
          sw_version as version,
          site,
          license_state as licenseState,
          created_at as createdAt
        FROM clusters
        WHERE cluster_uuid = ? AND account_name_normalized = ?
      `).get(clusterId, accountId);

      if (!cluster) {
        return reply.status(404).send({
          success: false,
          error: 'Cluster not found'
        });
      }

      // Get nodes for this cluster
      const nodes = db.prepare(`
        SELECT
          node_id as id,
          serial,
          model,
          cpu,
          memory_gb as memoryGb,
          gpu_model as gpuModel,
          created_at as createdAt
        FROM nodes
        WHERE cluster_uuid = ?
        ORDER BY node_id
      `).all(clusterId);

      // Get VMs for this cluster
      const vms = db.prepare(`
        SELECT
          vm_uuid as id,
          vm_name as name,
          created_at as createdAt
        FROM vms
        WHERE cluster_uuid = ?
        ORDER BY vm_name
      `).all(clusterId);

      // Get storage containers for this cluster
      const containers = db.prepare(`
        SELECT
          container_id as id,
          container_name as name,
          capacity_gb as capacityGb,
          used_gb as usedGb,
          created_at as createdAt
        FROM storage_containers
        WHERE cluster_uuid = ?
        ORDER BY container_name
      `).all(clusterId);

      return {
        success: true,
        cluster: {
          ...cluster,
          nodes,
          vms,
          storageContainers: containers
        }
      };

    } catch (error) {
      fastify.log.error(`Error fetching cluster details: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch cluster details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get detailed case information
  fastify.get('/:accountId/cases/:caseNumber/details', async (request, reply) => {
    try {
      const { accountId, caseNumber } = request.params as { accountId: string; caseNumber: string };
      const db = getDatabase();

      const caseData = db.prepare(`
        SELECT
          case_number as caseNumber,
          account_name_normalized as accountId,
          cluster_uuid as clusterId,
          status,
          severity,
          product,
          opened as openedDate,
          closed as closedDate,
          created_at as createdAt
        FROM cases
        WHERE case_number = ? AND account_name_normalized = ?
      `).get(caseNumber, accountId) as CaseDetails | undefined;

      if (!caseData) {
        return reply.status(404).send({
          success: false,
          error: 'Case not found'
        });
      }

      // Get cluster name if cluster_uuid exists
      if (caseData.clusterId) {
        const cluster = db.prepare(`
          SELECT cluster_name as name
          FROM clusters
          WHERE cluster_uuid = ?
        `).get(caseData.clusterId) as { name?: string } | undefined;

        caseData.clusterName = cluster?.name || null;
      }

      return {
        success: true,
        case: caseData
      };

    } catch (error) {
      fastify.log.error(`Error fetching case details: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch case details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get utilization data for an account
  fastify.get('/:accountId/utilization', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };
      const db = getDatabase();

      const utilization = db.prepare(`
        SELECT
          u.cluster_uuid as clusterId,
          c.cluster_name as clusterName,
          u.cpu_pct as cpuPercent,
          u.mem_pct as memoryPercent,
          u.storage_pct as storagePercent,
          u.iops,
          u.latency_ms as latencyMs,
          u.timestamp as snapshotTime
        FROM utilization u
        JOIN clusters c ON u.cluster_uuid = c.cluster_uuid
        WHERE c.account_name_normalized = ?
        ORDER BY u.timestamp DESC
      `).all(accountId);

      return {
        success: true,
        utilization
      };

    } catch (error) {
      fastify.log.error(`Error fetching utilization: ${String(error)}`);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch utilization',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
