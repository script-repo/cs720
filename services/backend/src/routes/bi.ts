import { FastifyInstance } from 'fastify';
import { biService } from '../services/biService';
import { readDataFile } from '../utils/storage';

export async function biRoutes(fastify: FastifyInstance) {

  // Get industry insights
  fastify.get('/insights', async (request, reply) => {
    try {
      const { industry, accountId } = request.query as {
        industry?: string;
        accountId?: string;
      };

      let targetIndustry = industry;

      // If accountId is provided, get industry from account data
      if (accountId && !industry) {
        const accountData = await readDataFile(`accounts/${accountId}.json`);
        if (accountData?.industry) {
          targetIndustry = accountData.industry;
        }
      }

      if (!targetIndustry) {
        return reply.status(400).send({
          error: 'Industry parameter or accountId required'
        });
      }

      // Try to get cached insights first
      const cacheKey = targetIndustry.toLowerCase().replace(/\s+/g, '-');
      let insights = await readDataFile(`bi/${cacheKey}.json`);

      // If not cached or stale (older than 24 hours), fetch fresh data
      if (!insights || isStale(insights.lastUpdated)) {
        insights = await biService.fetchIndustryInsights(targetIndustry);

        // Cache the insights
        await require('../utils/storage').writeDataFile(`bi/${cacheKey}.json`, insights);
      }

      // If accountId is provided, return insights tailored for that account
      if (accountId) {
        insights.accountId = accountId;
      }

      return insights;

    } catch (error) {
      fastify.log.error(`Error fetching BI insights: ${String(error)}`);
      return reply.status(500).send({
        error: 'Failed to fetch business intelligence insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all available industries with insights
  fastify.get('/industries', async (request, reply) => {
    try {
      // Get list of all cached industry insights
      const accounts = await readDataFile('accounts/index.json') || [];
      const industries = [...new Set(accounts.map((account: any) => account.industry))]
        .filter(Boolean)
        .sort();

      const industriesWithInsights = await Promise.all(
        industries.map(async (industry: unknown) => {
          const industryStr = String(industry);
          const cacheKey = industryStr.toLowerCase().replace(/\s+/g, '-');
          const insights = await readDataFile(`bi/${cacheKey}.json`);

          return {
            industry: industryStr,
            hasInsights: !!insights,
            lastUpdated: insights?.lastUpdated,
            insightCount: insights?.insights?.length || 0,
            trendCount: insights?.trends?.length || 0
          };
        })
      );

      return {
        industries: industriesWithInsights,
        total: industriesWithInsights.length
      };

    } catch (error) {
      fastify.log.error(`Error fetching industries: ${String(error)}`);
      return reply.status(500).send({
        error: 'Failed to fetch industry list'
      });
    }
  });

  // Refresh insights for a specific industry
  fastify.post('/insights/refresh', async (request, reply) => {
    try {
      const { industry } = request.body as { industry: string };

      if (!industry) {
        return reply.status(400).send({
          error: 'Industry parameter required'
        });
      }

      // Fetch fresh insights
      const insights = await biService.fetchIndustryInsights(industry);

      // Cache the fresh insights
      const cacheKey = industry.toLowerCase().replace(/\s+/g, '-');
      await require('../utils/storage').writeDataFile(`bi/${cacheKey}.json`, insights);

      return {
        success: true,
        message: `Insights refreshed for ${industry}`,
        insights
      };

    } catch (error) {
      fastify.log.error(`Error refreshing BI insights: ${String(error)}`);
      return reply.status(500).send({
        error: 'Failed to refresh insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

function isStale(lastUpdated: string): boolean {
  if (!lastUpdated) return true;

  const updateTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return (now - updateTime) > twentyFourHours;
}