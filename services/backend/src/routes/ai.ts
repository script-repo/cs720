import { FastifyInstance } from 'fastify';
import { AIQueryRequest, AIQueryResponse, ChatMessage } from '../types';
import { llmService } from '../services/llmService';
import { readDataFile, writeDataFile } from '../utils/storage';
import crypto from 'crypto';

export async function aiRoutes(fastify: FastifyInstance) {

  // Query AI assistant
  fastify.post('/query', async (request, reply) => {
    try {
      const { accountId, query, conversationId } = request.body as AIQueryRequest;

      if (!query || query.trim().length === 0) {
        return reply.status(400).send({ error: 'Query is required' });
      }

      const startTime = Date.now();

      // Get account context
      const context = await getAccountContext(accountId);

      // Query LLM
      const response = await llmService.queryLLM(query, context);

      const responseTime = Date.now() - startTime;

      // Create chat message
      const chatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        accountId,
        query,
        response: response.content,
        sources: response.sources,
        timestamp: new Date().toISOString(),
        model: response.model,
        metadata: {
          responseTime,
          confidence: response.confidence
        }
      };

      // Store chat message
      await storeChatMessage(chatMessage);

      // Return response
      const aiResponse: AIQueryResponse = {
        id: chatMessage.id,
        content: response.content,
        sources: response.sources,
        metadata: {
          model: response.model,
          responseTime,
          endpoint: response.endpoint,
          confidence: response.confidence
        }
      };

      return aiResponse;

    } catch (error) {
      fastify.log.error(`Error processing AI query: ${String(error)}`);
      return reply.status(500).send({
        error: 'Failed to process AI query',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get chat history for an account
  fastify.get('/chat/:accountId', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };
      const { limit = 50 } = request.query as { limit?: number };

      const chatHistory = await getChatHistory(accountId, limit);

      return {
        accountId,
        messages: chatHistory,
        total: chatHistory.length
      };

    } catch (error) {
      fastify.log.error(`Error fetching chat history for account ${(request.params as any).accountId}: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to fetch chat history' });
    }
  });

  // Check AI/LLM health and availability
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await llmService.checkHealth();

      return {
        status: 'healthy',
        ollama: {
          available: health.local.available,
          latency: health.local.responseTime,
          model: health.local.model
        },
        proxy: {
          available: health.proxy.available,
          latency: health.proxy.responseTime
        },
        nai: {
          available: health.external.available,
          latency: health.external.responseTime,
          model: health.external.model
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      fastify.log.error(`Error checking AI health: ${String(error)}`);
      return reply.status(500).send({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Clear chat history for an account
  fastify.delete('/chat/:accountId', async (request, reply) => {
    try {
      const { accountId } = request.params as { accountId: string };

      await clearChatHistory(accountId);

      return {
        success: true,
        message: `Chat history cleared for account ${accountId}`
      };

    } catch (error) {
      fastify.log.error(`Error clearing chat history for account ${(request.params as any).accountId}: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to clear chat history' });
    }
  });
}

async function getAccountContext(accountId: string): Promise<any> {
  try {
    // Get all relevant data for the account
    const [accountData, documents, chatHistory] = await Promise.all([
      readDataFile(`accounts/${accountId}.json`),
      readDataFile(`documents/${accountId}.json`),
      getChatHistory(accountId, 10) // Recent chat context
    ]);

    return {
      account: accountData,
      documents: documents || [],
      recentQueries: chatHistory.map(msg => msg.query),
      lastSyncTime: accountData?.lastSyncTime
    };

  } catch (error) {
    console.error(`Error getting context for account ${accountId}:`, error);
    return null;
  }
}

async function storeChatMessage(message: ChatMessage): Promise<void> {
  try {
    const chatFile = `chat/${message.accountId}.json`;
    const existingMessages = await readDataFile(chatFile) || [];

    existingMessages.push(message);

    // Keep only last 100 messages per account
    if (existingMessages.length > 100) {
      existingMessages.splice(0, existingMessages.length - 100);
    }

    await writeDataFile(chatFile, existingMessages);

  } catch (error) {
    console.error('Error storing chat message:', error);
  }
}

async function getChatHistory(accountId: string, limit: number): Promise<ChatMessage[]> {
  try {
    const chatFile = `chat/${accountId}.json`;
    const messages = await readDataFile(chatFile) || [];

    // Return most recent messages
    return messages
      .sort((a: ChatMessage, b: ChatMessage) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);

  } catch (error) {
    console.error(`Error getting chat history for account ${accountId}:`, error);
    return [];
  }
}

async function clearChatHistory(accountId: string): Promise<void> {
  try {
    const chatFile = `chat/${accountId}.json`;
    await writeDataFile(chatFile, []);

  } catch (error) {
    console.error(`Error clearing chat history for account ${accountId}:`, error);
    throw error;
  }
}