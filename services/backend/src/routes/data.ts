import { FastifyInstance } from 'fastify';
import { DashboardData } from '../types';
import { readDataFile } from '../utils/storage';

export async function dataRoutes(fastify: FastifyInstance) {

  // Get documents for a specific account
  fastify.get('/accounts/:accountId/documents', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };

      const documents = await readDataFile(`documents/${accountId}.json`) || [];

      return {
        accountId,
        documents: documents.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          type: doc.type,
          source: doc.source,
          lastModified: doc.lastModified,
          summary: doc.summary || doc.content?.substring(0, 200) + '...',
          keywords: doc.keywords || []
        }))
      };

    } catch (error) {
      fastify.log.error(`Error fetching documents for account ${(request.params as any).accountId}: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to fetch documents' });
    }
  });

  // Get full dashboard data for an account
  fastify.get('/accounts/:accountId/dashboard', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };

      // Read account data first to get industry
      const accountData: any = await readDataFile(`accounts/${accountId}.json`);

      // Read all other data for this account
      const [
        documents,
        industryData
      ] = await Promise.all([
        readDataFile(`documents/${accountId}.json`),
        accountData?.industry ? readDataFile(`bi/${accountData.industry.toLowerCase().replace(/\s+/g, '-')}.json`) : null
      ]);

      if (!accountData) {
        return reply.status(404).send({ error: 'Account not found' });
      }

      // Build dashboard data
      const dashboardData: DashboardData = {
        accountId,
        priorities: accountData.priorities || [],
        upcomingDates: accountData.upcomingDates || [],
        projects: accountData.projects || [],
        customerIssues: accountData.customerIssues || [],
        tickets: accountData.tickets || [],
        industryIntelligence: industryData ? [industryData] : [],
        lastSyncTime: accountData.lastSyncTime || new Date().toISOString()
      };

      return dashboardData;

    } catch (error) {
      fastify.log.error(`Error fetching dashboard for account ${(request.params as any).accountId}: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Get a specific document's full content
  fastify.get('/documents/:documentId', async (request, reply) => {
    try {
      const { documentId } = request.params as { documentId: string };

      // This is a simplified approach - in reality, you'd need a better indexing system
      const allAccountIds = await getAllAccountIds();

      for (const accountId of allAccountIds) {
        const documents = await readDataFile(`documents/${accountId}.json`) || [];
        const document = documents.find((doc: any) => doc.id === documentId);

        if (document) {
          return {
            id: document.id,
            accountId,
            title: document.title,
            content: document.content,
            type: document.type,
            source: document.source,
            sourceId: document.sourceId,
            lastModified: document.lastModified,
            url: document.url,
            keywords: document.keywords || [],
            mentions: document.mentions || [],
            readingTime: document.readingTime || 0
          };
        }
      }

      return reply.status(404).send({ error: 'Document not found' });

    } catch (error) {
      fastify.log.error(`Error fetching document ${(request.params as any).documentId}: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to fetch document' });
    }
  });

  // Search across all documents
  fastify.get('/search', async (request, reply) => {
    try {
      const { q, accountId, type, limit = 50 } = request.query as {
        q: string;
        accountId?: string;
        type?: string;
        limit?: number;
      };

      if (!q || q.trim().length === 0) {
        return { results: [] };
      }

      const searchTerm = q.toLowerCase();
      const results: any[] = [];

      // Determine which accounts to search
      const accountIds = accountId ? [accountId] : await getAllAccountIds();

      for (const accId of accountIds) {
        const documents = await readDataFile(`documents/${accId}.json`) || [];

        for (const doc of documents) {
          // Skip if type filter doesn't match
          if (type && doc.type !== type) continue;

          // Check if document matches search term
          const matches =
            doc.title.toLowerCase().includes(searchTerm) ||
            doc.content.toLowerCase().includes(searchTerm) ||
            (doc.keywords && doc.keywords.some((k: string) => k.toLowerCase().includes(searchTerm)));

          if (matches) {
            // Extract relevant snippet
            const contentIndex = doc.content.toLowerCase().indexOf(searchTerm);
            const snippet = contentIndex >= 0
              ? doc.content.substring(Math.max(0, contentIndex - 100), contentIndex + 100)
              : doc.content.substring(0, 200);

            results.push({
              id: doc.id,
              accountId: accId,
              title: doc.title,
              type: doc.type,
              source: doc.source,
              snippet: snippet + '...',
              lastModified: doc.lastModified,
              relevance: calculateRelevance(doc, searchTerm)
            });
          }
        }
      }

      // Sort by relevance and limit results
      results.sort((a, b) => b.relevance - a.relevance);

      return {
        query: q,
        results: results.slice(0, limit),
        total: results.length
      };

    } catch (error) {
      fastify.log.error(`Error performing search: ${String(error)}`);
      return reply.status(500).send({ error: 'Search failed' });
    }
  });
}

async function getAllAccountIds(): Promise<string[]> {
  try {
    const accounts = await readDataFile('accounts/index.json') || [];
    return accounts.map((account: any) => account.id);
  } catch (error) {
    console.error('Error getting account IDs:', error);
    return [];
  }
}

function calculateRelevance(document: any, searchTerm: string): number {
  let score = 0;

  // Title match gets highest score
  if (document.title.toLowerCase().includes(searchTerm)) {
    score += 10;
  }

  // Keyword match gets medium score
  if (document.keywords && document.keywords.some((k: string) => k.toLowerCase().includes(searchTerm))) {
    score += 5;
  }

  // Content match gets base score
  const contentMatches = (document.content.toLowerCase().match(new RegExp(searchTerm, 'g')) || []).length;
  score += contentMatches;

  // Boost recent documents
  const daysSinceModified = Math.floor(
    (Date.now() - new Date(document.lastModified).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceModified < 7) score += 2;
  else if (daysSinceModified < 30) score += 1;

  return score;
}