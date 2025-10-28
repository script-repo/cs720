/**
 * Ollama Client
 * Direct integration with local Ollama LLM service
 */

import fetch from 'node-fetch';
import { ChatMessage, LLMConfig, LLMHealthStatus } from '@cs720/shared';

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Check Ollama service health
   */
  async checkHealth(): Promise<LLMHealthStatus> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        return {
          backend: 'ollama',
          available: false,
          error: `Ollama returned status ${response.status}`,
        };
      }

      const latency = Date.now() - startTime;
      const data = await response.json();
      const models = data.models || [];

      return {
        backend: 'ollama',
        available: true,
        latency,
        model: models.length > 0 ? models[0].name : undefined,
      };
    } catch (error: any) {
      return {
        backend: 'ollama',
        available: false,
        error: error.message || 'Failed to connect to Ollama',
      };
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      return (data.models || []).map((m: any) => m.name);
    } catch (error: any) {
      console.error('Failed to list Ollama models:', error);
      throw new Error(`Ollama list models failed: ${error.message}`);
    }
  }

  /**
   * Chat with Ollama
   */
  async chat(
    messages: ChatMessage[],
    config: LLMConfig,
    stream: boolean = false
  ): Promise<string> {
    try {
      const ollamaMessages = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      }));

      // Add system message if provided
      if (config.systemPrompt) {
        ollamaMessages.unshift({
          role: 'system',
          content: config.systemPrompt,
        });
      }

      const requestBody = {
        model: config.model,
        messages: ollamaMessages,
        stream,
        options: {
          temperature: config.temperature || 0.7,
          num_predict: config.maxTokens || 2048,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama request failed: ${response.status} - ${errorText}`);
      }

      if (stream) {
        // For streaming, return the raw response body
        // The caller will handle streaming
        return response.body as any;
      } else {
        // For non-streaming, collect all chunks
        let fullResponse = '';
        const body = response.body;

        if (!body) {
          throw new Error('No response body');
        }

        // node-fetch v2 returns a Node.js stream
        return new Promise((resolve, reject) => {
          let buffer = '';

          body.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                if (data.message?.content) {
                  fullResponse += data.message.content;
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          });

          body.on('end', () => {
            // Process any remaining data in buffer
            if (buffer.trim()) {
              try {
                const data = JSON.parse(buffer);
                if (data.message?.content) {
                  fullResponse += data.message.content;
                }
              } catch {
                // Skip invalid JSON
              }
            }
            resolve(fullResponse);
          });

          body.on('error', reject);
        });
      }
    } catch (error: any) {
      console.error('Ollama chat error:', error);
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings (for future use)
   */
  async generateEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.embedding || [];
    } catch (error: any) {
      console.error('Ollama embedding error:', error);
      throw new Error(`Ollama embedding failed: ${error.message}`);
    }
  }
}
