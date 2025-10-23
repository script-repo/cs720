import { FastifyInstance } from 'fastify';
import { AuthTokens } from '../types';
import { encryptTokens, decryptTokens } from '../utils/encryption';
import { ensureDataDirectory } from '../utils/storage';
import fs from 'fs-extra';
import path from 'path';

export async function authRoutes(fastify: FastifyInstance) {

  // Get authentication status
  fastify.get('/status', async (request, reply) => {
    try {
      const tokens = await getStoredTokens();

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
      fastify.log.error(`Error checking auth status: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to check authentication status' });
    }
  });

  // Initiate Salesforce OAuth flow
  fastify.post('/salesforce/authorize', async (request, reply) => {
    try {
      const clientId = process.env.SALESFORCE_CLIENT_ID;
      const redirectUri = process.env.SALESFORCE_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        return reply.status(500).send({ error: 'Salesforce OAuth not configured' });
      }

      const authUrl = `https://login.salesforce.com/services/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=api refresh_token`;

      return { authUrl };
    } catch (error) {
      fastify.log.error(`Error initiating Salesforce auth: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to initiate Salesforce authentication' });
    }
  });

  // Handle Salesforce OAuth callback
  fastify.get('/salesforce/callback', async (request, reply) => {
    try {
      const { code } = request.query as { code: string };

      if (!code) {
        return reply.status(400).send({ error: 'Authorization code not provided' });
      }

      const tokenResponse = await exchangeSalesforceCode(code);

      // Store encrypted tokens
      await storeTokens({
        salesforce: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          instanceUrl: tokenResponse.instance_url,
          expiresAt: Date.now() + (3600 * 1000) // 1 hour
        }
      });

      return { success: true, message: 'Salesforce authentication successful' };
    } catch (error) {
      fastify.log.error(`Error handling Salesforce callback: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to complete Salesforce authentication' });
    }
  });

  // Initiate Microsoft/OneDrive OAuth flow
  fastify.post('/onedrive/authorize', async (request, reply) => {
    try {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        return reply.status(500).send({ error: 'Microsoft OAuth not configured' });
      }

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=https://graph.microsoft.com/Files.Read offline_access&` +
        `response_mode=query`;

      return { authUrl };
    } catch (error) {
      fastify.log.error(`Error initiating Microsoft auth: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to initiate Microsoft authentication' });
    }
  });

  // Handle Microsoft OAuth callback
  fastify.get('/onedrive/callback', async (request, reply) => {
    try {
      const { code } = request.query as { code: string };

      if (!code) {
        return reply.status(400).send({ error: 'Authorization code not provided' });
      }

      const tokenResponse = await exchangeMicrosoftCode(code);

      // Store encrypted tokens
      const existingTokens = await getStoredTokens();
      await storeTokens({
        ...existingTokens,
        microsoft: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: Date.now() + (tokenResponse.expires_in * 1000)
        }
      });

      return { success: true, message: 'Microsoft authentication successful' };
    } catch (error) {
      fastify.log.error(`Error handling Microsoft callback: ${String(error)}`);
      return reply.status(500).send({ error: 'Failed to complete Microsoft authentication' });
    }
  });
}

// Helper functions
async function exchangeSalesforceCode(code: string): Promise<any> {
  const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
      redirect_uri: process.env.SALESFORCE_REDIRECT_URI!,
      code
    })
  });

  if (!response.ok) {
    throw new Error(`Salesforce token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

async function exchangeMicrosoftCode(code: string): Promise<any> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error(`Microsoft token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

async function storeTokens(tokens: Partial<AuthTokens>): Promise<void> {
  await ensureDataDirectory();
  const tokenPath = path.join('.cs720', 'auth', 'tokens.enc');

  const existingTokens = await getStoredTokens();
  const mergedTokens = { ...existingTokens, ...tokens };

  const encryptedTokens = encryptTokens(mergedTokens);
  await fs.writeFile(tokenPath, encryptedTokens);
}

async function getStoredTokens(): Promise<AuthTokens | null> {
  try {
    const tokenPath = path.join('.cs720', 'auth', 'tokens.enc');

    if (!await fs.pathExists(tokenPath)) {
      return null;
    }

    const encryptedTokens = await fs.readFile(tokenPath, 'utf8');
    return decryptTokens(encryptedTokens);
  } catch (error) {
    console.error('Error reading stored tokens:', error);
    return null;
  }
}