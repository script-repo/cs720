import { FastifyInstance } from 'fastify';
import { UserPreferences } from '../types';
import { readDataFile, writeDataFile } from '../utils/storage';

const DEFAULT_PREFERENCES: UserPreferences = {
  sync: {
    frequency: 'daily',
    accountScope: 'all'
  },
  ai: {
    preferredModel: 'ollama',
    maxTokens: 2048,
    naiBaseUrl: '',
    naiApiKey: '',
    naiModel: '',
    perplexityApiKey: '',
    perplexityModel: 'sonar',
    systemPrompt: 'You are an AI advisor for CS720, a customer intelligence platform for Sales Engineers. Help answer questions about customer accounts, priorities, and documentation.'
  },
  ui: {
    theme: 'dark',
    sidebarCollapsed: false
  }
};

export async function configRoutes(fastify: FastifyInstance) {

  // Get user preferences
  fastify.get('/preferences', async (request, reply) => {
    try {
      const preferences = await readDataFile('preferences.json') || DEFAULT_PREFERENCES;

      return {
        preferences,
        defaults: DEFAULT_PREFERENCES
      };

    } catch (error) {
      fastify.log.error(`Error fetching preferences: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to fetch preferences' });
    }
  });

  // Update user preferences
  fastify.put('/preferences', async (request, reply) => {
    try {
      const newPreferences = request.body as Partial<UserPreferences>;

      // Get current preferences
      const currentPreferences = await readDataFile('preferences.json') || DEFAULT_PREFERENCES;

      // Merge with new preferences
      const updatedPreferences: UserPreferences = {
        sync: {
          ...currentPreferences.sync,
          ...newPreferences.sync
        },
        ai: {
          ...currentPreferences.ai,
          ...newPreferences.ai
        },
        ui: {
          ...currentPreferences.ui,
          ...newPreferences.ui
        }
      };

      // Validate preferences
      const validationError = validatePreferences(updatedPreferences);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      // Save preferences
      await writeDataFile('preferences.json', updatedPreferences);

      return {
        success: true,
        message: 'Preferences updated successfully',
        preferences: updatedPreferences
      };

    } catch (error) {
      fastify.log.error(`Error updating preferences: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to update preferences' });
    }
  });

  // Reset preferences to defaults
  fastify.post('/preferences/reset', async (request, reply) => {
    try {
      await writeDataFile('preferences.json', DEFAULT_PREFERENCES);

      return {
        success: true,
        message: 'Preferences reset to defaults',
        preferences: DEFAULT_PREFERENCES
      };

    } catch (error) {
      fastify.log.error(`Error resetting preferences: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to reset preferences' });
    }
  });

  // Get application status and configuration
  fastify.get('/status', async (request, reply) => {
    try {
      const [preferences, authStatus] = await Promise.all([
        readDataFile('preferences.json') || DEFAULT_PREFERENCES,
        getAuthStatus()
      ]);

      const syncHistory = await readDataFile('sync-history/jobs.json') || [];
      const lastSync = syncHistory.length > 0
        ? syncHistory[syncHistory.length - 1]
        : null;

      return {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        auth: authStatus,
        sync: {
          lastSyncTime: lastSync?.endTime,
          lastSyncStatus: lastSync?.status,
          totalJobs: syncHistory.length
        },
        storage: await getStorageInfo(),
        preferences
      };

    } catch (error) {
      fastify.log.error(`Error fetching application status: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to fetch application status' });
    }
  });
}

function validatePreferences(preferences: UserPreferences): string | null {
  // Validate sync preferences
  if (!['manual', 'daily', 'hourly'].includes(preferences.sync.frequency)) {
    return 'Invalid sync frequency';
  }

  if (!['all', 'selected'].includes(preferences.sync.accountScope)) {
    return 'Invalid account scope';
  }

  // Validate AI preferences
  if (!['ollama', 'openai'].includes(preferences.ai.preferredModel)) {
    return 'Invalid AI model preference';
  }

  if (preferences.ai.maxTokens < 100 || preferences.ai.maxTokens > 8000) {
    return 'Max tokens must be between 100 and 8000';
  }

  // Validate UI preferences
  if (!['dark', 'light'].includes(preferences.ui.theme)) {
    return 'Invalid theme';
  }

  return null;
}

async function getAuthStatus(): Promise<any> {
  try {
    const { decryptTokens } = await import('../utils/encryption');
    const fs = await import('fs-extra');
    const path = await import('path');

    const tokenPath = path.join('.cs720', 'auth', 'tokens.enc');

    if (!await fs.pathExists(tokenPath)) {
      return {
        salesforce: { authenticated: false },
        microsoft: { authenticated: false }
      };
    }

    const encryptedTokens = await fs.readFile(tokenPath, 'utf8');
    const tokens = decryptTokens(encryptedTokens);

    return {
      salesforce: {
        authenticated: !!tokens?.salesforce?.accessToken,
        expiresAt: tokens?.salesforce?.expiresAt
      },
      microsoft: {
        authenticated: !!tokens?.microsoft?.accessToken,
        expiresAt: tokens?.microsoft?.expiresAt
      }
    };

  } catch (error) {
    return {
      salesforce: { authenticated: false },
      microsoft: { authenticated: false }
    };
  }
}

async function getStorageInfo(): Promise<any> {
  try {
    const fs = await import('fs-extra');
    const path = await import('path');

    const dataDir = '.cs720';
    const totalSize = await getDirectorySize(dataDir);

    const accountFiles = await fs.readdir(path.join(dataDir, 'accounts')).catch(() => []);
    const documentFiles = await fs.readdir(path.join(dataDir, 'documents')).catch(() => []);
    const chatFiles = await fs.readdir(path.join(dataDir, 'chat')).catch(() => []);

    return {
      totalSize,
      accountCount: accountFiles.length,
      documentCount: documentFiles.length,
      chatHistoryCount: chatFiles.length
    };

  } catch (error) {
    return {
      totalSize: 0,
      accountCount: 0,
      documentCount: 0,
      chatHistoryCount: 0
    };
  }
}

async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    const fs = await import('fs-extra');
    const path = await import('path');

    let totalSize = 0;

    if (!await fs.pathExists(dirPath)) {
      return 0;
    }

    const files = await fs.readdir(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        totalSize += await getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;

  } catch (error) {
    return 0;
  }
}